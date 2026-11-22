import { describe, expect, it } from "vitest";
import { buildSnapshot, computeProgress, computeRemaining, mapHistoryJob, mergeStatus, type SnapshotInput } from "./state";

const base: SnapshotInput = {
  connection: "ready",
  klippyState: "ready",
  klippyMessage: null,
  status: {},
  fileMeta: null,
  lightPin: null,
  mock: false,
  now: 1000,
};

describe("mergeStatus", () => {
  it("merges fields within each object without losing the others", () => {
    const merged = mergeStatus(
      { extruder: { temperature: 200, target: 205 }, heater_bed: { temperature: 60 } },
      { extruder: { temperature: 201 } },
    );
    expect(merged.extruder).toEqual({ temperature: 201, target: 205 });
    expect(merged.heater_bed).toEqual({ temperature: 60 });
  });
});

describe("computeProgress", () => {
  it("uses file-relative progress when metadata exists", () => {
    const p = computeProgress(
      { virtual_sdcard: { file_position: 600, progress: 0.6 } },
      { gcode_start_byte: 100, gcode_end_byte: 1100 },
    );
    expect(p).toBeCloseTo(0.5);
  });
  it("falls back to Klipper's progress", () => {
    expect(computeProgress({ virtual_sdcard: { progress: 0.42 } }, null)).toBe(0.42);
  });
  it("clamps to 0–1", () => {
    expect(computeProgress({ virtual_sdcard: { file_position: 50 } }, { gcode_start_byte: 100, gcode_end_byte: 200 })).toBe(0);
  });
});

describe("computeRemaining", () => {
  it("uses the slicer estimate early", () => {
    expect(computeRemaining(0.05, 100, 2000)).toBe(1900);
  });
  it("extrapolates from actual pace later", () => {
    expect(computeRemaining(0.5, 1000, 5000)).toBe(1000);
  });
  it("returns null without data", () => {
    expect(computeRemaining(0, 0, undefined)).toBeNull();
  });
});

describe("buildSnapshot", () => {
  it("has no temperatures or job when offline", () => {
    const s = buildSnapshot({ ...base, connection: "offline", status: { extruder: { temperature: 200 } } });
    expect(s.temperatures).toBeNull();
    expect(s.job).toBeNull();
    expect(s.printState).toBeNull();
  });

  it("has temperatures but no job in standby", () => {
    const s = buildSnapshot({
      ...base,
      status: {
        extruder: { temperature: 24.5, target: 0, power: 0 },
        heater_bed: { temperature: 23, target: 0 },
        print_stats: { state: "standby", filename: "" },
      },
    });
    expect(s.temperatures?.nozzle.current).toBe(24.5);
    expect(s.printState).toBe("standby");
    expect(s.job).toBeNull();
  });

  it("builds an active job with metadata", () => {
    const filename = ".cache/EN4Plus_0.4_Benchy_Generic PLA _0.2_1h0m.gcode";
    const s = buildSnapshot({
      ...base,
      status: {
        print_stats: { state: "printing", filename, print_duration: 600, total_duration: 700, filament_used: 1000 },
        virtual_sdcard: { file_position: 300, progress: 0.3 },
      },
      fileMeta: {
        filename,
        estimated_time: 3600,
        gcode_start_byte: 100,
        gcode_end_byte: 1100,
        layer_count: 50,
        thumbnails: [{ width: 160, height: 160, size: 1, relative_path: ".thumbs/b.png" }],
      },
    });
    expect(s.job).toMatchObject({
      displayName: "Benchy",
      state: "printing",
      totalLayers: 50,
    });
    expect(s.job?.progress).toBeCloseTo(0.2);
    expect(s.job?.remaining).toBeCloseTo(2400);
    expect(s.job?.thumbnailUrl).toContain(encodeURIComponent(".cache/.thumbs/b.png"));
  });

  it("ignores metadata belonging to a different file", () => {
    const s = buildSnapshot({
      ...base,
      status: { print_stats: { state: "printing", filename: "a.gcode" } },
      fileMeta: { filename: "b.gcode", estimated_time: 100 },
    });
    expect(s.job?.thumbnailUrl).toBeNull();
    expect(s.job?.totalLayers).toBeNull();
  });

  it("a finished job has 100 % and no remaining time", () => {
    const s = buildSnapshot({ ...base, status: { print_stats: { state: "complete", filename: "a.gcode" } } });
    expect(s.job?.progress).toBe(1);
    expect(s.job?.remaining).toBeNull();
  });
});

describe("light", () => {
  it("reads the output_pin value", () => {
    const s = buildSnapshot({ ...base, lightPin: "caselight1", status: { "output_pin caselight1": { value: 1 } } });
    expect(s.light).toBe(true);
  });
  it("is null without a configured pin", () => {
    expect(buildSnapshot({ ...base, status: { "output_pin caselight1": { value: 1 } } }).light).toBeNull();
  });
});

describe("mapHistoryJob", () => {
  it("converts times to ms and hides thumbnails for deleted files", () => {
    const job = mapHistoryJob({
      job_id: "000018",
      filename: ".cache/EN4Plus_0.4_obj_1_scraper_Generic PLA _0.2_8m32s.gcode",
      status: "completed",
      start_time: 1795277281.8,
      end_time: 1795277946.4,
      print_duration: 507.2,
      total_duration: 664.5,
      filament_used: 1006.5,
      metadata: {
        filament_type: "PLA",
        filament_colors: ["#26A69A"],
        thumbnails: [{ width: 160, height: 160, size: 1, relative_path: ".thumbs/x.png" }],
      },
      exists: false,
    });
    expect(job.startTime).toBe(1795277281800);
    expect(job.displayName).toBe("obj 1 scraper");
    expect(job.filamentColor).toBe("#26A69A");
    expect(job.thumbnailUrl).toBeNull();
    expect(job.fileExists).toBe(false);
  });
});

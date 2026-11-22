import { describe, expect, it } from "vitest";
import type { HistoryJob } from "@/lib/printer/types";
import type { CostSettings } from "@/lib/portal/types";
import { byFilament, byHour, byStatus, filterByPeriod, isoWeek, jobCost, monthlySummary, summarize, timeBuckets, topModels } from "./stats";
import { csvDateTime, toCsv } from "./csv";

const costs: CostSettings = { filamentPricePerKg: 250, printerWatts: 150, electricityPricePerKwh: 2 };

function job(partial: Partial<HistoryJob>): HistoryJob {
  return {
    id: "1",
    filename: "a.gcode",
    displayName: "A",
    status: "completed",
    startTime: 0,
    endTime: 0,
    printDuration: 3600,
    totalDuration: 3600,
    filamentUsed: 1000,
    filamentType: "PLA",
    filamentColor: "#26a69a",
    thumbnailUrl: null,
    fileExists: true,
    ...partial,
  };
}

const now = new Date(2026, 10, 21, 12).getTime(); // Saturday 21 Nov 2026, week 47

describe("isoWeek", () => {
  it("computes the ISO week number", () => {
    expect(isoWeek(new Date(2026, 10, 21))).toBe(47);
    expect(isoWeek(new Date(2026, 0, 1))).toBe(1);
  });
});

describe("filterByPeriod", () => {
  const jobs = [job({ startTime: now - 2 * 86_400_000 }), job({ startTime: now - 40 * 86_400_000 }), job({ startTime: new Date(2025, 5, 1).getTime() })];
  it("filters by period", () => {
    expect(filterByPeriod(jobs, "7d", now)).toHaveLength(1);
    expect(filterByPeriod(jobs, "90d", now)).toHaveLength(2);
    expect(filterByPeriod(jobs, "year", now)).toHaveLength(2);
    expect(filterByPeriod(jobs, "all", now)).toHaveLength(3);
  });
});

describe("cost", () => {
  it("adds filament and power", () => {
    const c = jobCost(job({}), costs);
    // 1000 mm ≈ 2.98 g → 0.746 kr; 1 h × 0.15 kW × 2 kr = 0.30 kr
    expect(c.filament).toBeCloseTo(0.746, 2);
    expect(c.power).toBeCloseTo(0.3, 5);
    expect(c.total).toBeCloseTo(1.046, 2);
  });
});

describe("summarize", () => {
  it("counts status, success rate and waste", () => {
    const s = summarize([job({}), job({ status: "cancelled", filamentUsed: 500 }), job({ status: "in_progress" })], costs);
    expect(s.jobs).toBe(3);
    expect(s.completed).toBe(1);
    expect(s.failed).toBe(1);
    expect(s.successRate).toBe(0.5);
    expect(s.wastedGrams).toBeCloseTo(1.49, 1);
    expect(s.averagePrintTime).toBe(3600);
  });
  it("handles an empty list", () => {
    const s = summarize([], costs);
    expect(s.successRate).toBeNull();
    expect(s.averagePrintTime).toBeNull();
  });
});

describe("timeBuckets", () => {
  it("uses weeks for short periods, including empty weeks", () => {
    const { unit, buckets } = timeBuckets([job({ startTime: new Date(2026, 10, 17).getTime(), printDuration: 7200 })], "30d", now);
    expect(unit).toBe("week");
    expect(buckets.at(-1)).toMatchObject({ label: "Uke 47", jobs: 1, hours: 2 });
    expect(buckets.length).toBeGreaterThanOrEqual(5);
    expect(buckets.slice(0, -1).every((b) => b.jobs === 0)).toBe(true);
  });
  it("uses months for long periods", () => {
    const { unit, buckets } = timeBuckets([job({ startTime: new Date(2026, 2, 5).getTime() })], "year", now);
    expect(unit).toBe("month");
    expect(buckets).toHaveLength(11); // jan–nov
    expect(buckets[2]).toMatchObject({ label: "mar 26", jobs: 1 });
  });
});

describe("breakdowns", () => {
  const jobs = [
    job({ displayName: "Benchy", startTime: new Date(2026, 0, 1, 15).getTime() }),
    job({ displayName: "Benchy", startTime: new Date(2026, 0, 2, 15).getTime() }),
    job({ displayName: "Kube", status: "error", filamentType: "PETG", filamentColor: null, startTime: new Date(2026, 0, 3, 9).getTime() }),
  ];
  it("by status", () => {
    expect(byStatus(jobs).map((b) => [b.label, b.count])).toEqual([
      ["Fullført", 2],
      ["Feil", 1],
    ]);
  });
  it("by hour", () => {
    const h = byHour(jobs);
    expect(h[15]).toBe(2);
    expect(h[9]).toBe(1);
  });
  it("by filament type and color", () => {
    const f = byFilament(jobs);
    expect(f[0]).toMatchObject({ label: "PLA", color: "#26A69A", count: 2 });
    expect(f[1]).toMatchObject({ label: "PETG", color: null });
  });
  it("top models count only completed", () => {
    expect(topModels(jobs)).toEqual([{ name: "Benchy", count: 2, grams: expect.any(Number) }]);
  });
  it("monthly summary", () => {
    const m = monthlySummary(jobs, costs);
    expect(m).toHaveLength(1);
    expect(m[0]).toMatchObject({ month: "2026-01", jobs: 3, completed: 2 });
  });
});

describe("csv", () => {
  it("uses semicolons, decimal comma and a BOM", () => {
    const csv = toCsv([{ name: "Drage; stor", grams: 12.345, n: 3 }], [
      { header: "Navn", value: (r) => r.name },
      { header: "Gram", value: (r) => r.grams, decimals: 1 },
      { header: "Antall", value: (r) => r.n },
    ]);
    expect(csv.startsWith("﻿")).toBe(true);
    expect(csv).toContain("Navn;Gram;Antall\r\n");
    expect(csv).toContain('"Drage; stor";12,3;3\r\n');
  });
  it("neutralises formulas (CSV injection)", () => {
    const csv = toCsv([{ v: "=HYPERLINK(1)" }], [{ header: "x", value: (r) => r.v }]);
    expect(csv).toContain("'=HYPERLINK(1)");
  });
  it("formats dates for Excel", () => {
    expect(csvDateTime(new Date(2026, 10, 21, 9, 5).getTime())).toBe("2026-11-21 09:05");
    expect(csvDateTime(null)).toBe("");
  });
});

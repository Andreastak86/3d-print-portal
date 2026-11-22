/**
 * Simple persistent storage as a JSON file (data/portal.json).
 *
 * Deliberately simple (see docs/decisions/003): the data volume is small (approved prints,
 * settings, activity log), and a JSON file needs no dependencies and is easy to
 * back up/move. Writes are serialised and written atomically (temp file + rename).
 */
import { randomBytes, randomUUID } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import type { ActivityActor, ActivityEntry, ApprovedPrint, PortalSettings } from "@/lib/portal/types";

interface StoreData {
  version: 1;
  sessionSecret: string;
  settings: PortalSettings;
  approvedPrints: ApprovedPrint[];
  activity: ActivityEntry[];
}

const MAX_ACTIVITY = 300;

export const DEFAULT_SETTINGS: PortalSettings = {
  tobias: {
    kidName: "Tobias",
    canStart: true,
    canPause: true,
    canToggleLight: true,
    canStartAnyFile: false,
    requireAdult: true,
    startWindow: { enabled: false, from: "08:00", to: "21:00" },
    message: "",
  },
  costs: {
    filamentPricePerKg: 250,
    printerWatts: 150,
    electricityPricePerKwh: 1.5,
  },
};

function dataDir(): string {
  return process.env.DATA_DIR?.trim() || path.join(process.cwd(), "data");
}

function freshData(): StoreData {
  return {
    version: 1,
    sessionSecret: randomBytes(32).toString("hex"),
    settings: structuredClone(DEFAULT_SETTINGS),
    approvedPrints: [],
    activity: [],
  };
}

/** Fill in fields that may be missing in older files. */
function normalise(raw: Partial<StoreData>): StoreData {
  const base = freshData();
  return {
    version: 1,
    sessionSecret: raw.sessionSecret || base.sessionSecret,
    settings: {
      tobias: {
        ...base.settings.tobias,
        ...raw.settings?.tobias,
        startWindow: { ...base.settings.tobias.startWindow, ...raw.settings?.tobias?.startWindow },
      },
      costs: { ...base.settings.costs, ...raw.settings?.costs },
    },
    approvedPrints: raw.approvedPrints ?? [],
    activity: raw.activity ?? [],
  };
}

const globalForStore = globalThis as unknown as {
  __store?: { data: Promise<StoreData>; queue: Promise<unknown> };
};

function state() {
  globalForStore.__store ??= { data: load(), queue: Promise.resolve() };
  return globalForStore.__store;
}

async function load(): Promise<StoreData> {
  const file = path.join(dataDir(), "portal.json");
  try {
    return normalise(JSON.parse(await readFile(file, "utf8")) as Partial<StoreData>);
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code !== "ENOENT") {
      // Don't overwrite a corrupt file – keep it so it can be inspected.
      const backup = `${file}.corrupt-${Date.now()}`;
      await rename(file, backup).catch(() => {});
      console.error(`[store] Kunne ikke lese ${file}, flyttet til ${backup}:`, err);
    }
    const fresh = freshData();
    await persist(fresh);
    return fresh;
  }
}

async function persist(data: StoreData): Promise<void> {
  const dir = dataDir();
  await mkdir(dir, { recursive: true });
  const file = path.join(dir, "portal.json");
  const tmp = `${file}.tmp`;
  await writeFile(tmp, JSON.stringify(data, null, 2), "utf8");
  await rename(tmp, file);
}

/** Read-only access to the data. */
export async function readStore(): Promise<Readonly<StoreData>> {
  return state().data;
}

/** Change the data. Changes are serialised and saved to disk. */
export function updateStore<T>(mutate: (data: StoreData) => T): Promise<T> {
  const s = state();
  const run = s.queue.then(async () => {
    const data = await s.data;
    const result = mutate(data);
    await persist(data);
    return result;
  });
  s.queue = run.catch(() => {});
  return run;
}

export function logActivity(actor: ActivityActor, action: string, detail?: string): Promise<void> {
  return updateStore((data) => {
    data.activity.unshift({ id: randomUUID(), at: Date.now(), actor, action, detail });
    if (data.activity.length > MAX_ACTIVITY) data.activity.length = MAX_ACTIVITY;
  }).catch((err) => console.error("[store] Kunne ikke logge aktivitet:", err));
}

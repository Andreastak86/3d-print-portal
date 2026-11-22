/** Collects system information from Moonraker into one SystemInfo. */
import type { SystemInfo } from "@/lib/portal/types";
import { fetchDiskUsage, fetchPrinterInfo, fetchProcStats, fetchServerInfo, fetchSystemInfo } from "./rest";

interface RawServerInfo {
  klippy_state: string;
  moonraker_version: string;
  api_version_string: string;
  components: string[];
}

interface RawSystemInfo {
  system_info: {
    cpu_info?: { cpu_count?: number; processor?: string; total_memory?: number };
    distribution?: { name?: string };
  };
}

interface RawProcStats {
  cpu_temp?: number | null;
  system_cpu_usage?: { cpu?: number };
  system_memory?: { total?: number; available?: number; used?: number };
}

export async function collectSystemInfo(): Promise<SystemInfo> {
  const server = await fetchServerInfo<RawServerInfo>();
  const [printer, system, proc, disk] = await Promise.all([
    fetchPrinterInfo<{ hostname?: string }>().catch(() => null),
    fetchSystemInfo<RawSystemInfo>().catch(() => null),
    fetchProcStats<RawProcStats>().catch(() => null),
    fetchDiskUsage().catch(() => null),
  ]);

  const cpuInfo = system?.system_info.cpu_info;
  const mem = proc?.system_memory;

  return {
    moonrakerVersion: server.moonraker_version,
    apiVersion: server.api_version_string,
    klippyState: server.klippy_state,
    hostname: printer?.hostname ?? null,
    distribution: system?.system_info.distribution?.name ?? null,
    cpu: cpuInfo ? `${cpuInfo.cpu_count ?? "?"} kjerner, ${cpuInfo.processor ?? "ukjent"}` : null,
    cpuTemp: proc?.cpu_temp ?? null,
    cpuUsage: proc?.system_cpu_usage?.cpu ?? null,
    memoryTotal: mem?.total ?? cpuInfo?.total_memory ?? null,
    memoryUsed: mem?.used ?? (mem?.total != null && mem.available != null ? mem.total - mem.available : null),
    disk,
    components: server.components,
  };
}

/**
 * Raw types from Moonraker's API (only the fields we use).
 * Docs: https://moonraker.readthedocs.io/en/latest/web_api/
 */

export interface RawTemperatureObject {
  temperature?: number;
  target?: number;
  power?: number;
}

export interface RawPrintStats {
  filename?: string;
  total_duration?: number;
  print_duration?: number;
  filament_used?: number;
  state?: string;
  message?: string;
  info?: { total_layer?: number | null; current_layer?: number | null };
}

export interface RawVirtualSdcard {
  progress?: number;
  file_position?: number;
  file_size?: number;
  is_active?: boolean;
}

export interface RawWebhooks {
  state?: string;
  state_message?: string;
}

/** Merged printer object status (from printer.objects.subscribe + notify_status_update). */
export interface RawStatus {
  print_stats?: RawPrintStats;
  extruder?: RawTemperatureObject;
  heater_bed?: RawTemperatureObject;
  virtual_sdcard?: RawVirtualSdcard;
  display_status?: { progress?: number; message?: string | null };
  webhooks?: RawWebhooks;
  [outputPin: `output_pin ${string}`]: { value?: number } | undefined;
}

export interface RawThumbnail {
  width: number;
  height: number;
  size: number;
  relative_path: string;
}

export interface RawFileMetadata {
  filename?: string;
  size?: number;
  slicer?: string;
  estimated_time?: number;
  layer_count?: number;
  object_height?: number;
  layer_height?: number;
  first_layer_height?: number;
  filament_total?: number;
  filament_weight_total?: number;
  filament_type?: string;
  filament_name?: string;
  filament_colors?: string[];
  gcode_start_byte?: number;
  gcode_end_byte?: number;
  thumbnails?: RawThumbnail[];
}

export interface RawServerInfo {
  klippy_connected: boolean;
  klippy_state: string;
  components: string[];
  moonraker_version: string;
  api_version_string: string;
}

export interface RawHistoryJob {
  job_id: string;
  filename: string;
  status: string;
  start_time: number;
  end_time: number | null;
  print_duration: number;
  total_duration: number;
  filament_used: number;
  metadata?: RawFileMetadata;
  exists: boolean;
}

export interface RawHistoryList {
  count: number;
  jobs: RawHistoryJob[];
}

export interface RawHistoryTotals {
  job_totals: {
    total_jobs: number;
    total_time: number;
    total_print_time: number;
    total_filament_used: number;
    longest_job: number;
    longest_print: number;
  };
}

/** JSON-RPC 2.0 message from Moonraker's WebSocket. */
export interface JsonRpcMessage {
  jsonrpc: "2.0";
  id?: number;
  method?: string;
  params?: unknown[];
  result?: unknown;
  error?: { code: number; message: string };
}

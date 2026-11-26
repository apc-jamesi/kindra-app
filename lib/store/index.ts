import "server-only";
import { config } from "../config";
import { localStore } from "./local";
import { postgresStore } from "./postgres";
import { supabaseStore } from "./supabase";
import type { Store } from "./types";

export function getStore(): Store {
  if (config.dataMode === "postgres") return postgresStore;
  return config.dataMode === "supabase" ? supabaseStore : localStore;
}

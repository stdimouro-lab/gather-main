import { createClient } from "@supabase/supabase-js";
import { getSupabaseConfig } from "./supabaseConfig";

const { url: supabaseUrl, anonKey: supabaseAnonKey, isConfigured } =
  getSupabaseConfig();

if (!isConfigured && typeof console !== "undefined") {
  console.error(
    "Gather: Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY. Copy .env.example to .env.local and restart the dev server."
  );
}

const REMEMBER_KEY = "gather_remember_me";

const storageAdapter = {
  getItem(key) {
    const remember = localStorage.getItem(REMEMBER_KEY) === "true";
    const store = remember ? localStorage : sessionStorage;
    return store.getItem(key);
  },
  setItem(key, value) {
    const remember = localStorage.getItem(REMEMBER_KEY) === "true";
    const store = remember ? localStorage : sessionStorage;
    store.setItem(key, value);
  },
  removeItem(key) {
    localStorage.removeItem(key);
    sessionStorage.removeItem(key);
  },
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    storage: storageAdapter,
  },
});
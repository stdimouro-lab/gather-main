import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

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
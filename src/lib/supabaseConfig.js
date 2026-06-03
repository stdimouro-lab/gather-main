export function getSupabaseConfig() {
  const url = import.meta.env.VITE_SUPABASE_URL;
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

  return {
    url: url || "",
    anonKey: anonKey || "",
    isConfigured: Boolean(url && anonKey),
  };
}

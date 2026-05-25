import { supabase } from "@/lib/supabase";

export async function getPostAuthRedirect(userId) {
  if (!userId) return "/login";

  try {
    const { data: profile, error } = await supabase
      .from("profiles")
      .select("id, onboarding_completed")
      .eq("id", userId)
      .maybeSingle();

    if (error) throw error;

    if (!profile) return "/onboarding";

    return profile.onboarding_completed === true ? "/home" : "/onboarding";
  } catch (error) {
    console.error("getPostAuthRedirect error:", error);
    return "/onboarding";
  }
}
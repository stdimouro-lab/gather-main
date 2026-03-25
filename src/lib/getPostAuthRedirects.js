import { supabase } from "@/lib/supabase";

export async function getPostAuthRedirect(userId) {
  if (!userId) return "/login";

  try {
    const { data: profile, error } = await supabase
      .from("profiles")
      .select("onboarding_completed")
      .eq("id", userId)
      .maybeSingle();

    if (error) throw error;

    const onboardingCompleted = profile?.onboarding_completed === true;

    return onboardingCompleted ? "/calendar" : "/onboarding";
  } catch (error) {
    console.error("getPostAuthRedirect error:", error);
    return "/calendar";
  }
}
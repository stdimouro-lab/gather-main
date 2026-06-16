import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/context/AuthProvider";
import { fetchPipFamilyContext } from "@/lib/ai/pip/context";

export default function usePipContext() {
  const { user } = useAuth();

  const familyKidsKey = JSON.stringify(
    user?.user_metadata?.family_members ??
      user?.user_metadata?.family_kids ??
      []
  );

  return useQuery({
    queryKey: ["pipContext", user?.id, user?.email, familyKidsKey],
    queryFn: () => fetchPipFamilyContext(user, user.email),
    enabled: !!user?.id,
    staleTime: 60000,
  });
}

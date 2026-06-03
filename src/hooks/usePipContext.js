import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/context/AuthProvider";
import { fetchPipFamilyContext } from "@/lib/ai/pip/context";

export default function usePipContext() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["pipContext", user?.id, user?.email],
    queryFn: () =>
      fetchPipFamilyContext(user.id, user.email),
    enabled: !!user?.id,
    staleTime: 60000,
  });
}

import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "@/components/ui/use-toast";
import { getAccountQueryKey } from "@/hooks/useEntitlement";
import { fetchMyAccount } from "@/lib/account";
import { useAuth } from "@/context/AuthProvider";

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export default function useCheckoutReturnSync() {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const hasRunRef = useRef(false);

  const [isSyncingCheckoutReturn, setIsSyncingCheckoutReturn] = useState(false);

  useEffect(() => {
    if (!user?.id) return;
    if (hasRunRef.current) return;

    const params = new URLSearchParams(location.search);
    const checkout = params.get("checkout");
    const source = params.get("source");

    const isSuccess =
      checkout === "success" ||
      params.get("success") === "true" ||
      params.get("checkout_success") === "true";

    const isCanceled =
      checkout === "canceled" ||
      params.get("canceled") === "true" ||
      params.get("checkout_canceled") === "true";

    if (!isSuccess && !isCanceled) return;

    hasRunRef.current = true;

    const run = async () => {
      if (isCanceled) {
        toast({
          title: "Checkout canceled",
          description: "No billing changes were made.",
        });

        const cleanParams = new URLSearchParams(location.search);
        cleanParams.delete("checkout");
        cleanParams.delete("success");
        cleanParams.delete("canceled");
        cleanParams.delete("checkout_success");
        cleanParams.delete("checkout_canceled");
        cleanParams.delete("source");

        navigate(
          {
            pathname: location.pathname,
            search: cleanParams.toString() ? `?${cleanParams.toString()}` : "",
          },
          { replace: true }
        );

        return;
      }

      setIsSyncingCheckoutReturn(true);

      toast({
        title: "Checkout complete",
        description: "Syncing your billing status...",
      });

      const accountQueryKey = getAccountQueryKey(user.id);

      let synced = false;

      for (let attempt = 0; attempt < 10; attempt += 1) {
        await queryClient.invalidateQueries({ queryKey: accountQueryKey });

        const freshAccount = await queryClient.fetchQuery({
          queryKey: accountQueryKey,
          queryFn: () => fetchMyAccount(user.id),
          staleTime: 0,
        });

        if (
          freshAccount?.billing_source === "stripe" &&
          freshAccount?.plan_tier &&
          freshAccount.plan_tier !== "free"
        ) {
          synced = true;
          break;
        }

        await sleep(1200);
      }

      if (synced) {
        toast({
          title: "Billing synced",
          description: "Your plan is now active.",
        });
      } else {
        toast({
          title: "Checkout succeeded",
          description:
            "Stripe finished checkout, but the webhook may still be syncing. Refresh in a moment if needed.",
        });
      }

      const cleanParams = new URLSearchParams(location.search);
      cleanParams.delete("checkout");
      cleanParams.delete("success");
      cleanParams.delete("canceled");
      cleanParams.delete("checkout_success");
      cleanParams.delete("checkout_canceled");
      cleanParams.delete("source");

      navigate(
        {
          pathname: location.pathname,
          search: cleanParams.toString() ? `?${cleanParams.toString()}` : "",
        },
        { replace: true }
      );

      setIsSyncingCheckoutReturn(false);
    };

    run();
  }, [location, navigate, queryClient, user?.id]);

  return {
    isSyncingCheckoutReturn,
  };
}
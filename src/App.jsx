import { useEffect } from "react";
import { Capacitor } from "@capacitor/core";
import { Purchases, LOG_LEVEL } from "@revenuecat/purchases-capacitor";

import AppRouter from "./router.jsx";
import { Toaster } from "@/components/ui/toaster";

export default function App() {
  useEffect(() => {
    async function initRevenueCat() {
      try {
        const platform = Capacitor.getPlatform();

        if (platform !== "ios") return;

        const apiKey = import.meta.env.VITE_REVENUECAT_APPLE_KEY;

        if (!apiKey) {
          console.warn("Missing VITE_REVENUECAT_APPLE_KEY");
          return;
        }

        await Purchases.setLogLevel({ level: LOG_LEVEL.DEBUG });

        await Purchases.configure({
          apiKey,
        });

        console.log("RevenueCat configured for iOS");
      } catch (error) {
        console.error("RevenueCat init failed:", error);
      }
    }

    initRevenueCat();
  }, []);

  return (
    <>
      <AppRouter />
      <Toaster />
    </>
  );
}
import AppRouter from "./router.jsx";
import { Toaster } from "@/components/ui/toaster";

export default function App() {
  return (
    <>
      <AppRouter />
      <Toaster />
    </>
  );
}

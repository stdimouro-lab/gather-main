import AppRouter from "./router.jsx";
import { Toaster } from "@/components/ui/toaster";
import { toast } from "@/components/ui/use-toast";

export default function App() {
  return (
    <>
      <AppRouter />
      <Toaster />

      <button
        onClick={() =>
          toast({ title: "Test", description: "Toast works" })
        }
        style={{
          position: "fixed",
          top: 20,
          right: 20,
          zIndex: 999999,
          padding: 12,
          background: "black",
          color: "white",
          borderRadius: 8,
        }}
      >
        Toast Test
      </button>
    </>
  );
}
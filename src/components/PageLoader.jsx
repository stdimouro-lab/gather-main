export default function PageLoader({ label = "Loading…" }) {
  return (
    <div className="flex min-h-[40vh] items-center justify-center px-6">
      <p className="text-sm text-slate-500">{label}</p>
    </div>
  );
}

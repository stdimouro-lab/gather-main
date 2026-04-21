export default function UsageBar({
  label,
  used = 0,
  limit = 1,
  unit = "",
}) {
  const percent = Math.min((used / limit) * 100, 100);

  const getColor = () => {
    if (percent >= 95) return "bg-red-500";
    if (percent >= 80) return "bg-yellow-500";
    return "bg-green-500";
  };

  return (
    <div className="space-y-1">
      <div className="flex justify-between text-sm">
        <span className="font-medium">{label}</span>
        <span className="text-muted-foreground">
          {used} {unit} / {limit} {unit}
        </span>
      </div>

      <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
        <div
          className={`h-full ${getColor()} transition-all`}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}
import { useRef, useState } from "react";
import { Upload } from "lucide-react";

export default function EventDropzone({
  onFiles,
  disabled = false,
  disabledMessage = "Uploads are unavailable right now.",
}) {
  const inputRef = useRef(null);
  const [dragging, setDragging] = useState(false);

  const handleFiles = (fileList) => {
    if (disabled) return;
    const files = Array.from(fileList || []);
    if (files.length > 0) {
      onFiles?.(files);
    }
  };

  const openPicker = () => {
    if (disabled) return;
    inputRef.current?.click();
  };

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={openPicker}
        onDragOver={(e) => {
          e.preventDefault();
          if (!disabled) setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          handleFiles(e.dataTransfer.files);
        }}
        disabled={disabled}
        className={[
          "w-full rounded-2xl border-2 border-dashed p-6 text-center transition",
          disabled
            ? "cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400"
            : dragging
              ? "border-indigo-500 bg-indigo-50 text-indigo-700"
              : "border-slate-300 bg-white text-slate-600 hover:border-slate-400 hover:bg-slate-50",
        ].join(" ")}
      >
        <div className="mx-auto flex max-w-sm flex-col items-center gap-2">
          <div className="rounded-full bg-slate-100 p-3">
            <Upload className="h-5 w-5" />
          </div>

          <div className="text-sm font-medium">
            {disabled ? disabledMessage : "Drag & drop files here"}
          </div>

          <div className="text-xs text-slate-500">
            {disabled ? "Upgrade your plan to add more memories." : "or click to browse from your device"}
          </div>
        </div>
      </button>

      <input
        ref={inputRef}
        type="file"
        multiple
        className="hidden"
        onChange={(e) => {
          handleFiles(e.target.files);
          e.target.value = "";
        }}
      />
    </div>
  );
}
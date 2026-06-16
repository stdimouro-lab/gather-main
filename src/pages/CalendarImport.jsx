import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  ArrowLeft,
  CalendarPlus,
  Check,
  FileUp,
  Loader2,
  ScanLine,
} from "lucide-react";
import { DateTime } from "luxon";
import { useAuth } from "@/context/AuthProvider";
import { fetchTabs } from "@/lib/tabs";
import { fetchEvents } from "@/lib/events";
import { getBrowserTimezone } from "@/lib/profileSettings";
import { scanCalendarFile, scanCalendarText } from "@/lib/calendarImport/scanFile";
import {
  markDuplicateEvents,
  countClosures,
  selectAllClosures,
} from "@/lib/calendarImport/duplicates";
import { importScannedEvents } from "@/lib/calendarImport/importBatch";
import {
  IMPORT_HINTS,
  EVENT_TYPE_OPTIONS,
  RECURRENCE_OPTIONS,
} from "@/lib/calendarImport/types";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";

function ReviewRow({ item, onChange }) {
  return (
    <tr
      className={`border-b border-slate-100 ${item.isDuplicate ? "bg-amber-50/50" : ""}`}
    >
      <td className="px-2 py-2 align-top">
        <input
          type="checkbox"
          checked={item.selected}
          onChange={(e) => onChange({ selected: e.target.checked })}
          className="rounded border-slate-300"
        />
      </td>
      <td className="px-2 py-2 align-top">
        <input
          value={item.title}
          onChange={(e) => onChange({ title: e.target.value })}
          className="w-full min-w-[120px] rounded border border-slate-200 px-2 py-1 text-[12px]"
        />
        {item.isDuplicate && (
          <p className="mt-1 text-[10px] text-amber-700">
            {item.duplicateReason}
          </p>
        )}
        {item.confidence === "low" && (
          <p className="mt-0.5 text-[10px] text-slate-500">Low confidence</p>
        )}
      </td>
      <td className="px-2 py-2 align-top">
        <input
          type="date"
          value={item.startDate || ""}
          onChange={(e) => onChange({ startDate: e.target.value })}
          className="w-full rounded border border-slate-200 px-2 py-1 text-[12px]"
        />
        <div className="mt-1 flex gap-1">
          <input
            type="time"
            value={item.startTime || ""}
            disabled={item.allDay}
            onChange={(e) => onChange({ startTime: e.target.value })}
            className="w-full rounded border border-slate-200 px-1 py-1 text-[11px]"
          />
        </div>
        <label className="mt-1 flex items-center gap-1 text-[10px] text-slate-500">
          <input
            type="checkbox"
            checked={item.allDay}
            onChange={(e) => onChange({ allDay: e.target.checked })}
          />
          All day
        </label>
      </td>
      <td className="px-2 py-2 align-top">
        <input
          value={item.location || ""}
          onChange={(e) => onChange({ location: e.target.value })}
          placeholder="Location"
          className="mb-1 w-full rounded border border-slate-200 px-2 py-1 text-[11px]"
        />
        <select
          value={item.event_type}
          onChange={(e) => onChange({ event_type: e.target.value })}
          className="w-full rounded border border-slate-200 px-1 py-1 text-[11px]"
        >
          {EVENT_TYPE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <select
          value={item.recurrence || "none"}
          onChange={(e) => onChange({ recurrence: e.target.value })}
          className="mt-1 w-full rounded border border-slate-200 px-1 py-1 text-[11px]"
        >
          {RECURRENCE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </td>
    </tr>
  );
}

export default function CalendarImport() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const timezone = getBrowserTimezone();

  const [step, setStep] = useState("upload");
  const [file, setFile] = useState(null);
  const [hint, setHint] = useState("school");
  const [pasteText, setPasteText] = useState("");
  const [usePaste, setUsePaste] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [events, setEvents] = useState([]);
  const [warnings, setWarnings] = useState([]);
  const [sourceSummary, setSourceSummary] = useState("");
  const [sourceFileName, setSourceFileName] = useState(null);
  const [tabId, setTabId] = useState("");
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState("");
  const [importResult, setImportResult] = useState(null);

  const { data: tabs = [] } = useQuery({
    queryKey: ["tabs", user?.id],
    queryFn: () => fetchTabs(user.id),
    enabled: !!user?.id,
  });

  const defaultTabId = tabId || tabs.find((t) => t.is_default)?.id || tabs[0]?.id;

  const { data: existingEvents = [] } = useQuery({
    queryKey: ["import-dupe-check", user?.id, defaultTabId],
    queryFn: async () => {
      const start = DateTime.local().minus({ months: 1 }).startOf("day");
      const end = DateTime.local().plus({ months: 12 }).endOf("day");
      return fetchEvents({
        tabIds: [defaultTabId],
        startISO: start.toUTC().toISO(),
        endISO: end.toUTC().toISO(),
      });
    },
    enabled: !!defaultTabId && step === "review",
  });

  const reviewedEvents = useMemo(
    () => markDuplicateEvents(events, existingEvents),
    [events, existingEvents]
  );

  const selectedCount = reviewedEvents.filter((e) => e.selected).length;
  const closureCount = countClosures(reviewedEvents);

  const handleScan = async () => {
    setScanning(true);
    setImportResult(null);
    try {
      const result = usePaste
        ? await scanCalendarText({ text: pasteText, hint, timezone })
        : await scanCalendarFile({ file, hint, timezone });

      if (!result.events?.length) {
        toast({
          title: "No events found",
          description: "Try a clearer photo or a different file.",
          variant: "destructive",
        });
        return;
      }

      setEvents(result.events);
      setWarnings(result.warnings);
      setSourceSummary(result.sourceSummary);
      setSourceFileName(result.sourceFileName);
      setStep("review");
    } catch (err) {
      toast({
        title: "Scan failed",
        description: err?.message,
        variant: "destructive",
      });
    } finally {
      setScanning(false);
    }
  };

  const updateEvent = (id, patch) => {
    setEvents((prev) =>
      prev.map((e) => (e.id === id ? { ...e, ...patch } : e))
    );
  };

  const handleImport = async () => {
    if (!defaultTabId || !user?.id) return;
    setImporting(true);
    setImportProgress("Starting…");

    try {
      const result = await importScannedEvents({
        events: reviewedEvents,
        ownerId: user.id,
        tabId: defaultTabId,
        timezone,
        sourceFileName,
        sourceSummary,
        onProgress: (n, total, title) => {
          setImportProgress(`${n} of ${total}: ${title}`);
        },
      });

      setImportResult(result);
      setStep("done");
      toast({
        title: "Import complete",
        description: `${result.created} event${result.created === 1 ? "" : "s"} added to your calendar.`,
      });
    } catch (err) {
      toast({
        title: "Import failed",
        description: err?.message,
        variant: "destructive",
      });
    } finally {
      setImporting(false);
      setImportProgress("");
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 p-4 md:p-6">
      <div className="mx-auto max-w-4xl">
        <div className="mb-4 flex items-center gap-3">
          <Link
            to="/calendar"
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <h1 className="text-xl font-medium text-slate-900">
              Import schedule
            </h1>
            <p className="text-[13px] text-slate-500">
              Photo, PDF, or flyer → review → add to your calendar
            </p>
          </div>
        </div>

        {step === "upload" && (
          <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-6">
            <div className="flex items-start gap-3 rounded-lg border border-[#AFA9EC] bg-[#EEEDFE]/60 p-4">
              <ScanLine className="mt-0.5 h-5 w-5 shrink-0 text-[#6C63FF]" />
              <p className="text-[13px] leading-relaxed text-[#534AB7]">
                Upload a school PDF, sports schedule, paper calendar photo, or
                work screenshot. Gather scans it and shows a preview — nothing
                is added until you confirm.
              </p>
            </div>

            <div>
              <label className="text-[12px] font-medium text-slate-700">
                What kind of schedule?
              </label>
              <select
                value={hint}
                onChange={(e) => setHint(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-[13px]"
              >
                {IMPORT_HINTS.map((h) => (
                  <option key={h.id} value={h.id}>
                    {h.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setUsePaste(false)}
                className={`rounded-lg px-3 py-1.5 text-[12px] font-medium ${
                  !usePaste
                    ? "bg-[#6C63FF] text-white"
                    : "border border-slate-200 text-slate-600"
                }`}
              >
                Upload file
              </button>
              <button
                type="button"
                onClick={() => setUsePaste(true)}
                className={`rounded-lg px-3 py-1.5 text-[12px] font-medium ${
                  usePaste
                    ? "bg-[#6C63FF] text-white"
                    : "border border-slate-200 text-slate-600"
                }`}
              >
                Paste text
              </button>
            </div>

            {!usePaste ? (
              <label className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 px-6 py-10 transition hover:border-[#AFA9EC] hover:bg-[#FAFAFF]">
                <FileUp className="mb-2 h-8 w-8 text-[#6C63FF]" />
                <span className="text-[13px] font-medium text-slate-800">
                  {file ? file.name : "Choose photo or PDF"}
                </span>
                <span className="mt-1 text-[11px] text-slate-500">
                  JPG, PNG, WebP, or PDF · max 12 MB
                </span>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif,application/pdf,.pdf"
                  className="hidden"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                />
              </label>
            ) : (
              <textarea
                value={pasteText}
                onChange={(e) => setPasteText(e.target.value)}
                rows={8}
                placeholder="Paste schedule text from email, PDF, or website…"
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-[13px]"
              />
            )}

            <Button
              type="button"
              disabled={scanning || (!usePaste && !file) || (usePaste && !pasteText.trim())}
              onClick={handleScan}
              className="w-full bg-[#6C63FF] hover:bg-[#5b54e8]"
            >
              {scanning ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Scanning schedule…
                </>
              ) : (
                <>
                  <ScanLine className="mr-2 h-4 w-4" />
                  Scan for events
                </>
              )}
            </Button>
          </div>
        )}

        {step === "review" && (
          <div className="space-y-4">
            {warnings.length > 0 && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
                <div className="flex items-center gap-2 text-[12px] font-medium text-amber-900">
                  <AlertTriangle className="h-4 w-4" />
                  Review carefully
                </div>
                <ul className="mt-2 space-y-1">
                  {warnings.map((w) => (
                    <li key={w} className="text-[12px] text-amber-800">
                      • {w}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <p className="text-[13px] font-medium text-slate-900">
                {sourceSummary || "Detected events"}
              </p>
              <p className="text-[12px] text-slate-500">
                {reviewedEvents.length} found · {selectedCount} selected to import
              </p>

              <div className="mt-4 flex flex-wrap items-center gap-3">
                <label className="text-[12px] text-slate-600">
                  Add to table
                  <select
                    value={defaultTabId || ""}
                    onChange={(e) => setTabId(e.target.value)}
                    className="ml-2 rounded-md border border-slate-200 px-2 py-1 text-[12px]"
                  >
                    {tabs.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </label>

                {closureCount > 0 && (
                  <button
                    type="button"
                    onClick={() => setEvents(selectAllClosures(events))}
                    className="text-[12px] font-medium text-[#6C63FF]"
                  >
                    Select all school closures ({closureCount})
                  </button>
                )}

                <button
                  type="button"
                  onClick={() =>
                    setEvents((prev) =>
                      prev.map((e) => ({ ...e, selected: true }))
                    )
                  }
                  className="text-[12px] font-medium text-slate-600"
                >
                  Select all
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setEvents((prev) =>
                      prev.map((e) => ({ ...e, selected: false }))
                    )
                  }
                  className="text-[12px] font-medium text-slate-600"
                >
                  Select none
                </button>
              </div>
            </div>

            <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
              <table className="w-full min-w-[640px] text-left">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                    <th className="px-2 py-2">Import</th>
                    <th className="px-2 py-2">Title</th>
                    <th className="px-2 py-2">When</th>
                    <th className="px-2 py-2">Details</th>
                  </tr>
                </thead>
                <tbody>
                  {reviewedEvents.map((item) => (
                    <ReviewRow
                      key={item.id}
                      item={item}
                      onChange={(patch) => updateEvent(item.id, patch)}
                    />
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setStep("upload")}
              >
                Scan another file
              </Button>
              <Button
                type="button"
                disabled={importing || selectedCount === 0 || !defaultTabId}
                onClick={handleImport}
                className="flex-1 bg-[#6C63FF] hover:bg-[#5b54e8]"
              >
                {importing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {importProgress || "Importing…"}
                  </>
                ) : (
                  <>
                    <CalendarPlus className="mr-2 h-4 w-4" />
                    Import {selectedCount} event{selectedCount === 1 ? "" : "s"}
                  </>
                )}
              </Button>
            </div>
          </div>
        )}

        {step === "done" && importResult && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-8 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100">
              <Check className="h-6 w-6 text-emerald-600" />
            </div>
            <h2 className="mt-4 text-lg font-medium text-slate-900">
              {importResult.created} event
              {importResult.created === 1 ? "" : "s"} imported
            </h2>
            {importResult.errors?.length > 0 && (
              <ul className="mt-3 text-left text-[12px] text-red-700">
                {importResult.errors.map((e) => (
                  <li key={e.title}>
                    {e.title}: {e.message}
                  </li>
                ))}
              </ul>
            )}
            <div className="mt-6 flex justify-center gap-3">
              <Button variant="outline" onClick={() => setStep("upload")}>
                Import another
              </Button>
              <Button
                className="bg-[#6C63FF]"
                onClick={() => navigate("/calendar")}
              >
                Open calendar
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

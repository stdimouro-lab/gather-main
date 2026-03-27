import React, { useState, useEffect, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { format, parseISO } from "date-fns";
import {
  Calendar,
  MapPin,
  FileText,
  Lock,
  Eye,
  Repeat,
  Trash2,
  Lightbulb,
  Paperclip,
} from "lucide-react";
import { motion } from "framer-motion";
import { getTabColors } from "./TabFilter";
import { getEventTypeInfo } from "./EventTypeTag";
import EventMemories from "./EventMemories";
import { cn } from "@/lib/utils";
import { DateTime } from "luxon";
import { getRealEventId } from "@/lib/recurrenceUtils";
import { useAuth } from "@/context/AuthProvider";

const WEEKDAYS = [
  { key: "SU", label: "S" },
  { key: "MO", label: "M" },
  { key: "TU", label: "T" },
  { key: "WE", label: "W" },
  { key: "TH", label: "T" },
  { key: "FR", label: "F" },
  { key: "SA", label: "S" },
];

function coerceRecurrenceType(recurrence) {
  if (!recurrence) return "none";
  if (typeof recurrence === "string") return recurrence;
  if (typeof recurrence === "object" && recurrence.type) return recurrence.type;
  return "none";
}

export default function EventModal({
  isOpen,
  onClose,
  event,
  tabs = [],
  defaultTab,
  defaultDate,
  onSave,
  onDelete,
  isSharedEvent = false,
  userRole = "owner",
  hideDetails = false,
}) {
  const { user } = useAuth();

  const [formData, setFormData] = useState({
    title: "",
    tab_id: "",
    start_date: "",
    end_date: "",
    all_day: false,
    location: "",
    notes: "",
    private_notes: "",
    visibility: "full",
    event_type: "other",
    recurrence: "none",
    recurrenceByDay: [],
    recurrenceEndDate: "",
  });

  const [activeTab, setActiveTab] = useState("details");

  const canEdit =
    userRole === "owner" || userRole === "editor" || userRole === "admin";
  const canDelete = userRole === "owner" || userRole === "admin";

  const isSuggestionMode =
    !event && !canEdit && !!defaultTab?.is_shared && defaultTab?.share_role === "viewer";

  const dialogTitle = useMemo(() => {
    if (event) return "Edit Event";
    if (isSuggestionMode) return "Suggest Event";
    return "Add Event";
  }, [event, isSuggestionMode]);

  const submitLabel = useMemo(() => {
    if (event) return "Save Changes";
    if (isSuggestionMode) return "Send Suggestion";
    return "Gather it";
  }, [event, isSuggestionMode]);

  useEffect(() => {
  const toLocalInputValue = (value, isAllDay = false) => {
    if (!value) return "";

    try {
      if (isAllDay) {
        return DateTime.fromISO(value, { zone: "utc" }).toFormat("yyyy-LL-dd'T'HH:mm");
      }

      return format(parseISO(value), "yyyy-MM-dd'T'HH:mm");
    } catch (err) {
      console.error("toLocalInputValue error:", { value, isAllDay, err });
      return "";
    }
  };

  if (event) {
    const recurrenceType = coerceRecurrenceType(
      event.recurrence ?? event.recurrenceRule ?? event.recurrence_rule
    );

    const fallbackByDay =
      Array.isArray(event.recurrenceByDay) ? event.recurrenceByDay : [];

    const startValue =
      event?.start_date ??
      event?.start_at ??
      event?.originalStartAt ??
      event?.start ??
      "";

    const endValue =
      event?.end_date ??
      event?.end_at ??
      event?.end ??
      "";

    const isAllDay = event?.all_day ?? event?.allDay ?? false;

    setFormData({
      title: event.title || "",
      tab_id: event.tab_id || defaultTab?.id || tabs[0]?.id || "",
      start_date: toLocalInputValue(startValue, isAllDay),
      end_date: toLocalInputValue(endValue, isAllDay),
      all_day: isAllDay,
      location: event.location || "",
      notes: event.notes || "",
      private_notes: event.private_notes || "",
      visibility: event.visibility || "full",
      event_type: event.event_type || "other",
      recurrence: recurrenceType || "none",
      recurrenceByDay: fallbackByDay,
      recurrenceEndDate: event?.recurrence?.end_date || "",
    });
  } else {
    const defaultDateTime = defaultDate || new Date();
    const startStr = format(defaultDateTime, "yyyy-MM-dd'T'HH:mm");
    const endDateTime = new Date(defaultDateTime);
    endDateTime.setHours(endDateTime.getHours() + 1);
    const endStr = format(endDateTime, "yyyy-MM-dd'T'HH:mm");

    setFormData({
      title: "",
      tab_id: defaultTab?.id || tabs[0]?.id || "",
      start_date: startStr,
      end_date: endStr,
      all_day: false,
      location: "",
      notes: "",
      private_notes: "",
      visibility: "full",
      event_type: "other",
      recurrence: "none",
      recurrenceByDay: [],
      recurrenceEndDate: "",
    });
  }
}, [event, isOpen]);

useEffect(() => {
  if (isOpen) {
    setActiveTab("details");
  }
}, [isOpen, event?.id]);

  const handleSubmit = (e) => {
    e.preventDefault();

    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const start = DateTime.fromISO(formData.start_date, { zone: "local" });
    const end = DateTime.fromISO(formData.end_date, { zone: "local" });

    const basePayload = {
      ...formData,
      start_date: start.toUTC().toISO(),
      end_date: end.toUTC().toISO(),
      recurrenceTimezone:
        formData.recurrence && formData.recurrence !== "none" ? tz : null,
    };

    if (isSuggestionMode) {
      onSave({
        ...basePayload,
        mode: "suggestion",
      });
      return;
    }

    onSave({
      ...basePayload,
      mode: "event",
    });
  };

  const selectedTab = tabs.find((t) => t.id === formData.tab_id);
  const colors = selectedTab
    ? getTabColors(selectedTab.color)
    : getTabColors("indigo");

 const showReadOnlyBanner = !!event && !canEdit;
const disableFields = !!event && !canEdit;

const stableEventId = useMemo(() => {
  if (!event) return null;

  try {
    return getRealEventId(event);
  } catch {
    return event?.id || null;
  }
}, [event?.id]);

const showFilesAndMemories = !isSuggestionMode;
const showPrivacyTab = !isSuggestionMode;
const showPrivateNotes = !isSharedEvent && !isSuggestionMode;
const showDelete = !!event && canDelete;

const memoryTabLabel = "Files & Memories";

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-[95vw] max-w-lg max-h-[92dvh] overflow-hidden p-0">
        <DialogHeader className="sr-only">
          <DialogTitle>{dialogTitle}</DialogTitle>
          <DialogDescription>
            Create or edit an event, including details, privacy, recurrence, and shared files.
          </DialogDescription>
        </DialogHeader>

        <div className={cn("h-2", colors.bg)} />

        <form
          onSubmit={handleSubmit}
          className="flex min-w-0 max-h-[92dvh] flex-col overflow-x-hidden"
        >
          <div className="flex-shrink-0 px-4 pb-2 pt-4 sm:px-6">
            <div className="flex items-center gap-2 text-xl font-semibold text-slate-900">
              {isSuggestionMode && (
                <Lightbulb className="h-5 w-5 text-amber-500" />
              )}
              {dialogTitle}
            </div>

            {showReadOnlyBanner && (
              <div className="mt-1 text-xs text-slate-500">
                View only — you can see this table but cannot make changes.
              </div>
            )}

            {isSuggestionMode && (
              <div className="mt-1 text-xs text-slate-500">
                You are a viewer on this shared table, so this will be sent as a suggestion for the owner to review.
              </div>
            )}
          </div>

          <div className="min-w-0 flex-1 overflow-y-auto overflow-x-hidden px-4 sm:px-6">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <div className="mb-4 overflow-x-auto">
                <TabsList className="inline-flex min-w-max gap-1 bg-slate-100 p-1">
                  <TabsTrigger value="details" className="px-3 text-xs">
                    Details
                  </TabsTrigger>

                  {showFilesAndMemories && (
                    <TabsTrigger value="memories" className="px-3 text-xs">
                      {memoryTabLabel}
                    </TabsTrigger>
                  )}

                  <TabsTrigger value="recurrence" className="px-3 text-xs">
                    Recurrence
                  </TabsTrigger>

                  {showPrivacyTab && (
                    <TabsTrigger value="privacy" className="px-3 text-xs">
                      Privacy
                    </TabsTrigger>
                  )}
                </TabsList>
              </div>

              <TabsContent value="details" className="mt-0 space-y-4">
                <div className="space-y-2">
                  <Input
                    placeholder={
                      isSuggestionMode
                        ? "What would you like to suggest?"
                        : "What's happening?"
                    }
                    value={hideDetails ? "Busy" : formData.title}
                    onChange={(e) =>
                      setFormData({ ...formData, title: e.target.value })
                    }
                    className="w-full min-w-0 rounded-none border-0 border-b px-0 text-base font-medium focus-visible:border-indigo-500 focus-visible:ring-0 sm:text-lg"
                    disabled={disableFields || hideDetails}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-medium text-slate-500">
                    Which table does this belong to?
                  </Label>
                  <Select
                    value={formData.tab_id}
                    onValueChange={(value) =>
                      setFormData({ ...formData, tab_id: value })
                    }
                    disabled={disableFields || isSharedEvent}
                  >
                    <SelectTrigger className="w-full min-w-0">
                      <SelectValue placeholder="Select a table" />
                    </SelectTrigger>

                    <SelectContent>
                      {tabs.map((tab) => {
                        const tabColors = getTabColors(tab.color);

                        return (
                          <SelectItem key={tab.id} value={tab.id}>
                            <div className="flex min-w-0 items-center gap-2">
                              <div
                                className={cn("h-3 w-3 rounded-full", tabColors.bg)}
                              />
                              <span className="truncate">{tab.name}</span>

                              {tab.is_shared && (
                                <span className="ml-auto whitespace-nowrap rounded-full bg-slate-100 px-2 py-0.5 text-[10px] text-slate-500">
                                  {tab.share_role === "editor" ? "Editor" : "Viewer"}
                                </span>
                              )}
                            </div>
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>

                <div className="mb-2 flex items-center gap-2">
                  <Switch
                    checked={formData.all_day}
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, all_day: checked })
                    }
                    disabled={disableFields}
                  />
                  <Label className="text-sm text-slate-600">All day</Label>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label className="flex items-center gap-1 text-xs font-medium text-slate-500">
                      <Calendar className="h-3 w-3" /> When?
                    </Label>
                    <Input
                      type={formData.all_day ? "date" : "datetime-local"}
                      value={
                        formData.all_day
                          ? formData.start_date.split("T")[0]
                          : formData.start_date
                      }
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          start_date: formData.all_day
                            ? `${e.target.value}T00:00`
                            : e.target.value,
                        })
                      }
                      disabled={disableFields}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="flex items-center gap-1 text-xs font-medium text-slate-500">
                      <Calendar className="h-3 w-3" /> Until
                    </Label>
                    <Input
                      type={formData.all_day ? "date" : "datetime-local"}
                      value={
                        formData.all_day
                          ? formData.end_date.split("T")[0]
                          : formData.end_date
                      }
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          end_date: formData.all_day
                            ? `${e.target.value}T23:59`
                            : e.target.value,
                        })
                      }
                      disabled={disableFields}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-medium text-slate-500">
                    Event Type
                  </Label>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {["school", "sports", "appointment", "reservation", "family", "work"].map((type) => {
                      const typeInfo = getEventTypeInfo(type);

                      return (
                        <button
                          key={type}
                          type="button"
                          onClick={() =>
                            setFormData({ ...formData, event_type: type })
                          }
                          disabled={disableFields}
                          className={cn(
                            "flex items-center justify-center gap-1 rounded-lg p-2 text-xs font-medium transition-all",
                            formData.event_type === type
                              ? "bg-indigo-100 text-indigo-700 ring-2 ring-indigo-300"
                              : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                          )}
                        >
                          <span>{typeInfo.emoji}</span>
                          <span className="hidden sm:inline">
                            {typeInfo.label}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {!hideDetails && (
                  <div className="space-y-2">
                    <Label className="flex items-center gap-1 text-xs font-medium text-slate-500">
                      <MapPin className="h-3 w-3" /> Location
                    </Label>
                    <Input
                      placeholder="Add location"
                      value={formData.location}
                      onChange={(e) =>
                        setFormData({ ...formData, location: e.target.value })
                      }
                      disabled={disableFields}
                    />
                  </div>
                )}

                {!hideDetails && (
                  <div className="space-y-2">
                    <Label className="flex items-center gap-1 text-xs font-medium text-slate-500">
                      <FileText className="h-3 w-3" />{" "}
                      {isSuggestionMode ? "Why suggest this?" : "Notes"}
                    </Label>
                    <Textarea
                      placeholder={
                        isSuggestionMode
                          ? "Add context for the owner..."
                          : "Anything to remember?"
                      }
                      value={formData.notes}
                      onChange={(e) =>
                        setFormData({ ...formData, notes: e.target.value })
                      }
                      className="min-h-[80px] w-full min-w-0 resize-none"
                      disabled={disableFields}
                    />
                  </div>
                )}
              </TabsContent>

              {showFilesAndMemories && (
                <TabsContent value="memories" className="mt-0 space-y-4">
                  {stableEventId ? (
  <EventMemories
    eventId={stableEventId}
                      tabId={event?.tab_id}
                      ownerId={user?.id}
                      isEditable={canEdit}
                    />
                  ) : (
                    <div className="rounded-2xl border border-dashed bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
                      Save the event first to add files and memories.
                    </div>
                  )}
                </TabsContent>
              )}

              <TabsContent value="recurrence" className="mt-0 space-y-4">
                <div className="space-y-2">
                  <Label className="flex items-center gap-1 text-xs font-medium text-slate-500">
                    <Repeat className="h-3 w-3" /> Repeat
                  </Label>

                  <Select
                    value={formData.recurrence || "none"}
                    onValueChange={(value) => {
                      const next = { ...formData, recurrence: value };
                      if (value !== "weekly") next.recurrenceByDay = [];
                      setFormData(next);
                    }}
                    disabled={disableFields}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Does not repeat</SelectItem>
                      <SelectItem value="daily">Daily</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                      <SelectItem value="yearly">Yearly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {formData.recurrence === "weekly" && (
                  <div className="space-y-2">
                    <Label className="text-xs font-medium text-slate-500">
                      Repeat on
                    </Label>
                    <div className="grid grid-cols-7 gap-1 sm:gap-2">
                      {WEEKDAYS.map((d) => {
                        const selected = (formData.recurrenceByDay || []).includes(d.key);

                        return (
                          <button
                            key={d.key}
                            type="button"
                            disabled={disableFields}
                            onClick={() => {
                              const prev = formData.recurrenceByDay || [];
                              const next = selected
                                ? prev.filter((x) => x !== d.key)
                                : [...prev, d.key];
                              setFormData({ ...formData, recurrenceByDay: next });
                            }}
                            className={cn(
                              "h-8 rounded-lg text-xs font-semibold transition-all sm:h-9 sm:text-sm",
                              selected
                                ? "bg-indigo-600 text-white"
                                : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                            )}
                            title={d.key}
                          >
                            {d.label}
                          </button>
                        );
                      })}
                    </div>
                    <p className="text-xs text-slate-400">
                      Tip: If you don’t select days, it repeats weekly based on the start date.
                    </p>
                  </div>
                )}

                {formData.recurrence !== "none" && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    className="space-y-2"
                  >
                    <Label className="text-xs font-medium text-slate-500">
                      End repeat (optional)
                    </Label>
                    <Input
                      type="date"
                      value={formData.recurrenceEndDate || ""}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          recurrenceEndDate: e.target.value,
                        })
                      }
                      disabled={disableFields}
                    />
                    <p className="text-xs text-slate-400">
                      This field won’t limit repeats until RRULE UNTIL support is added in events.js.
                    </p>
                  </motion.div>
                )}
              </TabsContent>

              {showPrivacyTab && (
                <TabsContent value="privacy" className="mt-0 space-y-4">
                  <div className="space-y-2">
                    <Label className="flex items-center gap-1 text-xs font-medium text-slate-500">
                      <Eye className="h-3 w-3" /> Visibility for shared users
                    </Label>
                    <Select
                      value={formData.visibility}
                      onValueChange={(value) =>
                        setFormData({ ...formData, visibility: value })
                      }
                      disabled={disableFields}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="full">
                          <div className="flex items-center gap-2">
                            <Eye className="h-4 w-4" />
                            Full details visible
                          </div>
                        </SelectItem>
                        <SelectItem value="busy_only">
                          <div className="flex items-center gap-2">
                            <Lock className="h-4 w-4" />
                            Busy only (hide details)
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-slate-400">
                      Controls what shared users can see about this event
                    </p>
                  </div>

                  {showPrivateNotes && (
                    <div className="space-y-2">
                      <Label className="flex items-center gap-1 text-xs font-medium text-slate-500">
                        <Lock className="h-3 w-3" /> Private notes (only you can see)
                      </Label>
                      <Textarea
                        placeholder="Add private notes..."
                        value={formData.private_notes}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            private_notes: e.target.value,
                          })
                        }
                        className="min-h-[80px] w-full min-w-0 resize-none bg-slate-50"
                        disabled={disableFields}
                      />
                    </div>
                  )}
                </TabsContent>
              )}
            </Tabs>
          </div>

          <div className="hidden flex-shrink-0 items-center justify-between border-t border-slate-100 bg-slate-50 px-6 py-4 sm:flex">
            {showDelete ? (
              <Button
                type="button"
                variant="ghost"
                onClick={() => onDelete(event)}
                className="text-red-600 hover:bg-red-50 hover:text-red-700"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </Button>
            ) : (
              <div />
            )}

            <div className="flex items-center gap-2">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>

              {(canEdit || isSuggestionMode) && (
                <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700">
                  {submitLabel}
                </Button>
              )}
            </div>
          </div>

          <div className="sticky bottom-0 left-0 right-0 flex-shrink-0 space-y-2 border-t border-slate-200 bg-white p-4 sm:hidden">
            {(canEdit || isSuggestionMode) && (
              <Button
                type="submit"
                className="h-12 w-full bg-indigo-600 text-base hover:bg-indigo-700"
              >
                {submitLabel}
              </Button>
            )}

            {showDelete && (
              <Button
                type="button"
                variant="outline"
                onClick={() => onDelete(event)}
                className="h-12 w-full text-red-600 hover:bg-red-50 hover:text-red-700"
              >
                Delete Event
              </Button>
            )}
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
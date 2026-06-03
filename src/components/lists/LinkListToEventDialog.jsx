import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { DateTime } from "luxon";
import { Calendar, Loader2, Search } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/context/AuthProvider";
import { toast } from "@/components/ui/use-toast";
import { fetchAccessibleTabs } from "@/lib/accessTabs";
import { fetchEvents } from "@/lib/events";
import { linkListToEvent } from "@/lib/lists";

function formatEventWhen(event) {
  const raw = event?.start_date ?? event?.start_at ?? event?.start;
  if (!raw) return "";

  try {
    const dt = DateTime.fromISO(raw);
    return dt.isValid ? dt.toFormat("EEE, MMM d · h:mm a") : "";
  } catch {
    return "";
  }
}

export default function LinkListToEventDialog({
  open,
  onOpenChange,
  listId,
  onLinked,
}) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");

  const range = useMemo(() => {
    const start = DateTime.now().minus({ days: 30 }).startOf("day");
    const end = DateTime.now().plus({ days: 120 }).endOf("day");
    return {
      startISO: start.toUTC().toISO(),
      endISO: end.toUTC().toISO(),
    };
  }, [open]);

  const { data: tabs = [], isLoading: loadingTabs } = useQuery({
    queryKey: ["accessibleTabs", user?.id, user?.email],
    queryFn: () =>
      fetchAccessibleTabs({
        userId: user.id,
        email: user.email,
      }),
    enabled: !!user?.id && open,
  });

  const ownedTabIds = useMemo(
    () =>
      tabs
        .filter((tab) => tab.owner_id === user?.id && !tab.is_shared)
        .map((tab) => tab.id),
    [tabs, user?.id]
  );

  const { data: events = [], isLoading: loadingEvents } = useQuery({
    queryKey: ["linkListEvents", user?.id, ownedTabIds, range],
    queryFn: () =>
      fetchEvents({
        tabIds: ownedTabIds,
        startISO: range.startISO,
        endISO: range.endISO,
      }),
    enabled: !!user?.id && open && ownedTabIds.length > 0,
    staleTime: 60000,
  });

  const tabNameById = useMemo(() => {
    const map = {};
    for (const tab of tabs) {
      if (tab?.id) map[tab.id] = tab.name;
    }
    return map;
  }, [tabs]);

  const filteredEvents = useMemo(() => {
    const term = search.trim().toLowerCase();
    const sorted = [...events].sort(
      (a, b) =>
        new Date(a.start_date ?? a.start_at).getTime() -
        new Date(b.start_date ?? b.start_at).getTime()
    );

    if (!term) return sorted;

    return sorted.filter((event) => {
      const title = (event.title || "").toLowerCase();
      const table = (tabNameById[event.tab_id] || "").toLowerCase();
      return title.includes(term) || table.includes(term);
    });
  }, [events, search, tabNameById]);

  const linkMutation = useMutation({
    mutationFn: (eventId) => linkListToEvent(listId, eventId),
    onSuccess: (_, eventId) => {
      queryClient.invalidateQueries({ queryKey: ["lists", user?.id] });
      queryClient.invalidateQueries({ queryKey: ["listsForEvent", eventId] });
      toast({ title: "List linked to event" });
      onLinked?.();
      onOpenChange(false);
      setSearch("");
    },
    onError: (error) => {
      const message = String(error?.message || "");
      if (message.includes("event_id") || message.includes("column")) {
        toast({
          title: "Database update required",
          description:
            "Run the latest Supabase migration (lists.event_id) on your project, then try again.",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Could not link list",
        description: error?.message || "Something went wrong.",
        variant: "destructive",
      });
    },
  });

  const isLoading = loadingTabs || loadingEvents;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] max-w-md overflow-hidden p-0">
        <DialogHeader className="border-b border-slate-100 px-5 py-4">
          <DialogTitle>Link to an event</DialogTitle>
          <DialogDescription>
            Attach this checklist to a Gather event so it opens from the calendar too.
          </DialogDescription>
        </DialogHeader>

        <div className="px-5 pt-3">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search events or tables..."
              className="pl-8"
            />
          </div>
        </div>

        <div className="max-h-[50vh] overflow-y-auto px-3 py-3">
          {isLoading ? (
            <div className="flex items-center justify-center gap-2 py-10 text-sm text-slate-500">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading events...
            </div>
          ) : ownedTabIds.length === 0 ? (
            <p className="px-2 py-8 text-center text-sm text-slate-500">
              Create a table in Calendar first, then add events to link this list.
            </p>
          ) : filteredEvents.length === 0 ? (
            <p className="px-2 py-8 text-center text-sm text-slate-500">
              No events found in this range. Try a different search or add an event in Calendar.
            </p>
          ) : (
            <ul className="space-y-1">
              {filteredEvents.map((event) => (
                <li key={event.id}>
                  <button
                    type="button"
                    disabled={linkMutation.isPending}
                    onClick={() => linkMutation.mutate(event.id)}
                    className="flex w-full items-start gap-3 rounded-lg border border-transparent px-2 py-2.5 text-left transition hover:border-slate-200 hover:bg-slate-50 disabled:opacity-50"
                  >
                    <Calendar className="mt-0.5 h-4 w-4 shrink-0 text-[#6C63FF]" />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[13px] font-medium text-slate-900">
                        {event.title || "Untitled event"}
                      </div>
                      <div className="mt-0.5 truncate text-[11px] text-slate-500">
                        {formatEventWhen(event)}
                        {tabNameById[event.tab_id]
                          ? ` · ${tabNameById[event.tab_id]}`
                          : ""}
                      </div>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

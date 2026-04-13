// src/pages/calendar.jsx
import { generateSuggestions } from "@/lib/ai/suggestions";
import React, { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/components/ui/use-toast";
import {
  inviteToTab,
  updateTabShare,
  removeTabShare,
  fetchSharedTabsForMe,
  claimTabInvitesForUser,
} from "../lib/tabShares";
import { fetchTabs, createTab, updateTab, deleteTab } from "../lib/tabs";
import {
  fetchEvents,
  createEvent,
  updateEvent,
  deleteEvent,
  editSingleOccurrence,
  deleteSingleOccurrence,
} from "../lib/events";
import { fetchNotes, createNote, updateNote, deleteNote } from "../lib/notes";
import CalendarHeader from "../components/calendar/CalendarHeader";
import MonthView from "../components/calendar/MonthView";
import WeekView from "../components/calendar/WeekView";
import Sidebar from "../components/calendar/Sidebar";
import EventModal from "../components/calendar/EventModal";
import TabModal from "../components/calendar/TabModal";
import ShareModal from "../components/calendar/ShareModal";
import EventHistoryPanel from "../components/calendar/EventHistoryPanel";
import SuggestionsInbox from "../components/calendar/SuggestionsInbox";
import SuggestionsSettingsModal from "../components/calendar/SuggestionsSettingsModal";
import SuggestionsComingSoon from "../components/calendar/SuggestionsComingSoon";
import OnboardingFlow from "../components/calendar/OnboardingFlow";
import TodayAtTheTable from "../components/calendar/TodayAtTheTable";
import useEntitlement from "@/hooks/useEntitlement";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "../components/ui/dialog";
import { Button } from "../components/ui/button";
import { Loader2, Sparkles, Calendar } from "lucide-react";

import { useAuth } from "../context/AuthProvider";
import { supabase } from "../lib/supabase";
import { ruleWithUntilBefore, ruleWithoutUntil } from "@/lib/recurrence_ops";
import RecurrenceScopeModal from "../components/calendar/RecurrenceScopeModal";
import { syncAccountSeatUsage } from "@/lib/entitlements";

import { fetchMyAccount } from "@/lib/account";

import {
  getRealEventId,
  getOccurrenceStartAt,
  isRecurringInstance,
  assertRealDbId,
} from "@/lib/recurrenceUtils";

export default function CalendarPage() {
  const [dismissedSuggestionIds, setDismissedSuggestionIds] = useState(() => {
    try {
      return JSON.parse(
        localStorage.getItem("gather_dismissed_suggestions") || "[]"
      );
    } catch {
      return [];
    }
  });

  const [snoozedSuggestions, setSnoozedSuggestions] = useState(() => {
    try {
      return JSON.parse(
        localStorage.getItem("gather_snoozed_suggestions") || "{}"
      );
    } catch {
      return {};
    }
  });

  const { user, loading } = useAuth();
  const {
    account,
    hasPaidAccess,
    seatLimit,
    seatsUsed,
    remainingSeats,
    tableLimit,
  } = useEntitlement();

  const queryClient = useQueryClient();

  const [currentDate, setCurrentDate] = useState(new Date());
  const isMobile = typeof window !== "undefined" && window.innerWidth < 768;
  const [view, setView] = useState(isMobile ? "week" : "month");

  const [activeTabs, setActiveTabs] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("gather_active_tabs") || "[]");
    } catch {
      return [];
    }
  });

  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);

  const [editingNote, setEditingNote] = useState(null);
  const [noteDraft, setNoteDraft] = useState({ title: "", body: "" });

  const [isTabModalOpen, setIsTabModalOpen] = useState(false);
  const [selectedTab, setSelectedTab] = useState(null);

  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [shareTab, setShareTab] = useState(null);

  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isSuggestionsOpen, setIsSuggestionsOpen] = useState(false);
  const [isSuggestionsSettingsOpen, setIsSuggestionsSettingsOpen] =
    useState(false);
  const [isOnboardingOpen, setIsOnboardingOpen] = useState(false);
  const [isSuggestionsInfoOpen, setIsSuggestionsInfoOpen] = useState(false);

  const [editScopePromptOpen, setEditScopePromptOpen] = useState(false);
  const [pendingRecurringClick, setPendingRecurringClick] = useState(null);
  const [recurrenceScopeModal, setRecurrenceScopeModal] = useState(null);

  const invalidateEvents = () =>
    queryClient.invalidateQueries({
      predicate: (q) => Array.isArray(q.queryKey) && q.queryKey[0] === "events",
    });

  const normalizeEventForModal = (ev) => {
    if (!ev) return ev;

    const start =
      ev?.start_date ??
      ev?.start_at ??
      ev?.originalStartAt ??
      ev?.start ??
      "";

    const end = ev?.end_date ?? ev?.end_at ?? ev?.end ?? "";

    return {
      ...ev,
      start_date: start,
      end_date: end,
      start_at: ev?.start_at ?? start,
      end_at: ev?.end_at ?? end,
      allDay: ev?.allDay ?? ev?.all_day ?? false,
      all_day: ev?.all_day ?? ev?.allDay ?? false,
    };
  };

  const normalizeDraggedEvent = (input) => {
    if (!input) return null;

    const ev =
      input?.event && !input?.start_date && !input?.start_at
        ? input.event
        : input;

    return {
      ...ev,
      id: ev?.id ?? ev?.event_id ?? ev?.eventId ?? null,
      recurringInstanceOf:
        ev?.recurringInstanceOf ?? ev?.recurrence_parent_id ?? null,

      // IMPORTANT:
      // Only keep true occurrence markers here.
      // Do NOT fall back to start_date/start_at for normal events.
      originalStartAt: ev?.originalStartAt ?? ev?.original_start_at ?? null,

      start_date: ev?.start_date ?? ev?.start_at ?? null,
      end_date: ev?.end_date ?? ev?.end_at ?? null,
      start_at: ev?.start_at ?? ev?.start_date ?? null,
      end_at: ev?.end_at ?? ev?.end_date ?? null,
      all_day: ev?.all_day ?? ev?.allDay ?? false,
      allDay: ev?.allDay ?? ev?.all_day ?? false,
    };
  };

  const WEEKDAY_CODES = ["SU", "MO", "TU", "WE", "TH", "FR", "SA"];

  const getByDayFromISO = (iso) => {
    if (!iso) return null;
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return null;
    return WEEKDAY_CODES[d.getUTCDay()];
  };

  const rewriteRRuleByDay = (rule, newStartISO, originalStartISO) => {
    if (!rule || !newStartISO || !originalStartISO) return rule;

    const oldDay = getByDayFromISO(originalStartISO);
    const newDay = getByDayFromISO(newStartISO);

    if (!oldDay || !newDay || oldDay === newDay) return rule;

    const parts = String(rule).split(";");
    const byDayIndex = parts.findIndex((p) => p.startsWith("BYDAY="));

    if (byDayIndex === -1) {
      return `${rule};BYDAY=${newDay}`;
    }

    const currentDays = parts[byDayIndex]
      .replace("BYDAY=", "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    const nextDays = currentDays.map((d) => (d === oldDay ? newDay : d));

    parts[byDayIndex] = `BYDAY=${nextDays.join(",")}`;
    return parts.join(";");
  };

  const buildShiftedSeriesRule = (
    masterRule,
    newStartISO,
    originalOccurrenceISO
  ) => {
    if (!masterRule) return null;
    return rewriteRRuleByDay(masterRule, newStartISO, originalOccurrenceISO);
  };

  const openScopeChoice = (action, ev, payload = {}) => {
    const normalizedBase = normalizeEventForModal(ev);
    const realId = getRealEventId(ev);
    const occurrenceStartAt = getOccurrenceStartAt(ev);
    const recurring = isRecurringInstance(ev);

    const normalizedEvent = {
      ...normalizedBase,
      recurringInstanceOf: recurring ? realId : null,
      originalStartAt: recurring ? occurrenceStartAt : null,
    };

    const normalizedPayload = {
      ...payload,
      newStartISO:
        payload?.newStartISO ??
        payload?.start_date ??
        payload?.start_at ??
        null,
      newEndISO:
        payload?.newEndISO ?? payload?.end_date ?? payload?.end_at ?? null,
      start_date:
        payload?.start_date ??
        payload?.newStartISO ??
        payload?.start_at ??
        null,
      end_date:
        payload?.end_date ?? payload?.newEndISO ?? payload?.end_at ?? null,
      start_at:
        payload?.start_at ??
        payload?.newStartISO ??
        payload?.start_date ??
        null,
      end_at:
        payload?.end_at ?? payload?.newEndISO ?? payload?.end_date ?? null,
    };

    setRecurrenceScopeModal({
      action,
      event: normalizedEvent,
      payload: normalizedPayload,
    });
  };

  const getMasterEventById = async (input) => {
    const resolvedId = assertRealDbId(input);

    const { data, error } = await supabase
      .from("events")
      .select("*")
      .eq("id", resolvedId)
      .single();

    if (error) {
      console.error("getMasterEventById error:", {
        input,
        resolvedId,
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code,
      });
      throw error;
    }

    return data;
  };

  const applyRecurrenceScope = async (scope) => {
    try {
      if (!recurrenceScopeModal) return;

      const { action, event: ev, payload = {} } = recurrenceScopeModal;

      const masterId = assertRealDbId(ev);
      const occurrenceStartISO = getOccurrenceStartAt(ev);
      const master = await getMasterEventById(masterId);

      if (!master) {
        throw new Error("Could not resolve recurring master event.");
      }

      const masterStart = master.start_date ?? master.start_at ?? null;
      const masterEnd = master.end_date ?? master.end_at ?? null;

      const draggedStart =
        payload?.newStartISO ??
        payload?.start_date ??
        payload?.start_at ??
        null;

      const draggedEnd =
        payload?.newEndISO ?? payload?.end_date ?? payload?.end_at ?? null;

      const updateSource = payload?.updates ?? {};

      const editStart =
        updateSource?.start_date ??
        updateSource?.start_at ??
        draggedStart ??
        occurrenceStartISO ??
        masterStart;

      const editEnd =
        updateSource?.end_date ??
        updateSource?.end_at ??
        draggedEnd ??
        masterEnd;

      const durationMs =
        masterStart && masterEnd
          ? Math.max(
              15 * 60 * 1000,
              new Date(masterEnd).getTime() - new Date(masterStart).getTime()
            )
          : 60 * 60 * 1000;

      const buildMergedSeriesUpdate = () => ({
        title: updateSource?.title ?? master.title,
        tab_id: updateSource?.tab_id ?? master.tab_id,
        location: updateSource?.location ?? master.location ?? "",
        event_type: updateSource?.event_type ?? master.event_type ?? null,
        visibility: updateSource?.visibility ?? master.visibility ?? "private",
        notes: updateSource?.notes ?? master.notes ?? "",
        private_notes:
          updateSource?.private_notes ??
          updateSource?.privateNotes ??
          master.private_notes ??
          "",
        all_day:
          updateSource?.all_day ??
          updateSource?.allDay ??
          master.all_day ??
          master.allDay ??
          false,
        start_date: editStart,
        end_date: editEnd,
        start_at: editStart,
        end_at: editEnd,
      });

      // ======================
      // ONE OCCURRENCE
      // ======================
      if (scope === "one") {
        if (!occurrenceStartISO) {
          throw new Error("Missing occurrence start time.");
        }

        if (action === "move" || action === "resize") {
          if (!draggedStart || !draggedEnd) {
            throw new Error("Missing dragged start or end time.");
          }

          await editSingleOccurrence({
            master,
            occurrenceStartISO,
            updates: {
              title: master.title,
              tab_id: master.tab_id,
              location: master.location ?? "",
              event_type: master.event_type ?? null,
              visibility: master.visibility ?? "private",
              notes: master.notes ?? "",
              private_notes: master.private_notes ?? "",
              all_day:
                payload?.all_day ?? payload?.allDay ?? master.all_day ?? false,
              start_date: draggedStart,
              end_date: draggedEnd,
              start_at: draggedStart,
              end_at: draggedEnd,
            },
          });
        } else if (action === "edit") {
          if (!editStart || !editEnd) {
            throw new Error("Missing edited start or end date.");
          }

          await editSingleOccurrence({
            master,
            occurrenceStartISO,
            updates: {
              title: updateSource?.title ?? master.title,
              tab_id: updateSource?.tab_id ?? master.tab_id,
              location: updateSource?.location ?? master.location ?? "",
              event_type: updateSource?.event_type ?? master.event_type ?? null,
              visibility:
                updateSource?.visibility ?? master.visibility ?? "private",
              notes: updateSource?.notes ?? master.notes ?? "",
              private_notes:
                updateSource?.private_notes ??
                updateSource?.privateNotes ??
                master.private_notes ??
                "",
              all_day:
                updateSource?.all_day ??
                updateSource?.allDay ??
                master.all_day ??
                false,
              start_date: editStart,
              end_date: editEnd,
              start_at: editStart,
              end_at: editEnd,
            },
          });
        } else if (action === "delete") {
          await deleteSingleOccurrence({
            master,
            occurrenceStartISO,
          });
        } else {
          throw new Error(`Unsupported recurrence action: ${action}`);
        }

        await invalidateEvents();
        setRecurrenceScopeModal(null);
        setSelectedEvent(null);
        return;
      }

      // ======================
      // ENTIRE SERIES
      // ======================
      if (scope === "series") {
        if (action === "delete") {
          await deleteEvent(masterId);
        } else if (
          action === "move" ||
          action === "resize" ||
          action === "edit"
        ) {
          const merged = buildMergedSeriesUpdate();

          if (!merged.start_date || !merged.end_date) {
            throw new Error("Missing updated series start or end date.");
          }

          const oldRule = master.recurrenceRule ?? master.recurrence_rule ?? null;
          const shiftedRule =
            action === "move" || action === "resize"
              ? buildShiftedSeriesRule(
                  oldRule,
                  merged.start_date,
                  occurrenceStartISO ?? masterStart
                )
              : oldRule;

          await updateEvent(masterId, {
            ...merged,
            recurrenceRule: shiftedRule,
          });
        } else {
          throw new Error(`Unsupported recurrence action: ${action}`);
        }

        await invalidateEvents();
        setRecurrenceScopeModal(null);
        setSelectedEvent(null);
        return;
      }

      // ======================
      // THIS AND FOLLOWING
      // ======================
      if (scope === "following") {
        if (!occurrenceStartISO) {
          throw new Error("Missing occurrence start time.");
        }

        const oldRule = master.recurrenceRule ?? master.recurrence_rule;
        if (!oldRule) {
          throw new Error("This event does not have a recurrence rule.");
        }

        const endedRule = ruleWithUntilBefore(oldRule, occurrenceStartISO);

        await updateEvent(masterId, {
          recurrenceRule: endedRule,
        });

        if (action === "delete") {
          await invalidateEvents();
          setRecurrenceScopeModal(null);
          setSelectedEvent(null);
          return;
        }

        let newSeriesStart = null;
        let newSeriesEnd = null;

        if (action === "move" || action === "resize") {
          newSeriesStart = draggedStart;
          newSeriesEnd = draggedEnd;
        } else if (action === "edit") {
          newSeriesStart = editStart;
          newSeriesEnd = editEnd;
        }

        if (!newSeriesStart) {
          throw new Error("Missing new series start date.");
        }

        if (!newSeriesEnd) {
          newSeriesEnd = new Date(
            new Date(newSeriesStart).getTime() + durationMs
          ).toISOString();
        }

        const continuedRule = buildShiftedSeriesRule(
          ruleWithoutUntil(oldRule),
          newSeriesStart,
          occurrenceStartISO
        );

        await createEvent({
          owner_id: master.owner_id,
          tab_id: updateSource?.tab_id ?? master.tab_id,
          title: updateSource?.title ?? master.title ?? "Untitled event",
          location: updateSource?.location ?? master.location ?? "",
          event_type: updateSource?.event_type ?? master.event_type ?? null,
          visibility: updateSource?.visibility ?? master.visibility ?? "private",
          allDay:
            updateSource?.allDay ??
            updateSource?.all_day ??
            master.all_day ??
            master.allDay ??
            false,
          notes: updateSource?.notes ?? master.notes ?? "",
          privateNotes:
            updateSource?.privateNotes ??
            updateSource?.private_notes ??
            master.private_notes ??
            "",
          start_date: newSeriesStart,
          end_date: newSeriesEnd,
          recurrenceRule: continuedRule,
          recurrenceTimezone:
            master.recurrenceTimezone ?? master.recurrence_timezone ?? null,
          recurrenceExdates: [],
          recurrenceRdates: [],
        });

        await invalidateEvents();
        setRecurrenceScopeModal(null);
        setSelectedEvent(null);
        return;
      }

      throw new Error(`Unknown recurrence scope: ${scope}`);
    } catch (err) {
      console.error("applyRecurrenceScope error:", err);
      toast({
        title: "Error",
        description: err?.message ?? "Could not apply recurrence change.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteEvent = async (ev = selectedEvent) => {
    try {
      if (!ev) return;

      if (ev?.recurrenceParentId) {
        await deleteEventMutation.mutateAsync(ev);
        return;
      }

      const isRecurring =
        ev?.recurrenceRule ||
        ev?.recurrence_rule ||
        ev?.recurringInstanceOf ||
        (typeof ev?.id === "string" && ev.id.includes("__"));

      const occurrenceStartISO =
        ev?.originalStartAt ?? ev?.start_date ?? ev?.start_at ?? null;

      if (isRecurring && occurrenceStartISO) {
        openScopeChoice("delete", ev, {});
        return;
      }

      await deleteEventMutation.mutateAsync(ev);
    } catch (err) {
      console.error("handleDeleteEvent error:", err);
      toast({
        title: "Error",
        description: "Could not delete event.",
        variant: "destructive",
      });
    }
  };

  const handleMoveEvent = async ({
    event,
    nextStart,
    nextEnd,
    nextAllDay = false,
  }) => {
    try {
      const ev = normalizeDraggedEvent(event);

      if (!ev) {
        throw new Error("Missing event payload for move.");
      }

      const movePayload = {
        newStartISO: nextStart,
        newEndISO: nextEnd,
        start_date: nextStart,
        end_date: nextEnd,
        start_at: nextStart,
        end_at: nextEnd,
        all_day: nextAllDay,
        allDay: nextAllDay,
      };

      // 🔴 ALWAYS route recurring through scope modal
      if (isRecurringInstance(ev)) {
        openScopeChoice("move", ev, movePayload);
        return;
      }

      // 🔒 GUARANTEE REAL DB ID
      const realId = assertRealDbId(ev);

      await updateEvent(realId, {
        start_date: nextStart,
        end_date: nextEnd,
        start_at: nextStart,
        end_at: nextEnd,
        all_day: nextAllDay,
      });

      await invalidateEvents();
    } catch (error) {
      console.error("handleMoveEvent error:", error);
      toast({
        title: "Could not move event",
        description: error?.message || "Something went wrong.",
        variant: "destructive",
      });
    }
  };

  // ---------- TABS (Supabase) ----------
  const {
    data: ownedTabs = [],
    isLoading: isLoadingTabs,
    error: tabsError,
    isError: isTabsError,
  } = useQuery({
    queryKey: ["tabs", user?.id],
    queryFn: () => fetchTabs(user.id),
    enabled: !!user?.id,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    staleTime: 30000,
  });

  useEffect(() => {
    localStorage.setItem("gather_active_tabs", JSON.stringify(activeTabs));
  }, [activeTabs]);

  const {
    data: sharedTabs = [],
    isLoading: isLoadingSharedTabs,
    error: sharedTabsError,
    isError: isSharedTabsError,
  } = useQuery({
    queryKey: ["sharedTabs", user?.id, user?.email],
    queryFn: () =>
      fetchSharedTabsForMe({
        userId: user.id,
        email: user.email,
      }),
    enabled: !!user?.id && !!user?.email,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    staleTime: 30000,
  });

  const sharedWithMe = sharedTabs;
  const allTabs = useMemo(() => [...ownedTabs, ...sharedTabs], [ownedTabs, sharedTabs]);

  const visibleTabIds = useMemo(() => {
    return new Set(allTabs.map((t) => t.id));
  }, [allTabs]);

  const canCreateMoreOwnedTabs = () => {
    if (hasPaidAccess) return true;
    if (typeof tableLimit !== "number") return true;
    return ownedTabs.length < tableLimit;
  };

  const openCreateTabModal = () => {
    if (!canCreateMoreOwnedTabs()) {
      toast({
        title: "Free plan limit reached",
        description: `Free accounts include ${tableLimit} tables. Upgrade to create more.`,
        variant: "destructive",
      });
      return;
    }

    setSelectedTab(null);
    setIsTabModalOpen(true);
  };

  // real time update
  useEffect(() => {
    if (!user?.id) return;
    if (!allTabs.length) return;

    const channel = supabase
      .channel(`events-realtime-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "events",
        },
        (payload) => {
          const changedRow = payload.new ?? payload.old;
          const changedTabId = changedRow?.tab_id;

          if (!changedTabId) return;
          if (!visibleTabIds.has(changedTabId)) return;

          queryClient.invalidateQueries({
            predicate: (q) =>
              Array.isArray(q.queryKey) && q.queryKey[0] === "events",
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, allTabs.length, visibleTabIds, queryClient]);

  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel(`tab-shares-realtime-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "tab_shares",
        },
        () => {
          queryClient.invalidateQueries({
            predicate: (q) =>
              Array.isArray(q.queryKey) &&
              (q.queryKey[0] === "sharedTabs" || q.queryKey[0] === "tabs"),
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, queryClient]);

  // Initialize active tabs
  useEffect(() => {
    if (allTabs.length > 0 && activeTabs.length === 0) {
      setActiveTabs(allTabs.map((t) => t.id));
    }
  }, [allTabs, activeTabs.length]);

  // Auto-create default tabs for new users (first run)
  useEffect(() => {
    if (!user || isLoadingTabs) return;
    if (ownedTabs.length > 0) return;

    const defaults = [
      { name: "Work", color: "indigo", is_default: true },
      { name: "Personal", color: "violet", is_default: false },
      { name: "Family", color: "emerald", is_default: false },
    ];

    (async () => {
      try {
        for (const tab of defaults) {
          await createTab({
            owner_id: user.id,
            ...tab,
            notification_settings: {
              on_create: true,
              on_update: true,
              on_delete: true,
            },
          });
        }

        queryClient.invalidateQueries({ queryKey: ["tabs", user.id] });

        toast({
          title: "Table created",
          description: "Default tabs were added.",
        });
      } catch (e) {
        toast({
          title: "Couldn’t create default tabs",
          description: e?.message ?? "Something went wrong.",
          variant: "destructive",
        });
      }
    })();
  }, [user, isLoadingTabs, ownedTabs.length, queryClient]);

  useEffect(() => {
    async function syncInvites() {
      if (!user?.id || !user?.email) return;

      try {
        await claimTabInvitesForUser({
          userId: user.id,
          email: user.email,
        });
        queryClient.invalidateQueries({ queryKey: ["tabs"] });
        queryClient.invalidateQueries({ queryKey: ["shared-tabs"] });
      } catch (error) {
        console.error("Failed to sync tab invites", error);
      }
    }

    syncInvites();
  }, [user?.id, user?.email, queryClient]);

  // ---------- EVENTS (Supabase) ----------
  const range = useMemo(() => {
    // MonthView needs a calendar grid range; WeekView needs week range.
    // We'll just fetch a safe window around currentDate:
    const start = new Date(currentDate);
    start.setDate(1);
    start.setHours(0, 0, 0, 0);

    const end = new Date(currentDate);
    end.setMonth(end.getMonth() + 1);
    end.setDate(0);
    end.setHours(23, 59, 59, 999);

    return { startISO: start.toISOString(), endISO: end.toISOString() };
  }, [currentDate]);

  const { data: events = [], isLoading: isLoadingEvents } = useQuery({
    queryKey: ["events", user?.id, activeTabs, range.startISO, range.endISO],
    queryFn: () =>
      fetchEvents({
        ownerId: user.id,
        tabIds: activeTabs,
        startISO: range.startISO,
        endISO: range.endISO,
      }),
    enabled: !!user?.id && !isLoadingTabs,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    staleTime: 15000,
  });

  // ---------- NOTES (Supabase) ----------
  const { data: notes = [], isLoading: isLoadingNotes } = useQuery({
    queryKey: ["notes", user?.id, activeTabs],
    queryFn: () => fetchNotes({ ownerId: user.id, tabIds: activeTabs }),
    enabled: !!user?.id && !isLoadingTabs,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    staleTime: 15000,
  });

  const tabShares = [];
  const eventHistory = [];

  const suggestions = useMemo(() => {
    const rawSuggestions = generateSuggestions(events);
    const now = Date.now();

    return rawSuggestions.filter((suggestion) => {
      if (dismissedSuggestionIds.includes(suggestion.id)) return false;

      const snoozedUntil = snoozedSuggestions[suggestion.id];
      if (snoozedUntil && snoozedUntil > now) return false;

      return true;
    });
  }, [events, dismissedSuggestionIds, snoozedSuggestions]);

  const userPreferences = { has_completed_onboarding: true };

  const handleMakeRecurring = async (suggestion) => {
    try {
      const title = suggestion.message.match(/"(.*?)"/)?.[1];
      if (!title) {
        toast({
          title: "Couldn’t detect event title",
          variant: "destructive",
        });
        return;
      }

      const matchingEvents = events
        .filter((e) => (e.title || "").trim() === title)
        .sort(
          (a, b) =>
            new Date(a.start_date ?? a.start_at).getTime() -
            new Date(b.start_date ?? b.start_at).getTime()
        );

      if (matchingEvents.length < 2) {
        toast({
          title: "Not enough events",
          description:
            "Need at least 2 matching events to create a recurring pattern.",
          variant: "destructive",
        });
        return;
      }

      const first = matchingEvents[0];
      const firstStart = first.start_date ?? first.start_at;
      const firstEnd = first.end_date ?? first.end_at;

      if (!firstStart || !firstEnd) {
        toast({
          title: "Missing event dates",
          variant: "destructive",
        });
        return;
      }

      // v1: simple weekly recurrence
      const recurrenceRule = "FREQ=WEEKLY";

      await createEvent({
        owner_id: user.id,
        tab_id: first.tab_id,
        title: first.title,
        location: first.location ?? "",
        event_type: first.event_type ?? null,
        visibility: first.visibility ?? "private",
        allDay: first.all_day ?? first.allDay ?? false,
        notes: first.notes ?? "",
        privateNotes: first.private_notes ?? first.privateNotes ?? "",
        start_date: firstStart,
        end_date: firstEnd,
        recurrenceRule,
        recurrenceTimezone:
          first.recurrence_timezone ?? first.recurrenceTimezone ?? null,
        recurrenceExdates: [],
        recurrenceRdates: [],
      });

      // delete the duplicate single events after creating recurring master
      for (const ev of matchingEvents) {
        await deleteEvent(ev.id);
      }

      await invalidateEvents();

      toast({
        title: "Recurring event created",
        description: `"${title}" is now set up as a weekly recurring event.`,
      });

      dismissSuggestion(suggestion.id);
    } catch (err) {
      console.error("handleMakeRecurring error:", err);
      toast({
        title: "Failed to create recurring event",
        description: err?.message ?? "Something went wrong.",
        variant: "destructive",
      });
    }
  };

  // ---------- TAB mutations ----------
  const createTabMutation = useMutation({
    mutationFn: (data) => createTab({ owner_id: user.id, ...data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tabs", user.id] });
      toast({ title: "Table created", description: "Your tab is ready." });

      setIsTabModalOpen(false);
      setSelectedTab(null);
    },
    onError: (e) => {
      toast({
        title: "Couldn’t create tab",
        description: e?.message ?? "Something went wrong.",
        variant: "destructive",
      });
    },
  });

  const updateTabMutation = useMutation({
    mutationFn: ({ id, data }) => updateTab(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tabs", user.id] });
      toast({ title: "Table updated" });

      setIsTabModalOpen(false);
      setSelectedTab(null);
    },
    onError: (e) => {
      toast({
        title: "Couldn’t update tab",
        description: e?.message ?? "Something went wrong.",
        variant: "destructive",
      });
    },
  });

  const deleteTabMutation = useMutation({
    mutationFn: (id) => deleteTab(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tabs", user.id] });
      toast({ title: "table deleted" });
      setIsTabModalOpen(false);
      setSelectedTab(null);
    },
    onError: (e) => {
      toast({
        title: "Couldn’t delete tab",
        description: e?.message ?? "Something went wrong.",
        variant: "destructive",
      });
    },
  });

  // ---------- EVENT mutations ----------
  const createEventMutation = useMutation({
    mutationFn: (data) => createEvent({ owner_id: user.id, ...data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["events", user.id] });
      toast({ title: "Event created" });

      setIsEventModalOpen(false);
      setSelectedEvent(null);
      setSelectedDate(null);
      setSelectedTab(null);
    },
    onError: (e) => {
      toast({
        title: "Couldn’t create event",
        description: e?.message ?? "Something went wrong.",
        variant: "destructive",
      });
    },
  });

  const updateEventMutation = useMutation({
    mutationFn: ({ id, data }) => updateEvent(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["events", user.id] });
      toast({ title: "Event updated" });

      setIsEventModalOpen(false);
      setSelectedEvent(null);
      setSelectedDate(null);
      setSelectedTab(null);
    },
    onError: (e) => {
      toast({
        title: "Couldn’t update event",
        description: e?.message ?? "Something went wrong.",
        variant: "destructive",
      });
    },
  });

  const deleteEventMutation = useMutation({
    mutationFn: (event) => deleteEvent(event.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["events", user.id] });
      toast({ title: "Event deleted" });
      setIsEventModalOpen(false);
      setSelectedEvent(null);
      setSelectedDate(null);
      setSelectedTab(null);
    },
    onError: (e) => {
      toast({
        title: "Couldn’t delete event",
        description: e?.message ?? "Something went wrong.",
        variant: "destructive",
      });
    },
  });

  // ---------- NOTES mutations ----------
  const createNoteMutation = useMutation({
    mutationFn: (data) => createNote({ owner_id: user.id, ...data }),
    onSuccess: (created) => {
      queryClient.invalidateQueries({ queryKey: ["notes", user.id] });

      toast({
        title: "Note created",
        description: "Opened the new note for editing.",
      });

      // ✅ immediately open editor on the new note
      if (created?.id) {
        setEditingNote(created);
        setNoteDraft({ title: created.title ?? "", body: created.body ?? "" });
      }
    },
    onError: (e) => {
      toast({
        title: "Couldn’t create note",
        description: e?.message ?? "Something went wrong.",
        variant: "destructive",
      });
    },
  });

  const updateNoteMutation = useMutation({
    mutationFn: ({ id, data }) => updateNote(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notes", user.id] });
      toast({ title: "Note updated" });
    },
    onError: (e) => {
      toast({
        title: "Couldn’t update note",
        description: e?.message ?? "Something went wrong.",
        variant: "destructive",
      });
    },
  });

  const deleteNoteMutation = useMutation({
    mutationFn: (note) => deleteNote(note.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notes", user.id] });
      toast({ title: "Note deleted" });
    },
    onError: (e) => {
      toast({
        title: "Couldn’t delete note",
        description: e?.message ?? "Something went wrong.",
        variant: "destructive",
      });
    },
  });

  // ---------- Bridge placeholders ----------
const bridgeNotConnected = (msg = "Not connected yet (coming next).") => {
  toast({ title: "Coming soon", description: msg });
};

const shareTabMutation = useMutation({
  mutationFn: async ({ tabId, email, role }) => {
    const normalizedEmail = String(email ?? "").trim().toLowerCase();

    if (!normalizedEmail) {
      throw new Error("Enter an email address to invite.");
    }

    if (!hasPaidAccess) {
      throw new Error("Inviting people is part of the Family plan.");
    }

    if (normalizedEmail === String(user?.email ?? "").trim().toLowerCase()) {
      throw new Error("You are already on this account.");
    }

    // Re-sync seat usage before checking limits so stale UI does not allow extra invites
    if (account?.id) {
      await syncAccountSeatUsage(account.id);
      await queryClient.invalidateQueries({ queryKey: ["account", user.id] });
    }

    const freshAccount = await queryClient.fetchQuery({
      queryKey: ["account", user.id],
      queryFn: () => fetchMyAccount(user.id),
    });

    const freshSeatLimit =
      typeof freshAccount?.seat_limit === "number" && freshAccount.seat_limit > 0
        ? freshAccount.seat_limit
        : seatLimit;

    const freshSeatsUsed =
      typeof freshAccount?.seats_used === "number" && freshAccount.seats_used >= 0
        ? freshAccount.seats_used
        : seatsUsed;

    const freshRemainingSeats = Math.max(freshSeatLimit - freshSeatsUsed, 0);

    if (freshRemainingSeats <= 0) {
      throw new Error("Your account has reached its current seat limit.");
    }

    return inviteToTab({
      tabId,
      ownerId: user.id,
      email: normalizedEmail,
      role,
    });
  },

  onSuccess: async () => {
    toast({ title: "Invite sent" });

    if (account?.id) {
      await syncAccountSeatUsage(account.id);
    }

    await queryClient.invalidateQueries({ queryKey: ["sharedTabs", user.id] });
    await queryClient.invalidateQueries({ queryKey: ["account", user.id] });
    await queryClient.invalidateQueries({ queryKey: ["tabs", user.id] });
  },

  onError: (e) =>
    toast({
      title: "Invite failed",
      description: e?.message ?? "Something went wrong.",
      variant: "destructive",
    }),
});

  const updateShareMutation = useMutation({
    mutationFn: ({ shareId, role }) => updateTabShare({ shareId, role }),
    onSuccess: () => toast({ title: "Access updated" }),
    onError: (e) =>
      toast({
        title: "Update failed",
        description: e?.message ?? "Something went wrong.",
        variant: "destructive",
      }),
  });

  const removeShareMutation = useMutation({
    mutationFn: async ({ shareId }) => {
      const result = await removeTabShare({ shareId });

      if (account?.id) {
        await syncAccountSeatUsage(account.id);
      }

      return result;
    },
    onSuccess: () => {
      toast({ title: "Access removed" });
      queryClient.invalidateQueries({ queryKey: ["account", user.id] });
      queryClient.invalidateQueries({ queryKey: ["sharedTabs", user.id] });
    },
    onError: (e) =>
      toast({
        title: "Remove failed",
        description: e?.message ?? "Something went wrong.",
        variant: "destructive",
      }),
  });

  const acceptSuggestionMutation = useMutation({
    mutationFn: async () => {
      bridgeNotConnected();
      return null;
    },
  });

  const rejectSuggestionMutation = useMutation({
    mutationFn: async () => {
      bridgeNotConnected();
      return null;
    },
  });

  const updateSuggestionsSettingsMutation = useMutation({
    mutationFn: async () => {
      bridgeNotConnected();
      return null;
    },
  });

  // helpers preserved
  const getUserRole = () => "owner";

  const isOwnedTab = (tab) => !!tab && tab.owner_id === user?.id;

  const canManageTab = (tab) => isOwnedTab(tab);
  const canShareTab = (tab) => isOwnedTab(tab);

  const getTabAccess = (tab) => {
    if (!tab) return "none";
    if (tab.owner_id === user?.id) return "owner";
    return tab.share_role || "viewer";
  };

  const canEditTabContent = (tab) => {
    const access = getTabAccess(tab);
    return access === "owner" || access === "editor";
  };

  const defaultTab = useMemo(
    () => ownedTabs.find((t) => t.is_default) || ownedTabs[0],
    [ownedTabs]
  );

  const handleToggleTab = (tabId) => {
    setActiveTabs((prev) =>
      prev.includes(tabId)
        ? prev.filter((id) => id !== tabId)
        : [...prev, tabId]
    );
  };

  const dismissSuggestion = (suggestionId) => {
    setDismissedSuggestionIds((prev) => {
      if (prev.includes(suggestionId)) return prev;
      return [...prev, suggestionId];
    });
  };

  const snoozeSuggestion = (suggestionId, minutes = 60) => {
    const until = Date.now() + minutes * 60 * 1000;

    setSnoozedSuggestions((prev) => ({
      ...prev,
      [suggestionId]: until,
    }));
  };

  // Notes editor helpers
  const openNoteEditor = (note) => {
    setEditingNote(note);
    setNoteDraft({ title: note?.title ?? "", body: note?.body ?? "" });
  };

  const closeNoteEditor = () => {
    setEditingNote(null);
    setNoteDraft({ title: "", body: "" });
  };

  const saveNoteDraft = () => {
    if (!editingNote) return;
    updateNoteMutation.mutate({
      id: editingNote.id,
      data: { title: noteDraft.title, body: noteDraft.body },
    });
    closeNoteEditor();
  };

  // ---------- Recurrence: click handler (single source of truth) ----------
  const handleSelectEvent = (event) => {
    // If it's a recurring instance, ask scope first
    if (event?.recurringInstanceOf && event?.originalStartAt) {
      setPendingRecurringClick({
        instanceEvent: normalizeEventForModal(event),
      });
      setEditScopePromptOpen(true);
      return;
    }

    setSelectedEvent(normalizeEventForModal(event));
    setIsEventModalOpen(true);
  };

  // When user clicks a recurring instance, we ask if they want single or series.
  // If they pick "series", we open the master (parent) instead of the instance.
  const openRecurringScope = async (scope) => {
    const instanceEvent = pendingRecurringClick?.instanceEvent;
    if (!instanceEvent) return;

    setEditScopePromptOpen(false);

    if (scope === "series") {
      try {
        const masterId = getRealEventId(instanceEvent);
        const master = await getMasterEventById(masterId);

        if (!master) {
          toast({
            title: "Error",
            description: "Could not find the series master event.",
            variant: "destructive",
          });
          setPendingRecurringClick(null);
          return;
        }

        setSelectedEvent(normalizeEventForModal(master));
        setIsEventModalOpen(true);
        setPendingRecurringClick(null);
        return;
      } catch (e) {
        toast({
          title: "Could not load series",
          description: e?.message ?? "Could not load series master event.",
          variant: "destructive",
        });
        setPendingRecurringClick(null);
        return;
      }
    }

    setSelectedEvent(normalizeEventForModal(instanceEvent));
    setIsEventModalOpen(true);
    setPendingRecurringClick(null);
  };

  // Save handler that understands:
  // - normal event create/update
  // - editing ONE occurrence of a recurring series (creates override)
  const handleEventSaveSmart = async (data) => {
    const targetTabId = data?.tab_id ?? selectedEvent?.tab_id ?? selectedTab?.id;
    const targetTab = allTabs.find((t) => t.id === targetTabId);

    if (targetTab && !canEditTabContent(targetTab)) {
      toast({
        title: "View only",
        description: "You do not have permission to edit events in this table.",
        variant: "destructive",
      });
      return;
    }

    try {
      // Editing an existing event
      if (selectedEvent) {
        // Expanded recurring instance: edit only this occurrence
        if (selectedEvent.recurringInstanceOf && selectedEvent.originalStartAt) {
          const masterId = getRealEventId(selectedEvent);
          const master = await getMasterEventById(masterId);

          if (!master) {
            toast({
              title: "Error",
              description: "Could not find the series master event.",
              variant: "destructive",
            });
            return;
          }

          const resolvedStart =
            data?.start_date ??
            data?.start_at ??
            selectedEvent.originalStartAt;

          const resolvedEnd =
            data?.end_date ??
            data?.end_at ??
            selectedEvent.end_date ??
            selectedEvent.end_at ??
            master.end_date ??
            master.end_at;

          await editSingleOccurrence({
            master,
            occurrenceStartISO: selectedEvent.originalStartAt,
            updates: {
              ...data,
              start_date: resolvedStart,
              end_date: resolvedEnd,
              start_at: resolvedStart,
              end_at: resolvedEnd,
            },
          });

          await invalidateEvents();
          toast({ title: "Occurrence updated" });
          setIsEventModalOpen(false);
          setSelectedEvent(null);
          setSelectedDate(null);
          setSelectedTab(null);
          return;
        }

        // Normal DB event update
        updateEventMutation.mutate({
          id: getRealEventId(selectedEvent) ?? selectedEvent.id,
          data,
          previousData: selectedEvent,
        });
        return;
      }

      // Create new event
      createEventMutation.mutate(data);
    } catch (e) {
      toast({
        title: "Failed to save event",
        description: e?.message ?? "Something went wrong.",
        variant: "destructive",
      });
    }
  };

  // Delete handler that understands:
  // - normal delete
  // - delete single occurrence (EXDATE)
  const handleEventDeleteSmart = async (eventToDelete) => {
    const ev = eventToDelete || selectedEvent;
    if (!ev) return;

    const targetTab = allTabs.find((t) => t.id === ev.tab_id);

    if (targetTab && !canEditTabContent(targetTab)) {
      toast({
        title: "View only",
        description: "You do not have permission to delete events in this table.",
        variant: "destructive",
      });
      return;
    }

    try {
      // Expanded recurring instance: delete only this occurrence
      if (ev.recurringInstanceOf && ev.originalStartAt) {
        const masterId = getRealEventId(ev);
        const master = await getMasterEventById(masterId);

        if (!master) {
          toast({
            title: "Error",
            description: "Could not find the series master event.",
            variant: "destructive",
          });
          return;
        }

        await deleteSingleOccurrence({
          master,
          occurrenceStartISO: ev.originalStartAt,
        });

        await invalidateEvents();
        toast({ title: "Occurrence deleted" });
        setIsEventModalOpen(false);
        setSelectedEvent(null);
        setSelectedDate(null);
        setSelectedTab(null);
        return;
      }

      // Normal DB delete
      deleteEventMutation.mutate(ev);
    } catch (e) {
      toast({
        title: "Failed to delete event",
        description: e?.message ?? "Something went wrong.",
        variant: "destructive",
      });
    }
  };

  const handleTabSave = (data) => {
    if (selectedTab && !isOwnedTab(selectedTab)) {
      return toast({
        title: "Not allowed",
        description: "Only the table owner can edit this table.",
        variant: "destructive",
      });
    }

    const isCreatingNew = !selectedTab;

    if (
      isCreatingNew &&
      !hasPaidAccess &&
      typeof tableLimit === "number" &&
      ownedTabs.length >= tableLimit
    ) {
      return toast({
        title: "Free plan limit reached",
        description: "Free accounts include 3 tables. Upgrade to create more.",
        variant: "destructive",
      });
    }

    if (selectedTab) updateTabMutation.mutate({ id: selectedTab.id, data });
    else createTabMutation.mutate(data);
  };

  const handleRevert = async () =>
    toast({
      title: "Coming soon",
      description: "Bridge mode: History not connected yet.",
    });

  // onboarding gate (kept)
  useEffect(() => {
    if (userPreferences && !userPreferences.has_completed_onboarding) {
      setIsOnboardingOpen(true);
    }
  }, [userPreferences?.has_completed_onboarding]);

  useEffect(() => {
    localStorage.setItem(
      "gather_dismissed_suggestions",
      JSON.stringify(dismissedSuggestionIds)
    );
  }, [dismissedSuggestionIds]);

  useEffect(() => {
    localStorage.setItem(
      "gather_snoozed_suggestions",
      JSON.stringify(snoozedSuggestions)
    );
  }, [snoozedSuggestions]);

  // Loading gate (real auth)
  if (loading || !user) {
    return (
      <div className="h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-600 mx-auto" />
          <p className="mt-2 text-slate-500">Loading your account...</p>
        </div>
      </div>
    );
  }

  const pendingSuggestions = suggestions.length;

  const activeEventTab = selectedEvent?.tab_id
    ? allTabs.find((t) => t.id === selectedEvent.tab_id)
    : selectedTab || defaultTab;

  const activeEventUserRole = !activeEventTab
    ? "owner"
    : isOwnedTab(activeEventTab)
      ? "owner"
      : activeEventTab.share_role ?? "viewer";

  const activeEventIsShared = !!activeEventTab?.is_shared;

  const shouldHideEventDetails = (event) => {
    if (!event) return false;

    const eventTab = allTabs.find((t) => t.id === event.tab_id);
    if (!eventTab) return false;

    const isOwnerViewing = isOwnedTab(eventTab);
    if (isOwnerViewing) return false;

    return event.visibility === "busy_only";
  };

  const activeEventHideDetails = shouldHideEventDetails(selectedEvent);

  return (
    <div className="min-h-[100dvh] w-full overflow-x-hidden flex flex-col bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="flex flex-1 overflow-hidden">
        {!isMobile && (
          <Sidebar
            currentDate={currentDate}
            onDateChange={setCurrentDate}
            tabs={allTabs}
            activeTabs={activeTabs}
            onToggleTab={handleToggleTab}
            onAddTab={openCreateTabModal}
            onShareTab={(tab) => {
              if (!canShareTab(tab)) {
                return toast({
                  title: "Not allowed",
                  description: "Only the table owner can manage sharing.",
                  variant: "destructive",
                });
              }

              setShareTab(tab);
              setIsShareModalOpen(true);
            }}
            onManageTab={(tab) => {
              if (!canManageTab(tab)) {
                return toast({
                  title: "Not allowed",
                  description: "Only the table owner can edit table settings.",
                  variant: "destructive",
                });
              }

              setSelectedTab(tab);
              setIsTabModalOpen(true);
            }}
            sharedTabs={sharedWithMe}
            pendingSuggestionsCount={pendingSuggestions}
            onOpenSuggestions={() => setIsSuggestionsInfoOpen(true)}
          />
        )}

        <div className="flex-1 overflow-y-auto overflow-x-hidden">
          <div className="p-2 sm:p-4 lg:p-6">
            {/* Notes (Supabase) */}
            <div className="mb-4 hidden rounded-xl border bg-white/70 p-3 backdrop-blur lg:block">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <div className="text-sm font-semibold text-slate-900">
                    Notes
                  </div>
                  <div className="text-xs text-slate-500">
                    Across your active tables
                  </div>
                </div>

                <button
                  onClick={() => {
                    const tabId = (selectedTab || defaultTab)?.id;
                    if (!tabId)
                      return toast({
                        title: "No tab selected",
                        description: "Choose a tab first, then create a note.",
                        variant: "destructive",
                      });

                    createNoteMutation.mutate({
                      tab_id: tabId,
                      title: "New note",
                      body: "",
                      pinned: false,
                      visibility: "table",
                    });
                  }}
                  className="px-3 py-2 rounded bg-indigo-600 text-white"
                >
                  + Note
                </button>
              </div>

              {isLoadingNotes ? (
                <div className="text-sm text-slate-500">Loading notes…</div>
              ) : notes.length === 0 ? (
                <div className="text-sm text-slate-500">
                  Start capturing memories, plans, and ideas at your table.
                </div>
              ) : (
                <div className="space-y-2 max-h-[260px] overflow-auto pr-1">
                  {notes.slice(0, 30).map((n) => (
                    <div
                      key={n.id}
                      className="rounded-lg border border-slate-200 bg-white p-2 hover:bg-slate-50 cursor-pointer"
                      onClick={() => openNoteEditor(n)}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="text-sm font-medium text-slate-900 truncate">
                            {n.pinned ? "📌 " : ""}
                            {n.title || "Untitled"}
                          </div>
                          <div className="text-xs text-slate-500 line-clamp-2">
                            {n.body || ""}
                          </div>
                        </div>

                        <div className="flex gap-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={(e) => {
                              e.stopPropagation();
                              updateNoteMutation.mutate({
                                id: n.id,
                                data: { pinned: !n.pinned },
                              });
                            }}
                            title={n.pinned ? "Unpin" : "Pin"}
                          >
                            📌
                          </Button>

                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteNoteMutation.mutate(n);
                              if (editingNote?.id === n.id) closeNoteEditor();
                            }}
                            title="Delete"
                          >
                            🗑️
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {editingNote && (
                <div className="mt-3 rounded-lg border border-slate-200 bg-white p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-sm font-semibold text-slate-900">
                      Edit Note
                    </div>
                    <Button variant="ghost" onClick={closeNoteEditor}>
                      Close
                    </Button>
                  </div>

                  <input
                    className="w-full rounded-md border border-slate-200 px-2 py-1 text-sm mb-2"
                    value={noteDraft.title}
                    onChange={(e) =>
                      setNoteDraft((d) => ({ ...d, title: e.target.value }))
                    }
                    placeholder="Title"
                  />

                  <textarea
                    className="w-full min-h-[140px] rounded-md border border-slate-200 px-2 py-1 text-sm"
                    value={noteDraft.body}
                    onChange={(e) =>
                      setNoteDraft((d) => ({ ...d, body: e.target.value }))
                    }
                    placeholder="Write your note..."
                  />

                  <div className="mt-3 flex gap-2 justify-end">
                    <Button variant="ghost" onClick={closeNoteEditor}>
                      Cancel
                    </Button>
                    <Button
                      className="bg-indigo-600 hover:bg-indigo-700"
                      onClick={saveNoteDraft}
                    >
                      Save
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {!isLoadingEvents && events.length > 0 && (
              <TodayAtTheTable
                events={events}
                tabs={allTabs}
                onSelectEvent={handleSelectEvent}
                onAddEvent={(tab) => {
                  if (!canEditTabContent(tab)) {
                    return toast({
                      title: "View only",
                      description:
                        "You can view this table but cannot add events to it.",
                      variant: "destructive",
                    });
                  }

                  setSelectedEvent(null);
                  setSelectedDate(new Date());
                  setSelectedTab(tab);
                  setIsEventModalOpen(true);
                }}
                onFilterToTab={(tabId) => setActiveTabs([tabId])}
              />
            )}

            <RecurrenceScopeModal
              isOpen={!!recurrenceScopeModal}
              onClose={() => setRecurrenceScopeModal(null)}
              action={recurrenceScopeModal?.action}
              onChoose={applyRecurrenceScope}
            />

            <div className="mb-4 hidden rounded-xl border bg-white/70 p-3 backdrop-blur lg:block">
              <div className="mb-2 flex items-center justify-between">
                <div>
                  <div className="text-sm font-semibold text-slate-900">
                    Smart Suggestions
                  </div>
                  <div className="text-xs text-slate-500">
                    Helpful patterns based on your current events
                  </div>
                </div>
              </div>

              {suggestions.length === 0 ? (
                <div className="text-sm text-slate-500">
                  No suggestions right now.
                </div>
              ) : (
                <div className="space-y-2">
                  {suggestions.map((s) => (
                    <div
                      key={s.id}
                      className={`rounded-lg border p-3 text-sm ${
                        s.severity === "high"
                          ? "border-red-200 bg-red-50 text-red-700"
                          : s.severity === "medium"
                            ? "border-amber-200 bg-amber-50 text-amber-700"
                            : "border-indigo-200 bg-indigo-50 text-indigo-700"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="font-semibold">{s.title}</div>
                          <div className="mt-1">{s.message}</div>
                        </div>

                        <div className="flex shrink-0 gap-2">
                          {s.type === "recurring" && (
                            <button
                              type="button"
                              onClick={() => handleMakeRecurring(s)}
                              className="rounded-md bg-indigo-600 px-2 py-1 text-xs font-medium text-white hover:bg-indigo-700"
                            >
                              Make Recurring
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => snoozeSuggestion(s.id, 60)}
                            className="rounded-md border border-current/20 px-2 py-1 text-xs font-medium hover:bg-white/40"
                          >
                            Snooze
                          </button>

                          <button
                            type="button"
                            onClick={() => dismissSuggestion(s.id)}
                            className="rounded-md border border-current/20 px-2 py-1 text-xs font-medium hover:bg-white/40"
                          >
                            Dismiss
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {!isLoadingEvents && events.length === 0 && (
              <div className="mb-6 flex items-center justify-center">
                <div className="w-full max-w-xl rounded-2xl border bg-white/80 backdrop-blur p-6 text-center shadow-sm">
                  <div className="flex justify-center mb-3">
                    <div className="w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center">
                      <Calendar className="w-6 h-6 text-indigo-600" />
                    </div>
                  </div>

                  <h2 className="text-lg font-semibold text-slate-900">
                    Welcome to Gather
                  </h2>

                  <p className="text-sm text-slate-500 mt-1">
                    Where life meets around the table.
                  </p>

                  <p className="text-sm text-slate-500 mt-3">
                    Start by creating your first event or organizing your tables.
                  </p>

                  <div className="mt-5 flex flex-wrap justify-center gap-2">
                    <Button
                      className="bg-indigo-600 hover:bg-indigo-700"
                      onClick={() => {
                        setSelectedEvent(null);
                        setSelectedDate(new Date());
                        setIsEventModalOpen(true);
                      }}
                    >
                      + Add Event
                    </Button>

                    <Button variant="outline" onClick={openCreateTabModal}>
                      + Create Table
                    </Button>

                    <Button variant="ghost" onClick={() => setIsOnboardingOpen(true)}>
                      View Guide
                    </Button>
                  </div>
                </div>
              </div>
            )}

            <CalendarHeader
              currentDate={currentDate}
              onDateChange={setCurrentDate}
              onAddEvent={() => {
                const baseTab = selectedTab || defaultTab;

                if (baseTab && !canEditTabContent(baseTab)) {
                  return toast({
                    title: "View only",
                    description:
                      "You can view this table but cannot add events to it.",
                    variant: "destructive",
                  });
                }

                setSelectedEvent(null);
                setSelectedDate(new Date());
                setIsEventModalOpen(true);
              }}
              view={view}
              onViewChange={setView}
            />

            {view === "month" ? (
              <MonthView
                currentDate={currentDate}
                events={events}
                tabs={allTabs}
                activeTabs={activeTabs}
                shouldHideEventDetails={shouldHideEventDetails}
                onSelectDate={(date) => {
                  const baseTab = selectedTab || defaultTab;

                  if (baseTab && !canEditTabContent(baseTab)) {
                    return toast({
                      title: "View only",
                      description:
                        "You can view this table but cannot add events to it.",
                      variant: "destructive",
                    });
                  }

                  setSelectedDate(date);
                  setSelectedEvent(null);
                  setIsEventModalOpen(true);
                }}
                onSelectEvent={handleSelectEvent}
                onMoveEvent={handleMoveEvent}
              />
            ) : (
              <WeekView
                currentDate={currentDate}
                events={events}
                tabs={allTabs}
                activeTabs={activeTabs}
                shouldHideEventDetails={shouldHideEventDetails}
                onSelectDate={(date) => {
                  const baseTab = selectedTab || defaultTab;

                  if (baseTab && !canEditTabContent(baseTab)) {
                    return toast({
                      title: "View only",
                      description:
                        "You can view this table but cannot add events to it.",
                      variant: "destructive",
                    });
                  }

                  setSelectedDate(date);
                  setSelectedEvent(null);
                  setIsEventModalOpen(true);
                }}
                onSelectEvent={handleSelectEvent}
                onMoveEvent={handleMoveEvent}
              />
            )}
          </div>
        </div>

        {isMobile && (
          <Sidebar
            isMobile
            currentDate={currentDate}
            onDateChange={setCurrentDate}
            tabs={allTabs}
            activeTabs={activeTabs}
            onToggleTab={handleToggleTab}
            onAddTab={openCreateTabModal}
            onShareTab={(tab) => {
              if (!canShareTab(tab)) {
                return toast({
                  title: "Not allowed",
                  description: "Only the table owner can manage sharing.",
                  variant: "destructive",
                });
              }

              setShareTab(tab);
              setIsShareModalOpen(true);
            }}
            onManageTab={(tab) => {
              if (!canManageTab(tab)) {
                return toast({
                  title: "Not allowed",
                  description: "Only the table owner can edit table settings.",
                  variant: "destructive",
                });
              }

              setSelectedTab(tab);
              setIsTabModalOpen(true);
            }}
            sharedTabs={sharedWithMe}
            pendingSuggestionsCount={pendingSuggestions}
            onOpenSuggestions={() => setIsSuggestionsInfoOpen(true)}
          />
        )}
      </div>

      <EventModal
        isOpen={isEventModalOpen}
        onClose={() => {
          setIsEventModalOpen(false);
          setSelectedEvent(null);
          setSelectedDate(null);
          setSelectedTab(null);
        }}
        event={selectedEvent}
        tabs={allTabs}
        defaultTab={selectedTab || defaultTab}
        defaultDate={selectedDate}
        onSave={handleEventSaveSmart}
        onDelete={handleEventDeleteSmart}
        isSharedEvent={activeEventIsShared}
        userRole={activeEventUserRole}
        hideDetails={activeEventHideDetails}
      />

      <TabModal
        isOpen={isTabModalOpen}
        onClose={() => {
          setIsTabModalOpen(false);
          setSelectedTab(null);
        }}
        tab={selectedTab}
        onSave={handleTabSave}
        onDelete={(tab) => {
          const resolvedTab = typeof tab === "object" ? tab : selectedTab;

          if (!isOwnedTab(resolvedTab)) {
            return toast({
              title: "Not allowed",
              description: "Only the table owner can delete this table.",
              variant: "destructive",
            });
          }

          deleteTabMutation.mutate(resolvedTab?.id ?? tab);
        }}
      />

      <ShareModal
        isOpen={isShareModalOpen}
        onClose={() => {
          setIsShareModalOpen(false);
          setShareTab(null);
        }}
        tab={shareTab}
        shares={tabShares}
        seatSummary={{
          used: seatsUsed ?? 1,
          limit: seatLimit ?? 1,
        }}
        onInvite={(email, role) =>
          shareTabMutation.mutate({ tabId: shareTab.id, email, role })
        }
        onUpdateShare={(shareId, role) =>
          updateShareMutation.mutate({ shareId, role })
        }
        onRemoveShare={(shareId) => removeShareMutation.mutate({ shareId })}
      />

      <EventHistoryPanel
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        history={eventHistory}
        onRevert={handleRevert}
      />

      <SuggestionsInbox
        isOpen={isSuggestionsOpen}
        onClose={() => setIsSuggestionsOpen(false)}
        suggestions={suggestions}
        tabs={allTabs}
        onAccept={(suggestion) => acceptSuggestionMutation.mutate(suggestion)}
        onReject={(suggestion) => rejectSuggestionMutation.mutate(suggestion.id)}
        onEdit={() =>
          toast({
            title: "Coming soon",
            description: "Bridge mode: suggestions not connected yet.",
          })
        }
        onOpenSettings={() => {
          setIsSuggestionsOpen(false);
          setIsSuggestionsSettingsOpen(true);
        }}
      />

      <SuggestionsSettingsModal
        isOpen={isSuggestionsSettingsOpen}
        onClose={() => setIsSuggestionsSettingsOpen(false)}
        preferences={userPreferences}
        onSave={(data) => updateSuggestionsSettingsMutation.mutate(data)}
      />

      <OnboardingFlow
        isOpen={isOnboardingOpen}
        onClose={() => setIsOnboardingOpen(false)}
        onComplete={() =>
          toast({
            title: "Coming soon",
            description: "Bridge mode",
          })
        }
      />

      {pendingSuggestions > 0 && !isSuggestionsOpen && (
        <div className="fixed bottom-8 right-8 z-40">
          <button
            onClick={() => setIsSuggestionsOpen(true)}
            className="relative flex items-center justify-center w-16 h-16 bg-gradient-to-br from-amber-400 to-orange-500 rounded-full shadow-lg hover:shadow-xl transition-all hover:scale-110 text-white font-bold text-sm"
          >
            <Sparkles className="w-6 h-6" />
            <span className="absolute top-0 right-0 -mt-1 -mr-1 flex items-center justify-center w-6 h-6 bg-red-500 text-white text-xs rounded-full font-bold">
              {pendingSuggestions}
            </span>
          </button>
        </div>
      )}

      <Dialog
        open={isSuggestionsInfoOpen}
        onOpenChange={setIsSuggestionsInfoOpen}
      >
        <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="sr-only">Smart Event Suggestions</DialogTitle>
            <DialogDescription className="sr-only">
              Review smart calendar suggestions and recurring event
              recommendations.
            </DialogDescription>
          </DialogHeader>
          <SuggestionsComingSoon />
        </DialogContent>
      </Dialog>

      {/* Recurring instance scope prompt */}
      <Dialog
        open={editScopePromptOpen}
        onOpenChange={(open) => {
          setEditScopePromptOpen(open);
          if (!open) setPendingRecurringClick(null);
        }}
      >
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>Edit recurring event</DialogTitle>
            <DialogDescription>
              Choose whether to edit this occurrence or the entire series.
            </DialogDescription>
          </DialogHeader>

          <div className="text-sm text-slate-600">
            Do you want to edit just this occurrence, or the whole series?
          </div>

          <div className="mt-4 flex flex-col gap-2">
            <Button
              className="bg-indigo-600 hover:bg-indigo-700"
              onClick={() => openRecurringScope("one")}
            >
              Edit this occurrence
            </Button>

            <Button variant="outline" onClick={() => openRecurringScope("series")}>
              Edit the whole series
            </Button>

            <Button
              variant="ghost"
              onClick={() => {
                setEditScopePromptOpen(false);
                setPendingRecurringClick(null);
              }}
            >
              Cancel
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
// src/pages/calendar.jsx
import React, { useState, useEffect, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/components/ui/use-toast";
import {
  inviteToTab,
  updateTabShare,
  removeTabShare,
  fetchSharedTabsForMe,
  listTeamShares,
  normalizeSharedTab,
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
import CalendarHeader from "../components/calendar/CalendarHeader";
import MonthView from "../components/calendar/MonthView";
import WeekView from "../components/calendar/WeekView";
import Sidebar from "../components/calendar/Sidebar";
import EventModal from "../components/calendar/EventModal";
import TabModal from "../components/calendar/TabModal";
import ShareModal from "../components/calendar/ShareModal";
import EventHistoryPanel from "../components/calendar/EventHistoryPanel";
import useEntitlement from "@/hooks/useEntitlement";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "../components/ui/dialog";
import { Button } from "../components/ui/button";
import { Loader2 } from "lucide-react";

import { useAuth } from "../context/AuthProvider";
import { supabase } from "../lib/supabase";
import { ruleWithUntilBefore, ruleWithoutUntil } from "@/lib/recurrence_ops";
import RecurrenceScopeModal from "../components/calendar/RecurrenceScopeModal";
import { DateTime } from "luxon";
import { getSharingLimitMessage } from "@/lib/planLimits";

import {
  getRealEventId,
  getOccurrenceStartAt,
  isRecurringInstance,
  assertRealDbId,
} from "@/lib/recurrenceUtils";

export default function CalendarPage() {
  const { user, loading } = useAuth();

  const {
    account,
    hasPaidAccess,
    planTier,
    seatLimit,
    seatsUsed,
    remainingSeats,
    collaboratorLimit,
    collaboratorsUsed,
    tableLimit,
  } = useEntitlement();

  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();

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

  const [isTabModalOpen, setIsTabModalOpen] = useState(false);
  const [selectedTab, setSelectedTab] = useState(null);

  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [shareTab, setShareTab] = useState(null);

  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

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

  const getByDayFromISO = (iso, recurrenceTimezone) => {
    if (!iso) return null;
    const zone =
      recurrenceTimezone && recurrenceTimezone !== "local"
        ? recurrenceTimezone
        : DateTime.local().zoneName;
    const dt = DateTime.fromISO(iso, { zone });
    if (!dt.isValid) return null;
    const luxonWeekday = dt.weekday;
    const index = luxonWeekday === 7 ? 0 : luxonWeekday;
    return WEEKDAY_CODES[index];
  };

  const rewriteRRuleByDay = (
    rule,
    newStartISO,
    originalStartISO,
    recurrenceTimezone
  ) => {
    if (!rule || !newStartISO || !originalStartISO) return rule;

    const oldDay = getByDayFromISO(originalStartISO, recurrenceTimezone);
    const newDay = getByDayFromISO(newStartISO, recurrenceTimezone);

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
    originalOccurrenceISO,
    recurrenceTimezone
  ) => {
    if (!masterRule) return null;
    return rewriteRRuleByDay(
      masterRule,
      newStartISO,
      originalOccurrenceISO,
      recurrenceTimezone
    );
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

      if (!master) throw new Error("Could not resolve recurring master event.");

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

      if (scope === "one") {
        if (!occurrenceStartISO) throw new Error("Missing occurrence start time.");

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
          await deleteSingleOccurrence({ master, occurrenceStartISO });
        } else {
          throw new Error(`Unsupported recurrence action: ${action}`);
        }

        await invalidateEvents();
        setRecurrenceScopeModal(null);
        setSelectedEvent(null);
        return;
      }

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
                  occurrenceStartISO ?? masterStart,
                  master.recurrence_timezone
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

      if (scope === "following") {
        if (!occurrenceStartISO) throw new Error("Missing occurrence start time.");

        const oldRule = master.recurrenceRule ?? master.recurrence_rule;
        if (!oldRule) throw new Error("This event does not have a recurrence rule.");

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

        if (!newSeriesStart) throw new Error("Missing new series start date.");

        if (!newSeriesEnd) {
          newSeriesEnd = new Date(
            new Date(newSeriesStart).getTime() + durationMs
          ).toISOString();
        }

        const continuedRule = buildShiftedSeriesRule(
          ruleWithoutUntil(oldRule),
          newSeriesStart,
          occurrenceStartISO,
          master.recurrence_timezone
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

  const handleMoveEvent = async ({
    event,
    nextStart,
    nextEnd,
    nextAllDay = false,
  }) => {
    try {
      const ev = normalizeDraggedEvent(event);
      if (!ev) throw new Error("Missing event payload for move.");

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

      if (isRecurringInstance(ev)) {
        openScopeChoice("move", ev, movePayload);
        return;
      }

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

  const {
    data: ownedTabs = [],
    isLoading: isLoadingTabs,
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

  const normalizedSharedTabs = useMemo(
    () => sharedTabs.map(normalizeSharedTab).filter(Boolean),
    [sharedTabs]
  );

  const sharedWithMe = normalizedSharedTabs;
  const allTabs = useMemo(
    () => [...ownedTabs, ...normalizedSharedTabs],
    [ownedTabs, normalizedSharedTabs]
  );

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

  useEffect(() => {
    if (allTabs.length > 0 && activeTabs.length === 0) {
      setActiveTabs(allTabs.map((t) => t.id));
    }
  }, [allTabs, activeTabs.length]);

  useEffect(() => {
    const requestedTabId = searchParams.get("tab");
    if (!requestedTabId) return;
    if (!allTabs.length) return;

    const tabExists = allTabs.some((t) => t.id === requestedTabId);
    if (!tabExists) return;

    setActiveTabs([requestedTabId]);
    setSelectedTab(null);

    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete("tab");
    setSearchParams(nextParams, { replace: true });
  }, [allTabs, searchParams, setSearchParams]);

  useEffect(() => {
    const handleInviteSync = () => {
      queryClient.invalidateQueries({ queryKey: ["tabs", user?.id] });
      queryClient.invalidateQueries({ queryKey: ["sharedTabs", user?.id] });
    };

    window.addEventListener("gather:invites-claimed", handleInviteSync);

    return () => {
      window.removeEventListener("gather:invites-claimed", handleInviteSync);
    };
  }, [queryClient, user?.id]);

  const range = useMemo(() => {
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
        tabIds: activeTabs,
        startISO: range.startISO,
        endISO: range.endISO,
      }),
    enabled: !!user?.id && !isLoadingTabs,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    staleTime: 15000,
  });

  const {
    data: allTeamShares = [],
  } = useQuery({
    queryKey: ["teamShares", user?.id],
    queryFn: () => listTeamShares(user.id),
    enabled: !!user?.id,
    refetchOnWindowFocus: false,
    staleTime: 15000,
  });

  const tabShares = useMemo(() => {
    if (!shareTab?.id) return [];
    return allTeamShares.filter((s) => s.tab_id === shareTab.id);
  }, [allTeamShares, shareTab?.id]);

  const eventHistory = [];

  const createTabMutation = useMutation({
    mutationFn: (data) => createTab({ owner_id: user.id, ...data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tabs", user.id] });
      toast({ title: "Table created", description: "Your table is ready." });

      setIsTabModalOpen(false);
      setSelectedTab(null);
    },
    onError: (e) => {
      toast({
        title: "Couldn’t create table",
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
        title: "Couldn’t update table",
        description: e?.message ?? "Something went wrong.",
        variant: "destructive",
      });
    },
  });

  const deleteTabMutation = useMutation({
    mutationFn: (id) => deleteTab(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tabs", user.id] });
      toast({ title: "Table deleted" });
      setIsTabModalOpen(false);
      setSelectedTab(null);
    },
    onError: (e) => {
      toast({
        title: "Couldn’t delete table",
        description: e?.message ?? "Something went wrong.",
        variant: "destructive",
      });
    },
  });

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

  const shareTabMutation = useMutation({
    mutationFn: async ({ tabId, email, role }) => {
      if (remainingSeats <= 0) {
        throw new Error(
          getSharingLimitMessage(planTier ?? account?.plan_tier ?? "free", seatLimit)
        );
      }
      if (!email || !email.includes("@")) throw new Error("Enter a valid email.");

      return inviteToTab({
        tabId,
        email,
        role,
        sharedById: user.id,
      });
    },

    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["teamShares", user.id] });
      await queryClient.invalidateQueries({ queryKey: ["sharedTabs", user.id] });
      await queryClient.invalidateQueries({ queryKey: ["account", user.id] });
    },

    onError: (e) =>
      toast({
        title: "Invite failed",
        description: e?.message ?? "Something went wrong.",
        variant: "destructive",
      }),
  });

  const updateShareMutation = useMutation({
    mutationFn: ({ shareId, role }) => updateTabShare(shareId, { role }),

    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["teamShares", user.id] });
      toast({ title: "Access updated" });
    },

    onError: (e) =>
      toast({
        title: "Update failed",
        description: e?.message ?? "Something went wrong.",
        variant: "destructive",
      }),
  });

  const removeShareMutation = useMutation({
    mutationFn: (shareId) => removeTabShare(shareId),

    onSuccess: async () => {
      toast({ title: "Access removed" });
      await queryClient.invalidateQueries({ queryKey: ["teamShares", user.id] });
      await queryClient.invalidateQueries({ queryKey: ["account", user.id] });
      await queryClient.invalidateQueries({ queryKey: ["sharedTabs", user.id] });
    },

    onError: (e) =>
      toast({
        title: "Remove failed",
        description: e?.message ?? "Something went wrong.",
        variant: "destructive",
      }),
  });

  const isOwnedTab = (tab) => !!tab && tab.owner_id === user?.id;

  const canManageTab = (tab) => isOwnedTab(tab);
  const canShareTab = (tab) => isOwnedTab(tab);

  const getTabAccess = (tab) => {
    if (!tab) return "none";
    if (tab.owner_id === user?.id) return "owner";
    return tab.share_role || tab.role || "viewer";
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

  const handleSelectEvent = (event) => {
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
      if (selectedEvent) {
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

        updateEventMutation.mutate({
          id: getRealEventId(selectedEvent) ?? selectedEvent.id,
          data,
          previousData: selectedEvent,
        });
        return;
      }

      createEventMutation.mutate(data);
    } catch (e) {
      toast({
        title: "Failed to save event",
        description: e?.message ?? "Something went wrong.",
        variant: "destructive",
      });
    }
  };

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
      description: "History is not connected yet.",
    });

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
          />
        )}

        <div className="flex-1 overflow-y-auto overflow-x-hidden">
          <div className="p-2 sm:p-4 lg:p-6">
            <RecurrenceScopeModal
              isOpen={!!recurrenceScopeModal}
              onClose={() => setRecurrenceScopeModal(null)}
              action={recurrenceScopeModal?.action}
              onChoose={applyRecurrenceScope}
            />

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
        planTier={planTier}
        seatSummary={{
          collaboratorsUsed: collaboratorsUsed ?? 0,
          collaboratorLimit: collaboratorLimit ?? 2,
          seatsUsed: seatsUsed ?? 1,
          seatLimit: seatLimit ?? 3,
        }}
        onInvite={(email, role) =>
          shareTabMutation.mutateAsync({ tabId: shareTab.id, email, role })
        }
        onUpdateShare={(shareId, role) =>
          updateShareMutation.mutateAsync({ shareId, role })
        }
        onRemoveShare={(shareId) => removeShareMutation.mutateAsync(shareId)}
      />

      <EventHistoryPanel
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        history={eventHistory}
        onRevert={handleRevert}
      />

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
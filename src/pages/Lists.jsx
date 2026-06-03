import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { DateTime } from "luxon";
import {
  Calendar,
  Check,
  Link as LinkIcon,
  ListChecks,
  Mic,
  MoreHorizontal,
  ChevronDown,
  Plus,
  Search,
  Share2,
  Sparkles,
  Unlink,
  Users,
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/components/ui/use-toast";
import { useAuth } from "@/context/AuthProvider";
import { supabase } from "@/lib/supabase";
import {
  fetchLists,
  createList,
  updateList,
  deleteList,
  fetchListItems,
  fetchListItemCounts,
  createListItem,
  createListItems,
  updateListItem,
  deleteListItem,
  unlinkListFromEvent,
} from "@/lib/lists";
import { getEventById } from "@/lib/events";
import LinkListToEventDialog from "@/components/lists/LinkListToEventDialog";
import PipListDialog from "@/components/lists/PipListDialog";

function ListRow({ list, active, onClick, itemCount }) {
  return (
    <button
      onClick={onClick}
      className={`flex w-full items-center gap-2 rounded-md px-2 py-2 text-left transition ${
        active ? "bg-[#EEEDFE]" : "hover:bg-slate-100"
      }`}
    >
      <div className="flex h-8 w-8 items-center justify-center rounded-md bg-slate-100 text-sm">
        {list.icon || "📝"}
      </div>

      <div
        className={`min-w-0 flex-1 truncate text-[13px] ${
          active ? "text-[#534AB7]" : "text-slate-800"
        }`}
      >
        {list.title}
      </div>

      <div className="flex flex-col items-end gap-0.5">
        {list.event_id ? (
          <Calendar className="h-3 w-3 text-[#6C63FF]" title="Linked to event" />
        ) : null}
        <div className="text-[11px] text-slate-400">{itemCount ?? 0}</div>
      </div>
    </button>
  );
}

function Tag({ children }) {
  if (!children) return null;

  return (
    <span className="rounded-full bg-[#EEEDFE] px-2 py-0.5 text-[10px] text-[#534AB7]">
      {children}
    </span>
  );
}

function EmptyLists({ onCreate }) {
  return (
    <div className="flex min-h-[60vh] items-center justify-center p-6">
      <div className="max-w-md rounded-xl border border-slate-200 bg-white p-6 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#EEEDFE]">
          <ListChecks className="h-6 w-6 text-[#6C63FF]" />
        </div>

        <h2 className="mt-4 text-lg font-medium text-slate-900">
          Start your first list
        </h2>

        <p className="mt-2 text-sm leading-6 text-slate-500">
          Grocery lists, packing lists, gift ideas, school supplies, and event
          checklists can live here.
        </p>

        <button
          onClick={onCreate}
          className="mt-5 inline-flex items-center gap-1.5 rounded-md bg-[#6C63FF] px-4 py-2 text-sm font-medium text-white"
        >
          <Plus className="h-4 w-4" />
          Create list
        </button>
      </div>
    </div>
  );
}

export default function Lists() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [activeListId, setActiveListId] = useState(null);
  const [newItem, setNewItem] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const [pipOpen, setPipOpen] = useState(false);
  const [pipAdding, setPipAdding] = useState(false);
  const [listsSheetOpen, setListsSheetOpen] = useState(false);

  const {
    data: lists = [],
    isLoading: loadingLists,
    isError: listsError,
    error: listsQueryError,
  } = useQuery({
    queryKey: ["lists", user?.id],
    queryFn: () => fetchLists(user.id),
    enabled: !!user?.id,
    staleTime: 15000,
  });

  const listIds = useMemo(() => lists.map((list) => list.id), [lists]);

  const { data: itemCounts = {} } = useQuery({
    queryKey: ["listItemCounts", listIds],
    queryFn: () => fetchListItemCounts(listIds),
    enabled: listIds.length > 0,
    staleTime: 15000,
  });

  const activeList = useMemo(() => {
    return lists.find((list) => list.id === activeListId) || lists[0] || null;
  }, [activeListId, lists]);

  useEffect(() => {
    const fromUrl = searchParams.get("list");
    if (fromUrl && lists.some((list) => list.id === fromUrl)) {
      setActiveListId(fromUrl);
      return;
    }

    if (!activeListId && lists.length > 0) {
      setActiveListId(lists[0].id);
    }
  }, [activeListId, lists, searchParams]);

  useEffect(() => {
    if (!activeListId) return;
    const current = searchParams.get("list");
    if (current === activeListId) return;
    const next = new URLSearchParams(searchParams);
    next.set("list", activeListId);
    setSearchParams(next, { replace: true });
  }, [activeListId, searchParams, setSearchParams]);

  const { data: linkedEvent } = useQuery({
    queryKey: ["linkedEvent", activeList?.event_id],
    queryFn: () => getEventById(activeList.event_id),
    enabled: !!activeList?.event_id,
    staleTime: 60000,
  });

  const unlinkMutation = useMutation({
    mutationFn: () => unlinkListFromEvent(activeList.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lists", user?.id] });
      queryClient.invalidateQueries({
        queryKey: ["listsForEvent", activeList?.event_id],
      });
      toast({ title: "List unlinked from event" });
    },
    onError: (error) => {
      toast({
        title: "Could not unlink",
        description: error?.message,
        variant: "destructive",
      });
    },
  });

  const linkedEventLabel = useMemo(() => {
    if (!linkedEvent) return null;
    const raw = linkedEvent.start_date ?? linkedEvent.start_at;
    let when = "";
    if (raw) {
      const dt = DateTime.fromISO(raw);
      if (dt.isValid) when = dt.toFormat("MMM d");
    }
    return when
      ? `${linkedEvent.title || "Event"} · ${when}`
      : linkedEvent.title || "Linked event";
  }, [linkedEvent]);

  const {
    data: items = [],
    isLoading: loadingItems,
  } = useQuery({
    queryKey: ["listItems", activeList?.id],
    queryFn: () => fetchListItems(activeList.id),
    enabled: !!activeList?.id,
    staleTime: 10000,
  });

  const itemCountsByList = useMemo(() => {
    const counts = { ...itemCounts };
    if (activeList?.id) {
      counts[activeList.id] = items.length;
    }
    return counts;
  }, [activeList?.id, itemCounts, items.length]);

  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel(`lists-realtime-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "lists",
          filter: `owner_id=eq.${user.id}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["lists", user.id] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient, user?.id]);

  useEffect(() => {
    if (!activeList?.id) return;

    const channel = supabase
      .channel(`list-items-realtime-${activeList.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "list_items",
          filter: `list_id=eq.${activeList.id}`,
        },
        () => {
          queryClient.invalidateQueries({
            queryKey: ["listItems", activeList.id],
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeList?.id, queryClient]);

  const createListMutation = useMutation({
    mutationFn: () =>
      createList({
        owner_id: user.id,
        title: "New list",
        icon: "📝",
        color: "indigo",
        is_pinned: false,
        is_shared: false,
      }),
    onSuccess: (created) => {
      queryClient.invalidateQueries({ queryKey: ["lists", user.id] });
      setActiveListId(created.id);
      toast({ title: "List created" });
    },
    onError: (error) => {
      toast({
        title: "Could not create list",
        description: error?.message || "Something went wrong.",
        variant: "destructive",
      });
    },
  });

  const updateListMutation = useMutation({
    mutationFn: ({ id, updates }) => updateList(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lists", user.id] });
    },
    onError: (error) => {
      toast({
        title: "Could not update list",
        description: error?.message || "Something went wrong.",
        variant: "destructive",
      });
    },
  });

  const deleteListMutation = useMutation({
    mutationFn: (id) => deleteList(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lists", user.id] });
      setActiveListId(null);
      toast({ title: "List deleted" });
    },
    onError: (error) => {
      toast({
        title: "Could not delete list",
        description: error?.message || "Something went wrong.",
        variant: "destructive",
      });
    },
  });

  const createItemMutation = useMutation({
    mutationFn: (text) =>
      createListItem({
        list_id: activeList.id,
        owner_id: user.id,
        text,
        completed: false,
        sort_order: items.length,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["listItems", activeList.id] });
      queryClient.invalidateQueries({ queryKey: ["lists", user.id] });
    },
    onError: (error) => {
      toast({
        title: "Could not add item",
        description: error?.message || "Something went wrong.",
        variant: "destructive",
      });
    },
  });

  const updateItemMutation = useMutation({
    mutationFn: ({ id, updates }) => updateListItem(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["listItems", activeList.id] });
    },
    onError: (error) => {
      toast({
        title: "Could not update item",
        description: error?.message || "Something went wrong.",
        variant: "destructive",
      });
    },
  });

  const deleteItemMutation = useMutation({
    mutationFn: (id) => deleteListItem(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["listItems", activeList.id] });
    },
    onError: (error) => {
      toast({
        title: "Could not delete item",
        description: error?.message || "Something went wrong.",
        variant: "destructive",
      });
    },
  });

  const filteredLists = lists.filter((list) =>
    list.title.toLowerCase().includes(searchTerm.trim().toLowerCase())
  );

  const pinnedLists = filteredLists.filter((list) => list.is_pinned);
  const regularLists = filteredLists.filter((list) => !list.is_pinned);

  const activeItems = items.filter((item) => !item.completed);
  const completedItems = items.filter((item) => item.completed);

  const addItem = () => {
    const clean = newItem.trim();
    if (!clean || !activeList?.id) return;

    createItemMutation.mutate(clean);
    setNewItem("");
  };

  const handleVoiceAdd = () => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      toast({
        title: "Voice add is not available",
        description:
          "This browser does not support speech recognition yet. Try Chrome on desktop.",
        variant: "destructive",
      });
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "en-US";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event) => {
      const spokenText = event.results?.[0]?.[0]?.transcript?.trim();
      if (spokenText) {
        createItemMutation.mutate(spokenText);
      }
    };

    recognition.onerror = () => {
      toast({
        title: "Voice add failed",
        description: "Gather could not hear the item clearly.",
        variant: "destructive",
      });
    };

    recognition.start();
  };

  const handlePipAdd = async (texts) => {
    if (!activeList?.id || !user?.id || !texts.length) return;

    setPipAdding(true);
    try {
      const startOrder = items.length;
      await createListItems(
        texts.map((text, index) => ({
          list_id: activeList.id,
          owner_id: user.id,
          text,
          completed: false,
          sort_order: startOrder + index,
        }))
      );
      queryClient.invalidateQueries({
        queryKey: ["listItems", activeList.id],
      });
      queryClient.invalidateQueries({ queryKey: ["lists", user.id] });
      queryClient.invalidateQueries({ queryKey: ["listItemCounts"] });
      setPipOpen(false);
      toast({
        title: "Pip added items",
        description: `${texts.length} ${texts.length === 1 ? "item" : "items"} added to your list.`,
      });
    } catch (error) {
      toast({
        title: "Pip could not add items",
        description: error?.message || "Try again.",
        variant: "destructive",
      });
    } finally {
      setPipAdding(false);
    }
  };

  const existingItemTexts = useMemo(
    () => items.map((item) => item.text).filter(Boolean),
    [items]
  );

  const renderListPicker = (onPick) => (
    <>
      {pinnedLists.length > 0 && (
        <div className="mb-3">
          <div className="px-2 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-400">
            Pinned
          </div>
          <div className="space-y-1">
            {pinnedLists.map((list) => (
              <ListRow
                key={list.id}
                list={list}
                active={list.id === activeList?.id}
                itemCount={itemCountsByList[list.id]}
                onClick={() => onPick(list.id)}
              />
            ))}
          </div>
        </div>
      )}
      <div className="px-2 pb-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-400">
        My lists
      </div>
      <div className="space-y-1">
        {regularLists.map((list) => (
          <ListRow
            key={list.id}
            list={list}
            active={list.id === activeList?.id}
            itemCount={itemCountsByList[list.id]}
            onClick={() => onPick(list.id)}
          />
        ))}
      </div>
    </>
  );

  if (loadingLists) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100 text-sm text-slate-500">
        Loading lists...
      </div>
    );
  }

  if (listsError) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100 p-6">
        <div className="max-w-md rounded-xl border border-red-200 bg-red-50 p-6 text-center text-sm text-red-700">
          Could not load lists: {listsQueryError?.message ?? "Unknown error"}
        </div>
      </div>
    );
  }

  if (!lists.length) {
    return <EmptyLists onCreate={() => createListMutation.mutate()} />;
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-slate-100 md:min-h-[calc(100dvh-4rem)] md:flex-row">
      <aside className="hidden w-[250px] shrink-0 flex-col border-r border-slate-200 bg-white md:flex">
        <div className="border-b border-slate-200 px-3 py-4">
          <div className="mb-3 flex items-center justify-between">
            <h1 className="text-sm font-medium text-slate-900">Lists</h1>

            <button
              onClick={() => createListMutation.mutate()}
              className="inline-flex items-center gap-1 rounded-md bg-[#6C63FF] px-2.5 py-1.5 text-[11px] font-medium text-white"
            >
              <Plus className="h-3 w-3" />
              New
            </button>
          </div>

          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            <input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search lists..."
              className="w-full rounded-md border border-slate-200 bg-slate-50 py-2 pl-8 pr-3 text-[12px] outline-none focus:border-[#6C63FF] focus:bg-white"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-2">
          {renderListPicker(setActiveListId)}
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col md:hidden">
        <div className="flex items-center gap-2 border-b border-slate-200 bg-white px-3 py-2.5">
          <Sheet open={listsSheetOpen} onOpenChange={setListsSheetOpen}>
            <SheetTrigger asChild>
              <button
                type="button"
                className="flex min-w-0 flex-1 items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-left"
              >
                <span className="text-lg">{activeList?.icon || "📝"}</span>
                <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-slate-900">
                  {activeList?.title || "Select list"}
                </span>
                <ChevronDown className="h-4 w-4 shrink-0 text-slate-400" />
              </button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[min(100vw,300px)] p-0">
              <SheetHeader className="border-b border-slate-100 px-4 py-3 text-left">
                <SheetTitle className="text-base">Your lists</SheetTitle>
              </SheetHeader>
              <div className="overflow-y-auto p-2 pb-8">
                <div className="mb-3 px-2">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                    <input
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder="Search lists..."
                      className="w-full rounded-md border border-slate-200 bg-slate-50 py-2 pl-8 pr-3 text-[12px]"
                    />
                  </div>
                </div>
                {renderListPicker((id) => {
                  setActiveListId(id);
                  setListsSheetOpen(false);
                })}
              </div>
            </SheetContent>
          </Sheet>

          <button
            type="button"
            onClick={() => createListMutation.mutate()}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-[#6C63FF] text-white"
            aria-label="New list"
          >
            <Plus className="h-5 w-5" />
          </button>
        </div>
      </div>

      <main className="min-w-0 flex-1 bg-slate-50">
        <div className="border-b border-slate-200 bg-white px-4 py-4 md:px-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <input
                value={activeList?.title || ""}
                onChange={(e) =>
                  updateListMutation.mutate({
                    id: activeList.id,
                    updates: { title: e.target.value },
                  })
                }
                className="w-full bg-transparent text-lg font-medium text-slate-900 outline-none"
              />

              <div className="mt-2 flex flex-wrap items-center gap-3 text-[11px] text-slate-500">
                <span className="inline-flex items-center gap-1">
                  <Users className="h-3 w-3" />
                  {activeItems.length + completedItems.length} items
                </span>

                <span className="inline-flex items-center gap-1">
                  <ListChecks className="h-3 w-3" />
                  {activeItems.length} remaining
                </span>

                {activeList?.event_id && linkedEventLabel ? (
                  <Link
                    to="/calendar"
                    className="inline-flex items-center gap-1 text-[#534AB7] hover:underline"
                  >
                    <LinkIcon className="h-3 w-3" />
                    {linkedEventLabel}
                  </Link>
                ) : (
                  <span className="inline-flex items-center gap-1 text-slate-400">
                    <LinkIcon className="h-3 w-3" />
                    Not linked to event
                  </span>
                )}
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                onClick={handleVoiceAdd}
                className="inline-flex items-center gap-1.5 rounded-md bg-[#EEEDFE] px-3 py-2 text-[12px] font-medium text-[#534AB7]"
              >
                <Mic className="h-4 w-4" />
                Voice add
              </button>

              <button
                type="button"
                onClick={() => setPipOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-md bg-[#6C63FF] px-3 py-2 text-[12px] font-medium text-white"
              >
                <Sparkles className="h-4 w-4" />
                Ask Pip
              </button>

              <button
                onClick={() =>
                  toast({
                    title: "Sharing lists is coming soon",
                    description:
                      "Shared lists will connect to table permissions and realtime updates.",
                  })
                }
                className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-3 py-2 text-[12px] font-medium text-slate-600"
              >
                <Share2 className="h-4 w-4" />
                Share
              </button>

              <button
                onClick={() =>
                  deleteListMutation.mutate(activeList.id)
                }
                className="inline-flex items-center rounded-md border border-slate-200 bg-white px-2.5 py-2 text-slate-500 hover:bg-red-50 hover:text-red-600"
                title="Delete list"
              >
                <MoreHorizontal className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        <div className="mx-auto max-w-4xl p-4 md:p-6">
          {activeList?.event_id ? (
            <div className="mb-4 flex flex-wrap items-center gap-2 rounded-lg border border-[#AFA9EC] bg-[#EEEDFE] px-3 py-2 text-[12px] text-[#534AB7]">
              <Calendar className="h-4 w-4 shrink-0" />
              <span className="min-w-0 flex-1">
                Linked to{" "}
                <span className="font-medium">
                  {linkedEventLabel || "this event"}
                </span>
              </span>
              <button
                type="button"
                onClick={() => navigate("/calendar")}
                className="font-medium hover:underline"
              >
                Calendar
              </button>
              <button
                type="button"
                disabled={unlinkMutation.isPending}
                onClick={() => unlinkMutation.mutate()}
                className="inline-flex items-center gap-1 font-medium text-slate-600 hover:text-red-600"
              >
                <Unlink className="h-3 w-3" />
                Unlink
              </button>
            </div>
          ) : (
            <div className="mb-4 flex items-center gap-2 rounded-lg bg-[#EEEDFE] px-3 py-2 text-[12px] text-[#534AB7]">
              <Calendar className="h-4 w-4 shrink-0" />
              <span>
                Link this list to an event — packing, groceries, party prep, and
                more.
              </span>
              <button
                type="button"
                onClick={() => setLinkDialogOpen(true)}
                className="ml-auto shrink-0 font-medium"
              >
                Link →
              </button>
            </div>
          )}

          <LinkListToEventDialog
            open={linkDialogOpen}
            onOpenChange={setLinkDialogOpen}
            listId={activeList?.id}
            onLinked={() => {
              queryClient.invalidateQueries({ queryKey: ["lists", user?.id] });
            }}
          />

          <PipListDialog
            open={pipOpen}
            onOpenChange={setPipOpen}
            listTitle={activeList?.title}
            eventTitle={linkedEvent?.title}
            existingItems={existingItemTexts}
            onAddItems={handlePipAdd}
            isAdding={pipAdding}
          />

          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.07em] text-slate-400">
              To get
            </div>

            {loadingItems ? (
              <div className="py-8 text-center text-sm text-slate-500">
                Loading items...
              </div>
            ) : activeItems.length === 0 ? (
              <div className="py-6 text-center text-sm text-slate-400">
                Nothing left to get.
              </div>
            ) : (
              activeItems.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center gap-3 border-b border-slate-100 py-2.5 last:border-0"
                >
                  <button
                    onClick={() =>
                      updateItemMutation.mutate({
                        id: item.id,
                        updates: { completed: true },
                      })
                    }
                    className="flex h-5 w-5 shrink-0 items-center justify-center rounded border border-slate-300"
                  />

                  <div className="min-w-0 flex-1 text-[13px] text-slate-900">
                    {item.text}
                  </div>

                  <Tag>{item.tag}</Tag>

                  <button
                    onClick={() => deleteItemMutation.mutate(item.id)}
                    className="text-[11px] text-slate-300 hover:text-red-500"
                  >
                    Remove
                  </button>
                </div>
              ))
            )}

            <div className="mt-4 flex items-center gap-3">
              <div className="h-5 w-5 shrink-0 rounded border border-dashed border-slate-300" />

              <input
                value={newItem}
                onChange={(e) => setNewItem(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") addItem();
                }}
                placeholder="Add an item... or tap the mic to speak it"
                className="flex-1 rounded-md border border-dashed border-slate-300 bg-transparent px-3 py-2 text-[13px] outline-none focus:border-[#6C63FF]"
              />

              <button
                onClick={addItem}
                className="rounded-md bg-[#6C63FF] px-3 py-2 text-[12px] font-medium text-white"
              >
                Add
              </button>
            </div>

            <div className="mt-6 mb-2 text-[11px] font-semibold uppercase tracking-[0.07em] text-slate-400">
              Got it
            </div>

            {completedItems.length === 0 ? (
              <div className="py-4 text-sm text-slate-400">
                Completed items will show here.
              </div>
            ) : (
              completedItems.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center gap-3 border-b border-slate-100 py-2.5 last:border-0"
                >
                  <button
                    onClick={() =>
                      updateItemMutation.mutate({
                        id: item.id,
                        updates: { completed: false },
                      })
                    }
                    className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-[#6C63FF] text-white"
                  >
                    <Check className="h-3 w-3" />
                  </button>

                  <div className="min-w-0 flex-1 text-[13px] text-slate-400 line-through">
                    {item.text}
                  </div>

                  <button
                    onClick={() => deleteItemMutation.mutate(item.id)}
                    className="text-[11px] text-slate-300 hover:text-red-500"
                  >
                    Remove
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
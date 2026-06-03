import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Check,
  ChevronDown,
  Clock,
  ExternalLink,
  Link as LinkIcon,
  NotebookText,
  Pin,
  Plus,
  Search,
  Share2,
  Sparkles,
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/components/ui/use-toast";
import { useAuth } from "@/context/AuthProvider";
import { supabase } from "@/lib/supabase";
import { fetchNotes, createNote, updateNote } from "@/lib/notes";
import { fetchAccessibleTabs } from "@/lib/accessTabs";
function formatDate(dateString) {
  if (!dateString) return "Recently";

  const date = new Date(dateString);

  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

function getPreview(text = "") {
  return text.replace(/\n/g, " ").slice(0, 80) || "Empty note";
}

function NoteItem({ note, active, onClick, tabMap }) {
  const table = tabMap[note.tabId];

  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full rounded-md px-2 py-2.5 text-left transition ${
        active ? "bg-[#EEEDFE]" : "hover:bg-slate-100"
      }`}
    >
      <div
        className={`truncate text-[13px] font-medium ${
          active ? "text-[#534AB7]" : "text-slate-900"
        }`}
      >
        {note.title || "Untitled note"}
      </div>

      <div className="mt-0.5 truncate text-[11px] text-slate-500">
        {getPreview(note.body)}
      </div>

      <div className="mt-1 flex items-center justify-between gap-2">
        <span className="text-[10px] text-slate-400">
          {formatDate(note.updatedAt)}
        </span>

        {table && (
          <span className="rounded-full bg-[#EEEDFE] px-2 py-0.5 text-[10px] text-[#534AB7]">
            {table.name}
          </span>
        )}
      </div>
    </button>
  );
}

function ToolbarButton({ children, active = false }) {
  return (
    <button
      type="button"
      className={`flex h-7 w-7 items-center justify-center rounded-md border text-[13px] transition ${
        active
          ? "border-[#AFA9EC] bg-[#EEEDFE] text-[#534AB7]"
          : "border-slate-200 bg-white text-slate-500 hover:bg-slate-50"
      }`}
    >
      {children}
    </button>
  );
}

function EmptyNotes({ onCreate }) {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="max-w-md rounded-xl border border-slate-200 bg-white p-6 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#EEEDFE]">
          <NotebookText className="h-6 w-6 text-[#6C63FF]" />
        </div>

        <h2 className="mt-4 text-lg font-medium text-slate-900">
          Start your first note
        </h2>

        <p className="mt-2 text-sm leading-6 text-slate-500">
          Notes can live inside your Gather tables and events.
        </p>

        <button
          onClick={onCreate}
          className="mt-5 inline-flex items-center gap-1.5 rounded-md bg-[#6C63FF] px-4 py-2 text-sm font-medium text-white"
        >
          <Plus className="h-4 w-4" />
          Create note
        </button>
      </div>
    </div>
  );
}

export default function Notes() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [activeNoteId, setActiveNoteId] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [notesSheetOpen, setNotesSheetOpen] = useState(false);

  const { data: tabs = [], isLoading: loadingTabs } = useQuery({
    queryKey: ["accessibleTabs", user?.id, user?.email],
    queryFn: () =>
      fetchAccessibleTabs({
        userId: user.id,
        email: user.email,
      }),
    enabled: !!user?.id,
  });

  const tabIds = useMemo(() => tabs.map((tab) => tab.id), [tabs]);

  const tabMap = useMemo(() => {
    return tabs.reduce((acc, tab) => {
      acc[tab.id] = tab;
      return acc;
    }, {});
  }, [tabs]);

  const {
    data: notes = [],
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ["notes", user?.id, tabIds],
    queryFn: () => fetchNotes({ tabIds }),
    enabled: !!user?.id && tabIds.length > 0,
    staleTime: 15000,
  });

  useEffect(() => {
    if (!activeNoteId && notes.length > 0) {
      setActiveNoteId(notes[0].id);
    }
  }, [activeNoteId, notes]);

  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel(`notes-realtime-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notes",
        },
        () => {
          queryClient.invalidateQueries({
            queryKey: ["notes"],
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient, user?.id]);

  const ownedTabs = useMemo(
    () => tabs.filter((tab) => tab.owner_id === user?.id && !tab.is_shared),
    [tabs, user?.id]
  );

  const createMutation = useMutation({
    mutationFn: () =>
      createNote({
        ownerId: user.id,
        tabId: ownedTabs[0]?.id ?? tabs[0]?.id,
        title: "Untitled note",
        body: "",
        pinned: false,
      }),

    onSuccess: (created) => {
      queryClient.invalidateQueries({
        queryKey: ["notes"],
      });

      setActiveNoteId(created.id);

      toast({
        title: "Note created",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, updates }) => updateNote(id, updates),

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["notes"],
      });
    },
  });

  const saveTimersRef = useRef({});

  const scheduleNoteSave = useCallback(
    (id, updates, delayMs = 500) => {
      if (!id) return;

      if (saveTimersRef.current[id]) {
        clearTimeout(saveTimersRef.current[id]);
      }

      saveTimersRef.current[id] = setTimeout(() => {
        updateMutation.mutate({ id, updates });
        delete saveTimersRef.current[id];
      }, delayMs);
    },
    [updateMutation]
  );

  useEffect(() => {
    const timers = saveTimersRef.current;
    return () => {
      Object.values(timers).forEach(clearTimeout);
    };
  }, []);

  const filteredNotes = notes.filter((note) => {
    const text = `${note.title} ${note.body}`.toLowerCase();

    return text.includes(searchTerm.trim().toLowerCase());
  });

  const pinnedNotes = filteredNotes.filter((note) => note.pinned);
  const recentNotes = filteredNotes.filter((note) => !note.pinned);

  const activeNote =
    notes.find((note) => note.id === activeNoteId) || notes[0];

  if (loadingTabs || isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100 text-sm text-slate-500">
        Loading notes...
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100 p-6">
        <div className="max-w-md rounded-xl border border-red-200 bg-red-50 p-6 text-center text-sm text-red-700">
          Could not load notes: {error?.message ?? "Unknown error"}
        </div>
      </div>
    );
  }

  if (!tabs.length) {
    return (
      <EmptyNotes
        onCreate={() =>
          toast({
            title: "Create a table first",
            description: "Open Calendar and create a table before adding notes.",
            variant: "destructive",
          })
        }
      />
    );
  }

  if (!notes.length) {
    return (
      <EmptyNotes
        onCreate={() => {
          if (!ownedTabs.length) {
            toast({
              title: "Create a table first",
              description:
                "Notes belong to your tables. Create a table in Calendar first.",
              variant: "destructive",
            });

            return;
          }

          createMutation.mutate();
        }}
      />
    );
  }

  const activeNoteTitle = activeNote?.title || "Untitled note";

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-slate-100 md:min-h-[calc(100dvh-4rem)] md:flex-row">
      <aside className="hidden w-[240px] shrink-0 flex-col border-r border-slate-200 bg-white md:flex">
        <div className="border-b border-slate-200 px-3 py-3">
          <div className="mb-3 flex items-center justify-between">
            <h1 className="text-sm font-medium text-slate-900">Notes</h1>

            <button
              onClick={() => {
                if (!ownedTabs.length) {
                  toast({
                    title: "Create a table first",
                    description:
                      "Notes belong to your tables. Create a table in Calendar first.",
                    variant: "destructive",
                  });

                  return;
                }

                createMutation.mutate();
              }}
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
              placeholder="Search notes..."
              className="w-full rounded-md border border-slate-200 bg-slate-50 py-2 pl-8 pr-3 text-[12px] outline-none focus:border-[#6C63FF] focus:bg-white"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-2">
          {pinnedNotes.length > 0 && (
            <>
              <div className="px-2 pb-1 pt-1 text-[10px] font-semibold uppercase tracking-[0.07em] text-slate-400">
                Pinned
              </div>

              {pinnedNotes.map((note) => (
                <NoteItem
                  key={note.id}
                  note={note}
                  tabMap={tabMap}
                  active={note.id === activeNoteId}
                  onClick={() => setActiveNoteId(note.id)}
                />
              ))}
            </>
          )}

          <div className="px-2 pb-1 pt-3 text-[10px] font-semibold uppercase tracking-[0.07em] text-slate-400">
            Recent
          </div>

          {recentNotes.map((note) => (
            <NoteItem
              key={note.id}
              note={note}
              tabMap={tabMap}
              active={note.id === activeNoteId}
              onClick={() => setActiveNoteId(note.id)}
            />
          ))}
        </div>
      </aside>

      <div className="flex items-center gap-2 border-b border-slate-200 bg-white px-3 py-2.5 md:hidden">
        <Sheet open={notesSheetOpen} onOpenChange={setNotesSheetOpen}>
          <SheetTrigger asChild>
            <button
              type="button"
              className="flex min-w-0 flex-1 items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-left"
            >
              <NotebookText className="h-4 w-4 shrink-0 text-[#6C63FF]" />
              <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-slate-900">
                {activeNoteTitle}
              </span>
              <ChevronDown className="h-4 w-4 shrink-0 text-slate-400" />
            </button>
          </SheetTrigger>
          <SheetContent side="left" className="w-[min(100vw,300px)] p-0">
            <SheetHeader className="border-b border-slate-100 px-4 py-3 text-left">
              <SheetTitle className="text-base">Your notes</SheetTitle>
            </SheetHeader>
            <div className="overflow-y-auto p-2 pb-8">
              {pinnedNotes.map((note) => (
                <NoteItem
                  key={note.id}
                  note={note}
                  tabMap={tabMap}
                  active={note.id === activeNoteId}
                  onClick={() => {
                    setActiveNoteId(note.id);
                    setNotesSheetOpen(false);
                  }}
                />
              ))}
              {recentNotes.map((note) => (
                <NoteItem
                  key={note.id}
                  note={note}
                  tabMap={tabMap}
                  active={note.id === activeNoteId}
                  onClick={() => {
                    setActiveNoteId(note.id);
                    setNotesSheetOpen(false);
                  }}
                />
              ))}
            </div>
          </SheetContent>
        </Sheet>

        <button
          type="button"
          onClick={() => {
            if (!ownedTabs.length) {
              toast({
                title: "Create a table first",
                description:
                  "Notes belong to your tables. Create a table in Calendar first.",
                variant: "destructive",
              });
              return;
            }
            createMutation.mutate();
          }}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-[#6C63FF] text-white"
          aria-label="New note"
        >
          <Plus className="h-5 w-5" />
        </button>
      </div>

      <main className="min-w-0 flex-1 p-3 md:p-6">
        <div className="mx-auto max-w-5xl rounded-lg border border-slate-200 bg-white p-5 md:p-6">
          <div className="mb-2 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0 flex-1">
              <input
                value={activeNote?.title || ""}
                onChange={(e) =>
                  scheduleNoteSave(activeNote.id, { title: e.target.value })
                }
                className="w-full bg-transparent text-lg font-medium text-slate-900 outline-none"
              />

              <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
                <span className="inline-flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  Updated {formatDate(activeNote?.updatedAt)}
                </span>

                <select
  value={activeNote?.tabId || ""}
  onChange={(e) =>
    updateMutation.mutate({
      id: activeNote.id,
      updates: { tabId: e.target.value },
    })
  }
  className="rounded-md border border-slate-200 bg-white px-2 py-1 text-[11px] text-slate-600 outline-none focus:border-[#6C63FF]"
>
  {tabs.map((tab) => (
    <option key={tab.id} value={tab.id}>
      {tab.name} table
    </option>
  ))}
</select>

                <span className="inline-flex items-center gap-1 rounded-md bg-[#EEEDFE] px-2 py-1 text-[#534AB7]">
                  <LinkIcon className="h-3 w-3" />
                  Linked to table
                  <ExternalLink className="h-3 w-3" />
                </span>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() =>
                  navigate("/pip", {
                    state: {
                      noteBody: activeNote?.body || "",
                      initialMessage: "Organize this note into tasks",
                    },
                  })
                }
                className="inline-flex items-center gap-1 rounded-md bg-[#6C63FF] px-2.5 py-1.5 text-[11px] font-medium text-white"
              >
                <Sparkles className="h-3 w-3" />
                Ask Pip
              </button>

              <button
                onClick={() =>
                  toast({
                    title: "Sharing notes is coming soon",
                  })
                }
                className="inline-flex items-center gap-1 rounded-md border border-[#AFA9EC] px-2.5 py-1.5 text-[11px] font-medium text-[#6C63FF]"
              >
                <Share2 className="h-3 w-3" />
                Share
              </button>

              <button
                onClick={() =>
                  updateMutation.mutate({
                    id: activeNote.id,
                    updates: {
                      pinned: !activeNote.pinned,
                    },
                  })
                }
                className={`inline-flex items-center gap-1 rounded-md border px-2.5 py-1.5 text-[11px] font-medium ${
                  activeNote?.pinned
                    ? "border-[#AFA9EC] bg-[#EEEDFE] text-[#534AB7]"
                    : "border-slate-200 text-slate-500"
                }`}
              >
                <Pin className="h-3 w-3" />
                {activeNote?.pinned ? "Pinned" : "Pin"}
              </button>
            </div>
          </div>

          <div className="mb-4 flex items-center justify-between border-b border-slate-200 pb-3">
  <div className="text-[11px] text-slate-400">
    Plain note
  </div>

  <div className="inline-flex items-center gap-1 text-[11px] text-slate-400">
    <Check className="h-3.5 w-3.5 text-emerald-600" />
    Saved
  </div>
          </div>

          <textarea
            value={activeNote?.body || ""}
            onChange={(e) =>
              scheduleNoteSave(activeNote.id, { body: e.target.value })
            }
            placeholder="Start writing..."
            className="min-h-[500px] w-full resize-none border-0 bg-transparent text-[13px] leading-7 text-slate-800 outline-none"
          />
        </div>
      </main>
    </div>
  );
}
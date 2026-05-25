import React, { useState } from "react";
import {
  Bold,
  Check,
  CheckSquare,
  Clock,
  ExternalLink,
  Image,
  Italic,
  Link as LinkIcon,
  List,
  Pin,
  Plus,
  Search,
  Share2,
  Underline,
} from "lucide-react";

const notes = [
  {
    id: 1,
    title: "Summer plans for the boys",
    preview: "Camp dates, activities, what each kid wants...",
    date: "Today",
    table: "Family",
    tagClass: "bg-[#E1F5EE] text-[#085041]",
    pinned: true,
  },
  {
    id: 2,
    title: "Co-parenting schedule ideas",
    preview: "Things to bring up at next check-in...",
    date: "Yesterday",
    table: "Personal",
    tagClass: "bg-[#FBEAF0] text-[#72243E]",
    pinned: true,
  },
  {
    id: 3,
    title: "Doctor appt notes — Liam",
    preview: "Follow up in 3 months, watch for...",
    date: "May 20",
    table: "Family",
    tagClass: "bg-[#E1F5EE] text-[#085041]",
  },
  {
    id: 4,
    title: "Q3 project ideas",
    preview: "Features to pitch next sprint...",
    date: "May 18",
    table: "Work",
    tagClass: "bg-[#EEEDFE] text-[#3C3489]",
  },
  {
    id: 5,
    title: "Monaco GP watch party",
    preview: "Snacks list, who's coming, start time...",
    date: "May 16",
    table: "F1 races",
    tagClass: "bg-[#FAEEDA] text-[#633806]",
  },
  {
    id: 6,
    title: "Gift ideas — Mom's birthday",
    preview: "She mentioned wanting a new...",
    date: "May 14",
    table: "Family",
    tagClass: "bg-[#E1F5EE] text-[#085041]",
  },
];

function NoteItem({ note, active, onClick }) {
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
        {note.title}
      </div>
      <div className="mt-0.5 truncate text-[11px] text-slate-500">
        {note.preview}
      </div>
      <div className="mt-1 flex items-center justify-between gap-2">
        <span className="text-[10px] text-slate-400">{note.date}</span>
        <span className={`rounded-full px-2 py-0.5 text-[10px] ${note.tagClass}`}>
          {note.table}
        </span>
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

export default function Notes() {
  const [activeNoteId, setActiveNoteId] = useState(1);
  const activeNote = notes.find((note) => note.id === activeNoteId) || notes[0];

  const pinnedNotes = notes.filter((note) => note.pinned);
  const recentNotes = notes.filter((note) => !note.pinned);

  return (
    <div className="flex min-h-screen bg-slate-100">
      <aside className="hidden w-[240px] shrink-0 flex-col border-r border-slate-200 bg-white md:flex">
        <div className="border-b border-slate-200 px-3 py-3">
          <div className="mb-3 flex items-center justify-between">
            <h1 className="text-sm font-medium text-slate-900">Notes</h1>
            <button className="inline-flex items-center gap-1 rounded-md bg-[#6C63FF] px-2.5 py-1.5 text-[11px] font-medium text-white">
              <Plus className="h-3 w-3" />
              New
            </button>
          </div>

          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            <input
              placeholder="Search notes..."
              className="w-full rounded-md border border-slate-200 bg-slate-50 py-2 pl-8 pr-3 text-[12px] outline-none focus:border-[#6C63FF] focus:bg-white"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-2">
          <div className="px-2 pb-1 pt-1 text-[10px] font-semibold uppercase tracking-[0.07em] text-slate-400">
            Pinned
          </div>

          {pinnedNotes.map((note) => (
            <NoteItem
              key={note.id}
              note={note}
              active={note.id === activeNoteId}
              onClick={() => setActiveNoteId(note.id)}
            />
          ))}

          <div className="px-2 pb-1 pt-3 text-[10px] font-semibold uppercase tracking-[0.07em] text-slate-400">
            Recent
          </div>

          {recentNotes.map((note) => (
            <NoteItem
              key={note.id}
              note={note}
              active={note.id === activeNoteId}
              onClick={() => setActiveNoteId(note.id)}
            />
          ))}
        </div>
      </aside>

      <main className="min-w-0 flex-1 p-4 md:p-6">
        <div className="mx-auto max-w-5xl rounded-lg border border-slate-200 bg-white p-5 md:p-6">
          <div className="mb-2 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="text-lg font-medium text-slate-900">
                {activeNote.title}
              </h2>

              <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
                <span className="inline-flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  Today at 9:14 am
                </span>

                <span className="inline-flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-[#2EC4B6]" />
                  {activeNote.table} table
                </span>

                <span className="inline-flex items-center gap-1 rounded-md bg-[#EEEDFE] px-2 py-1 text-[#534AB7]">
                  <LinkIcon className="h-3 w-3" />
                  Linked to: Summer kickoff June 1
                  <ExternalLink className="h-3 w-3" />
                </span>
              </div>
            </div>

            <div className="flex gap-2">
              <button className="inline-flex items-center gap-1 rounded-md border border-[#AFA9EC] px-2.5 py-1.5 text-[11px] font-medium text-[#6C63FF]">
                <Share2 className="h-3 w-3" />
                Share
              </button>
              <button className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-2.5 py-1.5 text-[11px] font-medium text-slate-500">
                <Pin className="h-3 w-3" />
                Pinned
              </button>
            </div>
          </div>

          <div className="mb-4 flex items-center gap-1 border-b border-slate-200 pb-3">
            <ToolbarButton active>
              <Bold className="h-3.5 w-3.5" />
            </ToolbarButton>
            <ToolbarButton>
              <Italic className="h-3.5 w-3.5" />
            </ToolbarButton>
            <ToolbarButton>
              <Underline className="h-3.5 w-3.5" />
            </ToolbarButton>

            <div className="mx-1 h-5 w-px bg-slate-200" />

            <ToolbarButton>
              <List className="h-3.5 w-3.5" />
            </ToolbarButton>
            <ToolbarButton>
              <CheckSquare className="h-3.5 w-3.5" />
            </ToolbarButton>

            <div className="mx-1 h-5 w-px bg-slate-200" />

            <ToolbarButton>
              <Image className="h-3.5 w-3.5" />
            </ToolbarButton>
            <ToolbarButton>
              <LinkIcon className="h-3.5 w-3.5" />
            </ToolbarButton>

            <div className="ml-auto inline-flex items-center gap-1 text-[11px] text-slate-400">
              <Check className="h-3.5 w-3.5 text-emerald-600" />
              Saved
            </div>
          </div>

          <div className="prose prose-sm max-w-none text-[13px] leading-7 text-slate-800">
            <p className="text-[12px] font-semibold uppercase tracking-[0.06em] text-slate-500">
              Camp & activities
            </p>

            <ul className="space-y-1 pl-0">
              <li className="flex gap-2">
                <CheckSquare className="mt-1 h-4 w-4 text-emerald-600" />
                <span>Liam — soccer camp July 7–11 (registered)</span>
              </li>
              <li className="flex gap-2">
                <CheckSquare className="mt-1 h-4 w-4 text-slate-300" />
                <span>Noah — still deciding between art camp and coding camp</span>
              </li>
              <li className="flex gap-2">
                <CheckSquare className="mt-1 h-4 w-4 text-slate-300" />
                <span>Twins — check if swim lessons have openings in June</span>
              </li>
              <li className="flex gap-2">
                <CheckSquare className="mt-1 h-4 w-4 text-slate-300" />
                <span>Eli — ask him what he actually wants to do this summer</span>
              </li>
            </ul>

            <div className="my-4 h-px bg-slate-200" />

            <p className="text-[12px] font-semibold uppercase tracking-[0.06em] text-slate-500">
              Shared with Jessica
            </p>
            <p>
              Agreed on no big travel until August. Jessica is taking them week
              of July 4th. I have them the following two weeks.
            </p>

            <div className="my-4 h-px bg-slate-200" />

            <p className="text-[12px] font-semibold uppercase tracking-[0.06em] text-slate-500">
              Ideas
            </p>
            <p>
              Day trips — state park, batting cages, maybe drive to the beach one
              weekend. Mom offered to take the boys one Saturday in July.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
import React, { useState } from "react";
import {
  Calendar,
  Clock,
  UserPlus,
  Users,
} from "lucide-react";

const filters = [
  "Everyone",
  "Co-parent",
  "Family",
  "Work",
  "Pending",
];

const people = [
  {
    initials: "JD",
    name: "Jessica D.",
    role: "Co-parent",
    status: "Active",
    statusColor: "bg-green-100 text-green-700",
    avatarColor: "bg-[#FBEAF0] text-[#993556]",
    tables: [
      {
        label: "Family",
        bg: "bg-[#E1F5EE]",
        text: "text-[#085041]",
        dot: "#2EC4B6",
      },
      {
        label: "Boys schedules",
        bg: "bg-[#EEEDFE]",
        text: "text-[#3C3489]",
        dot: "#6C63FF",
      },
    ],
    footerAction: "View shared events",
    footerTime: "Active today",
  },
  {
    initials: "MM",
    name: "Mom",
    role: "Family",
    status: "Active",
    statusColor: "bg-green-100 text-green-700",
    avatarColor: "bg-[#E1F5EE] text-[#085041]",
    tables: [
      {
        label: "Family",
        bg: "bg-[#E1F5EE]",
        text: "text-[#085041]",
        dot: "#2EC4B6",
      },
    ],
    footerAction: "View shared events",
    footerTime: "Active 2 days ago",
  },
  {
    initials: "SR",
    name: "Sarah (sister)",
    role: "Family",
    status: "Pending",
    statusColor: "bg-amber-100 text-amber-700",
    avatarColor: "bg-[#FAEEDA] text-[#633806]",
    tables: [
      {
        label: "Family",
        bg: "bg-[#E1F5EE]",
        text: "text-[#085041]",
        dot: "#2EC4B6",
      },
    ],
    footerAction: "Resend invite",
    footerTime: "Invited 3 days ago",
  },
  {
    initials: "TM",
    name: "Tom M.",
    role: "Work",
    status: "Active",
    statusColor: "bg-green-100 text-green-700",
    avatarColor: "bg-[#EEEDFE] text-[#3C3489]",
    tables: [
      {
        label: "Work",
        bg: "bg-[#EEEDFE]",
        text: "text-[#3C3489]",
        dot: "#6C63FF",
      },
    ],
    footerAction: "View shared events",
    footerTime: "Active 1 week ago",
  },
  {
    initials: "AN",
    name: "Aunt Nicole",
    role: "Family",
    status: "Active",
    statusColor: "bg-green-100 text-green-700",
    avatarColor: "bg-[#FAECE7] text-[#712B13]",
    tables: [
      {
        label: "Family",
        bg: "bg-[#E1F5EE]",
        text: "text-[#085041]",
        dot: "#2EC4B6",
      },
    ],
    footerAction: "View shared events",
    footerTime: "Active 4 days ago",
  },
];

function PersonCard({ person }) {
  return (
    <div className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-white p-4">
      <div className="flex items-center gap-3">
        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[13px] font-semibold ${person.avatarColor}`}
        >
          {person.initials}
        </div>

        <div className="min-w-0">
          <div className="truncate text-[13px] font-medium text-slate-900">
            {person.name}
          </div>

          <div className="text-[11px] text-slate-500">
            {person.role}
          </div>
        </div>

        <div className="ml-auto">
          <span
            className={`rounded-full px-2 py-0.5 text-[10px] ${person.statusColor}`}
          >
            {person.status}
          </span>
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {person.tables.map((table) => (
          <div
            key={table.label}
            className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-[10px] ${table.bg} ${table.text}`}
          >
            <span
              className="h-1.5 w-1.5 rounded-full"
              style={{ background: table.dot }}
            />
            {table.label}
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between border-t border-slate-100 pt-2">
        <button className="inline-flex items-center gap-1 text-[11px] font-medium text-[#6C63FF]">
          <Calendar className="h-3 w-3" />
          {person.footerAction}
        </button>

        <div className="text-[10px] text-slate-400">
          {person.footerTime}
        </div>
      </div>
    </div>
  );
}

function InviteCard() {
  return (
    <button className="flex min-h-[170px] flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-slate-300 bg-white transition hover:border-[#6C63FF] hover:bg-slate-50">
      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#EEEDFE]">
        <UserPlus className="h-4 w-4 text-[#6C63FF]" />
      </div>

      <div className="text-[12px] text-slate-500">
        Invite someone to a table
      </div>
    </button>
  );
}

export default function Team() {
  const [activeFilter, setActiveFilter] = useState("Everyone");

  return (
    <div className="min-h-screen bg-slate-100 p-4 md:p-6">
      <div className="mx-auto flex max-w-6xl flex-col gap-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="flex items-center gap-2 text-xl font-medium text-slate-900">
              <Users className="h-5 w-5 text-[#6C63FF]" />
              People
            </h1>

            <p className="mt-1 text-[13px] text-slate-500">
              6 people in your circle · 1 invite pending
            </p>
          </div>

          <button className="inline-flex items-center justify-center gap-1.5 rounded-md bg-[#6C63FF] px-3.5 py-2 text-[13px] font-medium text-white transition hover:opacity-95">
            <UserPlus className="h-4 w-4" />
            Invite someone
          </button>
        </div>

        <div className="flex flex-wrap gap-2">
          {filters.map((filter) => (
            <button
              key={filter}
              type="button"
              onClick={() => setActiveFilter(filter)}
              className={`inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-[12px] transition ${
                activeFilter === filter
                  ? "border-[#AFA9EC] bg-[#EEEDFE] text-[#534AB7]"
                  : "border-slate-200 bg-white text-slate-500 hover:bg-slate-50"
              }`}
            >
              {filter === "Pending" && <Clock className="h-3 w-3" />}
              {filter}
            </button>
          ))}
        </div>

        <div className="text-[11px] font-semibold uppercase tracking-[0.07em] text-slate-400">
          Your circle
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {people.map((person) => (
            <PersonCard key={person.name} person={person} />
          ))}

          <InviteCard />
        </div>
      </div>
    </div>
  );
}
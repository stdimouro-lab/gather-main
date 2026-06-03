import React, { useEffect, useMemo, useState } from "react";
import {
  Calendar,
  Clock,
  UserPlus,
  Users,
} from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/components/ui/use-toast";
import { useAuth } from "@/context/AuthProvider";
import { supabase } from "@/lib/supabase";
import { fetchPeople } from "@/lib/people";
import { useNavigate } from "react-router-dom";

const filters = ["Everyone", "Owner", "Editor", "Viewer", "Pending"];

const colorMap = {
  indigo: "#6C63FF",
  violet: "#8B5CF6",
  emerald: "#2EC4B6",
  orange: "#F4A261",
  blue: "#3B82F6",
  rose: "#F43F5E",
  teal: "#14B8A6",
  slate: "#64748B",
  amber: "#F59E0B",
};

function getInitials(email = "") {
  return email
    .split("@")[0]
    .split(/[.\s_-]+/)
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) || "G";
}

function membersToPeople(members) {
  return (members ?? []).map((member) => ({
    email: member.email || "Unknown",
    initials: getInitials(member.email),
    role: member.role || "viewer",
    status: member.status === "accepted" ? "accepted" : "pending",
    created_at: member.createdAt,
    tables: (member.shares ?? [])
      .map((share) => {
        const tab = share.calendar_tabs;
        if (!tab?.id) return null;
        return {
          id: tab.id,
          label: tab.name,
          color: colorMap[tab.color] || tab.color || "#6C63FF",
        };
      })
      .filter(Boolean),
  }));
}

function PersonCard({ person }) {
  const isPending = person.status !== "accepted";

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-white p-4">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#EEEDFE] text-[13px] font-semibold text-[#534AB7]">
          {person.initials}
        </div>

        <div className="min-w-0">
          <div className="truncate text-[13px] font-medium text-slate-900">
            {person.email}
          </div>

          <div className="capitalize text-[11px] text-slate-500">
            {person.role}
          </div>
        </div>

        <div className="ml-auto">
          <span
            className={`rounded-full px-2 py-0.5 text-[10px] ${
              isPending
                ? "bg-amber-100 text-amber-700"
                : "bg-green-100 text-green-700"
            }`}
          >
            {isPending ? "Pending" : "Active"}
          </span>
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {person.tables.length === 0 ? (
          <span className="text-[11px] text-slate-400">No tables linked</span>
        ) : (
          person.tables.map((table) => (
            <div
              key={table.id}
              className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-1 text-[10px] text-slate-600"
            >
              <span
                className="h-1.5 w-1.5 rounded-full"
                style={{ background: table.color }}
              />
              {table.label}
            </div>
          ))
        )}
      </div>

      <div className="flex items-center justify-between border-t border-slate-100 pt-2">
        <button
          type="button"
          onClick={() =>
            toast({
              title: isPending ? "Invite pending" : "Shared tables",
              description: isPending
                ? "They'll see your table after they sign in with this email."
                : `${person.tables.length} shared table${person.tables.length === 1 ? "" : "s"}.`,
            })
          }
          className="inline-flex items-center gap-1 text-[11px] font-medium text-[#6C63FF]"
        >
          <Calendar className="h-3 w-3" />
          {isPending ? "Awaiting signup" : "View in calendar"}
        </button>

        <div className="text-[10px] text-slate-400">
          {isPending ? "Pending invite" : "Active"}
        </div>
      </div>
    </div>
  );
}

function InviteCard() {
  const navigate = useNavigate();

  return (
    <button
      type="button"
      onClick={() => navigate("/calendar")}
      className="flex min-h-[170px] flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-slate-300 bg-white transition hover:border-[#6C63FF] hover:bg-slate-50"
    >
      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#EEEDFE]">
        <UserPlus className="h-4 w-4 text-[#6C63FF]" />
      </div>

      <div className="text-[12px] text-slate-500">
        Invite someone to a table
      </div>
    </button>
  );
}

function EmptyPeople() {
  const navigate = useNavigate();

  return (
    <div className="flex min-h-[55vh] items-center justify-center">
      <div className="max-w-md rounded-xl border border-slate-200 bg-white p-6 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#EEEDFE]">
          <Users className="h-6 w-6 text-[#6C63FF]" />
        </div>

        <h2 className="mt-4 text-lg font-medium text-slate-900">
          No people yet
        </h2>

        <p className="mt-2 text-sm leading-6 text-slate-500">
          Share a table from Calendar to start building your circle.
        </p>

        <button
          type="button"
          onClick={() => navigate("/calendar")}
          className="mt-5 inline-flex items-center gap-1.5 rounded-md bg-[#6C63FF] px-4 py-2 text-sm font-medium text-white"
        >
          <UserPlus className="h-4 w-4" />
          Share a table
        </button>
      </div>
    </div>
  );
}

export default function Team() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [activeFilter, setActiveFilter] = useState("Everyone");

  const {
    data: members = [],
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ["people", user?.id],
    queryFn: () => fetchPeople(user.id),
    enabled: !!user?.id,
    staleTime: 15000,
  });

  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel(`people-realtime-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "tab_shares",
          filter: `owner_id=eq.${user.id}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["people", user.id] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient, user?.id]);

  const people = useMemo(() => membersToPeople(members), [members]);

  const filteredPeople = people.filter((person) => {
    if (activeFilter === "Everyone") return true;
    if (activeFilter === "Pending") return person.status !== "accepted";
    return person.role?.toLowerCase() === activeFilter.toLowerCase();
  });

  const pendingCount = people.filter((person) => person.status !== "accepted").length;

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100 text-sm text-slate-500">
        Loading people...
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100 p-6">
        <div className="max-w-md rounded-xl border border-red-200 bg-red-50 p-6 text-center text-sm text-red-700">
          Could not load people: {error?.message ?? "Unknown error"}
        </div>
      </div>
    );
  }

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
              {people.length} people you share with · {pendingCount} invite
              {pendingCount === 1 ? "" : "s"} pending
            </p>
          </div>

          <button
            type="button"
            onClick={() => navigate("/calendar")}
            className="inline-flex items-center justify-center gap-1.5 rounded-md bg-[#6C63FF] px-3.5 py-2 text-[13px] font-medium text-white transition hover:opacity-95"
          >
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

        {people.length === 0 ? (
          <EmptyPeople />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {filteredPeople.map((person) => (
              <PersonCard key={person.email} person={person} />
            ))}

            <InviteCard />
          </div>
        )}
      </div>
    </div>
  );
}

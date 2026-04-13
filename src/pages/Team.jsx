import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Loader2,
  Users,
  UserMinus,
  Mail,
  CheckCircle2,
  Clock3,
  Send,
} from "lucide-react";
import { useAuth } from "@/context/AuthProvider";
import useEntitlement from "@/hooks/useEntitlement";
import {
  listTeamMembers,
  removeTeamMember,
  inviteToTab,
} from "@/lib/tabShares";
import { syncAccountSeatUsage } from "@/lib/account";
import { fetchTabs } from "@/lib/tabs";
import { toast } from "@/components/ui/use-toast";

function formatRole(role) {
  if (!role) return "Viewer";
  return role.charAt(0).toUpperCase() + role.slice(1);
}

function getDisplayName(member) {
  if (member.email) return member.email;
  if (member.userId) return member.userId;
  return "Unknown member";
}

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

export default function Team() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("viewer");
  const [selectedTabId, setSelectedTabId] = useState("");

  const {
    seatLimit,
    seatsUsed,
    remainingSeats,
    hasPaidAccess,
    planTier,
    account,
  } = useEntitlement();

  const {
    data: members = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ["teamMembers", user?.id],
    queryFn: async () => {
      await syncAccountSeatUsage(user.id);
      return listTeamMembers(user.id);
    },
    enabled: !!user?.id,
    staleTime: 10000,
    refetchOnWindowFocus: false,
  });

  const {
    data: tabs = [],
    isLoading: tabsLoading,
  } = useQuery({
    queryKey: ["tabs", user?.id],
    queryFn: () => fetchTabs(user.id),
    enabled: !!user?.id,
    staleTime: 10000,
    refetchOnWindowFocus: false,
  });

  const inviteMutation = useMutation({
    mutationFn: async () => {
      const email = normalizeEmail(inviteEmail);

      if (!hasPaidAccess) {
        throw new Error("Inviting people is part of a paid plan.");
      }

      if (!selectedTabId) {
        throw new Error("Please select a table to share.");
      }

      if (!email) {
        throw new Error("Please enter an email address.");
      }

      const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailPattern.test(email)) {
        throw new Error("Please enter a valid email address.");
      }

      const synced = await syncAccountSeatUsage(user.id);
      const freshSeatsUsed = synced?.seatsUsed ?? seatsUsed;

      if (freshSeatsUsed >= seatLimit) {
        throw new Error("Your account has reached its current seat limit.");
      }

      return inviteToTab({
        tabId: selectedTabId,
        email,
        role: inviteRole,
        sharedById: user.id,
      });
    },
    onSuccess: async () => {
      await syncAccountSeatUsage(user.id);

      setInviteEmail("");
      setInviteRole("viewer");

      await queryClient.invalidateQueries({ queryKey: ["teamMembers", user.id] });
      await queryClient.invalidateQueries({ queryKey: ["account", user.id] });
      await queryClient.invalidateQueries({ queryKey: ["sharedTabs"] });
      await queryClient.invalidateQueries({ queryKey: ["tabs"] });

      toast({
        title: "Invite sent",
        description: "The table invite was created successfully.",
      });
    },
    onError: (err) => {
      toast({
        title: "Could not send invite",
        description: err?.message ?? "Something went wrong.",
        variant: "destructive",
      });
    },
  });

  const removeMutation = useMutation({
    mutationFn: async (member) => {
      return removeTeamMember({
        ownerId: user.id,
        userId: member.userId,
        email: member.email,
      });
    },
    onSuccess: async () => {
      await syncAccountSeatUsage(user.id);

      await queryClient.invalidateQueries({ queryKey: ["teamMembers", user.id] });
      await queryClient.invalidateQueries({ queryKey: ["account", user.id] });
      await queryClient.invalidateQueries({ queryKey: ["accountMembers"] });
      await queryClient.invalidateQueries({ queryKey: ["accountShares"] });
      await queryClient.invalidateQueries({ queryKey: ["sharedTabs"] });
      await queryClient.invalidateQueries({ queryKey: ["tabs"] });

      toast({
        title: "Member removed",
        description: "Access and seat usage have been updated.",
      });
    },
    onError: (err) => {
      toast({
        title: "Could not remove member",
        description: err?.message ?? "Something went wrong.",
        variant: "destructive",
      });
    },
  });

  const acceptedMembers = useMemo(
    () => members.filter((member) => member.status === "accepted"),
    [members]
  );

  const pendingMembers = useMemo(
    () => members.filter((member) => member.status !== "accepted"),
    [members]
  );

  const usagePercent =
    seatLimit > 0 ? Math.min((seatsUsed / seatLimit) * 100, 100) : 0;

  const canInvite =
    hasPaidAccess &&
    !!selectedTabId &&
    !!normalizeEmail(inviteEmail) &&
    remainingSeats > 0 &&
    !inviteMutation.isPending;

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Team</h1>
          <p className="mt-2 text-sm text-slate-600">
            Manage shared access, pending invites, and seat usage.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link
            to="/plans"
            className="rounded-xl border px-4 py-2 text-sm text-slate-700"
          >
            Back to plans
          </Link>
          <Link
            to="/settings"
            className="rounded-xl border px-4 py-2 text-sm text-slate-700"
          >
            Back to settings
          </Link>
        </div>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2 text-slate-600">
            <Users className="h-4 w-4" />
            <span className="text-sm">Current plan</span>
          </div>
          <p className="mt-2 text-lg font-semibold capitalize text-slate-900">
            {planTier}
          </p>
          <p className="mt-1 text-sm text-slate-500">
            {hasPaidAccess
              ? "Shared access is enabled."
              : "Upgrade to share with others."}
          </p>
        </div>

        <div className="rounded-2xl border bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-600">Seats used</p>
          <p className="mt-2 text-lg font-semibold text-slate-900">
            {seatsUsed} / {seatLimit}
          </p>
          <p className="mt-1 text-sm text-slate-500">
            {remainingSeats} remaining
          </p>
        </div>

        <div className="rounded-2xl border bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-600">Account</p>
          <p className="mt-2 text-lg font-semibold text-slate-900">
            {account?.billing_source || "none"}
          </p>
          <p className="mt-1 text-sm text-slate-500">
            Owner seat is included in usage.
          </p>
        </div>
      </div>

      <div className="mt-4 rounded-2xl border bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-medium text-slate-700">Seat usage</p>
          <p className="text-sm text-slate-500">
            {seatsUsed} of {seatLimit}
          </p>
        </div>

        <div className="mt-3 h-3 overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full rounded-full bg-slate-900 transition-all"
            style={{ width: `${usagePercent}%` }}
          />
        </div>
      </div>

      <div className="mt-6 rounded-2xl border bg-white p-5 shadow-sm">
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-slate-900">Invite to a table</h2>
          <p className="mt-1 text-sm text-slate-500">
            Share one of your tables with a viewer or editor.
          </p>
        </div>

        {!hasPaidAccess && (
          <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
            Upgrade your plan to invite people to your tables.
          </div>
        )}

        {remainingSeats <= 0 && hasPaidAccess && (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            You have reached your current seat limit. Remove someone or upgrade to add more people.
          </div>
        )}

        <div className="grid gap-3 md:grid-cols-4">
          <div className="md:col-span-2">
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Email
            </label>
            <input
              type="email"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder="name@example.com"
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none ring-0 placeholder:text-slate-400 focus:border-slate-400"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Role
            </label>
            <select
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value)}
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-400"
            >
              <option value="viewer">Viewer</option>
              <option value="editor">Editor</option>
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Table
            </label>
            <select
              value={selectedTabId}
              onChange={(e) => setSelectedTabId(e.target.value)}
              disabled={tabsLoading}
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-400 disabled:opacity-60"
            >
              <option value="">{tabsLoading ? "Loading..." : "Select a table"}</option>
              {tabs.map((tab) => (
                <option key={tab.id} value={tab.id}>
                  {tab.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-slate-500">
            Invites are sent per table and count toward seat usage.
          </p>

          <button
            type="button"
            onClick={() => inviteMutation.mutate()}
            disabled={!canInvite}
            className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm text-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            {inviteMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Send className="h-4 w-4" />
                Send invite
              </>
            )}
          </button>
        </div>
      </div>

      {isLoading && (
        <div className="mt-8 rounded-2xl border bg-white p-8 text-center shadow-sm">
          <Loader2 className="mx-auto h-6 w-6 animate-spin text-slate-500" />
          <p className="mt-3 text-sm text-slate-600">Loading team members...</p>
        </div>
      )}

      {error && (
        <div className="mt-8 rounded-2xl border border-red-200 bg-red-50 p-4">
          <p className="text-sm text-red-700">
            {error?.message ?? "Could not load team members."}
          </p>
        </div>
      )}

      {!isLoading && !error && (
        <>
          <section className="mt-8">
            <div className="mb-4 flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-slate-700" />
              <h2 className="text-xl font-semibold text-slate-900">
                Active members
              </h2>
            </div>

            <div className="space-y-3">
              <div className="rounded-2xl border bg-white p-4 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-medium text-slate-900">
                      {user?.email || "Account owner"}
                    </p>
                    <p className="mt-1 text-sm text-slate-500">
                      Owner • Always counts as one seat
                    </p>
                  </div>

                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
                    Owner
                  </span>
                </div>
              </div>

              {acceptedMembers.length === 0 ? (
                <div className="rounded-2xl border bg-white p-6 text-sm text-slate-500 shadow-sm">
                  No active members yet.
                </div>
              ) : (
                acceptedMembers.map((member) => (
                  <div
                    key={member.key}
                    className="rounded-2xl border bg-white p-4 shadow-sm"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div>
                        <p className="font-medium text-slate-900">
                          {getDisplayName(member)}
                        </p>
                        <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-500">
                          <span className="rounded-full bg-slate-100 px-2 py-1">
                            {formatRole(member.role)}
                          </span>
                          <span className="rounded-full bg-slate-100 px-2 py-1">
                            {member.tabCount} shared tab{member.tabCount === 1 ? "" : "s"}
                          </span>
                          <span className="rounded-full bg-slate-100 px-2 py-1">
                            Active
                          </span>
                        </div>

                        {member.shares?.length > 0 && (
                          <div className="mt-3 flex flex-wrap gap-2">
                            {member.shares.map((share) => (
                              <span
                                key={share.id}
                                className="rounded-full border px-2 py-1 text-xs text-slate-600"
                              >
                                {share.calendar_tabs?.name || "Unnamed table"}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      <button
                        onClick={() => removeMutation.mutate(member)}
                        disabled={removeMutation.isPending}
                        className="inline-flex items-center gap-2 rounded-xl border border-red-200 px-3 py-2 text-sm text-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {removeMutation.isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <UserMinus className="h-4 w-4" />
                        )}
                        Remove
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>

          <section className="mt-10">
            <div className="mb-4 flex items-center gap-2">
              <Clock3 className="h-5 w-5 text-slate-700" />
              <h2 className="text-xl font-semibold text-slate-900">
                Pending invites
              </h2>
            </div>

            {pendingMembers.length === 0 ? (
              <div className="rounded-2xl border bg-white p-6 text-sm text-slate-500 shadow-sm">
                No pending invites right now.
              </div>
            ) : (
              <div className="space-y-3">
                {pendingMembers.map((member) => (
                  <div
                    key={member.key}
                    className="rounded-2xl border bg-white p-4 shadow-sm"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <Mail className="h-4 w-4 text-slate-500" />
                          <p className="font-medium text-slate-900">
                            {getDisplayName(member)}
                          </p>
                        </div>

                        <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-500">
                          <span className="rounded-full bg-slate-100 px-2 py-1">
                            {formatRole(member.role)}
                          </span>
                          <span className="rounded-full bg-slate-100 px-2 py-1">
                            {member.tabCount} shared tab{member.tabCount === 1 ? "" : "s"}
                          </span>
                          <span className="rounded-full bg-amber-100 px-2 py-1 text-amber-800">
                            Pending
                          </span>
                        </div>

                        {member.shares?.length > 0 && (
                          <div className="mt-3 flex flex-wrap gap-2">
                            {member.shares.map((share) => (
                              <span
                                key={share.id}
                                className="rounded-full border px-2 py-1 text-xs text-slate-600"
                              >
                                {share.calendar_tabs?.name || "Unnamed table"}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      <button
                        onClick={() => removeMutation.mutate(member)}
                        disabled={removeMutation.isPending}
                        className="inline-flex items-center gap-2 rounded-xl border border-red-200 px-3 py-2 text-sm text-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {removeMutation.isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <UserMinus className="h-4 w-4" />
                        )}
                        Cancel invite
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
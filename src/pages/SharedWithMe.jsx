import React, { useMemo } from "react";
import { Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Calendar,
  Share2,
  Users,
  RefreshCw,
  ArrowRight,
  Mail,
  UserCircle2,
  Clock3,
  Shield,
  Loader2,
} from "lucide-react";

import { fetchSharedTabsForMe } from "@/lib/tabShares";
import { useAuth } from "@/context/AuthProvider";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/use-toast";

function formatDate(value) {
  if (!value) return "Recently";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "Recently";

  return d.toLocaleDateString([], {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function getRoleLabel(role) {
  if (role === "editor") return "Editor";
  if (role === "owner") return "Owner";
  return "Viewer";
}

function getRoleBadgeClasses(role) {
  if (role === "editor") {
    return "bg-indigo-50 text-indigo-700 border-indigo-200";
  }

  if (role === "owner") {
    return "bg-emerald-50 text-emerald-700 border-emerald-200";
  }

  return "bg-slate-50 text-slate-700 border-slate-200";
}

function getTabColorClasses(color) {
  switch (color) {
    case "indigo":
      return "from-indigo-500 to-indigo-600";
    case "violet":
      return "from-violet-500 to-violet-600";
    case "emerald":
      return "from-emerald-500 to-emerald-600";
    case "rose":
      return "from-rose-500 to-rose-600";
    case "amber":
      return "from-amber-500 to-amber-600";
    case "sky":
      return "from-sky-500 to-sky-600";
    case "pink":
      return "from-pink-500 to-pink-600";
    default:
      return "from-slate-500 to-slate-600";
  }
}

function buildOpenUrl(share) {
  const tabId = share?.calendar_tabs?.id || share?.tab_id;
  if (!tabId) return "/calendar";
  return `/calendar?tab=${tabId}`;
}

function normalizeShare(share) {
  const tab = share?.calendar_tabs || {};

  return {
    ...share,
    displayName: tab?.name || "Shared table",
    displayColor: tab?.color || "slate",
    roleLabel: getRoleLabel(share?.role),
    openUrl: buildOpenUrl(share),
    inviterLabel:
      share?.shared_by_profile?.full_name ||
      share?.shared_by_profile?.display_name ||
      share?.shared_by_email ||
      "Someone on Gather",
    ownerLabel:
      share?.owner_profile?.full_name ||
      share?.owner_profile?.display_name ||
      share?.owner_email ||
      "Table owner",
  };
}

export default function SharedWithMe() {
  const { user, loading } = useAuth();
  const queryClient = useQueryClient();

  const {
    data: sharedTabs = [],
    isLoading,
    isFetching,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ["sharedTabs", user?.id, user?.email],
    queryFn: () =>
      fetchSharedTabsForMe({
        userId: user.id,
        email: user.email,
      }),
    enabled: !!user?.id && !!user?.email,
    refetchOnWindowFocus: false,
    staleTime: 30000,
  });

  const items = useMemo(() => {
    return [...sharedTabs]
      .map(normalizeShare)
      .sort((a, b) => {
        const aTime = new Date(a?.created_at || 0).getTime();
        const bTime = new Date(b?.created_at || 0).getTime();
        return bTime - aTime;
      });
  }, [sharedTabs]);

  const handleRefresh = async () => {
    try {
      await refetch();
      await queryClient.invalidateQueries({ queryKey: ["sharedTabs", user?.id] });

      toast({
        title: "Shared tables refreshed",
      });
    } catch (e) {
      toast({
        title: "Couldn’t refresh",
        description: e?.message ?? "Something went wrong.",
        variant: "destructive",
      });
    }
  };

  if (loading || !user) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 px-4">
        <div className="text-center">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-indigo-600" />
          <p className="mt-3 text-sm text-slate-500">Loading your shared tables...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <div className="mb-6 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="bg-gradient-to-r from-indigo-600 via-violet-600 to-fuchsia-600 px-6 py-8 text-white">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-medium tracking-wide">
                  <Share2 className="h-3.5 w-3.5" />
                  Shared with you
                </div>

                <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
                  Invited Tables
                </h1>

                <p className="mt-2 max-w-2xl text-sm text-white/85 sm:text-base">
                  See the tables other people shared with you and jump straight into them.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <Button
                  variant="secondary"
                  onClick={handleRefresh}
                  disabled={isFetching}
                  className="rounded-xl"
                >
                  {isFetching ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="mr-2 h-4 w-4" />
                  )}
                  Refresh
                </Button>

                <Link to="/calendar">
                  <Button className="rounded-xl bg-white text-slate-900 hover:bg-slate-100">
                    <Calendar className="mr-2 h-4 w-4" />
                    My calendar
                  </Button>
                </Link>
              </div>
            </div>
          </div>

          <div className="grid gap-4 border-t border-slate-200 px-6 py-5 sm:grid-cols-3">
            <div className="rounded-2xl bg-slate-50 p-4">
              <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Shared tables
              </div>
              <div className="mt-2 text-2xl font-semibold text-slate-900">
                {items.length}
              </div>
            </div>

            <div className="rounded-2xl bg-slate-50 p-4">
              <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Your access
              </div>
              <div className="mt-2 text-sm text-slate-700">
                Open and edit based on the role each owner gave you.
              </div>
            </div>

            <div className="rounded-2xl bg-slate-50 p-4">
              <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
                How it works
              </div>
              <div className="mt-2 text-sm text-slate-700">
                New invites you accept automatically will show up here.
              </div>
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="rounded-3xl border border-slate-200 bg-white p-10 text-center shadow-sm">
            <Loader2 className="mx-auto h-8 w-8 animate-spin text-indigo-600" />
            <p className="mt-3 text-sm text-slate-500">Loading shared tables...</p>
          </div>
        ) : isError ? (
          <div className="rounded-3xl border border-rose-200 bg-white p-8 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">Couldn’t load shared tables</h2>
            <p className="mt-2 text-sm text-slate-600">
              {error?.message || "Something went wrong while loading your shared tables."}
            </p>
            <Button onClick={handleRefresh} className="mt-4 rounded-xl">
              Try again
            </Button>
          </div>
        ) : items.length === 0 ? (
          <div className="animate-in fade-in zoom-in-95 duration-300 rounded-3xl border border-dashed border-slate-300 bg-white p-12 text-center shadow-sm">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-100 to-violet-100 shadow-inner">
  <Users className="h-8 w-8 text-indigo-600" />
</div>

            <h2 className="mt-5 text-2xl font-semibold tracking-tight text-slate-900">
              Nothing shared with you yet
            </h2>

            <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-slate-600 sm:text-base">
              When someone invites you to a table, it will show up here automatically so you can
              jump right in.
            </p>

            <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
              <Link to="/calendar">
                <Button className="rounded-xl bg-indigo-600 text-white shadow-sm hover:bg-indigo-700">
  <Calendar className="mr-2 h-4 w-4" />
  Open my calendar
</Button>
              </Link>

              <Button
                variant="outline"
                onClick={handleRefresh}
                className="rounded-xl"
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Refresh
              </Button>
            </div>
          </div>
        ) : (
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {items.map((share) => {
              const tab = share?.calendar_tabs || {};

              return (
                <div
                  key={share.id}
                  className="group overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
                >
                  <div className={`h-2 w-full bg-gradient-to-r ${getTabColorClasses(share.displayColor)}`} />

                  <div className="p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h2 className="truncate text-xl font-semibold tracking-tight text-slate-900">
                          {share.displayName}
                        </h2>
                        <p className="mt-1 text-sm text-slate-500">
                          Shared table
                        </p>
                      </div>

                      <div
                        className={`shrink-0 rounded-full border px-2.5 py-1 text-xs font-medium ${getRoleBadgeClasses(
                          share.role
                        )}`}
                      >
                        {share.roleLabel}
                      </div>
                    </div>

                    <div className="mt-5 space-y-3">
                      <div className="flex items-start gap-3 text-sm text-slate-600">
                        <UserCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                        <div>
                          <div className="font-medium text-slate-700">Owner</div>
                          <div>{share.ownerLabel}</div>
                        </div>
                      </div>

                      <div className="flex items-start gap-3 text-sm text-slate-600">
                        <Mail className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                        <div>
                          <div className="font-medium text-slate-700">Shared by</div>
                          <div>{share.inviterLabel}</div>
                        </div>
                      </div>

                      <div className="flex items-start gap-3 text-sm text-slate-600">
                        <Clock3 className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                        <div>
                          <div className="font-medium text-slate-700">Added</div>
                          <div>{formatDate(share.created_at)}</div>
                        </div>
                      </div>

                      <div className="flex items-start gap-3 text-sm text-slate-600">
                        <Shield className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                        <div>
                          <div className="font-medium text-slate-700">Access</div>
                          <div>
                            {share.role === "editor"
                              ? "Can edit events and table content"
                              : "View access only"}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="mt-6 flex items-center gap-3">
                      <Link to={share.openUrl} className="flex-1">
                        <Button className="w-full rounded-xl">
                          Open table
                          <ArrowRight className="ml-2 h-4 w-4" />
                        </Button>
                      </Link>

                      <Link to="/calendar">
                        <Button variant="outline" className="rounded-xl">
                          Calendar
                        </Button>
                      </Link>
                    </div>

                    {tab?.description ? (
                      <p className="mt-4 line-clamp-2 text-sm text-slate-500">
                        {tab.description}
                      </p>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
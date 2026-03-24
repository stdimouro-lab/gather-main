import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { ArrowLeft, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useAuth } from "@/context/AuthProvider";
import { fetchSharedTabsForMe } from "@/lib/tabShares";
import { cn } from "@/lib/utils";

export default function SharedWithMePage() {
  const { user } = useAuth();

  const {
    data: sharedTabs = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ["sharedTabs", user?.id, user?.email],
    queryFn: () =>
      fetchSharedTabsForMe({
        userId: user?.id,
        email: user?.email,
      }),
    enabled: !!user?.id || !!user?.email,
  });

  const getInitials = (nameOrEmail = "") => {
    const value = String(nameOrEmail).trim();
    if (!value) return "?";

    const parts = value.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
    }

    return value.slice(0, 2).toUpperCase();
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex items-center gap-4 mb-8">
          <Link to="/calendar">
            <Button variant="ghost" size="icon" className="rounded-full">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>

          <div>
            <h1 className="text-2xl font-semibold text-slate-900">
              Shared With Me
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Tables other people have shared with you.
            </p>
          </div>
        </div>

        {isLoading ? (
          <div className="bg-white rounded-2xl border border-slate-100 p-8 text-slate-500">
            Loading shared tables...
          </div>
        ) : error ? (
          <div className="bg-white rounded-2xl border border-red-200 p-8 text-red-600">
            Unable to load shared tables.
          </div>
        ) : sharedTabs.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-100 p-8 text-center">
            <Users className="w-10 h-10 mx-auto text-slate-300 mb-3" />
            <h2 className="text-lg font-medium text-slate-900">
              No shared tables yet
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              When someone shares a table with your email, it will appear here.
            </p>
          </div>
        ) : (
          <div className="grid gap-4">
            {sharedTabs.map((tab) => (
              <div
                key={tab.id}
                className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 min-w-0">
                    <Avatar className="h-10 w-10">
                      <AvatarFallback className="bg-slate-100 text-slate-600 text-xs font-medium">
                        {getInitials(tab.shared_by_name || tab.name)}
                      </AvatarFallback>
                    </Avatar>

                    <div className="min-w-0">
                      <h2 className="text-lg font-semibold text-slate-900 truncate">
                        {tab.name}
                      </h2>

                      <p className="text-sm text-slate-500 mt-1 truncate">
                        {tab.shared_by_name
                          ? `Shared by ${tab.shared_by_name}`
                          : "Shared table"}
                      </p>

                      {tab.description ? (
                        <p className="text-sm text-slate-500 mt-2">
                          {tab.description}
                        </p>
                      ) : null}

                      <div className="mt-3 flex items-center gap-2">
                        <span className="text-xs text-slate-500">
                          Access level:
                        </span>
                        <span
                          className={cn(
                            "inline-flex rounded-full px-2 py-1 text-xs font-medium capitalize",
                            tab.share_role === "editor"
                              ? "bg-indigo-100 text-indigo-700"
                              : "bg-slate-100 text-slate-700"
                          )}
                        >
                          {tab.share_role}
                        </span>
                      </div>
                    </div>
                  </div>

                  <Link to={`/calendar?tab=${tab.id}`}>
                    <Button className="bg-indigo-600 hover:bg-indigo-700">
                      Open Table
                    </Button>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
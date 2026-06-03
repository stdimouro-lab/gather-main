import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ExternalLink,
  Link2,
  ListChecks,
  Loader2,
  Plus,
  Unlink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/context/AuthProvider";
import { toast } from "@/components/ui/use-toast";
import {
  createListForEvent,
  fetchListsForEvent,
  fetchUnlinkedLists,
  linkListToEvent,
  unlinkListFromEvent,
} from "@/lib/lists";

export default function EventLists({
  eventId,
  eventTitle,
  isEditable = true,
}) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [newListTitle, setNewListTitle] = useState("");
  const [attachListId, setAttachListId] = useState("");

  const listsKey = ["listsForEvent", eventId];

  const { data: linkedLists = [], isLoading } = useQuery({
    queryKey: listsKey,
    queryFn: () => fetchListsForEvent(eventId),
    enabled: !!eventId,
    staleTime: 10000,
  });

  const { data: unlinkedLists = [] } = useQuery({
    queryKey: ["unlinkedLists", user?.id],
    queryFn: () => fetchUnlinkedLists(user.id),
    enabled: !!user?.id && isEditable,
    staleTime: 10000,
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: listsKey });
    queryClient.invalidateQueries({ queryKey: ["lists", user?.id] });
    queryClient.invalidateQueries({ queryKey: ["unlinkedLists", user?.id] });
  };

  const handleDbError = (error) => {
    const message = String(error?.message || "");
    if (message.includes("event_id") || message.includes("column")) {
      toast({
        title: "Database update required",
        description:
          "Apply migration 20260602120000_lists_event_link.sql in Supabase, then redeploy.",
        variant: "destructive",
      });
      return true;
    }
    return false;
  };

  const createMutation = useMutation({
    mutationFn: () =>
      createListForEvent({
        ownerId: user.id,
        eventId,
        title: newListTitle.trim() || `${eventTitle || "Event"} checklist`,
      }),
    onSuccess: () => {
      setNewListTitle("");
      invalidate();
      toast({ title: "Checklist created" });
    },
    onError: (error) => {
      if (!handleDbError(error)) {
        toast({
          title: "Could not create list",
          description: error?.message,
          variant: "destructive",
        });
      }
    },
  });

  const attachMutation = useMutation({
    mutationFn: (listId) => linkListToEvent(listId, eventId),
    onSuccess: () => {
      setAttachListId("");
      invalidate();
      toast({ title: "List attached" });
    },
    onError: (error) => {
      if (!handleDbError(error)) {
        toast({
          title: "Could not attach list",
          description: error?.message,
          variant: "destructive",
        });
      }
    },
  });

  const unlinkMutation = useMutation({
    mutationFn: (listId) => unlinkListFromEvent(listId),
    onSuccess: () => {
      invalidate();
      toast({ title: "List unlinked" });
    },
    onError: (error) => {
      toast({
        title: "Could not unlink",
        description: error?.message,
        variant: "destructive",
      });
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center gap-2 py-10 text-sm text-slate-500">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading lists...
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-xs text-slate-500">
        Packing lists, groceries, and to-dos for this event. Everyone with access to the event can open them from here.
      </p>

      {linkedLists.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
          No checklists yet for this event.
        </div>
      ) : (
        <ul className="space-y-2">
          {linkedLists.map((list) => (
            <li
              key={list.id}
              className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2.5"
            >
              <span className="text-base">{list.icon || "📝"}</span>
              <div className="min-w-0 flex-1">
                <div className="truncate text-[13px] font-medium text-slate-900">
                  {list.title}
                </div>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 shrink-0 text-[#6C63FF]"
                onClick={() => navigate(`/lists?list=${list.id}`)}
              >
                <ExternalLink className="mr-1 h-3.5 w-3.5" />
                Open
              </Button>
              {isEditable && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 shrink-0 text-slate-500"
                  disabled={unlinkMutation.isPending}
                  onClick={() => unlinkMutation.mutate(list.id)}
                  title="Unlink from event"
                >
                  <Unlink className="h-3.5 w-3.5" />
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}

      {isEditable && (
        <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50/80 p-3">
          <div className="flex items-center gap-2 text-xs font-medium text-slate-600">
            <ListChecks className="h-3.5 w-3.5 text-[#6C63FF]" />
            Add a checklist
          </div>

          <div className="flex gap-2">
            <Input
              value={newListTitle}
              onChange={(e) => setNewListTitle(e.target.value)}
              placeholder="e.g. Packing list, Party supplies"
              className="h-9 flex-1 bg-white text-sm"
            />
            <Button
              type="button"
              size="sm"
              className="h-9 shrink-0 bg-indigo-600 hover:bg-indigo-700"
              disabled={createMutation.isPending}
              onClick={() => createMutation.mutate()}
            >
              <Plus className="mr-1 h-3.5 w-3.5" />
              New
            </Button>
          </div>

          {unlinkedLists.length > 0 && (
            <div className="flex gap-2">
              <Select value={attachListId} onValueChange={setAttachListId}>
                <SelectTrigger className="h-9 flex-1 bg-white text-sm">
                  <SelectValue placeholder="Attach an existing list..." />
                </SelectTrigger>
                <SelectContent>
                  {unlinkedLists.map((list) => (
                    <SelectItem key={list.id} value={list.id}>
                      {list.icon || "📝"} {list.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-9 shrink-0"
                disabled={!attachListId || attachMutation.isPending}
                onClick={() => attachMutation.mutate(attachListId)}
              >
                <Link2 className="mr-1 h-3.5 w-3.5" />
                Attach
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

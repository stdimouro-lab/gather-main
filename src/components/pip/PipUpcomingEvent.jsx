import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { DateTime } from "luxon";
import { Bell, Calendar, ImagePlus } from "lucide-react";
import { useAuth } from "@/context/AuthProvider";
import { executePipAction } from "@/lib/ai/pip/execute";
import { readGatherPreferences } from "@/lib/profileSettings";
import { useToast } from "@/components/ui/use-toast";
import usePipContext from "@/hooks/usePipContext";

function eventStart(event) {
  return event.start_at ?? event.start_date;
}

export default function PipUpcomingEvent({ event, onActionComplete }) {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { data: context } = usePipContext();
  const [busy, setBusy] = useState(null);

  const when = DateTime.fromISO(eventStart(event));

  const handleOpen = () => {
    navigate("/calendar", { state: { focusEventId: event.id } });
  };

  const handleRemind = async () => {
    setBusy("remind");
    try {
      const prefs = readGatherPreferences(user, profile);
      const minutes = prefs.notifications?.event_reminder_minutes ?? 30;
      const res = await executePipAction(
        {
          type: "schedule_reminder",
          payload: {
            event,
            minutesBefore: minutes,
          },
        },
        { userId: user.id, defaultTabId: context?.defaultTab?.id }
      );

      if (res.status === "scheduled") {
        const at = DateTime.fromISO(res.at);
        toast({
          title: "Reminder set",
          description: at.isValid
            ? `${event.title} — ${at.toFormat("EEE h:mm a")}`
            : `You'll be reminded before ${event.title}.`,
        });
        onActionComplete?.({
          kind: "reminder",
          message: `Reminder set for ${event.title}`,
        });
      } else if (res.status === "past") {
        toast({
          title: "Too soon",
          description: "This event starts before a reminder can fire.",
          variant: "destructive",
        });
      } else if (res.status === "denied") {
        toast({
          title: "Notifications off",
          description: "Enable notifications in Settings to get reminders.",
          variant: "destructive",
        });
      } else if (res.status === "skipped") {
        const reminderList = context?.lists?.find((l) =>
          /remind/i.test(l.title)
        );
        if (reminderList) {
          await executePipAction(
            {
              type: "create_list_items",
              payload: {
                listId: reminderList.id,
                items: [
                  `Reminder: ${event.title} (${when.isValid ? when.toFormat("EEE MMM d h:mm a") : ""})`,
                ],
              },
            },
            { userId: user.id, defaultTabId: context?.defaultTab?.id }
          );
          toast({
            title: "Reminder added to list",
            description: "Saved under your Reminders list.",
          });
          onActionComplete?.({
            kind: "reminder",
            message: `Reminder added for ${event.title}`,
          });
        } else {
          toast({
            title: "Use mobile for alerts",
            description:
              "Local reminders work in the app. On web, add a list called Reminders.",
          });
        }
      } else {
        toast({
          title: "Reminder saved",
          description: "You'll get a nudge before it starts.",
        });
      }
    } catch (err) {
      toast({
        title: "Could not set reminder",
        description: err?.message,
        variant: "destructive",
      });
    } finally {
      setBusy(null);
    }
  };

  const handleMemory = () => {
    const prompt = event.title
      ? `Memory from ${event.title}`
      : "Add a family memory";
    navigate("/pip", {
      state: {
        expectMemory: true,
        initialQuery: prompt,
      },
    });
  };

  return (
    <li className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2.5">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="truncate text-[13px] font-medium text-slate-900">
            {event.title}
          </div>
          <div className="text-[11px] text-slate-500">
            {when.isValid ? when.toFormat("EEE, MMM d · h:mm a") : ""}
          </div>
        </div>
        <Calendar className="mt-0.5 h-4 w-4 shrink-0 text-[#6C63FF]" />
      </div>
      <div className="mt-2 flex flex-wrap gap-1.5">
        <button
          type="button"
          onClick={handleOpen}
          className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-[11px] font-medium text-slate-700 hover:bg-[#EEEDFE]"
        >
          <Calendar className="h-3 w-3" />
          Open
        </button>
        <button
          type="button"
          disabled={busy === "remind"}
          onClick={handleRemind}
          className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-[11px] font-medium text-slate-700 hover:bg-[#EEEDFE] disabled:opacity-50"
        >
          <Bell className="h-3 w-3" />
          {busy === "remind" ? "Setting…" : "Remind"}
        </button>
        <button
          type="button"
          onClick={handleMemory}
          className="inline-flex items-center gap-1 rounded-md border border-[#AFA9EC] bg-[#EEEDFE] px-2 py-1 text-[11px] font-medium text-[#534AB7] hover:bg-[#E0DCFC]"
        >
          <ImagePlus className="h-3 w-3" />
          Save memory
        </button>
      </div>
    </li>
  );
}

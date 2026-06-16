import { createEvent } from "@/lib/events";
import { createList, createListItems } from "@/lib/lists";
import { uploadMemoryAsset } from "@/lib/memories";
import { scheduleEventReminder } from "@/lib/localNotifications";

export async function executePipAction(action, { userId, defaultTabId }) {
  if (!action?.type || !userId) {
    throw new Error("Missing action or user.");
  }

  switch (action.type) {
    case "create_event": {
      const event = await createEvent(action.payload);
      return { kind: "event", event };
    }

    case "create_list_items": {
      let listId = action.payload?.listId;

      if (!listId && action.payload?.listTitle) {
        const created = await createList({
          owner_id: userId,
          title: action.payload.listTitle,
          icon: "✨",
          color: "indigo",
          is_pinned: false,
          is_shared: false,
        });
        listId = created.id;
      }

      if (!listId) {
        throw new Error("No list to add items to.");
      }

      const items = action.payload?.items ?? [];
      const rows = await createListItems(
        items.map((text, index) => ({
          list_id: listId,
          owner_id: userId,
          text,
          completed: false,
          sort_order: index,
        }))
      );

      return { kind: "list_items", listId, count: rows.length };
    }

    case "create_memory": {
      const { title, caption } = action.payload ?? {};
      const asset = await uploadMemoryAsset({
        owner_id: userId,
        tab_id: defaultTabId || null,
        event_id: null,
        asset_type: "note",
        title: title || "Family moment",
        caption: caption || title,
        storage_path: null,
        mime_type: "text/plain",
      });
      return { kind: "memory", asset };
    }

    case "open_calendar":
      return { kind: "navigate", path: "/calendar" };

    case "schedule_reminder": {
      const res = await scheduleEventReminder({
        event: action.payload?.event,
        minutesBefore: action.payload?.minutesBefore ?? 30,
        title: action.payload?.title,
        body: action.payload?.body,
      });
      return { kind: "reminder", ...res };
    }

    default:
      throw new Error(`Unknown Pip action: ${action.type}`);
  }
}

export function pipActionToastMessage(action, result) {
  switch (action?.type) {
    case "create_event":
      return {
        title: "Event added",
        description: `Added to your calendar — ${action.payload?.title || "new event"}.`,
      };
    case "create_memory":
      return {
        title: "Memory saved",
        description: "Added to your family story.",
      };
    case "create_list_items":
      return {
        title: "Tasks added",
        description: `${action.payload?.items?.length ?? 0} item(s) added to your list.`,
      };
    case "schedule_reminder":
      if (result?.status === "scheduled") {
        return {
          title: "Reminder set",
          description: "You'll get a nudge before it starts.",
        };
      }
      return {
        title: "Reminder noted",
        description: "Check notification settings on mobile for local alerts.",
      };
    default:
      return {
        title: "Done",
        description: "Pip updated your family data.",
      };
  }
}

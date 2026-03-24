import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export default function RecurrenceScopeModal({
  isOpen,
  onClose,
  onChoose,
  action = "edit",
}) {
  const actionLabel =
    action === "move"
      ? "move"
      : action === "resize"
      ? "resize"
      : action === "delete"
      ? "delete"
      : "edit";

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md rounded-2xl">
        <DialogHeader>
          <DialogTitle>Recurring event</DialogTitle>
          <DialogDescription>
            Choose whether to {actionLabel} only this event, this and following
            events, or the entire series.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 pt-2">
          <p className="text-sm text-slate-600">
            Do you want to {actionLabel} only this event, this event and future
            events, or the entire series?
          </p>

          <div className="grid gap-2">
            <Button
              variant="default"
              className="justify-start"
              onClick={() => onChoose("one")}
            >
              This event only
            </Button>

            <Button
              variant="outline"
              className="justify-start"
              onClick={() => onChoose("following")}
            >
              This and following
            </Button>

            <Button
              variant="outline"
              className="justify-start"
              onClick={() => onChoose("series")}
            >
              Entire series
            </Button>

            <Button variant="ghost" onClick={onClose}>
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
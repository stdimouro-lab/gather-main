import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Sparkles } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { generatePipListSuggestions } from "@/lib/ai/pipLists";

export default function PipListDialog({
  open,
  onOpenChange,
  listTitle,
  eventTitle,
  existingItems = [],
  onAddItems,
  isAdding = false,
}) {
  const suggestion = useMemo(
    () =>
      generatePipListSuggestions({
        listTitle,
        eventTitle,
        existingItems,
      }),
    [listTitle, eventTitle, existingItems, open]
  );

  const [selected, setSelected] = useState(() => new Set());

  const items = suggestion.items;

  const toggle = (item) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(item)) next.delete(item);
      else next.add(item);
      return next;
    });
  };

  const selectAll = () => {
    setSelected(new Set(items));
  };

  const handleOpenChange = (next) => {
    if (next) {
      setSelected(new Set(items));
    }
    onOpenChange(next);
  };

  const toAdd = items.filter((item) => selected.has(item));

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[85vh] max-w-md overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-[#6C63FF]" />
            Pip list ideas
          </DialogTitle>
          <DialogDescription>
            {suggestion.summary} For schedules, memories, and your week, open{" "}
            <Link to="/pip" className="font-medium text-[#6C63FF] underline">
              Ask Pip
            </Link>
            .
          </DialogDescription>
        </DialogHeader>

        {items.length === 0 ? (
          <p className="py-6 text-center text-sm text-slate-500">
            Nothing new to add. Try renaming your list (e.g. &quot;Grocery run&quot; or
            &quot;Camping trip&quot;) for smarter suggestions.
          </p>
        ) : (
          <ul className="max-h-[45vh] space-y-2 overflow-y-auto pr-1">
            {items.map((item) => (
              <li key={item}>
                <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-slate-200 px-3 py-2.5 hover:bg-slate-50">
                  <input
                    type="checkbox"
                    checked={selected.has(item)}
                    onChange={() => toggle(item)}
                    className="mt-0.5"
                  />
                  <span className="text-[13px] text-slate-800">{item}</span>
                </label>
              </li>
            ))}
          </ul>
        )}

        <DialogFooter className="flex-col gap-2 sm:flex-row">
          {items.length > 0 && (
            <Button type="button" variant="outline" onClick={selectAll}>
              Select all
            </Button>
          )}
          <Button
            type="button"
            disabled={!toAdd.length || isAdding}
            className="bg-[#6C63FF] hover:bg-[#5b54e8]"
            onClick={() => onAddItems(toAdd)}
          >
            {isAdding
              ? "Adding..."
              : `Add ${toAdd.length} ${toAdd.length === 1 ? "item" : "items"}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

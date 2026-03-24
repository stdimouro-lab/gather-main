import React, { useMemo } from "react";
import { useDraggable } from "@dnd-kit/core";
import { cn } from "@/lib/utils";

export default function ResizableEvent({
  id,
  event,
  style,
  className,
  onClick,
  children,
}) {
  // main drag (move)
  const move = useDraggable({
    id: `move:${id}`,
    data: { type: "move", event },
  });

  // resize drag (bottom handle)
  const resize = useDraggable({
    id: `resize:${id}`,
    data: { type: "resize", event },
  });

  const moveStyle = useMemo(() => {
    const t = move.transform;
    return t ? { transform: `translate3d(${t.x}px, ${t.y}px, 0)` } : undefined;
  }, [move.transform]);

  return (
    <div
      ref={move.setNodeRef}
      style={{ ...style, ...moveStyle }}
      className={cn("pointer-events-auto", className)}
      onClick={onClick}
      {...move.listeners}
      {...move.attributes}
    >
      <div className="relative h-full">
        {children}

        {/* Resize handle */}
        <div
          ref={resize.setNodeRef}
          className="absolute bottom-0 left-0 right-0 h-2 cursor-ns-resize"
          {...resize.listeners}
          {...resize.attributes}
          onClick={(e) => e.stopPropagation()}
        >
          {/* tiny grip */}
          <div className="mx-auto mt-1 h-1 w-10 rounded-full bg-white/60" />
        </div>
      </div>
    </div>
  );
}
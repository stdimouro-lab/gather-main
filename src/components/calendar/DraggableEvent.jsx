import React from "react";
import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";

export default function DraggableEvent({ id, event, style, className, onClick, children }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id,
    data: { event },
  });

  const dragStyle = {
    ...style,
    transform: transform ? CSS.Translate.toString(transform) : style?.transform,
    opacity: isDragging ? 0.75 : 1,
    cursor: "grab",
    touchAction: "none",
  };

  return (
    <div
      ref={setNodeRef}
      style={dragStyle}
      className={className}
      onClick={onClick}
      {...listeners}
      {...attributes}
    >
      {children}
    </div>
  );
}
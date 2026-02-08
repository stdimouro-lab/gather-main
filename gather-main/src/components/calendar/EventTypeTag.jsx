import React from 'react';
import { cn } from "@/lib/utils";

const EVENT_TYPES = {
  school: { emoji: '🎒', label: 'School', color: 'bg-blue-100 text-blue-700' },
  sports: { emoji: '⚽', label: 'Sports', color: 'bg-green-100 text-green-700' },
  appointment: { emoji: '🩺', label: 'Appointment', color: 'bg-red-100 text-red-700' },
  reservation: { emoji: '🍽️', label: 'Reservation', color: 'bg-amber-100 text-amber-700' },
  family: { emoji: '🎉', label: 'Family', color: 'bg-purple-100 text-purple-700' },
  work: { emoji: '💼', label: 'Work', color: 'bg-slate-100 text-slate-700' },
  other: { emoji: '📌', label: 'Other', color: 'bg-slate-50 text-slate-600' }
};

export function getEventTypeInfo(type = 'other') {
  return EVENT_TYPES[type] || EVENT_TYPES.other;
}

export default function EventTypeTag({ type = 'other', className = '' }) {
  const info = getEventTypeInfo(type);
  
  return (
    <span className={cn(
      'inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium transition-all',
      info.color,
      className
    )}>
      <span>{info.emoji}</span>
      <span>{info.label}</span>
    </span>
  );
}
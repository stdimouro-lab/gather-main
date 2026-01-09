import React from 'react';
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  eachDayOfInterval, 
  isSameMonth, 
  isSameDay, 
  isToday,
  parseISO
} from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from "@/lib/utils";
import { getTabColors } from './TabFilter';

export default function MonthView({ 
  currentDate, 
  events, 
  tabs, 
  activeTabs,
  onSelectDate,
  onSelectEvent 
}) {
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
  
  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });
  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  
  const getEventsForDay = (day) => {
    return events.filter(event => {
      const eventDate = parseISO(event.start_date);
      return isSameDay(eventDate, day) && activeTabs.includes(event.tab_id);
    }).slice(0, 3);
  };
  
  const getMoreCount = (day) => {
    const dayEvents = events.filter(event => {
      const eventDate = parseISO(event.start_date);
      return isSameDay(eventDate, day) && activeTabs.includes(event.tab_id);
    });
    return Math.max(0, dayEvents.length - 3);
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
      {/* Week day headers */}
      <div className="grid grid-cols-7 border-b border-slate-100">
        {weekDays.map((day) => (
          <div 
            key={day} 
            className="px-2 py-3 text-center text-xs font-semibold text-slate-400 uppercase tracking-wider"
          >
            {day}
          </div>
        ))}
      </div>
      
      {/* Calendar grid */}
      <div className="grid grid-cols-7">
        {days.map((day, idx) => {
          const dayEvents = getEventsForDay(day);
          const moreCount = getMoreCount(day);
          const isCurrentMonth = isSameMonth(day, currentDate);
          const isCurrentDay = isToday(day);
          
          return (
            <motion.div
              key={day.toISOString()}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: idx * 0.01 }}
              onClick={() => onSelectDate(day)}
              className={cn(
                "min-h-[100px] sm:min-h-[120px] p-1.5 sm:p-2 border-b border-r border-slate-100 cursor-pointer transition-colors hover:bg-slate-50",
                !isCurrentMonth && "bg-slate-50/50",
                idx % 7 === 6 && "border-r-0"
              )}
            >
              <div className={cn(
                "w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center rounded-full text-sm font-medium mb-1 transition-all",
                isCurrentDay && "bg-indigo-600 text-white",
                !isCurrentDay && isCurrentMonth && "text-slate-700 hover:bg-slate-100",
                !isCurrentDay && !isCurrentMonth && "text-slate-300"
              )}>
                {format(day, 'd')}
              </div>
              
              <div className="space-y-1">
                <AnimatePresence mode="popLayout">
                  {dayEvents.map((event) => {
                    const tab = tabs.find(t => t.id === event.tab_id);
                    const colors = tab ? getTabColors(tab.color) : getTabColors('indigo');
                    
                    return (
                      <motion.div
                        key={event.id}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectEvent(event);
                        }}
                        className={cn(
                          "px-2 py-1 rounded-md text-xs font-medium truncate cursor-pointer transition-all hover:scale-[1.02]",
                          colors.light,
                          colors.text
                        )}
                      >
                        {event.visibility === 'busy_only' ? 'Busy' : event.title}
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
                
                {moreCount > 0 && (
                  <div className="text-xs text-slate-400 font-medium px-2">
                    +{moreCount} more
                  </div>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
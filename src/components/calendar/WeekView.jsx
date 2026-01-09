import React from 'react';
import { 
  format, 
  startOfWeek, 
  endOfWeek, 
  eachDayOfInterval, 
  eachHourOfInterval,
  startOfDay,
  endOfDay,
  isSameDay,
  isToday,
  parseISO,
  getHours,
  getMinutes,
  differenceInMinutes
} from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from "@/lib/utils";
import { getTabColors } from './TabFilter';

export default function WeekView({ 
  currentDate, 
  events, 
  tabs, 
  activeTabs,
  onSelectDate,
  onSelectEvent 
}) {
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 0 });
  const weekEnd = endOfWeek(currentDate, { weekStartsOn: 0 });
  const days = eachDayOfInterval({ start: weekStart, end: weekEnd });
  
  const hours = Array.from({ length: 24 }, (_, i) => i);
  
  const getEventsForDay = (day) => {
    return events.filter(event => {
      const eventDate = parseISO(event.start_date);
      return isSameDay(eventDate, day) && activeTabs.includes(event.tab_id);
    });
  };
  
  const getEventPosition = (event) => {
    const start = parseISO(event.start_date);
    const end = parseISO(event.end_date);
    const startHour = getHours(start) + getMinutes(start) / 60;
    const duration = differenceInMinutes(end, start) / 60;
    
    return {
      top: `${startHour * 60}px`,
      height: `${Math.max(duration * 60, 30)}px`
    };
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
      {/* Header with days */}
      <div className="grid grid-cols-8 border-b border-slate-100">
        <div className="w-16 sm:w-20" /> {/* Time column spacer */}
        {days.map((day) => (
          <div 
            key={day.toISOString()}
            className={cn(
              "px-2 py-4 text-center border-l border-slate-100",
              isToday(day) && "bg-indigo-50"
            )}
          >
            <div className="text-xs font-semibold text-slate-400 uppercase">
              {format(day, 'EEE')}
            </div>
            <div className={cn(
              "w-10 h-10 mx-auto mt-1 flex items-center justify-center rounded-full text-lg font-semibold transition-all",
              isToday(day) ? "bg-indigo-600 text-white" : "text-slate-700"
            )}>
              {format(day, 'd')}
            </div>
          </div>
        ))}
      </div>
      
      {/* Time grid */}
      <div className="relative overflow-auto max-h-[600px]">
        <div className="grid grid-cols-8">
          {/* Time labels */}
          <div className="w-16 sm:w-20">
            {hours.map((hour) => (
              <div 
                key={hour} 
                className="h-[60px] pr-2 flex items-start justify-end"
              >
                <span className="text-xs text-slate-400 -mt-2">
                  {format(new Date().setHours(hour, 0), 'h a')}
                </span>
              </div>
            ))}
          </div>
          
          {/* Day columns */}
          {days.map((day) => (
            <div 
              key={day.toISOString()}
              className={cn(
                "relative border-l border-slate-100",
                isToday(day) && "bg-indigo-50/30"
              )}
            >
              {/* Hour lines */}
              {hours.map((hour) => (
                <div
                  key={hour}
                  className="h-[60px] border-b border-slate-100 hover:bg-slate-50/50 cursor-pointer"
                  onClick={() => {
                    const selectedDate = new Date(day);
                    selectedDate.setHours(hour);
                    onSelectDate(selectedDate);
                  }}
                />
              ))}
              
              {/* Events */}
              <div className="absolute inset-0 pointer-events-none">
                {getEventsForDay(day).map((event) => {
                  const tab = tabs.find(t => t.id === event.tab_id);
                  const colors = tab ? getTabColors(tab.color) : getTabColors('indigo');
                  const position = getEventPosition(event);
                  
                  return (
                    <motion.div
                      key={event.id}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      style={{
                        top: position.top,
                        height: position.height,
                        left: '4px',
                        right: '4px'
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectEvent(event);
                      }}
                      className={cn(
                        "absolute rounded-lg px-2 py-1 cursor-pointer pointer-events-auto transition-all hover:scale-[1.02] overflow-hidden",
                        colors.bg,
                        "text-white shadow-sm"
                      )}
                    >
                      <div className="text-xs font-medium truncate">
                        {event.visibility === 'busy_only' ? 'Busy' : event.title}
                      </div>
                      <div className="text-xs opacity-80">
                        {format(parseISO(event.start_date), 'h:mm a')}
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
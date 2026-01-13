import React from 'react';
import { format, isToday, parseISO } from 'date-fns';
import { motion } from 'framer-motion';
import { Plus, MapPin, Coffee } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { getTabColors } from './TabFilter';
import { cn } from "@/lib/utils";

export default function TodayAtTheTable({ 
  events, 
  tabs, 
  onSelectEvent, 
  onAddEvent,
  onFilterToTab 
}) {
  // Filter events happening today
  const todayEvents = events.filter(event => {
    const eventDate = parseISO(event.start_date);
    return isToday(eventDate);
  });

  // Group events by table
  const eventsByTab = tabs.reduce((acc, tab) => {
    const tabEvents = todayEvents
      .filter(e => e.tab_id === tab.id)
      .sort((a, b) => new Date(a.start_date) - new Date(b.start_date));
    
    if (tabEvents.length > 0) {
      acc.push({ tab, events: tabEvents });
    }
    return acc;
  }, []);

  const isEmpty = eventsByTab.length === 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-sm border border-slate-100 p-5 mb-6"
    >
      {/* Header */}
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-slate-900">Today at the Table</h2>
        <p className="text-sm text-slate-500">{format(new Date(), 'EEEE, MMMM d')}</p>
      </div>

      {isEmpty ? (
        /* Empty State */
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="py-8 text-center"
        >
          <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <Coffee className="w-6 h-6 text-slate-400" />
          </div>
          <p className="text-slate-700 font-medium">Nothing happening today</p>
          <p className="text-sm text-slate-400 mt-1">Enjoy the space.</p>
        </motion.div>
      ) : (
        /* Events grouped by table */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {eventsByTab.map(({ tab, events: tabEvents }, index) => {
            const colors = getTabColors(tab.color);
            
            return (
              <motion.div
                key={tab.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className={cn(
                  "rounded-xl p-4 border",
                  colors.light,
                  colors.border
                )}
              >
                {/* Table header */}
                <div className="flex items-center justify-between mb-3">
                  <button
                    onClick={() => onFilterToTab(tab.id)}
                    className={cn(
                      "text-sm font-semibold hover:underline",
                      colors.text
                    )}
                  >
                    {tab.name}
                  </button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className={cn("h-6 w-6", colors.text, "hover:bg-white/50")}
                    onClick={() => onAddEvent(tab)}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>

                {/* Events list */}
                <div className="space-y-2">
                  {tabEvents.map((event) => (
                    <button
                      key={event.id}
                      onClick={() => onSelectEvent(event)}
                      className="w-full text-left p-2 rounded-lg hover:bg-white/60 transition-colors group"
                    >
                      <div className="flex items-start gap-2">
                        <span className="text-xs font-medium text-slate-500 whitespace-nowrap mt-0.5">
                          {event.all_day ? "All day" : format(parseISO(event.start_date), 'h:mm a')}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-800 truncate group-hover:text-slate-900">
                            {event.title}
                          </p>
                          {event.location && (
                            <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5 truncate">
                              <MapPin className="w-3 h-3 flex-shrink-0" />
                              {event.location}
                            </p>
                          )}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </motion.div>
  );
}
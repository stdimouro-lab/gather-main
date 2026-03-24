import React from "react";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { format, addMonths, subMonths, addWeeks, subWeeks } from "date-fns";
import { motion } from "framer-motion";

export default function CalendarHeader({
  currentDate,
  onDateChange,
  onAddEvent,
  view,
  onViewChange,
}) {
  const handlePrev = () => {
    onDateChange(view === "week" ? subWeeks(currentDate, 1) : subMonths(currentDate, 1));
  };

  const handleNext = () => {
    onDateChange(view === "week" ? addWeeks(currentDate, 1) : addMonths(currentDate, 1));
  };

  const handleToday = () => {
    onDateChange(new Date());
  };

  return (
    <div className="mb-4 rounded-2xl border border-slate-200/70 bg-white/70 p-3 backdrop-blur sm:mb-6 sm:p-4">
      <div className="flex flex-col gap-3">
        {/* Top row */}
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <motion.h1
              key={`${view}-${format(currentDate, "MMMM yyyy")}`}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className="truncate text-xl font-semibold tracking-tight text-slate-900 sm:text-3xl"
            >
              {format(currentDate, "MMMM yyyy")}
            </motion.h1>

            <div className="mt-1 text-xs text-slate-500 sm:hidden">
              {view === "week" ? "Week view" : "Month view"}
            </div>
          </div>

          <Button
            onClick={onAddEvent}
            className="h-10 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 px-3 text-sm font-medium text-white shadow-md shadow-indigo-200/60 hover:from-indigo-600 hover:to-purple-700 sm:h-11 sm:px-5"
            title="Add it once. Share it where it belongs."
          >
            <Plus className="mr-1 h-4 w-4 sm:mr-2" />
            <span className="sm:hidden">Add</span>
            <span className="hidden sm:inline">+ New Event</span>
          </Button>
        </div>

        {/* Bottom row */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <motion.div
            className="flex items-center gap-1"
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
          >
            <Button
              variant="ghost"
              size="icon"
              onClick={handlePrev}
              className="h-9 w-9 rounded-full hover:bg-slate-100"
            >
              <ChevronLeft className="h-5 w-5 text-slate-600" />
            </Button>

            <Button
              variant="ghost"
              size="icon"
              onClick={handleNext}
              className="h-9 w-9 rounded-full hover:bg-slate-100"
            >
              <ChevronRight className="h-5 w-5 text-slate-600" />
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={handleToday}
              className="ml-1 h-9 rounded-lg border-slate-200 px-3 text-xs font-medium text-slate-600 hover:bg-slate-50"
            >
              Today
            </Button>
          </motion.div>

          <div className="flex items-center justify-between gap-2 sm:justify-end">
            <div className="grid grid-cols-2 rounded-xl bg-slate-100 p-1">
              {["month", "week"].map((v) => (
                <Button
                  key={v}
                  variant="ghost"
                  size="sm"
                  onClick={() => onViewChange(v)}
                  className={`h-8 rounded-lg px-3 text-xs font-medium capitalize transition-all sm:px-4 ${
                    view === v
                      ? "bg-white text-slate-900 shadow-sm"
                      : "text-slate-500 hover:text-slate-700"
                  }`}
                >
                  {v}
                </Button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
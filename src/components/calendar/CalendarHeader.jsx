import React from 'react';
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Plus, Calendar as CalendarIcon } from 'lucide-react';
import { format, addMonths, subMonths } from 'date-fns';
import { motion } from 'framer-motion';

export default function CalendarHeader({ 
  currentDate, 
  onDateChange, 
  onAddEvent, 
  view, 
  onViewChange 
}) {
  const handlePrev = () => {
    onDateChange(subMonths(currentDate, 1));
  };

  const handleNext = () => {
    onDateChange(addMonths(currentDate, 1));
  };

  const handleToday = () => {
    onDateChange(new Date());
  };

  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8 pb-4 border-b border-slate-200/50">
      <div className="flex items-center gap-3">
        <motion.div 
          className="flex items-center gap-1"
          initial={{ opacity: 0, x: -20 }}
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
        </motion.div>
        
        <motion.h1 
          key={format(currentDate, 'MMMM yyyy')}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-2xl sm:text-3xl font-semibold text-slate-900 tracking-tight"
        >
          {format(currentDate, 'MMMM yyyy')}
        </motion.h1>
        
        <Button 
          variant="outline" 
          size="sm" 
          onClick={handleToday}
          className="ml-2 text-xs font-medium text-slate-600 border-slate-200 hover:bg-slate-50"
        >
          Today
        </Button>
      </div>
      
      <div className="flex items-center gap-3">
        <div className="flex items-center bg-slate-100 rounded-lg p-1">
          {['month', 'week'].map((v) => (
            <Button
              key={v}
              variant="ghost"
              size="sm"
              onClick={() => onViewChange(v)}
              className={`text-xs font-medium capitalize px-4 py-1.5 rounded-md transition-all ${
                view === v 
                  ? 'bg-white text-slate-900 shadow-sm' 
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {v}
            </Button>
          ))}
        </div>
        
        <Button 
          onClick={onAddEvent}
          className="bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white rounded-xl px-5 py-2.5 text-sm font-medium shadow-lg shadow-indigo-200/50 transition-all hover:shadow-xl hover:shadow-indigo-200/70"
          title="Add it once. Share it where it belongs."
        >
          <Plus className="h-4 w-4 mr-2" />
          "+ New Event"
        </Button>
      </div>
    </div>
  );
}
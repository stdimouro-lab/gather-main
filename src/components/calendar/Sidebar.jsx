import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Badge } from "@/components/ui/badge";
import { Plus, Menu, X, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from "@/lib/utils";
import TabFilter from './TabFilter';

export default function Sidebar({ 
  currentDate,
  onDateChange,
  tabs, 
  activeTabs, 
  onToggleTab,
  onAddTab,
  onShareTab,
  onManageTab,
  sharedTabs,
  pendingSuggestionsCount = 0,
  onOpenSuggestions,
  isMobile = false
}) {
  const [isOpen, setIsOpen] = useState(!isMobile);

  if (isMobile) {
    return (
      <>
        <Button
          variant="outline"
          size="icon"
          className="fixed bottom-4 left-4 z-50 h-12 w-12 rounded-full shadow-lg bg-white border-slate-200"
          onClick={() => setIsOpen(true)}
        >
          <Menu className="h-5 w-5" />
        </Button>
        
        <AnimatePresence>
          {isOpen && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40"
                onClick={() => setIsOpen(false)}
              />
              <motion.div
                initial={{ x: '-100%' }}
                animate={{ x: 0 }}
                exit={{ x: '-100%' }}
                transition={{ type: 'spring', damping: 25 }}
                className="fixed left-0 top-0 bottom-0 w-80 bg-white z-50 shadow-2xl"
              >
                <div className="h-full flex flex-col">
                  <div className="flex items-center justify-between p-4 border-b border-slate-100">
                    <h2 className="font-semibold text-slate-900">Tables</h2>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setIsOpen(false)}
                    >
                      <X className="h-5 w-5" />
                    </Button>
                  </div>
                  
                  <div className="flex-1 overflow-auto p-4 space-y-6">
                    <Calendar
                      mode="single"
                      selected={currentDate}
                      onSelect={(date) => {
                        if (date) onDateChange(date);
                      }}
                      className="rounded-xl border-0"
                    />
                    
                    {/* Suggested Gatherings */}
                    <button
                      onClick={() => {
                        onOpenSuggestions();
                        setIsOpen(false);
                      }}
                      className="w-full flex items-center justify-between p-3 bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 rounded-xl hover:bg-amber-100 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-amber-600" />
                        <span className="text-sm font-medium text-amber-900">Suggested Gatherings</span>
                      </div>
                      <Badge variant="secondary" className="bg-amber-100 text-amber-700 text-xs">
                        Coming Soon
                      </Badge>
                    </button>

                    <TabFilter
                      tabs={tabs}
                      activeTabs={activeTabs}
                      onToggleTab={onToggleTab}
                      onShareTab={onShareTab}
                      onManageTab={onManageTab}
                      sharedTabs={sharedTabs}
                    />
                    
                    <Button
                      onClick={onAddTab}
                      variant="outline"
                      className="w-full border-dashed border-slate-300 text-slate-600 hover:bg-slate-50"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      + New Table
                    </Button>
                  </div>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </>
    );
  }

  return (
    <div className="w-72 flex-shrink-0 bg-white border-r border-slate-200 h-full overflow-auto">
      <div className="p-4 space-y-6">
        <Calendar
          mode="single"
          selected={currentDate}
          onSelect={(date) => {
            if (date) onDateChange(date);
          }}
          className="rounded-xl border-0"
        />
        
        {/* Suggested Gatherings */}
        <button
          onClick={onOpenSuggestions}
          className="w-full flex items-center justify-between p-3 bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 rounded-xl hover:bg-amber-100 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-600" />
            <span className="text-sm font-medium text-amber-900">Suggested Gatherings</span>
          </div>
          <Badge variant="secondary" className="bg-amber-100 text-amber-700 text-xs">
            Coming Soon
          </Badge>
        </button>

        <TabFilter
          tabs={tabs}
          activeTabs={activeTabs}
          onToggleTab={onToggleTab}
          onShareTab={onShareTab}
          onManageTab={onManageTab}
          sharedTabs={sharedTabs}
        />
        
        <Button
          onClick={onAddTab}
          variant="outline"
          className="w-full border-dashed border-slate-300 text-slate-600 hover:bg-slate-50"
        >
          <Plus className="h-4 w-4 mr-2" />
          + New Table
        </Button>
      </div>
    </div>
  );
}
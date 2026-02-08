import React from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { format, parseISO } from 'date-fns';
import { motion } from 'framer-motion';
import { History, RotateCcw, Plus, Pencil, Trash2 } from 'lucide-react';
import { cn } from "@/lib/utils";

export default function EventHistoryPanel({ 
  isOpen, 
  onClose, 
  history,
  onRevert 
}) {
  const actionIcons = {
    created: Plus,
    updated: Pencil,
    deleted: Trash2
  };
  
  const actionColors = {
    created: 'bg-green-100 text-green-700',
    updated: 'bg-blue-100 text-blue-700',
    deleted: 'bg-red-100 text-red-700'
  };

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className="w-[400px] sm:w-[450px]">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <History className="w-5 h-5 text-slate-500" />
            Change History
          </SheetTitle>
        </SheetHeader>
        
        <div className="mt-6 space-y-4">
          {history.length === 0 ? (
            <div className="text-center py-12">
              <History className="w-12 h-12 text-slate-200 mx-auto mb-3" />
              <p className="text-slate-500">No changes recorded yet</p>
            </div>
          ) : (
            history.map((entry, index) => {
              const Icon = actionIcons[entry.action] || Pencil;
              
              return (
                <motion.div
                  key={entry.id}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="relative pl-8 pb-4 border-b border-slate-100 last:border-0"
                >
                  <div className={cn(
                    "absolute left-0 top-0 w-6 h-6 rounded-full flex items-center justify-center",
                    actionColors[entry.action]
                  )}>
                    <Icon className="w-3 h-3" />
                  </div>
                  
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <Badge className={actionColors[entry.action]} variant="secondary">
                        {entry.action}
                      </Badge>
                      <span className="text-xs text-slate-400">
                        {format(parseISO(entry.created_date), 'MMM d, h:mm a')}
                      </span>
                    </div>
                    
                    <p className="text-sm text-slate-600">
                      by {entry.changed_by_email}
                    </p>
                    
                    {entry.changes && Object.keys(entry.changes).length > 0 && (
                      <div className="mt-2 text-xs text-slate-500 bg-slate-50 rounded-lg p-2">
                        <p className="font-medium mb-1">Changes:</p>
                        {Object.entries(entry.changes).map(([field, value]) => (
                          <div key={field} className="flex gap-2">
                            <span className="font-medium capitalize">{field}:</span>
                            <span className="truncate">{JSON.stringify(value)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    
                    {entry.action !== 'deleted' && entry.previous_data && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="mt-2 text-xs text-indigo-600 hover:text-indigo-700"
                        onClick={() => onRevert(entry)}
                      >
                        <RotateCcw className="w-3 h-3 mr-1" />
                        Revert to this version
                      </Button>
                    )}
                  </div>
                </motion.div>
              );
            })
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
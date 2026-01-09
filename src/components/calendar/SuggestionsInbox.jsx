import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { motion, AnimatePresence } from 'framer-motion';
import { 
  MailOpen, 
  Check, 
  X, 
  Edit2, 
  AlertCircle,
  Inbox,
  Sparkles,
  Calendar as CalendarIcon,
  MapPin,
  Clock
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import EventTypeTag, { getEventTypeInfo } from './EventTypeTag';
import { cn } from "@/lib/utils";
import { getTabColors } from './TabFilter';

export default function SuggestionsInbox({
  isOpen,
  onClose,
  suggestions = [],
  tabs = [],
  onAccept,
  onReject,
  onEdit,
  isLoading = false
}) {
  const [editingSuggestion, setEditingSuggestion] = useState(null);

  const pendingSuggestions = suggestions.filter(s => s.status === 'pending');
  const recentProcessed = suggestions.filter(s => s.status !== 'pending').slice(0, 5);

  const getTabName = (tabId) => {
    return tabs.find(t => t.id === tabId)?.name || 'Unknown';
  };

  const getTabColor = (tabId) => {
    const tab = tabs.find(t => t.id === tabId);
    return tab ? getTabColors(tab.color) : getTabColors('indigo');
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-500" />
            Smart Suggestions
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-auto">
          {pendingSuggestions.length === 0 ? (
            <div className="p-8 text-center">
              <Inbox className="w-12 h-12 text-slate-200 mx-auto mb-4" />
              <h3 className="font-medium text-slate-600 mb-2">All caught up!</h3>
              <p className="text-sm text-slate-400">
                No new event suggestions. They'll appear here when we detect events in your emails.
              </p>
            </div>
          ) : (
            <div className="space-y-3 p-4">
              <div className="flex items-center gap-2 mb-4">
                <AlertCircle className="w-4 h-4 text-blue-500" />
                <p className="text-sm text-blue-600 font-medium">
                  {pendingSuggestions.length} {pendingSuggestions.length === 1 ? 'suggestion' : 'suggestions'} from your emails
                </p>
              </div>

              <AnimatePresence mode="popLayout">
                {pendingSuggestions.map((suggestion, idx) => {
                  const typeInfo = getEventTypeInfo(suggestion.event_type);
                  const tabColors = getTabColor(suggestion.suggested_tab_id);

                  return (
                    <motion.div
                      key={suggestion.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ delay: idx * 0.05 }}
                    >
                      <Card className="overflow-hidden hover:shadow-md transition-all">
                        <div className={cn("h-1", tabColors.bg)} />
                        <CardContent className="p-4">
                          <div className="space-y-3">
                            {/* Header */}
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="text-xl">{typeInfo.emoji}</span>
                                  <h3 className="font-semibold text-slate-900 text-sm md:text-base">
                                    {suggestion.title}
                                  </h3>
                                </div>
                                <p className="text-xs text-slate-500">
                                  From: <span className="font-medium">{suggestion.source_email}</span>
                                </p>
                              </div>
                              <Badge 
                                className={tabColors.light + ' ' + tabColors.text}
                                variant="secondary"
                              >
                                {getTabName(suggestion.suggested_tab_id)}
                              </Badge>
                            </div>

                            {/* Details */}
                            <div className="grid grid-cols-2 gap-3 text-xs text-slate-600">
                              {suggestion.suggested_date && (
                                <div className="flex items-center gap-2">
                                  <CalendarIcon className="w-4 h-4 text-slate-400" />
                                  {format(parseISO(suggestion.suggested_date), 'MMM d')}
                                </div>
                              )}
                              {suggestion.suggested_time && (
                                <div className="flex items-center gap-2">
                                  <Clock className="w-4 h-4 text-slate-400" />
                                  {suggestion.suggested_time}
                                </div>
                              )}
                              {suggestion.location && (
                                <div className="col-span-2 flex items-center gap-2">
                                  <MapPin className="w-4 h-4 text-slate-400" />
                                  {suggestion.location}
                                </div>
                              )}
                            </div>

                            {/* Confidence indicator */}
                            {suggestion.confidence !== undefined && (
                              <div className="flex items-center gap-2 text-xs">
                                <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                  <div
                                    className="h-full bg-gradient-to-r from-indigo-400 to-indigo-600 transition-all"
                                    style={{ width: `${suggestion.confidence * 100}%` }}
                                  />
                                </div>
                                <span className="text-slate-500 text-xs">
                                  {Math.round(suggestion.confidence * 100)}% match
                                </span>
                              </div>
                            )}

                            {/* Actions */}
                            <div className="flex items-center gap-2 pt-2">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                  setEditingSuggestion(suggestion);
                                  onEdit(suggestion);
                                }}
                                className="flex-1 text-xs text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50"
                              >
                                <Edit2 className="w-3 h-3 mr-1" />
                                Edit & Add
                              </Button>
                              <Button
                                size="sm"
                                onClick={() => onAccept(suggestion)}
                                className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-xs"
                              >
                                <Check className="w-3 h-3 mr-1" />
                                Add
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => onReject(suggestion)}
                                className="px-2 text-slate-400 hover:text-slate-600"
                              >
                                <X className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          )}

          {/* Recent processed */}
          {recentProcessed.length > 0 && (
            <div className="px-4 py-4 border-t border-slate-100">
              <h3 className="text-xs font-semibold text-slate-400 uppercase mb-3">Recently processed</h3>
              <div className="space-y-1">
                {recentProcessed.map((s) => (
                  <div key={s.id} className="text-xs text-slate-500 p-2 rounded hover:bg-slate-50">
                    <span className="line-through">{s.title}</span>
                    <span className="ml-2 text-slate-400">
                      {s.status === 'accepted' ? '✓ Added' : '✗ Ignored'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
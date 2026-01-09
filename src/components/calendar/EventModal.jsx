import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format, parseISO } from 'date-fns';
import { Calendar, MapPin, FileText, Lock, Eye, Repeat, Trash2, Image as ImageIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { getTabColors } from './TabFilter';
import EventTypeTag, { getEventTypeInfo } from './EventTypeTag';
import EventMemories from './EventMemories';
import { cn } from "@/lib/utils";

export default function EventModal({ 
  isOpen, 
  onClose, 
  event, 
  tabs, 
  defaultTab,
  defaultDate,
  onSave, 
  onDelete,
  isSharedEvent = false,
  userRole = 'owner'
}) {
  const [formData, setFormData] = useState({
    title: '',
    tab_id: '',
    start_date: '',
    end_date: '',
    all_day: false,
    location: '',
    notes: '',
    private_notes: '',
    visibility: 'full',
    event_type: 'other',
    recurrence: { type: 'none' }
  });
  
  const [activeTab, setActiveTab] = useState('details');
  
  const canEdit = userRole === 'owner' || userRole === 'editor' || userRole === 'admin';
  const canDelete = userRole === 'owner' || userRole === 'admin';

  useEffect(() => {
    if (event) {
      setFormData({
        title: event.title || '',
        tab_id: event.tab_id || '',
        start_date: event.start_date ? format(parseISO(event.start_date), "yyyy-MM-dd'T'HH:mm") : '',
        end_date: event.end_date ? format(parseISO(event.end_date), "yyyy-MM-dd'T'HH:mm") : '',
        all_day: event.all_day || false,
        location: event.location || '',
        notes: event.notes || '',
        private_notes: event.private_notes || '',
        visibility: event.visibility || 'full',
        event_type: event.event_type || 'other',
        recurrence: event.recurrence || { type: 'none' }
      });
    } else {
      const defaultDateTime = defaultDate || new Date();
      const startStr = format(defaultDateTime, "yyyy-MM-dd'T'HH:mm");
      const endDateTime = new Date(defaultDateTime);
      endDateTime.setHours(endDateTime.getHours() + 1);
      const endStr = format(endDateTime, "yyyy-MM-dd'T'HH:mm");
      
      setFormData({
        title: '',
        tab_id: defaultTab?.id || tabs[0]?.id || '',
        start_date: startStr,
        end_date: endStr,
        all_day: false,
        location: '',
        notes: '',
        private_notes: '',
        visibility: 'full',
        event_type: 'other',
        recurrence: { type: 'none' }
      });
    }
  }, [event, tabs, defaultTab, defaultDate, isOpen]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({
      ...formData,
      start_date: new Date(formData.start_date).toISOString(),
      end_date: new Date(formData.end_date).toISOString()
    });
  };

  const selectedTab = tabs.find(t => t.id === formData.tab_id);
  const colors = selectedTab ? getTabColors(selectedTab.color) : getTabColors('indigo');

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px] p-0 overflow-hidden">
        <div className={cn("h-2", colors.bg)} />
        
        <form onSubmit={handleSubmit}>
          <DialogHeader className="px-6 pt-4 pb-2">
            <DialogTitle className="text-xl font-semibold text-slate-900">
              {event ? 'Edit Event' : 'New Event'}
            </DialogTitle>
          </DialogHeader>
          
          <Tabs value={activeTab} onValueChange={setActiveTab} className="px-6">
            <TabsList className="bg-slate-100 mb-4">
              <TabsTrigger value="details" className="text-xs">Details</TabsTrigger>
              <TabsTrigger value="memories" className="text-xs">Memories</TabsTrigger>
              <TabsTrigger value="recurrence" className="text-xs">Recurrence</TabsTrigger>
              <TabsTrigger value="privacy" className="text-xs">Privacy</TabsTrigger>
            </TabsList>
            
            <TabsContent value="details" className="space-y-4 mt-0">
              <div className="space-y-2">
                <Input
                  placeholder="Event title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="text-lg font-medium border-0 border-b rounded-none px-0 focus-visible:ring-0 focus-visible:border-indigo-500"
                  disabled={!canEdit}
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label className="text-xs font-medium text-slate-500">Calendar</Label>
                <Select 
                  value={formData.tab_id} 
                  onValueChange={(value) => setFormData({ ...formData, tab_id: value })}
                  disabled={!canEdit || isSharedEvent}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select calendar" />
                  </SelectTrigger>
                  <SelectContent>
                    {tabs.map((tab) => {
                      const tabColors = getTabColors(tab.color);
                      return (
                        <SelectItem key={tab.id} value={tab.id}>
                          <div className="flex items-center gap-2">
                            <div className={cn("w-3 h-3 rounded-full", tabColors.bg)} />
                            {tab.name}
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex items-center gap-2 mb-2">
                <Switch
                  checked={formData.all_day}
                  onCheckedChange={(checked) => setFormData({ ...formData, all_day: checked })}
                  disabled={!canEdit}
                />
                <Label className="text-sm text-slate-600">All day</Label>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs font-medium text-slate-500 flex items-center gap-1">
                    <Calendar className="w-3 h-3" /> Start
                  </Label>
                  <Input
                    type={formData.all_day ? "date" : "datetime-local"}
                    value={formData.all_day ? formData.start_date.split('T')[0] : formData.start_date}
                    onChange={(e) => setFormData({ ...formData, start_date: formData.all_day ? `${e.target.value}T00:00` : e.target.value })}
                    disabled={!canEdit}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-medium text-slate-500 flex items-center gap-1">
                    <Calendar className="w-3 h-3" /> End
                  </Label>
                  <Input
                    type={formData.all_day ? "date" : "datetime-local"}
                    value={formData.all_day ? formData.end_date.split('T')[0] : formData.end_date}
                    onChange={(e) => setFormData({ ...formData, end_date: formData.all_day ? `${e.target.value}T23:59` : e.target.value })}
                    disabled={!canEdit}
                    required
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label className="text-xs font-medium text-slate-500">Event Type</Label>
                <div className="grid grid-cols-3 gap-2">
                  {['school', 'sports', 'appointment', 'reservation', 'family', 'work'].map((type) => {
                    const typeInfo = getEventTypeInfo(type);
                    return (
                      <button
                        key={type}
                        type="button"
                        onClick={() => setFormData({ ...formData, event_type: type })}
                        disabled={!canEdit}
                        className={cn(
                          'p-2 rounded-lg text-xs font-medium transition-all flex items-center gap-1 justify-center',
                          formData.event_type === type
                            ? 'bg-indigo-100 text-indigo-700 ring-2 ring-indigo-300'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        )}
                      >
                        <span>{typeInfo.emoji}</span>
                        <span className="hidden sm:inline">{typeInfo.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-medium text-slate-500 flex items-center gap-1">
                  <MapPin className="w-3 h-3" /> Location
                </Label>
                <Input
                  placeholder="Add location"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  disabled={!canEdit}
                />
              </div>
              
              <div className="space-y-2">
                <Label className="text-xs font-medium text-slate-500 flex items-center gap-1">
                  <FileText className="w-3 h-3" /> Notes
                </Label>
                <Textarea
                  placeholder="Add notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="min-h-[80px] resize-none"
                  disabled={!canEdit}
                />
              </div>
            </TabsContent>
            
            <TabsContent value="memories" className="space-y-4 mt-0">
              {event && (
                <EventMemories
                  eventId={event.id}
                  isEditable={canEdit}
                  userEmail={event.owner_email}
                  visibility={formData.visibility}
                />
              )}
              {!event && (
                <p className="text-sm text-slate-400">Create the event first to add memories</p>
              )}
            </TabsContent>
            
            <TabsContent value="recurrence" className="space-y-4 mt-0">
              <div className="space-y-2">
                <Label className="text-xs font-medium text-slate-500 flex items-center gap-1">
                  <Repeat className="w-3 h-3" /> Repeat
                </Label>
                <Select 
                  value={formData.recurrence?.type || 'none'} 
                  onValueChange={(value) => setFormData({ 
                    ...formData, 
                    recurrence: { ...formData.recurrence, type: value } 
                  })}
                  disabled={!canEdit}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Does not repeat</SelectItem>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="yearly">Yearly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              {formData.recurrence?.type !== 'none' && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="space-y-4"
                >
                  <div className="space-y-2">
                    <Label className="text-xs font-medium text-slate-500">End repeat</Label>
                    <Input
                      type="date"
                      value={formData.recurrence?.end_date || ''}
                      onChange={(e) => setFormData({ 
                        ...formData, 
                        recurrence: { ...formData.recurrence, end_date: e.target.value } 
                      })}
                      disabled={!canEdit}
                    />
                  </div>
                </motion.div>
              )}
            </TabsContent>
            
            <TabsContent value="privacy" className="space-y-4 mt-0">
              <div className="space-y-2">
                <Label className="text-xs font-medium text-slate-500 flex items-center gap-1">
                  <Eye className="w-3 h-3" /> Visibility for shared users
                </Label>
                <Select 
                  value={formData.visibility} 
                  onValueChange={(value) => setFormData({ ...formData, visibility: value })}
                  disabled={!canEdit}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="full">
                      <div className="flex items-center gap-2">
                        <Eye className="w-4 h-4" />
                        Full details visible
                      </div>
                    </SelectItem>
                    <SelectItem value="busy_only">
                      <div className="flex items-center gap-2">
                        <Lock className="w-4 h-4" />
                        Busy only (hide details)
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-slate-400">
                  Controls what shared users can see about this event
                </p>
              </div>
              
              {!isSharedEvent && (
                <div className="space-y-2">
                  <Label className="text-xs font-medium text-slate-500 flex items-center gap-1">
                    <Lock className="w-3 h-3" /> Private notes (only you can see)
                  </Label>
                  <Textarea
                    placeholder="Add private notes..."
                    value={formData.private_notes}
                    onChange={(e) => setFormData({ ...formData, private_notes: e.target.value })}
                    className="min-h-[80px] resize-none bg-slate-50"
                  />
                </div>
              )}
            </TabsContent>
          </Tabs>
          
          <div className="flex items-center justify-between px-6 py-4 mt-4 border-t border-slate-100 bg-slate-50">
            {event && canDelete ? (
              <Button
                type="button"
                variant="ghost"
                onClick={() => onDelete(event)}
                className="text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete
              </Button>
            ) : (
              <div />
            )}
            
            <div className="flex items-center gap-2">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              {canEdit && (
                <Button 
                  type="submit" 
                  className="bg-indigo-600 hover:bg-indigo-700"
                >
                  {event ? 'Save Changes' : 'Create Event'}
                </Button>
              )}
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
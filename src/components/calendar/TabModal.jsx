import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { motion } from 'framer-motion';
import { Palette, Bell, Trash2, Check } from 'lucide-react';
import { cn } from "@/lib/utils";
import { getTabColors } from './TabFilter';

const COLORS = ['coral', 'sky', 'emerald', 'amber', 'violet', 'indigo'];
const COLOR_NAMES = {
  coral: 'Coral',
  sky: 'Sky Blue',
  emerald: 'Emerald',
  amber: 'Amber',
  violet: 'Violet',
  indigo: 'Indigo'
};

export default function TabModal({ 
  isOpen, 
  onClose, 
  tab, 
  onSave, 
  onDelete 
}) {
  const [formData, setFormData] = useState({
    name: '',
    color: 'indigo',
    is_default: false,
    notification_settings: {
      on_create: true,
      on_update: true,
      on_delete: true
    }
  });
  
  const [activeTab, setActiveTab] = useState('general');

  useEffect(() => {
    if (tab) {
      setFormData({
        name: tab.name || '',
        color: tab.color || 'indigo',
        is_default: tab.is_default || false,
        notification_settings: tab.notification_settings || {
          on_create: true,
          on_update: true,
          on_delete: true
        }
      });
    } else {
      setFormData({
        name: '',
        color: 'indigo',
        is_default: false,
        notification_settings: {
          on_create: true,
          on_update: true,
          on_delete: true
        }
      });
    }
  }, [tab, isOpen]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  const colors = getTabColors(formData.color);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[420px] p-0 overflow-hidden">
        <div className={cn("h-2", colors.bg)} />
        
        <form onSubmit={handleSubmit}>
          <DialogHeader className="px-6 pt-4 pb-2">
            <DialogTitle className="text-xl font-semibold text-slate-900">
              {tab ? 'Edit Calendar' : 'New Calendar'}
            </DialogTitle>
          </DialogHeader>
          
          <Tabs value={activeTab} onValueChange={setActiveTab} className="px-6">
            <TabsList className="bg-slate-100 mb-4">
              <TabsTrigger value="general" className="text-xs">General</TabsTrigger>
              <TabsTrigger value="notifications" className="text-xs">Notifications</TabsTrigger>
            </TabsList>
            
            <TabsContent value="general" className="space-y-4 mt-0">
              <div className="space-y-2">
                <Label className="text-xs font-medium text-slate-500">Calendar Name</Label>
                <Input
                  placeholder="e.g., Work, Family, Kids"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
              
              <div className="space-y-3">
                <Label className="text-xs font-medium text-slate-500 flex items-center gap-1">
                  <Palette className="w-3 h-3" /> Color
                </Label>
                <div className="grid grid-cols-6 gap-2">
                  {COLORS.map((color) => {
                    const colorStyles = getTabColors(color);
                    const isSelected = formData.color === color;
                    
                    return (
                      <motion.button
                        key={color}
                        type="button"
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setFormData({ ...formData, color })}
                        className={cn(
                          "w-10 h-10 rounded-xl flex items-center justify-center transition-all",
                          colorStyles.bg,
                          isSelected && "ring-2 ring-offset-2 ring-slate-400"
                        )}
                      >
                        {isSelected && <Check className="w-5 h-5 text-white" />}
                      </motion.button>
                    );
                  })}
                </div>
                <p className="text-xs text-slate-400">{COLOR_NAMES[formData.color]}</p>
              </div>
              
              <div className="flex items-center justify-between py-2">
                <div>
                  <Label className="text-sm font-medium text-slate-700">Default Calendar</Label>
                  <p className="text-xs text-slate-400">New events will use this calendar</p>
                </div>
                <Switch
                  checked={formData.is_default}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_default: checked })}
                />
              </div>
            </TabsContent>
            
            <TabsContent value="notifications" className="space-y-4 mt-0">
              <div className="space-y-1">
                <Label className="text-xs font-medium text-slate-500 flex items-center gap-1">
                  <Bell className="w-3 h-3" /> Notification Settings
                </Label>
                <p className="text-xs text-slate-400">Get notified when events are changed</p>
              </div>
              
              <div className="space-y-3">
                {[
                  { key: 'on_create', label: 'Event created' },
                  { key: 'on_update', label: 'Event updated' },
                  { key: 'on_delete', label: 'Event deleted' }
                ].map(({ key, label }) => (
                  <div key={key} className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
                    <Label className="text-sm text-slate-600">{label}</Label>
                    <Switch
                      checked={formData.notification_settings?.[key] ?? true}
                      onCheckedChange={(checked) => setFormData({
                        ...formData,
                        notification_settings: {
                          ...formData.notification_settings,
                          [key]: checked
                        }
                      })}
                    />
                  </div>
                ))}
              </div>
            </TabsContent>
          </Tabs>
          
          <div className="flex items-center justify-between px-6 py-4 mt-4 border-t border-slate-100 bg-slate-50">
            {tab ? (
              <Button
                type="button"
                variant="ghost"
                onClick={() => onDelete(tab)}
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
              <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700">
                {tab ? 'Save Changes' : 'Create Calendar'}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
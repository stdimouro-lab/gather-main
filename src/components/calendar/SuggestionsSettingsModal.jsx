import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Mail, 
  Trash2, 
  Shield, 
  Briefcase, 
  GraduationCap, 
  Plane,
  Stethoscope,
  Users,
  CalendarDays
} from 'lucide-react';
import { cn } from "@/lib/utils";

const CATEGORIES = [
  { id: 'school', label: 'School Events', icon: GraduationCap, description: 'Parent-teacher conferences, early dismissals' },
  { id: 'work', label: 'Work Meetings', icon: Briefcase, description: 'Meetings, calls, conferences' },
  { id: 'appointments', label: 'Appointments', icon: Stethoscope, description: 'Doctor, dentist, services' },
  { id: 'travel', label: 'Travel', icon: Plane, description: 'Flights, hotels, reservations' },
  { id: 'family', label: 'Family Events', icon: Users, description: 'Birthdays, gatherings, activities' },
  { id: 'sports', label: 'Sports & Activities', icon: CalendarDays, description: 'Practices, games, recitals' },
];

export default function SuggestionsSettingsModal({
  isOpen,
  onClose,
  preferences,
  onSave
}) {
  const [enabled, setEnabled] = useState(true);
  const [categories, setCategories] = useState({
    school: true,
    work: true,
    appointments: true,
    travel: true,
    family: true,
    sports: true
  });
  const [digestFrequency, setDigestFrequency] = useState('daily');

  useEffect(() => {
    if (preferences) {
      setEnabled(preferences.email_suggestions_enabled ?? true);
      if (preferences.suggestion_categories) {
        setCategories(preferences.suggestion_categories);
      }
      if (preferences.notification_digest) {
        setDigestFrequency(preferences.notification_digest);
      }
    }
  }, [preferences]);

  const handleSave = () => {
    onSave({
      email_suggestions_enabled: enabled,
      suggestion_categories: categories,
      notification_digest: digestFrequency
    });
    onClose();
  };

  const toggleCategory = (id) => {
    setCategories(prev => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="w-5 h-5 text-slate-500" />
            "Suggested Gatherings Settings"
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Privacy notice */}
          <Card className="bg-slate-50 border-slate-200">
            <CardContent className="pt-4">
              <div className="flex items-start gap-3">
                <Shield className="w-5 h-5 text-indigo-500 flex-shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <h3 className="font-medium text-sm text-slate-900">"Your privacy matters"</h3>
                  <p className="text-xs text-slate-500">
                    "We scan for dates and event keywords only. Email content is never shared with other users or stored beyond detection."
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Master toggle */}
          <div className="flex items-center justify-between p-4 bg-white border border-slate-200 rounded-xl">
            <div>
              <Label className="font-medium text-slate-900">"Enable auto-detection"</Label>
              <p className="text-xs text-slate-500">"Scan emails for event suggestions"</p>
            </div>
            <Switch checked={enabled} onCheckedChange={setEnabled} />
          </div>

          {/* Categories */}
          {enabled && (
            <div className="space-y-3">
              <Label className="text-xs font-semibold text-slate-400 uppercase">"Detect these event types"</Label>
              <div className="grid grid-cols-2 gap-2">
                {CATEGORIES.map((cat) => {
                  const Icon = cat.icon;
                  const isActive = categories[cat.id];
                  return (
                    <button
                      key={cat.id}
                      onClick={() => toggleCategory(cat.id)}
                      className={cn(
                        "flex items-center gap-3 p-3 rounded-xl border text-left transition-all",
                        isActive 
                          ? "bg-indigo-50 border-indigo-200" 
                          : "bg-white border-slate-200 opacity-60"
                      )}
                    >
                      <Icon className={cn("w-4 h-4", isActive ? "text-indigo-600" : "text-slate-400")} />
                      <span className={cn("text-sm font-medium", isActive ? "text-indigo-700" : "text-slate-500")}>
                        {cat.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Notification digest */}
          {enabled && (
            <div className="space-y-3">
              <Label className="text-xs font-semibold text-slate-400 uppercase">"Notification digest"</Label>
              <div className="flex gap-2">
                {[
                  { id: 'off', label: 'Off' },
                  { id: 'daily', label: 'Daily' },
                  { id: 'weekly', label: 'Weekly' }
                ].map((opt) => (
                  <button
                    key={opt.id}
                    onClick={() => setDigestFrequency(opt.id)}
                    className={cn(
                      "flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all",
                      digestFrequency === opt.id
                        ? "bg-indigo-600 text-white"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              <p className="text-xs text-slate-400">
                {digestFrequency === 'daily' && '"Get a daily summary of new suggestions"'}
                {digestFrequency === 'weekly' && '"Get a weekly summary of new suggestions"'}
                {digestFrequency === 'off' && '"No notification emails"'}
              </p>
            </div>
          )}

          {/* Clear history */}
          <Button
            variant="outline"
            className="w-full text-slate-500 hover:text-red-600 hover:border-red-200"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            "Clear suggestion history"
          </Button>
        </div>

        <div className="flex gap-3 pt-4 border-t border-slate-100">
          <Button variant="outline" onClick={onClose} className="flex-1">
            "Cancel"
          </Button>
          <Button onClick={handleSave} className="flex-1 bg-indigo-600 hover:bg-indigo-700">
            "Save Settings"
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
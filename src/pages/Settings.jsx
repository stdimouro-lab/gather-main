import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createPageUrl } from '@/utils';
import { Link } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { 
  User, 
  Bell, 
  Shield, 
  FileText, 
  HelpCircle, 
  Sparkles,
  LogOut,
  ChevronRight,
  Crown
} from 'lucide-react';
import { toast } from 'sonner';
import OnboardingFlow from '@/components/calendar/OnboardingFlow';

export default function SettingsPage() {
  const [user, setUser] = useState(null);
  const [isOnboardingOpen, setIsOnboardingOpen] = useState(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    const fetchUser = async () => {
      const userData = await base44.auth.me();
      setUser(userData);
    };
    fetchUser();
  }, []);

  const { data: userPreferences } = useQuery({
    queryKey: ['user-preferences', user?.email],
    queryFn: async () => {
      const prefs = await base44.entities.UserPreferences.filter({ user_email: user?.email });
      if (prefs.length === 0) {
        const newPrefs = await base44.entities.UserPreferences.create({
          user_email: user.email,
          email_suggestions_enabled: false,
          default_visibility: 'busy_only',
          has_completed_onboarding: true
        });
        return newPrefs;
      }
      return prefs[0];
    },
    enabled: !!user?.email,
  });

  const { data: ownedTabs = [] } = useQuery({
    queryKey: ['tabs', user?.email],
    queryFn: async () => {
      const tabs = await base44.entities.CalendarTab.filter({ owner_email: user?.email });
      return tabs;
    },
    enabled: !!user?.email,
  });

  const updatePreferencesMutation = useMutation({
    mutationFn: (data) => base44.entities.UserPreferences.update(userPreferences?.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-preferences'] });
      toast.success('Settings updated');
    },
  });

  const handleOnboardingComplete = async (data) => {
    const newTab = await base44.entities.CalendarTab.create({
      name: data.tableName || 'My Table',
      color: data.tableColor || 'indigo',
      is_default: true,
      owner_email: user.email,
      notification_settings: { on_create: true, on_update: true, on_delete: true }
    });

    if (data.inviteEmail) {
      await base44.entities.TabShare.create({
        tab_id: newTab.id,
        shared_with_email: data.inviteEmail,
        role: data.inviteRole || 'viewer',
        shared_by_email: user.email,
        accepted: true
      });
      toast.success('Invite sent');
    }

    setIsOnboardingOpen(false);
    queryClient.invalidateQueries({ queryKey: ['tabs'] });
    toast.success('Table created');
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <p className="text-slate-500">Loading...</p>
      </div>
    );
  }

  const tableCount = ownedTabs.length;
  const isFreePlan = true; // Will be used for monetization later
  const freeTableLimit = 2;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 py-8 px-4">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Settings</h1>
          <p className="text-slate-500 mt-1">Manage your account and preferences</p>
        </div>

        {/* Account */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="w-5 h-5 text-slate-500" />
              Account
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between py-2">
              <div>
                <p className="text-sm font-medium text-slate-700">{user.full_name}</p>
                <p className="text-xs text-slate-500">{user.email}</p>
              </div>
            </div>
            <div className="flex items-center justify-between py-2 border-t border-slate-100">
              <div>
                <p className="text-sm font-medium text-slate-700">Current Plan</p>
                <p className="text-xs text-slate-500">
                  Free • {tableCount} of {freeTableLimit} Tables
                </p>
              </div>
              <Link to={createPageUrl('Plans')}>
                <Button variant="outline" size="sm">
                  <Crown className="w-4 h-4 mr-2" />
                  Upgrade
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Preferences */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="w-5 h-5 text-slate-500" />
              Preferences
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between py-2">
              <div className="flex-1">
                <Label className="text-sm font-medium text-slate-700">
                  Default to "busy only" when sharing
                </Label>
                <p className="text-xs text-slate-500">
                  Others see when you're busy, not event details
                </p>
              </div>
              <Switch
                checked={userPreferences?.default_visibility === 'busy_only'}
                onCheckedChange={(checked) => 
                  updatePreferencesMutation.mutate({ 
                    default_visibility: checked ? 'busy_only' : 'full' 
                  })
                }
              />
            </div>
          </CardContent>
        </Card>

        {/* Integrations */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-slate-500" />
              Integrations
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-center justify-between py-3 px-4 bg-slate-50 rounded-xl">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <Label className="text-sm font-medium text-slate-700">
                    Email Event Suggestions
                  </Label>
                  <Badge variant="secondary" className="bg-amber-100 text-amber-700 text-xs">
                    Coming Soon
                  </Badge>
                </div>
                <p className="text-xs text-slate-500">
                  When available, this feature will require your permission and will only suggest events for review. You'll always stay in control.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Help & Support */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <HelpCircle className="w-5 h-5 text-slate-500" />
              Help & Support
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <button
              onClick={() => setIsOnboardingOpen(true)}
              className="w-full flex items-center justify-between py-3 px-4 bg-slate-50 hover:bg-slate-100 rounded-xl transition-colors"
            >
              <div className="flex items-center gap-3">
                <Sparkles className="w-5 h-5 text-indigo-600" />
                <div className="text-left">
                  <p className="text-sm font-medium text-slate-700">Replay Tutorial</p>
                  <p className="text-xs text-slate-500">Learn how to use Tables</p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-slate-400" />
            </button>
          </CardContent>
        </Card>

        {/* Legal */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-slate-500" />
              Legal & Privacy
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Link to={createPageUrl('Privacy')}>
              <button className="w-full flex items-center justify-between py-3 px-4 bg-slate-50 hover:bg-slate-100 rounded-xl transition-colors">
                <div className="flex items-center gap-3">
                  <FileText className="w-5 h-5 text-slate-600" />
                  <p className="text-sm font-medium text-slate-700">Privacy Policy</p>
                </div>
                <ChevronRight className="w-5 h-5 text-slate-400" />
              </button>
            </Link>
            <Link to={createPageUrl('Terms')}>
              <button className="w-full flex items-center justify-between py-3 px-4 bg-slate-50 hover:bg-slate-100 rounded-xl transition-colors">
                <div className="flex items-center gap-3">
                  <FileText className="w-5 h-5 text-slate-600" />
                  <p className="text-sm font-medium text-slate-700">Terms of Service</p>
                </div>
                <ChevronRight className="w-5 h-5 text-slate-400" />
              </button>
            </Link>
          </CardContent>
        </Card>

        {/* Logout */}
        <Card>
          <CardContent className="pt-6">
            <Button
              variant="outline"
              className="w-full text-red-600 hover:text-red-700 hover:bg-red-50"
              onClick={() => base44.auth.logout()}
            >
              <LogOut className="w-4 h-4 mr-2" />
              Log out
            </Button>
          </CardContent>
        </Card>

        <div className="text-center pt-4 pb-8">
          <p className="text-xs text-slate-400">
            Gather v1.0 • Where life meets.
          </p>
        </div>
      </div>

      <OnboardingFlow
        isOpen={isOnboardingOpen}
        onClose={() => setIsOnboardingOpen(false)}
        onComplete={handleOnboardingComplete}
      />
    </div>
  );
}
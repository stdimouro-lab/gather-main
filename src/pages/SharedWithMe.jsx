import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Calendar as CalendarIcon, 
  Check, 
  X, 
  ChevronRight, 
  Clock,
  Share2,
  ArrowLeft
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { getTabColors } from '@/components/calendar/TabFilter';
import { toast } from 'sonner';

export default function SharedWithMePage() {
  const [user, setUser] = useState(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    const fetchUser = async () => {
      const userData = await base44.auth.me();
      setUser(userData);
    };
    fetchUser();
  }, []);

  // Fetch pending invites
  const { data: pendingInvites = [] } = useQuery({
    queryKey: ['pending-invites', user?.email],
    queryFn: () => base44.entities.TabShare.filter({ 
      shared_with_email: user?.email, 
      accepted: false 
    }),
    enabled: !!user?.email,
  });

  // Fetch accepted shares
  const { data: acceptedShares = [] } = useQuery({
    queryKey: ['accepted-shares', user?.email],
    queryFn: () => base44.entities.TabShare.filter({ 
      shared_with_email: user?.email, 
      accepted: true 
    }),
    enabled: !!user?.email,
  });

  // Fetch tab details for invites
  const { data: inviteTabDetails = [] } = useQuery({
    queryKey: ['invite-tab-details', pendingInvites],
    queryFn: async () => {
      if (pendingInvites.length === 0) return [];
      const results = await Promise.all(
        pendingInvites.map(inv => base44.entities.CalendarTab.filter({ id: inv.tab_id }))
      );
      return results.flat();
    },
    enabled: pendingInvites.length > 0,
  });

  // Fetch tab details for accepted
  const { data: acceptedTabDetails = [] } = useQuery({
    queryKey: ['accepted-tab-details', acceptedShares],
    queryFn: async () => {
      if (acceptedShares.length === 0) return [];
      const results = await Promise.all(
        acceptedShares.map(s => base44.entities.CalendarTab.filter({ id: s.tab_id }))
      );
      return results.flat();
    },
    enabled: acceptedShares.length > 0,
  });

  // Accept invite mutation
  const acceptMutation = useMutation({
    mutationFn: (id) => base44.entities.TabShare.update(id, { accepted: true }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending-invites'] });
      queryClient.invalidateQueries({ queryKey: ['accepted-shares'] });
      toast.success('Invite accepted');
    },
  });

  // Decline invite mutation
  const declineMutation = useMutation({
    mutationFn: (id) => base44.entities.TabShare.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending-invites'] });
      toast.success('Invite declined');
    },
  });

  const roleColors = {
    viewer: 'bg-slate-100 text-slate-700',
    editor: 'bg-blue-100 text-blue-700',
    admin: 'bg-purple-100 text-purple-700'
  };

  const getTabById = (tabId, details) => {
    return details.find(t => t.id === tabId);
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="flex items-center gap-4 mb-8">
          <Link to={createPageUrl('Calendar')}>
            <Button variant="ghost" size="icon" className="rounded-full">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">Invited Tables</h1>
            <p className="text-slate-500">Manage tables you've been invited to</p>
          </div>
        </div>

        {/* Pending Invites */}
        {pendingInvites.length > 0 && (
          <div className="mb-8">
            <h2 className="text-lg font-medium text-slate-800 mb-4 flex items-center gap-2">
              <Clock className="w-5 h-5 text-amber-500" />
Pending Invites
            </h2>
            <div className="space-y-3">
              <AnimatePresence>
                {pendingInvites.map((invite) => {
                  const tab = getTabById(invite.tab_id, inviteTabDetails);
                  const colors = tab ? getTabColors(tab.color) : getTabColors('indigo');
                  
                  return (
                    <motion.div
                      key={invite.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                    >
                      <Card className="overflow-hidden">
                        <div className={`h-1 ${colors.bg}`} />
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className={`w-10 h-10 rounded-xl ${colors.light} flex items-center justify-center`}>
                                <CalendarIcon className={`w-5 h-5 ${colors.text}`} />
                              </div>
                              <div>
                                <h3 className="font-medium text-slate-900">{tab?.name || "Table"}</h3>
                                <p className="text-sm text-slate-500">
                                  From {invite.shared_by_email}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge className={roleColors[invite.role]}>
                                {invite.role}
                              </Badge>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => declineMutation.mutate(invite.id)}
                                className="text-red-600 border-red-200 hover:bg-red-50"
                              >
                                <X className="w-4 h-4" />
                              </Button>
                              <Button
                                size="sm"
                                onClick={() => acceptMutation.mutate(invite.id)}
                                className="bg-indigo-600 hover:bg-indigo-700"
                              >
                                <Check className="w-4 h-4 mr-1" />
                                Accept
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
          </div>
        )}

        {/* Active Shares */}
        <div>
          <h2 className="text-lg font-medium text-slate-800 mb-4 flex items-center gap-2">
            <Share2 className="w-5 h-5 text-indigo-500" />
            Active Tables
          </h2>
          
          {acceptedShares.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <Share2 className="w-12 h-12 text-slate-200 mx-auto mb-4" />
                <h3 className="font-medium text-slate-600 mb-2">No tables shared with you yet</h3>
                <p className="text-sm text-slate-400">
                  When someone invites you, they'll appear here.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {acceptedShares.map((share) => {
                const tab = getTabById(share.tab_id, acceptedTabDetails);
                const colors = tab ? getTabColors(tab.color) : getTabColors('indigo');
                
                return (
                  <motion.div
                    key={share.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    <Link to={createPageUrl('Calendar')}>
                      <Card className="overflow-hidden hover:shadow-md transition-all cursor-pointer group">
                        <div className={`h-1 ${colors.bg}`} />
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className={`w-10 h-10 rounded-xl ${colors.light} flex items-center justify-center`}>
                                <CalendarIcon className={`w-5 h-5 ${colors.text}`} />
                              </div>
                              <div>
                                <h3 className="font-medium text-slate-900">{tab?.name || "Table"}</h3>
                                <p className="text-sm text-slate-500">
                                  Invited by {share.shared_by_email}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              <Badge className={roleColors[share.role]}>
                                {share.role}
                              </Badge>
                              <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-slate-500 transition-colors" />
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
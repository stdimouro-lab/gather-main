import React, { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import CalendarHeader from '@/components/calendar/CalendarHeader';
import MonthView from '@/components/calendar/MonthView';
import WeekView from '@/components/calendar/WeekView';
import Sidebar from '@/components/calendar/Sidebar';
import EventModal from '@/components/calendar/EventModal';
import TabModal from '@/components/calendar/TabModal';
import ShareModal from '@/components/calendar/ShareModal';
import EventHistoryPanel from '@/components/calendar/EventHistoryPanel';
import { Loader2 } from 'lucide-react';

export default function CalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState('month');
  const [activeTabs, setActiveTabs] = useState([]);
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [isTabModalOpen, setIsTabModalOpen] = useState(false);
  const [selectedTab, setSelectedTab] = useState(null);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [shareTab, setShareTab] = useState(null);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [user, setUser] = useState(null);
  
  const queryClient = useQueryClient();
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

  // Fetch user
  useEffect(() => {
    const fetchUser = async () => {
      const userData = await base44.auth.me();
      setUser(userData);
    };
    fetchUser();
  }, []);

  // Fetch tabs (owned by user)
  const { data: ownedTabs = [], isLoading: isLoadingTabs } = useQuery({
    queryKey: ['tabs', user?.email],
    queryFn: async () => {
      const tabs = await base44.entities.CalendarTab.filter({ owner_email: user?.email });
      // If no tabs exist for this user, create default ones
      if (tabs.length === 0) {
        const defaultTabs = [
          { name: 'Work', color: 'indigo', is_default: true, owner_email: user.email, notification_settings: { on_create: true, on_update: true, on_delete: true } },
          { name: 'Personal', color: 'violet', is_default: false, owner_email: user.email, notification_settings: { on_create: true, on_update: true, on_delete: true } },
          { name: 'Family', color: 'emerald', is_default: false, owner_email: user.email, notification_settings: { on_create: true, on_update: true, on_delete: true } },
        ];
        const created = await base44.entities.CalendarTab.bulkCreate(defaultTabs);
        return created;
      }
      return tabs;
    },
    enabled: !!user?.email,
  });

  // Fetch shared tabs
  const { data: sharedWithMe = [] } = useQuery({
    queryKey: ['shared-tabs', user?.email],
    queryFn: () => base44.entities.TabShare.filter({ shared_with_email: user?.email }),
    enabled: !!user?.email,
  });

  // Fetch shared tab details
  const { data: sharedTabDetails = [] } = useQuery({
    queryKey: ['shared-tab-details', sharedWithMe],
    queryFn: async () => {
      const tabIds = sharedWithMe.filter(s => s.accepted).map(s => s.tab_id);
      if (tabIds.length === 0) return [];
      const results = await Promise.all(
        tabIds.map(id => base44.entities.CalendarTab.filter({ id }))
      );
      return results.flat();
    },
    enabled: sharedWithMe.length > 0,
  });

  // Combined tabs
  const allTabs = useMemo(() => {
    const combined = [...ownedTabs];
    sharedTabDetails.forEach(tab => {
      if (!combined.some(t => t.id === tab.id)) {
        combined.push(tab);
      }
    });
    return combined;
  }, [ownedTabs, sharedTabDetails]);

  // Initialize active tabs
  useEffect(() => {
    if (allTabs.length > 0 && activeTabs.length === 0) {
      setActiveTabs(allTabs.map(t => t.id));
    }
  }, [allTabs]);

  // Fetch events
  const { data: events = [], isLoading: isLoadingEvents } = useQuery({
    queryKey: ['events', user?.email, allTabs],
    queryFn: async () => {
      const tabIds = allTabs.map(t => t.id);
      if (tabIds.length === 0) return [];
      const results = await Promise.all(
        tabIds.map(id => base44.entities.Event.filter({ tab_id: id }))
      );
      return results.flat();
    },
    enabled: allTabs.length > 0,
  });

  // Fetch shares for a specific tab
  const { data: tabShares = [] } = useQuery({
    queryKey: ['tab-shares', shareTab?.id],
    queryFn: () => base44.entities.TabShare.filter({ tab_id: shareTab?.id }),
    enabled: !!shareTab?.id,
  });

  // Fetch event history
  const { data: eventHistory = [] } = useQuery({
    queryKey: ['event-history', selectedEvent?.id],
    queryFn: () => base44.entities.EventHistory.filter({ event_id: selectedEvent?.id }, '-created_date'),
    enabled: !!selectedEvent?.id && isHistoryOpen,
  });

  // Create tab mutation
  const createTabMutation = useMutation({
    mutationFn: (data) => base44.entities.CalendarTab.create({
      ...data,
      owner_email: user.email
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tabs'] });
      setIsTabModalOpen(false);
      setSelectedTab(null);
      toast.success('Calendar created');
    },
  });

  // Update tab mutation
  const updateTabMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.CalendarTab.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tabs'] });
      setIsTabModalOpen(false);
      setSelectedTab(null);
      toast.success('Calendar updated');
    },
  });

  // Delete tab mutation
  const deleteTabMutation = useMutation({
    mutationFn: (id) => base44.entities.CalendarTab.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tabs'] });
      queryClient.invalidateQueries({ queryKey: ['events'] });
      setIsTabModalOpen(false);
      setSelectedTab(null);
      toast.success('Calendar deleted');
    },
  });

  // Create event mutation
  const createEventMutation = useMutation({
    mutationFn: async (data) => {
      const event = await base44.entities.Event.create({
        ...data,
        owner_email: user.email,
        version: 1,
        last_modified_by: user.email
      });
      await base44.entities.EventHistory.create({
        event_id: event.id,
        action: 'created',
        changed_by_email: user.email
      });
      return event;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      setIsEventModalOpen(false);
      setSelectedEvent(null);
      setSelectedDate(null);
      toast.success('Event created');
    },
  });

  // Update event mutation
  const updateEventMutation = useMutation({
    mutationFn: async ({ id, data, previousData }) => {
      const changes = {};
      Object.keys(data).forEach(key => {
        if (JSON.stringify(data[key]) !== JSON.stringify(previousData[key])) {
          changes[key] = data[key];
        }
      });
      
      await base44.entities.Event.update(id, {
        ...data,
        version: (previousData.version || 0) + 1,
        last_modified_by: user.email
      });
      
      await base44.entities.EventHistory.create({
        event_id: id,
        action: 'updated',
        changed_by_email: user.email,
        previous_data: previousData,
        changes
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      queryClient.invalidateQueries({ queryKey: ['event-history'] });
      setIsEventModalOpen(false);
      setSelectedEvent(null);
      toast.success('Event updated');
    },
  });

  // Delete event mutation
  const deleteEventMutation = useMutation({
    mutationFn: async (event) => {
      await base44.entities.EventHistory.create({
        event_id: event.id,
        action: 'deleted',
        changed_by_email: user.email,
        previous_data: event
      });
      await base44.entities.Event.delete(event.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      setIsEventModalOpen(false);
      setSelectedEvent(null);
      toast.success('Event deleted');
    },
  });

  // Share tab mutation
  const shareTabMutation = useMutation({
    mutationFn: ({ email, role }) => base44.entities.TabShare.create({
      tab_id: shareTab.id,
      shared_with_email: email,
      role,
      shared_by_email: user.email,
      accepted: true // Auto-accept for MVP
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tab-shares'] });
      toast.success('Invite sent');
    },
  });

  // Update share mutation
  const updateShareMutation = useMutation({
    mutationFn: ({ id, role }) => base44.entities.TabShare.update(id, { role }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tab-shares'] });
      toast.success('Permission updated');
    },
  });

  // Remove share mutation
  const removeShareMutation = useMutation({
    mutationFn: (id) => base44.entities.TabShare.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tab-shares'] });
      toast.success('Access removed');
    },
  });

  // Get user role for a tab
  const getUserRole = (tabId) => {
    const tab = ownedTabs.find(t => t.id === tabId);
    if (tab) return 'owner';
    
    const share = sharedWithMe.find(s => s.tab_id === tabId);
    return share?.role || 'viewer';
  };

  // Get default tab
  const defaultTab = useMemo(() => {
    return ownedTabs.find(t => t.is_default) || ownedTabs[0];
  }, [ownedTabs]);

  // Handle tab toggle
  const handleToggleTab = (tabId) => {
    setActiveTabs(prev => 
      prev.includes(tabId) 
        ? prev.filter(id => id !== tabId)
        : [...prev, tabId]
    );
  };

  // Handle event save
  const handleEventSave = (data) => {
    if (selectedEvent) {
      updateEventMutation.mutate({ 
        id: selectedEvent.id, 
        data, 
        previousData: selectedEvent 
      });
    } else {
      createEventMutation.mutate(data);
    }
  };

  // Handle tab save
  const handleTabSave = (data) => {
    if (selectedTab) {
      updateTabMutation.mutate({ id: selectedTab.id, data });
    } else {
      createTabMutation.mutate(data);
    }
  };

  // Handle revert
  const handleRevert = async (historyEntry) => {
    if (historyEntry.previous_data) {
      const { id, created_date, updated_date, created_by, ...data } = historyEntry.previous_data;
      updateEventMutation.mutate({ 
        id: historyEntry.event_id, 
        data, 
        previousData: selectedEvent 
      });
    }
  };

  if (!user || isLoadingTabs) {
    return (
      <div className="h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-600 mx-auto" />
          <p className="mt-2 text-slate-500">Loading your calendars...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-slate-50">
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar - Desktop */}
        {!isMobile && (
          <Sidebar
            currentDate={currentDate}
            onDateChange={setCurrentDate}
            tabs={allTabs}
            activeTabs={activeTabs}
            onToggleTab={handleToggleTab}
            onAddTab={() => {
              setSelectedTab(null);
              setIsTabModalOpen(true);
            }}
            onShareTab={(tab) => {
              setShareTab(tab);
              setIsShareModalOpen(true);
            }}
            onManageTab={(tab) => {
              setSelectedTab(tab);
              setIsTabModalOpen(true);
            }}
            sharedTabs={sharedWithMe}
          />
        )}
        
        {/* Main Content */}
        <div className="flex-1 overflow-auto">
          <div className="p-4 sm:p-6">
            <CalendarHeader
              currentDate={currentDate}
              onDateChange={setCurrentDate}
              onAddEvent={() => {
                setSelectedEvent(null);
                setSelectedDate(new Date());
                setIsEventModalOpen(true);
              }}
              view={view}
              onViewChange={setView}
            />
            
            {isLoadingEvents ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
              </div>
            ) : view === 'month' ? (
              <MonthView
                currentDate={currentDate}
                events={events}
                tabs={allTabs}
                activeTabs={activeTabs}
                onSelectDate={(date) => {
                  setSelectedDate(date);
                  setSelectedEvent(null);
                  setIsEventModalOpen(true);
                }}
                onSelectEvent={(event) => {
                  setSelectedEvent(event);
                  setIsEventModalOpen(true);
                }}
              />
            ) : (
              <WeekView
                currentDate={currentDate}
                events={events}
                tabs={allTabs}
                activeTabs={activeTabs}
                onSelectDate={(date) => {
                  setSelectedDate(date);
                  setSelectedEvent(null);
                  setIsEventModalOpen(true);
                }}
                onSelectEvent={(event) => {
                  setSelectedEvent(event);
                  setIsEventModalOpen(true);
                }}
              />
            )}
          </div>
        </div>
        
        {/* Mobile Sidebar */}
        {isMobile && (
          <Sidebar
            isMobile
            currentDate={currentDate}
            onDateChange={setCurrentDate}
            tabs={allTabs}
            activeTabs={activeTabs}
            onToggleTab={handleToggleTab}
            onAddTab={() => {
              setSelectedTab(null);
              setIsTabModalOpen(true);
            }}
            onShareTab={(tab) => {
              setShareTab(tab);
              setIsShareModalOpen(true);
            }}
            onManageTab={(tab) => {
              setSelectedTab(tab);
              setIsTabModalOpen(true);
            }}
            sharedTabs={sharedWithMe}
          />
        )}
      </div>
      
      {/* Event Modal */}
      <EventModal
        isOpen={isEventModalOpen}
        onClose={() => {
          setIsEventModalOpen(false);
          setSelectedEvent(null);
          setSelectedDate(null);
        }}
        event={selectedEvent}
        tabs={ownedTabs}
        defaultTab={defaultTab}
        defaultDate={selectedDate}
        onSave={handleEventSave}
        onDelete={(event) => deleteEventMutation.mutate(event)}
        isSharedEvent={selectedEvent && !ownedTabs.some(t => t.id === selectedEvent.tab_id)}
        userRole={selectedEvent ? getUserRole(selectedEvent.tab_id) : 'owner'}
      />
      
      {/* Tab Modal */}
      <TabModal
        isOpen={isTabModalOpen}
        onClose={() => {
          setIsTabModalOpen(false);
          setSelectedTab(null);
        }}
        tab={selectedTab}
        onSave={handleTabSave}
        onDelete={(tab) => deleteTabMutation.mutate(tab.id)}
      />
      
      {/* Share Modal */}
      <ShareModal
        isOpen={isShareModalOpen}
        onClose={() => {
          setIsShareModalOpen(false);
          setShareTab(null);
        }}
        tab={shareTab}
        shares={tabShares}
        onInvite={(email, role) => shareTabMutation.mutate({ email, role })}
        onUpdateShare={(id, role) => updateShareMutation.mutate({ id, role })}
        onRemoveShare={(id) => removeShareMutation.mutate(id)}
      />
      
      {/* History Panel */}
      <EventHistoryPanel
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        history={eventHistory}
        onRevert={handleRevert}
      />
    </div>
  );
}
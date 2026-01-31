import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Calendar, Share2, LogOut, Settings } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { Toaster } from 'sonner';

export default function Layout({ children }) {
  const location = useLocation();
  const [user, setUser] = React.useState(null);

  React.useEffect(() => {
    const fetchUser = async () => {
      const userData = await base44.auth.me();
      setUser(userData);
    };
    fetchUser();
  }, []);

  const getInitials = (name) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const isActive = (path) => {
    return location.pathname.includes(path);
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <Toaster position="top-right" richColors />
      
      {/* Top Navigation */}
      <nav className="bg-white/95 backdrop-blur-sm border-b border-slate-200/50 px-4 py-3 sticky top-0 z-30 shadow-sm">
        <div className="flex items-center justify-between max-w-screen-2xl mx-auto">
          <div className="flex items-center gap-6">
            <Link to={createPageUrl('Calendar')} className="flex items-center gap-2 hover:opacity-80 transition-opacity">
              <div className="w-9 h-9 bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 rounded-xl flex items-center justify-center shadow-lg">
                <Calendar className="w-5 h-5 text-white" />
              </div>
              <span className="text-lg font-semibold text-slate-900 hidden sm:block">Gather</span>
            </Link>
            
            <div className="hidden md:flex items-center gap-1 ml-4">
              <Link to={createPageUrl('Calendar')}>
                <Button 
                  variant="ghost" 
                  size="sm"
                  className={`text-sm ${isActive('Calendar') && !isActive('SharedWithMe') ? 'bg-slate-100 text-slate-900' : 'text-slate-600'}`}
                >
                  <Calendar className="w-4 h-4 mr-2" />
                  My Tables
                </Button>
              </Link>
              <Link to={createPageUrl('SharedWithMe')}>
                <Button 
                  variant="ghost" 
                  size="sm"
                  className={`text-sm ${isActive('SharedWithMe') ? 'bg-slate-100 text-slate-900' : 'text-slate-600'}`}
                >
                  <Share2 className="w-4 h-4 mr-2" />
                  Invited Tables
                </Button>
              </Link>
              <Link to={createPageUrl('Settings')}>
                <Button 
                  variant="ghost" 
                  size="sm"
                  className={`text-sm ${isActive('Settings') ? 'bg-slate-100 text-slate-900' : 'text-slate-600'}`}
                >
                  <Settings className="w-4 h-4 mr-2" />
                  Settings
                </Button>
              </Link>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-9 w-9 rounded-full">
                  <Avatar className="h-9 w-9">
                    <AvatarFallback className="bg-indigo-100 text-indigo-700 font-medium">
                      {getInitials(user?.full_name)}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <div className="px-2 py-1.5">
                  <p className="text-sm font-medium text-slate-900">{user?.full_name}</p>
                  <p className="text-xs text-slate-500">{user?.email}</p>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="md:hidden" asChild>
                  <Link to={createPageUrl('Calendar')} className="flex items-center">
                    <Calendar className="w-4 h-4 mr-2" />
                    My Tables
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem className="md:hidden" asChild>
                  <Link to={createPageUrl('SharedWithMe')} className="flex items-center">
                    <Share2 className="w-4 h-4 mr-2" />
                    Invited Tables
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator className="md:hidden" />
                <DropdownMenuItem asChild>
                  <Link to={createPageUrl('Settings')} className="flex items-center">
                    <Settings className="w-4 h-4 mr-2" />
                    Settings
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  onClick={() => base44.auth.logout()}
                  className="text-red-600"
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </nav>
      
      {/* Main Content */}
      <main className="min-h-[calc(100vh-120px)]">
        {children}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-6 px-4">
        <div className="max-w-screen-2xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <span>© {new Date().getFullYear()} Gather</span>
            <span className="text-slate-300">·</span>
            <span>Where life meets.</span>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <Link 
              to={createPageUrl('Privacy')} 
              className="text-slate-500 hover:text-slate-700 transition-colors"
            >
              Privacy Policy
            </Link>
            <Link 
              to={createPageUrl('Terms')} 
              className="text-slate-500 hover:text-slate-700 transition-colors"
            >
              Terms of Service
            </Link>
            <Link 
              to={createPageUrl('Support')} 
              className="text-slate-500 hover:text-slate-700 transition-colors"
            >
              Support
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
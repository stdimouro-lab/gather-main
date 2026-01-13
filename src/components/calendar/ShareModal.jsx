import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { motion, AnimatePresence } from 'framer-motion';
import { Share2, Mail, UserPlus, X, Copy, Link, Check, Trash2 } from 'lucide-react';
import { cn } from "@/lib/utils";
import { getTabColors } from './TabFilter';
import { toast } from "sonner";

export default function ShareModal({ 
  isOpen, 
  onClose, 
  tab, 
  shares,
  onInvite,
  onUpdateShare,
  onRemoveShare
}) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('viewer');
  const [isInviting, setIsInviting] = useState(false);

  const colors = tab ? getTabColors(tab.color) : getTabColors('indigo');

  const handleInvite = async (e) => {
    e.preventDefault();
    if (!email) return;
    
    setIsInviting(true);
    await onInvite(email, role);
    setEmail('');
    setRole('viewer');
    setIsInviting(false);
  };

  const getInitials = (email) => {
    return email.split('@')[0].slice(0, 2).toUpperCase();
  };

  const roleColors = {
    viewer: 'bg-slate-100 text-slate-700',
    editor: 'bg-blue-100 text-blue-700',
    admin: 'bg-purple-100 text-purple-700'
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[480px] p-0 overflow-hidden">
        <div className={cn("h-2", colors.bg)} />
        
        <DialogHeader className="px-6 pt-4 pb-2">
          <DialogTitle className="text-xl font-semibold text-slate-900 flex items-center gap-2">
            <Share2 className="w-5 h-5 text-slate-500" />
            "Invite to the table"
          </DialogTitle>
        </DialogHeader>
        
        <div className="px-6 pb-6 space-y-6">
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-3">
            <p className="text-xs text-blue-700">
              Sharing a table lets others see events here — not your entire calendar.
            </p>
          </div>
          {/* Invite form */}
          <form onSubmit={handleInvite} className="space-y-4">
            <div className="flex gap-2">
              <div className="flex-1 space-y-1">
                <Label className="text-xs font-medium text-slate-500">
                  Invite by email
                </Label>
                <div className="flex gap-2">
                  <Input
                    type="email"
                    placeholder="colleague@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="flex-1"
                  />
                  <Select value={role} onValueChange={setRole}>
                    <SelectTrigger className="w-28">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="viewer">View only</SelectItem>
                      <SelectItem value="editor">Can add events</SelectItem>
                      <SelectItem value="admin">Can edit events</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            
            <Button 
              type="submit" 
              className="w-full bg-indigo-600 hover:bg-indigo-700"
              disabled={!email || isInviting}
            >
              <UserPlus className="w-4 h-4 mr-2" />
              {isInviting ? "Inviting..." : "Send Invite"}
            </Button>
          </form>
          
          {/* Role descriptions */}
          <div className="bg-slate-50 rounded-xl p-4 space-y-3">
            <p className="text-xs font-medium text-slate-500">Permission levels</p>
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div className="space-y-1">
                <Badge className={roleColors.viewer}>Viewer</Badge>
                <p className="text-slate-500">Can see events</p>
              </div>
              <div className="space-y-1">
                <Badge className={roleColors.editor}>Editor</Badge>
                <p className="text-slate-500">Can add and edit events</p>
              </div>
              <div className="space-y-1">
                <Badge className={roleColors.admin}>Admin</Badge>
                <p className="text-slate-500">Full control</p>
              </div>
            </div>
            <p className="text-xs text-slate-400 pt-2 border-t border-slate-200">
              Access can be changed or removed at any time.
            </p>
          </div>
          
          {/* Current shares */}
          {shares && shares.length > 0 && (
            <div className="space-y-3">
              <Label className="text-xs font-medium text-slate-500">
                People at this table
              </Label>
              <div className="space-y-2">
                <AnimatePresence>
                  {shares.map((share) => (
                    <motion.div
                      key={share.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      className="flex items-center justify-between p-3 bg-white border border-slate-200 rounded-xl"
                    >
                      <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9">
                          <AvatarFallback className="bg-slate-100 text-slate-600 text-xs font-medium">
                            {getInitials(share.shared_with_email)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-sm font-medium text-slate-700">
                            {share.shared_with_email}
                          </p>
                          {!share.accepted && (
                            <p className="text-xs text-amber-600">Pending invite</p>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Select 
                          value={share.role} 
                          onValueChange={(newRole) => onUpdateShare(share.id, newRole)}
                        >
                          <SelectTrigger className="w-24 h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="viewer">View only</SelectItem>
                            <SelectItem value="editor">Can add events</SelectItem>
                            <SelectItem value="admin">Can edit events</SelectItem>
                          </SelectContent>
                        </Select>
                        
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-slate-400 hover:text-red-600 hover:bg-red-50"
                          onClick={() => onRemoveShare(share.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
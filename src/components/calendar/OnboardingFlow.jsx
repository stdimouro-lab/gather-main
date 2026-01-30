import React, { useState } from 'react';
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { motion } from 'framer-motion';
import { 
  Users, 
  ChevronRight,
  CheckCircle,
  Layers,
  Plus
} from 'lucide-react';
import { cn } from "@/lib/utils";

const TAB_COLORS = [
  { id: 'indigo', label: 'Indigo', class: 'bg-indigo-500' },
  { id: 'violet', label: 'Violet', class: 'bg-violet-500' },
  { id: 'emerald', label: 'Emerald', class: 'bg-emerald-500' },
  { id: 'amber', label: 'Amber', class: 'bg-amber-500' },
  { id: 'rose', label: 'Rose', class: 'bg-rose-500' },
  { id: 'cyan', label: 'Cyan', class: 'bg-cyan-500' },
];

const STEPS = [
  { id: 'what', title: "Create a Table" },
  { id: 'name', title: "Name Your Table" },
  { id: 'share', title: "Share This Table" },
  { id: 'smart', title: "Smart Features" },
  { id: 'done', title: "Table Created" }
];

export default function OnboardingFlow({
  isOpen,
  onClose,
  onComplete
}) {
  const [currentStep, setCurrentStep] = useState(0);
  const [tableName, setTableName] = useState('');
  const [tableColor, setTableColor] = useState('indigo');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('viewer');

  const handleNext = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleComplete = async () => {
    const data = {
      tableName: tableName || 'My Table',
      tableColor,
      inviteEmail: inviteEmail || null,
      inviteRole
    };
    await onComplete(data);
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 0: // What is a Table
        return (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center space-y-6"
          >
            <div className="w-20 h-20 bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 rounded-2xl flex items-center justify-center mx-auto shadow-lg">
              <Layers className="w-10 h-10 text-white" />
            </div>
            <div className="space-y-3">
              <h2 className="text-2xl font-semibold text-slate-900">Create a Table</h2>
              <p className="text-slate-500">
                Create Tables for different parts of your life.
                Share a table with others without sharing everything.
              </p>
            </div>
          </motion.div>
        );

      case 1: // Name the Table
        return (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <div className="w-14 h-14 bg-indigo-100 rounded-2xl flex items-center justify-center">
              <Plus className="w-7 h-7 text-indigo-600" />
            </div>
            <div className="space-y-2">
              <h2 className="text-xl font-semibold text-slate-900">Name Your Table</h2>
            </div>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium text-slate-700">Table name</Label>
                <Input
                  type="text"
                  placeholder="Family, Kids, Work, etc."
                  value={tableName}
                  onChange={(e) => setTableName(e.target.value)}
                  className="rounded-xl"
                  autoFocus
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium text-slate-700">Color</Label>
                <div className="flex gap-2">
                  {TAB_COLORS.map((color) => (
                    <button
                      key={color.id}
                      onClick={() => setTableColor(color.id)}
                      className={cn(
                        "w-8 h-8 rounded-full transition-all",
                        color.class,
                        tableColor === color.id 
                          ? "ring-2 ring-offset-2 ring-slate-400 scale-110" 
                          : "hover:scale-105"
                      )}
                    />
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        );

      case 2: // Share This Table
        return (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <div className="w-14 h-14 bg-emerald-100 rounded-2xl flex items-center justify-center">
              <Users className="w-7 h-7 text-emerald-600" />
            </div>
            <div className="space-y-2">
              <h2 className="text-xl font-semibold text-slate-900">Share This Table</h2>
              <p className="text-sm text-slate-500">
                Invite others to view or help manage events at this table.
              </p>
            </div>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium text-slate-700">Email address</Label>
                <Input
                  type="email"
                  placeholder="name@example.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  className="rounded-xl"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium text-slate-700">Permission</Label>
                <Select value={inviteRole} onValueChange={setInviteRole}>
                  <SelectTrigger className="rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="viewer">Viewer — Can see events</SelectItem>
                    <SelectItem value="editor">Editor — Can add and edit events</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <p className="text-xs text-slate-400 bg-slate-50 p-3 rounded-xl">
                Sharing a table does not share your other tables.
              </p>
            </div>
          </motion.div>
        );

      case 3: // Smart Features
        return (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <div className="w-14 h-14 bg-amber-100 rounded-2xl flex items-center justify-center">
              <Sparkles className="w-7 h-7 text-amber-600" />
            </div>
            <div className="space-y-2">
              <h2 className="text-xl font-semibold text-slate-900">Smart Event Suggestions</h2>
              <p className="text-sm text-slate-500">
                Soon, Gather will be able to suggest events from your email — like school updates, reservations, and invitations.
              </p>
            </div>
            <div className="bg-slate-50 rounded-xl p-4 space-y-3">
              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-slate-600">
                  This feature will always be opt-in and will never add events automatically
                </p>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-slate-600">
                  You'll review and approve each suggestion before it's added
                </p>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-slate-600">
                  Email access can be disconnected at any time
                </p>
              </div>
            </div>
          </motion.div>
        );

      case 4: // Confirmation
        return (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center space-y-6"
          >
            <div className="w-20 h-20 bg-emerald-100 rounded-2xl flex items-center justify-center mx-auto">
              <CheckCircle className="w-10 h-10 text-emerald-600" />
            </div>
            <div className="space-y-3">
              <h2 className="text-2xl font-semibold text-slate-900">Table Created</h2>
              <p className="text-slate-500">
                Your table is ready. Add events or invite people anytime.
              </p>
            </div>
            <div className="flex items-center justify-center gap-2 py-4">
              <div className={cn(
                "w-4 h-4 rounded-full",
                TAB_COLORS.find(c => c.id === tableColor)?.class || 'bg-indigo-500'
              )} />
              <span className="font-medium text-slate-700">{tableName || 'My Table'}</span>
            </div>
          </motion.div>
        );

      default:
        return null;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[450px] p-6">
        {renderStepContent()}

        <div className="mt-8 flex items-center justify-between gap-3">
          <div className="flex gap-1 flex-1">
            {STEPS.map((_, idx) => (
              <motion.div
                key={idx}
                className={cn(
                  'h-1.5 rounded-full transition-all flex-1',
                  idx <= currentStep ? 'bg-indigo-600' : 'bg-slate-200'
                )}
              />
            ))}
          </div>
        </div>

        <div className="mt-6 flex gap-3">
          {currentStep > 0 && currentStep < 3 && (
            <Button
              variant="outline"
              onClick={() => setCurrentStep(currentStep - 1)}
              className="flex-1"
            >
              Back
            </Button>
          )}
          
          {currentStep === 0 && (
            <Button
              onClick={handleNext}
              className="flex-1 bg-indigo-600 hover:bg-indigo-700"
            >
              Continue
              <ChevronRight className="w-4 h-4 ml-2" />
            </Button>
          )}
          
          {currentStep === 1 && (
            <Button
              onClick={handleNext}
              className="flex-1 bg-indigo-600 hover:bg-indigo-700"
              disabled={!tableName.trim()}
            >
              Create Table
              <ChevronRight className="w-4 h-4 ml-2" />
            </Button>
          )}
          
          {currentStep === 2 && (
            <div className="flex-1 flex flex-col gap-2">
              {inviteEmail && (
                <Button
                  onClick={handleNext}
                  className="w-full bg-indigo-600 hover:bg-indigo-700"
                >
                  Invite
                </Button>
              )}
              <Button
                variant={inviteEmail ? "ghost" : "default"}
                onClick={handleNext}
                className={inviteEmail ? "w-full text-slate-500" : "w-full bg-indigo-600 hover:bg-indigo-700"}
              >
                {inviteEmail ? "Skip for now" : "Skip for now"}
              </Button>
            </div>
          )}
          
          {currentStep === 3 && (
            <Button
              onClick={handleNext}
              className="flex-1 bg-indigo-600 hover:bg-indigo-700"
            >
              Continue
              <ChevronRight className="w-4 h-4 ml-2" />
            </Button>
          )}
          
          {currentStep === 4 && (
            <Button
              onClick={handleComplete}
              className="flex-1 bg-indigo-600 hover:bg-indigo-700"
            >
              Go to Table
            </Button>
          )}
        </div>

        <p className="text-xs text-center text-slate-400 mt-4">
          Step {currentStep + 1} of {STEPS.length}
        </p>
      </DialogContent>
    </Dialog>
  );
}
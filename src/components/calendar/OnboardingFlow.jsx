import React, { useState } from 'react';
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent } from "@/components/ui/card";
import { motion } from 'framer-motion';
import { 
  Heart, 
  Users, 
  Shield, 
  ChevronRight,
  CheckCircle,
  Layers
} from 'lucide-react';
import { cn } from "@/lib/utils";

const STEPS = [
  {
    id: 'welcome',
    title: "Welcome to Gather",
    subtitle: "Where life meets. Gather helps you organize plans around the people who matter most.",
    icon: Heart
  },
  {
    id: 'tables',
    title: "Create Tables",
    subtitle: "Tables help you organize life by group — Family, Kids, Work, or anything you need.",
    icon: Layers
  },
  {
    id: 'sharing',
    title: "Share What Matters",
    subtitle: "Share individual tables with others without sharing your entire calendar.",
    icon: Users
  },
  {
    id: 'sync',
    title: "Stay in Sync",
    subtitle: "Add events, invite others, and keep everyone aligned — without the chaos.",
    icon: Shield
  }
];

export default function OnboardingFlow({
  isOpen,
  onClose,
  onComplete
}) {
  const [currentStep, setCurrentStep] = useState(0);
  const [coparentEmail, setCoparentEmail] = useState('');
  const [emailSuggestions, setEmailSuggestions] = useState(false);
  const [busyByDefault, setBusyByDefault] = useState(true);

  const handleNext = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleComplete = async () => {
    const data = {
      coparentEmail: coparentEmail || null,
      emailSuggestions,
      busyByDefault
    };
    await onComplete(data);
  };

  const Step = STEPS[currentStep];
  const StepIcon = Step.icon;

  const renderStepContent = () => {
    switch (currentStep) {
      case 0: // Welcome
        return (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center space-y-6"
          >
            <div className="w-20 h-20 bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 rounded-2xl flex items-center justify-center mx-auto shadow-lg">
              <StepIcon className="w-10 h-10 text-white" />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-semibold text-slate-900">{Step.title}</h2>
              <p className="text-slate-500">{Step.subtitle}</p>
            </div>
          </motion.div>
        );

      case 1: // Tables
        return (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            <div className="w-14 h-14 bg-blue-100 rounded-2xl flex items-center justify-center">
              <StepIcon className="w-7 h-7 text-blue-600" />
            </div>
            <div className="space-y-2 mb-4">
              <h2 className="text-xl font-semibold text-slate-900">{Step.title}</h2>
              <p className="text-sm text-slate-500">{Step.subtitle}</p>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {['Family', 'Kids', 'Work'].map((name, i) => (
                <div key={name} className="p-3 bg-slate-50 rounded-xl text-center">
                  <div className={cn(
                    "w-3 h-3 rounded-full mx-auto mb-2",
                    i === 0 ? "bg-emerald-500" : i === 1 ? "bg-amber-500" : "bg-indigo-500"
                  )} />
                  <p className="text-xs font-medium text-slate-600">{name}</p>
                </div>
              ))}
            </div>
          </motion.div>
        );

      case 2: // Sharing
        return (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            <div className="w-14 h-14 bg-emerald-100 rounded-2xl flex items-center justify-center">
              <StepIcon className="w-7 h-7 text-emerald-600" />
            </div>
            <div className="space-y-2 mb-4">
              <h2 className="text-xl font-semibold text-slate-900">{Step.title}</h2>
              <p className="text-sm text-slate-500">{Step.subtitle}</p>
            </div>
            <Card className="bg-emerald-50 border-emerald-200">
              <CardContent className="pt-4">
                <p className="text-xs text-emerald-700">
                  ✨ We'll create a Kids table for you. Invite your co-parent to stay in sync on schedules, pickups, and activities.
                </p>
              </CardContent>
            </Card>
            <div className="space-y-2">
              <Label className="text-sm font-medium text-slate-600">Co-parent email (optional)</Label>
              <Input
                type="email"
                placeholder="parent@example.com"
                value={coparentEmail}
                onChange={(e) => setCoparentEmail(e.target.value)}
                className="rounded-xl"
              />
              <p className="text-xs text-slate-400">You can invite them later too</p>
            </div>
          </motion.div>
        );

      case 3: // Sync & Privacy
        return (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            <div className="w-14 h-14 bg-purple-100 rounded-2xl flex items-center justify-center">
              <StepIcon className="w-7 h-7 text-purple-600" />
            </div>
            <div className="space-y-2 mb-4">
              <h2 className="text-xl font-semibold text-slate-900">{Step.title}</h2>
              <p className="text-sm text-slate-500">{Step.subtitle}</p>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                <div>
                  <p className="text-sm font-medium text-slate-700">Default to "busy only" when sharing</p>
                  <p className="text-xs text-slate-500">Others see when you're busy, not what you're doing</p>
                </div>
                <Switch checked={busyByDefault} onCheckedChange={setBusyByDefault} />
              </div>
              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                <div>
                  <p className="text-sm font-medium text-slate-700">Smart Event Suggestions (Beta)</p>
                  <p className="text-xs text-slate-500">Suggest events from emails — nothing added without approval</p>
                </div>
                <Switch checked={emailSuggestions} onCheckedChange={setEmailSuggestions} />
              </div>
            </div>
          </motion.div>
        );

      default:
        return null;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px] p-6">
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
          {currentStep > 0 && (
            <Button
              variant="outline"
              onClick={() => setCurrentStep(currentStep - 1)}
              className="flex-1"
            >
              Back
            </Button>
          )}
          {currentStep < STEPS.length - 1 ? (
            <Button
              onClick={handleNext}
              className="flex-1 bg-indigo-600 hover:bg-indigo-700"
            >
              Next
              <ChevronRight className="w-4 h-4 ml-2" />
            </Button>
          ) : (
            <div className="flex-1 flex flex-col gap-2">
              <Button
                onClick={handleComplete}
                className="w-full bg-indigo-600 hover:bg-indigo-700"
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                Create my first table
              </Button>
              <Button
                variant="ghost"
                onClick={() => {
                  onComplete({ coparentEmail: null, emailSuggestions: false, busyByDefault: true });
                }}
                className="w-full text-slate-500"
              >
                Skip for now
              </Button>
            </div>
          )}
        </div>

        <p className="text-xs text-center text-slate-400 mt-4">
          Step {currentStep + 1} of {STEPS.length}
        </p>
      </DialogContent>
    </Dialog>
  );
}
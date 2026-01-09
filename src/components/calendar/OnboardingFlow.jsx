import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription } from "@/components/ui/card";
import { motion } from 'framer-motion';
import { 
  Heart, 
  Users, 
  Shield, 
  Mail, 
  ChevronRight,
  CheckCircle,
  Sparkles
} from 'lucide-react';
import { cn } from "@/lib/utils";

const STEPS = [
  {
    id: 'welcome',
    title: 'Welcome to Calendly',
    subtitle: 'Family-first calendar for busy lives',
    icon: Heart
  },
  {
    id: 'coparent',
    title: 'Share with Co-parent',
    subtitle: 'Keep both households in sync',
    icon: Users
  },
  {
    id: 'privacy',
    title: 'Your Privacy Matters',
    subtitle: 'Control what others see',
    icon: Shield
  },
  {
    id: 'email',
    title: 'Smart Event Detection',
    subtitle: "We'll suggest events from your emails",
    icon: Mail
  }
];

export default function OnboardingFlow({
  isOpen,
  onClose,
  onComplete
}) {
  const [currentStep, setCurrentStep] = useState(0);
  const [coparentEmail, setCoparentEmail] = useState('');
  const [emailSuggestions, setEmailSuggestions] = useState(true);
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
            className="text-center space-y-4"
          >
            <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto">
              <StepIcon className="w-8 h-8 text-white" />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-semibold text-slate-900">{Step.title}</h2>
              <p className="text-slate-500">{Step.subtitle}</p>
            </div>
            <div className="pt-4 space-y-3 text-sm">
              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                <span className="text-slate-600">Separate calendars for different parts of your life</span>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                <span className="text-slate-600">Share only what matters with who it matters</span>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                <span className="text-slate-600">Family first, oversharing never</span>
              </div>
            </div>
          </motion.div>
        );

      case 1: // Co-parent
        return (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            <div className="w-14 h-14 bg-blue-100 rounded-2xl flex items-center justify-center">
              <StepIcon className="w-7 h-7 text-blue-600" />
            </div>
            <div className="space-y-2 mb-6">
              <h2 className="text-xl font-semibold text-slate-900">{Step.title}</h2>
              <p className="text-sm text-slate-500">{Step.subtitle}</p>
            </div>
            <Card className="bg-blue-50 border-blue-200">
              <CardContent className="pt-4">
                <p className="text-xs text-blue-700">
                  ✨ We'll automatically create a "Kids" calendar for you. Share it with your co-parent to stay in sync on schedules, pickups, and activities.
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

      case 2: // Privacy
        return (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            <div className="w-14 h-14 bg-purple-100 rounded-2xl flex items-center justify-center">
              <StepIcon className="w-7 h-7 text-purple-600" />
            </div>
            <div className="space-y-2 mb-6">
              <h2 className="text-xl font-semibold text-slate-900">{Step.title}</h2>
              <p className="text-sm text-slate-500">{Step.subtitle}</p>
            </div>
            <div className="space-y-4">
              <Card>
                <CardContent className="pt-4 space-y-3">
                  <div className="flex items-start gap-3">
                    <Shield className="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <h3 className="font-medium text-sm text-slate-900">Show others "Busy" instead of details</h3>
                      <p className="text-xs text-slate-500">
                        People can see when you're busy, but not what you're doing. Perfect for co-parenting.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                <span className="text-sm font-medium text-slate-700">Default to "Busy only" when sharing</span>
                <Switch checked={busyByDefault} onCheckedChange={setBusyByDefault} />
              </div>
            </div>
          </motion.div>
        );

      case 3: // Email
        return (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            <div className="w-14 h-14 bg-amber-100 rounded-2xl flex items-center justify-center">
              <StepIcon className="w-7 h-7 text-amber-600" />
            </div>
            <div className="space-y-2 mb-6">
              <h2 className="text-xl font-semibold text-slate-900">{Step.title}</h2>
              <p className="text-sm text-slate-500">{Step.subtitle}</p>
            </div>
            <Card className="bg-amber-50 border-amber-200">
              <CardContent className="pt-4">
                <div className="space-y-2">
                  <p className="text-xs text-amber-800">
                    <Sparkles className="w-4 h-4 inline mr-1" />
                    We scan your emails for school events, appointments, and reservations.
                  </p>
                  <p className="text-xs text-amber-700">
                    You decide what to add — nothing is auto-added.
                  </p>
                </div>
              </CardContent>
            </Card>
            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
              <div>
                <p className="text-sm font-medium text-slate-700">Enable smart suggestions</p>
                <p className="text-xs text-slate-500">Scan emails for events</p>
              </div>
              <Switch checked={emailSuggestions} onCheckedChange={setEmailSuggestions} />
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
          <div className="flex gap-1">
            {STEPS.map((_, idx) => (
              <motion.div
                key={idx}
                className={cn(
                  'h-1.5 rounded-full transition-all',
                  idx <= currentStep ? 'bg-indigo-600 flex-1' : 'bg-slate-200 flex-1'
                )}
                layoutId="progress"
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
            <Button
              onClick={handleComplete}
              className="flex-1 bg-indigo-600 hover:bg-indigo-700"
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              Get Started
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
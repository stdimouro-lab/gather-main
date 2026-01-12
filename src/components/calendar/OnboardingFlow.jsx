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
    title: "Life happens in groups.",
    subtitle: "Gather helps you keep each one organized.",
    icon: Heart
  },
  {
    id: 'tables',
    title: "Tables keep things separate — but connected.",
    subtitle: "One place for family, work, and everything in between.",
    icon: Users
  },
  {
    id: 'privacy',
    title: "Share only what matters.",
    subtitle: "Family doesn't need your work calendar.",
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
            <p className="text-sm text-slate-500 pt-4">
              "One place for family, work, and everything in between."
            </p>
          </motion.div>
        );

      case 1: // Tables
        return (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center space-y-4"
          >
            <div className="w-14 h-14 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto">
              <StepIcon className="w-7 h-7 text-blue-600" />
            </div>
            <div className="space-y-2">
              <h2 className="text-xl font-semibold text-slate-900">{Step.title}</h2>
              <p className="text-sm text-slate-500">{Step.subtitle}</p>
            </div>
            <Card className="bg-blue-50 border-blue-200">
              <CardContent className="pt-4">
                <p className="text-xs text-blue-700">
                  "Tables are shared spaces for people and events. Create one for Family, Kids, Work — whatever fits your life."
                </p>
              </CardContent>
            </Card>
          </motion.div>
        );

      case 2: // Privacy
        return (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center space-y-4"
          >
            <div className="w-14 h-14 bg-purple-100 rounded-2xl flex items-center justify-center mx-auto">
              <StepIcon className="w-7 h-7 text-purple-600" />
            </div>
            <div className="space-y-2">
              <h2 className="text-xl font-semibold text-slate-900">{Step.title}</h2>
              <p className="text-sm text-slate-500">{Step.subtitle}</p>
            </div>
            <Card>
              <CardContent className="pt-4 space-y-3">
                <p className="text-xs text-slate-600">
                  "Tables can be shared independently — invite only who belongs."
                </p>
              </CardContent>
            </Card>
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
              "Next"
              <ChevronRight className="w-4 h-4 ml-2" />
            </Button>
          ) : (
            <Button
              onClick={handleComplete}
              className="flex-1 bg-indigo-600 hover:bg-indigo-700"
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              "Set the table"
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
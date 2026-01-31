import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { createPageUrl } from '@/utils';
import { Link } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Check, 
  Crown, 
  ArrowLeft,
  Sparkles,
  Users,
  Calendar,
  Zap
} from 'lucide-react';
import { cn } from "@/lib/utils";
import ProtectedRoute from '@/components/ProtectedRoute';

export default function PlansPage() {
  return (
    <ProtectedRoute>
      <PlansPageContent />
    </ProtectedRoute>
  );
}

function PlansPageContent() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const fetchUser = async () => {
      const userData = await base44.auth.me();
      setUser(userData);
    };
    fetchUser();
  }, []);

  const { data: ownedTabs = [] } = useQuery({
    queryKey: ['tabs', user?.email],
    queryFn: async () => {
      const tabs = await base44.entities.CalendarTab.filter({ owner_email: user?.email });
      return tabs;
    },
    enabled: !!user?.email,
  });

  const tableCount = ownedTabs.length;
  const isFreePlan = true; // Will be used for monetization later

  const plans = [
    {
      name: 'Free',
      price: '$0',
      period: 'forever',
      description: 'Perfect for getting started',
      features: [
        'Up to 2 Tables',
        'Unlimited events',
        'Viewer-level sharing',
        'Mobile & web access',
        'Basic notifications'
      ],
      current: isFreePlan,
      cta: 'Current Plan',
      disabled: true
    },
    {
      name: 'Premium',
      price: '$4.99',
      period: '/month',
      description: 'For power users and families',
      badge: 'Most Popular',
      features: [
        'Unlimited Tables',
        'Unlimited events',
        'Editor & Admin sharing',
        'External calendar imports',
        'Smart event suggestions',
        'Priority support',
        'Future premium features'
      ],
      current: false,
      cta: 'Coming Soon',
      disabled: true,
      highlighted: true
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 py-8 px-4">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link to={createPageUrl('Settings')}>
            <Button variant="ghost" size="sm" className="mb-4">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Settings
            </Button>
          </Link>
          <div className="text-center">
            <h1 className="text-4xl font-bold text-slate-900 mb-2">
              Choose Your Plan
            </h1>
            <p className="text-slate-500 text-lg">
              Start free, upgrade when you need more
            </p>
          </div>
        </div>

        {/* Current Usage */}
        {user && (
          <Card className="mb-8 bg-gradient-to-br from-indigo-50 to-purple-50 border-indigo-200">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-indigo-900 mb-1">Current Usage</p>
                  <p className="text-2xl font-bold text-indigo-700">
                    {tableCount} of 2 Tables
                  </p>
                </div>
                <div className="w-16 h-16 bg-indigo-100 rounded-2xl flex items-center justify-center">
                  <Calendar className="w-8 h-8 text-indigo-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Plans Grid */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          {plans.map((plan) => (
            <Card 
              key={plan.name}
              className={cn(
                "relative overflow-hidden transition-all",
                plan.highlighted && "border-indigo-300 shadow-xl scale-105"
              )}
            >
              {plan.badge && (
                <div className="absolute top-0 right-0 bg-gradient-to-r from-indigo-500 to-purple-500 text-white text-xs font-semibold px-3 py-1 rounded-bl-xl">
                  {plan.badge}
                </div>
              )}
              
              <CardHeader>
                <div className="flex items-center justify-between mb-2">
                  <CardTitle className="text-2xl">{plan.name}</CardTitle>
                  {plan.current && (
                    <Badge variant="secondary" className="bg-emerald-100 text-emerald-700">
                      <Check className="w-3 h-3 mr-1" />
                      Active
                    </Badge>
                  )}
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-bold text-slate-900">{plan.price}</span>
                  <span className="text-slate-500">{plan.period}</span>
                </div>
                <p className="text-sm text-slate-500 mt-2">{plan.description}</p>
              </CardHeader>
              
              <CardContent className="space-y-6">
                <ul className="space-y-3">
                  {plan.features.map((feature, idx) => (
                    <li key={idx} className="flex items-start gap-3">
                      <Check className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                      <span className="text-sm text-slate-700">{feature}</span>
                    </li>
                  ))}
                </ul>
                
                <Button 
                  className={cn(
                    "w-full",
                    plan.highlighted 
                      ? "bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700" 
                      : ""
                  )}
                  disabled={plan.disabled}
                  variant={plan.highlighted ? "default" : "outline"}
                >
                  {plan.highlighted && <Crown className="w-4 h-4 mr-2" />}
                  {plan.cta}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Features Comparison */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-indigo-600" />
              Why Upgrade?
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-3 gap-4">
              <div className="p-4 bg-slate-50 rounded-xl">
                <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center mb-3">
                  <Calendar className="w-6 h-6 text-indigo-600" />
                </div>
                <h3 className="font-semibold text-slate-900 mb-1">Unlimited Tables</h3>
                <p className="text-xs text-slate-500">
                  Create as many tables as you need for work, family, hobbies, and more
                </p>
              </div>
              
              <div className="p-4 bg-slate-50 rounded-xl">
                <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center mb-3">
                  <Users className="w-6 h-6 text-emerald-600" />
                </div>
                <h3 className="font-semibold text-slate-900 mb-1">Advanced Sharing</h3>
                <p className="text-xs text-slate-500">
                  Give others Editor and Admin permissions to help manage events
                </p>
              </div>
              
              <div className="p-4 bg-slate-50 rounded-xl">
                <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center mb-3">
                  <Zap className="w-6 h-6 text-purple-600" />
                </div>
                <h3 className="font-semibold text-slate-900 mb-1">Smart Features</h3>
                <p className="text-xs text-slate-500">
                  AI-powered event suggestions and external calendar sync
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Coming Soon Notice */}
        <Card className="mt-6 bg-amber-50 border-amber-200">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <Crown className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-amber-900 mb-1">
                  Premium launching soon
                </p>
                <p className="text-xs text-amber-700">
                  Premium features are being finalized. For now, enjoy unlimited access to all features while we prepare for launch. Early users may receive special pricing.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
}
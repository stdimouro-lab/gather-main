import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Mail, CheckCircle, Shield, Calendar } from 'lucide-react';

export default function SuggestionsComingSoon() {
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="text-center space-y-3">
        <div className="w-20 h-20 bg-gradient-to-br from-amber-100 to-orange-100 rounded-2xl flex items-center justify-center mx-auto">
          <Sparkles className="w-10 h-10 text-amber-600" />
        </div>
        <div>
          <div className="flex items-center justify-center gap-2 mb-2">
            <h1 className="text-3xl font-bold text-slate-900">Smart Event Suggestions</h1>
            <Badge variant="secondary" className="bg-amber-100 text-amber-700">
              Coming Soon
            </Badge>
          </div>
          <p className="text-slate-500 text-lg">
            Gather will suggest events from confirmations, school emails, reservations, and invites. 
            Nothing is ever added without your approval.
          </p>
        </div>
      </div>

      {/* Main Card */}
      <Card className="border-2 border-slate-200">
        <CardContent className="pt-6 space-y-6">
          <div className="space-y-4">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center flex-shrink-0">
                <Mail className="w-6 h-6 text-indigo-600" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-900 mb-1">Smart Detection</h3>
                <p className="text-sm text-slate-600">
                  Automatically identifies events from school updates, appointment confirmations, 
                  reservation receipts, and calendar invitations.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center flex-shrink-0">
                <CheckCircle className="w-6 h-6 text-emerald-600" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-900 mb-1">Always Your Choice</h3>
                <p className="text-sm text-slate-600">
                  Review suggestions before adding them. Edit details, assign to the right table, 
                  or ignore suggestions you don't need.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center flex-shrink-0">
                <Calendar className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-900 mb-1">Table-Aware</h3>
                <p className="text-sm text-slate-600">
                  Suggestions will recommend the right table based on the event type — like school 
                  events to your Kids table or work meetings to your Work table.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center flex-shrink-0">
                <Shield className="w-6 h-6 text-slate-600" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-900 mb-1">Private & Secure</h3>
                <p className="text-sm text-slate-600">
                  Email access will be opt-in and can be disconnected at any time. 
                  Your data stays private and is never shared.
                </p>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-200">
            <Button 
              disabled
              className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 h-12 text-base"
            >
              <Mail className="w-5 h-5 mr-2" />
              Connect Email (Coming Soon)
            </Button>
            <p className="text-xs text-slate-500 text-center mt-3">
              Email access will be opt-in and can be disconnected at any time.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Premium Badge */}
      <Card className="bg-gradient-to-br from-indigo-50 to-purple-50 border-indigo-200">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <Sparkles className="w-5 h-5 text-indigo-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-indigo-900 mb-1">
                Premium Feature
              </p>
              <p className="text-xs text-indigo-700">
                Smart Event Suggestions will be available as part of Gather Premium. 
                Early users may receive special access and pricing.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
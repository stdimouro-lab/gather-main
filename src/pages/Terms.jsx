import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from "@/components/ui/button";
import { ArrowLeft } from 'lucide-react';

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="flex items-center gap-4 mb-8">
          <Link to={createPageUrl('Calendar')}>
            <Button variant="ghost" size="icon" className="rounded-full">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <h1 className="text-2xl font-semibold text-slate-900">Terms of Service</h1>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8 space-y-6">
          <div className="space-y-4 text-slate-600 leading-relaxed">
            <p>By using Gather, you agree to use the app responsibly and not misuse or attempt to reverse-engineer the service.</p>
            
            <p>Gather is provided "as is" without warranties of any kind.</p>
            
            <p>We may update features or policies over time.</p>
            
            <p className="pt-4 text-slate-500 text-sm">Continued use of the app constitutes acceptance of these terms.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from "@/components/ui/button";
import { ArrowLeft, Mail } from 'lucide-react';

export default function SupportPage() {
  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="flex items-center gap-4 mb-8">
          <Link to={createPageUrl('Calendar')}>
            <Button variant="ghost" size="icon" className="rounded-full">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <h1 className="text-2xl font-semibold text-slate-900">Gather Support</h1>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8 space-y-6">
          <div className="space-y-4 text-slate-600 leading-relaxed">
            <p className="text-lg text-slate-700">
              Need help or have a question about Gather? We're here to help.
            </p>
            
            <div className="bg-indigo-50 rounded-xl p-6 space-y-3">
              <p className="font-semibold text-slate-900">Contact us:</p>
              <a 
                href="mailto:support@gatherapp.me"
                className="flex items-center gap-2 text-indigo-600 hover:text-indigo-700 transition-colors font-medium"
              >
                <Mail className="w-5 h-5" />
                support@gatherapp.me
              </a>
            </div>

            <p className="text-slate-600">
              We typically respond within 1–2 business days.
            </p>
            
            <div className="pt-4">
              <p className="font-medium text-slate-700 mb-3">
                If you're experiencing an issue, please include:
              </p>
              <ul className="space-y-2 text-slate-600">
                <li className="flex items-start gap-2">
                  <span className="text-indigo-600 mt-1">•</span>
                  <span>A brief description of the problem</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-indigo-600 mt-1">•</span>
                  <span>The device you're using</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-indigo-600 mt-1">•</span>
                  <span>Your account email (if applicable)</span>
                </li>
              </ul>
            </div>

            <p className="pt-6 text-slate-500 text-sm italic text-center border-t border-slate-200 mt-8">
              Thank you for using Gather — where life meets.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
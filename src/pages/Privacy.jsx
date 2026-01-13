import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from "@/components/ui/button";
import { ArrowLeft } from 'lucide-react';

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="flex items-center gap-4 mb-8">
          <Link to={createPageUrl('Calendar')}>
            <Button variant="ghost" size="icon" className="rounded-full">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <h1 className="text-2xl font-semibold text-slate-900">Privacy Policy</h1>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8 space-y-6">
          <p className="text-sm text-slate-500">Last updated: {new Date().toLocaleDateString()}</p>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-slate-900">Introduction</h2>
            <p className="text-slate-600 leading-relaxed">
              Welcome to Gather ("we," "our," or "us"). We respect your privacy and are committed to protecting your personal data. This privacy policy explains how we collect, use, and safeguard your information when you use our calendar application.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-slate-900">Information We Collect</h2>
            <ul className="text-slate-600 space-y-2 list-disc list-inside">
              <li>Account information (name, email address)</li>
              <li>Calendar events and table data you create</li>
              <li>Sharing preferences and permissions</li>
              <li>Usage data to improve our service</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-slate-900">How We Use Your Information</h2>
            <ul className="text-slate-600 space-y-2 list-disc list-inside">
              <li>To provide and maintain our calendar service</li>
              <li>To enable sharing features between users</li>
              <li>To send you important updates about your account</li>
              <li>To improve and personalize your experience</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-slate-900">Data Sharing</h2>
            <p className="text-slate-600 leading-relaxed">
              We only share your calendar data with users you explicitly invite to your tables. We do not sell your personal information to third parties. Shared tables only display events within that specific table — not your entire calendar.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-slate-900">Smart Event Suggestions</h2>
            <p className="text-slate-600 leading-relaxed">
              If you enable Smart Event Suggestions, we may scan your connected email for event-related information. This feature is opt-in only, and no events are added to your calendar without your explicit approval. Email content is processed securely and is never shared with other users.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-slate-900">Data Security</h2>
            <p className="text-slate-600 leading-relaxed">
              We implement appropriate security measures to protect your personal data against unauthorized access, alteration, disclosure, or destruction.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-slate-900">Your Rights</h2>
            <p className="text-slate-600 leading-relaxed">
              You have the right to access, correct, or delete your personal data at any time. You can manage your data through your account settings or by contacting us directly.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-slate-900">Contact Us</h2>
            <p className="text-slate-600 leading-relaxed">
              If you have any questions about this privacy policy, please contact us through the app.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
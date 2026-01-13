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
          <p className="text-sm text-slate-500">Last updated: {new Date().toLocaleDateString()}</p>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-slate-900">Agreement to Terms</h2>
            <p className="text-slate-600 leading-relaxed">
              By accessing or using Gather, you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use our service.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-slate-900">Description of Service</h2>
            <p className="text-slate-600 leading-relaxed">
              Gather is a shared calendar application that allows users to create tables (calendar categories), add events, and share specific tables with other users. Our service is designed to help families, co-parents, and groups coordinate schedules.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-slate-900">User Accounts</h2>
            <ul className="text-slate-600 space-y-2 list-disc list-inside">
              <li>You must provide accurate information when creating an account</li>
              <li>You are responsible for maintaining the security of your account</li>
              <li>You must notify us immediately of any unauthorized access</li>
              <li>You may not share your account credentials with others</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-slate-900">Acceptable Use</h2>
            <p className="text-slate-600 leading-relaxed">
              You agree to use Gather only for lawful purposes. You may not use our service to:
            </p>
            <ul className="text-slate-600 space-y-2 list-disc list-inside">
              <li>Violate any applicable laws or regulations</li>
              <li>Infringe on the rights of others</li>
              <li>Transmit harmful or malicious content</li>
              <li>Attempt to gain unauthorized access to our systems</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-slate-900">Content and Data</h2>
            <p className="text-slate-600 leading-relaxed">
              You retain ownership of the content you create in Gather. By using our service, you grant us a limited license to store and display your content as necessary to provide the service. You are responsible for the accuracy and legality of your content.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-slate-900">Sharing and Privacy</h2>
            <p className="text-slate-600 leading-relaxed">
              When you share a table with another user, they will be able to see the events within that table based on the permissions you set. You are responsible for managing who has access to your tables and can revoke access at any time.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-slate-900">Limitation of Liability</h2>
            <p className="text-slate-600 leading-relaxed">
              Gather is provided "as is" without warranties of any kind. We are not liable for any damages arising from your use of the service, including but not limited to missed appointments or scheduling conflicts.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-slate-900">Termination</h2>
            <p className="text-slate-600 leading-relaxed">
              We reserve the right to suspend or terminate your account if you violate these terms. You may also delete your account at any time through your account settings.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-slate-900">Changes to Terms</h2>
            <p className="text-slate-600 leading-relaxed">
              We may update these terms from time to time. We will notify you of significant changes. Continued use of the service after changes constitutes acceptance of the new terms.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-slate-900">Contact</h2>
            <p className="text-slate-600 leading-relaxed">
              If you have any questions about these Terms of Service, please contact us through the app.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
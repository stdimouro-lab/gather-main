import React from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="flex items-center gap-4 mb-8">
          <Link to="/settings">
            <Button variant="ghost" size="icon" className="rounded-full">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <h1 className="text-2xl font-semibold text-slate-900">
            Terms of Service
          </h1>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8 space-y-6 text-slate-600 leading-relaxed">
          <p>
            These Terms of Service govern your use of Gather. By creating an
            account or using the app, you agree to these terms.
          </p>

          <div>
            <h2 className="font-semibold text-slate-900 mb-2">
              Use of the Service
            </h2>
            <p>
              You agree to use Gather responsibly and only for lawful purposes.
              You may not misuse the service, interfere with its operation, or
              attempt to gain unauthorized access to data, accounts, or systems.
            </p>
          </div>

          <div>
            <h2 className="font-semibold text-slate-900 mb-2">
              Accounts
            </h2>
            <p>
              You are responsible for maintaining the security of your account
              and for the accuracy of the information you provide.
            </p>
          </div>

          <div>
            <h2 className="font-semibold text-slate-900 mb-2">
              Shared Calendars
            </h2>
            <p>
              Gather allows users to share calendars and scheduling information
              with others. You are responsible for the people you choose to
              invite and the information you choose to share.
            </p>
          </div>

          <div>
            <h2 className="font-semibold text-slate-900 mb-2">
              Availability
            </h2>
            <p>
              Gather is provided on an “as is” and “as available” basis without
              warranties of any kind. We do not guarantee uninterrupted or
              error-free service.
            </p>
          </div>

          <div>
            <h2 className="font-semibold text-slate-900 mb-2">
              Changes to the Service
            </h2>
            <p>
              We may update, improve, or remove features from Gather over time.
              We may also update these Terms of Service when needed.
            </p>
          </div>

          <div>
            <h2 className="font-semibold text-slate-900 mb-2">
              Termination
            </h2>
            <p>
              You may stop using Gather at any time. You may also delete your
              account from the Settings page.
            </p>
          </div>

          <div>
            <h2 className="font-semibold text-slate-900 mb-2">
              Contact
            </h2>
            <p>
              If you have questions about these Terms of Service, please contact
              us at:
            </p>
            <p className="mt-1 font-medium">support@gatherapp.me</p>
          </div>

          <p className="pt-4 text-slate-500 text-sm border-t border-slate-200">
            Effective Date: January 1, 2026
          </p>
        </div>
      </div>
    </div>
  );
}
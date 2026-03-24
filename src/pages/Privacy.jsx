import React from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default function PrivacyPage() {
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
            Privacy Policy
          </h1>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8 space-y-6 text-slate-600 leading-relaxed">
          <p>
            Gather is designed to help individuals and families organize their
            schedules. Protecting your privacy is important to us.
          </p>

          <div>
            <h2 className="font-semibold text-slate-900 mb-2">
              Information We Collect
            </h2>
            <p>
              Gather collects only the information necessary to operate the app,
              including:
            </p>
            <ul className="list-disc ml-6 mt-2 space-y-1">
              <li>Your email address used to create an account</li>
              <li>Calendar events you create</li>
              <li>Notes or shared calendar information you add</li>
            </ul>
          </div>

          <div>
            <h2 className="font-semibold text-slate-900 mb-2">
              How Your Data Is Used
            </h2>
            <p>
              Your data is used only to provide the Gather service, including
              displaying your calendars, syncing events, and enabling shared
              calendars with people you invite.
            </p>
          </div>

          <div>
            <h2 className="font-semibold text-slate-900 mb-2">
              Data Sharing
            </h2>
            <p>
              Gather does not sell, rent, or share your personal data with third
              parties. Your data is only visible to users you explicitly share
              calendars with.
            </p>
          </div>

          <div>
            <h2 className="font-semibold text-slate-900 mb-2">
              Data Deletion
            </h2>
            <p>
              You may delete your account at any time from the Settings page.
              Deleting your account will permanently remove your Gather data,
              including calendars, events, and notes you own.
            </p>
          </div>

          <div>
            <h2 className="font-semibold text-slate-900 mb-2">
              Contact
            </h2>
            <p>
              If you have questions about this Privacy Policy, please contact us
              at:
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
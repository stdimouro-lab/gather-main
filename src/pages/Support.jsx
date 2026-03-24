import React from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Mail, Bug, HelpCircle } from "lucide-react";

export default function SupportPage() {
  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex items-center gap-4 mb-8">
          <Link to="/settings">
            <Button variant="ghost" size="icon" className="rounded-full">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">Gather Support</h1>
            <p className="text-sm text-slate-500 mt-1">
              Help, bug reports, and contact information.
            </p>
          </div>
        </div>

        <div className="space-y-6">
          <section className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8">
            <p className="text-lg text-slate-700 leading-relaxed">
              Need help with Gather? We’re here to help with account issues,
              shared calendar problems, bugs, and general questions.
            </p>

            <div className="mt-6 bg-indigo-50 rounded-xl p-6 space-y-3">
              <p className="font-semibold text-slate-900">Contact Support</p>
              <a
                href="mailto:support@gatherapp.me"
                className="flex items-center gap-2 text-indigo-600 hover:text-indigo-700 transition-colors font-medium"
              >
                <Mail className="w-5 h-5" />
                support@gatherapp.me
              </a>
              <p className="text-sm text-slate-600">
                We typically respond within 1–2 business days.
              </p>
            </div>
          </section>

          <section className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8">
            <div className="flex items-center gap-2 mb-4">
              <HelpCircle className="w-5 h-5 text-indigo-600" />
              <h2 className="text-xl font-semibold text-slate-900">Common Help</h2>
            </div>

            <div className="space-y-4 text-slate-600">
              <div className="rounded-xl border bg-slate-50 p-4">
                <p className="font-medium text-slate-900">I can’t access a shared tab</p>
                <p className="text-sm mt-1">
                  Make sure you accepted the invite and are signed into the correct
                  email account.
                </p>
              </div>

              <div className="rounded-xl border bg-slate-50 p-4">
                <p className="font-medium text-slate-900">My event changes didn’t save</p>
                <p className="text-sm mt-1">
                  Try refreshing the page and checking your internet connection. If
                  the issue continues, contact support with details.
                </p>
              </div>

              <div className="rounded-xl border bg-slate-50 p-4">
                <p className="font-medium text-slate-900">I forgot which email I used</p>
                <p className="text-sm mt-1">
                  Contact support and include your name plus any email addresses you
                  may have used with Gather.
                </p>
              </div>
            </div>
          </section>

          <section className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8">
            <div className="flex items-center gap-2 mb-4">
              <Bug className="w-5 h-5 text-indigo-600" />
              <h2 className="text-xl font-semibold text-slate-900">Report a Bug</h2>
            </div>

            <p className="text-slate-600 mb-4">
              If something is broken, please email support and include:
            </p>

            <ul className="space-y-2 text-slate-600">
              <li className="flex items-start gap-2">
                <span className="text-indigo-600 mt-1">•</span>
                <span>A brief description of the problem</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-indigo-600 mt-1">•</span>
                <span>What you were trying to do</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-indigo-600 mt-1">•</span>
                <span>The device and browser you were using</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-indigo-600 mt-1">•</span>
                <span>Your account email if applicable</span>
              </li>
            </ul>
          </section>

          <div className="text-center text-sm text-slate-500 pt-2">
            Thank you for using Gather — where life meets.
          </div>
        </div>
      </div>
    </div>
  );
}
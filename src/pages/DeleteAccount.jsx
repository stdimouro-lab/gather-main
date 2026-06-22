import React from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { LEGAL } from "@/lib/legal";

export default function DeleteAccountPage() {
  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-3xl px-4 py-8">
        <div className="mb-8 flex items-center gap-4">
          <Link to="/login">
            <Button variant="ghost" size="icon" className="rounded-full">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">
              Delete Your Gather Account
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              {LEGAL.appName} · {LEGAL.operatorLabel}
            </p>
          </div>
        </div>

        <div className="space-y-6 rounded-2xl border border-slate-100 bg-white p-8 leading-relaxed text-slate-600 shadow-sm">
          <p>{LEGAL.appName} users can delete their account at any time.</p>

          <section>
            <h2 className="mb-2 font-semibold text-slate-900">
              In-App Account Deletion
            </h2>
            <ol className="ml-6 list-decimal space-y-1">
              <li>Sign in to {LEGAL.appName}.</li>
              <li>
                Open <strong>Settings</strong>.
              </li>
              <li>
                Select <strong>Delete Account</strong>.
              </li>
              <li>Follow the prompts to permanently delete your account.</li>
            </ol>
          </section>

          <section>
            <h2 className="mb-2 font-semibold text-slate-900">
              What Data Is Deleted
            </h2>
            <p>When an account is deleted, {LEGAL.appName} will delete:</p>
            <ul className="ml-6 mt-2 list-disc space-y-1">
              <li>Profile information</li>
              <li>Calendar events</li>
              <li>Notes</li>
              <li>Lists</li>
              <li>Memories and uploaded content</li>
              <li>Collaboration data associated with the account</li>
              <li>Authentication credentials</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-2 font-semibold text-slate-900">
              Data Retention
            </h2>
            <p>
              Certain records may be retained for a limited period when required
              for security investigations, fraud prevention, legal compliance, or
              financial recordkeeping.
            </p>
            <p className="mt-2">
              Any retained information is stored only for as long as necessary to
              satisfy those requirements.
            </p>
          </section>

          <section>
            <h2 className="mb-2 font-semibold text-slate-900">Need Help?</h2>
            <p>If you are unable to access your account, contact:</p>
            <p className="mt-2">
              Privacy:{" "}
              <a
                href={`mailto:${LEGAL.privacyEmail}`}
                className="font-medium text-[#6C63FF]"
              >
                {LEGAL.privacyEmail}
              </a>
              <br />
              Support:{" "}
              <a
                href={`mailto:${LEGAL.contactEmail}`}
                className="font-medium text-[#6C63FF]"
              >
                {LEGAL.contactEmail}
              </a>
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}

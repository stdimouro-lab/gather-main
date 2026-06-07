import React from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { LEGAL } from "@/lib/legal";

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-3xl px-4 py-8">
        <div className="mb-8 flex items-center gap-4">
          <Link to="/settings">
            <Button variant="ghost" size="icon" className="rounded-full">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">
              Privacy Policy
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              {LEGAL.appName} · {LEGAL.operatorLabel}
            </p>
          </div>
        </div>

        <div className="space-y-6 rounded-2xl border border-slate-100 bg-white p-8 leading-relaxed text-slate-600 shadow-sm">
          <p>
            {LEGAL.operatorLabel} (&quot;we,&quot; &quot;us&quot;) operates{" "}
            {LEGAL.appName}, a family calendar and life organization app available
            on the web, iOS, and Android. This Privacy Policy explains what we
            collect, how we use it, and the choices you have.
          </p>

          <section>
            <h2 className="mb-2 font-semibold text-slate-900">
              Information we collect
            </h2>
            <ul className="ml-6 list-disc space-y-1">
              <li>
                <strong>Account:</strong> email address, display name, timezone,
                and profile photo (optional)
              </li>
              <li>
                <strong>Family data you add:</strong> calendar events, notes,
                lists, memories (photos, captions), and people you share tables
                with
              </li>
              <li>
                <strong>Device:</strong> push notification tokens on mobile (if
                you enable notifications)
              </li>
              <li>
                <strong>Billing:</strong> subscription status via Apple App
                Store, Google Play, or Stripe (we do not store full payment card
                numbers)
              </li>
              <li>
                <strong>Usage:</strong> basic diagnostics needed to operate and
                secure the service
              </li>
            </ul>
          </section>

          <section>
            <h2 className="mb-2 font-semibold text-slate-900">
              How we use information
            </h2>
            <p>We use your information to:</p>
            <ul className="ml-6 mt-2 list-disc space-y-1">
              <li>Provide and sync calendars, notes, lists, and memories</li>
              <li>Enable sharing with people you invite to your tables</li>
              <li>Send optional reminders and account notifications</li>
              <li>Process subscriptions and support requests</li>
              <li>Improve reliability and prevent abuse</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-2 font-semibold text-slate-900">Sharing</h2>
            <p>
              We do <strong>not</strong> sell your personal information. Calendar
              and memory content is visible only to you and people you explicitly
              share tables with. We use service providers (for example Supabase
              for hosting and authentication, RevenueCat and Stripe for billing)
              who process data on our behalf under contractual obligations.
            </p>
          </section>

          <section>
            <h2 className="mb-2 font-semibold text-slate-900">
              Photos and memories
            </h2>
            <p>
              Photos and files you upload are stored to provide the Memories
              feature. Content linked to shared tables may be visible to
              collaborators on those tables according to your sharing settings.
            </p>
          </section>

          <section>
            <h2 className="mb-2 font-semibold text-slate-900">
              Children&apos;s privacy
            </h2>
            <p>
              {LEGAL.appName} is intended for parents and caregivers organizing
              family life. The service is not directed to children under{" "}
              {LEGAL.minimumAge}. We do not knowingly collect personal
              information from children under {LEGAL.minimumAge}. Contact us if
              you believe a child has provided personal information.
            </p>
          </section>

          <section>
            <h2 className="mb-2 font-semibold text-slate-900">Data retention</h2>
            <p>
              We retain your data while your account is active. When you delete
              your account from Settings, we delete or de-identify associated
              personal data within a reasonable period, except where retention is
              required by law or billing records.
            </p>
          </section>

          <section>
            <h2 className="mb-2 font-semibold text-slate-900">Your rights</h2>
            <p>
              Depending on where you live, you may have rights to access,
              correct, delete, or export your data. You can delete your account in
              Settings or contact us for help.
            </p>
          </section>

          <section>
            <h2 className="mb-2 font-semibold text-slate-900">Contact</h2>
            <p>
              Questions about this policy:
              <br />
              <a
                href={`mailto:${LEGAL.privacyEmail}`}
                className="font-medium text-[#6C63FF]"
              >
                {LEGAL.privacyEmail}
              </a>
              <br />
              General support:{" "}
              <a
                href={`mailto:${LEGAL.contactEmail}`}
                className="font-medium text-[#6C63FF]"
              >
                {LEGAL.contactEmail}
              </a>
            </p>
          </section>

          <p className="border-t border-slate-200 pt-4 text-sm text-slate-500">
            Effective date: {LEGAL.effectiveDate}
            <br />
            App: {LEGAL.appName} ({LEGAL.packageId})
            <br />
            Website:{" "}
            <a href={LEGAL.websiteUrl} className="text-[#6C63FF]">
              {LEGAL.websiteUrl}
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}

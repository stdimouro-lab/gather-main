import React from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { LEGAL } from "@/lib/legal";

export default function TermsPage() {
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
              Terms of Service
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              {LEGAL.appName} · {LEGAL.operatorLabel}
            </p>
          </div>
        </div>

        <div className="space-y-6 rounded-2xl border border-slate-100 bg-white p-8 leading-relaxed text-slate-600 shadow-sm">
          <p>
            {LEGAL.appName} is operated by {LEGAL.operatorLabel}. These Terms of
            Service (&quot;Terms&quot;) govern your use of {LEGAL.appName}. By
            creating an account or using {LEGAL.appName}, you agree to these
            Terms and our{" "}
            <Link to="/privacy" className="text-[#6C63FF]">
              Privacy Policy
            </Link>
            .
          </p>

          <section>
            <h2 className="mb-2 font-semibold text-slate-900">The service</h2>
            <p>
              {LEGAL.appName} helps families and households organize calendars,
              notes, lists, memories, and shared tables. Features may change as
              we improve the product.
            </p>
          </section>

          <section>
            <h2 className="mb-2 font-semibold text-slate-900">Your account</h2>
            <p>
              You are responsible for your account credentials and for activity
              under your account. Provide accurate information and notify us if
              you suspect unauthorized access.
            </p>
          </section>

          <section>
            <h2 className="mb-2 font-semibold text-slate-900">
              Shared tables and content
            </h2>
            <p>
              You choose who to invite to your tables and what information to
              share. You are responsible for invitations you send and content you
              upload, including photos and memories visible to collaborators.
            </p>
          </section>

          <section>
            <h2 className="mb-2 font-semibold text-slate-900">
              Subscriptions and billing
            </h2>
            <p>
              Paid plans may be purchased through the Apple App Store, Google
              Play, or our website (Stripe). Prices, renewal terms, and
              cancellation are governed by the store or payment provider you used.
              On mobile, manage subscriptions in your Apple ID or Google Play
              account settings.
            </p>
          </section>

          <section>
            <h2 className="mb-2 font-semibold text-slate-900">Acceptable use</h2>
            <p>You agree not to:</p>
            <ul className="ml-6 mt-2 list-disc space-y-1">
              <li>Use {LEGAL.appName} for unlawful purposes</li>
              <li>Upload harmful, abusive, or infringing content</li>
              <li>Attempt to access data or accounts without authorization</li>
              <li>Interfere with the operation or security of the service</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-2 font-semibold text-slate-900">Disclaimer</h2>
            <p>
              {LEGAL.appName} is provided &quot;as is&quot; and &quot;as
              available&quot; without warranties of any kind. We do not guarantee
              uninterrupted or error-free operation.
            </p>
          </section>

          <section>
            <h2 className="mb-2 font-semibold text-slate-900">
              Limitation of liability
            </h2>
            <p>
              To the fullest extent permitted by law, {LEGAL.operatorLabel} is
              not liable for indirect, incidental, or consequential damages
              arising from your use of {LEGAL.appName}. Our total liability for
              any claim is limited to the amount you paid us in the twelve months
              before the claim, or fifty U.S. dollars if you use the free plan.
            </p>
          </section>

          <section>
            <h2 className="mb-2 font-semibold text-slate-900">Termination</h2>
            <p>
              You may stop using {LEGAL.appName} at any time and delete your
              account from Settings. We may suspend or terminate access if you
              violate these Terms or if required for security or legal reasons.
            </p>
          </section>

          <section>
            <h2 className="mb-2 font-semibold text-slate-900">Changes</h2>
            <p>
              We may update these Terms or the service. Material changes will be
              posted in the app or on our website. Continued use after changes
              take effect constitutes acceptance.
            </p>
          </section>

          <section>
            <h2 className="mb-2 font-semibold text-slate-900">Contact</h2>
            <p>
              Questions about these Terms:
              <br />
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
            {LEGAL.operatorLabel} · {LEGAL.appName}
          </p>
        </div>
      </div>
    </div>
  );
}

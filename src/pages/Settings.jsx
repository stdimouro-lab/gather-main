import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Bell,
  CalendarDays,
  CreditCard,
  FileText,
  HelpCircle,
  Image,
  Lock,
  LogOut,
  Rocket,
  Shield,
  Sparkles,
  UserCircle,
  Users,
} from "lucide-react";
import DeleteAccountSection from "@/components/settings/DeleteAccountSection";
import UsageBar from "@/components/UsageBar";
import { useAuth } from "@/context/AuthProvider";
import { supabase } from "@/lib/supabase";
import useEntitlement from "@/hooks/useEntitlement";
import { restoreApplePurchases } from "@/lib/appleBillingBridge";
import { useToast } from "@/components/ui/use-toast";

const settingsSections = [
  {
    label: "Account",
    items: [
      { id: "profile", label: "Profile", icon: UserCircle },
      { id: "notifications", label: "Notifications", icon: Bell },
      { id: "privacy", label: "Privacy", icon: Lock },
      { id: "security", label: "Security", icon: Shield },
    ],
  },
  {
    label: "Workspace",
    items: [
      { id: "getting-started", label: "Getting Started", icon: Rocket },
      { id: "tables", label: "Tables", icon: CalendarDays },
      { id: "memories", label: "Memories", icon: Image },
    ],
  },
  {
    label: "Billing",
    items: [
      { id: "billing", label: "Plan & billing", icon: CreditCard },
      { id: "usage", label: "Usage", icon: Users },
    ],
  },
  {
    label: "More",
    items: [
      { id: "support", label: "Help & support", icon: HelpCircle },
      { id: "legal", label: "Legal", icon: FileText },
    ],
  },
];

function SettingNavItem({ item, activeSection, setActiveSection }) {
  const Icon = item.icon;

  return (
    <button
      type="button"
      onClick={() => setActiveSection(item.id)}
      className={`flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-[13px] transition ${
        activeSection === item.id
          ? "bg-[#EEEDFE] text-[#534AB7]"
          : "text-slate-500 hover:bg-slate-100 hover:text-slate-900"
      }`}
    >
      <Icon className="h-4 w-4" />
      {item.label}
    </button>
  );
}

function SettingsCard({ children }) {
  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
      {children}
    </div>
  );
}

function SettingsRow({ label, sub, right }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-slate-100 px-4 py-3 last:border-0">
      <div>
        <div className="text-[13px] font-medium text-slate-900">{label}</div>
        {sub ? <div className="mt-0.5 text-[11px] text-slate-500">{sub}</div> : null}
      </div>
      <div className="flex shrink-0 items-center gap-2">{right}</div>
    </div>
  );
}

function Toggle({ on = true }) {
  return (
    <div
      className={`relative h-5 w-9 rounded-full ${
        on ? "bg-[#6C63FF]" : "bg-slate-300"
      }`}
    >
      <div
        className={`absolute top-[3px] h-3.5 w-3.5 rounded-full bg-white transition ${
          on ? "left-[19px]" : "left-[3px]"
        }`}
      />
    </div>
  );
}

export default function Settings() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [activeSection, setActiveSection] = useState("profile");

  const {
    planTier,
    isComped,
    billingSource,
    seatLimit,
    seatsUsed,
    storageLimitMb,
    storageUsedMb,
  } = useEntitlement();

  const displayName =
    profile?.full_name ||
    user?.user_metadata?.full_name ||
    user?.user_metadata?.name ||
    user?.email?.split("@")[0] ||
    "Gather User";

  const initials =
    displayName
      .split(/[.\s_-]+/)
      .filter(Boolean)
      .map((part) => part[0])
      .join("")
      .toUpperCase()
      .slice(0, 2) || "G";

  const planLabel = isComped
    ? "Complimentary"
    : planTier
    ? `${planTier}`.replace("_", " ")
    : "Free";

  const storageUsedGb = Number(((storageUsedMb || 0) / 1024).toFixed(1));
  const storageLimitGb = Number(((storageLimitMb || 0) / 1024).toFixed(1));
  const storageUsageRatio =
    storageLimitMb > 0 ? (storageUsedMb || 0) / storageLimitMb : 0;
  const seatUsageRatio = seatLimit > 0 ? (seatsUsed || 0) / seatLimit : 0;

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/login", { replace: true });
  };

  return (
    <div className="flex min-h-screen bg-slate-100">
      <aside className="hidden w-[190px] shrink-0 border-r border-slate-200 bg-white px-2.5 py-5 md:block">
        {settingsSections.map((section) => (
          <div key={section.label} className="mb-3">
            <div className="px-2 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-400">
              {section.label}
            </div>

            <div className="space-y-1">
              {section.items.map((item) => (
                <SettingNavItem
                  key={item.id}
                  item={item}
                  activeSection={activeSection}
                  setActiveSection={setActiveSection}
                />
              ))}
            </div>
          </div>
        ))}

        <button
          type="button"
          onClick={handleSignOut}
          className="mt-4 flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-[13px] text-red-600 transition hover:bg-red-50"
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </button>
      </aside>

      <main className="min-w-0 flex-1 p-4 md:p-7">
        <div className="mx-auto max-w-4xl">
          <div className="mb-6">
            <h1 className="text-xl font-medium text-slate-900">Settings</h1>
            <p className="mt-1 text-[13px] text-slate-500">
              Manage your account, tables, billing, privacy, and Gather setup.
            </p>
          </div>

          <div className="space-y-6">
            <section id="profile">
              <h2 className="text-base font-medium text-slate-900">Profile</h2>
              <p className="mb-3 mt-1 text-[12px] text-slate-500">
                How you appear to others in Gather.
              </p>

              <SettingsCard>
                <SettingsRow
                  label="Display name"
                  sub="Shown to people you share tables with"
                  right={
                    <>
                      <span className="text-[12px] text-slate-500">
                        {displayName}
                      </span>
                      <button className="text-[12px] font-medium text-[#6C63FF]">
                        Edit
                      </button>
                    </>
                  }
                />
                <SettingsRow
                  label="Email address"
                  sub="Used for sign in and notifications"
                  right={
                    <>
                      <span className="text-[12px] text-slate-500">
                        {user?.email || "Loading..."}
                      </span>
                    </>
                  }
                />
                <SettingsRow
                  label="Profile photo"
                  sub="Visible to people in your circle"
                  right={
                    <>
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#EEEDFE] text-[11px] font-semibold text-[#534AB7]">
                        {initials}
                      </div>
                      <button className="text-[12px] font-medium text-[#6C63FF]">
                        Change
                      </button>
                    </>
                  }
                />
                <SettingsRow
                  label="Time zone"
                  sub="Used for event reminders and calendar times"
                  right={
                    <>
                      <span className="text-[12px] text-slate-500">
                        Eastern Time
                      </span>
                      <button className="text-[12px] font-medium text-[#6C63FF]">
                        Change
                      </button>
                    </>
                  }
                />
              </SettingsCard>
            </section>

            <section id="notifications">
              <h2 className="text-base font-medium text-slate-900">
                Notifications
              </h2>
              <p className="mb-3 mt-1 text-[12px] text-slate-500">
                Choose how and when Gather reaches you.
              </p>

              <SettingsCard>
                <SettingsRow
                  label="Event reminders"
                  sub="Alert before upcoming events"
                  right={
                    <>
                      <span className="text-[12px] text-slate-500">
                        30 min before
                      </span>
                      <Toggle on />
                    </>
                  }
                />
                <SettingsRow
                  label="Shared table activity"
                  sub="When someone adds or edits an event"
                  right={<Toggle on />}
                />
                <SettingsRow
                  label="Invite accepted"
                  sub="When someone joins your table"
                  right={<Toggle on />}
                />
                <SettingsRow
                  label="Smart suggestions"
                  sub="Conflict alerts and scheduling nudges"
                  right={<Toggle on />}
                />
                <SettingsRow
                  label="Memory added"
                  sub="When someone adds photos to a shared event"
                  right={<Toggle on={false} />}
                />
              </SettingsCard>
            </section>

            <section id="getting-started">
              <h2 className="text-base font-medium text-slate-900">
                Getting Started
              </h2>
              <p className="mb-3 mt-1 text-[12px] text-slate-500">
                Revisit setup and review how Gather works.
              </p>

              <div className="grid gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => navigate("/onboarding")}
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#6C63FF] px-4 py-3 text-[13px] font-medium text-white"
                >
                  <Sparkles className="h-4 w-4" />
                  Revisit onboarding
                </button>

                <Link
                  to="/support"
                  className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-3 text-[13px] font-medium text-slate-700 hover:bg-slate-50"
                >
                  <HelpCircle className="h-4 w-4" />
                  View support
                </Link>
              </div>
            </section>

            <section id="tables">
              <h2 className="text-base font-medium text-slate-900">Tables</h2>
              <p className="mb-3 mt-1 text-[12px] text-slate-500">
                Manage your tables and who has access.
              </p>

              <SettingsCard>
                <SettingsRow
                  label="Manage tables"
                  sub="Create, rename, delete, and share tables from Calendar"
                  right={
                    <button
                      onClick={() => navigate("/calendar")}
                      className="text-[12px] font-medium text-[#6C63FF]"
                    >
                      Open Calendar
                    </button>
                  }
                />
                <SettingsRow
                  label="People and permissions"
                  sub="Review people connected to your shared tables"
                  right={
                    <button
                      onClick={() => navigate("/team")}
                      className="text-[12px] font-medium text-[#6C63FF]"
                    >
                      Open People
                    </button>
                  }
                />
              </SettingsCard>
            </section>

            <section id="billing">
              <h2 className="text-base font-medium text-slate-900">
                Plan & billing
              </h2>
              <p className="mb-3 mt-1 text-[12px] text-slate-500">
                Your Gather plan, seats, storage, and purchases.
              </p>

              <div className="rounded-lg border border-slate-200 bg-white p-4">
                <div className="mb-4 flex items-start justify-between">
                  <div>
                    <div className="text-sm font-medium capitalize text-slate-900">
                      {planLabel} plan
                    </div>
                    <div className="mt-1 text-[12px] text-slate-500 capitalize">
                      Billing source: {billingSource || "none"}
                    </div>
                  </div>

                  <span className="rounded-full bg-[#EEEDFE] px-3 py-1 text-[11px] font-medium text-[#534AB7]">
                    Active
                  </span>
                </div>

                <div className="space-y-4">
                  <UsageBar
                    label="Storage"
                    used={storageUsedGb}
                    limit={storageLimitGb || 0.1}
                    unit="GB"
                  />

                  <UsageBar
                    label="Seats"
                    used={seatsUsed || 0}
                    limit={seatLimit || 1}
                  />
                </div>

                {storageUsageRatio >= 0.95 && (
                  <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                    Your storage is almost full. Upgrade soon to keep adding
                    memories and files.
                  </div>
                )}

                {storageUsageRatio >= 0.8 && storageUsageRatio < 0.95 && (
                  <div className="mt-4 rounded-lg border border-yellow-200 bg-yellow-50 p-3 text-sm text-yellow-700">
                    You’re getting close to your storage limit.
                  </div>
                )}

                {seatUsageRatio >= 1 && (
                  <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                    You’ve reached your seat limit for this plan.
                  </div>
                )}

                {seatUsageRatio >= 0.8 && seatUsageRatio < 1 && (
                  <div className="mt-4 rounded-lg border border-yellow-200 bg-yellow-50 p-3 text-sm text-yellow-700">
                    You’re getting close to your seat limit.
                  </div>
                )}

                <div className="mt-4 flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => navigate("/plans")}
                    className="inline-flex items-center gap-2 rounded-lg bg-[#6C63FF] px-4 py-2.5 text-[13px] font-medium text-white"
                  >
                    View plans
                  </button>

                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        await restoreApplePurchases();
                      } catch {
                        toast({
                          title: "Restore purchases coming soon",
                          description:
                            "Apple subscription restore is almost ready and will be available in an upcoming update.",
                        });
                      }
                    }}
                    className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-[13px] font-medium text-slate-700 hover:bg-slate-50"
                  >
                    Restore purchases
                  </button>
                </div>
              </div>
            </section>

            <section id="support">
              <h2 className="text-base font-medium text-slate-900">
                Help & support
              </h2>
              <p className="mb-3 mt-1 text-[12px] text-slate-500">
                Get help with Gather.
              </p>

              <div className="grid gap-3 sm:grid-cols-2">
                <Link
                  to="/support"
                  className="rounded-lg border border-slate-200 bg-white p-4 transition hover:bg-slate-50"
                >
                  <p className="text-sm font-medium text-slate-900">
                    Help & Support
                  </p>
                  <p className="mt-1 text-[12px] text-slate-500">
                    Get help or contact support.
                  </p>
                </Link>

                <Link
                  to="/support"
                  className="rounded-lg border border-slate-200 bg-white p-4 transition hover:bg-slate-50"
                >
                  <p className="text-sm font-medium text-slate-900">
                    Report a bug
                  </p>
                  <p className="mt-1 text-[12px] text-slate-500">
                    Let us know if something is broken.
                  </p>
                </Link>
              </div>
            </section>

            <section id="legal">
              <h2 className="text-base font-medium text-slate-900">Legal</h2>
              <p className="mb-3 mt-1 text-[12px] text-slate-500">
                Important policies and terms.
              </p>

              <div className="grid gap-3 sm:grid-cols-2">
                <Link
                  to="/privacy"
                  className="rounded-lg border border-slate-200 bg-white p-4 transition hover:bg-slate-50"
                >
                  <p className="text-sm font-medium text-slate-900">
                    Privacy Policy
                  </p>
                  <p className="mt-1 text-[12px] text-slate-500">
                    Read how Gather handles data.
                  </p>
                </Link>

                <Link
                  to="/terms"
                  className="rounded-lg border border-slate-200 bg-white p-4 transition hover:bg-slate-50"
                >
                  <p className="text-sm font-medium text-slate-900">
                    Terms of Service
                  </p>
                  <p className="mt-1 text-[12px] text-slate-500">
                    Review the rules for using Gather.
                  </p>
                </Link>
              </div>
            </section>

            <section id="danger">
              <DeleteAccountSection />
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}
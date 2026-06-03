import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Bell,
  CalendarDays,
  CreditCard,
  FileText,
  HelpCircle,
  Lock,
  LogOut,
  Rocket,
  Shield,
  Sparkles,
  UserCircle,
  Users,
} from "lucide-react";
import DeleteAccountSection from "@/components/settings/DeleteAccountSection";
import ProfileAvatar from "@/components/ProfileAvatar";
import UsageBar from "@/components/UsageBar";
import { useAuth } from "@/context/AuthProvider";
import { supabase } from "@/lib/supabase";
import useEntitlement from "@/hooks/useEntitlement";
import {
  getSharingAlmostFullMessage,
  getSharingLimitMessage,
} from "@/lib/planLimits";
import {
  openCustomerPortal,
  isNativeBillingEnvironment,
} from "@/lib/billing";
import { restoreApplePurchases } from "@/lib/appleBillingBridge";
import { useToast } from "@/components/ui/use-toast";
import {
  formatTimezoneLabel,
  getBrowserTimezone,
  readGatherPreferences,
  saveGatherPreferences,
  saveProfileName,
} from "@/lib/profileSettings";
import {
  getProfileAvatarUrl,
  removeProfileAvatar,
  uploadProfileAvatar,
} from "@/lib/profileAvatar";
const REMINDER_OPTIONS = [
  { value: 15, label: "15 min before" },
  { value: 30, label: "30 min before" },
  { value: 60, label: "1 hour before" },
];

const settingsSections = [
  {
    label: "Account",
    items: [
      { id: "profile", label: "Profile", icon: UserCircle },
      { id: "notifications", label: "Notifications", icon: Bell },
      { id: "security", label: "Security", icon: Shield },
    ],
  },
  {
    label: "Workspace",
    items: [
      { id: "getting-started", label: "Getting Started", icon: Rocket },
      { id: "tables", label: "Tables", icon: CalendarDays },
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
      { id: "danger", label: "Delete account", icon: Lock },
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

function Toggle({ on, onChange, disabled = false }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      disabled={disabled}
      onClick={() => onChange(!on)}
      className={`relative h-5 w-9 rounded-full transition disabled:opacity-50 ${
        on ? "bg-[#6C63FF]" : "bg-slate-300"
      }`}
    >
      <span
        className={`absolute top-[3px] h-3.5 w-3.5 rounded-full bg-white transition ${
          on ? "left-[19px]" : "left-[3px]"
        }`}
      />
    </button>
  );
}

export default function Settings() {
  const { user, profile, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [activeSection, setActiveSection] = useState("profile");
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPrefs, setSavingPrefs] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState("");
  const [editingTimezone, setEditingTimezone] = useState(false);
  const [timezoneDraft, setTimezoneDraft] = useState(getBrowserTimezone());
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const avatarInputRef = useRef(null);

  const prefs = useMemo(
    () => readGatherPreferences(user, profile),
    [user, profile]
  );

  const [notifications, setNotifications] = useState(prefs.notifications);
  const [timezone, setTimezone] = useState(prefs.timezone);

  useEffect(() => {
    setNotifications(prefs.notifications);
    setTimezone(prefs.timezone);
    setTimezoneDraft(prefs.timezone);
  }, [prefs]);

  const {
    planTier,
    isComped,
    billingSource,
    planStatus,
    hasPaidAccess,
    seatLimit,
    seatsUsed,
    collaboratorLimit,
    storageLimitMb,
    storageUsedMb,
    isLoading: loadingEntitlement,
    error: entitlementError,
  } = useEntitlement();

  const displayName =
    profile?.full_name ||
    profile?.display_name ||
    user?.user_metadata?.full_name ||
    user?.user_metadata?.name ||
    user?.email?.split("@")[0] ||
    "Gather User";

  const avatarUrl = getProfileAvatarUrl(profile);
  const hasAvatar = Boolean(avatarUrl);

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

  const planStatusLabel = (() => {
    if (isComped) return "Complimentary";
    if (planStatus === "past_due") return "Past due";
    if (planStatus === "canceled" || planStatus === "unpaid") return "Canceled";
    if (hasPaidAccess) return "Active";
    return "Free";
  })();

  const planStatusBadgeClass =
    planStatus === "past_due"
      ? "bg-amber-50 text-amber-800"
      : hasPaidAccess || isComped
        ? "bg-[#EEEDFE] text-[#534AB7]"
        : "bg-slate-100 text-slate-600";

  const persistNotifications = async (next) => {
    setSavingPrefs(true);
    try {
      await saveGatherPreferences({
        user,
        notifications: next,
        timezone,
      });
      setNotifications(next);
      await refreshProfile?.();
      toast({ title: "Notification settings saved" });
    } catch (err) {
      toast({
        title: "Could not save settings",
        description: err?.message ?? "Try again.",
        variant: "destructive",
      });
    } finally {
      setSavingPrefs(false);
    }
  };

  const handleToggle = (key) => {
    const next = { ...notifications, [key]: !notifications[key] };
    setNotifications(next);
    persistNotifications(next);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/login", { replace: true });
  };

  const handleAvatarDbError = (err) => {
    const message = String(err?.message || "");
    if (
      message.includes("avatar_url") ||
      message.includes("column") ||
      message.includes("Bucket not found") ||
      message.includes("avatars")
    ) {
      toast({
        title: "Profile photos need setup",
        description:
          "Run migration 20260602130000_profile_avatars.sql in Supabase (adds avatar_url and avatars bucket).",
        variant: "destructive",
      });
      return true;
    }
    return false;
  };

  const handleAvatarFileChange = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !user?.id) return;

    setUploadingAvatar(true);
    try {
      await uploadProfileAvatar({ userId: user.id, file });
      await refreshProfile?.();
      toast({ title: "Profile photo updated" });
    } catch (err) {
      if (!handleAvatarDbError(err)) {
        toast({
          title: "Could not upload photo",
          description: err?.message ?? "Try again.",
          variant: "destructive",
        });
      }
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleRemoveAvatar = async () => {
    if (!user?.id) return;

    setUploadingAvatar(true);
    try {
      await removeProfileAvatar({
        userId: user.id,
        currentPath: profile?.avatar_url,
      });
      await refreshProfile?.();
      toast({ title: "Profile photo removed" });
    } catch (err) {
      if (!handleAvatarDbError(err)) {
        toast({
          title: "Could not remove photo",
          description: err?.message ?? "Try again.",
          variant: "destructive",
        });
      }
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleSaveName = async () => {
    setSavingProfile(true);
    try {
      const saved = await saveProfileName({
        userId: user.id,
        fullName: nameDraft,
      });
      await refreshProfile?.();
      setEditingName(false);
      toast({ title: "Profile updated", description: saved });
    } catch (err) {
      toast({
        title: "Could not update profile",
        description: err?.message ?? "Try again.",
        variant: "destructive",
      });
    } finally {
      setSavingProfile(false);
    }
  };

  const handleSaveTimezone = async () => {
    setSavingPrefs(true);
    try {
      await saveGatherPreferences({
        user,
        notifications,
        timezone: timezoneDraft,
      });
      setTimezone(timezoneDraft);
      setEditingTimezone(false);
      toast({ title: "Time zone saved" });
    } catch (err) {
      toast({
        title: "Could not save time zone",
        description: err?.message ?? "Try again.",
        variant: "destructive",
      });
    } finally {
      setSavingPrefs(false);
    }
  };

  const sectionTitle = settingsSections
    .flatMap((s) => s.items)
    .find((item) => item.id === activeSection)?.label;

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-slate-100 md:min-h-[calc(100dvh-4rem)] md:flex-row">
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
              {sectionTitle ? sectionTitle : "Manage your Gather account"}
            </p>
          </div>

          {entitlementError?.message && (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
              Could not load plan details: {entitlementError.message}
            </div>
          )}

          <div className="md:hidden mb-4">
            <select
              value={activeSection}
              onChange={(e) => setActiveSection(e.target.value)}
              className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-[13px]"
            >
              {settingsSections.flatMap((section) =>
                section.items.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.label}
                  </option>
                ))
              )}
            </select>
          </div>

          <div className="space-y-6">
            {activeSection === "profile" && (
              <section>
                <h2 className="text-base font-medium text-slate-900">Profile</h2>
                <p className="mb-3 mt-1 text-[12px] text-slate-500">
                  How you appear to people you share tables with.
                </p>

                <SettingsCard>
                  <SettingsRow
                    label="Display name"
                    sub="Saved to your Gather profile"
                    right={
                      editingName ? (
                        <div className="flex items-center gap-2">
                          <input
                            value={nameDraft}
                            onChange={(e) => setNameDraft(e.target.value)}
                            className="w-36 rounded-md border border-slate-200 px-2 py-1 text-[12px]"
                          />
                          <button
                            type="button"
                            disabled={savingProfile}
                            onClick={handleSaveName}
                            className="text-[12px] font-medium text-[#6C63FF]"
                          >
                            Save
                          </button>
                        </div>
                      ) : (
                        <>
                          <span className="text-[12px] text-slate-500">
                            {displayName}
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              setNameDraft(displayName);
                              setEditingName(true);
                            }}
                            className="text-[12px] font-medium text-[#6C63FF]"
                          >
                            Edit
                          </button>
                        </>
                      )
                    }
                  />
                  <SettingsRow
                    label="Email address"
                    sub="Used for sign in"
                    right={
                      <span className="text-[12px] text-slate-500">
                        {user?.email || "—"}
                      </span>
                    }
                  />
                  <div className="border-b border-slate-100 px-4 py-4">
                    <div className="text-[13px] font-medium text-slate-900">
                      Profile photo
                    </div>
                    <p className="mt-0.5 text-[11px] text-slate-500">
                      JPEG, PNG, WebP, or GIF · max 2 MB
                    </p>

                    <div className="mt-3 flex flex-wrap items-center gap-4">
                      <ProfileAvatar
                        profile={profile}
                        user={user}
                        displayName={displayName}
                        className="h-16 w-16"
                        textClassName="text-[15px]"
                      />

                      <div className="flex flex-wrap gap-2">
                        <input
                          ref={avatarInputRef}
                          type="file"
                          accept="image/jpeg,image/png,image/webp,image/gif"
                          className="hidden"
                          onChange={handleAvatarFileChange}
                        />
                        <button
                          type="button"
                          disabled={uploadingAvatar}
                          onClick={() => avatarInputRef.current?.click()}
                          className="rounded-md bg-[#6C63FF] px-3 py-1.5 text-[12px] font-medium text-white disabled:opacity-50"
                        >
                          {uploadingAvatar
                            ? "Uploading..."
                            : hasAvatar
                              ? "Change photo"
                              : "Upload photo"}
                        </button>
                        {hasAvatar && (
                          <button
                            type="button"
                            disabled={uploadingAvatar}
                            onClick={handleRemoveAvatar}
                            className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-[12px] font-medium text-slate-600 disabled:opacity-50"
                          >
                            Remove
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                  <SettingsRow
                    label="Time zone"
                    sub="Used for event times and reminders"
                    right={
                      editingTimezone ? (
                        <div className="flex items-center gap-2">
                          <input
                            value={timezoneDraft}
                            onChange={(e) => setTimezoneDraft(e.target.value)}
                            className="w-40 rounded-md border border-slate-200 px-2 py-1 text-[12px]"
                            placeholder="America/New_York"
                          />
                          <button
                            type="button"
                            disabled={savingPrefs}
                            onClick={handleSaveTimezone}
                            className="text-[12px] font-medium text-[#6C63FF]"
                          >
                            Save
                          </button>
                        </div>
                      ) : (
                        <>
                          <span className="text-[12px] text-slate-500">
                            {formatTimezoneLabel(timezone)}
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              setTimezoneDraft(timezone);
                              setEditingTimezone(true);
                            }}
                            className="text-[12px] font-medium text-[#6C63FF]"
                          >
                            Change
                          </button>
                        </>
                      )
                    }
                  />
                </SettingsCard>
              </section>
            )}

            {activeSection === "notifications" && (
              <section>
                <h2 className="text-base font-medium text-slate-900">
                  Notifications
                </h2>
                <p className="mb-3 mt-1 text-[12px] text-slate-500">
                  Preferences are saved to your account.
                </p>

                <SettingsCard>
                  <SettingsRow
                    label="Event reminders"
                    sub="Alert before upcoming events"
                    right={
                      <div className="flex items-center gap-2">
                        <select
                          value={notifications.event_reminder_minutes}
                          disabled={savingPrefs || !notifications.event_reminders}
                          onChange={(e) => {
                            const next = {
                              ...notifications,
                              event_reminder_minutes: Number(e.target.value),
                            };
                            setNotifications(next);
                            persistNotifications(next);
                          }}
                          className="rounded-md border border-slate-200 bg-white px-2 py-1 text-[11px] text-slate-600"
                        >
                          {REMINDER_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                        <Toggle
                          on={notifications.event_reminders}
                          disabled={savingPrefs}
                          onChange={() => handleToggle("event_reminders")}
                        />
                      </div>
                    }
                  />
                  <SettingsRow
                    label="Shared table activity"
                    sub="When someone adds or edits an event"
                    right={
                      <Toggle
                        on={notifications.shared_table_activity}
                        disabled={savingPrefs}
                        onChange={() => handleToggle("shared_table_activity")}
                      />
                    }
                  />
                  <SettingsRow
                    label="Invite accepted"
                    sub="When someone joins your table"
                    right={
                      <Toggle
                        on={notifications.invite_accepted}
                        disabled={savingPrefs}
                        onChange={() => handleToggle("invite_accepted")}
                      />
                    }
                  />
                  <SettingsRow
                    label="Smart suggestions"
                    sub="Scheduling tips on your home screen"
                    right={
                      <Toggle
                        on={notifications.smart_suggestions}
                        disabled={savingPrefs}
                        onChange={() => handleToggle("smart_suggestions")}
                      />
                    }
                  />
                  <SettingsRow
                    label="Memory added"
                    sub="When someone adds photos to a shared event"
                    right={
                      <Toggle
                        on={notifications.memory_added}
                        disabled={savingPrefs}
                        onChange={() => handleToggle("memory_added")}
                      />
                    }
                  />
                  <SettingsRow
                    label="Weekly family digest"
                    sub="Sunday email: events, birthdays, tasks, and new memories (Family plan)"
                    right={
                      <Toggle
                        on={notifications.weekly_family_digest}
                        disabled
                        onChange={() =>
                          toast({
                            title: "Coming soon",
                            description:
                              "Weekly digest emails will be part of the Family plan.",
                          })
                        }
                      />
                    }
                  />
                </SettingsCard>
              </section>
            )}

            {activeSection === "security" && (
              <section>
                <h2 className="text-base font-medium text-slate-900">Security</h2>
                <p className="mb-3 mt-1 text-[12px] text-slate-500">
                  Password and sign-in options.
                </p>

                <SettingsCard>
                  <SettingsRow
                    label="Password"
                    sub="Change the password for this account"
                    right={
                      <button
                        type="button"
                        onClick={() => navigate("/forgot-password")}
                        className="text-[12px] font-medium text-[#6C63FF]"
                      >
                        Reset password
                      </button>
                    }
                  />
                  <SettingsRow
                    label="Sign out everywhere"
                    sub="End your current session on this device"
                    right={
                      <button
                        type="button"
                        onClick={handleSignOut}
                        className="text-[12px] font-medium text-red-600"
                      >
                        Sign out
                      </button>
                    }
                  />
                </SettingsCard>
              </section>
            )}

            {activeSection === "getting-started" && (
              <section>
                <h2 className="text-base font-medium text-slate-900">
                  Getting Started
                </h2>
                <p className="mb-3 mt-1 text-[12px] text-slate-500">
                  Revisit setup and learn how Gather works.
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
            )}

            {activeSection === "tables" && (
              <section>
                <h2 className="text-base font-medium text-slate-900">Tables</h2>
                <p className="mb-3 mt-1 text-[12px] text-slate-500">
                  Manage calendars and sharing from Calendar and People.
                </p>

                <SettingsCard>
                  <SettingsRow
                    label="Manage tables"
                    sub="Create, rename, delete, and share tables"
                    right={
                      <button
                        type="button"
                        onClick={() => navigate("/calendar")}
                        className="text-[12px] font-medium text-[#6C63FF]"
                      >
                        Open Calendar
                      </button>
                    }
                  />
                  <SettingsRow
                    label="People you share with"
                    sub="Review invites and access"
                    right={
                      <button
                        type="button"
                        onClick={() => navigate("/team")}
                        className="text-[12px] font-medium text-[#6C63FF]"
                      >
                        Open People
                      </button>
                    }
                  />
                  <SettingsRow
                    label="Memories"
                    sub="Photos and files from your events"
                    right={
                      <button
                        type="button"
                        onClick={() => navigate("/memories")}
                        className="text-[12px] font-medium text-[#6C63FF]"
                      >
                        Open Memories
                      </button>
                    }
                  />
                </SettingsCard>
              </section>
            )}

            {activeSection === "billing" && (
              <section>
                <h2 className="text-base font-medium text-slate-900">
                  Plan & billing
                </h2>
                <p className="mb-3 mt-1 text-[12px] text-slate-500">
                  Live plan data from your Gather account.
                </p>

                <div className="rounded-lg border border-slate-200 bg-white p-4">
                  {loadingEntitlement ? (
                    <p className="text-sm text-slate-500">Loading plan...</p>
                  ) : (
                    <>
                      <div className="mb-4 flex items-start justify-between">
                        <div>
                          <div className="text-sm font-medium capitalize text-slate-900">
                            {planLabel} plan
                          </div>
                          <div className="mt-1 text-[12px] capitalize text-slate-500">
                            Billing source: {billingSource || "none"}
                          </div>
                        </div>

                        <span
                          className={`rounded-full px-3 py-1 text-[11px] font-medium ${planStatusBadgeClass}`}
                        >
                          {planStatusLabel}
                        </span>
                      </div>

                      <div className="flex flex-wrap gap-3">
                        <button
                          type="button"
                          onClick={() => navigate("/plans")}
                          className="inline-flex items-center gap-2 rounded-lg bg-[#6C63FF] px-4 py-2.5 text-[13px] font-medium text-white"
                        >
                          View plans
                        </button>

                        {hasPaidAccess && billingSource === "stripe" && (
                          <button
                            type="button"
                            onClick={async () => {
                              try {
                                await openCustomerPortal();
                              } catch (err) {
                                toast({
                                  title: "Billing portal unavailable",
                                  description: err?.message ?? "Try again.",
                                  variant: "destructive",
                                });
                              }
                            }}
                            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-[13px] font-medium text-slate-700 hover:bg-slate-50"
                          >
                            Manage billing
                          </button>
                        )}

                        {isNativeBillingEnvironment() && (
                          <button
                            type="button"
                            onClick={async () => {
                              try {
                                await restoreApplePurchases();
                                toast({ title: "Purchases restored" });
                              } catch (err) {
                                toast({
                                  title: "Restore failed",
                                  description: err?.message ?? "Try again.",
                                  variant: "destructive",
                                });
                              }
                            }}
                            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-[13px] font-medium text-slate-700"
                          >
                            Restore purchases
                          </button>
                        )}
                      </div>
                    </>
                  )}
                </div>
              </section>
            )}

            {activeSection === "usage" && (
              <section>
                <h2 className="text-base font-medium text-slate-900">Usage</h2>
                <p className="mb-3 mt-1 text-[12px] text-slate-500">
                  Storage and sharing limits for your current plan.
                </p>

                <div className="rounded-lg border border-slate-200 bg-white p-4 space-y-4">
                  <UsageBar
                    label="Storage"
                    used={storageUsedGb}
                    limit={storageLimitGb || 0.1}
                    unit="GB"
                  />
                  <UsageBar
                    label="People you share with"
                    used={Math.max((seatsUsed || 1) - 1, 0)}
                    limit={collaboratorLimit || 2}
                  />

                  {storageUsageRatio >= 0.95 && (
                    <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                      Your storage is almost full. Upgrade to keep adding memories.
                    </div>
                  )}

                  {seatUsageRatio >= 1 && (
                    <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                      {getSharingLimitMessage(planTier, seatLimit)}
                    </div>
                  )}

                  {seatUsageRatio >= 0.8 && seatUsageRatio < 1 && (
                    <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-3 text-sm text-yellow-700">
                      {getSharingAlmostFullMessage(planTier, collaboratorLimit)}
                    </div>
                  )}
                </div>
              </section>
            )}

            {activeSection === "support" && (
              <section>
                <h2 className="text-base font-medium text-slate-900">
                  Help & support
                </h2>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Link
                    to="/support"
                    className="rounded-lg border border-slate-200 bg-white p-4 transition hover:bg-slate-50"
                  >
                    <p className="text-sm font-medium text-slate-900">
                      Help & Support
                    </p>
                    <p className="mt-1 text-[12px] text-slate-500">
                      Contact support or browse help topics.
                    </p>
                  </Link>
                </div>
              </section>
            )}

            {activeSection === "legal" && (
              <section>
                <h2 className="text-base font-medium text-slate-900">Legal</h2>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Link
                    to="/privacy"
                    className="rounded-lg border border-slate-200 bg-white p-4 transition hover:bg-slate-50"
                  >
                    <p className="text-sm font-medium text-slate-900">
                      Privacy Policy
                    </p>
                  </Link>
                  <Link
                    to="/terms"
                    className="rounded-lg border border-slate-200 bg-white p-4 transition hover:bg-slate-50"
                  >
                    <p className="text-sm font-medium text-slate-900">
                      Terms of Service
                    </p>
                  </Link>
                </div>
              </section>
            )}

            {activeSection === "danger" && (
              <section>
                <DeleteAccountSection />
              </section>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

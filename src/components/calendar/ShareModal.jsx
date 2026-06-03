import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { motion, AnimatePresence } from "framer-motion";
import { Share2, UserPlus, Trash2, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { getTabColors } from "./TabFilter";
import { toast } from "@/components/ui/use-toast";
import {
  getCollaboratorLimitForTier,
  getSharingLimitMessage,
  getSharingOverLimitMessage,
} from "@/lib/planLimits";

export default function ShareModal({
  isOpen,
  onClose,
  tab,
  shares = [],
  onInvite,
  onUpdateShare,
  onRemoveShare,
  planTier = "free",
  seatSummary = null,
}) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("viewer");
  const [isInviting, setIsInviting] = useState(false);

  const colors = tab ? getTabColors(tab.color) : getTabColors("indigo");

  const roleColors = {
    viewer: "bg-slate-100 text-slate-700",
    editor: "bg-blue-100 text-blue-700",
  };

  const getShareEmail = (share) =>
    share?.invited_email ||
    share?.shared_with_email ||
    share?.email ||
    "unknown@example.com";

  const getInitials = (value = "") => {
    const safe = String(value).trim();
    if (!safe) return "U";
    return safe.split("@")[0].slice(0, 2).toUpperCase();
  };

  const seatState = useMemo(() => {
    const collaboratorsUsed =
      typeof seatSummary?.collaboratorsUsed === "number"
        ? seatSummary.collaboratorsUsed
        : typeof seatSummary?.used === "number"
          ? Math.max(seatSummary.used - 1, 0)
          : null;

    const collaboratorLimit =
      typeof seatSummary?.collaboratorLimit === "number"
        ? seatSummary.collaboratorLimit
        : getCollaboratorLimitForTier(planTier);

    const seatsUsed =
      typeof seatSummary?.seatsUsed === "number"
        ? seatSummary.seatsUsed
        : null;

    const seatLimit =
      typeof seatSummary?.seatLimit === "number"
        ? seatSummary.seatLimit
        : null;

    if (collaboratorsUsed == null || collaboratorLimit == null) {
      return {
        hasSeatSummary: false,
        collaboratorsUsed: null,
        collaboratorLimit: null,
        seatLimitReached: false,
        overSeatLimit: false,
      };
    }

    const overSeatLimit =
      seatsUsed != null && seatLimit != null && seatsUsed > seatLimit;

    return {
      hasSeatSummary: true,
      collaboratorsUsed,
      collaboratorLimit,
      seatLimitReached: collaboratorsUsed >= collaboratorLimit,
      overSeatLimit,
    };
  }, [planTier, seatSummary]);

  const limitMessage = useMemo(() => {
    if (seatState.overSeatLimit) {
      return getSharingOverLimitMessage(planTier);
    }
    if (seatState.seatLimitReached) {
      return getSharingLimitMessage(
        planTier,
        (seatState.collaboratorLimit ?? 0) + 1
      );
    }
    return null;
  }, [planTier, seatState]);

  const inviteLocked =
    isInviting ||
    !email.trim() ||
    (seatState.hasSeatSummary && seatState.seatLimitReached);

  const handleInvite = async (e) => {
    e.preventDefault();

    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail) {
      toast({
        title: "Email required",
        description: "Enter an email address to invite someone.",
        variant: "destructive",
      });
      return;
    }

    if (seatState.hasSeatSummary && seatState.seatLimitReached && limitMessage) {
      toast({
        title: seatState.overSeatLimit
          ? "Too many people shared with"
          : "Sharing limit reached",
        description: limitMessage,
        variant: "destructive",
      });
      return;
    }

    try {
      setIsInviting(true);

      await onInvite(cleanEmail, role);

      toast({
        title: "Invite sent",
        description: `${cleanEmail} was invited.`,
      });

      setEmail("");
      setRole("viewer");
    } catch (err) {
      toast({
        title: "Invite failed",
        description: err?.message ?? "Something went wrong.",
        variant: "destructive",
      });
    } finally {
      setIsInviting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[520px] overflow-hidden p-0">
        <div className={cn("h-2", colors.bg)} />

        <DialogHeader className="px-6 pb-2 pt-4">
          <DialogTitle className="flex items-center gap-2 text-xl font-semibold text-slate-900">
            <Share2 className="h-5 w-5 text-slate-500" />
            Share "{tab?.name}" Tab
          </DialogTitle>
          <DialogDescription className="sr-only">
            Invite people to this table, manage roles, or remove access.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 px-6 pb-6">
          <div className="rounded-xl border border-blue-200 bg-blue-50 p-3">
            <p className="text-xs text-blue-700">
              Only this tab will be shared. Your plan lets you share with up to{" "}
              {seatState.collaboratorLimit ??
                getCollaboratorLimitForTier(planTier)}{" "}
              people — they can view or edit depending on permission.
            </p>
          </div>

          {seatState.hasSeatSummary && (
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs text-slate-700">
                People you share with: {seatState.collaboratorsUsed} /{" "}
                {seatState.collaboratorLimit}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                {planTier === "free"
                  ? "Free includes 3 tables and sharing with 2 people total across all your tables."
                  : "Need to share with more people? Upgrade to Family or Team."}
              </p>
            </div>
          )}

          {limitMessage && seatState.overSeatLimit && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-3">
              <div className="flex items-start gap-2">
                <AlertTriangle className="mt-0.5 h-4 w-4 text-red-600" />
                <div>
                    <p className="text-xs font-medium text-red-700">
                    Over your sharing limit
                  </p>
                  <p className="mt-1 text-xs text-red-600">{limitMessage}</p>
                  <Link
                    to="/plans"
                    className="mt-2 inline-block text-xs font-medium text-red-800 underline"
                  >
                    View plans
                  </Link>
                </div>
              </div>
            </div>
          )}

          {limitMessage &&
            !seatState.overSeatLimit &&
            seatState.seatLimitReached && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-3">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="mt-0.5 h-4 w-4 text-amber-600" />
                  <div>
                    <p className="text-xs font-medium text-amber-700">
                      You’ve reached your limit
                    </p>
                    <p className="mt-1 text-xs text-amber-600">{limitMessage}</p>
                    <Link
                      to="/plans"
                      className="mt-2 inline-block text-xs font-medium text-amber-800 underline"
                    >
                      Upgrade to share with more people
                    </Link>
                  </div>
                </div>
              </div>
            )}

          <form onSubmit={handleInvite} className="space-y-4">
            <div className="space-y-1">
              <Label className="text-xs font-medium text-slate-500">
                Invite by email
              </Label>

              <div className="flex flex-col gap-2 sm:flex-row">
                <Input
                  type="email"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="flex-1"
                  disabled={
                    isInviting ||
                    (seatState.hasSeatSummary && seatState.seatLimitReached)
                  }
                />

                <Select
                  value={role}
                  onValueChange={setRole}
                  disabled={
                    isInviting ||
                    (seatState.hasSeatSummary && seatState.seatLimitReached)
                  }
                >
                  <SelectTrigger className="w-full sm:w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="viewer">View only</SelectItem>
                    <SelectItem value="editor">Can edit</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <p className="text-xs text-slate-500">
                Access will appear when this person signs in with the same email
                address.
              </p>
            </div>

            <Button
              type="submit"
              className="w-full bg-indigo-600 hover:bg-indigo-700"
              disabled={inviteLocked}
            >
              <UserPlus className="mr-2 h-4 w-4" />
              {seatState.hasSeatSummary && seatState.overSeatLimit
                ? "Sharing limit exceeded"
                : seatState.hasSeatSummary && seatState.seatLimitReached
                  ? "Upgrade to share with more"
                  : isInviting
                    ? "Inviting..."
                    : "Send Invite"}
            </Button>
          </form>

          <div className="space-y-3 rounded-xl bg-slate-50 p-4">
            <p className="text-xs font-medium text-slate-500">Permission levels</p>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="space-y-1">
                <Badge className={roleColors.viewer}>Viewer</Badge>
                <p className="text-slate-500">Can see events</p>
              </div>

              <div className="space-y-1">
                <Badge className={roleColors.editor}>Editor</Badge>
                <p className="text-slate-500">Can add and edit events</p>
              </div>
            </div>

            <p className="border-t border-slate-200 pt-2 text-xs text-slate-400">
              Access can be updated or removed later.
            </p>
          </div>

          <div className="space-y-3">
            <Label className="text-xs font-medium text-slate-500">
              People with access
            </Label>

            {shares.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-500">
                No one has access yet. Invite someone above to collaborate.
              </div>
            ) : (
              <div className="space-y-2">
                <AnimatePresence>
                  {shares.map((share) => {
                    const shareEmail = getShareEmail(share);
                    const isPending =
                      !share.accepted || share.status === "pending";

                    return (
                      <motion.div
                        key={share.id}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-3 transition-all duration-200 hover:shadow-sm"
                      >
                        <div className="flex min-w-0 items-center gap-3">
                          <Avatar className="h-9 w-9">
                            <AvatarFallback className="bg-slate-100 text-xs font-medium text-slate-600">
                              {getInitials(shareEmail)}
                            </AvatarFallback>
                          </Avatar>

                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-slate-800">
                              {shareEmail}
                            </p>

                            <div className="mt-0.5 flex items-center gap-2">
                              {isPending ? (
                                <Badge className="border border-amber-200 bg-amber-100 px-2 py-0 text-[10px] text-amber-700">
                                  Pending
                                </Badge>
                              ) : (
                                <Badge className="border border-emerald-200 bg-emerald-100 px-2 py-0 text-[10px] text-emerald-700">
                                  Active
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex shrink-0 items-center gap-2">
                          <Select
                            value={share.role || "viewer"}
                            disabled={isPending}
                            onValueChange={(newRole) => {
                              onUpdateShare(share.id, newRole);

                              toast({
                                title: "Access updated",
                                description: `Now ${newRole}`,
                              });
                            }}
                          >
                            <SelectTrigger className="h-8 w-24 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="viewer">Viewer</SelectItem>
                              <SelectItem value="editor">Editor</SelectItem>
                            </SelectContent>
                          </Select>

                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-slate-400 hover:bg-red-50 hover:text-red-600"
                            onClick={async () => {
                              try {
                                await onRemoveShare(share.id);

                                toast({
                                  title: "Access removed",
                                  description: "User removed from this table.",
                                });
                              } catch (err) {
                                toast({
                                  title: "Remove failed",
                                  description:
                                    err?.message ?? "Something went wrong.",
                                  variant: "destructive",
                                });
                              }
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

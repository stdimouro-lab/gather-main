import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { motion, AnimatePresence } from "framer-motion";
import { Share2, UserPlus, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { getTabColors } from "./TabFilter";
import { toast } from "@/components/ui/use-toast";

export default function ShareModal({
  isOpen,
  onClose,
  tab,
  shares = [],
  onInvite,
  onUpdateShare,
  onRemoveShare,
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
      <DialogContent className="sm:max-w-[520px] p-0 overflow-hidden">
        <div className={cn("h-2", colors.bg)} />

        <DialogHeader className="px-6 pt-4 pb-2">
          <DialogTitle className="text-xl font-semibold text-slate-900 flex items-center gap-2">
            <Share2 className="w-5 h-5 text-slate-500" />
            Share "{tab?.name}" Tab
          </DialogTitle>
        </DialogHeader>

        <div className="px-6 pb-6 space-y-6">
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-3">
            <p className="text-xs text-blue-700">
              Only this tab will be shared. You can change or remove access at any time.
            </p>
          </div>

          <form onSubmit={handleInvite} className="space-y-4">
            <div className="space-y-1">
              <Label className="text-xs font-medium text-slate-500">
                Invite by email
              </Label>

              <div className="flex flex-col sm:flex-row gap-2">
                <Input
                  type="email"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="flex-1"
                />

                <Select value={role} onValueChange={setRole}>
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
      Access will appear when this person signs in with the same email address.
    </p>
  </div>

            <Button
              type="submit"
              className="w-full bg-indigo-600 hover:bg-indigo-700"
              disabled={!email.trim() || isInviting}
            >
              <UserPlus className="w-4 h-4 mr-2" />
              {isInviting ? "Inviting..." : "Send Invite"}
            </Button>
          </form>

          <div className="bg-slate-50 rounded-xl p-4 space-y-3">
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

            <p className="text-xs text-slate-400 pt-2 border-t border-slate-200">
              Access can be updated or removed later.
            </p>
          </div>

          <div className="space-y-3">
            <Label className="text-xs font-medium text-slate-500">
              People with access
            </Label>

            {shares.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-500">
                No one has been invited yet.
              </div>
            ) : (
              <div className="space-y-2">
                <AnimatePresence>
                  {shares.map((share) => {
                    const shareEmail = getShareEmail(share);
                    const isPending = !share.accepted || share.status === "pending";

                    return (
                      <motion.div
                        key={share.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        className="flex items-center justify-between gap-3 p-3 bg-white border border-slate-200 rounded-xl"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <Avatar className="h-9 w-9">
                            <AvatarFallback className="bg-slate-100 text-slate-600 text-xs font-medium">
                              {getInitials(shareEmail)}
                            </AvatarFallback>
                          </Avatar>

                          <div className="min-w-0">
                            <p className="text-sm font-medium text-slate-700 truncate">
                              {shareEmail}
                            </p>
                            {isPending && (
                              <p className="text-xs text-amber-600">Pending invite</p>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <Select
  value={share.role || "viewer"}
  disabled={isPending}
  onValueChange={(newRole) => {
    onUpdateShare(share.id, newRole);

    toast({
      title: "Access updated",
      description: `Role changed to ${newRole}.`,
    });
  }}
>
                            <SelectTrigger className="w-24 h-8 text-xs">
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
                            className="h-8 w-8 text-slate-400 hover:text-red-600 hover:bg-red-50"
                            onClick={async () => {
                              try {
                                await onRemoveShare(share.id);

                                toast({
                                  title: "Access removed",
                                  description: "User no longer has access to this tab.",
                                });
                              } catch (err) {
                                toast({
                                  title: "Remove failed",
                                  description: err?.message ?? "Something went wrong.",
                                  variant: "destructive",
                                });
                              }
                            }}
                          >
                            <Trash2 className="w-4 h-4" />
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
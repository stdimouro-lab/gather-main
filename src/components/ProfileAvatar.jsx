import { cn } from "@/lib/utils";
import { getProfileAvatarUrl } from "@/lib/profileAvatar";

export function getDisplayInitials(displayName = "") {
  return (
    displayName
      .split(/[.\s_-]+/)
      .filter(Boolean)
      .map((part) => part[0])
      .join("")
      .toUpperCase()
      .slice(0, 2) || "G"
  );
}

export default function ProfileAvatar({
  profile,
  user,
  displayName = "Gather User",
  className = "h-8 w-8",
  textClassName = "text-[11px]",
}) {
  const avatarUrl =
    getProfileAvatarUrl(profile) ||
    getProfileAvatarUrl(user?.user_metadata?.avatar_url);
  const initials = getDisplayInitials(displayName);

  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt=""
        className={cn("shrink-0 rounded-full object-cover", className)}
      />
    );
  }

  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full bg-[#EEEDFE] font-semibold text-[#534AB7]",
        className,
        textClassName
      )}
    >
      {initials}
    </div>
  );
}

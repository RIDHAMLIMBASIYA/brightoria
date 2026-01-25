import { useMemo } from "react";

import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { LiveClassRow, LiveClassStatus } from "@/components/live-classes/types";

type PublicProfile = {
  user_id: string;
  name: string | null;
  avatar_url: string | null;
};

function initials(name: string) {
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase()).join("") || "U";
}

function statusBadgeVariant(status: LiveClassStatus): "default" | "secondary" | "outline" {
  if (status === "live") return "default";
  if (status === "scheduled") return "secondary";
  return "outline";
}

export default function LiveClassListItem({
  liveClass,
  creator,
  onSelect,
}: {
  liveClass: LiveClassRow;
  creator?: PublicProfile;
  onSelect: () => void;
}) {
  const creatorName = useMemo(() => {
    const n = (creator?.name ?? "").trim();
    return n || "Unknown";
  }, [creator?.name]);

  return (
    <button
      type="button"
      onClick={onSelect}
      className="w-full text-left rounded-lg border border-border p-3 hover:bg-muted/40 transition"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-medium truncate">{liveClass.title}</p>

          <div className="mt-2 flex items-center gap-2">
            <Avatar className="h-6 w-6">
              <AvatarImage
                src={creator?.avatar_url ?? undefined}
                alt={creator?.name ? `${creator.name} avatar` : "Creator avatar"}
              />
              <AvatarFallback className="text-[10px]">{initials(creatorName)}</AvatarFallback>
            </Avatar>
            <p className="text-xs text-muted-foreground truncate">{creatorName}</p>
          </div>

          {liveClass.description ? (
            <p className="text-xs text-muted-foreground line-clamp-2 mt-2">{liveClass.description}</p>
          ) : null}
        </div>

        <Badge variant={statusBadgeVariant(liveClass.status)} className="shrink-0 capitalize">
          {liveClass.status}
        </Badge>
      </div>
    </button>
  );
}

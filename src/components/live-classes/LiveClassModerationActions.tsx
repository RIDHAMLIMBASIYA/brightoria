import { useMemo, useState } from "react";
import { z } from "zod";
import { ExternalLink, Pencil, Square, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import type { LiveClassRow } from "./types";
import { updateMeetingUrlSchema } from "./schemas";

type Props = {
  liveClass: LiveClassRow;
  onUpdated?: (patch: Partial<LiveClassRow>) => void;
  onDeleted?: () => void;
};

export default function LiveClassModerationActions({ liveClass, onUpdated, onDeleted }: Props) {
  const { user } = useAuth();

  const canModerate = useMemo(() => {
    if (!user) return false;
    return user.role === "admin" || user.id === liveClass.created_by;
  }, [user, liveClass.created_by]);

  const [editOpen, setEditOpen] = useState(false);
  const [meetingUrl, setMeetingUrl] = useState(liveClass.meeting_url ?? "");
  const [isSaving, setIsSaving] = useState(false);
  const [isEnding, setIsEnding] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const isExternal = liveClass.provider === "external";
  const canOpenExternal = isExternal && !!liveClass.meeting_url;

  const saveMeetingUrl = async () => {
    if (!canModerate) {
      toast.error("You don’t have permission to edit this class");
      return;
    }

    const parsed = updateMeetingUrlSchema.safeParse({ meetingUrl });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Invalid meeting URL");
      return;
    }

    setIsSaving(true);
    try {
      const { data, error } = await supabase
        .from("live_classes")
        .update({ meeting_url: parsed.data.meetingUrl })
        .eq("id", liveClass.id)
        .select("*")
        .maybeSingle();

      if (error) throw error;
      if (!data) throw new Error("Could not update meeting link");

      toast.success("Meeting link updated");
      onUpdated?.({ meeting_url: (data as any).meeting_url });
      setEditOpen(false);
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to update link");
    } finally {
      setIsSaving(false);
    }
  };

  const endClass = async () => {
    if (!canModerate) {
      toast.error("You don’t have permission to end this class");
      return;
    }
    if (liveClass.status === "ended") return;

    setIsEnding(true);
    try {
      const patch = {
        status: "ended" as const,
        ends_at: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from("live_classes")
        .update(patch)
        .eq("id", liveClass.id)
        .select("*")
        .maybeSingle();

      if (error) throw error;
      if (!data) throw new Error("Could not end class");

      toast.success("Class ended");
      onUpdated?.({ status: "ended", ends_at: (data as any).ends_at });
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to end class");
    } finally {
      setIsEnding(false);
    }
  };

  const deleteClass = async () => {
    if (!canModerate) {
      toast.error("You don’t have permission to delete this class");
      return;
    }

    setIsDeleting(true);
    try {
      const { error } = await supabase.from("live_classes").delete().eq("id", liveClass.id);
      if (error) throw error;
      toast.success("Class deleted");
      onDeleted?.();
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to delete class");
    } finally {
      setIsDeleting(false);
    }
  };

  if (!canModerate) {
    if (!canOpenExternal) return null;
    return (
      <Button
        variant="outline"
        size="sm"
        className="gap-2"
        onClick={() => window.open(liveClass.meeting_url!, "_blank", "noreferrer")}
      >
        <ExternalLink className="w-4 h-4" />
        Open in new tab
      </Button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      {canOpenExternal ? (
        <>
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={() => window.open(liveClass.meeting_url!, "_blank", "noreferrer")}
          >
            <ExternalLink className="w-4 h-4" />
            Open
          </Button>

          <Button variant="outline" size="sm" className="gap-2" onClick={() => setEditOpen(true)}>
            <Pencil className="w-4 h-4" />
            Edit link
          </Button>
        </>
      ) : null}

      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2" disabled={liveClass.status === "ended" || isEnding}>
            <Square className="w-4 h-4" />
            End
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>End this class?</AlertDialogTitle>
            <AlertDialogDescription>
              This will mark the class as ended for all students. You can still edit the meeting link later if needed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isEnding}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={endClass} disabled={isEnding}>
              {isEnding ? "Ending…" : "End class"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button variant="destructive" size="sm" className="gap-2" disabled={isDeleting}>
            <Trash2 className="w-4 h-4" />
            Delete
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this class?</AlertDialogTitle>
            <AlertDialogDescription>
              This action can’t be undone. The class will be removed for everyone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={deleteClass}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog
        open={editOpen}
        onOpenChange={(v) => {
          setEditOpen(v);
          if (v) setMeetingUrl(liveClass.meeting_url ?? "");
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit meeting link</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="lc-edit-url">Meeting URL</Label>
              <Input
                id="lc-edit-url"
                value={meetingUrl}
                onChange={(e) => setMeetingUrl(e.target.value)}
                placeholder="https://..."
              />
              <p className="text-xs text-muted-foreground">
                Use a full URL. Some providers block embedding; students can still use “Open in new tab”.
              </p>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setEditOpen(false)} disabled={isSaving}>
                Cancel
              </Button>
              <Button onClick={saveMeetingUrl} disabled={isSaving}>
                {isSaving ? "Saving…" : "Save"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

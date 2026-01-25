import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ExternalLink, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type PreviewType = "pdf" | "image" | "video" | "link";

type ResourcePreviewDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  /** Either a direct URL OR a storage object path from the private uploads bucket. */
  urlOrPath: string;
  type: PreviewType;
};

const isHttpUrl = (v: string) => /^https?:\/\//i.test(v.trim());

export function ResourcePreviewDialog({ open, onOpenChange, title, urlOrPath, type }: ResourcePreviewDialogProps) {
  const [resolvedUrl, setResolvedUrl] = useState<string | null>(null);
  const [isResolving, setIsResolving] = useState(false);

  const needsSignedUrl = useMemo(() => {
    // If it's not an http(s) url, treat it as an uploads bucket path.
    return !!urlOrPath && !isHttpUrl(urlOrPath);
  }, [urlOrPath]);

  useEffect(() => {
    let cancelled = false;

    const resolve = async () => {
      if (!open) return;
      setResolvedUrl(null);

      const raw = (urlOrPath ?? "").trim();
      if (!raw) return;

      if (!needsSignedUrl) {
        setResolvedUrl(raw);
        return;
      }

      setIsResolving(true);
      try {
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) throw sessionError;
        const token = sessionData.session?.access_token;
        if (!token) throw new Error("Not authenticated");

        const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-upload-signed-url`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ path: raw }),
        });

        const json = (await res.json().catch(() => null)) as { signedUrl?: string; error?: string } | null;
        if (!res.ok) throw new Error(json?.error || `Request failed (${res.status})`);
        if (!json?.signedUrl) throw new Error("No preview URL returned");

        if (!cancelled) setResolvedUrl(json.signedUrl);
      } catch (e: any) {
        toast.error(e?.message ?? "Failed to open file");
      } finally {
        if (!cancelled) setIsResolving(false);
      }
    };

    resolve();
    return () => {
      cancelled = true;
    };
  }, [open, urlOrPath, needsSignedUrl]);

  const openInNewTab = () => {
    if (!resolvedUrl) return;
    window.open(resolvedUrl, "_blank", "noreferrer");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl">
        <DialogHeader>
          <div className="flex items-start justify-between gap-3">
            <DialogTitle className="pr-2">{title}</DialogTitle>
            <Button variant="outline" size="sm" className="gap-2" onClick={openInNewTab} disabled={!resolvedUrl}>
              <ExternalLink className="w-4 h-4" />
              Open
            </Button>
          </div>
        </DialogHeader>

        <div className="rounded-lg border border-border bg-background overflow-hidden">
          {isResolving ? (
            <div className="flex items-center justify-center h-[60vh]">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : !resolvedUrl ? (
            <div className="flex items-center justify-center h-[60vh]">
              <p className="text-muted-foreground">No preview available.</p>
            </div>
          ) : type === "image" ? (
            <div className="flex items-center justify-center bg-muted/30">
              <img src={resolvedUrl} alt={title} className="max-h-[70vh] w-auto object-contain" />
            </div>
          ) : type === "video" ? (
            <video src={resolvedUrl} controls className="w-full max-h-[70vh] bg-black" />
          ) : type === "pdf" ? (
            <iframe title={title} src={resolvedUrl} className="w-full h-[70vh]" />
          ) : (
            <iframe title={title} src={resolvedUrl} className="w-full h-[70vh]" />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

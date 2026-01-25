import { useEffect, useMemo, useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, ExternalLink, Loader2 } from "lucide-react";
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
  const [displayUrl, setDisplayUrl] = useState<string | null>(null);
  const [isResolving, setIsResolving] = useState(false);
  const objectUrlRef = useRef<string | null>(null);

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

  // Some browsers (notably Chrome) may block embedding certain signed storage URLs in iframes.
  // To avoid that, fetch the file and preview via a local blob: URL for media types.
  useEffect(() => {
    if (!open) return;

    // Cleanup any previous blob URL
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }

    setDisplayUrl(null);

    const url = (resolvedUrl ?? "").trim();
    if (!url) return;

    const shouldUseBlob = type === "pdf" || type === "image" || type === "video";
    if (!shouldUseBlob) {
      setDisplayUrl(url);
      return;
    }

    const controller = new AbortController();
    const run = async () => {
      setIsResolving(true);
      try {
        const res = await fetch(url, { signal: controller.signal, credentials: "omit" });
        if (!res.ok) throw new Error(`Failed to load file (${res.status})`);
        const blob = await res.blob();
        const objectUrl = URL.createObjectURL(blob);
        objectUrlRef.current = objectUrl;
        setDisplayUrl(objectUrl);
      } catch (e: any) {
        if (e?.name === "AbortError") return;
        toast.error(e?.message ?? "Failed to load preview");
        // Fallback to direct URL (lets user use the Open button even if embed fails)
        setDisplayUrl(url);
      } finally {
        setIsResolving(false);
      }
    };

    run();
    return () => {
      controller.abort();
    };
  }, [open, resolvedUrl, type]);

  useEffect(() => {
    return () => {
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    };
  }, []);

  const openInNewTab = () => {
    if (!resolvedUrl) return;
    window.open(resolvedUrl, "_blank", "noreferrer");
  };

  const downloadFile = async () => {
    const url = (resolvedUrl ?? "").trim();
    if (!url) return;

    const ext =
      type === "pdf" ? "pdf" : type === "image" ? "png" : type === "video" ? "mp4" : "file";
    const safeBase = (title || "resource").replace(/[^a-z0-9\-_. ]/gi, "").trim() || "resource";
    const filename = safeBase.toLowerCase().endsWith(`.${ext}`) ? safeBase : `${safeBase}.${ext}`;

    try {
      const res = await fetch(url, { credentials: "omit" });
      if (!res.ok) throw new Error(`Download failed (${res.status})`);
      const blob = await res.blob();
      const objectUrl = URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = objectUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();

      // Let the click resolve before revoking.
      setTimeout(() => URL.revokeObjectURL(objectUrl), 250);
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to download file");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl">
        <DialogHeader>
          <div className="flex items-start justify-between gap-3">
            <DialogTitle className="pr-2">{title}</DialogTitle>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={downloadFile}
                disabled={!resolvedUrl || isResolving}
              >
                <Download className="w-4 h-4" />
                Download
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={openInNewTab}
                disabled={!resolvedUrl}
              >
                <ExternalLink className="w-4 h-4" />
                Open
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="rounded-lg border border-border bg-background overflow-hidden">
          {isResolving ? (
            <div className="flex items-center justify-center h-[60vh]">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : !displayUrl ? (
            <div className="flex items-center justify-center h-[60vh]">
              <p className="text-muted-foreground">No preview available.</p>
            </div>
          ) : type === "image" ? (
            <div className="flex items-center justify-center bg-muted/30">
              <img src={displayUrl} alt={title} className="max-h-[70vh] w-auto object-contain" />
            </div>
          ) : type === "video" ? (
            <video src={displayUrl} controls className="w-full max-h-[70vh] bg-black" />
          ) : type === "pdf" ? (
            <iframe title={title} src={displayUrl} className="w-full h-[70vh]" />
          ) : (
            <iframe title={title} src={displayUrl} className="w-full h-[70vh]" />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

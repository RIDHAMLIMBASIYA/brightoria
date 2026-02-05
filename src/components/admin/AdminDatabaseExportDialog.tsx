import { ReactNode } from "react";
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

type Props = {
  trigger: ReactNode;
};

/**
 * In-app helper dialog. The actual full DB export happens from Lovable Cloud Backend UI.
 * We intentionally do NOT try to generate dumps from the client for security reasons.
 */
export function AdminDatabaseExportDialog({ trigger }: Props) {
  const steps =
    "Open Backend → Database → Backup & Restore → Export / SQL dump (schema + data).";

  const copySteps = async () => {
    try {
      await navigator.clipboard.writeText(steps);
    } catch {
      // Ignore (clipboard may be blocked)
    }
  };

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>{trigger}</AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Download full database (SQL dump)</AlertDialogTitle>
          <AlertDialogDescription>
            For security and reliability, full database exports are downloaded from the
            Backend panel.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-3 text-sm">
          <ol className="list-decimal pl-5 space-y-2">
            <li>
              Open <span className="font-medium">Backend</span> (in the editor).
            </li>
            <li>
              Go to <span className="font-medium">Database</span>.
            </li>
            <li>
              Open <span className="font-medium">Backup &amp; Restore</span>.
            </li>
            <li>
              Choose <span className="font-medium">Export / SQL dump</span>.
            </li>
          </ol>

          <div className="rounded-lg border border-border bg-muted/30 p-3">
            <p className="text-muted-foreground">Quick copy:</p>
            <p className="mt-1 font-mono text-xs leading-relaxed">{steps}</p>
          </div>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel>Close</AlertDialogCancel>
          <AlertDialogAction onClick={copySteps}>Copy steps</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

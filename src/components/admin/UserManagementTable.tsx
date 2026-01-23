import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search } from "lucide-react";
import { toast } from "sonner";

type AdminUserRow = {
  id: string;
  name: string;
  email: string;
  createdAt: string;
};

type ListUsersResponse = {
  users: AdminUserRow[];
  page: number;
  pageSize: number;
  hasMore: boolean;
};

export function UserManagementTable() {
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize] = useState(50);
  const [rows, setRows] = useState<AdminUserRow[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const load = async (nextPage: number) => {
    setIsLoading(true);
    try {
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) throw sessionError;
      const token = sessionData.session?.access_token;
      if (!token) throw new Error("Not authenticated");

      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-list-users`;
      const res = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ page: nextPage, pageSize }),
      });

      const json = (await res.json().catch(() => null)) as ListUsersResponse | { error?: string } | null;
      if (!res.ok) {
        const message = (json as any)?.error || `Request failed (${res.status})`;
        throw new Error(message);
      }

      const payload = json as ListUsersResponse;
      setRows(payload?.users ?? []);
      setHasMore(!!payload?.hasMore);
      setPage(nextPage);
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to load users");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    load(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Realtime: when a new profile is created, refresh page 1.
  useEffect(() => {
    const channel = supabase
      .channel("admin-users-profiles")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "profiles" }, () => load(1))
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => r.name.toLowerCase().includes(q) || r.email.toLowerCase().includes(q));
  }, [rows, query]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search by name or email…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        <div className="flex gap-2">
          <Button variant="outline" onClick={() => load(1)} disabled={isLoading}>
            Refresh
          </Button>
        </div>
      </div>

      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="min-w-[260px]">User</TableHead>
              <TableHead className="min-w-[320px]">Email</TableHead>
              <TableHead className="w-[200px]">Created</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((u) => (
              <TableRow key={u.id}>
                <TableCell>
                  <div className="min-w-0">
                    <p className="font-medium truncate" title={u.name}>
                      {u.name}
                    </p>
                    <p className="text-xs text-muted-foreground truncate" title={u.id}>
                      {u.id}
                    </p>
                  </div>
                </TableCell>
                <TableCell>
                  <p className="truncate" title={u.email}>
                    {u.email}
                  </p>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {new Date(u.createdAt).toLocaleString()}
                </TableCell>
              </TableRow>
            ))}

            {!isLoading && filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={3} className="text-center text-muted-foreground py-10">
                  No users found.
                </TableCell>
              </TableRow>
            )}

            {isLoading && (
              <TableRow>
                <TableCell colSpan={3} className="text-center text-muted-foreground py-10">
                  Loading…
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between">
        <Button variant="outline" onClick={() => load(Math.max(1, page - 1))} disabled={isLoading || page <= 1}>
          Previous
        </Button>
        <p className="text-sm text-muted-foreground">Page {page}</p>
        <Button variant="outline" onClick={() => load(page + 1)} disabled={isLoading || !hasMore}>
          Next
        </Button>
      </div>
    </div>
  );
}

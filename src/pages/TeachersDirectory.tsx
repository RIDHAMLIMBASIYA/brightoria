import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useTeachersDirectory } from "@/hooks/useTeachersDirectory";

function initials(name: string) {
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase()).join("") || "T";
}

export default function TeachersDirectory() {
  const { data, isLoading, error } = useTeachersDirectory();
  const [q, setQ] = useState("");
  const [subject, setSubject] = useState<string>("all");

  const subjects = useMemo(() => {
    const set = new Set<string>();
    (data ?? []).forEach((t) => {
      const s = (t.subject ?? "").trim();
      if (s) set.add(s);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [data]);

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    return (data ?? []).filter((t) => {
      const matchesName = !query || t.name.toLowerCase().includes(query);
      const matchesSubject = subject === "all" || (t.subject ?? "") === subject;
      return matchesName && matchesSubject;
    });
  }, [data, q, subject]);

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-2xl md:text-3xl font-display font-bold text-foreground">Teachers Directory</h1>
        <p className="text-muted-foreground">Browse teachers and view their profiles.</p>
      </header>

      <section className="grid gap-3 md:grid-cols-3">
        <div className="md:col-span-2">
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by teacher name"
            aria-label="Search teachers"
          />
        </div>
        <Select value={subject} onValueChange={setSubject}>
          <SelectTrigger>
            <SelectValue placeholder="Filter by subject" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All subjects</SelectItem>
            {subjects.map((s) => (
              <SelectItem key={s} value={s}>
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </section>

      {isLoading ? (
        <div className="text-muted-foreground">Loading teachers…</div>
      ) : error ? (
        <div className="text-destructive">Failed to load teachers.</div>
      ) : filtered.length === 0 ? (
        <div className="text-muted-foreground">No teachers found.</div>
      ) : (
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((t) => (
            <Card key={t.id} className="overflow-hidden">
              <CardHeader className="space-y-3">
                <div className="flex items-start gap-3">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={t.avatarUrl ?? undefined} alt={`${t.name} avatar`} />
                    <AvatarFallback>{initials(t.name)}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <CardTitle className="text-base truncate">{t.name}</CardTitle>
                    <div className="mt-1 flex flex-wrap gap-2">
                      {t.subject ? <Badge variant="secondary">{t.subject}</Badge> : null}
                      {t.approvalStatus === "approved" ? (
                        <Badge variant="outline">Approved</Badge>
                      ) : (
                        <Badge variant="outline">Pending</Badge>
                      )}
                      {typeof t.experienceYears === "number" ? (
                        <Badge variant="outline">{t.experienceYears}+ yrs</Badge>
                      ) : null}
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="text-sm text-muted-foreground space-y-1">
                  {t.qualification ? <div className="truncate">{t.qualification}</div> : null}
                  {t.university ? <div className="truncate">{t.university}</div> : null}
                  {t.bio ? <div className="line-clamp-2">{t.bio}</div> : null}
                </div>
                <Button asChild className="w-full">
                  <Link to={`/teachers/${t.id}`}>View Profile</Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </section>
      )}
    </div>
  );
}

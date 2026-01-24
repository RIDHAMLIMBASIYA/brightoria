import { Link, useParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useTeacherProfile } from "@/hooks/useTeachersDirectory";
import { format } from "date-fns";

function initials(name: string) {
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase()).join("") || "T";
}

export default function TeacherProfile() {
  const { teacherId } = useParams();
  const { data, isLoading, error } = useTeacherProfile(String(teacherId ?? ""));

  if (isLoading) return <div className="text-muted-foreground">Loading profile…</div>;
  if (error || !data) return <div className="text-destructive">Teacher not found.</div>;

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-display font-bold text-foreground">Teacher Profile</h1>
          <p className="text-muted-foreground">Approved teacher details</p>
        </div>
        <Button asChild variant="outline">
          <Link to="/teachers">Back</Link>
        </Button>
      </header>

      <Card>
        <CardHeader className="space-y-4">
          <div className="flex items-start gap-4">
            <Avatar className="h-16 w-16">
              <AvatarImage src={data.avatarUrl ?? undefined} alt={`${data.name} avatar`} />
              <AvatarFallback>{initials(data.name)}</AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <CardTitle className="text-xl truncate">{data.name}</CardTitle>
              <div className="mt-2 flex flex-wrap gap-2">
                {data.subject ? <Badge variant="secondary">{data.subject}</Badge> : null}
                {data.approvalStatus === "approved" ? (
                  <Badge variant="outline">Approved</Badge>
                ) : (
                  <Badge variant="outline">Pending approval</Badge>
                )}
                {typeof data.experienceYears === "number" ? (
                  <Badge variant="outline">{data.experienceYears}+ yrs experience</Badge>
                ) : null}
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-1 md:col-span-2">
            <div className="text-sm text-muted-foreground">Email</div>
            <div className="font-medium text-foreground">{data.email ?? "—"}</div>
          </div>
          <div className="space-y-1">
            <div className="text-sm text-muted-foreground">Qualification</div>
            <div className="font-medium text-foreground">{data.qualification ?? "—"}</div>
          </div>
          <div className="space-y-1">
            <div className="text-sm text-muted-foreground">University</div>
            <div className="font-medium text-foreground">{data.university ?? "—"}</div>
          </div>
          <div className="space-y-1">
            <div className="text-sm text-muted-foreground">Joined</div>
            <div className="font-medium text-foreground">{format(new Date(data.joinedAt), "PPP")}</div>
          </div>
          <div className="space-y-1 md:col-span-2">
            <div className="text-sm text-muted-foreground">About</div>
            <div className="font-medium text-foreground whitespace-pre-wrap">{data.bio ?? "—"}</div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

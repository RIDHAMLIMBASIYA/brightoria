import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";

import { Download, Loader2, Pencil, RefreshCw } from "lucide-react";

type CourseRow = {
  id: string;
  title: string;
};

type AssignmentRow = {
  id: string;
  course_id: string;
  title: string;
  max_score: number;
};

type SubmissionRow = {
  id: string;
  assignment_id: string;
  student_id: string;
  submitted_at: string;
  filename: string | null;
  file_url: string | null;
  grade: number | null;
  feedback: string | null;
};

type ProfileRow = {
  user_id: string;
  name: string;
  avatar_url: string | null;
};

type SubmissionVM = SubmissionRow & {
  studentName: string;
  assignmentTitle: string;
  courseTitle: string;
  maxScore: number;
};

export default function TeacherSubmissions() {
  const { user } = useAuth();

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [rows, setRows] = useState<SubmissionVM[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [grade, setGrade] = useState<string>("");
  const [feedback, setFeedback] = useState<string>("");

  const active = useMemo(() => rows.find((r) => r.id === activeId) ?? null, [rows, activeId]);

  const load = async () => {
    if (!user) return;

    setIsLoading(true);
    try {
      // 1) Teacher courses
      const { data: courses, error: coursesError } = await supabase
        .from("courses")
        .select("id,title")
        .eq("teacher_id", user.id)
        .order("created_at", { ascending: false });

      if (coursesError) throw coursesError;
      const courseRows = (courses ?? []) as CourseRow[];
      const courseIds = courseRows.map((c) => c.id);
      const courseById = new Map(courseRows.map((c) => [c.id, c] as const));

      if (courseIds.length === 0) {
        setRows([]);
        return;
      }

      // 2) Assignments in those courses
      const { data: assignments, error: assignmentsError } = await supabase
        .from("assignments")
        .select("id,course_id,title,max_score")
        .in("course_id", courseIds)
        .order("created_at", { ascending: false });

      if (assignmentsError) throw assignmentsError;
      const assignmentRows = (assignments ?? []) as AssignmentRow[];
      const assignmentIds = assignmentRows.map((a) => a.id);
      const assignmentById = new Map(assignmentRows.map((a) => [a.id, a] as const));

      if (assignmentIds.length === 0) {
        setRows([]);
        return;
      }

      // 3) Submissions for those assignments
      const { data: submissions, error: submissionsError } = await supabase
        .from("assignment_submissions")
        .select("id,assignment_id,student_id,submitted_at,filename,file_url,grade,feedback")
        .in("assignment_id", assignmentIds)
        .order("submitted_at", { ascending: false });

      if (submissionsError) throw submissionsError;
      const submissionRows = (submissions ?? []) as SubmissionRow[];

      // 4) Student profiles
      const studentIds = Array.from(new Set(submissionRows.map((s) => s.student_id)));
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("user_id,name,avatar_url")
        .in("user_id", studentIds);
      if (profilesError) throw profilesError;
      const profileRows = (profiles ?? []) as ProfileRow[];
      const profileByUserId = new Map(profileRows.map((p) => [p.user_id, p] as const));

      const vm: SubmissionVM[] = submissionRows.map((s) => {
        const a = assignmentById.get(s.assignment_id);
        const c = a ? courseById.get(a.course_id) : undefined;
        const p = profileByUserId.get(s.student_id);

        return {
          ...s,
          studentName: p?.name ?? "Student",
          assignmentTitle: a?.title ?? "Assignment",
          courseTitle: c?.title ?? "Course",
          maxScore: a?.max_score ?? 100,
        };
      });

      setRows(vm);
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to load submissions");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  useEffect(() => {
    // Realtime: any insert/update/delete on submissions triggers reload.
    const channel = supabase
      .channel("teacher-submissions")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "assignment_submissions",
        },
        () => {
          load();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const openGradeDialog = (row: SubmissionVM) => {
    setActiveId(row.id);
    setGrade(row.grade == null ? "" : String(row.grade));
    setFeedback(row.feedback ?? "");
    setDialogOpen(true);
  };

  const saveGrade = async () => {
    if (!active) return;

    const parsedGrade = grade.trim() === "" ? null : Number(grade);
    if (parsedGrade != null && Number.isNaN(parsedGrade)) {
      toast.error("Grade must be a number");
      return;
    }
    if (parsedGrade != null && (parsedGrade < 0 || parsedGrade > active.maxScore)) {
      toast.error(`Grade must be between 0 and ${active.maxScore}`);
      return;
    }

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from("assignment_submissions")
        .update({
          grade: parsedGrade,
          feedback: feedback.trim() ? feedback.trim() : null,
        })
        .eq("id", active.id);

      if (error) throw error;
      toast.success("Saved");
      setDialogOpen(false);
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to save");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl md:text-3xl font-bold text-foreground">Submissions ✅</h1>
          <p className="text-muted-foreground mt-1">Review and grade student assignment submissions.</p>
        </div>
        <Button variant="outline" className="gap-2" onClick={load} disabled={isLoading}>
          <RefreshCw className={isLoading ? "w-4 h-4 animate-spin" : "w-4 h-4"} />
          Refresh
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : rows.length === 0 ? (
        <Card className="p-8 text-center">
          <h2 className="font-display font-semibold text-xl">No submissions yet</h2>
          <p className="text-muted-foreground mt-2">When students submit assignments, they will appear here.</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {rows.map((r) => (
            <Card key={r.id} className="p-5 hover-lift">
              <div className="flex flex-col md:flex-row md:items-center gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-display font-semibold truncate">{r.studentName}</p>
                    <Separator orientation="vertical" className="h-4" />
                    <p className="text-sm text-muted-foreground truncate">{r.courseTitle}</p>
                  </div>
                  <p className="text-sm mt-1 truncate">{r.assignmentTitle}</p>
                  <p className="text-xs text-muted-foreground mt-2">
                    Submitted {new Date(r.submitted_at).toLocaleString()}
                    {r.filename ? ` • ${r.filename}` : ""}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  {r.grade == null ? (
                    <Badge variant="warning">Needs review</Badge>
                  ) : (
                    <Badge variant="success">
                      {r.grade}/{r.maxScore}
                    </Badge>
                  )}

                  {r.file_url ? (
                    <Button asChild variant="outline" className="gap-2">
                      <a href={r.file_url} target="_blank" rel="noreferrer">
                        <Download className="w-4 h-4" />
                        File
                      </a>
                    </Button>
                  ) : null}

                  <Button variant="hero" className="gap-2" onClick={() => openGradeDialog(r)}>
                    <Pencil className="w-4 h-4" />
                    Grade
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Grade submission</DialogTitle>
          </DialogHeader>

          {active ? (
            <div className="space-y-4 mt-2">
              <div className="space-y-1">
                <p className="text-sm font-medium">{active.studentName}</p>
                <p className="text-xs text-muted-foreground">{active.courseTitle} • {active.assignmentTitle}</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="grade">Grade (0–{active.maxScore})</Label>
                <Input
                  id="grade"
                  inputMode="numeric"
                  placeholder={`e.g., ${active.maxScore}`}
                  value={grade}
                  onChange={(e) => setGrade(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="feedback">Feedback</Label>
                <Textarea
                  id="feedback"
                  rows={4}
                  placeholder="Write feedback for the student..."
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                />
              </div>

              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={isSaving}>
                  Cancel
                </Button>
                <Button variant="hero" onClick={saveGrade} disabled={isSaving}>
                  {isSaving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      Saving...
                    </>
                  ) : (
                    "Save"
                  )}
                </Button>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}

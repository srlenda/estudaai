import { NextResponse } from "next/server";
import { createClient } from "@libsql/client";
import { requireUserId } from "@/lib/auth";
import type { Subject, Task } from "@/lib/types";

function getClient() {
  const url = process.env.DATABASE_URL;
  const authToken = process.env.DATABASE_AUTH_TOKEN;
  if (!url) throw new Error("DATABASE_URL não definida");
  return createClient(authToken ? { url, authToken } : { url });
}

function isoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

interface TaskRow {
  id: string;
  title: string;
  description: string | null;
  date: string;
  startTime: string | null;
  endTime: string | null;
  priority: string;
  status: string;
  type: string;
  subjectId: string | null;
  createdAt: string;
  updatedAt: string;
  subject_id: string | null;
  subject_name: string | null;
  subject_code: string | null;
  subject_color: string | null;
  subject_professor: string | null;
  subject_description: string | null;
  subject_createdAt: string | null;
  subject_updatedAt: string | null;
}

interface SessionRow {
  id: string;
  subjectId: string | null;
  duration: number;
  date: string;
  type: string;
  notes: string | null;
  createdAt: string;
  subject_id: string | null;
  subject_name: string | null;
  subject_code: string | null;
  subject_color: string | null;
  subject_professor: string | null;
  subject_description: string | null;
  subject_createdAt: string | null;
  subject_updatedAt: string | null;
}

function mapTaskRow(r: TaskRow): Task {
  const subject: Subject | null =
    r.subject_id && r.subject_name && r.subject_color
      ? {
          id: r.subject_id,
          name: r.subject_name,
          code: r.subject_code,
          color: r.subject_color,
          professor: r.subject_professor,
          description: r.subject_description,
          createdAt: r.subject_createdAt as string,
          updatedAt: r.subject_updatedAt as string,
        }
      : null;

  return {
    id: r.id,
    title: r.title,
    description: r.description,
    date: r.date,
    startTime: r.startTime,
    endTime: r.endTime,
    priority: r.priority as Task["priority"],
    status: r.status as Task["status"],
    type: r.type as Task["type"],
    subjectId: r.subjectId,
    subject,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
  };
}

const TASK_SELECT = `t.id, t.title, t.description, t.date, t."startTime", t."endTime", t.priority, t.status, t.type, t."subjectId", t."createdAt", t."updatedAt",
  s.id AS subject_id, s.name AS subject_name, s.code AS subject_code, s.color AS subject_color, s.professor AS subject_professor, s.description AS subject_description, s."createdAt" AS subject_createdAt, s."updatedAt" AS subject_updatedAt`;

const SESSION_SELECT = `ss.id, ss."subjectId", ss.duration, ss.date, ss.type, ss.notes, ss."createdAt",
  s.id AS subject_id, s.name AS subject_name, s.code AS subject_code, s.color AS subject_color, s.professor AS subject_professor, s.description AS subject_description, s."createdAt" AS subject_createdAt, s."updatedAt" AS subject_updatedAt`;

interface SubjectRow {
  id: string;
  name: string;
  code: string | null;
  color: string;
  professor: string | null;
  description: string | null;
  createdAt: string;
  updatedAt: string;
}

export async function GET() {
  const userId = await requireUserId();
  if (!userId) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }
  try {
    const client = getClient();

    const [tasksRes, sessionsRes, subjectsRes, linksRes, notesRes] = await Promise.all([
      client.execute({
        sql: `SELECT ${TASK_SELECT} FROM "Task" t LEFT JOIN "Subject" s ON t."subjectId" = s.id WHERE t."userId" = ?`,
        args: [userId],
      }),
      client.execute({
        sql: `SELECT ${SESSION_SELECT} FROM "StudySession" ss LEFT JOIN "Subject" s ON ss."subjectId" = s.id WHERE ss."userId" = ?`,
        args: [userId],
      }),
      client.execute({
        sql: 'SELECT id, name, code, color, professor, description, "createdAt", "updatedAt" FROM "Subject" WHERE "userId" = ?',
        args: [userId],
      }),
      client.execute({
        sql: 'SELECT COUNT(*) as count FROM "Link" WHERE "userId" = ?',
        args: [userId],
      }),
      client.execute({
        sql: 'SELECT COUNT(*) as count FROM "Note" WHERE "userId" = ?',
        args: [userId],
      }),
    ]);

    const tasks = (tasksRes.rows as TaskRow[]).map(mapTaskRow);
    const sessions = (sessionsRes.rows as SessionRow[]).map((r) => ({
      id: r.id,
      subjectId: r.subjectId,
      duration: Number(r.duration),
      date: r.date,
      type: r.type,
      notes: r.notes,
      createdAt: r.createdAt,
      subject:
        r.subject_id && r.subject_name && r.subject_color
          ? {
              id: r.subject_id,
              name: r.subject_name,
              code: r.subject_code,
              color: r.subject_color,
              professor: r.subject_professor,
              description: r.subject_description,
              createdAt: r.subject_createdAt as string,
              updatedAt: r.subject_updatedAt as string,
            }
          : null,
    }));
    const subjects = subjectsRes.rows as SubjectRow[];

    const totalTasks = tasks.length;
    const completedTasks = tasks.filter((t) => t.status === "concluida").length;
    const pendingTasks = totalTasks - completedTasks;

    const tasksByType: Record<string, number> = {};
    for (const t of tasks) tasksByType[t.type] = (tasksByType[t.type] || 0) + 1;

    const tasksByPriority: Record<string, number> = {};
    for (const t of tasks) tasksByPriority[t.priority] = (tasksByPriority[t.priority] || 0) + 1;

    // tempo de estudo por disciplina
    const subjMap = new Map(subjects.map((s) => [s.id, s]));
    const studyBySubjMap = new Map<string, number>();
    for (const s of sessions) {
      if (!s.subjectId) continue;
      studyBySubjMap.set(
        s.subjectId,
        (studyBySubjMap.get(s.subjectId) || 0) + s.duration
      );
    }
    const studyBySubject = Array.from(studyBySubjMap.entries())
      .map(([subjectId, minutes]) => {
        const subj = subjMap.get(subjectId);
        return {
          subjectId,
          subjectName: subj?.name || "—",
          color: subj?.color || "#10b981",
          minutes,
        };
      })
      .sort((a, b) => b.minutes - a.minutes);

    const totalStudyMinutes = sessions.reduce((acc, s) => acc + s.duration, 0);

    const today = isoDate(new Date());

    // últimos 7 dias
    const last7: string[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      last7.push(isoDate(d));
    }

    // estudo nos últimos 7 dias
    const studyLast7Days = last7.map((date) => ({
      date,
      minutes: sessions
        .filter((s) => s.date === date)
        .reduce((acc, s) => acc + s.duration, 0),
    }));

    // tarefas criadas/concluídas nos últimos 7 dias
    const tasksLast7Days = last7.map((date) => ({
      date,
      created: tasks.filter((t) => {
        // createdAt vem como DATETIME ISO string do SQLite
        const created = new Date(t.createdAt);
        return isoDate(created) === date;
      }).length,
      completed: tasks.filter(
        (t) => t.status === "concluida" && t.date === date
      ).length,
    }));

    const todayTasks = tasks
      .filter((t) => t.date === today)
      .sort((a, b) => (a.startTime || "").localeCompare(b.startTime || ""));

    const upcomingTasks = tasks
      .filter((t) => t.date > today && t.status !== "concluida")
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(0, 6);

    const totalLinks = Number((linksRes.rows[0] as { count: number }).count || 0);
    const totalNotes = Number((notesRes.rows[0] as { count: number }).count || 0);

    return NextResponse.json({
      totalTasks,
      completedTasks,
      pendingTasks,
      totalStudyMinutes,
      totalSubjects: subjects.length,
      totalLinks,
      totalNotes,
      completionRate: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0,
      tasksByType,
      tasksByPriority,
      studyBySubject,
      studyLast7Days,
      tasksLast7Days,
      upcomingTasks,
      todayTasks,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json(
      { error: `Erro ao gerar estatísticas: ${msg}` },
      { status: 500 }
    );
  }
}

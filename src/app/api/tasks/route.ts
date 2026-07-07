import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@libsql/client";
import { requireUserId } from "@/lib/auth";
import type { Subject, Task } from "@/lib/types";

function getClient() {
  const url = process.env.DATABASE_URL;
  const authToken = process.env.DATABASE_AUTH_TOKEN;
  if (!url) throw new Error("DATABASE_URL não definida");
  return createClient(authToken ? { url, authToken } : { url });
}

function genId(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
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

function mapTask(r: TaskRow): Task {
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

export async function GET(req: NextRequest) {
  const userId = await requireUserId();
  if (!userId) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }
  try {
    const { searchParams } = new URL(req.url);
    const date = searchParams.get("date");
    const subjectId = searchParams.get("subjectId");
    const status = searchParams.get("status");
    const from = searchParams.get("from");
    const to = searchParams.get("to");

    const where: string[] = ['t."userId" = ?'];
    const args: unknown[] = [userId];

    if (date) {
      where.push("t.date = ?");
      args.push(date);
    }
    if (subjectId) {
      where.push('t."subjectId" = ?');
      args.push(subjectId);
    }
    if (status) {
      where.push("t.status = ?");
      args.push(status);
    }
    if (from) {
      where.push("t.date >= ?");
      args.push(from);
    }
    if (to) {
      where.push("t.date <= ?");
      args.push(to);
    }

    const client = getClient();
    const res = await client.execute({
      sql: `SELECT ${TASK_SELECT} FROM "Task" t LEFT JOIN "Subject" s ON t."subjectId" = s.id WHERE ${where.join(" AND ")} ORDER BY t.date ASC, t."startTime" ASC`,
      args,
    });

    const tasks = (res.rows as TaskRow[]).map(mapTask);
    return NextResponse.json(tasks);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json(
      { error: `Erro ao listar tarefas: ${msg}` },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const userId = await requireUserId();
  if (!userId) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }
  try {
    const body = await req.json();
    const { title, description, date, startTime, endTime, priority, status, type, subjectId } = body;
    if (!title || !date) {
      return NextResponse.json(
        { error: "Título e data são obrigatórios" },
        { status: 400 }
      );
    }

    const client = getClient();
    const id = genId("task");
    const now = new Date().toISOString();

    await client.execute({
      sql: `INSERT INTO "Task" (id, title, description, date, "startTime", "endTime", priority, status, type, "subjectId", "userId", "createdAt", "updatedAt") VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        id,
        title,
        description || null,
        date,
        startTime || null,
        endTime || null,
        priority || "media",
        status || "pendente",
        type || "atividade",
        subjectId || null,
        userId,
        now,
        now,
      ],
    });

    const res = await client.execute({
      sql: `SELECT ${TASK_SELECT} FROM "Task" t LEFT JOIN "Subject" s ON t."subjectId" = s.id WHERE t.id = ?`,
      args: [id],
    });

    if (res.rows.length === 0) {
      return NextResponse.json(
        { error: "Tarefa criada mas não encontrada" },
        { status: 500 }
      );
    }

    return NextResponse.json(mapTask(res.rows[0] as TaskRow), { status: 201 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json(
      { error: `Erro ao criar tarefa: ${msg}` },
      { status: 500 }
    );
  }
}

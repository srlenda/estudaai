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

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await requireUserId();
  if (!userId) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }
  const { id } = await params;

  try {
    const client = getClient();

    const existingRes = await client.execute({
      sql: 'SELECT id FROM "Task" WHERE id = ? AND "userId" = ?',
      args: [id, userId],
    });

    if (existingRes.rows.length === 0) {
      return NextResponse.json(
        { error: "Não encontrado" },
        { status: 404 }
      );
    }

    const body = await req.json();
    const {
      title,
      description,
      date,
      startTime,
      endTime,
      priority,
      status,
      type,
      subjectId,
    } = body;

    const sets: string[] = [];
    const args: unknown[] = [];
    if (title !== undefined) {
      sets.push("title = ?");
      args.push(title);
    }
    if (description !== undefined) {
      sets.push("description = ?");
      args.push(description);
    }
    if (date !== undefined) {
      sets.push("date = ?");
      args.push(date);
    }
    if (startTime !== undefined) {
      sets.push('"startTime" = ?');
      args.push(startTime);
    }
    if (endTime !== undefined) {
      sets.push('"endTime" = ?');
      args.push(endTime);
    }
    if (priority !== undefined) {
      sets.push("priority = ?");
      args.push(priority);
    }
    if (status !== undefined) {
      sets.push("status = ?");
      args.push(status);
    }
    if (type !== undefined) {
      sets.push("type = ?");
      args.push(type);
    }
    if (subjectId !== undefined) {
      sets.push('"subjectId" = ?');
      args.push(subjectId || null);
    }
    sets.push('"updatedAt" = ?');
    args.push(new Date().toISOString());
    args.push(id);

    await client.execute({
      sql: `UPDATE "Task" SET ${sets.join(", ")} WHERE id = ?`,
      args,
    });

    const res = await client.execute({
      sql: `SELECT ${TASK_SELECT} FROM "Task" t LEFT JOIN "Subject" s ON t."subjectId" = s.id WHERE t.id = ?`,
      args: [id],
    });

    if (res.rows.length === 0) {
      return NextResponse.json(
        { error: "Tarefa atualizada mas não encontrada" },
        { status: 500 }
      );
    }

    return NextResponse.json(mapTask(res.rows[0] as TaskRow));
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json(
      { error: `Erro ao atualizar tarefa: ${msg}` },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await requireUserId();
  if (!userId) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }
  const { id } = await params;

  try {
    const client = getClient();

    const existingRes = await client.execute({
      sql: 'SELECT id FROM "Task" WHERE id = ? AND "userId" = ?',
      args: [id, userId],
    });

    if (existingRes.rows.length === 0) {
      return NextResponse.json(
        { error: "Não encontrado" },
        { status: 404 }
      );
    }

    await client.execute({
      sql: 'DELETE FROM "Task" WHERE id = ?',
      args: [id],
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json(
      { error: `Erro ao excluir tarefa: ${msg}` },
      { status: 500 }
    );
  }
}

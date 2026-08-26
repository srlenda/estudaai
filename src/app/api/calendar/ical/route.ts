import { NextResponse } from "next/server";
import { createClient } from "@libsql/client";
import { requireUserId } from "@/lib/auth";

/**
 * GET /api/calendar/ical
 *
 * Gera um feed iCalendar (.ics) com TODAS as tarefas do usuário.
 * O usuário pode assinar este feed no Google Calendar / Outlook / Apple Calendar
 * para ver suas tarefas como eventos (one-way sync: EstudaAí → Calendar).
 *
 * Como é uma rota autenticada (cookie de sessão), o usuário precisa estar
 * logado no navegador para baixar. Para assinar no Google Calendar, o usuário
 * deve primeiro baixar o .ics e importar, OU usar o link "Add ao Google
 * Calendar" por tarefa (ver lib/recurrence.ts googleCalendarUrl).
 */

function escapeICS(text: string): string {
  return text
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\n/g, "\\n");
}

function formatDateICS(dateStr: string, timeStr?: string | null): string {
  // dateStr: YYYY-MM-DD, timeStr: HH:mm
  const [y, m, d] = dateStr.split("-").map(Number);
  if (timeStr) {
    const [h, min] = timeStr.split(":").map(Number);
    // Formato DATE-TIME local (sem Z) — o calendar interpreta como hora local
    return `${y}${String(m).padStart(2, "0")}${String(d).padStart(2, "0")}T${String(h).padStart(2, "0")}${String(min).padStart(2, "0")}00`;
  }
  // Evento de dia inteiro
  return `${y}${String(m).padStart(2, "0")}${String(d).padStart(2, "0")}`;
}

function addDaysICS(dateStr: string, n: number): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(y, (m || 1) - 1, d || 1);
  dt.setDate(dt.getDate() + n);
  const yy = dt.getFullYear();
  const mm = String(dt.getMonth() + 1).padStart(2, "0");
  const dd = String(dt.getDate()).padStart(2, "0");
  return `${yy}${mm}${dd}`;
}

export async function GET() {
  const userId = await requireUserId();
  if (!userId) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const url = process.env.DATABASE_URL;
  const authToken = process.env.DATABASE_AUTH_TOKEN;
  if (!url) {
    return NextResponse.json(
      { error: "Banco de dados não configurado." },
      { status: 500 }
    );
  }

  const client = createClient(authToken ? { url, authToken } : { url });

  // Busca todas as tarefas do usuário (com subject)
  const result = await client.execute({
    sql: `SELECT t.*, s.name as subject_name, s.color as subject_color
          FROM "Task" t
          LEFT JOIN "Subject" s ON t."subjectId" = s.id
          WHERE t."userId" = ?
          ORDER BY t.date ASC`,
    args: [userId],
  });

  const now = new Date()
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}/, "");

  let ics = `BEGIN:VCALENDAR\r\n`;
  ics += `VERSION:2.0\r\n`;
  ics += `PRODID:-//EstudaAi//Tarefas//PT-BR\r\n`;
  ics += `CALSCALE:GREGORIAN\r\n`;
  ics += `METHOD:PUBLISH\r\n`;
  ics += `X-WR-CALNAME:EstudaAí - Tarefas\r\n`;
  ics += `X-WR-TIMEZONE:America/Fortaleza\r\n`;

  for (const row of result.rows) {
    const r = row as {
      id: string;
      title: string;
      description: string | null;
      date: string;
      startTime: string | null;
      endTime: string | null;
      subject_name: string | null;
      subject_color: string | null;
    };

    ics += `BEGIN:VEVENT\r\n`;
    ics += `UID:${r.id}@estudaai\r\n`;
    ics += `DTSTAMP:${now}\r\n`;

    if (r.startTime) {
      ics += `DTSTART:${formatDateICS(r.date, r.startTime)}\r\n`;
      if (r.endTime) {
        ics += `DTEND:${formatDateICS(r.date, r.endTime)}\r\n`;
      } else {
        // default 1h
        const [y, m, d] = r.date.split("-").map(Number);
        const [sh, sm] = r.startTime.split(":").map(Number);
        const end = new Date(y, (m || 1) - 1, d || 1, (sh || 0) + 1, sm || 0);
        const ey = end.getFullYear();
        const em = String(end.getMonth() + 1).padStart(2, "0");
        const ed = String(end.getDate()).padStart(2, "0");
        const eh = String(end.getHours()).padStart(2, "0");
        const emi = String(end.getMinutes()).padStart(2, "0");
        ics += `DTEND:${ey}${em}${ed}T${eh}${emi}00\r\n`;
      }
    } else {
      // Evento de dia inteiro
      ics += `DTSTART;VALUE=DATE:${formatDateICS(r.date)}\r\n`;
      ics += `DTEND;VALUE=DATE:${addDaysICS(r.date, 1)}\r\n`;
    }

    ics += `SUMMARY:${escapeICS(r.title)}\r\n`;
    if (r.description) {
      ics += `DESCRIPTION:${escapeICS(r.description)}\r\n`;
    }
    if (r.subject_name) {
      ics += `CATEGORIES:${escapeICS(r.subject_name)}\r\n`;
    }
    ics += `END:VEVENT\r\n`;
  }

  ics += `END:VCALENDAR\r\n`;

  return new NextResponse(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'attachment; filename="estudaai-tarefas.ics"',
    },
  });
}

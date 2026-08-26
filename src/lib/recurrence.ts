import type { Task, Recurrence } from "@/lib/types";

/**
 * Expande tarefas recorrentes em ocorrências virtuais dentro de um intervalo.
 *
 * Tarefas com `recurrence === "none"` são retornadas como estão (1 ocorrência).
 * Tarefas com recurrence geram ocorrências "virtuais" — cópias da tarefa
 * original com `date` ajustado para cada ocorrência no intervalo.
 *
 * As ocorrências virtuais têm `id` modificado (sufixo `_YYYY-MM-DD`) para
 * que o React consiga diferenciar, mas NÃO são persistidas no banco.
 * Marcar uma ocorrência como concluída afeta a tarefa original (mesmo id base).
 */

function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

function addMonths(d: Date, n: number): Date {
  const r = new Date(d);
  r.setMonth(r.getMonth() + n);
  return r;
}

function addYears(d: Date, n: number): Date {
  const r = new Date(d);
  r.setFullYear(r.getFullYear() + n);
  return r;
}

function parseISO(iso: string): Date {
  // YYYY-MM-DD → Date local (sem timezone shift)
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

/**
 * Retorna todas as datas de ocorrência de uma tarefa recorrente
 * dentro do intervalo [from, to] (inclusive).
 */
function occurrenceDates(
  baseDate: string,
  recurrence: Recurrence,
  endDate: string | null,
  from: string,
  to: string
): string[] {
  if (recurrence === "none") return [baseDate];

  const start = parseISO(baseDate);
  const rangeStart = parseISO(from);
  const rangeEnd = parseISO(to);
  const recurrenceEnd = endDate ? parseISO(endDate) : null;

  // Se o início da recorrência é depois do fim do intervalo, sem ocorrências
  if (start > rangeEnd) return [];
  // Se a recorrência já terminou antes do intervalo, sem ocorrências
  if (recurrenceEnd && recurrenceEnd < rangeStart) return [];

  const dates: string[] = [];
  const effectiveEnd = recurrenceEnd && recurrenceEnd < rangeEnd ? recurrenceEnd : rangeEnd;
  let current = new Date(start);

  // Se a data base é antes do início do intervalo, avança até entrar no intervalo
  // (mas sem pular o limite de recorrência)
  const stepFn =
    recurrence === "daily"
      ? (d: Date) => addDays(d, 1)
      : recurrence === "weekly"
      ? (d: Date) => addDays(d, 7)
      : recurrence === "monthly"
      ? (d: Date) => addMonths(d, 1)
      : (d: Date) => addYears(d, 1); // yearly

  // Limite de segurança: 1000 iterações (evita loop infinito em casos patológicos)
  let iterations = 0;
  while (current <= effectiveEnd && iterations < 1000) {
    if (current >= rangeStart) {
      dates.push(formatISO(current));
    }
    current = stepFn(current);
    iterations++;
  }

  return dates;
}

function formatISO(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/**
 * Recebe uma lista de tarefas (do banco) e expande as recorrentes
 * em ocorrências virtuais dentro do intervalo [from, to].
 */
export function expandRecurringTasks(
  tasks: Task[],
  from: string,
  to: string
): Task[] {
  const result: Task[] = [];
  for (const task of tasks) {
    const dates = occurrenceDates(
      task.date,
      task.recurrence,
      task.recurrenceEndDate,
      from,
      to
    );
    for (const date of dates) {
      // A ocorrência virtual mantém o mesmo id base (para que concluir/editar
      // afete a tarefa original), mas com sufixo de data para o React key.
      const occurrence: Task = {
        ...task,
        id: dates.length > 1 ? `${task.id}__${date}` : task.id,
        date,
      };
      result.push(occurrence);
    }
  }
  return result;
}

/**
 * Extrai o ID real da tarefa a partir de um id de ocorrência virtual.
 * (Reverso do sufixo `__YYYY-MM-DD` adicionado em expandRecurringTasks.)
 */
export function getBaseTaskId(occurrenceId: string): string {
  const idx = occurrenceId.indexOf("__");
  return idx >= 0 ? occurrenceId.slice(0, idx) : occurrenceId;
}

/**
 * Gera um URL "Adicionar ao Google Calendar" para uma tarefa.
 * Usa o template oficial do Google Calendar event.
 */
export function googleCalendarUrl(task: Task): string {
  const [y, m, d] = task.date.split("-").map(Number);
  const baseDate = `${y}${String(m).padStart(2, "0")}${String(d).padStart(2, "0")}`;

  let startDt = baseDate;
  let endDt = baseDate;

  if (task.startTime) {
    const [sh, sm] = task.startTime.split(":").map(Number);
    startDt += `T${String(sh).padStart(2, "0")}${String(sm).padStart(2, "0")}00`;
    if (task.endTime) {
      const [eh, em] = task.endTime.split(":").map(Number);
      endDt += `T${String(eh).padStart(2, "0")}${String(em).padStart(2, "0")}00`;
    } else {
      // default 1h
      endDt += `T${String(sh + 1).padStart(2, "0")}${String(sm).padStart(2, "0")}00`;
    }
  }

  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: task.title,
    dates: `${startDt}/${endDt}`,
    details: task.description || "",
    ctz: Intl.DateTimeFormat().resolvedOptions().timeZone || "America/Fortaleza",
  });

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

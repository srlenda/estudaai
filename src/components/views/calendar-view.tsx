"use client";

import * as React from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Clock,
  CalendarDays,
  Trash2,
} from "lucide-react";

import { api } from "@/lib/api";
import { useAppStore } from "@/lib/store";
import {
  Task,
  Subject,
  Priority,
  TaskStatus,
  TaskType,
  PRIORITY_LABELS,
  PRIORITY_COLORS,
  STATUS_LABELS,
  TASK_TYPE_LABELS,
  TASK_TYPE_COLORS,
  todayISO,
  isoDate,
} from "@/lib/types";
import { cn } from "@/lib/utils";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";

// ---------- Constants & helpers ----------

const HOUR_START = 6; // first row at 06:00
const HOUR_END = 23; // last row at 23:00 (inclusive)
const HOUR_COUNT = HOUR_END - HOUR_START + 1; // 18 rows
const ROW_HEIGHT = 60; // px per hour row

const WEEKDAYS_PT = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const MONTHS_PT = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

function parseISO(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

function parseTimeToMin(t: string | null | undefined): number | null {
  if (!t) return null;
  const [h, m] = t.split(":").map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return null;
  return h * 60 + m;
}

function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function endOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0);
}

function addMonths(d: Date, n: number): Date {
  return new Date(d.getFullYear(), d.getMonth() + n, 1);
}

// Build a 6-week (42-day) grid starting from the Sunday of the week containing day 1.
function buildMonthGrid(month: Date): Date[] {
  const first = startOfMonth(month);
  const startOffset = first.getDay(); // 0 = Sunday
  const gridStart = new Date(first);
  gridStart.setDate(first.getDate() - startOffset);
  const days: Date[] = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(gridStart);
    d.setDate(gridStart.getDate() + i);
    days.push(d);
  }
  return days;
}

function priorityHex(p: Priority): string {
  switch (p) {
    case "baixa":
      return "#10b981";
    case "media":
      return "#f59e0b";
    case "alta":
      return "#ef4444";
  }
}

function blockColor(t: Task): string {
  return t.subject?.color || priorityHex(t.priority);
}

function hexToRgba(hex: string, alpha: number): string {
  let h = hex.replace("#", "");
  if (h.length === 3) {
    h = h
      .split("")
      .map((c) => c + c)
      .join("");
  }
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  if ([r, g, b].some(Number.isNaN)) return hex;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

// ---------- Form state ----------

interface TaskFormState {
  id?: string;
  title: string;
  description: string;
  date: string;
  startTime: string;
  endTime: string;
  priority: Priority;
  status: TaskStatus;
  type: TaskType;
  subjectId: string;
}

function emptyForm(date: string, startTime = ""): TaskFormState {
  return {
    title: "",
    description: "",
    date,
    startTime,
    endTime: "",
    priority: "media",
    status: "pendente",
    type: "atividade",
    subjectId: "",
  };
}

// ---------- Sub-components ----------

function TaskBlock({
  task,
  top,
  height,
  onEdit,
  onDelete,
  onToggle,
}: {
  task: Task;
  top: number;
  height: number;
  onEdit: () => void;
  onDelete: () => void;
  onToggle: () => void;
}) {
  const color = blockColor(task);
  const done = task.status === "concluida";
  const start = task.startTime || "";
  const end = task.endTime || "";
  const timeLabel = start && end ? `${start}–${end}` : start || "Sem hora";
  const compact = height < 44;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onEdit}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onEdit();
        }
      }}
      className={cn(
        "absolute left-1 right-1 z-10 rounded-md border bg-card shadow-sm cursor-pointer transition-shadow hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        done && "opacity-60",
      )}
      style={{
        top,
        height,
        borderLeftColor: color,
        borderLeftWidth: 4,
        backgroundColor: hexToRgba(color, 0.1),
      }}
      aria-label={`Atividade: ${task.title}${start ? `, ${timeLabel}` : ""}`}
    >
      <div className={cn("flex h-full gap-2 p-2", compact && "items-center")}>
        <span
          onClick={(e) => e.stopPropagation()}
          className="inline-flex shrink-0 mt-0.5"
        >
          <Checkbox
            checked={done}
            onCheckedChange={onToggle}
            aria-label={
              done ? "Desmarcar conclusão" : "Marcar como concluída"
            }
          />
        </span>
        <div className="min-w-0 flex-1">
          <div
            className={cn(
              "text-sm font-medium leading-tight truncate",
              done && "line-through",
            )}
          >
            {task.title}
          </div>
          {!compact && (
            <div className="mt-1 flex items-center gap-1.5 flex-wrap">
              <span className="text-[11px] text-muted-foreground">
                {timeLabel}
              </span>
              <Badge
                variant="outline"
                className={cn(
                  "h-4 px-1 text-[10px] border-transparent",
                  TASK_TYPE_COLORS[task.type],
                )}
              >
                {TASK_TYPE_LABELS[task.type]}
              </Badge>
              {task.subject && (
                <span className="text-[10px] text-muted-foreground truncate max-w-[80px]">
                  {task.subject.name}
                </span>
              )}
            </div>
          )}
          {compact && (
            <span className="ml-1 text-[11px] text-muted-foreground">
              {timeLabel}
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="shrink-0 rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
          aria-label="Excluir atividade"
        >
          <Trash2 className="size-3.5" />
        </button>
      </div>
    </div>
  );
}

function UntimedCard({
  task,
  onEdit,
  onDelete,
  onToggle,
}: {
  task: Task;
  onEdit: () => void;
  onDelete: () => void;
  onToggle: () => void;
}) {
  const color = blockColor(task);
  const done = task.status === "concluida";
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onEdit}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onEdit();
        }
      }}
      className={cn(
        "flex items-center gap-3 rounded-lg border bg-card p-2.5 shadow-sm transition-shadow hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        done && "opacity-60",
      )}
      style={{ borderLeftColor: color, borderLeftWidth: 4 }}
      aria-label={`Atividade: ${task.title}`}
    >
      <span
        onClick={(e) => e.stopPropagation()}
        className="inline-flex shrink-0"
      >
        <Checkbox
          checked={done}
          onCheckedChange={onToggle}
          aria-label={done ? "Desmarcar conclusão" : "Marcar como concluída"}
        />
      </span>
      <div className="min-w-0 flex-1">
        <div
          className={cn(
            "text-sm font-medium truncate",
            done && "line-through",
          )}
        >
          {task.title}
        </div>
        <div className="mt-0.5 flex items-center gap-1.5 flex-wrap">
          <Badge
            variant="outline"
            className={cn(
              "h-4 px-1 text-[10px] border-transparent",
              TASK_TYPE_COLORS[task.type],
            )}
          >
            {TASK_TYPE_LABELS[task.type]}
          </Badge>
          {task.subject && (
            <span className="text-[11px] text-muted-foreground truncate">
              {task.subject.name}
            </span>
          )}
        </div>
      </div>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onDelete();
        }}
        className="shrink-0 rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
        aria-label="Excluir atividade"
      >
        <Trash2 className="size-3.5" />
      </button>
    </div>
  );
}

function TaskDialog({
  open,
  onOpenChange,
  form,
  setForm,
  errors,
  subjects,
  isEdit,
  saving,
  onSave,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  form: TaskFormState;
  setForm: React.Dispatch<React.SetStateAction<TaskFormState>>;
  errors: { title?: string; date?: string; time?: string };
  subjects: Subject[];
  isEdit: boolean;
  saving: boolean;
  onSave: () => void;
}) {
  const update = (patch: Partial<TaskFormState>) =>
    setForm((f) => ({ ...f, ...patch }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[540px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarDays className="size-4 text-primary" />
            {isEdit ? "Editar atividade" : "Nova atividade"}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Altere os campos abaixo e salve."
              : "Preencha os campos abaixo. Título e data são obrigatórios."}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 max-h-[60vh] overflow-y-auto custom-scroll pr-1 -mr-1">
          <div className="grid gap-1.5">
            <Label htmlFor="tf-title">Título *</Label>
            <Input
              id="tf-title"
              value={form.title}
              onChange={(e) => update({ title: e.target.value })}
              placeholder="Ex.: Resolver lista de exercícios"
              aria-invalid={!!errors.title}
            />
            {errors.title && (
              <p className="text-xs text-destructive">{errors.title}</p>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="tf-date">Data *</Label>
              <Input
                id="tf-date"
                type="date"
                value={form.date}
                onChange={(e) => update({ date: e.target.value })}
                aria-invalid={!!errors.date}
              />
              {errors.date && (
                <p className="text-xs text-destructive">{errors.date}</p>
              )}
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="tf-start">Início</Label>
              <Input
                id="tf-start"
                type="time"
                value={form.startTime}
                onChange={(e) => update({ startTime: e.target.value })}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="tf-end">Fim</Label>
              <Input
                id="tf-end"
                type="time"
                value={form.endTime}
                onChange={(e) => update({ endTime: e.target.value })}
              />
            </div>
          </div>
          {errors.time && (
            <p className="text-xs text-destructive -mt-2">{errors.time}</p>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label>Tipo</Label>
              <Select
                value={form.type}
                onValueChange={(v) => update({ type: v as TaskType })}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(TASK_TYPE_LABELS) as TaskType[]).map((k) => (
                    <SelectItem key={k} value={k}>
                      {TASK_TYPE_LABELS[k]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label>Prioridade</Label>
              <Select
                value={form.priority}
                onValueChange={(v) => update({ priority: v as Priority })}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(PRIORITY_LABELS) as Priority[]).map((k) => (
                    <SelectItem key={k} value={k}>
                      <span className="inline-flex items-center gap-2">
                        <span
                          className={cn(
                            "inline-block size-2 rounded-full",
                            PRIORITY_COLORS[k].split(" ")[0],
                          )}
                        />
                        {PRIORITY_LABELS[k]}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label>Status</Label>
              <Select
                value={form.status}
                onValueChange={(v) => update({ status: v as TaskStatus })}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(STATUS_LABELS) as TaskStatus[]).map((k) => (
                    <SelectItem key={k} value={k}>
                      {STATUS_LABELS[k]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label>Disciplina</Label>
              <Select
                value={form.subjectId || "none"}
                onValueChange={(v) =>
                  update({ subjectId: v === "none" ? "" : v })
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhuma</SelectItem>
                  {subjects.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      <span className="inline-flex items-center gap-2">
                        <span
                          className="inline-block size-2 rounded-full"
                          style={{ backgroundColor: s.color }}
                        />
                        {s.name}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="tf-desc">Descrição</Label>
            <Textarea
              id="tf-desc"
              value={form.description}
              onChange={(e) => update({ description: e.target.value })}
              placeholder="Detalhes, links, observações..."
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline" type="button" className="min-h-11">
              Cancelar
            </Button>
          </DialogClose>
          <Button
            type="button"
            onClick={onSave}
            disabled={saving}
            className="min-h-11"
          >
            {saving
              ? "Salvando..."
              : isEdit
                ? "Salvar alterações"
                : "Criar atividade"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---------- Main component ----------

export function CalendarView() {
  const selectedDate = useAppStore((s) => s.selectedDate);
  const setSelectedDate = useAppStore((s) => s.setSelectedDate);
  const refreshKey = useAppStore((s) => s.refreshKey);
  const bumpRefresh = useAppStore((s) => s.bumpRefresh);

  const selectedDay = React.useMemo(() => parseISO(selectedDate), [selectedDate]);
  const [viewMonth, setViewMonth] = React.useState<Date>(
    () => new Date(selectedDay.getFullYear(), selectedDay.getMonth(), 1),
  );

  // ---- Data fetching ----
  const fromISO = isoDate(startOfMonth(viewMonth));
  const toISO = isoDate(endOfMonth(viewMonth));

  // Tasks for the visible month range (used for the dots on the grid).
  const { data: monthTasks = [], isLoading: monthLoading } = useQuery<Task[]>({
    queryKey: ["tasks", "month", fromISO, toISO, refreshKey],
    queryFn: () => api<Task[]>(`/api/tasks?from=${fromISO}&to=${toISO}`),
  });

  // Tasks for the currently selected day (used for the agenda on the right).
  // Separate query so the agenda stays correct even when the selected day is
  // outside the visible month (e.g. user navigated months).
  const { data: selectedDayTasks = [], isLoading: dayLoading } = useQuery<
    Task[]
  >({
    queryKey: ["tasks", "day", selectedDate, refreshKey],
    queryFn: () => api<Task[]>(`/api/tasks?date=${selectedDate}`),
    enabled: !!selectedDate,
  });

  const { data: subjects = [] } = useQuery<Subject[]>({
    queryKey: ["subjects", refreshKey],
    queryFn: () => api<Subject[]>("/api/subjects"),
  });

  // Group month tasks per day for the grid dots.
  const tasksByDay = React.useMemo(() => {
    const map = new Map<string, Task[]>();
    for (const t of monthTasks) {
      const arr = map.get(t.date);
      if (arr) arr.push(t);
      else map.set(t.date, [t]);
    }
    return map;
  }, [monthTasks]);

  // ---- Dialog state ----
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [form, setForm] = React.useState<TaskFormState>(() =>
    emptyForm(selectedDate),
  );
  const [errors, setErrors] = React.useState<{
    title?: string;
    date?: string;
    time?: string;
  }>({});

  const openCreate = (date?: string, startTime?: string) => {
    setForm(emptyForm(date ?? selectedDate, startTime ?? ""));
    setErrors({});
    setDialogOpen(true);
  };

  const openEdit = (task: Task) => {
    setForm({
      id: task.id,
      title: task.title,
      description: task.description ?? "",
      date: task.date,
      startTime: task.startTime ?? "",
      endTime: task.endTime ?? "",
      priority: task.priority,
      status: task.status,
      type: task.type,
      subjectId: task.subjectId ?? "",
    });
    setErrors({});
    setDialogOpen(true);
  };

  // ---- Mutations ----
  const saveMutation = useMutation({
    mutationFn: async (data: TaskFormState) => {
      const payload = {
        title: data.title.trim(),
        description: data.description.trim() || null,
        date: data.date,
        startTime: data.startTime || null,
        endTime: data.endTime || null,
        priority: data.priority,
        status: data.status,
        type: data.type,
        subjectId: data.subjectId || null,
      };
      if (data.id) {
        return api<Task>(`/api/tasks/${data.id}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        });
      }
      return api<Task>("/api/tasks", {
        method: "POST",
        body: JSON.stringify(payload),
      });
    },
    onSuccess: () => {
      bumpRefresh();
      toast.success(form.id ? "Atividade atualizada!" : "Atividade criada!");
      setDialogOpen(false);
    },
    onError: (e: Error) =>
      toast.error(e.message || "Erro ao salvar atividade"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      api<{ ok: boolean }>(`/api/tasks/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      bumpRefresh();
      toast.success("Atividade removida.");
    },
    onError: (e: Error) => toast.error(e.message || "Erro ao remover"),
  });

  const toggleStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: TaskStatus }) =>
      api<Task>(`/api/tasks/${id}`, {
        method: "PUT",
        body: JSON.stringify({ status }),
      }),
    onSuccess: () => bumpRefresh(),
    onError: (e: Error) =>
      toast.error(e.message || "Erro ao atualizar status"),
  });

  const handleSave = () => {
    const errs: { title?: string; date?: string; time?: string } = {};
    if (!form.title.trim()) errs.title = "Informe o título.";
    if (!form.date) errs.date = "Informe a data.";
    if (form.startTime && form.endTime && form.endTime < form.startTime) {
      errs.time = "O horário de fim deve ser depois do início.";
    }
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;
    saveMutation.mutate(form);
  };

  const handleToggle = (task: Task) => {
    toggleStatusMutation.mutate({
      id: task.id,
      status: task.status === "concluida" ? "pendente" : "concluida",
    });
  };

  // ---- Derived data for the day agenda ----
  const untimedTasks = selectedDayTasks.filter((t) => !t.startTime);
  const timedTasks = selectedDayTasks.filter((t) => !!t.startTime);

  const dayStartMin = HOUR_START * 60;
  const dayEndMin = (HOUR_END + 1) * 60; // 24:00
  const blocks = timedTasks
    .map((t) => {
      const startMin = parseTimeToMin(t.startTime);
      if (startMin == null) return null;
      const endMin = parseTimeToMin(t.endTime) ?? startMin + 60;
      const clampedStart = Math.max(startMin, dayStartMin);
      const clampedEnd = Math.min(Math.max(endMin, startMin + 15), dayEndMin);
      const top = ((clampedStart - dayStartMin) / 60) * ROW_HEIGHT;
      const height = Math.max(
        ((clampedEnd - clampedStart) / 60) * ROW_HEIGHT,
        28,
      );
      return { task: t, top, height };
    })
    .filter(Boolean) as { task: Task; top: number; height: number }[];

  // ---- Month grid & labels ----
  const grid = React.useMemo(() => buildMonthGrid(viewMonth), [viewMonth]);
  const today = todayISO();
  const monthLabel = `${MONTHS_PT[viewMonth.getMonth()]} de ${viewMonth.getFullYear()}`;

  const dayLabel = React.useMemo(() => {
    const d = parseISO(selectedDate);
    const weekday = d.toLocaleDateString("pt-BR", { weekday: "long" });
    const cap = weekday.charAt(0).toUpperCase() + weekday.slice(1);
    return `${cap}, ${d.getDate()} de ${MONTHS_PT[d.getMonth()]}`;
  }, [selectedDate]);

  // ---- Handlers ----
  const handleDayClick = (day: Date) => {
    const iso = isoDate(day);
    setSelectedDate(iso);
    if (
      day.getMonth() !== viewMonth.getMonth() ||
      day.getFullYear() !== viewMonth.getFullYear()
    ) {
      setViewMonth(new Date(day.getFullYear(), day.getMonth(), 1));
    }
  };

  const goPrevMonth = () => setViewMonth((m) => addMonths(m, -1));
  const goNextMonth = () => setViewMonth((m) => addMonths(m, 1));
  const goToday = () => {
    const t = new Date();
    setViewMonth(new Date(t.getFullYear(), t.getMonth(), 1));
    setSelectedDate(todayISO());
  };

  const agendaLoading = dayLoading && selectedDayTasks.length === 0;
  const agendaEmpty =
    !agendaLoading && selectedDayTasks.length === 0;
  const completedCount = selectedDayTasks.filter(
    (t) => t.status === "concluida",
  ).length;

  return (
    <div className="animate-fade-in grid lg:grid-cols-[1.2fr_1fr] gap-6">
      {/* ---------- LEFT: Month grid ---------- */}
      <section
        aria-label="Calendário mensal"
        className="rounded-xl border bg-card shadow-sm overflow-hidden flex flex-col"
      >
        {/* header / nav */}
        <div className="flex items-center justify-between gap-3 p-4 border-b">
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              onClick={goPrevMonth}
              aria-label="Mês anterior"
              className="size-10"
            >
              <ChevronLeft className="size-4" />
            </Button>
            <h2 className="text-base sm:text-lg font-semibold min-w-[170px] text-center px-2">
              {monthLabel}
            </h2>
            <Button
              variant="outline"
              size="icon"
              onClick={goNextMonth}
              aria-label="Próximo mês"
              className="size-10"
            >
              <ChevronRight className="size-4" />
            </Button>
          </div>
          <Button
            variant="secondary"
            size="sm"
            onClick={goToday}
            className="min-h-11"
          >
            Hoje
          </Button>
        </div>

        {/* weekday header */}
        <div className="grid grid-cols-7 px-3 pt-3">
          {WEEKDAYS_PT.map((w) => (
            <div
              key={w}
              className="text-center text-xs font-medium text-muted-foreground pb-2"
            >
              {w}
            </div>
          ))}
        </div>

        {/* grid */}
        <div
          className="grid grid-cols-7 gap-1 p-3 pt-0"
          role="grid"
          aria-busy={monthLoading}
        >
          {grid.map((day) => {
            const iso = isoDate(day);
            const inMonth = day.getMonth() === viewMonth.getMonth();
            const isToday = iso === today;
            const isSelected = iso === selectedDate;
            const dayTasks = tasksByDay.get(iso) ?? [];
            const dots = dayTasks.slice(0, 3).map(blockColor);
            const more = Math.max(0, dayTasks.length - 3);
            return (
              <button
                key={iso}
                type="button"
                onClick={() => handleDayClick(day)}
                aria-label={`${iso}${
                  dayTasks.length ? `, ${dayTasks.length} atividade(s)` : ""
                }`}
                aria-pressed={isSelected}
                className={cn(
                  "relative flex flex-col items-start gap-1 rounded-lg border border-transparent p-1.5 min-h-[60px] sm:min-h-[76px] text-left transition-colors",
                  "hover:bg-accent/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  !inMonth && "opacity-40",
                  isSelected && "border-primary ring-1 ring-primary bg-accent/40",
                )}
              >
                <span
                  className={cn(
                    "inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium",
                    isToday
                      ? "bg-primary text-primary-foreground"
                      : "text-foreground",
                  )}
                >
                  {day.getDate()}
                </span>
                {dayTasks.length > 0 && (
                  <div className="flex flex-wrap items-center gap-0.5 w-full">
                    {dots.map((c, i) => (
                      <span
                        key={i}
                        className="size-1.5 rounded-full"
                        style={{ backgroundColor: c }}
                      />
                    ))}
                    {more > 0 && (
                      <span className="text-[10px] leading-none text-muted-foreground">
                        +{more}
                      </span>
                    )}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </section>

      {/* ---------- RIGHT: Daily agenda ---------- */}
      <section
        aria-label="Agenda do dia"
        className="rounded-xl border bg-card shadow-sm flex flex-col"
      >
        {/* header */}
        <div className="flex items-start justify-between gap-3 p-4 border-b">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-semibold text-base sm:text-lg leading-tight">
                {dayLabel}
              </h3>
              {selectedDate === today && (
                <Badge
                  variant="secondary"
                  className="bg-accent text-accent-foreground"
                >
                  Hoje
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {selectedDayTasks.length === 0
                ? "Nenhuma atividade"
                : `${selectedDayTasks.length} atividade(s) · ${completedCount} concluída(s)`}
            </p>
          </div>
          <Button
            onClick={() => openCreate(selectedDate)}
            className="min-h-11 shrink-0"
          >
            <Plus className="size-4" /> Nova atividade
          </Button>
        </div>

        {/* scrollable body */}
        <div className="max-h-[70vh] overflow-y-auto custom-scroll p-4 flex-1">
          {agendaLoading ? (
            <div className="flex items-center justify-center h-32 text-sm text-muted-foreground">
              Carregando atividades…
            </div>
          ) : agendaEmpty ? (
            <div className="flex flex-col items-center justify-center text-center gap-3 py-12">
              <div className="rounded-full bg-accent/60 p-3">
                <CalendarDays className="size-6 text-accent-foreground" />
              </div>
              <p className="text-sm text-muted-foreground max-w-[280px]">
                Nenhuma atividade neste dia. Clique em um horário abaixo ou em
                &ldquo;Nova atividade&rdquo;.
              </p>
            </div>
          ) : (
            <div className="space-y-5">
              {/* untimed tasks */}
              {untimedTasks.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2 flex items-center gap-1.5">
                    <Clock className="size-3.5" /> Sem horário definido
                  </h4>
                  <div className="grid gap-2">
                    {untimedTasks.map((t) => (
                      <UntimedCard
                        key={t.id}
                        task={t}
                        onEdit={() => openEdit(t)}
                        onDelete={() => deleteMutation.mutate(t.id)}
                        onToggle={() => handleToggle(t)}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* hourly timeline */}
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2 flex items-center gap-1.5">
                  <CalendarDays className="size-3.5" /> Cronograma
                </h4>
                <div className="grid grid-cols-[44px_1fr] sm:grid-cols-[56px_1fr]">
                  {/* hour labels */}
                  <div aria-hidden="true">
                    {Array.from({ length: HOUR_COUNT }).map((_, i) => {
                      const h = HOUR_START + i;
                      return (
                        <div
                          key={h}
                          style={{ height: ROW_HEIGHT }}
                          className="flex items-start justify-end pr-2 pt-1 text-[10px] font-medium text-muted-foreground"
                        >
                          {String(h).padStart(2, "0")}:00
                        </div>
                      );
                    })}
                  </div>

                  {/* slot area */}
                  <div
                    className="relative"
                    style={{ height: HOUR_COUNT * ROW_HEIGHT }}
                  >
                    {/* hour slot rows (clickable to create) */}
                    {Array.from({ length: HOUR_COUNT }).map((_, i) => {
                      const h = HOUR_START + i;
                      return (
                        <button
                          key={h}
                          type="button"
                          onClick={() =>
                            openCreate(
                              selectedDate,
                              `${String(h).padStart(2, "0")}:00`,
                            )
                          }
                          style={{ top: i * ROW_HEIGHT, height: ROW_HEIGHT }}
                          className="absolute left-0 right-0 border-t border-border/60 first:border-t-0 hover:bg-accent/40 transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-ring"
                          aria-label={`Adicionar atividade às ${String(h).padStart(2, "0")}:00`}
                        />
                      );
                    })}
                    {/* task blocks */}
                    {blocks.map(({ task, top, height }) => (
                      <TaskBlock
                        key={task.id}
                        task={task}
                        top={top}
                        height={height}
                        onEdit={() => openEdit(task)}
                        onDelete={() => deleteMutation.mutate(task.id)}
                        onToggle={() => handleToggle(task)}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      <TaskDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        form={form}
        setForm={setForm}
        errors={errors}
        subjects={subjects}
        isEdit={!!form.id}
        saving={saveMutation.isPending}
        onSave={handleSave}
      />
    </div>
  );
}

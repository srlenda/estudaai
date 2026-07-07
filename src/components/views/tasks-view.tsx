"use client";

import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Plus,
  Pencil,
  Trash2,
  Check,
  Clock,
  Search,
  CalendarDays,
  ListChecks,
  X,
  CircleDashed,
  CircleDot,
  CircleCheckBig,
} from "lucide-react";

import { api } from "@/lib/api";
import { useAppStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import {
  type Task,
  type Subject,
  type Priority,
  type TaskStatus,
  type TaskType,
  PRIORITY_LABELS,
  PRIORITY_COLORS,
  STATUS_LABELS,
  TASK_TYPE_LABELS,
  TASK_TYPE_COLORS,
  todayISO,
} from "@/lib/types";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

// ---------- helpers ----------

function addDaysISO(iso: string, days: number): string {
  const d = new Date(iso + "T00:00:00");
  d.setDate(d.getDate() + days);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function formatPtBRDate(iso: string): string {
  const d = new Date(iso + "T00:00:00");
  const weekdayRaw = new Intl.DateTimeFormat("pt-BR", { weekday: "short" }).format(
    d
  );
  const weekday = weekdayRaw.replace(".", "");
  const day = d.getDate();
  const monthRaw = new Intl.DateTimeFormat("pt-BR", { month: "short" }).format(d);
  const month = monthRaw.replace(".", "");
  const wd = weekday.charAt(0).toUpperCase() + weekday.slice(1);
  return `${wd}, ${day} de ${month}`;
}

type GroupKey = "atrasadas" | "hoje" | "amanha" | "em_breve";

function getGroupKey(iso: string, today: string): GroupKey {
  if (iso < today) return "atrasadas";
  if (iso === today) return "hoje";
  if (iso === addDaysISO(today, 1)) return "amanha";
  return "em_breve";
}

const GROUP_META: Record<
  GroupKey,
  { label: string; order: number; tone: string; dot: string }
> = {
  atrasadas: {
    label: "Atrasadas",
    order: 0,
    tone: "text-rose-600 dark:text-rose-400",
    dot: "bg-rose-500",
  },
  hoje: {
    label: "Hoje",
    order: 1,
    tone: "text-emerald-600 dark:text-emerald-400",
    dot: "bg-emerald-500",
  },
  amanha: {
    label: "Amanhã",
    order: 2,
    tone: "text-amber-600 dark:text-amber-400",
    dot: "bg-amber-500",
  },
  em_breve: {
    label: "Em breve",
    order: 3,
    tone: "text-muted-foreground",
    dot: "bg-muted-foreground",
  },
};

// ---------- form types ----------

interface TaskFormValues {
  title: string;
  description: string;
  date: string;
  startTime: string;
  endTime: string;
  priority: Priority;
  status: TaskStatus;
  type: TaskType;
  subjectId: string; // "" = nenhuma
}

function taskToForm(t: Task): TaskFormValues {
  return {
    title: t.title,
    description: t.description ?? "",
    date: t.date,
    startTime: t.startTime ?? "",
    endTime: t.endTime ?? "",
    priority: t.priority,
    status: t.status,
    type: t.type,
    subjectId: t.subjectId ?? "",
  };
}

const emptyForm: TaskFormValues = {
  title: "",
  description: "",
  date: todayISO(),
  startTime: "",
  endTime: "",
  priority: "media",
  status: "pendente",
  type: "atividade",
  subjectId: "",
};

// ---------- Task Form Dialog ----------

function TaskFormDialog({
  open,
  onOpenChange,
  editing,
  subjects,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing: Task | null;
  subjects: Subject[];
}) {
  const qc = useQueryClient();
  const bumpRefresh = useAppStore((s) => s.bumpRefresh);
  const [values, setValues] = React.useState<TaskFormValues>(emptyForm);
  const [submitting, setSubmitting] = React.useState(false);

  React.useEffect(() => {
    if (open) {
      setValues(editing ? taskToForm(editing) : emptyForm);
    }
  }, [open, editing]);

  const isEdit = !!editing;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!values.title.trim()) {
      toast.error("Informe um título para a tarefa.");
      return;
    }
    if (!values.date) {
      toast.error("Informe a data da tarefa.");
      return;
    }
    setSubmitting(true);
    const body = {
      title: values.title.trim(),
      description: values.description.trim() || null,
      date: values.date,
      startTime: values.startTime || null,
      endTime: values.endTime || null,
      priority: values.priority,
      status: values.status,
      type: values.type,
      subjectId: values.subjectId || null,
    };
    try {
      if (isEdit && editing) {
        await api<Task>(`/api/tasks/${editing.id}`, {
          method: "PUT",
          body: JSON.stringify(body),
        });
        toast.success("Tarefa atualizada");
      } else {
        await api<Task>("/api/tasks", {
          method: "POST",
          body: JSON.stringify(body),
        });
        toast.success("Tarefa criada");
      }
      qc.invalidateQueries({ queryKey: ["tasks"] });
      bumpRefresh();
      onOpenChange(false);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Erro ao salvar tarefa"
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto custom-scroll">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar tarefa" : "Nova tarefa"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Atualize os detalhes da tarefa abaixo."
              : "Preencha os dados para criar uma nova tarefa."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="task-title">
              Título <span className="text-destructive">*</span>
            </Label>
            <Input
              id="task-title"
              value={values.title}
              onChange={(e) =>
                setValues((v) => ({ ...v, title: e.target.value }))
              }
              placeholder="Ex.: Resolver lista de exercícios"
              autoFocus
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-2">
              <Label htmlFor="task-date">
                Data <span className="text-destructive">*</span>
              </Label>
              <Input
                id="task-date"
                type="date"
                value={values.date}
                onChange={(e) =>
                  setValues((v) => ({ ...v, date: e.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="task-start">Início</Label>
              <Input
                id="task-start"
                type="time"
                value={values.startTime}
                onChange={(e) =>
                  setValues((v) => ({ ...v, startTime: e.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="task-end">Fim</Label>
              <Input
                id="task-end"
                type="time"
                value={values.endTime}
                onChange={(e) =>
                  setValues((v) => ({ ...v, endTime: e.target.value }))
                }
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select
                value={values.type}
                onValueChange={(v) =>
                  setValues((s) => ({ ...s, type: v as TaskType }))
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(TASK_TYPE_LABELS) as TaskType[]).map((t) => (
                    <SelectItem key={t} value={t}>
                      {TASK_TYPE_LABELS[t]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Prioridade</Label>
              <Select
                value={values.priority}
                onValueChange={(v) =>
                  setValues((s) => ({ ...s, priority: v as Priority }))
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(PRIORITY_LABELS) as Priority[]).map((p) => (
                    <SelectItem key={p} value={p}>
                      {PRIORITY_LABELS[p]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Status</Label>
              <Select
                value={values.status}
                onValueChange={(v) =>
                  setValues((s) => ({ ...s, status: v as TaskStatus }))
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(STATUS_LABELS) as TaskStatus[]).map((s) => (
                    <SelectItem key={s} value={s}>
                      {STATUS_LABELS[s]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Disciplina</Label>
              <Select
                value={values.subjectId || "none"}
                onValueChange={(v) =>
                  setValues((s) => ({
                    ...s,
                    subjectId: v === "none" ? "" : v,
                  }))
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Nenhuma" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhuma</SelectItem>
                  {subjects.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      <span className="flex items-center gap-2">
                        <span
                          className="h-2 w-2 rounded-full"
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

          <div className="space-y-2">
            <Label htmlFor="task-desc">Descrição</Label>
            <Textarea
              id="task-desc"
              value={values.description}
              onChange={(e) =>
                setValues((v) => ({ ...v, description: e.target.value }))
              }
              placeholder="Detalhes opcionais..."
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting
                ? "Salvando..."
                : isEdit
                ? "Salvar alterações"
                : "Criar tarefa"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ---------- Status indicator ----------

function StatusIndicator({ status }: { status: TaskStatus }) {
  if (status === "concluida") {
    return (
      <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
        <CircleCheckBig className="h-3.5 w-3.5" />
        <span className="text-xs font-medium">{STATUS_LABELS[status]}</span>
      </span>
    );
  }
  if (status === "em_andamento") {
    return (
      <span className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400">
        <CircleDot className="h-3.5 w-3.5" />
        <span className="text-xs font-medium">{STATUS_LABELS[status]}</span>
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-muted-foreground">
      <CircleDashed className="h-3.5 w-3.5" />
      <span className="text-xs font-medium">{STATUS_LABELS[status]}</span>
    </span>
  );
}

// ---------- Task Card ----------

function TaskCard({
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
  const done = task.status === "concluida";
  return (
    <Card
      className={cn(
        "p-4 py-4 gap-3 transition-all hover:shadow-md hover:border-primary/40 group",
        done && "opacity-60"
      )}
    >
      <div className="flex items-start gap-3">
        <Button
          type="button"
          variant="outline"
          size="icon"
          aria-label={
            done ? "Marcar como pendente" : "Marcar como concluída"
          }
          aria-pressed={done}
          onClick={onToggle}
          className={cn(
            "h-7 w-7 shrink-0 rounded-full mt-0.5 transition-all",
            done &&
              "bg-primary text-primary-foreground border-primary hover:bg-primary/90 hover:text-primary-foreground"
          )}
        >
          {done && <Check className="h-3.5 w-3.5" />}
        </Button>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h3
              className={cn(
                "font-medium leading-snug break-words",
                done && "line-through text-muted-foreground"
              )}
            >
              {task.title}
            </h3>
            <div className="flex items-center gap-0.5 shrink-0 -mr-1">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-foreground"
                onClick={onEdit}
                aria-label="Editar tarefa"
              >
                <Pencil className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-destructive"
                onClick={onDelete}
                aria-label="Excluir tarefa"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {task.description && (
            <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
              {task.description}
            </p>
          )}

          <div className="flex flex-wrap items-center gap-1.5 mt-2.5">
            <Badge
              variant="secondary"
              className={cn("font-medium", TASK_TYPE_COLORS[task.type])}
            >
              {TASK_TYPE_LABELS[task.type]}
            </Badge>
            <Badge
              variant="secondary"
              className={cn("font-medium", PRIORITY_COLORS[task.priority])}
            >
              {PRIORITY_LABELS[task.priority]}
            </Badge>
            <StatusIndicator status={task.status} />
          </div>

          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <CalendarDays className="h-3.5 w-3.5" />
              {formatPtBRDate(task.date)}
            </span>
            {(task.startTime || task.endTime) && (
              <span className="inline-flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" />
                {task.startTime || "--"}
                <span aria-hidden>–</span>
                {task.endTime || "--"}
              </span>
            )}
            {task.subject && (
              <span className="inline-flex items-center gap-1.5">
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: task.subject.color }}
                  aria-hidden
                />
                {task.subject.name}
              </span>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}

// ---------- Tasks View ----------

export function TasksView() {
  const qc = useQueryClient();
  const refreshKey = useAppStore((s) => s.refreshKey);
  const bumpRefresh = useAppStore((s) => s.bumpRefresh);
  const subjectFilter = useAppStore((s) => s.subjectFilter);
  const setSubjectFilter = useAppStore((s) => s.setSubjectFilter);

  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<Task | null>(null);
  const [search, setSearch] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<TaskStatus | "todos">(
    "todos"
  );
  const [typeFilter, setTypeFilter] = React.useState<TaskType | "todos">(
    "todos"
  );
  const [priorityFilter, setPriorityFilter] = React.useState<Priority | "todos">(
    "todos"
  );
  const [onlyToday, setOnlyToday] = React.useState(false);
  const [deleteTarget, setDeleteTarget] = React.useState<Task | null>(null);

  const today = todayISO();

  // Build query string from active filters
  const qs = React.useMemo(() => {
    const params = new URLSearchParams();
    if (subjectFilter) params.set("subjectId", subjectFilter);
    if (statusFilter !== "todos") params.set("status", statusFilter);
    if (onlyToday) params.set("date", todayISO());
    return params.toString();
  }, [subjectFilter, statusFilter, onlyToday]);

  const { data: tasks, isLoading } = useQuery({
    queryKey: ["tasks", refreshKey, qs],
    queryFn: () => api<Task[]>(`/api/tasks${qs ? `?${qs}` : ""}`),
  });

  const { data: subjects } = useQuery({
    queryKey: ["subjects", refreshKey],
    queryFn: () => api<Subject[]>("/api/subjects"),
  });

  // Mutations
  const toggleMut = useMutation({
    mutationFn: ({ id, status }: { id: string; status: TaskStatus }) =>
      api<Task>(`/api/tasks/${id}`, {
        method: "PUT",
        body: JSON.stringify({ status }),
      }),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["tasks"] });
      bumpRefresh();
      toast.success(
        data.status === "concluida" ? "Tarefa concluída" : "Tarefa reaberta"
      );
    },
    onError: (e: Error) =>
      toast.error(e.message || "Erro ao atualizar tarefa"),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) =>
      api<void>(`/api/tasks/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tasks"] });
      bumpRefresh();
      toast.success("Tarefa excluída");
      setDeleteTarget(null);
    },
    onError: (e: Error) =>
      toast.error(e.message || "Erro ao excluir tarefa"),
  });

  // Filter + group tasks client-side
  const filtered = React.useMemo(() => {
    if (!tasks) return [];
    let list = tasks;
    if (search.trim()) {
      const q = search.toLowerCase().trim();
      list = list.filter(
        (t) =>
          t.title.toLowerCase().includes(q) ||
          (t.description ?? "").toLowerCase().includes(q)
      );
    }
    if (typeFilter !== "todos") list = list.filter((t) => t.type === typeFilter);
    if (priorityFilter !== "todos")
      list = list.filter((t) => t.priority === priorityFilter);
    return list;
  }, [tasks, search, typeFilter, priorityFilter]);

  const groups = React.useMemo(() => {
    const map = new Map<GroupKey, Task[]>();
    for (const t of filtered) {
      const k = getGroupKey(t.date, today);
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(t);
    }
    for (const arr of map.values()) {
      arr.sort((a, b) => {
        if (a.date !== b.date) return a.date.localeCompare(b.date);
        return (a.startTime ?? "").localeCompare(b.startTime ?? "");
      });
    }
    return (Object.keys(GROUP_META) as GroupKey[])
      .filter((k) => map.has(k))
      .map((k) => ({ key: k, items: map.get(k)! }));
  }, [filtered, today]);

  const hasActiveFilters =
    !!search ||
    statusFilter !== "todos" ||
    typeFilter !== "todos" ||
    priorityFilter !== "todos" ||
    !!subjectFilter ||
    onlyToday;

  function openCreate() {
    setEditing(null);
    setDialogOpen(true);
  }
  function openEdit(task: Task) {
    setEditing(task);
    setDialogOpen(true);
  }

  const completedCount = tasks?.filter((t) => t.status === "concluida").length ?? 0;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Tarefas</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {tasks?.length ?? 0} no total · {completedCount} concluídas
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4" />
          Nova tarefa
        </Button>
      </div>

      {/* Filter bar */}
      <div className="flex flex-col gap-3">
        <div className="relative">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"
            aria-hidden
          />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por título ou descrição..."
            className="pl-9 pr-9"
            aria-label="Buscar tarefas"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Limpar busca"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
          <Select
            value={subjectFilter ?? "all"}
            onValueChange={(v) => setSubjectFilter(v === "all" ? null : v)}
          >
            <SelectTrigger className="w-full" aria-label="Filtrar por disciplina">
              <SelectValue placeholder="Disciplina" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas disciplinas</SelectItem>
              {subjects?.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  <span className="flex items-center gap-2">
                    <span
                      className="h-2 w-2 rounded-full"
                      style={{ backgroundColor: s.color }}
                    />
                    {s.name}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={statusFilter}
            onValueChange={(v) =>
              setStatusFilter(v as TaskStatus | "todos")
            }
          >
            <SelectTrigger className="w-full" aria-label="Filtrar por status">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos status</SelectItem>
              {(Object.keys(STATUS_LABELS) as TaskStatus[]).map((s) => (
                <SelectItem key={s} value={s}>
                  {STATUS_LABELS[s]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={typeFilter}
            onValueChange={(v) => setTypeFilter(v as TaskType | "todos")}
          >
            <SelectTrigger className="w-full" aria-label="Filtrar por tipo">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos tipos</SelectItem>
              {(Object.keys(TASK_TYPE_LABELS) as TaskType[]).map((t) => (
                <SelectItem key={t} value={t}>
                  {TASK_TYPE_LABELS[t]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={priorityFilter}
            onValueChange={(v) =>
              setPriorityFilter(v as Priority | "todos")
            }
          >
            <SelectTrigger className="w-full" aria-label="Filtrar por prioridade">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todas prioridades</SelectItem>
              {(Object.keys(PRIORITY_LABELS) as Priority[]).map((p) => (
                <SelectItem key={p} value={p}>
                  {PRIORITY_LABELS[p]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            type="button"
            variant={onlyToday ? "default" : "outline"}
            onClick={() => setOnlyToday((v) => !v)}
            className="h-9"
            aria-pressed={onlyToday}
          >
            <CalendarDays className="h-4 w-4" />
            Hoje
          </Button>
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 w-full rounded-xl" />
          ))}
        </div>
      ) : groups.length === 0 ? (
        <div className="flex flex-col items-center justify-center text-center py-16 px-4">
          <div className="h-16 w-16 rounded-full bg-muted grid place-items-center mb-4">
            <ListChecks className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="font-semibold text-lg">Nenhuma tarefa encontrada</h3>
          <p className="text-sm text-muted-foreground mt-1 max-w-sm">
            {hasActiveFilters
              ? "Tente ajustar os filtros ou crie uma nova tarefa."
              : "Crie sua primeira tarefa e organize sua rotina acadêmica com facilidade."}
          </p>
          <Button className="mt-5" onClick={openCreate}>
            <Plus className="h-4 w-4" />
            Nova tarefa
          </Button>
        </div>
      ) : (
        <div className="space-y-6 max-h-[calc(100vh-22rem)] overflow-y-auto custom-scroll pr-1">
          {groups.map(({ key, items }) => (
            <section key={key} className="space-y-2">
              <div className="flex items-center gap-2 sticky top-0 bg-background/95 backdrop-blur py-1 z-10">
                <span
                  className={cn("h-2 w-2 rounded-full", GROUP_META[key].dot)}
                  aria-hidden
                />
                <h2
                  className={cn(
                    "text-sm font-semibold uppercase tracking-wide",
                    GROUP_META[key].tone
                  )}
                >
                  {GROUP_META[key].label}
                </h2>
                <Badge variant="secondary" className="text-xs">
                  {items.length}
                </Badge>
                <div className="flex-1 h-px bg-border" aria-hidden />
              </div>
              <div className="space-y-2">
                {items.map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    onEdit={() => openEdit(task)}
                    onDelete={() => setDeleteTarget(task)}
                    onToggle={() =>
                      toggleMut.mutate({
                        id: task.id,
                        status:
                          task.status === "concluida"
                            ? "pendente"
                            : "concluida",
                      })
                    }
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      {/* Create / Edit Dialog */}
      <TaskFormDialog
        open={dialogOpen}
        onOpenChange={(o) => {
          setDialogOpen(o);
          if (!o) setEditing(null);
        }}
        editing={editing}
        subjects={subjects ?? []}
      />

      {/* Delete confirmation */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir tarefa?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir{" "}
              <span className="font-semibold text-foreground">
                &ldquo;{deleteTarget?.title}&rdquo;
              </span>
              ? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteTarget && deleteMut.mutate(deleteTarget.id)}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              {deleteMut.isPending ? "Excluindo..." : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

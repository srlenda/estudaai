"use client";

import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Plus,
  Pencil,
  Trash2,
  BookOpen,
  GraduationCap,
  ArrowRight,
  Link2,
  StickyNote,
  CheckSquare,
  Check,
  X,
} from "lucide-react";

import { api } from "@/lib/api";
import { useAppStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import {
  type Subject,
  SUBJECT_COLORS,
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

// Subject returned by the API includes _count
interface SubjectWithCount extends Subject {
  _count?: { tasks: number; links: number; notes: number };
}

// ---------- form types ----------

interface SubjectFormValues {
  name: string;
  code: string;
  color: string;
  professor: string;
  description: string;
}

function subjectToForm(s: Subject): SubjectFormValues {
  return {
    name: s.name,
    code: s.code ?? "",
    color: s.color,
    professor: s.professor ?? "",
    description: s.description ?? "",
  };
}

const emptySubjectForm: SubjectFormValues = {
  name: "",
  code: "",
  color: SUBJECT_COLORS[0],
  professor: "",
  description: "",
};

// ---------- Color swatches ----------

function ColorSwatches({
  value,
  onChange,
}: {
  value: string;
  onChange: (c: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Cor da disciplina">
      {SUBJECT_COLORS.map((c) => {
        const selected = value.toLowerCase() === c.toLowerCase();
        return (
          <button
            key={c}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={`Selecionar cor ${c}`}
            onClick={() => onChange(c)}
            className={cn(
              "h-8 w-8 rounded-full transition-all hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
              selected &&
                "ring-2 ring-ring ring-offset-2 ring-offset-background"
            )}
            style={{ backgroundColor: c }}
          >
            {selected && (
              <Check
                className="h-4 w-4 mx-auto text-white drop-shadow-sm"
                aria-hidden
              />
            )}
          </button>
        );
      })}
    </div>
  );
}

// ---------- Subject Form Dialog ----------

function SubjectFormDialog({
  open,
  onOpenChange,
  editing,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing: Subject | null;
}) {
  const qc = useQueryClient();
  const bumpRefresh = useAppStore((s) => s.bumpRefresh);
  const [values, setValues] = React.useState<SubjectFormValues>(emptySubjectForm);
  const [submitting, setSubmitting] = React.useState(false);

  React.useEffect(() => {
    if (open) {
      setValues(editing ? subjectToForm(editing) : emptySubjectForm);
    }
  }, [open, editing]);

  const isEdit = !!editing;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!values.name.trim()) {
      toast.error("Informe o nome da disciplina.");
      return;
    }
    setSubmitting(true);
    const body = {
      name: values.name.trim(),
      code: values.code.trim() || null,
      color: values.color,
      professor: values.professor.trim() || null,
      description: values.description.trim() || null,
    };
    try {
      if (isEdit && editing) {
        await api<Subject>(`/api/subjects/${editing.id}`, {
          method: "PUT",
          body: JSON.stringify(body),
        });
        toast.success("Disciplina atualizada");
      } else {
        await api<Subject>("/api/subjects", {
          method: "POST",
          body: JSON.stringify(body),
        });
        toast.success("Disciplina criada");
      }
      qc.invalidateQueries({ queryKey: ["subjects"] });
      bumpRefresh();
      onOpenChange(false);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Erro ao salvar disciplina"
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto custom-scroll">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Editar disciplina" : "Nova disciplina"}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Atualize os dados da disciplina abaixo."
              : "Cadastre uma disciplina para organizar tarefas, links e notas."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="subject-name">
              Nome <span className="text-destructive">*</span>
            </Label>
            <Input
              id="subject-name"
              value={values.name}
              onChange={(e) =>
                setValues((v) => ({ ...v, name: e.target.value }))
              }
              placeholder="Ex.: Cálculo I"
              autoFocus
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="subject-code">Código</Label>
              <Input
                id="subject-code"
                value={values.code}
                onChange={(e) =>
                  setValues((v) => ({ ...v, code: e.target.value }))
                }
                placeholder="Ex.: MAT101"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="subject-professor">Professor(a)</Label>
              <Input
                id="subject-professor"
                value={values.professor}
                onChange={(e) =>
                  setValues((v) => ({ ...v, professor: e.target.value }))
                }
                placeholder="Ex.: Prof. Ana"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Cor</Label>
            <ColorSwatches
              value={values.color}
              onChange={(c) => setValues((v) => ({ ...v, color: c }))}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="subject-desc">Descrição</Label>
            <Textarea
              id="subject-desc"
              value={values.description}
              onChange={(e) =>
                setValues((v) => ({ ...v, description: e.target.value }))
              }
              placeholder="Ementa, horários, observações..."
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
                : "Criar disciplina"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ---------- Subject Card ----------

function SubjectCard({
  subject,
  onEdit,
  onDelete,
  onViewTasks,
}: {
  subject: SubjectWithCount;
  onEdit: () => void;
  onDelete: () => void;
  onViewTasks: () => void;
}) {
  const tasks = subject._count?.tasks ?? 0;
  const links = subject._count?.links ?? 0;
  const notes = subject._count?.notes ?? 0;

  return (
    <Card
      className="overflow-hidden p-5 py-5 gap-4 transition-all hover:shadow-md hover:-translate-y-0.5 group relative"
      style={{ borderLeftWidth: "4px", borderLeftColor: subject.color }}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-3 min-w-0 flex-1">
          <div
            className="h-10 w-10 shrink-0 rounded-lg grid place-items-center text-white shadow-sm"
            style={{ backgroundColor: subject.color }}
            aria-hidden
          >
            <BookOpen className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-semibold leading-snug break-words">
                {subject.name}
              </h3>
              {subject.code && (
                <Badge variant="secondary" className="font-mono text-[11px]">
                  {subject.code}
                </Badge>
              )}
            </div>
            {subject.professor && (
              <p className="text-xs text-muted-foreground mt-0.5">
                {subject.professor}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-0.5 shrink-0 -mr-1">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
            onClick={onEdit}
            aria-label={`Editar ${subject.name}`}
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-destructive"
            onClick={onDelete}
            aria-label={`Excluir ${subject.name}`}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {subject.description && (
        <p className="text-sm text-muted-foreground line-clamp-2">
          {subject.description}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1" title="Tarefas">
          <CheckSquare className="h-3.5 w-3.5" />
          {tasks} {tasks === 1 ? "tarefa" : "tarefas"}
        </span>
        <span
          className="inline-flex items-center gap-1"
          title="Links"
          aria-hidden
        >
          <span className="text-muted-foreground/40">·</span>
          <Link2 className="h-3.5 w-3.5" />
          {links} {links === 1 ? "link" : "links"}
        </span>
        <span className="inline-flex items-center gap-1" title="Notas">
          <span className="text-muted-foreground/40">·</span>
          <StickyNote className="h-3.5 w-3.5" />
          {notes} {notes === 1 ? "nota" : "notas"}
        </span>
      </div>

      <div className="pt-1">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="text-primary hover:text-primary hover:bg-primary/10 -ml-2 px-2"
          onClick={onViewTasks}
        >
          Ver tarefas
          <ArrowRight className="h-3.5 w-3.5" />
        </Button>
      </div>
    </Card>
  );
}

// ---------- Subjects View ----------

export function SubjectsView() {
  const qc = useQueryClient();
  const refreshKey = useAppStore((s) => s.refreshKey);
  const bumpRefresh = useAppStore((s) => s.bumpRefresh);
  const setView = useAppStore((s) => s.setView);
  const setSubjectFilter = useAppStore((s) => s.setSubjectFilter);

  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<Subject | null>(null);
  const [deleteTarget, setDeleteTarget] = React.useState<Subject | null>(null);

  const { data: subjects, isLoading } = useQuery({
    queryKey: ["subjects", refreshKey],
    queryFn: () => api<SubjectWithCount[]>("/api/subjects"),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) =>
      api<void>(`/api/subjects/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["subjects"] });
      bumpRefresh();
      toast.success("Disciplina excluída");
      setDeleteTarget(null);
    },
    onError: (e: Error) =>
      toast.error(e.message || "Erro ao excluir disciplina"),
  });

  function openCreate() {
    setEditing(null);
    setDialogOpen(true);
  }
  function openEdit(s: Subject) {
    setEditing(s);
    setDialogOpen(true);
  }
  function viewTasks(s: Subject) {
    setSubjectFilter(s.id);
    setView("tasks");
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Disciplinas</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {subjects?.length ?? 0} cadastradas
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4" />
          Nova disciplina
        </Button>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-44 w-full rounded-xl" />
          ))}
        </div>
      ) : !subjects || subjects.length === 0 ? (
        <div className="flex flex-col items-center justify-center text-center py-16 px-4">
          <div className="h-16 w-16 rounded-full bg-muted grid place-items-center mb-4">
            <GraduationCap className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="font-semibold text-lg">Nenhuma disciplina cadastrada</h3>
          <p className="text-sm text-muted-foreground mt-1 max-w-sm">
            Crie sua primeira disciplina para começar a organizar tarefas, links
            e notas por matéria.
          </p>
          <Button className="mt-5" onClick={openCreate}>
            <Plus className="h-4 w-4" />
            Nova disciplina
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {subjects.map((s) => (
            <SubjectCard
              key={s.id}
              subject={s}
              onEdit={() => openEdit(s)}
              onDelete={() => setDeleteTarget(s)}
              onViewTasks={() => viewTasks(s)}
            />
          ))}
        </div>
      )}

      {/* Create / Edit Dialog */}
      <SubjectFormDialog
        open={dialogOpen}
        onOpenChange={(o) => {
          setDialogOpen(o);
          if (!o) setEditing(null);
        }}
        editing={editing}
      />

      {/* Delete confirmation */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir disciplina?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir{" "}
              <span className="font-semibold text-foreground">
                &ldquo;{deleteTarget?.name}&rdquo;
              </span>
              ? As tarefas, links e notas vinculados ficarão sem disciplina. Esta
              ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                deleteTarget && deleteMut.mutate(deleteTarget.id)
              }
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

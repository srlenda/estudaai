"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Pencil,
  Pin,
  PinOff,
  Plus,
  Search,
  StickyNote,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { api } from "@/lib/api";
import { useAppStore } from "@/lib/store";
import type { Note, Subject } from "@/lib/types";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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

const NONE = "none";
const ALL = "all";

interface NoteForm {
  title: string;
  content: string;
  subjectId: string; // "none" or a real subject id
  pinned: boolean;
}

const EMPTY_FORM: NoteForm = { title: "", content: "", subjectId: NONE, pinned: false };

function fmtUpdated(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function NotesView() {
  const refreshKey = useAppStore((s) => s.refreshKey);
  const storeFilter = useAppStore((s) => s.subjectFilter);
  const bumpRefresh = useAppStore((s) => s.bumpRefresh);
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const [filterSubject, setFilterSubject] = useState<string>(ALL);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<NoteForm>(EMPTY_FORM);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data: subjects = [] } = useQuery({
    queryKey: ["subjects", refreshKey],
    queryFn: () => api<Subject[]>("/api/subjects"),
  });

  const { data: notes = [], isLoading } = useQuery({
    queryKey: ["notes", filterSubject, refreshKey],
    queryFn: () =>
      api<Note[]>(
        `/api/notes${filterSubject !== ALL ? `?subjectId=${filterSubject}` : ""}`,
      ),
  });

  const filtered = notes.filter((n) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (
      n.title.toLowerCase().includes(q) || n.content.toLowerCase().includes(q)
    );
  });

  const createMutation = useMutation({
    mutationFn: (f: NoteForm) =>
      api<Note>("/api/notes", {
        method: "POST",
        body: JSON.stringify({
          title: f.title,
          content: f.content,
          subjectId: f.subjectId === NONE ? null : f.subjectId,
          pinned: f.pinned,
        }),
      }),
    onSuccess: () => {
      toast.success("Nota criada.");
      closeDialog();
      bumpRefresh();
      queryClient.invalidateQueries({ queryKey: ["notes"] });
    },
    onError: () => toast.error("Erro ao criar nota."),
  });

  const updateMutation = useMutation({
    mutationFn: (vars: { id: string; patch: Partial<NoteForm> }) =>
      api<Note>(`/api/notes/${vars.id}`, {
        method: "PUT",
        body: JSON.stringify({
          ...(vars.patch.title !== undefined && { title: vars.patch.title }),
          ...(vars.patch.content !== undefined && { content: vars.patch.content }),
          ...(vars.patch.subjectId !== undefined && {
            subjectId: vars.patch.subjectId === NONE ? null : vars.patch.subjectId,
          }),
          ...(vars.patch.pinned !== undefined && { pinned: vars.patch.pinned }),
        }),
      }),
    onSuccess: () => {
      bumpRefresh();
      queryClient.invalidateQueries({ queryKey: ["notes"] });
    },
    onError: () => toast.error("Erro ao atualizar nota."),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api(`/api/notes/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      toast.success("Nota excluída.");
      setDeleteId(null);
      bumpRefresh();
      queryClient.invalidateQueries({ queryKey: ["notes"] });
    },
    onError: () => toast.error("Erro ao excluir nota."),
  });

  function openCreate() {
    setEditingId(null);
    setForm({
      ...EMPTY_FORM,
      subjectId: storeFilter ? storeFilter : NONE,
    });
    setDialogOpen(true);
  }

  function openEdit(n: Note) {
    setEditingId(n.id);
    setForm({
      title: n.title,
      content: n.content,
      subjectId: n.subjectId ?? NONE,
      pinned: n.pinned,
    });
    setDialogOpen(true);
  }

  function closeDialog() {
    setDialogOpen(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
  }

  function togglePin(n: Note) {
    updateMutation.mutate(
      { id: n.id, patch: { pinned: !n.pinned } },
      {
        onSuccess: () =>
          toast.success(n.pinned ? "Nota desafixada." : "Nota fixada."),
      },
    );
  }

  function toggleExpanded(id: string) {
    setExpanded((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function submitForm() {
    if (!form.title.trim()) {
      toast.error("Título é obrigatório.");
      return;
    }
    if (editingId) {
      updateMutation.mutate(
        { id: editingId, patch: form },
        {
          onSuccess: () => {
            toast.success("Nota atualizada.");
            closeDialog();
          },
        },
      );
    } else {
      createMutation.mutate(form);
    }
  }

  const saving = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="animate-fade-in space-y-6 p-4 md:p-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
            <StickyNote className="size-6 text-emerald-500" /> Notas
          </h1>
          <p className="text-sm text-muted-foreground">
            Anotações rápidas, fixadas e organizadas por disciplina.
          </p>
        </div>
        <Button onClick={openCreate} className="h-11">
          <Plus /> Nova nota
        </Button>
      </header>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por título ou conteúdo…"
            className="pl-9"
            aria-label="Buscar notas"
          />
          {search && (
            <Button
              variant="ghost"
              size="icon"
              aria-label="Limpar busca"
              className="absolute right-1 top-1/2 size-7 -translate-y-1/2"
              onClick={() => setSearch("")}
            >
              <X className="size-4" />
            </Button>
          )}
        </div>
        <Select value={filterSubject} onValueChange={setFilterSubject}>
          <SelectTrigger className="w-full sm:w-56" aria-label="Filtrar por disciplina">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Todas as disciplinas</SelectItem>
            {subjects.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                <span className="inline-flex items-center gap-2">
                  <span className="size-2 rounded-full" style={{ background: s.color }} />
                  {s.name}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* List */}
      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-48" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <StickyNote className="size-10 text-muted-foreground/50" />
            <div>
              <p className="font-medium">Nenhuma nota encontrada</p>
              <p className="text-sm text-muted-foreground">
                Crie sua primeira anotação para começar.
              </p>
            </div>
            <Button onClick={openCreate}>
              <Plus /> Nova nota
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((n) => {
            const isExpanded = expanded.has(n.id);
            const longContent = n.content.length > 180;
            return (
              <Card
                key={n.id}
                className={`gap-3 py-4 transition-colors ${
                  n.pinned
                    ? "border-amber-400/60 ring-1 ring-amber-400/30"
                    : ""
                }`}
              >
                <CardHeader className="gap-1.5">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="cursor-pointer text-base leading-snug hover:text-primary" onClick={() => openEdit(n)}>
                      {n.title}
                    </CardTitle>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={n.pinned ? "Desafixar nota" : "Fixar nota"}
                      className="size-8 shrink-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        togglePin(n);
                      }}
                    >
                      {n.pinned ? (
                        <Pin className="size-4 text-amber-500" />
                      ) : (
                        <PinOff className="size-4 text-muted-foreground" />
                      )}
                    </Button>
                  </div>
                  {n.subject && (
                    <Badge variant="secondary" className="w-fit gap-1.5">
                      <span
                        className="size-2 rounded-full"
                        style={{ background: n.subject.color }}
                      />
                      {n.subject.name}
                    </Badge>
                  )}
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="relative">
                    <p
                      className={`whitespace-pre-wrap text-sm text-muted-foreground ${
                        isExpanded ? "" : "max-h-36 overflow-hidden"
                      }`}
                    >
                      {n.content || "Sem conteúdo"}
                    </p>
                    {!isExpanded && longContent && (
                      <button
                        type="button"
                        onClick={() => toggleExpanded(n.id)}
                        className="absolute bottom-0 right-0 rounded px-2 py-0.5 text-xs font-medium text-emerald-600 hover:underline"
                        style={{
                          background:
                            "linear-gradient(to top, var(--card), transparent)",
                        }}
                      >
                        Ver mais
                      </button>
                    )}
                  </div>
                  {isExpanded && longContent && (
                    <button
                      type="button"
                      onClick={() => toggleExpanded(n.id)}
                      className="text-xs font-medium text-emerald-600 hover:underline"
                    >
                      Ver menos
                    </button>
                  )}
                  <div className="flex items-center justify-between gap-2 pt-1">
                    <span className="text-xs text-muted-foreground">
                      Atualizada em {fmtUpdated(n.updatedAt)}
                    </span>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label="Editar nota"
                        className="size-8"
                        onClick={() => openEdit(n)}
                      >
                        <Pencil className="size-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label="Excluir nota"
                        className="size-8"
                        onClick={() => setDeleteId(n.id)}
                      >
                        <Trash2 className="size-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create / edit dialog */}
      <Dialog
        open={dialogOpen}
        onOpenChange={(o) => {
          if (!o) closeDialog();
        }}
      >
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingId ? "Editar nota" : "Nova nota"}</DialogTitle>
            <DialogDescription>
              {editingId
                ? "Atualize o conteúdo da sua anotação."
                : "Registre uma nova anotação de estudo."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="note-title">Título *</Label>
              <Input
                id="note-title"
                value={form.title}
                onChange={(e) =>
                  setForm((f) => ({ ...f, title: e.target.value }))
                }
                placeholder="Ex: Resumo da aula de Cálculo"
                autoFocus
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="note-content">Conteúdo</Label>
              <Textarea
                id="note-content"
                value={form.content}
                onChange={(e) =>
                  setForm((f) => ({ ...f, content: e.target.value }))
                }
                rows={8}
                placeholder="Escreva sua anotação…"
                className="min-h-48"
              />
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="note-subject">Disciplina</Label>
                <Select
                  value={form.subjectId}
                  onValueChange={(v) =>
                    setForm((f) => ({ ...f, subjectId: v }))
                  }
                >
                  <SelectTrigger id="note-subject" className="w-full">
                    <SelectValue placeholder="Nenhuma" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>Nenhuma</SelectItem>
                    {subjects.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        <span className="inline-flex items-center gap-2">
                          <span
                            className="size-2 rounded-full"
                            style={{ background: s.color }}
                          />
                          {s.name}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center justify-between gap-3 rounded-md border p-3">
                <div className="space-y-0.5">
                  <Label htmlFor="note-pinned" className="cursor-pointer">
                    Fixar no topo
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Notas fixadas aparecem primeiro.
                  </p>
                </div>
                <Switch
                  id="note-pinned"
                  checked={form.pinned}
                  onCheckedChange={(v) =>
                    setForm((f) => ({ ...f, pinned: v }))
                  }
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>
              Cancelar
            </Button>
            <Button onClick={submitForm} disabled={saving || !form.title.trim()}>
              {editingId ? "Salvar alterações" : "Criar nota"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <AlertDialog
        open={deleteId !== null}
        onOpenChange={(o) => {
          if (!o) setDeleteId(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir nota?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. A anotação será removida
              permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-white hover:bg-destructive/90"
              onClick={() => deleteId && deleteMutation.mutate(deleteId)}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

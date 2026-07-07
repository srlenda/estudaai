"use client";

import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  BookOpen,
  ExternalLink,
  FileText,
  GraduationCap,
  Link2,
  Pencil,
  Plus,
  Search,
  Trash2,
  Video,
  Wrench,
} from "lucide-react";

import { api } from "@/lib/api";
import { useAppStore } from "@/lib/store";
import {
  LINK_CATEGORY_LABELS,
  type LinkCategory,
  type LinkItem,
  type Subject,
} from "@/lib/types";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogClose,
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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

type CategoryFilter = LinkCategory | "all";

const CATEGORY_ICON: Record<
  LinkCategory,
  React.ComponentType<{ className?: string }>
> = {
  geral: Link2,
  video: Video,
  artigo: FileText,
  livro: BookOpen,
  aula: GraduationCap,
  ferramenta: Wrench,
};

interface LinkFormState {
  title: string;
  url: string;
  description: string;
  category: LinkCategory;
  subjectId: string; // "" => null
}

const EMPTY_FORM: LinkFormState = {
  title: "",
  url: "",
  description: "",
  category: "geral",
  subjectId: "",
};

export function LinksView() {
  const queryClient = useQueryClient();
  const refreshKey = useAppStore((s) => s.refreshKey);
  const bumpRefresh = useAppStore((s) => s.bumpRefresh);
  const storeSubjectFilter = useAppStore((s) => s.subjectFilter);
  const setSubjectFilter = useAppStore((s) => s.setSubjectFilter);

  const [search, setSearch] = React.useState("");
  const [categoryFilter, setCategoryFilter] =
    React.useState<CategoryFilter>("all");
  const [subjectIdFilter, setSubjectIdFilter] = React.useState<string>(
    storeSubjectFilter ?? "all"
  );

  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<LinkItem | null>(null);
  const [form, setForm] = React.useState<LinkFormState>(EMPTY_FORM);

  // Links (server-filtered by subject + category, client-filtered by search)
  const { data: links = [], isLoading: linksLoading } = useQuery({
    queryKey: ["links", refreshKey, subjectIdFilter, categoryFilter],
    queryFn: () => {
      const params = new URLSearchParams();
      if (subjectIdFilter !== "all")
        params.set("subjectId", subjectIdFilter);
      if (categoryFilter !== "all") params.set("category", categoryFilter);
      const qs = params.toString();
      return api<LinkItem[]>(`/api/links${qs ? `?${qs}` : ""}`);
    },
  });

  const { data: subjects = [] } = useQuery({
    queryKey: ["subjects", refreshKey],
    queryFn: () => api<Subject[]>("/api/subjects"),
  });

  const createMutation = useMutation({
    mutationFn: (data: LinkFormState) =>
      api<LinkItem>("/api/links", {
        method: "POST",
        body: JSON.stringify({
          title: data.title.trim(),
          url: data.url.trim(),
          description: data.description.trim() || null,
          category: data.category,
          subjectId: data.subjectId || null,
        }),
      }),
    onSuccess: () => {
      toast.success("Link adicionado com sucesso");
      queryClient.invalidateQueries({ queryKey: ["links"] });
      bumpRefresh();
      setDialogOpen(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: LinkFormState }) =>
      api<LinkItem>(`/api/links/${id}`, {
        method: "PUT",
        body: JSON.stringify({
          title: data.title.trim(),
          url: data.url.trim(),
          description: data.description.trim() || null,
          category: data.category,
          subjectId: data.subjectId || null,
        }),
      }),
    onSuccess: () => {
      toast.success("Link atualizado");
      queryClient.invalidateQueries({ queryKey: ["links"] });
      bumpRefresh();
      setDialogOpen(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      api<{ ok: boolean }>(`/api/links/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      toast.success("Link excluído");
      queryClient.invalidateQueries({ queryKey: ["links"] });
      bumpRefresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  function handleSubjectChange(value: string) {
    setSubjectIdFilter(value);
    setSubjectFilter(value === "all" ? null : value);
  }

  function openCreate() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setDialogOpen(true);
  }

  function openEdit(link: LinkItem) {
    setEditing(link);
    setForm({
      title: link.title,
      url: link.url,
      description: link.description ?? "",
      category: link.category,
      subjectId: link.subjectId ?? "",
    });
    setDialogOpen(true);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const title = form.title.trim();
    const url = form.url.trim();
    if (!title) {
      toast.error("Informe o título do link");
      return;
    }
    if (!url) {
      toast.error("Informe a URL do link");
      return;
    }
    if (!/^https?:\/\//i.test(url)) {
      toast.error("A URL deve começar com http:// ou https://");
      return;
    }
    if (editing) {
      updateMutation.mutate({ id: editing.id, data: form });
    } else {
      createMutation.mutate(form);
    }
  }

  const visibleLinks = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return links;
    return links.filter(
      (l) =>
        l.title.toLowerCase().includes(q) ||
        l.url.toLowerCase().includes(q)
    );
  }, [links, search]);

  const isSaving = createMutation.isPending || updateMutation.isPending;
  const hasActiveFilters =
    !!search || categoryFilter !== "all" || subjectIdFilter !== "all";

  return (
    <section className="animate-fade-in mx-auto flex w-full max-w-6xl flex-col gap-6 p-4 sm:p-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Links</h1>
          <p className="text-sm text-muted-foreground">
            Sua biblioteca de materiais de estudo: vídeos, artigos, livros e
            mais.
          </p>
        </div>
        <Button onClick={openCreate} className="h-11">
          <Plus /> Adicionar link
        </Button>
      </header>

      {/* Filter bar */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por título ou URL..."
              className="h-11 pl-9"
              aria-label="Buscar links"
            />
          </div>
          <div className="sm:w-60">
            <Select value={subjectIdFilter} onValueChange={handleSubjectChange}>
              <SelectTrigger
                className="h-11 w-full"
                aria-label="Filtrar por disciplina"
              >
                <SelectValue placeholder="Todas as disciplinas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as disciplinas</SelectItem>
                {subjects.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <Tabs
          value={categoryFilter}
          onValueChange={(v) => setCategoryFilter(v as CategoryFilter)}
        >
          <TabsList className="w-full overflow-x-auto custom-scroll">
            <TabsTrigger value="all" className="shrink-0">
              Todas
            </TabsTrigger>
            {(Object.keys(LINK_CATEGORY_LABELS) as LinkCategory[]).map(
              (cat) => (
                <TabsTrigger key={cat} value={cat} className="shrink-0">
                  {LINK_CATEGORY_LABELS[cat]}
                </TabsTrigger>
              )
            )}
          </TabsList>
        </Tabs>
      </div>

      {/* List */}
      <div className="max-h-[70vh] overflow-y-auto custom-scroll pr-1">
        {linksLoading ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-52 rounded-xl" />
            ))}
          </div>
        ) : visibleLinks.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center gap-3 py-12 text-center">
              <div className="flex size-14 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Link2 className="size-7" />
              </div>
              <div className="space-y-1">
                <p className="font-medium">
                  {hasActiveFilters
                    ? "Nenhum link encontrado"
                    : "Nenhum link salvo"}
                </p>
                <p className="mx-auto max-w-md text-sm text-muted-foreground">
                  {hasActiveFilters
                    ? "Tente ajustar a busca ou os filtros para encontrar seus links."
                    : "Monte sua biblioteca adicionando vídeos, artigos, livros e outros materiais de estudo."}
                </p>
              </div>
              {!hasActiveFilters && (
                <Button onClick={openCreate} className="h-11">
                  <Plus /> Adicionar primeiro link
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {visibleLinks.map((link) => {
              const Icon = CATEGORY_ICON[link.category];
              return (
                <Card key={link.id} className="gap-4 p-4 sm:p-5">
                  <CardHeader className="gap-0 px-0">
                    <div className="flex items-start gap-3">
                      <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <Icon className="size-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <CardTitle className="truncate text-base">
                          {link.title}
                        </CardTitle>
                        <a
                          href={link.url}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-1 block truncate text-xs text-muted-foreground hover:text-primary hover:underline"
                        >
                          {link.url}
                        </a>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="gap-2 px-0">
                    {link.description ? (
                      <p className="line-clamp-2 text-sm text-muted-foreground">
                        {link.description}
                      </p>
                    ) : null}
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <Badge variant="secondary">
                        {LINK_CATEGORY_LABELS[link.category]}
                      </Badge>
                      {link.subject ? (
                        <span className="inline-flex items-center gap-1.5 rounded-md bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                          <span
                            className="size-2 rounded-full"
                            style={{ backgroundColor: link.subject.color }}
                            aria-hidden
                          />
                          {link.subject.name}
                        </span>
                      ) : null}
                    </div>
                  </CardContent>
                  <CardFooter className="gap-2 px-0">
                    <Button asChild className="h-11 flex-1">
                      <a
                        href={link.url}
                        target="_blank"
                        rel="noreferrer"
                        aria-label={`Abrir link ${link.title} em nova aba`}
                      >
                        <ExternalLink /> Abrir link
                      </a>
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      className="size-11"
                      aria-label={`Editar link ${link.title}`}
                      onClick={() => openEdit(link)}
                    >
                      <Pencil />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="outline"
                          size="icon"
                          className="size-11 hover:text-destructive"
                          aria-label={`Excluir link ${link.title}`}
                        >
                          <Trash2 />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Excluir link?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Esta ação não pode ser desfeita. O link{" "}
                            <span className="font-medium">{link.title}</span>{" "}
                            será removido permanentemente da sua biblioteca.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction
                            className="bg-destructive text-white hover:bg-destructive/90"
                            onClick={() => deleteMutation.mutate(link.id)}
                          >
                            Excluir
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </CardFooter>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Create / edit dialog */}
      <Dialog
        open={dialogOpen}
        onOpenChange={(o) => {
          setDialogOpen(o);
          if (!o) setEditing(null);
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto custom-scroll">
          <form onSubmit={handleSubmit} className="grid gap-4">
            <DialogHeader>
              <DialogTitle>
                {editing ? "Editar link" : "Adicionar link"}
              </DialogTitle>
              <DialogDescription>
                {editing
                  ? "Atualize as informações do material salvo."
                  : "Salve um material de estudo para acessar depois."}
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-2">
              <Label htmlFor="link-title">Título *</Label>
              <Input
                id="link-title"
                value={form.title}
                onChange={(e) =>
                  setForm((f) => ({ ...f, title: e.target.value }))
                }
                placeholder="Ex.: Aula sobre integrais definidas"
                required
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="link-url">URL *</Label>
              <Input
                id="link-url"
                type="url"
                value={form.url}
                onChange={(e) =>
                  setForm((f) => ({ ...f, url: e.target.value }))
                }
                placeholder="https://..."
                required
              />
              <p className="text-xs text-muted-foreground">
                A URL deve começar com http:// ou https://
              </p>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="link-desc">Descrição</Label>
              <Textarea
                id="link-desc"
                value={form.description}
                onChange={(e) =>
                  setForm((f) => ({ ...f, description: e.target.value }))
                }
                placeholder="Anotações sobre o material..."
                rows={3}
              />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="link-category">Categoria</Label>
                <Select
                  value={form.category}
                  onValueChange={(v) =>
                    setForm((f) => ({ ...f, category: v as LinkCategory }))
                  }
                >
                  <SelectTrigger id="link-category" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(LINK_CATEGORY_LABELS) as LinkCategory[]).map(
                      (c) => (
                        <SelectItem key={c} value={c}>
                          {LINK_CATEGORY_LABELS[c]}
                        </SelectItem>
                      )
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="link-subject">Disciplina</Label>
                <Select
                  value={form.subjectId || "none"}
                  onValueChange={(v) =>
                    setForm((f) => ({
                      ...f,
                      subjectId: v === "none" ? "" : v,
                    }))
                  }
                >
                  <SelectTrigger id="link-subject" className="w-full">
                    <SelectValue placeholder="Nenhuma" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhuma</SelectItem>
                    {subjects.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="outline" className="h-11">
                  Cancelar
                </Button>
              </DialogClose>
              <Button type="submit" className="h-11" disabled={isSaving}>
                {isSaving
                  ? "Salvando..."
                  : editing
                  ? "Salvar alterações"
                  : "Adicionar"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </section>
  );
}

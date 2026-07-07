"use client";

import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Cloud,
  ExternalLink,
  HardDrive,
  Info,
  Plus,
  Trash2,
} from "lucide-react";

import { api } from "@/lib/api";
import { useAppStore } from "@/lib/store";
import { type CloudConnection, type CloudProvider } from "@/lib/types";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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

const PROVIDER_LABELS: Record<CloudProvider, string> = {
  google_drive: "Google Drive",
  onedrive: "OneDrive",
};

// Brand colors for provider logos — exception to the emerald/amber palette,
// used only for small icon accents (brand identity).
const PROVIDER_COLORS: Record<CloudProvider, string> = {
  google_drive: "#0f9d58",
  onedrive: "#0078d4",
};

function ProviderIcon({
  provider,
  className,
}: {
  provider: CloudProvider;
  className?: string;
}) {
  // Visual differentiation: Google Drive -> HardDrive, OneDrive -> Cloud.
  const Icon = provider === "google_drive" ? HardDrive : Cloud;
  return <Icon className={className} />;
}

interface CloudFormState {
  provider: CloudProvider;
  accountName: string;
  folderName: string;
  folderUrl: string;
}

const EMPTY_FORM: CloudFormState = {
  provider: "google_drive",
  accountName: "",
  folderName: "",
  folderUrl: "",
};

export function CloudView() {
  const queryClient = useQueryClient();
  const refreshKey = useAppStore((s) => s.refreshKey);
  const bumpRefresh = useAppStore((s) => s.bumpRefresh);

  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [form, setForm] = React.useState<CloudFormState>(EMPTY_FORM);

  const { data: connections = [], isLoading } = useQuery({
    queryKey: ["cloud", refreshKey],
    queryFn: () => api<CloudConnection[]>("/api/cloud"),
  });

  const createMutation = useMutation({
    mutationFn: (data: CloudFormState) =>
      api<CloudConnection>("/api/cloud", {
        method: "POST",
        body: JSON.stringify({
          provider: data.provider,
          accountName: data.accountName.trim(),
          folderName: data.folderName.trim(),
          folderUrl: data.folderUrl.trim(),
        }),
      }),
    onSuccess: () => {
      toast.success("Pasta conectada com sucesso");
      queryClient.invalidateQueries({ queryKey: ["cloud"] });
      bumpRefresh();
      setDialogOpen(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, connected }: { id: string; connected: boolean }) =>
      api<CloudConnection>(`/api/cloud/${id}`, {
        method: "PUT",
        body: JSON.stringify({ connected }),
      }),
    onSuccess: (_data, vars) => {
      toast.success(
        vars.connected ? "Conexão ativada" : "Conexão pausada"
      );
      queryClient.invalidateQueries({ queryKey: ["cloud"] });
      bumpRefresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      api<{ ok: boolean }>(`/api/cloud/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      toast.success("Pasta desconectada");
      queryClient.invalidateQueries({ queryKey: ["cloud"] });
      bumpRefresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  function openConnectDialog(provider?: CloudProvider) {
    setForm({
      ...EMPTY_FORM,
      provider: provider ?? EMPTY_FORM.provider,
    });
    setDialogOpen(true);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const accountName = form.accountName.trim();
    const folderName = form.folderName.trim();
    const folderUrl = form.folderUrl.trim();
    if (!accountName || !folderName || !folderUrl) {
      toast.error("Preencha todos os campos");
      return;
    }
    if (!/^https?:\/\//i.test(folderUrl)) {
      toast.error("A URL da pasta deve começar com http:// ou https://");
      return;
    }
    createMutation.mutate({
      provider: form.provider,
      accountName,
      folderName,
      folderUrl,
    });
  }

  return (
    <section className="animate-fade-in mx-auto flex w-full max-w-5xl flex-col gap-6 p-4 sm:p-6">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold tracking-tight">Nuvem</h1>
        <p className="text-sm text-muted-foreground">
          Conecte suas pastas do Google Drive e OneDrive para acessar materiais
          de qualquer lugar.
        </p>
      </header>

      {/* Provider cards */}
      <div className="grid gap-4 sm:grid-cols-2">
        {(["google_drive", "onedrive"] as CloudProvider[]).map((provider) => {
          const color = PROVIDER_COLORS[provider];
          return (
            <Card key={provider} className="gap-4 p-5">
              <div className="flex items-center gap-4">
                <div
                  className="flex size-12 shrink-0 items-center justify-center rounded-xl"
                  style={{
                    backgroundColor: `${color}1f`,
                    color,
                  }}
                  aria-hidden
                >
                  <ProviderIcon provider={provider} className="size-6" />
                </div>
                <div className="min-w-0 flex-1">
                  <CardTitle className="text-base">
                    {PROVIDER_LABELS[provider]}
                  </CardTitle>
                  <CardDescription className="truncate">
                    Acesse suas pastas e materiais compartilhados
                  </CardDescription>
                </div>
              </div>
              <Button
                onClick={() => openConnectDialog(provider)}
                className="h-11 w-full sm:w-auto"
              >
                <Plus /> Conectar pasta
              </Button>
            </Card>
          );
        })}
      </div>

      {/* Info alert */}
      <Alert>
        <Info />
        <AlertTitle>Integração baseada em links</AlertTitle>
        <AlertDescription>
          O EstudaAí armazena referências às suas pastas na nuvem (URLs
          públicas ou compartilhadas). A navegação completa de arquivos via
          OAuth — listar, abrir e baixar documentos diretamente — exigiria
          credenciais oficiais do Google Drive ou OneDrive.
        </AlertDescription>
      </Alert>

      {/* Connections */}
      <div className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Pastas conectadas</h2>

        {isLoading ? (
          <div className="flex flex-col gap-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-20 rounded-xl" />
            ))}
          </div>
        ) : connections.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center gap-3 py-12 text-center">
              <div className="flex size-14 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Cloud className="size-7" />
              </div>
              <div className="space-y-1">
                <p className="font-medium">Nenhuma pasta conectada</p>
                <p className="mx-auto max-w-md text-sm text-muted-foreground">
                  Conecte uma pasta do Google Drive ou OneDrive para acessá-la
                  rapidamente por aqui.
                </p>
              </div>
              <Button
                onClick={() => openConnectDialog()}
                className="h-11"
              >
                <Plus /> Conectar primeira pasta
              </Button>
            </CardContent>
          </Card>
        ) : (
          <ul className="flex flex-col gap-3">
            {connections.map((conn) => {
              const color = PROVIDER_COLORS[conn.provider];
              return (
                <li
                  key={conn.id}
                  className="flex flex-col gap-3 rounded-xl border p-4 sm:flex-row sm:items-center sm:gap-4"
                >
                  <div className="flex min-w-0 flex-1 items-center gap-3">
                    <div
                      className="flex size-10 shrink-0 items-center justify-center rounded-lg"
                      style={{
                        backgroundColor: `${color}1f`,
                        color,
                      }}
                      aria-hidden
                    >
                      <ProviderIcon
                        provider={conn.provider}
                        className="size-5"
                      />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate font-medium">{conn.folderName}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {PROVIDER_LABELS[conn.provider]} · {conn.accountName}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2">
                    <Switch
                      checked={conn.connected}
                      onCheckedChange={(checked) =>
                        toggleMutation.mutate({
                          id: conn.id,
                          connected: checked,
                        })
                      }
                      aria-label={`Alternar conexão da pasta ${conn.folderName}`}
                    />
                    <Badge variant={conn.connected ? "default" : "secondary"}>
                      {conn.connected ? "Conectado" : "Desconectado"}
                    </Badge>
                    <Button
                      asChild
                      variant="outline"
                      size="icon"
                      className="size-11"
                      aria-label={`Abrir pasta ${conn.folderName} em nova aba`}
                    >
                      <a
                        href={conn.folderUrl}
                        target="_blank"
                        rel="noreferrer"
                      >
                        <ExternalLink />
                      </a>
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="outline"
                          size="icon"
                          className="size-11 hover:text-destructive"
                          aria-label={`Desconectar pasta ${conn.folderName}`}
                        >
                          <Trash2 />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>
                            Desconectar pasta?
                          </AlertDialogTitle>
                          <AlertDialogDescription>
                            A pasta{" "}
                            <span className="font-medium">
                              {conn.folderName}
                            </span>{" "}
                            será removida da sua lista de conexões. Você pode
                            reconectá-la quando quiser.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction
                            className="bg-destructive text-white hover:bg-destructive/90"
                            onClick={() => deleteMutation.mutate(conn.id)}
                          >
                            Desconectar
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Connect dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto custom-scroll">
          <form onSubmit={handleSubmit} className="grid gap-4">
            <DialogHeader>
              <DialogTitle>Conectar pasta</DialogTitle>
              <DialogDescription>
                Informe a conta e o link da pasta que deseja acessar por aqui.
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-2">
              <Label htmlFor="cloud-provider">Provedor</Label>
              <Select
                value={form.provider}
                onValueChange={(v) =>
                  setForm((f) => ({ ...f, provider: v as CloudProvider }))
                }
              >
                <SelectTrigger id="cloud-provider" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="google_drive">Google Drive</SelectItem>
                  <SelectItem value="onedrive">OneDrive</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="cloud-account">Conta (e-mail)</Label>
              <Input
                id="cloud-account"
                type="email"
                value={form.accountName}
                onChange={(e) =>
                  setForm((f) => ({ ...f, accountName: e.target.value }))
                }
                placeholder="seu.email@exemplo.com"
                required
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="cloud-folder-name">Nome da pasta</Label>
              <Input
                id="cloud-folder-name"
                value={form.folderName}
                onChange={(e) =>
                  setForm((f) => ({ ...f, folderName: e.target.value }))
                }
                placeholder="Ex.: Cálculo I — 2025"
                required
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="cloud-folder-url">URL da pasta</Label>
              <Input
                id="cloud-folder-url"
                type="url"
                value={form.folderUrl}
                onChange={(e) =>
                  setForm((f) => ({ ...f, folderUrl: e.target.value }))
                }
                placeholder="https://drive.google.com/..."
                required
              />
              <p className="text-xs text-muted-foreground">
                Use o link de compartilhamento público da pasta.
              </p>
            </div>

            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="outline" className="h-11">
                  Cancelar
                </Button>
              </DialogClose>
              <Button
                type="submit"
                className="h-11"
                disabled={createMutation.isPending}
              >
                {createMutation.isPending
                  ? "Conectando..."
                  : "Conectar pasta"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </section>
  );
}

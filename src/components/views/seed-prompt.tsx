"use client";

import { useEffect, useState } from "react";
import { Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useAppStore } from "@/lib/store";

/**
 * Mostra um banner convidando a popular o app com dados de demonstração
 * quando ainda não há disciplinas cadastradas. Some automaticamente após
 * o usuário popular ou dispensar.
 */
export function SeedPrompt() {
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const bumpRefresh = useAppStore((s) => s.bumpRefresh);

  useEffect(() => {
    fetch("/api/subjects")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data) && data.length === 0) setShow(true);
      })
      .catch(() => {});
  }, []);

  if (!show) return null;

  const handleSeed = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/seed", { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        toast.success("Dados de demonstração criados! Explore o app. 🎓");
        setShow(false);
        bumpRefresh();
      } else {
        toast.error(data.error || "Erro ao popular dados");
      }
    } catch {
      toast.error("Erro ao popular dados");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mb-6 rounded-xl border border-accent bg-accent/40 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center gap-4">
      <div className="flex items-start gap-3 flex-1">
        <div className="h-9 w-9 rounded-lg bg-accent-foreground/10 grid place-items-center shrink-0">
          <Sparkles className="h-4 w-4 text-accent-foreground" />
        </div>
        <div>
          <p className="font-semibold text-accent-foreground">
            Bem-vindo ao EstudaAí! 🎓
          </p>
          <p className="text-sm text-muted-foreground mt-0.5">
            Quer começar com dados de exemplo (disciplinas, tarefas, sessões de
            estudo)? Você poderá editar ou excluir tudo depois.
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <Button onClick={handleSeed} disabled={loading} size="sm">
          {loading ? "Criando…" : "Criar dados de exemplo"}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShow(false)}
          aria-label="Dispensar"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

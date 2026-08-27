"use client";

import { useEffect, useState } from "react";
import { Download, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: "accepted" | "dismissed";
    platform: string;
  }>;
  prompt: () => Promise<void>;
}

// Storage key para lembrar se o usuário dispensou o prompt
const DISMISS_KEY = "estudaai-pwa-install-dismissed";

export function ServiceWorkerRegister() {
  const [installPromptEvent, setInstallPromptEvent] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [showInstallBanner, setShowInstallBanner] = useState(false);

  // Registra o service worker
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;

    // Só registra em produção (evita conflito com HMR em dev)
    if (process.env.NODE_ENV !== "production") return;

    const register = async () => {
      try {
        const registration = await navigator.serviceWorker.register("/sw.js", {
          scope: "/",
        });
        // Verifica updates periodicamente
        registration.addEventListener("updatefound", () => {
          const newWorker = registration.installing;
          if (newWorker) {
            newWorker.addEventListener("statechange", () => {
              if (
                newWorker.state === "installed" &&
                navigator.serviceWorker.controller
              ) {
                // Novo SW disponível — pode forçar reload se quiser
                // Por ora, deixa o skipWaiting no SW cuidar disso
              }
            });
          }
        });
      } catch {
        // ignora erro de registro
      }
    };

    register();
  }, []);

  // Captura o evento beforeinstallprompt para mostrar botão customizado
  useEffect(() => {
    if (typeof window === "undefined") return;

    const handler = (e: Event) => {
      // Previne o prompt padrão do navegador
      e.preventDefault();
      const evt = e as BeforeInstallPromptEvent;
      setInstallPromptEvent(evt);

      // Só mostra o banner se o usuário não dispensou antes
      const dismissed = localStorage.getItem(DISMISS_KEY);
      if (!dismissed) {
        // Pequeno delay para não aparecer imediatamente
        setTimeout(() => setShowInstallBanner(true), 3000);
      }
    };

    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  // Detecta se já está instalado (standalone) — lazy init (executa só no cliente)
  const [isStandalone] = useState(() => {
    if (typeof window === "undefined") return false;
    return (
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone ===
        true
    );
  });

  const handleInstall = async () => {
    if (!installPromptEvent) return;
    await installPromptEvent.prompt();
    const choice = await installPromptEvent.userChoice;
    if (choice.outcome === "accepted") {
      // Instalado — esconde o banner
      setShowInstallBanner(false);
      setInstallPromptEvent(null);
    }
    // Limpa a referência (o evento só pode ser usado uma vez)
    setInstallPromptEvent(null);
  };

  const handleDismiss = () => {
    setShowInstallBanner(false);
    localStorage.setItem(DISMISS_KEY, "1");
  };

  // Banner de instalação (aparece 3s após o evento beforeinstallprompt)
  if (showInstallBanner && installPromptEvent && !isStandalone) {
    return (
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-2rem)] max-w-md animate-fade-in">
        <div className="rounded-xl border bg-card shadow-lg p-4 flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-primary text-primary-foreground grid place-items-center shrink-0">
            <Download className="h-5 w-5" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold">Instalar EstudaAí</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Acesso rápido na tela inicial, funciona offline.
            </p>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <Button size="sm" onClick={handleInstall}>
              Instalar
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8"
              onClick={handleDismiss}
              aria-label="Dispensar"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}

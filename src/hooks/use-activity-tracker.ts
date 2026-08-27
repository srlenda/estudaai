"use client";

import { useEffect, useRef } from "react";
import { useSession } from "next-auth/react";

/**
 * Hook que rastreia atividade do usuário (mousemove, keydown, click, scroll,
 * touch) e atualiza a sessão periodicamente para manter o lastActivity fresco.
 *
 * Isso previne logout por inatividade enquanto o usuário está usando o app.
 * O update é throttled para no máximo a cada 2 minutos (evita spam de requests).
 *
 * Só atua quando o usuário está logado E não marcou "manter conectado"
 * (sessões "manter conectado" não têm timeout de inatividade).
 */
const ACTIVITY_EVENTS = ["mousemove", "keydown", "click", "scroll", "touchstart"];
const UPDATE_INTERVAL_MS = 2 * 60 * 1000; // 2 minutos

export function useActivityTracker() {
  const { data: session, update } = useSession();
  const lastUpdateRef = useRef<number>(0);

  useEffect(() => {
    // Só rastreia se a sessão NÃO for "remember me"
    const rememberMe = (session as unknown as { rememberMe?: boolean })?.rememberMe;
    if (!session?.user || rememberMe === true) return;

    const handleActivity = () => {
      const now = Date.now();
      if (now - lastUpdateRef.current < UPDATE_INTERVAL_MS) return;
      lastUpdateRef.current = now;
      // update() dispara o trigger "update" no callback jwt, que atualiza lastActivity
      void update({});
    };

    // Throttle simples: registra os eventos mas só atualiza a cada intervalo
    const throttledHandler = () => {
      const now = Date.now();
      if (now - lastUpdateRef.current < UPDATE_INTERVAL_MS) return;
      lastUpdateRef.current = now;
      void update({});
    };

    ACTIVITY_EVENTS.forEach((event) =>
      window.addEventListener(event, throttledHandler, { passive: true })
    );

    // Atualiza também quando a aba volta a ficar visível
    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        lastUpdateRef.current = Date.now();
        void update({});
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      ACTIVITY_EVENTS.forEach((event) =>
        window.removeEventListener(event, throttledHandler)
      );
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [session, update]);
}

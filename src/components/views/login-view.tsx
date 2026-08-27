"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { GraduationCap, Mail, Lock, User as UserIcon, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";

export function LoginView() {
  const router = useRouter();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 via-background to-amber-50 dark:from-emerald-950/30 dark:via-background dark:to-amber-950/20 p-4">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-8">
          <div className="h-16 w-16 rounded-2xl bg-primary text-primary-foreground grid place-items-center shadow-lg shadow-primary/20 mb-4">
            <GraduationCap className="h-9 w-9" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">EstudaAí</h1>
          <p className="text-sm text-muted-foreground mt-1 text-center">
            Seu gerenciador de tarefas acadêmico
          </p>
        </div>

        <div className="bg-card rounded-2xl border shadow-xl p-6 sm:p-8">
          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="login">Entrar</TabsTrigger>
              <TabsTrigger value="register">Criar conta</TabsTrigger>
            </TabsList>

            <TabsContent value="login">
              <LoginForm onSuccess={() => router.refresh()} />
            </TabsContent>

            <TabsContent value="register">
              <RegisterForm onSuccess={() => router.refresh()} />
            </TabsContent>
          </Tabs>
        </div>

        <p className="text-xs text-muted-foreground text-center mt-6 flex items-center justify-center gap-1.5">
          <Sparkles className="h-3 w-3" />
          Cada conta tem seus dados privados e isolados
        </p>
      </div>
    </div>
  );
}

function LoginForm({ onSuccess }: { onSuccess: () => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      toast.error("Preencha e-mail e senha.");
      return;
    }
    setLoading(true);
    try {
      const res = await signIn("credentials", {
        email: email.trim().toLowerCase(),
        password,
        rememberMe: String(rememberMe),
        redirect: false,
      });
      if (res?.error) {
        toast.error("E-mail ou senha incorretos.");
      } else {
        toast.success("Bem-vindo de volta! 👋");
        onSuccess();
      }
    } catch {
      toast.error("Erro ao entrar. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="login-email">E-mail</Label>
        <div className="relative">
          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            id="login-email"
            type="email"
            placeholder="voce@email.com"
            className="pl-9"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            disabled={loading}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="login-password">Senha</Label>
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            id="login-password"
            type="password"
            placeholder="••••••••"
            className="pl-9"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            disabled={loading}
          />
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          role="checkbox"
          aria-checked={rememberMe}
          onClick={() => setRememberMe(!rememberMe)}
          className={`h-4 w-4 rounded border flex items-center justify-center transition-colors shrink-0 ${
            rememberMe
              ? "bg-primary border-primary text-primary-foreground"
              : "border-muted-foreground/40"
          }`}
        >
          {rememberMe && (
            <svg viewBox="0 0 24 24" fill="none" className="h-3 w-3" stroke="currentColor" strokeWidth="4">
              <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </button>
        <Label htmlFor="remember-me" className="text-sm cursor-pointer font-normal flex-1">
          Manter conectado
        </Label>
        <span
          id="remember-me"
          className="text-[11px] text-muted-foreground"
        >
          {rememberMe ? "30 dias" : "8h + logout por inatividade"}
        </span>
      </div>

      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Entrar"}
      </Button>

      <p className="text-xs text-muted-foreground text-center">
        Ainda não tem conta? Clique em &quot;Criar conta&quot; acima.
      </p>
    </form>
  );
}

function RegisterForm({ onSuccess }: { onSuccess: () => void }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Digite seu nome.");
      return;
    }
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      toast.error("Digite um e-mail válido.");
      return;
    }
    if (password.length < 6) {
      toast.error("A senha deve ter no mínimo 6 caracteres.");
      return;
    }
    if (password !== confirm) {
      toast.error("As senhas não coincidem.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), email: email.trim(), password }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Erro ao criar conta.");
        return;
      }
      const signInRes = await signIn("credentials", {
        email: email.trim().toLowerCase(),
        password,
        redirect: false,
      });
      if (signInRes?.error) {
        toast.error('Conta criada! Faça login na aba "Entrar".');
      } else {
        toast.success(`Conta criada! Bem-vindo, ${name.trim().split(" ")[0]}! 🎉`);
        onSuccess();
      }
    } catch {
      toast.error("Erro ao criar conta. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="reg-name">Nome</Label>
        <div className="relative">
          <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            id="reg-name"
            type="text"
            placeholder="Seu nome"
            className="pl-9"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoComplete="name"
            disabled={loading}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="reg-email">E-mail</Label>
        <div className="relative">
          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            id="reg-email"
            type="email"
            placeholder="voce@email.com"
            className="pl-9"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            disabled={loading}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="reg-password">Senha</Label>
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            id="reg-password"
            type="password"
            placeholder="Mínimo 6 caracteres"
            className="pl-9"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
            disabled={loading}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="reg-confirm">Confirmar senha</Label>
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            id="reg-confirm"
            type="password"
            placeholder="Repita a senha"
            className="pl-9"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            autoComplete="new-password"
            disabled={loading}
          />
        </div>
      </div>

      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Criar conta"}
      </Button>

      <p className="text-xs text-muted-foreground text-center">
        Já tem conta? Clique em &quot;Entrar&quot; acima.
      </p>
    </form>
  );
}

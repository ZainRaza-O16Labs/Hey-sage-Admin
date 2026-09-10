"use client";

import { useState } from "react";
import { useActionState } from "react";
import { Eye, EyeOff, Lock, Mail, ShieldCheck, Sparkles } from "lucide-react";
import { login } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function LoginPage() {
  const [state, formAction, pending] = useActionState(login, undefined);
  const [showPassword, setShowPassword] = useState(false);

  return (
    <main className="grid min-h-screen bg-card lg:grid-cols-[minmax(24rem,0.82fr)_minmax(34rem,1.18fr)]">
      <section
        className="relative hidden overflow-hidden bg-sidebar p-10 text-sidebar-foreground lg:flex lg:flex-col lg:justify-between xl:p-14"
        style={{ backgroundImage: "url('/images/sage-routing-field.png')", backgroundPosition: "center", backgroundSize: "cover" }}
      >
        <div className="absolute inset-0 bg-sidebar/72" />
        <div className="relative flex items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-lg shadow-primary/25"><Sparkles className="size-5" /></span>
          <span className="text-2xl font-semibold tracking-[-0.04em]">HeySage</span>
        </div>
        <div className="relative max-w-sm pb-[12vh]">
          <h1 className="text-5xl leading-[1.05] font-medium tracking-[-0.055em]">Coordinate your AI operations.</h1>
          <p className="mt-6 max-w-xs text-base leading-7 text-sidebar-foreground/70">A focused workspace for routing, configuring, and supervising your AI system.</p>
        </div>
        <p className="relative text-xs font-medium tracking-[0.01em] text-sidebar-foreground/50">HeySage AI Operations</p>
      </section>

      <section className="flex min-h-screen items-center justify-center bg-background px-5 py-10 sm:px-10 lg:px-16">
        <div className="w-full max-w-[27rem]">
          <div className="mb-10 flex items-center gap-2.5 lg:hidden">
            <span className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground"><Sparkles className="size-4" /></span>
            <span className="text-xl font-semibold tracking-[-0.04em]">HeySage</span>
          </div>
          <div className="mb-9">
            <h2 className="text-[2rem] leading-tight font-semibold tracking-[-0.045em] text-foreground">Welcome back</h2>
            <p className="mt-2 text-[15px] leading-6 text-muted-foreground">Sign in to continue to your workspace.</p>
          </div>
          <form action={formAction} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  autoFocus
                  required
                  placeholder="you@company.com"
                  className="h-11 pl-10"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  placeholder="Your password"
                  className="h-11 pl-10 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((current) => !current)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className="absolute right-2 top-1/2 flex size-7 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {showPassword ? (
                    <EyeOff className="size-4" />
                  ) : (
                    <Eye className="size-4" />
                  )}
                </button>
              </div>
            </div>
            {state?.error ? (
              <p className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2.5 text-sm text-destructive">
                {state.error}
              </p>
            ) : null}
            <Button type="submit" size="lg" className="mt-1 w-full" disabled={pending}>
              {pending ? "Signing in…" : "Continue"}
            </Button>
          </form>
          <p className="mt-6 flex items-center justify-center gap-2 text-center text-xs text-muted-foreground"><ShieldCheck className="size-4 text-primary" />Secure access to your AI operations.</p>
        </div>
      </section>
    </main>
  );
}

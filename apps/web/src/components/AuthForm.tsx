"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { loginSchema, registerSchema, getPasswordStrength, type LoginData, type RegisterData } from "@/lib/schemas/auth";
import { useAuthStore } from "@/stores/use-auth-store";
import { Button } from "@/components/ui/button";

export function LoginForm() {
  const t = useTranslations("nav");
  const router = useRouter();
  const { login } = useAuthStore();

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<LoginData>({ resolver: zodResolver(loginSchema), mode: "onBlur" });

  const onSubmit = async (d: LoginData) => {
    const result = await login(d.email, d.password);
    if (result.success) {
      toast.success("Login realizado!");
      const cb = new URLSearchParams(window.location.search).get("callbackUrl");
      const dest = cb && cb.startsWith("/") ? cb : "/dashboard";
      router.replace(dest);
    } else {
      toast.error(result.error || "Credenciais inválidas");
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
      <div className="sr-only" aria-live="polite" role="status">
        {Object.values(errors).map((e) => e?.message).filter(Boolean).join(". ")}
      </div>
      <Field label="Email" error={errors.email?.message} autoComplete="email">
        <input {...register("email")} aria-invalid={!!errors.email} className="w-full px-3 py-2.5 bg-[#131331] border border-surface-border/30 rounded-lg text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-accent-500 aria-[invalid=true]:border-red-500" placeholder="seu@email.com" />
      </Field>
      <Field label={t("password") ?? "Senha"} error={errors.password?.message} autoComplete="current-password">
        <PasswordInput register={register("password")} error={!!errors.password} />
      </Field>
      <Button type="submit" className="w-full" size="lg" disabled={isSubmitting}>
        {isSubmitting ? "Entrando..." : t("login")}
      </Button>
    </form>
  );
}

export function RegisterForm() {
  const t = useTranslations("nav");
  const router = useRouter();
  const { register: regStore } = useAuthStore();
  const [pw, setPw] = useState("");

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<RegisterData>({ resolver: zodResolver(registerSchema), mode: "onBlur" });

  const strength = getPasswordStrength(pw);

  const onSubmit = async (d: RegisterData) => {
    const result = await regStore(d.name, d.email, d.password);
    if (result.success) {
      toast.success("Conta criada! Bem-vindo ao MEDIA Rate.");
      const cb = new URLSearchParams(window.location.search).get("callbackUrl");
      const dest = cb && cb.startsWith("/") ? cb : "/dashboard";
      router.replace(dest);
    } else {
      toast.error(result.error || "Erro ao criar conta");
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
      <div className="sr-only" aria-live="polite" role="status">
        {Object.values(errors).map((e) => e?.message).filter(Boolean).join(". ")}
      </div>
      <Field label="Nome" error={errors.name?.message} autoComplete="name">
        <input {...register("name")} aria-invalid={!!errors.name} className="w-full px-3 py-2.5 bg-[#131331] border border-surface-border/30 rounded-lg text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-accent-500 aria-[invalid=true]:border-red-500" placeholder="Seu nome" />
      </Field>
      <Field label="Email" error={errors.email?.message} autoComplete="email">
        <input {...register("email")} aria-invalid={!!errors.email} className="w-full px-3 py-2.5 bg-[#131331] border border-surface-border/30 rounded-lg text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-accent-500 aria-[invalid=true]:border-red-500" placeholder="seu@email.com" />
      </Field>
      <Field label={t("password") ?? "Senha"} error={errors.password?.message} autoComplete="new-password">
        <PasswordInput register={register("password")} error={!!errors.password} onChange={(e) => setPw(e.target.value)} />
        {strength && (
          <div className="mt-1.5">
            <div className="flex gap-1">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-1 flex-1 rounded-full transition-colors" style={{ backgroundColor: i < strength.segments ? strength.color : "rgba(148,163,255,0.1)" }} />
              ))}
            </div>
            <p className="text-xs mt-0.5" style={{ color: strength.color }}>
              {strength.level === "weak" ? t("passwordWeak") : strength.level === "medium" ? t("passwordMedium") : t("passwordStrong")}
            </p>
          </div>
        )}
      </Field>
      <Field label="Confirmar senha" error={errors.confirmPassword?.message} autoComplete="new-password">
        <PasswordInput register={register("confirmPassword")} error={!!errors.confirmPassword} />
      </Field>
      <label className="flex items-start gap-2 text-xs text-gray-400 cursor-pointer">
        <input type="checkbox" {...register("acceptTerms")} className="mt-0.5 accent-accent-500" />
        <span>Concordo com os <a href="/terms" className="text-accent-400 underline" target="_blank">Termos</a> e a <a href="/privacy" className="text-accent-400 underline" target="_blank">Política de Privacidade</a></span>
      </label>
      {errors.acceptTerms && <p className="text-xs text-red-500" role="alert">{errors.acceptTerms.message}</p>}
      <Button type="submit" className="w-full" size="lg" disabled={isSubmitting}>
        {isSubmitting ? "Criando conta..." : t("register")}
      </Button>
    </form>
  );
}

function Field({ label, error, children, autoComplete }: { label: string; error?: string; children: React.ReactNode; autoComplete?: string }) {
  return (
    <div>
      <label className="block text-xs text-gray-400 mb-1">{label}</label>
      {children}
      {error && <p className="text-xs text-red-500 mt-1" role="alert">{error}</p>}
    </div>
  );
}

function PasswordInput({ register, error, onChange }: { register: ReturnType<import("react-hook-form").UseFormRegister<Record<string, unknown>>>; error: boolean; onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void }) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <input {...register} type={show ? "text" : "password"} onChange={(e) => { register.onChange(e); onChange?.(e); }} className="w-full px-3 py-2.5 pr-10 bg-[#131331] border border-surface-border/30 rounded-lg text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-accent-500 aria-[invalid=true]:border-red-500" placeholder="••••••" />
      <button type="button" onClick={() => setShow(!show)} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 text-xs" aria-label={show ? "Ocultar senha" : "Mostrar senha"}>
        {show ? "🙈" : "👁"}
      </button>
    </div>
  );
}

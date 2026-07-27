"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { Link } from "@/lib/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { loginSchema, registerSchema, getPasswordStrength, type LoginData, type RegisterData } from "@/lib/schemas/auth";
import { useAuthStore } from "@/stores/use-auth-store";
import { Button } from "@/components/ui/button";

export function LoginForm() {
  const t = useTranslations("auth");
  const router = useRouter();
  const { login } = useAuthStore();

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<LoginData>({ resolver: zodResolver(loginSchema), mode: "onBlur" });

  const onSubmit = async (d: LoginData) => {
    const result = await login(d.email, d.password);
    if (result.success) {
      toast.success(t("loginSuccess"));
      const cb = new URLSearchParams(window.location.search).get("callbackUrl");
      const dest = cb && cb.startsWith("/") ? cb : "/dashboard";
      router.replace(dest);
    } else {
      toast.error(result.error || t("loginError"));
    }
  };

  return (
    <>
      <div className="relative bg-[#11111E] rounded-md border border-[rgba(129,140,248,0.08)] p-8 overflow-hidden">
        <div className="absolute inset-0 rounded-md overflow-hidden pointer-events-none" aria-hidden="true">
          <div className="absolute top-0 left-0 right-0 h-[1px]" style={{ background: "linear-gradient(90deg, transparent, #818CF8 50%, transparent)", animation: "beam-h 4s ease-in-out infinite" }} />
          <div className="absolute bottom-0 left-0 right-0 h-[1px]" style={{ background: "linear-gradient(90deg, transparent, #818CF8 50%, transparent)", animation: "beam-h 4s ease-in-out infinite 2s" }} />
          <div className="absolute left-0 top-0 bottom-0 w-[1px]" style={{ background: "linear-gradient(180deg, transparent, #818CF8 50%, transparent)", animation: "beam-v 4s ease-in-out infinite 1s" }} />
          <div className="absolute right-0 top-0 bottom-0 w-[1px]" style={{ background: "linear-gradient(180deg, transparent, #818CF8 50%, transparent)", animation: "beam-v 4s ease-in-out infinite 3s" }} />
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 relative" noValidate>
          <div className="sr-only" aria-live="polite" role="status">
            {Object.values(errors).map((e) => e?.message).filter(Boolean).join(". ")}
          </div>
          <Field id="auth-login-email" label={t("emailLabel")} error={errors.email?.message}>
            <input id="auth-login-email" {...register("email")} aria-invalid={!!errors.email} className="w-full px-3 py-2.5 bg-[#09090F] border border-[rgba(129,140,248,0.08)] rounded-lg text-sm text-[#EDE7DC] placeholder-[#9CA3AF] focus:outline-none focus:border-[#818CF8] focus:ring-2 focus:ring-[#818CF8]/20 aria-[invalid=true]:border-red-500" placeholder={t("emailPlaceholder")} />
          </Field>
          <Field id="auth-login-password" label={t("passwordLabel")} error={errors.password?.message}>
            <PasswordInput id="auth-login-password" register={register("password")} error={!!errors.password} />
          </Field>
          <Button type="submit" className="w-full hover:bg-gradient-to-r hover:from-[#818CF8] hover:to-[#38BDF8]" size="lg" disabled={isSubmitting}>
            {isSubmitting ? t("entrando") : t("loginButton")}
          </Button>
        </form>

        <p className="text-center text-sm text-[#9CA3AF] mt-6">
          {t("noAccount")}{" "}
          <Link href="/register" className="bg-gradient-to-r from-[#818CF8] to-[#38BDF8] bg-clip-text text-transparent hover:brightness-125 transition-all">
            {t("signUp")}
          </Link>
        </p>
      </div>
    </>
  );
}

export function RegisterForm() {
  const t = useTranslations("auth");
  const router = useRouter();
  const { register: regStore } = useAuthStore();
  const [pw, setPw] = useState("");

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<RegisterData>({ resolver: zodResolver(registerSchema), mode: "onBlur" });

  const strength = getPasswordStrength(pw);

  const onSubmit = async (d: RegisterData) => {
    const result = await regStore(d.name, d.email, d.password);
    if (result.success) {
      toast.success(t("registerSuccess"));
      const cb = new URLSearchParams(window.location.search).get("callbackUrl");
      const dest = cb && cb.startsWith("/") ? cb : "/dashboard";
      router.replace(dest);
    } else {
      toast.error(result.error || t("registerError"));
    }
  };

  return (
    <>
      <div className="relative bg-[#11111E] rounded-md border border-[rgba(129,140,248,0.08)] p-8 overflow-hidden">
        <div className="absolute inset-0 rounded-md overflow-hidden pointer-events-none" aria-hidden="true">
          <div className="absolute top-0 left-0 right-0 h-[1px]" style={{ background: "linear-gradient(90deg, transparent, #818CF8 50%, transparent)", animation: "beam-h 4s ease-in-out infinite" }} />
          <div className="absolute bottom-0 left-0 right-0 h-[1px]" style={{ background: "linear-gradient(90deg, transparent, #818CF8 50%, transparent)", animation: "beam-h 4s ease-in-out infinite 2s" }} />
          <div className="absolute left-0 top-0 bottom-0 w-[1px]" style={{ background: "linear-gradient(180deg, transparent, #818CF8 50%, transparent)", animation: "beam-v 4s ease-in-out infinite 1s" }} />
          <div className="absolute right-0 top-0 bottom-0 w-[1px]" style={{ background: "linear-gradient(180deg, transparent, #818CF8 50%, transparent)", animation: "beam-v 4s ease-in-out infinite 3s" }} />
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 relative" noValidate>
          <div className="sr-only" aria-live="polite" role="status">
            {Object.values(errors).map((e) => e?.message).filter(Boolean).join(". ")}
          </div>
          <Field id="auth-register-name" label={t("nameLabel")} error={errors.name?.message}>
            <input id="auth-register-name" {...register("name")} aria-invalid={!!errors.name} className="w-full px-3 py-2.5 bg-[#09090F] border border-[rgba(129,140,248,0.08)] rounded-lg text-sm text-[#EDE7DC] placeholder-[#9CA3AF] focus:outline-none focus:border-[#818CF8] focus:ring-2 focus:ring-[#818CF8]/20 aria-[invalid=true]:border-red-500" placeholder={t("namePlaceholder")} />
          </Field>
          <Field id="auth-register-email" label={t("emailLabel")} error={errors.email?.message}>
            <input id="auth-register-email" {...register("email")} aria-invalid={!!errors.email} className="w-full px-3 py-2.5 bg-[#09090F] border border-[rgba(129,140,248,0.08)] rounded-lg text-sm text-[#EDE7DC] placeholder-[#9CA3AF] focus:outline-none focus:border-[#818CF8] focus:ring-2 focus:ring-[#818CF8]/20 aria-[invalid=true]:border-red-500" placeholder={t("emailPlaceholder")} />
          </Field>
          <Field id="auth-register-password" label={t("passwordLabel")} error={errors.password?.message}>
            <PasswordInput id="auth-register-password" register={register("password")} error={!!errors.password} onChange={(e) => setPw(e.target.value)} />
            {strength && (
              <div className="mt-1.5">
                <div className="flex gap-1">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="h-1 flex-1 rounded-full transition-colors" style={{ backgroundColor: i < strength.segments ? strength.color : "rgba(129,140,248,0.12)" }} />
                  ))}
                </div>
                <p className="text-xs mt-0.5" style={{ color: strength.color }}>
                  {strength.level === "weak" ? t("passwordWeak") : strength.level === "medium" ? t("passwordMedium") : t("passwordStrong")}
                </p>
              </div>
            )}
          </Field>
          <Field id="auth-register-confirm-password" label={t("confirmPasswordLabel")} error={errors.confirmPassword?.message}>
            <PasswordInput id="auth-register-confirm-password" register={register("confirmPassword")} error={!!errors.confirmPassword} />
          </Field>
          <label className="flex items-start gap-2 text-xs text-[#9CA3AF] cursor-pointer">
            <input type="checkbox" {...register("acceptTerms")} className="mt-0.5 accent-[#818CF8]" />
            <span>{t("agreeTerms")} <a href="/terms" className="text-[#818CF8] underline" target="_blank">{t("termsLink")}</a> e a <a href="/privacy" className="text-[#818CF8] underline" target="_blank">{t("privacyLink")}</a></span>
          </label>
          {errors.acceptTerms && <p className="text-xs text-red-500" role="alert">{errors.acceptTerms.message}</p>}
          <Button type="submit" className="w-full hover:bg-gradient-to-r hover:from-[#818CF8] hover:to-[#38BDF8]" size="lg" disabled={isSubmitting}>
            {isSubmitting ? t("cadastrando") : t("registerButton")}
          </Button>
        </form>

        <p className="text-center text-sm text-[#9CA3AF] mt-6">
          {t("hasAccount")}{" "}
          <Link href="/login" className="bg-gradient-to-r from-[#818CF8] to-[#38BDF8] bg-clip-text text-transparent hover:brightness-125 transition-all">
            {t("signIn")}
          </Link>
        </p>
      </div>
    </>
  );
}

function Field({ id, label, error, children }: { id?: string; label: string; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <label htmlFor={id} className="block text-xs text-[#9CA3AF] mb-1">{label}</label>
      {children}
      {error && <p className="text-xs text-red-500 mt-1" role="alert">{error}</p>}
    </div>
  );
}

function PasswordInput({ id, register, error, onChange }: { id?: string; register: ReturnType<import("react-hook-form").UseFormRegister<Record<string, unknown>>>; error: boolean; onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void }) {
  const t = useTranslations("auth");
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <input id={id} {...register} type={show ? "text" : "password"} onChange={(e) => { register.onChange(e); onChange?.(e); }} className="w-full px-3 py-2.5 pr-10 bg-[#09090F] border border-[rgba(129,140,248,0.08)] rounded-lg text-sm text-[#EDE7DC] placeholder-[#9CA3AF] focus:outline-none focus:border-[#818CF8] focus:ring-2 focus:ring-[#818CF8]/20 aria-[invalid=true]:border-red-500" placeholder={t("passwordPlaceholder")} />
      <button type="button" onClick={() => setShow(!show)} className="absolute right-2 top-1/2 -translate-y-1/2 text-[#9CA3AF] hover:text-[#EDE7DC]" aria-label={show ? t("hidePassword") : t("showPassword")}>
        {show ? (
          <svg className="w-4 h-4" aria-hidden="true" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
        ) : (
          <svg className="w-4 h-4" aria-hidden="true" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0zM2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
        )}
      </button>
    </div>
  );
}

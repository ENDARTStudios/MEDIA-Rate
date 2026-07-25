import { setRequestLocale } from "next-intl/server";
import type { Metadata } from "next";
import Link from "next/link";
import { LoginForm } from "../../../components/AuthForm";
import { LazyLogo } from "../../../components/lazy";

export async function generateMetadata(): Promise<Metadata> {
  return { title: "Entrar — MEDIA Rate", description: "Acesse sua conta MEDIA Rate." };
}

export default async function LoginPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <div className="min-h-[calc(100vh-4rem)] flex">
      {/* Brand panel */}
      <div className="hidden lg:flex flex-1 items-center justify-center bg-gradient-to-br from-primary-900 via-primary-800 to-black p-12 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(225,29,72,0.08)_0%,transparent_60%)]" aria-hidden="true" />
        <div className="relative z-10 max-w-md text-center">
          <LazyLogo className="w-16 h-16 mx-auto mb-6 text-accent-500" />
          <h1 className="text-3xl font-display font-bold text-white mb-4">Bem-vindo de volta</h1>
          <p className="text-gray-400">Descubra, avalie e organize todo seu entretenimento.</p>
        </div>
      </div>

      {/* Form panel */}
      <div className="flex-1 flex items-center justify-center px-4 sm:px-8 py-12">
        <div className="w-full max-w-sm">
          <div className="lg:hidden mb-8 text-center">
            <Link href="/" className="inline-flex items-center gap-2 text-xl font-bold text-accent-500">
              <LazyLogo className="w-8 h-8" /> MEDIA Rate
            </Link>
          </div>

          <h2 className="text-2xl font-display font-bold text-gray-100 mb-1">Entrar</h2>
          <p className="text-sm text-gray-400 mb-6">
            Não tem conta? <Link href="/register" className="text-accent-400 hover:text-accent-300">Cadastre-se</Link>
          </p>

          {/* Social buttons */}
          <div className="space-y-2 mb-6">
            <button className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-[#131331] border border-surface-border/30 rounded-lg text-sm text-gray-300 hover:bg-surface-elevated transition-colors" disabled>
              <svg className="w-4 h-4" viewBox="0 0 24 24"><path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/><path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
              Continuar com Google
            </button>
            <button className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-[#131331] border border-surface-border/30 rounded-lg text-sm text-gray-300 hover:bg-surface-elevated transition-colors" disabled>
              <svg className="w-4 h-4" viewBox="0 0 24 24"><path fill="currentColor" d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/></svg>
              Continuar com Apple
            </button>
          </div>

          <div className="flex items-center gap-3 mb-6">
            <div className="flex-1 h-px bg-surface-border/30" /><span className="text-xs text-gray-500">ou</span><div className="flex-1 h-px bg-surface-border/30" />
          </div>

          <LoginForm />
        </div>
      </div>
    </div>
  );
}

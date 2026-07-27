import { setRequestLocale } from "next-intl/server";
import type { Metadata } from "next";
import Link from "next/link";
import { LoginForm } from "../../../components/AuthForm";
import { LazyLogo } from "../../../components/lazy";
import { SocialButtons } from "../../../components/SocialButtons";

export async function generateMetadata(): Promise<Metadata> {
  return { title: "Entrar — MEDIA Rate", description: "Acesse sua conta MEDIA Rate." };
}

export default async function LoginPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <div className="min-h-[calc(100vh-4rem)] flex">
      {/* Brand panel */}
      <div className="hidden md:flex flex-1 items-center justify-center bg-gradient-to-br from-[#11111E] via-[#1C1C2E] to-[#09090F] p-12 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(129,140,248,0.08)_0%,transparent_60%)]" aria-hidden="true" />
        <div className="relative z-10 max-w-md text-center">
          <LazyLogo className="w-16 h-16 mx-auto mb-6 text-[#818CF8]" />
          <h1 className="text-3xl font-heading font-bold text-[#EDE7DC] mb-4">Bem-vindo de volta</h1>
          <p className="text-[#9CA3AF]">Descubra, avalie e organize todo seu entretenimento.</p>
        </div>
      </div>

      {/* Form panel */}
      <div className="flex-1 flex items-center justify-center px-4 sm:px-8 py-12">
        <div className="w-full max-w-sm">
          <div className="lg:hidden mb-8 text-center">
            <Link href="/" className="inline-flex items-center gap-2 text-xl font-bold text-[#818CF8]">
              <LazyLogo className="w-8 h-8" /> MEDIA Rate
            </Link>
          </div>

          <h2 className="text-2xl font-heading font-bold text-[#EDE7DC] mb-1">Entrar</h2>
          <p className="text-sm text-[#9CA3AF] mb-6">
            Não tem conta? <Link href="/register" className="text-[#818CF8] hover:text-[#A5B4FC]">Cadastre-se</Link>
          </p>

          {/* Social buttons */}
          <SocialButtons />
          <div className="flex items-center gap-3 my-6">
            <div className="flex-1 h-px bg-surface-border/30" /><span className="text-xs text-[#6B7280]">ou</span><div className="flex-1 h-px bg-surface-border/30" />
          </div>

          <LoginForm />
        </div>
      </div>
    </div>
  );
}

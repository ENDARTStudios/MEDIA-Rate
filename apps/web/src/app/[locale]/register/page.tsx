import { setRequestLocale } from "next-intl/server";
import type { Metadata } from "next";
import Link from "next/link";
import { RegisterForm } from "../../../components/AuthForm";
import { LazyLogo } from "../../../components/lazy";

export async function generateMetadata(): Promise<Metadata> {
  return { title: "Cadastrar — MEDIA Rate", description: "Crie sua conta gratuita no MEDIA Rate." };
}

export default async function RegisterPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <div className="min-h-[calc(100vh-4rem)] flex">
      {/* Brand panel */}
      <div className="hidden lg:flex flex-1 items-center justify-center bg-gradient-to-br from-primary-900 via-primary-800 to-black p-12 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(225,29,72,0.08)_0%,transparent_60%)]" aria-hidden="true" />
        <div className="relative z-10 max-w-md text-center">
          <LazyLogo className="w-16 h-16 mx-auto mb-6 text-accent-500" />
          <h1 className="text-3xl font-display font-bold text-white mb-4">Junte-se ao MEDIA Rate</h1>
          <p className="text-gray-400">Descubra, avalie e organize todo seu entretenimento com o MEDIA Score™.</p>
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

          <h2 className="text-2xl font-display font-bold text-gray-100 mb-1">Cadastrar</h2>
          <p className="text-sm text-gray-400 mb-6">
            Já tem conta? <Link href="/login" className="text-accent-400 hover:text-accent-300">Entrar</Link>
          </p>

          <RegisterForm />
        </div>
      </div>
    </div>
  );
}

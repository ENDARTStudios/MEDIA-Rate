import type { Metadata } from "next";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  return {
    title: "Seus Dados — MEDIA Rate",
    description: "Exporte ou exclua seus dados pessoais (LGPD).",
    alternates: { canonical: `https://media-rate-web.vercel.app/${locale}/user/data` },
    robots: { index: false, follow: false },
  };
}

export default function UserDataLayout({ children }: { children: React.ReactNode }) {
  return children;
}

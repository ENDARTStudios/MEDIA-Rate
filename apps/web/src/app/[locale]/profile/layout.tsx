import type { Metadata } from "next";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return {
    title: "Perfil — MEDIA Rate",
    description: "Gerencie seu perfil e preferências pessoais.",
    alternates: { canonical: `https://media-rate-web.vercel.app/${locale}/profile` },
    robots: { index: false, follow: false },
  };
}

export default function ProfileLayout({ children }: { children: React.ReactNode }) {
  return children;
}

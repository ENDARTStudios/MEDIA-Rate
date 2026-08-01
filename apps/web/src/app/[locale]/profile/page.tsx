import { setRequestLocale } from "next-intl/server";
import type { Metadata } from "next";
import { ProtectedPage } from "@/components/ProtectedPage";
import { ProfileContent } from "@/components/ProfileContent";
import { localizedAlternates, localizedUrl } from "@/lib/seo";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  return {
    title: "Perfil — MEDIA Rate",
    alternates: {
      canonical: localizedUrl(locale, "/profile"),
      languages: localizedAlternates("/profile"),
    },
    robots: { index: false, follow: false },
  };
}

export default async function ProfilePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  return (
    <ProtectedPage>
      <ProfileContent />
    </ProtectedPage>
  );
}

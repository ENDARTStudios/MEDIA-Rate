import { setRequestLocale } from "next-intl/server";
import type { Metadata } from "next";
import { ProtectedPage } from "../../../components/ProtectedPage";
import { ProfileContent } from "../../../components/ProfileContent";

export async function generateMetadata(): Promise<Metadata> {
  return { title: "Perfil — MEDIA Rate" };
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

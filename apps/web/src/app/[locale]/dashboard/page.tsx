import { setRequestLocale } from "next-intl/server";
import type { Metadata } from "next";
import { ProtectedPage } from "../../../components/ProtectedPage";
import { DashboardContent } from "../../../components/DashboardContent";

export async function generateMetadata(): Promise<Metadata> { return { title: "Dashboard — MEDIA Rate" }; }

export default async function DashboardPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <ProtectedPage><DashboardContent /></ProtectedPage>;
}

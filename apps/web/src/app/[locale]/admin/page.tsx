import { setRequestLocale } from "next-intl/server";
import type { Metadata } from "next";
import { AdminOverview } from "../../../components/admin/AdminOverview";

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Admin — MEDIA Rate",
    description: "Painel administrativo do MEDIA Rate.",
    robots: { index: false, follow: false },
  };
}

/**
 * Painel administrativo (T5.5).
 *
 * Acesso restrito a ADMIN: o backend exige `@Roles('ADMIN')` (guards globais
 * AuthGuard + RolesGuard) em `GET /api/v1/admin/stats`. A UI consome esse
 * endpoint e mostra estado honesto para não-admin (401/403) — nunca mock
 * (BETA-GAP-03/T119). O middleware exige sessão; o papel é validado na API.
 */
export default async function AdminPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <AdminOverview />;
}

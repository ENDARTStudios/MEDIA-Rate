import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { UserDataPage } from "../../../../components/UserDataPage";
import { ProtectedPage } from "@/components/ProtectedPage";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "dataExport" });
  return { title: t("title"), description: t("description") };
}

export default async function UserDataRoute({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  // D-619 (P1 da spec): pagina com dados pessoais precisa de guarda de sessao.
  return (
    <ProtectedPage>
      <UserDataPage />
    </ProtectedPage>
  );
}

import { getTranslations, setRequestLocale } from "next-intl/server";
import { sanitizeHtml } from "../../../lib/sanitize";
import type { Metadata } from "next";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  return { title: "Privacidade — MEDIA Rate", description: "Política de privacidade do MEDIA Rate.", alternates: { canonical: `https://media-rate-web.vercel.app/${locale}/privacy` }, robots: { index: true, follow: true } };
}

export default async function PrivacyPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("lgpd");

  // Conteúdo HTML da política de privacidade (em produção, viria de CMS).
  const privacyHtml = sanitizeHtml(`
    <h2>Política de Privacidade — MEDIA Rate</h2>
    <p>Coletamos os seguintes dados pessoais:</p>
    <ul>
      <li>Email e nome (cadastro)</li>
      <li>Preferências de gosto (criptografadas — T2.6)</li>
      <li>Watchlist e histórico de consumo (criptografados — T2.6)</li>
      <li>Dados de pagamento (processados pelo Stripe — não armazenados)</li>
    </ul>
    <h3>Seus direitos (LGPD — Lei 13.709/2018)</h3>
    <p>Você pode <a href="/user/data">exportar seus dados</a> ou <a href="/user/data">solicitar exclusão</a> a qualquer momento.</p>
    <p>A exclusão é agendada com prazo de 30 dias para cancelamento.</p>
    <h3>Retenção</h3>
    <p>Logs de auditoria são retidos por 6 anos (Recomendação ANPD).</p>
  `);

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <h1 className="text-3xl font-bold mb-8 text-gray-900 dark:text-gray-100">{t("privacy")}</h1>
      <div
        className="prose dark:prose-invert max-w-none text-gray-700 dark:text-gray-300 [&_a]:text-primary-700 [&_a]:underline"
        // biome-ignore lint/security/noDangerouslySetInnerHtml: conteúdo sanitizado via DOMPurify (T5.4)
        dangerouslySetInnerHTML={{ __html: privacyHtml }}
      />
    </div>
  );
}

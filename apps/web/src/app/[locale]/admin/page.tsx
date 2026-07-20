import { setRequestLocale, getTranslations } from "next-intl/server";

/**
 * Painel administrativo (T5.5).
 *
 * Acesso restrito a ADMIN (verificado no backend via @Roles('ADMIN')).
 * Em produção, dados vêm de GET /api/v1/admin/stats.
 * Por ora, usa dados mock para validar renderização.
 */
const MOCK_METRICS = {
  totalUsers: 1247,
  activeSubscriptions: 312,
  plusUsers: 198,
  premiumUsers: 89,
};

export default async function AdminPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("admin");

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-3xl font-bold mb-8 text-gray-900 dark:text-gray-100">{t("title")}</h1>

      {/* Métricas */}
      <section aria-labelledby="metrics-title" className="mb-8">
        <h2
          id="metrics-title"
          className="text-xl font-semibold mb-4 text-gray-900 dark:text-gray-100"
        >
          {t("metrics")}
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
            <p className="text-sm text-gray-500 dark:text-gray-400">{t("totalUsers")}</p>
            <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">
              {MOCK_METRICS.totalUsers}
            </p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
            <p className="text-sm text-gray-500 dark:text-gray-400">{t("activeSubscriptions")}</p>
            <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">
              {MOCK_METRICS.activeSubscriptions}
            </p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
            <p className="text-sm text-gray-500 dark:text-gray-400">{t("plusUsers")}</p>
            <p className="text-3xl font-bold text-accent-600">{MOCK_METRICS.plusUsers}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
            <p className="text-sm text-gray-500 dark:text-gray-400">{t("premiumUsers")}</p>
            <p className="text-3xl font-bold text-primary-700 dark:text-primary-100">
              {MOCK_METRICS.premiumUsers}
            </p>
          </div>
        </div>
      </section>

      {/* Tabela de usuários (placeholder) */}
      <section aria-labelledby="users-title">
        <h2
          id="users-title"
          className="text-xl font-semibold mb-4 text-gray-900 dark:text-gray-100"
        >
          {t("users")}
        </h2>
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white dark:bg-gray-800 rounded-lg shadow-sm">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700">
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                >
                  Email
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                >
                  Plano
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                >
                  Status
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                >
                  Último login
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              <tr>
                <td className="px-6 py-4 text-sm text-gray-900 dark:text-gray-100">
                  admin@mediarate.example
                </td>
                <td className="px-6 py-4 text-sm text-gray-900 dark:text-gray-100">PREMIUM</td>
                <td className="px-6 py-4 text-sm text-green-600">ATIVA</td>
                <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">—</td>
              </tr>
              <tr>
                <td className="px-6 py-4 text-sm text-gray-900 dark:text-gray-100">
                  free@mediarate.example
                </td>
                <td className="px-6 py-4 text-sm text-gray-900 dark:text-gray-100">FREE</td>
                <td className="px-6 py-4 text-sm text-green-600">ATIVA</td>
                <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">—</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

import { setRequestLocale } from "next-intl/server";
import type { Metadata } from "next";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  return {
    title: "Termos de Uso — MEDIA Rate",
    description: "Termos de uso do MEDIA Rate. Condições para uso da plataforma, planos, assinatura e cancelamento.",
    alternates: { canonical: "https://media-rate-web.vercel.app/" + locale + "/terms" },
    robots: { index: true, follow: true },
  };
}

export default async function TermsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <h1 className="text-3xl font-heading font-bold text-[#EDE7DC] mb-8">Termos de Uso</h1>
      <p className="text-sm text-[#6B7280] mb-8">Última atualização: 30 de julho de 2026</p>

      <div className="space-y-8 text-[#9CA3AF] leading-relaxed">
        <section>
          <h2 className="text-xl font-heading font-semibold text-[#EDE7DC] mb-3">1. Aceitação dos Termos</h2>
          <p>Ao acessar ou usar o MEDIA Rate, você concorda com estes Termos de Uso. Se não concordar, não utilize a plataforma. O uso do serviço é condicionado à sua aceitação expressa no momento do cadastro.</p>
        </section>

        <section>
          <h2 className="text-xl font-heading font-semibold text-[#EDE7DC] mb-3">2. Elegibilidade</h2>
          <p>Para criar uma conta, você deve ter pelo menos 13 anos de idade. Você é responsável por manter a confidencialidade da sua senha e por todas as atividades realizadas em sua conta. Forneça apenas informações verdadeiras e atualizadas.</p>
        </section>

        <section>
          <h2 className="text-xl font-heading font-semibold text-[#EDE7DC] mb-3">3. Planos e Assinatura</h2>
          <p>O MEDIA Rate oferece três planos:</p>
          <ul className="list-disc pl-5 space-y-1 mt-2">
            <li><strong>Free (R$0):</strong> acesso limitado ao catálogo e MEDIA Score básico.</li>
            <li><strong>Plus (R$19,90/mês):</strong> catálogo completo, watchlist ilimitada, recomendações IA.</li>
            <li><strong>Premium (R$39,90/mês):</strong> tudo do Plus + perfil de gosto avançado, listas personalizadas, exportação de dados.</li>
          </ul>
          <p className="mt-2">A cobrança é recorrente mensal. O pagamento é processado pelo Stripe — o MEDIA Rate NÃO armazena dados de cartão de crédito.</p>
        </section>

        <section>
          <h2 className="text-xl font-heading font-semibold text-[#EDE7DC] mb-3">3b. Reembolso, Cancelamento e Arrependimento (CDC)</h2>
          <ul className="list-disc pl-5 space-y-2">
            <li><strong>Direito de arrependimento (CDC Art. 49):</strong> Você pode desistir da assinatura em até 7 (sete) dias corridos a contar da data da contratação, com reembolso integral dos valores pagos, sem necessidade de justificativa. Este direito aplica-se a consumidores no Brasil.</li>
            <li><strong>Cancelamento:</strong> Você pode cancelar sua assinatura a qualquer momento. O cancelamento interrompe a renovação automática e vale até o fim do ciclo já pago, sem cobrança adicional.</li>
            <li><strong>Reembolso:</strong> Quando devido (arrependimento ou hipótese legal), o valor é restituído em até 30 (trinta) dias, pelo mesmo meio de pagamento via Stripe, com correção monetária.</li>
            <li><strong>Cobrança indevida (CDC Art. 42, parágrafo único):</strong> Se você for cobrado indevidamente, tem direito à devolução em dobro do valor pago, acrescido de correção monetária e juros legais.</li>
          </ul>
          <p className="mt-2 text-xs text-[#6B7280] italic">Nota: estes direitos aplicam-se a consumidores no Brasil, conforme o Código de Defesa do Consumidor (Lei 8.078/1990).</p>
        </section>

        <section>
          <h2 className="text-xl font-heading font-semibold text-[#EDE7DC] mb-3">4. Upgrade, Downgrade e Cancelamento</h2>
          <p>Você pode alterar seu plano a qualquer momento. O upgrade é imediato (valor proporcional). O downgrade entra em vigor no ciclo seguinte. O cancelamento pode ser feito a qualquer momento, sem multa ou aviso prévio.</p>
        </section>

        <section>
          <h2 className="text-xl font-heading font-semibold text-[#EDE7DC] mb-3">5. Propriedade Intelectual</h2>
          <p>O MEDIA Score™, a marca MEDIA Rate e todo o conteúdo original da plataforma são de propriedade da ENDART Studios. O conteúdo de terceiros (posters, sinopses) pertence aos respectivos detentores de direitos. Você NÃO pode reproduzir, distribuir ou criar obras derivadas sem autorização.</p>
        </section>

        <section>
          <h2 className="text-xl font-heading font-semibold text-[#EDE7DC] mb-3">6. Conduta Vedada</h2>
          <p>É proibido: usar a plataforma para fins ilegais; tentar burlar sistemas de segurança; fazer engenharia reversa do MEDIA Score™; usar bots ou scripts automatizados; publicar conteúdo ofensivo ou difamatório.</p>
        </section>

        <section>
          <h2 className="text-xl font-heading font-semibold text-[#EDE7DC] mb-3">7. Limitação de Responsabilidade</h2>
          <p>O MEDIA Score™ é uma agregação de avaliações de fontes públicas (TMDB, RAWG, IGDB, Steam). Não constitui opinião editorial própria. A plataforma é fornecida "como está", sem garantias de disponibilidade contínua ou precisão absoluta dos dados.</p>
        </section>

        <section>
          <h2 className="text-xl font-heading font-semibold text-[#EDE7DC] mb-3">8. Rescisão e Suspensão</h2>
          <p>Reservamo-nos o direito de suspender ou encerrar contas que violem estes termos. Você pode encerrar sua conta na página <a href="/user/data" className="text-[#818CF8] underline">Seus Dados</a>.</p>
        </section>

        <section>
          <h2 className="text-xl font-heading font-semibold text-[#EDE7DC] mb-3">9. Lei Aplicável e Foro</h2>
          <p>Estes termos são regidos pelas leis da República Federativa do Brasil. Fica eleito o foro da comarca de Osasco, São Paulo (SP), centro, para dirimir quaisquer controvérsias decorrentes destes termos.</p>
        </section>

        <section>
          <h2 className="text-xl font-heading font-semibold text-[#EDE7DC] mb-3">10. Alterações dos Termos</h2>
          <p>Estes termos podem ser atualizados periodicamente. Alterações significativas serão comunicadas por email ou notificação na plataforma.</p>
        </section>
      </div>
    </div>
  );
}

import { setRequestLocale } from "next-intl/server";
import type { Metadata } from "next";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  return {
    title: "Política de Privacidade — MEDIA Rate",
    description: "Política de privacidade do MEDIA Rate. Saiba como tratamos seus dados pessoais conforme a LGPD.",
    alternates: { canonical: "https://media-rate-web.vercel.app/" + locale + "/privacy" },
    robots: { index: true, follow: true },
  };
}

export default async function PrivacyPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <h1 className="text-3xl font-heading font-bold text-[#EDE7DC] mb-8">Política de Privacidade</h1>
      <p className="text-sm text-[#6B7280] mb-8">Última atualização: 30 de julho de 2026</p>

      <div className="space-y-8 text-[#9CA3AF] leading-relaxed">
        <section>
          <h2 className="text-xl font-heading font-semibold text-[#EDE7DC] mb-3">1. Controlador e Contato</h2>
          <p>O MEDIA Rate é operado por <strong>45.370.930 EDINALDO SOARES DA SILVA</strong>. Para questões sobre privacidade, entre em contato pelo email <a href="mailto:endart.studios@gmail.com" className="text-[#818CF8] underline">endart.studios@gmail.com</a>.</p>
        </section>

        <section>
          <h2 className="text-xl font-heading font-semibold text-[#EDE7DC] mb-3">2. Quais Dados Coletamos</h2>
          <ul className="list-disc pl-5 space-y-2">
            <li><strong>Dados de conta:</strong> nome e email fornecidos no cadastro. A senha é armazenada com hash criptográfico (nunca em texto puro).</li>
            <li><strong>Dados de assinatura:</strong> plano contratado (Free/Plus/Premium) e status de pagamento. Dados de cartão de crédito são processados pelo <strong>Stripe</strong> e NÃO são armazenados em nossos servidores.</li>
            <li><strong>Dados de uso:</strong> watchlist (itens salvos), favoritos, histórico de navegação e preferências de gosto. Estes dados são criptografados em nível de aplicação.</li>
            <li><strong>Cookies essenciais:</strong> cookie de sessão (httpOnly, Secure, SameSite=Lax) para autenticação. Não utilizamos cookies de rastreamento ou publicidade.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-heading font-semibold text-[#EDE7DC] mb-3">3. Base Legal e Finalidade (LGPD)</h2>
          <p>Tratamos seus dados com as seguintes bases legais:</p>
          <ul className="list-disc pl-5 space-y-1 mt-2">
            <li><strong>Execução de contrato:</strong> para fornecer o serviço contratado (catálogo, MEDIA Score, watchlist).</li>
            <li><strong>Consentimento:</strong> para envio de comunicações opcionais (mediante opt-in).</li>
            <li><strong>Legítimo interesse:</strong> para melhorias na plataforma e prevenção de fraudes.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-heading font-semibold text-[#EDE7DC] mb-3">4. Compartilhamento de Dados</h2>
          <p>Seus dados NÃO são vendidos. Compartilhamos dados apenas com:</p>
          <ul className="list-disc pl-5 space-y-1 mt-2">
            <li>Provedor de pagamento Stripe (processamento de assinaturas).</li>
            <li>Provedores de infraestrutura (Vercel para hospedagem frontend, Railway para backend).</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-heading font-semibold text-[#EDE7DC] mb-3">5. Retenção de Dados</h2>
          <p>Seus dados são mantidos enquanto sua conta existir. Ao solicitar exclusão, os dados são removidos em até 30 dias. Logs de auditoria são retidos por 6 anos conforme recomendação da ANPD.</p>
        </section>

        <section>
          <h2 className="text-xl font-heading font-semibold text-[#EDE7DC] mb-3">6. Seus Direitos (LGPD Art. 18)</h2>
          <p>Você pode exercer os seguintes direitos a qualquer momento:</p>
          <ul className="list-disc pl-5 space-y-1 mt-2">
            <li><strong>Acesso:</strong> consulte seus dados na página <a href="/user/data" className="text-[#818CF8] underline">Seus Dados</a>.</li>
            <li><strong>Correção:</strong> atualize seus dados cadastrais nas Configurações.</li>
            <li><strong>Eliminação:</strong> solicite exclusão total dos seus dados na página <a href="/user/data" className="text-[#818CF8] underline">Seus Dados</a>.</li>
            <li><strong>Portabilidade:</strong> exporte seus dados em formato JSON na página <a href="/user/data" className="text-[#818CF8] underline">Seus Dados</a>.</li>
            <li><strong>Revogação de consentimento:</strong> entre em contato pelo canal de suporte.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-heading font-semibold text-[#EDE7DC] mb-3">7. Segurança</h2>
          <p>Adotamos medidas técnicas para proteger seus dados: senhas com hash criptográfico, sessão via cookie httpOnly/Secure/SameSite, comunicação exclusivamente via HTTPS, e criptografia de dados sensíveis em nível de aplicação.</p>
        </section>

        <section>
          <h2 className="text-xl font-heading font-semibold text-[#EDE7DC] mb-3">8. Alterações nesta Política</h2>
          <p>Esta política pode ser atualizada periodicamente. Alterações significativas serão comunicadas por email ou notificação na plataforma.</p>
        </section>
      </div>
    </div>
  );
}

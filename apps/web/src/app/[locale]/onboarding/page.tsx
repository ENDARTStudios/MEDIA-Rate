"use client";
export default function OnboardingPage() {
  return (
    <div className="max-w-2xl mx-auto py-16 px-4 text-center">
      <h1 className="text-4xl font-heading font-bold text-[#EDE7DC] mb-4">Bem-vindo ao MEDIA Rate</h1>
      <p className="text-[#9CA3AF] mb-8">Sua plataforma de descoberta com score unificado.</p>
      <div className="space-y-4 text-left bg-[#11111E] border border-[rgba(129,140,248,0.08)] rounded-md p-6">
        <p>🔍 <strong>Explore o catálogo</strong> — descubra filmes, séries e games com MEDIA Score™</p>
        <p>📊 <strong>Entenda o score</strong> — veja o breakdown críticos/público/consenso</p>
        <p>📝 <strong>Monte sua watchlist</strong> — salve o que quer ver, está vendo ou já viu</p>
        <p>⌘K <strong>Busca rápida</strong> — pressione ⌘K para buscar qualquer título</p>
      </div>
    </div>
  );
}

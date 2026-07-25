"use client";

import { useState } from "react";

const FAQ = [
  { q: "O que é o MEDIA Score™ e como é calculado?", a: "O MEDIA Score™ consolida avaliações de fontes como IMDb, Rotten Tomatoes, TMDB, Metacritic, IGDB e OpenLibrary em uma nota única de 0 a 100, com indicador de confiança (alta/média/baixa)." },
  { q: "Preciso de conta para usar?", a: "Não. O catálogo, busca e MEDIA Score™ são gratuitos. Recomendações ilimitadas, perfil de gosto e assistente IA exigem plano Plus ou Premium." },
  { q: "Posso cancelar quando quiser?", a: "Sim. Todos os planos pagos podem ser cancelados a qualquer momento, sem multa ou aviso prévio." },
  { q: "Posso mudar de plano depois?", a: "Sim. Você pode fazer upgrade ou downgrade a qualquer momento. O valor é ajustado proporcionalmente." },
  { q: "Quais fontes de avaliação vocês usam?", a: "Utilizamos IMDb, Rotten Tomatoes, TMDB, Metacritic para filmes e séries; IGDB e RAWG para games; OpenLibrary e Goodreads para livros." },
];

export function PricingFAQ() {
  return (
    <div className="max-w-2xl mx-auto">
      <h2 className="text-2xl font-display font-bold text-gray-100 mb-8 text-center">Perguntas frequentes</h2>
      <div className="space-y-3">
        {FAQ.map((item, i) => (
          <FAQItem key={i} question={item.q} answer={item.a} />
        ))}
      </div>
    </div>
  );
}

function FAQItem({ question, answer }: { question: string; answer: string }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="border border-surface-border/30 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        className="w-full flex items-center justify-between px-5 py-4 text-left text-sm font-medium text-gray-200 hover:bg-surface-elevated/50 transition-colors"
      >
        {question}
        <svg className={`w-4 h-4 shrink-0 text-gray-400 transition-transform ${open ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
      </button>
      {open && (
        <div className="px-5 pb-4 text-sm text-gray-400 leading-relaxed">
          {answer}
        </div>
      )}
    </div>
  );
}

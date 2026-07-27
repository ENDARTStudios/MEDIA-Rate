"use client";

import { ScoreDial } from "@/components/ui/score-dial";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { LayeredBackground } from "@/components/ui/layered-background";
import { MediaCard, type MediaItem } from "@/components/MediaCard";

const SAMPLE_MEDIA: MediaItem[] = [
  {
    id: "filme-1",
    titulo: "A Odisseia",
    tipo: "FILME",
    ano_lancamento: 2026,
    imagem_url: "https://image.tmdb.org/t/p/w500/muMwJAiMtReEHLKpKMWt2rMkYF7.jpg",
    score: 79,
  },
  {
    id: "game-1",
    titulo: "Elden Ring",
    tipo: "GAME",
    ano_lancamento: 2022,
    imagem_url: null,
    score: 96,
  },
];

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-10">
      <h2 className="text-lg font-heading font-semibold text-[#EDE7DC] mb-4">{title}</h2>
      {children}
    </section>
  );
}

export function DesignSystemClient() {
  return (
    <LayeredBackground spotlight>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-heading font-bold text-[#EDE7DC] mb-2">Design System</h1>
        <p className="text-sm text-[#9CA3AF] mb-8">Componentes base com tokens TRAVADOS V3 §12</p>

        <Section title="ScoreDial">
          <div className="flex flex-wrap items-end gap-6 bg-[#11111E] border border-[rgba(129,140,248,0.12)] rounded-md p-6">
            {[10, 9.5, 8.7, 7.2, 6.4, 5.1, 3.5].map((s) => (
              <div key={s} className="flex flex-col items-center gap-1">
                <ScoreDial score={s} size="sm" />
                <span className="text-xs text-[#9CA3AF]">{s}</span>
              </div>
            ))}
          </div>
          <div className="flex flex-wrap items-end gap-8 mt-4 bg-[#11111E] border border-[rgba(129,140,248,0.12)] rounded-md p-6">
            <div className="flex flex-col items-center gap-2">
              <ScoreDial score={8.5} size="sm" />
              <span className="text-xs text-[#9CA3AF]">sm</span>
            </div>
            <div className="flex flex-col items-center gap-2">
              <ScoreDial score={8.5} size="md" showBreakdown />
              <span className="text-xs text-[#9CA3AF]">md + breakdown</span>
            </div>
            <div className="flex flex-col items-center gap-2">
              <ScoreDial score={8.5} size="lg" />
              <span className="text-xs text-[#9CA3AF]">lg</span>
            </div>
          </div>
        </Section>

        <Section title="MediaCard">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {SAMPLE_MEDIA.map((m) => (
              <MediaCard key={m.id} media={m} />
            ))}
          </div>
        </Section>

        <Section title="Button">
          <div className="flex flex-wrap items-center gap-4 bg-[#11111E] border border-[rgba(129,140,248,0.12)] rounded-md p-6">
            <Button variant="default">Primary</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="outline">Outline</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="destructive">Destructive</Button>
            <Button variant="link">Link</Button>
          </div>
          <div className="flex flex-wrap items-center gap-4 mt-4 bg-[#11111E] border border-[rgba(129,140,248,0.12)] rounded-md p-6">
            <Button size="sm">Small</Button>
            <Button>Default</Button>
            <Button size="lg">Large</Button>
            <Button disabled>Disabled</Button>
          </div>
        </Section>

        <Section title="Input">
          <div className="max-w-sm space-y-4 bg-[#11111E] border border-[rgba(129,140,248,0.12)] rounded-md p-6">
            <Input label="Título" placeholder="Digite o nome da mídia..." />
            <Input label="Email" placeholder="seu@email.com" type="email" error="Email inválido." />
            <Input placeholder="Sem label" />
          </div>
        </Section>

        <Section title="Badge">
          <div className="flex flex-wrap items-center gap-3 bg-[#11111E] border border-[rgba(129,140,248,0.12)] rounded-md p-6">
            <Badge variant="type" typeLabel="Filme" />
            <Badge variant="type" typeLabel="Série" />
            <Badge variant="type" typeLabel="Jogo" />
            <Badge variant="score" score={9.2} />
            <Badge variant="score" score={7.5} />
            <Badge variant="score" score={4.1} />
            <Badge variant="status" statusLabel="Free" />
            <Badge variant="status" statusLabel="Plus" />
            <Badge variant="status" statusLabel="Premium" />
          </div>
        </Section>

        <Section title="Skeleton">
          <div className="space-y-3 bg-[#11111E] border border-[rgba(129,140,248,0.12)] rounded-md p-6">
            <div className="flex items-center gap-3">
              <Skeleton variant="circle" className="w-10 h-10" />
              <div className="space-y-2 flex-1">
                <Skeleton variant="text" className="w-3/4" />
                <Skeleton variant="text" className="w-1/2" />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <Skeleton variant="card" className="w-full" />
              <Skeleton variant="card" className="w-full" />
              <Skeleton variant="card" className="w-full" />
            </div>
          </div>
        </Section>

        <Section title="Spinner">
          <div className="flex items-center gap-6 bg-[#11111E] border border-[rgba(129,140,248,0.12)] rounded-md p-6">
            <Spinner size="sm" />
            <Spinner size="md" />
            <Spinner size="lg" />
          </div>
        </Section>

        <Section title="EmptyState">
          <EmptyState
            title="Nada por aqui ainda"
            description="Adicione títulos à sua watchlist para começar a ver recomendações."
            action={<Button variant="default">Explorar catálogo</Button>}
          />
        </Section>

        <Section title="ErrorState">
          <ErrorState
            title="Erro ao carregar"
            description="Não foi possível conectar ao servidor. Verifique sua conexão."
            onRetry={() => alert("Tentar novamente")}
          />
        </Section>
      </div>
    </LayeredBackground>
  );
}

"use client";

/**
 * CarouselControls (T405/D-380) — ilha client mínima para as setas de scroll
 * do carrossel. Só hidrata 2 botões por carrossel (6 no total), sem tocar no
 * shell dos 60 cards (que permanece HTML puro do servidor).
 *
 * O scroll usa o id do container de lista (renderizado pelo MediaCarousel
 * server) via document.getElementById — sem ref compartilhado entre árvores.
 */
export function CarouselControls({
  listId,
  prevLabel,
  nextLabel,
}: {
  listId: string;
  prevLabel: string;
  nextLabel: string;
}) {
  const scroll = (dir: 1 | -1) => {
    document.getElementById(listId)?.scrollBy({ left: dir * 320, behavior: "smooth" });
  };

  const btnClass =
    "flex h-8 w-8 items-center justify-center rounded-full border border-[#2A2A3D] text-[#A0A0B8] transition-colors hover:border-[#3A3A52] hover:text-[#F5F5F7]";

  return (
    <div className="ml-auto hidden gap-2 lg:flex">
      <button type="button" onClick={() => scroll(-1)} aria-label={prevLabel} className={btnClass}>
        ‹
      </button>
      <button type="button" onClick={() => scroll(1)} aria-label={nextLabel} className={btnClass}>
        ›
      </button>
    </div>
  );
}

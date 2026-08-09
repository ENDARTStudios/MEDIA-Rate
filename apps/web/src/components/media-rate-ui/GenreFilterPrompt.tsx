"use client";

/**
 * Popover com as duas opções de filtro de gênero (Addendum 2 §4.2):
 * "Ver mais {gênero} em {mídia}" (mesma mídia) vs.
 * "Ver {gênero} em todas as mídias" (cross-media — diferencial do produto).
 */
import * as Dialog from "@radix-ui/react-dialog";
import { useTranslations } from "next-intl";
import { Link } from "@/lib/navigation";
import { genreSlug } from "@/lib/i18n-content";
import type { MediaType } from "@/lib/types";

export interface GenreFilterPromptProps {
  genre: string;
  mediaType: MediaType;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const TYPE_PARAM: Record<MediaType, string> = {
  movie: "movie",
  series: "series",
  game: "game",
  book: "book",
  comic: "comic",
  manga: "manga",
};

const MEDIA_LABEL: Record<MediaType, string> = {
  movie: "Filmes",
  series: "Séries",
  game: "Games",
  book: "Livros",
  comic: "HQs",
  manga: "Mangás",
};

export function GenreFilterPrompt({
  genre,
  mediaType,
  open,
  onOpenChange,
}: GenreFilterPromptProps) {
  const t = useTranslations("metadados");
  const slug = genreSlug(genre);
  const mediaLabel = MEDIA_LABEL[mediaType] ?? mediaType;

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-modal bg-black/50" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-modal w-[calc(100vw-2rem)] max-w-xs -translate-x-1/2 -translate-y-1/2 rounded-xl border border-[#2A2A3D] bg-[#12121C] p-5 shadow-floating focus:outline-none">
          <Dialog.Title className="font-heading text-sm font-semibold text-[#F5F5F7]">
            {t("genrePrompt", { genre })}
          </Dialog.Title>
          <div className="mt-4 space-y-2">
            <Link
              href={`/catalog?type=${TYPE_PARAM[mediaType]}&genero=${slug}`}
              className="block rounded-lg border border-[#2A2A3D] bg-[#1B1B2C] px-3 py-2 text-sm text-[#F5F5F7] transition-colors hover:border-[#3A3A52]"
              onClick={() => onOpenChange(false)}
            >
              {t("sameMedia", { genre, media: mediaLabel })}
            </Link>
            <Link
              href={`/catalog?genero=${slug}`}
              className="block rounded-lg border border-[#818CF8]/30 bg-[#818CF8]/10 px-3 py-2 text-sm text-[#A5B4FC] transition-colors hover:bg-[#818CF8]/15"
              onClick={() => onOpenChange(false)}
            >
              {t("allMedia", { genre })}
            </Link>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

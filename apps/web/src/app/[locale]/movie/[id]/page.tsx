import { notFound, permanentRedirect } from "next/navigation";
import { getMediaBySlug } from "@/lib/api";

interface Props {
  params: Promise<{ locale: string; id: string }>;
}

// T338: rota legada /movie/[id] — redirect permanente para o canônico
// /media/[slug] (remove página client-only duplicada e indexável).
export default async function MovieDetailRedirect({ params }: Props) {
  const { locale, id } = await params;
  const media = await getMediaBySlug(id);
  if (!media) notFound();
  permanentRedirect(`/${locale}/media/${media.slug}`);
}

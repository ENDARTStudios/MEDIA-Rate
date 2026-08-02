import { serializeJsonLd } from "@/lib/sanitize";

interface StructuredDataProps {
  data: Record<string, unknown> | Record<string, unknown>[];
}

export function StructuredData({ data }: StructuredDataProps) {
  const json = serializeJsonLd(data);

  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: json }} />;
}

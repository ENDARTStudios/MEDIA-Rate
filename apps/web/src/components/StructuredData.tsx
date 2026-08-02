import { serializeJsonLd } from "@/lib/json-ld";

interface StructuredDataProps {
  data: Record<string, unknown> | Record<string, unknown>[];
}

export function StructuredData({ data }: StructuredDataProps) {
  const json = serializeJsonLd(data);

  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: json }} />;
}

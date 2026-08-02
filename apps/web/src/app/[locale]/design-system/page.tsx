import type { Metadata } from "next";
import { DesignSystemClient } from "../../../components/DesignSystemClient";

export const metadata: Metadata = {
  title: "Design System — MEDIA Rate",
  description: "Página de demonstração dos componentes do design system MEDIA Rate.",
  robots: { index: false, follow: false },
};

export default function DesignSystemPage() {
  return <DesignSystemClient />;
}

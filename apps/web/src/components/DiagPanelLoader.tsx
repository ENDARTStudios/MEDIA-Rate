"use client";

import dynamic from "next/dynamic";

const DiagPanelSafeInner = dynamic(
  () => import("./DiagPanelSafe").then((m) => ({ default: m.DiagPanelSafe })),
  { ssr: false },
);

export function DiagPanelLoader() {
  return <DiagPanelSafeInner />;
}

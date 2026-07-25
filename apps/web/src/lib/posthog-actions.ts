"use server";

import { posthog } from "./posthog";

export async function captureCheckoutInitiated(plan: string, distinctId: string) {
  if (!posthog) return;
  posthog.capture({ distinctId, event: "checkout initiated", properties: { plan } });
  await posthog.flush();
}

export async function captureConsentAccepted(distinctId: string) {
  if (!posthog) return;
  posthog.capture({ distinctId, event: "consent accepted" });
  await posthog.flush();
}

export async function captureConsentRejected(distinctId: string) {
  if (!posthog) return;
  posthog.capture({ distinctId, event: "consent rejected" });
  await posthog.flush();
}

export async function captureDataExportRequested(distinctId: string) {
  if (!posthog) return;
  posthog.capture({ distinctId, event: "data export requested" });
  await posthog.flush();
}

export async function captureDataDeletionRequested(distinctId: string) {
  if (!posthog) return;
  posthog.capture({ distinctId, event: "data deletion requested" });
  await posthog.flush();
}

export async function capturePageErrorOccurred(
  distinctId: string,
  digest: string | undefined
) {
  if (!posthog) return;
  posthog.capture({
    distinctId,
    event: "page error occurred",
    properties: { digest: digest ?? null },
  });
  await posthog.flush();
}

export async function captureMediaCardClicked(
  distinctId: string,
  mediaId: string,
  mediaType: string,
  mediaTitle: string
) {
  if (!posthog) return;
  posthog.capture({
    distinctId,
    event: "media card clicked",
    properties: { media_id: mediaId, media_type: mediaType, media_title: mediaTitle },
  });
  await posthog.flush();
}

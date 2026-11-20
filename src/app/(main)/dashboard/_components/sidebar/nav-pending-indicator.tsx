"use client";

import { useLinkStatus } from "next/link";

import { LoaderCircle } from "lucide-react";
import { createPortal } from "react-dom";

/**
 * Small corner pill shown while a sidebar navigation is in flight.
 * Must be rendered inside a `<Link>`; portalled to `body` so sidebar transforms don't trap it.
 */
export function NavPendingIndicator() {
  const { pending } = useLinkStatus();

  if (!pending || typeof document === "undefined") {
    return null;
  }

  return createPortal(
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed top-3 right-3 z-50 flex items-center gap-2 rounded-full border bg-card px-3 py-1.5 text-foreground text-xs shadow-md duration-200 animate-in fade-in"
    >
      <LoaderCircle className="size-3.5 motion-safe:animate-spin" aria-hidden="true" />
      Memuat halaman…
    </div>,
    document.body,
  );
}

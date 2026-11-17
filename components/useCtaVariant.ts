"use client";
import { useEffect, useState } from "react";
import { ctaVariantFrom, type CtaVariant } from "@/lib/ctaVariant";

// TEMPORARY (SCP-30): reads ?cta= from the address after the page has loaded, so the page itself stays as it is.
export function useCtaVariant(): CtaVariant | null {
  const [variant, setVariant] = useState<CtaVariant | null>(null);
  useEffect(() => { setVariant(ctaVariantFrom(window.location.search)); }, []);
  return variant;
}

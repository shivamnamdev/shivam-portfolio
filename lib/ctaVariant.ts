// lib/ctaVariant.ts
// TEMPORARY (SCP-30): three looks for the enroll buttons, chosen with ?cta=a, ?cta=b or ?cta=c on a course page so the owner can compare them on the real
// page. Once one is chosen the other two and this switch are removed. No ?cta (or any other value) keeps today's look exactly.
export type CtaVariant = "a" | "b" | "c";

export function ctaVariantFrom(search: string): CtaVariant | null {
  const v = new URLSearchParams(search).get("cta");
  return v === "a" || v === "b" || v === "c" ? v : null;
}

// The look classes live in components/ctaLook.ts: Tailwind only scans app/ and components/, so classes written in lib/ would never be generated.

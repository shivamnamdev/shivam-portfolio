// components/ctaLook.ts
// TEMPORARY (SCP-30): the three looks (see lib/ctaVariant.ts). Kept under components/ so Tailwind sees the class names.
import type { CtaVariant } from "@/lib/ctaVariant";

// The colour, shadow and press behaviour of the button for each look; sizes and layout stay in the component.
export const CTA_LOOK: Record<CtaVariant, string> = {
  a: "bg-gradient-to-br from-amber-300 via-amber-500 to-orange-600 text-black ring-1 ring-amber-300/40 shadow-[0_10px_40px_-8px_rgba(245,158,11,0.8)] hover:scale-[1.02] hover:brightness-110",
  b: "bg-white text-black shadow-[0_8px_30px_-10px_rgba(255,255,255,0.5)] hover:bg-stone-100 hover:scale-[1.02]",
  c: "bg-amber-500 text-black shadow-[0_6px_0_#b45309] hover:bg-amber-400 active:translate-y-[4px] active:shadow-[0_2px_0_#b45309]",
};

// The small line of facts under the Buy Now button (real facts only: nothing here is a counter or a deadline).
export const CTA_TRUST: Record<CtaVariant, string[]> = {
  a: ["Secure payment", "Certificate", "Recordings"],
  b: ["Secure payment", "Certificate"],
  c: ["Secure payment", "Certificate"],
};

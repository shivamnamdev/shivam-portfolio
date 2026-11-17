// components/ctaStyles.ts
// The look of the enroll buttons (SCP-30, chosen by the owner). Kept under components/ because Tailwind only scans app/ and components/, so class names
// written in lib/ would never be generated. Sizes and layout stay in each component; these are colour, shadow and press behaviour.

// Buttons that take payment (Buy Now in the price box, the popular plan): amber gradient with a soft glow.
export const CTA_BUY = "bg-gradient-to-br from-amber-300 via-amber-500 to-orange-600 text-black ring-1 ring-amber-300/40 shadow-[0_10px_40px_-8px_rgba(245,158,11,0.8)] hover:scale-[1.02] hover:brightness-110";

// Buttons that lead to the enroll section (hero, mobile sticky bar): solid amber "raised key" that presses down.
export const CTA_ENROLL = "bg-amber-500 text-black shadow-[0_6px_0_#b45309] hover:bg-amber-400 active:translate-y-[4px] active:shadow-[0_2px_0_#b45309]";

// The small line of facts under Buy Now. Plain facts only: nothing here is a counter, a deadline or a number.
export const CTA_TRUST = ["Secure payment", "Certificate", "Recordings"] as const;

// data/coupons.ts

// QA-only coupon (testing). Present only when NEXT_PUBLIC_QA_FIXTURES=1 AND at least one Clerk id is listed in
// NEXT_PUBLIC_QA_FREE_COUPON_USERS (comma separated). An empty allowedUsers list means "anyone" in this file,
// so the coupon must never be created without ids (fail closed).
const qaFreeCouponUsers = (process.env.NEXT_PUBLIC_QA_FREE_COUPON_USERS ?? "")
  .split(",").map((id) => id.trim()).filter(Boolean);
const qaCoupons = process.env.NEXT_PUBLIC_QA_FIXTURES === "1" && qaFreeCouponUsers.length > 0
  ? [{ code: "QA100", discountType: "percentage", discountValue: 100, allowedUsers: qaFreeCouponUsers }]
  : [];

export const activeCoupons =[
  {
    code: "EXISTINGSTUDENT_BATCH03",
    discountType: "fixed", // 'percentage' or 'fixed'
    discountValue: {
      inr: 1999, // ₹200 off for India
      usd: 50   // $50 off for International
    }, // 20% off
    allowedUsers: [] // 🚨 Leave empty[] to let ANYONE use it!
  },
    {
    code: "BATCH002",
    discountType: "percentage", // 'percentage' or 'fixed'
    discountValue: 100, // 20% off
    allowedUsers: ["user_3ChU9lMA47mP3LjIHzDKNF4v2gL","user_3D84WbD9HLD1yoI7dv2fvoQnhSW","user_3CzHNoNIgWKBOhQwxaPDUIJHB26", "user_3DniqVaPnd6GomLOmxcee97P3ZF"] // 🚨 Leave empty[] to let ANYONE use it!
  },
  {
    code: "BIRTHDAY20",
    discountType: "percentage", // 'percentage' or 'fixed'
    discountValue: 20, // 20% off
    allowedUsers: [] // 🚨 Leave empty[] to let ANYONE use it!
  },
  {
    code: "SHIVAMSPECIAL",
    discountType: "fixed",
    discountValue: {
      inr: 200, // ₹200 off for India
      usd: 50   // $50 off for International
    },
    // 🚨 Add specific Clerk User IDs here to lock the coupon to them!
    allowedUsers: ["user_2aBcD1234567890"] 
  }
  ,
  ...qaCoupons
];

// data/coupons.ts

export const activeCoupons =[
    {
    code: "BATCH002",
    discountType: "percentage", // 'percentage' or 'fixed'
    discountValue: 100, // 20% off
    allowedUsers: ["user_3D84WbD9HLD1yoI7dv2fvoQnhSW","user_3CzHNoNIgWKBOhQwxaPDUIJHB26"] // 🚨 Leave empty[] to let ANYONE use it!
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
];
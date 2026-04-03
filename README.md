# Shivam Namdev Portfolio

This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app). It's configured for static export to deploy on S3 or any static hosting service.

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Building for Production

To build the static version for S3 deployment:

```bash
npm run build
```

This creates an `out/` folder with static files. The build output will show:
- ✓ Compiled successfully
- ○ (Static) prerendered as static content
- Route sizes (e.g., / at 131 kB)

## Deploying to S3

1. Build the project: `npm run build`
2. Upload the `out/` folder to your S3 bucket.
3. Enable static website hosting in S3 settings (index: `index.html`, error: `404.html`).
4. Make the bucket public or use CloudFront.
5. Access your site at the S3 URL.

## Configuration for S3

In `next.config.mjs`, we set:
- `output: 'export'` for static generation.
- `trailingSlash: true` for S3 URL compatibility.
- `images: { unoptimized: true }` to skip image optimization.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel (Alternative)

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

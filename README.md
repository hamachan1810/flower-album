# 花言葉図鑑 (Flower Language Encyclopedia)

A full-stack mobile-first flower album app built with Next.js 14. Upload photos, let AI (Claude) analyze flowers and their symbolic meanings, discover where flowers grow nearby via iNaturalist, and explore a birthday flower calendar.

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Create `.env.local` and add your Anthropic API key:
   ```
   ANTHROPIC_API_KEY=your_anthropic_api_key_here
   ```

3. Run the development server:
   ```bash
   npm run dev
   ```

4. Open [http://localhost:3000](http://localhost:3000)

## Features

- **Album** (`/`) - Browse all flowers with search and filters (emotion, season, scene, culture, birth month)
- **Upload** (`/upload`) - Upload flower photos; AI analyzes and records flower language, emotions, origin
- **Wishlist** (`/wishlist`) - Track flowers you want to photograph
- **Calendar** (`/calendar`) - Birthday flower calendar by month
- **Flower Detail** (`/flower/[id]`) - Full info with photo swiper, editable personal records
- **Map** (`/map/[id]`) - Find nearby observations via iNaturalist (Leaflet map)

## Tech Stack

- Next.js 14 App Router + TypeScript
- Tailwind CSS
- better-sqlite3 (local database: `flowers.db`)
- @anthropic-ai/sdk (claude-sonnet-4-5 model)
- Leaflet + react-leaflet (maps)
- Wikimedia Commons API (reference images)
- iNaturalist API (observation locations)

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

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

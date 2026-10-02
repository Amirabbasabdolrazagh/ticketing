This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://github.com/vercel/next.js/tree/canary/packages/create-next-app).

## Telegram notifications

Set the three `TELEGRAM_*` variables from `.env.example`. Then configure the bot webhook once:

```bash
curl -X POST "https://api.telegram.org/bot<BOT_TOKEN>/setWebhook" \
  -d "url=https://YOUR_DOMAIN/api/telegram/webhook" \
  -d "secret_token=<TELEGRAM_WEBHOOK_SECRET>"
```

Each support agent must open Settings and select **اتصال حساب تلگرام** once. Telegram bots cannot initiate a conversation from a phone number alone; starting and linking the bot is required by Telegram.

## Public website customer-lead intake

The corporate website can register prospective customers through:

```text
POST /api/public/leads
```

Set the production origin explicitly (the safe default is already the corporate site):

```bash
PUBLIC_INTAKE_ORIGIN=https://itrasam.com
```

The endpoint accepts `name`, `phone`, and `message`, validates Iranian mobile
numbers, limits repeated submissions per mobile number, and stores a new lead
with `source: "website"`. Leads are kept separate from support tickets and are
available to administrators at `/admin/leads`, where their follow-up status can
be managed.

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

You can start editing the page by modifying `app/page.js`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

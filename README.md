# Prisma Admin Studio

Prisma Admin Studio is a Next.js application for turning a Prisma schema into a customizable, role-aware admin dashboard.

## Development

Install dependencies and start the development server:

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Validation

```bash
npm test
npm run typecheck
npm run build
```

## Foundation

- Next.js App Router and TypeScript
- Tailwind CSS
- shadcn/ui configuration and design tokens
- Vitest for unit tests

Studio screens belong in `src/app`. Shared utilities belong in `src/lib`.

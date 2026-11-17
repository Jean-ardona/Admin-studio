/** Static project configuration files: package.json, tsconfig, Next.js, PostCSS, env, gitignore. */

export const packageJsonTemplate = (): string =>
  `${JSON.stringify(
    {
      name: "admin-dashboard",
      version: "0.1.0",
      private: true,
      scripts: {
        dev: "next dev",
        build: "next build",
        start: "next start",
        "db:push": "prisma db push",
        "db:seed": "prisma db seed",
        postinstall: "prisma generate",
      },
      // Command used by `prisma db seed` to run the sample data script.
      prisma: {
        seed: "tsx prisma/seed.ts",
      },
      dependencies: {
        "@prisma/client": "^6.0.0",
        next: "^15.0.0",
        react: "^19.0.0",
        "react-dom": "^19.0.0",
      },
      devDependencies: {
        "@tailwindcss/postcss": "^4.0.0",
        "@types/node": "^20",
        "@types/react": "^19",
        "@types/react-dom": "^19",
        prisma: "^6.0.0",
        tailwindcss: "^4.0.0",
        tsx: "^4.19.0",
        typescript: "^5",
      },
    },
    null,
    2,
  )}\n`;

export const tsconfigTemplate = (): string =>
  `${JSON.stringify(
    {
      compilerOptions: {
        target: "ES2017",
        lib: ["dom", "dom.iterable", "esnext"],
        allowJs: true,
        skipLibCheck: true,
        strict: true,
        noEmit: true,
        esModuleInterop: true,
        module: "esnext",
        moduleResolution: "bundler",
        resolveJsonModule: true,
        isolatedModules: true,
        jsx: "preserve",
        incremental: true,
        plugins: [{ name: "next" }],
        paths: { "@/*": ["./*"] },
      },
      include: ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
      exclude: ["node_modules"],
    },
    null,
    2,
  )}\n`;

export const nextConfigTemplate = (): string => `import type { NextConfig } from "next";

// Next.js configuration. Add options here as the project grows.
const nextConfig: NextConfig = {};

export default nextConfig;
`;

export const postcssConfigTemplate = (): string => `// Tailwind CSS v4 runs as a PostCSS plugin.
const config = {
  plugins: {
    "@tailwindcss/postcss": {},
  },
};

export default config;
`;

export const envTemplate = (): string => `# SQLite database file, relative to the prisma/ folder.
DATABASE_URL="file:./dev.db"
`;

export const gitignoreTemplate = (): string => `# dependencies
node_modules

# Next.js build output
.next
out
next-env.d.ts
*.tsbuildinfo

# local environment and database
.env
.env.local
prisma/*.db
prisma/*.db-journal
`;

import { describe, expect, it } from "vitest";

import { parseSchema } from "../parser";
import { buildDefaultStudioConfig } from "../studio-config";

import { generateSkeleton, modelSlug } from "./index";

const source = `
  enum Status {
    DRAFT
    LIVE
  }

  model BlogPost {
    id       Int      @id @default(autoincrement())
    title    String   @unique
    status   Status   @default(DRAFT)
    authorId Int
    author   Author   @relation(fields: [authorId], references: [id], onDelete: Cascade)
  }

  model Author {
    id    Int        @id @default(autoincrement())
    posts BlogPost[]
  }
`;

const build = () => buildDefaultStudioConfig(parseSchema(source));
const file = (files: { path: string; content: string }[], path: string) =>
  files.find((f) => f.path === path)?.content ?? "";

describe("generateSkeleton", () => {
  it("returns the skeleton files with unique paths", () => {
    const paths = generateSkeleton(build()).map((f) => f.path);

    expect(new Set(paths).size).toBe(paths.length);
    expect(paths).toEqual(
      expect.arrayContaining([
        "package.json",
        "tsconfig.json",
        "next.config.ts",
        "postcss.config.mjs",
        ".env",
        ".gitignore",
        "README.md",
        "prisma/schema.prisma",
        "lib/prisma.ts",
        "app/globals.css",
        "app/layout.tsx",
        "components/sidebar.tsx",
        "components/top-bar.tsx",
      ]),
    );
  });

  it("is deterministic and does not mutate the config", () => {
    const config = build();
    const before = structuredClone(config);

    expect(generateSkeleton(config)).toEqual(generateSkeleton(config));
    expect(config).toEqual(before);
  });

  it("builds the sidebar menu from enabled models using config labels", () => {
    const config = build();
    config.models.BlogPost.label = "Articles";
    config.models.Author.enabledPages = ["detail"];
    const files = generateSkeleton(config);

    const nav = file(files, "lib/navigation.ts");
    expect(nav).toContain('"label": "Articles"');
    expect(nav).toContain('"href": "/blog-post"');
    expect(nav).not.toContain("Author");
    expect(file(files, "app/page.tsx")).toContain('redirect("/blog-post")');
  });

  it("shows a hint on the home page when no model is enabled", () => {
    const config = build();
    for (const m of Object.values(config.models)) m.enabledPages = [];
    const files = generateSkeleton(config);

    expect(file(files, "app/page.tsx")).toContain("No models are enabled");
    expect(file(files, "lib/navigation.ts")).toContain("navItems: NavItem[] = []");
  });

  it("generates a SQLite Prisma schema that round-trips through the parser", () => {
    const prisma = file(generateSkeleton(build()), "prisma/schema.prisma");

    expect(prisma).toContain('provider = "sqlite"');
    expect(prisma).toContain('env("DATABASE_URL")');
    expect(prisma).toContain("onDelete: Cascade");

    const reparsed = parseSchema(prisma);
    expect(reparsed.models.map((m) => m.name)).toEqual(["BlogPost", "Author"]);
    expect(reparsed.enums).toEqual([{ name: "Status", values: ["DRAFT", "LIVE"] }]);
  });

  it("includes the Prisma client singleton, env and gitignore", () => {
    const files = generateSkeleton(build());

    expect(file(files, "lib/prisma.ts")).toContain("globalForPrisma");
    expect(file(files, ".env")).toContain('DATABASE_URL="file:./dev.db"');
    expect(file(files, ".gitignore")).toContain("node_modules");
    expect(file(files, "README.md")).toContain("npx prisma db push");
  });

  it("emits valid JSON for package.json and tsconfig.json", () => {
    const files = generateSkeleton(build());

    expect(JSON.parse(file(files, "package.json")).dependencies["@prisma/client"]).toBeDefined();
    expect(JSON.parse(file(files, "tsconfig.json")).compilerOptions.strict).toBe(true);
  });
});

describe("modelSlug", () => {
  it("converts model names to kebab-case", () => {
    expect(modelSlug("BlogPost")).toBe("blog-post");
    expect(modelSlug("User")).toBe("user");
    expect(modelSlug("HTTPLog")).toBe("http-log");
  });
});

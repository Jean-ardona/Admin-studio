import { describe, expect, it } from "vitest";

import { parseSchema } from "../../parser";
import { buildDefaultStudioConfig } from "../../studio-config";
import { generateProject } from "../project";
import { packageJsonTemplate } from "./config-files";
import { readmeTemplate } from "./readme";
import { seedOrder, seedTemplate } from "./seed";

const source = `
  enum Status {
    DRAFT
    LIVE
  }

  model BlogPost {
    id       Int      @id @default(autoincrement())
    title    String   @unique
    status   Status   @default(DRAFT)
    score    Float
    views    Int?
    createdAt DateTime @default(now())
    authorId Int
    author   Author   @relation(fields: [authorId], references: [id], onDelete: Cascade)
    tags     String[]
  }

  model Author {
    id    Int        @id @default(autoincrement())
    email String     @unique
    posts BlogPost[]
  }
`;

const schema = parseSchema(source);
const seed = seedTemplate(schema);

describe("seedTemplate", () => {
  it("is deterministic and does not mutate the schema", () => {
    const before = structuredClone(schema);
    expect(seedTemplate(schema)).toBe(seed);
    expect(schema).toEqual(before);
  });

  it("creates parents before children and clears children first", () => {
    expect(seedOrder(schema).map((m) => m.name)).toEqual(["Author", "BlogPost"]);
    expect(seed.indexOf("prisma.author.create")).toBeLessThan(seed.indexOf("prisma.blogPost.create"));
    expect(seed.indexOf("prisma.blogPost.deleteMany")).toBeLessThan(
      seed.indexOf("prisma.author.deleteMany"),
    );
  });

  it("links foreign keys to created rows and gives unique values per row", () => {
    expect(seed).toContain("authorId: author1.id,");
    expect(seed).toContain("authorId: author3.id,");
    expect(seed).toContain('email: "author1@example.com"');
    expect(seed).toContain('title: "Title 2"');
  });

  it("fills required fields, cycles enums, and skips defaults, lists and relation fields", () => {
    expect(seed).toContain("score: 1.5,");
    expect(seed).toContain("views: 2,");
    expect(seed).toContain('status: "DRAFT"');
    expect(seed).toContain('status: "LIVE"');
    expect(seed).not.toContain("createdAt:");
    expect(seed).not.toContain("tags:");
    expect(seed).not.toMatch(/\bid:/);
    expect(seed).not.toMatch(/\bposts:/);
  });

  it("breaks cycles on optional links and omits the optional foreign key", () => {
    const cyclic = parseSchema(`
      model A {
        id  Int @id @default(autoincrement())
        bId Int?
        b   B?  @relation(fields: [bId], references: [id])
      }
      model B {
        id  Int @id @default(autoincrement())
        aId Int
        a   A   @relation(fields: [aId], references: [id])
      }
    `);
    const out = seedTemplate(cyclic);

    expect(seedOrder(cyclic).map((m) => m.name)).toEqual(["A", "B"]);
    expect(out).toContain("aId: a1.id,");
    expect(out).not.toContain("bId:");
  });

  it("handles a schema without models", () => {
    expect(seedTemplate({ models: [], enums: [] })).toContain("nothing to seed");
  });
});

describe("seed wiring", () => {
  it("adds prisma/seed.ts to the generated project", () => {
    const files = generateProject(buildDefaultStudioConfig(schema));
    expect(files.find((f) => f.path === "prisma/seed.ts")?.content).toBe(seed);
  });

  it("configures the prisma seed command and a db:seed script", () => {
    const pkg = JSON.parse(packageJsonTemplate());
    expect(pkg.prisma.seed).toBe("tsx prisma/seed.ts");
    expect(pkg.scripts["db:seed"]).toBe("prisma db seed");
    expect(pkg.devDependencies.tsx).toBeDefined();
  });

  it("mentions the seed script in the README", () => {
    expect(readmeTemplate([])).toContain("npm run db:seed");
  });
});

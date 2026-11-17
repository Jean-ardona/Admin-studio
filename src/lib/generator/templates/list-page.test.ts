import { describe, expect, it } from "vitest";

import { parseSchema } from "../../parser";
import { buildDefaultStudioConfig } from "../../studio-config";
import { generateProject } from "../index";

const source = `
  model BlogPost {
    id       Int    @id @default(autoincrement())
    title    String
    body     String
    authorId Int
    author   Author @relation(fields: [authorId], references: [id])
  }

  model Author {
    id    Int        @id @default(autoincrement())
    name  String
    posts BlogPost[]
  }
`;

const build = () => buildDefaultStudioConfig(parseSchema(source));
const file = (files: { path: string; content: string }[], path: string) =>
  files.find((f) => f.path === path)?.content ?? "";

describe("list page templates", () => {
  it("generates a page and a table for every model with the list page enabled", () => {
    const config = build();
    config.models.Author.enabledPages = ["detail"];
    const paths = generateProject(config).map((f) => f.path);

    expect(paths).toEqual(
      expect.arrayContaining(["app/blog-post/page.tsx", "components/blog-post-table.tsx", "lib/format.ts"]),
    );
    expect(paths).not.toContain("app/author/page.tsx");
    expect(new Set(paths).size).toBe(paths.length);
  });

  it("generates no list files when no list page is enabled", () => {
    const config = build();
    for (const m of Object.values(config.models)) m.enabledPages = [];
    const paths = generateProject(config).map((f) => f.path);

    expect(paths).not.toContain("lib/format.ts");
    expect(paths.some((p) => p.endsWith("-table.tsx"))).toBe(false);
  });

  it("uses visible columns, their order and labels", () => {
    const config = build();
    const cols = config.models.BlogPost.columns;
    config.models.BlogPost.columns = [
      { ...cols.find((c) => c.field === "title")!, label: "Headline" },
      { ...cols.find((c) => c.field === "id")!, visible: true },
      { ...cols.find((c) => c.field === "body")!, visible: false },
    ];
    const table = file(generateProject(config), "components/blog-post-table.tsx");

    expect(table).toContain('{ key: "title", label: "Headline" }');
    expect(table.indexOf('"title"')).toBeLessThan(table.indexOf('key: "id"'));
    expect(table).not.toContain('key: "body"');
  });

  it("links to detail, edit and create only when those pages are enabled", () => {
    const all = generateProject(build());
    expect(file(all, "components/blog-post-table.tsx")).toContain("/blog-post/${String(row.id)}/edit");
    expect(file(all, "app/blog-post/page.tsx")).toContain('href="/blog-post/new"');

    const config = build();
    config.models.BlogPost.enabledPages = ["list"];
    const files = generateProject(config);
    const table = file(files, "components/blog-post-table.tsx");
    const page = file(files, "app/blog-post/page.tsx");

    expect(table).not.toContain("next/link");
    expect(table).not.toContain("Actions");
    expect(page).not.toContain("/new");
    expect(page).not.toContain("showEdit");
  });

  it("queries the right Prisma delegate and uses permissions to show buttons and links", () => {
    const page = file(generateProject(build()), "app/blog-post/page.tsx");

    expect(page).toContain("prisma.blogPost.findMany");
    expect(page).toContain('if (!can(role, "BlogPost", "view")) return <NotAllowed />;');
    expect(page).toContain('const showCreate = can(role, "BlogPost", "create");');
    expect(page).toContain('const showEdit = can(role, "BlogPost", "edit");');
    expect(page).toContain('const showDetail = can(role, "BlogPost", "view");');
  });

  it("is deterministic and does not mutate the config", () => {
    const config = build();
    const before = structuredClone(config);

    expect(generateProject(config)).toEqual(generateProject(config));
    expect(config).toEqual(before);
  });
});

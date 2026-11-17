import { describe, expect, it } from "vitest";

import { parseSchema } from "../../parser";
import { buildDefaultStudioConfig } from "../../studio-config";
import { generateProject } from "../index";

const source = `
  enum Role {
    ADMIN
    USER
  }

  model BlogPost {
    id        Int      @id @default(autoincrement())
    title     String
    body      String?
    views     Int
    published Boolean
    role      Role
    createdAt DateTime
    authorId  Int
    author    Author   @relation(fields: [authorId], references: [id])
  }

  model Author {
    id    String     @id
    name  String
    posts BlogPost[]
  }
`;

const build = () => buildDefaultStudioConfig(parseSchema(source));
const file = (files: { path: string; content: string }[], path: string) =>
  files.find((f) => f.path === path)?.content ?? "";

describe("create, edit and detail templates", () => {
  it("generates every page, the form and the actions for fully enabled models", () => {
    const paths = generateProject(build()).map((f) => f.path);

    expect(paths).toEqual(
      expect.arrayContaining([
        "app/blog-post/new/page.tsx",
        "app/blog-post/[id]/page.tsx",
        "app/blog-post/[id]/edit/page.tsx",
        "app/blog-post/actions.ts",
        "components/blog-post-form.tsx",
      ]),
    );
    expect(new Set(paths).size).toBe(paths.length);
  });

  it("only generates the pages that are enabled", () => {
    const config = build();
    config.models.BlogPost.enabledPages = ["list", "create"];
    config.models.Author.enabledPages = [];
    const files = generateProject(config);
    const paths = files.map((f) => f.path);

    expect(paths).toContain("app/blog-post/new/page.tsx");
    expect(paths).not.toContain("app/blog-post/[id]/page.tsx");
    expect(paths).not.toContain("app/blog-post/[id]/edit/page.tsx");
    expect(paths.some((p) => p.startsWith("app/author/"))).toBe(false);

    const actions = file(files, "app/blog-post/actions.ts");
    expect(actions).toContain("export async function createBlogPost");
    expect(actions).not.toContain("updateBlogPost");
    expect(actions).not.toContain("deleteBlogPost");
  });

  it("renders form inputs by their configured type", () => {
    const form = file(generateProject(build()), "components/blog-post-form.tsx");

    expect(form).toContain('name="title" type="text"');
    expect(form).toContain('name="views" type="number" step="1"');
    expect(form).toContain('name="published" type="checkbox"');
    expect(form).toContain('name="createdAt" type="datetime-local"');
    expect(form).toContain('<option value="ADMIN">ADMIN</option>');
    expect(form).toContain("prisma.author.findMany");
    expect(form).toContain('name="authorId"');
  });

  it("respects form field order, removals and input overrides", () => {
    const config = build();
    const fields = config.models.BlogPost.formFields;
    config.models.BlogPost.formFields = [
      { field: "title", input: "textarea" },
      ...fields.filter((f) => f.field === "views"),
    ];
    const form = file(generateProject(config), "components/blog-post-form.tsx");

    expect(form).toContain("<textarea");
    expect(form).not.toContain('name="published"');
    expect(form.indexOf('name="title"')).toBeLessThan(form.indexOf('name="views"'));
  });

  it("converts form values by Prisma type in the actions", () => {
    const actions = file(generateProject(build()), "app/blog-post/actions.ts");

    expect(actions).toContain('"use server";');
    expect(actions).toContain("views: Number(viewsRaw)");
    expect(actions).toContain("body: bodyRaw,");
    expect(actions).toContain('published: formData.get("published") === "on"');
    expect(actions).toContain("createdAt: createdAtRaw === null ? new Date() : new Date(createdAtRaw)");
    expect(actions).toContain('as Role');
    expect(actions).toContain("prisma.blogPost.create");
    expect(actions).toContain("where: { id: Number(id) }");
  });

  it("parses string ids without conversion and checks permissions in every action", () => {
    const files = generateProject(build());
    const actions = file(files, "app/author/actions.ts");

    expect(actions).toContain("where: { id: id }");
    expect(actions.match(/PERMISSION CHECK/g)?.length).toBe(3);
    expect(actions).toContain("await getActiveRole()");
    for (const action of ["create", "edit", "delete"]) {
      expect(actions).toContain(`if (!can(role, "Author", "${action}"))`);
    }
    // The check must run before the database call.
    expect(actions.indexOf('can(role, "Author", "delete")')).toBeLessThan(actions.indexOf("prisma.author.delete"));
  });

  it("guards pages and hides detail buttons by permission", () => {
    const files = generateProject(build());
    const detail = file(files, "app/author/[id]/page.tsx");

    expect(detail).toContain('can(role, "Author", "view")');
    expect(detail).toContain("{canEdit && (");
    expect(detail).toContain("{canDelete && (");
    expect(file(files, "app/author/new/page.tsx")).toContain('can(role, "Author", "create")');
    expect(file(files, "app/author/[id]/edit/page.tsx")).toContain('can(role, "Author", "edit")');
  });

  it("filters the sidebar by the role menu and view permission", () => {
    const files = generateProject(build());

    expect(file(files, "lib/current-role.ts")).toContain('can(roleName, item.model, "view")');
    expect(file(files, "lib/current-role.ts")).toContain("menu.includes(item.model)");
    expect(file(files, "app/layout.tsx")).toContain("getVisibleNavItems()");
    expect(file(files, "components/sidebar.tsx")).toContain("items.map");
    expect(file(files, "components/not-allowed.tsx")).toContain("Not allowed");
  });

  it("uses the configured columns on the detail page and adds the formatter when no list exists", () => {
    const config = build();
    config.models.Author.enabledPages = ["detail"];
    config.models.BlogPost.enabledPages = [];
    config.models.Author.columns = [{ field: "name", label: "Full name", visible: true }];
    const files = generateProject(config);

    expect(file(files, "app/author/[id]/page.tsx")).toContain('{ key: "name", label: "Full name" }');
    expect(files.filter((f) => f.path === "lib/format.ts")).toHaveLength(1);
  });

  it("is deterministic and does not mutate the config", () => {
    const config = build();
    const before = structuredClone(config);

    expect(generateProject(config)).toEqual(generateProject(config));
    expect(config).toEqual(before);
  });
});

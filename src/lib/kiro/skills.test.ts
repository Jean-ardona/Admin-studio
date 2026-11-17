import { describe, expect, it } from "vitest";

import { generateProject } from "../generator";
import { parseSchema } from "../parser";
import { buildDefaultStudioConfig, type StudioConfig } from "../studio-config";
import { generateKiro } from "./index";
import { generateSkills } from "./skills";

const schema = parseSchema(`
  model BlogPost {
    id    Int    @id @default(autoincrement())
    title String
  }
  model Author {
    id   Int    @id @default(autoincrement())
    name String
  }
`);

const config: StudioConfig = {
  ...buildDefaultStudioConfig(schema),
  roles: [
    {
      name: "Editor",
      permissions: {
        BlogPost: { view: true, create: true, edit: true, delete: false },
        Author: { view: true, create: false, edit: false, delete: false },
      },
      menu: ["BlogPost", "Author"],
    },
  ],
};

const get = (name: string) =>
  generateSkills(config).find((f) => f.path === `.kiro/skills/${name}/SKILL.md`)!.content;

describe("generateSkills", () => {
  it("returns the four skills under .kiro/skills with frontmatter", () => {
    const files = generateSkills(config);
    expect(files.map((f) => f.path)).toEqual([
      ".kiro/skills/add-model/SKILL.md",
      ".kiro/skills/add-field/SKILL.md",
      ".kiro/skills/add-role/SKILL.md",
      ".kiro/skills/edit-page-layout/SKILL.md",
    ]);
    for (const f of files) {
      const name = f.path.split("/")[2];
      expect(f.content.startsWith(`---\nname: ${name}\ndescription: `)).toBe(true);
    }
  });

  it("is deterministic and does not mutate the config", () => {
    const before = structuredClone(config);
    expect(generateSkills(config)).toEqual(generateSkills(config));
    expect(config).toEqual(before);
  });

  it("reflects the real models, fields and roles", () => {
    expect(get("add-model")).toContain("components/blog-post-table.tsx");
    expect(get("add-model")).toContain("BlogPost, Author");
    expect(get("add-field")).toContain("`title`");
    expect(get("add-role")).toContain("Current roles: Editor");
    expect(get("edit-page-layout")).toContain("app/blog-post/");
    expect(get("add-role")).toContain("lib/roles.ts");
    expect(get("add-model")).toContain("lib/navigation.ts");
  });

  it("changes with the schema", () => {
    const other = buildDefaultStudioConfig(parseSchema("model Ticket {\n id Int @id\n}"));
    const out = generateSkills(other).map((f) => f.content).join("\n");
    expect(out).toContain("Ticket");
    expect(out).not.toContain("BlogPost");
  });

  it("handles empty schema and no roles with fallbacks", () => {
    const empty = buildDefaultStudioConfig({ models: [], enums: [] });
    const files = generateSkills(empty);
    expect(files).toHaveLength(4);
    const all = files.map((f) => f.content).join("\n");
    expect(all).toContain("(no models yet)");
    expect(all).toContain("(no roles yet)");
    expect(all).not.toContain("undefined");
  });

  it("is included in generateKiro and in the generated project", () => {
    const paths = generateProject(config).map((f) => f.path);
    for (const file of generateKiro(config)) expect(paths).toContain(file.path);
    expect(paths).toContain(".kiro/skills/add-model/SKILL.md");
  });
});

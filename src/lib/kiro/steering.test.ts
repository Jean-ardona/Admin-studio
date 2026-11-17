import { describe, expect, it } from "vitest";

import { generateProject } from "../generator";
import { parseSchema } from "../parser";
import { buildDefaultStudioConfig, type StudioConfig } from "../studio-config";
import { generateKiro } from "./index";
import { generateSteering } from "./steering";

const schema = parseSchema(`
  enum Status {
    OPEN
    CLOSED
  }
  model BlogPost {
    id     Int    @id @default(autoincrement())
    title  String @unique
    status Status
  }
  model Author {
    id   Int    @id @default(autoincrement())
    name String
  }
`);

const base = buildDefaultStudioConfig(schema);
const config: StudioConfig = {
  ...base,
  roles: [
    {
      name: "Editor",
      permissions: {
        BlogPost: { view: true, create: true, edit: true, delete: false },
        Author: { view: true, create: false, edit: false, delete: false },
      },
      menu: ["BlogPost", "Author"],
    },
    {
      name: "Guest",
      permissions: {
        BlogPost: { view: true, create: false, edit: false, delete: false },
        Author: { view: false, create: false, edit: false, delete: false },
      },
      menu: ["BlogPost"],
    },
  ],
};

const get = (path: string) => generateSteering(config).find((f) => f.path === path)!.content;

describe("generateSteering", () => {
  it("returns the four steering files under .kiro/steering", () => {
    expect(generateSteering(config).map((f) => f.path)).toEqual([
      ".kiro/steering/product.md",
      ".kiro/steering/structure.md",
      ".kiro/steering/roles.md",
      ".kiro/steering/conventions.md",
    ]);
  });

  it("is deterministic and does not mutate the config", () => {
    const before = structuredClone(config);
    expect(generateSteering(config)).toEqual(generateSteering(config));
    expect(config).toEqual(before);
  });

  it("reflects the real models, fields, routes and enums", () => {
    const structure = get(".kiro/steering/structure.md");
    expect(structure).toContain("### BlogPost");
    expect(structure).toContain("`/blog-post`");
    expect(structure).toContain("title: String (unique)");
    expect(structure).toContain("status: Status (enum)");
    expect(structure).toContain("Status: OPEN, CLOSED");
    expect(get(".kiro/steering/product.md")).toContain("- Author");
  });

  it("reflects the real roles and permissions", () => {
    const roles = get(".kiro/steering/roles.md");
    expect(roles).toContain("### Editor");
    expect(roles).toContain("BlogPost: view, create, edit");
    expect(roles).toContain("Author: no access");
    expect(roles).toContain("- Menu: BlogPost\n");
  });

  it("reflects schema changes (no generic text)", () => {
    const other = buildDefaultStudioConfig(parseSchema("model Ticket {\n id Int @id\n}"));
    const out = generateSteering(other).map((f) => f.content).join("\n");
    expect(out).toContain("Ticket");
    expect(out).not.toContain("BlogPost");
  });

  it("handles empty schema and no roles", () => {
    const empty = buildDefaultStudioConfig({ models: [], enums: [] });
    const files = generateSteering(empty);
    expect(files).toHaveLength(4);
    expect(files.find((f) => f.path.endsWith("roles.md"))!.content).toContain("no roles defined");
  });

  it("is included in generateKiro and in the generated project", () => {
    const paths = generateProject(config).map((f) => f.path);
    for (const file of generateKiro(config)) expect(paths).toContain(file.path);
  });
});

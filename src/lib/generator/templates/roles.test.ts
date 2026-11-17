import { describe, expect, it } from "vitest";

import { parseSchema } from "../../parser";
import { buildDefaultStudioConfig, type StudioConfig, type StudioRole } from "../../studio-config";
import { generateProject } from "../project";
import { rolesTemplate } from "./roles";

const schema = parseSchema(`
  model Student {
    id   Int    @id @default(autoincrement())
    name String
  }
  model Course {
    id    Int    @id @default(autoincrement())
    title String
  }
`);

const none = { view: false, create: false, edit: false, delete: false };
const config: StudioConfig = {
  ...buildDefaultStudioConfig(schema),
  roles: [
    {
      name: "Admin",
      permissions: {
        Student: { view: true, create: true, edit: true, delete: true },
        Course: { view: true, create: true, edit: true, delete: true },
      },
      menu: ["Student", "Course"],
    },
    {
      name: "Viewer",
      // Course is intentionally missing to check it defaults to no access.
      permissions: { Student: { ...none, view: true } } as StudioRole["permissions"],
      menu: ["Student", "Unknown"],
    },
  ],
};

describe("rolesTemplate", () => {
  const out = rolesTemplate(config);

  it("is deterministic and does not mutate the config", () => {
    const before = structuredClone(config);
    expect(rolesTemplate(config)).toBe(out);
    expect(config).toEqual(before);
  });

  it("lists every role with its permissions and menu", () => {
    expect(out).toContain('name: "Admin"');
    expect(out).toContain('name: "Viewer"');
    expect(out).toContain("Student: { view: true, create: true, edit: true, delete: true },");
    expect(out).toContain("Student: { view: true, create: false, edit: false, delete: false },");
    expect(out).toContain('menu: ["Student", "Course"],');
  });

  it("fills missing model permissions with false and drops unknown menu entries", () => {
    expect(out).toContain("Course: { view: false, create: false, edit: false, delete: false },");
    expect(out).toContain('menu: ["Student"],');
    expect(out).not.toContain('"Unknown"');
  });

  it("exports the can() helper and the model union", () => {
    expect(out).toContain("export function can(");
    expect(out).toContain('export type ModelName = "Student" | "Course";');
  });

  it("handles no roles and no models", () => {
    const empty = rolesTemplate({ ...buildDefaultStudioConfig({ models: [], enums: [] }) });
    expect(empty).toContain("export type ModelName = never;");
    expect(empty).toContain("export const roles: Role[] = [\n\n];");
  });

  it("is registered in the generated project as lib/roles.ts", () => {
    const files = generateProject(config);
    expect(files.find((f) => f.path === "lib/roles.ts")?.content).toBe(out);
  });
});

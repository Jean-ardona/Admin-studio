import ts from "typescript";
import { describe, expect, it } from "vitest";

import { parseSchema } from "../../parser";
import { buildDefaultStudioConfig, type StudioConfig, type StudioRole } from "../../studio-config";
import { generateProject } from "../project";

/**
 * Task 5.4: a restricted role cannot perform blocked actions.
 * Checks the generated source (UI hides controls, actions contain checks) and
 * runs the generated lib/roles.ts and app/<slug>/actions.ts for real.
 */

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

const all = { view: true, create: true, edit: true, delete: true };
const none = { view: false, create: false, edit: false, delete: false };

const roles: StudioRole[] = [
  { name: "Admin", permissions: { Student: all, Course: all }, menu: ["Student", "Course"] },
  // View-only on Student, no access at all to Course.
  { name: "Viewer", permissions: { Student: { ...none, view: true }, Course: none }, menu: ["Student"] },
  // Can create and edit Student, but not delete.
  {
    name: "Editor",
    permissions: { Student: { view: true, create: true, edit: true, delete: false }, Course: none },
    menu: ["Student"],
  },
];

const config: StudioConfig = { ...buildDefaultStudioConfig(schema), roles };
const files = generateProject(config);
const file = (path: string): string => files.find((f) => f.path === path)?.content ?? "";

/** Compiles generated TypeScript to CommonJS and runs it with the given modules. */
const run = (source: string, modules: Record<string, unknown>): Record<string, unknown> => {
  const js = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const exports: Record<string, unknown> = {};
  const req = (id: string) => {
    if (!(id in modules)) throw new Error(`Unexpected import in generated code: ${id}`);
    return modules[id];
  };
  new Function("exports", "require", js)(exports, req);
  return exports;
};

type Action = "view" | "create" | "edit" | "delete";
type Can = (role: string | undefined, model: string, action: Action) => boolean;
const rolesModule = run(file("lib/roles.ts"), {}) as { can: Can };
const can = rolesModule.can;

describe("generated can() helper", () => {
  it("returns false for every blocked action of a restricted role", () => {
    expect(can("Viewer", "Student", "view")).toBe(true);
    for (const action of ["create", "edit", "delete"] as const) {
      expect(can("Viewer", "Student", action)).toBe(false);
    }
    for (const action of ["view", "create", "edit", "delete"] as const) {
      expect(can("Viewer", "Course", action)).toBe(false);
    }
    expect(can("Editor", "Student", "edit")).toBe(true);
    expect(can("Editor", "Student", "delete")).toBe(false);
  });

  it("allows everything for a full-access role", () => {
    for (const action of ["view", "create", "edit", "delete"] as const) {
      expect(can("Admin", "Student", action)).toBe(true);
    }
  });

  it("denies unknown roles, missing roles and unknown models", () => {
    expect(can("Ghost", "Student", "view")).toBe(false);
    expect(can(undefined, "Student", "view")).toBe(false);
    expect(can("Admin", "Nope", "view")).toBe(false);
  });
});

describe("generated server actions", () => {
  /** Loads app/student/actions.ts with the given active role and records side effects. */
  const load = (activeRole: string | undefined) => {
    const calls: string[] = [];
    const delegate = {
      create: async () => void calls.push("create"),
      update: async () => void calls.push("update"),
      delete: async () => void calls.push("delete"),
    };
    const actions = run(file("app/student/actions.ts"), {
      "next/cache": { revalidatePath: () => void calls.push("revalidate") },
      "next/navigation": { redirect: () => void calls.push("redirect") },
      "@/lib/current-role": { getActiveRole: async () => activeRole },
      "@/lib/prisma": { prisma: { student: delegate } },
      "@/lib/roles": rolesModule,
    }) as {
      createStudent: (f: FormData) => Promise<void>;
      updateStudent: (id: string, f: FormData) => Promise<void>;
      deleteStudent: (id: string) => Promise<void>;
    };
    return { actions, calls };
  };
  const form = () => {
    const data = new FormData();
    data.set("name", "Ada");
    return data;
  };

  it("rejects create, edit and delete for a view-only role without touching the database", async () => {
    const { actions, calls } = load("Viewer");
    await expect(actions.createStudent(form())).rejects.toThrow(/Not allowed/);
    await expect(actions.updateStudent("1", form())).rejects.toThrow(/Not allowed/);
    await expect(actions.deleteStudent("1")).rejects.toThrow(/Not allowed/);
    expect(calls).toEqual([]);
  });

  it("rejects calls when the role is unknown or missing", async () => {
    for (const role of ["Ghost", undefined]) {
      const { actions, calls } = load(role);
      await expect(actions.createStudent(form())).rejects.toThrow(/Not allowed/);
      expect(calls).toEqual([]);
    }
  });

  it("blocks only the denied action of a partially restricted role", async () => {
    const { actions, calls } = load("Editor");
    await actions.createStudent(form());
    await actions.updateStudent("1", form());
    await expect(actions.deleteStudent("1")).rejects.toThrow(/cannot delete Student/);
    expect(calls).not.toContain("delete");
    expect(calls).toContain("create");
    expect(calls).toContain("update");
  });

  it("runs every action for a full-access role", async () => {
    const { actions, calls } = load("Admin");
    await actions.createStudent(form());
    await actions.updateStudent("1", form());
    await actions.deleteStudent("1");
    expect(calls.filter((c) => ["create", "update", "delete"].includes(c))).toEqual(["create", "update", "delete"]);
  });

  it("checks the permission before any database call in the generated source", () => {
    const source = file("app/student/actions.ts");
    for (const [fn, action] of [
      ["createStudent", "create"],
      ["updateStudent", "edit"],
      ["deleteStudent", "delete"],
    ]) {
      const body = source.slice(source.indexOf(`export async function ${fn}`));
      expect(body.indexOf(`can(role, "Student", "${action}")`)).toBeGreaterThan(-1);
      expect(body.indexOf(`can(role, "Student", "${action}")`)).toBeLessThan(body.indexOf("prisma."));
    }
  });
});

describe("generated UI hides blocked controls", () => {
  it("list page shows Create, View and Edit only when the role can", () => {
    const page = file("app/student/page.tsx");
    expect(page).toContain('const showCreate = can(role, "Student", "create");');
    expect(page).toContain("{showCreate && (");
    expect(page).toContain("<StudentTable rows={rows} showDetail={showDetail} showEdit={showEdit} />");

    const table = file("components/student-table.tsx");
    expect(table).toContain("{showDetail && (");
    expect(table).toContain("{showEdit && (");
  });

  it("list, create and edit pages return NotAllowed when the role lacks the permission", () => {
    expect(file("app/student/page.tsx")).toContain('if (!can(role, "Student", "view")) return <NotAllowed />;');
    expect(file("app/student/new/page.tsx")).toContain('if (!can(role, "Student", "create")) return <NotAllowed />;');
    expect(file("app/student/[id]/edit/page.tsx")).toContain(
      'if (!can(role, "Student", "edit")) return <NotAllowed />;',
    );
    expect(file("app/student/[id]/page.tsx")).toContain('if (!can(role, "Student", "view")) return <NotAllowed />;');
  });

  it("detail page renders Edit and Delete only behind their permission flags", () => {
    const page = file("app/student/[id]/page.tsx");
    expect(page).toContain('const canEdit = can(role, "Student", "edit");');
    expect(page).toContain('const canDelete = can(role, "Student", "delete");');
    expect(page).toContain("{canEdit && (");
    expect(page).toContain("{canDelete && (");
    // The delete form must sit inside the guarded block.
    expect(page.indexOf("{canDelete && (")).toBeLessThan(page.indexOf("delete" + "Student.bind"));
  });

  it("sidebar only receives menu entries the role may view", () => {
    const current = file("lib/current-role.ts");
    expect(current).toContain('menu.includes(item.model) && can(roleName, item.model, "view")');
    expect(file("app/layout.tsx")).toContain("<Sidebar items={items} />");
    // Viewer has no Course in its menu in the generated roles file.
    const rolesSource = file("lib/roles.ts");
    expect(rolesSource).toContain('menu: ["Student"],');
  });
});

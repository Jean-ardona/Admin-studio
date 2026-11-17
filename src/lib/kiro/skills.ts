import { modelSlug } from "../generator/naming";
import type { GeneratedFile } from "@/lib/generator/types";
import type { StudioConfig } from "@/lib/studio-config";

/** Real names from the config used as examples, with fallbacks when the schema or roles are empty. */
type Names = {
  model: string;
  slug: string;
  field: string;
  role: string;
  models: string;
  roles: string;
};

const namesOf = (config: StudioConfig): Names => {
  const first = config.schema.models[0];
  const model = first?.name ?? "Product";
  const field =
    first?.fields.find((f) => f.kind === "scalar" && !f.isId)?.name ?? first?.fields[0]?.name ?? "title";
  const role = config.roles[0]?.name ?? "Editor";
  const list = (items: string[], none: string) => (items.length ? items.join(", ") : none);
  return {
    model,
    slug: modelSlug(model),
    field,
    role,
    models: list(config.schema.models.map((m) => m.name), "(no models yet)"),
    roles: list(config.roles.map((r) => r.name), "(no roles yet)"),
  };
};

const skill = (name: string, description: string, body: string): GeneratedFile => ({
  path: `.kiro/skills/${name}/SKILL.md`,
  content: `---
name: ${name}
description: ${description}
---

${body}`,
});

const addModelSkill = (n: Names): GeneratedFile =>
  skill(
    "add-model",
    "Add a new Prisma model to this admin dashboard with its pages, permissions and menu entry. Use when the user wants a new table or entity.",
    `# Add a model

Current models: ${n.models}. Example below uses \`${n.model}\` (route \`/${n.slug}\`) as the pattern to copy.

## Steps
1. Add the model to \`prisma/schema.prisma\`. Give it an \`@id\` field.
2. Run \`npx prisma db push\` and \`npx prisma generate\`.
3. Create the pages by copying the \`${n.model}\` ones, renaming and adjusting fields:
   - \`app/${n.slug}/page.tsx\` (list), \`app/${n.slug}/[id]/page.tsx\` (detail), \`app/${n.slug}/new/page.tsx\`, \`app/${n.slug}/[id]/edit/page.tsx\`
   - \`app/${n.slug}/actions.ts\` (server actions, each starts with a \`can()\` check)
   - \`components/${n.slug}-table.tsx\` and \`components/${n.slug}-form.tsx\`
   Use the kebab-case slug of the new model for every folder and file name.
4. In \`lib/roles.ts\`, add the new name to the \`ModelName\` union and add a permissions entry (\`view\`, \`create\`, \`edit\`, \`delete\`) for it in every role (${n.roles}). Add it to the role's \`menu\` if the role should see it.
5. In \`lib/navigation.ts\`, add an entry to \`navItems\` (label, href \`/<slug>\`, model name).
6. In \`prisma/seed.ts\`, add sample rows. Create parent models before models that reference them.
7. Run \`npx tsc --noEmit\` and fix any error.

## Check
- The sidebar shows the model for roles that have it in their menu.
- A role without \`view\` sees the not-allowed screen on \`/<slug>\`.
`,
  );

const addFieldSkill = (n: Names): GeneratedFile =>
  skill(
    "add-field",
    "Add a field to an existing model and show it in the table, form and seed data. Use when the user wants a new column or property on a model.",
    `# Add a field

Example: add a field to \`${n.model}\` (existing field for reference: \`${n.field}\`). Models: ${n.models}.

## Steps
1. Add the field to the model in \`prisma/schema.prisma\`. Make it optional (\`?\`) or give it a \`@default\` so existing rows stay valid.
2. Run \`npx prisma db push\` and \`npx prisma generate\`.
3. Table: in \`components/${n.slug}-table.tsx\`, add a column header and cell next to the \`${n.field}\` column.
4. Form: in \`components/${n.slug}-form.tsx\`, add an input next to the \`${n.field}\` one. Pick the input by type (text, number, checkbox, date, select for enums).
5. Server actions: in \`app/${n.slug}/actions.ts\`, read the new value from \`FormData\`, convert it to the Prisma type, and pass it to \`create\` and \`update\`.
6. Detail page: show the value in \`app/${n.slug}/[id]/page.tsx\`.
7. Seed: add a value to the sample rows in \`prisma/seed.ts\`.
8. Run \`npx tsc --noEmit\`.

## Notes
- Permissions do not change: they are per model, not per field.
- For a relation field, also add the opposite side on the other model and load it with \`include\` in the list page.
`,
  );

const addRoleSkill = (n: Names): GeneratedFile =>
  skill(
    "add-role",
    "Add a new role with its permissions and menu, or change an existing role. Use when the user wants a new kind of user or different access.",
    `# Add a role

Current roles: ${n.roles}. Models: ${n.models}. All roles live in \`lib/roles.ts\`, the only source of truth.

## Steps
1. Open \`lib/roles.ts\` and copy the \`${n.role}\` entry in the \`roles\` array.
2. Change \`name\` to the new role name. It must be unique, and the first role in the array is the default.
3. Set \`permissions\` for every model (${n.models}): \`view\`, \`create\`, \`edit\`, \`delete\` as \`true\` or \`false\`. A model without \`view\` is hidden and its pages show the not-allowed screen.
4. Set \`menu\` to the models the role should see in the sidebar. Only list models it can \`view\`.
5. Nothing else is needed: the role switcher reads \`roles\`, and pages and actions call \`can(role, model, action)\`.
6. Run \`npx tsc --noEmit\`, then switch to the role in the top bar and check each page.

## Rules
- Never hard-code role names in pages or components. Use \`can()\`.
- When you add a model later, add it to this role too.
`,
  );

const editPageLayoutSkill = (n: Names): GeneratedFile =>
  skill(
    "edit-page-layout",
    "Change the layout of a page: table columns, form fields, sidebar order and the overall page structure. Use when the user wants a page to look or be arranged differently.",
    `# Edit a page layout

Example: the \`${n.model}\` pages in \`app/${n.slug}/\`. Models: ${n.models}.

## Where things live
- List page: \`app/${n.slug}/page.tsx\` loads the data. \`components/${n.slug}-table.tsx\` defines columns and rows.
- Form: \`components/${n.slug}-form.tsx\` defines the fields and their order. Used by \`new\` and \`[id]/edit\`.
- Detail page: \`app/${n.slug}/[id]/page.tsx\`.
- Sidebar order and labels: \`navItems\` in \`lib/navigation.ts\`.
- Global shell (sidebar, top bar, page width): \`app/layout.tsx\`. Colors: CSS variables in \`app/globals.css\`.

## Steps
1. Open the file for the part you want to change (see above).
2. Columns: add, remove or reorder the header and the cell together, for example around \`${n.field}\`.
3. Form: move or group the inputs. Keep each input \`name\` equal to the Prisma field name so \`actions.ts\` keeps working.
4. Menu: reorder or rename entries in \`navItems\`.
5. Use Tailwind classes for spacing and grids. Keep UI text in English.
6. Keep the \`can()\` checks (create, edit and delete buttons, and actions) when you restructure a page.
7. Run \`npx tsc --noEmit\` and check the page in the browser.
`,
  );

/** Builds the Kiro skills (one folder with SKILL.md each) for the generated project. Pure. */
export const generateSkills = (config: StudioConfig): GeneratedFile[] => {
  const n = namesOf(config);
  return [addModelSkill(n), addFieldSkill(n), addRoleSkill(n), editPageLayoutSkill(n)];
};

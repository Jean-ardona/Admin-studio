import type { StudioConfig, StudioModelConfig } from "@/lib/studio-config";

import { modelSlug } from "../naming";

export type SchemaModelEntry = StudioConfig["schema"]["models"][number];

/** A table column after applying the config (visible columns only, in config order). */
export type TableColumn = { field: string; label: string };

/** Prisma client delegate name: "BlogPost" -> "blogPost". */
export const delegateName = (modelName: string): string =>
  `${modelName.charAt(0).toLowerCase()}${modelName.slice(1)}`;

/** Name of the field used to build row links (the model's @id field, if any). */
export const idFieldOf = (model: SchemaModelEntry): string | undefined =>
  model.fields.find((field) => field.isId)?.name;

/**
 * Columns of the table: the visible columns from the config, in the configured
 * order, skipping fields that no longer exist in the schema. If nothing is
 * visible the table falls back to the id field so it never renders empty.
 */
export const visibleColumns = (
  model: SchemaModelEntry,
  modelConfig: StudioModelConfig,
): TableColumn[] => {
  const known = new Set(model.fields.map((field) => field.name));
  const columns = modelConfig.columns
    .filter((column) => column.visible && known.has(column.field))
    .map(({ field, label }) => ({ field, label }));

  if (columns.length > 0) return columns;

  const idField = idFieldOf(model);
  return idField ? [{ field: idField, label: "ID" }] : [];
};

/** Shared cell formatter used by every generated table. Generated once per project. */
export const formatTemplate = (): string => `/**
 * Turns a database value into text for table cells.
 * Edit this file to change how dates, booleans or empty values are shown everywhere.
 */
export function formatCell(value: unknown): string {
  if (value === null || value === undefined) return "-";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (value instanceof Date) return value.toLocaleString("en-US");
  if (typeof value === "object") return JSON.stringify(value); // Json fields, Decimal, etc.
  return String(value);
}
`;

/**
 * Table component for one model (components/<slug>-table.tsx).
 * Columns, labels and order come from the Studio config. Row links are only
 * generated for pages that are enabled.
 */
export const tableTemplate = (
  model: SchemaModelEntry,
  modelConfig: StudioModelConfig,
): string => {
  const name = model.name;
  const slug = modelSlug(name);
  const columns = visibleColumns(model, modelConfig);
  const idField = idFieldOf(model);

  const hasDetail = modelConfig.enabledPages.includes("detail") && !!idField;
  const hasEdit = modelConfig.enabledPages.includes("edit") && !!idField;
  const hasActions = hasDetail || hasEdit;

  const props: string[] = [`rows: ${name}[];`];
  if (hasDetail) props.push("showDetail: boolean;");
  if (hasEdit) props.push("showEdit: boolean;");

  const params = ["rows"];
  if (hasDetail) params.push("showDetail");
  if (hasEdit) params.push("showEdit");

  const columnList = columns
    .map((c) => `  { key: ${JSON.stringify(c.field)}, label: ${JSON.stringify(c.label)} },`)
    .join("\n");

  const links: string[] = [];
  if (hasDetail) {
    links.push(`                {showDetail && (
                  <Link href={\`/${slug}/\${String(row.${idField})}\`} className="text-accent-bright hover:underline">
                    View
                  </Link>
                )}`);
  }
  if (hasEdit) {
    links.push(`                {showEdit && (
                  <Link href={\`/${slug}/\${String(row.${idField})}/edit\`} className="text-accent-bright hover:underline">
                    Edit
                  </Link>
                )}`);
  }

  const imports = [
    hasActions ? `import Link from "next/link";\n` : "",
    `import type { ${name} } from "@prisma/client";\n`,
    `\nimport { formatCell } from "@/lib/format";\n`,
  ].join("");

  return `${imports}
// Columns shown in the table, in order. Edit this list to add, remove or rename columns.
const columns: { key: keyof ${name}; label: string }[] = [
${columnList}
];

type ${name}TableProps = {
  ${props.join("\n  ")}
};

/** Table of ${modelConfig.label.toLowerCase()}. Receives rows from app/${slug}/page.tsx. */
export function ${name}Table({ ${params.join(", ")} }: ${name}TableProps) {
  if (rows.length === 0) {
    return <p className="text-muted">No records yet.</p>;
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-border bg-surface">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-border text-muted">
          <tr>
            {columns.map((column) => (
              <th key={String(column.key)} className="px-4 py-3 font-medium">
                {column.label}
              </th>
            ))}${hasActions ? `\n            <th className="px-4 py-3 text-right font-medium">Actions</th>` : ""}
          </tr>
        </thead>
        <tbody>
          {rows.map((row${idField ? "" : ", index"}) => (
            <tr key={${idField ? `String(row.${idField})` : "index"}} className="border-b border-border last:border-0 hover:bg-raised">
              {columns.map((column) => (
                <td key={String(column.key)} className="px-4 py-3">
                  {formatCell(row[column.key])}
                </td>
              ))}${
    hasActions
      ? `
              <td className="flex justify-end gap-4 px-4 py-3">
${links.join("\n")}
              </td>`
      : ""
  }
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
`;
};

/**
 * List page for one model (app/<slug>/page.tsx): a server component that
 * loads rows with Prisma and renders the table. The active role decides
 * which buttons and links are shown (the `show*` flags).
 */
export const listPageTemplate = (
  model: SchemaModelEntry,
  modelConfig: StudioModelConfig,
): string => {
  const name = model.name;
  const slug = modelSlug(name);
  const idField = idFieldOf(model);

  const hasCreate = modelConfig.enabledPages.includes("create");
  const hasDetail = modelConfig.enabledPages.includes("detail") && !!idField;
  const hasEdit = modelConfig.enabledPages.includes("edit") && !!idField;

  // Flags decide which buttons and links are visible, based on the active role.
  const flags: string[] = [];
  if (hasCreate) flags.push(`const showCreate = can(role, "${name}", "create");`);
  if (hasDetail) flags.push(`const showDetail = can(role, "${name}", "view");`);
  if (hasEdit) flags.push(`const showEdit = can(role, "${name}", "edit");`);

  const tableProps = ["rows={rows}"];
  if (hasDetail) tableProps.push("showDetail={showDetail}");
  if (hasEdit) tableProps.push("showEdit={showEdit}");

  return `${hasCreate ? `import Link from "next/link";\n\n` : ""}import { NotAllowed } from "@/components/not-allowed";
import { ${name}Table } from "@/components/${slug}-table";
import { getActiveRole } from "@/lib/current-role";
import { prisma } from "@/lib/prisma";
import { can } from "@/lib/roles";

// Always read fresh data from the database.
export const dynamic = "force-dynamic";

/** List page for ${modelConfig.label.toLowerCase()}. */
export default async function ${name}ListPage() {
  // PERMISSION CHECK: the role needs "view" on ${name} to see this page.
  const role = await getActiveRole();
  if (!can(role, "${name}", "view")) return <NotAllowed />;

  const rows = await prisma.${delegateName(name)}.findMany(${idField ? `{ orderBy: { ${idField}: "asc" } }` : ""});
${flags.length > 0 ? `\n  ${flags.join("\n  ")}\n` : ""}
  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">${modelConfig.label}</h1>${
    hasCreate
      ? `
        {showCreate && (
          <Link href="/${slug}/new" className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-bright">
            Create new
          </Link>
        )}`
      : ""
  }
      </div>
      <${name}Table ${tableProps.join(" ")} />
    </section>
  );
}
`;
};

/**
 * All files for the list pages: one page and one table per model whose
 * "list" page is enabled, plus the shared formatter when at least one exists.
 */
export const listPageFiles = (
  config: StudioConfig,
): { path: string; content: string }[] => {
  const files: { path: string; content: string }[] = [];

  for (const model of config.schema.models) {
    const modelConfig = config.models[model.name];
    if (!modelConfig?.enabledPages.includes("list")) continue;

    const slug = modelSlug(model.name);
    files.push(
      { path: `app/${slug}/page.tsx`, content: listPageTemplate(model, modelConfig) },
      { path: `components/${slug}-table.tsx`, content: tableTemplate(model, modelConfig) },
    );
  }

  if (files.length > 0) files.push({ path: "lib/format.ts", content: formatTemplate() });
  return files;
};

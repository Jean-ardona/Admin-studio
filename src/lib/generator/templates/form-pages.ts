import type { StudioConfig, StudioModelConfig } from "@/lib/studio-config";

import { modelSlug } from "../naming";
import { actionsTemplate } from "./actions";
import { idParseExpression, resolveFormFields, type ResolvedFormField } from "./form-fields";
import {
  delegateName,
  formatTemplate,
  idFieldOf,
  visibleColumns,
  type SchemaModelEntry,
} from "./list-page";

const INPUT_CLASS =
  "w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm focus:border-accent focus:outline-none";

/** Prisma delegate property name used to load the options of a relation select. */
const optionsVar = (field: ResolvedFormField): string => `${field.name}Options`;

/** JSX for one form field, with its label. `initial` holds the record being edited. */
const fieldJsx = (field: ResolvedFormField): string => {
  const name = JSON.stringify(field.name);
  const required = field.isOptional ? "" : " required";
  const value = `initial?.${field.name}`;
  const label = `        <label htmlFor=${name} className="text-sm font-medium">
          ${field.label}
        </label>`;

  let control: string;

  if (field.relation) {
    const { valueField, labelField } = field.relation;
    control = `        <select id=${name} name=${name} defaultValue={${value} == null ? "" : String(${value})}${required} className="${INPUT_CLASS}">
          <option value="">${field.isOptional ? "None" : "Select..."}</option>
          {${optionsVar(field)}.map((option) => (
            <option key={String(option.${valueField})} value={String(option.${valueField})}>
              {String(option.${labelField})}
            </option>
          ))}
        </select>`;
  } else if (field.enumValues) {
    const options = field.enumValues
      .map((v) => `          <option value=${JSON.stringify(v)}>${v}</option>`)
      .join("\n");
    control = `        <select id=${name} name=${name} defaultValue={${value} ?? ""}${required} className="${INPUT_CLASS}">
          <option value="">${field.isOptional ? "None" : "Select..."}</option>
${options}
        </select>`;
  } else if (field.input === "checkbox") {
    return `      <div className="flex items-center gap-2">
        <input id=${name} name=${name} type="checkbox" defaultChecked={Boolean(${value})} className="h-4 w-4" />
        <label htmlFor=${name} className="text-sm font-medium">
          ${field.label}
        </label>
      </div>`;
  } else if (field.input === "textarea") {
    const initial =
      field.type === "Json"
        ? `${value} == null ? "" : JSON.stringify(${value}, null, 2)`
        : `${value} ?? ""`;
    control = `        <textarea id=${name} name=${name} rows={5} defaultValue={${initial}}${required} className="${INPUT_CLASS}" />`;
  } else if (field.input === "date") {
    control = `        <input id=${name} name=${name} type="datetime-local" defaultValue={toDateTimeLocal(${value})}${required} className="${INPUT_CLASS}" />`;
  } else if (field.input === "number") {
    const step = field.type === "Int" || field.type === "BigInt" ? "1" : "any";
    control = `        <input id=${name} name=${name} type="number" step="${step}" defaultValue={${value} == null ? "" : String(${value})}${required} className="${INPUT_CLASS}" />`;
  } else {
    control = `        <input id=${name} name=${name} type="text" defaultValue={${value} == null ? "" : String(${value})}${required} className="${INPUT_CLASS}" />`;
  }

  return `      <div className="space-y-1.5">
${label}
${control}
      </div>`;
};

/**
 * Form component shared by the create and edit pages (components/<slug>-form.tsx).
 * Inputs come from the config's formFields. It is a server component: relation
 * selects load their options with Prisma, and the page passes the server action.
 */
export const formTemplate = (
  config: StudioConfig,
  model: SchemaModelEntry,
  modelConfig: StudioModelConfig,
): string => {
  const name = model.name;
  const fields = resolveFormFields(config, model, modelConfig);
  const relations = fields.filter((f) => f.relation);
  const hasDate = fields.some((f) => f.input === "date" && !f.relation && !f.enumValues);
  const cancelHref = modelConfig.enabledPages.includes("list") ? `/${modelSlug(name)}` : "/";

  const loaders = relations
    .map((f) => {
      const { model: target, valueField, labelField } = f.relation!;
      const select =
        valueField === labelField
          ? `{ ${valueField}: true }`
          : `{ ${valueField}: true, ${labelField}: true }`;
      return `  const ${optionsVar(f)} = await prisma.${delegateName(target)}.findMany({ select: ${select} });`;
    })
    .join("\n");

  const dateHelper = hasDate
    ? `
/** Formats a Date for <input type="datetime-local">. */
function toDateTimeLocal(value: Date | null | undefined): string {
  return value ? value.toISOString().slice(0, 16) : "";
}
`
    : "";

  return `import Link from "next/link";
import type { ${name} } from "@prisma/client";
${relations.length > 0 ? `\nimport { prisma } from "@/lib/prisma";\n` : ""}${dateHelper}
type ${name}FormProps = {
  /** Server action that receives the submitted form data. */
  action: (formData: FormData) => void | Promise<void>;
  /** Existing record to prefill the inputs (edit page). Empty on the create page. */
  initial?: Partial<${name}>;
  submitLabel: string;
};

/** Form for ${modelConfig.label.toLowerCase()}. Add, remove or reorder inputs below to change the form. */
export async function ${name}Form({ action, initial, submitLabel }: ${name}FormProps) {
${loaders ? `${loaders}\n\n` : ""}  return (
    <form action={action} className="max-w-xl space-y-5 rounded-2xl border border-border bg-surface p-6">
${fields.length > 0 ? fields.map(fieldJsx).join("\n") : `      <p className="text-muted">This model has no editable fields.</p>`}
      <div className="flex items-center gap-4 pt-2">
        <button type="submit" className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-bright">
          {submitLabel}
        </button>
        <Link href="${cancelHref}" className="text-sm text-muted hover:underline">
          Cancel
        </Link>
      </div>
    </form>
  );
}
`;
};

/** Create page (app/<slug>/new/page.tsx). */
export const createPageTemplate = (
  model: SchemaModelEntry,
  modelConfig: StudioModelConfig,
): string => {
  const name = model.name;
  const slug = modelSlug(name);

  return `import { create${name} } from "@/app/${slug}/actions";
import { ${name}Form } from "@/components/${slug}-form";
import { NotAllowed } from "@/components/not-allowed";
import { getActiveRole } from "@/lib/current-role";
import { can } from "@/lib/roles";

// Always evaluate the active role on each request.
export const dynamic = "force-dynamic";

/** Page with an empty form to create a new record. */
export default async function Create${name}Page() {
  // PERMISSION CHECK: the role needs "create" on ${name}. The server action checks again.
  const role = await getActiveRole();
  if (!can(role, "${name}", "create")) return <NotAllowed />;

  return (
    <section className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">New ${singular(modelConfig.label)}</h1>
      <${name}Form action={create${name}} submitLabel="Create" />
    </section>
  );
}
`;
};

/** Edit page (app/<slug>/[id]/edit/page.tsx). Requires an @id field. */
export const editPageTemplate = (
  model: SchemaModelEntry,
  modelConfig: StudioModelConfig,
): string => {
  const name = model.name;
  const slug = modelSlug(name);
  const idField = model.fields.find((f) => f.isId)!;

  return `import { notFound } from "next/navigation";

import { update${name} } from "@/app/${slug}/actions";
import { ${name}Form } from "@/components/${slug}-form";
import { NotAllowed } from "@/components/not-allowed";
import { getActiveRole } from "@/lib/current-role";
import { prisma } from "@/lib/prisma";
import { can } from "@/lib/roles";

export const dynamic = "force-dynamic";

/** Page with the form prefilled from the record in the URL. */
export default async function Edit${name}Page({ params }: { params: Promise<{ id: string }> }) {
  // PERMISSION CHECK: the role needs "edit" on ${name}. The server action checks again.
  const role = await getActiveRole();
  if (!can(role, "${name}", "edit")) return <NotAllowed />;

  const { id } = await params;
  const record = await prisma.${delegateName(name)}.findUnique({
    where: { ${idField.name}: ${idParseExpression(idField.type, "id")} },
  });
  if (!record) notFound();

  return (
    <section className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Edit ${singular(modelConfig.label)}</h1>
      <${name}Form action={update${name}.bind(null, id)} initial={record} submitLabel="Save changes" />
    </section>
  );
}
`;
};

/** Detail page (app/<slug>/[id]/page.tsx). Requires an @id field. */
export const detailPageTemplate = (
  model: SchemaModelEntry,
  modelConfig: StudioModelConfig,
): string => {
  const name = model.name;
  const slug = modelSlug(name);
  const idField = model.fields.find((f) => f.isId)!;
  const columns = visibleColumns(model, modelConfig);
  const pages = modelConfig.enabledPages;
  const hasEdit = pages.includes("edit");
  const backHref = pages.includes("list") ? `/${slug}` : "/";

  const columnList = columns
    .map((c) => `  { key: ${JSON.stringify(c.field)}, label: ${JSON.stringify(c.label)} },`)
    .join("\n");

  return `import Link from "next/link";
import { notFound } from "next/navigation";
import type { ${name} } from "@prisma/client";

import { delete${name} } from "@/app/${slug}/actions";
import { NotAllowed } from "@/components/not-allowed";
import { getActiveRole } from "@/lib/current-role";
import { formatCell } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { can } from "@/lib/roles";

export const dynamic = "force-dynamic";

// Fields shown on this page, in order. Edit this list to add, remove or rename fields.
const fields: { key: keyof ${name}; label: string }[] = [
${columnList}
];

/** Read-only view of one record. */
export default async function ${name}DetailPage({ params }: { params: Promise<{ id: string }> }) {
  // PERMISSION CHECK: the role needs "view" on ${name}. Buttons below depend on edit and delete.
  const role = await getActiveRole();
  if (!can(role, "${name}", "view")) return <NotAllowed />;
${hasEdit ? `  const canEdit = can(role, "${name}", "edit");\n` : ""}  const canDelete = can(role, "${name}", "delete");

  const { id } = await params;
  const record = await prisma.${delegateName(name)}.findUnique({
    where: { ${idField.name}: ${idParseExpression(idField.type, "id")} },
  });
  if (!record) notFound();

  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">${singular(modelConfig.label)}</h1>
        <div className="flex items-center gap-4">
          <Link href="${backHref}" className="text-sm text-muted hover:underline">
            Back
          </Link>${
    hasEdit
      ? `
          {/* Shown only when the role can edit ${name}. */}
          {canEdit && (
            <Link href={\`/${slug}/\${id}/edit\`} className="text-sm text-accent-bright hover:underline">
              Edit
            </Link>
          )}`
      : ""
  }
          {/* Shown only when the role can delete ${name}. */}
          {canDelete && (
            <form action={delete${name}.bind(null, id)}>
              <button type="submit" className="text-sm text-red-400 hover:underline">
                Delete
              </button>
            </form>
          )}
        </div>
      </div>
      <dl className="grid max-w-xl gap-4 rounded-2xl border border-border bg-surface p-6 sm:grid-cols-2">
        {fields.map((field) => (
          <div key={String(field.key)}>
            <dt className="text-sm text-muted">{field.label}</dt>
            <dd className="mt-1">{formatCell(record[field.key])}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
`;
};

/** "Blog posts" -> "blog post": a rough singular for headings, taken from the label. */
const singular = (label: string): string => {
  const lower = label.toLowerCase();
  if (/ies$/.test(lower)) return `${lower.slice(0, -3)}y`;
  if (/(?:s|x|z|ch|sh)es$/.test(lower)) return lower.slice(0, -2);
  if (/s$/.test(lower) && !/ss$/.test(lower)) return lower.slice(0, -1);
  return lower;
};

/**
 * All files for create, edit and detail pages plus the server actions.
 * Only enabled pages are generated. Pages that need an id (edit, detail)
 * are skipped for models without an @id field.
 */
export const formPageFiles = (
  config: StudioConfig,
): { path: string; content: string }[] => {
  const files: { path: string; content: string }[] = [];
  const anyList = config.schema.models.some((m) => config.models[m.name]?.enabledPages.includes("list"));
  let needsFormat = false;

  for (const model of config.schema.models) {
    const modelConfig = config.models[model.name];
    if (!modelConfig) continue;

    const slug = modelSlug(model.name);
    const hasId = !!idFieldOf(model);
    const pages = modelConfig.enabledPages;
    const hasCreate = pages.includes("create");
    const hasEdit = pages.includes("edit") && hasId;
    const hasDetail = pages.includes("detail") && hasId;

    if (hasCreate || hasEdit) {
      files.push({ path: `components/${slug}-form.tsx`, content: formTemplate(config, model, modelConfig) });
    }
    if (hasCreate) {
      files.push({ path: `app/${slug}/new/page.tsx`, content: createPageTemplate(model, modelConfig) });
    }
    if (hasEdit) {
      files.push({ path: `app/${slug}/[id]/edit/page.tsx`, content: editPageTemplate(model, modelConfig) });
    }
    if (hasDetail) {
      needsFormat = true;
      files.push({ path: `app/${slug}/[id]/page.tsx`, content: detailPageTemplate(model, modelConfig) });
    }
    if (hasCreate || hasEdit || hasDetail) {
      files.push({ path: `app/${slug}/actions.ts`, content: actionsTemplate(config, model, modelConfig) });
    }
  }

  // The detail page needs the shared formatter; the list pages already add it.
  if (needsFormat && !anyList) files.push({ path: "lib/format.ts", content: formatTemplate() });
  return files;
};

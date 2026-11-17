import type { StudioConfig, StudioModelConfig } from "@/lib/studio-config";

import { modelSlug } from "../naming";
import { idParseExpression, resolveFormFields, type ResolvedFormField } from "./form-fields";
import { delegateName, type SchemaModelEntry } from "./list-page";

/**
 * Statement that reads one form field into a local variable, and the
 * expression that converts it to the type Prisma expects.
 * Returns the property written in the `data` object.
 */
const fieldMapping = (field: ResolvedFormField): { read: string; property: string } => {
  const raw = `${field.name}Raw`;
  const key = JSON.stringify(field.name);
  const readText = `const ${raw} = text(formData, ${key});`;
  const optional = field.isOptional;

  // Checkboxes are only present in the form data when ticked.
  if (field.type === "Boolean") {
    return {
      read: "",
      property: `${field.name}: formData.get(${key}) === "on" || formData.get(${key}) === "true"`,
    };
  }

  let value: string;
  switch (field.type) {
    case "Int":
    case "Float":
      value = optional ? `${raw} === null ? null : Number(${raw})` : `Number(${raw})`;
      break;
    case "BigInt":
      value = optional ? `${raw} === null ? null : BigInt(${raw})` : `BigInt(${raw} ?? "0")`;
      break;
    case "Decimal":
      value = optional ? raw : `${raw} ?? "0"`;
      break;
    case "DateTime":
      value = optional
        ? `${raw} === null ? null : new Date(${raw})`
        : `${raw} === null ? new Date() : new Date(${raw})`;
      break;
    case "Json":
      value = optional ? `${raw} === null ? undefined : JSON.parse(${raw})` : `JSON.parse(${raw} ?? "null")`;
      break;
    default:
      if (field.enumValues) {
        const fallback = JSON.stringify(field.enumValues[0] ?? "");
        value = optional ? `${raw} as ${field.type} | null` : `(${raw} ?? ${fallback}) as ${field.type}`;
      } else {
        value = optional ? raw : `${raw} ?? ""`;
      }
  }

  return { read: readText, property: `${field.name}: ${value}` };
};

/**
 * Server actions for one model (app/<slug>/actions.ts): create, update and
 * delete with Prisma. Each action only exists when the page that uses it is
 * enabled (create -> create page, update -> edit page, delete -> detail page).
 *
 * Every action starts with a marked spot for the permission check.
 */
export const actionsTemplate = (
  config: StudioConfig,
  model: SchemaModelEntry,
  modelConfig: StudioModelConfig,
): string => {
  const name = model.name;
  const slug = modelSlug(name);
  const delegate = delegateName(name);
  const idField = model.fields.find((f) => f.isId);
  const fields = resolveFormFields(config, model, modelConfig);
  const pages = modelConfig.enabledPages;

  const hasCreate = pages.includes("create");
  const hasUpdate = pages.includes("edit") && !!idField;
  const hasDelete = pages.includes("detail") && !!idField;
  const afterSave = pages.includes("list") ? `/${slug}` : "/";

  const enumTypes = [...new Set(fields.filter((f) => f.enumValues).map((f) => f.type))];
  const mappings = fields.map(fieldMapping);

  const permission = (action: string) =>
    `  // PERMISSION CHECK: add \`can(role, "${name}", "${action}")\` here once roles are set up (lib/roles.ts).`;

  const parts: string[] = [];

  parts.push(`"use server";

// Server actions for ${modelConfig.label.toLowerCase()}. They run on the server only.
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
${enumTypes.length > 0 ? `import type { ${enumTypes.join(", ")} } from "@prisma/client";\n` : ""}
import { prisma } from "@/lib/prisma";

/** Reads a text input. Empty inputs become null. */
function text(formData: FormData, name: string): string | null {
  const value = formData.get(name);
  return typeof value === "string" && value.trim() !== "" ? value : null;
}

/** Converts submitted form data into the object Prisma expects for ${name}. */
function read${name}Data(formData: FormData) {
${mappings
    .map((m) => m.read)
    .filter(Boolean)
    .map((line) => `  ${line}`)
    .join("\n")}${mappings.some((m) => m.read) ? "\n" : ""}  return {${
    mappings.length > 0 ? `\n${mappings.map((m) => `    ${m.property},`).join("\n")}\n  ` : ""
  }};
}`);

  if (hasCreate) {
    parts.push(`/** Creates a record from the "New" form, then returns to the list. */
export async function create${name}(formData: FormData) {
${permission("create")}
  await prisma.${delegate}.create({ data: read${name}Data(formData) });
  revalidatePath("${afterSave}");
  redirect("${afterSave}");
}`);
  }

  if (hasUpdate && idField) {
    parts.push(`/** Updates the record with the given id from the "Edit" form. */
export async function update${name}(id: string, formData: FormData) {
${permission("edit")}
  await prisma.${delegate}.update({
    where: { ${idField.name}: ${idParseExpression(idField.type, "id")} },
    data: read${name}Data(formData),
  });
  revalidatePath("${afterSave}");
  redirect("${afterSave}");
}`);
  }

  if (hasDelete && idField) {
    parts.push(`/** Deletes the record with the given id, then returns to the list. */
export async function delete${name}(id: string) {
${permission("delete")}
  await prisma.${delegate}.delete({
    where: { ${idField.name}: ${idParseExpression(idField.type, "id")} },
  });
  revalidatePath("${afterSave}");
  redirect("${afterSave}");
}`);
  }

  return `${parts.join("\n\n")}\n`;
};

import type { Field, SchemaModel } from "@/lib/parser";

import type {
  FormFieldConfig,
  FormInputType,
  StudioConfig,
  StudioModelConfig,
  StudioPage,
} from "./types";

const DEFAULT_PAGES: StudioPage[] = ["list", "detail", "create", "edit"];

const humanize = (value: string): string => {
  const words = value
    .replace(/[_-]+/g, " ")
    .replace(/([a-z\d])([A-Z])/g, "$1 $2")
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1 $2")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((word) =>
      word.toLowerCase() === "id" ? "ID" : word.toLowerCase(),
    );

  if (words.length === 0) return value;

  const label = words.join(" ");
  return `${label.charAt(0).toUpperCase()}${label.slice(1)}`;
};

const pluralize = (label: string): string => {
  if (/(?:s|x|z|ch|sh)$/i.test(label)) return `${label}es`;
  if (/[^aeiou]y$/i.test(label)) return `${label.slice(0, -1)}ies`;
  return `${label}s`;
};

const inputFor = (field: Field): FormInputType => {
  if (field.kind === "enum" || field.kind === "relation") return "select";

  switch (field.type) {
    case "BigInt":
    case "Decimal":
    case "Float":
    case "Int":
      return "number";
    case "Boolean":
      return "checkbox";
    case "DateTime":
      return "date";
    case "Json":
      return "textarea";
    default:
      return "text";
  }
};

const buildModelConfig = (
  model: SchemaModel["models"][number],
): StudioModelConfig => {
  const relationScalarFields = new Set(
    model.fields
      .filter(
        (field) =>
          field.kind === "relation" &&
          !field.isList &&
          (field.relation?.fields.length ?? 0) > 0,
      )
      .flatMap((field) => field.relation?.fields ?? []),
  );

  const columns = model.fields
    .filter(
      (field) =>
        !field.isList && (field.kind === "scalar" || field.kind === "enum"),
    )
    .map((field) => ({
      field: field.name,
      label: humanize(field.name),
      visible: true,
    }));

  const formFields: FormFieldConfig[] = model.fields
    .filter((field) => {
      if (field.isList || field.kind === "unsupported") return false;
      if (field.isId && field.hasDefault) return false;
      if (relationScalarFields.has(field.name)) return false;
      if (field.kind === "relation") {
        return (field.relation?.fields.length ?? 0) > 0;
      }
      return field.kind === "scalar" || field.kind === "enum";
    })
    .map((field) => ({ field: field.name, input: inputFor(field) }));

  return {
    label: pluralize(humanize(model.name)),
    enabledPages: [...DEFAULT_PAGES],
    columns,
    formFields,
  };
};

/** Builds an independent, deterministic starting point for Studio customization. */
export const buildDefaultStudioConfig = (schema: SchemaModel): StudioConfig => ({
  schema,
  models: Object.fromEntries(
    schema.models.map((model) => [model.name, buildModelConfig(model)]),
  ),
  roles: [],
});

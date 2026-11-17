import type { FormInputType, StudioConfig, StudioModelConfig } from "@/lib/studio-config";

import type { SchemaModelEntry } from "./list-page";

/** Where a relation select gets its options from. */
export type RelationSource = {
  /** Related model name, e.g. "Author". */
  model: string;
  /** Field stored as the option value (the referenced field, usually the id). */
  valueField: string;
  /** Field shown as the option text. */
  labelField: string;
};

/** A form field after resolving the config against the schema. */
export type ResolvedFormField = {
  /** Key read from the submitted form and written to the database (for relations: the foreign key). */
  name: string;
  label: string;
  input: FormInputType;
  /** Prisma type of the stored value, e.g. "Int", "String", "DateTime" or an enum name. */
  type: string;
  isOptional: boolean;
  /** Set when the field is an enum. */
  enumValues?: string[];
  /** Set when the field is a relation (rendered as a select of related records). */
  relation?: RelationSource;
};

/** "authorId" -> "Author id"; used when the config has no label for a field. */
const humanize = (value: string): string => {
  const text = value
    .replace(/([a-z\d])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .toLowerCase()
    .trim();
  return `${text.charAt(0).toUpperCase()}${text.slice(1)}`;
};

/**
 * Form fields for a model: the config's formFields in order, skipping fields
 * that no longer exist in the schema, list fields and duplicates.
 * Relation fields are stored through their foreign key scalar.
 */
export const resolveFormFields = (
  config: StudioConfig,
  model: SchemaModelEntry,
  modelConfig: StudioModelConfig,
): ResolvedFormField[] => {
  const result: ResolvedFormField[] = [];
  const seen = new Set<string>();

  for (const formField of modelConfig.formFields) {
    const field = model.fields.find((f) => f.name === formField.field);
    if (!field || field.isList || field.kind === "unsupported") continue;

    const labelFor = (name: string) =>
      modelConfig.columns.find((c) => c.field === name)?.label ?? humanize(name);

    if (field.kind === "relation") {
      const fkName = field.relation?.fields[0];
      const referenced = field.relation?.references[0];
      const fk = model.fields.find((f) => f.name === fkName);
      const target = config.schema.models.find((m) => m.name === field.relation?.model);
      if (!fk || !fkName || !referenced || !target || seen.has(fkName)) continue;

      // Option text: the first plain string field of the related model, else its key.
      const labelField =
        target.fields.find((f) => f.kind === "scalar" && f.type === "String" && !f.isId && !f.isList)
          ?.name ?? referenced;

      seen.add(fkName);
      result.push({
        name: fkName,
        label: humanize(field.name),
        input: "select",
        type: fk.type,
        isOptional: fk.isOptional,
        relation: { model: target.name, valueField: referenced, labelField },
      });
      continue;
    }

    if (seen.has(field.name)) continue;
    seen.add(field.name);

    const enumValues =
      field.kind === "enum"
        ? config.schema.enums.find((e) => e.name === field.type)?.values
        : undefined;

    result.push({
      name: field.name,
      label: labelFor(field.name),
      // "select" only makes sense for enums and relations; plain scalars fall back to text.
      input: formField.input === "select" && !enumValues ? "text" : formField.input,
      type: field.type,
      isOptional: field.isOptional,
      enumValues,
    });
  }

  return result;
};

/** TypeScript expression turning the route `id` string into the model's id type. */
export const idParseExpression = (idType: string, variable: string): string => {
  if (idType === "Int" || idType === "Float") return `Number(${variable})`;
  if (idType === "BigInt") return `BigInt(${variable})`;
  return variable;
};

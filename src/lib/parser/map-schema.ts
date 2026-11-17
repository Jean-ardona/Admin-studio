import type {
  Attribute,
  AttributeArgument,
  Field as AstField,
  Func,
  KeyValue,
  Schema,
  Value,
} from "@mrleebo/prisma-ast";

import type { Field, FieldKind, Relation, SchemaModel } from "./schema-model";

const PRISMA_SCALARS = [
  "BigInt",
  "Boolean",
  "Bytes",
  "DateTime",
  "Decimal",
  "Float",
  "Int",
  "Json",
  "String",
] as const;

const isKeyValue = (value: AttributeArgument["value"]): value is KeyValue =>
  typeof value === "object" && value !== null && !Array.isArray(value) && value.type === "keyValue";

const isRelationArray = (
  value: Value,
): value is Extract<Value, { type: "array" }> =>
  typeof value === "object" && value !== null && !Array.isArray(value) && value.type === "array";

const unquote = (value: string): string => {
  if (!value.startsWith('"') || !value.endsWith('"')) return value;

  try {
    return JSON.parse(value) as string;
  } catch {
    return value.slice(1, -1);
  }
};

const formatFunction = (value: Func): string => {
  const params = value.params?.map(formatValue).join(", ") ?? "";
  return `${value.name}(${params})`;
};

const formatValue = (value: Value): string => {
  if (typeof value === "string") return value;
  if (value === null || typeof value !== "object") return String(value);
  if (Array.isArray(value)) return `[${value.map(formatValue).join(", ")}]`;
  if (value.type === "function") return formatFunction(value);
  if (value.type === "array") return `[${value.args.map(formatValue).join(", ")}]`;
  if (value.type === "object") {
    return `{ ${value.properties.map(({ key, value: item }) => `${key}: ${formatValue(item)}`).join(", ")} }`;
  }
  return "";
};


const findAttribute = (field: AstField, name: string): Attribute | undefined =>
  field.attributes?.find((attribute) => attribute.name === name);

const namedArgument = (attribute: Attribute, key: string): Value | undefined => {
  const argument = attribute.args?.find(({ value }) => isKeyValue(value) && value.key === key);
  return argument && isKeyValue(argument.value) ? argument.value.value : undefined;
};

const stringValue = (
  value: AttributeArgument["value"] | undefined,
): string | undefined => (typeof value === "string" ? unquote(value) : undefined);

const identifierList = (value: Value | undefined): string[] => {
  if (!value) return [];
  const items = isRelationArray(value) ? value.args : Array.isArray(value) ? value : [];
  return items.filter((item): item is string => typeof item === "string").map(unquote);
};

const mapRelation = (field: AstField, targetModel: string): Relation => {
  const attribute = findAttribute(field, "relation");
  const positionalName = attribute?.args?.find(({ value }) => !isKeyValue(value))?.value;

  return {
    model: targetModel,
    name: stringValue(positionalName),
    fields: attribute ? identifierList(namedArgument(attribute, "fields")) : [],
    references: attribute ? identifierList(namedArgument(attribute, "references")) : [],
    onDelete: attribute ? stringValue(namedArgument(attribute, "onDelete")) : undefined,
    onUpdate: attribute ? stringValue(namedArgument(attribute, "onUpdate")) : undefined,
  };
};

const fieldKind = (
  field: AstField,
  typeName: string,
  modelNames: ReadonlySet<string>,
  enumNames: ReadonlySet<string>,
): FieldKind => {
  if (typeof field.fieldType !== "string") return "unsupported";
  if (modelNames.has(typeName)) return "relation";
  if (enumNames.has(typeName)) return "enum";
  if ((PRISMA_SCALARS as readonly string[]).includes(typeName)) return "scalar";
  return "unsupported";
};

const mapField = (
  field: AstField,
  modelNames: ReadonlySet<string>,
  enumNames: ReadonlySet<string>,
): Field => {
  const type = typeof field.fieldType === "string" ? field.fieldType : formatFunction(field.fieldType);
  const kind = fieldKind(field, type, modelNames, enumNames);

  return {
    name: field.name,
    type,
    kind,
    isList: field.array === true,
    isOptional: field.optional === true,
    isId: findAttribute(field, "id") !== undefined,
    isUnique: findAttribute(field, "unique") !== undefined,
    hasDefault: findAttribute(field, "default") !== undefined,
    relation: kind === "relation" ? mapRelation(field, type) : undefined,
  };
};


/** Pure AST-to-domain transformation used by the browser parser and generator. */
export const mapSchemaAst = (schema: Schema): SchemaModel => {
  const astModels = schema.list.filter((block) => block.type === "model");
  const astEnums = schema.list.filter((block) => block.type === "enum");
  const modelNames = new Set(astModels.map(({ name }) => name));
  const enumNames = new Set(astEnums.map(({ name }) => name));

  return {
    models: astModels.map((model) => ({
      name: model.name,
      fields: model.properties
        .filter((property): property is AstField => property.type === "field")
        .map((field) => mapField(field, modelNames, enumNames)),
    })),
    enums: astEnums.map((item) => ({
      name: item.name,
      values: item.enumerators
        .filter((enumerator) => enumerator.type === "enumerator")
        .map(({ name }) => name),
    })),
  };
};

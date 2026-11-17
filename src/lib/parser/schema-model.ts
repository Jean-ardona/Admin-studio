export type FieldKind = "scalar" | "enum" | "relation" | "unsupported";

export type Relation = {
  model: string;
  name?: string;
  fields: string[];
  references: string[];
  onDelete?: string;
  onUpdate?: string;
};

export type Field = {
  name: string;
  type: string;
  kind: FieldKind;
  isList: boolean;
  isOptional: boolean;
  isId: boolean;
  isUnique: boolean;
  hasDefault: boolean;
  relation?: Relation;
};

export type SchemaModel = {
  models: { name: string; fields: Field[] }[];
  enums: { name: string; values: string[] }[];
};

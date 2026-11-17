import type { SchemaModel } from "@/lib/parser";

export type StudioPage = "list" | "detail" | "create" | "edit";

export type FormInputType =
  | "text"
  | "number"
  | "select"
  | "date"
  | "checkbox"
  | "textarea";

export type TableColumnConfig = {
  field: string;
  label: string;
  visible: boolean;
};

export type FormFieldConfig = {
  field: string;
  input: FormInputType;
};

export type StudioModelConfig = {
  label: string;
  enabledPages: StudioPage[];
  columns: TableColumnConfig[];
  formFields: FormFieldConfig[];
};

export type ModelPermissions = {
  view: boolean;
  create: boolean;
  edit: boolean;
  delete: boolean;
};

export type StudioRole = {
  name: string;
  permissions: Record<string, ModelPermissions>;
  menu: string[];
};

export type StudioConfig = {
  schema: SchemaModel;
  models: Record<string, StudioModelConfig>;
  roles: StudioRole[];
};
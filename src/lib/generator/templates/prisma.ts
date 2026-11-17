import type { Field, SchemaModel } from "@/lib/parser";

/** Default value attribute for a field, or "" when it has none. The parsed model only records that a default exists, so a sensible one is chosen by type. */
const defaultAttribute = (field: Field, schema: SchemaModel): string => {
  if (!field.hasDefault) return "";
  if (field.isId) {
    if (field.type === "Int" || field.type === "BigInt") return " @default(autoincrement())";
    return " @default(cuid())";
  }
  if (field.kind === "enum") {
    const first = schema.enums.find((e) => e.name === field.type)?.values[0];
    return first ? ` @default(${first})` : "";
  }
  switch (field.type) {
    case "DateTime":
      return " @default(now())";
    case "Boolean":
      return " @default(false)";
    case "Int":
    case "BigInt":
    case "Float":
    case "Decimal":
      return " @default(0)";
    case "String":
      return ' @default("")';
    case "Json":
      return ' @default("{}")';
    default:
      return "";
  }
};

const relationAttribute = (field: Field): string => {
  const relation = field.relation;
  if (!relation) return "";
  const args: string[] = [];
  if (relation.name) args.push(JSON.stringify(relation.name));
  if (relation.fields.length > 0) {
    args.push(`fields: [${relation.fields.join(", ")}]`);
    args.push(`references: [${relation.references.join(", ")}]`);
  }
  if (relation.onDelete) args.push(`onDelete: ${relation.onDelete}`);
  if (relation.onUpdate) args.push(`onUpdate: ${relation.onUpdate}`);
  return args.length > 0 ? ` @relation(${args.join(", ")})` : "";
};

const renderField = (field: Field, schema: SchemaModel): string => {
  const type = `${field.type}${field.isList ? "[]" : field.isOptional ? "?" : ""}`;
  const attributes = [
    field.isId ? " @id" : "",
    field.isUnique ? " @unique" : "",
    defaultAttribute(field, schema),
    relationAttribute(field),
  ].join("");
  return `  ${field.name} ${type}${attributes}`;
};

/**
 * prisma/schema.prisma for the generated project: a SQLite datasource
 * followed by the enums and models of the imported schema.
 */
export const prismaSchemaTemplate = (schema: SchemaModel): string => {
  const header = `// Prisma schema of the generated admin dashboard.
// The database is a local SQLite file, so no server is needed.
// To use another database, change the provider and DATABASE_URL.

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}`;

  const enums = schema.enums.map(
    (e) => `enum ${e.name} {\n${e.values.map((v) => `  ${v}`).join("\n")}\n}`,
  );
  const models = schema.models.map(
    (m) => `model ${m.name} {\n${m.fields.map((f) => renderField(f, schema)).join("\n")}\n}`,
  );

  return `${[header, ...enums, ...models].join("\n\n")}\n`;
};

/** lib/prisma.ts: one shared PrismaClient, reused across hot reloads in development. */
export const prismaClientTemplate = (): string => `import { PrismaClient } from "@prisma/client";

// In development Next.js reloads modules often. Keeping the client on
// globalThis avoids opening a new database connection on every reload.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
`;

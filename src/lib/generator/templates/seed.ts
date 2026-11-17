import type { Field, SchemaModel } from "@/lib/parser";

/** Number of sample rows created for every model. */
export const SEED_ROWS_PER_MODEL = 3;

type Model = SchemaModel["models"][number];

/** Prisma client delegate name: the model name with a lowercase first letter. */
const delegateName = (modelName: string): string =>
  `${modelName.charAt(0).toLowerCase()}${modelName.slice(1)}`;

/** Variable holding the created row `row` (1-based) of a model, e.g. "post2". */
const rowVariable = (modelName: string, row: number): string => `${delegateName(modelName)}${row}`;

/** A field that points at another model: the scalar foreign key side of a relation. */
type ForeignKey = { targetModel: string; reference: string };

/** Maps the name of each foreign key scalar of a model to the model and field it references. */
const foreignKeys = (model: Model): Map<string, ForeignKey> => {
  const keys = new Map<string, ForeignKey>();
  for (const field of model.fields) {
    const relation = field.relation;
    if (!relation) continue;
    relation.fields.forEach((fkName, index) => {
      keys.set(fkName, { targetModel: relation.model, reference: relation.references[index] ?? "id" });
    });
  }
  return keys;
};

/**
 * Orders models so every model comes after the models its foreign keys point to.
 * Optional links are dropped first when there is a cycle, and as a last resort
 * the schema order is kept. Self references are ignored.
 */
export const seedOrder = (schema: SchemaModel): Model[] => {
  const byName = new Map(schema.models.map((m) => [m.name, m]));
  const deps = new Map<string, { all: Set<string>; required: Set<string> }>();

  for (const model of schema.models) {
    const all = new Set<string>();
    const required = new Set<string>();
    for (const field of model.fields) {
      const relation = field.relation;
      if (!relation || relation.fields.length === 0) continue;
      if (relation.model === model.name || !byName.has(relation.model)) continue;
      all.add(relation.model);
      const fkOptional = relation.fields.some(
        (name) => model.fields.find((f) => f.name === name)?.isOptional,
      );
      if (!field.isOptional && !fkOptional) required.add(relation.model);
    }
    deps.set(model.name, { all, required });
  }

  const placed = new Set<string>();
  const ordered: Model[] = [];
  const remaining = [...schema.models];

  while (remaining.length > 0) {
    // Prefer a model whose links are all satisfied, then one whose required links are.
    const next =
      remaining.find((m) => [...deps.get(m.name)!.all].every((d) => placed.has(d))) ??
      remaining.find((m) => [...deps.get(m.name)!.required].every((d) => placed.has(d))) ??
      remaining[0];
    remaining.splice(remaining.indexOf(next), 1);
    placed.add(next.name);
    ordered.push(next);
  }
  return ordered;
};

/** Two-digit day number so dates stay valid ISO strings. */
const pad = (n: number): string => String(n).padStart(2, "0");

/** "displayName" -> "Display name" */
const humanize = (name: string): string => {
  const spaced = name.replace(/([a-z\d])([A-Z])/g, "$1 $2").toLowerCase();
  return `${spaced.charAt(0).toUpperCase()}${spaced.slice(1)}`;
};

/** TypeScript source of a sample value for a scalar field of row `row` (1-based). */
const scalarValue = (field: Field, modelName: string, row: number): string => {
  switch (field.type) {
    case "String": {
      const lower = field.name.toLowerCase();
      if (lower.includes("email")) {
        return JSON.stringify(`${delegateName(modelName).toLowerCase()}${row}@example.com`);
      }
      if (lower.includes("url") || lower.includes("website")) {
        return JSON.stringify(`https://example.com/${row}`);
      }
      return JSON.stringify(`${humanize(field.name)} ${row}`);
    }
    case "Int":
      return String(row);
    case "BigInt":
      return `BigInt(${row})`;
    case "Float":
      return `${row}.5`;
    case "Decimal":
      return `${row * 10}.5`;
    case "Boolean":
      return row % 2 === 1 ? "true" : "false";
    case "DateTime":
      return `new Date("2024-01-${pad(row)}T09:00:00.000Z")`;
    case "Json":
      return `{ sample: true, row: ${row} }`;
    case "Bytes":
      return `Buffer.from(${JSON.stringify(`sample ${row}`)})`;
    default:
      return JSON.stringify(`${humanize(field.name)} ${row}`);
  }
};

/**
 * Lines of one `data` object for row `row` of a model. Fields with a database
 * default (ids, timestamps) are left out, except enums, which cycle through
 * their values so the sample data shows every option.
 */
const dataLines = (
  model: Model,
  row: number,
  schema: SchemaModel,
  createdBefore: Set<string>,
): string[] => {
  const fks = foreignKeys(model);
  const lines: string[] = [];

  for (const field of model.fields) {
    if (field.kind === "relation" || field.kind === "unsupported") continue;
    // Scalar lists are not supported by SQLite, and relation fields are filled through their foreign key.
    if (field.isList) continue;

    const fk = fks.get(field.name);
    if (fk) {
      if (createdBefore.has(fk.targetModel)) {
        lines.push(`${field.name}: ${rowVariable(fk.targetModel, row)}.${fk.reference},`);
      } else if (!field.isOptional) {
        // Required link to a row that cannot exist yet (cycle or self reference).
        lines.push(`${field.name}: ${scalarValue(field, model.name, row)}, // TODO: point to a real ${fk.targetModel}`);
      }
      continue;
    }

    if (field.kind === "enum") {
      const values = schema.enums.find((e) => e.name === field.type)?.values ?? [];
      if (values.length === 0) continue;
      lines.push(`${field.name}: ${JSON.stringify(values[(row - 1) % values.length])},`);
      continue;
    }

    if (field.hasDefault) continue;
    lines.push(`${field.name}: ${scalarValue(field, model.name, row)},`);
  }
  return lines;
};

/**
 * prisma/seed.ts of the generated project: fills the database with sample rows
 * for every model, in an order that respects foreign keys. Running it again
 * first clears the tables, so the result is always the same.
 */
export const seedTemplate = (schema: SchemaModel): string => {
  const ordered = seedOrder(schema);
  const created = new Set<string>();

  const creates = ordered.map((model) => {
    const delegate = delegateName(model.name);
    const blocks: string[] = [];
    for (let row = 1; row <= SEED_ROWS_PER_MODEL; row++) {
      const lines = dataLines(model, row, schema, created);
      const body = lines.length > 0 ? `\n${lines.map((l) => `      ${l}`).join("\n")}\n    ` : "";
      blocks.push(
        `  const ${rowVariable(model.name, row)} = await prisma.${delegate}.create({\n    data: {${body}},\n  });`,
      );
    }
    created.add(model.name);
    return `  // ${model.name}\n${blocks.join("\n")}`;
  });

  const clears = [...ordered]
    .reverse()
    .map((model) => `  await prisma.${delegateName(model.name)}.deleteMany();`);

  const hasModels = ordered.length > 0;

  return `// Seed script: fills the database with sample data.
// Run it with \`npm run db:seed\` after \`npx prisma db push\`.
// Edit the values below to match the data you want to see in the dashboard.
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
${hasModels ? `  // Clear existing rows first (children before parents) so the seed can be re-run.\n${clears.join("\n")}\n\n  // Create ${SEED_ROWS_PER_MODEL} sample rows per model (parents before children).\n  // Each row is kept in a variable so later rows can reference its id.\n${creates.join("\n\n")}\n\n  console.log("Seeded ${ordered.length} model${ordered.length === 1 ? "" : "s"} with ${SEED_ROWS_PER_MODEL} rows each.");` : '  console.log("The schema has no models, nothing to seed.");'}
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
`;
};

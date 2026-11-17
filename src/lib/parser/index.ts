import { getSchema } from "@mrleebo/prisma-ast";

import { mapSchemaAst } from "./map-schema";

export type { Field, FieldKind, Relation, SchemaModel } from "./schema-model";
export { mapSchemaAst } from "./map-schema";

type ParserError = {
  message?: unknown;
  token?: { startLine?: unknown };
};

const sourceLineCount = (source: string): number => source.split(/\r\n|\r|\n/).length;

const parserErrorLine = (error: ParserError, source: string): number => {
  const line = error.token?.startLine;
  return typeof line === "number" && Number.isFinite(line) && line > 0
    ? line
    : sourceLineCount(source);
};

const parserErrorMessage = (error: unknown): string => {
  if (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof error.message === "string"
  ) {
    return error.message;
  }

  return String(error);
};

/** A syntax error reported by the Prisma parser with a one-based source line. */
export class SchemaParseError extends Error {
  readonly line: number;

  constructor(message: string, line: number, cause?: unknown) {
    super(message, { cause });
    this.name = "SchemaParseError";
    this.line = line;
  }
}

/** Parses schema text synchronously and stops with an exact parser message and line on failure. */
export const parseSchema = (source: string) => {
  try {
    return mapSchemaAst(getSchema(source));
  } catch (error) {
    throw new SchemaParseError(
      parserErrorMessage(error),
      parserErrorLine(error as ParserError, source),
      error,
    );
  }
};

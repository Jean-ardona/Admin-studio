import type { StudioConfig } from "@/lib/studio-config";

import { generateSkeleton } from "./skeleton";
import { formPageFiles } from "./templates/form-pages";
import { listPageFiles } from "./templates/list-page";
import { seedTemplate } from "./templates/seed";
import type { GeneratedFile } from "./types";

/**
 * Generates the full project: skeleton, the seed script and the pages of every enabled model.
 * Later steps (roles) are added here.
 * Pure: the same config always produces the same files.
 */
export const generateProject = (config: StudioConfig): GeneratedFile[] => [
  ...generateSkeleton(config),
  { path: "prisma/seed.ts", content: seedTemplate(config.schema) },
  ...listPageFiles(config),
  ...formPageFiles(config),
];

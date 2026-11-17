import type { GeneratedFile } from "@/lib/generator/types";
import type { StudioConfig } from "@/lib/studio-config";

import { generateSkills } from "./skills";
import { generateSteering } from "./steering";

export { generateSkills } from "./skills";
export { generateSteering } from "./steering";

/** Generates the `.kiro/` folder of the output project: steering files and skills. */
export const generateKiro = (config: StudioConfig): GeneratedFile[] => [
  ...generateSteering(config),
  ...generateSkills(config),
];

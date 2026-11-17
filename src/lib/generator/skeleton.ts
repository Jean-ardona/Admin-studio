import type { StudioConfig } from "@/lib/studio-config";

import { enabledNavItems } from "./naming";
import {
  envTemplate,
  gitignoreTemplate,
  nextConfigTemplate,
  packageJsonTemplate,
  postcssConfigTemplate,
  tsconfigTemplate,
} from "./templates/config-files";
import {
  globalsCssTemplate,
  homePageTemplate,
  navigationTemplate,
  rootLayoutTemplate,
  sidebarTemplate,
  topBarTemplate,
} from "./templates/layout";
import { prismaClientTemplate, prismaSchemaTemplate } from "./templates/prisma";
import { readmeTemplate } from "./templates/readme";
import type { GeneratedFile } from "./types";

/**
 * Generates the project skeleton: tooling config, root layout, sidebar,
 * top bar, Prisma setup (SQLite), env, gitignore and README.
 * Pure: the same config always produces the same files.
 */
export const generateSkeleton = (config: StudioConfig): GeneratedFile[] => {
  const items = enabledNavItems(config);

  return [
    { path: "package.json", content: packageJsonTemplate() },
    { path: "tsconfig.json", content: tsconfigTemplate() },
    { path: "next.config.ts", content: nextConfigTemplate() },
    { path: "postcss.config.mjs", content: postcssConfigTemplate() },
    { path: ".env", content: envTemplate() },
    { path: ".gitignore", content: gitignoreTemplate() },
    { path: "README.md", content: readmeTemplate(items) },
    { path: "prisma/schema.prisma", content: prismaSchemaTemplate(config.schema) },
    { path: "lib/prisma.ts", content: prismaClientTemplate() },
    { path: "lib/navigation.ts", content: navigationTemplate(items) },
    { path: "app/globals.css", content: globalsCssTemplate() },
    { path: "app/layout.tsx", content: rootLayoutTemplate() },
    { path: "app/page.tsx", content: homePageTemplate(items) },
    { path: "components/sidebar.tsx", content: sidebarTemplate() },
    { path: "components/top-bar.tsx", content: topBarTemplate() },
  ];
};

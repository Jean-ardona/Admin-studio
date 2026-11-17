import type { StudioConfig } from "@/lib/studio-config";

import { generateKiro } from "../kiro";
import { generateSkeleton } from "./skeleton";
import { formPageFiles } from "./templates/form-pages";
import { listPageFiles } from "./templates/list-page";
import {
  currentRoleTemplate,
  notAllowedTemplate,
  roleHomePageTemplate,
  roleLayoutTemplate,
  roleSidebarTemplate,
} from "./templates/permissions";
import { roleSwitcherTemplate, roleTopBarTemplate } from "./templates/role-switcher";
import { rolesTemplate } from "./templates/roles";
import { seedTemplate } from "./templates/seed";
import type { GeneratedFile } from "./types";

/** Skeleton files replaced by role-aware versions in the full project. */
const roleAwareOverrides: Record<string, () => string> = {
  "components/top-bar.tsx": roleTopBarTemplate,
  "components/sidebar.tsx": roleSidebarTemplate,
  "app/layout.tsx": roleLayoutTemplate,
  "app/page.tsx": roleHomePageTemplate,
};

/**
 * Generates the full project: skeleton, the seed script and the pages of every enabled model.
 * It also includes lib/roles.ts (roles, permissions and the can() helper) and the
 * files that enforce permissions in the sidebar, pages and server actions.
 * Pure: the same config always produces the same files.
 */
export const generateProject = (config: StudioConfig): GeneratedFile[] => [
  // The skeleton's top bar, sidebar, layout and home page are placeholders: swap in the role-aware ones.
  ...generateSkeleton(config).map((file) => {
    const override = roleAwareOverrides[file.path];
    return override ? { ...file, content: override() } : file;
  }),
  { path: "prisma/seed.ts", content: seedTemplate(config.schema) },
  { path: "lib/roles.ts", content: rolesTemplate(config) },
  { path: "lib/current-role.ts", content: currentRoleTemplate() },
  { path: "components/not-allowed.tsx", content: notAllowedTemplate() },
  { path: "components/role-switcher.tsx", content: roleSwitcherTemplate() },
  ...listPageFiles(config),
  ...formPageFiles(config),
  ...generateKiro(config),
];

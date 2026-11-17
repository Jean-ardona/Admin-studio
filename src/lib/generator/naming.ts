import type { StudioConfig } from "@/lib/studio-config";

/** Turns a model name such as "BlogPost" into a URL segment such as "blog-post". */
export const modelSlug = (modelName: string): string =>
  modelName
    .replace(/([a-z\d])([A-Z])/g, "$1-$2")
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1-$2")
    .replace(/[^A-Za-z\d]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();

export type NavItem = { model: string; label: string; href: string };

/**
 * Models that appear in the sidebar: those in the schema whose config
 * has the "list" page enabled. Order follows the schema.
 */
export const enabledNavItems = (config: StudioConfig): NavItem[] =>
  config.schema.models
    .filter((model) => config.models[model.name]?.enabledPages.includes("list"))
    .map((model) => ({
      model: model.name,
      label: config.models[model.name].label,
      href: `/${modelSlug(model.name)}`,
    }));

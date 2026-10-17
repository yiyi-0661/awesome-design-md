import { demoMethods } from "./demo-data";
import type { MethodArticle } from "./types";

const bundledMethodIds = new Set(demoMethods.map((article) => article.id));

/**
 * Refresh the two bundled reading notes while preserving everything the user
 * has created in the private workspace. Stable IDs make this a small content
 * migration instead of clearing the entire local library.
 */
export function mergeBundledMethods(savedMethods: MethodArticle[]) {
  const userMethods = savedMethods.filter((article) => !bundledMethodIds.has(article.id));
  return [...demoMethods, ...userMethods];
}

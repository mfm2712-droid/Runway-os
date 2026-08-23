import type { BnplPlan, ExpenseCategory } from "../../types";
import { DICTIONARIES, EN, type Lang } from "./translations";

export function getCategoryLabel(category: ExpenseCategory, lang: Lang): string {
  const key = `category.${category}`;
  return DICTIONARIES[lang][key] ?? EN[key] ?? category;
}

export function getBnplPlanLabel(plan: BnplPlan, lang: Lang): string {
  const key = `bnpl.${plan}`;
  return DICTIONARIES[lang][key] ?? EN[key] ?? plan;
}

export function getBucketLabel(bucketKey: string, lang: Lang): string {
  const key = `bucket.${bucketKey}`;
  return DICTIONARIES[lang][key] ?? EN[key] ?? bucketKey;
}

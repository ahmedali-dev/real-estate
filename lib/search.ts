/** Treat search terms as literal text, never user-provided regular expressions. */
export function literalSearch(value: string | null | undefined) {
  return value?.trim().slice(0, 200).replace(/[.*+?^${}()|[\]\\]/g, "\\$&") || "";
}

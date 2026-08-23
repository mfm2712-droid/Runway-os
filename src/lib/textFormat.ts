// Client-side safety net for AI replies that slip past the "no markdown"
// system prompt. Strips emphasis asterisks without a full markdown parser —
// the app never renders rich text, so bold/italic markers would otherwise
// show up as raw asterisks in the chat bubble.
export function stripMarkdownEmphasis(text: string): string {
  let result = text.replace(/\*\*([^*]+?)\*\*/g, "$1");
  // Single-asterisk emphasis requires no whitespace just inside the
  // asterisks, which multiplication like "3 * 4" always has — so this
  // never touches numeric expressions.
  result = result.replace(/\*([^\s*][^*]*?)\*/g, "$1");
  return result;
}

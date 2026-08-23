import { describe, expect, it } from "vitest";
import { stripMarkdownEmphasis } from "../textFormat";

describe("stripMarkdownEmphasis", () => {
  it("strips paired double asterisks", () => {
    expect(stripMarkdownEmphasis("This is **bold** text")).toBe("This is bold text");
  });

  it("strips multiple bold spans in one string", () => {
    expect(stripMarkdownEmphasis("Cancel **Netflix** to save **£12/mo**")).toBe(
      "Cancel Netflix to save £12/mo",
    );
  });

  it("strips single-asterisk emphasis", () => {
    expect(stripMarkdownEmphasis("This is *important* to know")).toBe("This is important to know");
  });

  it("does not touch multiplication expressions", () => {
    expect(stripMarkdownEmphasis("3 * 4 * 2 = 24")).toBe("3 * 4 * 2 = 24");
  });

  it("leaves plain text unchanged", () => {
    expect(stripMarkdownEmphasis("Nothing to strip here.")).toBe("Nothing to strip here.");
  });

  it("leaves an unclosed marker as-is (mid-stream)", () => {
    expect(stripMarkdownEmphasis("Cancel **Netflix")).toBe("Cancel **Netflix");
  });
});

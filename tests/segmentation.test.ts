import { describe, it, expect } from "vitest";
import { TokenLoom } from "../src/index";

// Helper function to collect text events from parser
function collectTextEvents(parser: TokenLoom, input: string): string[] {
  const textEvents: string[] = [];
  parser.on("text", (event) => {
    textEvents.push(event.text);
  });

  parser.feed({ text: input });
  parser.flush();

  return textEvents;
}

// Helper function to collect text events from parser with explicit space termination
// This helps with word segmentation tests where we want immediate output
function collectTextEventsImmediate(
  parser: TokenLoom,
  input: string
): string[] {
  const textEvents: string[] = [];
  parser.on("text", (event) => {
    textEvents.push(event.text);
  });

  // Add a space to force emission of the last word, then remove it
  parser.feed({ text: input + " " });
  parser.flush();

  // Remove the extra space we added
  if (textEvents.length > 0 && textEvents[textEvents.length - 1] === " ") {
    textEvents.pop();
  }

  return textEvents;
}

describe("Segmentation Tests", () => {
  describe("Token Segmentation", () => {
    it("should split by whitespace vs non-whitespace", () => {
      const parser = new TokenLoom({ emitUnit: "token" });
      const result = collectTextEvents(parser, "hello world test");

      expect(result).toEqual(["hello", " ", "world", " ", "test"]);
    });

    it("should preserve multiple spaces", () => {
      const parser = new TokenLoom({ emitUnit: "token" });
      const result = collectTextEvents(parser, "a   b");

      expect(result).toEqual(["a", "   ", "b"]);
    });

    it("should handle mixed punctuation", () => {
      const parser = new TokenLoom({ emitUnit: "token" });
      const result = collectTextEvents(parser, "hello, world!");

      expect(result).toEqual(["hello,", " ", "world!"]);
    });

    it("should handle tabs and newlines", () => {
      const parser = new TokenLoom({ emitUnit: "token" });
      const result = collectTextEvents(parser, "a\tb\nc");

      expect(result).toEqual(["a", "\t", "b", "\n", "c"]);
    });

    it("should handle empty strings", () => {
      const parser = new TokenLoom({ emitUnit: "token" });
      const result = collectTextEvents(parser, "");

      expect(result).toEqual([]);
    });

    it("should handle only whitespace", () => {
      const parser = new TokenLoom({ emitUnit: "token" });
      const result = collectTextEvents(parser, "   ");

      expect(result).toEqual(["   "]);
    });
  });

  describe("Word Segmentation", () => {
    it("should split basic words and punctuation", () => {
      const parser = new TokenLoom({ emitUnit: "word" });
      const result = collectTextEventsImmediate(parser, "hello world");

      expect(result).toEqual(["hello", " ", "world"]);
    });

    it("should treat comment operators as single units", () => {
      const parser = new TokenLoom({ emitUnit: "word" });
      const result = collectTextEventsImmediate(parser, "// comment");

      expect(result).toEqual(["//", " ", "comment"]);
    });

    it("should handle multi-line comment operators", () => {
      const parser = new TokenLoom({ emitUnit: "word" });
      const result = collectTextEvents(parser, "/* comment */");

      expect(result).toEqual(["/*", " ", "comment", " ", "*/"]);
    });

    it("should handle single-line comments", () => {
      const parser = new TokenLoom({ emitUnit: "word" });
      const result = collectTextEventsImmediate(parser, "code // comment");

      expect(result).toEqual(["code", " ", "//", " ", "comment"]);
    });

    it("should handle complex JavaScript-like code", () => {
      const parser = new TokenLoom({ emitUnit: "word" });
      const result = collectTextEvents(
        parser,
        "function test() { return 42; }"
      );

      expect(result).toEqual([
        "function",
        " ",
        "test",
        "(",
        ")",
        " ",
        "{",
        " ",
        "return",
        " ",
        "42",
        ";",
        " ",
        "}",
      ]);
    });

    it("should handle mixed comment types", () => {
      const parser = new TokenLoom({ emitUnit: "word" });
      const result = collectTextEventsImmediate(parser, "/* block */ // line");

      expect(result).toEqual([
        "/*",
        " ",
        "block",
        " ",
        "*/",
        " ",
        "//",
        " ",
        "line",
      ]);
    });

    it("should handle operators and symbols", () => {
      const parser = new TokenLoom({ emitUnit: "word" });
      const result = collectTextEventsImmediate(parser, "a = b + c");

      expect(result).toEqual(["a", " ", "=", " ", "b", " ", "+", " ", "c"]);
    });

    it("should handle underscores in identifiers", () => {
      const parser = new TokenLoom({ emitUnit: "word" });
      const result = collectTextEventsImmediate(
        parser,
        "my_variable test_func"
      );

      expect(result).toEqual(["my_variable", " ", "test_func"]);
    });

    it("should handle numbers", () => {
      const parser = new TokenLoom({ emitUnit: "word" });
      const result = collectTextEventsImmediate(parser, "num = 123.45");

      // Note: 123.45 stays as one unit because digits are word characters
      expect(result).toEqual(["num", " ", "=", " ", "123.45"]);
    });

    it("should handle Unicode characters", () => {
      const parser = new TokenLoom({ emitUnit: "word" });
      const result = collectTextEventsImmediate(parser, "café naïve résumé");

      expect(result).toEqual(["café", " ", "naïve", " ", "résumé"]);
    });

    it("should handle edge case with lone slash", () => {
      const parser = new TokenLoom({ emitUnit: "word" });
      const result = collectTextEventsImmediate(parser, "a / b");

      expect(result).toEqual(["a", " ", "/", " ", "b"]);
    });

    it("should handle edge case with lone asterisk", () => {
      const parser = new TokenLoom({ emitUnit: "word" });
      const result = collectTextEventsImmediate(parser, "a * b");

      expect(result).toEqual(["a", " ", "*", " ", "b"]);
    });
  });

  describe("Grapheme Segmentation", () => {
    it("should split basic text by characters", () => {
      const parser = new TokenLoom({ emitUnit: "grapheme" });
      const result = collectTextEvents(parser, "abc");

      expect(result).toEqual(["a", "b", "c"]);
    });

    it("should handle spaces", () => {
      const parser = new TokenLoom({ emitUnit: "grapheme" });
      const result = collectTextEvents(parser, "a b");

      expect(result).toEqual(["a", " ", "b"]);
    });

    it("should handle punctuation", () => {
      const parser = new TokenLoom({ emitUnit: "grapheme" });
      const result = collectTextEvents(parser, "a,b!");

      expect(result).toEqual(["a", ",", "b", "!"]);
    });

    it("should handle numbers", () => {
      const parser = new TokenLoom({ emitUnit: "grapheme" });
      const result = collectTextEvents(parser, "123");

      expect(result).toEqual(["1", "2", "3"]);
    });

    it("should handle Unicode characters", () => {
      const parser = new TokenLoom({ emitUnit: "grapheme" });
      const result = collectTextEvents(parser, "café");

      expect(result).toEqual(["c", "a", "f", "é"]);
    });

    it("should handle emojis as single graphemes (if Intl.Segmenter available)", () => {
      const parser = new TokenLoom({ emitUnit: "grapheme" });
      const result = collectTextEvents(parser, "a🎉b");

      // Should be 3 graphemes: 'a', '🎉', 'b'
      // Note: Fallback might split emoji, but Intl.Segmenter should handle it correctly
      expect(result.length).toBeGreaterThan(2);
      expect(result[0]).toBe("a");
      expect(result[result.length - 1]).toBe("b");
    });

    it("should handle newlines and tabs", () => {
      const parser = new TokenLoom({ emitUnit: "grapheme" });
      const result = collectTextEvents(parser, "a\nb\tc");

      expect(result).toEqual(["a", "\n", "b", "\t", "c"]);
    });

    it("should handle empty string", () => {
      const parser = new TokenLoom({ emitUnit: "grapheme" });
      const result = collectTextEvents(parser, "");

      expect(result).toEqual([]);
    });

    it("should handle complex Unicode sequences", () => {
      const parser = new TokenLoom({ emitUnit: "grapheme" });
      const result = collectTextEvents(parser, "नमस्ते");

      // This is a complex script - exact behavior depends on Intl.Segmenter availability
      expect(result.length).toBeGreaterThan(0);
      expect(result.join("")).toBe("नमस्ते");
    });
  });

  describe("Cross-Segmentation Consistency", () => {
    it("should produce same content when joined, regardless of segmentation", () => {
      const testInput =
        "hello /* comment */ world // line comment\nfunction test() { return 42; }";

      const tokenParser = new TokenLoom({ emitUnit: "token" });
      const wordParser = new TokenLoom({ emitUnit: "word" });
      const graphemeParser = new TokenLoom({ emitUnit: "grapheme" });

      const tokenResult = collectTextEvents(tokenParser, testInput);
      const wordResult = collectTextEvents(wordParser, testInput);
      const graphemeResult = collectTextEvents(graphemeParser, testInput);

      expect(tokenResult.join("")).toBe(testInput);
      expect(wordResult.join("")).toBe(testInput);
      expect(graphemeResult.join("")).toBe(testInput);
    });

    it("should handle identical simple input consistently", () => {
      const testInput = "test";

      const tokenParser = new TokenLoom({ emitUnit: "token" });
      const wordParser = new TokenLoom({ emitUnit: "word" });

      const tokenResult = collectTextEvents(tokenParser, testInput);
      const wordResult = collectTextEventsImmediate(wordParser, testInput);

      // Both should produce the same result for simple word
      expect(tokenResult).toEqual(["test"]);
      expect(wordResult).toEqual(["test"]);
    });
  });

  describe("Edge Cases", () => {
    it("should handle fragmented comment operators across chunks", () => {
      const parser = new TokenLoom({ emitUnit: "word" });
      const textEvents: string[] = [];

      parser.on("text", (event) => {
        textEvents.push(event.text);
      });

      // Feed fragmented comment operator
      parser.feed({ text: "/" });
      parser.feed({ text: "/ comment " }); // Add space to force emission
      parser.flush();

      // Should eventually recognize as comment operator
      expect(textEvents.join("").trim()).toBe("// comment");
    });

    it("should handle very long words", () => {
      const longWord = "a".repeat(1000);
      const parser = new TokenLoom({ emitUnit: "word" });
      const result = collectTextEventsImmediate(parser, longWord);

      expect(result).toEqual([longWord]);
    });

    it("should handle only punctuation", () => {
      const parser = new TokenLoom({ emitUnit: "word" });
      const result = collectTextEvents(parser, "!@#$%^&*()");

      // Each punctuation mark should be separate
      expect(result).toEqual([
        "!",
        "@",
        "#",
        "$",
        "%",
        "^",
        "&",
        "*",
        "(",
        ")",
      ]);
    });

    it("should handle mixed scripts", () => {
      const parser = new TokenLoom({ emitUnit: "word" });
      const result = collectTextEventsImmediate(parser, "Hello 世界 test");

      expect(result).toEqual(["Hello", " ", "世界", " ", "test"]);
    });
  });
});

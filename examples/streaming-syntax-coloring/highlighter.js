/**
 * JavaScript Syntax Highlighter
 *
 * Provides ANSI color-coded syntax highlighting for JavaScript code.
 *
 * NOTE: This is a basic/simplified syntax highlighter for demonstration purposes.
 * It is NOT a complete JavaScript syntax highlighter and has limitations:
 * - Doesn't handle escaped quotes in strings
 * - Simple regex-based approach may miss edge cases
 * - Limited operator and keyword coverage
 * - No support for template literals with expressions
 *
 * This serves as a good starting point for building a more complete syntax highlighter.
 */

// ANSI color helpers for stdout
export const COLORS = {
  reset: "\x1b[0m",
  text: "\x1b[37m", // white
  tag: "\x1b[35m", // magenta
  think: "\x1b[93m", // bright yellow
  proc: "\x1b[96m", // bright cyan
  code: "\x1b[92m", // bright green

  // Syntax highlighting colors
  keyword: "\x1b[94m", // bright blue
  string: "\x1b[93m", // bright yellow
  number: "\x1b[91m", // bright red
  comment: "\x1b[90m", // dark gray
  function: "\x1b[95m", // bright magenta
  operator: "\x1b[97m", // bright white
};

export const writeColored = (s, color) =>
  process.stdout.write(color + s + COLORS.reset);

// Basic JavaScript syntax highlighter
export class JavaScriptHighlighter {
  constructor() {
    this.keywords = new Set([
      "const",
      "let",
      "var",
      "function",
      "return",
      "if",
      "else",
      "for",
      "while",
      "do",
      "switch",
      "case",
      "break",
      "continue",
      "try",
      "catch",
      "finally",
      "throw",
      "new",
      "class",
      "extends",
      "import",
      "export",
      "default",
      "async",
      "await",
      "true",
      "false",
      "null",
      "undefined",
    ]);

    this.operators = new Set([
      "=",
      "==",
      "===",
      "!=",
      "!==",
      "<",
      ">",
      "<=",
      ">=",
      "+",
      "-",
      "*",
      "/",
      "%",
      "&&",
      "||",
      "!",
      "?",
      ":",
    ]);
  }

  highlight(text) {
    // Simple regex-based highlighting
    let highlighted = text;

    // Highlight strings (simple approach - doesn't handle escaped quotes)
    highlighted = highlighted.replace(
      /"([^"]*)"/g,
      `${COLORS.string}"$1"${COLORS.reset}`
    );
    highlighted = highlighted.replace(
      /'([^']*)'/g,
      `${COLORS.string}'$1'${COLORS.reset}`
    );

    // Highlight numbers
    highlighted = highlighted.replace(
      /\b(\d+\.?\d*)\b/g,
      `${COLORS.number}$1${COLORS.reset}`
    );

    // Highlight comments
    highlighted = highlighted.replace(
      /(\/\/.*$)/gm,
      `${COLORS.comment}$1${COLORS.reset}`
    );
    highlighted = highlighted.replace(
      /(\/\*[\s\S]*?\*\/)/g,
      `${COLORS.comment}$1${COLORS.reset}`
    );

    // Highlight function names (simple pattern)
    highlighted = highlighted.replace(
      /\b([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\(/g,
      `${COLORS.function}$1${COLORS.reset}(`
    );

    // Highlight keywords
    for (const keyword of this.keywords) {
      const regex = new RegExp(`\\b(${keyword})\\b`, "g");
      highlighted = highlighted.replace(
        regex,
        `${COLORS.keyword}$1${COLORS.reset}`
      );
    }

    return highlighted;
  }

  // New method to apply syntax-aware coloring
  colorizeByState(text, ctx) {
    // If we're in a comment, color the entire text as comment
    if (ctx.inComment) {
      return `${COLORS.comment}${text}${COLORS.reset}`;
    }

    // If we're in a string, color the entire text as string
    if (ctx.inString) {
      return `${COLORS.string}${text}${COLORS.reset}`;
    }

    // Otherwise, apply normal highlighting
    return this.highlight(text);
  }
}

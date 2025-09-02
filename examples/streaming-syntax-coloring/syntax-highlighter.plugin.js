/**
 * Syntax Highlighter Plugin
 *
 * Implements a syntax highlighting plugin that processes code-fence-chunk events
 * and applies JavaScript syntax highlighting using the transformation pipeline.
 *
 * NOTE: This is a demonstration plugin using a basic JavaScript syntax highlighter.
 * The highlighting logic is simplified and not production-ready. It serves as a
 * good starting point to understand how to:
 * - Implement TokenLoom plugins as classes
 * - Use the transformation pipeline
 * - Track stateful syntax context across streaming chunks
 * - Apply highlighting transformations to code fence content
 *
 * For production use, consider integrating with mature syntax highlighting libraries.
 */

import { JavaScriptHighlighter } from "./highlighter.js";

export class SyntaxHighlighterPlugin {
  constructor() {
    this.name = "syntax-highlighter";
    this.jsHighlighter = new JavaScriptHighlighter();
  }

  onInit(api) {
    // no-op, but available for future
  }

  transform(event, api) {
    // Only highlight JavaScript code fence chunks
    if (
      event.type === "code-fence-chunk" &&
      api.state.inCodeFence?.lang === "javascript"
    ) {
      // Initialize syntax highlighting context if not present
      if (!event.context.syntaxHighlighter) {
        event.context.syntaxHighlighter = {
          inString: false,
          stringChar: null,
          bracketDepth: 0,
          inComment: false,
          commentType: null, // 'single' | 'multiline' | null
          pendingSlash: false, // Track when we've seen the first "/" and are waiting for the second
        };
      }

      const ctx = event.context.syntaxHighlighter;

      // Track stateful syntax elements
      this.updateSyntaxState(event.text, ctx);

      //console.log(`🎨 Highlighting: "${event.text}" | State: ${JSON.stringify(ctx)}`);

      return {
        ...event,
        text: this.jsHighlighter.colorizeByState(event.text, ctx),
        metadata: {
          highlighted: true,
          originalText: event.text,
          language: "javascript",
          syntaxState: { ...ctx }, // Include current syntax state
        },
      };
    }

    // Pass through other events unchanged
    return event;
  }

  updateSyntaxState(text, ctx) {
    // Initialize pending slash state if not present
    if (ctx.pendingSlash === undefined) {
      ctx.pendingSlash = false;
    }

    // Handle special case where "//" arrives as separate tokens
    if (text === "/" && !ctx.inString && !ctx.inComment) {
      if (ctx.pendingSlash) {
        // This is the second slash, start single-line comment
        ctx.inComment = true;
        ctx.commentType = "single";
        ctx.pendingSlash = false;
        return;
      } else {
        // This is the first slash, wait for potential second slash
        ctx.pendingSlash = true;
        return;
      }
    }

    // Reset pending slash if we get any other token
    if (text !== "/" && ctx.pendingSlash) {
      ctx.pendingSlash = false;
    }

    // Handle //* multiline comment case when it arrives as a single token
    if (text === "/*" && !ctx.inString && !ctx.inComment) {
      ctx.inComment = true;
      ctx.commentType = "multiline";
      return;
    }

    // Handle */ multiline comment end when it arrives as a single token
    if (text === "*/" && ctx.inComment && ctx.commentType === "multiline") {
      ctx.inComment = false;
      ctx.commentType = null;
      return;
    }

    // Handle // single-line comment when it arrives as a single token
    if (text === "//" && !ctx.inString && !ctx.inComment) {
      ctx.inComment = true;
      ctx.commentType = "single";
      return;
    }

    // Handle newline ending single-line comments
    if (text.includes("\n") && ctx.inComment && ctx.commentType === "single") {
      ctx.inComment = false;
      ctx.commentType = null;
      ctx.pendingSlash = false;
      return;
    }

    // Skip detailed character processing if we're in a comment
    if (ctx.inComment) return;

    // Handle string detection
    if ((text === '"' || text === "'" || text === "`") && !ctx.inString) {
      ctx.inString = true;
      ctx.stringChar = text;
      return;
    }
    if (text === ctx.stringChar && ctx.inString) {
      ctx.inString = false;
      ctx.stringChar = null;
      return;
    }
    if (ctx.inString) return;

    // Handle bracket counting for other features
    if (text === "{" || text === "(" || text === "[") {
      ctx.bracketDepth++;
    }
    if (text === "}" || text === ")" || text === "]") {
      ctx.bracketDepth = Math.max(0, ctx.bracketDepth - 1);
    }
  }

  postTransform(event, api) {
    // Add metadata to all events for debugging
    return {
      ...event,
      metadata: {
        ...event.metadata,
        processedAt: Date.now(),
        pluginChain: (event.metadata?.pluginChain || []).concat([
          "syntax-highlighter",
        ]),
      },
    };
  }

  onDispose() {
    // Cleanup if needed
  }
}

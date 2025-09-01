/**
 * Custom Plugin Example
 *
 * This example demonstrates how to create custom plugins for TokenLoom
 * to transform and process text in specialized ways.
 */

import { TokenLoom } from "../dist/index.esm.js";

// Sample text with custom tags and code fences
const sampleText = `Here is some intro text.

<think>This is my hidden reasoning</think>

Now a code block:

\`\`\`javascript
console.log("Hello world");
function test() {
  return 42;
}
\`\`\`

<plan attr="value">
Step 1: Parse the input
Step 2: Process chunks
</plan>

And we are done.`;

console.log("🔌 TokenLoom Custom Plugin Example\n");

// Create parser
const parser = new TokenLoom({
  emitUnit: "token",
  tags: ["think", "plan"],
});

// Plugin 1: HTML Converter
// Converts custom tags to HTML with styling
const htmlConverterPlugin = {
  name: "html-converter",
  onEvent(event, api) {
    switch (event.type) {
      case "tag-open":
        if (event.name === "think") {
          api.pushOutput(
            '<div class="thinking" style="color: #666; font-style: italic;">💭 '
          );
        } else if (event.name === "plan") {
          api.pushOutput(
            '<div class="planning" style="color: #0066cc; font-weight: bold;">📋 '
          );
        }
        break;

      case "tag-close":
        if (event.name === "think" || event.name === "plan") {
          api.pushOutput("</div>");
        }
        break;

      case "text":
        // Escape HTML and add text
        const escaped = event.text
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;");
        api.pushOutput(escaped);
        break;

      case "code-fence-start":
        api.pushOutput(`<pre><code class="language-${event.lang || ""}">`);
        break;

      case "code-fence-chunk":
        const escapedCode = event.text
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;");
        api.pushOutput(escapedCode);
        break;

      case "code-fence-end":
        api.pushOutput("</code></pre>");
        break;
    }
  },
};

// Plugin 2: Statistics Collector
// Collects statistics about the parsed content
const statsPlugin = {
  name: "stats-collector",
  stats: {
    totalText: 0,
    totalTags: 0,
    totalCodeBlocks: 0,
    tagTypes: new Set(),
    codeLanguages: new Set(),
  },

  onEvent(event) {
    switch (event.type) {
      case "text":
        this.stats.totalText += event.text.length;
        break;

      case "tag-open":
        this.stats.totalTags++;
        this.stats.tagTypes.add(event.name);
        break;

      case "code-fence-start":
        this.stats.totalCodeBlocks++;
        if (event.lang) {
          this.stats.codeLanguages.add(event.lang);
        }
        break;
    }
  },

  getStats() {
    return {
      ...this.stats,
      tagTypes: Array.from(this.stats.tagTypes),
      codeLanguages: Array.from(this.stats.codeLanguages),
    };
  },
};

// Plugin 3: Content Filter
// Filters out specific content based on context
const contentFilterPlugin = {
  name: "content-filter",
  filteredContent: [],

  onEvent(event) {
    // Collect content from think tags (could be used for logging, analysis, etc.)
    if (event.type === "text" && event.in?.inTag?.name === "think") {
      this.filteredContent.push({
        type: "thinking",
        content: event.text,
        timestamp: new Date().toISOString(),
      });
    }

    // Collect code content
    if (event.type === "code-fence-chunk") {
      this.filteredContent.push({
        type: "code",
        content: event.text,
        language: event.in?.inCodeFence?.lang || "unknown",
        timestamp: new Date().toISOString(),
      });
    }
  },

  getFilteredContent() {
    return this.filteredContent;
  },
};

// Add all plugins to the parser
parser.use(htmlConverterPlugin);
parser.use(statsPlugin);
parser.use(contentFilterPlugin);

console.log("Processing text with custom plugins...\n");

// Process the text
parser.feed({ text: sampleText });
parser.flush();

// Get the HTML output
const htmlOutput = parser.getPluginOutput();

console.log("=".repeat(60));
console.log("🎨 HTML Output");
console.log("=".repeat(60));
console.log(htmlOutput);

console.log("\n" + "=".repeat(60));
console.log("📊 Content Statistics");
console.log("=".repeat(60));
const stats = statsPlugin.getStats();
console.log(`📝 Total text characters: ${stats.totalText}`);
console.log(`🏷️  Total tags: ${stats.totalTags}`);
console.log(`💻 Total code blocks: ${stats.totalCodeBlocks}`);
console.log(`🎯 Tag types found: ${stats.tagTypes.join(", ")}`);
console.log(`🔤 Code languages: ${stats.codeLanguages.join(", ")}`);

console.log("\n" + "=".repeat(60));
console.log("🔍 Filtered Content");
console.log("=".repeat(60));
const filteredContent = contentFilterPlugin.getFilteredContent();
filteredContent.forEach((item, index) => {
  console.log(
    `${index + 1}. [${item.type.toUpperCase()}] ${item.content.trim()}`
  );
  if (item.language) {
    console.log(`   Language: ${item.language}`);
  }
  console.log(`   Timestamp: ${item.timestamp}\n`);
});

console.log("✅ Custom plugin example complete!");

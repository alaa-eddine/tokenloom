/**
 * Custom Plugin Example
 *
 * This example demonstrates how to create custom plugins for TokenLoom
 * using the Plugin base class and the transformation pipeline.
 *
 * Key concepts illustrated:
 * 1. Plugin class inheritance from PluginBase
 * 2. Plugin lifecycle methods (onInit, preTransform, transform, postTransform)
 * 3. Shared context for state coordination between plugins
 * 4. Event filtering and transformation
 * 5. Plugin ordering and pipeline phases
 *
 * The example includes three plugins:
 * - HTMLConverterPlugin: Converts custom tags to HTML (transform phase)
 * - StatsCollectorPlugin: Collects parsing statistics (preTransform phase)
 * - ContentFilterPlugin: Extracts specific content types (preTransform phase)
 */

import {
  TokenLoom,
  PluginBase,
  TextCollectorPlugin,
} from "../dist/index.esm.js";

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

// Plugin 1: HTML Converter
// Converts custom tags and code to HTML by modifying text events
class HTMLConverterPlugin extends PluginBase {
  name = "html-converter";

  onInit(api) {
    console.log("🎨 Initializing HTML converter...");
  }

  // Use transform to modify text events as they pass through
  transform(event, api) {
    // Store the conversion state in shared context
    if (!event.context.htmlConverter) {
      event.context.htmlConverter = {
        output: [],
        inThinkTag: false,
        inPlanTag: false,
        inCodeFence: false,
      };
    }

    const state = event.context.htmlConverter;

    switch (event.type) {
      case "tag-open":
        if (event.name === "think") {
          state.inThinkTag = true;
          state.output.push(
            '<div class="thinking" style="color: #666; font-style: italic;">💭 '
          );
        } else if (event.name === "plan") {
          state.inPlanTag = true;
          state.output.push(
            '<div class="planning" style="color: #0066cc; font-weight: bold;">📋 '
          );
        }
        // Don't emit the original tag
        return null;

      case "tag-close":
        if (event.name === "think") {
          state.inThinkTag = false;
          state.output.push("</div>");
        } else if (event.name === "plan") {
          state.inPlanTag = false;
          state.output.push("</div>");
        }
        // Don't emit the original tag
        return null;

      case "text":
        // Escape HTML and add to output
        const escaped = event.text
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;");
        state.output.push(escaped);

        // Return modified text event with HTML content
        return {
          ...event,
          text: escaped,
        };

      case "code-fence-start":
        state.inCodeFence = true;
        state.output.push(`<pre><code class="language-${event.lang || ""}">`);
        // Don't emit the original fence start
        return null;

      case "code-fence-chunk":
        const escapedCode = event.text
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;");
        state.output.push(escapedCode);

        // Return modified code chunk
        return {
          ...event,
          text: escapedCode,
        };

      case "code-fence-end":
        state.inCodeFence = false;
        state.output.push("</code></pre>");
        // Don't emit the original fence end
        return null;
    }

    return event; // Pass other events through unchanged
  }

  // Helper method to get HTML output
  getHTML(parser) {
    const context = parser.getSharedContext();
    const state = context.htmlConverter;
    return state ? state.output.join("") : "";
  }
}

// Plugin 2: Statistics Collector
// Collects statistics about the parsed content using shared context
class StatsCollectorPlugin extends PluginBase {
  name = "stats-collector";

  // Initialize stats in shared context
  onInit(api) {
    // Access shared context through the event.context that will be passed to transforms
    console.log("📊 Initializing statistics collector...");
  }

  // Use preTransform to collect stats before other plugins modify events
  preTransform(event, api) {
    // Initialize stats in context if not present
    if (!event.context.stats) {
      event.context.stats = {
        totalText: 0,
        totalTags: 0,
        totalCodeBlocks: 0,
        tagTypes: new Set(),
        codeLanguages: new Set(),
      };
    }

    const stats = event.context.stats;

    switch (event.type) {
      case "text":
        stats.totalText += event.text.length;
        break;

      case "tag-open":
        stats.totalTags++;
        stats.tagTypes.add(event.name);
        break;

      case "code-fence-start":
        stats.totalCodeBlocks++;
        if (event.lang) {
          stats.codeLanguages.add(event.lang);
        }
        break;
    }

    return event; // Pass event through unchanged
  }

  // Helper method to get current stats from shared context
  getStats(parser) {
    const context = parser.getSharedContext();
    const stats = context.stats || {
      totalText: 0,
      totalTags: 0,
      totalCodeBlocks: 0,
      tagTypes: new Set(),
      codeLanguages: new Set(),
    };

    return {
      ...stats,
      tagTypes: Array.from(stats.tagTypes),
      codeLanguages: Array.from(stats.codeLanguages),
    };
  }
}

// Plugin 3: Content Filter
// Filters and collects specific content using postTransform
class ContentFilterPlugin extends PluginBase {
  name = "content-filter";

  onInit(api) {
    console.log("🔍 Initializing content filter...");
  }

  // Use preTransform to collect content before transformations
  preTransform(event, api) {
    // Initialize filtered content in context if not present
    if (!event.context.filteredContent) {
      event.context.filteredContent = {
        thinking: [],
        code: [],
      };
    }

    const filtered = event.context.filteredContent;

    // Collect content from think tags (accumulate into buffer)
    if (event.type === "text" && event.in?.inTag?.name === "think") {
      if (!filtered.currentThinking) {
        filtered.currentThinking = {
          type: "thinking",
          content: "",
          timestamp: new Date().toISOString(),
        };
      }
      filtered.currentThinking.content += event.text;
    }

    // When think tag closes, save the accumulated content
    if (event.type === "tag-close" && event.name === "think") {
      if (filtered.currentThinking) {
        filtered.thinking.push(filtered.currentThinking);
        delete filtered.currentThinking;
      }
    }

    // Collect code content (accumulate into buffer)
    if (event.type === "code-fence-chunk") {
      if (!filtered.currentCode) {
        filtered.currentCode = {
          type: "code",
          content: "",
          language: event.in?.inCodeFence?.lang || "unknown",
          timestamp: new Date().toISOString(),
        };
      }
      filtered.currentCode.content += event.text;
    }

    // When code fence ends, save the accumulated content
    if (event.type === "code-fence-end") {
      if (filtered.currentCode) {
        filtered.code.push(filtered.currentCode);
        delete filtered.currentCode;
      }
    }

    return event; // Pass event through unchanged
  }

  // Helper method to get filtered content from shared context
  getFilteredContent(parser) {
    const context = parser.getSharedContext();
    const filtered = context.filteredContent || { thinking: [], code: [] };
    return [...filtered.thinking, ...filtered.code];
  }
}

// Create parser
const parser = new TokenLoom({
  emitUnit: "token",
  tags: ["think", "plan"],
});

// Create plugin instances
const htmlConverter = new HTMLConverterPlugin();
const statsCollector = new StatsCollectorPlugin();
const contentFilter = new ContentFilterPlugin();

// Add a text collector to gather the HTML output from the htmlConverter
const textCollector = new TextCollectorPlugin();

// Add all plugins to the parser in the right order
// Plugin execution order matters:
// - preTransform: statsCollector, contentFilter (capture original data)
// - transform: htmlConverter (modify events)
// - postTransform: textCollector (collect final output)
parser.use(statsCollector); // Collects stats from original events
parser.use(contentFilter); // Captures content from original events
parser.use(htmlConverter); // Transforms events to HTML
parser.use(textCollector); // Collects final transformed output

async function runExample() {
  console.log("Processing text with custom plugins...\n");

  // Process the text
  parser.feed({ text: sampleText });
  await parser.flush();

  // Get the HTML output from the HTML converter
  const htmlOutput = htmlConverter.getHTML(parser);

  console.log("=".repeat(60));
  console.log("🎨 HTML Output");
  console.log("=".repeat(60));
  console.log(htmlOutput);

  console.log("\n" + "=".repeat(60));
  console.log("📊 Content Statistics");
  console.log("=".repeat(60));
  const stats = statsCollector.getStats(parser);
  console.log(`📝 Total text characters: ${stats.totalText}`);
  console.log(`🏷️  Total tags: ${stats.totalTags}`);
  console.log(`💻 Total code blocks: ${stats.totalCodeBlocks}`);
  console.log(`🎯 Tag types found: ${stats.tagTypes.join(", ")}`);
  console.log(`🔤 Code languages: ${stats.codeLanguages.join(", ")}`);

  console.log("\n" + "=".repeat(60));
  console.log("🔍 Filtered Content");
  console.log("=".repeat(60));
  const filteredContent = contentFilter.getFilteredContent(parser);
  if (filteredContent.length === 0) {
    console.log("No filtered content found.");
  } else {
    filteredContent.forEach((item, index) => {
      console.log(
        `${index + 1}. [${item.type.toUpperCase()}] ${item.content.trim()}`
      );
      if (item.language) {
        console.log(`   Language: ${item.language}`);
      }
      console.log(`   Timestamp: ${item.timestamp}\n`);
    });
  }

  console.log("✅ Custom plugin example complete!");
}

// Run the example
runExample().catch(console.error);

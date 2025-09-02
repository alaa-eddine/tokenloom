/**
 * Pipeline Phases Demo
 *
 * This example demonstrates the differences between preTransform, transform,
 * and postTransform by showing how multiple plugins can work together in sequence.
 */

import { TokenLoom } from "../dist/index.esm.js";

const sampleText = `
\`\`\`javascript
function hello() {
  console.log("Hello World");
  return 42;
}
\`\`\`
`;

console.log("🔄 Pipeline Phases Demo\n");

const parser = new TokenLoom({
  emitUnit: "word",
  tags: [],
});

const events = [];

// Plugin 1: Metadata Plugin (uses preTransform)
parser.use({
  name: "metadata-plugin",

  preTransform(event, api) {
    console.log(`📝 [PRE] Adding metadata to ${event.type} event`);

    return {
      ...event,
      metadata: {
        timestamp: Date.now(),
        eventId: Math.random().toString(36).substr(2, 9),
        phase: "pre-processed",
      },
    };
  },
});

// Plugin 2: Syntax Highlighter (uses transform)
parser.use({
  name: "syntax-highlighter",

  transform(event, api) {
    if (
      event.type === "code-fence-chunk" &&
      api.state.inCodeFence?.lang === "javascript"
    ) {
      console.log(`🎨 [TRANSFORM] Highlighting: "${event.text}"`);

      let highlighted = event.text;

      // Simple keyword highlighting
      const keywords = ["function", "console", "return", "log"];
      for (const keyword of keywords) {
        if (highlighted === keyword) {
          highlighted = `[${keyword.toUpperCase()}]`;
          break;
        }
      }

      return {
        ...event,
        text: highlighted,
        metadata: {
          ...event.metadata,
          highlighted: highlighted !== event.text,
          originalText: event.text,
          phase: "transformed",
        },
      };
    }

    return event;
  },
});

// Plugin 3: Analytics Plugin (uses postTransform)
parser.use({
  name: "analytics-plugin",

  postTransform(event, api) {
    console.log(
      `📊 [POST] Finalizing ${event.type} event (ID: ${event.metadata?.eventId})`
    );

    return {
      ...event,
      metadata: {
        ...event.metadata,
        processedAt: Date.now(),
        processingChain: [
          "metadata-plugin",
          "syntax-highlighter",
          "analytics-plugin",
        ],
        phase: "finalized",
      },
    };
  },
});

// Listen to events directly on the parser
parser.on("*", (event) => {
  console.log(
    `✅ [EMIT] Final event: ${event.type} - "${event.text}" (Phase: ${event.metadata?.phase})`
  );
  events.push(event);
});

console.log("Processing sample text...\n");

parser.feed({ text: sampleText });
parser.flush();

console.log("\n" + "=".repeat(60));
console.log("📋 Final Events Summary");
console.log("=".repeat(60));

events.forEach((event, index) => {
  if (event.type === "code-fence-chunk") {
    console.log(`Event ${index + 1}:`);
    console.log(`  Type: ${event.type}`);
    console.log(`  Text: "${event.text}"`);
    console.log(`  Original: "${event.metadata?.originalText || "N/A"}"`);
    console.log(`  Highlighted: ${event.metadata?.highlighted || false}`);
    console.log(`  Event ID: ${event.metadata?.eventId}`);
    console.log(
      `  Processing Chain: ${event.metadata?.processingChain?.join(" → ")}`
    );
    console.log(`  Final Phase: ${event.metadata?.phase}`);
    console.log("");
  }
});

console.log("✅ Demo complete!");
console.log("\n🔍 Notice the processing order:");
console.log("   1. preTransform - adds metadata");
console.log("   2. transform - applies syntax highlighting");
console.log("   3. postTransform - adds analytics data");
console.log("   4. onEvent - receives final processed event");

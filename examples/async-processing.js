/**
 * Async Processing Example
 *
 * This example demonstrates TokenLoom's AsyncIterator interface for pull-mode
 * processing, which is useful for controlled, asynchronous text processing.
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

console.log("🔄 TokenLoom Async Processing Example\n");

// Create parser
const parser = new TokenLoom({
  emitUnit: "token",
  tags: ["think", "plan"],
});

// Async processing function
async function processTextAsync() {
  console.log("🚀 Starting async text processing...\n");

  let eventCount = 0;
  const processedEvents = [];

  // Set up async iterator
  const asyncProcessor = async () => {
    for await (const event of parser) {
      eventCount++;
      processedEvents.push(event);

      // Process different event types
      switch (event.type) {
        case "text":
          if (event.in?.inTag) {
            console.log(`📝 Text in <${event.in.inTag.name}>: "${event.text}"`);
          } else if (event.in?.inCodeFence) {
            console.log(`💻 Code: "${event.text.trim()}"`);
          } else {
            console.log(`📄 Regular text: "${event.text}"`);
          }
          break;

        case "tag-open":
          console.log(`🏷️  ➡️  Opened tag: <${event.name}>`);
          if (Object.keys(event.attrs).length > 0) {
            console.log(`    Attributes:`, event.attrs);
          }
          break;

        case "tag-close":
          console.log(`🏷️  ⬅️  Closed tag: </${event.name}>`);
          break;

        case "code-fence-start":
          console.log(
            `💻 ➡️  Code block started (${event.lang || "no language"})`
          );
          break;

        case "code-fence-end":
          console.log(`💻 ⬅️  Code block ended`);
          break;

        case "flush":
          console.log(`🔄 Buffer flushed - processing complete`);
          return; // Exit the async iterator

        case "error":
          console.error(`❌ Error: ${event.reason}`);
          break;
      }

      // Simulate some async processing time
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  };

  // Start async processing
  const processingPromise = asyncProcessor();

  // Simulate streaming data arrival with delays
  console.log("📡 Simulating streaming data arrival...\n");

  const chunks = [
    "Here is some intro text.\n\n",
    "<think>This is my hidden reasoning</think>\n\n",
    "Now a code block:\n\n```javascript\n",
    'console.log("Hello world");\n',
    "function test() {\n  return 42;\n}\n```\n\n",
    '<plan attr="value">\n',
    "Step 1: Parse the input\n",
    "Step 2: Process chunks\n</plan>\n\n",
    "And we are done.",
  ];

  for (let i = 0; i < chunks.length; i++) {
    console.log(
      `📦 Feeding chunk ${i + 1}/${chunks.length}: "${chunks[i].replace(
        /\n/g,
        "\\n"
      )}"`
    );
    parser.feed({ text: chunks[i] });

    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 200));
  }

  console.log("\n🔄 Flushing parser...");
  parser.flush();

  // Wait for async processing to complete
  await processingPromise;

  console.log("\n" + "=".repeat(50));
  console.log("📊 Processing Summary");
  console.log("=".repeat(50));
  console.log(`⚡ Total events processed: ${eventCount}`);

  // Analyze event types
  const eventTypeCounts = {};
  processedEvents.forEach((event) => {
    eventTypeCounts[event.type] = (eventTypeCounts[event.type] || 0) + 1;
  });

  console.log("📈 Event type breakdown:");
  Object.entries(eventTypeCounts).forEach(([type, count]) => {
    console.log(`  ${type}: ${count}`);
  });

  console.log("\n✅ Async processing complete!");
}

// Run the async example
processTextAsync().catch(console.error);

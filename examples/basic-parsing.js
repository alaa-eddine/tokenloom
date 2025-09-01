/**
 * Basic TokenLoom Parsing Example
 *
 * This example demonstrates how to parse text containing custom tags and code fences
 * using TokenLoom's streaming parser with various plugins.
 */

import {
  TokenLoom,
  createTextCollectorPlugin,
  LoggerPlugin,
} from "../dist/index.esm.js";

// Sample text with custom tags and code fences
const sampleText = `  Here is some intro text.
  
  <think>This is my hidden reasoning</think>
  
  Now a code block:
  
  \`\`\`javascript
  console.log("Hello world");
  \`\`\`
  
  And we are done.



Here is some intro text.

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

console.log("🚀 TokenLoom Basic Parsing Example\n");

// Create parser with custom configuration
const parser = new TokenLoom({
  emitUnit: "token",
  bufferLength: 1024,
  tags: ["think", "plan"], // Recognize these custom tags
});

// Add logger plugin to see all events
console.log("📝 Adding logger plugin...");
const logger = new LoggerPlugin((msg) => console.log(msg));
parser.use(logger);

// Add text collector to gather processed text
const textCollector = createTextCollectorPlugin();
parser.use(textCollector);

// Add custom plugin to demonstrate event handling
parser.use({
  name: "custom-analyzer",
  onEvent(event, api) {
    switch (event.type) {
      case "tag-open":
        console.log(
          `\n🏷️  Opened tag: <${event.name}> with attributes:`,
          event.attrs
        );
        break;
      case "tag-close":
        console.log(`🏷️  Closed tag: </${event.name}>\n`);
        break;
      case "code-fence-start":
        console.log(`\n💻 Code block started (${event.lang || "no language"})`);
        break;
      case "code-fence-end":
        console.log(`💻 Code block ended\n`);
        break;
    }
  },
});

console.log("\n" + "=".repeat(60));
console.log("Processing sample text...");
console.log("=".repeat(60));

// Process the text
parser.feed({ text: sampleText });
parser.flush();

console.log("\n" + "=".repeat(60));
console.log("📊 Results Summary");
console.log("=".repeat(60));

// Show collected text (without markup)
console.log("\n📄 Collected Text Content:");
console.log(textCollector.getText());

console.log("\n✅ Parsing complete!");

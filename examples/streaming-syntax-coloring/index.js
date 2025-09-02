/**
 * Syntax Highlighting Demo (Modular Version)
 *
 * This example demonstrates the new transformation pipeline by implementing
 * a basic JavaScript syntax highlighter that processes code-fence-chunk events
 * before they are emitted to the final output.
 *
 * This version separates concerns into different files:
 * - highlighter.js: JavaScriptHighlighter class and color utilities
 * - syntax-highlighter.plugin.js: SyntaxHighlighterPlugin class
 * - index.js: Main parser code and event handlers (this file)
 */

import { TokenLoom } from "../../dist/index.esm.js";
import { COLORS, writeColored } from "./highlighter.js";
import { SyntaxHighlighterPlugin } from "./syntax-highlighter.plugin.js";

// Sample text with custom tags and code fences
const sampleText = `
Hello, this is a streaming syntax coloring demo.
<think attr="value" hello="world" color="red">This is my reasoning message </think>

Now a code block with JavaScript:
\`\`\`javascript
// This is a comment
console.log("Hello world"); // Another comment
function test() {
  return 42; // Return a number
}
const arr = [1, 2, 3]; // Array literal
if (arr.length > 0) {
  console.log("Array has items");
}
/* Multi-line 
   comment example */

const message = 'Single quoted string';
\`\`\`
  
<proc>
Step 1: Processing #1
Step 2: Processing #2
</proc>

End of the demo.

`;

//console.log("🎨 TokenLoom Syntax Highlighting Demo (Modular)\n");

// Create parser
const parser = new TokenLoom({
  emitUnit: "word", //tokenize by word ==> easier for syntax highlighting
  bufferLength: 64, // Smaller buffer to demonstrate backpressure
  tags: ["think", "proc"],
  maxSpecialWaitBytes: 10,
});

// Track parsing state
let chunkCount = 0;
let eventCount = 0;
const eventTypes = new Set();

// Add syntax highlighting plugin using the new transformation pipeline
const syntaxHighlighterPlugin = new SyntaxHighlighterPlugin();
parser.use(syntaxHighlighterPlugin);

// Listen to events directly on the parser using EventEmitter pattern
parser.on("*", (event) => {
  eventCount++;
  eventTypes.add(event.type);
});

parser.on("tag-open", (event) => {
  writeColored(`<${event.name}>`, COLORS.tag);
});

parser.on("tag-close", (event) => {
  writeColored(`</${event.name}>`, COLORS.tag);
});

parser.on("code-fence-start", (event) => {
  const lang = event.lang ? event.lang : "";
  writeColored(`\n\`\`\`${lang}\n`, COLORS.code);
});

parser.on("code-fence-chunk", (event) => {
  // Check if this was highlighted
  if (event.metadata?.highlighted) {
    // Already highlighted, just output
    process.stdout.write(event.text);
  } else {
    // Not highlighted, use default code color
    writeColored(event.text, COLORS.code);
  }
});

parser.on("code-fence-end", (event) => {
  writeColored(`\n\`\`\`\n`, COLORS.code);
});

parser.on("text", (event) => {
  const inTagName = event.in?.inTag?.name;
  const color =
    inTagName === "think"
      ? COLORS.think
      : inTagName === "proc"
      ? COLORS.proc
      : COLORS.text;
  writeColored(event.text, color);
});

//console.log("📦 Feeding random chunks to parser...\n");

// Simulate streaming by feeding random chunks
for (const chunk of randomChunks(sampleText, 123)) {
  chunkCount++;
  //console.log(`Chunk ${chunkCount}: "${chunk}"`);
  parser.feed({ text: chunk });

  // Add small delay to simulate real streaming
  await new Promise((resolve) => setTimeout(resolve, 50));
}

//console.log("\n🔄 Flushing remaining buffer...");
parser.flush();
process.exit(0);
console.log("\n" + "=".repeat(50));
console.log("📊 Streaming Statistics");
console.log("=".repeat(50));
console.log(`📦 Total chunks processed: ${chunkCount}`);
console.log(`⚡ Total events emitted: ${eventCount}`);
console.log(`🎯 Event types seen: ${Array.from(eventTypes).join(", ")}`);

console.log("\n✅ Syntax highlighting demo complete!");
console.log(
  "\n🎨 Notice how JavaScript keywords, strings, and numbers are highlighted!"
);
console.log(
  "🔄 The transformation pipeline processed each code chunk before emission."
);

// Helper function to add delay (for Node.js compatibility)
function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Utility function to break text into random chunks (3-6 characters)
function* randomChunks(text, seed = 42) {
  let i = 0;
  let rng = seed;

  // Simple LCG for reproducible randomness
  const nextRandom = () => {
    rng = (rng * 1664525 + 1013904223) % 0x100000000;
    return rng / 0x100000000;
  };

  while (i < text.length) {
    const size = 3 + Math.floor(nextRandom() * 4); // 3–6 characters
    yield text.slice(i, i + size);
    i += size;
  }
}

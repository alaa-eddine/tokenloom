#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

// Test files to update
const testFiles = [
  "tests/core.test.ts",
  "tests/examples.test.ts",
  "tests/streaming.test.ts",
  "tests/plugins.test.ts",
];

// Helper function to add if not already present
function addHelperFunction(content) {
  if (content.includes("function collectEvents")) {
    return content;
  }

  const importMatch = content.match(/(import.*from.*["'].*["'];?\n)/);
  if (importMatch) {
    const helperFunction = `
// Helper function to collect events from parser
function collectEvents(parser) {
  const events = [];
  parser.on("*", (event) => {
    events.push(event);
  });
  return events;
}
`;
    return content.replace(importMatch[0], importMatch[0] + helperFunction);
  }
  return content;
}

// Replace onEvent plugin patterns with direct event listeners
function replaceEventCollection(content) {
  // Pattern 1: Simple event collection
  content = content.replace(
    /const events: Event\[\] = \[\];\s*parser\.use\(\{\s*name: ["']collector["'],\s*onEvent\(event\) \{\s*events\.push\(event\);\s*\},?\s*\}\);/gs,
    "const events = collectEvents(parser);"
  );

  // Pattern 2: More complex event collection
  content = content.replace(
    /const events: Event\[\] = \[\];\s*parser\.use\(\{\s*name: ["'][^"']*["'],\s*onEvent\([^)]*\) \{\s*events\.push\([^)]*\);\s*\},?\s*\}\);/gs,
    "const events = collectEvents(parser);"
  );

  // Pattern 3: Event collection with other logic
  content = content.replace(
    /parser\.use\(\{\s*name: ["']collector["'],\s*onEvent\(event[^)]*\) \{\s*events\.push\(event\);\s*\},?\s*\}\);/gs,
    "// Events collected via collectEvents helper"
  );

  return content;
}

// Process each test file
testFiles.forEach((filePath) => {
  if (!fs.existsSync(filePath)) {
    console.log(`Skipping ${filePath} - file not found`);
    return;
  }

  console.log(`Processing ${filePath}...`);

  let content = fs.readFileSync(filePath, "utf8");

  // Add helper function
  content = addHelperFunction(content);

  // Replace event collection patterns
  content = replaceEventCollection(content);

  // Replace remaining onEvent usage patterns
  content = content.replace(
    /parser\.use\(\{\s*name: ["'][^"']*["'],\s*onEvent\([^{]*\{[^}]*events\.push\([^)]*\);[^}]*\},?\s*\}\);/gs,
    "// Events collected via collectEvents helper"
  );

  // Fix any remaining Event[] declarations that should use collectEvents
  content = content.replace(
    /const events: Event\[\] = \[\];(\s*)parser\.use\(/gs,
    "const events = collectEvents(parser);$1// parser.use("
  );

  fs.writeFileSync(filePath, content);
  console.log(`Updated ${filePath}`);
});

console.log("Test files updated!");

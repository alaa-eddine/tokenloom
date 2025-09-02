# Streaming Syntax Coloring Demo (Modular)

This is a modular version of the syntax highlighting demo that separates concerns into different files for better code organization and reusability.

> **⚠️ Important Note**: This is a **basic/simplified syntax highlighter** for demonstration purposes. It is **NOT a complete JavaScript syntax highlighter** and has known limitations. This serves as a good starting point for understanding TokenLoom's transformation pipeline and building more sophisticated syntax highlighting solutions.

## File Structure

- **`index.js`** - Main parser code and event handlers
- **`highlighter.js`** - JavaScriptHighlighter class and ANSI color utilities
- **`syntax-highlighter.plugin.js`** - SyntaxHighlighterPlugin class implementing the transformation pipeline

## Architecture

This modular structure demonstrates:

1. **Separation of Concerns**: Each file has a specific responsibility
2. **Reusability**: The highlighter and plugin can be reused in other projects
3. **Maintainability**: Easier to modify and extend individual components
4. **Plugin Pattern**: Shows how to implement a TokenLoom plugin as a class

## Running the Demo

From the project root:

```bash
npm run build
node examples/streaming-syntax-coloring/index.js
```

## How It Works

1. **JavaScriptHighlighter** (`highlighter.js`) provides syntax highlighting capabilities
2. **SyntaxHighlighterPlugin** (`syntax-highlighter.plugin.js`) implements the TokenLoom plugin interface
3. **Main parser** (`index.js`) orchestrates the streaming parsing and event handling

The plugin tracks syntax state across streaming chunks to maintain proper highlighting context, even when syntax elements are fragmented across multiple chunks.

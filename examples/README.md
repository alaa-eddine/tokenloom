# FluxLoom Examples

This directory contains practical examples demonstrating various features and use cases of the FluxLoom streaming text parser.

## Examples Overview

### 1. `basic-parsing.js` - Basic Usage

Demonstrates the fundamental features of FluxLoom:

- Parsing custom tags (`<think>`, `<plan>`)
- Handling code fences with language detection
- Using built-in plugins (logger, text collector)
- Creating simple custom plugins

**Key concepts covered:**

- Parser configuration
- Plugin system basics
- Event handling
- Text collection

### 2. `streaming-simulation.js` - Streaming Simulation

Shows FluxLoom's streaming capabilities:

- Random chunk processing (simulates real streaming)
- Backpressure handling with smaller buffers
- Event tracking and statistics
- Asynchronous chunk processing

**Key concepts covered:**

- Streaming architecture
- Buffer management
- Random chunking resilience
- Performance monitoring

### 3. `custom-plugin.js` - Advanced Plugin Development

Demonstrates creating sophisticated custom plugins:

- HTML converter plugin (transforms tags to HTML)
- Statistics collector plugin (gathers parsing metrics)
- Content filter plugin (extracts specific content)
- Plugin output management

**Key concepts covered:**

- Advanced plugin patterns
- Content transformation
- Data collection and analysis
- Plugin state management

### 4. `async-processing.js` - Asynchronous Processing

Shows the AsyncIterator interface for pull-mode processing:

- Async event processing
- Controlled processing flow
- Simulated network delays
- Event analysis and reporting

**Key concepts covered:**

- Pull-mode processing
- AsyncIterator interface
- Async/await patterns
- Event stream analysis

## Running the Examples

### Prerequisites

1. Build the FluxLoom library:

   ```bash
   npm run build
   ```

2. Ensure you have Node.js 18+ installed (for ES modules support)

### Running Individual Examples

```bash
# Basic parsing example
node examples/basic-parsing.js

# Streaming simulation
node examples/streaming-simulation.js

# Custom plugin development
node examples/custom-plugin.js

# Async processing
node examples/async-processing.js
```

## Sample Input Text

All examples use the same sample text to demonstrate consistent parsing:

````
Here is some intro text.

<think>This is my hidden reasoning</think>

Now a code block:

```javascript
console.log("Hello world");
function test() {
  return 42;
}
````

<plan attr="value">
Step 1: Parse the input
Step 2: Process chunks
</plan>

And we are done.

```

This text includes:
- Regular text content
- Custom tags with and without attributes
- Code fences with language specification
- Mixed content types

## Expected Output Patterns

### Events Generated
Each example will generate these types of events:
- `text` - Regular text content
- `tag-open` - Opening custom tags
- `tag-close` - Closing custom tags
- `code-fence-start` - Code block beginning
- `code-fence-chunk` - Code content
- `code-fence-end` - Code block ending
- `flush` - Processing completion

### Context Tracking
Events include context information showing:
- When inside custom tags (`event.in.inTag`)
- When inside code fences (`event.in.inCodeFence`)
- Tag attributes and code languages

## Learning Path

**Recommended order for learning:**

1. **Start with `basic-parsing.js`** - Learn core concepts
2. **Try `streaming-simulation.js`** - Understand streaming behavior
3. **Explore `custom-plugin.js`** - Build advanced plugins
4. **Master `async-processing.js`** - Handle async workflows

## Common Use Cases

These examples demonstrate patterns for:

### Content Processing
- Extracting and transforming tagged content
- Converting markup to HTML/other formats
- Filtering content by context

### Real-time Applications
- Chat message processing
- Live document parsing
- Stream processing pipelines

### Analysis and Monitoring
- Content statistics collection
- Performance monitoring
- Event stream analysis

### Integration Patterns
- Plugin architecture usage
- Async processing workflows
- Error handling strategies

## Extending the Examples

Feel free to modify these examples to:
- Add new custom tags
- Create specialized plugins
- Implement different output formats
- Add error handling
- Integrate with other systems

## Troubleshooting

### Common Issues

**Import Errors:**
- Ensure the library is built: `npm run build`
- Check that Node.js supports ES modules (v18+)

**Plugin Errors:**
- Check plugin event handlers for exceptions
- Verify plugin API usage
- Review error events in output

**Performance Issues:**
- Adjust `bufferLength` for your use case
- Optimize plugin processing
- Consider emit unit granularity

For more help, see the main [README.md](../README.md) and [AGENTS.md](../AGENTS.md) files.
```

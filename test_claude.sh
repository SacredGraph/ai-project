#!/bin/bash
set -e

echo "Testing Claude CLI..."

# Check if the CLI exists
if [ ! -f "/usr/local/lib/node_modules/@anthropic-ai/claude-code/cli.js" ]; then
  echo "ERROR: Claude CLI not found at /usr/local/lib/node_modules/@anthropic-ai/claude-code/cli.js"
  exit 1
fi

# Make sure it's executable
chmod +x /usr/local/lib/node_modules/@anthropic-ai/claude-code/cli.js

# Try to run a simple command
echo "Running Claude CLI version check..."
/usr/local/lib/node_modules/@anthropic-ai/claude-code/cli.js --version

# Try a simple prompt with JSON output
echo "Running Claude CLI with a simple prompt and JSON output..."
OUTPUT=$(echo "Hello, Claude!" | /usr/local/lib/node_modules/@anthropic-ai/claude-code/cli.js 2>&1)
EXIT_CODE=$?

# Wrap the output in JSON
if [ $EXIT_CODE -eq 0 ]; then
  # Escape any special characters in the output for JSON
  ESCAPED_OUTPUT=$(echo "$OUTPUT" | sed 's/\\/\\\\/g' | sed 's/"/\\"/g' | sed 's/\n/\\n/g' | sed 's/\r/\\r/g' | sed 's/\t/\\t/g')
  echo "{\"status\":\"success\",\"output\":\"$ESCAPED_OUTPUT\"}"
else
  # Escape any special characters in the error output for JSON
  ESCAPED_OUTPUT=$(echo "$OUTPUT" | sed 's/\\/\\\\/g' | sed 's/"/\\"/g' | sed 's/\n/\\n/g' | sed 's/\r/\\r/g' | sed 's/\t/\\t/g')
  echo "{\"status\":\"error\",\"error\":\"Command failed with exit code $EXIT_CODE\",\"output\":\"$ESCAPED_OUTPUT\"}"
fi

echo "Test completed successfully!" 
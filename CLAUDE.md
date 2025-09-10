# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Quick Reference

- **Test locally**: `node index.js --help`
- **Run tests**: `npm test`
- **Commit changes**: `/commit` (Claude Code command)
- **View recent changes**: `git status`
- **Publish**: Push to master (automated via semantic-release)

## Project Overview

This is `gift-calc`, a CLI tool that calculates gift amounts with configurable randomness and relationship-based bias. It's published as an npm package with dual command names: `gift-calc` (primary) and `gcalc` (short alias).

## Sibling Repositories

This project has two related repositories that should be kept synchronized:

1. **Homebrew Tap**: `homebrew-gift-calc` (likely at `../homebrew-gift-calc`) - Contains the Homebrew formula for installing gift-calc via `brew tap gift-calc/homebrew-gift-calc && brew install gift-calc`
2. **Website**: `gift-calc.github.io` (likely at `../gift-calc.github.io`) - GitHub Pages site providing documentation and web interface at https://gift-calc.github.io

**IMPORTANT**: After making changes to functionality, command-line interface, or configuration, always ensure documentation is updated in:
- `README.md` in this repository
- The website documentation in the `gift-calc.github.io` repository
- Homebrew formula if installation methods or dependencies change

## Development Commands

```bash
# Local development and testing
node index.js --help                 # Test CLI locally
node index.js -b 100 -r 30 -f 7     # Test with parameters
node index.js init-config            # Test config initialization

# Package management  
npm link                             # Link for global testing
npm test                             # Run tests
npm run test:coverage                # Run tests with coverage

# Testing both commands after linking
gift-calc --help
gcalc -b 50 -f 8
```

## Development Workflow

### Recommended Workflow with Claude Code

1. **Make Changes**: Edit code or add features
2. **Test Changes**: Run `npm test` to ensure everything works
3. **Commit Changes**: Use `/commit` command for proper conventional commits
4. **Push to Master**: Automated publishing handles the rest

### Quick Reference

- **View recent changes**: `git status`
- **Run tests**: `npm test`
- **Commit changes**: `/commit` (Claude Code command)
- **View logs**: `git log --oneline -10`
- **Test locally**: `node index.js --help`

## Architecture

**Modular CLI structure** (`index.js` + `src/core.js`):
- Pure Node.js CLI tool with no external runtime dependencies
- Uses native Node.js modules: `fs`, `path`, `os`, `readline`
- Separates core logic from CLI interface for better testability

**Key Components:**
- **Config System**: Loads/saves user defaults from `~/.config/gift-calc/.config.json`
- **Command Parser**: Manual argument parsing with support for `init-config` command
- **Interactive Setup**: Uses `readline` for `init-config` prompts
- **Algorithm**: `calculateFinalAmount()` applies variation and friend-score bias
- **Core Logic**: `src/core.js` contains pure functions for calculations and parsing
- **CLI Interface**: `index.js` handles command-line interface and file operations

**Configuration Flow:**
- Config loaded at startup via `loadConfig()`
- Priority: CLI args > config file > built-in defaults
- `init-config` creates/updates config file interactively

**Command Structure:**
- Both `gift-calc` and `gcalc` commands point to same `index.js`
- Standard CLI options: `-b/--basevalue`, `-r/--variation`, `-f/--friend-score`

## MCP Server Development

The `mcp-server.js` file implements Model Context Protocol support for gift-calc. This enables AI assistants like Claude to use gift-calc tools directly.

### MCP Architecture

**File Structure:**
- `mcp-server.js` - Main MCP server entry point (pure Node.js, no external deps)
- `src/mcp/server.js` - Core MCP server class and protocol handling
- `src/mcp/tools.js` - Tool registration and handler implementations
- `src/mcp/protocol.js` - Protocol utilities and message handling
- Uses existing functions from `src/core.js` - no code duplication
- Follows JSON-RPC 2.0 protocol with MCP 2025-06-18 specification
- STDIO transport for maximum LLM compatibility

**Key Components:**
- `MCPServer` class - Handles JSON-RPC message processing
- Tool registration framework - Dynamic tool management with schema validation
- STDIO message handling - Reads from stdin, writes to stdout
- Error handling - Proper JSON-RPC error responses with debugging

### Adding New MCP Tools

To add new MCP tools, follow this pattern in `mcp-server.js`:

```javascript
server.registerTool('tool_name', {
  description: 'Clear description of what the tool does',
  inputSchema: {
    type: 'object',
    properties: {
      param1: {
        type: 'string',
        description: 'Parameter description',
        // Add validation rules
      }
    },
    required: ['param1'] // Required parameters
  },
  handler: async (args) => {
    // Reuse existing core functions from src/core.js
    const result = existingCoreFunction(args.param1);
    
    return {
      content: [
        {
          type: 'text',
          text: `Result: ${result}`
        }
      ],
      isReadOnly: true  // or false for destructive operations
    };
  }
});
```

### Tool Safety Annotations

Always mark tools with appropriate safety levels:
- **Read-only tools** (`isReadOnly: true`): Get config, check status, calculate amounts
- **Destructive tools** (`isReadOnly: false`): Add to naughty list, set budget, modify config

### Development Commands

```bash
# Test MCP server locally (development)
node mcp-server.js

# Test with actual MCP client
echo '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-06-18","capabilities":{}}}' | node mcp-server.js

# Debug MCP tools list
echo '{"jsonrpc":"2.0","id":2,"method":"tools/list","params":{}}' | node mcp-server.js

# Test specific tool
echo '{"jsonrpc":"2.0","id":3,"method":"tools/call","params":{"name":"calculate_gift_amount","arguments":{"baseValue":100,"variation":20,"friendScore":8,"niceScore":7}}}' | node mcp-server.js
```

### MCP Testing Strategy

**Manual Testing:**
1. Test JSON-RPC protocol compliance
2. Verify tool parameter validation
3. Test error handling with invalid inputs
4. Confirm all tools reuse existing core functions

**Integration Testing:**
- Test with Claude Desktop MCP configuration
- Verify STDIO transport works correctly
- Test concurrent tool calls
- Validate tool safety annotations

### MCP Debugging

**Debug Output:** 
- Debug messages go to stderr (not stdout)
- Use `server.logDebug()` for debugging information
- STDIO transport uses stdout only for JSON-RPC messages

**Common Issues:**
- Ensure proper JSON-RPC 2.0 format (always include `jsonrpc: "2.0"`)
- Tool schema validation failures - check required fields
- STDIO buffering issues - ensure newline-delimited messages
- Import errors - verify all core functions are properly imported

### MCP Protocol Notes

**Protocol Version:** Always use `2025-06-18`  
**Message Format:** Newline-delimited JSON-RPC 2.0  
**Transport:** STDIO (stdin/stdout)  
**Error Codes:** Follow JSON-RPC 2.0 standard error codes  
**Tool Responses:** Must include `content` array with `type: "text"` objects

## GitHub Tool Usage

**IMPORTANT**: Always use the `gh` CLI tool for GitHub-related tasks when possible. This includes:
- Creating and managing pull requests: `gh pr create`, `gh pr view`, `gh pr merge`
- Managing issues: `gh issue create`, `gh issue list`, `gh issue close`
- Repository operations: `gh repo view`, `gh repo clone`, `gh repo create`
- GitHub Pages: `gh api repos/owner/repo/pages` for configuration
- Releases: `gh release create`, `gh release list`
- Working with GitHub Actions: `gh run list`, `gh run view`

The `gh` tool provides better integration, authentication, and error handling than manual git operations for GitHub-specific tasks.

## Claude Code Commands

This project includes custom Claude Code commands to streamline development workflows:

### /commit Command

The `/commit` command automates creating conventional commits with proper formatting:

```bash
/commit
```

**Features:**
- Analyzes current changes and suggests appropriate commit types
- Follows Conventional Commits standards for semantic versioning
- Automatically stages changes and pushes to remote
- Ensures professional, human-like commit messages without AI attribution

**Usage:** Simply run `/commit` when you have changes to commit. The command will guide you through the process.

### /feature Command

The `/feature` command helps implement new features:

```bash
/feature <feature-description>
```

## Publishing Process

This project uses **semantic-release** for automated publishing via GitHub Actions. Simply push conventional commits to master, and the system handles:

- Version bumping based on commit types
- Changelog generation
- npm publishing with provenance
- GitHub release creation

For manual version control: `npm version patch|minor|major && git push origin master --tags`

## Important Implementation Details

- **Config Path**: `~/.config/gift-calc/.config.json` (created automatically)
- **Algorithm**: Friend score creates bias by adjusting random variation probability
- **Error Handling**: Graceful fallback to defaults if config file is corrupted
- **Help System**: Comprehensive help with examples for both command names
- **Version Compatibility**: Requires Node.js >= 20.8.1
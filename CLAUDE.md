# CLAUDE.md

This file provides guidance to Claude Code when working with this repository.

## File Imports

See @README.md for project overview and @package.json for available npm commands.

## Project Overview

`gift-calc` is a Node.js CLI tool that calculates gift amounts with configurable randomness and relationship-based bias. Published as an npm package with dual commands: `gift-calc` and `gcalc`.

**Tech Stack:** Pure Node.js (≥20.8.1), no external runtime dependencies, vitest for testing, semantic-release for publishing.

## Development Commands

```bash
# Local testing
node index.js --help                 # Test CLI locally
node index.js -b 100 -r 30 -f 7     # Test with parameters

# Development workflow
npm test                             # Run tests
npm run test:coverage                # Run tests with coverage
npm link                             # Link for global testing
```

## Architecture

**Modular Structure:**
- `index.js` - CLI interface and file operations
- `src/core.js` - Pure functions for calculations and parsing
- `src/mcp/` - Model Context Protocol server implementation
- Config: `~/.config/gift-calc/.config.json` (auto-created)

**Command Priority:** CLI args > config file > built-in defaults

## Related Repositories

1. `../homebrew-gift-calc` - Homebrew tap for `brew install`
2. `../gift-calc.github.io` - Documentation website

**IMPORTANT:** After CLI/functionality changes, update README.md, website docs, and Homebrew formula if needed.

## Development Workflow

1. Make changes
2. Run `npm test`
3. Use `/commit` command (conventional commits)
4. Push to master (auto-publishes via semantic-release)

## GitHub Operations

Use `gh` CLI for all GitHub tasks: `gh pr create`, `gh issue list`, `gh repo view`, etc.

## MCP Server

`mcp-server.js` provides Model Context Protocol support. Test with:
```bash
node mcp-server.js
```

New tools should reuse functions from `src/core.js` and mark safety level (`isReadOnly: true/false`).

## Custom Commands

- `/commit` - Conventional commits with semantic versioning
- `/feature <description>` - Feature implementation workflow

## Boundaries

**DO NOT:**
- Modify existing core algorithm logic without explicit approval
- Change CLI argument structure (breaking changes)
- Remove or alter config file compatibility
- Modify MCP protocol version or transport mechanism
- Create commits with AI attribution or tool references

## Important Notes

- Uses manual argument parsing (no external CLI libraries)
- Maintains backwards compatibility for config files
- Follows semantic versioning via conventional commits
- All MCP tools must reuse existing `src/core.js` functions
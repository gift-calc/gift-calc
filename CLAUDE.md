# CLAUDE.md

## Tech Stack
- Node.js ≥20.8.1 (no external runtime deps)
- Testing: vitest
- Publishing: semantic-release  
- CLI: `gift-calc`, `gcalc`, `gift-calc-mcp`

## Project Structure
- `index.js` - Simplified CLI entry point (31 lines)
- `bin/mcp-server.js` - MCP server binary
- `src/cli/` - CLI commands and utilities
- `src/core/` - Core calculation algorithms
- `src/domains/` - Domain-specific modules (naughty-list, etc.)
- `src/shared/` - Common utilities and argument parsing
- `src/mcp/` - MCP server tools and schemas
- Config: `~/.config/gift-calc/.config.json`

## Architecture Benefits
- **Domain separation**: Naughty list, budgets, and calculations in dedicated modules
- **Simplified testing**: Individual modules can be tested independently
- **Reduced complexity**: Main index.js reduced from 1059 to 31 lines
- **Better maintainability**: Clear boundaries between CLI, core logic, and MCP tools

## Commands
```bash
# Test
npm test                    # All tests
npm run test:coverage       # Coverage
npm run test:core           # Core tests
node index.js --help        # CLI help

# Dev
npm link                    # Global install
node bin/mcp-server.js      # MCP server
```

## Code Style
- Manual CLI parsing (no libs)
- Reuse `src/core/` modules in MCP tools
- MCP safety: `isReadOnly: true/false`
- Priority: CLI args > config > defaults

## Workflow
1. Changes → `npm test` → `/commit-push` → auto-publish

## Custom Commands
- `/commit-push` - Conventional commits + versioning
- `/implement-issue <num>` - Implement GitHub issue
- `/fix-tests` - Fix test failures
- `/fix-lint` - Fix lint errors and warnings
- `/sync-master` - Sync with master
- `/update-claude-md` - Update this file
- `/pr-review` - Review PR for current branch
- `/pr-review-code` - Code review for current branch PR
- `/pr-review-docs` - Docs review for current branch PR
- `/pr-review-tests` - Tests review for current branch PR
- `/pr-fix-code` - Fix code issues in current branch PR
- `/pr-fix-docs` - Fix documentation issues in current branch PR
- `/pr-fix-tests` - Fix test issues in current branch PR

## Protected Areas
- Core algorithm logic
- CLI argument structure  
- Config compatibility
- MCP protocol/transport
- No AI attribution in commits

## Related Updates
CLI changes → README, website, Homebrew formula
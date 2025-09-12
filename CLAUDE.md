# CLAUDE.md

## Tech Stack
- Node.js ≥20.8.1 (no external runtime deps)
- Testing: vitest
- Publishing: semantic-release  
- CLI: `gift-calc`, `gcalc`, `gift-calc-mcp`

## Project Structure
- `index.js` - CLI interface
- `mcp-server.js` - MCP server binary
- `src/core.js` - Calculation engine
- `src/mcp/` - MCP protocol implementation
- Config: `~/.config/gift-calc/.config.json`

## Commands
```bash
# Test
npm test                    # All tests
npm run test:coverage       # Coverage
npm run test:core           # Core tests
node index.js --help        # CLI help

# Dev
npm link                    # Global install
node mcp-server.js          # MCP server
```

## Code Style
- Manual CLI parsing (no libs)
- Reuse `src/core.js` in MCP tools
- MCP safety: `isReadOnly: true/false`
- Priority: CLI args > config > defaults

## Workflow
1. Changes → `npm test` → `/commit-push` → auto-publish

## Custom Commands
- `/commit-push` - Conventional commits + versioning
- `/implement-issue <num>` - Implement GitHub issue
- `/fix-failing-tests` - Fix test failures
- `/sync-master` - Sync with master
- `/update-claude-md` - Update this file
- `/pr-review <pr>` - Review PR
- `/pr-code-review <pr>` - Code review
- `/pr-docs-review <pr>` - Docs review
- `/pr-tests-review <pr>` - Tests review
- `/pr-fix-code <pr>` - Fix code issues in PR
- `/pr-fix-docs <pr>` - Fix documentation issues in PR
- `/pr-fix-tests <pr>` - Fix test issues in PR

## Protected Areas
- Core algorithm logic
- CLI argument structure  
- Config compatibility
- MCP protocol/transport
- No AI attribution in commits

## Related Updates
CLI changes → README, website, Homebrew formula
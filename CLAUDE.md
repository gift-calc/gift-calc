# CLAUDE.md

## Tech Stack
- Node.js ≥20.8.1 (pure, no external runtime dependencies)
- Testing: vitest
- Publishing: semantic-release
- CLI: dual commands (`gift-calc`, `gcalc`)

## Project Structure
- `index.js` - CLI interface and file operations
- `src/core.js` - Pure calculation functions
- `src/mcp/` - Model Context Protocol server
- Config: `~/.config/gift-calc/.config.json` (auto-created)

## Commands
```bash
# Testing
npm test                             # Run tests
npm run test:coverage                # Coverage report
node index.js --help                 # Test CLI locally

# Development
npm link                             # Global testing
node mcp-server.js                   # Test MCP server
```

## Code Style
- Manual argument parsing (no CLI libraries)
- Reuse functions from `src/core.js` for MCP tools
- Mark MCP tool safety: `isReadOnly: true/false`
- Command priority: CLI args > config file > defaults

## Workflow
1. Make changes
2. Run `npm test`
3. Use `/commit` command (conventional commits)
4. Push to master (auto-publishes via semantic-release)

## GitHub Operations
Use `gh` CLI: `gh pr create`, `gh issue list`, `gh repo view`

## Custom Commands
- `/commit-push` - Conventional commits with semantic versioning
- `/implement-issue <number>` - Implement GitHub issue
- `/fix-failing-tests` - Fix failing tests
- `/sync-master` - Sync with master branch
- `/pr-review <pr>` - Review pull request
- `/pr-code-review <pr>` - Code-focused PR review
- `/pr-docs-review <pr>` - Documentation-focused PR review  
- `/pr-tests-review <pr>` - Tests-focused PR review
- `/pr-fix-code <pr>` - Fix code issues in PR
- `/pr-fix-docs <pr>` - Fix documentation issues in PR
- `/pr-fix-tests <pr>` - Fix test issues in PR

## Do Not Touch
- Core algorithm logic (requires explicit approval)
- CLI argument structure (breaking changes)
- Config file compatibility
- MCP protocol version/transport
- No AI attribution in commits

## Related Updates
After CLI/functionality changes: update README.md, website docs, Homebrew formula
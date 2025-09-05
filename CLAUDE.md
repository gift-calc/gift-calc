# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

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
node index.js -b 100 -v 30 -f 7     # Test with parameters
node index.js init-config            # Test config initialization

# Package management  
npm link                             # Link for global testing
npm version patch|minor|major        # Bump version
npm publish                          # Publish to npm registry

# Testing both commands after linking
gift-calc --help
gcalc -b 50 -f 8
```

## Architecture

**Single-file CLI structure** (`index.js`):
- Pure Node.js CLI tool with no external dependencies
- All functionality contained in one executable file
- Uses native Node.js modules: `fs`, `path`, `os`, `readline`

**Key components:**
1. **Config System**: Loads/saves user defaults from `~/.config/gift-calc/.config.json`
2. **Command Parser**: Manual argument parsing with support for `init-config` command
3. **Interactive Setup**: Uses `readline` for `init-config` prompts
4. **Algorithm**: `calculateGiftAmount()` applies variation and friend-score bias

**Configuration Flow**:
- Config loaded at startup via `loadConfig()`
- Priority: CLI args > config file > built-in defaults
- `init-config` creates/updates config file interactively

**Command Structure**:
- Both `gift-calc` and `gcalc` commands point to same `index.js`
- Special handling for `init-config` as first argument
- Standard CLI options: `-b/--basevalue`, `-v/--variation`, `-f/--friend-score`

## GitHub Tool Usage

**IMPORTANT**: Always use the `gh` CLI tool for GitHub-related tasks when possible. This includes:
- Creating and managing pull requests: `gh pr create`, `gh pr view`, `gh pr merge`
- Managing issues: `gh issue create`, `gh issue list`, `gh issue close`
- Repository operations: `gh repo view`, `gh repo clone`, `gh repo create`
- GitHub Pages: `gh api repos/owner/repo/pages` for configuration
- Releases: `gh release create`, `gh release list`
- Working with GitHub Actions: `gh run list`, `gh run view`

The `gh` tool provides better integration, authentication, and error handling than manual git operations for GitHub-specific tasks.

## Git Commit Guidelines

**IMPORTANT**: NEVER include Claude Code references, AI attribution, or "Generated with Claude" messages in commit messages. Keep all commit messages clean and professional.

## Publishing Process

When making changes that affect command names, help text, or functionality:
1. Update version in `package.json`
2. Update version in `README.md` Package Information section
3. Commit changes with descriptive message (NO AI attribution)
4. Push to GitHub
5. Run `npm publish` to update npm package

The package includes `index.js`, `.config-example.json`, and `README.md` as defined in the `files` field.

## Important Implementation Details

- **Config Path**: `~/.config/gift-calc/.config.json` (created automatically)
- **Algorithm**: Friend score creates bias by adjusting random variation probability
- **Error Handling**: Graceful fallback to defaults if config file is corrupted
- **Help System**: Comprehensive help with examples for both command names
- **Version Compatibility**: Requires Node.js >= 14.0.0
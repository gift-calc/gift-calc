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
node index.js -b 100 -v 30 -f 7     # Test with parameters
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

**Single-file CLI structure** (`index.js`):
- Pure Node.js CLI tool with no external dependencies
- Uses native Node.js modules: `fs`, `path`, `os`, `readline`

**Key Components:**
- **Config System**: Loads/saves user defaults from `~/.config/gift-calc/.config.json`
- **Command Parser**: Manual argument parsing with support for `init-config` command
- **Interactive Setup**: Uses `readline` for `init-config` prompts
- **Algorithm**: `calculateGiftAmount()` applies variation and friend-score bias

**Configuration Flow:**
- Config loaded at startup via `loadConfig()`
- Priority: CLI args > config file > built-in defaults
- `init-config` creates/updates config file interactively

**Command Structure:**
- Both `gift-calc` and `gcalc` commands point to same `index.js`
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
- **Version Compatibility**: Requires Node.js >= 14.0.0
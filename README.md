# Gift Calculator

[![npm version](https://img.shields.io/npm/v/gift-calc)](https://www.npmjs.com/package/gift-calc)
[![npm downloads](https://img.shields.io/npm/dm/gift-calc)](https://www.npmjs.com/package/gift-calc)
[![License: ISC](https://img.shields.io/badge/License-ISC-blue.svg)](https://opensource.org/licenses/ISC)
[![Node Version](https://img.shields.io/node/v/gift-calc)](https://nodejs.org/)
[![GitHub issues](https://img.shields.io/github/issues/gift-calc/gift-calc)](https://github.com/gift-calc/gift-calc/issues)
[![GitHub pull requests](https://img.shields.io/github/issues-pr/gift-calc/gift-calc)](https://github.com/gift-calc/gift-calc/pulls)

The only hackable open source gift calculation tool you´ll ever need. A CLI tool that suggests gift amounts based on a configurable base value with random variation, friend score, and nice score influences.

## Quick Start

```bash
# Install via npm (recommended)
npm install -g gift-calc

# Calculate with defaults
gift-calc

# Setup your preferences
gift-calc init-config

# Custom amount for a friend
gift-calc -b 100 -f 8 --name "Alice"
```

## Features

- 🎁 Smart gift amount calculation with configurable parameters
- 📊 Friend score system to bias amounts based on relationship closeness  
- 😊 Nice score system with special cases for mean people
- ⚡ Quick convenience parameters for difficult people (--asshole, --dickhead)
- 📈 Fixed amount options (--max, --min) for predictable results
- ⚙️ Persistent configuration file support with update capability
- 📝 Automatic logging with log viewing functionality
- 🎯 Percentage-based variation for realistic randomness
- 📱 Simple command-line interface with dual command names
- 👮 Naughty list management (add/remove/list/search) with zero gift override
- 🎅 Automatic naughty list detection with "on naughty list!" notifications

## Installation

### Via npm (recommended)

```bash
npm install -g gift-calc
```

### Via Homebrew (macOS/Linux)

```bash
brew tap gift-calc/homebrew-gift-calc
brew install gift-calc
```

### Via Install Script (Unix/Linux/macOS)

```bash
curl -fsSL https://raw.githubusercontent.com/gift-calc/gift-calc/main/install.sh | sh
```

### Via Docker

```bash
docker pull davidnossebro/gift-calc
docker run --rm davidnossebro/gift-calc -b 100 -r 30 -f 7
```

## Usage

### Basic Commands

```bash
gift-calc                    # Calculate with defaults/config
gcalc                        # Short alias
gift-calc init-config        # Setup configuration
gift-calc log                # View calculation history
gift-calc --help             # Show help
```

### Common Examples

```bash
# Basic calculation
gift-calc

# For a good friend
gift-calc -b 100 -f 8 --name "Alice"

# For someone you don't like
gift-calc --asshole --name "Kevin"

# Maximum amount for best friend
gift-calc -b 100 --max --name "Diana"

# Naughty list management
gift-calc naughty-list Sven           # Add to naughty list
gift-calc naughty-list list           # List naughty people
gift-calc naughty-list --remove Sven  # Remove from naughty list
```

## Command Options

| Option | Description | Default |
|--------|-------------|---------|
| `-b, --basevalue` | Base gift amount | 70 |
| `-v, --variation` | Variation percentage | 20 |
| `-f, --friend-score` | Relationship closeness (1-10) | 5 |
| `-n, --nice-score` | Person's niceness (0-10) | 5 |
| `-c, --currency` | Currency code | SEK |
| `--name` | Gift recipient name | - |
| `--max` | Set to maximum amount | - |
| `--min` | Set to minimum amount | - |
| `--asshole` | Set nice score to 0 (no gift) | - |
| `--no-log` | Disable logging | false |
| `--copy` | Copy amount to clipboard | false |

## Configuration

Setup persistent configuration:

```bash
gift-calc init-config    # Create initial config
gift-calc update-config  # Update existing config
```

Configuration file: `~/.config/gift-calc/.config.json`

## Scoring Systems

### Friend Score (1-10)
- **1-3**: Acquaintance (bias toward lower amounts)
- **4-6**: Regular friend (neutral)
- **7-8**: Good friend (bias toward higher amounts)
- **9-10**: Best friend/family (strong bias toward higher)

### Nice Score (0-10)
- **0**: Asshole (no gift!)
- **1-3**: Mean person (10-30% of base value)
- **4-6**: Average niceness (neutral)
- **7-10**: Nice person (bias toward higher amounts)

## Naughty List

Manage people who should receive no gifts:

```bash
gift-calc naughty-list <name>      # Add person
gcalc nl list                      # List all naughty people
gift-calc naughty-list --remove <name>  # Remove person
gcalc nl --search <term>           # Search naughty list
```

## Development

```bash
# Clone and setup
git clone https://github.com/gift-calc/gift-calc.git
cd gift-calc
npm install

# Test locally
node index.js --help
npm link                    # Link for global testing
npm test                    # Run tests
```

## More Information

- **Full Documentation**: [Website](https://gift-calc.github.io)
- **Contributing**: [CONTRIBUTING.md](CONTRIBUTING.md)
- **Changelog**: [CHANGELOG.md](CHANGELOG.md)
- **Security**: [SECURITY.md](SECURITY.md)
- **Code of Conduct**: [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md)
- **Issues**: [GitHub Issues](https://github.com/gift-calc/gift-calc/issues)
- **Discussions**: [GitHub Discussions](https://github.com/gift-calc/gift-calc/discussions)

## License

ISC License - see [LICENSE](LICENSE) file for details.

---

**Need help?** Run `gift-calc --help` for quick reference.
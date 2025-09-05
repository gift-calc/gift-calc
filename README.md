# Gift Calculator

The only hackable open source gift calculation tool you´ll ever need. A CLI tool that suggests gift amounts based on a configurable base value with random variation, friend score, and nice score influences.

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

## Installation

### Via Homebrew (macOS/Linux)

Install using Homebrew:
```bash
brew tap gift-calc/homebrew-gift-calc
brew install gift-calc
```

### Via Install Script (Unix/Linux/macOS)

One-line installation from source:
```bash
curl -fsSL https://raw.githubusercontent.com/gift-calc/gift-calc/main/install.sh | sh
```

This installs from source to `~/.local/share/gift-calc` and creates executables in `~/.local/bin`.

### Via PowerShell Script (Windows)

One-line installation from source:
```powershell
irm https://raw.githubusercontent.com/gift-calc/gift-calc/main/install.ps1 | iex
```

This installs from source to `%LOCALAPPDATA%\gift-calc` and creates executables in `%LOCALAPPDATA%\Microsoft\WindowsApps`.

### From NPM

Install globally from npm:
```bash
npm install -g gift-calc
```

The package will be available as both `gift-calc` and `gcalc` commands.

### From Source

1. Clone the repository:
```bash
git clone https://github.com/gift-calc/gift-calc.git
cd gift-calc
```

2. Install globally using npm:
```bash
npm install -g .
```

Or link for development:
```bash
npm link
```

### Prerequisites

- Node.js >= 14.0.0

## Quick Start

```bash
# Install via Homebrew (macOS/Linux)
brew tap gift-calc/homebrew-gift-calc
brew install gift-calc

# OR install via script (Unix/Linux/macOS)
curl -fsSL https://raw.githubusercontent.com/gift-calc/gift-calc/main/install.sh | sh

# OR install via PowerShell (Windows)
irm https://raw.githubusercontent.com/gift-calc/gift-calc/main/install.ps1 | iex

# OR install via npm
npm install -g gift-calc

# Use default values (with automatic logging)
gift-calc

# Setup your preferences
gift-calc init-config

# Override specific values
gift-calc -b 100 -v 25 -f 8 -n 7

# For someone you really don't like
gift-calc --asshole --name "Kevin"
```

## Usage

### Basic Commands

```bash
gift-calc                    # Calculate with defaults/config (logging enabled)
gcalc                        # Short alias for gift-calc
gift-calc init-config        # Setup configuration file
gift-calc update-config      # Update existing configuration
gift-calc log                # Open log file with less
gift-calc --help             # Show help message
```

### Command Options

| Option | Long Form | Description | Range | Default |
|--------|-----------|-------------|-------|---------|
| `-b` | `--basevalue` | Base gift amount | Any number | 70 |
| `-v` | `--variation` | Variation percentage | 0-100 | 20 |
| `-f` | `--friend-score` | Relationship closeness | 1-10 | 5 |
| `-n` | `--nice-score` | Person's niceness level | 0-10 | 5 |
| `-c` | `--currency` | Currency code to display | Any string | SEK |
| `-d` | `--decimals` | Number of decimal places | 0-10 | 2 |
| | `--name` | Gift recipient name | Any string | - |
| | `--max` | Set to maximum amount (base + 20%) | - | - |
| | `--min` | Set to minimum amount (base - 20%) | - | - |
| | `--asshole` | Set nice score to 0 (no gift) | - | - |
| | `--dickhead` | Set nice score to 0 (no gift) | - | - |
| | `--no-log` | Disable logging to file | - | false |
| `-cp` | `--copy` | Copy amount to clipboard | - | false |
| `-h` | `--help` | Show help | - | - |

### Examples

```bash
# Basic usage with defaults (automatic logging)
gift-calc
# Output: 73.24 SEK
# Entry logged to ~/.config/gift-calc/gift-calc.log

# Gift for a specific person with high nice score
gcalc --name "Alice" -n 9
# Output: 78.45 SEK for Alice

# Set a higher base amount with friend and nice scores
gift-calc -b 150 -f 8 -n 7 --name "Bob"
# Output: 162.3 SEK for Bob

# Different currency with no logging
gcalc -b 100 -c USD --name "Charlie" --no-log
# Output: 87.35 USD for Charlie

# Maximum amount for best friend
gift-calc -b 100 --max --name "Diana"
# Output: 120.0 SEK for Diana

# Minimum amount for acquaintance
gift-calc -b 100 --min --name "Eric"
# Output: 80.0 SEK for Eric

# Mean person gets reduced amount
gift-calc -b 100 -n 2 --name "Frank"
# Output: 20.0 SEK for Frank

# No gift for terrible people
gift-calc --asshole --name "Kevin"
# Output: 0 SEK for Kevin

gift-calc --dickhead -b 200 --name "Larry"
# Output: 0 SEK for Larry

# Copy to clipboard with nice person bias
gift-calc -b 80 -n 8 --name "Maya" -cp
# Output: 89.67 SEK for Maya
# Amount 89.67 copied to clipboard

# Combine friend and nice scores
gcalc -b 120 -f 9 -n 8 -c USD --name "Nina"
# Output: 134.8 USD for Nina
```

## Commands

### Configuration Commands

#### init-config
Setup a new configuration file with default values:
```bash
gift-calc init-config
```

This will prompt you for:
- **Base value**: Your typical gift amount (default: 70)
- **Variation percentage**: How much to vary from base (0-100%, default: 20%)
- **Currency**: Currency code to display (default: SEK)  
- **Decimals**: Number of decimal places (0-10, default: 2)

**Note**: Friend score and nice score are NOT saved in configuration - they must be specified each time via command line.

#### update-config
Update your existing configuration file:
```bash
gift-calc update-config
```

Shows current values and allows you to update them selectively. Press Enter to keep existing values.

### Log Command

#### log
View your calculation history:
```bash
gift-calc log
```

Opens `~/.config/gift-calc/gift-calc.log` with the `less` pager for easy browsing.

**Navigation in less:**
- Arrow keys or j/k: Move up/down
- Space/Page Down: Next page
- Page Up: Previous page  
- q: Quit
- /pattern: Search for pattern

## Scoring Systems

### Friend Score Guide

The friend score influences the probability of getting higher or lower amounts:

| Score | Relationship | Bias |
|-------|-------------|------|
| 1-3 | Acquaintance | Toward lower amounts |
| 4-6 | Regular friend | Neutral |
| 7-8 | Good friend | Toward higher amounts |
| 9-10 | Best friend/family | Strong bias toward higher |

### Nice Score Guide

The nice score has special cases for low scores and bias for higher scores:

| Score | Description | Amount |
|-------|-------------|--------|
| 0 | Asshole | 0 (no gift) |
| 1 | Terrible person | 10% of base value |
| 2 | Very mean person | 20% of base value |
| 3 | Mean person | 30% of base value |
| 4-6 | Average niceness | Neutral bias |
| 7-8 | Nice person | Bias toward higher amounts |
| 9-10 | Very nice person | Strong bias toward higher |

**Special Cases:** Nice scores 0-3 override all other calculations (including friend score, variation, --max, --min) with fixed amounts.

### Convenience Parameters

For quick access to no-gift amounts:
- `--asshole`: Sets nice score to 0 (amount = 0)
- `--dickhead`: Sets nice score to 0 (amount = 0)

These override any explicit nice score values.

## Configuration

### Configuration File

The configuration is stored at: `~/.config/gift-calc/.config.json`

Example configuration:
```json
{
  "baseValue": 100,
  "variation": 25,
  "currency": "USD",
  "decimals": 1
}
```

### Configuration Precedence

1. **Command line options** (highest priority)
2. **Configuration file values**
3. **Built-in defaults** (lowest priority)

**Important**: Friend scores and nice scores are never stored in configuration and must be specified via command line each time.

## Logging

### Automatic Logging

By default, all calculations are logged to `~/.config/gift-calc/gift-calc.log`. Each entry includes:
- ISO timestamp
- Calculated amount and currency
- Recipient name (if specified)

Example log entries:
```
2025-09-05T02:15:30.123Z 75.50 SEK
2025-09-05T02:16:45.456Z 120.00 USD for Alice
2025-09-05T02:17:12.789Z 0 SEK for Kevin
```

### Disable Logging

Use `--no-log` to disable logging for a specific calculation:
```bash
gift-calc -b 100 --no-log
```

## How It Works

### Algorithm Details

1. **Special Cases First**: If nice score is 0-3, return fixed amount
2. **Fixed Amounts**: If --max/--min specified, return base±20%
3. **Base Calculation**: Start with your base value
4. **Random Variation**: Apply ±variation% random adjustment  
5. **Combined Bias**: Average friend score and nice score biases
6. **Final Amount**: Apply bias and clamp within variation bounds

### Mathematical Formula

For normal calculations (nice score 4-10):
- Friend bias: `(friendScore - 5.5) × 0.1`
- Nice bias: `(niceScore - 5.5) × 0.1`
- Combined bias: `(friendBias + niceBias) / 2`
- Final: `base + (randomVariation + combinedBias × variation)`

### Clipboard Functionality

The `--copy` flag copies just the numerical amount (without currency) to your clipboard:

- **macOS**: Uses `pbcopy`
- **Windows**: Uses `clip`
- **Linux**: Uses `xclip` or `xsel` (install with your package manager)

## Development

### Project Structure

```
gift-calc/
├── index.js              # Main CLI application
├── package.json          # Project configuration  
├── .config-example.json  # Example configuration
├── README.md             # This file
└── CLAUDE.md            # Development instructions for Claude Code
```

### Local Development

```bash
# Clone and setup
git clone https://github.com/gift-calc/gift-calc.git
cd gift-calc
npm install

# Test locally
node index.js --help
node index.js -b 100

# Link for global testing
npm link
gift-calc --help
gcalc --help
```

### Testing Features

```bash
# Test basic functionality
node index.js
node index.js -b 50 -v 30 -f 8 -n 7

# Test special cases
node index.js --asshole
node index.js -n 1 -b 100
node index.js --max -b 100

# Test configuration
node index.js init-config
node index.js update-config

# Test logging  
node index.js -b 100  # Should log by default
node index.js log     # Should open log file

# Test both commands after linking
gcalc -b 100
gift-calc --dickhead --name "Test"
```

## Contributing

We love contributions! Gift Calculator is an open source project that thrives on community involvement. There are many ways you can help make this tool even better:

### 🐛 Report Bugs & Request Features

Found a bug or have an idea for a new feature? We want to hear about it!

- **Bug Reports**: [Create an issue](https://github.com/gift-calc/gift-calc/issues/new?template=bug_report.md) with details about the problem
- **Feature Requests**: [Submit an enhancement](https://github.com/gift-calc/gift-calc/issues/new?template=feature_request.md) with your ideas
- **Questions**: Start a [GitHub Discussion](https://github.com/gift-calc/gift-calc/discussions) for general questions

### 🔧 Contribute Code

Ready to get your hands dirty? Here's how to contribute code:

1. **Fork the Repository**
   ```bash
   # Fork on GitHub, then clone your fork
   git clone https://github.com/YOUR-USERNAME/gift-calc.git
   cd gift-calc
   ```

2. **Create a Feature Branch**
   ```bash
   git checkout -b feature/awesome-new-feature
   # or
   git checkout -b fix/bug-description
   ```

3. **Make Your Changes**
   - Write clean, readable code
   - Follow the existing code style (2 spaces, consistent patterns)
   - Add tests for new functionality where applicable
   - Keep commits focused and atomic

4. **Test Your Changes**
   ```bash
   # Test the CLI locally
   node index.js --help
   node index.js -b 100 -v 25 -f 8
   
   # Link and test globally
   npm link
   gift-calc --help
   gcalc -b 50
   ```

5. **Submit a Pull Request**
   - Push your branch to your fork
   - [Create a pull request](https://github.com/gift-calc/gift-calc/compare) from your branch
   - Fill out the PR template with details about your changes
   - Reference any related issues (e.g., "Fixes #123")



### 📋 Code Style Guidelines

- **Indentation**: Use 2 spaces (no tabs)
- **Functions**: Keep them small and focused on one task  
- **Variables**: Use descriptive names (`friendScore` not `fs`)
- **Comments**: Add comments for complex logic, algorithms, or non-obvious code
- **Error Handling**: Provide helpful error messages with suggested fixes
- **Consistency**: Follow existing patterns in the codebase

### 🎉 Spread the Word

You can also contribute by:

- ⭐ **Star the repository** to show your support
- 🐦 **Share on social media** with friends and colleagues
- 📝 **Write blog posts** about how you use gift-calc
- 💬 **Mention it in developer communities** when someone needs a gift calculation tool
- 🎤 **Give talks** about the project at meetups or conferences

### 🙏 Recognition

All contributors are valued and will be:

- Listed in our contributors section
- Mentioned in release notes for significant contributions  
- Given credit in commit messages and PR descriptions
- Invited to join our community discussions

### 📞 Getting Help

Need help with contributing? Don't hesitate to:

- 💬 Join our [GitHub Discussions](https://github.com/gift-calc/gift-calc/discussions)
- 📧 Comment on existing issues for guidance
- 🔍 Look at recent PRs for examples of good contributions

**Thank you for making Gift Calculator better for everyone!** 🎁

## License

ISC License

## Author

David Nossebro - Created as a practical CLI tool for gift amount suggestions.

## Package Information

- **NPM Package:** [gift-calc](https://www.npmjs.com/package/gift-calc)
- **GitHub Repository:** [gift-calc/gift-calc](https://github.com/gift-calc/gift-calc)
- **Version:** 1.2.0
- **License:** ISC

---

**Need help?** Run `gift-calc --help` for quick reference.
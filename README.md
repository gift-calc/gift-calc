# Gift Calculator

A CLI tool that suggests gift amounts based on a configurable base value with random variation and friend score influence.

## Features

- 🎁 Smart gift amount calculation with configurable parameters
- 📊 Friend score system to bias amounts based on relationship closeness
- ⚙️ Persistent configuration file support
- 🎯 Percentage-based variation for realistic randomness
- 📱 Simple command-line interface

## Installation

### From NPM (Recommended)

Install globally from npm:
```bash
npm install -g gift-calc
```

The package will be available as both `gift-calc` and `gcalc` commands.

### From Source

1. Clone the repository:
```bash
git clone https://github.com/david-nossebro/gift-calc.git
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
# Install the package globally
npm install -g gift-calc

# Use default values
gift-calc

# Setup your preferences
gift-calc init-config

# Override specific values
gift-calc -b 100 -v 25 -f 8
```

## Usage

### Basic Commands

```bash
gift-calc                    # Calculate with defaults/config
gcalc                        # Short alias for gift-calc
gift-calc init-config        # Setup configuration file
gift-calc log                # Open log file with less
gcalc init-config            # Setup config (short form)
gift-calc --help            # Show help message
```

### Command Options

| Option | Long Form | Description | Range | Default |
|--------|-----------|-------------|-------|---------|
| `-b` | `--basevalue` | Base gift amount | Any number | 70 |
| `-v` | `--variation` | Variation percentage | 0-100 | 20 |
| `-f` | `--friend-score` | Relationship closeness | 1-10 | 5 |
| `-c` | `--currency` | Currency code to display | Any string | SEK |
| `-d` | `--decimals` | Number of decimal places | 0-10 | 2 |
| `-n` | `--name` | Gift recipient name | Any string | - |
| `--log` | `--log` | Write to log file | - | false |
| `-cp` | `--copy` | Copy amount to clipboard | - | false |
| `-h` | `--help` | Show help | - | - |

### Examples

```bash
# Basic usage with defaults
gift-calc
# Output: 73.24 SEK

# Gift for a specific person
gcalc -n "Alice"
# Output: 68.45 SEK for Alice

# Set a higher base amount
gift-calc -b 150 -d 1 -n "Bob"
# Output: 142.1 SEK for Bob

# Different currency with logging
gcalc -b 100 -c USD -n "Charlie" --log
# Output: 127.35 USD for Charlie
# Entry logged to /Users/username/.config/gift-calc/gift-calc.log

# Copy to clipboard with name
gift-calc -b 80 -n "Diana" -cp
# Output: 89.67 SEK for Diana
# Amount 89.67 copied to clipboard

# Best friend with logging
gift-calc -b 80 -f 9 -c EUR -n "Emma" --log
# Output: 85.12 EUR for Emma
# Entry logged to /Users/username/.config/gift-calc/gift-calc.log

# Combine all options
gcalc -b 120 -v 30 -f 7 -c USD -d 1 -n "Frank" -cp --log
# Output: 134.8 USD for Frank
# Amount 134.8 copied to clipboard
# Entry logged to /Users/username/.config/gift-calc/gift-calc.log
```

## Configuration

### Setup Configuration

Run the interactive configuration setup:

```bash
gift-calc init-config
# or use the short form:
gcalc init-config
```

This will prompt you for default values:
- **Base value**: Your typical gift amount (default: 70)
- **Variation percentage**: How much to vary from base (0-100%, default: 20%)
- **Friend score**: Default relationship level (1-10, default: 5)
- **Currency**: Currency code to display (default: SEK)
- **Decimals**: Number of decimal places (0-10, default: 2)

You can skip any prompt to keep the built-in default.

### Configuration File

The configuration is stored at: `~/.config/gift-calc/.config.json`

Example configuration:
```json
{
  "baseValue": 100,
  "variation": 25,
  "friendScore": 6,
  "currency": "USD",
  "decimals": 1
}
```

### Configuration Precedence

1. **Command line options** (highest priority)
2. **Configuration file values**
3. **Built-in defaults** (lowest priority)

## Friend Score Guide

The friend score influences the probability of getting higher or lower amounts:

| Score | Relationship | Bias |
|-------|-------------|------|
| 1-3 | Acquaintance | Toward lower amounts |
| 4-6 | Regular friend | Neutral |
| 7-8 | Good friend | Toward higher amounts |
| 9-10 | Best friend/family | Strong bias toward higher |

## How It Works

1. **Base Calculation**: Starts with your base value
2. **Random Variation**: Applies ±variation% random adjustment
3. **Friend Score Bias**: Adjusts probability distribution based on relationship
4. **Final Amount**: Returns calculated amount rounded to 2 decimal places

### Algorithm Details

- Variation creates a range of `base ± (base × variation/100)`
- Friend score adds bias: `(friendScore - 5.5) × 0.1 × variation`
- Final result is clamped within the original variation bounds

### Clipboard Functionality

The `--copy` flag copies just the numerical amount (without currency) to your clipboard:

- **macOS**: Uses `pbcopy`
- **Windows**: Uses `clip`  
- **Linux**: Uses `xclip` or `xsel` (install with your package manager)

### Logging Functionality

The `--log` flag writes a timestamped entry to `~/.config/gift-calc/gift-calc.log`:

- **Format**: `[ISO timestamp] [amount] [currency] [for name]`
- **Location**: `~/.config/gift-calc/gift-calc.log`
- **Behavior**: Appends to existing log file, creates if doesn't exist
- **Note**: Name parameter is not stored in config but can be logged when used

Example log entries:
```
2025-09-05T02:15:30.123Z 75.50 SEK
2025-09-05T02:16:45.456Z 120.00 USD for Alice
2025-09-05T02:17:12.789Z 89.67 EUR for Bob
```

### Log Command

The `gift-calc log` command opens your calculation history using `less`:

```bash
gift-calc log
```

**Behavior:**
- Opens `~/.config/gift-calc/gift-calc.log` with `less` pager
- Use standard `less` navigation (arrow keys, page up/down, q to quit)
- Raw log format with ISO timestamps
- Handles missing log files gracefully

**Log file format:**
```
2025-09-05T02:15:30.123Z 75.50 SEK
2025-09-05T02:16:45.456Z 120.00 USD for Alice
2025-09-05T02:17:12.789Z 89.67 EUR for Bob
```

## Development

### Project Structure

```
gift-calc/
├── index.js              # Main CLI application
├── package.json          # Project configuration
├── .config-example.json  # Example configuration
└── README.md             # This file
```

### Local Development

```bash
# Clone and setup
git clone <repository-url>
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

### Testing

```bash
# Test basic functionality
node index.js
node index.js -b 50 -v 30 -f 8

# Test configuration
node index.js init-config
node index.js  # Should use config values

# Test help
node index.js --help

# Test both commands after linking
gcalc -b 100
gift-calc init-config
```

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Make your changes
4. Test thoroughly
5. Submit a pull request

### Code Style

- Use consistent indentation (2 spaces)
- Follow existing patterns
- Add comments for complex logic
- Keep functions focused and small

## License

ISC License

## Author

Created as a practical CLI tool for gift amount suggestions.

## Package Information

- **NPM Package:** [gift-calc](https://www.npmjs.com/package/gift-calc)
- **GitHub Repository:** [david-nossebro/gift-calc](https://github.com/david-nossebro/gift-calc)
- **Version:** 1.1.0
- **License:** ISC

---

**Need help?** Run `gift-calc --help` for quick reference.
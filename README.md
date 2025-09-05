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

The package will be available as both `gift-calc` and `gift-amount` commands.

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
gift-calc init-config        # Setup configuration file
gift-calc --help            # Show help message
```

### Command Options

| Option | Long Form | Description | Range | Default |
|--------|-----------|-------------|-------|---------|
| `-b` | `--basevalue` | Base gift amount | Any number | 70 |
| `-v` | `--variation` | Variation percentage | 0-100 | 20 |
| `-f` | `--friend-score` | Relationship closeness | 1-10 | 5 |
| `-h` | `--help` | Show help | - | - |

### Examples

```bash
# Basic usage with defaults
gift-calc
# Output: 73.24

# Set a higher base amount
gift-calc -b 150
# Output: 142.18

# High variation for more randomness
gift-calc -b 100 -v 40
# Output: 127.35

# Best friend (high score = bias toward higher amounts)
gift-calc -b 80 -f 9
# Output: 89.67

# Acquaintance (low score = bias toward lower amounts)  
gift-calc -b 80 -f 2
# Output: 71.23

# Combine all options
gift-calc -b 120 -v 30 -f 7
# Output: 134.89
```

## Configuration

### Setup Configuration

Run the interactive configuration setup:

```bash
gift-calc init-config
```

This will prompt you for default values:
- **Base value**: Your typical gift amount (default: 70)
- **Variation percentage**: How much to vary from base (0-100%, default: 20%)
- **Friend score**: Default relationship level (1-10, default: 5)

You can skip any prompt to keep the built-in default.

### Configuration File

The configuration is stored at: `~/.config/gift-calc/.config.json`

Example configuration:
```json
{
  "baseValue": 100,
  "variation": 25,
  "friendScore": 6
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
- **Version:** 1.0.0
- **License:** ISC

---

**Need help?** Run `gift-calc --help` for quick reference.
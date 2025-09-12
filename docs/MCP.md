# Model Context Protocol (MCP) Server

This document provides comprehensive documentation for using gift-calc's built-in Model Context Protocol (MCP) server, enabling direct integration with AI assistants like Claude, GPT, and other LLMs.

## Table of Contents

- [What is MCP?](#what-is-mcp)
- [Quick Start](#quick-start)
- [Installation](#installation)
- [Client Setup](#client-setup)
- [Available Tools](#available-tools)
- [Usage Examples](#usage-examples)
- [Development & Testing](#development--testing)
- [Troubleshooting](#troubleshooting)
- [Security & Safety](#security--safety)

## What is MCP?

The Model Context Protocol (MCP) is an open protocol developed by Anthropic that standardizes how AI assistants connect to external tools and data sources. Think of MCP like a USB-C port for AI applications - it provides a universal way for AI models to interact with various tools and systems.

### Key Benefits

- **Seamless Integration**: Use gift-calc directly within AI conversations
- **Standardized Protocol**: Works with any MCP-compatible AI client
- **Real-time Interaction**: AI assistants can access current configuration and data
- **Type Safety**: Structured tool definitions with input validation

## Quick Start

1. **Install gift-calc** (includes MCP server):
   ```bash
   npm install -g gift-calc
   ```

2. **Test MCP server**:
   ```bash
   gift-calc-mcp
   # Should start the MCP server (STDIO mode)
   ```

3. **Configure your AI client** (see [Client Setup](#client-setup))

4. **Start using gift-calc in AI conversations!**

## Installation

The MCP server is automatically included when you install gift-calc via any method:

### Via npm (Recommended)
```bash
npm install -g gift-calc
```

### Via Homebrew
```bash
brew tap gift-calc/homebrew-gift-calc
brew install gift-calc
```

### Via Install Script
```bash
curl -fsSL https://raw.githubusercontent.com/gift-calc/gift-calc/master/install.sh | sh
```

After installation, verify the MCP server is available:
```bash
which gift-calc-mcp
# Should show the path to the MCP executable
```

## Client Setup

### Claude Desktop

Add gift-calc to your Claude Desktop configuration:

**Configuration File Locations:**
- **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows**: `%APPDATA%/Claude/claude_desktop_config.json`
- **Linux**: `~/.config/Claude/claude_desktop_config.json`

**Configuration:**
```json
{
  "mcpServers": {
    "gift-calc": {
      "command": "gift-calc-mcp",
      "args": [],
      "env": {}
    }
  }
}
```

**After Configuration:**
1. Restart Claude Desktop
2. Look for the MCP connection indicator (🔌 icon)
3. Test with: "Calculate a gift amount for Alice"

### Claude Code

Add gift-calc to your Claude Code MCP configuration:

```bash
# Add gift-calc MCP server to Claude Code
claude mcp add gift-calc gift-calc-mcp

# Verify it was added
claude mcp list
```

You can configure at different scopes:
- **Local scope** (default): `claude mcp add gift-calc gift-calc-mcp`
- **Project scope**: `claude mcp add --scope project gift-calc gift-calc-mcp` 
- **User scope**: `claude mcp add --scope user gift-calc gift-calc-mcp`

### Cursor IDE

Add gift-calc MCP support in Cursor Composer:

```json
{
  "mcp": {
    "servers": {
      "gift-calc": {
        "command": "gift-calc-mcp"
      }
    }
  }
}
```

### VS Code

Configure gift-calc using any of these methods:

**Method 1: Extensions View**
1. Open Extensions view in VS Code
2. Search `@mcp` and select "Browse MCP Servers"
3. Add custom server: `gift-calc-mcp`

**Method 2: Workspace Configuration**
Create `.vscode/mcp.json`:
```json
{
  "servers": {
    "gift-calc": {
      "type": "stdio",
      "command": "gift-calc-mcp"
    }
  }
}
```

**Method 3: User Configuration**
1. Use "MCP: Add Server" command
2. Choose "Standard I/O (stdio)"
3. Command: `gift-calc-mcp`

### Zed Editor

Zed supports MCP through both extensions and custom configuration:

**Custom Configuration**
Add to `settings.json`:
```json
{
  "context_servers": {
    "gift-calc": {
      "source": "custom",
      "command": "gift-calc-mcp",
      "args": [],
      "env": {}
    }
  }
}
```

**Usage in Zed:**
1. Mention `@gift-calc` in Agent Panel prompts
2. Configure tool approval in agent settings
3. Create custom agent profiles for specific workflows

### Continue (VS Code/JetBrains)

Add gift-calc to Continue's MCP configuration:

```json
{
  "mcpServers": {
    "gift-calc": {
      "command": "gift-calc-mcp"
    }
  }
}
```

### LM Studio
Add to `mcp.json` configuration file:
```json
{
  "servers": {
    "gift-calc": {
      "command": "gift-calc-mcp"
    }
  }
}
```

### Generic MCP Client Setup

For any MCP-compatible client that supports STDIO transport:

**Required Settings:**
- **Command**: `gift-calc-mcp`  
- **Transport**: STDIO  
- **Protocol Version**: 2025-06-18
- **Arguments**: None required

## Available Tools

The MCP server exposes the following tools, organized by safety level:

### Read-Only Tools (Safe)

These tools only read data and don't modify anything:

#### `calculate_gift_amount`
Calculate gift amount with full parameter control.

**Parameters:**
- `baseValue` (number, required): Base amount for the gift
- `variation` (number, optional): Percentage variation (0-100)
- `friendScore` (number, optional): Relationship closeness (1-10) 
- `niceScore` (number, optional): Person's niceness (0-10)
- `currency` (string, optional): Currency code (e.g., "SEK", "USD")
- `name` (string, optional): Gift recipient name
- `isMax` (boolean, optional): Set to maximum amount
- `isMin` (boolean, optional): Set to minimum amount
- `isAsshole` (boolean, optional): Set nice score to 0 (no gift)

**Example:** Calculate 100 SEK gift for Alice (good friend, nice person)

#### `match_previous_gift`
Find and match previous gift amounts from history.

**Parameters:**
- `name` (string, optional): Specific recipient name to match

**Example:** Match last gift given to Bob, or match last gift overall

#### `check_naughty_list`
Check if someone is on the naughty list.

**Parameters:**
- `name` (string, required): Person's name to check

**Example:** Check if "Kevin" is on the naughty list

#### `get_config`
Retrieve current gift-calc configuration.

**Parameters:** None

**Returns:** Current default values for baseValue, variation, friendScore, niceScore, currency

#### `get_budget_status`
Show current budget status and spending progress.

**Parameters:** None

**Returns:** Active budgets with spending analysis, remaining amounts, and time left

#### `get_calculation_history`
View recent gift calculations from the log.

**Parameters:**
- `limit` (number, optional): Number of recent calculations to return (default: 10)
- `name` (string, optional): Filter by recipient name

**Example:** Show last 5 calculations, or all calculations for "Alice"

#### `get_spendings`
Analyze spending patterns over specific time periods with multi-currency support.

**Parameters:**
- **Either absolute dates OR relative period:**
  - `fromDate` + `toDate` (string): Date range in YYYY-MM-DD format
  - `days` (number): Last N days (1-3650)
  - `weeks` (number): Last N weeks (1-520)
  - `months` (number): Last N months (1-120)
  - `years` (number): Last N years (1-10)
- `format` (string, optional): "detailed" (default) or "summary"

**Returns:** Spending analysis with totals by currency and transaction details

**Examples:**
- Last 30 days spending: `{ "days": 30 }`
- Christmas 2024 analysis: `{ "fromDate": "2024-12-01", "toDate": "2024-12-31" }`
- Monthly summary: `{ "months": 1, "format": "summary" }`

### Destructive Tools (Require Confirmation)

These tools modify files or configuration:

#### `set_budget`
Add a new budget for spending tracking.

**Parameters:**
- `amount` (number, required): Budget amount
- `fromDate` (string, required): Start date (YYYY-MM-DD)
- `toDate` (string, required): End date (YYYY-MM-DD)
- `description` (string, optional): Budget description

**Example:** Set 5000 SEK Christmas budget from Dec 1-31

#### `add_to_naughty_list`
Add someone to the naughty list (they'll get 0 for gifts).

**Parameters:**
- `name` (string, required): Person's name to add

**Example:** Add "Kevin" to naughty list

#### `remove_from_naughty_list`
Remove someone from the naughty list.

**Parameters:**
- `name` (string, required): Person's name to remove

**Example:** Remove "Alice" from naughty list (forgiveness!)

#### `init_config`
Initialize configuration with specific default values.

**Parameters:**
- `baseValue` (number, optional): Default base value
- `variation` (number, optional): Default variation percentage
- `friendScore` (number, optional): Default friend score
- `niceScore` (number, optional): Default nice score
- `currency` (string, optional): Default currency

**Example:** Set up config with 100 SEK base value and 25% variation

## Usage Examples

### Natural AI Conversations

Once configured with your AI client, you can have natural conversations:

#### Basic Gift Calculation
**User**: "I need to calculate a gift for my coworker Sarah. I usually spend around 75 SEK on coworkers, she's pretty nice."

**AI Response**: Uses `calculate_gift_amount` with baseValue=75, niceScore=7, friendScore=4
*"I calculated a gift amount for Sarah: **73.25 SEK**. This is based on your 75 SEK budget for coworkers, with a positive bias since she's nice (nice score 7)."*

#### Gift Matching
**User**: "What did I give Bob last time? I want to give him the same amount."

**AI Response**: Uses `match_previous_gift` with name="Bob"
*"According to your gift history, you last gave Bob **89.50 SEK**. I can calculate the same amount for him again if you'd like."*

#### Budget Management
**User**: "Set up a 3000 SEK budget for January birthday gifts."

**AI Response**: Uses `set_budget` with amount=3000, fromDate="2025-01-01", toDate="2025-01-31", description="Birthday gifts"
*"✅ Created budget: **3000 SEK for Birthday gifts** (January 1-31, 2025). I'll track your spending against this budget automatically."*

#### Naughty List Management
**User**: "Kevin was really rude at the office party. Add him to the naughty list."

**AI Response**: Uses `add_to_naughty_list` with name="Kevin"
*"😈 Kevin has been added to the naughty list. He'll automatically receive 0 (no gift) in future calculations, regardless of other parameters."*

#### Configuration Review
**User**: "What are my current default gift settings?"

**AI Response**: Uses `get_config`
*"📋 Your current gift-calc configuration:
- **Base Value**: 70 SEK
- **Variation**: 20%
- **Default Friend Score**: 5
- **Default Nice Score**: 5
- **Currency**: SEK"*

### Complex Scenarios

#### Multi-Person Gift Planning
**User**: "I need to calculate gifts for my Christmas list: Alice (best friend), Bob (coworker), and Charlie (acquaintance). Budget is 100 SEK each."

**AI Response**: Uses multiple `calculate_gift_amount` calls
*"Here are your Christmas gift amounts:
- **Alice** (best friend): 108.75 SEK
- **Bob** (coworker): 97.50 SEK  
- **Charlie** (acquaintance): 87.25 SEK
**Total**: 293.50 SEK"*

#### Budget Tracking
**User**: "How am I doing on my Christmas budget after those calculations?"

**AI Response**: Uses `get_budget_status`
*"📊 Christmas Budget Status:
- **Total**: 5000 SEK
- **Spent**: 1,247.50 SEK 
- **Remaining**: 3,752.50 SEK (75% left)
- **Time Left**: 18 days
- **Daily Average Available**: 208.47 SEK"*

#### Spending Pattern Analysis
**User**: "Show me my gift spending patterns over the last 3 months"

**AI Response**: Uses `get_spendings` with months=3
*"📊 Spending Analysis (2025-06-12 to 2025-09-12)

💰 Total Spending:
  2,847.50 SEK
  45.00 EUR

📝 Transaction Details:
2025-07-15  150.00 SEK for Emma
2025-08-02  200.00 SEK for Michael  
2025-08-20  120.75 SEK for Sarah
2025-09-05  45.00 EUR for David
2025-09-10  97.50 SEK for Lisa

Total: 5 gifts across 2 currencies"*

## Development & Testing

### Manual Testing

Test the MCP server directly using JSON-RPC commands:

```bash
# Start the server
node bin/mcp-server.js

# Test initialize (in another terminal)
echo '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-06-18","capabilities":{},"clientInfo":{"name":"test","version":"1.0.0"}}}' | node bin/mcp-server.js

# List available tools
echo '{"jsonrpc":"2.0","id":2,"method":"tools/list","params":{}}' | node bin/mcp-server.js

# Test calculate_gift_amount tool
echo '{"jsonrpc":"2.0","id":3,"method":"tools/call","params":{"name":"calculate_gift_amount","arguments":{"baseValue":100,"friendScore":8,"name":"Alice"}}}' | node bin/mcp-server.js
```

### Integration Testing

Use the automated test suite:

```bash
npm test
# Includes MCP server tests
```

### Debugging

Enable debug output (goes to stderr):

```bash
DEBUG=1 gift-calc-mcp
```

Debug messages include:
- Tool registration confirmations
- Parameter validation details
- Error handling information
- Client connection status

## Troubleshooting

### Common Issues

#### MCP Server Not Found
**Error**: `command not found: gift-calc-mcp`

**Solution**: 
```bash
# Reinstall gift-calc
npm install -g gift-calc

# Verify installation
which gift-calc-mcp
npm list -g gift-calc
```

#### Claude Desktop Not Connecting
**Symptoms**: No MCP indicator (🔌) in Claude Desktop

**Solutions**:
1. **Check configuration file location**:
   ```bash
   # macOS
   ls -la "~/Library/Application Support/Claude/claude_desktop_config.json"
   
   # Windows
   dir "%APPDATA%\Claude\claude_desktop_config.json"
   ```

2. **Validate JSON syntax**:
   ```bash
   # Use a JSON validator or
   node -e "console.log(JSON.parse(require('fs').readFileSync('path/to/config.json', 'utf8')))"
   ```

3. **Check permissions**:
   ```bash
   chmod +x $(which gift-calc-mcp)
   ```

4. **Restart Claude Desktop** completely (quit and reopen)

#### Tool Validation Errors
**Error**: Parameter validation failures

**Solution**: Check parameter types and requirements:
```bash
# Test tool schema
echo '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}' | gift-calc-mcp | jq '.result.tools[0].inputSchema'
```

#### Connection Timeouts
**Error**: MCP server startup timeouts

**Solutions**:
1. **Test server directly**:
   ```bash
   timeout 5s gift-calc-mcp
   ```

2. **Check for blocking processes**:
   ```bash
   lsof -i :stdio  # Check if STDIO is blocked
   ```

3. **Clear configuration cache**:
   ```bash
   rm -rf ~/.config/gift-calc/.config.json
   gift-calc init-config  # Recreate config
   ```

### Debug Commands

```bash
# Test MCP server responsiveness
echo '{"jsonrpc":"2.0","id":1,"method":"ping"}' | timeout 3s gift-calc-mcp

# Validate gift-calc installation
gift-calc --version
gift-calc --help

# Check configuration
gift-calc log  # Should show calculation history

# Test core functionality
gift-calc -b 100 --name "Test"
```

### Getting Help

1. **Check logs**:
   ```bash
   gift-calc log  # View calculation history
   cat ~/.config/gift-calc/gift-calc.log  # Debug log (if exists)
   ```

2. **GitHub Issues**: [Report bugs](https://github.com/gift-calc/gift-calc/issues)

3. **Discussions**: [Community help](https://github.com/gift-calc/gift-calc/discussions)

## Security & Safety

### Tool Safety Annotations

All MCP tools are properly categorized:

- **Read-Only Tools** (`isReadOnly: true`): 
  - `calculate_gift_amount`, `match_previous_gift`, `check_naughty_list`
  - `get_config`, `get_budget_status`, `get_calculation_history`, `get_spendings`
  - Safe to use without confirmation

- **Destructive Tools** (`isReadOnly: false`):
  - `set_budget`, `add_to_naughty_list`, `remove_from_naughty_list`, `init_config`
  - Modify files or configuration
  - Most MCP clients will request user confirmation

### Data Privacy

- **Local Only**: All data stays on your machine
- **No Network Calls**: MCP server doesn't make external requests
- **File Permissions**: Uses standard user permissions for config files
- **No Telemetry**: No usage data collection

### Input Validation

- **Parameter Validation**: All inputs validated against JSON schema
- **Range Checking**: Numeric values validated for sensible ranges
- **Sanitization**: String inputs sanitized to prevent injection
- **Error Handling**: Graceful error responses for invalid inputs

### Best Practices

1. **Review Destructive Actions**: Always review what destructive tools will do
2. **Backup Configuration**: Back up `~/.config/gift-calc/` directory
3. **Test First**: Use read-only tools to verify behavior
4. **Monitor Budgets**: Regular budget status checks prevent overspending

---

**Need Help?** 
- Run `gift-calc --help` for CLI reference
- Check the [main README](README.md) for general usage
- Visit [GitHub Issues](https://github.com/gift-calc/gift-calc/issues) for support
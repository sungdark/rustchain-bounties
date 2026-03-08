# RustChain MCP Server

MCP (Model Context Protocol) server for interacting with RustChain directly from Claude Code.

## Features

### Core Tools (75 RTC tier)
- `rustchain_balance` - Check RTC balance for any wallet
- `rustchain_miners` - List active miners and their architectures
- `rustchain_epoch` - Get current epoch info (slot, height, rewards)
- `rustchain_health` - Check node health across all 3 attestation nodes
- `rustchain_transfer` - Send RTC (requires wallet key)

### Bonus Tools (100 RTC tier)
- `rustchain_ledger` - Query transaction history
- `rustchain_register_wallet` - Create a new wallet
- `rustchain_bounties` - List open bounties with rewards

## Installation

### 1. Install from npm
```bash
npm install -g rustchain-mcp-server
```

### 2. Add to Claude MCP config
Add this to your Claude MCP configuration (usually at `~/.config/claude-mcp/config.json`):

```json
{
  "mcpServers": {
    "rustchain": {
      "command": "npx",
      "args": ["rustchain-mcp-server"]
    }
  }
}
```

### 3. Restart Claude Code
The RustChain tools will now be available in your Claude Code sidebar.

## Usage Examples

### Check wallet balance
```
Use the rustchain_balance tool with miner_id "your-wallet-id"
```

### Check node health
```
Use the rustchain_health tool to see if all nodes are online
```

### List active miners
```
Use the rustchain_miners tool to see who's mining
```

## Technical Details

- Built with TypeScript and the official MCP SDK
- Auto-failover between 3 RustChain attestation nodes
- No external dependencies beyond Node.js 18+
- Works with any MCP-compatible client (not just Claude Code)

## Development

```bash
# Install dependencies
npm install

# Build
npm run build

# Run dev server
npm run dev
```

## License
MIT

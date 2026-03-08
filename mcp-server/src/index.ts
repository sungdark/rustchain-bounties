import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import axios from "axios";
import https from "https";

const NODES = [
  "https://50.28.86.131",
  "https://50.28.86.132",
  "https://50.28.86.133"
];

const httpsAgent = new https.Agent({
  rejectUnauthorized: false,
});

async function request(path: string, method: string = "GET", data?: any): Promise<any> {
  for (const node of NODES) {
    try {
      const response = await axios({
        url: `${node}${path}`,
        method,
        data,
        httpsAgent,
        timeout: 5000,
      });
      return response.data;
    } catch (e) {
      console.warn(`Node ${node} failed: ${(e as Error).message}, trying next...`);
    }
  }
  throw new Error("All nodes are down");
}

const server = new Server(
  {
    name: "rustchain-mcp-server",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "rustchain_balance",
        description: "Check RTC balance for any wallet",
        inputSchema: {
          type: "object",
          properties: {
            miner_id: {
              type: "string",
              description: "Wallet/miner ID to check balance for"
            }
          },
          required: ["miner_id"]
        }
      },
      {
        name: "rustchain_miners",
        description: "List active miners and their architectures"
      },
      {
        name: "rustchain_epoch",
        description: "Get current epoch info (slot, height, rewards)"
      },
      {
        name: "rustchain_health",
        description: "Check node health across all 3 attestation nodes"
      },
      {
        name: "rustchain_transfer",
        description: "Send RTC (requires wallet key)",
        inputSchema: {
          type: "object",
          properties: {
            from_wallet: { type: "string", description: "Sender wallet ID" },
            to_wallet: { type: "string", description: "Recipient wallet ID" },
            amount: { type: "number", description: "Amount of RTC to send" },
            private_key: { type: "string", description: "Sender wallet private key" }
          },
          required: ["from_wallet", "to_wallet", "amount", "private_key"]
        }
      },
      {
        name: "rustchain_ledger",
        description: "Query transaction history",
        inputSchema: {
          type: "object",
          properties: {
            wallet_id: { type: "string", description: "Wallet ID to get history for" }
          },
          required: ["wallet_id"]
        }
      },
      {
        name: "rustchain_register_wallet",
        description: "Create a new wallet"
      },
      {
        name: "rustchain_bounties",
        description: "List open bounties with rewards"
      }
    ]
  };
});

server.setRequestHandler(CallToolRequestSchema, async (req) => {
  try {
    switch (req.params.name) {
      case "rustchain_balance": {
        const { miner_id } = req.params.arguments as any;
        const data = await request(`/wallet/balance?miner_id=${miner_id}`);
        return {
          content: [{ type: "text", text: JSON.stringify(data, null, 2) }]
        };
      }

      case "rustchain_miners": {
        const data = await request("/api/miners");
        return {
          content: [{ type: "text", text: JSON.stringify(data, null, 2) }]
        };
      }

      case "rustchain_epoch": {
        const data = await request("/epoch");
        return {
          content: [{ type: "text", text: JSON.stringify(data, null, 2) }]
        };
      }

      case "rustchain_health": {
        const healthStatus = [];
        for (const node of NODES) {
          try {
            const start = Date.now();
            await axios.get(`${node}/health`, { httpsAgent, timeout: 3000 });
            healthStatus.push({ node, status: "healthy", latency: `${Date.now() - start}ms` });
          } catch (e) {
            healthStatus.push({ node, status: "unhealthy", error: (e as Error).message });
          }
        }
        return {
          content: [{ type: "text", text: JSON.stringify(healthStatus, null, 2) }]
        };
      }

      case "rustchain_transfer": {
        const { from_wallet, to_wallet, amount, private_key } = req.params.arguments as any;
        const data = await request("/wallet/transfer", "POST", {
          from: from_wallet,
          to: to_wallet,
          amount,
          key: private_key
        });
        return {
          content: [{ type: "text", text: JSON.stringify(data, null, 2) }]
        };
      }

      case "rustchain_ledger": {
        const { wallet_id } = req.params.arguments as any;
        const data = await request(`/wallet/ledger?miner_id=${wallet_id}`);
        return {
          content: [{ type: "text", text: JSON.stringify(data, null, 2) }]
        };
      }

      case "rustchain_register_wallet": {
        const data = await request("/wallet/register", "POST");
        return {
          content: [{ type: "text", text: JSON.stringify(data, null, 2) }]
        };
      }

      case "rustchain_bounties": {
        const data = await request("/api/bounties");
        return {
          content: [{ type: "text", text: JSON.stringify(data, null, 2) }]
        };
      }

      default:
        throw new Error(`Unknown tool: ${req.params.name}`);
    }
  } catch (error) {
    return {
      content: [{ type: "text", text: `Error: ${(error as Error).message}` }],
      isError: true
    };
  }
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("RustChain MCP Server running on stdio");
}

main().catch((error) => {
  console.error("Server error:", error);
  process.exit(1);
});

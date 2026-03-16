import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

export async function createAndStartServer(
  name: string,
  version: string,
  registerTools: (server: McpServer) => void
): Promise<void> {
  const server = new McpServer({ name, version });
  registerTools(server);
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error(`[MCP:${name}] started`);
}
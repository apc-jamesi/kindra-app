// Minimal MCP stdio server helper (newline-delimited JSON-RPC 2.0), no dependencies.
// Used by the project-local MCP servers in this folder, which .mcp.json launches.
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createInterface } from "node:readline";

export const projectRoot = join(dirname(fileURLToPath(import.meta.url)), "..", "..");

// Same precedence as Next.js: real environment > .env.local > .env (loadEnvFile never overwrites).
export function loadProjectEnv() {
  for (const file of [".env.local", ".env"]) {
    const path = join(projectRoot, file);
    if (existsSync(path)) process.loadEnvFile(path);
  }
}

export function text(value) {
  return { content: [{ type: "text", text: typeof value === "string" ? value : JSON.stringify(value, null, 2) }] };
}

/**
 * @param {{ name: string, version: string, tools: Array<{ name: string, description: string, inputSchema: object, handler: (args: any) => Promise<any> }> }} server
 */
export function serve({ name, version, tools }) {
  const byName = new Map(tools.map((t) => [t.name, t]));
  const send = (msg) => process.stdout.write(JSON.stringify({ jsonrpc: "2.0", ...msg }) + "\n");
  const log = (...a) => process.stderr.write(`[${name}] ${a.join(" ")}\n`);

  async function handle(req) {
    switch (req.method) {
      case "initialize":
        return {
          protocolVersion: req.params?.protocolVersion ?? "2025-06-18",
          capabilities: { tools: {} },
          serverInfo: { name, version },
        };
      case "ping":
        return {};
      case "tools/list":
        return { tools: tools.map(({ name, description, inputSchema }) => ({ name, description, inputSchema })) };
      case "tools/call": {
        const tool = byName.get(req.params?.name);
        if (!tool) throw Object.assign(new Error(`Unknown tool: ${req.params?.name}`), { code: -32602 });
        try {
          return await tool.handler(req.params?.arguments ?? {});
        } catch (err) {
          return { ...text(`Error: ${err?.message ?? err}`), isError: true };
        }
      }
      default:
        throw Object.assign(new Error(`Method not found: ${req.method}`), { code: -32601 });
    }
  }

  createInterface({ input: process.stdin }).on("line", async (line) => {
    if (!line.trim()) return;
    let req;
    try {
      req = JSON.parse(line);
    } catch {
      return send({ id: null, error: { code: -32700, message: "Parse error" } });
    }
    if (req.id === undefined) return; // notification (e.g. notifications/initialized)
    try {
      send({ id: req.id, result: await handle(req) });
    } catch (err) {
      send({ id: req.id, error: { code: err.code ?? -32603, message: err.message } });
    }
  });
  log("ready");
}

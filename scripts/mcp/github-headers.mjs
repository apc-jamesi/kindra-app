// headersHelper for the GitHub MCP server in .mcp.json: prints the auth header as JSON,
// so the token stays in .env / .env.local (GITHUB_PERSONAL_ACCESS_TOKEN) and out of .mcp.json.
import { loadProjectEnv } from "./lib.mjs";

loadProjectEnv();
const token = process.env.GITHUB_PERSONAL_ACCESS_TOKEN;
if (!token) {
  process.stderr.write("GITHUB_PERSONAL_ACCESS_TOKEN is not set in .env / .env.local\n");
  process.exit(1);
}
process.stdout.write(JSON.stringify({ Authorization: `Bearer ${token}` }));

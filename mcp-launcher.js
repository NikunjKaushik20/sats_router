#!/usr/bin/env node
/**
 * SatsRouter MCP Launcher
 * Forces the correct CWD and spawns the MCP server via tsx.
 * Used by Claude Desktop to sidestep the MSIX cwd bug.
 */
const { spawn } = require("child_process");
const path = require("path");

const PROJECT_DIR = "d:\\Hack_Nation\\satsrouter";
const SERVER_SCRIPT = path.join(PROJECT_DIR, "src", "mcp", "server.ts");

const child = spawn(
  process.platform === "win32" ? "npx.cmd" : "npx",
  ["tsx", SERVER_SCRIPT],
  {
    cwd: PROJECT_DIR,
    stdio: "inherit",
    env: {
      ...process.env,
      SATSROUTER_URL: process.env.SATSROUTER_URL || "http://localhost:3000",
    },
  }
);

child.on("exit", (code) => process.exit(code ?? 0));
child.on("error", (err) => {
  process.stderr.write(`MCP launcher error: ${err.message}\n`);
  process.exit(1);
});

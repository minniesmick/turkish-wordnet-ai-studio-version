import express from "express";
import { createServer as createViteServer } from "vite";
import { createProxyMiddleware } from "http-proxy-middleware";
import { spawn, ChildProcess } from "child_process";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 3000;
const PYTHON_PORT = 8770;

let pyProc: ChildProcess | null = null;

function startPythonBackend() {
  const env = { ...process.env, PORT: String(PYTHON_PORT) };
  pyProc = spawn("python3", ["server.py"], {
    cwd: __dirname,
    env,
    stdio: ["pipe", "pipe", "pipe"],
  });

  pyProc.stdout?.on("data", (data) => {
    const msg = data.toString().trim();
    if (msg) console.log(`[Python] ${msg}`);
  });

  pyProc.stderr?.on("data", (data) => {
    const msg = data.toString().trim();
    if (msg) console.error(`[Python err] ${msg}`);
  });

  pyProc.on("exit", (code, signal) => {
    console.log(`[Python exit] code=${code} signal=${signal}`);
  });
}

async function startServer() {
  startPythonBackend();

  const app = express();

  // Proxy /api requests to python server
  app.use(
    "/api",
    createProxyMiddleware({
      target: `http://127.0.0.1:${PYTHON_PORT}`,
      changeOrigin: true,
      pathRewrite: (p) => `/api${p}`,
      on: {
        error: (err: any, _req: any, res: any) => {
          console.warn("[Proxy retry] python server warming up...", err.message);
          if (res && !res.headersSent && typeof res.status === "function") {
            res.status(503).json({ loading: true });
          }
        },
      },
    })
  );

  const isProduction = process.env.NODE_ENV === "production";

  if (!isProduction) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, "dist");
    if (fs.existsSync(distPath)) {
      app.use(express.static(distPath));
      app.get("*", (_req, res) => {
        res.sendFile(path.resolve(distPath, "index.html"));
      });
    } else {
      console.warn("dist directory not found; building first is recommended.");
    }
  }

  const server = app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server listening on http://0.0.0.0:${PORT}`);
  });

  const cleanup = () => {
    if (pyProc) {
      pyProc.kill("SIGTERM");
      pyProc = null;
    }
    server.close();
    process.exit(0);
  };

  process.on("SIGINT", cleanup);
  process.on("SIGTERM", cleanup);
}

startServer().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});

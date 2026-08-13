// src/server.ts
import express, { Request, Response } from "express";
import { config } from "./config.js";
import { webhookRouter } from "./webhook/chatwoot.js";
import { startWorker } from "./jobs/worker.js";

const app = express();

// Keep raw body for HMAC signature verification
app.use(
  express.json({
    verify: (req: Request, _res: Response, buf: Buffer) => {
      (req as Request & { rawBody?: Buffer }).rawBody = buf;
    },
  })
);

app.use("/webhook", webhookRouter);

app.get("/health", (_req: Request, res: Response) => {
  res.json({ status: "ok" });
});

app.listen(config.port, () => {
  console.log(`[Server] Listening on port ${config.port}`);
  startWorker();
});

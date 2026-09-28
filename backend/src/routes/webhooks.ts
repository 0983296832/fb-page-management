import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import crypto from "crypto";

const router = Router();
const prisma = new PrismaClient();

// Verification GET
router.get("/", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];
  if (mode === "subscribe" && token === process.env.META_WEBHOOK_VERIFY_TOKEN) {
    return res.status(200).send(challenge);
  }
  res.sendStatus(403);
});

// POST - raw body is available on req.body as Buffer because of bodyParser.raw
router.post("/", async (req: any, res) => {
  try {
    const sig = req.headers["x-hub-signature-256"] as string | undefined;
    const bodyBuf: Buffer = req.body;
    // verify signature if set
    if (process.env.META_APP_SECRET && sig) {
      const hmac = crypto.createHmac(
        "sha256",
        process.env.META_APP_SECRET as string,
      );
      hmac.update(bodyBuf);
      const expected = `sha256=${hmac.digest("hex")}`;
      if (!crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(sig))) {
        return res.sendStatus(401);
      }
    }

    const raw = JSON.parse(bodyBuf.toString("utf8"));
    // enqueue event using worker queue
    const eventId = raw?.entry?.[0]?.id || undefined;
    const { enqueueWebhookEvent } = require("../worker/webhookWorker");
    await enqueueWebhookEvent(eventId, raw);
    res.json({ ok: true });
  } catch (err) {
    console.error("webhook error", err);
    res.sendStatus(500);
  }
});

export default router;

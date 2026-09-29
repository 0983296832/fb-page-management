import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import crypto from "crypto";

const router = Router();
const prisma = new PrismaClient();

function bodyToBuffer(body: unknown) {
  if (Buffer.isBuffer(body)) return body;
  if (typeof body === "string") return Buffer.from(body, "utf8");
  return Buffer.from(JSON.stringify(body || {}), "utf8");
}

// Verification GET
router.get("/", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];
  if (mode === "subscribe" && token === process.env.META_WEBHOOK_VERIFY_TOKEN) {
    return res.status(200).type("text/plain").send(String(challenge));
  }
  res.sendStatus(403);
});

router.post("/", async (req: any, res) => {
  try {
    const sig = req.headers["x-hub-signature-256"] as string | undefined;
    const bodyBuf = bodyToBuffer(req.body);

    if (process.env.META_APP_SECRET && sig && Buffer.isBuffer(req.body)) {
      const hmac = crypto.createHmac("sha256", process.env.META_APP_SECRET);
      hmac.update(bodyBuf);
      const expected = Buffer.from(`sha256=${hmac.digest("hex")}`);
      const received = Buffer.from(sig);
      if (expected.length !== received.length || !crypto.timingSafeEqual(expected, received)) {
        return res.sendStatus(401);
      }
    }

    const raw = Buffer.isBuffer(req.body) ? JSON.parse(bodyBuf.toString("utf8")) : req.body;
    const firstMessaging = raw?.entry?.[0]?.messaging?.[0];
    const eventId =
      firstMessaging?.message?.mid ||
      firstMessaging?.delivery?.mids?.[0] ||
      firstMessaging?.read?.watermark ||
      raw?.entry?.[0]?.time ||
      `${raw?.entry?.[0]?.id || "event"}-${Date.now()}`;
    const { enqueueWebhookEvent } = require("../worker/webhookWorker");
    await enqueueWebhookEvent(String(eventId), raw);
    res.json({ ok: true });
  } catch (err) {
    console.error("webhook error", err);
    res.sendStatus(500);
  }
});

export default router;

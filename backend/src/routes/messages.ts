import { Router } from "express";
import { PrismaClient } from "@prisma/client";

const router = Router();
const prisma = new PrismaClient();

router.post("/:id/retry", async (req, res) => {
  const id = req.params.id;
  const msg = await prisma.message.findUnique({ where: { id } });
  if (!msg) return res.status(404).json({ error: "not found" });
  try {
    // set to SENDING and enqueue
    await prisma.message.update({ where: { id }, data: { state: "SENDING" } });
    const { enqueueSendMessage } = require("../worker/sendWorker");
    await enqueueSendMessage(id);
    res.json({ ok: true });
  } catch (err: any) {
    console.error("retry failed", err?.message || String(err));
    res.status(500).json({ error: "retry failed" });
  }
});

export default router;

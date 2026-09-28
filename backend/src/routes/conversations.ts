import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import { io } from "../main";

const router = Router();
const prisma = new PrismaClient();

router.get("/", async (req, res) => {
  const orgId = req.query.orgId as string;
  if (!orgId) return res.status(400).json({ error: "missing orgId" });
  const convs = await prisma.conversation.findMany({
    where: { organizationId: orgId },
    orderBy: { lastMessageAt: "desc" },
    take: 50,
  });
  res.json({ convs });
});

router.get("/:id", async (req, res) => {
  const id = req.params.id;
  const conv = await prisma.conversation.findUnique({
    where: { id },
    include: { messages: { orderBy: { createdAt: "asc" } } },
  });
  if (!conv) return res.status(404).json({ error: "not found" });
  res.json({ conv });
});

router.post("/:id/messages", async (req, res) => {
  const id = req.params.id;
  const { text, senderId } = req.body;
  // create message with SENDING state
  const msg = await prisma.message.create({
    data: {
      conversationId: id,
      organizationId: req.body.orgId || "",
      senderType: "AGENT",
      messageType: "TEXT",
      text,
      senderId,
      state: "SENDING",
    },
  });
  // emit realtime to org room
  const conv = await prisma.conversation.findUnique({ where: { id } });
  if (conv) {
    io.to(`org:${conv.organizationId}`).emit("message", {
      conversationId: id,
      message: msg,
    });
  }

  // attempt to send to Meta and update state
  // enqueue background send job
  try {
    const { enqueueSendMessage } = require("../worker/sendWorker");
    enqueueSendMessage(msg.id).catch((e: any) =>
      console.error("enqueue send failed", e),
    );
  } catch (e) {
    console.error("send worker missing", e);
  }

  res.json({ msg });
});

export default router;

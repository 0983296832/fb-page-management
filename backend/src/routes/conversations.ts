import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import { io } from "../main";

const router = Router();
const prisma = new PrismaClient();

async function enrichConversation(conv: any) {
  const [customer, page] = await Promise.all([
    prisma.customer.findFirst({
      where: {
        organizationId: conv.organizationId,
        channel: "facebook",
        externalCustomerId: conv.channelConversationId,
      },
    }),
    conv.pageId
      ? prisma.facebookPage.findUnique({ where: { pageId: conv.pageId } })
      : Promise.resolve(null),
  ]);

  return {
    ...conv,
    customer: customer
      ? {
          id: customer.id,
          name: customer.name || `Facebook user ${customer.externalCustomerId}`,
          avatar: customer.avatar,
          externalCustomerId: customer.externalCustomerId,
        }
      : {
          id: conv.channelConversationId,
          name: `Facebook user ${conv.channelConversationId}`,
          avatar: null,
          externalCustomerId: conv.channelConversationId,
        },
    page: page
      ? {
          id: page.id,
          pageId: page.pageId,
          name: page.name,
          avatar: page.avatar,
          status: page.status,
        }
      : null,
  };
}

router.get("/", async (req, res) => {
  const orgId = req.query.orgId as string;
  const pageId = req.query.pageId as string | undefined;
  if (!orgId) return res.status(400).json({ error: "missing orgId" });

  const convs = await prisma.conversation.findMany({
    where: {
      organizationId: orgId,
      ...(pageId && pageId !== "all" ? { pageId } : {}),
    },
    orderBy: [{ lastMessageAt: "desc" }, { updatedAt: "desc" }],
    take: 50,
  });

  res.json({ convs: await Promise.all(convs.map(enrichConversation)) });
});

router.get("/:id", async (req, res) => {
  const id = req.params.id;
  const conv = await prisma.conversation.findUnique({
    where: { id },
    include: { messages: { orderBy: { createdAt: "asc" } } },
  });
  if (!conv) return res.status(404).json({ error: "not found" });
  res.json({ conv: await enrichConversation(conv) });
});

router.post("/:id/messages", async (req, res) => {
  const id = req.params.id;
  const { text, senderId } = req.body;
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

  const conv = await prisma.conversation.findUnique({ where: { id } });
  if (conv) {
    io.to(`org:${conv.organizationId}`).emit("message", {
      conversationId: id,
      message: msg,
    });
  }

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

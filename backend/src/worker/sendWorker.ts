import { Queue, Worker } from "bullmq";
import IORedis from "ioredis";
import { PrismaClient } from "@prisma/client";
import axios from "axios";
import { MetaMessengerService } from "../services/meta";
import { decrypt } from "../lib/crypto";

const connection = new IORedis(
  process.env.REDIS_URL || "redis://localhost:6379",
);
const prisma = new PrismaClient();

const sendQueue = new Queue("send-messages", { connection });

const worker = new Worker(
  "send-messages",
  async (job) => {
    const { messageId } = job.data as { messageId: string };
    const message = await prisma.message.findUnique({
      where: { id: messageId },
    });
    if (!message) throw new Error("message not found");

    const conv = await prisma.conversation.findUnique({
      where: { id: message.conversationId },
    });
    if (!conv) throw new Error("conversation not found");

    const page = conv.pageId
      ? await prisma.facebookPage.findUnique({ where: { pageId: conv.pageId } })
      : null;
    if (!page) throw new Error("no page configured for conversation");

    const token = decrypt(page.accessToken as any);
    const resp = await MetaMessengerService.sendMessage(
      token,
      conv.channelConversationId || "",
      { text: message.text || "" },
    );

    await prisma.message.update({
      where: { id: message.id },
      data: {
        state: "SENT",
        externalMessageId: resp?.message_id || resp?.mid || null,
      },
    });

    // notify main server about update
    try {
      const internalSecret = process.env.INTERNAL_API_SECRET || "dev_secret";
      await axios.post(
        (process.env.API_URL || "http://localhost:4000") + "/api/internal/emit",
        {
          orgId: conv.organizationId,
          type: "message_update",
          payload: { conversationId: conv.id, messageId: message.id },
        },
        { headers: { "x-internal-secret": internalSecret } },
      );
    } catch (err: any) {
      console.error("internal emit failed", err?.message || String(err));
    }
  },
  { connection },
);

worker.on("failed", async (job, err) => {
  try {
    const attempts = job.attemptsMade || 0;
    const max = (job.opts && (job.opts as any).attempts) || 0;
    const data: any = job.data;
    if (data && data.messageId && attempts >= max) {
      await prisma.message.update({
        where: { id: data.messageId },
        data: { state: "FAILED" },
      });
      // notify main server about failed state
      const message = await prisma.message.findUnique({
        where: { id: data.messageId },
      });
      if (message) {
        const conv = await prisma.conversation.findUnique({
          where: { id: message.conversationId },
        });
        if (conv) {
          const internalSecret =
            process.env.INTERNAL_API_SECRET || "dev_secret";
          await axios.post(
            (process.env.API_URL || "http://localhost:4000") +
              "/api/internal/emit",
            {
              orgId: conv.organizationId,
              type: "message_update",
              payload: { conversationId: conv.id, messageId: message.id },
            },
            { headers: { "x-internal-secret": internalSecret } },
          );
        }
      }
    }
  } catch (e) {
    console.error("failed handler error", e);
  }
});

export async function enqueueSendMessage(messageId: string) {
  await sendQueue.add(
    "send",
    { messageId },
    { attempts: 5, backoff: { type: "exponential", delay: 1000 } },
  );
}

export default worker;

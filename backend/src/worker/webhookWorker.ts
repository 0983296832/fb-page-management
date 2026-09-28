import { Worker, Queue } from "bullmq";
import IORedis from "ioredis";
import { PrismaClient } from "@prisma/client";
import axios from "axios";

const connection = new IORedis(
  process.env.REDIS_URL || "redis://localhost:6379",
);
const prisma = new PrismaClient();

const webhookQueue = new Queue("webhook-events", { connection });

// Helper: normalize messaging events from Facebook webhook payload
function extractMessagingEvents(raw: any) {
  const entries = raw.entry || [];
  const events: any[] = [];
  for (const e of entries) {
    const pageId = e.id;
    for (const change of e.changes || []) {
      const value = change.value;
      if (value?.messaging) {
        for (const m of value.messaging) {
          events.push({ pageId, ...m });
        }
      }
      if (value?.messages) {
        for (const m of value.messages) {
          events.push({ pageId, ...m });
        }
      }
      // legacy: entry.messaging
      if (e.messaging) {
        for (const m of e.messaging) {
          events.push({ pageId, ...m });
        }
      }
    }
  }
  return events;
}

const worker = new Worker(
  "webhook-events",
  async (job) => {
    const { webhookEventId } = job.data;
    const ev = await prisma.webhookEvent.findUnique({
      where: { id: webhookEventId },
    });
    if (!ev) return;
    await prisma.webhookEvent.update({
      where: { id: webhookEventId },
      data: { status: "PROCESSING" },
    });
    try {
      const raw = ev.raw as any;
      const events = extractMessagingEvents(raw);
      for (const item of events) {
        // item may include sender, recipient, message
        const senderId = item.sender?.id || item.from?.id || item.author?.id;
        const recipientId = item.recipient?.id || item.to?.id;
        const pageId = item.pageId || recipientId || raw.entry?.[0]?.id;
        // find organization by page
        const page = await prisma.facebookPage.findUnique({
          where: { pageId: String(pageId) },
        });
        const orgId = page?.organizationId;
        // create/find customer
        let customer = null;
        if (orgId && senderId) {
          customer = await prisma.customer.findFirst({
            where: {
              organizationId: orgId,
              identities: {
                some: { provider: "facebook", externalId: String(senderId) },
              },
            },
            include: { identities: true },
          });
          if (!customer) {
            customer = await prisma.customer.create({
              data: {
                organizationId: orgId,
                channel: "facebook",
                externalCustomerId: String(senderId),
                name: null,
              },
            });
            await prisma.customerIdentity.create({
              data: {
                customerId: customer.id,
                provider: "facebook",
                externalId: String(senderId),
                metadata: item,
              },
            });
          }
        }
        // create/find conversation: use channelConversationId = senderId (simplified)
        let conv = null;
        if (orgId && senderId) {
          conv = await prisma.conversation.findFirst({
            where: {
              organizationId: orgId,
              channel: "facebook",
              channelConversationId: String(senderId),
            },
          });
          if (!conv) {
            conv = await prisma.conversation.create({
              data: {
                organizationId: orgId,
                channel: "facebook",
                channelConversationId: String(senderId),
                pageId: String(pageId),
                status: "OPEN",
                createdAt: new Date(),
                updatedAt: new Date(),
              },
            });
          }
        }
        // create message
        if (conv) {
          const externalId =
            item.message?.mid ||
            item.message?.id ||
            item.mid ||
            item.message_id ||
            item.id;
          const text =
            item.message?.text ||
            item.text ||
            (item.message && item.message.text);
          const message = await prisma.message.create({
            data: {
              organizationId: orgId || "",
              conversationId: conv.id,
              externalMessageId: externalId ? String(externalId) : undefined,
              senderType: "CUSTOMER",
              messageType: "TEXT",
              text: text || null,
              sentAt: new Date(),
            },
          });
          // update conversation
          await prisma.conversation.update({
            where: { id: conv.id },
            data: {
              lastMessage: message.text || "",
              lastMessageAt: new Date(),
              unreadCount: { increment: 1 },
            },
          });
          // notify main server via internal HTTP endpoint to emit realtime
          try {
            const internalSecret =
              process.env.INTERNAL_API_SECRET || "dev_secret";
            await axios.post(
              (process.env.API_URL || "http://localhost:4000") +
                "/api/internal/emit",
              {
                orgId,
                type: "message",
                payload: { conversationId: conv.id, message },
              },
              { headers: { "x-internal-secret": internalSecret } },
            );
          } catch (err) {
            const e: any = err;
            console.error("internal emit failed", e?.message || String(e));
          }
        }
      }

      await prisma.webhookEvent.update({
        where: { id: webhookEventId },
        data: { status: "PROCESSED", processedAt: new Date() },
      });
    } catch (err) {
      console.error("worker failed", err);
      await prisma.webhookEvent.update({
        where: { id: webhookEventId },
        data: { status: "FAILED" },
      });
      throw err;
    }
  },
  { connection },
);

export async function enqueueWebhookEvent(eventId: string, raw: any) {
  const rec = await prisma.webhookEvent.create({ data: { eventId, raw } });
  await webhookQueue.add("process", { webhookEventId: rec.id });
}

export default worker;

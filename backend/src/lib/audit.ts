import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

export async function recordAudit(opts: {
  organizationId?: string;
  userId?: string;
  action: string;
  entity: string;
  entityId?: string;
  metadata?: any;
}) {
  await prisma.auditLog.create({
    data: {
      organizationId: opts.organizationId,
      userId: opts.userId,
      action: opts.action,
      entity: opts.entity,
      entityId: opts.entityId,
      metadata: opts.metadata,
    },
  });
}

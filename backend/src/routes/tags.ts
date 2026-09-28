import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import { recordAudit } from "../lib/audit";

const router = Router();
const prisma = new PrismaClient();

router.get("/", async (req, res) => {
  const orgId = req.query.orgId as string;
  if (!orgId) return res.status(400).json({ error: "missing orgId" });
  const tags = await prisma.tag.findMany({ where: { organizationId: orgId } });
  res.json({ tags });
});

router.post("/", async (req, res) => {
  const { orgId, name, color, userId } = req.body;
  if (!orgId || !name) return res.status(400).json({ error: "missing" });
  const tag = await prisma.tag.create({
    data: { organizationId: orgId, name, color },
  });
  await recordAudit({
    organizationId: orgId,
    userId,
    action: "tag_created",
    entity: "tag",
    entityId: tag.id,
  });
  res.json({ tag });
});

router.delete("/:id", async (req, res) => {
  const id = req.params.id;
  const tag = await prisma.tag.delete({ where: { id } });
  res.json({ tag });
});

export default router;

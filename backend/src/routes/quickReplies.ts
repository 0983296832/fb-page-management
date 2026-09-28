import { Router } from "express";
import { PrismaClient } from "@prisma/client";

const router = Router();
const prisma = new PrismaClient();

router.get("/", async (req, res) => {
  const orgId = req.query.orgId as string;
  if (!orgId) return res.status(400).json({ error: "missing orgId" });
  const replies = await prisma.quickReply.findMany({
    where: { organizationId: orgId },
  });
  res.json({ replies });
});

router.post("/", async (req, res) => {
  const { orgId, title, shortcut, content } = req.body;
  if (!orgId || !title || !shortcut)
    return res.status(400).json({ error: "missing" });
  const qr = await prisma.quickReply.create({
    data: { organizationId: orgId, title, shortcut, content },
  });
  res.json({ qr });
});

router.delete("/:id", async (req, res) => {
  const id = req.params.id;
  const qr = await prisma.quickReply.delete({ where: { id } });
  res.json({ qr });
});

export default router;

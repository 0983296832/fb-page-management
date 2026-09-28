import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import { requireAuth } from "../middleware/auth";

const prisma = new PrismaClient();
const router = Router();

router.use(requireAuth);

router.get("/members", async (req: any, res) => {
  const orgId = req.user.orgId;
  const members = await prisma.user.findMany({
    where: { organizationId: orgId },
    select: { id: true, email: true, name: true, role: true },
  });
  res.json({ members });
});

router.post("/invite", async (req: any, res) => {
  const { email, role } = req.body;
  const orgId = req.user.orgId;
  if (!email) return res.status(400).json({ error: "missing" });
  const user = await prisma.user.create({
    data: { email, role: role || "AGENT", organizationId: orgId },
  });
  res.json({ user });
});

export default router;

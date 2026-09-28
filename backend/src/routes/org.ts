import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import { verifyToken } from "../lib/jwt";

const prisma = new PrismaClient();
const router = Router();

router.get("/", async (req, res) => {
  const auth = req.headers.authorization?.split(" ")[1];
  const payload: any = auth ? verifyToken(auth) : null;
  if (!payload) return res.status(401).json({ error: "unauth" });
  const org = await prisma.organization.findUnique({
    where: { id: payload.orgId },
    include: { members: true, pages: true },
  });
  res.json({ org });
});

export default router;

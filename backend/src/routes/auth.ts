import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";
import { signToken, verifyToken } from "../lib/jwt";

const prisma = new PrismaClient();
const router = Router();

router.post("/register", async (req, res) => {
  const { email, password, name, organizationName } = req.body;
  if (!email || !password || !organizationName)
    return res.status(400).json({ error: "missing" });

  const hashed = await bcrypt.hash(password, 10);
  // create organization and user
  const org = await prisma.organization.create({
    data: { name: organizationName },
  });
  const user = await prisma.user.create({
    data: {
      email,
      password: hashed,
      name,
      role: "OWNER",
      organizationId: org.id,
    },
  });
  const token = signToken({ userId: user.id, orgId: org.id });
  res.json({ token });
});

router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: "missing" });
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return res.status(400).json({ error: "invalid" });
  const ok = await bcrypt.compare(password, user.password);
  if (!ok) return res.status(400).json({ error: "invalid" });
  const token = signToken({ userId: user.id, orgId: user.organizationId });
  res.json({ token });
});

router.get("/me", async (req, res) => {
  const auth = req.headers.authorization?.split(" ")[1];
  const payload: any = auth ? verifyToken(auth) : null;
  if (!payload) return res.status(401).json({ error: "unauth" });
  const user = await prisma.user.findUnique({
    where: { id: payload.userId },
    include: { organization: true },
  });
  res.json({ user });
});

export default router;

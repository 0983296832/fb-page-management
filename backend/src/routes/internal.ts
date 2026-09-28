import { Router } from "express";
import { io } from "../main";

const router = Router();

// Internal endpoint for worker to ask server to emit events over Socket.IO
router.post("/emit", (req, res) => {
  const secret = req.headers["x-internal-secret"] as string;
  if (
    process.env.INTERNAL_API_SECRET &&
    secret !== process.env.INTERNAL_API_SECRET
  )
    return res.sendStatus(401);
  const { orgId, type, payload } = req.body;
  if (orgId && type) {
    io.to(`org:${orgId}`).emit(type, payload);
    return res.json({ ok: true });
  }
  res.status(400).json({ error: "missing" });
});

export default router;

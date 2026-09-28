import express from "express";
import bodyParser from "body-parser";
import http from "http";
import { Server as IOServer } from "socket.io";
import dotenv from "dotenv";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import { PrismaClient } from "@prisma/client";
import authRouter from "./routes/auth";
import orgRouter from "./routes/org";

dotenv.config();

const prisma = new PrismaClient();
const app = express();
const server = http.createServer(app);
const io = new IOServer(server, { cors: { origin: "*" } });

// simple Socket.IO auth middleware (reads token query)
io.use((socket, next) => {
  const token = socket.handshake.auth?.token || socket.handshake.query?.token;
  // TODO: verify token; for now accept
  if (!token) return next();
  next();
});

io.on("connection", (socket) => {
  console.log("socket connected", socket.id);
  socket.on("joinOrg", (orgId) => {
    socket.join(`org:${orgId}`);
  });
});
app.use(helmet());
// Keep default JSON parser for most routes
app.use(express.json());
// Webhook route needs raw body for signature verification; mounted in its own router
app.use("/api/webhooks", bodyParser.raw({ type: "application/json" }));
app.use(cookieParser());

app.get("/health", (req, res) => res.json({ ok: true }));
app.use("/api/auth", authRouter);
app.use("/api/org", orgRouter);
import facebookRouter from "./routes/facebook";
import webhooksRouter from "./routes/webhooks";
app.use("/api/facebook", facebookRouter);
app.use("/api/webhooks", webhooksRouter);
import convRouter from "./routes/conversations";
app.use("/api/conversations", convRouter);
import tagsRouter from "./routes/tags";
import qrRouter from "./routes/quickReplies";

app.use("/api/tags", tagsRouter);
app.use("/api/quick-replies", qrRouter);
import internalRouter from "./routes/internal";
import messagesRouter from "./routes/messages";
app.use("/api/messages", messagesRouter);
import teamRouter from "./routes/team";
app.use("/api/team", teamRouter);
// ensure workers are loaded in worker processes only when needed
if (process.env.WORKER !== "true") {
  try {
    require("./worker/sendWorker");
  } catch (e) {
    console.warn("sendWorker load skipped", e);
  }
}
app.use("/api/internal", internalRouter);

const port = process.env.PORT || 4000;
server.listen(port, () => {
  console.log(`API running on http://localhost:${port}`);
});

export { io };

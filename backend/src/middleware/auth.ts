import { Request, Response, NextFunction } from "express";
import { verifyToken } from "../lib/jwt";

export function requireAuth(
  req: Request & any,
  res: Response,
  next: NextFunction,
) {
  const header = req.headers.authorization;
  const token = header?.split(" ")?.[1];
  const payload: any = token ? verifyToken(token) : null;
  if (!payload) return res.status(401).json({ error: "unauth" });
  req.user = payload;
  next();
}

export function requireOrg(orgIdParam = "orgId") {
  return (req: Request & any, res: Response, next: NextFunction) => {
    const payload = req.user;
    const orgId =
      req.body[orgIdParam] || req.query[orgIdParam] || req.params[orgIdParam];
    if (!payload) return res.status(401).json({ error: "unauth" });
    if (
      orgId &&
      payload.orgId !== orgId &&
      payload.orgId !== req.params.orgId
    ) {
      // simple check: payload.orgId must match requested orgId
      return res.status(403).json({ error: "forbidden" });
    }
    next();
  };
}

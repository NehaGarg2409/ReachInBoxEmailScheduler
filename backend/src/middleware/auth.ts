import { Request, Response, NextFunction } from "express";

declare module "express-session" {}

// We store just the userId in the cookie session (cookie-session, signed & httpOnly).
declare global {
  namespace Express {
    interface Request {
      session: { userId?: string } & Record<string, unknown>;
    }
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.session?.userId) {
    return res.status(401).json({ error: "Not authenticated" });
  }
  next();
}

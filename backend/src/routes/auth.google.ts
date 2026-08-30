import { Router } from "express";
import { OAuth2Client } from "google-auth-library";
import { prisma } from "../db/prisma";
import { env } from "../config/env";

export const googleAuthRouter = Router();

const oauthClient = new OAuth2Client(
  env.google.clientId,
  env.google.clientSecret,
  env.google.callbackUrl
);

googleAuthRouter.get("/auth/google", (_req, res) => {
  const url = oauthClient.generateAuthUrl({
    access_type: "offline",
    scope: ["openid", "email", "profile"],
    prompt: "consent",
  });
  res.redirect(url);
});

googleAuthRouter.get("/auth/google/callback", async (req, res) => {
  const code = req.query.code as string | undefined;
  if (!code) {
    return res.redirect(`${env.frontendUrl}/login?error=missing_code`);
  }

  try {
    const { tokens } = await oauthClient.getToken(code);
    const ticket = await oauthClient.verifyIdToken({
      idToken: tokens.id_token!,
      audience: env.google.clientId,
    });
    const payload = ticket.getPayload();
    if (!payload?.sub || !payload.email) {
      throw new Error("Incomplete Google profile payload");
    }

    const user = await prisma.user.upsert({
      where: { googleId: payload.sub },
      create: {
        googleId: payload.sub,
        email: payload.email,
        name: payload.name ?? payload.email,
        avatarUrl: payload.picture,
      },
      update: {
        name: payload.name ?? payload.email,
        avatarUrl: payload.picture,
      },
    });

    req.session.userId = user.id;
    res.redirect(`${env.frontendUrl}/dashboard`);
  } catch (err) {
    console.error("[auth.google] callback failed:", (err as Error).message);
    res.redirect(`${env.frontendUrl}/login?error=oauth_failed`);
  }
});

googleAuthRouter.post("/auth/logout", (req, res) => {
  req.session = null as unknown as { userId?: string };
  res.json({ ok: true });
});

googleAuthRouter.get("/auth/me", async (req, res) => {
  if (!req.session?.userId) {
    return res.status(401).json({ error: "Not authenticated" });
  }
  const user = await prisma.user.findUnique({
    where: { id: req.session.userId },
    include: { slackConnection: true },
  });
  if (!user) return res.status(401).json({ error: "Not authenticated" });

  res.json({
    id: user.id,
    email: user.email,
    name: user.name,
    avatarUrl: user.avatarUrl,
    slackConnected: Boolean(user.slackConnection),
  });
});

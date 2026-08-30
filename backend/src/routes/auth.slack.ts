import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import { getSlackAuthorizeUrl, exchangeSlackCode } from "../services/slack";
import { env } from "../config/env";

export const slackAuthRouter = Router();

// "Connect Slack" button in the dashboard hits this.
slackAuthRouter.get("/auth/slack", requireAuth, (req, res) => {
  const url = getSlackAuthorizeUrl(req.session.userId!);
  res.redirect(url);
});

slackAuthRouter.get("/auth/slack/callback", async (req, res) => {
  const code = req.query.code as string | undefined;
  const userId = req.query.state as string | undefined; // we passed userId as `state`

  if (!code || !userId) {
    return res.redirect(`${env.frontendUrl}/dashboard?slack=error`);
  }

  try {
    await exchangeSlackCode(code, userId);
    res.redirect(`${env.frontendUrl}/dashboard?slack=connected`);
  } catch (err) {
    console.error("[auth.slack] callback failed:", (err as Error).message);
    res.redirect(`${env.frontendUrl}/dashboard?slack=error`);
  }
});

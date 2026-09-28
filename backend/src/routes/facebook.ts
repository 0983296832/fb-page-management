import { Router } from "express";
import axios from "axios";
import { encrypt } from "../lib/crypto";
import { PrismaClient } from "@prisma/client";

const router = Router();
const prisma = new PrismaClient();

// Start Facebook OAuth flow: return URL to redirect user to
router.get("/oauth/url", (req, res) => {
  const appId = process.env.META_APP_ID;
  const redirectUri = `${process.env.APP_URL}/api/facebook/callback`;
  const scope = [
    "pages_show_list",
    "pages_manage_metadata",
    "pages_messaging",
    "pages_messaging_subscriptions",
    "pages_manage_posts",
  ].join(",");
  const url = `https://www.facebook.com/${process.env.META_API_VERSION}/dialog/oauth?client_id=${appId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${scope}&response_type=code`;
  res.json({ url });
});

// Callback to exchange code for access token and get pages
router.get("/callback", async (req, res) => {
  const code = req.query.code as string;
  if (!code) return res.status(400).send("missing code");
  const tokenResp = await axios.get(
    `https://graph.facebook.com/${process.env.META_API_VERSION}/oauth/access_token`,
    {
      params: {
        client_id: process.env.META_APP_ID,
        client_secret: process.env.META_APP_SECRET,
        redirect_uri: `${process.env.APP_URL}/api/facebook/callback`,
        code,
      },
    },
  );
  const userAccessToken = tokenResp.data.access_token;
  // TODO: store token per user session; here we fetch managed pages
  const pagesResp = await axios.get(
    `https://graph.facebook.com/${process.env.META_API_VERSION}/me/accounts`,
    { params: { access_token: userAccessToken } },
  );
  const pages = pagesResp.data.data || [];
  // return pages for selection (frontend will call connect page endpoint)
  res.json({ pages });
});

// Connect selected page: store page info encrypted
router.post("/connect", async (req, res) => {
  const { pageId, pageAccessToken, name, avatar, orgId } = req.body;
  if (!pageId || !pageAccessToken || !orgId)
    return res.status(400).json({ error: "missing" });
  const page = await prisma.facebookPage.create({
    data: {
      pageId,
      accessToken: encrypt(pageAccessToken),
      name,
      avatar,
      organizationId: orgId,
      connectedAt: new Date(),
    },
  });
  res.json({ page });
});

export default router;

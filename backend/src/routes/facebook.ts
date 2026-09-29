import { Router } from "express";
import axios from "axios";
import { decrypt, encrypt } from "../lib/crypto";
import { verifyToken } from "../lib/jwt";
import { PrismaClient } from "@prisma/client";
import { fetchFacebookCustomerProfile } from "../lib/facebookProfile";

const router = Router();
const prisma = new PrismaClient();

const API_VERSION = process.env.META_API_VERSION || "v26.0";
const facebookCallbackPath = "/api/facebook/callback";

function getRedirectUri() {
  return `${process.env.APP_URL}${facebookCallbackPath}`;
}

function getAuthPayload(req: any) {
  const token = req.headers.authorization?.split(" ")[1];
  return token ? (verifyToken(token) as any) : null;
}


async function subscribePageToApp(pageId: string, pageAccessToken: string) {
  try {
    await axios.post(
      `https://graph.facebook.com/${API_VERSION}/${pageId}/subscribed_apps`,
      null,
      {
        params: {
          subscribed_fields: "messages,messaging_postbacks,message_deliveries,message_reads",
          access_token: pageAccessToken,
        },
      },
    );
    return { pageId, ok: true };
  } catch (err: any) {
    console.error("page subscribe failed", pageId, err?.response?.data || err);
    return {
      pageId,
      ok: false,
      error: err?.response?.data?.error?.message || "subscribe_failed",
    };
  }
}

async function saveManagedPages(userAccessToken: string, orgId: string) {
  const pagesResp = await axios.get(
    `https://graph.facebook.com/${API_VERSION}/me/accounts`,
    {
      params: {
        access_token: userAccessToken,
        fields: "id,name,access_token,picture{url}",
      },
    },
  );

  const pages = pagesResp.data.data || [];
  const saved = [];

  for (const page of pages) {
    if (!page.id || !page.access_token) continue;
    const savedPage = await prisma.facebookPage.upsert({
      where: { pageId: page.id },
      update: {
        name: page.name || "Facebook Page",
        avatar: page.picture?.data?.url,
        accessToken: encrypt(page.access_token),
        organizationId: orgId,
        status: "CONNECTED",
        connectedAt: new Date(),
        lastSyncAt: new Date(),
      },
      create: {
        pageId: page.id,
        name: page.name || "Facebook Page",
        avatar: page.picture?.data?.url,
        accessToken: encrypt(page.access_token),
        organizationId: orgId,
        status: "CONNECTED",
        connectedAt: new Date(),
        lastSyncAt: new Date(),
      },
    });
    await subscribePageToApp(page.id, page.access_token);
    saved.push(savedPage);
  }

  return saved;
}

// Start Facebook OAuth flow: fallback for redirect-based OAuth.
router.get("/oauth/url", (req, res) => {
  const appId = process.env.META_APP_ID;
  const token = req.headers.authorization?.split(" ")[1];
  const payload: any = token ? verifyToken(token) : null;

  if (!payload?.orgId) return res.status(401).json({ error: "unauth" });
  if (!appId) return res.status(500).json({ error: "META_APP_ID missing" });

  const scope = [
    "email",
    "public_profile",
    "pages_show_list",
    "pages_manage_metadata",
    "pages_messaging",
    "pages_read_engagement",
    "pages_read_user_content",
    "pages_manage_posts",
    "pages_manage_engagement",
  ].join(",");

  const params = new URLSearchParams({
    client_id: appId,
    redirect_uri: getRedirectUri(),
    scope,
    response_type: "code",
    state: token,
  });

  res.json({
    url: `https://www.facebook.com/${API_VERSION}/dialog/oauth?${params.toString()}`,
  });
});

// Connect from react-facebook-login user access token.
router.post("/connect-from-login", async (req, res) => {
  try {
    const payload = getAuthPayload(req);
    if (!payload?.orgId) return res.status(401).json({ error: "unauth" });

    const { accessToken } = req.body;
    if (!accessToken) return res.status(400).json({ error: "missing accessToken" });

    const pages = await saveManagedPages(accessToken, payload.orgId);
    res.json({ pages });
  } catch (err: any) {
    console.error("facebook login connect error", err?.response?.data || err);
    res.status(500).json({
      error: "facebook_connect_failed",
      detail: err?.response?.data?.error?.message,
    });
  }
});

// Callback to exchange code for access token, fetch managed pages, and attach them to the org.
router.get("/callback", async (req, res) => {
  try {
    const code = req.query.code as string;
    const state = req.query.state as string;
    const payload: any = state ? verifyToken(state) : null;

    if (!code) return res.status(400).send("missing code");
    if (!payload?.orgId) return res.status(401).send("missing or invalid oauth state");

    const tokenResp = await axios.get(
      `https://graph.facebook.com/${API_VERSION}/oauth/access_token`,
      {
        params: {
          client_id: process.env.META_APP_ID,
          client_secret: process.env.META_APP_SECRET,
          redirect_uri: getRedirectUri(),
          code,
        },
      },
    );

    const pages = await saveManagedPages(tokenResp.data.access_token, payload.orgId);
    res.redirect(`${process.env.APP_URL}/inbox?connected=${pages.length}`);
  } catch (err: any) {
    console.error("facebook oauth callback error", err?.response?.data || err);
    res.status(500).send("facebook oauth failed");
  }
});


router.post("/subscribe-pages", async (req, res) => {
  const payload = getAuthPayload(req);
  if (!payload?.orgId) return res.status(401).json({ error: "unauth" });

  const pages = await prisma.facebookPage.findMany({
    where: { organizationId: payload.orgId, status: "CONNECTED" },
  });
  const results = [];
  for (const page of pages) {
    results.push(await subscribePageToApp(page.pageId, decrypt(page.accessToken)));
  }
  res.json({ results });
});


router.post("/backfill-customers", async (req, res) => {
  const payload = getAuthPayload(req);
  if (!payload?.orgId) return res.status(401).json({ error: "unauth" });

  const conversations = await prisma.conversation.findMany({
    where: { organizationId: payload.orgId, channel: "facebook" },
  });
  const results = [];

  for (const conv of conversations) {
    const page = conv.pageId
      ? await prisma.facebookPage.findUnique({ where: { pageId: conv.pageId } })
      : null;
    if (!page) continue;

    const customer = await prisma.customer.findFirst({
      where: {
        organizationId: payload.orgId,
        channel: "facebook",
        externalCustomerId: conv.channelConversationId,
      },
    });
    if (!customer || (customer.name && customer.avatar)) continue;

    const profile = await fetchFacebookCustomerProfile(
      conv.channelConversationId,
      decrypt(page.accessToken),
    );

    if (profile.name || profile.avatar) {
      await prisma.customer.update({
        where: { id: customer.id },
        data: {
          name: customer.name || profile.name,
          avatar: customer.avatar || profile.avatar,
        },
      });
    }

    results.push({
      customerId: customer.id,
      externalCustomerId: conv.channelConversationId,
      pageId: page.pageId,
      updated: Boolean(profile.name || profile.avatar),
      profile,
    });
  }

  res.json({ results });
});

// Connect selected page manually: store page info encrypted.
router.post("/connect", async (req, res) => {
  const { pageId, pageAccessToken, name, avatar, orgId } = req.body;
  if (!pageId || !pageAccessToken || !orgId)
    return res.status(400).json({ error: "missing" });

  const page = await prisma.facebookPage.upsert({
    where: { pageId },
    update: {
      accessToken: encrypt(pageAccessToken),
      name,
      avatar,
      organizationId: orgId,
      status: "CONNECTED",
      connectedAt: new Date(),
    },
    create: {
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

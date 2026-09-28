import axios from "axios";

const API_VERSION = process.env.META_API_VERSION || "v17.0";

export class MetaOAuthService {
  static getAuthUrl(redirectUri: string, scope: string[]) {
    const appId = process.env.META_APP_ID;
    return `https://www.facebook.com/${API_VERSION}/dialog/oauth?client_id=${appId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${scope.join(",")}&response_type=code`;
  }

  static async exchangeCode(code: string, redirectUri: string) {
    const resp = await axios.get(
      `https://graph.facebook.com/${API_VERSION}/oauth/access_token`,
      {
        params: {
          client_id: process.env.META_APP_ID,
          client_secret: process.env.META_APP_SECRET,
          redirect_uri: redirectUri,
          code,
        },
      },
    );
    return resp.data;
  }
}

export class MetaPageService {
  static async getManagedPages(userAccessToken: string) {
    const resp = await axios.get(
      `https://graph.facebook.com/${API_VERSION}/me/accounts`,
      { params: { access_token: userAccessToken } },
    );
    return resp.data.data;
  }

  static async testPageToken(pageAccessToken: string, pageId: string) {
    const resp = await axios.get(
      `https://graph.facebook.com/${API_VERSION}/${pageId}`,
      { params: { access_token: pageAccessToken, fields: "id,name" } },
    );
    return resp.data;
  }
}

export class MetaMessengerService {
  static async sendMessage(
    pageAccessToken: string,
    recipientId: string,
    message: any,
  ) {
    const resp = await axios.post(
      `https://graph.facebook.com/${API_VERSION}/me/messages`,
      {
        recipient: { id: recipientId },
        message,
      },
      { params: { access_token: pageAccessToken } },
    );
    return resp.data;
  }
}

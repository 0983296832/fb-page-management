import axios from "axios";

const API_VERSION = process.env.META_API_VERSION || "v26.0";

export async function fetchFacebookCustomerProfile(
  senderId: string,
  pageAccessToken: string,
) {
  const attempts = [
    {
      url: `https://graph.facebook.com/${API_VERSION}/${senderId}`,
      params: {
        fields: "first_name,last_name,name,profile_pic",
        access_token: pageAccessToken,
      },
    },
    {
      url: `https://graph.facebook.com/${API_VERSION}/${senderId}`,
      params: {
        fields: "name,picture.width(160).height(160)",
        access_token: pageAccessToken,
      },
    },
  ];

  for (const attempt of attempts) {
    try {
      const resp = await axios.get(attempt.url, { params: attempt.params });
      return {
        name:
          resp.data.name ||
          [resp.data.first_name, resp.data.last_name].filter(Boolean).join(" ") ||
          null,
        avatar: resp.data.profile_pic || resp.data.picture?.data?.url || null,
      };
    } catch (err) {
      // Try the next profile shape. Some PSIDs are not resolvable depending on Page/app permissions.
    }
  }

  return { name: null, avatar: null };
}

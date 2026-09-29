"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import FacebookLogin, {
  ReactFacebookFailureResponse,
  ReactFacebookLoginInfo,
} from "react-facebook-login";

const appId = "1570825298180358";
const scope = [
  "email",
  "public_profile",
  "pages_show_list",
  "pages_manage_metadata",
  "pages_messaging",
  "pages_utility_messaging",
  "pages_read_engagement",
  // "pages_read_user_content",
  // "pages_manage_posts",
  // "pages_manage_engagement",
].join(",");

function hasAccessToken(
  response: ReactFacebookLoginInfo | ReactFacebookFailureResponse,
): response is ReactFacebookLoginInfo {
  return Boolean((response as ReactFacebookLoginInfo).accessToken);
}

export default function FBConnect() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [connectedPages, setConnectedPages] = useState<any[]>([]);

  async function responseFacebook(
    userInfo: ReactFacebookLoginInfo | ReactFacebookFailureResponse,
  ) {
    setError("");

    if (!hasAccessToken(userInfo)) {
      setError(
        userInfo.error || userInfo.status || "Facebook login was cancelled",
      );
      return;
    }

    const token = localStorage.getItem("token");
    if (!token) {
      setError("Bạn cần đăng nhập workspace trước khi kết nối Facebook Page.");
      return;
    }

    setLoading(true);
    try {
      const resp = await fetch("/api/facebook/connect-from-login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ accessToken: userInfo.accessToken }),
      });
      const data = await resp.json().catch(() => ({}));

      if (!resp.ok) {
        throw new Error(
          data.detail || data.error || "Không thể kết nối Facebook Page",
        );
      }

      setConnectedPages(data.pages || []);
      router.push("/inbox");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Không thể kết nối Facebook Page",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 p-6 text-slate-950">
      <div className="mx-auto max-w-4xl">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.14em] text-blue-600">
              Meta setup
            </p>
            <h1 className="mt-2 text-3xl font-black">Connect Facebook Page</h1>
          </div>
          <Link
            href="/inbox"
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-bold text-slate-700 hover:bg-white"
          >
            Back to inbox
          </Link>
        </div>

        <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <div className="grid gap-6 md:grid-cols-[1fr_280px]">
            <div>
              <h2 className="text-xl font-black">
                Đăng nhập Facebook để lấy Page
              </h2>
              <p className="mt-3 text-sm leading-6 text-slate-600">
                Nút này dùng Facebook Login SDK. Sau khi bạn cấp quyền, app sẽ
                lấy danh sách Page bạn quản lý và lưu Page token vào workspace
                hiện tại.
              </p>

              <div className="mt-6">
                <FacebookLogin
                  appId={String(appId)}
                  autoLoad={false}
                  version="26.0"
                  fields="name,email,picture"
                  scope={scope}
                  callback={(userInfo) => responseFacebook(userInfo)}
                  cssClass="h-11 rounded-lg bg-blue-600 px-5 text-sm font-bold text-white shadow-lg shadow-blue-600/20 hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-400"
                  textButton={loading ? "Connecting..." : "Login with Facebook"}
                  disableMobileRedirect={true}
                />
              </div>

              {error && (
                <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
                  {error}
                </div>
              )}

              {connectedPages.length > 0 && (
                <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-800">
                  Đã kết nối {connectedPages.length} Page. Đang chuyển về
                  inbox...
                </div>
              )}
            </div>

            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm font-black text-slate-950">Scopes</p>
              <ul className="mt-3 space-y-2 text-sm text-slate-600">
                <li>pages_show_list</li>
                <li>pages_manage_metadata</li>
                <li>pages_messaging</li>
                <li>pages_utility_messaging</li>
                <li>pages_read_engagement</li>
                <li>business_management</li>
              </ul>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

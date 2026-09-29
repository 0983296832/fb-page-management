"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Mode = "login" | "register";

export default function AuthPanel() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("owner@example.com");
  const [password, setPassword] = useState("password123");
  const [name, setName] = useState("Owner");
  const [organizationName, setOrganizationName] = useState("Demo Organization");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const endpoint = mode === "login" ? "/api/auth/login" : "/api/auth/register";
    const payload =
      mode === "login"
        ? { email, password }
        : { email, password, name, organizationName };

    try {
      const resp = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await resp.json().catch(() => ({}));
      if (!resp.ok) {
        throw new Error(data.error || "Authentication failed");
      }

      localStorage.setItem("token", data.token);
      router.push("/inbox");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Authentication failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <div className="grid min-h-screen lg:grid-cols-[1.05fr_0.95fr]">
        <section className="relative flex flex-col justify-between overflow-hidden px-6 py-8 sm:px-10 lg:px-14">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(59,130,246,0.25),transparent_32%),radial-gradient(circle_at_80%_10%,rgba(20,184,166,0.2),transparent_28%),linear-gradient(135deg,#0f172a_0%,#111827_48%,#042f2e_100%)]" />
          <div className="relative z-10 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-lg bg-blue-500 font-black text-white shadow-lg shadow-blue-950/30">
                f
              </div>
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-cyan-200">
                  FB Page Management
                </p>
                <p className="text-xs text-slate-400">Messenger operations</p>
              </div>
            </div>
            <a
              href="/facebook/connect"
              className="rounded-lg border border-white/15 px-3 py-2 text-sm font-semibold text-slate-200 hover:bg-white/10"
            >
              Connect Page
            </a>
          </div>

          <div className="relative z-10 my-16 max-w-2xl lg:my-0">
            <p className="mb-4 inline-flex rounded-full border border-cyan-300/25 bg-cyan-300/10 px-3 py-1 text-sm font-medium text-cyan-100">
              Unified inbox for Facebook pages
            </p>
            <h1 className="text-4xl font-black leading-tight text-white sm:text-5xl lg:text-6xl">
              Run page messages, tags, and replies from one calm workspace.
            </h1>
            <p className="mt-6 max-w-xl text-base leading-7 text-slate-300 sm:text-lg">
              Triage conversations, connect Meta pages, manage quick replies, and keep support work moving without the placeholder-screen sadness.
            </p>
          </div>

          <div className="relative z-10 grid gap-3 text-sm text-slate-300 sm:grid-cols-3">
            <div className="rounded-lg border border-white/10 bg-white/5 p-4">
              <p className="text-2xl font-black text-white">24</p>
              <p>Active conversations</p>
            </div>
            <div className="rounded-lg border border-white/10 bg-white/5 p-4">
              <p className="text-2xl font-black text-white">8</p>
              <p>Quick replies</p>
            </div>
            <div className="rounded-lg border border-white/10 bg-white/5 p-4">
              <p className="text-2xl font-black text-white">3</p>
              <p>Connected pages</p>
            </div>
          </div>
        </section>

        <section className="flex items-center justify-center bg-slate-50 px-6 py-10 text-slate-950 sm:px-10">
          <div className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-6 shadow-xl shadow-slate-200/70 sm:p-8">
            <div className="mb-6">
              <p className="text-sm font-semibold text-blue-600">Welcome back</p>
              <h2 className="mt-2 text-3xl font-black tracking-tight text-slate-950">
                {mode === "login" ? "Sign in" : "Create workspace"}
              </h2>
            </div>

            <div className="mb-6 grid grid-cols-2 rounded-lg bg-slate-100 p-1 text-sm font-semibold">
              <button
                type="button"
                onClick={() => setMode("login")}
                className={`rounded-md px-3 py-2 ${mode === "login" ? "bg-white text-blue-700 shadow-sm" : "text-slate-600"}`}
              >
                Login
              </button>
              <button
                type="button"
                onClick={() => setMode("register")}
                className={`rounded-md px-3 py-2 ${mode === "register" ? "bg-white text-blue-700 shadow-sm" : "text-slate-600"}`}
              >
                Register
              </button>
            </div>

            <form onSubmit={submit} className="space-y-4">
              {mode === "register" && (
                <>
                  <label className="block">
                    <span className="mb-1 block text-sm font-semibold text-slate-700">Name</span>
                    <input
                      className="w-full rounded-lg border border-slate-300 px-3 py-2.5 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                    />
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-sm font-semibold text-slate-700">Organization</span>
                    <input
                      className="w-full rounded-lg border border-slate-300 px-3 py-2.5 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                      value={organizationName}
                      onChange={(e) => setOrganizationName(e.target.value)}
                      required
                    />
                  </label>
                </>
              )}

              <label className="block">
                <span className="mb-1 block text-sm font-semibold text-slate-700">Email</span>
                <input
                  type="email"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2.5 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </label>

              <label className="block">
                <span className="mb-1 block text-sm font-semibold text-slate-700">Password</span>
                <input
                  type="password"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2.5 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </label>

              {error && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-lg bg-blue-600 px-4 py-3 font-bold text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-400"
              >
                {loading ? "Please wait..." : mode === "login" ? "Sign in" : "Create account"}
              </button>
            </form>

            <div className="mt-5 rounded-lg bg-slate-50 p-3 text-sm text-slate-600">
              Demo login: <span className="font-semibold text-slate-900">owner@example.com</span> / <span className="font-semibold text-slate-900">password123</span>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

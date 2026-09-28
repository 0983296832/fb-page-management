"use client";
import { useState } from "react";
import Router from "next/router";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  async function submit(e: any) {
    e.preventDefault();
    // call backend login
    const resp = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    if (resp.ok) {
      const data = await resp.json();
      localStorage.setItem("token", data.token);
      Router.push("/inbox");
    } else {
      alert("login failed");
    }
  }
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f8fafc]">
      <div className="bg-white p-8 rounded shadow w-full max-w-md">
        <h2 className="text-2xl font-extrabold text-[#0b74ff] mb-4">
          Welcome back
        </h2>
        <form onSubmit={submit}>
          <label className="block mb-2">Email</label>
          <input
            className="w-full border p-2 mb-4"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <label className="block mb-2">Password</label>
          <input
            type="password"
            className="w-full border p-2 mb-4"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <div className="flex justify-end">
            <button className="px-4 py-2 bg-blue-600 text-white rounded">
              Sign in
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

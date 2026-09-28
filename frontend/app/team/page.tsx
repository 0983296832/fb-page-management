"use client";
import { useEffect, useState } from "react";

export default function TeamPage() {
  const [members, setMembers] = useState<any[]>([]);
  const [email, setEmail] = useState("");
  useEffect(() => {
    load();
  }, []);
  async function load() {
    const token = localStorage.getItem("token");
    const r = await fetch("/api/team/members", {
      headers: { Authorization: `Bearer ${token}` },
    });
    const d = await r.json();
    setMembers(d.members || []);
  }
  async function invite() {
    const token = localStorage.getItem("token");
    await fetch("/api/team/invite", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ email }),
    });
    setEmail("");
    load();
  }
  return (
    <div className="p-8">
      <h2 className="text-2xl font-extrabold text-[#0b74ff] mb-4">Team</h2>
      <div className="mb-4 flex gap-2">
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="border p-2 flex-1"
          placeholder="invite email"
        />
        <button
          className="px-3 py-2 bg-[#0b74ff] text-white rounded"
          onClick={invite}
        >
          Invite
        </button>
      </div>
      <div className="card bg-white">
        <ul>
          {members.map((m) => (
            <li key={m.id} className="p-3 border-b flex justify-between">
              <div>{m.name || m.email}</div>
              <div className="text-sm text-[#6b7280]">{m.role}</div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

"use client";
import { useEffect, useState } from "react";

export default function TagsPage() {
  const [tags, setTags] = useState<any[]>([]);
  const [name, setName] = useState("");
  async function load() {
    const r = await fetch("/api/tags?orgId=demo");
    const d = await r.json();
    setTags(d.tags || []);
  }
  useEffect(() => {
    load();
  }, []);
  async function create() {
    await fetch("/api/tags", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orgId: "demo", name, color: "#ffcc00" }),
    });
    setName("");
    load();
  }
  return (
    <div className="p-8">
      <h2 className="text-2xl font-extrabold text-[#0b74ff] mb-4">Tags</h2>
      <div className="mb-4 flex items-center gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="border p-2 flex-1"
          placeholder="New tag"
        />
        <button
          className="px-3 py-2 bg-[#0b74ff] text-white rounded"
          onClick={create}
        >
          Add
        </button>
      </div>
      <div className="bg-white card">
        <ul>
          {tags.map((t) => (
            <li
              key={t.id}
              className="p-3 border-b flex justify-between items-center"
            >
              <div>{t.name}</div>
              <div className="text-sm text-[#6b7280]">{t.color || "#ccc"}</div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

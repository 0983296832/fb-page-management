"use client";
import { useEffect, useState } from "react";

export default function QuickRepliesPage() {
  const [replies, setReplies] = useState<any[]>([]);
  const [title, setTitle] = useState("");
  const [shortcut, setShortcut] = useState("");
  const [content, setContent] = useState("");
  async function load() {
    const r = await fetch("/api/quick-replies?orgId=demo");
    const d = await r.json();
    setReplies(d.replies || []);
  }
  useEffect(() => {
    load();
  }, []);
  async function create() {
    await fetch("/api/quick-replies", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orgId: "demo", title, shortcut, content }),
    });
    setTitle("");
    setShortcut("");
    setContent("");
    load();
  }
  return (
    <div className="p-8">
      <h2 className="text-2xl font-extrabold text-[#0b74ff] mb-4">
        Quick Replies
      </h2>
      <div className="grid grid-cols-3 gap-2 mb-4">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="border p-2"
          placeholder="Title"
        />
        <input
          value={shortcut}
          onChange={(e) => setShortcut(e.target.value)}
          className="border p-2"
          placeholder="Shortcut"
        />
        <input
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className="border p-2"
          placeholder="Content"
        />
      </div>
      <div className="mb-4">
        <button
          className="px-3 py-2 bg-[#0b74ff] text-white rounded"
          onClick={create}
        >
          Create
        </button>
      </div>
      <div className="card bg-white">
        <ul>
          {replies.map((r) => (
            <li
              key={r.id}
              className="p-3 border-b flex justify-between items-center"
            >
              <div>
                <div className="font-medium">{r.title}</div>
                <div className="text-sm text-[#6b7280]">{r.content}</div>
              </div>
              <div className="text-sm text-[#6b7280]">{r.shortcut}</div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

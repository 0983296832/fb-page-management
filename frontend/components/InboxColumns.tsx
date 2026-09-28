"use client";
import { useEffect, useState } from "react";
import io from "socket.io-client";

function PagesColumn() {
  return <div className="p-4">Pages</div>;
}

function ConversationsColumn({ onSelect }: { onSelect: (id: string) => void }) {
  const [convs, setConvs] = useState<any[]>([]);
  useEffect(() => {
    fetch("/api/conversations?orgId=demo")
      .then((r) => r.json())
      .then((d) => setConvs(d.convs || []));
  }, []);
  return (
    <div className="p-4 overflow-y-auto">
      <ul>
        {convs.map((c) => (
          <li
            key={c.id}
            className="p-3 border-b hover:bg-gray-50 cursor-pointer"
            onClick={() => onSelect(c.id)}
          >
            <div className="font-semibold">
              {c.lastMessage || "No messages"}
            </div>
            <div className="text-sm text-gray-500">
              {new Date(c.lastMessageAt || c.createdAt).toLocaleString()}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function MessagesColumn({ convId }: { convId?: string }) {
  const [conv, setConv] = useState<any>(null);
  useEffect(() => {
    if (!convId) return;
    fetch(`/api/conversations/${convId}`)
      .then((r) => r.json())
      .then((d) => setConv(d.conv));
  }, [convId]);
  return (
    <div className="p-4 flex flex-col h-full">
      <div className="flex-1 overflow-y-auto">
        {conv ? (
          conv.messages.map((m: any) => (
            <div
              key={m.id}
              className={`mb-3 ${m.senderType === "AGENT" ? "text-right" : ""}`}
            >
              <div className="inline-block bg-gray-100 rounded p-2">
                {m.text}
              </div>
              {m.senderType === "AGENT" && (
                <div className="text-xs text-gray-500 mt-1">
                  {m.state}
                  {m.state === "FAILED" && (
                    <button
                      onClick={async () => {
                        await fetch(`/api/messages/${m.id}/retry`, {
                          method: "POST",
                        });
                        // naive refresh
                        const r = await fetch(`/api/conversations/${conv.id}`);
                        const d = await r.json();
                        setConv(d.conv);
                      }}
                      className="ml-2 px-2 py-1 bg-red-600 text-white rounded text-xs"
                    >
                      Retry
                    </button>
                  )}
                </div>
              )}
            </div>
          ))
        ) : (
          <div className="text-gray-500">Select a conversation</div>
        )}
      </div>
      <Composer convId={convId} />
    </div>
  );
}

function Composer({ convId }: { convId?: string }) {
  const [text, setText] = useState("");
  async function send() {
    if (!convId || !text) return;
    await fetch(`/api/conversations/${convId}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, orgId: "demo", senderId: "agent1" }),
    });
    setText("");
  }
  return (
    <div className="mt-2">
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        className="w-full p-2 border rounded"
        rows={3}
      ></textarea>
      <div className="flex justify-end mt-2">
        <button
          className="px-4 py-2 bg-blue-600 text-white rounded"
          onClick={send}
        >
          Send
        </button>
      </div>
    </div>
  );
}

export default function InboxColumns() {
  const [selected, setSelected] = useState<string | undefined>(undefined);
  useEffect(() => {
    const socket = io(window.location.origin.replace(":3000", ":4000"));
    socket.on("connect", () => socket.emit("joinOrg", "demo"));
    socket.on("message", (p: any) => {
      // naive reload
      // could optimize by patching state
    });
    return () => socket.disconnect();
  }, []);

  return (
    <div className="flex h-screen bg-[#f8fafc]">
      <div className="w-64">
        <PagesColumn />
      </div>
      <div className="w-80">
        <div className="card h-full">
          <ConversationsColumn onSelect={setSelected} />
        </div>
      </div>
      <div className="flex-1 p-6">
        <div className="card h-full">
          <MessagesColumn convId={selected} />
        </div>
      </div>
    </div>
  );
}

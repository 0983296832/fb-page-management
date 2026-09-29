"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { io } from "socket.io-client";

type Page = { id: string; pageId: string; name: string; avatar?: string | null; status: string };
type Org = { id: string; name: string; pages: Page[] };

type Customer = { name: string; avatar?: string | null; externalCustomerId: string };
type Conversation = {
  id: string;
  pageId?: string | null;
  lastMessage?: string | null;
  lastMessageAt?: string | null;
  createdAt: string;
  unreadCount: number;
  customer?: Customer;
  page?: Page | null;
  messages?: any[];
};

function authHeaders() {
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function initials(name?: string | null) {
  return (name || "?")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function Avatar({ src, name, className = "h-11 w-11" }: { src?: string | null; name?: string | null; className?: string }) {
  return src ? (
    <img src={src} alt={name || "Avatar"} className={`${className} rounded-full object-cover`} />
  ) : (
    <div className={`${className} grid place-items-center rounded-full bg-slate-200 text-sm font-black text-slate-600`}>
      {initials(name)}
    </div>
  );
}


function formatMessageTime(value?: string | null) {
  if (!value) return "";
  return new Date(value).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function AgentMessageStatus({ message, customer }: { message: any; customer?: Customer }) {
  const readAt = message.metadata?.readAt;
  if (message.state === "FAILED") return <span className="font-semibold text-red-500">! Failed</span>;
  if (message.state === "SENDING") return <span>○ Sending</span>;
  if (readAt) {
    return (
      <span className="inline-flex items-center gap-1">
        <Avatar src={customer?.avatar} name={customer?.name} className="h-4 w-4" />
        Đã đọc {formatMessageTime(readAt)}
      </span>
    );
  }
  return <span>✓ Đã gửi</span>;
}

function ConnectEmptyState() {
  return (
    <div className="flex h-full items-center justify-center p-8">
      <div className="max-w-lg text-center">
        <div className="mx-auto mb-5 grid h-14 w-14 place-items-center rounded-lg bg-blue-600 text-2xl font-black text-white">f</div>
        <h2 className="text-2xl font-black text-slate-950">Chưa kết nối Facebook Page</h2>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          Inbox chỉ có hội thoại sau khi workspace kết nối một Page và Meta webhook bắt đầu gửi sự kiện Messenger về app.
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <Link href="/facebook/connect" className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-blue-600/20 hover:bg-blue-700">
            Kết nối Facebook Page
          </Link>
        </div>
      </div>
    </div>
  );
}

function PageSelect({ pages, value, onChange }: { pages: Page[]; value: string; onChange: (pageId: string) => void }) {
  const selected = pages.find((page) => page.pageId === value);

  return (
    <div className="border-b border-slate-200 bg-white p-4">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">Facebook Page</p>
          <h1 className="mt-1 text-lg font-black text-slate-950">Conversations</h1>
        </div>
        <Link href="/facebook/connect" className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50">
          Add
        </Link>
      </div>
      <div className="flex items-center gap-3 rounded-lg border border-slate-300 bg-slate-50 px-3 py-2">
        <Avatar src={selected?.avatar} name={selected?.name || "All pages"} className="h-9 w-9" />
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="min-w-0 flex-1 bg-transparent text-sm font-bold text-slate-950 outline-none"
        >
          <option value="all">All connected pages</option>
          {pages.map((page) => (
            <option key={page.pageId} value={page.pageId}>{page.name}</option>
          ))}
        </select>
      </div>
    </div>
  );
}

function ConversationsColumn({
  pages,
  selectedPageId,
  onPageChange,
  convs,
  loading,
  selected,
  onSelect,
}: {
  pages: Page[];
  selectedPageId: string;
  onPageChange: (pageId: string) => void;
  convs: Conversation[];
  loading: boolean;
  selected?: string;
  onSelect: (id: string) => void;
}) {
  return (
    <section className="flex h-full flex-col border-r border-slate-200 bg-white">
      <PageSelect pages={pages} value={selectedPageId} onChange={onPageChange} />
      <div className="flex-1 overflow-y-auto p-3">
        {loading ? (
          <div className="p-3 text-sm text-slate-500">Đang tải hội thoại...</div>
        ) : convs.length ? (
          <ul className="space-y-2">
            {convs.map((c) => {
              const customerName = c.customer?.name || `Facebook user ${c.customer?.externalCustomerId || c.id}`;
              return (
                <li
                  key={c.id}
                  className={`cursor-pointer rounded-lg border p-3 transition hover:border-blue-300 hover:bg-blue-50 ${selected === c.id ? "border-blue-400 bg-blue-50" : "border-slate-200"}`}
                  onClick={() => onSelect(c.id)}
                >
                  <div className="flex gap-3">
                    <div className="relative shrink-0">
                      <Avatar src={c.customer?.avatar} name={customerName} className="h-12 w-12" />
                      <div className="absolute -bottom-1 -right-1 rounded-full bg-white p-0.5 shadow-sm ring-1 ring-slate-200">
                        <Avatar src={c.page?.avatar} name={c.page?.name} className="h-5 w-5" />
                      </div>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <p className="truncate text-sm font-black text-slate-950">{customerName}</p>
                        {c.unreadCount > 0 && <span className="rounded-full bg-blue-600 px-2 py-0.5 text-xs font-black text-white">{c.unreadCount}</span>}
                      </div>
                      <p className="mt-0.5 truncate text-xs font-semibold text-slate-500">{c.page?.name || "Unknown page"}</p>
                      <p className="mt-2 line-clamp-2 text-sm text-slate-700">{c.lastMessage || "No messages"}</p>
                      <p className="mt-2 text-xs text-slate-400">{new Date(c.lastMessageAt || c.createdAt).toLocaleString()}</p>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        ) : (
          <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-600">
            Chưa có hội thoại cho Page này.
          </div>
        )}
      </div>
    </section>
  );
}

function MessagesColumn({ conv, convId, orgId }: { conv: Conversation | null; convId?: string; orgId: string }) {
  const customerName = conv?.customer?.name || "Chọn một hội thoại";

  return (
    <section className="flex h-full flex-col bg-slate-50">
      <div className="border-b border-slate-200 bg-white px-6 py-4">
        {conv ? (
          <div className="flex items-center gap-3">
            <div className="relative shrink-0">
              <Avatar src={conv.customer?.avatar} name={customerName} className="h-12 w-12" />
              <div className="absolute -bottom-1 -right-1 rounded-full bg-white p-0.5 shadow-sm ring-1 ring-slate-200">
                <Avatar src={conv.page?.avatar} name={conv.page?.name} className="h-5 w-5" />
              </div>
            </div>
            <div className="min-w-0">
              <h2 className="truncate text-lg font-black text-slate-950">{customerName}</h2>
              <p className="truncate text-sm font-semibold text-slate-500">{conv.page?.name || "Unknown page"}</p>
            </div>
          </div>
        ) : (
          <div>
            <h2 className="text-lg font-black text-slate-950">Chọn hội thoại</h2>
            <p className="text-sm text-slate-500">Thông tin người nhắn và Page sẽ hiện ở đây.</p>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        {conv ? (
          conv.messages?.map((m: any) => {
            const isAgent = m.senderType === "AGENT";
            return (
              <div key={m.id} className={`mb-4 flex ${isAgent ? "justify-end" : "justify-start"}`}>
                {!isAgent && <Avatar src={conv.customer?.avatar} name={customerName} className="mr-2 h-8 w-8" />}
                <div className={`flex max-w-[72%] flex-col ${isAgent ? "items-end" : "items-start"}`}>
                  <div className={`rounded-lg p-3 text-sm shadow-sm ring-1 ${isAgent ? "bg-blue-600 text-white ring-blue-600" : "bg-white text-slate-800 ring-slate-200"}`}>
                    {m.text || "Unsupported message"}
                  </div>
                  <div className={`mt-1 flex items-center gap-2 text-xs ${isAgent ? "justify-end text-slate-500" : "text-slate-400"}`}>
                    <span>{formatMessageTime(m.sentAt || m.createdAt)}</span>
                    {isAgent && <AgentMessageStatus message={m} customer={conv.customer} />}
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="flex h-full items-center justify-center text-sm font-medium text-slate-500">Chọn một hội thoại để xem nội dung</div>
        )}
      </div>
      <Composer convId={convId} orgId={orgId} />
    </section>
  );
}

function Composer({ convId, orgId }: { convId?: string; orgId: string }) {
  const [text, setText] = useState("");

  async function send() {
    if (!convId || !text.trim()) return;
    await fetch(`/api/conversations/${convId}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeaders() },
      body: JSON.stringify({ text, orgId, senderId: "agent1" }),
    });
    setText("");
  }

  return (
    <div className="border-t border-slate-200 bg-white p-4">
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        className="h-24 w-full resize-none rounded-lg border border-slate-300 p-3 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
        placeholder={convId ? "Nhập tin nhắn..." : "Chọn hội thoại trước khi gửi"}
        disabled={!convId}
      />
      <div className="mt-3 flex justify-end">
        <button
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300"
          onClick={send}
          disabled={!convId || !text.trim()}
        >
          Send
        </button>
      </div>
    </div>
  );
}

export default function InboxColumns() {
  const [org, setOrg] = useState<Org | undefined>();
  const [selectedPageId, setSelectedPageId] = useState("all");
  const [selected, setSelected] = useState<string | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [convs, setConvs] = useState<Conversation[]>([]);
  const [convsLoading, setConvsLoading] = useState(false);
  const [conv, setConv] = useState<Conversation | null>(null);
  const hasPages = Boolean(org?.pages?.length);
  const orgId = org?.id;

  const pages = useMemo(() => org?.pages || [], [org]);

  useEffect(() => {
    fetch("/api/org", { headers: authHeaders() })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => setOrg(d.org))
      .finally(() => setLoading(false));
  }, []);

  async function loadConversations(currentOrgId = orgId, pageId = selectedPageId) {
    if (!currentOrgId) return;
    setConvsLoading(true);
    try {
      const params = new URLSearchParams({ orgId: currentOrgId, pageId });
      const r = await fetch(`/api/conversations?${params.toString()}`, { headers: authHeaders() });
      const d = await r.json();
      setConvs(d.convs || []);
    } finally {
      setConvsLoading(false);
    }
  }

  async function loadConversation(convIdToLoad = selected) {
    if (!convIdToLoad) return;
    const r = await fetch(`/api/conversations/${convIdToLoad}`, { headers: authHeaders() });
    const d = await r.json();
    setConv(d.conv);
  }

  useEffect(() => {
    if (!orgId || !hasPages) return;
    setSelected(undefined);
    setConv(null);
    loadConversations(orgId, selectedPageId);
  }, [orgId, hasPages, selectedPageId]);

  useEffect(() => {
    setConv(null);
    loadConversation(selected);
  }, [selected]);

  useEffect(() => {
    if (!orgId) return;
    const socket = io("http://localhost:4000", { path: "/socket.io" });
    socket.on("connect", () => socket.emit("joinOrg", orgId));
    socket.on("message", (payload: any) => {
      loadConversations(orgId, selectedPageId);
      if (payload?.conversationId === selected) loadConversation(selected);
    });
    return () => socket.disconnect();
  }, [orgId, selected, selectedPageId]);

  if (loading) {
    return <div className="grid h-screen place-items-center bg-slate-50 text-sm font-medium text-slate-500">Đang mở inbox...</div>;
  }

  if (!orgId) {
    return (
      <div className="grid h-screen place-items-center bg-slate-50 p-6 text-center">
        <div>
          <h1 className="text-2xl font-black text-slate-950">Phiên đăng nhập không hợp lệ</h1>
          <Link href="/login" className="mt-4 inline-block rounded-lg bg-blue-600 px-4 py-2 font-bold text-white">Đăng nhập lại</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="grid h-screen grid-cols-[420px_1fr] bg-slate-50">
      {hasPages ? (
        <>
          <ConversationsColumn
            pages={pages}
            selectedPageId={selectedPageId}
            onPageChange={setSelectedPageId}
            convs={convs}
            loading={convsLoading}
            selected={selected}
            onSelect={setSelected}
          />
          <MessagesColumn conv={conv} convId={selected} orgId={orgId} />
        </>
      ) : (
        <div className="col-span-2 bg-slate-50">
          <ConnectEmptyState />
        </div>
      )}
    </div>
  );
}

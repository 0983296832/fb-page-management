import Link from "next/link";

export default function Sidebar() {
  return (
    <aside className="w-64 bg-white h-screen p-6 border-r">
      <div className="mb-6 text-2xl font-extrabold text-[#0b74ff]">FBPM</div>
      <nav className="flex flex-col gap-3">
        <Link
          href="/"
          className="px-3 py-2 rounded hover:bg-gray-50 text-sm font-medium"
        >
          Dashboard
        </Link>
        <Link
          href="/inbox"
          className="px-3 py-2 rounded hover:bg-gray-50 text-sm font-medium"
        >
          Inbox
        </Link>
        <Link
          href="/tags"
          className="px-3 py-2 rounded hover:bg-gray-50 text-sm font-medium"
        >
          Tags
        </Link>
        <Link
          href="/quick-replies"
          className="px-3 py-2 rounded hover:bg-gray-50 text-sm font-medium"
        >
          Quick Replies
        </Link>
        <Link
          href="/facebook/connect"
          className="px-3 py-2 rounded hover:bg-gray-50 text-sm font-medium"
        >
          Connect Facebook
        </Link>
      </nav>
    </aside>
  );
}

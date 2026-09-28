"use client";
import { useEffect, useState } from "react";

export default function FBConnect() {
  const [pages, setPages] = useState<any[]>([]);
  useEffect(() => {
    // for demo fetch oauth url
    fetch("/api/facebook/oauth/url")
      .then((r) => r.json())
      .then((d) => {
        // noop - frontend will redirect when user clicks connect
      });
  }, []);
  return (
    <div className="p-8">
      <h2 className="text-2xl font-extrabold text-[#0b74ff] mb-4">
        Connect Facebook Page
      </h2>
      <p className="mb-4 text-sm text-[#6b7280]">
        Start the OAuth flow to connect a Page and enable Messenger.
      </p>
      <a
        href={`/api/facebook/oauth/url`}
        className="inline-block mt-3 px-4 py-2 bg-[#0b74ff] text-white rounded shadow"
      >
        Connect Page
      </a>
    </div>
  );
}

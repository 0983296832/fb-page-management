import Link from "next/link";

export default function Home() {
  return (
    <main className="p-8">
      <h1 className="text-2xl font-bold">FB-Page-Management</h1>
      <p className="mt-4">Frontend placeholder. Connect to backend at /api</p>
      <Link href="/inbox">Open Inbox (demo)</Link>
    </main>
  );
}

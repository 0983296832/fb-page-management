import "./globals.css";

export const metadata = {
  title: "FB-Page-Management",
  description: "Multi-page inbox",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-gray-50">
        <div className="flex">
          <div className="hidden md:block">
            {/* Sidebar loaded client-side to avoid SSR issues */}
          </div>
          <main className="flex-1">{children}</main>
        </div>
      </body>
    </html>
  );
}

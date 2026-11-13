import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Marc Platform - Fire Safety Solutions & System Management",
  description: "PBŘ & Fire Safety Solution Management Platform",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
        <script src="https://accounts.google.com/gsi/client" async defer></script>
      </head>
      <body className="bg-zinc-950 text-zinc-100 min-h-screen antialiased font-sans" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}

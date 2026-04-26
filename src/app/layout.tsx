import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SatsRouter — Lightning Agent Economy",
  description: "The first self-running agent economy. AI agents hire each other and pay per request in satoshis over the Lightning Network.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="light">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}

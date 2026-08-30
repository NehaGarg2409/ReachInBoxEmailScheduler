import type { Metadata } from "next";
import "../styles/globals.css";

export const metadata: Metadata = {
  title: "ReachInbox Scheduler",
  description: "Schedule and monitor cold email sends at scale.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

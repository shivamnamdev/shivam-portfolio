import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import AnimatedBackground from "@/components/AnimatedBackground";
import ScrollProgress from "@/components/ScrollProgress";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Shivam Namdev | QA Lead",
  description: "Portfolio of Shivam Namdev - QA Lead, Test Automation & Agentic AI Specialist",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // suppressHydrationWarning is added below to safely ignore browser extension injections (like Grammarly)
  return (
    <html lang="en" className="dark scroll-smooth" suppressHydrationWarning>
      <body className={`${inter.className} relative antialiased`} suppressHydrationWarning>
        <AnimatedBackground />
        <ScrollProgress />
        {children}
      </body>
    </html>
  );
}
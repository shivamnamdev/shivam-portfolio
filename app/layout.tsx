import type { Metadata } from "next";
import { Inter, Space_Grotesk, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import AnimatedBackground from "@/components/AnimatedBackground";
import ScrollProgress from "@/components/ScrollProgress";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const space = Space_Grotesk({ subsets: ["latin"], variable: "--font-space" });
const mono = JetBrains_Mono({ subsets:["latin"], variable: "--font-mono" });

export const metadata: Metadata = {
  title: "Shivam Namdev | QA Lead",
  description: "Portfolio of Shivam Namdev - QA Lead, Test Automation & Agentic AI Specialist",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) 
{
  return (
    <html lang="en" className={`dark scroll-smooth ${inter.variable} ${space.variable} ${mono.variable}`} suppressHydrationWarning>
      <body className="font-sans relative antialiased" suppressHydrationWarning>
        <AnimatedBackground />
        <ScrollProgress />
        {children}
      </body>
    </html>
  );
}
import type { Metadata } from "next";
import { Inter, Space_Grotesk, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import AnimatedBackground from "@/components/AnimatedBackground";
import ScrollProgress from "@/components/ScrollProgress";
import CustomCursor from "@/components/CustomCursor";

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
      <body className="font-sans relative antialiased bg-black text-white min-h-screen flex flex-col" suppressHydrationWarning>
          <div className="fixed inset-0 bg-grid-pattern z-[-1] opacity-40 pointer-events-none" />
          <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] bg-amber-500/10 blur-[150px] rounded-full pointer-events-none z-[-1]" />
          
          <ScrollProgress />
          
          {/* 🚨 INJECT THE GRAIN HERE */}
          <div className="bg-noise"></div>
          <CustomCursor /> {/* 🚨 THE NEW CURSOR */}
          <ScrollProgress />
          {children}
          {children}
        </body>
    </html>
  );
}
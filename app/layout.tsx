import type { Metadata } from "next";
import { Inter, Space_Grotesk, JetBrains_Mono } from "next/font/google";
import { ClerkProvider } from '@clerk/nextjs';
import "./globals.css";
import ScrollProgress from "@/components/ScrollProgress";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const space = Space_Grotesk({ subsets: ["latin"], variable: "--font-space" });
const mono = JetBrains_Mono({ subsets:["latin"], variable: "--font-mono" });

export const metadata: Metadata = {
  title: "Shivam Academy | Empowering Tech Mastery",
  description: "Helping IT and Non-IT professionals achieve Tech Mastery. Master Python, DevOps, Linux, Cloud, and Automation through real-world engineering.",
  metadataBase: new URL('https://shivamnamdev.com'), 
  openGraph: {
    title: "Shivam Academy | Tech Mastery for IT & Non-IT Professionals",
    description: "From beginner to expert. Master Python, DevOps, and Cloud architecture through interactive live cohorts and real-world projects.",
    url: "https://shivamnamdev.com",
    siteName: "Shivam Namdev",
    images: [{ url: "/og-image.jpg", width: 1200, height: 630, alt: "Tech Mastery by Shivam Namdev" }],
    locale: "en_IN",
    type: "website",
  },
  icons: {
    icon: [
      { url: '/icon.png', type: 'image/png' },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Shivam Academy | Empowering Tech Mastery",
    description: "Master Python, DevOps, Linux, Cloud, and Automation through real-world engineering.",
    images:["/og-image.jpg"],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider>
      <html lang="en" className={`scroll-smooth ${inter.variable} ${space.variable} ${mono.variable}`} suppressHydrationWarning>
        {/* 🚨 THE FIX: Global Black Background and Text Color */}
        <body className="font-sans relative antialiased bg-black text-white min-h-screen flex flex-col" suppressHydrationWarning>
          
          {/* 🚨 THE FIX: Global Cyber Grid & Amber Glow */}
          <div className="fixed inset-0 bg-grid-pattern z-[-1] opacity-40 pointer-events-none" />
          <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] bg-amber-500/10 blur-[150px] rounded-full pointer-events-none z-[-1]" />
          
          <ScrollProgress />
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}
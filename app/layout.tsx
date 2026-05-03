import type { Metadata } from "next";
import { Inter, Space_Grotesk, JetBrains_Mono } from "next/font/google";
import { ClerkProvider } from '@clerk/nextjs'; // 🚨 Added Clerk Import
import "./globals.css";
import AnimatedBackground from "@/components/AnimatedBackground";
import ScrollProgress from "@/components/ScrollProgress";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const space = Space_Grotesk({ subsets: ["latin"], variable: "--font-space" });
const mono = JetBrains_Mono({ subsets:["latin"], variable: "--font-mono" });

// This is the SEO Block!
export const metadata: Metadata = {
  title: "Shivam Academy | Empowering Tech Mastery",
  description: "Helping IT and Non-IT professionals achieve Tech Mastery. Master Python, DevOps, Linux, Cloud, and Automation through real-world engineering.",
  metadataBase: new URL('https://shivamnamdev.com'), 
  openGraph: {
    title: "Shivam Academy | Tech Mastery for IT & Non-IT Professionals",
    description: "From beginner to expert. Master Python, DevOps, and Cloud architecture through interactive live cohorts and real-world projects.",
    url: "https://shivamnamdev.com",
    siteName: "Shivam Namdev",
    images:[
      {
        url: "/og-image.jpg", 
        width: 1200,
        height: 630,
        alt: "Tech Mastery by Shivam Namdev",
      },
    ],
    locale: "en_IN",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Shivam Academy | Empowering Tech Mastery",
    description: "Master Python, DevOps, Linux, Cloud, and Automation through real-world engineering.",
    images:["/og-image.jpg"],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    // 🚨 Wrap the entire HTML in ClerkProvider to enable the login system globally
    <ClerkProvider>
      <html lang="en" className={`scroll-smooth ${inter.variable} ${space.variable} ${mono.variable}`} suppressHydrationWarning>
        <body className="font-sans relative antialiased" suppressHydrationWarning>
          <AnimatedBackground />
          <ScrollProgress />
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}
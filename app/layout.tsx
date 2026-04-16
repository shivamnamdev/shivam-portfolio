import type { Metadata } from "next";
import { Inter, Space_Grotesk, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import AnimatedBackground from "@/components/AnimatedBackground";
import ScrollProgress from "@/components/ScrollProgress";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const space = Space_Grotesk({ subsets: ["latin"], variable: "--font-space" });
const mono = JetBrains_Mono({ subsets:["latin"], variable: "--font-mono" });

// This is the SEO Block!
export const metadata: Metadata = {
  title: "Shivam Namdev | Master Python & Automation",
  description: "Stop getting stuck in tutorial hell. Join my interactive live cohort to write code confidently, build real-world projects, and become job-ready in 45 days.",
  metadataBase: new URL('https://shivamnamdev.com'), 
  openGraph: {
    title: "Master Python Programming | Shivam Namdev",
    description: "Join the exclusive Live Cohort. Build strong coding logic from scratch and master Python in 45 days.",
    url: "https://shivamnamdev.com",
    siteName: "Shivam Namdev",
    images:[
      {
        url: "/og-image.jpg", 
        width: 1200,
        height: 630,
        alt: "Python Live Sessions by Shivam Namdev",
      },
    ],
    locale: "en_IN",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Master Python Programming | Shivam Namdev",
    description: "Join the exclusive Live Cohort. Build strong coding logic from scratch and master Python in 45 days.",
    images:["/og-image.jpg"],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`scroll-smooth ${inter.variable} ${space.variable} ${mono.variable}`} suppressHydrationWarning>
      <body className="font-sans relative antialiased" suppressHydrationWarning>
        <AnimatedBackground />
        <ScrollProgress />
        {children}
      </body>
    </html>
  );
}
'use client';
import { useEffect } from 'react';
import { useUser } from '@clerk/nextjs';
import { usePathname } from 'next/navigation';

export default function TimeTracker() {
  const { isSignedIn } = useUser();
  const pathname = usePathname();

  useEffect(() => {
    // Only track time if they are logged in AND on a learning page!
    if (!isSignedIn || !pathname?.includes('/learning')) return;

    // Send a ping every 60 seconds
    const interval = setInterval(() => {
      // SMART FEATURE: Only count time if the browser tab is actively visible on their screen!
      if (document.visibilityState === 'visible') {
        fetch('/api/track-time', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ seconds: 60 })
        }).catch(err => console.error("Heartbeat failed", err));
      }
    }, 60000); // 60,000 milliseconds = 1 minute

    return () => clearInterval(interval);
  }, [isSignedIn, pathname]);

  return null; // This component is completely invisible!
}
'use client';

import { useEffect, useState, useCallback } from 'react';
import { usePathname } from 'next/navigation';
import { ClipLoader } from 'react-spinners';

export default function NavigationLoader() {
  const [isNavigating, setIsNavigating] = useState(false);
  const pathname = usePathname();

  // When pathname changes, the new page has loaded — hide the loader
  useEffect(() => {
    setIsNavigating(false);
  }, [pathname]);

  // Intercept all click events on anchor-like elements and buttons that trigger navigation
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const anchor = target.closest('a');
      
      if (anchor) {
        const href = anchor.getAttribute('href');
        // Only show loader for internal navigation links
        if (href && href.startsWith('/') && !href.startsWith('//') && !anchor.getAttribute('target')) {
          setIsNavigating(true);
        }
      }
    };

    document.addEventListener('click', handleClick, true);
    return () => document.removeEventListener('click', handleClick, true);
  }, []);

  // Expose a global function so router.push() calls can trigger the loader
  useEffect(() => {
    (window as any).__setNavigating = setIsNavigating;
    return () => {
      delete (window as any).__setNavigating;
    };
  }, []);

  if (!isNavigating) return null;

  return (
    <div className="fixed inset-0 bg-white/70 backdrop-blur-sm z-[9999] flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <ClipLoader size={40} color="#47577d" />
        <p className="text-[#47577d] font-medium">Loading...</p>
      </div>
    </div>
  );
}

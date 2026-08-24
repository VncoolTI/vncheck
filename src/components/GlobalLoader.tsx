"use client";

import { useEffect, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import Image from "next/image";

export default function GlobalLoader() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);

    const timer = setTimeout(() => {
      setLoading(false);
    }, 1500);

    return () => clearTimeout(timer);
  }, [pathname, searchParams]);

  if (!loading) return null;

  return (
    <div className="fixed inset-0 z-9999 flex flex-col items-center justify-center bg-[#F4F7F9] dark:bg-[#001B48] transition-colors duration-500">
      {/* ANIMATED LOGO CONTAINER */}
      <div className="relative w-24 h-24 mb-4 animate-pulse">
        <div className="absolute inset-0 bg-white/20 dark:bg-white/10 rounded-full blur-xl"></div>
        <div className="relative w-full h-full bg-white rounded-full flex items-center justify-center shadow-2xl border-4 border-white/10">
          <div className="relative w-12 h-12">
            <Image
              src="/Logo-Vn-Check-test.png"
              alt="Loading..."
              fill
              className="object-contain"
              priority
            />
          </div>
        </div>
      </div>

      {/* LOADING SPINNER */}
      <div className="flex flex-col items-center gap-2">
        <div className="w-8 h-8 border-4 border-vn-primary/30 border-t-vn-primary rounded-full animate-spin"></div>
        <p className="text-xs font-bold text-gray-400 dark:text-gray-500 tracking-widest animate-pulse">
          LOADING
        </p>
      </div>
    </div>
  );
}

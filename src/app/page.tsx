"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowRightIcon } from "@heroicons/react/24/solid";

export default function WelcomePage() {
  const [showSplash, setShowSplash] = useState(true);

  // SPLASH SCREEN TIMER (1.5 seconds)
  useEffect(() => {
    const splashTimer = setTimeout(() => {
      setShowSplash(false);
    }, 1500);
    return () => clearTimeout(splashTimer);
  }, []);

  return (
    <main className="h-screen w-full bg-white flex items-center justify-center relative overflow-hidden font-sans">
      {/* ========================================= */}
      {/* 1. SPLASH SCREEN (ANIMATED OUT)           */}
      {/* ========================================= */}
      <div
        className={`absolute inset-0 z-50 bg-white flex flex-col items-center justify-center transition-all duration-700 ease-in-out ${
          showSplash
            ? "opacity-100 visible scale-100"
            : "opacity-0 invisible scale-105"
        }`}
      >
        <div className="w-32 h-32 md:w-48 md:h-48 relative animate-pulse">
          <Image
            src="/Logo-Vn-Check-test.png"
            alt="VNCHECK Logo"
            fill
            className="object-contain"
            priority
          />
        </div>
      </div>

      {/* ========================================= */}
      {/* 2. FULL-SCREEN LAYOUT (MOBILE & PC)       */}
      {/* ========================================= */}
      <div
        className={`w-full h-full flex flex-col md:flex-row relative overflow-hidden transition-all duration-1000 delay-300 ${
          showSplash ? "opacity-0" : "opacity-100"
        }`}
      >
        {/* --- LEFT SIDE (WHITE) --- */}
        <div className="w-full h-[40%] md:h-full md:w-1/2 bg-white flex flex-col justify-center px-8 md:px-20 lg:px-32 relative z-0">
          <div className="animate-in fade-in slide-in-from-left-8 duration-1000 delay-500">
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-extrabold text-gray-900 leading-tight mb-2">
              Welcome to <br />
              <span className="text-[#478ffc] tracking-tight">VNcheck</span>
            </h1>
            <p className="text-gray-500 font-medium md:text-xl lg:text-2xl mt-4 max-w-lg">
              Smart Cooling Meets Smart Security.
            </p>
          </div>
        </div>

        {/* --- RIGHT SIDE (GRADIENT) --- */}
        <div className="w-full h-[60%] md:h-full md:w-1/2 bg-linear-to-b from-[#478ffc] to-[#83e2f7] rounded-t-[3rem] md:rounded-none relative flex flex-col items-center justify-center px-8">
          {/* FLOATING LOGO CIRCLE (DEAD CENTER ON PC) */}
          <div className="absolute -top-12 md:top-1/2 md:-left-16 lg:-left-20 transform md:-translate-y-1/2 w-24 h-24 md:w-32 md:h-32 lg:w-40 lg:h-40 bg-white rounded-full flex items-center justify-center shadow-2xl border-[6px] md:border-[8px] border-[#478ffc]/20 z-10">
            <div className="w-12 h-12 md:w-16 md:h-16 lg:w-20 lg:h-20 relative">
              <Image
                src="/Logo-Vn-Check-test.png"
                alt="Logo Icon"
                fill
                className="object-contain"
              />
            </div>
          </div>

          {/* CONTINUE BUTTON */}
          <div className="animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-700 w-full max-w-sm flex flex-col items-center mt-10 md:mt-0">
            <p className="text-white/90 font-medium mb-6 md:text-xl tracking-wide">
              Ready to sign in?
            </p>
            <Link
              href="/login"
              className="w-full bg-white text-[#478ffc] font-bold text-xl py-4 md:py-5 rounded-full shadow-xl hover:shadow-2xl hover:scale-[1.02] transition-all active:scale-95 flex items-center justify-center group"
            >
              Continue
              <ArrowRightIcon className="w-6 h-6 ml-3 text-[#478ffc] group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}

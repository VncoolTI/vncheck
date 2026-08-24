"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  HomeIcon,
  DocumentTextIcon,
  UserIcon,
  CameraIcon,
} from "@heroicons/react/24/solid";

export default function MobileBottomNav() {
  const pathname = usePathname();

  const navItems = [
    { name: "Home", href: "/employee/dashboard", icon: HomeIcon },
    { name: "Report", href: "/employee/report", icon: DocumentTextIcon },
    // SCAN ada di tengah
    { name: "Scan", href: "/employee/scan", icon: CameraIcon, isCenter: true },
    // Placeholder kosong agar layout seimbang (Opsional, tapi membantu flexbox)
    // { name: "Task", href: "/employee/task", icon: BriefcaseIcon },
    { name: "Profile", href: "/employee/setting", icon: UserIcon },
  ];

  return (
    // Container Utama: Fixed di bawah
    <div className="fixed bottom-0 left-0 w-full z-50">
      {/* Bagian Background Putih Navigasi 
         - h-16: Tinggi navbar
         - rounded-t-2xl: Melengkung sedikit di ujung atas
      */}
      <div className="bg-white h-[70px] border-t border-gray-200 rounded-t-[20px] shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] px-6 flex justify-between items-center relative">
        {navItems.map((item) => {
          const isActive = pathname === item.href;

          // LOGIKA TOMBOL TENGAH (SCAN/KAMERA)
          if (item.isCenter) {
            return (
              <div key={item.name} className="relative -top-8 group">
                <Link href={item.href}>
                  {/* Lingkaran Luar (Border Tebal) 
                       - border-[6px] border-[#F1F5F9]: 
                         Ini trik visual. Warnanya disamakan dengan background halaman (#F1F5F9)
                         agar terlihat "memotong" navbar putih.
                    */}
                  <div className="w-16 h-16 rounded-full bg-[#0F172A] flex items-center justify-center border-[6px] border-[#F1F5F9] shadow-lg transition-transform active:scale-95">
                    <CameraIcon className="w-8 h-8 text-white" />
                  </div>
                </Link>
              </div>
            );
          }

          // LOGIKA TOMBOL MENU BIASA (KIRI & KANAN)
          return (
            <Link
              key={item.name}
              href={item.href}
              className="flex flex-col items-center gap-1 min-w-12"
            >
              <item.icon
                className={`w-6 h-6 transition-colors ${
                  isActive ? "text-[#0F172A]" : "text-gray-300"
                }`}
              />
              <span
                className={`text-[10px] font-bold transition-colors ${
                  isActive ? "text-[#0F172A]" : "text-gray-400"
                }`}
              >
                {item.name}
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

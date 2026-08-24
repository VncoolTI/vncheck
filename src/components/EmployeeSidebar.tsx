"use client";
export const dynamic = "force-dynamic";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase";

import {
  HomeIcon as HomeSolid,
  ChartPieIcon as ChartPieSolid,
  CameraIcon as CameraSolid,
  BellIcon as BellSolid,
  UserIcon as UserSolid,
  ClipboardDocumentListIcon as ClipboardIcon,
} from "@heroicons/react/24/solid";
import {
  HomeIcon as HomeOutline,
  ChartPieIcon as ChartPieOutline,
  CameraIcon as CameraOutline,
  BellIcon as BellOutline,
  UserIcon as UserOutline,
  ArrowRightOnRectangleIcon,
} from "@heroicons/react/24/outline";

export default function EmployeeSidebar() {
  const pathname = usePathname();
  const supabase = createClient();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    let channel: any;

    const fetchUnreadCount = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { count } = await supabase
        .from("notifications")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("is_read", false);

      if (count !== null) setUnreadCount(count);

      channel = supabase
        .channel("sidebar-notifications")
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "notifications",
            filter: `user_id=eq.${user.id}`,
          },
          () => {
            fetchUnreadCount();
          },
        )
        .subscribe();
    };

    fetchUnreadCount();

    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, [supabase]);

  const isActive = (path: string) =>
    pathname === path || pathname.startsWith(path + "/");

  const navItems = [
    {
      name: "Dashboard",
      href: "/employee/dashboard",
      iconActive: HomeSolid,
      iconInactive: HomeOutline,
    },
    {
      name: "Attendance",
      href: "/employee/scan",
      iconActive: CameraSolid,
      iconInactive: CameraOutline,
    },
    {
      name: "Task",
      href: "/employee/task",
      iconActive: ClipboardIcon,
      iconInactive: ClipboardIcon,
    },
    {
      name: "Reports",
      href: "/employee/report",
      iconActive: ChartPieSolid,
      iconInactive: ChartPieOutline,
    },
    {
      name: "Notifications",
      href: "/employee/notification",
      iconActive: BellSolid,
      iconInactive: BellOutline,
    },
    {
      name: "Profile",
      href: "/employee/setting",
      iconActive: UserSolid,
      iconInactive: UserOutline,
    },
  ];

  // --- LOGOUT FUNCTION ---
  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      // Using window.location.href ensures the cache is completely cleared when logging out
      window.location.href = "/";
    } catch (error) {
      console.error("Error logging out:", error);
    }
  };

  return (
    <aside className="hidden md:flex flex-col w-64 bg-white dark:bg-vn-navy-100 min-h-screen fixed left-0 top-0 border-r border-[#478FFC] dark:border-none shadow-sm dark:shadow-xl z-50 transition-colors duration-500">
      {/* 1. LOGO AREA  */}
      <div className="h-24 flex items-center justify-center bg-[#2F69C0] dark:bg-[#001436] border-b border-gray-100 dark:border-white/5 transition-colors duration-500">
        <div className="flex items-center">
          <img
            src="/Logo-Vn-Check-test.png"
            alt="VNCheck Logo"
            className="w-8 h-8 mr-3 object-contain dark:brightness-200"
          />
          <span className="font-black text-xl tracking-widest uppercase text-white dark:text-white">
            VNCHECK
          </span>
        </div>
      </div>

      {/* 2. NAVIGATION LINKS */}
      <nav className="flex-1 py-8 px-4 space-y-2">
        {navItems.map((item) => {
          const active = isActive(item.href);
          const Icon = active ? item.iconActive : item.iconInactive;

          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex items-center px-4 py-3.5 rounded-2xl transition-all duration-300 group ${
                active
                  ? "bg-vn-primary text-white shadow-lg shadow-vn-primary/30"
                  : "text-black dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5 hover:text-gray-900 dark:hover:text-white"
              }`}
            >
              <Icon
                className={`w-6 h-6 mr-4 ${active ? "text-white" : "text-black dark:text-gray-400 group-hover:text-gray-600 dark:group-hover:text-white transition-colors"}`}
              />
              <span
                className={`font-bold text-[15px] tracking-wide flex-1 ${active ? "" : "opacity-90"}`}
              >
                {item.name}
              </span>

              {/* NEW: THE NOTIFICATION BADGE */}
              {item.name === "Notifications" && unreadCount > 0 && (
                <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 text-[10px] font-black text-white shadow-sm">
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* 3. LOGOUT AREA (Centered matching screenshot) */}
      <div className="p-6 mb-4">
        <button
          onClick={handleLogout}
          className="flex items-center justify-center w-full px-4 py-3 text-black dark:text-white hover:bg-red-50 dark:hover:bg-red-500/20 rounded-2xl transition-all active:scale-95 group"
        >
          <ArrowRightOnRectangleIcon className="w-6 h-6 mr-3 group-hover:text-red-500 transition-colors" />
          <span className="font-bold text-sm tracking-wide group-hover:text-red-500 transition-colors">
            Log out
          </span>
        </button>
      </div>
    </aside>
  );
}

"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  HomeIcon,
  ClockIcon,
  BellIcon,
  UserIcon,
  CameraIcon,
} from "@heroicons/react/24/solid";
import {
  HomeIcon as HomeOutline,
  ClockIcon as ClockOutline,
  BellIcon as BellOutline,
  UserIcon as UserOutline,
} from "@heroicons/react/24/outline";

export default function EmployeeBottomNav() {
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
        .channel("bottom-nav-notifications")
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
      name: "Home",
      href: "/employee/dashboard",
      iconActive: HomeIcon,
      iconInactive: HomeOutline,
    },
    {
      name: "Report",
      href: "/employee/report",
      iconActive: ClockIcon,
      iconInactive: ClockOutline,
    },
    {
      name: "Scan",
      href: "/employee/scan",
      isCenter: true,
    },
    {
      name: "Notif",
      href: "/employee/notification",
      iconActive: BellIcon,
      iconInactive: BellOutline,
    },
    {
      name: "Profile",
      href: "/employee/setting",
      iconActive: UserIcon,
      iconInactive: UserOutline,
    },
  ];

  return (
    <div className="fixed bottom-0 left-0 z-9999 w-full h-[70px] bg-[#001B48] text-white rounded-t-3xl shadow-[0_-8px_20px_rgba(0,0,0,0.15)] flex justify-around items-center px-2 md:hidden">
      {navItems.map((item) => {
        // CENTER SCAN BUTTON
        if (item.isCenter) {
          return (
            <Link
              key={item.name}
              href={item.href}
              className="relative -top-7 group"
            >
              <div className="w-[68px] h-[68px] bg-[#3B7CDE] rounded-full flex items-center justify-center border-[6px] border-[#F1F5F9] dark:border-[#001B48] shadow-xl group-active:scale-95 transition-all duration-300">
                <CameraIcon className="w-8 h-8 text-white drop-shadow-md" />
              </div>
            </Link>
          );
        }

        // REGULAR NAV BUTTONS
        const active = isActive(item.href);
        const Icon = active ? item.iconActive! : item.iconInactive!;

        return (
          <Link
            key={item.name}
            href={item.href}
            className={`flex flex-col items-center justify-center w-16 h-full gap-1 transition-colors ${
              active ? "text-[#3B7CDE]" : "text-gray-400 hover:text-gray-200"
            }`}
          >
            {/* WRAPPER RELATIVE TO POSITION BADGE */}
            <div className="relative">
              <Icon
                className={`w-6 h-6 ${active ? "drop-shadow-[0_0_8px_rgba(59,124,222,0.8)]" : ""}`}
              />

              {/* NEW: THE NOTIFICATION BADGE */}
              {item.name === "Notif" && unreadCount > 0 && (
                <span className="absolute -top-1.5 -right-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-black text-white shadow-sm border border-[#001B48]">
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              )}
            </div>

            <span className="text-[10px] font-bold tracking-wide">
              {item.name}
            </span>
          </Link>
        );
      })}
    </div>
  );
}

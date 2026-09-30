"use client";

export const dynamic = "force-dynamic";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase";
import { formatDistanceToNow, isToday, isYesterday } from "date-fns";
import {
  BanknotesIcon,
  CalendarDaysIcon,
  ClipboardDocumentCheckIcon,
  ClockIcon,
  BellIcon,
  MegaphoneIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
} from "@heroicons/react/24/outline";

type Notification = {
  id: string;
  title: string;
  description: string;
  type: "payslip" | "leave" | "task" | "overtime" | "announcement" | string;
  created_at: string;
  priority?: string;
  is_read: boolean;
  is_announcement?: boolean;
};

export default function NotificationPage() {
  const supabase = createClient();
  const [allData, setAllData] = useState<Notification[]>([]);
  const [displayedData, setDisplayedData] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [isMarkingAll, setIsMarkingAll] = useState(false);

  // UX State
  const [filter, setFilter] = useState<"all" | "announcement" | "personal">(
    "all",
  );
  const [visibleCount, setVisibleCount] = useState(10);
  const [totalFilteredCount, setTotalFilteredCount] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");

  // --- HELPER: Icon & Color Logic ---
  const getIconData = (item: Notification) => {
    switch (item.type) {
      case "payslip":
        return {
          icon: BanknotesIcon,
          color:
            "bg-blue-50 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400",
          border: "border-blue-100 dark:border-blue-500/30",
        };
      case "leave":
        if (item.title.toLowerCase().includes("reject")) {
          return {
            icon: CalendarDaysIcon,
            color:
              "bg-red-50 dark:bg-red-500/20 text-red-600 dark:text-red-400",
            border: "border-red-100 dark:border-red-500/30",
          };
        }
        return {
          icon: CalendarDaysIcon,
          color:
            "bg-emerald-50 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400",
          border: "border-emerald-100 dark:border-emerald-500/30",
        };
      case "task":
        return {
          icon: ClipboardDocumentCheckIcon,
          color:
            "bg-orange-50 dark:bg-orange-500/20 text-orange-500 dark:text-orange-400",
          border: "border-orange-100 dark:border-orange-500/30",
        };
      case "overtime":
        return {
          icon: ClockIcon,
          color:
            "bg-lime-50 dark:bg-lime-500/20 text-lime-600 dark:text-lime-400",
          border: "border-lime-100 dark:border-lime-500/30",
        };
      case "announcement":
        if (item.priority === "Urgent") {
          return {
            icon: ExclamationTriangleIcon,
            color:
              "bg-red-50 dark:bg-red-500/20 text-red-600 dark:text-red-400",
            border: "border-red-100 dark:border-red-500/30",
          };
        }
        return {
          icon: MegaphoneIcon,
          color:
            "bg-indigo-50 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400",
          border: "border-indigo-100 dark:border-indigo-500/30",
        };
      default:
        return {
          icon: BellIcon,
          color:
            "bg-gray-50 dark:bg-gray-500/20 text-gray-500 dark:text-gray-400",
          border: "border-gray-100 dark:border-gray-500/30",
        };
    }
  };

  // --- HELPER: Extact Overtime Status Badge ---
  const getOvertimeBadge = (item: Notification) => {
    if (item.type !== "overtime") return null;
    const text = (item.title + " " + item.description).toLowerCase();

    if (text.includes("complet")) {
      return (
        <span className="px-2 py-0.5 rounded-full bg-green-100 text-green-700 text-[9px] font-black uppercase tracking-wider border border-green-200 ml-2">
          Completed
        </span>
      );
    }
    if (text.includes("approv") || text.includes("assign")) {
      return (
        <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-[9px] font-black uppercase tracking-wider border border-blue-200 ml-2">
          Approved
        </span>
      );
    }
    if (
      text.includes("reject") ||
      text.includes("cancel") ||
      text.includes("revok")
    ) {
      return (
        <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-700 text-[9px] font-black uppercase tracking-wider border border-red-200 ml-2">
          Cancelled
        </span>
      );
    }
    return null;
  };

  useEffect(() => {
    setMounted(true);
    let channel: any;
    let isMounted = true;

    const setupData = async () => {
      setLoading(true);
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data: notifData } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", user.id);
      const { data: annData } = await supabase
        .from("announcements")
        .select("*");

      const formattedNotifs = (notifData || []).map((n: any) => ({
        id: n.id,
        title: n.title,
        description: n.message, // Map DB "message" to UI "description"
        type: n.type || "task",
        created_at: n.created_at,
        is_read: n.is_read,
        is_announcement: false,
      }));

      const formattedAnns = (annData || []).map((a: any) => ({
        id: `ann-${a.id}`,
        title: a.title,
        description: a.content,
        type: "announcement",
        created_at: a.created_at,
        priority: a.priority,
        is_read: true, // Announcements are global, default them to read
        is_announcement: true,
      }));

      const mergedList = [...formattedNotifs, ...formattedAnns].sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      );

      setAllData(mergedList);
      setLoading(false);

      // Guard: kalau effect ini sudah di-cleanup (misal React Strict Mode
      // re-run effect saat development) sebelum semua await di atas
      // selesai, jangan lanjut bikin channel baru -- effect run berikutnya
      // bisa saja sudah subscribe duluan dengan nama channel yang sama, dan
      // .on() di bawah ini bakal error "... after subscribe()".
      if (!isMounted) return;

      // Listen for both INSERTS and UPDATES
      channel = supabase
        .channel("realtime-notifications")
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "notifications",
            filter: `user_id=eq.${user.id}`,
          },
          (payload) => {
            if (payload.eventType === "INSERT") {
              const n = payload.new as any;
              setAllData((prev) => [
                {
                  id: n.id,
                  title: n.title,
                  description: n.message,
                  type: n.type,
                  created_at: n.created_at,
                  is_read: n.is_read,
                  is_announcement: false,
                },
                ...prev,
              ]);
            } else if (payload.eventType === "UPDATE") {
              const n = payload.new as any;
              setAllData((prev) =>
                prev.map((item) =>
                  item.id === n.id ? { ...item, is_read: n.is_read } : item,
                ),
              );
            }
          },
        )
        .subscribe();
    };

    setupData();
    return () => {
      isMounted = false;
      if (channel) supabase.removeChannel(channel);
    };
  }, [supabase]);

  // --- FILTERING LOGIC ---
  useEffect(() => {
    let filtered = allData;

    if (filter !== "all") {
      if (filter === "personal") {
        filtered = allData.filter((item) => !item.is_announcement);
      } else {
        filtered = allData.filter((item) => item.is_announcement);
      }
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (item) =>
          item.title.toLowerCase().includes(query) ||
          item.description.toLowerCase().includes(query),
      );
    }

    setTotalFilteredCount(filtered.length);
    setDisplayedData(filtered.slice(0, visibleCount));
  }, [allData, filter, visibleCount, searchQuery]);

  // --- ACTIONS ---
  const handleMarkAsRead = async (id: string) => {
    setAllData((prev) =>
      prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)),
    );
    await supabase.from("notifications").update({ is_read: true }).eq("id", id);
  };

  const handleMarkAllAsRead = async () => {
    setIsMarkingAll(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      setAllData((prev) =>
        prev.map((n) => (!n.is_announcement ? { ...n, is_read: true } : n)),
      );
      await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("user_id", user.id)
        .eq("is_read", false);
    }
    setIsMarkingAll(false);
  };

  const unreadCount = allData.filter(
    (n) => !n.is_read && !n.is_announcement,
  ).length;

  const groupedData = displayedData.reduce((groups: any, item) => {
    const date = new Date(item.created_at);
    let key = "Older";
    if (isToday(date)) key = "Today";
    else if (isYesterday(date)) key = "Yesterday";
    if (!groups[key]) groups[key] = [];
    groups[key].push(item);
    return groups;
  }, {});

  const groupOrder = ["Today", "Yesterday", "Older"];

  if (!mounted) return null;

  return (
    <div className="w-full min-h-screen xl:h-screen xl:overflow-hidden font-sans transition-colors duration-500 p-4 md:p-6 lg:p-8 flex flex-col items-center bg-linear-to-b from-vn-primary to-vn-secondary dark:bg-linear-to-b dark:from-[#001B48] dark:to-[#3B7CDE]">
      {/* HEADER AREA */}
      <div className="w-full max-w-[1400px] flex justify-between items-end mb-6 shrink-0">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-3xl md:text-4xl font-bold text-white dark:text-white tracking-tight">
              Inbox
            </h1>
            {unreadCount > 0 && (
              <span className="bg-red-500 text-white text-xs font-black px-2.5 py-1 rounded-full shadow-md animate-pulse">
                {unreadCount} Unread
              </span>
            )}
          </div>
          <p className="text-white dark:text-blue-100/80 text-sm">
            Updates, News & Alerts • {totalFilteredCount} items
          </p>
        </div>

        {/* MARK ALL AS READ BUTTON */}
        {unreadCount > 0 && (
          <button
            onClick={handleMarkAllAsRead}
            disabled={isMarkingAll}
            className="hidden md:flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl transition-all font-bold text-xs disabled:opacity-50 active:scale-95"
          >
            {isMarkingAll ? (
              <span className="loading loading-spinner w-4 h-4"></span>
            ) : (
              <CheckCircleIcon className="w-5 h-5" />
            )}
            Mark all as read
          </button>
        )}
      </div>

      {/* MAIN CONTENT CARD */}
      <div className="w-full max-w-[1400px] flex-1 xl:min-h-0 bg-white dark:bg-vn-navy-100 rounded-[2.5rem] p-6 lg:p-8 shadow-2xl flex flex-col gap-6 transition-colors duration-500 overflow-hidden relative">
        {/* TOOLBAR: TABS & SEARCH */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 shrink-0">
          <div className="flex p-1 bg-gray-100 dark:bg-black/20 rounded-full w-full md:w-auto overflow-x-auto custom-scrollbar">
            {[
              { id: "all", label: "All Messages" },
              { id: "announcement", label: "News" },
              { id: "personal", label: "Personal" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => {
                  setFilter(tab.id as any);
                  setVisibleCount(10);
                }}
                className={`px-4 py-2 rounded-full text-xs font-bold transition-all whitespace-nowrap ${
                  filter === tab.id
                    ? "bg-white dark:bg-vn-primary text-gray-900 dark:text-white shadow-sm"
                    : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-white"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="relative w-full md:w-64 flex gap-2">
            <div className="relative flex-1">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search inbox..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-gray-50 dark:bg-black/20 border-none rounded-full py-2 pl-9 pr-4 text-xs font-medium text-gray-700 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-vn-primary outline-none transition-all"
              />
            </div>
            {/* Mobile Mark All Read Icon */}
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllAsRead}
                className="md:hidden flex items-center justify-center w-9 h-9 bg-gray-100 dark:bg-white/10 text-gray-600 dark:text-white rounded-full active:scale-95"
                title="Mark all as read"
              >
                <CheckCircleIcon className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>

        {/* NOTIFICATION LIST */}
        <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 -mr-2 space-y-6">
          {loading ? (
            <div className="flex justify-center py-20">
              <span className="loading loading-spinner text-vn-primary loading-lg"></span>
            </div>
          ) : displayedData.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center opacity-40">
              <div className="w-16 h-16 bg-gray-100 dark:bg-white/10 rounded-full flex items-center justify-center mb-4">
                <FunnelIcon className="w-8 h-8 text-gray-400 dark:text-white" />
              </div>
              <p className="text-sm font-bold text-gray-500 dark:text-white">
                No notifications found
              </p>
              <p className="text-xs text-gray-400 mt-1">
                Try changing your filters or check back later.
              </p>
            </div>
          ) : (
            groupOrder.map((groupKey) => {
              const items = groupedData[groupKey];
              if (!items || items.length === 0) return null;

              return (
                <div
                  key={groupKey}
                  className="animate-in fade-in slide-in-from-bottom-4 duration-500"
                >
                  <h3 className="text-[10px] font-bold text-gray-400 dark:text-white/40 uppercase tracking-widest mb-3 ml-2 sticky top-0 bg-white dark:bg-vn-navy-100 z-10 py-1">
                    {groupKey}
                  </h3>

                  <div className="space-y-3">
                    {items.map((item: Notification) => {
                      const { icon: Icon, color, border } = getIconData(item);
                      const isUrgent = item.priority === "Urgent";
                      const isUnread = !item.is_read && !item.is_announcement;

                      return (
                        <div
                          key={item.id}
                          onClick={() => {
                            if (isUnread) handleMarkAsRead(item.id);
                          }}
                          className={`
                            relative overflow-hidden p-4 md:p-5 rounded-3xl border transition-all duration-300 group cursor-pointer
                            ${
                              isUnread
                                ? "bg-white dark:bg-vn-navy-300 border-blue-100 dark:border-blue-500/30 shadow-md hover:shadow-lg"
                                : "bg-gray-50 dark:bg-white/5 border-gray-100 dark:border-white/5 opacity-75 hover:opacity-100"
                            }
                            ${isUrgent ? "border-l-4 border-l-red-500 dark:border-l-red-500" : ""}
                          `}
                        >
                          {/* Pulsing Blue Dot for Unread */}
                          {isUnread && (
                            <div className="absolute top-4 right-4 flex h-3 w-3">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-3 w-3 bg-blue-500"></span>
                            </div>
                          )}

                          <div className="flex items-start gap-4 pr-6">
                            {/* Icon Box */}
                            <div
                              className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 border transition-transform group-hover:scale-105 ${color} ${border}`}
                            >
                              <Icon className="w-6 h-6" />
                            </div>

                            {/* Content */}
                            <div className="flex-1 min-w-0">
                              <div className="flex flex-col md:flex-row md:items-center justify-between mb-1 gap-1">
                                <h3
                                  className={`text-sm md:text-base font-bold truncate pr-2 flex items-center ${isUrgent ? "text-red-600 dark:text-red-400" : "text-gray-900 dark:text-white"}`}
                                >
                                  {item.title}
                                  {getOvertimeBadge(item)}
                                </h3>
                                <span className="text-[10px] font-medium text-gray-400 dark:text-gray-500 shrink-0 whitespace-nowrap">
                                  {formatDistanceToNow(
                                    new Date(item.created_at),
                                    { addSuffix: true },
                                  )}
                                </span>
                              </div>
                              <p
                                className={`text-xs md:text-sm leading-relaxed line-clamp-2 ${isUnread ? "text-gray-600 dark:text-gray-200" : "text-gray-500 dark:text-gray-400"}`}
                              >
                                {item.description}
                              </p>

                              {/* Action Button */}
                              {isUnread && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleMarkAsRead(item.id);
                                  }}
                                  className="mt-3 flex items-center gap-1.5 text-[10px] md:text-xs font-bold text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition-colors"
                                >
                                  <CheckCircleIcon className="w-4 h-4" />
                                  Mark as read
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })
          )}

          {/* LOAD MORE BUTTON */}
          {totalFilteredCount > displayedData.length && (
            <button
              onClick={() => setVisibleCount((prev) => prev + 10)}
              className="w-full py-3.5 text-xs font-bold text-gray-500 dark:text-gray-300 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl hover:bg-gray-100 dark:hover:bg-white/10 transition-colors active:scale-95"
            >
              Load More ({totalFilteredCount - displayedData.length} remaining)
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

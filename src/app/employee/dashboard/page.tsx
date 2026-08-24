"use client";

export const dynamic = "force-dynamic";

import { useState, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import {
  format,
  startOfMonth,
  endOfMonth,
  getDaysInMonth,
  isSameDay,
  addMonths,
  subMonths,
  setMonth,
  setYear,
} from "date-fns";
import Link from "next/link";
import Image from "next/image";
import {
  BanknotesIcon,
  ClipboardDocumentListIcon,
  CalendarDaysIcon,
  ClockIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  BellIcon,
  UserCircleIcon,
  ArrowRightOnRectangleIcon,
  Cog6ToothIcon,
} from "@heroicons/react/24/outline";

type Announcement = {
  id: string;
  title: string;
  content: string;
  category: string;
  division: string;
  created_at: string;
};

export default function EmployeeDashboard() {
  const supabase = createClient();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [showAvatarMenu, setShowAvatarMenu] = useState(false);
  const avatarMenuRef = useRef<HTMLDivElement>(null);

  const [greeting, setGreeting] = useState("Good Morning");
  const [profile, setProfile] = useState({
    name: "Loading...",
    role: "Employee",
    division: "",
    avatarUrl: null as string | null,
  });

  const [todayAttendance, setTodayAttendance] = useState({
    clockIn: "--:--",
    clockOut: "-,-",
  });

  const [stats, setStats] = useState({
    onTime: 0,
    late: 0,
    leave: 0,
    totalDays: 0,
  });

  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [hasMoreAnnouncements, setHasMoreAnnouncements] = useState(false);
  const [hasActiveOvertime, setHasActiveOvertime] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  // --- CALENDAR LOGIC (NOW FULLY INTERACTIVE) ---
  const [currentDate, setCurrentDate] = useState(new Date()); // Controls the month viewed
  const [selectedDate, setSelectedDate] = useState(new Date()); // Controls the actual selected day
  const today = new Date();

  const daysInMonth = getDaysInMonth(currentDate);
  const firstDayOfMonth = new Date(
    currentDate.getFullYear(),
    currentDate.getMonth(),
    1,
  );
  const startingDayIndex = firstDayOfMonth.getDay();

  const calendarDays = Array.from({ length: 42 }, (_, i) => {
    const dayNumber = i - startingDayIndex + 1;
    if (dayNumber > 0 && dayNumber <= daysInMonth) {
      return new Date(
        currentDate.getFullYear(),
        currentDate.getMonth(),
        dayNumber,
      );
    }
    return null;
  });

  const handlePrevMonth = () => setCurrentDate(subMonths(currentDate, 1));
  const handleNextMonth = () => setCurrentDate(addMonths(currentDate, 1));

  const handleMonthChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newMonth = parseInt(e.target.value);
    setCurrentDate(setMonth(currentDate, newMonth));
  };

  const handleYearChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newYear = parseInt(e.target.value);
    setCurrentDate(setYear(currentDate, newYear));
  };

  const years = Array.from({ length: 11 }, (_, i) => 2025 + i);
  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];

  // --- 1. FETCH DAILY ATTENDANCE (Triggers when selectedDate changes) ---
  useEffect(() => {
    const fetchDailyAttendance = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const targetDate = format(selectedDate, "yyyy-MM-dd");

      const { data: att } = await supabase
        .from("attendance")
        .select("check_in_time, check_out_time")
        .eq("user_id", user.id)
        .eq("check_in_date", targetDate)
        .maybeSingle();

      if (att) {
        setTodayAttendance({
          clockIn: att.check_in_time
            ? format(new Date(att.check_in_time), "hh:mm a").toLowerCase()
            : "--:--",
          clockOut: att.check_out_time
            ? format(new Date(att.check_out_time), "hh:mm a").toLowerCase()
            : "-,-",
        });
      } else {
        setTodayAttendance({ clockIn: "--:--", clockOut: "-,-" });
      }
    };

    if (mounted) fetchDailyAttendance();
  }, [selectedDate, supabase, mounted]);

  // --- 2. NOTIFICATIONS & MAIN DATA FETCHING ---
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
        .channel("dashboard-notifications")
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "notifications",
            filter: `user_id=eq.${user.id}`,
          },
          () => fetchUnreadCount(),
        )
        .subscribe();
    };

    fetchUnreadCount();
    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, [supabase]);

  useEffect(() => {
    setMounted(true);

    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) setGreeting("Good Morning");
    else if (hour >= 12 && hour < 18) setGreeting("Good afternoon");
    else setGreeting("Good evening");

    const fetchData = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        checkOvertime(user.id);

        const { data: emp } = await supabase
          .from("employees")
          .select("full_name, role, avatar_url, division")
          .eq("id", user.id)
          .single();

        let currentDivision = "";

        if (emp) {
          currentDivision = emp.division;
          setProfile({
            name: emp.full_name,
            role: emp.role || "Employee",
            division: emp.division,
            avatarUrl: emp.avatar_url,
          });
        }

        const start = format(startOfMonth(new Date()), "yyyy-MM-dd");
        const end = format(endOfMonth(new Date()), "yyyy-MM-dd");

        const { data: monthlyAtt } = await supabase
          .from("attendance")
          .select("status, check_in_time")
          .eq("user_id", user.id)
          .gte("check_in_date", start)
          .lte("check_in_date", end);

        let onTimeCount = 0;
        let lateCount = 0;

        if (monthlyAtt) {
          monthlyAtt.forEach((item) => {
            const statusLower = item.status ? item.status.toLowerCase() : "";
            let isActuallyLate = false;
            if (item.check_in_time) {
              const checkInDate = new Date(item.check_in_time);
              if (
                checkInDate.getHours() > 9 ||
                (checkInDate.getHours() === 9 && checkInDate.getMinutes() > 30)
              ) {
                isActuallyLate = true;
              }
            }
            if (statusLower.includes("late") || isActuallyLate) {
              lateCount++;
            } else {
              onTimeCount++;
            }
          });
        }

        const { count: leaveCount } = await supabase
          .from("leaves")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.id)
          .eq("status", "approved")
          .gte("start_date", start);

        const totalLeaves = leaveCount || 0;
        setStats({
          onTime: onTimeCount,
          late: lateCount,
          leave: totalLeaves,
          totalDays: onTimeCount + lateCount + totalLeaves,
        });

        if (currentDivision) {
          const { data: annData } = await supabase
            .from("announcements")
            .select("*")
            .or(`division.eq.All,division.eq.${currentDivision}`)
            .order("created_at", { ascending: false })
            .limit(4);

          if (annData) {
            setHasMoreAnnouncements(annData.length > 3);
            setAnnouncements(annData.slice(0, 3) as any);
          }
        }
      }
    };

    fetchData();
  }, [supabase]);

  const calculateChartStyle = () => {
    const total = stats.totalDays === 0 ? 1 : stats.totalDays;
    const onTimePct = (stats.onTime / total) * 100;
    const latePct = onTimePct + (stats.late / total) * 100;

    if (stats.totalDays === 0)
      return { background: `conic-gradient(#32D74B 0% 100%)` };
    return {
      background: `conic-gradient(#32D74B 0% ${onTimePct}%, #EF4444 ${onTimePct}% ${latePct}%, #478ffc ${latePct}% 100%)`,
    };
  };

  const getAnnouncementStyle = (category: string) => {
    switch (category?.toLowerCase()) {
      case "urgent":
        return { badge: "text-red-500", borderLeft: "border-l-red-500" };
      case "event":
        return { badge: "text-purple-500", borderLeft: "border-l-purple-500" };
      case "maintenance":
        return { badge: "text-orange-500", borderLeft: "border-l-orange-500" };
      default:
        return { badge: "text-vn-primary", borderLeft: "border-l-vn-primary" };
    }
  };

  const checkOvertime = async (userId: string) => {
    const { count } = await supabase
      .from("overtimes")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("status", "approved");
    if (count && count > 0) setHasActiveOvertime(true);
  };

  // Close avatar dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        avatarMenuRef.current &&
        !avatarMenuRef.current.contains(e.target as Node)
      ) {
        setShowAvatarMenu(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/");
  };

  if (!mounted) return null;

  return (
    <div className="w-full min-h-screen xl:h-screen xl:overflow-hidden font-sans transition-colors duration-500 p-4 md:p-6 lg:p-8 flex flex-col items-center bg-linear-to-b from-vn-primary to-vn-secondary dark:bg-linear-to-b dark:from-[#001B48] dark:to-[#3B7CDE]">
      {/* TOP RIGHT — BELL + AVATAR (consistent with task page) */}
      <div className="w-full max-w-[1400px] flex justify-end items-center gap-3 mb-4 pr-4 shrink-0">
        <Link href="/employee/notification" className="relative">
          <BellIcon className="w-7 h-7 text-white dark:text-white/80 hover:text-yellow-300 dark:hover:text-white cursor-pointer transition-colors" />
          {unreadCount > 0 && (
            <span className="absolute -top-1.5 -right-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-black text-white shadow-sm border border-vn-primary dark:border-[#001B48]">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </Link>
        {/* Avatar with dropdown */}
        <div ref={avatarMenuRef} className="relative">
          <button
            onClick={() => setShowAvatarMenu((v) => !v)}
            className="w-9 h-9 rounded-full bg-gray-200 overflow-hidden shadow-sm relative border-2 border-white/30 hover:ring-2 hover:ring-white/50 transition-all focus:outline-none"
          >
            {profile.avatarUrl ? (
              <Image
                src={profile.avatarUrl}
                alt="Profile"
                fill
                className="object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-vn-primary text-white font-black text-sm">
                {profile.name.charAt(0)}
              </div>
            )}
          </button>

          {showAvatarMenu && (
            <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-[#1D2125] rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-700 z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
              {/* User info header */}
              <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700">
                <p className="text-sm font-bold text-gray-900 dark:text-white truncate">
                  {profile.name}
                </p>
                <p className="text-xs text-gray-400 dark:text-gray-400 capitalize truncate">
                  {profile.role}
                </p>
              </div>
              {/* Menu items */}
              <div className="py-1.5">
                <Link
                  href="/employee/setting"
                  onClick={() => setShowAvatarMenu(false)}
                >
                  <div className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors cursor-pointer">
                    <UserCircleIcon className="w-4 h-4 text-gray-400" />
                    View Profile
                  </div>
                </Link>
                <Link
                  href="/employee/setting/edit"
                  onClick={() => setShowAvatarMenu(false)}
                >
                  <div className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors cursor-pointer">
                    <Cog6ToothIcon className="w-4 h-4 text-gray-400" />
                    Settings
                  </div>
                </Link>
              </div>
              <div className="border-t border-gray-100 dark:border-gray-700 py-1.5">
                <button
                  onClick={handleSignOut}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors cursor-pointer"
                >
                  <ArrowRightOnRectangleIcon className="w-4 h-4" />
                  Sign Out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="w-full max-w-[1900px] flex-1 xl:min-h-0 bg-white dark:bg-vn-navy-100 rounded-[2.5rem] p-6 lg:p-8 shadow-2xl flex flex-col xl:flex-row gap-6 transition-colors duration-500">
        {/* --- LEFT COLUMN --- */}
        <div className="flex-1 flex flex-col gap-4 lg:gap-5 xl:h-full xl:overflow-y-auto custom-scrollbar p-1">
          {/* PROFILE GREETING */}
          <div className="flex items-center gap-5 pl-2 shrink-0">
            <div className="w-16 h-16 md:w-20 md:h-20 rounded-full border-[3px] border-white/20 dark:border-white shadow-lg overflow-hidden relative bg-gray-100 dark:bg-white shrink-0">
              {profile.avatarUrl ? (
                <Image
                  src={profile.avatarUrl}
                  alt="Profile"
                  fill
                  className="object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-vn-primary text-white font-black text-2xl">
                  {profile.name.charAt(0)}
                </div>
              )}
            </div>
            <div>
              <p className="text-gray-500 dark:text-white/80 text-sm md:text-base tracking-wide mb-0.5">
                {greeting}
              </p>
              <h1 className="text-2xl md:text-4xl font-bold text-gray-900 dark:text-white tracking-tight leading-none">
                {profile.name}
              </h1>
            </div>
          </div>

          {/* ATTENDANCE CARD */}
          <div className="bg-[#EAE9E9] dark:bg-vn-navy-300 p-5 md:p-6 rounded-4xl shadow-sm border border-gray-100 dark:border-none flex flex-col gap-4 transition-colors duration-300 shrink-0">
            {/* NEW: Date Indicator Header */}
            <div className="flex justify-between items-center px-2">
              <h3 className="text-sm font-bold text-gray-900 dark:text-white">
                Daily Attendance
              </h3>
              <span
                className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full ${isSameDay(selectedDate, new Date()) ? "bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300" : "bg-gray-200 text-gray-600 dark:bg-white/10 dark:text-gray-300"}`}
              >
                {isSameDay(selectedDate, new Date())
                  ? "Today"
                  : format(selectedDate, "dd MMM yyyy")}
              </span>
            </div>

            <div className="flex justify-between items-center w-full px-4">
              <div className="flex-1 text-center">
                <p className="text-xs text-gray-500 dark:text-white/70 mb-1.5 font-bold">
                  Clock In
                </p>
                <p
                  className={`text-2xl md:text-3xl font-black tracking-tight ${todayAttendance.clockIn !== "--:--" ? "text-gray-900 dark:text-white" : "text-slate-300 dark:text-slate-500"}`}
                >
                  {todayAttendance.clockIn}
                </p>
              </div>

              <div className="flex-1 text-center">
                <p className="text-xs text-gray-500 dark:text-white/70 mb-1.5 font-bold">
                  Clock Out
                </p>
                <p
                  className={`text-2xl md:text-3xl font-black tracking-tight ${todayAttendance.clockOut !== "-,-" ? "text-gray-900 dark:text-white" : "text-slate-300 dark:text-slate-500"}`}
                >
                  {todayAttendance.clockOut}
                </p>
              </div>
            </div>

            <Link href="/employee/scan" className="w-full">
              <button className="w-full py-3.5 bg-vn-primary dark:bg-[#3B7CDE] hover:brightness-110 text-white rounded-full font-bold shadow-md transition-all active:scale-95 text-base tracking-wide border-none flex items-center justify-center">
                Take Attendance
              </button>
            </Link>
          </div>

          {/* QUICK ACTIONS CARD */}
          <div className="bg-[#EAE9E9] dark:bg-vn-navy-300 p-5 md:p-6 rounded-4xl shadow-sm border border-gray-100 dark:border-none transition-colors duration-300 shrink-0">
            <h3 className="text-sm md:text-base font-bold text-gray-900 dark:text-white mb-4 pl-2 lg:mb-6">
              Quick Action
            </h3>
            <div className="grid grid-cols-4 place-items-center px-1 md:px-4 lg:px-8">
              {[
                {
                  name: "Leave",
                  icon: CalendarDaysIcon,
                  href: "/employee/leave",
                },
                {
                  name: "Overtime",
                  icon: ClockIcon,
                  href: "/employee/overtime",
                },
                {
                  name: "Task",
                  icon: ClipboardDocumentListIcon,
                  href: "/employee/task",
                },
                {
                  name: "Payslip",
                  icon: BanknotesIcon,
                  href: "/employee/payslip",
                },
              ].map((item) => (
                <Link
                  href={item.href}
                  key={item.name}
                  className="flex flex-col items-center gap-2 md:gap-3 group"
                >
                  <div className="relative">
                    <div className="w-12 h-12 md:w-16 md:h-16 lg:w-[72px] lg:h-[72px] bg-vn-primary dark:bg-[#3B7CDE] rounded-xl lg:rounded-2xl flex items-center justify-center shadow-md group-hover:scale-110 group-hover:shadow-xl transition-all duration-300">
                      <item.icon
                        className="w-6 h-6 md:w-8 md:h-8 lg:w-9 lg:h-9 text-white"
                        strokeWidth={2}
                      />
                    </div>
                    {item.name === "Overtime" && hasActiveOvertime && (
                      <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4 md:h-5 md:w-5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-4 w-4 md:h-5 md:w-5 bg-red-500 border-2 border-[#EAE9E9] dark:border-vn-navy-300"></span>
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] md:text-xs lg:text-sm font-bold text-gray-600 dark:text-white transition-colors group-hover:text-vn-primary dark:group-hover:text-blue-300">
                    {item.name}
                  </span>
                </Link>
              ))}
            </div>
          </div>

          {/* MONTHLY REPORT CARD */}
          <div className="bg-[#EAE9E9] dark:bg-vn-navy-300 p-5 md:p-6 rounded-4xl shadow-sm border border-gray-100 dark:border-none flex flex-row items-center justify-between gap-4 xl:flex-1 transition-colors duration-300 min-h-[200px]">
            <div className="flex flex-col justify-center h-full">
              <h3 className="text-sm font-bold text-gray-900 dark:text-white">
                Monthly Report
              </h3>
              <span className="text-xs text-gray-400 dark:text-gray-300 block mt-0.5">
                {format(new Date(), "MMMM yyyy")}
              </span>

              <div className="mt-4 space-y-2">
                <div className="flex items-center justify-between gap-4 md:gap-8">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-[#32D74B]"></div>
                    <span className="text-xs text-gray-500 dark:text-gray-300 font-bold">
                      On Time
                    </span>
                  </div>
                  <span className="text-sm font-black text-gray-800 dark:text-white">
                    {stats.onTime}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-4 md:gap-8">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-red-500"></div>
                    <span className="text-xs text-gray-500 dark:text-gray-300 font-bold">
                      Late
                    </span>
                  </div>
                  <span className="text-sm font-black text-gray-800 dark:text-white">
                    {stats.late}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-4 md:gap-8">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-vn-primary dark:bg-[#3B7CDE]"></div>
                    <span className="text-xs text-gray-500 dark:text-gray-300 font-bold">
                      Leave
                    </span>
                  </div>
                  <span className="text-sm font-black text-gray-800 dark:text-white">
                    {stats.leave}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex flex-col items-center gap-2 h-full justify-center shrink-0">
              <Link href="/employee/report">
                <span className="text-[10px] text-gray-400 dark:text-white font-bold cursor-pointer hover:underline">
                  See detail
                </span>
              </Link>
              <div className="relative w-24 h-24 md:w-28 md:h-28 shrink-0">
                <div
                  className="w-full h-full rounded-full shadow-inner transform -rotate-90 transition-all duration-1000"
                  style={calculateChartStyle()}
                ></div>
                <div className="absolute inset-0 m-auto w-[70%] h-[70%] bg-gray-50 dark:bg-vn-navy-300 rounded-full flex flex-col items-center justify-center shadow-sm transition-colors duration-300">
                  <span className="text-2xl font-black text-gray-900 dark:text-white">
                    {stats.totalDays}
                  </span>
                  <span className="text-[7px] font-bold text-gray-400 dark:text-gray-300 uppercase tracking-widest mt-1">
                    Total Days
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* --- RIGHT COLUMN --- */}
        <div className="w-full xl:w-[420px] bg-[#EAE9E9] dark:bg-vn-navy-300 p-5 md:p-6 rounded-4xl shadow-sm border border-gray-100 dark:border-none flex flex-col gap-5 transition-colors duration-300 xl:h-full xl:min-h-0">
          {/* CUSTOM CALENDAR WIDGET */}
          <div className="bg-white dark:bg-white rounded-2xl p-5 shadow-sm shrink-0">
            <div className="flex justify-between items-center mb-5">
              <button
                onClick={handlePrevMonth}
                className="p-1 hover:bg-gray-100 rounded-full transition-colors"
              >
                <ChevronLeftIcon
                  className="w-4 h-4 text-gray-600"
                  strokeWidth={2.5}
                />
              </button>

              <div className="flex gap-2">
                <div className="relative">
                  <select
                    value={currentDate.getMonth()}
                    onChange={handleMonthChange}
                    className="appearance-none bg-gray-50 border border-gray-200 text-black text-xs font-bold py-1.5 pl-3 pr-8 rounded-lg outline-none cursor-pointer hover:border-gray-300 focus:ring-2 focus:ring-vn-primary/20 transition-all"
                  >
                    {months.map((m, idx) => (
                      <option key={m} value={idx}>
                        {m}
                      </option>
                    ))}
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-black">
                    <svg
                      className="fill-current h-3 w-3"
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 20 20"
                    >
                      <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
                    </svg>
                  </div>
                </div>

                <div className="relative">
                  <select
                    value={currentDate.getFullYear()}
                    onChange={handleYearChange}
                    className="appearance-none bg-gray-50 border border-gray-200 text-black text-xs font-bold py-1.5 pl-3 pr-8 rounded-lg outline-none cursor-pointer hover:border-gray-300 focus:ring-2 focus:ring-vn-primary/20 transition-all"
                  >
                    {years.map((y) => (
                      <option key={y} value={y}>
                        {y}
                      </option>
                    ))}
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-black">
                    <svg
                      className="fill-current h-3 w-3"
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 20 20"
                    >
                      <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
                    </svg>
                  </div>
                </div>
              </div>

              <button
                onClick={handleNextMonth}
                className="p-1 hover:bg-gray-100 rounded-full transition-colors"
              >
                <ChevronRightIcon
                  className="w-4 h-4 text-gray-600"
                  strokeWidth={2.5}
                />
              </button>
            </div>

            <div className="grid grid-cols-7 text-center mb-2">
              {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((day) => (
                <span
                  key={day}
                  className="text-[10px] font-bold text-black uppercase tracking-wider"
                >
                  {day}
                </span>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-y-2 text-center">
              {calendarDays.map((date, index) => {
                if (!date) return <div key={index}></div>;

                const isToday = isSameDay(date, new Date());
                const isSelected = isSameDay(date, selectedDate);

                return (
                  <div key={index} className="flex justify-center items-center">
                    <span
                      onClick={() => setSelectedDate(date)}
                      className={`w-7 h-7 flex items-center justify-center rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        isSelected
                          ? "bg-vn-primary dark:bg-[#3B7CDE] text-white shadow-md scale-110"
                          : isToday
                            ? "bg-gray-200 dark:bg-white/20 text-gray-900 dark:text-gray-300"
                            : "text-gray-700 dark:text-black hover:bg-gray-100 dark:hover:bg-white/5"
                      }`}
                    >
                      {date.getDate()}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ANNOUNCEMENT BOXES */}
          <div className="xl:flex-1 flex flex-col gap-3 xl:overflow-y-auto xl:pr-1 custom-scrollbar xl:min-h-0">
            {announcements.length > 0 ? (
              <>
                {announcements.map((item) => {
                  const style = getAnnouncementStyle(item.category);
                  return (
                    <div
                      key={item.id}
                      className={`bg-white rounded-2xl p-4 shadow-sm min-h-[85px] shrink-0 flex flex-col justify-center border border-gray-100 border-l-4 ${style.borderLeft} cursor-pointer hover:shadow-md transition-shadow`}
                    >
                      <div className="flex justify-between items-center mb-1">
                        <span
                          className={`text-[9px] font-black uppercase ${style.badge}`}
                        >
                          {item.category || "Info"}
                        </span>
                        <span className="text-[9px] font-bold text-gray-400">
                          {format(new Date(item.created_at), "dd MMM")}
                        </span>
                      </div>
                      <h4 className="font-bold text-xs text-gray-800 line-clamp-1">
                        {item.title}
                      </h4>
                      <p className="text-[11px] text-gray-500 line-clamp-1 mt-0.5">
                        {item.content}
                      </p>
                    </div>
                  );
                })}
                {hasMoreAnnouncements && (
                  <Link
                    href="/employee/notification"
                    className="w-full text-center py-2 text-xs font-bold text-vn-primary hover:underline transition-all"
                  >
                    See more notifications →
                  </Link>
                )}
              </>
            ) : (
              <>
                <div className="bg-white rounded-2xl p-4 shadow-sm min-h-[85px] shrink-0 border border-gray-100 flex items-center justify-center">
                  <span className="text-xs font-bold text-gray-300">
                    No new announcements
                  </span>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

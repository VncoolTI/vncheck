"use client";

export const dynamic = "force-dynamic";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase";
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameDay,
  addMonths,
  subMonths,
  isWeekend,
  getDay,
  setMonth,
  setYear,
} from "date-fns";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  ClockIcon,
  MapPinIcon,
  CalendarDaysIcon,
  CheckCircleIcon,
  BriefcaseIcon,
  XCircleIcon,
  PhotoIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline"; // Changed to outline for sharper look
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";

// --- TYPES ---
type AttendanceRecord = {
  check_in_time: string | null;
  check_out_time: string | null;
  status: string;
  check_in_date: string;
  check_in_location: string | null;
  check_in_photo_url?: string | null;
  check_out_photo_url?: string | null;
  check_in_image?: string | null;
  check_out_image?: string | null;
};

type LeaveRecord = {
  start_date: string;
  end_date: string;
  type: string;
  reason: string;
  status: string;
};

export default function EmployeeReportPage() {
  const supabase = createClient();
  const [mounted, setMounted] = useState(false); // To prevent hydration mismatch
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [loading, setLoading] = useState(true);

  // Data State
  const [attendanceData, setAttendanceData] = useState<AttendanceRecord[]>([]);
  const [leaveData, setLeaveData] = useState<LeaveRecord[]>([]);

  // Stats State
  const [stats, setStats] = useState({
    onTime: 0,
    late: 0,
    permission: 0,
    totalWorkDays: 0,
    performanceRate: 0,
  });

  // Modals
  const [photoModal, setPhotoModal] = useState<{
    isOpen: boolean;
    url: string | null;
    loading: boolean;
  }>({ isOpen: false, url: null, loading: false });

  const [mapModal, setMapModal] = useState({ isOpen: false, lat: 0, lng: 0 });

  useEffect(() => {
    setMounted(true);
  }, []);

  // --- 1. FETCH DATA (YOUR ORIGINAL LOGIC) ---
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        const start = format(startOfMonth(currentDate), "yyyy-MM-dd");
        const end = format(endOfMonth(currentDate), "yyyy-MM-dd");

        const { data: att } = await supabase
          .from("attendance")
          .select("*")
          .eq("user_id", user.id)
          .gte("check_in_date", start)
          .lte("check_in_date", end);

        const { data: lvs } = await supabase
          .from("leaves")
          .select("*")
          .eq("user_id", user.id)
          .eq("status", "Approved")
          .or(`start_date.lte.${end},end_date.gte.${start}`);

        setAttendanceData((att as AttendanceRecord[]) || []);
        setLeaveData((lvs as LeaveRecord[]) || []);
      }
      setLoading(false);
    };

    fetchData();
  }, [currentDate, supabase]);

  // --- 2. CALCULATE STATS (YOUR ORIGINAL LOGIC) ---
  useEffect(() => {
    if (loading) return;

    let dailyLate = 0;
    let dailyOnTime = 0;
    let dailyPermit = 0;
    let workDays = 0;

    const daysInMonth = eachDayOfInterval({
      start: startOfMonth(currentDate),
      end: endOfMonth(currentDate),
    });

    daysInMonth.forEach((day) => {
      if (isWeekend(day)) return;
      workDays++;

      const dayStr = format(day, "yyyy-MM-dd");

      const att = attendanceData.find((a) => a.check_in_date === dayStr);
      if (att) {
        if (att.status?.toLowerCase().includes("late")) dailyLate++;
        else dailyOnTime++;
        return;
      }

      const leave = leaveData.find(
        (l) => dayStr >= l.start_date && dayStr <= l.end_date,
      );
      if (leave) dailyPermit++;
    });

    const totalPresent = dailyOnTime + dailyLate;
    const rate =
      totalPresent > 0 ? Math.round((dailyOnTime / totalPresent) * 100) : 0;

    setStats({
      onTime: dailyOnTime,
      late: dailyLate,
      permission: dailyPermit,
      totalWorkDays: workDays,
      performanceRate: rate,
    });
  }, [attendanceData, leaveData, loading, currentDate]);

  // --- 3. HELPER: GET DAY STATUS (YOUR ORIGINAL LOGIC) ---
  const getDayDetails = (date: Date) => {
    const dayStr = format(date, "yyyy-MM-dd");

    const leave = leaveData.find(
      (l) => dayStr >= l.start_date && dayStr <= l.end_date,
    );
    if (leave) return { type: "Leave", data: leave };

    const att = attendanceData.find((a) => a.check_in_date === dayStr);
    if (att) {
      return {
        type: att.status?.toLowerCase().includes("late") ? "Late" : "OnTime",
        data: att,
      };
    }

    return { type: "Empty", data: null };
  };

  // --- 4. DATA PROCESSING FOR UI ---
  const daysInMonth = eachDayOfInterval({
    start: startOfMonth(currentDate),
    end: endOfMonth(currentDate),
  });
  const startDay = getDay(startOfMonth(currentDate));
  const emptyDays = Array(startDay).fill(null);
  const selectedDetails = getDayDetails(selectedDate);

  // Graph Data
  const graphData = daysInMonth.map((day) => {
    const dayStr = format(day, "yyyy-MM-dd");
    const att = attendanceData.find((a) => a.check_in_date === dayStr);

    if (!att || !att.check_in_time) {
      return {
        day: format(day, "d"),
        time: null,
        label: "Absent",
        status: "Absent",
      };
    }

    const dateObj = new Date(att.check_in_time);
    const decimalTime = dateObj.getHours() + dateObj.getMinutes() / 60;

    return {
      day: format(day, "d"),
      time: decimalTime,
      label: format(dateObj, "HH:mm"),
      status: att.status,
    };
  });

  const formatYAxisTime = (decimal: number) => {
    const hours = Math.floor(decimal);
    const minutes = Math.round((decimal - hours) * 60);
    return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`;
  };

  // --- 5. HANDLERS ---
  const viewSecurePhoto = async (imagePath: string) => {
    setPhotoModal({ isOpen: true, url: null, loading: true });

    try {
      const { data, error } = await supabase.storage
        .from("attendance_photos")
        .createSignedUrl(imagePath, 60);

      if (error) throw error;
      setPhotoModal({ isOpen: true, url: data.signedUrl, loading: false });
    } catch (error) {
      console.error("Gagal memuat foto:", error);
      alert("Gagal memuat foto absensi.");
      setPhotoModal({ isOpen: false, url: null, loading: false });
    }
  };

  const handleViewLocation = (locationData: string | null) => {
    if (!locationData) {
      alert("No location data recorded for this day.");
      return;
    }

    let lat = 0;
    let lng = 0;

    if (locationData.startsWith("POINT")) {
      const matches = locationData.match(
        /POINT\s*\(\s*([^ ]+)\s+([^ ]+)\s*\)/i,
      );
      if (matches) {
        lng = parseFloat(matches[1]);
        lat = parseFloat(matches[2]);
      }
    } else {
      // Hex parsing fallback
      try {
        const hexString = locationData;
        const buffer = new ArrayBuffer(hexString.length / 2);
        const view = new DataView(buffer);
        for (let i = 0; i < hexString.length; i += 2) {
          view.setUint8(i / 2, parseInt(hexString.substr(i, 2), 16));
        }
        const littleEndian = view.getUint8(0) === 1;
        lng = view.getFloat64(9, littleEndian);
        lat = view.getFloat64(17, littleEndian);
      } catch (err) {
        console.error("Hex Parse Error:", err);
        alert(`Could not parse location data.`);
        return;
      }
    }
    if (lat && lng) {
      setMapModal({ isOpen: true, lat, lng });
    } else {
      alert("Invalid coordinates found.");
    }
  };

  if (!mounted) return null;

  return (
    <div className="w-full min-h-screen xl:h-screen xl:overflow-hidden font-sans transition-colors duration-500 p-4 md:p-6 lg:p-8 flex flex-col items-center bg-linear-to-b from-vn-primary to-vn-secondary dark:bg-linear-to-b dark:from-[#001B48] dark:to-[#3B7CDE]">
      {/* HEADER AREA */}
      <div className="w-full max-w-[1400px] flex justify-between items-end mb-6 shrink-0">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold text-white dark:text-white tracking-tight">
            Reports
          </h1>
          <p className="text-white dark:text-blue-100/80 text-sm mt-1">
            Daily Report • {format(selectedDate, "dd MMMM yyyy")}
          </p>
        </div>

        {/* Month Selector */}
        <div className="hidden md:flex items-center bg-white dark:bg-vn-navy-100 rounded-full p-1 shadow-sm border border-gray-100 dark:border-none">
          <button
            onClick={() => setCurrentDate(subMonths(currentDate, 1))}
            className="p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-full text-gray-600 dark:text-white transition-colors"
          >
            <ChevronLeftIcon className="w-5 h-5" />
          </button>

          {/* Dropdowns Container */}
          <div className="flex items-center justify-center gap-1 px-2 min-w-[140px]">
            {/* MONTH SELECT */}
            <div className="relative group">
              <select
                value={currentDate.getMonth()}
                onChange={(e) =>
                  setCurrentDate(
                    setMonth(currentDate, parseInt(e.target.value)),
                  )
                }
                className="appearance-none bg-transparent font-bold text-gray-800 dark:text-white text-sm cursor-pointer outline-none text-center hover:text-vn-primary transition-colors pr-4 py-1"
              >
                {[
                  "January",
                  "February",
                  "March",
                  "April",
                  "May",
                  "June",
                  "July",
                  "August",
                  "September",
                  "October",
                  "November",
                  "December",
                ].map((m, i) => (
                  <option key={m} value={i} className="text-gray-900 bg-white">
                    {m}
                  </option>
                ))}
              </select>
            </div>

            {/* YEAR SELECT */}
            <div className="relative group">
              <select
                value={currentDate.getFullYear()}
                onChange={(e) =>
                  setCurrentDate(setYear(currentDate, parseInt(e.target.value)))
                }
                className="appearance-none bg-transparent font-bold text-gray-800 dark:text-white text-sm cursor-pointer outline-none text-center hover:text-vn-primary transition-colors py-1"
              >
                {Array.from({ length: 11 }, (_, i) => 2025 + i).map((y) => (
                  <option key={y} value={y} className="text-gray-900 bg-white">
                    {y}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Next Month Button */}
          <button
            onClick={() => setCurrentDate(addMonths(currentDate, 1))}
            className="p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-full text-gray-600 dark:text-white transition-colors"
          >
            <ChevronRightIcon className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* MAIN CONTENT CONTAINER */}
      <div className="w-full max-w-[1400px] flex-1 xl:min-h-0 bg-white dark:bg-vn-navy-200 rounded-[2.5rem] p-6 lg:p-8 shadow-2xl flex flex-col gap-8 transition-colors duration-500 xl:overflow-y-auto custom-scrollbar">
        {/* --- ROW 1: STATS CARDS --- */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* ON TIME CARD */}
          <div className="bg-green-50 dark:bg-green-500/10 border border-green-100 dark:border-none p-5 rounded-4xl flex items-center justify-between relative overflow-hidden group">
            <div>
              <p className="text-xs font-bold text-green-600 dark:text-green-400 uppercase tracking-wider mb-1">
                On Time
              </p>
              <h3 className="text-3xl font-black text-gray-800 dark:text-white">
                {stats.onTime}
              </h3>
              <p className="text-[10px] font-bold text-green-500 mt-1 dark:text-green-400/70">
                {stats.performanceRate}% Rate
              </p>
            </div>
            <div className="w-12 h-12 bg-green-100 dark:bg-green-500/20 rounded-full flex items-center justify-center">
              <CheckCircleIcon className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
          </div>

          {/* LATE CARD */}
          <div className="bg-red-50 dark:bg-red-500/10 border border-red-100 dark:border-none p-5 rounded-4xl flex items-center justify-between relative overflow-hidden group">
            <div>
              <p className="text-xs font-bold text-red-600 dark:text-red-400 uppercase tracking-wider mb-1">
                Late
              </p>
              <h3 className="text-3xl font-black text-gray-800 dark:text-white">
                {stats.late}
              </h3>
              <p className="text-[10px] font-bold text-red-500 mt-1 dark:text-red-400/70">
                Days this month
              </p>
            </div>
            <div className="w-12 h-12 bg-red-100 dark:bg-red-500/20 rounded-full flex items-center justify-center">
              <ClockIcon className="w-6 h-6 text-red-600 dark:text-red-400" />
            </div>
          </div>

          {/* LEAVE CARD */}
          <div className="bg-yellow-50 dark:bg-yellow-500/10 border border-yellow-100 dark:border-none p-5 rounded-4xl flex items-center justify-between relative overflow-hidden group">
            <div>
              <p className="text-xs font-bold text-yellow-600 dark:text-yellow-400 uppercase tracking-wider mb-1">
                Leave
              </p>
              <h3 className="text-3xl font-black text-gray-800 dark:text-white">
                {stats.permission}
              </h3>
              <p className="text-[10px] font-bold text-yellow-500 mt-1 dark:text-yellow-400/70">
                Approved
              </p>
            </div>
            <div className="w-12 h-12 bg-yellow-100 dark:bg-yellow-500/20 rounded-full flex items-center justify-center">
              <BriefcaseIcon className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
            </div>
          </div>
        </div>

        {/* --- ROW 2: CALENDAR & DETAIL PANEL --- */}
        <div className="flex flex-col xl:flex-row gap-6">
          {/* LEFT: CALENDAR */}
          <div className="flex-1 bg-gray-50 dark:bg-vn-navy-300 rounded-[2.5rem] p-6 border border-gray-100 dark:border-none transition-colors">
            {/* Calendar Grid */}
            <div className="grid grid-cols-7 text-center mb-4">
              {["SU", "MO", "TU", "WE", "TH", "FR", "SA"].map((day) => (
                <span
                  key={day}
                  className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest"
                >
                  {day}
                </span>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-2 md:gap-4 text-center">
              {emptyDays.map((_, i) => (
                <div key={`empty-${i}`} />
              ))}

              {daysInMonth.map((date, i) => {
                const { type } = getDayDetails(date);
                const isSelected = isSameDay(date, selectedDate);
                const isToday = isSameDay(date, new Date());

                let dotColor = "hidden";
                if (type === "OnTime") dotColor = "bg-green-500";
                if (type === "Late") dotColor = "bg-red-500";
                if (type === "Leave") dotColor = "bg-yellow-400";

                return (
                  <div
                    key={i}
                    onClick={() => setSelectedDate(date)}
                    className={`
                                    relative aspect-square flex flex-col items-center justify-center rounded-2xl text-sm font-bold cursor-pointer transition-all border-2
                                    ${
                                      isSelected
                                        ? "bg-vn-primary border-vn-primary text-white shadow-lg scale-105 z-10"
                                        : "bg-transparent border-transparent hover:bg-white dark:hover:bg-white/10 text-gray-700 dark:text-gray-300"
                                    }
                                    ${isToday && !isSelected ? "border-blue-300 text-blue-600 dark:text-blue-400" : ""}
                                `}
                  >
                    <span className="z-10">{format(date, "d")}</span>
                    <div
                      className={`absolute bottom-1.5 w-1.5 h-1.5 rounded-full ${dotColor} ${isSelected ? "ring-2 ring-blue-500 border border-white" : ""}`}
                    ></div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* RIGHT: SELECTED DATE DETAIL */}
          <div className="w-full xl:w-[350px] bg-gray-50 dark:bg-vn-navy-300 rounded-[2.5rem] p-6 border border-gray-100 dark:border-none flex flex-col relative overflow-hidden transition-colors">
            <div className="text-center z-10 mb-6">
              <p className="text-xs font-bold text-gray-400 dark:text-gray-400 uppercase tracking-widest mb-1">
                Selected Date
              </p>
              <h2 className="text-3xl font-black text-gray-900 dark:text-white mb-1">
                {format(selectedDate, "dd MMM")}
              </h2>
              <p className="text-gray-500 dark:text-gray-400 font-medium text-sm">
                {format(selectedDate, "EEEE, yyyy")}
              </p>
            </div>

            <div className="w-full h-px bg-gray-200 dark:bg-white/10 mb-6"></div>

            <div className="flex-1 flex flex-col justify-center">
              {selectedDetails.type === "Empty" ? (
                <div className="text-center opacity-40 py-8">
                  <CalendarDaysIcon className="w-16 h-16 text-gray-400 dark:text-gray-500 mx-auto mb-2" />
                  <p className="text-sm font-bold text-gray-500 dark:text-gray-400">
                    No Activity
                  </p>
                  <p className="text-xs text-gray-400">No records found</p>
                </div>
              ) : selectedDetails.type === "Leave" ? (
                <div className="bg-yellow-50 dark:bg-yellow-500/10 p-4 rounded-2xl border border-yellow-100 dark:border-none text-center">
                  <BriefcaseIcon className="w-10 h-10 text-yellow-500 mx-auto mb-2" />
                  <h3 className="font-bold text-yellow-700 dark:text-yellow-400">
                    On Leave
                  </h3>
                  <p className="text-xs text-yellow-600 dark:text-yellow-300 mt-1">
                    {(selectedDetails.data as LeaveRecord)?.type}
                  </p>
                  <p className="text-[10px] text-yellow-800 dark:text-yellow-200/80 italic mt-2">
                    "{(selectedDetails.data as LeaveRecord).reason}"
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* CLOCK IN */}
                  <div className="bg-white dark:bg-black/20 p-4 rounded-2xl flex justify-between items-center shadow-sm">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-blue-50 dark:bg-blue-500/20 flex items-center justify-center text-blue-600 dark:text-blue-400">
                        <ClockIcon className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-[10px] text-gray-400 uppercase font-bold">
                          Clock In
                        </p>
                        <p className="text-lg font-black text-gray-900 dark:text-white">
                          {format(
                            new Date(
                              (selectedDetails.data as AttendanceRecord)
                                .check_in_time!,
                            ),
                            "HH:mm",
                          )}
                        </p>
                      </div>
                    </div>
                    {((selectedDetails.data as AttendanceRecord)
                      .check_in_photo_url ||
                      (selectedDetails.data as AttendanceRecord)
                        .check_in_image) && (
                      <button
                        onClick={() =>
                          viewSecurePhoto(
                            ((selectedDetails.data as AttendanceRecord)
                              .check_in_photo_url ||
                              (selectedDetails.data as AttendanceRecord)
                                .check_in_image) as string,
                          )
                        }
                        className="p-2 bg-gray-100 dark:bg-white/10 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-500/30 text-gray-600 dark:text-white transition-colors"
                      >
                        <PhotoIcon className="w-5 h-5" />
                      </button>
                    )}
                  </div>

                  {/* CLOCK OUT */}
                  <div className="bg-white dark:bg-black/20 p-4 rounded-2xl flex justify-between items-center shadow-sm">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-orange-50 dark:bg-orange-500/20 flex items-center justify-center text-orange-500 dark:text-orange-400">
                        <ClockIcon className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-[10px] text-gray-400 uppercase font-bold">
                          Clock Out
                        </p>
                        <p className="text-lg font-black text-gray-900 dark:text-white">
                          {(selectedDetails.data as AttendanceRecord)
                            .check_out_time
                            ? format(
                                new Date(
                                  (selectedDetails.data as AttendanceRecord)
                                    .check_out_time!,
                                ),
                                "HH:mm",
                              )
                            : "--:--"}
                        </p>
                      </div>
                    </div>
                    {((selectedDetails.data as AttendanceRecord)
                      .check_out_photo_url ||
                      (selectedDetails.data as AttendanceRecord)
                        .check_out_image) && (
                      <button
                        onClick={() =>
                          viewSecurePhoto(
                            ((selectedDetails.data as AttendanceRecord)
                              .check_out_photo_url ||
                              (selectedDetails.data as AttendanceRecord)
                                .check_out_image) as string,
                          )
                        }
                        className="p-2 bg-gray-100 dark:bg-white/10 rounded-lg hover:bg-orange-100 dark:hover:bg-orange-500/30 text-gray-600 dark:text-white transition-colors"
                      >
                        <PhotoIcon className="w-5 h-5" />
                      </button>
                    )}
                  </div>

                  {/* LOCATION BTN */}
                  <button
                    onClick={() =>
                      handleViewLocation(
                        (selectedDetails.data as AttendanceRecord)
                          .check_in_location,
                      )
                    }
                    className="w-full py-3 mt-2 flex items-center justify-center gap-2 bg-slate-100 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/20 text-slate-600 dark:text-white text-xs font-bold rounded-xl transition-colors"
                  >
                    <MapPinIcon className="w-4 h-4" />
                    View Location
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* --- ROW 3: ARRIVAL TREND GRAPH --- */}
        <div className="hidden md:block bg-gray-50 dark:bg-vn-navy-300 rounded-[2.5rem] p-6 lg:p-8 border border-gray-100 dark:border-none transition-colors">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                Arrival Trend
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Check-in times for {format(currentDate, "MMMM")}
              </p>
            </div>
            <div className="flex items-center gap-4 text-[10px] font-bold uppercase tracking-widest">
              <div className="flex items-center gap-1">
                <div className="w-3 h-0.5 bg-red-500"></div>
                <span className="text-red-500">Late Limit</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-vn-primary"></div>
                <span className="text-vn-primary dark:text-blue-400">
                  Your Arrival
                </span>
              </div>
            </div>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={graphData}
                margin={{ top: 20, right: 30, left: 0, bottom: 5 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke="var(--color-vn-navy-200)"
                  strokeOpacity={0.1}
                />
                <XAxis
                  dataKey="day"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "#94a3b8", fontSize: 11, fontWeight: "bold" }}
                  dy={10}
                />
                <YAxis
                  domain={[6, "auto"]}
                  padding={{ top: 1, bottom: 1 }}
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "#94a3b8", fontSize: 11 }}
                  tickFormatter={formatYAxisTime}
                  width={40}
                />
                <Tooltip
                  cursor={{ stroke: "#cbd5e1", strokeWidth: 1 }}
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-[#1E293B] text-white text-xs p-3 rounded-xl shadow-xl border border-slate-700">
                          <p className="font-bold mb-1 text-slate-300">
                            {data.day} {format(currentDate, "MMM")}
                          </p>
                          <p className="text-sm">
                            Arrival:{" "}
                            <span className="text-blue-400 font-bold">
                              {data.label}
                            </span>
                          </p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <ReferenceLine
                  y={9}
                  stroke="#EF4444"
                  strokeDasharray="4 4"
                  strokeWidth={2}
                />
                <Line
                  type="monotone"
                  dataKey="time"
                  stroke="#478ffc"
                  strokeWidth={3}
                  dot={{
                    r: 4,
                    fill: "#478ffc",
                    strokeWidth: 2,
                    stroke: "#fff",
                  }}
                  activeDot={{ r: 6, fill: "#201E1F", strokeWidth: 0 }}
                  connectNulls={true}
                  animationDuration={1500}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* --- MODALS --- */}

      {/* PHOTO MODAL */}
      {photoModal.isOpen && (
        <div className="fixed inset-0 z-999 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white p-2 rounded-2xl w-full max-w-sm relative">
            <button
              onClick={() =>
                setPhotoModal({ isOpen: false, url: null, loading: false })
              }
              className="absolute -top-12 right-0 p-2 bg-white/20 hover:bg-white/40 rounded-full text-white transition-colors"
            >
              <XMarkIcon className="w-6 h-6" />
            </button>
            {photoModal.loading ? (
              <div className="aspect-3/4 w-full flex flex-col items-center justify-center bg-gray-100 rounded-xl">
                <span className="loading loading-spinner text-blue-500 mb-2"></span>
                <span className="text-xs text-gray-500 font-medium">
                  Loading photo...
                </span>
              </div>
            ) : (
              <img
                src={photoModal.url!}
                alt="Evidence"
                className="w-full aspect-3/4 object-cover rounded-xl"
              />
            )}
          </div>
        </div>
      )}

      {/* MAP MODAL */}
      {mapModal.isOpen && (
        <div className="fixed inset-0 z-999 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-3xl h-[500px] rounded-3xl overflow-hidden shadow-2xl relative flex flex-col">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-white z-10">
              <div>
                <h3 className="text-lg font-bold text-gray-900">
                  Attendance Location
                </h3>
                <p className="text-xs text-gray-500">
                  Recorded coordinates during check-in
                </p>
              </div>
              <button
                onClick={() => setMapModal({ ...mapModal, isOpen: false })}
                className="p-2 bg-gray-100 hover:bg-red-50 hover:text-red-600 rounded-full transition-colors"
              >
                <XCircleIcon className="w-6 h-6" />
              </button>
            </div>
            <div className="flex-1 bg-gray-100 relative">
              <iframe
                width="100%"
                height="100%"
                frameBorder="0"
                scrolling="no"
                marginHeight={0}
                marginWidth={0}
                src={`https://maps.google.com/maps?q=${mapModal.lat},${mapModal.lng}&hl=id&z=17&output=embed`}
                className="w-full h-full"
              ></iframe>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

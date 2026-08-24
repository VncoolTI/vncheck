"use client";

export const dynamic = "force-dynamic";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import {
  ClockIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  BriefcaseIcon,
} from "@heroicons/react/24/outline";

type Overtime = {
  id: number;
  date: string;
  start_time: string;
  end_time: string;
  reason: string;
  status: "approved" | "completed" | "rejected" | "pending" | string;
  created_at: string;
};

export default function EmployeeOvertimePage() {
  const supabase = createClient();
  const router = useRouter();

  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [assignments, setAssignments] = useState<Overtime[]>([]);

  useEffect(() => {
    const init = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.push("/");
        return;
      }
      setUser(user);

      const { data } = await supabase
        .from("overtimes")
        .select("*")
        .eq("user_id", user.id)
        .order("date", { ascending: false });

      setAssignments((data as Overtime[]) || []);
      setLoading(false);

      const channel = supabase
        .channel("overtime-updates")
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "overtimes",
            filter: `user_id=eq.${user.id}`,
          },
          (payload) => {
            if (payload.eventType === "INSERT") {
              setAssignments((prev) => [payload.new as Overtime, ...prev]);
            } else if (payload.eventType === "UPDATE") {
              setAssignments((prev) =>
                prev.map((item) =>
                  item.id === payload.new.id ? (payload.new as Overtime) : item,
                ),
              );
            }
          },
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    };
    init();
  }, [router, supabase]);

  // --- FIXED: Badge Logic completely controlled by Database Status ---
  const getStatusBadge = (item: Overtime) => {
    if (item.status === "rejected") {
      return (
        <span className="flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-red-500 bg-red-50 dark:bg-red-500/10 px-3 py-1 rounded-full border border-red-100 dark:border-red-500/20 shadow-sm">
          <ExclamationCircleIcon className="w-3 h-3" /> Cancelled
        </span>
      );
    }
    if (item.status === "completed") {
      return (
        <span className="flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-green-500 bg-green-50 dark:bg-green-500/10 px-3 py-1 rounded-full border border-green-100 dark:border-green-500/20 shadow-sm">
          <CheckCircleIcon className="w-3 h-3" /> Completed
        </span>
      );
    }
    // Default Scheduled (Approved)
    return (
      <span className="flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-blue-500 bg-blue-50 dark:bg-blue-500/10 px-3 py-1 rounded-full border border-blue-100 dark:border-blue-500/20 shadow-sm">
        <ClockIcon className="w-3 h-3" /> Scheduled
      </span>
    );
  };

  // --- FIXED: Hierarchy Sorting Engine based strictly on Status ---
  const sortedAssignments = [...assignments].sort((a, b) => {
    // 1. Rejected always sinks to the bottom
    if (a.status === "rejected" && b.status !== "rejected") return 1;
    if (a.status !== "rejected" && b.status === "rejected") return -1;

    // 2. Completed goes below Active (Approved)
    if (a.status === "completed" && b.status !== "completed") return 1;
    if (a.status !== "completed" && b.status === "completed") return -1;

    // 3. Keep remaining newest first
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  if (loading) return null;

  return (
    <div className="w-full min-h-screen xl:h-screen xl:overflow-hidden font-sans transition-colors duration-500 p-4 md:p-6 lg:p-8 flex flex-col items-center bg-linear-to-b from-vn-primary to-vn-secondary dark:bg-linear-to-b dark:from-[#001B48] dark:to-[#3B7CDE]">
      <div className="w-full max-w-[1400px] flex justify-between items-end mb-6 shrink-0">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold text-white dark:text-white tracking-tight">
            Overtime
          </h1>
          <p className="text-white dark:text-blue-100/80 text-sm mt-1">
            Your assigned extra hours
          </p>
        </div>
      </div>

      <div className="w-full max-w-[1400px] flex-1 xl:min-h-0 bg-white dark:bg-vn-navy-200 rounded-[2.5rem] p-6 lg:p-8 shadow-2xl flex flex-col gap-8 transition-colors duration-500 overflow-hidden relative">
        {/* FIXED: Stats no longer rely on time, just the database tags */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 shrink-0">
          <div className="bg-blue-50 dark:bg-blue-500/10 p-5 rounded-3xl border border-blue-100 dark:border-blue-500/20">
            <p className="text-[10px] font-bold text-blue-400 uppercase tracking-widest mb-1">
              Total Assignments
            </p>
            <p className="text-3xl font-black text-blue-600 dark:text-blue-400">
              {assignments.filter((a) => a.status !== "rejected").length}
            </p>
          </div>
          <div className="bg-purple-50 dark:bg-purple-500/10 p-5 rounded-3xl border border-purple-100 dark:border-purple-500/20">
            <p className="text-[10px] font-bold text-purple-400 uppercase tracking-widest mb-1">
              Active / Upcoming
            </p>
            <p className="text-3xl font-black text-purple-600 dark:text-purple-400">
              {assignments.filter((a) => a.status === "approved").length}
            </p>
          </div>
        </div>

        <div className="flex-1 flex flex-col overflow-hidden">
          <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-4">
            Assignment History
          </h3>

          <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-4">
            {sortedAssignments.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center opacity-40">
                <BriefcaseIcon className="w-16 h-16 text-gray-400 mb-2" />
                <p className="text-sm font-bold text-gray-500 dark:text-white">
                  No overtime assigned
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  You're all caught up!
                </p>
              </div>
            ) : (
              sortedAssignments.map((item) => (
                <div
                  key={item.id}
                  className={`
                    p-6 rounded-3xl hover:shadow-lg transition-all group relative border flex flex-col
                    ${
                      item.status === "rejected"
                        ? "bg-gray-50/50 dark:bg-black/10 border-red-100 dark:border-red-500/20 opacity-70"
                        : "bg-white dark:bg-white/5 border-gray-100 dark:border-white/5"
                    }
                  `}
                >
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-4">
                      <div
                        className={`
                          w-12 h-12 rounded-2xl flex items-center justify-center font-black text-lg shadow-sm border
                          ${
                            item.status === "rejected"
                              ? "bg-red-50 dark:bg-red-500/10 text-red-500 border-red-100 dark:border-red-500/20"
                              : "bg-gray-50 dark:bg-white/10 text-gray-900 dark:text-white border-gray-200 dark:border-white/5"
                          }
                        `}
                      >
                        {format(new Date(item.date), "dd")}
                      </div>
                      <div>
                        <p
                          className={`text-xs font-bold uppercase tracking-wider ${item.status === "rejected" ? "text-red-400" : "text-gray-400"}`}
                        >
                          {format(new Date(item.date), "MMMM yyyy")}
                        </p>
                        <p
                          className={`text-lg font-black ${item.status === "rejected" ? "text-red-400 line-through" : "text-gray-900 dark:text-white"}`}
                        >
                          {format(new Date(item.date), "EEEE")}
                        </p>
                      </div>
                    </div>
                    {getStatusBadge(item)}
                  </div>

                  <div
                    className={`
                      flex flex-col md:flex-row gap-4 md:items-center p-4 rounded-2xl border
                      ${
                        item.status === "rejected"
                          ? "bg-white/40 dark:bg-black/20 border-red-50 dark:border-red-900/20"
                          : "bg-gray-50 dark:bg-black/20 border-gray-100 dark:border-white/5"
                      }
                    `}
                  >
                    <div className="flex-1">
                      <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">
                        Time Duration
                      </p>
                      <div
                        className={`flex items-center gap-2 font-bold ${item.status === "rejected" ? "text-red-400" : "text-gray-900 dark:text-white"}`}
                      >
                        <ClockIcon
                          className={`w-4 h-4 ${item.status === "rejected" ? "text-red-400" : "text-vn-primary"}`}
                        />
                        {item.start_time?.slice(0, 5)} -{" "}
                        {item.end_time?.slice(0, 5)}
                      </div>
                    </div>
                    <div className="hidden md:block w-px h-8 bg-gray-200 dark:bg-white/10"></div>
                    <div className="flex-2">
                      <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">
                        Task Description
                      </p>
                      <p
                        className={`text-sm font-medium ${item.status === "rejected" ? "text-red-400/80" : "text-gray-600 dark:text-gray-300"}`}
                      >
                        "{item.reason || "No specific instructions provided."}"
                      </p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

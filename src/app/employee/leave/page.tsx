"use client";

export const dynamic = "force-dynamic";

import { useState, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import {
  ChevronLeftIcon,
  PaperClipIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  TrashIcon,
  DocumentTextIcon,
  CalendarDaysIcon,
} from "@heroicons/react/24/outline";

// --- TYPES ---
type Leave = {
  id: string;
  start_date: string;
  end_date: string;
  leave_type: string;
  reason: string;
  attachments: string[];
  status: "waiting" | "approved" | "rejected";
  created_at?: string;
};

export default function EmployeeLeavePage() {
  const supabase = createClient();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- STATE ---
  const [activeTab, setActiveTab] = useState<"form" | "history">("form");
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Form State
  const [leaveType, setLeaveType] = useState("Annual Leave");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [reason, setReason] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // History State
  const [leaveHistory, setLeaveHistory] = useState<Leave[]>([]);

  // Modals
  const [showSuccess, setShowSuccess] = useState(false);

  // --- 1. INITIAL FETCH ---
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

      // Fetch History
      const { data } = await supabase
        .from("leaves")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      setLeaveHistory((data as Leave[]) || []);
      setLoading(false);
    };
    init();
  }, [router, supabase]);

  // --- 2. HANDLE FILE UPLOAD & SUBMIT ---
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!startDate || !endDate || !reason)
      return alert("Please fill in all fields");

    setIsSubmitting(true);
    let uploadedUrl = null;

    try {
      // A. Upload File (if exists)
      if (file) {
        const fileExt = file.name.split(".").pop();
        const fileName = `${user.id}_${Date.now()}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from("leave_attachments")
          .upload(fileName, file);

        if (uploadError) throw uploadError;

        const { data } = supabase.storage
          .from("leave_attachments")
          .getPublicUrl(fileName);

        uploadedUrl = data.publicUrl;
      }

      // B. Insert Data
      const { error: insertError } = await supabase.from("leaves").insert({
        user_id: user.id,
        leave_type: leaveType,
        start_date: startDate,
        end_date: endDate,
        reason: reason,
        attachments: uploadedUrl ? [uploadedUrl] : [],
        status: "waiting",
      });

      if (insertError) throw insertError;

      // C. Reset Form
      setShowSuccess(true);
      setStartDate("");
      setEndDate("");
      setReason("");
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";

      // Refresh History
      const { data } = await supabase
        .from("leaves")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      setLeaveHistory((data as Leave[]) || []);
    } catch (err: any) {
      alert("Error: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case "approved":
        return "text-green-500 bg-green-50 dark:bg-green-500/10 border-green-100 dark:border-green-500/20";
      case "rejected":
        return "text-red-500 bg-red-50 dark:bg-red-500/10 border-red-100 dark:border-red-500/20";
      default:
        return "text-yellow-500 bg-yellow-50 dark:bg-yellow-500/10 border-yellow-100 dark:border-yellow-500/20";
    }
  };

  if (loading) return null;

  return (
    <div className="w-full min-h-screen xl:h-screen xl:overflow-hidden font-sans transition-colors duration-500 p-4 md:p-6 lg:p-8 flex flex-col items-center bg-linear-to-b from-vn-primary to-vn-secondary dark:bg-linear-to-b dark:from-[#001B48] dark:to-[#3B7CDE]">
      {/* HEADER */}
      <div className="w-full max-w-[1400px] flex justify-between items-end mb-6 shrink-0">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold text-white dark:text-white tracking-tight">
            Leave Request
          </h1>
          <p className="text-white dark:text-blue-100/80 text-sm mt-1">
            Submit and track your time off
          </p>
        </div>
      </div>

      {/* MAIN CONTENT CARD */}
      <div className="w-full max-w-[1400px] flex-1 xl:min-h-0 bg-white dark:bg-vn-navy-200 rounded-[2.5rem] p-6 lg:p-8 shadow-2xl flex flex-col md:flex-row gap-8 transition-colors duration-500 overflow-hidden relative">
        {/* --- LEFT COLUMN: FORM --- */}
        <div className="w-full md:w-1/3 flex flex-col gap-6 overflow-y-auto custom-scrollbar pr-2">
          <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest">
            New Request
          </h3>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Leave Type */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-500 dark:text-gray-300 ml-1">
                Leave Type
              </label>
              <div className="relative">
                <select
                  value={leaveType}
                  onChange={(e) => setLeaveType(e.target.value)}
                  className="w-full p-4 bg-gray-50 dark:bg-black/20 text-gray-900 dark:text-white rounded-2xl border-none outline-none appearance-none font-bold cursor-pointer hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
                >
                  <option>Annual Leave</option>
                  <option>Sick Leave</option>
                  <option>Emergency</option>
                </select>
                <ChevronLeftIcon className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 -rotate-90 pointer-events-none" />
              </div>
            </div>

            {/* Dates */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-500 dark:text-gray-300 ml-1">
                  From
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full p-4 bg-gray-50 dark:bg-black/20 text-gray-900 dark:text-white rounded-2xl border-none outline-none font-bold min-h-14"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-500 dark:text-gray-300 ml-1">
                  Until
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full p-4 bg-gray-50 dark:bg-black/20 text-gray-900 dark:text-white rounded-2xl border-none outline-none font-bold min-h-14"
                />
              </div>
            </div>

            {/* Reason */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-500 dark:text-gray-300 ml-1">
                Reason
              </label>
              <textarea
                rows={3}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Why do you need leave?"
                className="w-full p-4 bg-gray-50 dark:bg-black/20 text-gray-900 dark:text-white rounded-2xl border-none outline-none font-medium resize-none placeholder-gray-400"
              />
            </div>

            {/* Attachment (Styled File Input) */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-500 dark:text-gray-300 ml-1">
                Attachment
              </label>
              <div
                onClick={() => fileInputRef.current?.click()}
                className="w-full p-4 bg-gray-50 dark:bg-black/20 rounded-2xl border-2 border-dashed border-gray-200 dark:border-white/10 flex items-center justify-between cursor-pointer hover:border-vn-primary transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-white dark:bg-white/10 flex items-center justify-center">
                    <PaperClipIcon className="w-4 h-4 text-gray-400 group-hover:text-vn-primary" />
                  </div>
                  <span className="text-xs font-bold text-gray-500 dark:text-gray-300 truncate max-w-[150px]">
                    {file ? file.name : "Upload File (Optional)"}
                  </span>
                </div>
                {file && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setFile(null);
                    }}
                    className="p-1 hover:bg-red-100 rounded-full text-red-500"
                  >
                    <XCircleIcon className="w-5 h-5" />
                  </button>
                )}
              </div>
              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                onChange={(e) => e.target.files && setFile(e.target.files[0])}
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-4 bg-vn-primary hover:brightness-110 text-white rounded-2xl font-black shadow-lg shadow-blue-500/30 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed mt-2"
            >
              {isSubmitting ? "Submitting..." : "Submit Request"}
            </button>
          </form>
        </div>

        {/* --- RIGHT COLUMN: HISTORY --- */}
        <div className="flex-1 flex flex-col border-t md:border-t-0 md:border-l border-gray-100 dark:border-white/5 pt-6 md:pt-0 md:pl-8 overflow-hidden">
          <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-6">
            Request History
          </h3>

          <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-4">
            {leaveHistory.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center opacity-40">
                <DocumentTextIcon className="w-16 h-16 text-gray-400 mb-2" />
                <p className="text-sm font-bold text-gray-500 dark:text-white">
                  No history yet
                </p>
              </div>
            ) : (
              leaveHistory.map((leave) => (
                <div
                  key={leave.id}
                  className="bg-white dark:bg-white/5 border border-gray-100 dark:border-white/5 p-5 rounded-3xl hover:shadow-md transition-all group relative"
                >
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">
                        {leave.leave_type}
                      </span>
                      <h4 className="text-lg font-black text-gray-900 dark:text-white">
                        {format(new Date(leave.start_date), "dd MMM")}
                        <span className="text-gray-300 mx-2">-</span>
                        {format(new Date(leave.end_date), "dd MMM yyyy")}
                      </h4>
                    </div>
                    <div
                      className={`px-3 py-1 rounded-full text-[10px] font-black uppercase border ${getStatusColor(leave.status)}`}
                    >
                      {leave.status}
                    </div>
                  </div>

                  <p className="text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-black/20 p-3 rounded-xl">
                    "{leave.reason}"
                  </p>

                  {leave.attachments && (
                    <a
                      href={leave.attachments[0]}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-2 mt-3 text-[10px] font-bold text-vn-primary bg-blue-50 dark:bg-blue-500/10 px-3 py-1.5 rounded-lg hover:bg-blue-100 transition-colors"
                    >
                      <PaperClipIcon className="w-3 h-3" />
                      View Attachment
                    </a>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* SUCCESS MODAL */}
      {showSuccess && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-vn-navy-200 p-8 rounded-4xl max-w-sm w-full text-center border-4 border-green-500/20">
            <div className="w-20 h-20 bg-green-100 dark:bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4 text-green-500">
              <CheckCircleIcon className="w-10 h-10" />
            </div>
            <h3 className="text-2xl font-black text-gray-900 dark:text-white mb-2">
              Request Sent!
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-300 mb-6">
              Your leave request has been submitted for approval.
            </p>
            <button
              onClick={() => setShowSuccess(false)}
              className="w-full py-3 bg-gray-100 dark:bg-white/10 text-gray-700 dark:text-white font-bold rounded-xl hover:bg-gray-200 transition-colors"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

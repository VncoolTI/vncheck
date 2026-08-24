"use client";

export const dynamic = "force-dynamic";

import { useState, useEffect, useRef, useCallback } from "react";
import { createClient } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import Webcam from "react-webcam";
import { format } from "date-fns";
import {
  CameraIcon,
  ArrowPathIcon,
  CheckCircleIcon,
  MapPinIcon,
  ExclamationTriangleIcon,
} from "@heroicons/react/24/solid";

export default function EmployeeScanPage() {
  const supabase = createClient();
  const router = useRouter();
  const webcamRef = useRef<Webcam>(null);

  // --- STATE UTAMA ---
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [isLocating, setIsLocating] = useState(false);

  // Data Absensi
  const [status, setStatus] = useState<"ClockIn" | "ClockOut" | "Done">(
    "ClockIn",
  );
  const [checkInTime, setCheckInTime] = useState<string | null>(null);
  const [checkOutTime, setCheckOutTime] = useState<string | null>(null);
  const [attendanceId, setAttendanceId] = useState<string | null>(null);

  // Data Lingkungan
  const [currentTime, setCurrentTime] = useState(new Date());
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(
    null,
  );
  const [locationError, setLocationError] = useState("");

  // --- STATE MODALS (PENGGANTI ALERT) ---
  const [modalState, setModalState] = useState<{
    isOpen: boolean;
    type: "success" | "error" | "confirm";
    title: string;
    message: string;
    action?: () => void; // Aksi lanjutan (misal untuk confirm)
  }>({ isOpen: false, type: "success", title: "", message: "" });

  // --- 1. REALTIME CLOCK ---
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // --- 2. GET LOCATION ---
  const handleGetLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setLocationError("Browser tidak mendukung GPS.");
      return;
    }

    setIsLocating(true);
    setLocationError("");
    setLocation(null);

    const highAccuracyOptions = {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0,
    };
    const lowAccuracyOptions = {
      enableHighAccuracy: false,
      timeout: 15000,
      maximumAge: 60000,
    };

    const successHandler = (position: GeolocationPosition) => {
      setLocation({
        lat: position.coords.latitude,
        lng: position.coords.longitude,
      });
      setIsLocating(false);
      setLocationError("");
    };

    const errorHandlerLowAccuracy = (error: GeolocationPositionError) => {
      console.error("Location Error:", error);
      setIsLocating(false);
      if (error.code === 1) setLocationError("Izin lokasi ditolak.");
      else if (error.code === 2) setLocationError("Sinyal GPS hilang.");
      else if (error.code === 3) setLocationError("Koneksi lambat.");
      else setLocationError("Gagal mengambil lokasi.");
    };

    navigator.geolocation.getCurrentPosition(
      successHandler,
      (error) => {
        console.warn("High Accuracy Failed, retrying...", error.message);
        navigator.geolocation.getCurrentPosition(
          successHandler,
          errorHandlerLowAccuracy,
          lowAccuracyOptions,
        );
      },
      highAccuracyOptions,
    );
  }, []);

  useEffect(() => {
    handleGetLocation();
  }, [handleGetLocation]);

  // --- 3. CHECK ATTENDANCE STATUS ---
  useEffect(() => {
    const fetchAttendanceStatus = async () => {
      try {
        setLoading(true);
        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser();
        if (authError || !user) return;

        const today = format(new Date(), "yyyy-MM-dd");
        const { data: att, error: dbError } = await supabase
          .from("attendance")
          .select("*")
          .eq("user_id", user.id)
          .eq("check_in_date", today)
          .maybeSingle();

        if (dbError) throw dbError;

        if (att) {
          setAttendanceId(att.id);
          setCheckInTime(att.check_in_time);
          setCheckOutTime(att.check_out_time);
          if (att.check_out_time) setStatus("Done");
          else setStatus("ClockOut");
        } else {
          setStatus("ClockIn");
        }
      } catch (error: any) {
        console.error("Error fetching status:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchAttendanceStatus();
  }, [supabase]);

  // --- HELPER: GET PUBLIC IP ---
  const getIpAddress = async () => {
    try {
      const response = await fetch("https://api.ipify.org?format=json");
      const data = await response.json();
      return data.ip;
    } catch (error) {
      console.error("Failed to get IP:", error);
      return "0.0.0.0"; // Fallback if API fails
    }
  };

  const getTrueTime = async () => {
    try {
      // Fetch exact time from a public World Time API for Jakarta (WIB)
      const response = await fetch(
        "https://worldtimeapi.org/api/timezone/Asia/Jakarta",
        {
          cache: "no-store", // Ensure we don't get a cached time
        },
      );
      const data = await response.json();
      return new Date(data.datetime);
    } catch (error) {
      console.error("Gagal mengambil waktu server:", error);
      // Fallback to device time ONLY if the API is down
      return new Date();
    }
  };

  // --- 4. CORE LOGIC: PROCESS ATTENDANCE ---
  const executeAttendance = async () => {
    setProcessing(true);
    setModalState({ ...modalState, isOpen: false });

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Sesi habis.");

      const imageSrc = webcamRef.current?.getScreenshot();
      if (!imageSrc) throw new Error("Gagal ambil foto.");

      // --- UPLOAD PHOTO TO SUPABASE STORAGE ---
      const fetchResponse = await fetch(imageSrc);
      const blob = await fetchResponse.blob();

      const now = await getTrueTime();
      const timestamp = now.toISOString();
      const todayStr = format(now, "yyyy-MM-dd");

      const fileType = status === "ClockIn" ? "in" : "out";
      const fileName = `${user.id}/${todayStr}-${fileType}-${Date.now()}.jpg`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("attendance_photos")
        .upload(fileName, blob, {
          contentType: "image/jpeg",
          upsert: true,
        });

      if (uploadError) {
        console.error("Storage Error:", uploadError);
        throw new Error("Gagal mengunggah foto selfie.");
      }

      const uploadedImagePath = uploadData.path;
      const ipAddress = await getIpAddress();
      const userAgent = navigator.userAgent;
      const coordsStr = `POINT(${location?.lng} ${location?.lat})`;

      // --- CLOCK IN LOGIC ---
      if (status === "ClockIn") {
        const { data, error } = await supabase.rpc("clock_in", {
          p_user_id: user.id,
          p_location: coordsStr,
          p_image_path: uploadedImagePath,
          p_ip_address: ipAddress,
          p_user_agent: userAgent,
        });

        if (error) throw error;
        if (data.success === false) throw new Error(data.message);

        const serverStatus = data.status;
        let modalTitle = "Clock In Successful!";
        let modalMessage = "Thank you for arriving on time.";

        if (serverStatus === "Early") {
          modalTitle = "Early Arrival!";
          modalMessage = "You clocked in before 09:00. Keep up the great work!";
        } else if (serverStatus === "Late") {
          modalTitle = "Clock In Successful (Late)";
          modalMessage =
            "You clocked in after 09:00. The server has recorded the delay.";
        }

        // --- NEW: SEND NOTIFICATION TO INBOX ---
        await supabase.from("notifications").insert([
          {
            user_id: user.id,
            title: modalTitle,
            message: `You clocked in at ${format(now, "HH:mm")}. ${modalMessage}`,
            type: "attendance",
          },
        ]);

        // Tampilkan Modal Sukses
        setModalState({
          isOpen: true,
          type: "success",
          title: modalTitle,
          message: modalMessage,
          action: () => window.location.reload(),
        });

        // --- CLOCK OUT LOGIC ---
      } else if (status === "ClockOut") {
        const { data, error } = await supabase.rpc("clock_out", {
          p_user_id: user.id,
          p_image_path: uploadedImagePath,
        });

        if (error) throw error;
        if (data && data.success === false) throw new Error(data.message);

        const serverStatus = data.status;

        let modalTitle = "Clock Out Successful";
        let modalMessage = "Have a safe trip home and a great rest!";

        if (serverStatus === "Early") {
          modalTitle = "Early Departure";
          modalMessage = "You clocked out before 17:00. Have a safe trip!";
        }

        // --- NEW: SEND NOTIFICATION TO INBOX ---
        await supabase.from("notifications").insert([
          {
            user_id: user.id,
            title: modalTitle,
            message: `You clocked out at ${format(now, "HH:mm")}. ${modalMessage}`,
            type: "attendance",
          },
        ]);

        setModalState({
          isOpen: true,
          type: "success",
          title: modalTitle,
          message: modalMessage,
          action: () => window.location.reload(),
        });
      }
    } catch (error: any) {
      setModalState({
        isOpen: true,
        type: "error",
        title: "Attendance Failed",
        message: error.message || "A system error occurred.",
      });
    } finally {
      setProcessing(false);
    }
  };

  // --- 5. HANDLE CLICK BUTTON (VALIDASI AWAL) ---
  const handleCaptureClick = () => {
    if (!location) {
      setModalState({
        isOpen: true,
        type: "error",
        title: "Location Not Found",
        message: "Please turn on GPS and wait for the coordinates to appear.",
      });
      return;
    }

    // Validasi Pulang Cepat
    if (status === "ClockOut") {
      const now = new Date();
      const limitCheckOut = new Date();
      limitCheckOut.setHours(17, 0, 0, 0);

      if (now < limitCheckOut) {
        setModalState({
          isOpen: true,
          type: "confirm",
          title: "Clocking Out Early?",
          message:
            "It is not 17:00 yet. Are you sure you want to clock out now?",
          action: executeAttendance, // Jika user klik Yes, jalankan fungsi absen
        });
        return;
      }
    }

    executeAttendance();
  };

  // --- [DEBUG] RESET FUNCTION ---
  const [showDebugButton, setShowDebugButton] = useState(false);
  const handleResetDebug = async () => {
    if (
      !confirm("⚠️ DEBUG MODE: Delete today's attendance data to test again?")
    )
      return;
    setLoading(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    const today = format(new Date(), "yyyy-MM-dd");

    const { error } = await supabase
      .from("attendance")
      .delete()
      .eq("user_id", user.id)
      .eq("check_in_date", today);
    if (error) {
      alert("Reset failed: " + error.message);
      setLoading(false);
    } else {
      window.location.reload();
    }
  };

  useEffect(() => {
    const checkDebugMode = async () => {
      const isLocal =
        window.location.hostname === "localhost" ||
        window.location.hostname === "127.0.0.1";
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const allowedAdmins = ["michael@vncoolid.com", "nicolous@vncoolid.com"];
      const isMyEmail = allowedAdmins.includes(user?.email || "");

      if (isLocal && isMyEmail) setShowDebugButton(true);
    };
    checkDebugMode();
  }, []);

  // --- RENDER ---
  if (loading)
    return (
      <div className="flex h-full w-full items-center justify-center bg-[#F1F5F9]">
        <span className="loading loading-spinner text-blue-600"></span>
      </div>
    );

  return (
    <div className="h-dvh w-full font-sans flex flex-col items-center bg-linear-to-b from-vn-primary to-vn-secondary dark:bg-linear-to-b dark:from-[#001B48] dark:to-[#3B7CDE] p-4 md:p-6 text-white transition-colors duration-500 overflow-hidden relative">
      {/* 1. HEADER */}
      <div className="w-full max-w-4xl flex justify-between items-start shrink-0 mb-4">
        <div className="flex-1 flex flex-col pt-2">
          <h1 className="text-2xl md:text-3xl font-bold tracking-wide text-white dark:text-white transition-colors">
            Face Scan
          </h1>
          <p className="text-sm md:text-base text-white dark:text-blue-100/80 mt-1 transition-colors">
            Please look into the camera and hold still
          </p>
        </div>
      </div>

      {/* 2. CAMERA CONTAINER */}
      <div className="flex-1 min-h-0 w-full max-w-4xl bg-white dark:bg-black/20 rounded-4xl shadow-2xl overflow-hidden mb-4 border-4 border-white dark:border-white/10 transition-all mx-auto relative">
        {status === "Done" ? (
          <div className="w-full h-full flex flex-col items-center justify-center text-gray-400 bg-gray-50 dark:bg-transparent">
            <CheckCircleIcon className="w-24 h-24 md:w-32 md:h-32 text-green-500 mb-4 opacity-90 animate-in zoom-in duration-500" />
            <p className="font-bold text-gray-500 dark:text-white text-xl md:text-2xl">
              Attendance Completed
            </p>
            <p className="text-sm text-gray-400 dark:text-white/60 mt-2">
              Have a great rest!
            </p>
          </div>
        ) : (
          <>
            {!isCameraReady && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-100 dark:bg-[#001B48] z-10">
                <div className="flex flex-col items-center">
                  <span className="loading loading-spinner text-vn-primary loading-lg mb-4"></span>
                  <p className="text-sm text-gray-500 dark:text-white/70 font-medium animate-pulse">
                    Starting Camera...
                  </p>
                  <button
                    onClick={() => window.location.reload()}
                    className="mt-4 text-xs text-vn-primary underline hover:text-blue-400"
                  >
                    Stuck? Tap to Reload
                  </button>
                </div>
              </div>
            )}
            <Webcam
              audio={false}
              ref={webcamRef}
              screenshotFormat="image/jpeg"
              videoConstraints={{ facingMode: "user" }}
              onUserMedia={() => setIsCameraReady(true)}
              onUserMediaError={(err) => {
                console.error("Camera Error:", err);
                alert(
                  "Camera failed to start. Please allow camera permissions.",
                );
              }}
              className={`w-full h-full object-cover transform scale-x-[-1] transition-opacity duration-700 ${isCameraReady ? "opacity-100" : "opacity-0"}`}
            />
          </>
        )}
      </div>

      {/* 3. FOOTER INFO */}
      <div className="w-full max-w-4xl grid grid-cols-2 gap-3 mb-4 shrink-0">
        <div className="bg-white dark:bg-white/10 backdrop-blur-md rounded-3xl p-4 flex justify-between items-center text-gray-800 dark:text-white shadow-lg transition-colors">
          <div className="flex flex-col items-center w-1/2 border-r border-gray-100 dark:border-white/10">
            <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-white/60 mb-1">
              Clock In
            </span>
            <span
              className={`text-xl md:text-2xl font-black ${checkInTime ? "text-gray-900 dark:text-white" : "text-gray-300 dark:text-white/30"}`}
            >
              {checkInTime ? format(new Date(checkInTime), "HH:mm") : "--:--"}
            </span>
          </div>
          <div className="flex flex-col items-center w-1/2">
            <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-white/60 mb-1">
              Clock Out
            </span>
            <span
              className={`text-xl md:text-2xl font-black ${checkOutTime ? "text-gray-900 dark:text-white" : "text-gray-300 dark:text-white/30"}`}
            >
              {checkOutTime ? format(new Date(checkOutTime), "HH:mm") : "--:--"}
            </span>
          </div>
        </div>

        <div className="bg-white dark:bg-white/10 backdrop-blur-md rounded-3xl p-4 flex flex-col justify-center text-gray-800 dark:text-white shadow-lg relative overflow-hidden transition-colors">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] md:text-xs font-black uppercase text-gray-900 dark:text-white flex items-center gap-2">
              <MapPinIcon className="w-3.5 h-3.5 text-vn-primary" /> Location
            </span>
            <button
              onClick={handleGetLocation}
              disabled={isLocating}
              className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-white/20 transition-colors"
            >
              <ArrowPathIcon
                className={`w-3 h-3 text-gray-400 dark:text-white/70 ${isLocating ? "animate-spin" : ""}`}
              />
            </button>
          </div>
          <div className="w-full h-px bg-gray-100 dark:bg-white/10 mb-2"></div>
          <div className="flex justify-between items-end">
            <div className="flex flex-col truncate pr-2">
              <span className="text-[10px] text-gray-400 dark:text-white/60 font-bold">
                Coords
              </span>
              <span className="text-[10px] md:text-xs font-mono font-medium text-gray-600 dark:text-white/90 truncate">
                {location
                  ? `${location.lat.toFixed(4)}, ${location.lng.toFixed(4)}`
                  : "Locating..."}
              </span>
            </div>
            <div className="flex flex-col items-end">
              <span className="text-[10px] text-gray-400 dark:text-white/60 font-bold">
                Time
              </span>
              <span className="text-[10px] md:text-xs font-mono font-medium text-gray-600 dark:text-white/90">
                {format(currentTime, "HH:mm:ss")}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 4. ACTION BUTTON */}
      {status !== "Done" && (
        <div className="mb-2 shrink-0 animate-in slide-in-from-bottom-6 duration-700 flex flex-col items-center">
          <button
            onClick={handleCaptureClick}
            disabled={processing || !location || !isCameraReady}
            className={`w-16 h-16 md:w-20 md:h-20 bg-transparent border-[3px] border-vn-primary/30 dark:border-white/40 rounded-full flex items-center justify-center transition-all active:scale-95 group 
                    ${!location || !isCameraReady ? "opacity-50 cursor-not-allowed" : "hover:border-vn-primary dark:hover:border-white"}`}
          >
            <div
              className={`w-12 h-12 md:w-16 md:h-16 rounded-full flex items-center justify-center shadow-lg transition-all duration-300
                    ${processing ? "bg-gray-400 scale-90" : status === "ClockIn" ? "bg-vn-primary dark:bg-[#3B7CDE] group-hover:scale-90" : "bg-orange-500 group-hover:scale-90"}`}
            >
              {processing ? (
                <span className="loading loading-spinner text-white"></span>
              ) : (
                <CameraIcon className="w-6 h-6 md:w-8 md:h-8 text-white drop-shadow-md" />
              )}
            </div>
          </button>
          <p className="text-center text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-white/60 mt-2">
            {status === "ClockIn" ? "Tap to Clock In" : "Tap to Clock Out"}
          </p>
        </div>
      )}

      {/* --- 5. THE MISSING MODALS FIX! --- */}
      {modalState.isOpen && (
        <div className="fixed inset-0 z-100 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-vn-navy-200 rounded-3xl shadow-2xl w-full max-w-sm p-8 text-center border border-gray-100 dark:border-white/10 flex flex-col items-center">
            {/* Icons based on type */}
            {modalState.type === "success" && (
              <div className="h-20 w-20 rounded-full bg-green-50 dark:bg-green-500/10 flex items-center justify-center mb-6">
                <CheckCircleIcon className="w-12 h-12 text-green-500" />
              </div>
            )}
            {modalState.type === "error" && (
              <div className="h-20 w-20 rounded-full bg-red-50 dark:bg-red-500/10 flex items-center justify-center mb-6">
                <ExclamationTriangleIcon className="w-12 h-12 text-red-500" />
              </div>
            )}
            {modalState.type === "confirm" && (
              <div className="h-20 w-20 rounded-full bg-orange-50 dark:bg-orange-500/10 flex items-center justify-center mb-6">
                <ExclamationTriangleIcon className="w-12 h-12 text-orange-500" />
              </div>
            )}

            <h3 className="text-xl md:text-2xl font-black text-gray-900 dark:text-white mb-2">
              {modalState.title}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-8">
              {modalState.message}
            </p>

            {/* Buttons based on type */}
            {modalState.type === "confirm" ? (
              <div className="flex gap-4 w-full">
                <button
                  onClick={() =>
                    setModalState({ ...modalState, isOpen: false })
                  }
                  className="flex-1 py-3.5 bg-gray-100 dark:bg-white/10 hover:bg-gray-200 dark:hover:bg-white/20 text-gray-900 dark:text-white rounded-xl font-bold transition-all active:scale-95"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    setModalState({ ...modalState, isOpen: false });
                    if (modalState.action) modalState.action();
                  }}
                  className="flex-1 py-3.5 bg-orange-500 hover:bg-orange-600 shadow-lg text-white rounded-xl font-bold transition-all active:scale-95"
                >
                  Yes, Clock Out
                </button>
              </div>
            ) : (
              <button
                onClick={() => {
                  setModalState({ ...modalState, isOpen: false });
                  if (modalState.action) modalState.action();
                }}
                className={`w-full py-3.5 text-white rounded-xl font-bold shadow-lg transition-all active:scale-95 ${modalState.type === "error" ? "bg-red-500 hover:bg-red-600" : "bg-vn-primary dark:bg-[#3B7CDE] hover:brightness-110"}`}
              >
                {modalState.type === "error" ? "Try Again" : "OK"}
              </button>
            )}
          </div>
        </div>
      )}

      {/* DEBUG RESET BUTTON */}
      {showDebugButton && (
        <button
          onClick={handleResetDebug}
          className="fixed top-20 right-4 z-50 bg-red-600 text-white text-[10px] font-bold px-3 py-1.5 rounded-full shadow-lg opacity-70 hover:opacity-100 hover:scale-105 transition-all"
        >
          🔄 RESET DAY
        </button>
      )}
    </div>
  );
}

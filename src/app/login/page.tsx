"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
  EyeIcon,
  EyeSlashIcon,
  ExclamationTriangleIcon,
} from "@heroicons/react/24/outline";

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(0);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (countdown > 0) {
      timer = setTimeout(() => {
        setCountdown((prev) => prev - 1);
      }, 1000);
    }
    return () => clearTimeout(timer);
  }, [countdown]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);

    try {
      const { data: statusData, error: checkError } = await supabase.rpc(
        "check_email_status",
        { email_input: email },
      );

      if (checkError) {
        console.warn(
          "RPC check_email_status failed, proceeding to standard auth.",
          checkError,
        );
      } else if (statusData) {
        if (statusData.status === "not_found") {
          // SECURE: Generic error message prevents email enumeration
          setErrorMsg("Invalid email or password.");
          setLoading(false);
          return;
        }
        if (statusData.status === "locked_permanent") {
          setErrorMsg("Account LOCKED. Contact Admin.");
          setLoading(false);
          return;
        }
        if (statusData.status === "cooldown") {
          setCountdown(statusData.wait_seconds);
          setErrorMsg(`Too many attempts.`);
          setLoading(false);
          return;
        }
      }

      const { data: authData, error: authError } =
        await supabase.auth.signInWithPassword({
          email,
          password,
        });

      if (authError) {
        const { data: failData } = await supabase.rpc("handle_failed_login", {
          email_input: email,
        });
        if (failData?.status === "locked_permanent") {
          setErrorMsg("Maximum attempts. Account LOCKED.");
        } else {
          // SECURE: Matches the 'not_found' error exactly so attackers can't guess which failed
          setErrorMsg("Invalid email or password.");
        }
        setLoading(false);
        return;
      }

      if (authData.user) {
        await supabase.rpc("reset_login_attempts", { email_input: email });

        const { data: employeeData, error: roleError } = await supabase
          .from("employees")
          .select("role, must_change_password")
          .eq("id", authData.user.id)
          .single();

        if (roleError || !employeeData) {
          await supabase.auth.signOut();
          setErrorMsg("User profile not found.");
          setLoading(false);
          return;
        }

        if (employeeData.must_change_password) {
          router.push("/force-change-password");
          return;
        }

        const allowedRoles = ["employee", "admin", "super_admin"];

        if (allowedRoles.includes(employeeData.role)) {
          router.push("/employee/dashboard");
        } else {
          await supabase.auth.signOut();
          setErrorMsg("Access Denied.");
          setLoading(false);
        }
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg("System error. Please try again later.");
      setLoading(false);
    }
  };

  const formatTime = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}m ${s}s`;
  };

  return (
    <>
      <style>{`
        @keyframes slideUpLogo {
          0% { transform: translateY(25vh); scale: 1.1; }
          100% { transform: translateY(0); scale: 1; }
        }
        @keyframes fadeInForm {
          0% { opacity: 0; transform: translateY(2rem); }
          100% { opacity: 1; transform: translateY(0); }
        }
        .animate-logo {
          animation: slideUpLogo 1.2s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        .animate-form {
          opacity: 0; 
          animation: fadeInForm 0.8s cubic-bezier(0.16, 1, 0.3, 1) 0.5s forwards;
        }
      `}</style>

      {/* Notice we removed the background colors here so it inherits the global body color! */}
      <main className="min-h-screen w-full flex items-center justify-center font-sans p-4">
        <div className="w-full max-w-md flex flex-col items-center">
          <div className="w-28 h-28 md:w-32 md:h-32 bg-white rounded-full flex items-center justify-center shadow-xl mb-10 md:mb-12 border-4 border-white/10 shrink-0 animate-logo">
            <div className="relative w-14 h-14 md:w-16 md:h-16">
              <Image
                src="/Logo-Vn-Check-test.png"
                alt="VNCHECK Logo"
                fill
                className="object-contain"
                priority
              />
            </div>
          </div>

          <div className="w-full animate-form">
            <div className="w-full min-h-12 mb-2">
              {(errorMsg || countdown > 0) && (
                <div className="bg-red-50 dark:bg-red-500 border border-red-200 dark:border-red-600 text-red-600 dark:text-white text-sm font-bold px-4 py-3 rounded-2xl flex items-center shadow-sm">
                  <ExclamationTriangleIcon className="w-5 h-5 mr-3 shrink-0" />
                  <span>
                    {countdown > 0
                      ? `Too many attempts. Wait ${formatTime(countdown)}.`
                      : errorMsg}
                  </span>
                </div>
              )}
            </div>

            <form onSubmit={handleLogin} className="w-full space-y-5">
              <div className="space-y-1.5">
                <label className="block text-gray-700 dark:text-white text-sm font-medium ml-4">
                  Email / Username
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={countdown > 0 || loading}
                  className="w-full bg-white text-gray-900 rounded-full py-4 px-6 shadow-md outline-none focus:ring-4 focus:ring-vn-primary/40 transition-all placeholder-gray-400 disabled:opacity-70 disabled:cursor-not-allowed border-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-gray-700 dark:text-white text-sm font-medium ml-4">
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={countdown > 0 || loading}
                    className="w-full bg-white text-gray-900 rounded-full py-4 px-6 pr-14 shadow-md outline-none focus:ring-4 focus:ring-vn-primary/40 transition-all placeholder-gray-400 disabled:opacity-70 disabled:cursor-not-allowed border-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    disabled={countdown > 0 || loading}
                    className="absolute right-5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-vn-primary transition-colors p-1"
                  >
                    {showPassword ? (
                      <EyeSlashIcon className="w-6 h-6" />
                    ) : (
                      <EyeIcon className="w-6 h-6" />
                    )}
                  </button>
                </div>
              </div>

              <div className="pt-6">
                <button
                  type="submit"
                  disabled={loading || countdown > 0}
                  className={`w-full font-bold text-lg py-4 rounded-full shadow-lg transition-all active:scale-95 flex items-center justify-center
                              ${
                                loading || countdown > 0
                                  ? "bg-gray-300 dark:bg-vn-navy-200 text-gray-500 cursor-not-allowed"
                                  : "bg-vn-primary hover:brightness-110 text-white hover:shadow-vn-primary/30"
                              }`}
                >
                  {countdown > 0 ? (
                    `Wait ${formatTime(countdown)}`
                  ) : loading ? (
                    <span className="loading loading-spinner w-6 h-6 text-white/80"></span>
                  ) : (
                    "Sign In"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </main>
    </>
  );
}

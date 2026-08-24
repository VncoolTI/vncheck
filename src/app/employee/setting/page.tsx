"use client";

export const dynamic = "force-dynamic";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeftIcon,
  PencilSquareIcon,
  QuestionMarkCircleIcon,
  ArrowRightOnRectangleIcon,
  SunIcon,
  MoonIcon,
} from "@heroicons/react/24/outline";

export default function EmployeeSettingPage() {
  const supabase = createClient();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [isDark, setIsDark] = useState(false);

  const [profile, setProfile] = useState({
    full_name: "",
    email: "",
    avatar_url: null as string | null,
  });

  useEffect(() => {
    if (document.documentElement.classList.contains("dark")) {
      setIsDark(true);
    } else if (
      localStorage.theme === "dark" ||
      (!("theme" in localStorage) &&
        window.matchMedia("(prefers-color-scheme: dark)").matches)
    ) {
      setIsDark(true);
      document.documentElement.classList.add("dark");
    } else {
      setIsDark(false);
      document.documentElement.classList.remove("dark");
    }

    const fetchProfile = async () => {
      setLoading(true);
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        setProfile((prev) => ({ ...prev, email: user.email || "" }));
        const { data: emp } = await supabase
          .from("employees")
          .select("full_name, avatar_url")
          .eq("id", user.id)
          .single();

        if (emp) {
          setProfile((prev) => ({
            ...prev,
            full_name: emp.full_name || "",
            avatar_url: emp.avatar_url,
          }));
        }
      }
      setLoading(false);
    };
    fetchProfile();
  }, [supabase]);

  const toggleDarkMode = () => {
    if (isDark) {
      document.documentElement.classList.remove("dark");
      localStorage.theme = "light";
      setIsDark(false);
    } else {
      document.documentElement.classList.add("dark");
      localStorage.theme = "dark";
      setIsDark(true);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = "/";
  };

  if (loading) {
    return (
      <div className="flex h-screen w-full flex-1 items-center justify-center bg-linear-to-b from-vn-primary to-vn-secondary dark:bg-none dark:bg-vn-navy-100">
        <span className="loading loading-spinner text-white w-12 h-12"></span>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full flex-1 bg-linear-to-b from-[#478FFC] to-[#83E2F7] dark:bg-linear-to-b dark:from-[#001B48] dark:to-[#3B7CDE] p-4 md:p-10 font-sans transition-colors duration-500 flex flex-col items-center">
      <div className="w-full max-w-xl flex flex-col gap-6 relative mt-4 md:mt-10">
        {/* --- TOP HEADER --- */}
        <div className="flex items-center justify-center relative w-full mb-4">
          <button
            onClick={() => router.back()}
            className="absolute left-0 p-2 text-white hover:bg-white/20 rounded-full transition-colors"
          >
            <ArrowLeftIcon className="w-6 h-6 md:w-7 md:h-7" strokeWidth={2} />
          </button>
          <h1 className="text-xl md:text-2xl font-bold text-white tracking-wide">
            Profile
          </h1>
        </div>

        {/* --- CARD 1: PROFILE INFO --- */}
        <div className="bg-white dark:bg-vn-navy-100 rounded-3xl p-6 md:p-8 shadow-xl flex flex-col items-center relative transition-colors duration-300">
          <Link
            href="/employee/setting/edit"
            className="absolute top-6 right-6 p-2 text-gray-400 hover:text-vn-primary dark:text-gray-300 dark:hover:text-white bg-gray-50 dark:bg-vn-navy-300 hover:bg-blue-50 dark:hover:bg-vn-navy-100 rounded-xl transition-all"
          >
            <PencilSquareIcon
              className="w-5 h-5 md:w-6 md:h-6"
              strokeWidth={2}
            />
          </Link>

          <div className="w-24 h-24 md:w-32 md:h-32 rounded-full overflow-hidden bg-gray-100 dark:bg-vn-navy-300 border-4 border-white dark:border-vn-navy-200 shadow-md flex items-center justify-center mb-4">
            {profile.avatar_url ? (
              <Image
                src={profile.avatar_url}
                alt="Profile"
                width={128}
                height={128}
                className="object-cover w-full h-full"
              />
            ) : (
              <span className="text-4xl md:text-5xl font-black text-vn-primary">
                {profile.full_name.charAt(0) || "U"}
              </span>
            )}
          </div>

          <h2 className="text-2xl font-bold text-gray-900 dark:text-white text-center mb-1">
            {profile.full_name || "Employee Name"}
          </h2>
          <p className="text-sm font-medium text-gray-500 dark:text-gray-300 text-center">
            {profile.email}
          </p>
        </div>

        {/* --- CARD 2: SETTINGS --- */}
        <div className="bg-white dark:bg-vn-navy-100 rounded-3xl p-2 shadow-xl flex flex-col transition-colors duration-300">
          <button className="flex items-center gap-4 p-4 md:p-5 hover:bg-gray-50 dark:hover:bg-vn-navy-300 rounded-2xl transition-colors w-full text-left group">
            <QuestionMarkCircleIcon className="w-7 h-7 text-gray-700 dark:text-gray-300 group-hover:text-vn-primary dark:group-hover:text-white transition-colors" />
            <span className="font-bold text-gray-800 dark:text-white text-sm md:text-base">
              Help and support
            </span>
          </button>

          <div className="h-px w-full bg-gray-100 dark:bg-vn-navy-300"></div>

          <div className="flex items-center justify-between p-4 md:p-5 rounded-2xl w-full group">
            <div className="flex items-center gap-4">
              {isDark ? (
                <MoonIcon className="w-7 h-7 text-vn-secondary" />
              ) : (
                <SunIcon className="w-7 h-7 text-yellow-400" />
              )}
              <span className="font-bold text-gray-800 dark:text-white text-sm md:text-base">
                Appearance
              </span>
            </div>

            <button
              onClick={toggleDarkMode}
              className={`w-14 h-8 flex items-center rounded-full p-1 transition-colors duration-300 shadow-inner ${isDark ? "bg-vn-primary" : "bg-gray-200"}`}
            >
              <div
                className={`bg-white w-6 h-6 rounded-full shadow-md transform transition-transform duration-300 ${isDark ? "translate-x-6" : "translate-x-0"}`}
              ></div>
            </button>
          </div>
        </div>

        {/* --- CARD 3: LOGOUT --- */}
        <button
          onClick={handleLogout}
          className="bg-white dark:bg-vn-navy-100 rounded-3xl p-4 md:p-5 shadow-xl flex items-center gap-4 hover:bg-red-50 dark:hover:bg-red-500/20 transition-all active:scale-95 group w-full"
        >
          <ArrowRightOnRectangleIcon className="w-7 h-7 text-gray-700 dark:text-gray-300 group-hover:text-red-500 transition-colors" />
          <span className="font-bold text-gray-800 dark:text-white group-hover:text-red-500 text-sm md:text-base transition-colors">
            Log out
          </span>
        </button>
      </div>
    </div>
  );
}

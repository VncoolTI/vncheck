"use client";

export const dynamic = "force-dynamic";

import { useState, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
  UserCircleIcon,
  EnvelopeIcon,
  PhoneIcon,
  KeyIcon,
  MapPinIcon,
  CameraIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
} from "@heroicons/react/24/solid";

export default function EditProfilePage() {
  const supabase = createClient();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  // State Form
  const [userId, setUserId] = useState("");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [address, setAddress] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  // State Modals
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  // 1. Fetch Data
  useEffect(() => {
    const fetchProfile = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
        setEmail(user.email || "");
        const { data: emp } = await supabase
          .from("employees")
          .select("full_name, phone_number, address, avatar_url")
          .eq("id", user.id)
          .single();

        if (emp) {
          setFullName(emp.full_name || "");
          setPhone(emp.phone_number || "");
          setAddress(emp.address || "");
          setAvatarUrl(emp.avatar_url);
        }
      }
      setLoading(false);
    };
    fetchProfile();
  }, [supabase]);

  // 2. Logic Upload Foto
  const handleUploadPhoto = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    try {
      setUploading(true);
      if (!event.target.files || event.target.files.length === 0) return;

      const file = event.target.files[0];
      const fileExt = file.name.split(".").pop();
      const filePath = `${userId}/${Math.random()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from("avatars").getPublicUrl(filePath);
      setAvatarUrl(data.publicUrl);
    } catch (error: any) {
      setErrorMessage("Failed to upload photo: " + error.message);
      setShowErrorModal(true);
    } finally {
      setUploading(false);
    }
  };

  // 3. Handle Save
  const handleSave = async () => {
    setSaving(true);
    try {
      if (userId) {
        // A. Update Info Dasar
        const { error } = await supabase
          .from("employees")
          .update({
            full_name: fullName,
            phone_number: phone,
            address: address,
            avatar_url: avatarUrl,
          })
          .eq("id", userId);

        if (error) throw error;

        // B. Update Password
        if (password) {
          if (password.length < 6)
            throw new Error("Password must be at least 6 characters.");
          const { error: passError } = await supabase.auth.updateUser({
            password: password,
          });
          if (passError) throw passError;
        }

        // C. Update Metadata
        await supabase.auth.updateUser({ data: { full_name: fullName } });
      }

      setShowSuccessModal(true);
    } catch (error: any) {
      setErrorMessage(error.message || "An error occurred while saving.");
      setShowErrorModal(true);
    } finally {
      setSaving(false);
    }
  };

  const handleSuccessRedirect = () => {
    setShowSuccessModal(false);
    router.push("/employee/setting");
    router.refresh();
  };

  const handleCancel = () => {
    router.back();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-linear-to-b from-vn-primary to-vn-secondary flex items-center justify-center">
        <span className="loading loading-spinner loading-lg text-white"></span>
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen xl:h-screen xl:overflow-hidden font-sans transition-colors duration-500 p-4 md:p-6 lg:p-8 flex flex-col items-center bg-linear-to-b from-vn-primary to-vn-secondary dark:bg-linear-to-b dark:from-[#001B48] dark:to-[#3B7CDE]">
      {/* HEADER AREA */}
      <div className="w-full max-w-[800px] flex justify-between items-end mb-6 shrink-0">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white tracking-tight">
            Edit Profile
          </h1>
          <p className="text-white dark:text-blue-100/80 text-sm mt-1">
            Update your personal information
          </p>
        </div>
      </div>

      {/* MAIN CONTENT CARD */}
      <div className="w-full max-w-[800px] flex-1 xl:min-h-0 bg-white dark:bg-vn-navy-100 rounded-[2.5rem] p-6 lg:p-10 shadow-2xl flex flex-col gap-8 transition-colors duration-500 overflow-y-auto custom-scrollbar relative pb-24 md:pb-10">
        {/* Header Avatar Area */}
        <div className="flex flex-col items-center shrink-0 mt-4">
          <div className="relative group">
            <div className="w-32 h-32 md:w-40 md:h-40 rounded-full overflow-hidden border-4 border-white dark:border-vn-navy-300 shadow-xl bg-gray-100 dark:bg-vn-navy-300 relative">
              {uploading ? (
                <div className="flex h-full w-full items-center justify-center bg-black/40 backdrop-blur-sm">
                  <span className="loading loading-spinner text-white"></span>
                </div>
              ) : avatarUrl ? (
                <Image
                  src={avatarUrl}
                  alt="Profile"
                  fill
                  className="object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-400 dark:text-gray-500 text-5xl font-black">
                  {fullName.charAt(0)}
                </div>
              )}
            </div>

            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="absolute bottom-2 right-2 bg-vn-primary dark:bg-[#3B7CDE] p-3 rounded-full text-white shadow-lg border-2 border-white dark:border-vn-navy-300 hover:scale-110 transition-transform active:scale-95 disabled:opacity-50"
            >
              <CameraIcon className="w-5 h-5" />
            </button>

            <input
              type="file"
              ref={fileInputRef}
              onChange={handleUploadPhoto}
              accept="image/*"
              className="hidden"
            />
          </div>
          <p className="mt-4 text-xs font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500">
            Tap icon to change photo
          </p>
        </div>

        {/* Form Container */}
        <div className="flex flex-col gap-5 max-w-lg mx-auto w-full">
          {/* Full Name */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider pl-1">
              Full Name
            </label>
            <div className="relative">
              <UserCircleIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 dark:text-gray-500" />
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Your full name"
                className="w-full h-12 pl-11 pr-4 rounded-xl bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-white/10 focus:outline-none focus:ring-2 focus:ring-vn-primary dark:focus:ring-[#3B7CDE] text-gray-900 dark:text-white transition-all"
              />
            </div>
          </div>

          {/* Email (Disabled) */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider pl-1">
              Email Address
            </label>
            <div className="relative">
              <EnvelopeIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400/70 dark:text-gray-600" />
              <input
                type="email"
                value={email}
                disabled
                className="w-full h-12 pl-11 pr-4 rounded-xl bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-transparent text-gray-500 dark:text-gray-400 cursor-not-allowed"
              />
            </div>
          </div>

          {/* Phone */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider pl-1">
              Phone Number
            </label>
            <div className="relative">
              <PhoneIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 dark:text-gray-500" />
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="e.g. +628123456789"
                className="w-full h-12 pl-11 pr-4 rounded-xl bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-white/10 focus:outline-none focus:ring-2 focus:ring-vn-primary dark:focus:ring-[#3B7CDE] text-gray-900 dark:text-white transition-all"
              />
            </div>
          </div>

          {/* Address */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider pl-1">
              Home Address
            </label>
            <div className="relative">
              <MapPinIcon className="absolute left-4 top-4 w-5 h-5 text-gray-400 dark:text-gray-500" />
              <textarea
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Your full address..."
                rows={3}
                className="w-full p-4 pl-11 rounded-xl bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-white/10 focus:outline-none focus:ring-2 focus:ring-vn-primary dark:focus:ring-[#3B7CDE] text-gray-900 dark:text-white resize-none transition-all custom-scrollbar"
              ></textarea>
            </div>
          </div>

          {/* Buttons Area */}
          <div className="flex flex-col sm:flex-row gap-4 mt-6">
            <button
              onClick={handleCancel}
              disabled={saving || uploading}
              className="flex-1 py-3.5 rounded-xl font-bold text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-white/10 hover:bg-gray-200 dark:hover:bg-white/20 transition-all active:scale-95 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving || uploading}
              className="flex-1 py-3.5 rounded-xl font-bold text-white bg-vn-primary dark:bg-[#3B7CDE] hover:brightness-110 shadow-lg shadow-blue-500/20 transition-all active:scale-95 disabled:opacity-70 flex items-center justify-center"
            >
              {saving ? (
                <span className="loading loading-spinner w-5 h-5"></span>
              ) : (
                "Save Changes"
              )}
            </button>
          </div>
        </div>
      </div>

      {/* ================= MODALS ================= */}

      {/* 1. SUCCESS MODAL */}
      {showSuccessModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-vn-navy-200 rounded-3xl shadow-2xl w-full max-w-sm p-8 text-center border border-gray-100 dark:border-white/10">
            <div className="mx-auto flex items-center justify-center h-20 w-20 rounded-full bg-green-50 dark:bg-green-500/10 mb-6">
              <CheckCircleIcon className="w-12 h-12 text-green-500" />
            </div>
            <h3 className="text-2xl font-black text-gray-900 dark:text-white mb-2">
              Success!
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-8">
              Your profile information has been successfully updated.
            </p>
            <button
              onClick={handleSuccessRedirect}
              className="w-full py-3.5 bg-vn-primary dark:bg-[#3B7CDE] hover:brightness-110 text-white rounded-xl font-bold shadow-lg transition-all active:scale-95"
            >
              Back to Settings
            </button>
          </div>
        </div>
      )}

      {/* 2. ERROR MODAL */}
      {showErrorModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-vn-navy-200 rounded-3xl shadow-2xl w-full max-w-sm p-8 text-center border border-gray-100 dark:border-white/10">
            <div className="mx-auto flex items-center justify-center h-20 w-20 rounded-full bg-red-50 dark:bg-red-500/10 mb-6">
              <ExclamationTriangleIcon className="w-12 h-12 text-red-500" />
            </div>
            <h3 className="text-2xl font-black text-gray-900 dark:text-white mb-2">
              Update Failed
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-8 px-2">
              {errorMessage}
            </p>
            <button
              onClick={() => setShowErrorModal(false)}
              className="w-full py-3.5 bg-gray-100 dark:bg-white/10 hover:bg-gray-200 dark:hover:bg-white/20 text-gray-900 dark:text-white rounded-xl font-bold transition-all active:scale-95"
            >
              Try Again
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

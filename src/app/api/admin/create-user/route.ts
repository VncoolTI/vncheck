import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { randomInt } from "crypto";
import { requireAdmin } from "@/lib/auth-admin";

export const dynamic = "force-dynamic";

const ALLOWED_NEW_USER_ROLES = ["employee", "admin"];

const ALLOWED_PROFILE_FIELDS = [
  "full_name",
  "phone_number",
  "place_of_birth",
  "date_of_birth",
  "gender",
  "address",
  "employment_status",
  "division",
  "position",
  "join_date",
  "status",
] as const;

function generateStrongTempPassword(): string {
  const upper = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const lower = "abcdefghijkmnopqrstuvwxyz";
  const digits = "23456789";
  const symbols = "!@#$%*?";
  const all = upper + lower + digits + symbols;
  const pick = (chars: string) => chars[randomInt(chars.length)];
  const required = [pick(upper), pick(lower), pick(digits), pick(symbols)];
  const rest = Array.from({ length: 8 }, () => pick(all));
  const combined = [...required, ...rest];
  for (let i = combined.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [combined[i], combined[j]] = [combined[j], combined[i]];
  }
  return combined.join("");
}

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.message }, { status: auth.status });
  }
  if (auth.role !== "super_admin") {
    return NextResponse.json(
      { error: "Hanya Super Admin yang boleh membuat user baru." },
      { status: 403 },
    );
  }

  try {
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } },
    );

    const body = await request.json();
    const { email, profileData } = body;

    if (!email || typeof email !== "string") {
      return NextResponse.json({ error: "Email wajib diisi." }, { status: 400 });
    }

    const requestedRole = profileData?.role ?? "employee";
    if (!ALLOWED_NEW_USER_ROLES.includes(requestedRole)) {
      return NextResponse.json(
        { error: `Role "${requestedRole}" tidak valid untuk dibuat lewat endpoint ini.` },
        { status: 400 },
      );
    }

    const tempPassword = generateStrongTempPassword();

    const { data: userData, error: userError } =
      await supabaseAdmin.auth.admin.createUser({
        email,
        password: tempPassword,
        email_confirm: true,
        user_metadata: {
          full_name: profileData?.full_name,
          name: profileData?.full_name,
        },
      });

    if (userError) throw userError;

    if (userData?.user?.id) {
      await new Promise((resolve) => setTimeout(resolve, 1000));

      const safeProfileData: Record<string, unknown> = {};
      for (const field of ALLOWED_PROFILE_FIELDS) {
        if (profileData && profileData[field] !== undefined) {
          safeProfileData[field] = profileData[field];
        }
      }

      const { error: dbError } = await supabaseAdmin.from("employees").upsert({
        id: userData.user.id,
        email,
        ...safeProfileData,
        role: requestedRole,
        must_change_password: true,
      });

      if (dbError) {
        console.error("Profile save error:", dbError);
        throw new Error(
          "User created, but Profile save failed: " + dbError.message,
        );
      }
    }

    return NextResponse.json({ success: true, user: userData.user, tempPassword });
  } catch (error: any) {
    console.error("Create user error:", error);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}

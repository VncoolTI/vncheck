import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

// Force dynamic ensures Next.js doesn't try to pre-render this at build time
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    // 1. Initialize inside the function to pass 'npm run build'
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      },
    );

    const body = await request.json();
    // Destructure profileData from the frontend
    const { email, password, fullName, profileData } = body;

    // 2. Create User in Auth (Bypass Email Verification)
    const { data: userData, error: userError } =
      await supabaseAdmin.auth.admin.createUser({
        email: email,
        password: password,
        email_confirm: true,
        user_metadata: {
          full_name: fullName,
          name: fullName, // Added for Dashboard display consistency
        },
      });

    if (userError) throw userError;

    // 3. Save Profile Data (This replaces the old trigger)
    if (userData?.user?.id && profileData) {
      // Small delay to ensure the Auth record is ready
      await new Promise((resolve) => setTimeout(resolve, 1000));

      const { error: dbError } = await supabaseAdmin.from("employees").upsert({
        id: userData.user.id,
        email: email, // Fixes the "email violates not-null constraint" error
        ...profileData,
      });

      if (dbError) {
        console.error("Profile save error:", dbError);
        throw new Error(
          "User created, but Profile save failed: " + dbError.message,
        );
      }
    }

    return NextResponse.json({ success: true, user: userData.user });
  } catch (error: any) {
    console.error("Create user error:", error);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}

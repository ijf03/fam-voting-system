import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { ADMIN_COOKIE, isAdminSession } from "@/lib/admin-auth";

export async function GET() {
  const cookieStore = await cookies();
  const authenticated = isAdminSession(cookieStore.get(ADMIN_COOKIE)?.value);
  return NextResponse.json({ authenticated });
}

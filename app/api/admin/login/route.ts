import { NextRequest, NextResponse } from "next/server";
import { buildAdminSessionCookie } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const { password } = await request.json();
    const adminPassword = process.env.ADMIN_PASSWORD;

    if (!adminPassword || password !== adminPassword) {
      return NextResponse.json({ error: "Invalid password." }, { status: 401 });
    }

    const cookieValue = buildAdminSessionCookie();
    const response = NextResponse.json({ success: true });
    response.cookies.set("admin_session", cookieValue, {
      httpOnly: true,
      secure: true,
      path: "/admin",
      maxAge: 28800, // 8 hours
      sameSite: "lax",
    });

    return response;
  } catch {
    return NextResponse.json({ error: "Login failed." }, { status: 500 });
  }
}

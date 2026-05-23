import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const response = NextResponse.redirect("https://iblazevape.co.uk/account/logout");
  response.cookies.set("portal_session", "", {
    httpOnly: true,
    secure: true,
    path: "/",
    maxAge: 0,
    sameSite: "lax",
  });
  return response;
}

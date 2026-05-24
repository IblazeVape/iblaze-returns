import { NextRequest, NextResponse } from "next/server";

export async function middleware(request: NextRequest) {
  // No auth logic here — handled by page.tsx server component
  return NextResponse.next();
}

export const config = {
  matcher: [],
};

import { type NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

const protectedPrefixes = [
  "/dashboard",
  "/subjects",
  "/lessons",
  "/students",
  "/settings",
];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const needsAuth = protectedPrefixes.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`)
  );

  const { supabase, response } = await updateSession(request);

  if (!needsAuth) {
    return response;
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const login = new URL("/login", request.url);
    login.searchParams.set("next", pathname);
    return NextResponse.redirect(login);
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};

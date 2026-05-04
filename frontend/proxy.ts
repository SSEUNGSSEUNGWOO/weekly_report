import { NextResponse, type NextRequest } from "next/server";

const PUBLIC_PATHS = ["/lock"];
const PUBLIC_API_PREFIXES = ["/api/auth"];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isPublic =
    PUBLIC_PATHS.includes(pathname) ||
    PUBLIC_API_PREFIXES.some((p) => pathname.startsWith(p));

  if (!isPublic) {
    const cookie = request.cookies.get("access_granted");
    if (cookie?.value !== "yes") {
      const url = request.nextUrl.clone();
      url.pathname = "/lock";
      url.search = "";
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};

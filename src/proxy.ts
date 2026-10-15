import { NextResponse, type NextRequest } from "next/server";
import { isLocale } from "@/lib/i18n";

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const segment = pathname.split("/")[1];
  if (isLocale(segment)) return NextResponse.next();
  const preferred = request.cookies.get("qarrini-locale")?.value;
  const locale = preferred && isLocale(preferred) ? preferred : "ar";
  const url = request.nextUrl.clone();
  url.pathname = `/${locale}${pathname === "/" ? "" : pathname}`;
  return NextResponse.redirect(url);
}
export const config = { matcher: ["/((?!api|_next|.*\\..*).*)"] };

import { NextRequest, NextResponse } from "next/server"

export function middleware(request: NextRequest) {
  const { hostname } = request.nextUrl
  
  // Route ke /portal untuk portal.pickpoint.my.id dan localhost:3001
  const isPortal = 
    hostname === "portal.pickpoint.my.id" ||
    hostname === "portal.localhost:3000" ||
    hostname.includes("localhost:3001")

  // Route ke /public untuk pickpoint.my.id dan localhost:3000
  const isPublic =
    hostname === "pickpoint.my.id" ||
    hostname === "localhost:3000" ||
    hostname.includes("localhost")

  if (isPortal) {
    // Rewrite ke /portal
    if (!request.nextUrl.pathname.startsWith("/portal")) {
      return NextResponse.rewrite(
        new URL(`/portal${request.nextUrl.pathname}`, request.url)
      )
    }
  }

  if (isPublic && request.nextUrl.pathname.startsWith("/portal")) {
    // Redirect portal requests ke portal domain
    const url = new URL(request.url)
    url.hostname = "portal.pickpoint.my.id"
    return NextResponse.redirect(url)
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
}

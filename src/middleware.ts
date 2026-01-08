import { withAuth } from "next-auth/middleware"
import { NextResponse } from "next/server"
import { UserRole } from "@prisma/client"

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token
    const path = req.nextUrl.pathname

    // Admin routes
    if (path.startsWith("/admin") && token?.role !== UserRole.ADMIN) {
      return NextResponse.redirect(new URL("/dashboard", req.url))
    }

    // Election Committee routes
    if (
      path.startsWith("/committee") &&
      token?.role !== UserRole.ELECTION_COMMITTEE &&
      token?.role !== UserRole.ADMIN
    ) {
      return NextResponse.redirect(new URL("/dashboard", req.url))
    }

    // Board Member routes
    if (
      path.startsWith("/board") &&
      ![
        UserRole.BOARD_MEMBER,
        UserRole.ELECTION_COMMITTEE,
        UserRole.ADMIN,
      ].includes(token?.role as any)
    ) {
      return NextResponse.redirect(new URL("/dashboard", req.url))
    }

    return NextResponse.next()
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
  }
)

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/admin/:path*",
    "/board/:path*",
    "/committee/:path*",
    "/elections/:path*",
    "/voting/:path*",
    "/members/:path*",
    "/profile/:path*",
  ],
}


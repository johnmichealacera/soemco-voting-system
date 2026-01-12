import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { UserRole } from "@prisma/client"

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Only ADMIN and BRANCH_MANAGER can view potential managers
    if (![UserRole.ADMIN, UserRole.BRANCH_MANAGER].includes(session.user.role as any)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    // Get users who can be branch managers (ADMIN and BRANCH_MANAGER roles)
    const managers = await prisma.user.findMany({
      where: {
        role: {
          in: [UserRole.ADMIN, UserRole.BRANCH_MANAGER],
        },
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      },
      orderBy: {
        name: 'asc',
      },
    })

    return NextResponse.json(managers)
  } catch (error: any) {
    console.error("Error fetching branch managers:", error)
    return NextResponse.json(
      { error: "Failed to fetch branch managers" },
      { status: 500 }
    )
  }
}
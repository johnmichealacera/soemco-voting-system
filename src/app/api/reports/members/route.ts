import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { Prisma } from "@prisma/client"
import { UserRole } from "@prisma/client"

/**
 * GET /api/reports/members
 * Query: branchIds (optional, comma-separated). If omitted, returns all members (admin) or branch members (branch manager).
 */
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (![UserRole.ADMIN, UserRole.BRANCH_MANAGER].includes(session.user.role as any)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const branchIdsParam = searchParams.get("branchIds") || ""

    let branchIds: string[] = []
    if (branchIdsParam.trim()) {
      branchIds = branchIdsParam.split(",").map((id) => id.trim()).filter(Boolean)
    }

    const where: Prisma.MemberProfileWhereInput = {}

    if (session.user.role === UserRole.BRANCH_MANAGER) {
      const managerBranch = await prisma.branch.findFirst({
        where: { managerId: session.user.id },
        select: { id: true },
      })
      if (!managerBranch) {
        return NextResponse.json({ members: [], total: 0 })
      }
      where.branchId = managerBranch.id
    } else if (branchIds.length > 0) {
      where.branchId = { in: branchIds }
    }
    // else ADMIN with no branchIds: no branch filter (all members)

    const [members, total] = await Promise.all([
      prisma.memberProfile.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              email: true,
              name: true,
              role: true,
              createdAt: true,
            },
          },
          branch: {
            select: {
              id: true,
              name: true,
              code: true,
            },
          },
          _count: {
            select: { votes: true },
          },
        },
        orderBy: [{ branchId: "asc" }, { lastName: "asc" }, { firstName: "asc" }],
      }),
      prisma.memberProfile.count({ where }),
    ])

    return NextResponse.json({ members, total })
  } catch (error) {
    console.error("Error fetching members report:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

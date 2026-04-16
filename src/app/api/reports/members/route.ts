import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { Prisma } from "@prisma/client"
import { UserRole } from "@prisma/client"

/**
 * GET /api/reports/members
 * Query:
 * - branchIds (optional, comma-separated). If omitted, returns all members (admin) or branch members (branch manager).
 * - votedStatus (optional): "all" | "voted" | "not_voted" (default "all")
 * - page (optional, default 1)
 * - pageSize (optional, default 50, max 200)
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
    const votedStatus = (searchParams.get("votedStatus") || "all").toLowerCase()
    const page = Math.max(1, Number.parseInt(searchParams.get("page") || "1", 10) || 1)
    const requestedPageSize = Number.parseInt(searchParams.get("pageSize") || "50", 10) || 50
    const pageSize = Math.min(Math.max(requestedPageSize, 1), 200)

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
        return NextResponse.json({ members: [], total: 0, page: 1, pageSize, totalPages: 1 })
      }
      where.branchId = managerBranch.id
    } else if (branchIds.length > 0) {
      where.branchId = { in: branchIds }
    }
    // else ADMIN with no branchIds: no branch filter (all members)

    if (votedStatus === "voted") {
      where.votes = { some: {} }
    } else if (votedStatus === "not_voted") {
      where.votes = { none: {} }
    }

    const total = await prisma.memberProfile.count({ where })
    const totalPages = Math.max(1, Math.ceil(total / pageSize))
    const currentPage = Math.min(page, totalPages)
    const skip = (currentPage - 1) * pageSize

    const members = await prisma.memberProfile.findMany({
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
      orderBy: [
        { votes: { _count: "desc" } },
        { lastName: "asc" },
        { firstName: "asc" },
      ],
      skip,
      take: pageSize,
    })

    return NextResponse.json({
      members,
      total,
      page: currentPage,
      pageSize,
      totalPages,
    })
  } catch (error) {
    console.error("Error fetching members report:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

import { NextRequest, NextResponse } from "next/server"
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

    // Only ADMIN and BRANCH_MANAGER can view branches
    if (![UserRole.ADMIN, UserRole.BRANCH_MANAGER].includes(session.user.role as any)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const branches = await prisma.branch.findMany({
      include: {
        manager: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        _count: {
          select: {
            members: true,
          },
        },
      },
      orderBy: {
        name: 'asc',
      },
    })

    return NextResponse.json(branches)
  } catch (error: any) {
    console.error("Error fetching branches:", error)
    return NextResponse.json(
      { error: "Failed to fetch branches" },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Only ADMIN can create branches
    if (session.user.role !== UserRole.ADMIN) {
      return NextResponse.json({ error: "Only administrators can create branches" }, { status: 403 })
    }

    const body = await request.json()
    const { name, code, address, phoneNumber, managerId } = body

    if (!name || !code) {
      return NextResponse.json({ error: "Name and code are required" }, { status: 400 })
    }

    // Check if branch code already exists
    const existingBranch = await prisma.branch.findFirst({
      where: {
        OR: [
          { name: name },
          { code: code },
        ],
      },
    })

    if (existingBranch) {
      return NextResponse.json({ error: "Branch name or code already exists" }, { status: 400 })
    }

    const branch = await prisma.branch.create({
      data: {
        name,
        code,
        address,
        phoneNumber,
        managerId,
      },
      include: {
        manager: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    })

    return NextResponse.json(branch, { status: 201 })
  } catch (error: any) {
    console.error("Error creating branch:", error)
    return NextResponse.json(
      { error: "Failed to create branch" },
      { status: 500 }
    )
  }
}
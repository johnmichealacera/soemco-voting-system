import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { UserRole } from "@prisma/client"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ branchId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Only ADMIN and BRANCH_MANAGER can view branch details
    if (![UserRole.ADMIN, UserRole.BRANCH_MANAGER].includes(session.user.role as any)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { branchId } = await params

    const branch = await prisma.branch.findUnique({
      where: { id: branchId },
      include: {
        manager: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        members: {
          select: {
            id: true,
            memberId: true,
            firstName: true,
            lastName: true,
            status: true,
          },
        },
        _count: {
          select: {
            members: true,
          },
        },
      },
    })

    if (!branch) {
      return NextResponse.json({ error: "Branch not found" }, { status: 404 })
    }

    return NextResponse.json(branch)
  } catch (error: any) {
    console.error("Error fetching branch:", error)
    return NextResponse.json(
      { error: "Failed to fetch branch" },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ branchId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Only ADMIN can update branches
    if (session.user.role !== UserRole.ADMIN) {
      return NextResponse.json({ error: "Only administrators can update branches" }, { status: 403 })
    }

    const { branchId } = await params
    const body = await request.json()
    const { name, code, address, phoneNumber, managerId, isActive } = body

    if (!name || !code) {
      return NextResponse.json({ error: "Name and code are required" }, { status: 400 })
    }

    // Check if another branch with same name or code exists
    const existingBranch = await prisma.branch.findFirst({
      where: {
        AND: [
          { id: { not: branchId } },
          {
            OR: [
              { name: name },
              { code: code },
            ],
          },
        ],
      },
    })

    if (existingBranch) {
      return NextResponse.json({ error: "Branch name or code already exists" }, { status: 400 })
    }

    const updatedBranch = await prisma.branch.update({
      where: { id: branchId },
      data: {
        name,
        code,
        address,
        phoneNumber,
        managerId,
        isActive,
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

    return NextResponse.json(updatedBranch)
  } catch (error: any) {
    console.error("Error updating branch:", error)
    return NextResponse.json(
      { error: "Failed to update branch" },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ branchId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Only ADMIN can delete branches
    if (session.user.role !== UserRole.ADMIN) {
      return NextResponse.json({ error: "Only administrators can delete branches" }, { status: 403 })
    }

    const { branchId } = await params

    // Check if branch has members
    const branch = await prisma.branch.findUnique({
      where: { id: branchId },
      include: {
        _count: {
          select: {
            members: true,
          },
        },
      },
    })

    if (!branch) {
      return NextResponse.json({ error: "Branch not found" }, { status: 404 })
    }

    if (branch._count.members > 0) {
      return NextResponse.json({ error: "Cannot delete branch with active members. Please reassign members first." }, { status: 400 })
    }

    await prisma.branch.delete({
      where: { id: branchId },
    })

    return NextResponse.json({ message: "Branch deleted successfully" })
  } catch (error: any) {
    console.error("Error deleting branch:", error)
    return NextResponse.json(
      { error: "Failed to delete branch" },
      { status: 500 }
    )
  }
}
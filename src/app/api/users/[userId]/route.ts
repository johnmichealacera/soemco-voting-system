import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { UserRole } from "@prisma/client"
import { prisma } from "@/lib/prisma"

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Only ADMIN and BRANCH_MANAGER can update user roles
    if (![UserRole.ADMIN, UserRole.BRANCH_MANAGER].includes(session.user.role as any)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { userId } = await params
    const body = await request.json()
    const { role } = body

    if (!role || !Object.values(UserRole).includes(role)) {
      return NextResponse.json({ error: "Invalid role" }, { status: 400 })
    }

    // Only ADMIN can set BRANCH_MANAGER role
    if (role === UserRole.BRANCH_MANAGER && session.user.role !== UserRole.ADMIN) {
      return NextResponse.json({ error: "Only administrators can set branch manager role" }, { status: 403 })
    }

    // Update the user role
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { role },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
        memberProfile: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            memberId: true,
            status: true,
          },
        },
      },
    })

    return NextResponse.json(updatedUser)
  } catch (error: any) {
    console.error("Error updating user role:", error)
    return NextResponse.json(
      { error: "Failed to update user role" },
      { status: 500 }
    )
  }
}
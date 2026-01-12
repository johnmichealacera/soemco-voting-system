import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { UserRole } from "@prisma/client"
import { prisma } from "@/lib/prisma"

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Only ADMIN and BRANCH_MANAGER can update user roles
    if (![UserRole.ADMIN, UserRole.BRANCH_MANAGER].includes(session.user.role as any)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const body = await request.json()
    const { userIds, role } = body

    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return NextResponse.json({ error: "userIds array is required" }, { status: 400 })
    }

    if (!role || !Object.values(UserRole).includes(role)) {
      return NextResponse.json({ error: "Invalid role" }, { status: 400 })
    }

    // Only ADMIN can set BRANCH_MANAGER role
    if (role === UserRole.BRANCH_MANAGER && session.user.role !== UserRole.ADMIN) {
      return NextResponse.json({ error: "Only administrators can set branch manager role" }, { status: 403 })
    }

    // Update user roles in bulk
    await prisma.$transaction(async (tx) => {
      await tx.user.updateMany({
        where: {
          id: {
            in: userIds,
          },
        },
        data: { role },
      })
    })

    return NextResponse.json({
      message: `Successfully updated ${userIds.length} user(s) to ${role} role`,
      updatedCount: userIds.length,
    })
  } catch (error: any) {
    console.error("Error updating user roles:", error)
    return NextResponse.json(
      { error: "Failed to update user roles" },
      { status: 500 }
    )
  }
}
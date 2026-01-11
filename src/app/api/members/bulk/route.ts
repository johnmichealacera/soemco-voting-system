import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { UserRole, MemberStatus } from "@prisma/client"

export async function PUT(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Only ADMIN can perform bulk operations
    if (session.user.role !== UserRole.ADMIN) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const body = await request.json()
    const { memberIds, status } = body

    if (!memberIds || !Array.isArray(memberIds) || memberIds.length === 0) {
      return NextResponse.json(
        { error: "memberIds array is required and must not be empty" },
        { status: 400 }
      )
    }

    if (!status || !Object.values(MemberStatus).includes(status)) {
      return NextResponse.json(
        { error: "Valid status is required" },
        { status: 400 }
      )
    }

    // Update all selected members in a transaction
    const result = await prisma.memberProfile.updateMany({
      where: {
        id: {
          in: memberIds,
        },
      },
      data: {
        status: status as MemberStatus,
      },
    })

    return NextResponse.json({
      message: `Successfully updated ${result.count} member(s)`,
      count: result.count,
    })
  } catch (error: any) {
    console.error("Error updating members:", error)
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    )
  }
}

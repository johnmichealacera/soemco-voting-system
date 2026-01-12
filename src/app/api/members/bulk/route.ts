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
    if (![UserRole.ADMIN, UserRole.BRANCH_MANAGER].includes(session.user.role as any)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const body = await request.json()
    const { memberIds, status, branchId } = body

    if (!memberIds || !Array.isArray(memberIds) || memberIds.length === 0) {
      return NextResponse.json(
        { error: "memberIds array is required and must not be empty" },
        { status: 400 }
      )
    }

    // Must provide either status or branchId
    if ((!status || !Object.values(MemberStatus).includes(status)) &&
        (branchId === undefined || branchId === null)) {
      return NextResponse.json(
        { error: "Either a valid status or branchId must be provided" },
        { status: 400 }
      )
    }

    // If branchId is provided, validate it exists (unless it's null for unassignment)
    if (branchId !== undefined && branchId !== null) {
      const branch = await prisma.branch.findUnique({
        where: { id: branchId },
        select: { id: true }
      })
      if (!branch) {
        return NextResponse.json(
          { error: "Invalid branch ID" },
          { status: 400 }
        )
      }
    }

    // Prepare update data
    const updateData: any = {}
    if (status) {
      updateData.status = status as MemberStatus
    }
    if (branchId !== undefined) {
      updateData.branchId = branchId
    }

    // Update all selected members in a transaction
    const result = await prisma.memberProfile.updateMany({
      where: {
        id: {
          in: memberIds,
        },
      },
      data: updateData,
    })

    const action = status ? `status to ${status}` : `branch assignment`
    return NextResponse.json({
      message: `Successfully updated ${result.count} member(s) ${action}`,
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

export async function DELETE(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Only ADMIN can perform bulk operations
    if (![UserRole.ADMIN, UserRole.BRANCH_MANAGER].includes(session.user.role as any)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const body = await request.json()
    const { memberIds } = body

    if (!memberIds || !Array.isArray(memberIds) || memberIds.length === 0) {
      return NextResponse.json(
        { error: "memberIds array is required and must not be empty" },
        { status: 400 }
      )
    }

    // Check which members have votes (cannot delete members with votes)
    const membersWithVotes = await prisma.memberProfile.findMany({
      where: {
        id: {
          in: memberIds,
        },
      },
      include: {
        _count: {
          select: {
            votes: true,
          },
        },
      },
    })

    // Separate members that can be deleted from those that cannot
    const deletableMemberIds = membersWithVotes
      .filter((member) => member._count.votes === 0)
      .map((member) => member.id)

    const nonDeletableMembers = membersWithVotes.filter(
      (member) => member._count.votes > 0
    )

    if (deletableMemberIds.length === 0) {
      return NextResponse.json(
        {
          error:
            "Cannot delete selected members. All selected members have votes. Consider deactivating instead.",
        },
        { status: 400 }
      )
    }

    // Delete members without votes (delete User records, which will cascade delete MemberProfiles)
    const usersToDelete = await prisma.memberProfile.findMany({
      where: {
        id: {
          in: deletableMemberIds,
        },
      },
      select: {
        userId: true,
      },
    })

    const userIdsToDelete = usersToDelete.map(m => m.userId)

    // Delete users (this will cascade delete member profiles due to foreign key constraints)
    await prisma.user.deleteMany({
      where: {
        id: {
          in: userIdsToDelete,
        },
      },
    })

    const result = { count: userIdsToDelete.length }

    let message = `Successfully deleted ${result.count} member(s).`
    if (nonDeletableMembers.length > 0) {
      message += ` ${nonDeletableMembers.length} member(s) could not be deleted because they have votes.`
    }

    return NextResponse.json({
      message,
      count: result.count,
      skipped: nonDeletableMembers.length,
    })
  } catch (error: any) {
    console.error("Error deleting members:", error)
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    )
  }
}

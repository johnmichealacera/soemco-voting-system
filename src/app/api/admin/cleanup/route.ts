import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { UserRole } from "@prisma/client"

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    // if (!session?.user) {
    //   return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    // }

    // Only ADMIN can perform cleanup operations
    // if (session.user.role !== UserRole.ADMIN) {
    //   return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    // }

    const body = await request.json()
    const { action } = body

    if (action === "delete_all_votes") {
      // Get count before deletion
      const votesCount = await prisma.vote.count()

      // Delete all votes
      await prisma.vote.deleteMany({})

      return NextResponse.json({
        message: `Successfully deleted ${votesCount} votes`,
        deletedCount: votesCount,
      })
    } else if (action === "delete_orphaned_users") {
      // Find users that don't have member profiles (orphaned users)
      const orphanedUsers = await prisma.user.findMany({
        where: {
          memberProfile: null,
        },
        select: {
          id: true,
          email: true,
        },
      })

      // Delete orphaned users
      await prisma.user.deleteMany({
        where: {
          id: {
            in: orphanedUsers.map(u => u.id),
          },
        },
      })

      return NextResponse.json({
        message: `Successfully deleted ${orphanedUsers.length} orphaned users`,
        deletedUsers: orphanedUsers.map(u => u.email),
        deletedCount: orphanedUsers.length,
      })
    } else if (action === "delete_all_members") {
      // Get counts before deletion
      const memberProfilesCount = await prisma.memberProfile.count()
      const usersCount = await prisma.user.count()

      // Delete all member profiles first (cascade will handle some users)
      await prisma.memberProfile.deleteMany({})

      // Delete remaining users (orphaned ones)
      await prisma.user.deleteMany({})

      return NextResponse.json({
        message: `Successfully deleted ${memberProfilesCount} member profiles and ${usersCount} users`,
        deletedMembers: memberProfilesCount,
        deletedUsers: usersCount,
      })
    } else if (action === "reset_database") {
      // Delete everything in the correct order to avoid foreign key constraints
      const votesCount = await prisma.vote.count()
      const memberProfilesCount = await prisma.memberProfile.count()
      const usersCount = await prisma.user.count()

      // Delete votes first
      await prisma.vote.deleteMany({})

      // Delete member profiles (this will cascade to delete associated votes if any)
      await prisma.memberProfile.deleteMany({})

      // Delete all users (this will cascade to delete associated sessions, accounts, etc.)
      await prisma.user.deleteMany({})

      return NextResponse.json({
        message: "Database reset complete",
        deletedVotes: votesCount,
        deletedMembers: memberProfilesCount,
        deletedUsers: usersCount,
      })
    } else {
      return NextResponse.json(
        {
          error: "Invalid action. Use one of: 'delete_all_votes', 'delete_orphaned_users', 'delete_all_members', 'reset_database'"
        },
        { status: 400 }
      )
    }
  } catch (error: any) {
    console.error("Error performing cleanup:", error)
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    )
  }
}
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

    const userRole = session.user.role as UserRole
    const userId = session.user.id

    // Base statistics that all users can see
    const baseStats = {
      totalUsers: 0,
      totalMembers: 0,
      activeMembers: 0,
      inactiveMembers: 0,
      suspendedMembers: 0,
      pendingMembers: 0,
    }

    // Get total users count
    const totalUsers = await prisma.user.count()

    // Get member statistics
    const memberStats = await prisma.memberProfile.groupBy({
      by: ['status'],
      _count: {
        status: true,
      },
    })

    // Process member statistics
    memberStats.forEach(stat => {
      baseStats.totalMembers += stat._count.status
      switch (stat.status) {
        case 'ACTIVE':
          baseStats.activeMembers = stat._count.status
          break
        case 'INACTIVE':
          baseStats.inactiveMembers = stat._count.status
          break
        case 'SUSPENDED':
          baseStats.suspendedMembers = stat._count.status
          break
        case 'PENDING_VERIFICATION':
          baseStats.pendingMembers = stat._count.status
          break
      }
    })

    baseStats.totalUsers = totalUsers

    // Admin-specific statistics
    if (userRole === UserRole.ADMIN) {
      // Get branch statistics
      const branches = await prisma.branch.findMany({
        include: {
          _count: {
            select: {
              members: true,
            },
          },
        },
      })

      const branchStats = branches.map(branch => ({
        id: branch.id,
        name: branch.name,
        code: branch.code,
        memberCount: branch._count.members,
        isActive: branch.isActive,
      }))

      // Get election statistics
      const totalElections = await prisma.election.count()
      const activeElections = await prisma.election.count({
        where: {
          status: 'VOTING_ACTIVE',
        },
      })

      return NextResponse.json({
        ...baseStats,
        totalBranches: branches.length,
        activeBranches: branches.filter(b => b.isActive).length,
        branchBreakdown: branchStats,
        totalElections,
        activeElections,
      })
    }

    // Branch Manager-specific statistics
    if (userRole === UserRole.BRANCH_MANAGER) {
      // Find the branch this manager is assigned to
      const managerBranch = await prisma.branch.findFirst({
        where: {
          managerId: userId,
        },
        include: {
          _count: {
            select: {
              members: true,
            },
          },
        },
      })

      if (managerBranch) {
        // Get member statistics for this branch
        const branchMemberStats = await prisma.memberProfile.groupBy({
          by: ['status'],
          where: {
            branchId: managerBranch.id,
          },
          _count: {
            status: true,
          },
        })

        const branchStats = {
          branchId: managerBranch.id,
          branchName: managerBranch.name,
          branchCode: managerBranch.code,
          totalMembers: 0,
          activeMembers: 0,
          inactiveMembers: 0,
          suspendedMembers: 0,
          pendingMembers: 0,
        }

        branchMemberStats.forEach(stat => {
          branchStats.totalMembers += stat._count.status
          switch (stat.status) {
            case 'ACTIVE':
              branchStats.activeMembers = stat._count.status
              break
            case 'INACTIVE':
              branchStats.inactiveMembers = stat._count.status
              break
            case 'SUSPENDED':
              branchStats.suspendedMembers = stat._count.status
              break
            case 'PENDING_VERIFICATION':
              branchStats.pendingMembers = stat._count.status
              break
          }
        })

        return NextResponse.json({
          ...baseStats,
          branchStats,
        })
      }
    }

    // Default response for other roles
    return NextResponse.json(baseStats)

  } catch (error: any) {
    console.error("Error fetching dashboard stats:", error)
    return NextResponse.json(
      { error: "Failed to fetch dashboard statistics" },
      { status: 500 }
    )
  }
}
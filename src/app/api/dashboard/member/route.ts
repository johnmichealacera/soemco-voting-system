import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { ElectionStatus } from "@prisma/client"

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const member = await prisma.memberProfile.findUnique({
      where: { userId: session.user.id },
    })

    if (!member) {
      return NextResponse.json({ error: "Member profile not found" }, { status: 404 })
    }

    // Get active elections
    const activeElections = await prisma.election.findMany({
      where: {
        status: ElectionStatus.VOTING_ACTIVE,
        votingStartDate: { lte: new Date() },
        votingEndDate: { gte: new Date() },
      },
      include: {
        positions: true,
        _count: {
          select: { votes: true },
        },
      },
      orderBy: { votingEndDate: "asc" },
    })

    // Check which elections the member has voted in
    const memberVotes = await prisma.vote.findMany({
      where: { memberId: member.id },
      select: { electionId: true },
    })

    const votedElectionIds = new Set(memberVotes.map((v) => v.electionId))

    // Get pending votes (active elections not yet voted)
    const pendingElections = activeElections.filter(
      (e) => !votedElectionIds.has(e.id)
    )

    // Get all elections count
    const totalElections = await prisma.election.count()

    // Get completed votes count
    const completedVotes = memberVotes.length

    const stats = {
      activeElections: activeElections.length,
      pendingVotes: pendingElections.length,
      completedVotes,
      totalElections,
    }

    return NextResponse.json({
      stats,
      activeElections: activeElections.map((e) => ({
        id: e.id,
        title: e.title,
        electionType: e.electionType,
        votingEndDate: e.votingEndDate,
        hasVoted: votedElectionIds.has(e.id),
      })),
      recentActivity: [], // TODO: Implement activity tracking
    })
  } catch (error) {
    console.error("Error fetching member dashboard:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}


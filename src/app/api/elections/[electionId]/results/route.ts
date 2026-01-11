import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(
  request: Request,
  { params }: { params: Promise<{ electionId: string }> }
) {
  const { electionId } = await params;
  try {
    // Results are public - no authentication required
    // Get election with positions and candidates
    const election = await prisma.election.findUnique({
      where: { id: electionId },
      include: {
        positions: {
          include: {
            candidates: {
              where: {
                status: "approved",
              },
              include: {
                user: {
                  select: {
                    id: true,
                    name: true,
                    email: true,
                  },
                },
              },
              orderBy: {
                createdAt: "asc",
              },
            },
          },
          orderBy: { order: "asc" },
        },
      },
    })

    if (!election) {
      return NextResponse.json({ error: "Election not found" }, { status: 404 })
    }

    // Get vote counts for each candidate
    const votes = await prisma.vote.findMany({
      where: {
        electionId,
        candidateId: { not: null },
      },
      select: {
        candidateId: true,
        positionId: true,
      },
    })

    // Count votes per candidate
    const voteCounts = votes.reduce((acc, vote) => {
      if (vote.candidateId) {
        const key = `${vote.positionId}-${vote.candidateId}`
        acc[key] = (acc[key] || 0) + 1
      }
      return acc
    }, {} as Record<string, number>)

    // Get total votes per position
    const positionVoteCounts = votes.reduce((acc, vote) => {
      acc[vote.positionId] = (acc[vote.positionId] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    // Calculate total eligible members (active members)
    const totalEligibleMembers = await prisma.memberProfile.count({
      where: {
        status: "ACTIVE",
      },
    })

    // Build results structure
    const results = election.positions.map((position) => {
      const totalVotes = positionVoteCounts[position.id] || 0
      const candidates = position.candidates.map((candidate) => {
        const key = `${position.id}-${candidate.id}`
        const voteCount = voteCounts[key] || 0
        const percentage = totalVotes > 0 ? (voteCount / totalVotes) * 100 : 0

        return {
          id: candidate.id,
          userId: candidate.userId,
          name: candidate.user?.name || candidate.user?.email || "Unknown",
          email: candidate.user?.email || "",
          imageUrl: candidate.imageUrl,
          bio: candidate.bio,
          qualifications: candidate.qualifications,
          voteCount,
          percentage: Math.round(percentage * 100) / 100, // Round to 2 decimal places
        }
      })

      // Sort candidates by vote count (descending)
      candidates.sort((a, b) => b.voteCount - a.voteCount)

      return {
        id: position.id,
        title: position.title,
        description: position.description,
        totalVotes,
        totalEligibleMembers,
        participationRate: totalEligibleMembers > 0 
          ? Math.round((totalVotes / totalEligibleMembers) * 100 * 100) / 100 
          : 0,
        candidates,
      }
    })

    return NextResponse.json({
      election: {
        id: election.id,
        title: election.title,
        description: election.description,
        status: election.status,
        votingStartDate: election.votingStartDate,
        votingEndDate: election.votingEndDate,
      },
      results,
      summary: {
        totalPositions: election.positions.length,
        totalCandidates: election.positions.reduce(
          (sum, pos) => sum + pos.candidates.length,
          0
        ),
        totalVotes: votes.length,
        totalEligibleMembers,
        overallParticipationRate:
          totalEligibleMembers > 0
            ? Math.round((votes.length / totalEligibleMembers) * 100 * 100) / 100
            : 0,
      },
    })
  } catch (error) {
    console.error("Error fetching election results:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

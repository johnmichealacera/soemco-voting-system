import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ electionId: string }> }
) {
  const { electionId } = await params;
  try {
    // Get user session to determine anonymity permissions
    const session = await getServerSession(authOptions)
    const isAdmin = session?.user?.role === 'ADMIN'

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

    // Helper function to generate anonymous name
    const getAnonymousName = (index: number) => {
      const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
      return `Candidate ${letters[index] || (index + 1)}`
    }

    // Build results structure
    const results = election.positions.map((position) => {
      const totalVotes = positionVoteCounts[position.id] || 0
      const candidates = position.candidates.map((candidate, index) => {
        const key = `${position.id}-${candidate.id}`
        const voteCount = voteCounts[key] || 0
        const percentage = totalVotes > 0 ? (voteCount / totalVotes) * 100 : 0

        // Determine if we should show real name or anonymous name
        // Show real names only when election is NOT anonymous
        const shouldShowRealName = !election.isAnonymous
        const displayName = shouldShowRealName
          ? (candidate.user?.name || candidate.user?.email || "Unknown")
          : getAnonymousName(index)

        return {
          id: candidate.id,
          userId: candidate.userId,
          name: displayName,
          email: shouldShowRealName ? (candidate.user?.email || "") : "",
          imageUrl: candidate.imageUrl,
          bio: shouldShowRealName ? candidate.bio : null, // Hide bio when anonymous
          qualifications: shouldShowRealName ? candidate.qualifications : null, // Hide qualifications when anonymous
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
        isAnonymous: election.isAnonymous,
      },
      anonymity: {
        isEnabled: election.isAnonymous,
        canReveal: isAdmin, // Only admins can toggle anonymity
        isRevealed: !election.isAnonymous, // True only when anonymity is disabled
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

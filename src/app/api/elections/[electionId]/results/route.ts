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

    // Get vote counts for each candidate with branch information
    const votes = await prisma.vote.findMany({
      where: {
        electionId,
        candidateId: { not: null },
      },
      select: {
        candidateId: true,
        positionId: true,
        member: {
          select: {
            branch: {
              select: {
                id: true,
                name: true,
                code: true,
              },
            },
          },
        },
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

    // Calculate votes by branch
    const branchVoteCounts = votes.reduce((acc, vote) => {
      const branchId = vote.member?.branch?.id || 'unassigned'
      const branchName = vote.member?.branch?.name || 'Unassigned'
      const branchCode = vote.member?.branch?.code || ''

      if (!acc[branchId]) {
        acc[branchId] = {
          id: branchId,
          name: branchName,
          code: branchCode,
          totalVotes: 0,
          positions: {} as Record<string, number>,
        }
      }

      acc[branchId].totalVotes += 1

      // Count votes per position for this branch
      if (!acc[branchId].positions[vote.positionId]) {
        acc[branchId].positions[vote.positionId] = 0
      }
      acc[branchId].positions[vote.positionId] += 1

      return acc
    }, {} as Record<string, {
      id: string
      name: string
      code: string
      totalVotes: number
      positions: Record<string, number>
    }>)

    // Get total eligible members per branch
    const branchMemberCounts = await prisma.memberProfile.groupBy({
      by: ['branchId'],
      where: {
        status: "ACTIVE",
      },
      _count: {
        id: true,
      },
    })

    // Calculate total eligible members (active members)
    const totalEligibleMembers = await prisma.memberProfile.count({
      where: {
        status: "ACTIVE",
      },
    })

    // Prepare branch voting breakdown
    const branchBreakdown = Object.values(branchVoteCounts).map(branch => {
      const branchMemberCount = branchMemberCounts.find(b => b.branchId === (branch.id === 'unassigned' ? null : branch.id))?._count.id || 0
      const participationRate = branchMemberCount > 0 ? Math.round((branch.totalVotes / branchMemberCount) * 100 * 100) / 100 : 0

      return {
        id: branch.id,
        name: branch.name,
        code: branch.code,
        totalVotes: branch.totalVotes,
        totalMembers: branchMemberCount,
        participationRate,
        positions: Object.entries(branch.positions).map(([positionId, votes]) => ({
          positionId,
          votes,
        })),
      }
    }).sort((a, b) => b.totalVotes - a.totalVotes) // Sort by total votes descending

    // Helper function to generate anonymous name
    const getAnonymousName = (index: number) => {
      const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
      return `Candidate ${letters[index] || (index + 1)}`
    }

    // Calculate candidate votes by branch
    const candidateBranchVotes = votes.reduce((acc, vote) => {
      if (vote.candidateId) {
        const candidateKey = `${vote.positionId}-${vote.candidateId}`
        const branchId = vote.member?.branch?.id || 'unassigned'

        if (!acc[candidateKey]) {
          acc[candidateKey] = {}
        }

        acc[candidateKey][branchId] = (acc[candidateKey][branchId] || 0) + 1
      }
      return acc
    }, {} as Record<string, Record<string, number>>)

    // Build results structure
    const results = election.positions.map((position) => {
      const totalVotes = positionVoteCounts[position.id] || 0

      // First pass: get vote counts and branch breakdown
      const candidatesWithData: Array<{
        id: string
        userId: string
        user: any
        imageUrl: string | null
        bio: string | null
        qualifications: string | null
        voteCount: number
        percentage: number
        branchBreakdown: Array<{
          branchId: string
          branchName: string
          branchCode: string
          votes: number
        }>
      }> = position.candidates.map((candidate, index) => {
        const key = `${position.id}-${candidate.id}`
        const voteCount = voteCounts[key] || 0
        const percentage = totalVotes > 0 ? (voteCount / totalVotes) * 100 : 0

        // Get branch breakdown for this candidate
        const branchVotes = candidateBranchVotes[key] || {}
        const branchBreakdown = Object.entries(branchVotes).map(([branchId, votes]) => {
          const branchInfo = branchId === 'unassigned'
            ? { id: 'unassigned', name: 'Unassigned', code: '' }
            : branchVoteCounts[branchId] || { id: branchId, name: 'Unknown Branch', code: '' }

          return {
            branchId,
            branchName: branchInfo.name,
            branchCode: branchInfo.code,
            votes,
          }
        }).sort((a, b) => b.votes - a.votes) // Sort by votes descending

        return {
          id: candidate.id,
          userId: candidate.userId,
          user: candidate.user,
          imageUrl: candidate.imageUrl,
          bio: candidate.bio,
          qualifications: candidate.qualifications,
          voteCount,
          percentage: Math.round(percentage * 100) / 100, // Round to 2 decimal places
          branchBreakdown, // Add branch breakdown
        }
      })

      // Sort candidates by vote count (descending)
      candidatesWithData.sort((a, b) => b.voteCount - a.voteCount)

      // Second pass: assign names based on sorted order
      const candidates: Array<{
        id: string
        userId: string
        name: string
        email: string
        imageUrl: string | null
        bio: string | null
        qualifications: string | null
        voteCount: number
        percentage: number
        branchBreakdown: Array<{
          branchId: string
          branchName: string
          branchCode: string
          votes: number
        }>
      }> = candidatesWithData.map((candidate, sortedIndex) => {
        // Determine if we should show real name or anonymous name
        // Show real names only when election is NOT anonymous
        const shouldShowRealName = !election.isAnonymous
        const displayName = shouldShowRealName
          ? (candidate.user?.name || candidate.user?.email || "Unknown")
          : getAnonymousName(sortedIndex)

        return {
          id: candidate.id,
          userId: candidate.userId,
          name: displayName,
          email: shouldShowRealName ? (candidate.user?.email || "") : "",
          imageUrl: shouldShowRealName ? candidate.imageUrl : null,
          bio: shouldShowRealName ? candidate.bio : null, // Hide bio when anonymous
          qualifications: shouldShowRealName ? candidate.qualifications : null, // Hide qualifications when anonymous
          voteCount: candidate.voteCount,
          percentage: candidate.percentage,
          branchBreakdown: candidate.branchBreakdown,
        }
      })

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
      branchBreakdown,
    })
  } catch (error) {
    console.error("Error fetching election results:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

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

    // Get member profile
    const member = await prisma.memberProfile.findUnique({
      where: { userId: session.user.id },
    })

    if (!member) {
      return NextResponse.json(
        { error: "Member profile not found" },
        { status: 404 }
      )
    }

    if (member.status !== "ACTIVE") {
      return NextResponse.json(
        { error: "Member account is not active" },
        { status: 403 }
      )
    }

    const now = new Date()

    // Get active elections that are within voting period
    const activeElections = await prisma.election.findMany({
      where: {
        status: ElectionStatus.VOTING_ACTIVE,
        votingStartDate: { lte: now },
        votingEndDate: { gte: now },
      },
      include: {
        positions: {
          include: {
            candidates: {
              where: {
                status: "approved",
              },
              select: {
                id: true,
                electionId: true,
                positionId: true,
                userId: true,
                status: true,
                imageUrl: true,
                bio: true,
                qualifications: true,
                nominationDate: true,
                createdAt: true,
                updatedAt: true,
                user: {
                  select: {
                    id: true,
                    name: true,
                    email: true,
                  },
                },
              },
            },
          },
          orderBy: { order: "asc" },
        },
        _count: {
          select: {
            votes: true,
            candidates: true,
          },
        },
      },
      orderBy: { votingEndDate: "asc" },
    })

    // Check which elections the member has voted in
    const memberVotes = await prisma.vote.findMany({
      where: {
        memberId: member.id,
        electionId: {
          in: activeElections.map((e) => e.id),
        },
      },
      select: {
        electionId: true,
      },
    })

    const votedElectionIds = new Set(memberVotes.map((v) => v.electionId))

    // Filter elections and add voting status
    const electionsWithStatus = activeElections.map((election) => ({
      ...election,
      hasVoted: votedElectionIds.has(election.id),
      canVote: !votedElectionIds.has(election.id),
    }))

    return NextResponse.json(electionsWithStatus)
  } catch (error) {
    console.error("Error fetching voting elections:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}


import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { generateVoteToken } from "@/lib/utils"
import { createAuditLog } from "@/lib/audit"
import { ElectionStatus } from "@prisma/client"

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { electionId, votes } = body // votes is an array of { positionId, candidateId }

    if (!electionId || !votes || !Array.isArray(votes) || votes.length === 0) {
      return NextResponse.json(
        { error: "Missing required fields: electionId and votes array" },
        { status: 400 }
      )
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

    // Verify election is active
    const election = await prisma.election.findUnique({
      where: { id: electionId },
    })

    if (!election) {
      return NextResponse.json({ error: "Election not found" }, { status: 404 })
    }

    if (election.status !== ElectionStatus.VOTING_ACTIVE) {
      return NextResponse.json(
        { error: "Election is not currently accepting votes" },
        { status: 400 }
      )
    }

    const now = new Date()
    if (now < election.votingStartDate || now > election.votingEndDate) {
      return NextResponse.json(
        { error: "Voting period has not started or has ended" },
        { status: 400 }
      )
    }

    // Check if member has already voted in this election
    const existingVote = await prisma.vote.findFirst({
      where: {
        electionId,
        memberId: member.id,
      },
    })

    if (existingVote) {
      return NextResponse.json(
        { error: "You have already voted in this election" },
        { status: 400 }
      )
    }

    // Generate a unique vote token for each vote
    // Create all votes in a transaction
    const createdVotes = await prisma.$transaction(
      votes.map((vote: { positionId: string; candidateId: string }) =>
        prisma.vote.create({
          data: {
            electionId,
            positionId: vote.positionId,
            candidateId: vote.candidateId || null,
            memberId: member.id,
            voteToken: generateVoteToken(),
          },
        })
      )
    )

    // Create audit log for the voting session
    await createAuditLog({
      userId: session.user.id,
      memberId: member.id,
      action: "CAST_VOTES",
      entityType: "Vote",
      entityId: createdVotes[0].id,
      changes: {
        electionId,
        votesCount: votes.length,
        positions: votes.map((v: any) => ({
          positionId: v.positionId,
          candidateId: v.candidateId,
        })),
      },
    })

    return NextResponse.json(
      {
        success: true,
        votesCount: createdVotes.length,
        votes: createdVotes.map(v => ({ id: v.id, voteToken: v.voteToken })),
      },
      { status: 201 }
    )
  } catch (error: any) {
    console.error("Error casting votes:", error)
    if (error.code === "P2002") {
      return NextResponse.json(
        { error: "You have already voted in this election" },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}


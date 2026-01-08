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
    const { electionId, positionId, candidateId, voteType, rankedChoices, approvalVotes } = body

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

    // Check if member has already voted in this election (check by electionId and memberId)
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

    // Create vote
    const voteToken = generateVoteToken()
    const vote = await prisma.vote.create({
      data: {
        electionId,
        positionId,
        candidateId: candidateId || null,
        memberId: member.id,
        voteToken,
        rankedChoices: rankedChoices ? JSON.stringify(rankedChoices) : null,
        approvalVotes: approvalVotes ? JSON.stringify(approvalVotes) : null,
      },
    })

    // Create audit log
    await createAuditLog({
      userId: session.user.id,
      memberId: member.id,
      action: "CAST_VOTE",
      entityType: "Vote",
      entityId: vote.id,
      changes: {
        electionId,
        positionId,
        candidateId,
        voteType,
      },
    })

    return NextResponse.json({ success: true, voteToken }, { status: 201 })
  } catch (error: any) {
    console.error("Error casting vote:", error)
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


import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { UserRole, ElectionStatus } from "@prisma/client"

export async function GET(
  request: Request,
  { params }: { params: Promise<{ electionId: string }> }
) {
  const { electionId } = await params;
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const election = await prisma.election.findUnique({
      where: { id: electionId },
      include: {
        positions: {
          include: {
            candidates: {
              include: {
                user: {
                  select: {
                    name: true,
                    email: true,
                  },
                },
              },
            },
          },
          orderBy: { order: "asc" },
        },
        creator: {
          select: {
            name: true,
            email: true,
          },
        },
        _count: {
          select: {
            votes: true,
            candidates: true,
          },
        },
      },
    })

    if (!election) {
      return NextResponse.json({ error: "Election not found" }, { status: 404 })
    }

    return NextResponse.json(election)
  } catch (error) {
    console.error("Error fetching election:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ electionId: string }> }
) {
  const { electionId } = await params;
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Only ADMIN, BOARD_MEMBER, and ELECTION_COMMITTEE can update elections
    if (
      ![
        UserRole.ADMIN,
        UserRole.BOARD_MEMBER,
        UserRole.ELECTION_COMMITTEE,
      ].includes(session.user.role as any)
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const body = await request.json()
    const {
      title,
      description,
      electionType,
      voteType,
      votingStartDate,
      votingEndDate,
      nominationStartDate,
      nominationEndDate,
      status,
    } = body

    // Validate dates if provided
    if (votingStartDate && votingEndDate) {
      if (new Date(votingStartDate) >= new Date(votingEndDate)) {
        return NextResponse.json(
          { error: "Voting end date must be after start date" },
          { status: 400 }
        )
      }
    }

    const election = await prisma.election.update({
      where: { id: electionId },
      data: {
        ...(title && { title }),
        ...(description !== undefined && { description }),
        ...(electionType && { electionType }),
        ...(voteType && { voteType }),
        ...(votingStartDate && { votingStartDate: new Date(votingStartDate) }),
        ...(votingEndDate && { votingEndDate: new Date(votingEndDate) }),
        ...(nominationStartDate !== undefined && {
          nominationStartDate: nominationStartDate
            ? new Date(nominationStartDate)
            : null,
        }),
        ...(nominationEndDate !== undefined && {
          nominationEndDate: nominationEndDate
            ? new Date(nominationEndDate)
            : null,
        }),
        ...(status && { status }),
      },
      include: {
        positions: true,
        _count: {
          select: {
            votes: true,
            candidates: true,
          },
        },
      },
    })

    return NextResponse.json(election)
  } catch (error) {
    console.error("Error updating election:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ electionId: string }> }
) {
  const { electionId } = await params;
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Only ADMIN can delete elections
    if (session.user.role !== UserRole.ADMIN) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    // Check if election has votes - if so, we might want to prevent deletion
    const election = await prisma.election.findUnique({
      where: { id: electionId },
      include: {
        _count: {
          select: {
            votes: true,
          },
        },
      },
    })

    if (!election) {
      return NextResponse.json({ error: "Election not found" }, { status: 404 })
    }

    // Prevent deletion if election has votes (for data integrity)
    if (election._count.votes > 0) {
      return NextResponse.json(
        {
          error:
            "Cannot delete election with existing votes. Consider cancelling instead.",
        },
        { status: 400 }
      )
    }

    await prisma.election.delete({
      where: { id: electionId },
    })

    return NextResponse.json({ message: "Election deleted successfully" })
  } catch (error) {
    console.error("Error deleting election:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}


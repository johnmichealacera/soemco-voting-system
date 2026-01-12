import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { UserRole, ElectionStatus } from "@prisma/client"

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const elections = await prisma.election.findMany({
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
        },
        _count: {
          select: {
            votes: true,
            candidates: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    })

    return NextResponse.json(elections)
  } catch (error) {
    console.error("Error fetching elections:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Only BOARD_MEMBER, ELECTION_COMMITTEE, and ADMIN can create elections
    if (
      ![
        UserRole.BOARD_MEMBER,
        UserRole.ELECTION_COMMITTEE,
        UserRole.ADMIN,
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
      isAnonymous,
      votingStartDate,
      votingEndDate,
      nominationStartDate,
      nominationEndDate,
      positions,
    } = body

    // Validate dates
    if (new Date(votingStartDate) >= new Date(votingEndDate)) {
      return NextResponse.json(
        { error: "Voting end date must be after start date" },
        { status: 400 }
      )
    }

    const election = await prisma.election.create({
      data: {
        title,
        description,
        electionType,
        voteType: voteType || "SINGLE_CHOICE",
        isAnonymous: isAnonymous !== undefined ? isAnonymous : true, // Default to anonymous
        votingStartDate: new Date(votingStartDate),
        votingEndDate: new Date(votingEndDate),
        nominationStartDate: nominationStartDate
          ? new Date(nominationStartDate)
          : null,
        nominationEndDate: nominationEndDate
          ? new Date(nominationEndDate)
          : null,
        status: ElectionStatus.DRAFT,
        createdById: session.user.id,
        positions: {
          create: positions?.map((pos: any, index: number) => ({
            title: pos.title,
            description: pos.description,
            order: index,
          })) || [],
        },
      },
      include: {
        positions: true,
      },
    })

    return NextResponse.json(election, { status: 201 })
  } catch (error) {
    console.error("Error creating election:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}


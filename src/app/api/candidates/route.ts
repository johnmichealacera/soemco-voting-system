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

    // Only ADMIN can view all candidates
    if (session.user.role !== UserRole.ADMIN) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const candidates = await prisma.candidate.findMany({
      include: {
        election: {
          select: {
            id: true,
            title: true,
            status: true,
          },
        },
        position: {
          select: {
            id: true,
            title: true,
          },
        },
        user: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
        _count: {
          select: {
            votes: true,
          },
        },
      },
      orderBy: [
        { election: { createdAt: "desc" } },
        { createdAt: "desc" },
      ],
    })

    return NextResponse.json(candidates)
  } catch (error) {
    console.error("Error fetching candidates:", error)
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

    // Only ADMIN can create candidates
    if (session.user.role !== UserRole.ADMIN) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const body = await request.json()
    const { electionId, positionId, userId, status, imageUrl, bio, qualifications, nominationDate } = body

    // Validate required fields
    if (!electionId || !positionId || !userId) {
      return NextResponse.json(
        { error: "Missing required fields: electionId, positionId, userId" },
        { status: 400 }
      )
    }

    // Verify election exists
    const election = await prisma.election.findUnique({
      where: { id: electionId },
    })

    if (!election) {
      return NextResponse.json(
        { error: "Election not found" },
        { status: 404 }
      )
    }

    // Verify position exists and belongs to the election
    const position = await prisma.position.findUnique({
      where: { id: positionId },
    })

    if (!position) {
      return NextResponse.json(
        { error: "Position not found" },
        { status: 404 }
      )
    }

    if (position.electionId !== electionId) {
      return NextResponse.json(
        { error: "Position does not belong to the selected election" },
        { status: 400 }
      )
    }

    // Verify user exists
    const user = await prisma.user.findUnique({
      where: { id: userId },
    })

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      )
    }

    // Check if candidate already exists for this position and user
    const existingCandidate = await prisma.candidate.findFirst({
      where: {
        electionId,
        positionId,
        userId,
      },
    })

    if (existingCandidate) {
      return NextResponse.json(
        { error: "This user is already a candidate for this position in this election" },
        { status: 400 }
      )
    }

    const candidate = await prisma.candidate.create({
      data: {
        electionId,
        positionId,
        userId,
        status: status || "pending",
        imageUrl: imageUrl || null,
        bio: bio || null,
        qualifications: qualifications || null,
        nominationDate: nominationDate ? new Date(nominationDate) : new Date(),
      },
      include: {
        election: {
          select: {
            id: true,
            title: true,
            status: true,
          },
        },
        position: {
          select: {
            id: true,
            title: true,
          },
        },
        user: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
        _count: {
          select: {
            votes: true,
          },
        },
      },
    })

    return NextResponse.json(candidate, { status: 201 })
  } catch (error) {
    console.error("Error creating candidate:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}


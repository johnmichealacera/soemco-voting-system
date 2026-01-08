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

    // Only ADMIN can view all positions
    if (session.user.role !== UserRole.ADMIN) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const positions = await prisma.position.findMany({
      include: {
        election: {
          select: {
            id: true,
            title: true,
            status: true,
          },
        },
        _count: {
          select: {
            candidates: true,
            votes: true,
          },
        },
      },
      orderBy: [
        { order: "asc" },
        { createdAt: "desc" },
      ],
    })

    return NextResponse.json(positions)
  } catch (error) {
    console.error("Error fetching positions:", error)
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

    // Only ADMIN can create positions
    if (session.user.role !== UserRole.ADMIN) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const body = await request.json()
    const { electionId, title, description, order } = body

    // Validate required fields
    if (!title) {
      return NextResponse.json(
        { error: "Missing required field: title" },
        { status: 400 }
      )
    }

    // Verify election exists if provided
    if (electionId) {
      const election = await prisma.election.findUnique({
        where: { id: electionId },
      })

      if (!election) {
        return NextResponse.json(
          { error: "Election not found" },
          { status: 404 }
        )
      }
    }

    // Get the highest order to set default
    const maxOrder = await prisma.position.findFirst({
      where: electionId ? { electionId } : { electionId: null },
      orderBy: { order: "desc" },
      select: { order: true },
    })

    const position = await prisma.position.create({
      data: {
        electionId: electionId || null,
        title,
        description: description || null,
        order: order !== undefined ? order : (maxOrder?.order ?? -1) + 1,
      },
      include: {
        election: {
          select: {
            id: true,
            title: true,
            status: true,
          },
        },
        _count: {
          select: {
            candidates: true,
            votes: true,
          },
        },
      },
    })

    return NextResponse.json(position, { status: 201 })
  } catch (error) {
    console.error("Error creating position:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}


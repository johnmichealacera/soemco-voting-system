import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { UserRole } from "@prisma/client"

export async function GET(
  request: Request,
  { params }: { params: Promise<{ positionId: string }> }
) {
  const { positionId } = await params;
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Only ADMIN can view position details
    if (session.user.role !== UserRole.ADMIN) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const position = await prisma.position.findUnique({
      where: { id: positionId },
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

    if (!position) {
      return NextResponse.json({ error: "Position not found" }, { status: 404 })
    }

    return NextResponse.json(position)
  } catch (error) {
    console.error("Error fetching position:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ positionId: string }> }
) {
  const { positionId } = await params;
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Only ADMIN can update positions
    if (session.user.role !== UserRole.ADMIN) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const body = await request.json()
    const { title, description, order, electionId } = body

    const position = await prisma.position.findUnique({
      where: { id: positionId },
    })

    if (!position) {
      return NextResponse.json({ error: "Position not found" }, { status: 404 })
    }

    // If electionId is being changed, verify the new election exists (if provided)
    if (electionId !== undefined && electionId !== position.electionId) {
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
    }

    const updateData: any = {}
    if (title) updateData.title = title
    if (description !== undefined) updateData.description = description || null
    if (order !== undefined) updateData.order = order
    if (electionId !== undefined) {
      updateData.electionId = electionId || null
    }

    const updatedPosition = await prisma.position.update({
      where: { id: positionId },
      data: updateData,
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

    return NextResponse.json(updatedPosition)
  } catch (error) {
    console.error("Error updating position:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ positionId: string }> }
) {
  const { positionId } = await params;
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Only ADMIN can delete positions
    if (session.user.role !== UserRole.ADMIN) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const position = await prisma.position.findUnique({
      where: { id: positionId },
      include: {
        _count: {
          select: {
            candidates: true,
            votes: true,
          },
        },
      },
    })

    if (!position) {
      return NextResponse.json({ error: "Position not found" }, { status: 404 })
    }

    // Prevent deletion if position has candidates or votes (for data integrity)
    if (position._count.candidates > 0 || position._count.votes > 0) {
      return NextResponse.json(
        {
          error:
            "Cannot delete position with existing candidates or votes. Consider removing candidates first.",
        },
        { status: 400 }
      )
    }

    await prisma.position.delete({
      where: { id: positionId },
    })

    return NextResponse.json({ message: "Position deleted successfully" })
  } catch (error) {
    console.error("Error deleting position:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}


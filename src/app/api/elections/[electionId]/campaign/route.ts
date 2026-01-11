import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(
  request: Request,
  { params }: { params: Promise<{ electionId: string }> }
) {
  const { electionId } = await params;
  try {
    // Public endpoint - no authentication required
    // Get election with positions and approved candidates
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

    // Build campaign structure
    const positions = election.positions.map((position) => ({
      id: position.id,
      title: position.title,
      description: position.description,
      order: position.order,
      candidates: position.candidates.map((candidate) => ({
        id: candidate.id,
        userId: candidate.userId,
        name: candidate.user?.name || candidate.user?.email || "Unknown",
        email: candidate.user?.email || "",
        imageUrl: candidate.imageUrl,
        bio: candidate.bio,
        qualifications: candidate.qualifications,
        status: candidate.status,
        nominationDate: candidate.nominationDate,
      })),
    }))

    return NextResponse.json({
      election: {
        id: election.id,
        title: election.title,
        description: election.description,
        status: election.status,
        votingStartDate: election.votingStartDate,
        votingEndDate: election.votingEndDate,
      },
      positions,
    })
  } catch (error) {
    console.error("Error fetching campaign data:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

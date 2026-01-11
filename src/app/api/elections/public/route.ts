import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { ElectionStatus } from "@prisma/client"

export async function GET() {
  try {
    // Public endpoint - no authentication required
    // Get active elections (VOTING_ACTIVE or RESULTS_CERTIFIED)
    const elections = await prisma.election.findMany({
      where: {
        status: {
          in: [ElectionStatus.VOTING_ACTIVE, ElectionStatus.RESULTS_CERTIFIED],
        },
      },
      select: {
        id: true,
        title: true,
        description: true,
        status: true,
        votingStartDate: true,
        votingEndDate: true,
        _count: {
          select: {
            votes: true,
            candidates: true,
          },
        },
      },
      orderBy: { votingEndDate: "desc" },
    })

    return NextResponse.json(elections)
  } catch (error) {
    console.error("Error fetching public elections:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

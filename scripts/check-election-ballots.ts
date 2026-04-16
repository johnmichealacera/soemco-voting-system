/**
 * Read-only checker: report current ballots cast for an election and how many
 * ballots are still needed to reach a target.
 *
 * A "ballot" is counted as one distinct member who has at least one Vote row
 * in the given election.
 *
 * Required env:
 *   - DATABASE_URL
 *   - ELECTION_ID
 *
 * Optional env:
 *   - TARGET_BALLOTS (default: 2775)
 *
 * Run:
 *   npx tsx scripts/check-election-ballots.ts
 */

import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

function parseTargetBallots(raw: string | undefined): number {
  if (!raw) return 2775
  const parsed = Number.parseInt(raw, 10)
  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new Error("TARGET_BALLOTS must be a non-negative integer.")
  }
  return parsed
}

async function main() {
  const electionId = process.env.ELECTION_ID?.trim()
  if (!electionId) {
    throw new Error("ELECTION_ID is required.")
  }

  const targetBallots = parseTargetBallots(process.env.TARGET_BALLOTS)

  const election = await prisma.election.findUnique({
    where: { id: electionId },
    select: { id: true, title: true, status: true },
  })

  if (!election) {
    throw new Error(`Election not found: ${electionId}`)
  }

  const [distinctMembers, totalVoteRows] = await Promise.all([
    prisma.vote.groupBy({
      by: ["memberId"],
      where: { electionId },
    }),
    prisma.vote.count({
      where: { electionId },
    }),
  ])

  const ballotsCast = distinctMembers.length
  const missingBallots = Math.max(0, targetBallots - ballotsCast)
  const progress = targetBallots > 0 ? Math.round((ballotsCast / targetBallots) * 10000) / 100 : 0

  console.log("=== Election ballot checker ===")
  console.log(`Election: ${election.title} (${election.id})`)
  console.log(`Status: ${election.status}`)
  console.log(`Target ballots: ${targetBallots}`)
  console.log(`Ballots cast (distinct members): ${ballotsCast}`)
  console.log(`Vote rows (raw records): ${totalVoteRows}`)
  console.log(`Missing ballots to target: ${missingBallots}`)
  console.log(`Progress: ${progress}%`)
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })


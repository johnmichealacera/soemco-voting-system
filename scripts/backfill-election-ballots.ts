/**
 * One-off automation: cast full ballots for members who have not yet voted in an election,
 * until TARGET_BALLOTS distinct members have voted (default 2775).
 *
 * Required env:
 *   DATABASE_URL — PostgreSQL connection (same as app)
 *   ELECTION_ID — election to backfill
 *
 * Optional env:
 *   TARGET_BALLOTS — default 2775
 *   DRY_RUN — "1" or "true" to print plan only (no writes)
 *   SEED — number; used for reproducible pseudo-random candidate selection (default 424242)
 *   AUTOMATION_AUDIT_USER_ID — User.id for audit trail (recommended for production)
 *   ALLOW_AUTOMATION_OUTSIDE_VOTING_WINDOW — set to "true" if election is not VOTING_ACTIVE
 *
 * Run: npx tsx scripts/backfill-election-ballots.ts
 * Or:  npm run db:backfill-ballots
 *
 * Authorized admin / operational use only. Synthetic ballots may have legal/compliance implications.
 */

import { PrismaClient, MemberStatus, ElectionStatus } from "@prisma/client"
import { generateVoteToken } from "../src/lib/utils"
import { createAuditLog } from "../src/lib/audit"

const prisma = new PrismaClient()

function envBool(name: string): boolean {
  const v = process.env[name]?.toLowerCase()
  return v === "1" || v === "true" || v === "yes"
}

function envInt(name: string, defaultValue: number): number {
  const raw = process.env[name]
  if (!raw) return defaultValue
  const n = parseInt(raw, 10)
  return Number.isFinite(n) ? n : defaultValue
}

/** Seeded PRNG (mulberry32) for deterministic shuffles when SEED is fixed */
function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5)
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function shuffle<T>(arr: T[], rng: () => number): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

type PositionRow = {
  id: string
  title: string
  order: number
  maxSelectableCandidates: number
}

type BallotRow = { positionId: string; candidateId: string }

function buildBallotForMember(
  positions: PositionRow[],
  candidatesByPosition: Map<string, { id: string }[]>,
  seedBase: number,
  memberSalt: number
): BallotRow[] {
  const rows: BallotRow[] = []
  for (const position of positions) {
    const k = position.maxSelectableCandidates
    if (k === 0) continue

    const list = candidatesByPosition.get(position.id) ?? []
    if (list.length < k) {
      throw new Error(
        `Position "${position.title}" (${position.id}): need at least ${k} approved candidates, found ${list.length}`
      )
    }
    const rng = mulberry32(seedBase + memberSalt * 7919 + position.order * 1009)
    const picked = shuffle(list, rng).slice(0, k)
    for (const c of picked) {
      rows.push({ positionId: position.id, candidateId: c.id })
    }
  }
  return rows
}

async function main() {
  const electionId = process.env.ELECTION_ID?.trim()
  if (!electionId) {
    console.error("ELECTION_ID is required.")
    process.exit(1)
  }

  const targetBallots = envInt("TARGET_BALLOTS", 2775)
  const dryRun = envBool("DRY_RUN")
  const seedBase = envInt("SEED", 424242)
  const auditUserId = process.env.AUTOMATION_AUDIT_USER_ID?.trim() || undefined
  const allowOutside = envBool("ALLOW_AUTOMATION_OUTSIDE_VOTING_WINDOW")

  const election = await prisma.election.findUnique({
    where: { id: electionId },
    include: {
      positions: {
        orderBy: { order: "asc" },
        include: {
          candidates: {
            where: { status: "approved" },
            select: { id: true, positionId: true },
          },
        },
      },
    },
  })

  if (!election) {
    console.error(`Election not found: ${electionId}`)
    process.exit(1)
  }

  const now = new Date()
  if (election.status !== ElectionStatus.VOTING_ACTIVE) {
    if (!allowOutside) {
      console.error(
        `Election status is ${election.status}, not VOTING_ACTIVE. Set ALLOW_AUTOMATION_OUTSIDE_VOTING_WINDOW=true to run anyway (not recommended without review).`
      )
      process.exit(1)
    }
    console.warn(
      `[WARN] Proceeding while status is ${election.status} because ALLOW_AUTOMATION_OUTSIDE_VOTING_WINDOW=true`
    )
  } else if (now < election.votingStartDate || now > election.votingEndDate) {
    if (!allowOutside) {
      console.error(
        `Current time is outside voting window (${election.votingStartDate.toISOString()} – ${election.votingEndDate.toISOString()}). Set ALLOW_AUTOMATION_OUTSIDE_VOTING_WINDOW=true to bypass.`
      )
      process.exit(1)
    }
    console.warn(`[WARN] Outside voting dates; bypass enabled.`)
  }

  const positions: PositionRow[] = election.positions.map((p) => ({
    id: p.id,
    title: p.title,
    order: p.order,
    maxSelectableCandidates: p.maxSelectableCandidates,
  }))

  const candidatesByPosition = new Map<string, { id: string }[]>()
  for (const p of election.positions) {
    candidatesByPosition.set(
      p.id,
      p.candidates.map((c) => ({ id: c.id }))
    )
  }

  const totalSelections = positions.reduce((s, p) => s + p.maxSelectableCandidates, 0)
  if (totalSelections === 0) {
    console.error("No vote selections required (all positions have maxSelectableCandidates === 0).")
    process.exit(1)
  }

  for (const p of positions) {
    if (p.maxSelectableCandidates === 0) continue
    const n = candidatesByPosition.get(p.id)?.length ?? 0
    if (n < p.maxSelectableCandidates) {
      console.error(
        `Cannot build ballots: position "${p.title}" needs ${p.maxSelectableCandidates} approved candidates, has ${n}.`
      )
      process.exit(1)
    }
  }

  const ballotsCastRows = await prisma.vote.groupBy({
    by: ["memberId"],
    where: { electionId },
  })
  const ballotsCast = ballotsCastRows.length
  const neededBallots = Math.max(0, targetBallots - ballotsCast)

  const eligiblePoolSize = await prisma.memberProfile.count({
    where: {
      status: MemberStatus.ACTIVE,
      votes: { none: { electionId } },
    },
  })

  const willCreate = Math.min(neededBallots, eligiblePoolSize)

  console.log("--- Backfill election ballots ---")
  console.log(`Election: ${election.title} (${electionId})`)
  console.log(`Ballots already cast (distinct members): ${ballotsCast}`)
  console.log(`Target ballots: ${targetBallots}`)
  console.log(`Needed ballots: ${neededBallots}`)
  console.log(`Eligible ACTIVE members (never voted in this election): ${eligiblePoolSize}`)
  console.log(`Will create (this run): ${willCreate}`)
  console.log(`Dry run: ${dryRun}`)

  if (neededBallots === 0) {
    console.log("Nothing to do — target already met.")
    await prisma.$disconnect()
    return
  }

  if (willCreate === 0) {
    console.log("No eligible members left — cannot add ballots.")
    await prisma.$disconnect()
    return
  }

  const members = await prisma.memberProfile.findMany({
    where: {
      status: MemberStatus.ACTIVE,
      votes: { none: { electionId } },
    },
    orderBy: { memberId: "asc" },
    take: willCreate,
    select: { id: true, memberId: true },
  })

  if (dryRun) {
    const sample = members[0]
    if (sample) {
      const sampleSalt =
        (sample.memberId.split("").reduce((a, c) => a + c.charCodeAt(0), 0) % 100000) + 0 * 17
      const sampleBallot = buildBallotForMember(
        positions,
        candidatesByPosition,
        seedBase,
        sampleSalt
      )
      console.log("\nSample ballot (first eligible member):", sample.memberId)
      console.log(JSON.stringify(sampleBallot.slice(0, 8), null, 2), "... (truncated if long)")
    }
    console.log("\nDRY_RUN: no database writes.")
    await prisma.$disconnect()
    return
  }

  let createdBallots = 0
  let memberIndex = 0

  for (const member of members) {
    const memberSalt =
      member.memberId.split("").reduce((a, c) => a + c.charCodeAt(0), 0) % 100000 + memberIndex * 17

    const ballotRows = buildBallotForMember(
      positions,
      candidatesByPosition,
      seedBase,
      memberSalt
    )

    const voteRows = await prisma.$transaction(
      ballotRows.map((row) =>
        prisma.vote.create({
          data: {
            electionId,
            positionId: row.positionId,
            candidateId: row.candidateId,
            memberId: member.id,
            voteToken: generateVoteToken(),
          },
        })
      )
    )

    if (auditUserId) {
      await createAuditLog({
        userId: auditUserId,
        memberId: member.id,
        action: "CAST_VOTES_AUTOMATION",
        entityType: "Vote",
        entityId: voteRows[0].id,
        changes: {
          electionId,
          source: "scripts/backfill-election-ballots.ts",
          votesCount: voteRows.length,
          memberIdLabel: member.memberId,
        },
      })
    }

    createdBallots += 1
    if (createdBallots % 100 === 0 || createdBallots === willCreate) {
      console.log(`Progress: ${createdBallots} / ${willCreate} ballots (${voteRows.length} vote rows last batch)`)
    }
    memberIndex += 1
  }

  const finalCast = await prisma.vote.groupBy({
    by: ["memberId"],
    where: { electionId },
  })

  console.log(`\nDone. Distinct members with votes in this election: ${finalCast.length}`)
  await prisma.$disconnect()
}

main().catch(async (e) => {
  console.error(e)
  await prisma.$disconnect()
  process.exit(1)
})

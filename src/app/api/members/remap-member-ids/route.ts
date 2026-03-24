import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { UserRole } from "@prisma/client"
import * as XLSX from "xlsx"

interface SheetLayout {
  dataStartIdx: number
  memberIdCol: number
  nameCol: number
}

interface ExcelRowRecord {
  sheetName: string
  memberId: string
  key: string
}

interface MappingPair {
  key: string
  sheetName: string
  oldMemberId: string
  newMemberId: string
}

function normalizeText(value: unknown): string {
  return String(value || "")
    .trim()
    .replace(/\s+/g, " ")
    .toUpperCase()
}

function isNameHeader(value: string): boolean {
  const v = value.toLowerCase().trim()
  return (
    v === "name" ||
    v === "full name" ||
    v === "fullname" ||
    v === "name of client" ||
    v === "client name" ||
    (v.includes("name") && v.includes("client")) ||
    (v.includes("name") && v.includes("member")) ||
    v === "member name" ||
    v === "name of member" ||
    v === "client/member name" ||
    v === "borrower name"
  )
}

function isIdHeader(value: string): boolean {
  const v = value.toLowerCase().trim()
  return (
    v === "id" ||
    v === "no" ||
    v === "no." ||
    v === "member id" ||
    v === "id no" ||
    v === "id no." ||
    v === "acct no" ||
    v === "acct no." ||
    v === "account no" ||
    v === "account no." ||
    (v.includes("member") && v.includes("id")) ||
    (v.includes("acct") && v.includes("no")) ||
    (v.includes("member") && v.includes("no")) ||
    v === "control no" ||
    v === "reference no" ||
    v === "member no" ||
    v === "member no." ||
    v === "account number"
  )
}

function looksLikeMemberId(value: unknown): boolean {
  if (value == null) return false
  const raw = String(value).trim()
  if (!raw) return false

  // Accept common formats:
  // - 14-0000160-6
  // - plain numeric IDs
  // - alphanumeric IDs with separators
  if (/^\d{2}-\d{5,8}-\d{1,2}$/.test(raw)) return true
  if (/^\d{5,20}$/.test(raw)) return true
  if (/^[A-Za-z0-9][A-Za-z0-9\-_/]{4,30}$/.test(raw)) return true
  return false
}

function looksLikePersonName(value: unknown): boolean {
  if (value == null) return false
  const s = String(value).trim()
  if (!s || s.length < 3) return false
  if (/^\d/.test(s)) return false
  return /^[A-Za-zÀ-ÿñÑ.,\-'\s()]+$/.test(s)
}

function detectSheetLayout(data: unknown[][]): SheetLayout | null {
  const maxScan = Math.min(data.length, 30)

  for (let i = 0; i < maxScan; i++) {
    const row = data[i]
    if (!row || row.length < 2) continue

    const cells = row.map((c) =>
      c == null || c === "" ? "" : String(c).trim()
    )
    const nameColIdx = cells.findIndex((c) => isNameHeader(c))
    if (nameColIdx !== -1) {
      let idCol = cells.findIndex((c) => isIdHeader(c))
      let dataStart = i + 1
      for (let j = i + 1; j < Math.min(data.length, i + 10); j++) {
        const r = data[j]
        if (!r || r.length < 2) continue
        if (r.some((c) => c != null && String(c).trim() !== "")) {
          dataStart = j
          break
        }
      }
      if (idCol === -1 && nameColIdx > 0) {
        const testRow = data[dataStart] as unknown[] | undefined
        if (testRow && looksLikeMemberId(testRow[nameColIdx - 1])) {
          idCol = nameColIdx - 1
        }
      }
      if (idCol !== -1) {
        return { dataStartIdx: dataStart, memberIdCol: idCol, nameCol: nameColIdx }
      }

      // Heuristic: if header row has name column but no explicit id header,
      // infer ID column from nearby columns using sample rows.
      const candidateCols = Array.from({ length: Math.max(0, row.length - 1) }, (_, idx) => idx)
      let bestCol = -1
      let bestScore = 0
      for (const col of candidateCols) {
        if (col === nameColIdx) continue
        let score = 0
        for (let j = dataStart; j < Math.min(data.length, dataStart + 20); j++) {
          const sampleRow = data[j]
          if (!sampleRow) continue
          if (looksLikeMemberId(sampleRow[col])) score++
        }
        if (score > bestScore) {
          bestScore = score
          bestCol = col
        }
      }
      if (bestCol !== -1 && bestScore >= 3) {
        return { dataStartIdx: dataStart, memberIdCol: bestCol, nameCol: nameColIdx }
      }
    }
  }

  for (let i = 0; i < maxScan; i++) {
    const row = data[i]
    if (!row || row.length < 2) continue
    for (let c = 0; c < row.length - 1; c++) {
      if (looksLikeMemberId(row[c]) && looksLikePersonName(row[c + 1])) {
        return { dataStartIdx: i, memberIdCol: c, nameCol: c + 1 }
      }
    }
  }

  // Last-resort heuristic for sheets like "Sheet1" with unusual headers:
  // pick two columns where one looks like IDs and another looks like names.
  const maxCols = Math.max(...data.slice(0, maxScan).map((r) => (r ? r.length : 0)), 0)
  let bestPair: { idCol: number; nameCol: number; score: number; dataStartIdx: number } | null = null
  for (let idCol = 0; idCol < maxCols; idCol++) {
    for (let nameCol = 0; nameCol < maxCols; nameCol++) {
      if (idCol === nameCol) continue
      let score = 0
      let firstHitRow = -1
      for (let i = 0; i < maxScan; i++) {
        const row = data[i]
        if (!row) continue
        if (looksLikeMemberId(row[idCol]) && looksLikePersonName(row[nameCol])) {
          score++
          if (firstHitRow === -1) firstHitRow = i
        }
      }
      if (score >= 3) {
        const candidate = { idCol, nameCol, score, dataStartIdx: firstHitRow === -1 ? 0 : firstHitRow }
        if (!bestPair || candidate.score > bestPair.score) {
          bestPair = candidate
        }
      }
    }
  }
  if (bestPair) {
    return {
      dataStartIdx: bestPair.dataStartIdx,
      memberIdCol: bestPair.idCol,
      nameCol: bestPair.nameCol,
    }
  }

  return null
}

function extractRowsFromWorkbook(workbook: XLSX.WorkBook): {
  records: ExcelRowRecord[]
  duplicates: string[]
  parsingIssues: string[]
} {
  const records: ExcelRowRecord[] = []
  const duplicates: string[] = []
  const parsingIssues: string[] = []
  const seenKeys = new Set<string>()

  for (const sheetName of workbook.SheetNames) {
    const worksheet = workbook.Sheets[sheetName]
    const data = XLSX.utils.sheet_to_json(worksheet, {
      header: 1,
      defval: null,
    }) as unknown[][]
    if (!data.length) continue

    const layout = detectSheetLayout(data)
    if (!layout) {
      parsingIssues.push(
        `[${sheetName}] Could not detect member ID and name columns`
      )
      continue
    }

    for (let i = layout.dataStartIdx; i < data.length; i++) {
      const row = data[i]
      if (!row || !row.length) continue

      const rawMemberId = row[layout.memberIdCol]
      const rawName = row[layout.nameCol]
      const memberId = String(rawMemberId || "").trim()
      const normalizedName = normalizeText(rawName)

      if (!memberId || !normalizedName) continue
      if (!looksLikeMemberId(memberId)) continue

      const key = `${normalizeText(sheetName)}::${normalizedName}`
      if (seenKeys.has(key)) {
        duplicates.push(`[${sheetName}] duplicate key detected for "${normalizedName}"`)
        continue
      }
      seenKeys.add(key)

      records.push({
        sheetName,
        memberId,
        key,
      })
    }
  }

  return { records, duplicates, parsingIssues }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    // if (!session?.user) {
    //   return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    // }
    // if (session.user.role !== UserRole.ADMIN) {
    //   return NextResponse.json(
    //     { error: "Only administrators can remap member IDs" },
    //     { status: 403 }
    //   )
    // }

    const formData = await request.formData()
    const oldFile = formData.get("oldFile") as File | null
    const newFile = formData.get("newFile") as File | null
    const apply = formData.get("apply") === "true"

    if (!oldFile || !newFile) {
      return NextResponse.json(
        { error: "Both oldFile and newFile are required" },
        { status: 400 }
      )
    }

    const [oldBuffer, newBuffer] = await Promise.all([
      oldFile.arrayBuffer(),
      newFile.arrayBuffer(),
    ])
    const oldWorkbook = XLSX.read(Buffer.from(oldBuffer), { type: "buffer" })
    const newWorkbook = XLSX.read(Buffer.from(newBuffer), { type: "buffer" })

    const oldExtract = extractRowsFromWorkbook(oldWorkbook)
    const newExtract = extractRowsFromWorkbook(newWorkbook)

    const oldByKey = new Map<string, ExcelRowRecord>()
    for (const row of oldExtract.records) oldByKey.set(row.key, row)
    const newByKey = new Map<string, ExcelRowRecord>()
    for (const row of newExtract.records) newByKey.set(row.key, row)

    const mappingPairs: MappingPair[] = []
    const unmatchedInOld: string[] = []
    const unchangedCountByKey = { count: 0 }

    for (const [key, newRow] of newByKey.entries()) {
      const oldRow = oldByKey.get(key)
      if (!oldRow) {
        unmatchedInOld.push(`[${newRow.sheetName}] no old match for key ${key}`)
        continue
      }
      if (oldRow.memberId === newRow.memberId) {
        unchangedCountByKey.count++
        continue
      }
      mappingPairs.push({
        key,
        sheetName: newRow.sheetName,
        oldMemberId: oldRow.memberId,
        newMemberId: newRow.memberId,
      })
    }

    const conflicts: string[] = []
    conflicts.push(...oldExtract.duplicates, ...newExtract.duplicates)
    conflicts.push(...oldExtract.parsingIssues, ...newExtract.parsingIssues)

    const duplicateNewIdMap = new Map<string, number>()
    for (const pair of mappingPairs) {
      duplicateNewIdMap.set(
        pair.newMemberId,
        (duplicateNewIdMap.get(pair.newMemberId) || 0) + 1
      )
    }
    for (const [newMemberId, count] of duplicateNewIdMap.entries()) {
      if (count > 1) {
        conflicts.push(
          `New member ID ${newMemberId} is mapped from multiple old IDs`
        )
      }
    }

    const oldIds = mappingPairs.map((pair) => pair.oldMemberId)
    const newIds = mappingPairs.map((pair) => pair.newMemberId)
    const [existingOldMembers, existingNewMembers] = await Promise.all([
      prisma.memberProfile.findMany({
        where: { memberId: { in: oldIds } },
        select: { id: true, memberId: true, userId: true },
      }),
      prisma.memberProfile.findMany({
        where: { memberId: { in: newIds } },
        select: { id: true, memberId: true },
      }),
    ])

    const existingOldIds = new Set(existingOldMembers.map((m) => m.memberId))
    for (const oldId of oldIds) {
      if (!existingOldIds.has(oldId)) {
        conflicts.push(`Old member ID ${oldId} not found in database`)
      }
    }

    const sourceOldSet = new Set(oldIds)
    for (const row of existingNewMembers) {
      if (!sourceOldSet.has(row.memberId)) {
        conflicts.push(
          `Target new member ID ${row.memberId} already exists on another record`
        )
      }
    }

    const candidateCount = await prisma.candidate.count({
      where: {
        userId: { in: existingOldMembers.map((m) => m.userId) },
      },
    })

    const dryRunSummary = {
      totalOldRows: oldExtract.records.length,
      totalNewRows: newExtract.records.length,
      unchangedRows: unchangedCountByKey.count,
      proposedMappings: mappingPairs.length,
      unmatchedInNewFile: unmatchedInOld.length,
      conflicts: conflicts.length,
      candidateRecordsAffected: candidateCount,
      willApply: apply && conflicts.length === 0,
    }

    if (!apply || conflicts.length > 0) {
      return NextResponse.json({
        mode: "dry-run",
        summary: dryRunSummary,
        conflicts,
        unmatchedInNewFile: unmatchedInOld.slice(0, 200),
        mappingsPreview: mappingPairs.slice(0, 200),
        message:
          conflicts.length > 0
            ? "Dry run found conflicts. Resolve conflicts before applying."
            : "Dry run successful. Re-run with apply=true to persist updates.",
      })
    }

    const mappingByOldId = new Map(
      mappingPairs.map((pair) => [pair.oldMemberId, pair.newMemberId])
    )

    const txResult = await prisma.$transaction(async (tx) => {
      let updatedCount = 0
      const updates = existingOldMembers
        .map((member) => {
          const nextMemberId = mappingByOldId.get(member.memberId)
          if (!nextMemberId) return null
          return tx.memberProfile.update({
            where: { id: member.id },
            data: { memberId: nextMemberId },
            select: { id: true },
          })
        })
        .filter(Boolean)

      const results = await Promise.all(updates as Array<Promise<{ id: string }>>)
      updatedCount = results.length

      return { updatedCount }
    })

    return NextResponse.json({
      mode: "applied",
      summary: {
        ...dryRunSummary,
        updatedCount: txResult.updatedCount,
      },
      message: `Successfully remapped ${txResult.updatedCount} member IDs`,
    })
  } catch (error: any) {
    console.error("Error remapping member IDs:", error)
    return NextResponse.json(
      {
        error:
          error?.message ||
          "Failed to remap member IDs. Run dry-run first to inspect conflicts.",
      },
      { status: 500 }
    )
  }
}


import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { UserRole, MemberStatus } from "@prisma/client"
import { generateMemberId } from "@/lib/utils"
import * as XLSX from "xlsx"

interface MemberData {
  firstName: string
  lastName: string
  middleName: string | null
  memberId: string
  branchId: string | null
  sheetName: string
  rowNum: number
}

interface BranchImportSummary {
  sheetName: string
  branchName: string
  branchId: string
  created: boolean
  importedCount: number
}

function parseName(fullName: string): { lastName: string; firstName: string; middleName: string | null } {
  if (!fullName || typeof fullName !== "string") {
    return { lastName: "", firstName: "", middleName: null }
  }

  const trimmed = fullName.trim()

  if (trimmed.includes(",")) {
    const parts = trimmed.split(",").map(p => p.trim())
    const lastName = parts[0] || ""
    const firstAndMiddle = parts[1] || ""
    const nameParts = firstAndMiddle.split(/\s+/).filter(p => p)
    const firstName = nameParts[0] || ""
    const middleName = nameParts.slice(1).join(" ") || null
    return { lastName, firstName, middleName }
  }

  const nameParts = trimmed.split(/\s+/).filter(p => p)
  if (nameParts.length >= 2) {
    const firstName = nameParts[0]
    const lastName = nameParts[nameParts.length - 1]
    const middleName = nameParts.slice(1, -1).join(" ") || null
    return { lastName, firstName, middleName }
  }

  return { lastName: "", firstName: trimmed, middleName: null }
}

function generateBranchCode(name: string): string {
  return name
    .toUpperCase()
    .replace(/[^A-Z0-9\s]/g, "")
    .split(/\s+/)
    .filter(Boolean)
    .map(w => w.slice(0, 3))
    .join("-")
    .slice(0, 10) || "BR"
}

function isNameHeader(val: string): boolean {
  const v = val.toLowerCase().trim()
  return (
    v === "name" ||
    v === "full name" ||
    v === "fullname" ||
    v === "name of client" ||
    v === "client name" ||
    (v.includes("name") && v.includes("client")) ||
    (v.includes("name") && v.includes("member")) ||
    v === "member name"
  )
}

function isIdHeader(val: string): boolean {
  const v = val.toLowerCase().trim()
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
    (v.includes("acct") && v.includes("no"))
  )
}

const MEMBER_ID_PATTERN = /^\d{2}-\d{3,8}(?:-\d{1,2})?$/

function looksLikeMemberId(val: unknown): boolean {
  if (val == null) return false
  const raw = String(val).trim()
  if (!raw) return false
  if (MEMBER_ID_PATTERN.test(raw)) return true
  if (/^\d{5,20}$/.test(raw)) return true
  if (/^[A-Za-z0-9][A-Za-z0-9\-_/]{2,30}$/.test(raw)) return true
  return false
}

function looksLikePersonName(val: unknown): boolean {
  if (val == null) return false
  const s = String(val).trim()
  if (!s || s.length < 3) return false
  if (/^\d/.test(s)) return false
  return /^[A-Za-zÀ-ÿñÑ.,\-'\s()]+$/.test(s) && s.includes(",")
}

interface SheetLayout {
  hasHeader: boolean
  headerRowIdx: number
  dataStartIdx: number
  memberIdCol: number
  nameCol: number
}

function detectSheetLayout(data: unknown[][]): SheetLayout | null {
  const maxScan = Math.min(data.length, 30)

  for (let i = 0; i < maxScan; i++) {
    const row = data[i]
    if (!row || row.length < 2) continue
    const cells = row.map((c) => (c == null || c === "" ? "" : String(c).trim()))
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
      return { hasHeader: true, headerRowIdx: i, dataStartIdx: dataStart, memberIdCol: idCol, nameCol: nameColIdx }
    }
  }

  for (let i = 0; i < maxScan; i++) {
    const row = data[i]
    if (!row || row.length < 2) continue

    for (let c = 0; c < row.length - 1; c++) {
      if (looksLikeMemberId(row[c]) && looksLikePersonName(row[c + 1])) {
        return { hasHeader: false, headerRowIdx: -1, dataStartIdx: i, memberIdCol: c, nameCol: c + 1 }
      }
    }
    for (let c = 0; c < row.length; c++) {
      if (looksLikePersonName(row[c])) {
        const idCol = c > 0 && looksLikeMemberId(row[c - 1]) ? c - 1 : -1
        return { hasHeader: false, headerRowIdx: -1, dataStartIdx: i, memberIdCol: idCol, nameCol: c }
      }
    }
  }

  return null
}

const PLACEHOLDER_PASSWORD = "N/A"
const BATCH_SIZE = 1000
const SKIP_PATTERNS = [/\.tmp/i, /^top\s*\d+$/i, /^copy\s+of/i, /^sheet\d+$/i, /^summary$/i, /^template$/i]

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (session.user.role !== UserRole.ADMIN) {
      return NextResponse.json({ error: "Only administrators can run consolidated imports" }, { status: 403 })
    }

    const formData = await request.formData()
    const file = formData.get("file") as File

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }

    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    const workbook = XLSX.read(buffer, { type: "buffer" })

    if (!workbook.SheetNames.length) {
      return NextResponse.json({ error: "Excel workbook contains no sheets" }, { status: 400 })
    }

    const [existingMembers, existingBranches] = await Promise.all([
      prisma.memberProfile.findMany({ select: { memberId: true } }),
      prisma.branch.findMany({ select: { id: true, name: true, code: true } }),
    ])

    const existingMemberIds = new Set(existingMembers.map(m => m.memberId))
    const branchMap = new Map<string, string>()
    existingBranches.forEach(branch => {
      branchMap.set(branch.name.toLowerCase().trim(), branch.id)
      branchMap.set(branch.code.toLowerCase().trim(), branch.id)
    })
    const existingBranchCodes = new Set(existingBranches.map(b => b.code.toUpperCase()))

    const results = {
      success: 0,
      failed: 0,
      skipped: 0,
      errors: [] as string[],
    }
    const branchSummaries: BranchImportSummary[] = []
    const validMembers: MemberData[] = []

    for (const sheetName of workbook.SheetNames) {
      const trimmedSheet = sheetName.trim()
      if (SKIP_PATTERNS.some(p => p.test(trimmedSheet))) {
        results.errors.push(`[Sheet "${sheetName}"]: Skipped — appears to be a temporary/summary sheet.`)
        results.skipped++
        continue
      }

      const worksheet = workbook.Sheets[sheetName]
      const data = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: null }) as unknown[][]

      if (data.length < 3) {
        results.errors.push(`[Sheet "${sheetName}"]: Skipped — sheet is empty or has too few rows.`)
        continue
      }

      const layout = detectSheetLayout(data)
      if (!layout) {
        results.errors.push(`[Sheet "${sheetName}"]: Skipped — could not detect member data (no headers or ID+Name pattern found).`)
        continue
      }
      const { dataStartIdx, memberIdCol, nameCol } = layout

      const normalizedSheet = sheetName.toLowerCase().trim()
      let branchId = branchMap.get(normalizedSheet) || null
      let branchCreated = false

      if (!branchId) {
        let code = generateBranchCode(sheetName)
        while (existingBranchCodes.has(code.toUpperCase())) {
          code = code + Math.floor(Math.random() * 90 + 10).toString()
        }
        try {
          const newBranch = await prisma.branch.create({
            data: { name: sheetName.trim(), code, isActive: true },
          })
          branchId = newBranch.id
          branchMap.set(normalizedSheet, newBranch.id)
          existingBranchCodes.add(code.toUpperCase())
          branchCreated = true
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : "Unknown error"
          results.errors.push(`[Sheet "${sheetName}"]: Failed to create branch — ${msg}`)
          continue
        }
      }

      const branchSummary: BranchImportSummary = {
        sheetName,
        branchName: sheetName.trim(),
        branchId,
        created: branchCreated,
        importedCount: 0,
      }

      const memberIdIdx = memberIdCol
      const nameIdx = nameCol

      console.log(`[Sheet "${sheetName}"] ${layout.hasHeader ? "Header" : "Headerless"}, data from row ${dataStartIdx + 1}, nameCol=${nameIdx}, idCol=${memberIdIdx}`)

      for (let i = dataStartIdx; i < data.length; i++) {
        const row = data[i] as unknown[]
        if (!row || row.length === 0) continue

        const checkTermination = (cellIdx: number) => {
          const val = String(row[cellIdx] || "").trim().toUpperCase()
          return val.includes("TOTAL") || val.includes("GRAND") ||
            val === "SHARE CAPITAL-COMMON" || val.startsWith("THIS IS")
        }
        if (checkTermination(0) || checkTermination(nameIdx)) break

        if (!row[nameIdx]) continue
        const nameVal = String(row[nameIdx]).trim()
        if (!nameVal || nameVal.toUpperCase() === "TOTAL" || nameVal.toUpperCase().includes("GRAND TOTAL")) continue

        try {
          const fullName = String(row[nameIdx] || "").trim()
          if (!fullName) { results.skipped++; continue }

          const { firstName, lastName, middleName } = parseName(fullName)
          if (!firstName || !lastName) { results.skipped++; continue }

          const existingMemberId = memberIdIdx !== -1 ? String(row[memberIdIdx] || "").trim() : null

          let memberId: string
          if (existingMemberId) {
            if (existingMemberIds.has(existingMemberId)) { results.skipped++; continue }
            memberId = existingMemberId
          } else {
            memberId = generateMemberId()
            while (existingMemberIds.has(memberId)) { memberId = generateMemberId() }
          }

          validMembers.push({
            firstName,
            lastName,
            middleName,
            memberId,
            branchId,
            sheetName,
            rowNum: i + 1,
          })

          existingMemberIds.add(memberId)
          branchSummary.importedCount++
        } catch (error: unknown) {
          results.failed++
          const msg = error instanceof Error ? error.message : "Unknown error"
          results.errors.push(`[Sheet "${sheetName}"] Row ${i + 1}: ${msg}`)
        }
      }

      branchSummaries.push(branchSummary)
    }

    // --- Bulk insert ---
    try {
      const usersData = validMembers.map(member => ({
        email: `na-${member.memberId}@soemco.coop`,
        password: PLACEHOLDER_PASSWORD,
        name: `${member.firstName} ${member.lastName}`,
        role: UserRole.MEMBER,
      }))

      for (let i = 0; i < usersData.length; i += BATCH_SIZE) {
        await prisma.user.createMany({
          data: usersData.slice(i, i + BATCH_SIZE),
          skipDuplicates: true,
        })
      }

      const createdUsers = await prisma.user.findMany({
        where: { email: { in: usersData.map(u => u.email) } },
        select: { id: true, email: true },
      })

      const emailToUserId = new Map<string, string>()
      createdUsers.forEach(u => emailToUserId.set(u.email.toLowerCase(), u.id))

      const profilesData = validMembers.map(member => {
        const email = `na-${member.memberId}@soemco.coop`
        const userId = emailToUserId.get(email.toLowerCase())
        if (!userId) throw new Error(`Could not find userId for member: ${member.memberId}`)
        return {
          userId,
          memberId: member.memberId,
          firstName: member.firstName,
          lastName: member.lastName,
          middleName: member.middleName,
          branchId: member.branchId,
          status: MemberStatus.ACTIVE,
        }
      })

      for (let i = 0; i < profilesData.length; i += BATCH_SIZE) {
        await prisma.memberProfile.createMany({
          data: profilesData.slice(i, i + BATCH_SIZE),
          skipDuplicates: true,
        })
      }

      results.success = validMembers.length
    } catch (bulkError) {
      console.error("Bulk import failed, falling back to individual inserts:", bulkError)

      for (const member of validMembers) {
        try {
          const user = await prisma.user.create({
            data: {
              email: `na-${member.memberId}@soemco.coop`,
              password: PLACEHOLDER_PASSWORD,
              name: `${member.firstName} ${member.lastName}`,
              role: UserRole.MEMBER,
            },
          })
          await prisma.memberProfile.create({
            data: {
              userId: user.id,
              memberId: member.memberId,
              firstName: member.firstName,
              lastName: member.lastName,
              middleName: member.middleName,
              branchId: member.branchId,
              status: MemberStatus.ACTIVE,
            },
          })
          results.success++
        } catch (individualError: unknown) {
          results.failed++
          const msg = individualError instanceof Error ? individualError.message : "Database error"
          results.errors.push(`[Sheet "${member.sheetName}"] Row ${member.rowNum}: ${msg}`)
        }
      }
    }

    return NextResponse.json({
      message: `Consolidated import completed: ${results.success} members created, ${results.failed} failed, ${results.skipped} skipped across ${branchSummaries.length} sheet(s).`,
      results,
      branchSummaries,
    })
  } catch (error: unknown) {
    console.error("Error in consolidated import:", error)
    const msg = error instanceof Error ? error.message : "Internal server error"
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

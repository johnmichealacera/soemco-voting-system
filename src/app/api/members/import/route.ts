import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { UserRole, MemberStatus } from "@prisma/client"
import bcrypt from "bcryptjs"
import { generateMemberId } from "@/lib/utils"
import * as XLSX from "xlsx"

interface MemberData {
  firstName: string
  lastName: string
  middleName: string | null
  email: string
  memberId: string
  dateOfBirth: Date | null
  address: string | null
  phoneNumber: string | null
  rowNum: number
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Only ADMIN and BRANCH_MANAGER can import members
    if (![UserRole.ADMIN, UserRole.BRANCH_MANAGER].includes(session.user.role as any)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const formData = await request.formData()
    const file = formData.get("file") as File

    if (!file) {
      return NextResponse.json(
        { error: "No file provided" },
        { status: 400 }
      )
    }

    // Read file buffer
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Parse Excel file
    const workbook = XLSX.read(buffer, { type: "buffer" })
    const sheetName = workbook.SheetNames[0]
    const worksheet = workbook.Sheets[sheetName]
    
    const data = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: null }) as any[][]

    if (data.length < 20) {
      return NextResponse.json(
        { error: "Excel file appears to be empty or invalid" },
        { status: 400 }
      )
    }

    // Header is at line 15 (index 14), data starts at line 20 (index 19)
    const headerRowIdx = 14
    const dataStartIdx = 19

    // Get headers from line 15 (index 14) - ensure all values are strings
    const headers = (data[headerRowIdx] || []).map((h: any) => {
      if (h === null || h === undefined || h === "") return ""
      return String(h).toLowerCase().trim()
    })
    
    // Find column indices based on actual Excel file structure
    const memberIdIdx = headers.findIndex(h => h && (h === "id" || h === "member id" || (h.includes("member") && h.includes("id"))))
    const nameIdx = headers.findIndex(h => h && ((h.includes("name") && h.includes("client")) || h === "name" || h === "full name"))
    const dateOfBirthIdx = headers.findIndex(h => h && ((h.includes("date") && h.includes("birth")) || h.includes("dob") || h === "birthdate"))
    const addressIdx = headers.findIndex(h => h && h.includes("address"))
    const phoneIdx = headers.findIndex(h => h && (h.includes("phone") || h.includes("tel") || h.includes("mobile") || h.includes("contact")))
    const emailIdx = headers.findIndex(h => h && h.includes("email"))

    // Validate required columns
    if (nameIdx === -1) {
      return NextResponse.json(
        { error: "Excel file must contain a 'Name of Client' or 'Name' column" },
        { status: 400 }
      )
    }

    // Helper function to parse name from "Last, First Middle" format
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

    // Helper function to generate unique email
    function generateUniqueEmail(firstName: string, lastName: string, existingEmails: Set<string>): string {
      const baseEmail = `${firstName.toLowerCase().replace(/\s+/g, ".")}.${lastName.toLowerCase().replace(/\s+/g, ".")}@soemco.coop`

      // If base email is available, use it
      if (!existingEmails.has(baseEmail.toLowerCase())) {
        return baseEmail
      }

      // Otherwise, add a counter until we find a unique email
      let counter = 2
      let uniqueEmail = `${firstName.toLowerCase().replace(/\s+/g, ".")}.${lastName.toLowerCase().replace(/\s+/g, ".")}${counter}@soemco.coop`

      while (existingEmails.has(uniqueEmail.toLowerCase())) {
        counter++
        uniqueEmail = `${firstName.toLowerCase().replace(/\s+/g, ".")}.${lastName.toLowerCase().replace(/\s+/g, ".")}${counter}@soemco.coop`
      }

      return uniqueEmail
    }

    // ============================================
    // OPTIMIZATION 1: Fetch all existing data upfront (2 queries total)
    // ============================================
    console.log("Fetching existing data for duplicate checking...")
    
    const [existingUsers, existingMembers] = await Promise.all([
      // Fetch all existing emails (for optional duplicate checking)
      prisma.user.findMany({
        select: { email: true },
      }),
      // Fetch all existing memberIds (primary duplicate checker)
      prisma.memberProfile.findMany({
        select: { memberId: true },
      }),
    ])

    // ============================================
    // OPTIMIZATION 2: Create Sets/Maps for fast in-memory lookups
    // ============================================
    const existingEmails = new Set(existingUsers.map(u => u.email.toLowerCase()))
    const existingMemberIds = new Set(existingMembers.map(m => m.memberId))

    console.log(`Loaded ${existingEmails.size} existing emails, ${existingMemberIds.size} existing memberIds`)

    const results = {
      success: 0,
      failed: 0,
      errors: [] as string[],
      skipped: 0,
    }

    // ============================================
    // STEP 1: Parse and validate all rows (filter duplicates in memory)
    // ============================================
    const validMembers: MemberData[] = []

    for (let i = dataStartIdx; i < data.length; i++) {
      const row = data[i]
      
      // Skip empty rows
      if (!row || row.length === 0) {
        continue
      }

      // Check if this is a summary/total row and stop processing
      const firstCell = String(row[0] || "").trim().toUpperCase()
      if (firstCell.includes("TOTAL") || firstCell.includes("GRAND") || 
          firstCell === "SHARE CAPITAL-COMMON" || firstCell.startsWith("THIS IS")) {
        break
      }

      // Skip rows without name data
      if (!row[nameIdx]) {
        continue
      }

      try {
        const fullName = String(row[nameIdx] || "").trim()
        if (!fullName) {
          results.skipped++
          continue
        }

        const { firstName, lastName, middleName } = parseName(fullName)

        // Skip if no first name or last name after parsing
        if (!firstName || !lastName) {
          results.skipped++
          continue
        }

        const email = emailIdx !== -1 ? String(row[emailIdx] || "").trim().toLowerCase() : null
        const address = addressIdx !== -1 ? String(row[addressIdx] || "").trim() || null : null
        const phoneNumber = phoneIdx !== -1 ? String(row[phoneIdx] || "").trim() || null : null
        const existingMemberId = memberIdIdx !== -1 ? String(row[memberIdIdx] || "").trim() : null

        // Generate email if not provided - ensure uniqueness
        const finalEmail = email || generateUniqueEmail(firstName, lastName, existingEmails)

        // Parse date of birth
        let dateOfBirth: Date | null = null
        if (dateOfBirthIdx !== -1 && row[dateOfBirthIdx]) {
          const dobValue = row[dateOfBirthIdx]
          if (dobValue instanceof Date) {
            dateOfBirth = dobValue
          } else if (typeof dobValue === "number") {
            const excelEpoch = new Date(1899, 11, 30)
            dateOfBirth = new Date(excelEpoch.getTime() + dobValue * 86400000)
          } else {
            const dobString = String(dobValue).trim()
            if (dobString) {
              const parts = dobString.split("/")
              if (parts.length === 3) {
                const month = parseInt(parts[0], 10) - 1
                const day = parseInt(parts[1], 10)
                const year = parseInt(parts[2], 10)
                dateOfBirth = new Date(year, month, day)
                if (isNaN(dateOfBirth.getTime())) {
                  dateOfBirth = null
                }
              } else {
                dateOfBirth = new Date(dobString)
                if (isNaN(dateOfBirth.getTime())) {
                  dateOfBirth = null
                }
              }
            }
          }
        }

        // OPTIMIZATION 3: Check duplicates in memory (no database queries)
        // PRIMARY CHECK: Use memberId as the primary duplicate checker
        let memberId: string
        
        if (existingMemberId) {
          // If memberId exists in Excel file, check if it already exists in database
          if (existingMemberIds.has(existingMemberId)) {
            results.skipped++
            continue
          }
          // Use the memberId from Excel if it doesn't exist in database
          memberId = existingMemberId
        } else {
          // Generate a new memberId if not provided in Excel
          memberId = generateMemberId()
          // Ensure generated memberId is unique (regenerate if needed)
          while (existingMemberIds.has(memberId)) {
            memberId = generateMemberId()
          }
        }

        // Note: Email duplicate check removed since we now generate unique emails
        // Multiple people can have the same name, so we only check email and memberId
        // The name check was causing legitimate imports to be skipped

        // Add to valid members list
        validMembers.push({
          firstName,
          lastName,
          middleName,
          email: finalEmail,
          memberId,
          dateOfBirth,
          address,
          phoneNumber,
          rowNum: i + 1,
        })

        // Add to existing sets to prevent duplicates within the same import
        existingEmails.add(finalEmail.toLowerCase())
        existingMemberIds.add(memberId)
      } catch (error: any) {
        results.failed++
        const rowNum = i + 1
        results.errors.push(`Row ${rowNum}: ${error.message || "Unknown error"}`)
        console.error(`Error processing row ${rowNum}:`, error)
      }
    }

    console.log(`Found ${validMembers.length} valid members to import`)

    console.log(JSON.stringify(validMembers))

    // ============================================
    // OPTIMIZATION 4: Batch password hashing with Promise.all
    // ============================================
    console.log("Hashing passwords in parallel...")
    const BATCH_SIZE = 50
    const hashedMembers: Array<MemberData & { hashedPassword: string }> = []

    for (let i = 0; i < validMembers.length; i += BATCH_SIZE) {
      const batch = validMembers.slice(i, i + BATCH_SIZE)
      
      // Hash passwords in parallel for this batch
      const hashPromises = batch.map(member => {
        const password = `${member.firstName}${member.lastName}123`
        return bcrypt.hash(password, 12).then(hashedPassword => ({
          ...member,
          hashedPassword,
        }))
      })

      const batchResults = await Promise.all(hashPromises)
      hashedMembers.push(...batchResults)
    }

    console.log(`Hashed passwords for ${hashedMembers.length} members`)

    // ============================================
    // OPTIMIZATION 5: Batch inserts using Prisma transactions
    // ============================================
    console.log("Inserting members in batches...")
    
    for (let i = 0; i < hashedMembers.length; i += BATCH_SIZE) {
      const batch = hashedMembers.slice(i, i + BATCH_SIZE)
      
      try {
        // Use transaction to insert batch (callback form)
        await prisma.$transaction(async (tx) => {
          await Promise.all(
            batch.map(member =>
              tx.user.create({
                data: {
                  email: member.email,
                  password: member.hashedPassword,
                  name: `${member.firstName} ${member.lastName}`,
                  role: UserRole.MEMBER,
                  memberProfile: {
                    create: {
                      memberId: member.memberId,
                      firstName: member.firstName,
                      lastName: member.lastName,
                      middleName: member.middleName,
                      dateOfBirth: member.dateOfBirth,
                      address: member.address,
                      phoneNumber: member.phoneNumber,
                      status: MemberStatus.ACTIVE,
                    },
                  },
                },
              })
            )
          )
        })

        results.success += batch.length
        console.log(`Inserted batch ${Math.floor(i / BATCH_SIZE) + 1}: ${batch.length} members`)
      } catch (error: any) {
        // If batch fails, try individual inserts to identify which member failed
        console.error(`Batch ${Math.floor(i / BATCH_SIZE) + 1} failed, trying individual inserts:`, error)
        
        for (const member of batch) {
          console.log('member.email', member.email);
          
          try {
            await prisma.user.create({
              data: {
                email: member.email,
                password: member.hashedPassword,
                name: `${member.firstName} ${member.lastName}`,
                role: UserRole.MEMBER,
                memberProfile: {
                  create: {
                    memberId: member.memberId,
                    firstName: member.firstName,
                    lastName: member.lastName,
                    middleName: member.middleName,
                    dateOfBirth: member.dateOfBirth,
                    address: member.address,
                    phoneNumber: member.phoneNumber,
                    status: MemberStatus.ACTIVE,
                  },
                },
              },
            })
            results.success++
          } catch (individualError: any) {
            results.failed++
            results.errors.push(`Row ${member.rowNum}: ${individualError.message || "Unknown error"}`)
            console.error(`Error inserting member from row ${member.rowNum}:`, individualError)
          }
        }
      }
    }

    console.log(`Import completed: ${results.success} created, ${results.failed} failed, ${results.skipped} skipped`)

    return NextResponse.json({
      message: `Import completed: ${results.success} members created, ${results.failed} failed, ${results.skipped} skipped`,
      results,
    })
  } catch (error: any) {
    console.error("Error importing members:", error)
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    )
  }
}

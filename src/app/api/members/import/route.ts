import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { UserRole, MemberStatus } from "@prisma/client"
import bcrypt from "bcryptjs"
import { generateMemberId } from "@/lib/utils"
import * as XLSX from "xlsx"

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Only ADMIN can import members
    if (session.user.role !== UserRole.ADMIN) {
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
    // Look for "ID" column (member ID like "14-0000441-0")
    const memberIdIdx = headers.findIndex(h => h && (h === "id" || h === "member id" || (h.includes("member") && h.includes("id"))))
    // Look for "Name of Client" column
    const nameIdx = headers.findIndex(h => h && ((h.includes("name") && h.includes("client")) || h === "name" || h === "full name"))
    // Look for "Date of Birth" column
    const dateOfBirthIdx = headers.findIndex(h => h && ((h.includes("date") && h.includes("birth")) || h.includes("dob") || h === "birthdate"))
    // Look for "Address" column
    const addressIdx = headers.findIndex(h => h && h.includes("address"))
    // Look for phone/contact columns (may not exist)
    const phoneIdx = headers.findIndex(h => h && (h.includes("phone") || h.includes("tel") || h.includes("mobile") || h.includes("contact")))
    // Look for email (may not exist)
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
      
      // Check if name is in "Last, First Middle" format
      if (trimmed.includes(",")) {
        const parts = trimmed.split(",").map(p => p.trim())
        const lastName = parts[0] || ""
        const firstAndMiddle = parts[1] || ""
        
        // Split first and middle name
        const nameParts = firstAndMiddle.split(/\s+/).filter(p => p)
        const firstName = nameParts[0] || ""
        const middleName = nameParts.slice(1).join(" ") || null
        
        return { lastName, firstName, middleName }
      }
      
      // If not in "Last, First" format, assume "First Last" format
      const nameParts = trimmed.split(/\s+/).filter(p => p)
      if (nameParts.length >= 2) {
        const firstName = nameParts[0]
        const lastName = nameParts[nameParts.length - 1]
        const middleName = nameParts.slice(1, -1).join(" ") || null
        return { lastName, firstName, middleName }
      }
      
      // Single name - use as first name
      return { lastName: "", firstName: trimmed, middleName: null }
    }

    const results = {
      success: 0,
      failed: 0,
      errors: [] as string[],
      skipped: 0,
    }

    // Process each row starting from line 20 (index 19)
    // Stop when we encounter summary rows (like "GRAND TOTALS" or rows starting with "Share Capital")
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
        // Get full name and parse it
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

        // Generate email if not provided (use pattern: firstname.lastname@soemco.coop)
        const finalEmail = email || `${firstName.toLowerCase().replace(/\s+/g, ".")}.${lastName.toLowerCase().replace(/\s+/g, ".")}@soemco.coop`

        // Parse date of birth (format: MM/DD/YYYY)
        let dateOfBirth: Date | null = null
        if (dateOfBirthIdx !== -1 && row[dateOfBirthIdx]) {
          const dobValue = row[dateOfBirthIdx]
          if (dobValue instanceof Date) {
            dateOfBirth = dobValue
          } else if (typeof dobValue === "number") {
            // Excel date serial number - Excel epoch is 1900-01-01
            const excelEpoch = new Date(1899, 11, 30)
            dateOfBirth = new Date(excelEpoch.getTime() + dobValue * 86400000)
          } else {
            const dobString = String(dobValue).trim()
            if (dobString) {
              // Try parsing MM/DD/YYYY format
              const parts = dobString.split("/")
              if (parts.length === 3) {
                const month = parseInt(parts[0], 10) - 1 // Month is 0-indexed
                const day = parseInt(parts[1], 10)
                const year = parseInt(parts[2], 10)
                dateOfBirth = new Date(year, month, day)
                if (isNaN(dateOfBirth.getTime())) {
                  dateOfBirth = null
                }
              } else {
                // Try standard date parsing
                dateOfBirth = new Date(dobString)
                if (isNaN(dateOfBirth.getTime())) {
                  dateOfBirth = null
                }
              }
            }
          }
        }

        // Check if user already exists
        const existingUser = await prisma.user.findUnique({
          where: { email: finalEmail },
        })

        if (existingUser) {
          results.skipped++
          continue
        }

        // Generate password (default: firstname+lastname+123)
        const defaultPassword = `${firstName}${lastName}123`
        const hashedPassword = await bcrypt.hash(defaultPassword, 12)

        // Use existing memberId or generate new one
        const memberId = existingMemberId || generateMemberId()

        // Check if memberId already exists
        const existingMember = await prisma.memberProfile.findUnique({
          where: { memberId },
        })

        if (existingMember) {
          results.skipped++
          continue
        }

        // Create user and member profile
        await prisma.user.create({
          data: {
            email: finalEmail,
            password: hashedPassword,
            name: `${firstName} ${lastName}`,
            role: UserRole.MEMBER,
            memberProfile: {
              create: {
                memberId,
                firstName,
                lastName,
                middleName,
                dateOfBirth,
                address,
                phoneNumber,
                status: MemberStatus.ACTIVE,
              },
            },
          },
        })

        results.success++
      } catch (error: any) {
        results.failed++
        const rowNum = i + 1
        results.errors.push(`Row ${rowNum}: ${error.message || "Unknown error"}`)
        console.error(`Error processing row ${rowNum}:`, error)
      }
    }

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

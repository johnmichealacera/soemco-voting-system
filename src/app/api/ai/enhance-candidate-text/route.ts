import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { UserRole } from "@prisma/client"

type EnhanceField = "bio" | "qualifications"

function buildSystemPrompt(field: EnhanceField): string {
  if (field === "bio") {
    return "You are an expert election communications editor. Improve candidate biography text for clarity, professionalism, and readability while preserving facts exactly. Do not invent achievements, dates, titles, or affiliations. Output plain text only, with a strict maximum of 2 sentences total."
  }
  return "You are an expert election communications editor. Improve candidate qualifications text to be concise, professional, and impact-oriented while preserving facts exactly. Do not invent credentials, awards, or experience. Output plain text only, with a strict maximum of 2 sentences total."
}

function buildUserPrompt(field: EnhanceField, text: string): string {
  if (field === "bio") {
    return `Enhance this candidate bio. Keep it factual and polished, and return only 1-2 concise sentences (about 20-40 words total), suitable for election cards/pages:\n\n${text}`
  }
  return `Enhance these candidate qualifications. Keep it factual and polished, and return only 1-2 concise sentences (about 20-40 words total), suitable for election cards/pages:\n\n${text}`
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    if (session.user.role !== UserRole.ADMIN) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const body = await request.json()
    const field = body?.field as EnhanceField | undefined
    const text = String(body?.text || "").trim()

    if (!field || (field !== "bio" && field !== "qualifications")) {
      return NextResponse.json(
        { error: "field must be either 'bio' or 'qualifications'" },
        { status: 400 }
      )
    }
    if (text.length < 10) {
      return NextResponse.json(
        { error: "Please provide more text to enhance (at least 10 characters)." },
        { status: 400 }
      )
    }
    if (text.length > 4000) {
      return NextResponse.json(
        { error: "Text is too long. Please keep it under 4000 characters." },
        { status: 400 }
      )
    }

    const apiKey = process.env.GROQ_API_KEY
    if (!apiKey) {
      return NextResponse.json(
        { error: "GROQ_API_KEY is not configured." },
        { status: 500 }
      )
    }

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        temperature: 0.5,
        messages: [
          { role: "system", content: buildSystemPrompt(field) },
          { role: "user", content: buildUserPrompt(field, text) },
        ],
      }),
    })

    if (!response.ok) {
      const errorBody = await response.text()
      return NextResponse.json(
        { error: `Groq request failed: ${response.status} ${errorBody}` },
        { status: 502 }
      )
    }

    const data = await response.json()
    const enhancedText = String(data?.choices?.[0]?.message?.content || "").trim()

    if (!enhancedText) {
      return NextResponse.json(
        { error: "No enhanced text was returned by Groq." },
        { status: 502 }
      )
    }

    return NextResponse.json({ enhancedText })
  } catch (error: any) {
    console.error("Error enhancing candidate text:", error)
    return NextResponse.json(
      { error: error?.message || "Failed to enhance text" },
      { status: 500 }
    )
  }
}


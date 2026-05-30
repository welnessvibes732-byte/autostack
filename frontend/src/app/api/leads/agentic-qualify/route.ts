// frontend/src/app/api/leads/agentic-qualify/route.ts
import { NextResponse } from 'next/server';
import { generateObject } from 'ai';
import { google } from '@ai-sdk/google';
import { z } from 'zod';

export async function POST(req: Request) {
  try {
    const { emailText } = await req.json();

    if (!emailText) {
      return NextResponse.json({ error: "No email text provided" }, { status: 400 });
    }

    if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
      return NextResponse.json({ error: "Missing GOOGLE_GENERATIVE_AI_API_KEY in .env" }, { status: 500 });
    }

    // This perfectly replicates your n8n LangChain prompt, but guarantees structural safety using Zod
    const { object } = await generateObject({
      model: google('gemini-flash-latest'), // extremely fast and cheap for this task
      schema: z.object({
        score: z.number().describe("Lead score out of 100 based on rubric"),
        reasoning: z.string().describe("Explanation for the score"),
        extracted: z.object({
          move_in_timeline: z.string().nullable().describe("Exact string they said about timeline"),
          bedrooms: z.number().nullable().describe("Integer if mentioned"),
          budget_max: z.number().nullable().describe("Number in INR if mentioned")
        })
      }),
      prompt: `
        You are a real estate lead qualification expert AI for a property management company. 
        A prospective tenant has replied to qualification questions sent via email. 
        Your job is to analyze their reply and produce a score from 0 to 100.

        ═══════════════════════════════ SCORING RUBRIC (total: 100 pts) ═══════════════════════════════
        1. MOVE-IN TIMELINE (25 pts)
           - Within 2 weeks     -> 25
           - Within 1 month     -> 22
           - Within 2-3 months  -> 16
           - Within 6 months    -> 8
           - 6+ months / vague  -> 3
           - Not mentioned      -> 0
        2. BUDGET CLARITY (20 pts)
           - Specific number given -> 20
           - Vague range          -> 13
           - Just "affordable"    -> 5
           - Not mentioned        -> 0
        3. PROPERTY REQUIREMENT (20 pts)
           - Specific type + size -> 20
           - Specific type only   -> 14
           - Vague                -> 6
           - Not mentioned        -> 0
        4. COMMUNICATION QUALITY (20 pts)
           - Professional         -> 20
           - Short but clear      -> 13
           - Very brief           -> 5
           - Rude or unclear      -> 0
        5. RED FLAGS CHECK (15 pts — start at 15, deduct)
           - No red flags         -> 15
           - Minor issues         -> 10
           - Financial concerns   -> 5
           - Major red flags      -> 0

        Analyze this email reply from a lead:
        "${emailText}"
      `,
    });

    return NextResponse.json({
      success: true,
      message: "Agentic qualification successful",
      data: object
    });

  } catch (error: any) {
    console.error("Agentic AI Error:", error);
    return NextResponse.json({ error: error.message || "Failed to process lead" }, { status: 500 });
  }
}

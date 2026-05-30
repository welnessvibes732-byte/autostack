import { generateObject } from 'ai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { z } from 'zod';

const google = createGoogleGenerativeAI({
  apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY || "YOUR_API_KEY"
});

async function main() {
  const emailText = "Hi, I am looking to move in about 3 weeks. I definitely want a 2BHK. My max budget is around 45000 INR. I have a golden retriever, so I need a pet-friendly place. I can provide 3 months of bank statements.";

  console.log("Analyzing incoming email...");
  console.log(`"${emailText}"\n`);

  try {
    const { object } = await generateObject({
      model: google('gemini-flash-latest'),
      schema: z.object({
        score: z.number().describe("Lead score out of 100 based on rubric"),
        reasoning: z.string().describe("Explanation for the score"),
        extracted: z.object({
          move_in_timeline: z.string().nullable(),
          bedrooms: z.number().nullable(),
          budget_max: z.number().nullable()
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

    console.log("✅ AGENTIC QUALIFICATION COMPLETE\n");
    console.log(JSON.stringify(object, null, 2));

  } catch (error) {
    console.error("Error running AI:", error);
  }
}

main();

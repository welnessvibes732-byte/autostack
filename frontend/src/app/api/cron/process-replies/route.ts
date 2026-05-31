// frontend/src/app/api/cron/process-replies/route.ts
import { NextResponse } from "next/server";
import imaps from "imap-simple";
import { simpleParser } from "mailparser";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { generateObject } from "ai";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";

export async function GET(req: Request) {
  const trace: string[] = [];
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    const emailUser = process.env.GMAIL_USER || "niteshdevarla@gmail.com";
    const emailPass = process.env.GMAIL_APP_PASSWORD;

    if (!emailPass) {
      trace.push("Error: GMAIL_APP_PASSWORD not set in environment variables");
      throw new Error("GMAIL_APP_PASSWORD not set");
    }

    if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
      trace.push("Error: GOOGLE_GENERATIVE_AI_API_KEY not set in environment variables");
      throw new Error("GOOGLE_GENERATIVE_AI_API_KEY not set");
    }

    const config = {
      imap: {
        user: emailUser,
        password: emailPass,
        host: "imap.gmail.com",
        port: 993,
        tls: true,
        tlsOptions: { rejectUnauthorized: false },
        authTimeout: 10000
      }
    };

    trace.push("Connecting to IMAP...");
    const connection = await imaps.connect(config);
    trace.push("IMAP Connected. Opening INBOX...");
    await connection.openBox("INBOX");

    const searchCriteria = ["UNSEEN"];
    const fetchOptions = {
      bodies: ["HEADER", "TEXT", ""],
      markSeen: true
    };

    trace.push("Searching for UNSEEN messages...");
    const messages = await connection.search(searchCriteria, fetchOptions);
    trace.push(`Found ${messages.length} unread messages.`);
    let processedCount = 0;

    const google = createGoogleGenerativeAI({
      apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY
    });

    for (const message of messages) {
      const allParts = message.parts.find((part: any) => part.which === "");
      if (!allParts) continue;

      const id = message.attributes.uid;
      const idHeader = "Imap-Id: " + id + "\r\n";
      const parsed = await simpleParser(idHeader + allParts.body);

      const fromAddress = parsed.from?.value[0]?.address;
      trace.push(`Checking message from: ${fromAddress}`);
      if (!fromAddress) {
        trace.push("No from address found, skipping.");
        continue;
      }

      // Check if this sender exists in our leads database
      const { data: lead, error: supabaseError } = await supabase
        .from("leads")
        .select("id, full_name, email, notes, lead_score")
        .eq("email", fromAddress)
        .single();

      if (supabaseError || !lead) {
        trace.push(`No lead found in database for email: ${fromAddress}. Skipping.`);
        continue;
      }

      trace.push(`Found matching lead: ${lead.full_name} (${fromAddress}). Analyzing with Gemini...`);

      // Use Gemini to analyze the response
      const emailContent = parsed.text || "";
      
      const { object } = await generateObject({
        model: google('gemini-1.5-flash-latest'),
        schema: z.object({
          qualification_answers: z.object({
            budget: z.string().optional().describe("The lead's budget if mentioned"),
            move_in_date: z.string().optional().describe("When the lead wants to move in"),
            pets: z.string().optional().describe("Whether they have pets"),
            occupants: z.string().optional().describe("Number of occupants")
          }),
          suggested_score: z.number().describe("0-100 score based on how qualified they seem"),
          is_qualified: z.boolean().describe("True if they seem like a serious and viable prospect"),
          summary: z.string().describe("A brief 1 sentence summary of their reply")
        }),
        prompt: `
          Analyze this reply from a real estate lead:
          Name: ${lead.full_name}
          Email Content: ${emailContent}
          
          Extract their answers to the qualification questions (budget, move-in, pets, occupants).
          Score the lead 0-100 based on seriousness and viability.
        `
      });

      trace.push(`Gemini analysis complete. Suggested score: ${object.suggested_score}, Qualified: ${object.is_qualified}`);

      // Update Supabase
      const newScore = object.suggested_score;
      const newStage = object.is_qualified ? "qualified" : "new";
      const newNotes = (lead.notes || "") + `\n[AI Qualification - ${new Date().toISOString()}] ${object.summary}`;

      const { error: updateError } = await supabase
        .from("leads")
        .update({
          stage: newStage,
          lead_score: newScore,
          qualification_answers: object.qualification_answers,
          notes: newNotes,
          last_contact_at: new Date().toISOString(),
          next_follow_up_at: null // Stop the drip campaign
        })
        .eq("id", lead.id);

      if (updateError) {
        trace.push(`Failed to update Supabase lead: ${updateError.message}`);
      } else {
        trace.push(`Successfully updated lead in Supabase.`);
        processedCount++;
      }
    }

    connection.end();
    return NextResponse.json({ status: "success", processed: processedCount, trace });

  } catch (error: any) {
    trace.push(`Fatal Error: ${error.message}`);
    return NextResponse.json({ error: error.message, trace }, { status: 500 });
  }
}

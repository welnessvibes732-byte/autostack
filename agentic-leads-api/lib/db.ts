// lib/db.ts
// In production, this would use a real Postgres client (e.g., pg or @supabase/supabase-js)

export interface Lead {
  id: string;
  organization_id: string;
  full_name: string;
  email: string;
  phone: string;
  source: string;
  inquiry_type: string;
  budget_min: number;
  budget_max: number;
  preferred_area: string;
  property_type: string;
  bedrooms: number;
  move_in_timeline: string;
  lead_score: number;
  stage: string;
  follow_up_day: number;
  next_follow_up_at: string | null;
  created_at: string;
}

export const db = {
  leads: {
    findDueForFollowUp: async (): Promise<Lead[]> => {
      console.log("[DB] Executing Query: Fetching leads due for follow-up (stage != 'closed', follow_up_day < 4, etc.)");
      // Simulating a database return
      return [
        {
          id: "lead-123",
          organization_id: "org-1",
          full_name: "John Doe",
          email: "john@example.com",
          phone: "1234567890",
          source: "website",
          inquiry_type: "buy",
          budget_min: 40000,
          budget_max: 50000,
          preferred_area: "Downtown",
          property_type: "Apartment",
          bedrooms: 2,
          move_in_timeline: "1 month",
          lead_score: 85,
          stage: "active",
          follow_up_day: 0, // Needs Day 1 email
          next_follow_up_at: "2026-05-30",
          created_at: "2026-05-29",
        }
      ];
    },
    updateFollowUpState: async (leadId: string, currentDay: number): Promise<void> => {
      console.log(`[DB] UPDATE leads SET follow_up_day = ${currentDay + 1}, stage = (if >= 3 then 'closed') WHERE id = '${leadId}'`);
    },
    qualifyLead: async (leadId: string, score: number, aiNotes: string, extracted: any): Promise<void> => {
      console.log(`[DB] UPDATE leads SET lead_score = ${score}, stage = 'qualified', notes = '${aiNotes}' WHERE id = '${leadId}'`);
      console.log("[DB] Extracted Data Saved:", extracted);
    }
  },
  audit: {
    logAction: async (orgId: string, action: string, entityId: string, newValues: any): Promise<void> => {
      console.log(`[DB] INSERT INTO audit_log: Action '${action}' for Entity '${entityId}'`);
    }
  }
};

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sendEmail } from "@/lib/email";

/**
 * FINANCE EVENT EMAIL NOTIFICATIONS
 * 
 * This API sends email notifications when major financial events happen.
 * Called internally by the frontend after financial actions.
 * 
 * Events:
 * - rent_paid: Tenant pays rent → email to tenant + property manager
 * - invoice_approved: Invoice approved → email to vendor + approver
 * - invoice_paid: Invoice paid → email to vendor
 * - deposit_received: Security deposit received → email to tenant
 * - deposit_returned: Security deposit returned → email to tenant
 * - tenant_charged: Tenant charged for damages → email to tenant
 */

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const { event_type, record_id, organization_id } = await req.json();

    if (!event_type || !record_id) {
      return NextResponse.json({ error: "event_type and record_id required" }, { status: 400 });
    }

    // Get organization info
    const { data: org } = await supabase
      .from("organizations")
      .select("name, owner_id")
      .eq("id", organization_id)
      .single();

    // Get owner email
    let ownerEmail = "";
    if (org?.owner_id) {
      const { data: ownerData } = await supabase
        .from("team_members")
        .select("email")
        .eq("user_id", org.owner_id)
        .single();
      ownerEmail = ownerData?.email || "";
    }

    const orgName = org?.name || "Your Property";
    let emailsSent = 0;

    // ─── RENT PAID ───
    if (event_type === "rent_paid") {
      const { data: payment } = await supabase
        .from("rent_payments")
        .select("*, tenants(full_name, email), units(unit_number, property_id)")
        .eq("id", record_id)
        .single();

      if (payment) {
        const tenantName = payment.tenants?.full_name || "Tenant";
        const tenantEmail = payment.tenants?.email;
        const unit = payment.units?.unit_number || "Unit";
        const amount = payment.amount_paid;
        const lateFee = payment.late_fee_charged || 0;

        // Email to tenant: "Your rent payment is confirmed"
        if (tenantEmail) {
          await sendEmail({
            to: tenantEmail,
            subject: `✅ Rent Payment Confirmed — ${unit} (₹${amount})`,
            html: `
              <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px;">
                <h2 style="color:#1a1a1a;">Rent Payment Confirmed</h2>
                <p>Hi ${tenantName},</p>
                <p>Your rent payment of <strong>₹${amount}</strong> for <strong>${unit}</strong> has been recorded.</p>
                ${lateFee > 0 ? `<p style="color:#c0392b;">⚠️ Late fee charged: ₹${lateFee}</p>` : ''}
                <table style="width:100%;border-collapse:collapse;margin:16px 0;">
                  <tr><td style="padding:8px;border-bottom:1px solid #eee;color:#888;">Amount</td><td style="padding:8px;border-bottom:1px solid #eee;font-weight:bold;">₹${amount}</td></tr>
                  <tr><td style="padding:8px;border-bottom:1px solid #eee;color:#888;">Unit</td><td style="padding:8px;border-bottom:1px solid #eee;">${unit}</td></tr>
                  <tr><td style="padding:8px;border-bottom:1px solid #eee;color:#888;">Date</td><td style="padding:8px;border-bottom:1px solid #eee;">${payment.paid_date || new Date().toLocaleDateString()}</td></tr>
                  ${payment.payment_ref ? `<tr><td style="padding:8px;border-bottom:1px solid #eee;color:#888;">Reference</td><td style="padding:8px;border-bottom:1px solid #eee;">${payment.payment_ref}</td></tr>` : ''}
                </table>
                <p style="color:#888;font-size:12px;">This is an automated confirmation from ${orgName}.</p>
              </div>
            `
          });
          emailsSent++;
        }

        // Email to owner/manager: "Rent collected"
        if (ownerEmail) {
          await sendEmail({
            to: ownerEmail,
            subject: `💰 Rent Collected — ${tenantName}, ${unit} (₹${amount})`,
            html: `
              <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px;">
                <h2 style="color:#1a1a1a;">Rent Payment Received</h2>
                <p><strong>${tenantName}</strong> paid <strong>₹${amount}</strong> for <strong>${unit}</strong>.</p>
                ${lateFee > 0 ? `<p style="color:#c0392b;">Late fee: ₹${lateFee} (${payment.late_fee_days} days late)</p>` : '<p style="color:#22c55e;">✅ On time</p>'}
                <p>A journal entry has been auto-created in your finance ledger.</p>
                <p style="color:#888;font-size:12px;">— Aethera Finance Engine</p>
              </div>
            `
          });
          emailsSent++;
        }
      }
    }

    // ─── INVOICE APPROVED ───
    if (event_type === "invoice_approved") {
      const { data: invoice } = await supabase
        .from("invoices")
        .select("*, vendors(name, email)")
        .eq("id", record_id)
        .single();

      if (invoice) {
        const vendorName = invoice.vendors?.name || invoice.vendor_name || "Vendor";
        const vendorEmail = invoice.vendors?.email;

        // Email to vendor
        if (vendorEmail) {
          await sendEmail({
            to: vendorEmail,
            subject: `✅ Invoice Approved — ${invoice.invoice_number || 'N/A'} (₹${invoice.total_amount})`,
            html: `
              <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px;">
                <h2 style="color:#1a1a1a;">Invoice Approved</h2>
                <p>Hi ${vendorName},</p>
                <p>Your invoice <strong>${invoice.invoice_number || ''}</strong> for <strong>₹${invoice.total_amount}</strong> has been approved for payment.</p>
                <p>Payment will be processed shortly.</p>
                <p style="color:#888;font-size:12px;">— ${orgName}</p>
              </div>
            `
          });
          emailsSent++;
        }

        // Email to owner
        if (ownerEmail) {
          await sendEmail({
            to: ownerEmail,
            subject: `📋 Invoice Approved — ${vendorName} (₹${invoice.total_amount})`,
            html: `
              <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px;">
                <h2>Invoice Approved</h2>
                <p><strong>${vendorName}</strong> invoice for <strong>₹${invoice.total_amount}</strong> has been approved.</p>
                <p>This amount is now recorded as Accounts Payable in your ledger.</p>
                <p style="color:#888;font-size:12px;">— Aethera Finance Engine</p>
              </div>
            `
          });
          emailsSent++;
        }
      }
    }

    // ─── INVOICE PAID ───
    if (event_type === "invoice_paid") {
      const { data: invoice } = await supabase
        .from("invoices")
        .select("*, vendors(name, email)")
        .eq("id", record_id)
        .single();

      if (invoice && ownerEmail) {
        await sendEmail({
          to: ownerEmail,
          subject: `💸 Invoice Paid — ${invoice.vendors?.name || invoice.vendor_name} (₹${invoice.total_amount})`,
          html: `
            <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px;">
              <h2>Payment Processed</h2>
              <p>₹${invoice.total_amount} has been paid to <strong>${invoice.vendors?.name || invoice.vendor_name}</strong>.</p>
              <p>Journal entry recorded: Cash debited, Accounts Payable cleared.</p>
              <p style="color:#888;font-size:12px;">— Aethera Finance Engine</p>
            </div>
          `
        });
        emailsSent++;
      }
    }

    // ─── DEPOSIT RECEIVED ───
    if (event_type === "deposit_received") {
      const { data: deposit } = await supabase
        .from("security_deposits")
        .select("*, tenants(full_name, email)")
        .eq("id", record_id)
        .single();

      if (deposit) {
        const tenantEmail = deposit.tenants?.email;
        const tenantName = deposit.tenants?.full_name || "Tenant";

        if (tenantEmail) {
          await sendEmail({
            to: tenantEmail,
            subject: `🔒 Security Deposit Received — ₹${deposit.deposit_amount}`,
            html: `
              <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px;">
                <h2>Security Deposit Confirmation</h2>
                <p>Hi ${tenantName},</p>
                <p>Your security deposit of <strong>₹${deposit.deposit_amount}</strong> has been received and recorded.</p>
                <p>This deposit will be refunded when your lease ends, minus any deductions for damages (if applicable).</p>
                <p style="color:#888;font-size:12px;">— ${orgName}</p>
              </div>
            `
          });
          emailsSent++;
        }
      }
    }

    // ─── DEPOSIT RETURNED ───
    if (event_type === "deposit_returned") {
      const { data: deposit } = await supabase
        .from("security_deposits")
        .select("*, tenants(full_name, email)")
        .eq("id", record_id)
        .single();

      if (deposit) {
        const tenantEmail = deposit.tenants?.email;
        const tenantName = deposit.tenants?.full_name || "Tenant";

        if (tenantEmail) {
          await sendEmail({
            to: tenantEmail,
            subject: `🔓 Security Deposit Refund — ₹${deposit.refund_amount}`,
            html: `
              <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px;">
                <h2>Security Deposit Refund</h2>
                <p>Hi ${tenantName},</p>
                <p>Your security deposit has been processed:</p>
                <table style="width:100%;border-collapse:collapse;margin:16px 0;">
                  <tr><td style="padding:8px;border-bottom:1px solid #eee;color:#888;">Original Deposit</td><td style="padding:8px;border-bottom:1px solid #eee;font-weight:bold;">₹${deposit.deposit_amount}</td></tr>
                  ${deposit.deduction_amount > 0 ? `<tr><td style="padding:8px;border-bottom:1px solid #eee;color:#c0392b;">Deductions</td><td style="padding:8px;border-bottom:1px solid #eee;color:#c0392b;">-₹${deposit.deduction_amount} (${deposit.deduction_reason || 'damages'})</td></tr>` : ''}
                  <tr><td style="padding:8px;border-bottom:1px solid #eee;color:#22c55e;font-weight:bold;">Refund Amount</td><td style="padding:8px;border-bottom:1px solid #eee;color:#22c55e;font-weight:bold;">₹${deposit.refund_amount}</td></tr>
                </table>
                <p style="color:#888;font-size:12px;">— ${orgName}</p>
              </div>
            `
          });
          emailsSent++;
        }
      }
    }

    // ─── TENANT CHARGED ───
    if (event_type === "tenant_charged") {
      const { data: charge } = await supabase
        .from("tenant_charges")
        .select("*, tenants(full_name, email)")
        .eq("id", record_id)
        .single();

      if (charge) {
        const tenantEmail = charge.tenants?.email;
        const tenantName = charge.tenants?.full_name || "Tenant";

        if (tenantEmail) {
          await sendEmail({
            to: tenantEmail,
            subject: `⚠️ Charge Added — ${charge.description} (₹${charge.amount})`,
            html: `
              <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px;">
                <h2>Charge Notification</h2>
                <p>Hi ${tenantName},</p>
                <p>A charge of <strong>₹${charge.amount}</strong> has been added to your account:</p>
                <p><strong>Reason:</strong> ${charge.description}</p>
                <p><strong>Type:</strong> ${charge.charge_type}</p>
                <p>Please contact your property manager for questions.</p>
                <p style="color:#888;font-size:12px;">— ${orgName}</p>
              </div>
            `
          });
          emailsSent++;
        }
      }
    }

    return NextResponse.json({ 
      success: true, 
      emails_sent: emailsSent,
      event_type 
    });

  } catch (error: any) {
    console.error("[FINANCE EMAIL ERROR]", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

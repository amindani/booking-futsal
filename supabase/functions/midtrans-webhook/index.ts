import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

async function sha512(value: string) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-512", bytes);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  try {
    const payload = await req.json();
    const signatureSecret = Deno.env.get("MIDTRANS_SIGNATURE_KEY");
    const url = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!signatureSecret || !url || !serviceKey) return json({ error: "Server configuration missing" }, 503);

    const expected = await sha512(
      String(payload.order_id || "") + String(payload.status_code || "") +
      String(payload.gross_amount || "") + signatureSecret
    );
    if (expected !== String(payload.signature_key || "")) return json({ error: "Invalid signature" }, 401);

    const db = createClient(url, serviceKey);
    const { data: booking, error } = await db.from("bookings")
      .select("id,total_price,payment_status").eq("payment_order_id", payload.order_id).single();
    if (error || !booking) return json({ error: "Booking not found" }, 404);
    if (Number(payload.gross_amount) !== Number(booking.total_price).toFixed(2) * 1) {
      return json({ error: "Payment amount mismatch" }, 400);
    }

    let paymentStatus = "pending";
    let bookingStatus = "pending";
    const transaction = String(payload.transaction_status || "");
    if ((transaction === "settlement" || transaction === "capture") &&
        String(payload.status_code) === "200" &&
        (!payload.fraud_status || String(payload.fraud_status).toLowerCase() === "accept")) {
      paymentStatus = "paid";
      bookingStatus = "confirmed";
    } else if (["deny", "cancel"].includes(transaction)) {
      paymentStatus = "failed";
      bookingStatus = "cancelled";
    } else if (transaction === "expire") {
      paymentStatus = "expired";
      bookingStatus = "cancelled";
    }

    const patch: Record<string, unknown> = {
      payment_status: paymentStatus,
      status: bookingStatus,
    };
    if (paymentStatus === "paid") patch.paid_at = new Date().toISOString();
    const { error: updateError } = await db.from("bookings").update(patch).eq("id", booking.id);
    if (updateError) throw updateError;
    return json({ ok: true });
  } catch (error) {
    console.error(error);
    return json({ error: "Webhook processing failed" }, 500);
  }
});

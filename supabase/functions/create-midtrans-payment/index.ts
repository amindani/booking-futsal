import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: cors });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const body = await req.json();
    const { court_id, booking_date, start_time, duration_hours, customer_name, customer_phone } = body;

    if (!court_id || !booking_date || !start_time || !customer_name || !customer_phone) {
      return json({ error: "Lengkapi nama, nomor WhatsApp, tanggal, jam, dan lapangan." }, 400);
    }
    const duration = Number(duration_hours);
    if (!Number.isInteger(duration) || duration < 1 || duration > 5) {
      return json({ error: "Durasi booking tidak valid." }, 400);
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(booking_date) || !/^\d{2}:\d{2}$/.test(start_time)) {
      return json({ error: "Format tanggal atau jam tidak valid." }, 400);
    }
    if (new Date(booking_date + "T00:00:00") < new Date(new Date().toDateString())) {
      return json({ error: "Tanggal booking sudah lewat." }, 400);
    }

    const url = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const serverKey = Deno.env.get("MIDTRANS_SERVER_KEY");
    const production = Deno.env.get("MIDTRANS_IS_PRODUCTION") === "true";
    if (!url || !serviceKey || !serverKey) {
      return json({ error: "Konfigurasi pembayaran belum lengkap di server." }, 503);
    }

    const db = createClient(url, serviceKey);
    const { data: court, error: courtError } = await db.from("courts")
      .select("id,name,price_per_hour,opening_time,closing_time,is_active,operational_status")
      .eq("id", court_id).single();
    if (courtError || !court || !court.is_active || court.operational_status === "maintenance") {
      return json({ error: "Lapangan tidak tersedia." }, 409);
    }

    const startMinutes = Number(start_time.slice(0, 2)) * 60 + Number(start_time.slice(3, 5));
    const openMinutes = Number(String(court.opening_time).slice(0, 2)) * 60;
    const closeMinutes = Number(String(court.closing_time).slice(0, 2)) * 60;
    if (startMinutes < openMinutes || startMinutes + duration * 60 > closeMinutes) {
      return json({ error: "Jam booking di luar jam operasional lapangan." }, 400);
    }

    const { data: existing, error: conflictError } = await db.from("bookings")
      .select("id,start_time,duration_hours")
      .eq("court_id", court_id).eq("booking_date", booking_date)
      .in("status", ["pending", "confirmed"]);
    if (conflictError) throw conflictError;
    const overlaps = (existing || []).some((item) => {
      if (item.status === "cancelled") return false;
      const oldStart = Number(String(item.start_time).slice(0, 2)) * 60 + Number(String(item.start_time).slice(3, 5));
      return startMinutes < oldStart + Number(item.duration_hours) * 60 &&
        oldStart < startMinutes + duration * 60;
    });
    if (overlaps) return json({ error: "Jadwal tersebut sudah dipesan. Silakan pilih jam lain." }, 409);

    const bookingCode = "LF-" + crypto.randomUUID().replaceAll("-", "").slice(0, 10).toUpperCase();
    const orderId = "LF-" + crypto.randomUUID();
    const total = Number(court.price_per_hour) * duration;
    const { data: booking, error: insertError } = await db.from("bookings").insert({
      booking_code: bookingCode,
      user_id: null,
      court_id,
      booking_date,
      start_time,
      duration_hours: duration,
      total_price: total,
      status: "pending",
      payment_status: "pending",
      payment_provider: "midtrans",
      payment_order_id: orderId,
      customer_name: String(customer_name).trim().slice(0, 100),
      customer_phone: String(customer_phone).trim().slice(0, 24),
    }).select("id,booking_code").single();
    if (insertError) throw insertError;

    const endpoint = production
      ? "https://app.midtrans.com/snap/v1/transactions"
      : "https://app.sandbox.midtrans.com/snap/v1/transactions";
    const auth = btoa(serverKey + ":");
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Accept": "application/json", "Content-Type": "application/json", "Authorization": "Basic " + auth },
      body: JSON.stringify({
        transaction_details: { order_id: orderId, gross_amount: total },
        item_details: [{ id: String(court.id), price: Number(court.price_per_hour), quantity: duration, name: String(court.name).slice(0, 50) }],
        customer_details: { first_name: String(customer_name).trim().slice(0, 50), phone: String(customer_phone).trim() },
        callbacks: { finish: Deno.env.get("PAYMENT_FINISH_URL") || "https://example.com/payment-finish" },
      }),
    });
    const snap = await response.json();
    if (!response.ok || !snap.token || !snap.redirect_url) {
      await db.from("bookings").update({ status: "cancelled", payment_status: "failed" }).eq("id", booking.id);
      console.error("Midtrans create transaction failed", snap);
      return json({ error: "Tidak dapat membuat transaksi pembayaran. Coba lagi." }, 502);
    }

    const { error: updateError } = await db.from("bookings")
      .update({ payment_token: snap.token, payment_url: snap.redirect_url })
      .eq("id", booking.id);
    if (updateError) throw updateError;

    return json({ booking_code: booking.booking_code, order_id: orderId, token: snap.token, redirect_url: snap.redirect_url, total });
  } catch (error) {
    console.error(error);
    return json({ error: "Terjadi kesalahan saat menyiapkan pembayaran." }, 500);
  }
});

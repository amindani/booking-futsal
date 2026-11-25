import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const cors = { "Access-Control-Allow-Origin":"*", "Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type", "Access-Control-Allow-Methods":"POST, OPTIONS", "Content-Type":"application/json" };
const json = (body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:cors});

Deno.serve(async req=>{
  if(req.method==="OPTIONS") return new Response("ok",{headers:cors});
  if(req.method!=="POST") return json({error:"Method not allowed"},405);
  try {
    const { booking_code, customer_phone } = await req.json();
    if(!booking_code || !customer_phone) return json({error:"Kode booking dan nomor WhatsApp diperlukan."},400);
    const db=createClient(Deno.env.get("SUPABASE_URL")!,Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const {data,error}=await db.from("bookings")
      .select("booking_code,customer_phone,payment_status,status,total_price,booking_date,start_time,duration_hours,courts(name)")
      .eq("booking_code",String(booking_code)).single();
    if(error || !data || String(data.customer_phone).replace(/\D/g,"")!==String(customer_phone).replace(/\D/g,"")) return json({error:"Data booking tidak ditemukan."},404);
    return json({booking_code:data.booking_code,payment_status:data.payment_status,status:data.status,total_price:data.total_price,booking_date:data.booking_date,start_time:data.start_time,duration_hours:data.duration_hours,court_name:data.courts?.name || "Lapangan"});
  } catch { return json({error:"Tidak dapat memeriksa status pembayaran."},500); }
});

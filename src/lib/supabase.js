import { createClient } from "@supabase/supabase-js";

// Nilai fallback memakai konfigurasi publik yang sebelumnya sudah ada di project.
// Untuk deployment, isi Environment Variables di Vercel.
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "https://vbearvrnbsaupwcvvqck.supabase.co";
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || "sb_publishable_jl24BE1os4ILrHciqFH5Hw_S1McFS1-";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
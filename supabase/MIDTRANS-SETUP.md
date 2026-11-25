# Setup pembayaran otomatis Midtrans

Integrasi memakai Snap checkout. Server Key dan Signature Secret Key hanya disimpan di Supabase Edge Function Secrets, tidak pernah di frontend atau GitHub.

## 1. Persiapan akun
1. Buat/masuk akun Midtrans di https://dashboard.midtrans.com/.
2. Mulai dari mode Sandbox untuk pengujian.
3. Ambil Server Key dan Signature Secret Key dari menu Settings / Access Keys.
4. Jangan kirim kedua secret tersebut ke chat atau commit ke repository.

## 2. Set Supabase Function Secrets
Di Supabase Dashboard > Edge Functions > Secrets, tambahkan:
- MIDTRANS_SERVER_KEY
- MIDTRANS_SIGNATURE_KEY
- MIDTRANS_IS_PRODUCTION=false
- PAYMENT_FINISH_URL=https://alamat-website-kamu/

SUPABASE_URL dan SUPABASE_SERVICE_ROLE_KEY biasanya sudah tersedia otomatis di Edge Functions.

## 3. Deploy functions
Deploy folder:
- supabase/functions/create-midtrans-payment
- supabase/functions/midtrans-webhook

Function create-midtrans-payment menerima booking publik. Function midtrans-webhook menerima notifikasi status transaksi dari Midtrans dan memvalidasi signature sebelum menandai booking Lunas.

## 4. URL notifikasi Midtrans
Set Payment Notification URL pada Midtrans Dashboard menjadi:
https://vbearvrnbsaupwcvvqck.supabase.co/functions/v1/midtrans-webhook

## 5. Database
Jalankan isi file supabase/setup-online-booking.sql di Supabase SQL Editor sebelum mengaktifkan checkout publik.

## 6. Mode produksi
Setelah semua skenario Sandbox berhasil diuji, ubah MIDTRANS_IS_PRODUCTION=true dan gunakan Server Key serta Signature Secret Key Production. Jangan gunakan key Sandbox untuk transaksi asli.

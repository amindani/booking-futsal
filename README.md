# Lapanganin — React Booking Lapangan Futsal

Lapanganin adalah prototype website booking lapangan futsal yang dimigrasikan dari HTML, CSS, dan JavaScript biasa ke **React + Vite**. Tampilan utama tetap mempertahankan identitas desain versi sebelumnya.

## Teknologi
- React 18 — component-based UI.
- Vite — development server dan build.
- JavaScript ES Modules.
- Supabase — database dan autentikasi.
- CSS — layout responsif.
- Lucide React — ikon antarmuka.

## Konsep React yang diterapkan
- **Component:** Header, Hero, SearchBar, CourtCard, BookingModal, AuthModal, HistoryModal, dan Footer.
- **Props:** data lapangan dan fungsi aksi dikirim dari App ke komponen anak.
- **State (useState):** menyimpan pengguna, filter, pencarian, modal, dan data formulir.
- **Effect (useEffect):** mengambil data awal, memantau sesi autentikasi, dan memuat riwayat booking.
- **Memoization (useMemo/useCallback):** menyaring daftar lapangan dan menjaga fungsi pemuatan riwayat.

## Fitur
- Menampilkan lapangan aktif dari tabel Supabase `courts`.
- Filter jenis permukaan dan area.
- Form booking dengan estimasi harga.
- Supabase Auth untuk daftar dan login.
- Menyimpan pemesanan ke tabel `bookings`.
- Riwayat booking milik pengguna yang sedang login.
- Layout responsif untuk desktop dan ponsel.

## Menjalankan secara lokal
1. Install Node.js versi LTS.
2. Clone repository dan pindah ke branch `feature/react-migration`.
3. Jalankan `npm install`.
4. Salin `.env.example` menjadi `.env` lalu isi konfigurasi Supabase jika ingin mengganti nilai bawaan.
5. Jalankan `npm run dev`.
6. Buka alamat lokal yang ditampilkan Vite.

## Build
```bash
npm run build
npm run preview
```

## Konfigurasi Supabase
Project memakai tabel `courts`, `profiles`, dan `bookings` serta kebijakan Row Level Security yang sudah tersedia di `supabase/schema.sql`. Jangan pernah menaruh service-role key di frontend. Gunakan publishable/anon key.

## Catatan prototype
- Ketersediaan slot belum divalidasi terhadap bentrok booking di sisi server/database.
- Pembayaran online belum tersedia.
- Dashboard admin belum dimigrasikan pada tahap ini.
- Sebelum dipakai produksi, validasi jadwal dan total harga harus dipindahkan ke fungsi/database server-side.


## Pembaruan: booking publik dan pembayaran otomatis

Fitur yang ditambahkan pada branch `feature/react-migration`:
- Pemesanan dapat dilakukan tanpa login menggunakan nama dan nomor WhatsApp.
- Checkout menggunakan Midtrans Snap.
- Status transaksi hanya menjadi `paid` / booking `confirmed` setelah webhook Midtrans dengan signature valid diterima.
- Admin dapat melihat booking dan status pembayaran, mengelola data lapangan, mengubah foto melalui URL gambar, serta mengatur status operasional lapangan.
- Endpoint pemeriksaan status transaksi tidak membuka daftar booking publik.

### Persiapan Supabase

1. Jalankan `supabase/setup-online-booking.sql` di Supabase SQL Editor. Migrasi database ini sudah diterapkan pada project yang terhubung.
2. Tiga Edge Functions sudah dideploy ke project Supabase:
   - `create-midtrans-payment`
   - `midtrans-webhook`
   - `check-payment-status`

### Konfigurasi Midtrans yang masih diperlukan

Ikuti `supabase/MIDTRANS-SETUP.md`. Masukkan Server Key dan Signature Secret Key Sandbox di Supabase Dashboard > Edge Functions > Secrets. Jangan pernah menyimpan key tersebut di Vite `.env`, frontend, atau GitHub.

Atur Payment Notification URL di dashboard Midtrans:
`https://vbearvrnbsaupwcvvqck.supabase.co/functions/v1/midtrans-webhook`

Gunakan Sandbox untuk seluruh pengujian sebelum mengaktifkan mode Production.

### Catatan deployment

- Pastikan Vercel melakukan deployment dari branch `feature/react-migration` untuk mencoba perubahan ini.
- Akun admin harus memiliki klaim `app_metadata.role = admin`; jangan menggunakan `user_metadata` untuk otorisasi admin.
- Pastikan akun admin sudah tersedia dan policy RLS admin yang ada tetap aktif.
- Jalankan `npm install` lalu `npm run build` sebelum deployment.

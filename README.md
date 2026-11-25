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

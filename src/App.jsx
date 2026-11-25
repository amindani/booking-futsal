import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "./lib/supabase";
import Header from "./components/Header";
import Hero from "./components/Hero";
import SearchBar from "./components/SearchBar";
import CourtCard from "./components/CourtCard";
import BookingModal from "./components/BookingModal";
import AuthModal from "./components/AuthModal";
import HistoryModal from "./components/HistoryModal";
import AdminDashboard from "./components/AdminDashboard";
import Footer from "./components/Footer";

function HowItWorks() {
  const steps = [
    ["01", "⌕", "Pilih lapangan", "Cari lokasi dan lapangan yang paling pas untuk timmu."],
    ["02", "▦", "Tentukan jadwal", "Pilih tanggal dan jam bermain sesuai rencana tim."],
    ["03", "✓", "Bayar online", "Selesaikan pembayaran melalui metode yang tersedia di Midtrans."]
  ];
  return <section className="how-section" id="cara-kerja"><div className="how-heading"><div className="eyebrow">SEMUDAH ITU</div><h2>Tiga langkah, langsung <em>main.</em></h2></div><div className="steps">{steps.map(([no, icon, title, desc]) => <article key={no}><span className="step-no">{no}</span><div className="step-icon">{icon}</div><h3>{title}</h3><p>{desc}</p></article>)}</div></section>;
}

const money = value => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(value);

export default function App() {
  const [courts, setCourts] = useState([]);
  const [user, setUser] = useState(null);
  const [filter, setFilter] = useState("all");
  const [area, setArea] = useState("");
  const [date, setDate] = useState("");
  const [selectedCourt, setSelectedCourt] = useState(null);
  const [showAuth, setShowAuth] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showAdmin, setShowAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState("");
  const [loadError, setLoadError] = useState("");
  const [paymentResult, setPaymentResult] = useState(null);

  const loadCourts = useCallback(async () => {
    const { data, error } = await supabase.from("courts").select("*").eq("is_active", true).order("name");
    if (error) setLoadError("Data lapangan belum dapat dimuat. Periksa koneksi dan pengaturan Supabase.");
    else { setLoadError(""); setCourts(data || []); }
  }, []);

  useEffect(() => {
    let mounted = true;
    Promise.all([supabase.auth.getUser(), supabase.from("courts").select("*").eq("is_active", true).order("name")])
      .then(([auth, result]) => {
        if (!mounted) return;
        setUser(auth.data?.user || null);
        if (result.error) setLoadError("Data lapangan belum dapat dimuat. Periksa koneksi dan pengaturan Supabase.");
        else setCourts(result.data || []);
        setLoading(false);
      }).catch(() => { if (mounted) { setLoadError("Koneksi ke server gagal."); setLoading(false); } });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => setUser(session?.user || null));
    return () => { mounted = false; listener.subscription.unsubscribe(); };
  }, []);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(""), 4500);
    return () => window.clearTimeout(timer);
  }, [notice]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const orderId = params.get("order_id");
    if (!orderId) return;
    let active = true;
    const check = async () => {
      const { data, error } = await supabase.functions.invoke("check-payment-status", { body: { order_id: orderId } });
      if (!active) return;
      if (error) { setPaymentResult({ error: "Status pembayaran belum dapat diperiksa. Coba muat ulang halaman." }); return; }
      setPaymentResult(data);
      if (data?.payment_status === "paid") setNotice("Pembayaran berhasil! Booking kamu sudah dikonfirmasi.");
    };
    check();
    window.history.replaceState({}, "", window.location.pathname);
    return () => { active = false; };
  }, []);

  const visibleCourts = useMemo(() => courts.filter(court =>
    (filter === "all" || filter === court.surface) && (!area || area === court.area)
  ), [courts, filter, area]);

  const handleAuth = async (signup, form) => {
    if (signup) {
      const { data, error } = await supabase.auth.signUp({
        email: form.email, password: form.password,
        options: { data: { full_name: form.full_name, phone: form.phone } }
      });
      if (error) throw error;
      if (data.session) { setUser(data.user); setShowAuth(false); return "Akun berhasil dibuat."; }
      return "Akun dibuat. Silakan cek email untuk verifikasi sebelum masuk.";
    }
    const { data, error } = await supabase.auth.signInWithPassword({ email: form.email, password: form.password });
    if (error) throw error;
    setUser(data.user); setShowAuth(false); setNotice("Berhasil masuk ke Lapanganin.");
    return "";
  };

  const handleLoginButton = async () => {
    if (!user) { setShowAuth(true); return; }
    if (user.app_metadata?.role === "admin") { setShowAdmin(true); return; }
    const { error } = await supabase.auth.signOut();
    if (error) setNotice(error.message);
    else { setUser(null); setNotice("Berhasil keluar."); }
  };

  const handleBookings = () => {
    if (!user) { setNotice("Booking tanpa akun tetap bisa dilakukan. Masuk untuk melihat riwayat akun."); return; }
    setShowHistory(true);
  };

  const handleBooking = async form => {
    const { data, error } = await supabase.functions.invoke("create-midtrans-payment", {
      body: {
        court_id: selectedCourt.id,
        booking_date: form.date,
        start_time: form.time,
        duration_hours: form.duration,
        customer_name: form.name,
        customer_phone: form.phone
      }
    });
    if (error) throw new Error(data?.error || error.message || "Tidak dapat membuat pembayaran.");
    if (data?.error) throw new Error(data.error);
    if (!data?.redirect_url) throw new Error("Tautan pembayaran tidak tersedia.");
    setSelectedCourt(null);
    window.location.assign(data.redirect_url);
  };

  const loadBookings = useCallback(async () => {
    const { data, error } = await supabase.from("bookings")
      .select("id,booking_code,booking_date,start_time,duration_hours,total_price,status,payment_status,courts(name)")
      .eq("user_id", user.id).order("created_at", { ascending: false });
    if (error) throw error;
    return data || [];
  }, [user]);

  const search = () => document.getElementById("lapangan")?.scrollIntoView({ behavior: "smooth" });

  if (showAdmin && user?.app_metadata?.role === "admin") {
    return <><AdminDashboard onBack={() => { setShowAdmin(false); loadCourts(); }} onNotice={setNotice} />{notice && <div className="toast">{notice}</div>}</>;
  }

  return (
    <>
      <Header user={user} onLogin={handleLoginButton} onBookings={handleBookings} />
      <main>
        <Hero />
        <SearchBar area={area} setArea={setArea} date={date} setDate={setDate} onSearch={search} />
        <section className="section courts-section" id="lapangan">
          <div className="section-heading"><div><div className="eyebrow">PILIH TEMPAT BERMAIN</div><h2>Lapangan pilihan <em>buatmu.</em></h2><p>Tempat nyaman, fasilitas lengkap, tinggal ajak teman satu tim.</p></div><a className="plain-link" href="#lapangan">Lihat semua ↗</a></div>
          <div className="filter-row"><div className="filter-pills">
            {[[ "all", "Semua" ], [ "vinyl", "Vinyl" ], [ "rumput", "Rumput sintetis" ], [ "interlock", "Interlock" ]].map(([value, label]) =>
              <button key={value} className={`filter-pill ${filter === value ? "selected" : ""}`} onClick={() => setFilter(value)}>{label}</button>
            )}
          </div><span className="result-count">{visibleCourts.length} lapangan tersedia</span></div>
          {loading ? <div className="empty-state">Memuat data lapangan...</div> :
            loadError ? <div className="empty-state">{loadError}</div> :
            <div className="court-grid">{visibleCourts.length ? visibleCourts.map(court => <CourtCard key={court.id} court={court} onBook={setSelectedCourt} />) : <div className="empty-state">Lapangan tidak ditemukan.</div>}</div>}
        </section>
        <HowItWorks />
        <section className="cta-section"><div><div className="eyebrow">SIAP MAIN HARI INI?</div><h2>Jangan cuma wacana.<br /><em>Gas booking!</em></h2></div><a className="btn btn-light" href="#lapangan">Temukan lapangan ↗</a></section>
      </main>
      <Footer />
      {selectedCourt && <BookingModal court={selectedCourt} user={user} onClose={() => setSelectedCourt(null)} onSubmit={handleBooking} />}
      {showAuth && <AuthModal onClose={() => setShowAuth(false)} onAuth={handleAuth} />}
      {showHistory && user && <HistoryModal user={user} onClose={() => setShowHistory(false)} loadBookings={loadBookings} />}
      {paymentResult && <div className="modal-backdrop"><section className="modal payment-result"><div className="eyebrow">STATUS TRANSAKSI</div><h2>{paymentResult.payment_status === "paid" ? "Pembayaran Berhasil!" : paymentResult.error ? "Status belum tersedia" : "Pembayaran " + (paymentResult.payment_status || "diproses")}</h2>{paymentResult.booking_code && <><p className="muted">Kode booking: <b>{paymentResult.booking_code}</b></p><p>{paymentResult.court_name} · {paymentResult.booking_date} · {String(paymentResult.start_time).slice(0,5)}</p><p><b>{money(paymentResult.total_price)}</b></p></>}{paymentResult.payment_status !== "paid" && !paymentResult.error && <p className="muted">Jika kamu sudah membayar, tunggu sebentar lalu muat ulang halaman ini. Status akan berubah setelah notifikasi resmi dari Midtrans diterima.</p>}<button className="btn btn-green full" onClick={()=>setPaymentResult(null)}>Tutup</button></section></div>}
      {notice && <div className="toast" role="status">{notice}</div>}
    </>
  );
}

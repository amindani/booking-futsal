import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "./lib/supabase";
import Header from "./components/Header";
import Hero from "./components/Hero";
import SearchBar from "./components/SearchBar";
import CourtCard from "./components/CourtCard";
import BookingModal from "./components/BookingModal";
import AuthModal from "./components/AuthModal";
import HistoryModal from "./components/HistoryModal";
import Footer from "./components/Footer";

const money = value => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(value);

function HowItWorks() {
  const steps = [
    ["01", "⌕", "Pilih lapangan", "Cari lokasi dan lapangan yang paling pas untuk timmu."],
    ["02", "▦", "Tentukan jadwal", "Pilih tanggal dan jam bermain sesuai rencana tim."],
    ["03", "✓", "Konfirmasi booking", "Isi data pemesan dan simpan bukti booking-mu."]
  ];
  return <section className="how-section" id="cara-kerja"><div className="how-heading"><div className="eyebrow">SEMUDAH ITU</div><h2>Tiga langkah, langsung <em>main.</em></h2></div><div className="steps">{steps.map(([no, icon, title, desc]) => <article key={no}><span className="step-no">{no}</span><div className="step-icon">{icon}</div><h3>{title}</h3><p>{desc}</p></article>)}</div></section>;
}

export default function App() {
  const [courts, setCourts] = useState([]);
  const [user, setUser] = useState(null);
  const [filter, setFilter] = useState("all");
  const [area, setArea] = useState("");
  const [date, setDate] = useState("");
  const [selectedCourt, setSelectedCourt] = useState(null);
  const [showAuth, setShowAuth] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState("");
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    let mounted = true;
    const loadInitialData = async () => {
      const [{ data: authData }, { data, error }] = await Promise.all([
        supabase.auth.getUser(),
        supabase.from("courts").select("*").eq("is_active", true).order("name")
      ]);
      if (!mounted) return;
      setUser(authData?.user || null);
      if (error) setLoadError("Data lapangan belum dapat dimuat. Periksa koneksi dan pengaturan Supabase.");
      else setCourts(data || []);
      setLoading(false);
    };
    loadInitialData();
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => setUser(session?.user || null));
    return () => { mounted = false; listener.subscription.unsubscribe(); };
  }, []);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(""), 3200);
    return () => window.clearTimeout(timer);
  }, [notice]);

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
    if (user.app_metadata?.role === "admin") {
      setNotice("Akun admin terdeteksi. Halaman dashboard admin belum termasuk versi React ini.");
      return;
    }
    const { error } = await supabase.auth.signOut();
    if (error) setNotice(error.message);
    else { setUser(null); setNotice("Berhasil keluar."); }
  };

  const handleBookings = () => {
    if (!user) { setShowAuth(true); setNotice("Masuk terlebih dahulu untuk melihat booking."); return; }
    setShowHistory(true);
  };

  const handleBooking = async form => {
    if (!user) { setSelectedCourt(null); setShowAuth(true); throw new Error("Silakan masuk terlebih dahulu sebelum melakukan booking."); }
    const { error: profileError } = await supabase.from("profiles").update({
      full_name: form.name, phone: form.phone, updated_at: new Date().toISOString()
    }).eq("id", user.id);
    if (profileError) throw profileError;

    const bookingCode = "LF-" + Date.now().toString(36).toUpperCase();
    const { error } = await supabase.from("bookings").insert({
      booking_code: bookingCode, user_id: user.id, court_id: selectedCourt.id,
      booking_date: form.date, start_time: form.time, duration_hours: form.duration,
      total_price: form.total
    });
    if (error) throw error;
    setSelectedCourt(null);
    setNotice("Booking berhasil disimpan. Kode: " + bookingCode);
  };

  const loadBookings = useCallback(async () => {
    const { data, error } = await supabase.from("bookings")
      .select("id,booking_code,booking_date,start_time,duration_hours,total_price,status,courts(name)")
      .eq("user_id", user.id).order("created_at", { ascending: false });
    if (error) throw error;
    return data || [];
  }, [user]);

  const search = () => document.getElementById("lapangan")?.scrollIntoView({ behavior: "smooth" });

  return (
    <>
      <Header user={user} onLogin={handleLoginButton} onBookings={handleBookings} />
      <main>
        <Hero />
        <SearchBar area={area} setArea={setArea} date={date} setDate={setDate} onSearch={search} />
        <section className="section courts-section" id="lapangan">
          <div className="section-heading"><div><div className="eyebrow">PILIH TEMPAT BERMAIN</div><h2>Lapangan pilihan <em>buatmu.</em></h2><p>Tempat nyaman, fasilitas lengkap, tinggal ajak teman satu tim.</p></div><a className="plain-link" href="#lapangan">Lihat semua ↗</a></div>
          <div className="filter-row"><div className="filter-pills">
            {[["all", "Semua"], ["vinyl", "Vinyl"], ["rumput", "Rumput sintetis"], ["interlock", "Interlock"]].map(([value, label]) =>
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
      {notice && <div className="toast" role="status">{notice}</div>}
    </>
  );
}
import { useEffect, useMemo, useState } from "react";
import { X, ArrowRight } from "lucide-react";

const money = value => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(value);
const today = () => {
  const now = new Date();
  return [now.getFullYear(), String(now.getMonth() + 1).padStart(2, "0"), String(now.getDate()).padStart(2, "0")].join("-");
};

export default function BookingModal({ court, onClose, onSubmit, user }) {
  const [form, setForm] = useState({ name: user?.user_metadata?.full_name || "", phone: user?.user_metadata?.phone || "", date: today(), time: "", duration: "1" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const times = useMemo(() => {
    if (!court) return [];
    const start = Number(String(court.opening_time).slice(0, 2));
    const end = Number(String(court.closing_time).slice(0, 2));
    return Array.from({ length: Math.max(0, end - start) }, (_, i) => `${String(start + i).padStart(2, "0")}:00`);
  }, [court]);

  useEffect(() => {
    if (times.length) setForm(v => ({ ...v, time: times[0] }));
  }, [times]);

  if (!court) return null;
  const total = Number(court.price_per_hour) * Number(form.duration);
  const change = e => setForm(v => ({ ...v, [e.target.name]: e.target.value }));

  const submit = async e => {
    e.preventDefault();
    setBusy(true); setError("");
    try {
      await onSubmit({ ...form, duration: Number(form.duration), total });
    } catch (err) {
      setError(err.message || "Booking belum berhasil. Coba lagi.");
    } finally { setBusy(false); }
  };

  return (
    <div className="modal-backdrop" onMouseDown={e => e.target === e.currentTarget && onClose()}>
      <section className="modal" role="dialog" aria-modal="true" aria-labelledby="bookingTitle">
        <button className="modal-close" onClick={onClose} aria-label="Tutup"><X /></button>
        <div className="eyebrow">AMANKAN JADWALMU</div>
        <h2 id="bookingTitle">Booking <em>lapangan.</em></h2>
        <div className="selected-court">{court.name}<small>{court.area} · {money(court.price_per_hour)} / jam</small></div>
        <form onSubmit={submit}>
          <label>Nama pemesan<input name="name" value={form.name} onChange={change} placeholder="Nama lengkap" required /></label>
          <label>Nomor WhatsApp<input name="phone" value={form.phone} onChange={change} type="tel" placeholder="08xxxxxxxxxx" pattern="[0-9+ -]{9,16}" required /></label>
          <div className="form-grid">
            <label>Tanggal<input name="date" type="date" min={today()} value={form.date} onChange={change} required /></label>
            <label>Jam bermain<select name="time" value={form.time} onChange={change}>{times.map(t => <option key={t} value={t}>{t} WIB</option>)}</select></label>
          </div>
          <label>Durasi<select name="duration" value={form.duration} onChange={change}><option value="1">1 jam</option><option value="2">2 jam</option><option value="3">3 jam</option></select></label>
          <div className="price-line"><span>Estimasi biaya</span><b>{money(total)}</b></div>
          {error && <p className="form-error">{error}</p>}
          <button className="btn btn-green full" type="submit" disabled={busy}>{busy ? "Memproses..." : "Konfirmasi Booking"} <ArrowRight size={15} /></button>
          <small className="form-note">Booking tersimpan ke database. Pembayaran online belum tersedia.</small>
        </form>
      </section>
    </div>
  );
}
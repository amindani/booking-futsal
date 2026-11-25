import { useEffect, useState } from "react";
import { X } from "lucide-react";

const money = value => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(value);

export default function HistoryModal({ user, onClose, loadBookings }) {
  const [items, setItems] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    loadBookings().then(data => { if (active) setItems(data); })
      .catch(err => { if (active) setError(err.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [loadBookings]);

  return (
    <div className="modal-backdrop" onMouseDown={e => e.target === e.currentTarget && onClose()}>
      <section className="modal history-modal" role="dialog" aria-modal="true" aria-labelledby="historyTitle">
        <button className="modal-close" onClick={onClose} aria-label="Tutup"><X /></button>
        <div className="eyebrow">RIWAYAT PEMESANAN</div>
        <h2 id="historyTitle">Booking <em>saya.</em></h2>
        {loading ? <p className="muted">Memuat riwayat...</p> : error ? <p className="form-error">{error}</p> : items.length ? items.map(item => (
          <div className="history-item" key={item.id}>
            <div><b>{item.courts?.name || "Lapangan"}</b><small>{item.booking_date} · {String(item.start_time).slice(0, 5)} · {item.duration_hours} jam<br />{item.booking_code}<br />{money(item.total_price)}</small></div>
            <span className={`status status-${item.status}`}>{item.status}</span>
          </div>
        )) : <p className="muted">Belum ada booking untuk akun {user?.email}.</p>}
      </section>
    </div>
  );
}
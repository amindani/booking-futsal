import { MapPin, Clock, ArrowUpRight } from "lucide-react";

const money = value => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(value);

export default function CourtCard({ court, onBook }) {
  return (
    <article className="court-card">
      <div className="court-image">
        <img src={court.image_url || "https://images.unsplash.com/photo-1526232761682-d26e03ac148e?auto=format&fit=crop&w=900&q=80"} alt={court.name} />
        <span className="court-tag">{court.surface}</span>
      </div>
      <div className="court-body">
        <h3>{court.name}</h3>
        <div className="court-location"><MapPin size={13} /> {court.area}, Cirebon</div>
        <p className="court-description">{court.description || "Lapangan futsal nyaman untuk bermain bersama tim."}</p>
        <div className="court-meta"><span><Clock size={13} /> {String(court.opening_time).slice(0, 5)} – {String(court.closing_time).slice(0, 5)}</span></div>
        <div className="court-bottom">
          <div className="price"><strong>{money(court.price_per_hour)}</strong><small> / jam</small></div>
          <button className="book-btn" onClick={() => onBook(court)}>Pilih jadwal <ArrowUpRight size={14} /></button>
        </div>
      </div>
    </article>
  );
}
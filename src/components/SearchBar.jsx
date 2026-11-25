import { Search } from "lucide-react";

export default function SearchBar({ area, setArea, date, setDate, onSearch }) {
  return (
    <section className="search-strip" aria-label="Pencarian lapangan">
      <div className="search-intro"><span className="search-icon"><Search size={23} /></span><div><b>Temukan lapangan</b><small>Mulai dari lokasi dan jadwalmu</small></div></div>
      <div className="search-field">
        <label htmlFor="locationFilter">AREA / LOKASI</label>
        <select id="locationFilter" value={area} onChange={e => setArea(e.target.value)}>
          <option value="">Semua area</option><option>Kesambi</option><option>Kejaksan</option><option>Sumber</option><option>Talun</option>
        </select>
      </div>
      <div className="search-field">
        <label htmlFor="dateFilter">TANGGAL MAIN</label>
        <input id="dateFilter" type="date" min={new Date().toLocaleDateString("en-CA")} value={date} onChange={e => setDate(e.target.value)} />
      </div>
      <button className="btn btn-dark search-button" onClick={onSearch}>Cari Lapangan <span>→</span></button>
    </section>
  );
}
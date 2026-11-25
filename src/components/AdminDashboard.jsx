import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, RefreshCw, Plus, Pencil, Trash2, X, Save } from "lucide-react";
import { supabase } from "../lib/supabase";

const money = value => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(value);
const emptyCourt = { name:"", area:"", address:"", surface:"vinyl", description:"", image_url:"", price_per_hour:100000, opening_time:"08:00", closing_time:"23:00", is_active:true, operational_status:"available" };

export default function AdminDashboard({ onBack, onNotice }) {
  const [tab, setTab] = useState("bookings");
  const [bookings, setBookings] = useState([]);
  const [courts, setCourts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true); setError("");
    const [b, c] = await Promise.all([
      supabase.from("bookings").select("*,courts(name,area)").order("created_at", { ascending:false }).limit(200),
      supabase.from("courts").select("*").order("name")
    ]);
    if (b.error || c.error) setError(b.error?.message || c.error?.message || "Data gagal dimuat. Pastikan akun memiliki role admin.");
    setBookings(b.data || []); setCourts(c.data || []); setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const saveCourt = async e => {
    e.preventDefault(); setSaving(true); setError("");
    const payload = { ...editing, price_per_hour:Number(editing.price_per_hour) };
    const result = payload.id
      ? await supabase.from("courts").update(payload).eq("id", payload.id)
      : await supabase.from("courts").insert(payload);
    setSaving(false);
    if (result.error) { setError(result.error.message); return; }
    setEditing(null); onNotice("Data lapangan berhasil disimpan."); load();
  };

  const deleteCourt = async court => {
    if (!window.confirm("Nonaktifkan lapangan " + court.name + "? Data booking lama tetap dipertahankan.")) return;
    const { error } = await supabase.from("courts").update({ is_active:false }).eq("id", court.id);
    if (error) setError(error.message); else { onNotice("Lapangan dinonaktifkan."); load(); }
  };

  const updateCourt = async (court, patch) => {\n    const { error } = await supabase.from("courts").update(patch).eq("id", court.id);\n    if (error) setError(error.message); else { onNotice("Status lapangan diperbarui."); load(); }\n  };\n\n  const updateBooking = async (booking, patch) => {
    const { error } = await supabase.from("bookings").update(patch).eq("id", booking.id);
    if (error) setError(error.message); else { onNotice("Status booking diperbarui."); load(); }
  };

  return <main className="admin-page">
    <div className="admin-top"><button className="plain-link" onClick={onBack}><ArrowLeft size={16}/> Kembali ke website</button><button className="btn btn-dark btn-small" onClick={load}><RefreshCw size={14}/> Refresh</button></div>
    <div className="admin-heading"><div className="eyebrow">PANEL PENGELOLAAN</div><h1>Dashboard <em>Admin.</em></h1><p>Kelola lapangan, jadwal, dan transaksi booking dari satu tempat.</p></div>
    <div className="admin-stats"><article><small>Total lapangan</small><b>{courts.length}</b></article><article><small>Total booking</small><b>{bookings.length}</b></article><article><small>Menunggu pembayaran</small><b>{bookings.filter(x=>x.payment_status==="pending").length}</b></article><article><small>Pembayaran lunas</small><b>{bookings.filter(x=>x.payment_status==="paid").length}</b></article></div>
    <div className="admin-tabs"><button className={tab==="bookings"?"active":""} onClick={()=>setTab("bookings")}>Pemesanan</button><button className={tab==="courts"?"active":""} onClick={()=>setTab("courts")}>Kelola lapangan</button></div>
    {error && <p className="form-error">{error}</p>}
    {loading ? <div className="empty-state">Memuat data dashboard...</div> : tab==="bookings" ? <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Kode / Pemesan</th><th>Lapangan & jadwal</th><th>Total</th><th>Pembayaran</th><th>Status booking</th></tr></thead><tbody>{bookings.map(b=><tr key={b.id}><td><b>{b.booking_code}</b><small>{b.customer_name || "Pelanggan akun"} · {b.customer_phone || "—"}</small></td><td>{b.courts?.name || "Lapangan"}<small>{b.booking_date} · {String(b.start_time).slice(0,5)} · {b.duration_hours} jam</small></td><td>{money(b.total_price)}</td><td><span className={"status status-"+b.payment_status}>{b.payment_status || "unpaid"}</span></td><td><select value={b.status} onChange={e=>updateBooking(b,{status:e.target.value})}><option value="pending">Pending</option><option value="confirmed">Confirmed</option><option value="cancelled">Cancelled</option><option value="completed">Completed</option></select></td></tr>)}</tbody></table>{!bookings.length && <div className="empty-state">Belum ada pemesanan.</div>}</div> :
    <div className="admin-courts"><div className="admin-list-head"><h2>Daftar lapangan</h2><button className="btn btn-green btn-small" onClick={()=>setEditing({...emptyCourt})}><Plus size={15}/> Tambah lapangan</button></div>{courts.map(c=><article className="admin-court" key={c.id}><img src={c.image_url || "https://images.unsplash.com/photo-1526232761682-d26e03ac148e?auto=format&fit=crop&w=300&q=70"} alt=""/><div className="admin-court-info"><b>{c.name}</b><small>{c.area} · {money(c.price_per_hour)}/jam · {c.is_active?"Aktif":"Nonaktif"}</small><select value={c.operational_status || "available"} onChange={e=>updateCourt(c,{operational_status:e.target.value})}><option value="available">Tersedia</option><option value="occupied">Sedang dipakai</option><option value="maintenance">Perawatan</option></select></div><button className="icon-btn" title="Edit" onClick={()=>setEditing({...c})}><Pencil size={16}/></button><button className="icon-btn" title="Nonaktifkan" onClick={()=>deleteCourt(c)}><Trash2 size={16}/></button></article>)}</div>}
    {editing && <div className="modal-backdrop"><section className="modal admin-edit-modal"><button className="modal-close" onClick={()=>setEditing(null)}><X/></button><div className="eyebrow">PENGATURAN LAPANGAN</div><h2>{editing.id?"Edit":"Tambah"} <em>lapangan.</em></h2><form onSubmit={saveCourt}><label>Nama lapangan<input required value={editing.name} onChange={e=>setEditing({...editing,name:e.target.value})}/></label><div className="form-grid"><label>Area<input required value={editing.area} onChange={e=>setEditing({...editing,area:e.target.value})}/></label><label>Jenis<select value={editing.surface} onChange={e=>setEditing({...editing,surface:e.target.value})}><option value="vinyl">Vinyl</option><option value="rumput">Rumput</option><option value="interlock">Interlock</option></select></label></div><label>Alamat<input value={editing.address||""} onChange={e=>setEditing({...editing,address:e.target.value})}/></label><label>URL foto lapangan<input type="url" placeholder="https://..." value={editing.image_url||""} onChange={e=>setEditing({...editing,image_url:e.target.value})}/></label><label>Deskripsi<textarea rows="3" value={editing.description||""} onChange={e=>setEditing({...editing,description:e.target.value})}/></label><div className="form-grid"><label>Harga per jam<input type="number" min="1" required value={editing.price_per_hour} onChange={e=>setEditing({...editing,price_per_hour:e.target.value})}/></label><label>Status<select value={editing.operational_status||"available"} onChange={e=>setEditing({...editing,operational_status:e.target.value})}><option value="available">Tersedia</option><option value="occupied">Sedang dipakai</option><option value="maintenance">Perawatan</option></select></label></div><div className="form-grid"><label>Buka<input type="time" value={String(editing.opening_time).slice(0,5)} onChange={e=>setEditing({...editing,opening_time:e.target.value})}/></label><label>Tutup<input type="time" value={String(editing.closing_time).slice(0,5)} onChange={e=>setEditing({...editing,closing_time:e.target.value})}/></label></div><label className="admin-check"><input type="checkbox" checked={!!editing.is_active} onChange={e=>setEditing({...editing,is_active:e.target.checked})}/> Tampilkan di website</label><button className="btn btn-green full" disabled={saving}>{saving?"Menyimpan...":"Simpan perubahan"} <Save size={15}/></button></form></section></div>}
  </main>;
}

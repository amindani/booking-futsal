import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowLeft, RefreshCw, Plus, Pencil, Trash2, X, Save, Search, ImagePlus, UploadCloud, CalendarDays, Clock3, MapPin, CheckCircle2 } from "lucide-react";
import { supabase } from "../lib/supabase";

const money = value => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(Number(value || 0));
const BUCKET = "court-images";
const FALLBACK_IMAGE = "https://images.unsplash.com/photo-1526232761682-d26e03ac148e?auto=format&fit=crop&w=900&q=80";
const emptyCourt = { name:"", area:"", address:"", surface:"vinyl", description:"", image_url:"", price_per_hour:100000, opening_time:"08:00", closing_time:"23:00", is_active:true, operational_status:"available" };

function statusLabel(value) {
  const labels = { pending:"Menunggu", confirmed:"Dikonfirmasi", cancelled:"Dibatalkan", completed:"Selesai", unpaid:"Belum dibayar", paid:"Lunas", failed:"Gagal", expired:"Kedaluwarsa", refunded:"Dikembalikan" };
  return labels[value] || value || "—";
}

export default function AdminDashboard({ onBack, onNotice }) {
  const [tab, setTab] = useState("bookings");
  const [bookings, setBookings] = useState([]);
  const [courts, setCourts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState(null);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState("");
  const [saving, setSaving] = useState(false);
  const [query, setQuery] = useState("");
  const [bookingFilter, setBookingFilter] = useState("all");
  const [courtFilter, setCourtFilter] = useState("all");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    const [b, c] = await Promise.all([
      supabase.from("bookings").select("*,courts(name,area)").order("created_at", { ascending:false }).limit(300),
      supabase.from("courts").select("*").order("name")
    ]);
    if (b.error || c.error) setError((b.error && b.error.message) || (c.error && c.error.message) || "Data gagal dimuat. Pastikan akun memiliki role admin dan kebijakan database sudah benar.");
    setBookings(b.data || []);
    setCourts(c.data || []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!imageFile) { setImagePreview(""); return; }
    const url = URL.createObjectURL(imageFile);
    setImagePreview(url);
    return () => URL.revokeObjectURL(url);
  }, [imageFile]);

  const openEditor = court => {
    setEditing(court ? { ...court } : { ...emptyCourt });
    setImageFile(null);
    setImagePreview("");
    setError("");
  };

  const uploadCourtImage = async file => {
    const extension = (file.name.split(".").pop() || "jpg").toLowerCase();
    const path = "courts/" + crypto.randomUUID() + "." + extension;
    const { error: uploadError } = await supabase.storage.from(BUCKET).upload(path, file, {
      cacheControl: "3600",
      contentType: file.type,
      upsert: false
    });
    if (uploadError) throw uploadError;
    const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
    return data.publicUrl;
  };

  const saveCourt = async e => {
    e.preventDefault();
    if (!editing) return;
    setSaving(true);
    setError("");
    try {
      let imageUrl = editing.image_url || "";
      if (imageFile) imageUrl = await uploadCourtImage(imageFile);
      const payload = {
        name: editing.name.trim(),
        area: editing.area.trim(),
        address: editing.address || "",
        surface: editing.surface,
        description: editing.description || "",
        image_url: imageUrl,
        price_per_hour: Number(editing.price_per_hour),
        opening_time: editing.opening_time,
        closing_time: editing.closing_time,
        is_active: !!editing.is_active,
        operational_status: editing.operational_status || "available"
      };
      const result = editing.id
        ? await supabase.from("courts").update(payload).eq("id", editing.id)
        : await supabase.from("courts").insert(payload);
      if (result.error) throw result.error;
      setEditing(null);
      setImageFile(null);
      onNotice("Data lapangan berhasil disimpan.");
      await load();
    } catch (err) {
      setError(err.message || "Gagal menyimpan data lapangan.");
    } finally {
      setSaving(false);
    }
  };

  const removeCourt = async court => {
    if (!window.confirm("Nonaktifkan lapangan " + court.name + "? Data booking lama tetap dipertahankan.")) return;
    const { error: updateError } = await supabase.from("courts").update({ is_active:false }).eq("id", court.id);
    if (updateError) setError(updateError.message);
    else { onNotice("Lapangan dinonaktifkan. Riwayat booking tetap aman."); load(); }
  };

  const updateCourt = async (court, patch) => {
    const { error: updateError } = await supabase.from("courts").update(patch).eq("id", court.id);
    if (updateError) setError(updateError.message);
    else { onNotice("Status lapangan diperbarui."); load(); }
  };

  const updateBooking = async (booking, patch) => {
    const { error: updateError } = await supabase.from("bookings").update(patch).eq("id", booking.id);
    if (updateError) setError(updateError.message);
    else { onNotice("Pemesanan berhasil diperbarui."); load(); }
  };

  const filteredBookings = useMemo(() => bookings.filter(b => {
    const search = query.toLowerCase();
    const matchesQuery = !search || [b.booking_code, b.customer_name, b.customer_phone, b.courts && b.courts.name].some(v => String(v || "").toLowerCase().includes(search));
    const matchesFilter = bookingFilter === "all" || (bookingFilter === "paid" ? b.payment_status === "paid" : bookingFilter === "pending" ? b.status === "pending" : b.status === bookingFilter);
    return matchesQuery && matchesFilter;
  }), [bookings, query, bookingFilter]);

  const filteredCourts = useMemo(() => courts.filter(c => {
    const matchesQuery = !query || [c.name, c.area, c.address].some(v => String(v || "").toLowerCase().includes(query.toLowerCase()));
    return matchesQuery && (courtFilter === "all" || (courtFilter === "active" ? c.is_active : !c.is_active));
  }), [courts, query, courtFilter]);

  const paidCount = bookings.filter(b => b.payment_status === "paid").length;
  const pendingCount = bookings.filter(b => b.status === "pending").length;
  const revenue = bookings.filter(b => b.payment_status === "paid").reduce((sum, b) => sum + Number(b.total_price || 0), 0);

  return <main className="admin-page">
    <div className="admin-top">
      <button className="plain-link" onClick={onBack}><ArrowLeft size={16}/> Kembali ke website</button>
      <button className="btn btn-dark btn-small" onClick={load}><RefreshCw size={14}/> Refresh data</button>
    </div>
    <div className="admin-heading">
      <div className="eyebrow">PANEL PENGELOLAAN LAPANGANIN</div>
      <h1>Dashboard <em>Admin.</em></h1>
      <p>Kelola operasional lapangan, pemesanan, dan pembayaran dari satu tempat.</p>
    </div>

    <div className="admin-stats">
      <article><span className="admin-stat-icon"><MapPin size={17}/></span><small>Total lapangan</small><b>{courts.length}</b><em>{courts.filter(c=>c.is_active).length} aktif ditampilkan</em></article>
      <article><span className="admin-stat-icon"><CalendarDays size={17}/></span><small>Total pemesanan</small><b>{bookings.length}</b><em>Data terbaru hingga 300 transaksi</em></article>
      <article><span className="admin-stat-icon"><Clock3 size={17}/></span><small>Menunggu konfirmasi</small><b>{pendingCount}</b><em>Perlu ditinjau admin</em></article>
      <article><span className="admin-stat-icon"><CheckCircle2 size={17}/></span><small>Pendapatan lunas</small><b>{money(revenue)}</b><em>{paidCount} transaksi berhasil</em></article>
    </div>

    <div className="admin-toolbar">
      <div className="admin-tabs">
        <button className={tab==="bookings"?"active":""} onClick={()=>{setTab("bookings");setQuery("");}}>Pemesanan <span>{bookings.length}</span></button>
        <button className={tab==="courts"?"active":""} onClick={()=>{setTab("courts");setQuery("");}}>Kelola lapangan <span>{courts.length}</span></button>
      </div>
      <label className="admin-search"><Search size={16}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder={tab==="bookings"?"Cari kode, nama, nomor...":"Cari nama atau area lapangan..."}/></label>
    </div>

    {error && <p className="form-error admin-error">{error}</p>}
    {loading ? <div className="empty-state">Memuat data dashboard...</div> : tab==="bookings" ? <>
      <div className="admin-filter-row">
        <div className="filter-pills">
          {[["all","Semua"],["pending","Menunggu"],["paid","Sudah dibayar"],["confirmed","Dikonfirmasi"],["completed","Selesai"],["cancelled","Dibatalkan"]].map(([value,label])=><button key={value} className={"filter-pill "+(bookingFilter===value?"selected":"")} onClick={()=>setBookingFilter(value)}>{label}</button>)}
        </div>
        <span className="result-count">{filteredBookings.length} transaksi</span>
      </div>
      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead><tr><th>PEMESAN</th><th>LAPANGAN & JADWAL</th><th>TOTAL</th><th>PEMBAYARAN</th><th>STATUS BOOKING</th></tr></thead>
          <tbody>{filteredBookings.map(b=><tr key={b.id}>
            <td><b>{b.customer_name || "Pelanggan akun"}</b><small>{b.booking_code || "—"}<br/>{b.customer_phone || "Nomor tidak tersedia"}</small></td>
            <td><b>{(b.courts && b.courts.name) || "Lapangan"}</b><small>{b.booking_date} · {String(b.start_time || "").slice(0,5)} · {b.duration_hours} jam</small></td>
            <td><b>{money(b.total_price)}</b></td>
            <td><span className={"status status-"+(b.payment_status || "unpaid")}>{statusLabel(b.payment_status || "unpaid")}</span></td>
            <td><select aria-label="Status pemesanan" value={b.status || "pending"} onChange={e=>updateBooking(b,{status:e.target.value})}><option value="pending">Menunggu</option><option value="confirmed">Dikonfirmasi</option><option value="cancelled">Dibatalkan</option><option value="completed">Selesai</option></select></td>
          </tr>)}</tbody>
        </table>
        {!filteredBookings.length && <div className="empty-state">Tidak ada pemesanan yang cocok dengan pencarian.</div>}
      </div>
    </> : <>
      <div className="admin-filter-row">
        <div className="filter-pills">
          {[["all","Semua"],["active","Aktif"],["inactive","Nonaktif"]].map(([value,label])=><button key={value} className={"filter-pill "+(courtFilter===value?"selected":"")} onClick={()=>setCourtFilter(value)}>{label}</button>)}
        </div>
        <button className="btn btn-green btn-small" onClick={()=>openEditor(null)}><Plus size={15}/> Tambah lapangan</button>
      </div>
      <div className="admin-courts">
        {filteredCourts.map(c=><article className="admin-court" key={c.id}>
          <div className="admin-court-photo"><img src={c.image_url || FALLBACK_IMAGE} alt={c.name}/><span className={c.is_active?"court-active":"court-inactive"}>{c.is_active?"Aktif":"Nonaktif"}</span></div>
          <div className="admin-court-info">
            <b>{c.name}</b><small><MapPin size={12}/> {c.area || "Area belum diisi"} · {money(c.price_per_hour)}/jam</small>
            <div className="admin-court-controls">
              <select aria-label="Status operasional" value={c.operational_status || "available"} onChange={e=>updateCourt(c,{operational_status:e.target.value})}>
                <option value="available">Tersedia</option><option value="occupied">Sedang dipakai</option><option value="maintenance">Perawatan</option>
              </select>
              <span className={"operational-pill operational-"+(c.operational_status || "available")}>{c.operational_status==="occupied"?"Sedang dipakai":c.operational_status==="maintenance"?"Perawatan":"Tersedia"}</span>
            </div>
          </div>
          <div className="admin-court-actions">
            <button className="icon-btn" title="Edit lapangan" onClick={()=>openEditor(c)}><Pencil size={16}/><span>Edit</span></button>
            {c.is_active && <button className="icon-btn danger" title="Nonaktifkan lapangan" onClick={()=>removeCourt(c)}><Trash2 size={16}/></button>}
            {!c.is_active && <button className="icon-btn" title="Aktifkan kembali" onClick={()=>updateCourt(c,{is_active:true})}><CheckCircle2 size={16}/><span>Aktifkan</span></button>}
          </div>
        </article>)}
        {!filteredCourts.length && <div className="empty-state">Lapangan tidak ditemukan.</div>}
      </div>
    </>}

    {editing && <div className="modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget&&!saving)setEditing(null);}}>
      <section className="modal admin-edit-modal">
        <button className="modal-close" onClick={()=>!saving&&setEditing(null)}><X/></button>
        <div className="eyebrow">PENGATURAN FASILITAS</div>
        <h2>{editing.id?"Edit":"Tambah"} <em>lapangan.</em></h2>
        <form onSubmit={saveCourt}>
          <div className="admin-upload-area">
            <div className="admin-image-preview"><img src={imagePreview || editing.image_url || FALLBACK_IMAGE} alt="Preview foto lapangan"/></div>
            <div className="admin-upload-copy">
              <b>Foto lapangan</b>
              <p>Pilih gambar dari perangkat kamu. Format JPG, PNG, atau WEBP, maksimal 5 MB.</p>
              <label className="admin-upload-button"><UploadCloud size={15}/> {imageFile?"Ganti gambar":"Pilih gambar"}<input type="file" accept="image/png,image/jpeg,image/webp" onChange={e=>{const f=e.target.files && e.target.files[0];if(!f)return;if(!["image/png","image/jpeg","image/webp"].includes(f.type)){setError("Format gambar harus PNG, JPG, atau WEBP.");e.target.value="";return;}if(f.size>5*1024*1024){setError("Ukuran gambar maksimal 5 MB.");e.target.value="";return;}setError("");setImageFile(f);}}/></label>
              {imageFile && <span className="admin-file-name">{imageFile.name}</span>}
              {(imageFile || editing.image_url) && <button type="button" className="admin-remove-image" onClick={()=>{setImageFile(null);setEditing({...editing,image_url:""});}}>Hapus foto yang dipilih</button>}
            </div>
          </div>
          <div className="form-grid">
            <label>Nama lapangan<input required value={editing.name} onChange={e=>setEditing({...editing,name:e.target.value})} placeholder="Contoh: Arena Futsal"/></label>
            <label>Area / Kecamatan<input required value={editing.area} onChange={e=>setEditing({...editing,area:e.target.value})} placeholder="Contoh: Talun"/></label>
          </div>
          <div className="form-grid">
            <label>Jenis permukaan<select value={editing.surface} onChange={e=>setEditing({...editing,surface:e.target.value})}><option value="vinyl">Vinyl</option><option value="rumput">Rumput sintetis</option><option value="interlock">Interlock</option></select></label>
            <label>Harga per jam<input type="number" min="1" required value={editing.price_per_hour} onChange={e=>setEditing({...editing,price_per_hour:e.target.value})}/></label>
          </div>
          <label>Alamat lengkap<input value={editing.address||""} onChange={e=>setEditing({...editing,address:e.target.value})} placeholder="Alamat lokasi lapangan"/></label>
          <label>Deskripsi<textarea rows="3" value={editing.description||""} onChange={e=>setEditing({...editing,description:e.target.value})} placeholder="Jelaskan fasilitas dan kondisi lapangan..."/></label>
          <div className="form-grid">
            <label>Jam buka<input type="time" value={String(editing.opening_time||"08:00").slice(0,5)} onChange={e=>setEditing({...editing,opening_time:e.target.value})}/></label>
            <label>Jam tutup<input type="time" value={String(editing.closing_time||"23:00").slice(0,5)} onChange={e=>setEditing({...editing,closing_time:e.target.value})}/></label>
          </div>
          <div className="form-grid">
            <label>Status operasional<select value={editing.operational_status||"available"} onChange={e=>setEditing({...editing,operational_status:e.target.value})}><option value="available">Tersedia</option><option value="occupied">Sedang dipakai</option><option value="maintenance">Perawatan</option></select></label>
            <label className="admin-active-toggle"><input type="checkbox" checked={!!editing.is_active} onChange={e=>setEditing({...editing,is_active:e.target.checked})}/> Tampilkan di website</label>
          </div>
          <button className="btn btn-green full admin-save-button" disabled={saving}>{saving?"Menyimpan data...":"Simpan perubahan"} <Save size={15}/></button>
        </form>
      </section>
    </div>}
  </main>;
}

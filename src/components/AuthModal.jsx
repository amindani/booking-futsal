import { useState } from "react";
import { X, ArrowRight } from "lucide-react";

export default function AuthModal({ onClose, onAuth }) {
  const [signup, setSignup] = useState(false);
  const [form, setForm] = useState({ full_name: "", phone: "", email: "", password: "" });
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const change = e => setForm(v => ({ ...v, [e.target.name]: e.target.value }));

  const submit = async e => {
    e.preventDefault(); setBusy(true); setMessage("");
    try {
      const result = await onAuth(signup, form);
      setMessage(result || (signup ? "Akun berhasil dibuat." : "Berhasil masuk."));
    } catch (err) { setMessage(err.message || "Autentikasi gagal."); }
    finally { setBusy(false); }
  };

  return (
    <div className="modal-backdrop" onMouseDown={e => e.target === e.currentTarget && onClose()}>
      <section className="modal auth-modal" role="dialog" aria-modal="true" aria-labelledby="authTitle">
        <button className="modal-close" onClick={onClose} aria-label="Tutup"><X /></button>
        <div className="eyebrow">AKUN LAPANGANIN</div>
        <h2 id="authTitle">{signup ? "Buat" : "Masuk"} <em>akun.</em></h2>
        <form onSubmit={submit}>
          {signup && <label>Nama lengkap<input name="full_name" value={form.full_name} onChange={change} placeholder="Nama lengkap" required /></label>}
          <label>Email<input name="email" type="email" value={form.email} onChange={change} required /></label>
          <label>Password<input name="password" type="password" minLength="6" value={form.password} onChange={change} required /></label>
          {signup && <label>Nomor WhatsApp<input name="phone" type="tel" value={form.phone} onChange={change} /></label>}
          <button className="btn btn-green full" disabled={busy}>{busy ? "Memproses..." : signup ? "Daftar" : "Masuk"} <ArrowRight size={15} /></button>
        </form>
        <p className="auth-switch">{signup ? "Sudah punya akun?" : "Belum punya akun?"} <button type="button" onClick={() => { setSignup(v => !v); setMessage(""); }}> {signup ? "Masuk" : "Daftar sekarang"}</button></p>
        {message && <p className="auth-message">{message}</p>}
      </section>
    </div>
  );
}
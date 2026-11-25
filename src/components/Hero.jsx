import { ArrowDown, ArrowUpRight, Check } from "lucide-react";

export default function Hero() {
  return (
    <section className="hero" id="beranda">
      <div className="hero-copy">
        <div className="eyebrow"><span className="live-dot" /> MAIN BARENG, GAK PAKE RIBET</div>
        <h1>Waktunya<br />turun ke <em>lapangan.</em></h1>
        <p>Temukan lapangan futsal favoritmu, pilih jadwal yang cocok, dan amankan slot bermain hanya dalam beberapa klik.</p>
        <div className="hero-actions">
          <a className="btn btn-green" href="#lapangan">Cari Lapangan <ArrowUpRight size={15} /></a>
          <a className="plain-link" href="#cara-kerja">Lihat cara booking <ArrowDown size={14} /></a>
        </div>
        <div className="hero-proof">
          <div className="avatar-stack"><i>R</i><i>A</i><i>D</i><i>+</i></div>
          <span><b>Booking lebih praktis</b> untuk timmu</span>
        </div>
      </div>
      <div className="hero-visual">
        <img src="https://images.unsplash.com/photo-1574629810360-7efbbe195018?auto=format&fit=crop&w=1200&q=85" alt="Lapangan sepak bola hijau" />
        <div className="floating-card"><span className="floating-icon"><Check size={17} /></span><div><b>Booking lebih praktis</b><small>Pilih jadwal langsung secara online</small></div></div>
        <div className="visual-caption"><span>01 / 03</span><span>PLAY YOUR GAME</span></div>
      </div>
    </section>
  );
}
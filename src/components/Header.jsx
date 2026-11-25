import { useState } from "react";
import { Menu, X, ArrowUpRight } from "lucide-react";

export default function Header({ user, onLogin, onBookings }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const admin = user?.app_metadata?.role === "admin";

  return (
    <header className="site-header">
      <a className="brand" href="#beranda" onClick={() => setMenuOpen(false)}>
        <span className="brand-mark">L</span>
        <span>lapangan<span className="brand-dot">in.</span></span>
      </a>
      <nav className={`main-nav ${menuOpen ? "open" : ""}`}>
        <a href="#beranda" onClick={() => setMenuOpen(false)}>Beranda</a>
        <a href="#lapangan" onClick={() => setMenuOpen(false)}>Cari Lapangan</a>
        <a href="#cara-kerja" onClick={() => setMenuOpen(false)}>Cara Kerja</a>
      </nav>
      <div className="header-actions">
        <button className="text-button" onClick={onBookings}>Booking Saya</button>
        <button className="btn btn-dark btn-small" onClick={onLogin}>
          {user ? (admin ? "Dashboard Admin" : "Akun saya") : "Masuk"} <ArrowUpRight size={14} />
        </button>
        <button className="menu-toggle" aria-label="Toggle menu" onClick={() => setMenuOpen(v => !v)}>
          {menuOpen ? <X /> : <Menu />}
        </button>
      </div>
    </header>
  );
}
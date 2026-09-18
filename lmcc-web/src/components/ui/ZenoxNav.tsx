import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Camera, Scale, History, Menu, X, ChevronRight } from 'lucide-react';

interface ZenoxNavProps {
  onOpenHowItWorks?: () => void;
}

export const ZenoxNav: React.FC<ZenoxNavProps> = ({ onOpenHowItWorks }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const scrollToSection = (id: string) => {
    setMobileMenuOpen(false);
    if (location.pathname !== '/') {
      navigate(`/#${id}`);
      return;
    }
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <header className="sticky top-3 sm:top-5 z-50 w-full px-4 sm:px-6 max-w-6xl mx-auto">
      <nav className="relative flex items-center justify-between px-4 sm:px-6 py-3 rounded-full bg-slate-950/80 border border-white/10 backdrop-blur-2xl shadow-[0_10px_35px_rgba(0,0,0,0.5)]">
        {/* Brand */}
        <div
          onClick={() => navigate('/')}
          className="flex items-center gap-2.5 cursor-pointer group"
        >
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-emerald-500/20 to-sky-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 group-hover:border-emerald-400 transition">
            <Scale className="w-4 h-4" />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-base font-black tracking-tight text-white">LMCC</span>
            <span className="hidden sm:inline text-[9px] font-mono font-bold bg-white/10 text-emerald-300 border border-white/10 px-2 py-0.5 rounded-full uppercase">
              SIH26034
            </span>
          </div>
        </div>

        {/* Desktop Menu Links */}
        <div className="hidden md:flex items-center gap-7 text-xs font-mono tracking-wider text-slate-300 uppercase">
          <button
            type="button"
            onClick={() => navigate('/')}
            className="hover:text-white transition cursor-pointer"
          >
            Home
          </button>
          <button
            type="button"
            onClick={() => {
              if (onOpenHowItWorks) {
                onOpenHowItWorks();
              } else {
                scrollToSection('how-it-works');
              }
            }}
            className="hover:text-white transition cursor-pointer"
          >
            How It Works
          </button>
          <button
            type="button"
            onClick={() => scrollToSection('what-we-check')}
            className="hover:text-white transition cursor-pointer"
          >
            Rules
          </button>
          <button
            type="button"
            onClick={() => navigate('/history')}
            className="hover:text-white transition flex items-center gap-1.5 cursor-pointer"
          >
            <History className="w-3.5 h-3.5 text-emerald-400" />
            <span>History</span>
          </button>
        </div>

        {/* Desktop Right CTA */}
        <div className="hidden md:flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate('/scan')}
            className="flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold bg-white text-slate-950 hover:bg-slate-100 hover:shadow-[0_0_20px_rgba(255,255,255,0.35)] transition-all duration-200 active:scale-95 cursor-pointer"
          >
            <Camera className="w-3.5 h-3.5 text-slate-900" />
            <span>SCAN PRODUCT</span>
          </button>
        </div>

        {/* Mobile Hamburger Button */}
        <div className="flex items-center gap-2 md:hidden">
          <button
            type="button"
            onClick={() => navigate('/scan')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold bg-white text-slate-950"
          >
            <Camera className="w-3 h-3" />
            <span>SCAN</span>
          </button>

          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-xl text-slate-300 hover:text-white bg-white/5 border border-white/10"
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </nav>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden mt-2 p-5 rounded-3xl bg-slate-950/95 border border-white/10 backdrop-blur-3xl shadow-2xl space-y-3 text-sm font-mono tracking-wider">
          <button
            type="button"
            onClick={() => {
              setMobileMenuOpen(false);
              navigate('/');
            }}
            className="w-full text-left py-2 px-3 rounded-xl hover:bg-white/5 text-slate-200 flex items-center justify-between"
          >
            <span>HOME</span>
            <ChevronRight className="w-4 h-4 text-slate-500" />
          </button>
          <button
            type="button"
            onClick={() => {
              setMobileMenuOpen(false);
              if (onOpenHowItWorks) {
                onOpenHowItWorks();
              } else {
                scrollToSection('how-it-works');
              }
            }}
            className="w-full text-left py-2 px-3 rounded-xl hover:bg-white/5 text-slate-200 flex items-center justify-between"
          >
            <span>HOW IT WORKS</span>
            <ChevronRight className="w-4 h-4 text-slate-500" />
          </button>
          <button
            type="button"
            onClick={() => scrollToSection('what-we-check')}
            className="w-full text-left py-2 px-3 rounded-xl hover:bg-white/5 text-slate-200 flex items-center justify-between"
          >
            <span>WHAT WE CHECK</span>
            <ChevronRight className="w-4 h-4 text-slate-500" />
          </button>
          <button
            type="button"
            onClick={() => {
              setMobileMenuOpen(false);
              navigate('/history');
            }}
            className="w-full text-left py-2 px-3 rounded-xl hover:bg-white/5 text-slate-200 flex items-center justify-between"
          >
            <span>SCAN HISTORY</span>
            <ChevronRight className="w-4 h-4 text-slate-500" />
          </button>
          <button
            type="button"
            onClick={() => {
              setMobileMenuOpen(false);
              navigate('/scan');
            }}
            className="w-full mt-2 py-3 px-4 rounded-xl font-bold bg-gradient-to-r from-emerald-500 to-teal-500 text-white flex items-center justify-center gap-2"
          >
            <Camera className="w-4 h-4" />
            <span>START PRODUCT SCAN</span>
          </button>
        </div>
      )}
    </header>
  );
};

export default ZenoxNav;

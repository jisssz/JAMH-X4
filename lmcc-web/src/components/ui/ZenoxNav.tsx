import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Scale, Menu, X, ChevronRight } from 'lucide-react';

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
    <header className="sticky top-4 sm:top-6 z-50 w-full px-4 sm:px-6 max-w-5xl mx-auto">
      <nav className="relative flex items-center justify-between px-5 sm:px-7 py-3 rounded-full bg-[#080c16]/85 border border-white/[0.08] backdrop-blur-2xl shadow-[0_12px_40px_rgba(0,0,0,0.45)]">
        {/* Brand */}
        <div
          onClick={() => navigate('/')}
          className="flex items-center gap-2.5 cursor-pointer group"
        >
          <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 group-hover:border-emerald-400/40 transition">
            <Scale className="w-3.5 h-3.5" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-sm font-bold tracking-tight text-white font-sans">LMCC</span>
            <span className="hidden sm:inline text-xs font-display-italic text-slate-400">
              Legal Metrology
            </span>
          </div>
        </div>

        {/* Desktop Menu Links */}
        <div className="hidden md:flex items-center gap-7 text-xs font-sans font-medium text-slate-300">
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
            How it works
          </button>
          <button
            type="button"
            onClick={() => navigate('/rules')}
            className="hover:text-white transition cursor-pointer"
          >
            Rules
          </button>
          <button
            type="button"
            onClick={() => navigate('/history')}
            className="hover:text-white transition cursor-pointer"
          >
            History
          </button>
          <button
            type="button"
            onClick={() => navigate('/authority-dashboard')}
            className="hover:text-white transition cursor-pointer text-slate-300 hover:text-emerald-300"
          >
            Analytics
          </button>
        </div>

        {/* Desktop Right CTA */}
        <div className="hidden md:flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate('/scan')}
            className="flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold bg-white text-slate-950 hover:bg-slate-100 hover:shadow-[0_0_25px_rgba(255,255,255,0.25)] transition-all duration-200 active:scale-95 cursor-pointer font-sans"
          >
            <span>Scan product</span>
            <span className="text-slate-400 font-normal">→</span>
          </button>
        </div>

        {/* Mobile Hamburger Button */}
        <div className="flex items-center gap-2 md:hidden">
          <button
            type="button"
            onClick={() => navigate('/scan')}
            className="flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold bg-white text-slate-950 font-sans"
          >
            <span>Scan</span>
            <span>→</span>
          </button>

          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-1.5 rounded-full text-slate-300 hover:text-white bg-white/5 border border-white/10"
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </button>
        </div>
      </nav>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden mt-2 p-5 rounded-3xl bg-[#090d16]/95 border border-white/[0.08] backdrop-blur-3xl shadow-2xl space-y-2 text-sm font-sans">
          <button
            type="button"
            onClick={() => {
              setMobileMenuOpen(false);
              navigate('/');
            }}
            className="w-full text-left py-2.5 px-3 rounded-xl hover:bg-white/5 text-slate-200 flex items-center justify-between"
          >
            <span>Home</span>
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
            className="w-full text-left py-2.5 px-3 rounded-xl hover:bg-white/5 text-slate-200 flex items-center justify-between"
          >
            <span>How it works</span>
            <ChevronRight className="w-4 h-4 text-slate-500" />
          </button>
          <button
            type="button"
            onClick={() => {
              setMobileMenuOpen(false);
              scrollToSection('what-we-check');
            }}
            className="w-full text-left py-2.5 px-3 rounded-xl hover:bg-white/5 text-slate-200 flex items-center justify-between"
          >
            <span>Rules</span>
            <ChevronRight className="w-4 h-4 text-slate-500" />
          </button>
          <button
            type="button"
            onClick={() => {
              setMobileMenuOpen(false);
              navigate('/history');
            }}
            className="w-full text-left py-2.5 px-3 rounded-xl hover:bg-white/5 text-slate-200 flex items-center justify-between"
          >
            <span>History</span>
            <ChevronRight className="w-4 h-4 text-slate-500" />
          </button>
          <button
            type="button"
            onClick={() => {
              setMobileMenuOpen(false);
              navigate('/authority-dashboard');
            }}
            className="w-full text-left py-2.5 px-3 rounded-xl hover:bg-white/5 text-slate-200 flex items-center justify-between"
          >
            <span>Analytics</span>
            <ChevronRight className="w-4 h-4 text-slate-500" />
          </button>
          <div className="pt-2">
            <button
              type="button"
              onClick={() => {
                setMobileMenuOpen(false);
                navigate('/scan');
              }}
              className="w-full py-3 px-4 rounded-full font-semibold text-xs bg-white text-slate-950 flex items-center justify-center gap-2 shadow-lg"
            >
              <span>Scan product</span>
              <span>→</span>
            </button>
          </div>
        </div>
      )}
    </header>
  );
};

export default ZenoxNav;

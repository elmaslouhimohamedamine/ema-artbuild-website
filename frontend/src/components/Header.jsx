import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

const links = [
  ["Accueil", "accueil"], ["À propos", "apropos"], ["Services", "services"],
  ["Réalisations", "realisations"], ["Notre approche", "processus"], ["Contact", "contact"],
];

export default function Header({ t, locale, setLocale }) {
  const [open, setOpen] = useState(false);
  const goTo = (id) => { document.getElementById(id)?.scrollIntoView({ behavior: "smooth" }); setOpen(false); };
  return (
    <header className="site-header" data-testid="site-header">
      <button className="wordmark" data-testid="brand-home-button" onClick={() => goTo("accueil")} aria-label="EMA ARTBUILD — accueil"><img className="brand-logo" src="/images/ema-logo.png" alt="EMA ARTBUILD" /></button>
      <nav className="desktop-nav" aria-label="Navigation principale" data-testid="desktop-navigation">
        {links.map(([fallback, id], index) => <button key={id} data-testid={`header-nav-${id}`} onClick={() => goTo(id)}>{t.nav[index] || fallback}</button>)}
      </nav>
      <div className="header-actions">
        <div className="language-switch" data-testid="language-switcher" aria-label="Choisir la langue">
          {[["fr", "FR"], ["en", "EN"], ["ar", "عر"]].map(([key, label]) => <button key={key} data-testid={`language-${key}`} className={locale === key ? "active" : ""} onClick={() => setLocale(key)}>{label}</button>)}
        </div>
        <button className="header-quote" data-testid="header-quote-button" onClick={() => goTo("contact")}>{t.quote}</button>
        <button className="mobile-menu-trigger" data-testid="mobile-menu-button" onClick={() => setOpen(!open)} aria-expanded={open} aria-label="Ouvrir le menu"><span /><span /></button>
      </div>
      <AnimatePresence>
        {open && <motion.nav className="mobile-nav" data-testid="mobile-navigation" initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }} transition={{ duration: 0.28 }}>
          {links.map(([fallback, id], index) => <button key={id} data-testid={`mobile-nav-${id}`} onClick={() => goTo(id)}>{t.nav[index] || fallback}<span>↗</span></button>)}
          <button data-testid="mobile-quote-button" className="button button-dark" onClick={() => goTo("contact")}>{t.quote}</button>
        </motion.nav>}
      </AnimatePresence>
    </header>
  );
}
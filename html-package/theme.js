(() => {
  'use strict';
  const themes = [
    {name:'Cyberpunk Amber',primary:'#f59e0b',secondary:'#06b6d4',glowP:'rgba(245,158,11,0.40)',glowS:'rgba(6,182,212,0.40)',textP:'#0d0f10'},
    {name:'Synthwave Velvet',primary:'#e11d48',secondary:'#0ea5e9',glowP:'rgba(225,29,72,0.38)',glowS:'rgba(14,165,233,0.38)',textP:'#ffffff'},
    {name:'Neo Tokyo Jade',primary:'#10b981',secondary:'#a855f7',glowP:'rgba(16,185,129,0.38)',glowS:'rgba(168,85,247,0.38)',textP:'#ffffff'},
    {name:'Blade Runner Teal',primary:'#ea580c',secondary:'#14b8a6',glowP:'rgba(234,88,12,0.40)',glowS:'rgba(20,184,166,0.38)',textP:'#ffffff'},
    {name:'Akira Crimson',primary:'#e11d48',secondary:'#38bdf8',glowP:'rgba(225,29,72,0.38)',glowS:'rgba(56,189,248,0.38)',textP:'#ffffff'},
    {name:'Matrix Forest',primary:'#22c55e',secondary:'#0ea5e9',glowP:'rgba(34,197,94,0.38)',glowS:'rgba(14,165,233,0.38)',textP:'#0d0f10'},
    {name:'Hotline Sunset',primary:'#f43f5e',secondary:'#f59e0b',glowP:'rgba(244,63,94,0.38)',glowS:'rgba(245,158,11,0.38)',textP:'#ffffff'},
    {name:'Quantum Violet',primary:'#9333ea',secondary:'#0284c7',glowP:'rgba(147,51,234,0.38)',glowS:'rgba(2,132,199,0.38)',textP:'#ffffff'}
  ];
  try {
    const saved = sessionStorage.getItem('jang_neon_theme');
    const chosen = themes.find(theme => theme.name === saved) || themes[Math.floor(Math.random() * themes.length)];
    sessionStorage.setItem('jang_neon_theme', chosen.name);
    const root = document.documentElement;
    const values = {
      '--neon-primary': chosen.primary,
      '--neon-secondary': chosen.secondary,
      '--neon-primary-glow': chosen.glowP,
      '--neon-secondary-glow': chosen.glowS,
      '--neon-primary-text': chosen.textP,
      '--orange': chosen.primary,
      '--green': chosen.primary,
      '--xbox': chosen.secondary,
      '--accent-glow': chosen.glowP,
      '--cyan-glow': chosen.glowS
    };
    for (const [name, value] of Object.entries(values)) root.style.setProperty(name, value);
  } catch {}
})();

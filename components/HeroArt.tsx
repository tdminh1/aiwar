"use client";

import type { ComponentType } from "react";

// Hero art — abstract editorial illustrations for article thumbs and featured cards.
// All return JSX SVG that fills its container.

type HeroArtProps = {
  kind?: string | null;
};

const ART: Record<string, ComponentType<Record<string, never>>> = {
  aurora: () => (
    <svg viewBox="0 0 400 280" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg" style={{display:'block'}}>
      <defs>
        <linearGradient id="aurora-bg" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0" stopColor="#1a1a2e"/><stop offset="1" stopColor="#16213e"/>
        </linearGradient>
        <radialGradient id="aurora-1" cx="0.3" cy="0.5" r="0.6">
          <stop offset="0" stopColor="#D97757" stopOpacity="0.95"/><stop offset="1" stopColor="#D97757" stopOpacity="0"/>
        </radialGradient>
        <radialGradient id="aurora-2" cx="0.7" cy="0.6" r="0.5">
          <stop offset="0" stopColor="#FF6719" stopOpacity="0.8"/><stop offset="1" stopColor="#FF6719" stopOpacity="0"/>
        </radialGradient>
        <radialGradient id="aurora-3" cx="0.55" cy="0.3" r="0.4">
          <stop offset="0" stopColor="#FFD08E" stopOpacity="0.6"/><stop offset="1" stopColor="#FFD08E" stopOpacity="0"/>
        </radialGradient>
      </defs>
      <rect width="400" height="280" fill="url(#aurora-bg)"/>
      <rect width="400" height="280" fill="url(#aurora-1)"/>
      <rect width="400" height="280" fill="url(#aurora-2)"/>
      <rect width="400" height="280" fill="url(#aurora-3)"/>
      {Array.from({length: 40}).map((_,i)=>{
        const x = (i*97)%400, y = (i*53)%280, r = (i%5)*0.4+0.4;
        return <circle key={i} cx={x} cy={y} r={r} fill="white" opacity={0.5}/>;
      })}
    </svg>
  ),
  spiral: () => (
    <svg viewBox="0 0 400 280" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg" style={{display:'block'}}>
      <rect width="400" height="280" fill="#0a4a3e"/>
      <g transform="translate(200 140)">
        {Array.from({length: 80}).map((_,i)=>{
          const angle = i * 0.4;
          const r = i * 1.8;
          const x = Math.cos(angle) * r;
          const y = Math.sin(angle) * r;
          return <circle key={i} cx={x} cy={y} r={1 + i*0.05} fill="#10A37F" opacity={0.6 + (i/80)*0.4}/>;
        })}
        <circle cx="0" cy="0" r="22" fill="#10A37F"/>
        <circle cx="0" cy="0" r="36" fill="none" stroke="#10A37F" strokeWidth="1" opacity="0.5"/>
        <circle cx="0" cy="0" r="60" fill="none" stroke="#10A37F" strokeWidth="1" opacity="0.3"/>
      </g>
    </svg>
  ),
  grid: () => (
    <svg viewBox="0 0 400 280" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg" style={{display:'block'}}>
      <rect width="400" height="280" fill="#0e1a3a"/>
      <g opacity="0.9">
        {Array.from({length: 14}).map((_,row)=>(
          Array.from({length: 20}).map((_,col)=>{
            const x = col*20+10, y = row*20+10;
            const dist = Math.hypot(x-200, y-140);
            const opacity = Math.max(0, 1 - dist/180);
            const size = 2 + opacity*4;
            const colors = ['#4285F4','#9b72f5','#f9ab00'];
            const c = colors[(row+col)%3];
            return <circle key={row+'-'+col} cx={x} cy={y} r={size} fill={c} opacity={opacity*0.85}/>;
          })
        ))}
      </g>
      <circle cx="200" cy="140" r="40" fill="#fff" opacity="0.95"/>
      <text x="200" y="148" textAnchor="middle" fontFamily="Sora, sans-serif" fontWeight="700" fontSize="14" fill="#0e1a3a">G</text>
    </svg>
  ),
  shield: () => (
    <svg viewBox="0 0 400 280" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg" style={{display:'block'}}>
      <rect width="400" height="280" fill="#1a2e1e"/>
      <g transform="translate(200 140)" opacity="0.95">
        {[1,2,3,4].map(i=>(
          <path key={i} d={`M 0 ${-50-i*10} L ${36+i*8} ${-30-i*5} L ${36+i*8} ${20+i*4} Q ${36+i*8} ${30+i*8} 0 ${50+i*10} Q ${-36-i*8} ${30+i*8} ${-36-i*8} ${20+i*4} L ${-36-i*8} ${-30-i*5} Z`} fill="none" stroke="#86efac" strokeWidth="1" opacity={0.3/i}/>
        ))}
        <path d="M 0 -50 L 36 -30 L 36 20 Q 36 30 0 50 Q -36 30 -36 20 L -36 -30 Z" fill="#86efac" opacity="0.95"/>
        <path d="M -14 -2 L -4 10 L 18 -14" stroke="#1a2e1e" strokeWidth="4" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
      </g>
    </svg>
  ),
  capitol: () => (
    <svg viewBox="0 0 400 280" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg" style={{display:'block'}}>
      <rect width="400" height="280" fill="#2a3a5a"/>
      <g transform="translate(200 200)" stroke="#fff" strokeWidth="1.5" fill="none">
        <path d="M -90 0 L 90 0" />
        <path d="M -90 0 L -90 -30 L -70 -30 L -70 -90 L -60 -100 L -50 -90 L -50 -30 L -30 -30 L -30 -90 L -20 -100 L -10 -90 L -10 -30 L 10 -30 L 10 -90 L 20 -100 L 30 -90 L 30 -30 L 50 -30 L 50 -90 L 60 -100 L 70 -90 L 70 -30 L 90 -30 L 90 0" fill="#fff" opacity="0.95"/>
        <path d="M -60 -100 Q 0 -150 60 -100" fill="#fff" opacity="0.85"/>
        <circle cx="0" cy="-150" r="6" fill="#FFD08E"/>
      </g>
    </svg>
  ),
  helix: () => (
    <svg viewBox="0 0 400 280" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg" style={{display:'block'}}>
      <rect width="400" height="280" fill="#0a2a3a"/>
      <g transform="translate(200 140)">
        {Array.from({length: 24}).map((_,i)=>{
          const t = i / 24 * Math.PI * 4;
          const y = (i - 12) * 10;
          const x1 = Math.cos(t) * 40;
          const x2 = -x1;
          return (
            <g key={i}>
              <line x1={x1} y1={y} x2={x2} y2={y} stroke="#4285F4" strokeWidth="1.5" opacity={0.4 + Math.abs(Math.sin(t))*0.4}/>
              <circle cx={x1} cy={y} r="4" fill="#4285F4"/>
              <circle cx={x2} cy={y} r="4" fill="#9b72f5"/>
            </g>
          );
        })}
      </g>
    </svg>
  ),
  desktop: () => (
    <svg viewBox="0 0 400 280" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg" style={{display:'block'}}>
      <rect width="400" height="280" fill="#f3ede4"/>
      <rect x="60" y="50" width="280" height="180" rx="8" fill="#fff" stroke="#D97757" strokeWidth="1.5"/>
      <rect x="60" y="50" width="280" height="22" rx="8" fill="#D97757"/>
      <circle cx="74" cy="61" r="3" fill="#fff" opacity="0.7"/>
      <circle cx="86" cy="61" r="3" fill="#fff" opacity="0.7"/>
      <circle cx="98" cy="61" r="3" fill="#fff" opacity="0.7"/>
      <rect x="80" y="92" width="140" height="8" rx="2" fill="#2a2b2b"/>
      <rect x="80" y="108" width="180" height="6" rx="2" fill="#777"/>
      <rect x="80" y="120" width="160" height="6" rx="2" fill="#777"/>
      <rect x="80" y="140" width="80" height="28" rx="4" fill="#D97757"/>
      <text x="120" y="159" textAnchor="middle" fontFamily="Sora" fontSize="11" fontWeight="600" fill="#fff">Run</text>
      <g transform="translate(255 175)">
        <circle r="14" fill="#D97757" opacity="0.2"/>
        <circle r="8" fill="#D97757"/>
        <path d="M -3 -3 L 3 0 L -3 3 Z" fill="#fff"/>
      </g>
    </svg>
  ),
  lattice: () => (
    <svg viewBox="0 0 400 280" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg" style={{display:'block'}}>
      <rect width="400" height="280" fill="#1a1a1a"/>
      <g stroke="#10A37F" strokeWidth="0.8" fill="none" opacity="0.7">
        {Array.from({length: 12}).map((_,i)=>(
          <g key={i}>
            <line x1={50+i*30} y1="0" x2={50+i*30-40} y2="280"/>
            <line x1={i*30} y1="0" x2={i*30+60} y2="280"/>
          </g>
        ))}
      </g>
      <g transform="translate(200 140)">
        <circle r="50" fill="#10A37F" opacity="0.2"/>
        <circle r="30" fill="#10A37F" opacity="0.5"/>
        <circle r="14" fill="#10A37F"/>
        <text y="5" textAnchor="middle" fontFamily="JetBrains Mono" fontSize="11" fontWeight="700" fill="#1a1a1a">v3</text>
      </g>
    </svg>
  ),
  cube: () => (
    <svg viewBox="0 0 400 280" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg" style={{display:'block'}}>
      <rect width="400" height="280" fill="#1a2840"/>
      <g transform="translate(200 140)">
        <polygon points="0,-70 70,-30 70,40 0,80 -70,40 -70,-30" fill="#4285F4" opacity="0.3"/>
        <polygon points="0,-70 70,-30 0,10 -70,-30" fill="#4285F4" opacity="0.6"/>
        <polygon points="-70,-30 0,10 0,80 -70,40" fill="#4285F4" opacity="0.8"/>
        <polygon points="70,-30 0,10 0,80 70,40" fill="#9b72f5" opacity="0.9"/>
        <text y="-90" textAnchor="middle" fontFamily="Sora" fontWeight="700" fontSize="14" fill="#fff">27B</text>
      </g>
    </svg>
  ),
  bars: () => (
    <svg viewBox="0 0 400 280" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg" style={{display:'block'}}>
      <rect width="400" height="280" fill="#fdf8f3"/>
      <g transform="translate(40 230)">
        {[40, 80, 65, 110, 55, 140, 95, 75, 50, 35, 28, 20, 15].map((h,i)=>(
          <rect key={i} x={i*24} y={-h} width="18" height={h} rx="3" fill={i < 3 ? '#D97757' : '#2a2b2b'} opacity={i < 3 ? 1 : 0.85 - i*0.04}/>
        ))}
        <line x1="0" y1="0" x2="320" y2="0" stroke="#777" strokeWidth="1"/>
      </g>
      <text x="200" y="40" textAnchor="middle" fontFamily="Sora" fontSize="14" fontWeight="700" fill="#2a2b2b">Software · Writing · Analysis</text>
    </svg>
  ),
  code: () => (
    <svg viewBox="0 0 400 280" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg" style={{display:'block'}}>
      <rect width="400" height="280" fill="#0d1117"/>
      <g fontFamily="JetBrains Mono, monospace" fontSize="11">
        <text x="30" y="50" fill="#7ee787">{'{'}</text>
        <text x="50" y="70" fill="#79c0ff">{'"schema"'}</text>
        <text x="115" y="70" fill="#e6edf3">:</text>
        <text x="125" y="70" fill="#a5d6ff">{'"Article",'}</text>
        <text x="50" y="90" fill="#79c0ff">{'"strict"'}</text>
        <text x="110" y="90" fill="#e6edf3">:</text>
        <text x="120" y="90" fill="#ff7b72">true,</text>
        <text x="50" y="110" fill="#79c0ff">{'"properties"'}</text>
        <text x="135" y="110" fill="#e6edf3">: {'{'}</text>
        <text x="70" y="130" fill="#79c0ff">title</text>
        <text x="105" y="130" fill="#e6edf3">: string,</text>
        <text x="70" y="150" fill="#79c0ff">excerpt</text>
        <text x="120" y="150" fill="#e6edf3">: string,</text>
        <text x="70" y="170" fill="#79c0ff">published_at</text>
        <text x="160" y="170" fill="#e6edf3">: date</text>
        <text x="50" y="190" fill="#e6edf3">{'}'}</text>
        <text x="30" y="210" fill="#7ee787">{'}'}</text>
        <rect x="160" y="222" width="2" height="12" fill="#FF6719">
          <animate attributeName="opacity" values="1;0;1" dur="1s" repeatCount="indefinite"/>
        </rect>
      </g>
    </svg>
  ),
  eye: () => (
    <svg viewBox="0 0 400 280" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg" style={{display:'block'}}>
      <defs>
        <radialGradient id="iris" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#4285F4"/>
          <stop offset="0.7" stopColor="#9b72f5"/>
          <stop offset="1" stopColor="#1a1a3a"/>
        </radialGradient>
      </defs>
      <rect width="400" height="280" fill="#0a0a1f"/>
      <g transform="translate(200 140)">
        <path d="M -130 0 Q 0 -80 130 0 Q 0 80 -130 0 Z" fill="#fff" opacity="0.95"/>
        <circle r="55" fill="url(#iris)"/>
        <circle r="24" fill="#0a0a1f"/>
        <circle cx="-12" cy="-12" r="8" fill="#fff" opacity="0.9"/>
        <circle cx="14" cy="6" r="3" fill="#fff" opacity="0.7"/>
      </g>
    </svg>
  ),
  neurons: () => (
    <svg viewBox="0 0 400 280" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg" style={{display:'block'}}>
      <rect width="400" height="280" fill="#1a1626"/>
      <g>
        {Array.from({length: 30}).map((_,i)=>{
          const x = (i*73)%400, y = (i*131)%280;
          return <circle key={i} cx={x} cy={y} r="3" fill="#D97757" opacity={0.4 + (i%4)*0.15}/>;
        })}
        {Array.from({length: 25}).map((_,i)=>{
          const x1 = (i*73)%400, y1 = (i*131)%280;
          const x2 = ((i+3)*73)%400, y2 = ((i+3)*131)%280;
          return <line key={'l'+i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#D97757" strokeWidth="0.6" opacity="0.3"/>;
        })}
        <circle cx="200" cy="140" r="18" fill="#D97757" opacity="0.3"/>
        <circle cx="200" cy="140" r="8" fill="#D97757"/>
      </g>
    </svg>
  ),
  film: () => (
    <svg viewBox="0 0 400 280" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg" style={{display:'block'}}>
      <defs>
        <linearGradient id="film-bg" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0" stopColor="#2a1f3d"/><stop offset="1" stopColor="#0a0a1f"/>
        </linearGradient>
      </defs>
      <rect width="400" height="280" fill="url(#film-bg)"/>
      <g>
        <rect x="40" y="40" width="320" height="200" rx="6" fill="#000"/>
        <rect x="40" y="40" width="320" height="20" fill="#1a1a1a"/>
        <rect x="40" y="220" width="320" height="20" fill="#1a1a1a"/>
        {Array.from({length:8}).map((_,i)=>(
          <rect key={i} x={50+i*40} y="46" width="20" height="8" fill="#333"/>
        ))}
        {Array.from({length:8}).map((_,i)=>(
          <rect key={i} x={50+i*40} y="226" width="20" height="8" fill="#333"/>
        ))}
        <circle cx="200" cy="140" r="32" fill="rgba(255,255,255,0.95)"/>
        <polygon points="190,128 190,152 214,140" fill="#0a0a1f"/>
        <text x="200" y="195" textAnchor="middle" fontFamily="Sora" fontSize="11" fontWeight="600" fill="#777">02:00 · 1080p</text>
      </g>
    </svg>
  ),
  handshake: () => (
    <svg viewBox="0 0 400 280" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg" style={{display:'block'}}>
      <rect width="400" height="280" fill="#f0eee3"/>
      <g transform="translate(200 140)">
        <circle r="80" fill="#4285F4" opacity="0.12"/>
        <path d="M -70 0 L -20 -30 L 20 -30 L 70 0 L 20 30 L -20 30 Z" fill="#4285F4"/>
        <line x1="-70" y1="0" x2="70" y2="0" stroke="#fff" strokeWidth="3"/>
        <circle cx="-50" cy="0" r="5" fill="#fff"/>
        <circle cx="50" cy="0" r="5" fill="#fff"/>
      </g>
      <text x="200" y="240" textAnchor="middle" fontFamily="Sora" fontSize="11" fontWeight="600" fill="#777">DeepMind × UK AISI</text>
    </svg>
  ),
  star: () => (
    <svg viewBox="0 0 400 280" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg" style={{display:'block'}}>
      <rect width="400" height="280" fill="#fff7ed"/>
      <g transform="translate(200 140)">
        {[0, 60, 120, 180, 240, 300].map(a=>(
          <line key={a} x1="0" y1="0" x2={Math.cos(a*Math.PI/180)*80} y2={Math.sin(a*Math.PI/180)*80} stroke="#D97757" strokeWidth="6" strokeLinecap="round"/>
        ))}
        {[30, 90, 150, 210, 270, 330].map(a=>(
          <line key={a} x1="0" y1="0" x2={Math.cos(a*Math.PI/180)*60} y2={Math.sin(a*Math.PI/180)*60} stroke="#D97757" strokeWidth="5" strokeLinecap="round" opacity="0.85"/>
        ))}
        <circle r="14" fill="#D97757"/>
      </g>
    </svg>
  ),
};

export function HeroArt({ kind }: HeroArtProps) {
  const C = (kind ? ART[kind] : null) || ART.aurora;
  return <C />;
}

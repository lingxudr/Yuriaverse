'use client';
import { Moon, Sun } from 'lucide-react';
import { useEffect, useState } from 'react';
export function ThemeToggle(){const [dark,setDark]=useState(false); useEffect(()=>{const saved=localStorage.getItem('animesu:theme'); const d=saved?saved==='dark':false; setDark(d); document.documentElement.classList.toggle('dark',d)},[]); function toggle(){const n=!dark; setDark(n); document.documentElement.classList.toggle('dark',n); localStorage.setItem('animesu:theme',n?'dark':'light')} return <button className="icon-btn" onClick={toggle} aria-label="Toggle dark mode">{dark?<Sun size={19}/>:<Moon size={19}/>}</button>}

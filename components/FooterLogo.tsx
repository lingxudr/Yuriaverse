'use client';
import Image from 'next/image';
import { useState } from 'react';

export function FooterLogo(){
  const [failed,setFailed]=useState(false);
  return <div className="footer-brand-clean">
    <div className="footer-logo-box">
      {failed ? <span aria-label="YuriaVerse icon">✦</span> : <Image src="/brand/yuriaverse/avatar-v2.png" alt="YuriaVerse logo" width={64} height={64} loading="lazy" onError={()=>setFailed(true)}/>}    
    </div>
    <div className="footer-title-wrap"><b>YuriaVerse</b><small>ユリアバース</small><p>Anime Streaming Subtitle Indonesia.</p></div>
  </div>
}

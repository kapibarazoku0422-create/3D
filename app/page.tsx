"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type Hero = { name: string; role: string; hp: number; max: number; color: string; skill: string };
const heroes: Hero[] = [
  { name: "レイン", role: "黎明の剣士", hp: 842, max: 842, color: "#63d7ff", skill: "蒼天斬" },
  { name: "ミレイア", role: "星詠みの魔導士", hp: 580, max: 580, color: "#b995ff", skill: "星墜とし" },
  { name: "ガルド", role: "亡国の守護騎士", hp: 1100, max: 1100, color: "#ffb45f", skill: "鉄壁の誓い" },
  { name: "ユナ", role: "風渡りの狩人", hp: 690, max: 690, color: "#75e6a2", skill: "疾風連矢" },
];
const chapters = ["序章　灰の目覚め", "第一章　忘れられた王都", "第二章　月蝕の森", "第三章　機神の墓標", "第四章　蒼海を裂く舟", "第五章　竜の夢、星の記憶", "第六章　七つの国の戦火", "終章　世界の夜明け"];

function GameWorld({ attacking, hero }: { attacking: boolean; hero: Hero }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const pos = useRef({ x: 0, z: 0, a: 0 });
  const keys = useRef(new Set<string>());
  useEffect(() => {
    const down = (e: KeyboardEvent) => keys.current.add(e.key.toLowerCase());
    const up = (e: KeyboardEvent) => keys.current.delete(e.key.toLowerCase());
    addEventListener("keydown", down); addEventListener("keyup", up);
    return () => { removeEventListener("keydown", down); removeEventListener("keyup", up); };
  }, []);
  useEffect(() => {
    const c = canvas.current!; const ctx = c.getContext("2d")!; let frame = 0; let raf = 0;
    const draw = () => {
      const dpr = Math.min(devicePixelRatio, 2); const w = c.clientWidth, h = c.clientHeight;
      if (c.width !== w*dpr || c.height !== h*dpr) { c.width=w*dpr; c.height=h*dpr; }
      ctx.setTransform(dpr,0,0,dpr,0,0); frame++;
      const p=pos.current; if(keys.current.has("w"))p.z+=2;if(keys.current.has("s"))p.z-=2;if(keys.current.has("a"))p.x-=2;if(keys.current.has("d"))p.x+=2;p.a+=.008;
      const sky=ctx.createLinearGradient(0,0,0,h);sky.addColorStop(0,"#152d4a");sky.addColorStop(.48,"#385b72");sky.addColorStop(.49,"#90775a");sky.addColorStop(1,"#111c22");ctx.fillStyle=sky;ctx.fillRect(0,0,w,h);
      ctx.globalAlpha=.28;ctx.fillStyle="#e6d5aa";ctx.beginPath();ctx.arc(w*.72,h*.16,42,0,7);ctx.fill();ctx.globalAlpha=1;
      for(let i=0;i<9;i++){const x=((i*211+p.x*.12)% (w+220))-110;const y=h*.32+Math.sin(i*2.2)*45;ctx.fillStyle=i%2?"#1a2930":"#243841";ctx.beginPath();ctx.moveTo(x-110,h*.49);ctx.lineTo(x,y);ctx.lineTo(x+120,h*.49);ctx.fill();}
      ctx.strokeStyle="rgba(158,200,210,.2)";ctx.lineWidth=1;for(let i=0;i<18;i++){const yy=h*.51+i*i*2.2;ctx.beginPath();ctx.moveTo(0,yy);ctx.lineTo(w,yy);ctx.stroke()}for(let i=-10;i<11;i++){ctx.beginPath();ctx.moveTo(w/2+i*55+p.x%55,h*.5);ctx.lineTo(w/2+i*240+p.x%240,h);ctx.stroke()}
      const bx=w*.74-p.x*.15, by=h*.43;ctx.fillStyle="#314148";ctx.fillRect(bx-38,by-75,76,78);ctx.fillStyle="#d7a958";ctx.fillRect(bx-7,by-58,14,25);ctx.fillStyle="#222d32";ctx.beginPath();ctx.moveTo(bx-54,by-75);ctx.lineTo(bx,by-130);ctx.lineTo(bx+54,by-75);ctx.fill();
      const bob=Math.sin(frame*.09)*3;ctx.save();ctx.translate(w/2,h*.64+bob);ctx.fillStyle="rgba(0,0,0,.35)";ctx.beginPath();ctx.ellipse(0,74,43,12,0,0,7);ctx.fill();ctx.fillStyle=hero.color;ctx.beginPath();ctx.arc(0,-26,15,0,7);ctx.fill();ctx.fillStyle="#162b38";ctx.beginPath();ctx.moveTo(-20,-8);ctx.lineTo(22,-8);ctx.lineTo(32,65);ctx.lineTo(-30,65);ctx.fill();ctx.strokeStyle="#cddfe3";ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(17,5);ctx.lineTo(attacking?70:35,attacking?-35:52);ctx.stroke();ctx.restore();
      const ex=w*.64+Math.sin(frame*.02)*25;ctx.fillStyle="#522a2e";ctx.beginPath();ctx.arc(ex,h*.62,22,0,7);ctx.fill();ctx.fillStyle="#ff5b55";ctx.fillRect(ex-10,h*.61-5,5,3);ctx.fillRect(ex+5,h*.61-5,5,3);
      ctx.fillStyle="rgba(218,237,239,.7)";for(let i=0;i<18;i++){const x=(i*97+frame*.13)%w,y=(i*71+frame*.2)%h;ctx.fillRect(x,y,1.5,1.5)}
      raf=requestAnimationFrame(draw);
    }; draw(); return()=>cancelAnimationFrame(raf);
  },[attacking,hero]);
  return <canvas ref={canvas} aria-label="霧深い王国を探索する3Dゲーム画面" />;
}

export default function Home() {
  const [active,setActive]=useState(0),[attack,setAttack]=useState(false),[dialog,setDialog]=useState(true),[menu,setMenu]=useState(false),[journal,setJournal]=useState(false),[hp,setHp]=useState(842),[enemy,setEnemy]=useState(100),[quest,setQuest]=useState(1);
  const strike=useCallback(()=>{setAttack(true);setEnemy(v=>Math.max(0,v-24));setTimeout(()=>setAttack(false),220);},[]);
  useEffect(()=>{const k=(e:KeyboardEvent)=>{if(e.code==="Space"){e.preventDefault();strike()}if(e.key==="e")setDialog(v=>!v);if(e.key==="j")setJournal(v=>!v);if(e.key==="Escape")setMenu(v=>!v)};addEventListener("keydown",k);return()=>removeEventListener("keydown",k)},[strike]);
  const hero={...heroes[active],hp:active===0?hp:heroes[active].hp};
  return <main className="game-shell">
    <GameWorld attacking={attack} hero={hero}/><div className="vignette"/><div className="grain"/>
    <header className="topbar"><div className="brand"><span className="sigil">✦</span><div><b>ASTRA NOCTIS</b><small>星喰いの叙事詩</small></div></div><div className="location"><small>現在地</small><b>灰霧の辺境・エルディア街道</b></div><button onClick={()=>setMenu(true)} aria-label="メニューを開く">☰</button></header>
    <section className="quest"><span>MAIN QUEST</span><b>{quest===1?"消えた篝火を探せ":"辺境伯の砦へ向かえ"}</b><p>{quest===1?"街道の先で異変を調査する":"古い王道を北へ進む"}</p><div><i style={{width:quest===1?"62%":"18%"}}/></div><small>{quest===1?"3 / 5":"1 / 6"}</small></section>
    <section className="party" aria-label="パーティーメンバー">{heroes.map((h,i)=><button key={h.name} className={active===i?"active":""} onClick={()=>setActive(i)}><span style={{"--hero":h.color} as React.CSSProperties}>{h.name[0]}</span><div><b>{h.name}</b><small>{h.role}</small><i><em style={{width:`${(h.hp/h.max)*100}%`}}/></i></div><kbd>{i+1}</kbd></button>)}</section>
    <section className="enemy"><small>異形種 Lv.12</small><b>灰牙のヴァルグ</b><i><em style={{width:`${enemy}%`}}/></i></section>
    <div className="reticle">·</div>
    <section className="status"><div className="portrait" style={{"--hero":hero.color} as React.CSSProperties}>{hero.name[0]}</div><div><small>LV. 14　{hero.role}</small><b>{hero.name}</b><label>HP <i><em style={{width:`${hero.hp/hero.max*100}%`}}/></i><strong>{hero.hp} / {hero.max}</strong></label><label>MP <i className="mp"><em style={{width:"78%"}}/></i><strong>124 / 160</strong></label></div></section>
    <section className="actions"><button onClick={strike}><kbd>SPACE</kbd><span>⚔</span><b>攻撃</b></button><button onClick={()=>setHp(v=>Math.min(842,v+120))}><kbd>Q</kbd><span>✦</span><b>{hero.skill}</b></button><button onClick={()=>setJournal(true)}><kbd>J</kbd><span>⌁</span><b>旅の記録</b></button></section>
    <div className="hint"><span>WASD</span> 移動　 <span>E</span> 調べる　 <span>SPACE</span> 攻撃</div>
    {dialog&&<section className="dialog"><div className="npc">セ</div><div><small>風読みの少女</small><b>セラフィナ</b><p>……待って。この霧、ただの霧じゃない。星の声が、地の底から聞こえるの。</p></div><button onClick={()=>{setDialog(false);setQuest(2)}}>次へ <span>▶</span></button></section>}
    {menu&&<div className="overlay" onClick={()=>setMenu(false)}><section className="menu" onClick={e=>e.stopPropagation()}><small>PAUSED</small><h2>旅の支度</h2><button onClick={()=>setMenu(false)}>冒険を続ける</button><button onClick={()=>{setMenu(false);setJournal(true)}}>物語・クエスト</button><button>装備とスキル</button><button>設定</button><p>プレイ時間　12:48:31</p></section></div>}
    {journal&&<div className="overlay" onClick={()=>setJournal(false)}><section className="journal" onClick={e=>e.stopPropagation()}><header><div><small>THE CHRONICLE</small><h2>星喰いの叙事詩</h2></div><button onClick={()=>setJournal(false)}>×</button></header><p>七つの王国、36のメインクエスト、120を超える人物との出会い。あなたの選択が、仲間の運命と世界の結末を変える。</p><div className="chapters">{chapters.map((c,i)=><button key={c} className={i<2?"open":""}><span>{i<2?"◆":"◇"}</span><b>{c}</b><small>{i===0?"完了":i===1?"進行中":"未解放"}</small></button>)}</div></section></div>}
  </main>
}

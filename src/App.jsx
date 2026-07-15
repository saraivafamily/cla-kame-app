import React, { useState, useEffect, useMemo, useRef } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, doc, setDoc, updateDoc, onSnapshot, collection, deleteDoc } from 'firebase/firestore';
import { Home, Trophy, Medal, Camera, CheckSquare, Users, LogOut, UploadCloud, CheckCircle, XCircle, AlertCircle, Activity, PlusCircle, ArrowLeft, PlayCircle, Lock, Play, Shield, MessageCircle, Edit, Save, X, User, Crown, Star, Send, Trash2, UserPlus, Key, LayoutGrid, List, Award } from 'lucide-react';

const LOGO_URL = "https://i.imgur.com/NTbkaER.png"; 

const firebaseConfig = { 
  apiKey: "AIzaSyCoZ255eUBfUsIYArCMtHflT0y_6U5fTsA", 
  authDomain: "cla-kame.firebaseapp.com", 
  databaseURL: "https://cla-kame-default-rtdb.firebaseio.com", 
  projectId: "cla-kame", 
  storageBucket: "cla-kame.firebasestorage.app", 
  messagingSenderId: "253792062726", 
  appId: "1:253792062726:web:1ee567bbbd175c31ce2287" 
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = 'cla-kame-oficial';

const getPublicPath = (colName) => collection(db, 'artifacts', appId, 'public', 'data', colName);
const getPublicDocPath = (colName, docId) => doc(db, 'artifacts', appId, 'public', 'data', colName, docId);

const ROLE_NAMES = { leader: 'Líder Supremo', kaioh: 'Senhor Kaioh', member: 'Membro Oficial' };
const inputClass = "w-full bg-slate-950 border border-slate-700 focus:border-emerald-500 rounded-lg p-3 text-white outline-none transition-colors text-sm";

const processImage = (file, cb) => { if(!file) return; const r = new FileReader(); r.onload = e => { const img = new Image(); img.onload = () => { const canvas = document.createElement('canvas'); const MAX = 128; let w = img.width, h = img.height; if (w > h) { if (w > MAX) { h *= MAX / w; w = MAX; } } else { if (h > MAX) { w *= MAX / h; h = MAX; } } canvas.width = w; canvas.height = h; const ctx = canvas.getContext('2d'); ctx.drawImage(img, 0, 0, w, h); cb(canvas.toDataURL('image/png')); }; img.src = e.target.result; }; r.readAsDataURL(file); };
const processScreenshot = (file, cb) => { if(!file) return; const r = new FileReader(); r.onload = e => { const img = new Image(); img.onload = () => { const canvas = document.createElement('canvas'); const MAX = 900; let w = img.width, h = img.height; if (w > h) { if (w > MAX) { h *= MAX / w; w = MAX; } } else { if (h > MAX) { w *= MAX / h; h = MAX; } } canvas.width = w; canvas.height = h; const ctx = canvas.getContext('2d'); ctx.drawImage(img, 0, 0, w, h); cb(canvas.toDataURL('image/jpeg', 0.6)); }; img.src = e.target.result; }; r.readAsDataURL(file); };

const ShieldDisplay = ({ shield, size = 'normal' }) => {
  const isImage = typeof shield === 'string' && (shield.startsWith('data:') || shield.startsWith('http'));
  const sizeClasses = { 'small': isImage ? 'w-6 h-6' : 'text-xl', 'normal': isImage ? 'w-8 h-8' : 'text-2xl', 'large': isImage ? 'w-14 h-14' : 'text-5xl' };
  if (isImage) return <img src={shield} alt="Escudo" className={`${sizeClasses[size]} object-contain drop-shadow-lg`} />;
  return <span className={`${sizeClasses[size]} inline-block text-center`} style={{lineHeight: 1}}>{shield || '🛡️'}</span>;
};

const Button = ({ children, onClick, variant = 'primary', className = '', disabled = false, type = 'button' }) => {
  const variants = { primary: "bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-900/50", secondary: "bg-slate-700 hover:bg-slate-600 text-white", danger: "bg-red-600 hover:bg-red-500 text-white", outline: "border border-slate-600 text-slate-300 hover:bg-slate-800" };
  return <button type={type} onClick={onClick} disabled={disabled} className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed ${variants[variant]} ${className}`}>{children}</button>;
};

const calculateStandings = (matches, teams, compId) => {
  const table = {}; (teams || []).forEach(t => { if (t) table[t.id] = { ...t, p: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, gd: 0, pts: 0 }; });
  const appMap = {}; (matches || []).filter(m => m && m.compId === compId && m.status === 'approved').forEach(m => { const time = parseInt(String(m?.id || '').split('_')[1] || '0'); if (!appMap[m.matchId] || time > parseInt(String(appMap[m.matchId].id).split('_')[1] || '0')) { appMap[m.matchId] = m; } });
  Object.values(appMap).forEach(m => {
    const tA = table[m.teamA], tB = table[m.teamB]; if (!tA || !tB) return;
    tA.p++; tB.p++; tA.gf += Number(m.scoreA||0); tB.gf += Number(m.scoreB||0); tA.ga += Number(m.scoreB||0); tB.ga += Number(m.scoreA||0);
    if (m.scoreA > m.scoreB) { tA.pts+=3; tA.w++; tB.l++; } else if (m.scoreA < m.scoreB) { tB.pts+=3; tB.w++; tA.l++; } else { tA.pts++; tB.pts++; tA.d++; tB.d++; }
  });
  return Object.values(table).map(t => ({ ...t, gd: t.gf - t.ga })).sort((a, b) => { if (b.pts !== a.pts) return b.pts - a.pts; if (b.w !== a.w) return b.w - a.w; if (b.gd !== a.gd) return b.gd - a.gd; return b.gf - a.gf; });
};

const generateRoundRobin = (teamIds, compId) => {
  let teams = [...teamIds]; if (teams.length % 2 !== 0) teams.push(null);
  const n = teams.length; const h = n / 2; const rounds = []; let c = 1;
  for (let r = 0; r < n - 1; r++) {
    const rm = []; for (let i = 0; i < h; i++) { const tA = teams[i]; const tB = teams[n - 1 - i]; if (tA !== null && tB !== null) { rm.push({ id: `${compId}_m${c}_r${r+1}`, teamA: tA, teamB: tB, status: 'pending_play' }); c++; } }
    rounds.push({ id: `r${r+1}`, number: r + 1, status: r === 0 ? 'released' : 'locked', matches: rm }); teams.splice(1, 0, teams.pop());
  } return rounds;
};

const generateCupBracket = (teamIds, compId) => {
  let teams = [...teamIds]; let p2 = 1; while (p2 < teams.length) p2 *= 2; while (teams.length < p2) teams.push(''); 
  const tr = Math.log2(p2); const rounds = []; let mc = 1;
  for (let r = 0; r < tr; r++) {
    const rm = []; const nm = p2 / Math.pow(2, r + 1); const fmc = mc;
    for (let i = 0; i < nm; i++) {
      let tA = '', tB = '', pA = 'A Definir', pB = 'A Definir'; if (r === 0) { tA = teams[i * 2] || ''; tB = teams[i * 2 + 1] || ''; if(!tA) pA = `Sorteio Vaga ${i*2 + 1}`; if(!tB) pB = `Sorteio Vaga ${i*2 + 2}`; } else { pA = `Venc. Jogo ${fmc - (nm * 2) + (i * 2)}`; pB = `Venc. Jogo ${fmc - (nm * 2) + (i * 2) + 1}`; }
      rm.push({ id: `${compId}_m${mc}_r${r+1}`, teamA: tA, teamB: tB, placeholderA: pA, placeholderB: pB, status: 'pending_play' }); mc++;
    }
    let rl = String(r + 1); if (nm === 1) rl = 'Final'; else if (nm === 2) rl = 'Semifinal'; else if (nm === 4) rl = 'Quartas'; else if (nm === 8) rl = 'Oitavas';
    rounds.push({ id: `r${r+1}`, number: rl, status: r === 0 ? 'released' : 'locked', matches: rm });
  } return rounds;
};

const generateGroupsAndKnockout = (teamIds, compId, numGroups, qualifiers = 2) => {
  const sh = [...teamIds].sort(() => 0.5 - Math.random()); const groups = {}; const gn = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
  for(let i=0; i<numGroups; i++) groups[gn[i]] = []; sh.forEach((t, i) => groups[gn[i % numGroups]].push(t));
  let mr = 0; const agr = {}; Object.keys(groups).forEach(g => { const rrs = generateRoundRobin(groups[g], compId); mr = Math.max(mr, rrs.length); agr[g] = rrs; });
  const rounds = []; let mc = 1;
  for(let r=0; r<mr; r++) {
    const rm = []; Object.keys(groups).forEach(g => { if(agr[g][r]) { agr[g][r].matches.forEach(m => { rm.push({...m, id: `${compId}_m${mc}_r${r+1}`, groupId: g}); mc++; }); } });
    rounds.push({ id: `r${r+1}`, number: r+1, status: r===0?'released':'locked', matches: rm });
  }
  let kt = numGroups * qualifiers; let p2 = 1; while (p2 < kt) p2 *= 2; const tkr = Math.log2(p2);
  for (let kr=0; kr<tkr; kr++) {
    const rm = []; const nm = p2 / Math.pow(2, kr + 1); const fmc = mc;
    for (let i=0; i<nm; i++) {
      let pA = 'A Definir', pB = 'A Definir'; if (kr === 0) { if (qualifiers === 2 && numGroups % 2 === 0 && numGroups * 2 === p2) { const h = numGroups / 2; if (i < h) { pA = `1º Gr.${gn[i * 2]}`; pB = `2º Gr.${gn[i * 2 + 1]}`; } else { const off = i - h; pA = `1º Gr.${gn[off * 2 + 1]}`; pB = `2º Gr.${gn[off * 2]}`; } } else { pA = 'Vaga Aberta'; pB = 'Vaga Aberta'; } } else { pA = `Venc. Jogo ${fmc - (nm * 2) + (i * 2)}`; pB = `Venc. Jogo ${fmc - (nm * 2) + (i * 2) + 1}`; }
      rm.push({ id: `${compId}_ko_m${mc}_kr${kr}`, teamA: '', teamB: '', placeholderA: pA, placeholderB: pB, status: 'pending_play' }); mc++;
    }
    let rl = 'Mata-Mata'; if (nm === 1) rl = 'Final'; else if (nm === 2) rl = 'Semifinal'; else if (nm === 4) rl = 'Quartas';
    rounds.push({ id: `ko_${kr}`, number: rl, status: 'locked', matches: rm });
  } return { groups, rounds };
};

const LoginScreen = ({ onLogin, onRegister }) => {
  const [view, setView] = useState('login'); 
  const [loginData, setLoginData] = useState({ identifier: '', password: '' });
  const [regData, setRegData] = useState({ firstName: '', lastName: '', teamName: '', email: '', whatsapp: '', password: '' });
  const [error, setError] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const handleLoginSubmit = async (e) => {
    e.preventDefault(); setError(''); setIsProcessing(true);
    try { await onLogin(loginData.identifier, loginData.password); } 
    catch (err) { setError(err.message || 'Erro nas credenciais.'); }
    setIsProcessing(false);
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault(); setError(''); setIsProcessing(true);
    try { 
      await onRegister(regData); 
      setView('login');
      setRegData({ firstName: '', lastName: '', teamName: '', email: '', whatsapp: '', password: '' });
    } 
    catch (err) { setError(err.message); }
    setIsProcessing(false);
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="bg-slate-900 p-6 md:p-8 rounded-2xl border border-slate-800 max-w-md w-full shadow-2xl">
        <div className="text-center mb-6">
          <div className="flex justify-center mb-4"><img src={LOGO_URL} alt="Clã Kame" className="max-w-[100px]" /></div>
          <h1 className="text-xl font-bold text-white">Clã Kame DLS</h1>
        </div>
        
        {view === 'login' && (
          <form onSubmit={handleLoginSubmit} className="space-y-4 animate-in fade-in duration-300">
            {error && <div className="text-red-400 text-xs bg-red-500/10 p-3 rounded-lg border border-red-500/20">{error}</div>}
            <div><label className="text-xs text-slate-400 block mb-1">E-mail</label><input required value={loginData.identifier} onChange={e=>setLoginData({...loginData, identifier: e.target.value})} className={inputClass} placeholder="Digite seu acesso..." /></div>
            <div><label className="text-xs text-slate-400 block mb-1">Senha</label><input required type="password" value={loginData.password} onChange={e=>setLoginData({...loginData, password: e.target.value})} className={inputClass} placeholder="••••••••" /></div>
            <Button type="submit" disabled={isProcessing} className="w-full py-3">{isProcessing ? 'Entrando...' : 'Entrar na Arena'}</Button>
            <div className="text-center pt-5 border-t border-slate-800/50 mt-6">
              <p className="text-xs text-slate-500 mb-2">Ainda não faz parte do clã?</p>
              <button type="button" onClick={() => {setView('register'); setError('');}} className="text-sm font-bold text-emerald-400 hover:text-emerald-300 underline">Primeiro Acesso (Cadastrar)</button>
            </div>
          </form>
        )}

        {view === 'register' && (
          <form onSubmit={handleRegisterSubmit} className="space-y-3 animate-in slide-in-from-right-4 duration-300">
            <h2 className="text-lg font-bold text-white text-center mb-1">Cadastro de Técnico</h2>
            <p className="text-[10px] text-slate-400 text-center mb-4">Preencha seus dados para solicitar acesso.</p>
            {error && <div className="text-red-400 text-sm bg-red-500/10 p-3 rounded-lg border border-red-500/20">{error}</div>}
            
            <div className="grid grid-cols-2 gap-3">
              <div><input required placeholder="Nome" value={regData.firstName} onChange={e=>setRegData({...regData, firstName: e.target.value})} className={inputClass} /></div>
              <div><input required placeholder="Sobrenome" value={regData.lastName} onChange={e=>setRegData({...regData, lastName: e.target.value})} className={inputClass} /></div>
            </div>
            <div><input required placeholder="Nome do Clube" value={regData.teamName} onChange={e=>setRegData({...regData, teamName: e.target.value})} className={inputClass} /></div>
            <div><input required type="email" placeholder="E-mail" value={regData.email} onChange={e=>setRegData({...regData, email: e.target.value})} className={inputClass} /></div>
            <div><input required type="tel" placeholder="WhatsApp (com DDD)" value={regData.whatsapp} onChange={e=>setRegData({...regData, whatsapp: e.target.value})} className={inputClass} /></div>
            <div><input required type="password" maxLength={8} placeholder="Crie uma Senha (máx 8 dígitos)" value={regData.password} onChange={e=>setRegData({...regData, password: e.target.value})} className={inputClass} /></div>
            
            <Button type="submit" disabled={isProcessing} className="w-full py-3 mt-2">{isProcessing ? 'Enviando...' : 'Solicitar Entrada no Clã'}</Button>
            <button type="button" onClick={() => {setView('login'); setError('');}} className="w-full text-xs text-slate-500 hover:text-white mt-2 pb-2">Voltar para o Login</button>
          </form>
        )}
      </div>
    </div>
  );
};

const Profile = ({ currentUser, teams, matches, competitions, onEditTeam, onUpdateUserPhoto }) => { 
  const userTeams = teams.filter(t => t.ownerId === currentUser.id);

  if (userTeams.length === 0) {
    return (
      <div className="animate-in fade-in text-center p-12 bg-slate-900 rounded-2xl border border-slate-800">
        <span className="text-6xl mb-4 block">😢</span>
        <h2 className="text-2xl font-bold text-white mb-2">Você ainda não tem um time</h2>
        <p className="text-slate-400">Peça para um líder cadastrar seu time no Clã.</p>
      </div>
    );
  }

  return (
    <div className="animate-in fade-in duration-500 space-y-6">
      <div className="flex items-center gap-4 bg-slate-900 p-6 rounded-2xl border border-slate-800 shadow-lg">
        <label className="cursor-pointer relative group flex flex-col items-center shrink-0" title="Clique para trocar sua foto">
          <div className="relative w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center text-3xl border-2 border-emerald-500/30 overflow-hidden shadow-lg">
            {currentUser.photoURL ? <img src={currentUser.photoURL} alt="Perfil" className="w-full h-full object-cover" /> : <span>👤</span>}
            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <UploadCloud size={20} className="text-white" />
            </div>
          </div>
          <input type="file" accept="image/*" className="hidden" onChange={(e) => {
            processImage(e.target.files[0], (base64) => {
              if (onUpdateUserPhoto) onUpdateUserPhoto(base64);
            });
          }} />
        </label>
        <div>
          <h2 className="text-2xl font-bold text-white">{currentUser.name}</h2>
          <p className="text-emerald-400 font-bold tracking-widest text-xs uppercase mt-1">{ROLE_NAMES[currentUser.role] || 'Membro'}</p>
        </div>
      </div>

      <div className="space-y-8">
        {userTeams.map(team => {
          const teamMatches = matches.filter(m => m.status === 'approved' && (m.teamA === team.id || m.teamB === team.id));
          let wins = 0, draws = 0, losses = 0, gf = 0, ga = 0; let biggestWin = null; let maxGd = -1;

          teamMatches.forEach(m => {
            const isTeamA = m.teamA === team.id;
            const scoreFor = isTeamA ? m.scoreA : m.scoreB;
            const scoreAgainst = isTeamA ? m.scoreB : m.scoreA;
            gf += scoreFor; ga += scoreAgainst;
            if (scoreFor > scoreAgainst) { wins++; const gd = scoreFor - scoreAgainst; if (gd > maxGd) { maxGd = gd; biggestWin = { scoreFor, scoreAgainst, oppId: isTeamA ? m.teamB : m.teamA }; } } 
            else if (scoreFor === scoreAgainst) { draws++; } 
            else { losses++; }
          });

          const conquistas = [];
          if (wins > 0) conquistas.push({ icon: '🌟', title: 'PRIMEIRA VITÓRIA', desc: 'Venceu uma partida oficial' });
          if (gf >= 100) conquistas.push({ icon: '⚽', title: 'GOLEADOR', desc: 'Marcou 100 ou mais gols' });
          if (gf >= 500) conquistas.push({ icon: '⚽', title: 'MERCENÁRIO', desc: 'Marcou 500 ou mais gols' });
          if (wins >= 50) conquistas.push({ icon: '🔥', title: 'ON FIRE', desc: 'Alcançou 50 vitórias no clã' });
          if (teamMatches.length >= 10 && losses === 0) conquistas.push({ icon: '🛡️', title: 'MURALHA', desc: 'Invicto após 10+ jogos' });
          if (biggestWin && (biggestWin.scoreFor - biggestWin.scoreAgainst) >= 5) conquistas.push({ icon: '⚡', title: 'IMPIEDOSO', desc: 'Venceu com 5+ gols de diferença' });
          if (draws >= 50) conquistas.push({ icon: '🤝', title: 'REI DO EMPATE', desc: 'Empatou 50 ou mais vezes' });
          

          const activeComps = competitions.filter(c => c.teams?.includes(team.id));

          return (
            <div key={team.id} className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden shadow-xl">
              <div className="bg-slate-950/80 p-6 border-b border-slate-800 flex items-center gap-4">
               <label className="cursor-pointer relative group flex flex-col items-center" title="Clique para trocar o escudo">
                  <div className="relative">
                    <span className="text-5xl"><ShieldDisplay shield={team.shield} size="large" /></span>
                    <div className="absolute -bottom-1 -right-2 bg-emerald-600 rounded-full p-2 shadow-lg opacity-0 group-hover:opacity-100 group-hover:scale-110 transition-all flex items-center justify-center">
                      <UploadCloud size={14} className="text-white" />
                    </div>
                  </div>
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => {
                    processImage(e.target.files[0], (base64) => {
                      if (onEditTeam) onEditTeam({...team, shield: base64});
                    });
                  }} />
                </label>
                <div><h3 className="text-2xl font-bold text-white">{team.name}</h3><p className="text-slate-400 text-sm">Técnico: <span className="text-slate-200 font-bold">{team.coach}</span></p></div>
              </div>

              <div className="p-6 space-y-10">
                <div>
                  <h4 className="text-lg font-bold text-white mb-4 flex items-center gap-2"><Medal className="text-amber-400" size={20}/> Conquistas Desbloqueadas</h4>
                  {conquistas.length > 0 ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                      {conquistas.map((c, i) => (
                        <div key={i} className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-center flex flex-col items-center justify-center transition-all hover:border-amber-500/50 hover:bg-slate-900 group">
                          <span className="text-3xl mb-2 group-hover:scale-110 transition-transform">{c.icon}</span><p className="text-sm font-bold text-white">{c.title}</p><p className="text-[10px] text-slate-400 mt-1 leading-tight">{c.desc}</p>
                        </div>
                      ))}
                    </div>
                  ) : ( <div className="text-center p-6 bg-slate-950 rounded-xl border border-slate-800 border-dashed"><p className="text-slate-500 text-sm">Nenhuma conquista desbloqueada. Jogue e vença partidas para ganhar emblemas!</p></div> )}
                </div>

                <div>
                  <h4 className="text-lg font-bold text-white mb-4 flex items-center gap-2"><Trophy className="text-emerald-500" size={20}/> Desempenho nos Torneios</h4>
                  {activeComps.length > 0 ? (
                    <div className="space-y-4">
                      {activeComps.map(comp => {
                        const table = calculateStandings(matches, teams, comp.id);
                        const myStats = table.find(t => t.id === team.id);
                        const rankIndex = table.findIndex(t => t.id === team.id);
                        const rank = rankIndex !== -1 ? rankIndex + 1 : '-';
                        return (
                          <div key={comp.id} className="bg-slate-950 rounded-xl border border-slate-800 overflow-hidden">
                            <div className="bg-slate-900 p-3 border-b border-slate-800 flex justify-between items-center px-4"><span className="text-sm font-bold text-slate-200">{comp.name}</span><div className="flex items-center gap-2"><span className="text-[10px] uppercase font-bold text-slate-500 hidden sm:block">{comp.format === 'league' ? 'Liga' : 'Copa'}</span><span className="text-xs bg-emerald-500/10 text-emerald-400 px-2 py-1 rounded border border-emerald-500/20 font-bold">{rank}º Lugar</span></div></div>
                            {myStats && myStats.p > 0 ? (
                              <div className="grid grid-cols-4 sm:grid-cols-7 gap-2 p-4 text-center">
                                <div><p className="text-[10px] text-slate-500 uppercase font-bold mb-0.5">PTS</p><p className="text-xl font-black text-emerald-400">{myStats.pts}</p></div>
                                <div><p className="text-[10px] text-slate-500 uppercase font-bold mb-0.5">Jogos</p><p className="text-lg font-bold text-slate-300">{myStats.p}</p></div>
                                <div><p className="text-[10px] text-slate-500 uppercase font-bold mb-0.5">V</p><p className="text-lg font-bold text-emerald-500">{myStats.w}</p></div>
                                <div><p className="text-[10px] text-slate-500 uppercase font-bold mb-0.5">E</p><p className="text-lg font-bold text-slate-400">{myStats.d}</p></div>
                                <div className="sm:hidden block"><p className="text-[10px] text-slate-500 uppercase font-bold mb-0.5">D</p><p className="text-lg font-bold text-red-400">{myStats.l}</p></div>
                                <div className="hidden sm:block"><p className="text-[10px] text-slate-500 uppercase font-bold mb-0.5">D</p><p className="text-lg font-bold text-red-400">{myStats.l}</p></div>
                                <div className="hidden sm:block"><p className="text-[10px] text-slate-500 uppercase font-bold mb-0.5">GP</p><p className="text-lg font-bold text-blue-400">{myStats.gf}</p></div>
                                <div className="hidden sm:block"><p className="text-[10px] text-slate-500 uppercase font-bold mb-0.5">Saldo</p><p className="text-lg font-bold text-slate-300">{myStats.gd > 0 ? `+${myStats.gd}` : myStats.gd}</p></div>
                              </div>
                            ) : ( <p className="p-4 text-sm text-slate-500 text-center bg-slate-950">Ainda não disputou partidas neste torneio.</p> )}
                          </div>
                        )
                      })}
                    </div>
                  ) : ( <p className="text-slate-500 text-sm p-4 bg-slate-950 rounded-xl border border-slate-800 text-center">Este time não está inscrito em nenhuma competição no momento.</p> )}
                </div>

                <div className="pt-4 border-t border-slate-800">
                  <h4 className="text-sm font-bold text-slate-400 mb-4 flex items-center gap-2"><Activity size={16}/> Resumo Histórico</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-slate-950 p-4 rounded-xl border border-slate-800/50 text-center"><p className="text-slate-500 text-xs mb-1 font-medium">Jogos Totais</p><p className="text-xl font-bold text-white">{teamMatches.length}</p></div>
                    <div className="bg-slate-950 p-4 rounded-xl border border-slate-800/50 text-center"><p className="text-slate-500 text-xs mb-1 font-medium">Aproveitamento</p><p className="text-xl font-bold text-amber-400">{teamMatches.length > 0 ? Math.round((wins * 3 + draws) / (teamMatches.length * 3) * 100) : 0}%</p></div>
                    <div className="bg-slate-950 p-4 rounded-xl border border-slate-800/50 text-center col-span-2 md:col-span-2"><p className="text-slate-500 text-xs mb-1 font-medium">Maior Goleada</p>{biggestWin ? ( <p className="text-lg font-bold text-white"><span className="text-emerald-400">{biggestWin.scoreFor}</span> x {biggestWin.scoreAgainst} <span className="text-sm text-slate-400 font-normal">({teams.find(t=>t.id === biggestWin.oppId)?.name})</span></p> ) : <p className="text-sm text-slate-600 mt-1">Nenhuma vitória</p>}</div>
                  </div>
                </div>

              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const Dashboard = ({ matches, teams, competitions, currentUser, onSelectMatch }) => {
  const isAdmin = currentUser?.role === 'leader' || currentUser?.role === 'kaioh';
  const userTeamIds = (teams || []).filter(t => t && t.ownerId === currentUser?.id).map(t => t.id);
  const visibleCompIds = (competitions || []).filter(c => c && c.teams?.some(t => userTeamIds.includes(t))).map(c => c.id);
  const recentMatches = (matches || []).filter(m => m && (isAdmin || visibleCompIds.includes(m.compId)) && m.status !== 'rejected').sort((a, b) => parseInt(String(b?.id || '').split('_')[1] || '0') - parseInt(String(a?.id || '').split('_')[1] || '0')).slice(0, 8);
  const getTeam = (id) => (teams || []).find(t => t && t.id === id);
  
  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="bg-gradient-to-r from-emerald-900/50 to-slate-900 p-6 rounded-2xl border border-emerald-900/50 shadow-xl">
        <h2 className="text-2xl font-bold text-white mb-2">QG Clã Kame</h2>
        <p className="text-slate-400">Gerencie e acompanhe seus resultados do DLS.</p>
      </div>
      <div>
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2"><Activity size={20} className="text-emerald-500" /> Últimos Resultados Enviados</h3>
        <div className="space-y-3">
          {recentMatches.length === 0 && <p className="text-slate-500 text-sm p-4 bg-slate-900 rounded-xl border border-slate-800">Nenhum resultado submetido ainda.</p>}
          {recentMatches.map(m => {
            if (!m) return null; const tA = getTeam(m.teamA); const tB = getTeam(m.teamB);
            return (
              <div key={m.id} onClick={() => onSelectMatch && onSelectMatch(m)} className="bg-slate-900 p-3 md:p-4 rounded-xl border border-slate-800 flex flex-col gap-3 shadow-sm cursor-pointer hover:border-emerald-500/50 hover:shadow-lg transition-all group relative">
                <div className="flex items-center justify-between w-full gap-2">
                  <div className="flex items-center gap-2 flex-1 min-w-0 justify-start"><div className="shrink-0"><ShieldDisplay shield={tA?.shield} size="normal" /></div><span className="font-medium text-[11px] md:text-sm text-slate-200 truncate group-hover:text-emerald-400 transition-colors">{String(tA?.name || 'Time A')}</span></div>
                  <div className="flex items-center justify-center gap-1.5 md:gap-2 px-2 md:px-3 py-1 bg-slate-950 rounded-lg border border-slate-800 shrink-0">{m.penaltiesA !== null && m.penaltiesA !== undefined && <span className="text-[10px] text-amber-400 font-bold mr-1">({m.penaltiesA})</span>}<span className="font-bold text-sm md:text-base text-emerald-400">{m.status === 'approved' || m.status === 'pending' ? String(m.scoreA) : '?'}</span><span className="text-[10px] md:text-xs text-slate-500 font-bold mx-0.5">X</span><span className="font-bold text-sm md:text-base text-emerald-400">{m.status === 'approved' || m.status === 'pending' ? String(m.scoreB) : '?'}</span>{m.penaltiesB !== null && m.penaltiesB !== undefined && <span className="text-[10px] text-amber-400 font-bold ml-1">({m.penaltiesB})</span>}</div>
                  <div className="flex items-center gap-2 flex-1 min-w-0 justify-end"><span className="font-medium text-[11px] md:text-sm text-slate-200 truncate text-right group-hover:text-emerald-400 transition-colors">{String(tB?.name || 'Time B')}</span><div className="shrink-0"><ShieldDisplay shield={tB?.shield} size="normal" /></div></div>
                </div>
                <div className="flex justify-center border-t border-slate-800/50 pt-2 flex-col items-center gap-1">{m.status === 'approved' ? <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-400">✅ Oficializado • Clique para detalhes</span> : <span className="text-[10px] uppercase font-bold tracking-wider text-amber-400 font-medium">⏳ Aguardando Validação • Clique para detalhes</span>}</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

const TeamStatsModal = ({ team, matches, teams, onClose }) => {
  if (!team) return null;
  
  // Filtra as partidas oficiais do time e calcula as estatísticas
  const teamMatches = (matches || []).filter(m => m.status === 'approved' && (m.teamA === team.id || m.teamB === team.id));
  let wins = 0, draws = 0, losses = 0, gf = 0, ga = 0; let biggestWin = null; let maxGd = -1;

  teamMatches.forEach(m => {
    const isTeamA = m.teamA === team.id;
    const scoreFor = isTeamA ? m.scoreA : m.scoreB;
    const scoreAgainst = isTeamA ? m.scoreB : m.scoreA;
    gf += scoreFor; ga += scoreAgainst;
    if (scoreFor > scoreAgainst) { 
      wins++; const gd = scoreFor - scoreAgainst; 
      if (gd > maxGd) { maxGd = gd; biggestWin = { scoreFor, scoreAgainst, oppId: isTeamA ? m.teamB : m.teamA }; } 
    } 
    else if (scoreFor === scoreAgainst) { draws++; } 
    else { losses++; }
  });

  // Sistema de Conquistas
  const conquistas = [];
  if (wins > 0) conquistas.push({ icon: '🌟', title: '1ª VITÓRIA', desc: 'Venceu uma partida oficial' });
  if (gf >= 100) conquistas.push({ icon: '⚽', title: 'GOLEADOR', desc: 'Marcou 100 ou mais gols' });
  if (gf >= 500) conquistas.push({ icon: '⚽', title: 'MERCENÁRIO', desc: 'Marcou 500 ou mais gols' });
  if (wins >= 50) conquistas.push({ icon: '🔥', title: 'ON FIRE', desc: 'Alcançou 50 vitórias' });
  if (teamMatches.length >= 10 && losses === 0) conquistas.push({ icon: '🛡️', title: 'MURALHA', desc: 'Invicto após 10+ jogos' });
  if (biggestWin && (biggestWin.scoreFor - biggestWin.scoreAgainst) >= 3) conquistas.push({ icon: '⚡', title: 'IMPIEDOSO', desc: 'Venceu com 5+ gols de diferença' });
  if (draws >= 5) conquistas.push({ icon: '🤝', title: 'REI DO EMPATE', desc: 'Empatou 50 ou mais vezes' });

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in" onClick={onClose}>
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto custom-scrollbar shadow-2xl" onClick={e => e.stopPropagation()}>
        
        {/* Cabeçalho */}
        <div className="sticky top-0 bg-slate-900/95 backdrop-blur border-b border-slate-800 p-4 sm:p-6 flex justify-between items-center z-10">
          <div className="flex items-center gap-4">
            <ShieldDisplay shield={team.shield} size="normal" />
            <div>
              <h3 className="font-bold text-white text-lg md:text-xl leading-tight">{team.name}</h3>
              <p className="text-xs text-emerald-400 font-medium uppercase tracking-widest mt-1">Técnico: {team.coach}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-2 bg-slate-800 hover:bg-slate-700 rounded-full transition-colors"><X size={18}/></button>
        </div>
        
        {/* Corpo com Estatísticas */}
        <div className="p-4 sm:p-6 space-y-8">
          <div>
            <h4 className="text-sm font-bold text-slate-400 mb-3 flex items-center gap-2"><Activity size={16}/> Resumo da Temporada</h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-center"><p className="text-slate-500 text-[10px] uppercase font-bold mb-1">Jogos</p><p className="text-2xl font-bold text-white">{teamMatches.length}</p></div>
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-center"><p className="text-slate-500 text-[10px] uppercase font-bold mb-1">Vitórias</p><p className="text-2xl font-bold text-emerald-400">{wins}</p></div>
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-center"><p className="text-slate-500 text-[10px] uppercase font-bold mb-1">Gols Pró</p><p className="text-2xl font-bold text-blue-400">{gf}</p></div>
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-center"><p className="text-slate-500 text-[10px] uppercase font-bold mb-1">Aprov.</p><p className="text-2xl font-bold text-amber-400">{teamMatches.length > 0 ? Math.round((wins * 3 + draws) / (teamMatches.length * 3) * 100) : 0}%</p></div>
            </div>
          </div>

          <div>
            <h4 className="text-sm font-bold text-slate-400 mb-3 flex items-center gap-2"><Medal size={16} className="text-amber-400"/> Sala de Troféus</h4>
            {conquistas.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {conquistas.map((c, i) => (
                  <div key={i} className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-center flex flex-col items-center">
                    <span className="text-3xl mb-2 drop-shadow-md">{c.icon}</span><p className="text-xs font-bold text-white">{c.title}</p><p className="text-[9px] text-slate-500 mt-1 leading-tight">{c.desc}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-500 text-center p-6 bg-slate-950 rounded-xl border border-slate-800 border-dashed">Nenhuma conquista desbloqueada ainda.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const TeamsList = ({ teams, users, currentUser, matches, onEditTeam, onDeleteTeam }) => {
  const isAdmin = currentUser?.role === 'leader' || currentUser?.role === 'kaioh';
  const [editingId, setEditingId] = useState(null);
  const [editData, setEditData] = useState({ name: '', coach: '', whatsapp: '', shield: '', ownerId: 'manual' });
  const [viewMode, setViewMode] = useState('grid');
  const [searchTerm, setSearchTerm] = useState('');
  const [viewingTeam, setViewingTeam] = useState(null); // Estado que controla a abertura das estatísticas
  
  const handleWhatsApp = (phone) => { if (!phone) return; window.open(`https://wa.me/${String(phone).replace(/\D/g, '')}`, '_blank'); };
  const startEdit = (team) => { if (!team) return; setEditingId(team.id); setEditData({ name: team.name || '', coach: team.coach || '', whatsapp: team.whatsapp || '', shield: team.shield || '🛡️', ownerId: team.ownerId || 'manual' }); };
  const saveEdit = (team) => { if (!editData.name || !editData.coach) return; onEditTeam({ ...team, ...editData }); setEditingId(null); };

  const filteredTeams = (teams || []).filter(t => t && (String(t.name || '').toLowerCase().includes(searchTerm.toLowerCase()) || String(t.coach || '').toLowerCase().includes(searchTerm.toLowerCase())));

  return (
    <div className="animate-in fade-in duration-500 space-y-6 pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900 p-4 md:p-6 rounded-2xl border border-slate-800 shadow-xl">
        <div className="flex items-center gap-3">
          <span className="text-3xl drop-shadow-md">🛡️</span>
          <div>
            <h2 className="text-xl md:text-2xl font-bold text-white">Mural de Times</h2>
            <p className="text-xs text-emerald-400 font-bold tracking-widest uppercase mt-0.5">{(teams || []).length} Times Cadastrados</p>
          </div>
        </div>
        <div className="flex items-center gap-2 w-full md:w-auto">
          <input type="text" placeholder="Procurar time ou técnico..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="flex-1 md:w-64 bg-slate-950 border border-slate-700 focus:border-emerald-500 rounded-lg p-2 text-white outline-none transition-colors text-sm" />
          <div className="flex p-1 bg-slate-950 rounded-lg border border-slate-700 shrink-0">
            <button onClick={() => setViewMode('grid')} className={`px-3 py-1.5 rounded-md transition-colors text-xs font-bold ${viewMode === 'grid' ? 'bg-slate-800 text-emerald-400 shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}>Grade</button>
            <button onClick={() => setViewMode('list')} className={`px-3 py-1.5 rounded-md transition-colors text-xs font-bold ${viewMode === 'list' ? 'bg-slate-800 text-emerald-400 shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}>Lista</button>
          </div>
        </div>
      </div>
      
      {filteredTeams.length === 0 ? ( 
        <div className="bg-slate-900 p-8 rounded-2xl border border-slate-800 text-center text-slate-500">
          {searchTerm ? 'Nenhum time encontrado com essa busca.' : 'Nenhum time registrado no clã ainda.'}
        </div> 
      ) : (
        <div className={viewMode === 'grid' ? "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 md:gap-4" : "flex flex-col gap-3"}>
          {filteredTeams.map(team => {
            if (!team) return null;
            const safeTeamId = team.id || Math.random().toString();
            
            if (editingId === team.id) {
              return (
                <div key={safeTeamId} className={`bg-slate-900 p-3 rounded-xl border border-emerald-500/50 shadow-[0_0_15px_rgba(16,185,129,0.1)] flex ${viewMode === 'list' ? 'flex-col md:flex-row items-start md:items-center justify-between gap-4' : 'flex-col justify-between gap-3'}`}>
                  <div className={`flex items-center gap-2 ${viewMode === 'list' ? 'flex-row w-full flex-wrap' : 'flex-col'}`}>
                    <div className="shrink-0 pt-1">
                      <label className="cursor-pointer relative group flex flex-col items-center">
                        <div className="relative">
                          <ShieldDisplay shield={editData.shield} size="normal" />
                          <div className="absolute -bottom-1 -right-2 bg-emerald-600 rounded-full p-1 shadow-lg group-hover:scale-110 transition-transform flex items-center justify-center"><UploadCloud size={10} className="text-white" /></div>
                        </div>
                        <input type="file" accept="image/*" className="hidden" onChange={(e) => processImage(e.target.files[0], (base64) => setEditData({...editData, shield: base64}))} />
                      </label>
                    </div>
                    <div className={`flex-1 space-y-1.5 w-full ${viewMode === 'list' ? 'grid grid-cols-2 sm:grid-cols-4 gap-2 space-y-0 mt-0' : 'mt-1'}`}>
                      <input type="text" value={editData.name} onChange={e=>setEditData({...editData, name: e.target.value})} placeholder="Time" className="w-full bg-slate-950 border border-slate-700 rounded p-1.5 text-white text-[10px] md:text-xs outline-none focus:border-emerald-500" />
                      <input type="text" value={editData.coach} onChange={e=>setEditData({...editData, coach: e.target.value})} placeholder="Técnico" className="w-full bg-slate-950 border border-slate-700 rounded p-1.5 text-white text-[10px] md:text-xs outline-none focus:border-emerald-500" />
                      <input type="text" value={editData.whatsapp} onChange={e=>setEditData({...editData, whatsapp: e.target.value})} placeholder="WhatsApp" className="w-full bg-slate-950 border border-slate-700 rounded p-1.5 text-white text-[10px] md:text-xs outline-none focus:border-emerald-500" />
                      <select value={editData.ownerId} onChange={e => {
                        const newOwnerId = e.target.value;
                        if (newOwnerId === 'manual') {
                          setEditData({ ...editData, ownerId: newOwnerId });
                        } else {
                          const linkedU = (users || []).find(u => u.id === newOwnerId);
                          if (linkedU) {
                            setEditData({ ...editData, ownerId: newOwnerId, coach: linkedU.name, whatsapp: linkedU.whatsapp });
                          } else {
                            setEditData({ ...editData, ownerId: newOwnerId });
                          }
                        }
                      }} className="w-full bg-slate-950 border border-slate-700 rounded p-1.5 text-white text-[10px] md:text-xs outline-none focus:border-emerald-500">
                        <option value="manual">👤 Conta Manual</option>
                        {(users || []).map(u => <option key={u.id} value={u.id}>📱 Vincular: {u.name}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className={`flex gap-1.5 ${viewMode === 'list' ? 'w-full md:w-auto shrink-0 justify-end' : 'mt-1'}`}>
                    <Button variant="outline" onClick={(e) => { e.stopPropagation(); setEditingId(null); }} className="flex-1 md:flex-none py-1.5 text-[10px] px-3"><X size={12}/> {viewMode === 'list' && <span className="hidden sm:inline">Cancelar</span>}</Button>
                    <Button onClick={(e) => { e.stopPropagation(); saveEdit(team); }} className="flex-1 md:flex-none py-1.5 text-[10px] px-3"><Save size={12}/> {viewMode === 'list' && <span className="hidden sm:inline">Salvar</span>}</Button>
                  </div>
                </div>
              );
            }

            if (viewMode === 'list') {
               return (
                <div key={safeTeamId} onClick={() => setViewingTeam(team)} className="relative bg-slate-900 p-3 sm:p-4 rounded-xl border border-slate-800 hover:border-emerald-500/50 hover:shadow-lg transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 group cursor-pointer">
                  <div className="flex items-center gap-4 flex-1 min-w-0 w-full">
                    <div className="shrink-0"><ShieldDisplay shield={team.shield} size="normal" /></div>
                    <div className="flex-1 min-w-0 pr-10 sm:pr-0">
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm md:text-base font-bold text-white leading-tight truncate group-hover:text-emerald-400 transition-colors">{String(team.name || 'Time')}</h3>
                        {team.ownerId === 'manual' && <span className="text-[9px] bg-amber-500/20 text-amber-400 px-1.5 rounded uppercase font-bold shrink-0">Sem Acesso</span>}
                      </div>
                      <p className="text-[10px] md:text-xs text-slate-400 mt-0.5 truncate"><span className="text-slate-300 font-medium">{String(team.coach || 'Sem técnico')}</span> • {String(team.whatsapp || 'Sem WhatsApp')}</p>
                    </div>
                  </div>
                  {isAdmin && ( 
                  <div className="absolute top-2 right-2 flex gap-1 md:opacity-0 md:group-hover:opacity-100 transition-opacity z-10">
                    <button onClick={(e) => { e.stopPropagation(); startEdit(team); }} className="text-slate-500 hover:text-emerald-400 p-1.5 rounded-lg hover:bg-slate-800" title="Editar"><Edit size={14} /></button> 
                    <button onClick={(e) => { e.stopPropagation(); if(window.confirm('Tem certeza que deseja apagar este time definitivamente?')) { onDeleteTeam(team.id); } }} className="text-slate-500 hover:text-red-400 p-1.5 rounded-lg hover:bg-slate-800" title="Excluir Time"><Trash2 size={14} /></button>
                  </div>
                )}
                  <Button onClick={(e) => { e.stopPropagation(); handleWhatsApp(team.whatsapp); }} className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-500 text-white py-2 px-3 text-xs disabled:bg-slate-800 disabled:text-slate-500 shrink-0 z-10" disabled={!team.whatsapp}>
                    <MessageCircle size={16} /> <span className="sm:hidden lg:inline">Chamar</span>
                  </Button>
                </div>
               );
            }

            return (
              <div key={safeTeamId} onClick={() => setViewingTeam(team)} className="relative bg-slate-900 p-3 md:p-4 rounded-xl border border-slate-800 hover:border-emerald-500/50 hover:shadow-lg transition-all flex flex-col justify-between gap-3 group cursor-pointer">
                {isAdmin && ( 
                    <div className="absolute top-3 sm:top-auto sm:relative right-3 sm:right-auto flex gap-1 sm:opacity-0 sm:group-hover:opacity-100 shrink-0 z-10">
                      <button onClick={(e) => { e.stopPropagation(); startEdit(team); }} className="text-slate-500 hover:text-emerald-400 p-1.5 rounded-lg hover:bg-slate-800 transition-colors" title="Editar"><Edit size={16} /></button>
                      <button onClick={(e) => { e.stopPropagation(); if(window.confirm('Tem certeza que deseja apagar este time definitivamente?')) { onDeleteTeam(team.id); } }} className="text-slate-500 hover:text-red-400 p-1.5 rounded-lg hover:bg-slate-800 transition-colors" title="Excluir Time"><Trash2 size={16} /></button>
                    </div>
                  )}
                <div className="flex flex-col items-center text-center gap-2 mt-2">
                  <div className="shrink-0 relative group-hover:scale-105 transition-transform">
                    <ShieldDisplay shield={team.shield} size="normal" />
                    {team.ownerId === 'manual' && <span className="absolute -top-2 -right-2 text-[8px] bg-amber-500/20 text-amber-400 px-1 rounded shadow" title="Conta Manual">👤</span>}
                  </div>
                  <div className="w-full">
                    <h3 className="text-sm md:text-base font-bold text-white leading-tight truncate px-2 group-hover:text-emerald-400 transition-colors">{String(team.name || 'Time')}</h3>
                    <p className="text-[9px] md:text-[10px] text-slate-400 mt-1 truncate px-1"><span className="text-slate-300 font-medium">{String(team.coach || 'Sem técnico')}</span></p>
                  </div>
                </div>
                <Button onClick={(e) => { e.stopPropagation(); handleWhatsApp(team.whatsapp); }} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white mt-1 py-1.5 text-[10px] md:text-xs px-2 disabled:bg-slate-800 disabled:text-slate-500 z-10" disabled={!team.whatsapp}>
                  <MessageCircle size={14} /> Chamar
                </Button>
              </div>
            );
          })}
        </div>
      )}
      
      {/* Aqui é onde a Mágica acontece! O Modal é renderizado caso exista uma equipe selecionada */}
      {viewingTeam && (
        <TeamStatsModal 
          team={viewingTeam} 
          matches={matches} 
          teams={teams} 
          onClose={() => setViewingTeam(null)} 
        />
      )}
    </div>
  );
};

const Standings = ({ matches, teams, comp }) => {
  const isGroupsFormat = comp?.format === 'groups' && comp?.groups;
  return (
    <div className="animate-in fade-in duration-500">
      {comp?.name && !isGroupsFormat && (
        <div className="flex items-center gap-3 mb-6">
          <Trophy className="text-amber-400" size={28} />
          <h2 className="text-2xl font-bold text-white">Tabela - {comp.name}</h2>
        </div>
      )}
      <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-x-auto shadow-xl">
        {isGroupsFormat ? (
          <div className="flex flex-col">
            {Object.keys(comp.groups || {}).map((gName, idx) => {
              const gTeams = teams.filter(t => (comp.groups[gName] || []).includes(t.id));
              const gTable = calculateStandings(matches, gTeams, comp.id);
              return (
                <div key={gName} className={idx > 0 ? "border-t-4 border-slate-950" : ""}>
                  <div className="bg-slate-800/50 p-3 text-center border-b border-slate-800 flex justify-between px-4"><h3 className="text-sm font-bold text-emerald-400 uppercase tracking-widest">Grupo {gName}</h3></div>
                  <table className="w-full text-left text-sm whitespace-nowrap"><thead className="bg-slate-950/50 text-slate-400 font-medium"><tr><th className="p-4 w-12 text-center">#</th><th className="p-4">Time</th><th className="p-4 text-center">PTS</th><th className="p-4 text-center">J</th><th className="p-4 text-center">V</th><th className="p-4 text-center">E</th><th className="p-4 text-center">D</th><th className="p-4 text-center">GP</th><th className="p-4 text-center">GC</th><th className="p-4 text-center">SG</th></tr></thead>
                    <tbody className="divide-y divide-slate-800/50">
                      {gTable.map((row, index) => {
                        const isQualified = index < (comp.qualifiersPerGroup || 2);
                        return (
                          <tr key={row.id} className={`hover:bg-slate-800/50 transition-colors ${isQualified ? 'bg-emerald-500/5' : ''}`}>
                            <td className={`p-4 text-center font-bold ${isQualified ? 'text-emerald-400' : 'text-slate-500'}`}>{index + 1}</td>
                            <td className="p-4 font-medium text-white flex items-center gap-2"><ShieldDisplay shield={row.shield} size="small" /> {String(row.name)}</td>
                            <td className="p-4 text-center font-bold text-emerald-400">{row.pts}</td><td className="p-4 text-center text-slate-300">{row.p}</td><td className="p-4 text-center text-slate-300">{row.w}</td><td className="p-4 text-center text-slate-300">{row.d}</td><td className="p-4 text-center text-slate-300">{row.l}</td><td className="p-4 text-center text-slate-400">{row.gf}</td><td className="p-4 text-center text-slate-400">{row.ga}</td><td className="p-4 text-center text-slate-400 font-medium">{row.gd > 0 ? `+${row.gd}` : row.gd}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              );
            })}
          </div>
        ) : (
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-slate-950/50 text-slate-400 font-medium">
              <tr><th className="p-4 w-12 text-center">#</th><th className="p-4">Time</th><th className="p-4 text-center">PTS</th><th className="p-4 text-center">J</th><th className="p-4 text-center">V</th><th className="p-4 text-center">E</th><th className="p-4 text-center">D</th><th className="p-4 text-center">GP</th><th className="p-4 text-center">GC</th><th className="p-4 text-center">SG</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {(() => {
                const table = calculateStandings(matches, teams, comp?.id);
                return table.filter(t => t.p > 0 || table.length > 0).map((row, index) => (
                  <tr key={row.id} className="hover:bg-slate-800/50 transition-colors">
                    <td className="p-4 text-center font-bold text-slate-500">{index + 1}</td>
                    <td className="p-4 font-medium text-white flex items-center gap-2"><ShieldDisplay shield={row.shield} size="small" /> {String(row.name)}</td>
                    <td className="p-4 text-center font-bold text-emerald-400">{row.pts}</td><td className="p-4 text-center text-slate-300">{row.p}</td><td className="p-4 text-center text-slate-300">{row.w}</td><td className="p-4 text-center text-slate-300">{row.d}</td><td className="p-4 text-center text-slate-300">{row.l}</td><td className="p-4 text-center text-slate-400">{row.gf}</td><td className="p-4 text-center text-slate-400">{row.ga}</td><td className="p-4 text-center text-slate-400 font-medium">{row.gd > 0 ? `+${row.gd}` : row.gd}</td>
                  </tr>
                ));
              })()}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

const CompetitionDetails = ({ comp, teams, matches, onBack, currentUser, onReleaseRound, onSelectMatch, onDeleteMatch, onEditComp, showToast, onUpdatePlayedMatch }) => {
  const [subTab, setSubTab] = useState('overview'); 
  const [expandedRoundId, setExpandedRoundId] = useState(null);
  
  // NOVO: Estados para a edição de confrontos
  const [editMatchData, setEditMatchData] = useState(null);
  const [showAddTeam, setShowAddTeam] = useState(false);
  const [newTeamToAdd, setNewTeamToAdd] = useState('');

  const handleAddTeamToComp = () => {
    if (!newTeamToAdd) return;
    const updatedComp = { ...comp, teams: [...(comp.teams || []), newTeamToAdd] };
    onEditComp(updatedComp);
    setShowAddTeam(false);
    setNewTeamToAdd('');
  };
  
  const availableTeamsToAdd = (teams || []).filter(t => t && !(comp.teams || []).includes(t.id));

  if (!comp) return (<div className="text-center py-12"><p className="text-slate-400">Torneio não localizado.</p><button onClick={onBack} className="text-emerald-400 underline">Voltar</button></div>);
  
  const getTeam = (id) => (teams || []).find(t => t && t.id === id); 
  const isAdmin = currentUser?.role === 'leader' || currentUser?.role === 'kaioh';

  const [selectedTeamToFill, setSelectedTeamToFill] = useState('');
  const tbdSlots = (comp.teams || []).filter(id => String(id).startsWith('tbd_'));
  const availableTeams = (teams || []).filter(t => t && !(comp.teams || []).includes(t.id));

  const handleFillSlot = () => {
    if (!selectedTeamToFill) return;
    const slotId = tbdSlots[0]; 
    const newTeams = comp.teams.map(id => id === slotId ? selectedTeamToFill : id);
    let newGroups = comp.groups;
    if (newGroups) {
      newGroups = { ...newGroups };
      Object.keys(newGroups).forEach(g => { newGroups[g] = newGroups[g].map(id => id === slotId ? selectedTeamToFill : id); });
    }
    const newRounds = comp.rounds.map(r => ({
      ...r, matches: r.matches.map(m => ({
        ...m, teamA: m.teamA === slotId ? selectedTeamToFill : m.teamA, teamB: m.teamB === slotId ? selectedTeamToFill : m.teamB
      }))
    }));
    onEditComp({ ...comp, teams: newTeams, ...(newGroups && { groups: newGroups }), rounds: newRounds });
    setSelectedTeamToFill('');
    showToast("Vaga preenchida com sucesso!", "success");
  };
  
  const getMatchStatusDisplay = (matchId) => {
    const ms = (matches || []).filter(m => m && m.matchId === matchId && m.compId === comp.id && m.status !== 'rejected');
    if(ms.length === 0) return { isPlayed: false, text: 'Aguardando', color: 'text-slate-500', bg: 'bg-slate-900 border-slate-800' };
    const sm = ms.find(m => m.status === 'approved') || ms.find(m => m.status === 'pending');
    if(!sm) return { isPlayed: false, text: 'Aguardando', color: 'text-slate-500', bg: 'bg-slate-900 border-slate-800' };
    if(sm.status === 'approved') return { submittedMatchId: sm.id, isPlayed: true, scoreA: sm.scoreA, scoreB: sm.scoreB, penaltiesA: sm.penaltiesA, penaltiesB: sm.penaltiesB, text: 'Oficial', color: 'text-emerald-400', bg: 'bg-slate-950 border-emerald-900/50' };
    return { submittedMatchId: sm.id, isPlayed: true, scoreA: sm.scoreA, scoreB: sm.scoreB, penaltiesA: sm.penaltiesA, penaltiesB: sm.penaltiesB, text: 'Validando', color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20' };
  };

  const { topScorers, topAssists } = useMemo(() => {
    const scorers = {}; const assists = {};
    (matches || []).filter(m => m.compId === comp.id && m.status === 'approved').forEach(m => {
      (m.goals || []).forEach(g => {
        if (g.player) {
          const pKey = g.player.trim().toLowerCase() + '_' + g.teamId;
          if(!scorers[pKey]) scorers[pKey] = { player: g.player, teamId: g.teamId, count: 0 };
          scorers[pKey].count += 1;
        }
        if (g.assist) {
          const aKey = g.assist.trim().toLowerCase() + '_' + g.teamId;
          if(!assists[aKey]) assists[aKey] = { player: g.assist, teamId: g.teamId, count: 0 };
          assists[aKey].count += 1;
        }
      });
    });
    return {
      topScorers: Object.values(scorers).sort((a,b) => b.count - a.count).slice(0, 15),
      topAssists: Object.values(assists).sort((a,b) => b.count - a.count).slice(0, 15)
    };
  }, [matches, comp.id]);

  const captureSection = (elementId, fileName) => {
    showToast("Preparando imagem de alta qualidade...", "success");
    const captureAndDownload = () => {
      const element = document.getElementById(elementId);
      if (!element) return;
      window.html2canvas(element, { backgroundColor: '#020617', scale: 2, useCORS: true }).then(canvas => {
        const link = document.createElement('a');
        link.download = `${fileName}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
        showToast("Imagem salva com sucesso!", "success");
      });
    };
    if (window.html2canvas) { captureAndDownload(); } 
    else {
      const script = document.createElement('script');
      script.src = "https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js";
      script.onload = captureAndDownload;
      document.body.appendChild(script);
    }
  };

  const toggleRound = (id) => { setExpandedRoundId(prev => prev === id ? null : id); };

  // NOVO: Função para Migrar Classificados Automaticamente
  const handleAutoMigrateKnockout = () => {
    if (!comp.groups) return;
    showToast("Calculando classificados...", "info");
    
    const qualifiers = {};
    Object.keys(comp.groups).forEach((gName) => {
      const gTeams = (teams || []).filter(t => comp.groups[gName].includes(t.id));
      const gTable = calculateStandings(matches, gTeams, comp.id);
      
      // Associa a posição na tabela (1º, 2º, etc) ao ID do time real
      gTable.forEach((row, idx) => {
        qualifiers[`${idx + 1}º Grupo ${gName}`] = row.id;
        qualifiers[`${idx + 1}º do Grupo ${gName}`] = row.id; // Variação de texto
      });
    });

    const updatedRounds = comp.rounds.map(round => {
      const newMatches = round.matches.map(m => {
        let newA = m.teamA;
        let newB = m.teamB;
        if (!newA && m.placeholderA && qualifiers[m.placeholderA]) newA = qualifiers[m.placeholderA];
        if (!newB && m.placeholderB && qualifiers[m.placeholderB]) newB = qualifiers[m.placeholderB];
        return { ...m, teamA: newA, teamB: newB };
      });
      return { ...round, matches: newMatches };
    });

    onEditComp({ ...comp, rounds: updatedRounds });
    showToast("Mata-Mata preenchido com os classificados!", "success");
  };

  // NOVO: Função para salvar edição de um confronto manual
  const saveMatchEdit = () => {
    // 1. Atualiza a tabela da competição (Calendário)
    const updatedRounds = comp.rounds.map(r => {
      if (r.id === editMatchData.roundId) {
        return {
          ...r,
          matches: r.matches.map(m => m.id === editMatchData.id ? { ...m, teamA: editMatchData.teamA, teamB: editMatchData.teamB } : m)
        };
      }
      return r;
    });
    
    onEditComp({ ...comp, rounds: updatedRounds });

    // 2. MÁGICA: Atualiza o resultado oficial se a partida já tiver acontecido
    const playedMatch = (matches || []).find(m => m.matchId === editMatchData.id && m.compId === comp.id);
    if (playedMatch && onUpdatePlayedMatch) {
      const oldTeamA = playedMatch.teamA;
      const oldTeamB = playedMatch.teamB;
      
      // Transfere os gols do time antigo para o novo time
      const updatedGoals = (playedMatch.goals || []).map(g => {
        if (g.teamId === oldTeamA) return { ...g, teamId: editMatchData.teamA };
        if (g.teamId === oldTeamB) return { ...g, teamId: editMatchData.teamB };
        return g;
      });

      // Salva o relatório de partida atualizado
      onUpdatePlayedMatch({
        ...playedMatch,
        teamA: editMatchData.teamA,
        teamB: editMatchData.teamB,
        goals: updatedGoals
      });
    }

    setEditMatchData(null);
    showToast("Confronto e histórico atualizados permanentemente!", "success");
  };
  const compTeams = (teams || []).filter(t => t && comp.teams?.includes(t.id));

  return (
    <div className="space-y-6 animate-in fade-in pb-10">
      <button onClick={onBack} className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white"><ArrowLeft size={16}/> Voltar</button>
      
      <div>
          <h2 className="text-xl font-bold text-white">{String(comp.name)}</h2>
          <p className="text-xs text-emerald-400 mt-1 uppercase font-bold">
            {comp.format === 'league' ? 'Liga' : comp.format === 'groups' ? 'Fase de Grupos' : 'Mata-Mata'}
          </p>
        </div>
      </div>
      
      {isAdmin && tbdSlots.length > 0 && (
        <div className="bg-amber-500/10 border border-amber-500/30 p-4 rounded-xl flex flex-col md:flex-row items-center gap-4 justify-between animate-in fade-in">
          <div>
            <h4 className="text-amber-400 font-bold text-sm">Vagas Abertas: {tbdSlots.length}</h4>
            <p className="text-xs text-amber-500/70">Adicione os times confirmados nas vagas que sobraram.</p>
          </div>
          <div className="flex w-full md:w-auto gap-2">
            <select value={selectedTeamToFill} onChange={e=>setSelectedTeamToFill(e.target.value)} className="bg-slate-950 text-xs text-white p-2 rounded border border-slate-700 outline-none flex-1 md:w-48">
              <option value="">Selecione um time...</option>
              {availableTeams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
            <Button disabled={!selectedTeamToFill} onClick={handleFillSlot} className="py-2 text-[10px] whitespace-nowrap bg-amber-600 hover:bg-amber-500 text-slate-950 font-black">Ocupar Vaga</Button>
          </div>
        </div>
      )}

      <div className="flex gap-1 p-1 bg-slate-950 rounded-xl border border-slate-800">
        
        {/* NOVO BOTÃO DE INSERIR TIME */}
        {isAdmin && (
          <div className="flex gap-2 w-full md:w-auto">
            {showAddTeam ? (
              <div className="flex gap-2 w-full animate-in fade-in">
                <select value={newTeamToAdd} onChange={e=>setNewTeamToAdd(e.target.value)} className="flex-1 md:w-48 bg-slate-950 border border-slate-700 rounded-lg p-2 text-xs text-white outline-none">
                  <option value="">Escolher time...</option>
                  {availableTeamsToAdd.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
                <Button onClick={handleAddTeamToComp} className="py-1 px-3 text-xs">Salvar</Button>
                <Button variant="outline" onClick={()=>{setShowAddTeam(false); setNewTeamToAdd('');}} className="py-1 px-2 text-xs font-bold text-slate-400">X</Button>
              </div>
            ) : (
              <Button variant="outline" onClick={()=>setShowAddTeam(true)} className="py-2 px-3 text-xs w-full md:w-auto flex items-center justify-center gap-2">
                <span className="text-emerald-400 font-bold">+</span> Inserir Time
              </Button>
            )}
          </div>
        )}
      </div>
      
      <div className="flex gap-1 p-1 bg-slate-950 rounded-xl border border-slate-800">
        <button onClick={()=>setSubTab('overview')} className={`flex-1 py-1.5 text-xs rounded-lg font-bold transition-all ${subTab==='overview'?'bg-emerald-600 text-white shadow-md':'text-slate-500 hover:text-white'}`}>Tabela & Jogos</button>
        <button onClick={()=>setSubTab('stats')} className={`flex-1 py-1.5 text-xs rounded-lg font-bold transition-all ${subTab==='stats'?'bg-emerald-600 text-white shadow-md':'text-slate-500 hover:text-white'}`}>Estatísticas</button>
      </div>
      
      <div className="space-y-8 mt-4">
        {subTab === 'overview' && (
          <div className="space-y-8 animate-in slide-in-from-left-4">
            
            <div className="space-y-2">
              <div className="flex justify-between items-end mb-2">
                <h3 className="text-lg font-bold text-white pl-2">Classificação</h3>
                <Button onClick={() => captureSection('capture-standings', `Tabela-${comp.name}`)} className="text-[10px] py-1 px-3 shadow-lg" variant="outline"><Camera size={14}/> Salvar Tabela</Button>
              </div>
              <div id="capture-standings" className="bg-slate-950 p-3 sm:p-5 rounded-2xl border border-slate-800">
                <h3 className="text-center font-black text-emerald-400 mb-4 text-sm uppercase tracking-widest">{comp.name}</h3>
                <Standings matches={matches} teams={compTeams} comp={comp} />
              </div>
            </div>
            
            <div className="space-y-3 pt-4 border-t border-slate-800/50">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-3 mb-4 pl-2">
                <h3 className="text-lg font-bold text-white">Rodadas e Confrontos</h3>
                {/* Botão de Auto-Migração para Formato de Grupos */}
                {isAdmin && comp.format === 'groups' && (
                  <Button onClick={handleAutoMigrateKnockout} className="text-[10px] py-1.5 px-3 bg-blue-600 hover:bg-blue-500 text-white border-0 shadow-lg" variant="outline">
                    🔄 Migrar Classificados para Mata-Mata
                  </Button>
                )}
              </div>

              {(comp.rounds || []).map((round) => {
                const isExpanded = expandedRoundId === round.id;
                return (
                  <div key={round?.id} className={`bg-slate-900 border ${isExpanded ? 'border-emerald-500/50 shadow-lg' : 'border-slate-800 hover:border-slate-700'} rounded-xl overflow-hidden transition-all`}>
                    <button onClick={() => toggleRound(round.id)} className="w-full bg-slate-950/60 p-4 flex justify-between items-center transition-colors outline-none">
                      <span className={`text-sm font-bold flex items-center gap-2 ${isExpanded ? 'text-emerald-400' : 'text-white'}`}>
                        {round.status === 'locked' ? <Lock size={16} className="text-slate-500"/> : <PlayCircle size={16} className="text-emerald-500"/>}
                        Rodada {String(round?.number || '')}
                      </span>
                      <div className="flex items-center gap-3">
                        {isAdmin && round?.status === 'locked' && <Button onClick={(e)=>{e.stopPropagation(); onReleaseRound(comp.id, round.id)}} className="py-1 text-[10px]">Liberar</Button>}
                        <span className={`font-bold transition-transform duration-300 ${isExpanded ? 'text-emerald-400 rotate-180' : 'text-slate-500'}`}>▼</span>
                      </div>
                    </button>
                    
                    {isExpanded && (
                      <div className="bg-slate-900 border-t border-slate-800 animate-in slide-in-from-top-2 p-3">
                        <div className="flex justify-end mb-3 px-1">
                           <Button onClick={() => captureSection(`capture-round-${round.id}`, `Rodada-${round.number}-${comp.name}`)} className="text-[10px] py-1 px-3 shadow-md" variant="outline"><Camera size={12}/> Print da Rodada</Button>
                        </div>
                        
                        <div id={`capture-round-${round.id}`} className="bg-slate-950 p-4 rounded-xl border border-slate-800/50 space-y-3">
                          <h4 className="text-center font-bold text-white mb-4 text-xs uppercase tracking-widest">{comp.name} <span className="text-emerald-400">• Rodada {round.number}</span></h4>
                          
                          {(round?.matches || []).map((m) => {
                            const tA = getTeam(m.teamA); const tB = getTeam(m.teamB); const sUI = getMatchStatusDisplay(m.id);
                            
                            // MODO EDIÇÃO DO CONFRONTO
                            if (editMatchData?.id === m.id) {
                              return (
                                <div key={m.id} className="bg-slate-900 p-3 rounded-lg border border-emerald-500/50 flex flex-col gap-3 shadow-lg">
                                  <div className="flex items-center gap-2">
                                    <select value={editMatchData.teamA || ''} onChange={e=>setEditMatchData({...editMatchData, teamA: e.target.value})} className="flex-1 bg-slate-950 text-xs text-white p-2 rounded border border-slate-700 outline-none">
                                      <option value="">{m.placeholderA || 'Selecione a Equipe A'}</option>
                                      {compTeams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                                    </select>
                                    <span className="font-bold text-slate-500 text-xs">X</span>
                                    <select value={editMatchData.teamB || ''} onChange={e=>setEditMatchData({...editMatchData, teamB: e.target.value})} className="flex-1 bg-slate-950 text-xs text-white p-2 rounded border border-slate-700 outline-none">
                                      <option value="">{m.placeholderB || 'Selecione a Equipe B'}</option>
                                      {compTeams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                                    </select>
                                  </div>
                                  <div className="flex justify-end gap-2">
                                    <Button variant="outline" onClick={()=>setEditMatchData(null)} className="py-1 px-3 text-[10px]">Cancelar</Button>
                                    <Button onClick={saveMatchEdit} className="py-1 px-3 text-[10px]">Salvar</Button>
                                  </div>
                                </div>
                              );
                            }

                            return (
                              <div key={m.id} className="relative group">
                                <div onClick={()=>{if(sUI.isPlayed && onSelectMatch){const found = matches.find(x=>x.id===sUI.submittedMatchId); if(found) onSelectMatch(found)}}} className={`bg-slate-900 p-3 rounded-lg border border-slate-800 flex items-center justify-between text-xs cursor-pointer hover:border-slate-700 transition-colors pr-10`}>
                                  <div className="flex-1 flex items-center justify-end gap-2 overflow-hidden">
                                    <span className="truncate font-bold text-slate-200">{tA?.name || m.placeholderA}</span>
                                    <div className="shrink-0"><ShieldDisplay shield={tA?.shield} size="small" /></div>
                                  </div>
                                  <div className={`mx-3 px-3 py-1 border rounded font-mono font-bold shrink-0 shadow-inner ${sUI.bg} ${sUI.color}`}>{sUI.isPlayed ? `${sUI.scoreA} x ${sUI.scoreB}` : 'vs'}</div>
                                  <div className="flex-1 flex items-center justify-start gap-2 overflow-hidden">
                                    <div className="shrink-0"><ShieldDisplay shield={tB?.shield} size="small" /></div>
                                    <span className="truncate font-bold text-slate-200">{tB?.name || m.placeholderB}</span>
                                  </div>
                                </div>
                                {/* Botão de Editar Confronto (Apenas Líderes) */}
                                {isAdmin && (
                                  <button onClick={(e) => { e.stopPropagation(); setEditMatchData({ ...m, roundId: round.id }); }} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-emerald-400 p-2 bg-slate-950 rounded-lg opacity-0 group-hover:opacity-100 transition-all z-10" title="Editar Confronto">
                                    <Edit size={14} />
                                  </button>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {subTab === 'stats' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-in slide-in-from-right-4">
            {/* Bloco de Artilharia (Continua igual) */}
            <div className="space-y-2">
              <div className="flex justify-between items-end mb-2">
                <h3 className="text-lg font-bold text-white pl-2">Top Goleadores</h3>
                <Button onClick={() => captureSection('capture-scorers', `Artilharia-${comp.name}`)} className="text-[10px] py-1 px-3 shadow-lg" variant="outline"><Camera size={14}/> Salvar</Button>
              </div>
              <div id="capture-scorers" className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden shadow-xl p-2 sm:p-4">
                <div className="bg-slate-950/80 p-4 border border-slate-800 rounded-xl mb-4 flex flex-col items-center justify-center">
                  <h3 className="font-bold text-emerald-400 text-lg uppercase tracking-widest text-center">⚽ Artilharia</h3>
                  <span className="text-[10px] font-bold text-slate-400 mt-1">{comp.name}</span>
                </div>
                <div className="divide-y divide-slate-800/50 bg-slate-950 rounded-xl border border-slate-800">
                  {topScorers.length === 0 ? <p className="p-6 text-sm text-slate-500 text-center">Nenhum gol validado até o momento.</p> : topScorers.map((s, idx) => (
                    <div key={idx} className="p-3 flex items-center justify-between hover:bg-slate-800/50 transition-colors">
                      <div className="flex items-center gap-3">
                        <span className={`font-black w-6 text-center ${idx === 0 ? 'text-amber-400 text-lg' : idx === 1 ? 'text-slate-300 text-lg' : idx === 2 ? 'text-amber-700 text-lg' : 'text-slate-600'}`}>{idx + 1}º</span>
                        <ShieldDisplay shield={getTeam(s.teamId)?.shield} size="normal" />
                        <div className="flex flex-col">
                          <span className="font-bold text-slate-200 text-sm md:text-base leading-tight">{s.player}</span>
                          <span className="text-[10px] md:text-xs text-slate-400 font-medium">{getTeam(s.teamId)?.name}</span>
                        </div>
                      </div>
                      <div className="bg-slate-900 px-4 py-2 rounded-lg border border-slate-800 text-emerald-400 font-black text-lg">{s.count}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Bloco de Assistências (Continua igual) */}
            <div className="space-y-2">
              <div className="flex justify-between items-end mb-2">
                <h3 className="text-lg font-bold text-white pl-2">Top Garçons</h3>
                <Button onClick={() => captureSection('capture-assists', `Assistencias-${comp.name}`)} className="text-[10px] py-1 px-3 shadow-lg" variant="outline"><Camera size={14}/> Salvar</Button>
              </div>
              <div id="capture-assists" className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden shadow-xl p-2 sm:p-4">
                <div className="bg-slate-950/80 p-4 border border-slate-800 rounded-xl mb-4 flex flex-col items-center justify-center">
                  <h3 className="font-bold text-blue-400 text-lg uppercase tracking-widest text-center flex items-center gap-2"><Star size={20}/> Assistências</h3>
                  <span className="text-[10px] font-bold text-slate-400 mt-1">{comp.name}</span>
                </div>
                <div className="divide-y divide-slate-800/50 bg-slate-950 rounded-xl border border-slate-800">
                  {topAssists.length === 0 ? <p className="p-6 text-sm text-slate-500 text-center">Nenhuma assistência validada até o momento.</p> : topAssists.map((a, idx) => (
                    <div key={idx} className="p-3 flex items-center justify-between hover:bg-slate-800/50 transition-colors">
                      <div className="flex items-center gap-3">
                        <span className={`font-black w-6 text-center ${idx === 0 ? 'text-amber-400 text-lg' : idx === 1 ? 'text-slate-300 text-lg' : idx === 2 ? 'text-amber-700 text-lg' : 'text-slate-600'}`}>{idx + 1}º</span>
                        <ShieldDisplay shield={getTeam(a.teamId)?.shield} size="normal" />
                        <div className="flex flex-col">
                          <span className="font-bold text-slate-200 text-sm md:text-base leading-tight">{a.player}</span>
                          <span className="text-[10px] md:text-xs text-slate-400 font-medium">{getTeam(a.teamId)?.name}</span>
                        </div>
                      </div>
                      <div className="bg-slate-900 px-4 py-2 rounded-lg border border-slate-800 text-blue-400 font-black text-lg">{a.count}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

          </div>
        )}
      </div>
    </div>
  );
};

const CreateCompetition = ({ teams, currentUser, onCreate }) => {
  const [name, setName] = useState('');
  const [format, setFormat] = useState('league');
  const [teamCount, setTeamCount] = useState('');
  const [numGroups, setNumGroups] = useState('2');
  const [qualifiers, setQualifiers] = useState('2');
  const [isDoubleRound, setIsDoubleRound] = useState(false);
  const [deadline, setDeadline] = useState('');
  
  // NOVOS ESTADOS FINANCEIROS
  const [isPaid, setIsPaid] = useState(false);
  const [entryFee, setEntryFee] = useState('');
  const [pixKey, setPixKey] = useState('');
  const [prize1st, setPrize1st] = useState('');
  const [prize2nd, setPrize2nd] = useState('');
  const [prize3rd, setPrize3rd] = useState('');
  const [passesToRaffle, setPassesToRaffle] = useState('');

  const [selectedTeams, setSelectedTeams] = useState([]);
  const [error, setError] = useState('');

  const toggleTeam = (teamId) => {
    if (selectedTeams.includes(teamId)) setSelectedTeams(selectedTeams.filter(id => id !== teamId));
    else setSelectedTeams([...selectedTeams, teamId]);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name || !format || !teamCount || !deadline) { setError('Preencha os dados básicos do torneio.'); return; }
    if (selectedTeams.length > parseInt(teamCount)) { setError(`Atenção: Você selecionou mais times do que o limite de ${teamCount} vagas.`); return; }
    if (isPaid && (!entryFee || !pixKey || !prize1st || !prize2nd)) { setError('Em torneios pagos, preencha a taxa, a chave PIX e os prêmios do 1º e 2º lugar.'); return; }

    setError('');
    const compId = `c${Date.now()}`;
    
    // MÁGICA DAS VAGAS ABERTAS: Preenche os espaços vazios com códigos de vagas
    const targetCount = parseInt(teamCount);
    const finalSelectedTeams = [...selectedTeams];
    let tbdCount = 1;
    while(finalSelectedTeams.length < targetCount) {
      finalSelectedTeams.push(`tbd_${compId}_${tbdCount}`);
      tbdCount++;
    }

    let finalRounds = [];
    let groupsData = null;

    if (format === 'groups') {
      const res = generateGroupsAndKnockout(finalSelectedTeams, compId, parseInt(numGroups), parseInt(qualifiers), isDoubleRound);
      finalRounds = res.rounds;
      groupsData = res.groups;
    } else if (format === 'cup') {
      finalRounds = generateCupBracket(finalSelectedTeams, compId);
    } else {
      finalRounds = generateRoundRobin(finalSelectedTeams, compId, isDoubleRound);
    }

    const newComp = { 
      id: compId, name, format, deadline, status: 'active', teams: finalSelectedTeams, rounds: finalRounds,
      createdBy: currentUser?.name || 'Desconhecido',
      ...(groupsData && { groups: groupsData, qualifiersPerGroup: parseInt(qualifiers) }),
      // Adicionando os dados financeiros se for pago
      isPaid: isPaid,
      ...(isPaid && {
        entryFee: parseFloat(entryFee),
        pixKey: pixKey,
        prizes: {
          first: parseFloat(prize1st),
          second: parseFloat(prize2nd),
          third: prize3rd ? parseFloat(prize3rd) : 0,
          passesCount: passesToRaffle ? parseInt(passesToRaffle) : 0
        }
      })
    };

    onCreate(newComp);
  };

  return (
    <div className="max-w-3xl mx-auto animate-in fade-in pb-12">
      <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2"><PlusCircle className="text-emerald-500"/> Nova Competição</h2>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        {error && <div className="bg-amber-500/10 border border-amber-500/50 text-amber-400 p-4 rounded-xl flex items-center gap-3"><AlertCircle size={20} /><p className="text-sm font-medium">{error}</p></div>}
        
        {/* BLOCO 1: DADOS BÁSICOS */}
        <div className="bg-slate-900 p-6 md:p-8 rounded-2xl border border-slate-800">
          <h3 className="text-lg font-bold text-emerald-400 mb-4 flex items-center gap-2"><Trophy size={18}/> Estrutura do Torneio</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2"><label className="text-sm font-medium text-slate-400">Nome do Campeonato</label><input type="text" placeholder="Ex: Liga de Inverno" value={name} onChange={e=>setName(e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-white focus:ring-2 focus:ring-emerald-500 outline-none" required /></div>
            <div className="space-y-2"><label className="text-sm font-medium text-slate-400">Formato</label>
              <select value={format} onChange={e=>setFormat(e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-white focus:ring-2 focus:ring-emerald-500 outline-none">
                <option value="league">Pontos Corridos (Liga)</option><option value="cup">Mata-Mata (Copa)</option><option value="groups">Fase de Grupos + Mata-Mata</option>
              </select>
            </div>
            <div className="space-y-2"><label className="text-sm font-medium text-slate-400">Qtd. de Times</label><input type="number" min="2" placeholder="Ex: 8" value={teamCount} onChange={e=>setTeamCount(e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-white focus:ring-2 focus:ring-emerald-500 outline-none" required /></div>
            <div className="space-y-2"><label className="text-sm font-medium text-slate-400">Prazo de Conclusão</label><input type="date" value={deadline} onChange={e=>setDeadline(e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-slate-300 focus:ring-2 focus:ring-emerald-500 outline-none" required /></div>
            
            {format !== 'cup' && (
              <div className="space-y-2 flex items-center gap-2 mt-4 col-span-1 md:col-span-2 bg-slate-950 p-4 rounded-lg border border-slate-800">
                <input type="checkbox" id="isDoubleRound" checked={isDoubleRound} onChange={e=>setIsDoubleRound(e.target.checked)} className="w-5 h-5 accent-emerald-500 cursor-pointer" />
                <label htmlFor="isDoubleRound" className="text-sm font-bold text-slate-300 cursor-pointer">Jogos com Turno e Returno (Ida e Volta)</label>
              </div>
            )}

            {format === 'groups' && (
              <><div className="space-y-2"><label className="text-sm font-medium text-slate-400">Quantidade de Grupos</label>
                  <select value={numGroups} onChange={e=>setNumGroups(e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-white focus:ring-2 focus:ring-emerald-500 outline-none"><option value="2">2 Grupos</option><option value="4">4 Grupos</option><option value="8">8 Grupos</option></select>
                </div><div className="space-y-2"><label className="text-sm font-medium text-slate-400">Classificados por Grupo</label>
                  <select value={qualifiers} onChange={e=>setQualifiers(e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-white focus:ring-2 focus:ring-emerald-500 outline-none"><option value="1">1 Time</option><option value="2">2 Times</option><option value="4">4 Times</option></select>
                </div></>
            )}
          </div>
        </div>

        {/* BLOCO 2: FINANCEIRO E PREMIAÇÃO */}
        <div className={`p-6 md:p-8 rounded-2xl border transition-colors ${isPaid ? 'bg-amber-500/5 border-amber-500/40' : 'bg-slate-900 border-slate-800'}`}>
          <div className="flex items-center justify-between mb-6">
             <h3 className={`text-lg font-bold flex items-center gap-2 ${isPaid ? 'text-amber-400' : 'text-slate-300'}`}>🤑 Torneio Premium (Pago)</h3>
             <label className="relative inline-flex items-center cursor-pointer">
               <input type="checkbox" checked={isPaid} onChange={e=>setIsPaid(e.target.checked)} className="sr-only peer" />
               <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500"></div>
             </label>
          </div>
          
          {isPaid && (
            <div className="space-y-6 animate-in slide-in-from-top-2">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2"><label className="text-sm font-bold text-amber-400">Valor da Inscrição (R$)</label><input type="number" placeholder="Ex: 10.00" value={entryFee} onChange={e=>setEntryFee(e.target.value)} className="w-full bg-slate-950 border border-amber-500/30 rounded-lg p-3 text-white outline-none" required={isPaid} /></div>
                <div className="space-y-2"><label className="text-sm font-bold text-amber-400">Sua Chave PIX</label><input type="text" placeholder="Celular, CPF ou E-mail" value={pixKey} onChange={e=>setPixKey(e.target.value)} className="w-full bg-slate-950 border border-amber-500/30 rounded-lg p-3 text-white outline-none" required={isPaid} /></div>
              </div>

              <div className="pt-4 border-t border-amber-500/20">
                <h4 className="text-sm font-bold text-slate-300 mb-4">🏆 Distribuição dos Prêmios (Valores Fixos)</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2"><label className="text-xs text-slate-400">🥇 1º Lugar (R$)</label><input type="number" placeholder="Ex: 150.00" value={prize1st} onChange={e=>setPrize1st(e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white outline-none" required={isPaid} /></div>
                  <div className="space-y-2"><label className="text-xs text-slate-400">🥈 2º Lugar (R$)</label><input type="number" placeholder="Ex: 50.00" value={prize2nd} onChange={e=>setPrize2nd(e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white outline-none" required={isPaid} /></div>
                  <div className="space-y-2"><label className="text-xs text-slate-400">🥉 3º Lugar (Opcional)</label><input type="number" placeholder="Ex: 20.00" value={prize3rd} onChange={e=>setPrize3rd(e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white outline-none" /></div>
                </div>
              </div>

              <div className="pt-4 border-t border-amber-500/20">
                <h4 className="text-sm font-bold text-slate-300 mb-2">🎟️ Sorteio de Passes de Temporada</h4>
                <p className="text-[10px] text-slate-500 mb-3">Estes passes (R$ 9,90 cada) serão sorteados automaticamente entre os times que não entrarem no Top 3 ao encerrar o campeonato.</p>
                <div className="space-y-2"><label className="text-xs text-slate-400">Quantidade de Passes Sorteados</label><input type="number" placeholder="Ex: 2" value={passesToRaffle} onChange={e=>setPassesToRaffle(e.target.value)} className="w-full md:w-1/3 bg-slate-950 border border-slate-700 rounded-lg p-2 text-white outline-none" /></div>
              </div>
            </div>
          )}
        </div>

        {/* BLOCO 3: SELEÇÃO DE TIMES */}
        <div className="bg-slate-900 p-6 md:p-8 rounded-2xl border border-slate-800">
          <div className="flex justify-between items-end mb-4"><label className="text-sm font-medium text-slate-400">Selecione as Equipes ({selectedTeams.length} marcadas)</label></div>
          {teams.length === 0 ? <p className="text-slate-500 text-sm p-4 bg-slate-950 rounded border border-slate-800">Nenhum time cadastrado.</p> : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {teams.map(team => { 
                const isSelected = selectedTeams.includes(team.id); 
                return ( 
                  <div key={team.id} onClick={() => toggleTeam(team.id)} className={`cursor-pointer flex items-center gap-3 p-3 rounded-xl border transition-all ${isSelected ? 'bg-emerald-500/10 border-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.1)]' : 'bg-slate-950 border-slate-800 hover:border-slate-600'}`}>
                    <ShieldDisplay shield={team.shield} size="small" />
                    <span className={`font-medium text-sm truncate ${isSelected ? 'text-emerald-400' : 'text-slate-300'}`}>{team.name}</span>
                  </div> 
                ); 
              })}
            </div>
          )}
        </div>
        
        <Button type="submit" className={`w-full py-5 text-lg font-black mt-4 ${isPaid ? 'bg-amber-500 hover:bg-amber-400 text-slate-950' : ''}`}>
          {isPaid ? '💰 Confirmar Torneio Premiado' : 'Criar Campeonato'}
        </Button>
      </form>
    </div>
  );
};

const CompetitionsList = ({ competitions, teams, currentUser, onSelectComp, onDeleteComp }) => {
  const isAdmin = currentUser?.role === 'leader' || currentUser?.role === 'kaioh';
  const userTeamIds = (teams || []).filter(t => t && t.ownerId === currentUser?.id).map(t => t.id);
  const visible = (competitions || []).filter(c => c && (isAdmin || c.teams?.some(t => userTeamIds.includes(t))));
  return (
    <div className="space-y-4 animate-in fade-in">
      <div className="flex items-center gap-2 mb-4"><Medal className="text-emerald-500"/><h2 className="text-xl font-bold text-white">Campeonatos Ativos</h2></div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {visible.map(c => (
          <div key={c.id} onClick={()=>onSelectComp(c.id)} className="bg-slate-900 p-5 rounded-2xl border border-slate-800 hover:border-emerald-500/40 transition-all cursor-pointer flex justify-between items-center group">
            <div><h3 className="font-bold text-white group-hover:text-emerald-400 transition-colors">{String(c.name)}</h3><p className="text-xs text-slate-500 mt-1">{c.teams?.length || 0} Clubes inscritos</p></div>
            {isAdmin && <button onClick={(e)=>{e.stopPropagation(); if(window.confirm('Excluir torneio?')) onDeleteComp(c.id)}} className="text-slate-600 hover:text-red-400 p-1"><Trash2 size={16}/></button>}
          </div>
        ))}
      </div>
    </div>
  );
};

const MatchDetails = ({ match, teams, competitions, onBack }) => {
  if (!match) return null; const getTeam = (id) => (teams || []).find(t => t && t.id === id);
  const tA = getTeam(match.teamA); const tB = getTeam(match.teamB);
  return (
    <div className="max-w-xl mx-auto space-y-4 bg-slate-900 border border-slate-800 p-6 rounded-2xl animate-in fade-in">
      <button onClick={onBack} className="text-xs text-slate-400 hover:text-white flex items-center gap-1"><ArrowLeft size={14}/> Voltar</button>
      <div className="text-center font-mono border-b border-slate-800 pb-3"><span className="text-emerald-400 text-2xl font-black">{match.scoreA} x {match.scoreB}</span><div className="text-xs text-slate-400 mt-1">{tA?.name} vs {tB?.name}</div></div>
      <div className="space-y-2"><span className="text-xs text-slate-500 uppercase font-bold block">Gols</span>
        {(match.goals || []).map((g, i) => (<div key={i} className="text-xs bg-slate-950 p-2 rounded border border-slate-800">⚽ <b>{g.player}</b> ({g.minute}') {g.assist && `• Assist: ${g.assist}`}</div>))}
      </div>
      {match.imageUrl && <div className="pt-2"><span className="text-xs text-slate-500 block mb-2">Comprovante:</span><img src={match.imageUrl} className="w-full rounded-lg border border-slate-800 max-h-[300px] object-contain bg-black" alt="Comprovante" /></div>}
    </div>
  );
};

const SubmitMatch = ({ teams, competitions, matches, onSubmit, currentUser, showToast }) => {
  const [selectedCompId, setSelectedCompId] = useState('');
  const [selectedMatchId, setSelectedMatchId] = useState('');
  const [availableMatches, setAvailableMatches] = useState([]);
  
  const [teamA, setTeamA] = useState(null);
  const [teamB, setTeamB] = useState(null);
  const [scoreA, setScoreA] = useState('');
  const [scoreB, setScoreB] = useState('');
  const [penaltiesA, setPenaltiesA] = useState('');
  const [penaltiesB, setPenaltiesB] = useState('');

  const [goalsA, setGoalsA] = useState([]);
  const [goalsB, setGoalsB] = useState([]);
  const [observacoes, setObservacoes] = useState('');
  
  const [matchImageBase64, setMatchImageBase64] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [imageUploaded, setImageUploaded] = useState(false);
  
  // NOVO ESTADO: Controle do modo de preenchimento manual
  const [isManualMode, setIsManualMode] = useState(false);

  // Controle de Chave da IA Direto pelo Usuário no Navegador
  const [userApiKey, setUserApiKey] = useState(() => localStorage.getItem('gemini_api_key') || '');
  const [showKeyInput, setShowKeyInput] = useState(false);
  const [tempKey, setTempKey] = useState('');

  const isAdmin = currentUser?.role === 'leader' || currentUser?.role === 'kaioh';
  
  const userTeamIds = (teams || []).filter(t => t.ownerId === currentUser?.id).map(t => t.id);
  const visibleCompetitions = (competitions || []).filter(c => isAdmin || (c.teams || []).some(tId => userTeamIds.includes(tId)));

  const selectedComp = useMemo(() => (competitions || []).find(c => c.id === selectedCompId), [selectedCompId, competitions]);
  const isCup = selectedComp?.format === 'cup' || (selectedComp?.format === 'groups' && selectedMatchId.includes('_ko_'));
  const isTie = scoreA !== '' && scoreB !== '' && scoreA === scoreB;

  useEffect(() => {
    setSelectedMatchId('');
    resetAI();
    if (!selectedCompId) {
      setAvailableMatches([]);
      return;
    }
    const comp = competitions.find(c => c.id === selectedCompId);
    if (comp && comp.rounds) {
      let toPlay = [];
      comp.rounds.filter(r => r.status === 'released').forEach(round => {
        round.matches.forEach(rm => {
          const alreadySubmitted = matches.some(m => m.matchId === rm.id && (m.status === 'pending' || m.status === 'approved'));
          if (!alreadySubmitted && rm.teamA && rm.teamB && (isAdmin || userTeamIds.includes(rm.teamA) || userTeamIds.includes(rm.teamB))) {
            toPlay.push({ ...rm, roundId: round.id });
          }
        });
      });
      setAvailableMatches(toPlay);
    }
  }, [selectedCompId, competitions, matches]);

  useEffect(() => {
    resetAI();
    if (selectedMatchId) {
      const match = availableMatches.find(m => m.id === selectedMatchId);
      if (match) {
        setTeamA((teams || []).find(t => t.id === match.teamA));
        setTeamB((teams || []).find(t => t.id === match.teamB));
      }
    } else {
      setTeamA(null); setTeamB(null);
    }
  }, [selectedMatchId, availableMatches, teams]);

  const resetAI = () => {
    setScoreA(''); setScoreB('');
    setPenaltiesA(''); setPenaltiesB('');
    setGoalsA([]); setGoalsB([]);
    setObservacoes('');
    setImageUploaded(false);
    setMatchImageBase64(null);
    setIsManualMode(false); // Zerando o modo manual ao trocar de jogo
  };

  const calculateSimilarity = (str1, str2) => {
    if(!str1 || !str2) return 0;
    const words1 = str1.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/).filter(w => w.length > 2);
    const words2 = str2.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/).filter(w => w.length > 2);
    return words1.filter(w => words2.includes(w)).length;
  };

  const handleSaveApiKey = () => {
    if (tempKey.trim() !== '') {
      localStorage.setItem('gemini_api_key', tempKey.trim());
      setUserApiKey(tempKey.trim());
      setShowKeyInput(false);
      showToast("Chave da IA ativada com sucesso no seu navegador!", "success");
    }
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!userApiKey) {
      setShowKeyInput(true);
      showToast("Por favor, cole a sua chave do Gemini primeiro.", "error");
      return;
    }

    processScreenshot(file, async (base64) => {
      setMatchImageBase64(base64);
      setIsAnalyzing(true);
      setScoreA('0'); setScoreB('0'); setGoalsA([]); setGoalsB([]); setPenaltiesA(''); setPenaltiesB('');

      try {
        const prompt = `Analise o placar final deste jogo de Dream League Soccer (DLS).
REGRAS:
1. O escudo do lado ESQUERDO tem um placar. O escudo do lado DIREITO tem um placar.
2. Na lista central, identifique quem fez gol. GOLS possuem o ícone de uma BOLA DE FUTEBOL (⚽) ao lado.
3. ASSISTÊNCIAS: Possuem o ícone de uma CHUTEIRA (👟) ao lado. Vincule a assistência ao gol do mesmo lado correspondente. Nem todo gol tem assistência. Deixe o campo assist vazio ("") se não houver.
4. CARTÕES possuem um ícone retangular (🟨/🟥). IGNORE COMPLETAMENTE os jogadores com cartões.
5. Liste os jogadores e minutos agrupando por quem está no lado esquerdo ou direito. Remova os parênteses dos minutos.

Retorne EXATAMENTE este formato JSON. Não use marcações de código Markdown e não escreva mais nada.
{
  "leftTeamName": "nome lido no escudo da esquerda",
  "leftScore": 0,
  "leftGoals": [{"player": "Nome do Goleador", "assist": "Nome da Assistência ou vazio", "minute": "90"}],
  "rightTeamName": "nome lido no escudo da direita",
  "rightScore": 0,
  "rightGoals": [{"player": "Nome do Goleador", "assist": "", "minute": "90"}]
}`;
        
        const mimeType = base64.match(/data:(.*?);base64/)[1];
        const base64ImageData = base64.split(',')[1];

        const payload = {
          contents: [{ 
            role: "user", 
            parts: [ 
              { text: prompt }, 
              { inlineData: { mimeType: mimeType, data: base64ImageData } } 
            ] 
          }],
          generationConfig: { responseMimeType: "application/json" }
        };

      const safeKey = encodeURIComponent(userApiKey.trim());
        const endpoints = [
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${safeKey}`,
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${safeKey}`,
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${safeKey}`
        ];

        let resultJson;
        let lastError;

        for (const url of endpoints) {
          if (resultJson) break;
          
          try {
            const response = await fetch(url, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(payload)
            });

            if (!response.ok) {
               const errData = await response.json().catch(() => null);
               const errorMsg = errData?.error?.message || `Erro ${response.status}`;
               
               if (response.status === 403 || response.status === 400) {
                 localStorage.removeItem('gemini_api_key');
                 setUserApiKey('');
                 setShowKeyInput(true);
                 throw new Error("Sua Chave da IA é inválida. Verifique se copiou tudo corretamente.");
               }
               throw new Error(`Erro Google: ${errorMsg}`);
            }

            resultJson = await response.json();
          } catch (error) {
            lastError = error;
            if (error.message.includes("inválida")) throw error;
          }
        }

        if (!resultJson || !resultJson.candidates) throw lastError || new Error("A IA não conseguiu ler o placar.");

        let textResponse = resultJson.candidates[0].content.parts[0].text.trim();
        textResponse = textResponse.replace(/```json/gi, '').replace(/```/g, '').trim();
        
        const data = JSON.parse(textResponse);

        const leftName = String(data.leftTeamName || "");
        const rightName = String(data.rightTeamName || "");
        const nameA = String(teamA?.name || "");
        const nameB = String(teamB?.name || "");

        const leftMatchesA = calculateSimilarity(leftName, nameA);
        const rightMatchesA = calculateSimilarity(rightName, nameA);
        const leftMatchesB = calculateSimilarity(leftName, nameB);
        const rightMatchesB = calculateSimilarity(rightName, nameB);

        const isTeamA_Left = (leftMatchesA + rightMatchesB) >= (leftMatchesB + rightMatchesA);

        if (isTeamA_Left) {
          setScoreA(data.leftScore?.toString() || '0');
          setScoreB(data.rightScore?.toString() || '0');
          setGoalsA(data.leftGoals || []);
          setGoalsB(data.rightGoals || []);
        } else {
          setScoreA(data.rightScore?.toString() || '0');
          setScoreB(data.leftScore?.toString() || '0');
          setGoalsA(data.rightGoals || []);
          setGoalsB(data.leftGoals || []);
        }

        if (showToast) showToast("Dados extraídos do Print pela IA!", "success");

      } catch (error) {
        console.error("Erro IA:", error);
        if (showToast) {
          showToast(`Falha: ${error.message.substring(0, 70)}`, "error");
        } else {
          alert(`Falha na IA: ${error.message}`);
        }
      } finally {
        setIsAnalyzing(false);
        setImageUploaded(true);
      }
    });
  };

  const handleAddGoal = (team) => {
    if (team === 'A') { setGoalsA([...goalsA, { player: '', assist: '', minute: '' }]); setScoreA((parseInt(scoreA || 0) + 1).toString()); } 
    else { setGoalsB([...goalsB, { player: '', assist: '', minute: '' }]); setScoreB((parseInt(scoreB || 0) + 1).toString()); }
  };

  const handleRemoveGoal = (team, index) => {
    if (team === 'A') { const updated = [...goalsA]; updated.splice(index, 1); setGoalsA(updated); setScoreA(Math.max(0, parseInt(scoreA || 0) - 1).toString()); } 
    else { const updated = [...goalsB]; updated.splice(index, 1); setGoalsB(updated); setScoreB(Math.max(0, parseInt(scoreB || 0) - 1).toString()); }
  };

  const handleGoalChange = (team, index, field, value) => {
    if (team === 'A') { const updated = [...goalsA]; updated[index][field] = value; setGoalsA(updated); } 
    else { const updated = [...goalsB]; updated[index][field] = value; setGoalsB(updated); }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if(!selectedCompId || !selectedMatchId || scoreA === '' || scoreB === '') return;
    
    if (isCup && isTie && (penaltiesA === '' || penaltiesB === '')) {
      if(showToast) showToast("Em jogos de eliminação, não pode haver empate. Preencha os Pênaltis!", "error");
      return;
    }

    const matchDetails = availableMatches.find(m => m.id === selectedMatchId);
    
    const allGoals = [
      ...(goalsA || []).map(g => ({ teamId: teamA.id, player: g.player, assist: g.assist || '', minute: g.minute })),
      ...(goalsB || []).map(g => ({ teamId: teamB.id, player: g.player, assist: g.assist || '', minute: g.minute }))
    ];

    onSubmit({
      id: `m_${Date.now()}`, 
      compId: selectedCompId, 
      roundId: matchDetails.roundId, 
      matchId: selectedMatchId, 
      teamA: teamA.id, 
      teamB: teamB.id, 
      scoreA: parseInt(scoreA), 
      scoreB: parseInt(scoreB),
      penaltiesA: (isCup && isTie && penaltiesA !== '') ? parseInt(penaltiesA) : null,
      penaltiesB: (isCup && isTie && penaltiesB !== '') ? parseInt(penaltiesB) : null,
      goals: allGoals, 
      observacoes: observacoes.trim(), 
      status: 'pending', 
      submittedBy: currentUser?.name || 'Técnico', 
      imageUrl: matchImageBase64
    });
    setSelectedCompId('');
    if(showToast) showToast("Partida enviada para validação dos Líderes!", "success");
  };

  return (
    <div className="max-w-2xl mx-auto animate-in fade-in duration-500 pb-12">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-white flex items-center gap-2"><Camera className="text-emerald-500" /> Registrar Partida</h2>
        <button onClick={() => setShowKeyInput(!showKeyInput)} className="text-xs flex items-center gap-1 bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-1.5 rounded-lg border border-slate-700 transition-colors">
          <Key size={14}/> IA Config
        </button>
      </div>

      <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 space-y-6">
        
        {showKeyInput && (
          <div className="bg-amber-500/10 border border-amber-500/30 p-4 rounded-xl animate-in slide-in-from-top-4">
            <h3 className="text-sm font-bold text-amber-400 mb-2 flex items-center gap-2"><Key size={16}/> Chave de Ativação do Gemini</h3>
            <p className="text-xs text-slate-400 mb-3">Para usar a leitura inteligente de Prints, cole a sua chave exclusiva do <b>Google AI Studio</b>. Ela ficará salva apenas no seu navegador.</p>
            <div className="flex gap-2">
              <input type="password" value={tempKey} onChange={e=>setTempKey(e.target.value)} placeholder="Ex: AIzaSy... ou AQAQ..." className="flex-1 bg-slate-950 border border-slate-700 rounded-lg p-2 text-white text-sm outline-none focus:border-amber-500" />
              <button onClick={handleSaveApiKey} className="bg-amber-600 hover:bg-amber-500 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-lg shadow-amber-900/50">Salvar</button>
            </div>
            <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" className="text-[10px] text-emerald-400 hover:underline mt-2 inline-block">Clique aqui para gerar uma chave grátis ➔</a>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-slate-400 mb-2">1. Competição</label>
          <select value={selectedCompId} onChange={e => setSelectedCompId(e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-white focus:ring-2 focus:ring-emerald-500 outline-none">
            <option value="">Escolha um campeonato...</option>
            {visibleCompetitions.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>

        {selectedCompId && (
          <div className="animate-in fade-in">
            <label className="block text-sm font-medium text-slate-400 mb-2">2. Selecione a Partida Liberada</label>
            {availableMatches.length > 0 ? (
              <select value={selectedMatchId} onChange={e => setSelectedMatchId(e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-white focus:ring-2 focus:ring-emerald-500 outline-none">
                <option value="">Registrar qual jogo?</option>
                {availableMatches.map(m => {
                  const tA = (teams || []).find(t=>t.id===m.teamA)?.name;
                  const tB = (teams || []).find(t=>t.id===m.teamB)?.name;
                  return <option key={m.id} value={m.id}>Rodada {String(m.roundId || '').replace('r','')} - {tA} x {tB}</option>
                })}
              </select>
            ) : <div className="p-3 bg-slate-950 rounded border border-slate-800 text-slate-500 text-sm">Tudo limpo!.</div>}
          </div>
        )}

        {/* Exibe o box de envio apenas se não estiver no modo manual */}
        {selectedMatchId && !isManualMode && (
          <div className="animate-in slide-in-from-top-4">
            <label className="block text-sm font-medium text-slate-400 mb-2">3. Envie o Print do Resultado</label>
            <div className="mb-2">
              <label className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors cursor-pointer relative overflow-hidden block ${matchImageBase64 ? 'border-emerald-500 bg-emerald-500/5' : 'border-slate-700 hover:border-slate-500 bg-slate-950'}`}>
                <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} disabled={isAnalyzing} />
                {isAnalyzing ? (
                  <div className="flex flex-col items-center space-y-3">
                    <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-emerald-400 font-medium">IA analisando o print...</p>
                  </div>
                ) : imageUploaded ? (
                  <div className="flex flex-col items-center space-y-2">
                    <CheckCircle className="text-emerald-500" size={40} />
                    <p className="text-emerald-400 font-medium">Dados extraídos com sucesso!</p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center space-y-3">
                    <UploadCloud className="text-slate-500" size={40} />
                    <p className="text-white font-medium">Clique para enviar a foto e usar a IA</p>
                  </div>
                )}
              </label>
            </div>
            
            {!imageUploaded && !isAnalyzing && (
              <div className="text-center mt-4">
                <button type="button" onClick={() => setIsManualMode(true)} className="text-sm text-slate-400 hover:text-emerald-400 transition-colors underline">
                  Não tem o print? Preencher manualmente
                </button>
              </div>
            )}
          </div>
        )}

        {/* O formulário abre se enviou a imagem OU se ativou o modo manual */}
        {(imageUploaded || isManualMode) && (
          <form onSubmit={handleSubmit} className="animate-in slide-in-from-bottom-4 space-y-6 pt-4 border-t border-slate-800">
            <div className="flex justify-between items-center mb-2">
              <label className="text-sm font-medium text-amber-400 flex items-center gap-2">
                <AlertCircle size={16}/> 
                {isManualMode ? "Preencha os dados da partida manualmente" : "Confirme os dados lidos pela IA"}
              </label>
              
              {isManualMode && (
                <button type="button" onClick={() => setIsManualMode(false)} className="text-xs text-slate-400 hover:text-white transition-colors underline">
                  Voltar para envio de imagem
                </button>
              )}
            </div>
            
            <div className="flex flex-col md:flex-row gap-6 items-start bg-slate-950 p-4 rounded-xl border border-slate-800">
              <div className="flex-1 w-full space-y-3">
                <div className="text-center font-bold text-lg text-slate-300 flex items-center justify-center gap-2"><ShieldDisplay shield={teamA?.shield} size="small" /> {teamA?.name}</div>
                <input type="number" value={scoreA} onChange={e=>setScoreA(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-white text-center text-3xl font-bold focus:border-emerald-500 outline-none" required />
                
                {isCup && isTie && (
                  <div className="mt-2">
                    <label className="text-[10px] text-amber-400 uppercase tracking-widest font-bold">Pênaltis A</label>
                    <input type="number" required value={penaltiesA} onChange={e=>setPenaltiesA(e.target.value)} className="w-full bg-slate-900 border border-amber-500/50 text-center font-bold text-lg text-amber-400 rounded p-2 outline-none focus:border-amber-500" />
                  </div>
                )}

                <div className="space-y-2 pt-2">
                  <span className="text-[10px] text-slate-500 uppercase font-bold block">Gols</span>
                  {goalsA.map((g, i) => (
                    <div key={i} className="flex flex-col gap-1 bg-slate-800 p-2 rounded">
                      <input type="text" value={g.player} onChange={e=>handleGoalChange('A', i, 'player', e.target.value)} placeholder="Goleador" className="w-full bg-slate-950 text-xs text-white px-2 py-1 rounded border border-slate-700 outline-none" required />
                      <div className="flex gap-1">
                        <input type="text" value={g.assist || ''} onChange={e=>handleGoalChange('A', i, 'assist', e.target.value)} placeholder="Assistência" className="flex-1 bg-slate-950 text-[10px] text-slate-400 px-2 py-1 rounded border border-slate-700 outline-none" />
                        <input type="number" value={g.minute} onChange={e=>handleGoalChange('A', i, 'minute', e.target.value)} placeholder="Min" className="w-12 bg-slate-950 text-xs text-emerald-400 text-center px-1 py-1 rounded border border-slate-700 outline-none" required />
                        <button type="button" onClick={()=>handleRemoveGoal('A', i)} className="text-red-400 p-1 hover:text-red-300"><X size={12}/></button>
                      </div>
                    </div>
                  ))}
                  <button type="button" onClick={()=>handleAddGoal('A')} className="text-[10px] text-emerald-400 hover:underline">+ Adicionar Gol</button>
                </div>
              </div>
              
              <div className="text-slate-500 font-bold text-xl self-center pt-8 hidden md:block">X</div>
              
              <div className="flex-1 w-full space-y-3">
                <div className="text-center font-bold text-lg text-slate-300 flex items-center justify-center gap-2">{teamB?.name} <ShieldDisplay shield={teamB?.shield} size="small" /></div>
                <input type="number" value={scoreB} onChange={e=>setScoreB(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-white text-center text-3xl font-bold focus:border-emerald-500 outline-none" required />
                
                {isCup && isTie && (
                  <div className="mt-2">
                    <label className="text-[10px] text-amber-400 uppercase tracking-widest font-bold">Pênaltis B</label>
                    <input type="number" required value={penaltiesB} onChange={e=>setPenaltiesB(e.target.value)} className="w-full bg-slate-900 border border-amber-500/50 text-center font-bold text-lg text-amber-400 rounded p-2 outline-none focus:border-amber-500" />
                  </div>
                )}

                <div className="space-y-2 pt-2">
                  <span className="text-[10px] text-slate-500 uppercase font-bold block text-right">Gols</span>
                  {goalsB.map((g, i) => (
                    <div key={i} className="flex flex-col gap-1 bg-slate-800 p-2 rounded">
                      <input type="text" value={g.player} onChange={e=>handleGoalChange('B', i, 'player', e.target.value)} placeholder="Goleador" className="w-full bg-slate-950 text-xs text-white px-2 py-1 rounded border border-slate-700 outline-none text-right" required />
                      <div className="flex gap-1">
                        <button type="button" onClick={()=>handleRemoveGoal('B', i)} className="text-red-400 p-1 hover:text-red-300"><X size={12}/></button>
                        <input type="number" value={g.minute} onChange={e=>handleGoalChange('B', i, 'minute', e.target.value)} placeholder="Min" className="w-12 bg-slate-950 text-xs text-emerald-400 text-center px-1 py-1 rounded border border-slate-700 outline-none" required />
                        <input type="text" value={g.assist || ''} onChange={e=>handleGoalChange('B', i, 'assist', e.target.value)} placeholder="Assistência" className="flex-1 bg-slate-950 text-[10px] text-slate-400 px-2 py-1 rounded border border-slate-700 outline-none text-right" />
                      </div>
                    </div>
                  ))}
                  <div className="flex justify-end">
                    <button type="button" onClick={()=>handleAddGoal('B')} className="text-[10px] text-emerald-400 hover:underline">+ Adicionar Gol</button>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-400 block">Observações (Opcional)</label>
              <textarea placeholder="Ocorreu alguma queda de conexão? Relate aqui..." value={observacoes} onChange={e=>setObservacoes(e.target.value)} className="w-full bg-slate-950 border border-slate-700 focus:border-emerald-500 rounded-lg p-3 text-slate-300 text-sm h-24 outline-none resize-none transition-colors" />
            </div>

            <Button type="submit" className="w-full py-4 text-lg">Enviar Partida para Líderes</Button>
          </form>
        )}
      </div>
    </div>
  );
};

const ValidationPanel = ({ matches, teams, competitions, onUpdateStatus, showToast }) => {
  const pending = (matches || []).filter(m => m && m.status === 'pending');
  const getTeam = (id) => (teams || []).find(t => t && t.id === id);
  const getCompName = (id) => (competitions || []).find(c => c && c.id === id)?.name || 'Torneio';
  return (
    <div className="space-y-4 animate-in fade-in">
      <div className="flex justify-between items-center"><h2 className="text-xl font-bold text-white flex items-center gap-2"><CheckSquare className="text-amber-500"/> Validação Cloud</h2><span className="text-xs bg-amber-500/20 text-amber-400 px-2.5 py-0.5 rounded-full font-bold">{pending.length} Pendentes</span></div>
      {pending.length === 0 ? ( <div className="bg-slate-900 p-8 rounded-2xl text-center text-slate-500 border border-slate-800">Tudo validado! Sem pendências na nuvem.</div> ) : (
        <div className="space-y-4">
          {pending.map(m => {
            const tA = getTeam(m.teamA); const tB = getTeam(m.teamB);
            return (
              <div key={m.id} className="bg-slate-900 p-4 rounded-xl border border-slate-800 space-y-3">
                <div className="text-center text-[10px] font-bold text-amber-500 uppercase bg-amber-500/5 py-1 rounded border border-amber-500/10">🏆 {String(getCompName(m.compId))}</div>
                <div className="flex items-center justify-between text-xs bg-slate-950 p-3 rounded-lg">
                  <span className="font-bold flex-1 text-right truncate">{tA?.name}</span>
                  <span className="px-3 py-1 font-mono font-black text-emerald-400 bg-slate-900 border border-slate-800 rounded mx-2">{m.scoreA} x {m.scoreB}</span>
                  <span className="font-bold flex-1 text-left truncate">{tB?.name}</span>
                </div>
                <div className="flex gap-2 justify-end pt-2 border-t border-slate-800/60">
                  <Button variant="outline" className="py-1 text-[11px] border-red-500/30 text-red-400" onClick={()=>onUpdateStatus(m.id,'rejected')}>Recusar</Button>
                  <Button className="py-1 text-[11px]" onClick={()=>onUpdateStatus(m.id,'approved')}>Computar Pontos</Button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  );
};

const CreateTeamManual = ({ onCreate, showToast }) => {
  const [name, setName] = useState(''); const [coach, setCoach] = useState(''); const [shield, setShield] = useState(null);
  return (
    <form onSubmit={async (e)=>{e.preventDefault(); if(!name)return; await onCreate({id:`t${Date.now()}`,name,coach:coach||'Técnico',whatsapp:'',ownerId:'manual',shield:shield||'🛡️'}); showToast("Time salvo!"); setName(''); setCoach(''); setShield(null); }} className="max-w-xl mx-auto bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-4 animate-in fade-in">
      <h2 className="text-lg font-bold text-white flex items-center gap-2"><UserPlus size={18}/> Novo Time Simples</h2>
      <div><label className="text-xs text-slate-400 block mb-1">Nome do Clube</label><input required value={name} onChange={e=>setName(e.target.value)} className={inputClass}/></div>
      <div><label className="text-xs text-slate-400 block mb-1">Nome do Técnico</label><input value={coach} onChange={e=>setCoach(e.target.value)} className={inputClass}/></div>
      <div className="bg-slate-950 p-3 rounded-xl flex items-center justify-between"><span className="text-xs text-slate-400">Escudo do Time:</span><label className="cursor-pointer bg-slate-800 px-3 py-1.5 rounded text-xs text-white hover:bg-emerald-600"><UploadCloud size={14} className="inline mr-1"/> Enviar Imagem<input type="file" accept="image/*" className="hidden" onChange={e=>processImage(e.target.files[0],setShield)}/></label></div>
      {shield && <div className="text-center p-2"><ShieldDisplay shield={shield} size="large" /></div>}
      <Button type="submit" className="w-full py-3">Salvar Time</Button>
    </form>
  );
};

const CreateTeamFull = ({ onCreate, showToast }) => {
  const [fn, setFn] = useState(''); const [ln, setFnL] = useState(''); const [tn, setTn] = useState(''); const [wa, setWa] = useState(''); const [em, setEm] = useState(''); const [role, setRole] = useState('member');
  return (
    <form onSubmit={async (e)=>{e.preventDefault(); const cl=wa.replace(/\D/g,''); const name=`${fn} ${ln}`; await onCreate({user:{id:`pending_${cl}`,name,email:em.trim().toLowerCase(),role,whatsapp:cl},team:{id:`t${Date.now()}`,name:tn,coach:name,whatsapp:cl,ownerId:`pending_${cl}`,shield:'🛡️'}}); window.open(`https://wa.me/${cl}?text=${encodeURIComponent(`Fala ${fn}! Acesso liberado no Clã Kame DLS:\nLink: ${window.location.origin}\nAtive sua conta em "Primeiro Acesso" com seu E-mail: ${em}`)}`,'_blank'); setFn(''); setFnL(''); setTn(''); setWa(''); setEm(''); }} className="max-w-xl mx-auto bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-4 animate-in fade-in">
      <h2 className="text-lg font-bold text-white flex items-center gap-2"><Users size={18}/> Convidar Técnico Oficial</h2>
      <div className="grid grid-cols-2 gap-4"><div><input required placeholder="Nome" value={fn} onChange={e=>setFn(e.target.value)} className={inputClass}/></div><div><input required placeholder="Sobrenome" value={ln} onChange={e=>setFnL(e.target.value)} className={inputClass}/></div></div>
      <div><input required placeholder="Nome do Clube" value={tn} onChange={e=>setTn(e.target.value)} className={inputClass}/></div>
      <div className="grid grid-cols-2 gap-4"><div><input required placeholder="WhatsApp com DDD" value={wa} onChange={e=>setWa(e.target.value)} className={inputClass}/></div><div><input required placeholder="E-mail" type="email" value={em} onChange={e=>setEm(e.target.value)} className={inputClass}/></div></div>
      <div><select value={role} onChange={e=>setRole(e.target.value)} className={inputClass}><option value="member">Membro Oficial</option><option value="kaioh">Senhor Kaioh</option></select></div>
      <Button type="submit" className="w-full py-3">Gerar Convite & Chamar no Zap</Button>
    </form>
  );
};

const MembersList = ({ users = [], teams = [], currentUser, onUpdateUserRole, onExpelUser, onApproveUser, onEditUser, showToast }) => {
  const pendingUsers = users.filter(u => u.status === 'pending');
  const activeUsers = users.filter(u => u.status !== 'pending');
  
  // Verificação de segurança com acesso irrestrito para o e-mail Master
  const isSuperAdmin = currentUser?.email === 'saviosaraiva777@gmail.com';
  const isLeader = isSuperAdmin || currentUser?.role === 'leader' || currentUser?.role === 'kaioh';
  const isSupremeLeader = isSuperAdmin || currentUser?.role === 'leader'; 
  
  const [editingId, setEditingId] = useState(null);
  const [editData, setEditData] = useState({ name: '', whatsapp: '' });

  const startEdit = (u) => {
    setEditingId(u.id);
    setEditData({ name: u.name, whatsapp: u.whatsapp });
  };

  const saveEdit = (u) => {
    if (!editData.name || !editData.whatsapp) {
      showToast("Preencha o nome e WhatsApp", "error");
      return;
    }
    onEditUser(u.id, editData);
    setEditingId(null);
  };

  return (
    <div className="space-y-6 animate-in fade-in">
      {isLeader && pendingUsers.length > 0 && (
        <div className="bg-slate-900 border border-amber-500/50 rounded-2xl overflow-hidden shadow-xl">
          <div className="p-4 bg-amber-500/10 border-b border-amber-500/20 flex items-center gap-2"><CheckCircle className="text-amber-500"/><h2 className="font-bold text-amber-500 text-base">Aguardando Aprovação ({pendingUsers.length})</h2></div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs whitespace-nowrap"><thead className="text-slate-400 font-bold border-b border-slate-800"><tr><th className="p-3">Técnico</th><th className="p-3">Clube</th><th className="p-3">WhatsApp</th><th className="p-3 text-center">Ação</th></tr></thead>
            <tbody className="divide-y divide-slate-800/40">
              {pendingUsers.map(u => {
                const t = teams.find(x => x.ownerId === u.id);
                return (
                  <tr key={u.id} className="hover:bg-slate-950/40">
                    <td className="p-3 font-bold text-slate-200">{u.name}</td><td className="p-3 text-amber-400 font-medium">{t?.name || 'S/ Clube'}</td><td className="p-3 font-mono text-slate-400">{u.whatsapp}</td>
                    <td className="p-3 flex justify-center gap-2">
                      <button onClick={()=>{if(window.confirm('Rejeitar cadastro?')) onExpelUser(u.id)}} className="bg-red-500/10 text-red-400 px-3 py-1.5 rounded hover:bg-red-500/20 transition-colors">Rejeitar</button>
                      <button onClick={()=>onApproveUser(u.id)} className="bg-emerald-500/10 text-emerald-400 px-3 py-1.5 rounded hover:bg-emerald-500/20 transition-colors">Aprovar</button>
                    </td>
                  </tr>
                )
              })}
            </tbody></table>
          </div>
        </div>
      )}

      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="p-4 border-b border-slate-800 flex items-center gap-2"><Award className="text-emerald-500"/><h2 className="font-bold text-white text-base">Gestão de Elenco / Técnicos</h2></div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs whitespace-nowrap"><thead className="bg-slate-950/60 text-slate-400 font-bold border-b border-slate-800"><tr><th className="p-3">Técnico</th><th className="p-3">Clube</th><th className="p-3">WhatsApp</th><th className="p-3">Cargo</th><th className="p-3 text-center">Ação</th></tr></thead>
          <tbody className="divide-y divide-slate-800/40">
            {activeUsers.map(u=>{ 
              const t=teams.find(x=>x.ownerId===u.id); 
              
              // Modo de Edição
              if (editingId === u.id) {
                return (
                  <tr key={u.id} className="bg-slate-950/80">
                    <td className="p-3"><input type="text" value={editData.name} onChange={e=>setEditData({...editData, name: e.target.value})} className="bg-slate-900 border border-slate-700 rounded p-1 text-white w-full outline-none focus:border-emerald-500" /></td>
                    <td className="p-3 text-emerald-400 font-medium">{t?.name || 'S/ Clube'}</td>
                    <td className="p-3"><input type="text" value={editData.whatsapp} onChange={e=>setEditData({...editData, whatsapp: e.target.value})} className="bg-slate-900 border border-slate-700 rounded p-1 text-white w-full outline-none focus:border-emerald-500" /></td>
                    <td className="p-3"><span className="text-slate-500 italic">Editando...</span></td>
                    <td className="p-3 flex justify-center gap-2">
                      <button onClick={()=>setEditingId(null)} className="bg-slate-800 text-slate-400 px-3 py-1.5 rounded hover:bg-slate-700 transition-colors">Cancelar</button>
                      <button onClick={()=>saveEdit(u)} className="bg-emerald-600 text-white px-3 py-1.5 rounded hover:bg-emerald-500 shadow-lg transition-colors">Salvar</button>
                    </td>
                  </tr>
                );
              }

              // Visualização Normal
              return(
                <tr key={u.id} className="hover:bg-slate-950/40">
                  <td className="p-3 font-bold text-slate-200">{u.name}</td><td className="p-3 text-emerald-400 font-medium">{t?.name || 'S/ Clube'}</td><td className="p-3 font-mono text-slate-400">{u.whatsapp}</td>
                  <td className="p-3"><select disabled={!isSupremeLeader && currentUser?.id !== u.id} value={u.role} onChange={e=>onUpdateUserRole(u.id, e.target.value)} className="bg-slate-900 text-slate-300 border border-slate-700 rounded p-1 outline-none disabled:opacity-50"><option value="member">Membro</option><option value="kaioh">Kaioh</option><option value="leader">Líder</option></select></td>
                  <td className="p-3 flex justify-center gap-3 items-center">
                    {isSupremeLeader && <button onClick={()=>startEdit(u)} className="text-slate-500 hover:text-emerald-400 transition-colors p-1" title="Editar Técnico"><Edit size={16}/></button>}
                    {isLeader && <button onClick={()=>{if(window.confirm('Expulsar membro?')) onExpelUser(u.id)}} className="text-slate-500 hover:text-red-400 transition-colors p-1" title="Expulsar"><XCircle size={16}/></button>}
                  </td>
                </tr>
              );
            })}
          </tbody></table>
        </div>
      </div>
    </div>
  );
};

export default function App() {
  const [currentUser, setCurrentUser] = useState(() => { const saved = localStorage.getItem('claKame_user'); return saved ? JSON.parse(saved) : null; });
  const [currentTab, setCurrentTab] = useState('dashboard'); const [selectedCompId, setSelectedCompId] = useState(null); const [selectedMatch, setSelectedMatch] = useState(null); const [prevTab, setPrevTab] = useState('dashboard');
  const [users, setUsers] = useState([]); const [matches, setMatches] = useState([]); const [teams, setTeams] = useState([]); const [competitions, setCompetitions] = useState([]);
  const [toastMessage, setToastMessage] = useState(null); const [isFirebaseLoading, setIsFirebaseLoading] = useState(true);

  const showToast = (text, type = 'success') => { let msg = text; if (typeof text === 'object') { msg = text.message ? text.message : JSON.stringify(text); } setToastMessage({ text: String(msg), type }); setTimeout(() => setToastMessage(null), 4000); };

  useEffect(() => {
    const unsubU = onSnapshot(getPublicPath('users'), snap => setUsers(snap.docs.map(d=>d.data())));
    const unsubT = onSnapshot(getPublicPath('teams'), snap => setTeams(snap.docs.map(d=>d.data())));
    const unsubC = onSnapshot(getPublicPath('competitions'), snap => setCompetitions(snap.docs.map(d=>d.data())));
    const unsubM = onSnapshot(getPublicPath('matches'), snap => setMatches(snap.docs.map(d=>d.data())));
    setIsFirebaseLoading(false); return () => { unsubU(); unsubT(); unsubC(); unsubM(); };
  }, []);

  useEffect(() => {
    if (currentUser) {
      localStorage.setItem('claKame_user', JSON.stringify(currentUser)); const stillExists = users.find(u => u && u.id === currentUser.id);
      if (users.length > 0 && !stillExists) { setCurrentUser(null); localStorage.removeItem('claKame_user'); } 
      else if (stillExists && stillExists.role !== currentUser.role) { setCurrentUser(stillExists); }
    } else { localStorage.removeItem('claKame_user'); }
  }, [users, currentUser]);

  const handleReleaseRound = async (compId, roundId) => { const comp = competitions.find(c => c && c.id === compId); if (!comp) return; const rounds = comp.rounds.map(r => r.id === roundId ? { ...r, status: 'released' } : r); await updateDoc(getPublicDocPath('competitions', compId), { rounds }); showToast("Rodada liberada!", "success"); };
  const handleSelectComp = (id) => { setSelectedCompId(id); setCurrentTab('comp_details'); };
  const handleSelectMatch = (match) => { setSelectedMatch(match); setPrevTab(currentTab); setCurrentTab('match_details'); };
  const handleDeleteMatch = async (matchId) => { await deleteDoc(getPublicDocPath('matches', matchId)); showToast("Placar excluído!", "success"); };
   const handleEditTeam = async (updatedTeam) => { 
    const oldTeam = teams.find(t => t.id === updatedTeam.id);
    
    // Verifica se o time era "Manual" e agora está sendo vinculado a um "Técnico"
    if (oldTeam && oldTeam.ownerId === 'manual' && updatedTeam.ownerId !== 'manual') {
      const userId = updatedTeam.ownerId;
      
      // Busca os dados do usuário real que acabou de ser vinculado
      const linkedUser = users.find(u => u.id === userId);
      
      if (linkedUser) {
        // Sincroniza os dados: O time absorve o Nome e WhatsApp reais do técnico cadastrado
        updatedTeam.coach = linkedUser.name;
        updatedTeam.whatsapp = linkedUser.whatsapp;
      }
      
      // 1. Apaga o time provisório vazio que foi criado quando o técnico se cadastrou
      try { 
        await deleteDoc(getPublicDocPath('teams', `t_${userId}`)); 
      } catch(e) {}
      
      showToast("Técnico vinculado e histórico migrado!", "success");
    } else {
      showToast("Time atualizado!", "success");
    }
    
    // 2. Salva a nova posse e dados do time na nuvem
    await updateDoc(getPublicDocPath('teams', updatedTeam.id), updatedTeam); 
  };
  const handleCreateTeamAndUser = async ({ user, team }) => { await setDoc(getPublicDocPath('users', user.id), user); await setDoc(getPublicDocPath('teams', team.id), team); setCurrentTab('teams_list'); showToast("Treinador registrado!"); return true; };
  const handleExpelUser = async (userId) => {
    // 1. Apaga a conta do usuário
    await deleteDoc(getPublicDocPath('users', userId));
    
    // 2. Encontra o time do usuário expulso
    const userTeam = teams.find(t => t.ownerId === userId);
    
    if (userTeam) {
      // 3. Em vez de apagar o time, transformamos ele num time "Manual"
      // Assim ele continua na tabela, mantendo os resultados e permitindo W.O.
      await updateDoc(getPublicDocPath('teams', userTeam.id), {
        ownerId: 'manual',
        whatsapp: '' // Removemos o número pessoal por privacidade
      });
      showToast("Técnico expulso. O time dele agora é manual (sem dono).", "success");
    } else {
      showToast("Técnico expulso com sucesso.", "success");
    }
  };

  const formatarParaEmail = (texto) => { const textoLimpo = String(texto).trim().toLowerCase(); if (textoLimpo.includes('@')) return textoLimpo; return textoLimpo.replace(/[-\s().]/g, '') + '@clakame.com'; };
  const handleRegister = async (data) => {
    const email = data.email.trim().toLowerCase();
    const cleanPhone = data.whatsapp.replace(/\D/g, '');
    const fullName = `${data.firstName} ${data.lastName}`.trim();
    
    // Cria a conta no Firebase e desloga imediatamente para ir pra espera
    const userCredential = await createUserWithEmailAndPassword(auth, email, data.password);
    const uid = userCredential.user.uid;
    
    const newUser = { id: uid, name: fullName, email: email, whatsapp: cleanPhone, role: 'member', status: 'pending' };
    const newTeam = { id: `t_${uid}`, name: data.teamName, coach: fullName, whatsapp: cleanPhone, ownerId: uid, shield: '🛡️' };
    
    await setDoc(getPublicDocPath('users', uid), newUser);
    await setDoc(getPublicDocPath('teams', newTeam.id), newTeam);
    
    await signOut(auth);
    showToast("Cadastro realizado! Aguarde a aprovação.", "success");
  };

  const handleLogin = async (identifier, password) => {
    const cleanPhone = String(identifier).replace(/\D/g, '');
    if (users.length === 0 && (String(identifier).toLowerCase().includes('savio') || cleanPhone === '91998270658')) { const masterUser = { id: 'u_master', name: 'Sávio Saraiva', role: 'leader', whatsapp: '91998270658', email: 'saviosaraiva777@gmail.com', password: password, status: 'active' }; await setDoc(getPublicDocPath('users', 'u_master'), masterUser); setCurrentUser(masterUser); setCurrentTab('dashboard'); return; }
    
    let emFake = formatarParaEmail(identifier); 
    let foundUser = null;
    if (users.length > 0) { 
      foundUser = users.find(u => u && ((u.email && u.email.toLowerCase() === identifier.trim().toLowerCase()) || (cleanPhone.length >= 8 && String(u.whatsapp) === cleanPhone))); 
      if (foundUser?.email) emFake = foundUser.email; 
    }
    
    // Bloqueia o login e gera o aviso se a conta não estiver validada
    if (foundUser && foundUser.status === 'pending') {
      throw new Error("Aguardando aprovação dos líderes.");
    }
    
    try { await signInWithEmailAndPassword(auth, emFake, password); } 
    catch (e) { throw new Error("Acesso negado. Verifique os dados."); }
  };

  const handleApproveUser = async (userId) => {
    await updateDoc(getPublicDocPath('users', userId), { status: 'active' });
    showToast("Técnico aprovado com sucesso!", "success");
  };

  useEffect(() => { const unsub = onAuthStateChanged(auth, (fbUser) => { if (fbUser && users.length > 0) { const found = users.find(u => u && (u.email?.toLowerCase() === fbUser.email?.toLowerCase())); if (found) setCurrentUser(found); } }); return () => unsub(); }, [users]);

  if (isFirebaseLoading) return (<div className="min-h-screen bg-slate-950 text-amber-400 flex items-center justify-center font-sans font-bold text-sm shadow-xl animate-pulse">🛡️ Carregando Arena Kame...</div>);
 if (!currentUser) return <LoginScreen onLogin={handleLogin} onRegister={handleRegister} />;

  if (currentUser.status === 'pending') {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4">
        <div className="bg-slate-900 p-8 rounded-2xl border border-amber-500/30 text-center max-w-sm shadow-xl">
          <div className="text-amber-500 mb-4 flex justify-center"><AlertCircle size={48}/></div>
          <h2 className="text-xl font-bold text-white mb-2">Conta em Análise</h2>
          <p className="text-slate-400 text-sm mb-6">Aguardando aprovação dos líderes do clã. Você será avisado quando for liberado!</p>
          <Button onClick={() => {setCurrentUser(null); signOut(auth);}} className="w-full">Sair</Button>
        </div>
      </div>
    );
  }


  const isLeaderOrKaioh = currentUser.role === 'leader' || currentUser.role === 'kaioh';
  
  // Note que 'settings' foi removida da lista.
 const TABS = [
    { id: 'dashboard', label: 'Início', icon: Home }, 
    { id: 'profile', label: 'Meu Perfil', icon: User },
    { id: 'teams_list', label: 'Times', icon: Shield }, 
    { id: 'competitions', label: 'Competições', icon: Medal },
    ...(isLeaderOrKaioh ? [ 
      { id: 'submit', label: 'Registrar', icon: Camera }, 
      { id: 'validation', label: 'Validação', icon: CheckSquare }, 
      { id: 'members_list', label: 'Técnicos', icon: Award },
      { id: 'create_comp', label: 'Nova Comp', icon: PlusCircle }, 
      { id: 'create_team', label: 'Convidar Técnico', icon: Users },
      { id: 'create_team_manual', label: 'Time Simples', icon: UserPlus } 
    ] : []), // <-- Deixe os colchetes vazios aqui
  ];

  const handleUpdateMatchStatus = async (id, st, updatedData = null) => {
    const updatePayload = { status: st };
    if (updatedData) {
      if (updatedData.scoreA !== undefined) updatePayload.scoreA = parseInt(updatedData.scoreA); if (updatedData.scoreB !== undefined) updatePayload.scoreB = parseInt(updatedData.scoreB);
      if (updatedData.penaltiesA !== undefined) updatePayload.penaltiesA = parseInt(updatedData.penaltiesA); if (updatedData.penaltiesB !== undefined) updatePayload.penaltiesB = parseInt(updatedData.penaltiesB);
    }
    await updateDoc(getPublicDocPath('matches', id), updatePayload);
    if (st === 'approved') {
      const match = matches.find(m => m && m.id === id); if (!match) return; const comp = competitions.find(c => c && c.id === match.compId);
      if (comp && (comp.format === 'cup' || comp.format === 'groups')) {
        let winnerId = null; const finalScoreA = updatedData && updatedData.scoreA !== undefined ? parseInt(updatedData.scoreA) : match.scoreA; const finalScoreB = updatedData && updatedData.scoreB !== undefined ? parseInt(updatedData.scoreB) : match.scoreB; const finalPenaltiesA = updatedData && updatedData.penaltiesA !== undefined ? parseInt(updatedData.penaltiesA) : match.penaltiesA; const finalPenaltiesB = updatedData && updatedData.penaltiesB !== undefined ? parseInt(updatedData.penaltiesB) : match.penaltiesB;
        if (finalScoreA > finalScoreB) winnerId = match.teamA; else if (finalScoreB > finalScoreA) winnerId = match.teamB; else if (finalPenaltiesA !== null && finalPenaltiesA !== undefined) { if (finalPenaltiesA > finalPenaltiesB) winnerId = match.teamA; else if (finalPenaltiesB > finalPenaltiesA) winnerId = match.teamB; }
        if (winnerId) {
          const rIndex = comp.rounds.findIndex(r => r && r.id === match.roundId); const isKnockoutMatch = match.matchId.includes('_ko_') || comp.format === 'cup';
          if (rIndex >= 0 && rIndex < comp.rounds.length - 1 && isKnockoutMatch) {
            const mIndex = comp.rounds[rIndex].matches.findIndex(m => m && m.id === match.matchId);
            if (mIndex >= 0) { const nextRIndex = rIndex + 1; const nextMIndex = Math.floor(mIndex / 2); const isTeamA = mIndex % 2 === 0; const newRounds = JSON.parse(JSON.stringify(comp.rounds)); if (isTeamA) newRounds[nextRIndex].matches[nextMIndex].teamA = winnerId; else newRounds[nextRIndex].matches[nextMIndex].teamB = winnerId; await updateDoc(getPublicDocPath('competitions', comp.id), { rounds: newRounds }); }
          }
        }
      }
    }
  };

  const handleEditUser = async (userId, updatedData) => {
    await updateDoc(getPublicDocPath('users', userId), {
      name: updatedData.name,
      whatsapp: updatedData.whatsapp
    });
    
    // Atualizar também o nome do técnico no time dele para não ficar divergente
    const userTeam = teams.find(t => t.ownerId === userId);
    if (userTeam) {
      await updateDoc(getPublicDocPath('teams', userTeam.id), {
        coach: updatedData.name,
        whatsapp: updatedData.whatsapp
      });
    }
    
    showToast("Dados do técnico atualizados com sucesso!", "success");
  };
  
  const renderContent = () => {
    switch (currentTab) {
      case 'dashboard': return <Dashboard matches={matches} teams={teams} competitions={competitions} currentUser={currentUser} onSelectMatch={handleSelectMatch} onDeleteMatch={handleDeleteMatch} />;
      case 'profile': return <Profile currentUser={currentUser} teams={teams} matches={matches} competitions={competitions} onEditTeam={handleEditTeam} onUpdateUserPhoto={async (url) => { await updateDoc(getPublicDocPath('users', currentUser.id), { photoURL: url }); setCurrentUser(prev => ({...prev, photoURL: url})); }} />;
      case 'teams_list': return <TeamsList teams={teams} users={users} currentUser={currentUser} matches={matches} onEditTeam={handleEditTeam} onDeleteTeam={async (id) => { await deleteDoc(getPublicDocPath('teams', id)); showToast("Time excluído com sucesso!", "success"); }} />;
      case 'competitions': return <CompetitionsList competitions={competitions} teams={teams} currentUser={currentUser} onSelectComp={handleSelectComp} onDeleteComp={id => deleteDoc(getPublicDocPath('competitions', id))} />;
      case 'comp_details': return <CompetitionDetails comp={competitions.find(c=>c.id===selectedCompId)} teams={teams} matches={matches} currentUser={currentUser} onBack={()=>setCurrentTab('competitions')} onReleaseRound={handleReleaseRound} onEditComp={async (c) => { await updateDoc(getPublicDocPath('competitions', c.id), c); showToast("Atualizado!", "success"); }} onUpdatePlayedMatch={async (m) => { await updateDoc(getPublicDocPath('matches', m.id), m); }} showToast={showToast} />;
      case 'match_details': return <MatchDetails match={selectedMatch} teams={teams} competitions={competitions} onBack={() => setCurrentTab(prevTab)} />;
      case 'submit': return <SubmitMatch teams={teams} competitions={competitions} matches={matches} currentUser={currentUser} showToast={showToast} onSubmit={m => setDoc(getPublicDocPath('matches', m.id), m).then(() => { showToast("Resultado enviado!"); setCurrentTab(isLeaderOrKaioh ? 'validation' : 'dashboard'); })} />;
      case 'validation': return <ValidationPanel matches={matches} teams={teams} competitions={competitions} onUpdateStatus={(id,st, updatedData=null)=>handleUpdateMatchStatus(id,st,updatedData)} showToast={showToast} />;
      case 'create_comp': return <CreateCompetition teams={teams} onCreate={c => setDoc(getPublicDocPath('competitions', c.id), c).then(()=>setCurrentTab('competitions'))} showToast={showToast} />;
      case 'create_team': return <CreateTeamFull onCreate={handleCreateTeamAndUser} showToast={showToast} />;
      case 'create_team_manual': return <CreateTeamManual onCreate={t => setDoc(getPublicDocPath('teams', t.id), t).then(()=>setCurrentTab('teams_list'))} showToast={showToast} />;   
      case 'members_list': return <MembersList users={users} teams={teams} currentUser={currentUser} onExpelUser={handleExpelUser} onApproveUser={handleApproveUser} onEditUser={handleEditUser} onUpdateUserRole={(id,role)=>updateDoc(getPublicDocPath('users',id),{role})} showToast={showToast} />;
      
      default: return <Dashboard matches={matches} teams={teams} competitions={competitions} currentUser={currentUser} onSelectMatch={handleSelectMatch} onDeleteMatch={handleDeleteMatch} />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans flex flex-col md:flex-row relative">
      {toastMessage && (
        <div className={`fixed top-4 right-4 z-50 px-6 py-3 rounded-xl shadow-2xl flex items-center gap-3 animate-in slide-in-from-top-4 ${toastMessage.type === 'error' ? 'bg-red-950 border border-red-500 text-red-100' : 'bg-slate-800 border border-emerald-500 text-white'}`}>
          {toastMessage.type === 'error' ? <AlertCircle className="text-red-500" size={20} /> : <CheckCircle className="text-emerald-500" size={20} />}
          <span className="font-medium text-sm">{String(toastMessage.text)}</span>
        </div>
      )}

      <aside className="w-full md:w-64 bg-slate-900 border-b md:border-b-0 md:border-r border-slate-800 flex flex-col shrink-0 z-10 shadow-2xl">
        <div className="p-6 flex items-center gap-3"><img src={LOGO_URL} alt="Clã Kame" className="w-10 h-10" /><div><h1 className="font-bold text-white text-lg">Clã Kame</h1><p className="text-[10px] text-emerald-400 font-bold uppercase">Arena DLS</p></div></div>
        <nav className="flex-1 px-4 pb-4 overflow-y-auto flex md:flex-col gap-2 overflow-x-auto custom-scrollbar">
          {TABS.map(tab => {
            const isActive = currentTab === tab.id || (tab.id === 'competitions' && currentTab === 'comp_details'); const Icon = tab.icon;
            return ( <button key={tab.id} onClick={() => setCurrentTab(tab.id)} className={`flex items-center gap-3 px-4 py-3 rounded-xl whitespace-nowrap outline-none border ${isActive ? 'bg-emerald-500/10 text-emerald-400 font-bold border-emerald-500/20' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200 border-transparent'}`}><Icon size={18} /> <span className="text-sm">{tab.label}</span>{(tab.id === 'validation' && matches.filter(m=>m?.status==='pending').length > 0) && <span className="ml-auto bg-amber-500 text-slate-950 text-xs font-bold px-2 py-0.5 rounded-full">{matches.filter(m=>m?.status==='pending').length}</span>}</button> );
          })}
        </nav>
        <div className="p-4 border-t border-slate-800 hidden md:block"><div className="bg-slate-950 rounded-xl p-4 border border-slate-800/50 relative overflow-hidden"><div className="absolute top-0 left-0 w-1 h-full bg-emerald-500"></div><p className="font-bold text-white text-sm truncate">{String(currentUser?.name)}</p><p className="text-[10px] text-emerald-400 uppercase font-bold mb-3">{ROLE_NAMES[currentUser?.role]}</p><button onClick={() => { setCurrentUser(null); signOut(auth); }} className="w-full text-xs text-slate-400 hover:text-white py-1.5 rounded bg-slate-900 border border-slate-700/60"><LogOut size={12} className="inline mr-1"/> Sair</button></div></div>
      </aside>
      <main className="flex-1 p-4 md:p-8 overflow-y-auto bg-slate-950"><div className="max-w-5xl mx-auto pb-20 md:pb-0">{renderContent()}</div></main>
    </div>
  );
}

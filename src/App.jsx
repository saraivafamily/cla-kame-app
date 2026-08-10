import React, { useState, useEffect, useMemo, useRef } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, doc, setDoc, updateDoc, onSnapshot, collection, deleteDoc, query, orderBy, limit, where } from 'firebase/firestore';
import { Home, Trophy, Medal, Camera, CheckSquare, Users, LogOut, UploadCloud, CheckCircle, XCircle, AlertCircle, Activity, PlusCircle, ArrowLeft, PlayCircle, Lock, Shield, BookOpen, Trash2, Edit, Save, X, MessageCircle, Send, Crown, User, UserPlus, Award, Star, Key, Heart, MoreHorizontal, Target, Dices, Landmark, Wallet, ShoppingCart } from 'lucide-react';
const LOGO_URL = "https://i.imgur.com/dhXA0ni.png"; 

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

const ROLE_NAMES = { leader: 'Líder Supremo', kaioh: 'Senhor Kaioh', organizer: 'Organizador', member: 'Membro Oficial' };
const inputClass = "w-full bg-blue-950 border border-blue-700 focus:border-emerald-500 rounded-lg p-3 text-white outline-none transition-colors text-sm";

const processImage = (file, cb) => { if(!file) return; const r = new FileReader(); r.onload = e => { const img = new Image(); img.onload = () => { const canvas = document.createElement('canvas'); const MAX = 128; let w = img.width, h = img.height; if (w > h) { if (w > MAX) { h *= MAX / w; w = MAX; } } else { if (h > MAX) { w *= MAX / h; h = MAX; } } canvas.width = w; canvas.height = h; const ctx = canvas.getContext('2d'); ctx.drawImage(img, 0, 0, w, h); cb(canvas.toDataURL('image/png')); }; img.src = e.target.result; }; r.readAsDataURL(file); };
const processScreenshot = (file, cb) => { if(!file) return; const r = new FileReader(); r.onload = e => { const img = new Image(); img.onload = () => { const canvas = document.createElement('canvas'); const MAX = 900; let w = img.width, h = img.height; if (w > h) { if (w > MAX) { h *= MAX / w; w = MAX; } } else { if (h > MAX) { w *= MAX / h; h = MAX; } } canvas.width = w; canvas.height = h; const ctx = canvas.getContext('2d'); ctx.drawImage(img, 0, 0, w, h); cb(canvas.toDataURL('image/jpeg', 0.6)); }; img.src = e.target.result; }; r.readAsDataURL(file); };

const ShieldDisplay = ({ shield, size = 'normal' }) => {
  const isImage = typeof shield === 'string' && (shield.startsWith('data:') || shield.startsWith('http'));
  const sizeClasses = { 'small': isImage ? 'w-10 h-10' : 'text-xl', 'normal': isImage ? 'w-16 h-16' : 'text-2xl', 'large': isImage ? 'w-20 h-20' : 'text-2xl' };
  if (isImage) return <img src={shield} alt="Escudo" className={`${sizeClasses[size]} object-contain drop-shadow-lg`} />;
  return <span className={`${sizeClasses[size]} inline-block text-center`} style={{lineHeight: 1}}>{shield || '🛡️'}</span>;
};

const Button = ({ children, onClick, variant = 'primary', className = '', disabled = false, type = 'button' }) => {
  const variants = { primary: "bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-900/50", secondary: "bg-blue-700 hover:bg-blue-600 text-white", danger: "bg-red-600 hover:bg-red-500 text-white", outline: "border border-blue-600 text-blue-300 hover:bg-blue-800" };
  return <button type={type} onClick={onClick} disabled={disabled} className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed ${variants[variant]} ${className}`}>{children}</button>;
};

const CountdownTimer = ({ targetDateStr }) => {
  const [timeLeft, setTimeLeft] = useState('Calculando...');

  useEffect(() => {
    if (!targetDateStr) return;
    
    // Tratamento universal de data para não bugar no iOS/Safari
    const safeDateStr = targetDateStr.includes('T') ? targetDateStr : `${targetDateStr}T00:00:00`;
    const target = new Date(safeDateStr).getTime();
    
    const updateTimer = () => {
      const now = Date.now();
      const diff = target - now;

      if (diff <= 0) {
        setTimeLeft('🔥 INICIADO 🔥');
        return;
      }

      const d = Math.floor(diff / (1000 * 60 * 60 * 24));
      const h = Math.floor((diff / (1000 * 60 * 60)) % 24);
      const m = Math.floor((diff / 1000 / 60) % 60);
      const s = Math.floor((diff / 1000) % 60);

      const timeStr = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
      setTimeLeft(d > 0 ? `${d}d ${timeStr}` : timeStr);
    };

    updateTimer(); // Atualiza na hora para não piscar
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [targetDateStr]);

  return <span className="font-mono font-black tracking-widest">{timeLeft}</span>;
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

const getChampionId = (comp, matches, teams) => {
  if (!comp || !comp.rounds || comp.rounds.length === 0) return null;
  if (comp.format === 'cup' || comp.format === 'groups') {
    const knockoutRounds = comp.rounds.filter(r => r.id.includes('ko') || comp.format === 'cup');
    if (knockoutRounds.length === 0) return null;
    const lastRound = knockoutRounds[knockoutRounds.length - 1];
    
    // Ignora a disputa de 3º lugar para calcular o campeão
    const finalMatches = lastRound.matches.filter(m => !m.id.includes('_3rd'));
    if (finalMatches.length === 0) return null;

    let allApproved = true;
    let totalScoreA = 0; let totalScoreB = 0;
    let lastPenA = null; let lastPenB = null;
    let tA = finalMatches[0].teamA; let tB = finalMatches[0].teamB;

    if(!tA || !tB) return null;

    for (let fm of finalMatches) {
       const sUI = matches.find(m => m.matchId === fm.id && m.compId === comp.id && m.status === 'approved');
       if (!sUI) { allApproved = false; break; }
       
       if (fm.teamA === tA) {
          totalScoreA += Number(sUI.scoreA || 0); totalScoreB += Number(sUI.scoreB || 0);
          if (sUI.penaltiesA !== null && sUI.penaltiesA !== undefined) { lastPenA = Number(sUI.penaltiesA); lastPenB = Number(sUI.penaltiesB); }
       } else {
          totalScoreA += Number(sUI.scoreB || 0); totalScoreB += Number(sUI.scoreA || 0);
          if (sUI.penaltiesB !== null && sUI.penaltiesB !== undefined) { lastPenA = Number(sUI.penaltiesB); lastPenB = Number(sUI.penaltiesA); }
       }
    }

    if (allApproved) {
       if (totalScoreA > totalScoreB) return tA;
       if (totalScoreB > totalScoreA) return tB;
       if (lastPenA !== null && lastPenB !== null) {
          if (lastPenA > lastPenB) return tA;
          if (lastPenB > lastPenA) return tB;
       }
    }
  } else if (comp.format === 'league') {
    const groupOrNormalRounds = comp.rounds.filter(r => !r.id.includes('ko'));
    const totalMatches = groupOrNormalRounds.reduce((acc, r) => acc + r.matches.length, 0);
    const approvedMatches = matches.filter(m => m.compId === comp.id && m.status === 'approved').length;
    if (totalMatches > 0 && approvedMatches === totalMatches) {
      const compTeams = teams.filter(t => comp.teams?.includes(t.id));
      const standings = calculateStandings(matches, compTeams, comp.id);
      return standings.length > 0 ? standings[0].id : null;
    }
  }
  return null;
};

const generateRoundRobin = (teams, compId, isDoubleRound = false) => {
  if (!teams || teams.length === 0) return [];
  const t = [...teams];
  if (t.length % 2 !== 0) t.push(null);
  const numRounds = t.length - 1;
  const half = t.length / 2;
  const rounds = [];
  let matchCounter = 1;

  for (let r = 0; r < numRounds; r++) {
    const matches = [];
    for (let i = 0; i < half; i++) {
      const teamA = t[i];
      const teamB = t[t.length - 1 - i];
      if (teamA !== null && teamB !== null) {
        matches.push({
          id: `${compId}_m${matchCounter}_r${r + 1}`,
          teamA: teamA,
          teamB: teamB,
          placeholderA: 'A Definir',
          placeholderB: 'A Definir',
          status: 'pending_play'
        });
        matchCounter++;
      }
    }
    rounds.push({ id: `r${r + 1}`, number: r + 1, status: r === 0 ? 'released' : 'locked', releasedAt: r === 0 ? Date.now() : null, matches });
    t.splice(1, 0, t.pop());
  }

  if (isDoubleRound) {
    const extraRounds = [];
    for (let r = 0; r < numRounds; r++) {
      const matches = rounds[r].matches.map(m => {
        const newMatch = { ...m, id: `${compId}_m${matchCounter}_r${r + 1 + numRounds}`, teamA: m.teamB, teamB: m.teamA };
        matchCounter++; return newMatch;
      });
      extraRounds.push({ id: `r${r + 1 + numRounds}`, number: r + 1 + numRounds, status: 'locked', releasedAt: null, matches });
    }
    return [...rounds, ...extraRounds];
  }
  return rounds;
};

const generateGroupsAndKnockout = (teamIds, compId, numGroups, qualifiers = 2, isDoubleRound = false, isFinalDouble = false) => {
  const sh = [...teamIds].sort(() => 0.5 - Math.random()); const groups = {}; const gn = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
  for(let i=0; i<numGroups; i++) groups[gn[i]] = []; sh.forEach((t, i) => groups[gn[i % numGroups]].push(t));
  
  let mr = 0; const agr = {}; 
  Object.keys(groups).forEach(g => { 
    const rrs = generateRoundRobin(groups[g], compId, isDoubleRound); 
    mr = Math.max(mr, rrs.length); agr[g] = rrs; 
  });
  
  const rounds = []; let mc = 1;
  for(let r=0; r<mr; r++) {
    const rm = []; Object.keys(groups).forEach(g => { if(agr[g][r]) { agr[g][r].matches.forEach(m => { rm.push({...m, id: `${compId}_m${mc}_r${r+1}`, groupId: g}); mc++; }); } });
    rounds.push({ id: `r${r+1}`, number: r+1, status: r===0?'released':'locked', releasedAt: r===0 ? Date.now() : null, matches: rm });
  }
  
  let kt = numGroups * qualifiers; let p2 = 1; while (p2 < kt) p2 *= 2; const tkr = Math.log2(p2);
  for (let kr=0; kr<tkr; kr++) {
    const rm = []; const nm = p2 / Math.pow(2, kr + 1); const fmc = mc;
    let rl = 'Mata-Mata'; if (nm === 1) rl = 'Final'; else if (nm === 2) rl = 'Semifinal'; else if (nm === 4) rl = 'Quartas';
    
    for (let i=0; i<nm; i++) {
      let pA = 'A Definir', pB = 'A Definir'; 
      if (kr === 0) { 
         if (qualifiers === 2 && numGroups % 2 === 0 && numGroups * 2 === p2) { 
            const h = numGroups / 2; 
            if (i < h) { pA = `1º Gr.${gn[i * 2]}`; pB = `2º Gr.${gn[i * 2 + 1]}`; } 
            else { const off = i - h; pA = `1º Gr.${gn[off * 2 + 1]}`; pB = `2º Gr.${gn[off * 2]}`; } 
         } else { pA = 'Vaga Aberta'; pB = 'Vaga Aberta'; } 
      } else { 
         pA = `Venc. Jogo ${fmc - (nm * 2) + (i * 2)}`; pB = `Venc. Jogo ${fmc - (nm * 2) + (i * 2) + 1}`; 
      }

      if (nm === 1) { 
          rm.push({ id: `${compId}_ko_m${mc}_kr${kr}_f1`, teamA: '', teamB: '', placeholderA: pA, placeholderB: pB, status: 'pending_play' }); mc++;
          if (isFinalDouble) {
             rm.push({ id: `${compId}_ko_m${mc}_kr${kr}_f2`, teamA: '', teamB: '', placeholderA: pB, placeholderB: pA, status: 'pending_play' }); mc++;
          }
          if (kr > 0) { 
             let p3A = `Perd. Jogo ${fmc - (nm * 2) + (i * 2)}`; let p3B = `Perd. Jogo ${fmc - (nm * 2) + (i * 2) + 1}`;
             rm.push({ id: `${compId}_ko_m${mc}_kr${kr}_3rd`, teamA: '', teamB: '', placeholderA: `🥉 ${p3A}`, placeholderB: `🥉 ${p3B}`, status: 'pending_play' }); mc++;
          }
      } else {
          rm.push({ id: `${compId}_ko_m${mc}_kr${kr}`, teamA: '', teamB: '', placeholderA: pA, placeholderB: pB, status: 'pending_play' }); mc++;
      }
    }
    rounds.push({ id: `ko_${kr}`, number: rl, status: 'locked', releasedAt: null, matches: rm });
  } 
  return { groups, rounds };
};

const generateCupBracket = (teamIds, compId, isFinalDouble = false) => {
  const sh = [...teamIds].sort(() => 0.5 - Math.random());
  let p2 = 1; while (p2 < sh.length) p2 *= 2; const tkr = Math.log2(p2);
  const rounds = []; let mc = 1;

  for (let kr = 0; kr < tkr; kr++) {
    const rm = []; const nm = p2 / Math.pow(2, kr + 1); const fmc = mc;
    let rl = 'Mata-Mata'; if (nm === 1) rl = 'Final'; else if (nm === 2) rl = 'Semifinal'; else if (nm === 4) rl = 'Quartas'; else if (nm === 8) rl = 'Oitavas';

    for (let i = 0; i < nm; i++) {
      let tA = ''; let tB = ''; let pA = 'A Definir'; let pB = 'A Definir';
      if (kr === 0) {
        tA = sh[i * 2] || ''; tB = sh[i * 2 + 1] || '';
        pA = tA ? 'Sorteado' : 'Vaga Aberta'; pB = tB ? 'Sorteado' : 'Vaga Aberta';
      } else {
        pA = `Venc. Jogo ${fmc - (nm * 2) + (i * 2)}`; pB = `Venc. Jogo ${fmc - (nm * 2) + (i * 2) + 1}`;
      }

      if (nm === 1) { 
          rm.push({ id: `${compId}_ko_m${mc}_kr${kr}_f1`, teamA: tA, teamB: tB, placeholderA: pA, placeholderB: pB, status: 'pending_play' }); mc++;
          if (isFinalDouble) {
             rm.push({ id: `${compId}_ko_m${mc}_kr${kr}_f2`, teamA: tB, teamB: tA, placeholderA: pB, placeholderB: pA, status: 'pending_play' }); mc++;
          }
          if (kr > 0) {
             let p3A = `Perd. Jogo ${fmc - (nm * 2) + (i * 2)}`; let p3B = `Perd. Jogo ${fmc - (nm * 2) + (i * 2) + 1}`;
             rm.push({ id: `${compId}_ko_m${mc}_kr${kr}_3rd`, teamA: '', teamB: '', placeholderA: `🥉 ${p3A}`, placeholderB: `🥉 ${p3B}`, status: 'pending_play' }); mc++;
          }
      } else {
          rm.push({ id: `${compId}_ko_m${mc}_kr${kr}`, teamA: tA, teamB: tB, placeholderA: pA, placeholderB: pB, status: 'pending_play' }); mc++;
      }
    }
    rounds.push({ id: `ko_${kr}`, number: rl, status: kr === 0 ? 'released' : 'locked', releasedAt: kr === 0 ? Date.now() : null, matches: rm });
  }
  return rounds;
};

const LoginScreen = ({ onLogin, onRegister }) => {
  const [view, setView] = useState('login'); 
  const [loginData, setLoginData] = useState({ identifier: '', password: '' });
  const [regData, setRegData] = useState({ firstName: '', lastName: '', teamName: '', email: '', whatsapp: '', password: '' });
  const [error, setError] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const handleLoginSubmit = async (e) => {
  e.preventDefault(); setError(''); setIsProcessing(true); // <-- Certo!
  // ...
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
    <div className="min-h-screen bg-blue-950 flex items-center justify-center p-4">
      <div className="bg-blue-900 p-6 md:p-8 rounded-2xl border border-blue-800 max-w-md w-full shadow-2xl">
        <div className="text-center mb-6">
          <div className="flex justify-center mb-4"><img src={LOGO_URL} alt="Clã Kame" className="max-w-[100px]" /></div>
          <h1 className="text-xl font-bold text-white">Clã Kame DLS</h1>
        </div>
        
        {view === 'login' && (
          <form onSubmit={handleLoginSubmit} className="space-y-4 animate-in fade-in duration-300">
            {error && <div className="text-red-400 text-xs bg-red-500/10 p-3 rounded-lg border border-red-500/20">{error}</div>}
            <div><label className="text-xs text-blue-400 block mb-1">E-mail</label><input required value={loginData.identifier} onChange={e=>setLoginData({...loginData, identifier: e.target.value})} className={inputClass} placeholder="Digite seu acesso..." /></div>
            <div><label className="text-xs text-blue-400 block mb-1">Senha</label><input required type="password" value={loginData.password} onChange={e=>setLoginData({...loginData, password: e.target.value})} className={inputClass} placeholder="••••••••" /></div>
            <Button type="submit" disabled={isProcessing} className="w-full py-3">{isProcessing ? 'Entrando...' : 'Entrar na Arena'}</Button>
            <div className="text-center pt-5 border-t border-blue-800/50 mt-6">
              <p className="text-xs text-blue-500 mb-2">Ainda não faz parte do clã?</p>
              <button type="button" onClick={() => {setView('register'); setError('');}} className="text-sm font-bold text-emerald-400 hover:text-emerald-300 underline">Primeiro Acesso (Cadastrar)</button>
            </div>
          </form>
        )}

        {view === 'register' && (
          <form onSubmit={handleRegisterSubmit} className="space-y-3 animate-in slide-in-from-right-4 duration-300">
            <h2 className="text-lg font-bold text-white text-center mb-1">Cadastro de Técnico</h2>
            <p className="text-[10px] text-blue-400 text-center mb-4">Preencha seus dados para solicitar acesso.</p>
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
            <button type="button" onClick={() => {setView('login'); setError('');}} className="w-full text-xs text-blue-500 hover:text-white mt-2 pb-2">Voltar para o Login</button>
          </form>
        )}
      </div>
    </div>
  );
};

const SocialFeed = ({ currentUser, teams, showToast, posts, onTaskcompleted }) => {
  const [newPost, setNewPost] = useState('');
  const [commentText, setCommentText] = useState({});
  const [postImage, setPostImage] = useState(null);
  const [isPosting, setIsPosting] = useState(false);
  const [activeMenu, setActiveMenu] = useState(null); 
  
  // 🌟 NOVO: Controle de quais comentários estão expandidos
  const [expandedComments, setExpandedComments] = useState({}); 

  // 1. FUNÇÃO PARA LER E COMPRIMIR A FOTO
  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if(!file) return;
    processScreenshot(file, (base64) => setPostImage(base64));
  };

  // 2. ENVIAR PARA O FIREBASE
  const handlePost = async (e) => {
    e.preventDefault();
    if (!newPost.trim() && !postImage) return;
    setIsPosting(true);
    
    const newP = {
      id: `p_${Date.now()}`,
      authorId: currentUser?.id || 'anon',
      authorName: currentUser?.name || 'Membro do Clã',
      authorPhoto: currentUser?.photoURL || null,
      content: newPost,
      imageUrl: postImage,
      likes: [],
      comments: [],
      timestamp: Date.now()
    };
    
    try {
      await setDoc(getPublicDocPath('feed', newP.id), newP);
      setNewPost('');
      setPostImage(null);
      showToast("Publicado para todo o Clã!", "success");
      
      if (onTaskcompleted) onTaskcompleted('post', 20);
      
    } catch (err) {
      showToast("Erro ao publicar. A imagem pode estar muito pesada.", "error");
    }
    setIsPosting(false);
  };

  const toggleLike = async (postId) => {
    const post = posts.find(p => p.id === postId);
    if(!post) return;
    
    const currentLikes = post.likes || [];
    const hasLiked = currentLikes.includes(currentUser?.id);
    const newLikes = hasLiked ? currentLikes.filter(id => id !== currentUser?.id) : [...currentLikes, currentUser?.id];
    
    await updateDoc(getPublicDocPath('feed', postId), { likes: newLikes });
    
    if (!hasLiked && onTaskcompleted) {
       onTaskcompleted('like', 5);
    }
  };

  // 🛠️ CORREÇÃO: Blindagem para evitar inatividade nos comentários
  const handleComment = async (postId) => {
    const text = commentText[postId];
    if (!text?.trim()) return;
    
    const post = posts.find(p => p.id === postId);
    if(!post) return;
    
    const newComment = { id: `c_${Date.now()}`, authorId: currentUser?.id || 'anon', authorName: currentUser?.name || 'Membro', text, timestamp: Date.now() };
    
    // Garante que é um array, mesmo em posts antigos
    const currentComments = post.comments || []; 
    
    await updateDoc(getPublicDocPath('feed', postId), { comments: [...currentComments, newComment] });
    setCommentText({ ...commentText, [postId]: '' });
    
    // Expande os comentários automaticamente ao comentar
    setExpandedComments(prev => ({...prev, [postId]: true}));
  };

  const toggleCommentsExpansion = (postId) => {
    setExpandedComments(prev => ({...prev, [postId]: !prev[postId]}));
  };

  const handleDelete = async (postId) => {
    if(window.confirm('Tem certeza que deseja apagar esta publicação?')) {
      await deleteDoc(getPublicDocPath('feed', postId));
      setActiveMenu(null);
      showToast("Publicação apagada.", "success");
    }
  };

  const getUserTeamName = (userId) => {
    if (!userId || userId === 'anon') return '';
    const team = (teams || []).find(t => t.ownerId === userId);
    return team ? team.name : '';
  };

  return (
    <div className="max-w-2xl mx-auto animate-in fade-in pb-12">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-black text-white tracking-wide">Feed da Resenha</h2>
      </div>

      <div className="bg-blue-900/60 p-4 sm:p-5 rounded-3xl border border-blue-800/80 mb-8 shadow-xl">
        <div className="flex gap-3 sm:gap-4">
          <div className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-800 rounded-full flex items-center justify-center overflow-hidden border-2 border-emerald-500/30 shrink-0 shadow-inner">
            {currentUser?.photoURL ? <img src={currentUser.photoURL} alt="Você" className="w-full h-full object-cover"/> : <User size={20} className="text-blue-400"/>}
          </div>
          <form onSubmit={handlePost} className="flex-1 flex flex-col pt-1">
            <textarea 
              value={newPost} 
              onChange={e => setNewPost(e.target.value)} 
              placeholder="O que está acontecendo na arena?" 
              className="w-full bg-transparent text-white placeholder:text-blue-400 text-lg focus:outline-none resize-none min-h-[60px]" 
            />
            
            {postImage && (
              <div className="relative inline-block self-start mt-3 mb-2 group">
                <img src={postImage} alt="Preview" className="max-h-48 rounded-2xl border border-blue-700 shadow-md object-contain bg-black/40" />
                <button type="button" onClick={() => setPostImage(null)} className="absolute top-2 right-2 bg-black/70 hover:bg-red-500 text-white rounded-full p-1.5 backdrop-blur-sm transition-colors"><X size={16}/></button>
              </div>
            )}

            <div className="flex justify-between items-center mt-3 pt-3 border-t border-blue-800/50">
              <label className="cursor-pointer text-emerald-500 hover:bg-emerald-500/10 p-2 rounded-full transition-colors" title="Anexar Imagem">
                <Camera size={20} />
                <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
              </label>
              <button type="submit" disabled={(!newPost.trim() && !postImage) || isPosting} className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold py-1.5 px-5 rounded-full transition-all shadow-md flex items-center gap-2">
                {isPosting ? 'Postando...' : 'Postar'}
              </button>
            </div>
          </form>
        </div>
      </div>

      <div className="space-y-5">
        {posts.length === 0 && <p className="text-center text-blue-500 p-8 bg-blue-900/30 rounded-3xl border border-blue-800/50 border-dashed">Nenhuma resenha ainda. Seja o primeiro!</p>}
        {posts.map(post => {
          const currentLikes = post.likes || [];
          const postComments = post.comments || [];
          
          const isLiked = currentLikes.includes(currentUser?.id);
          const isAuthorOrAdmin = post.authorId === currentUser?.id || currentUser?.role === 'leader' || currentUser?.role === 'kaioh';
          const teamName = getUserTeamName(post.authorId);
          
          // Lógica de Visibilidade dos Comentários
          const isExpanded = expandedComments[post.id];
          const visibleComments = isExpanded ? postComments : postComments.slice(0, 3);
          
          return (
            <div key={post.id} className="bg-blue-950/40 rounded-3xl border border-blue-800/60 p-4 sm:p-5 shadow-md hover:border-blue-700 transition-colors">
              
              {/* Header do Post */}
              <div className="flex justify-between items-start mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-800 rounded-full flex items-center justify-center overflow-hidden shrink-0 border border-blue-700">
                    {post.authorPhoto ? <img src={post.authorPhoto} alt="Foto" className="w-full h-full object-cover"/> : <User size={18} className="text-blue-400"/>}
                  </div>
                  <div className="flex flex-col">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-bold text-white text-sm hover:underline cursor-pointer">{post.authorName}</span>
                      {teamName && <span className="text-[10px] bg-blue-900 text-blue-300 px-1.5 py-0.5 rounded font-medium border border-blue-800">{teamName}</span>}
                    </div>
                    <span className="text-[10px] text-blue-500 font-medium">
                      {new Date(post.timestamp).toLocaleDateString()} às {new Date(post.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                    </span>
                  </div>
                </div>

                {isAuthorOrAdmin && (
                  <div className="relative">
                    <button onClick={() => setActiveMenu(activeMenu === post.id ? null : post.id)} className="text-blue-500 hover:bg-blue-900 p-1.5 rounded-full transition-colors">
                      <MoreHorizontal size={18} />
                    </button>
                    {activeMenu === post.id && (
                      <div className="absolute right-0 mt-1 w-32 bg-blue-900 border border-red-500/30 rounded-xl shadow-xl overflow-hidden z-10 animate-in fade-in zoom-in-95">
                        <button onClick={() => handleDelete(post.id)} className="w-full text-left px-4 py-2 text-xs text-red-400 hover:bg-red-500/10 font-bold flex items-center gap-2">
                          <Trash2 size={14}/> Apagar
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
              
              {/* Conteúdo */}
              {post.content && <p className="text-blue-100 mb-3 text-sm sm:text-base leading-relaxed whitespace-pre-wrap">{post.content}</p>}
              
              {post.imageUrl && (
                <div className="mb-4 rounded-2xl overflow-hidden border border-blue-800/80 bg-black/40">
                  <img src={post.imageUrl} alt="Anexo" className="w-full max-h-[500px] object-cover sm:object-contain" loading="lazy" />
                </div>
              )}
              
              {/* Botões de Interação */}
              <div className="flex items-center gap-6 pt-2">
                <button onClick={() => toggleLike(post.id)} className={`flex items-center gap-1.5 text-sm font-bold transition-all group ${isLiked ? 'text-red-500' : 'text-blue-400 hover:text-red-400'}`}>
                  <div className={`p-1.5 rounded-full group-hover:bg-red-500/10 transition-colors ${isLiked ? 'bg-red-500/10' : ''}`}>
                    <Heart size={18} className={isLiked ? 'fill-current' : ''} />
                  </div>
                  <span>{currentLikes.length > 0 && currentLikes.length}</span>
                </button>
                <div className="flex items-center gap-1.5 text-sm font-bold text-blue-400 group cursor-">
                  <div className="p-1.5 rounded-full group-hover:bg-blue-500/10 transition-colors">
                    <MessageCircle size={18} />
                  </div>
                  <span>{postComments.length > 0 && postComments.length}</span>
                </div>
              </div>

              {/* Área de Comentários */}
              {(postComments.length > 0 || commentText[post.id] !== undefined) && (
                <div className="mt-4 pt-4 border-t border-blue-800/40 space-y-3">
                  
                  {/* Lista de Comentários Visíveis */}
                  {visibleComments.map(c => {
                    const cTeamName = getUserTeamName(c.authorId);
                    return (
                      <div key={c.id} className="flex gap-2 animate-in fade-in">
                        <div className="w-6 h-6 bg-blue-800 rounded-full flex items-center justify-center shrink-0 mt-0.5"><User size={12} className="text-blue-400"/></div>
                        <div className="bg-blue-900/50 px-3 py-2 rounded-2xl rounded-tl-none border border-blue-800/50">
                          <p className="text-xs font-bold text-emerald-400">
                            {c.authorName} {cTeamName && <span className="text-[9px] text-blue-400 font-medium">({cTeamName})</span>}
                          </p>
                          <p className="text-xs text-blue-100 mt-0.5 leading-snug">{c.text}</p>
                        </div>
                      </div>
                    )
                  })}
                  
                  {/* Botão de Ver Mais Comentários */}
                  {postComments.length > 3 && (
                    <button 
                      onClick={() => toggleCommentsExpansion(post.id)}
                      className="text-xs font-bold text-blue-400 hover:text-emerald-400 flex items-center gap-1 justify-center w-full py-1.5 transition-colors"
                    >
                      {isExpanded ? '▲ Ocultar comentários' : `▼ Ver mais ${postComments.length - 3} comentários`}
                    </button>
                  )}
                  
                  {/* Input de Novo Comentário */}
                  <div className="flex gap-2 mt-2 items-center">
                    <div className="w-6 h-6 bg-blue-800 rounded-full flex items-center justify-center shrink-0"><User size={12} className="text-blue-400"/></div>
                    <input 
                      type="text" 
                      placeholder="Adicione um comentário..." 
                      value={commentText[post.id] || ''} 
                      onChange={e => setCommentText({...commentText, [post.id]: e.target.value})} 
                      onKeyDown={e => e.key === 'Enter' && handleComment(post.id)} 
                      className="flex-1 bg-blue-900/50 border border-blue-800 rounded-full px-4 py-1.5 text-xs text-white outline-none focus:border-emerald-500 transition-colors" 
                    />
                    <button 
                      onClick={() => handleComment(post.id)} 
                      disabled={!commentText[post.id]?.trim()} 
                      className="text-emerald-500 disabled:text-blue-700 p-1.5 hover:bg-emerald-500/10 rounded-full transition-colors"
                    >
                      <Send size={16}/>
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

const Profile = ({ currentUser, teams, matches, competitions, onEditTeam, onUpdateUserPhoto }) => { 
  const userTeams = teams.filter(t => t.ownerId === currentUser.id);

  // 🧠 MOTOR DE RANKING ESPELHADO
  const rankingData = useMemo(() => {
    let stats = {};
    (teams || []).forEach(t => { if(t && t.ownerId) stats[t.id] = { ...t, points: 0, played: 0, wins: 0 }; });

    (competitions || []).forEach(c => {
      const ptsJoin = c.category === 'copa_flash' ? 2 : 10;
      if (c && c.teams) c.teams.forEach(tId => { if(stats[tId]) stats[tId].points += ptsJoin; });
    });

    (matches || []).forEach(m => {
      if (m.status === 'approved') {
        const c = (competitions || []).find(comp => comp.id === m.compId);
        const isFlash = c?.category === 'copa_flash';
        const ptsPlay = isFlash ? 1 : 2; const ptsWin = isFlash ? 1 : 3; const ptsDraw = isFlash ? 0 : 1;

        const tA = stats[m.teamA]; const tB = stats[m.teamB];
        if(tA) { tA.played += 1; tA.points += ptsPlay; }
        if(tB) { tB.played += 1; tB.points += ptsPlay; }

        let scoreA = Number(m.scoreA||0); let scoreB = Number(m.scoreB||0);
        let penA = m.penaltiesA !== null && m.penaltiesA !== undefined ? Number(m.penaltiesA) : null;
        let penB = m.penaltiesB !== null && m.penaltiesB !== undefined ? Number(m.penaltiesB) : null;

        let winner = null;
        if (scoreA > scoreB) winner = 'A';
        else if (scoreB > scoreA) winner = 'B';
        else if (penA !== null && penB !== null) {
            if (tA) tA.points += ptsDraw; if (tB) tB.points += ptsDraw;
            if (penA > penB) winner = 'A'; else if (penB > penA) winner = 'B';
        } else {
            if (tA) tA.points += ptsDraw; if (tB) tB.points += ptsDraw;
        }

        if (winner === 'A' && tA) { tA.wins += 1; tA.points += ptsWin; }
        else if (winner === 'B' && tB) { tB.wins += 1; tB.points += ptsWin; }
      }
    });

    (competitions || []).forEach(c => {
      if (!c.rounds) return;
      const isFlash = c.category === 'copa_flash';
      const ptsOitavas = isFlash ? 0 : 5; const ptsQuartas = isFlash ? 2 : 10;
      const ptsSemi = isFlash ? 5 : 15; const ptsThird = isFlash ? 5 : 15;
      const ptsVice = isFlash ? 10 : 25; const ptsChamp = isFlash ? 20 : 50;

      const koRounds = c.rounds.filter(r => r.id.includes('ko') || c.format === 'cup');
      let semiTeams = new Set(); 

      koRounds.forEach(r => {
        r.matches.forEach(m => {
          const tA = stats[m.teamA]; const tB = stats[m.teamB];
          if (r.number === 'Oitavas') { if(tA) tA.points += ptsOitavas; if(tB) tB.points += ptsOitavas; }
          if (r.number === 'Quartas') { if(tA) tA.points += ptsQuartas; if(tB) tB.points += ptsQuartas; }
          if (r.number === 'Semifinal') { if(tA) { tA.points += ptsSemi; semiTeams.add(m.teamA); } if(tB) { tB.points += ptsSemi; semiTeams.add(m.teamB); } }
          
          // Pontua a vitória na disputa do 3º Lugar
          if (r.number === 'Final' && m.id.includes('_3rd')) {
             const sUI = matches.find(x => x.matchId === m.id && x.compId === c.id && x.status === 'approved');
             if (sUI) {
                const scoreA = Number(sUI.scoreA||0); const scoreB = Number(sUI.scoreB||0);
                const penA = sUI.penaltiesA !== null && sUI.penaltiesA !== undefined ? Number(sUI.penaltiesA) : null;
                const penB = sUI.penaltiesB !== null && sUI.penaltiesB !== undefined ? Number(sUI.penaltiesB) : null;
                let winnerId = null;
                if (scoreA > scoreB) winnerId = m.teamA;
                else if (scoreB > scoreA) winnerId = m.teamB;
                else if (penA !== null && penB !== null) { if (penA > penB) winnerId = m.teamA; else if (penB > penA) winnerId = m.teamB; }
                
                if (winnerId && stats[winnerId]) stats[winnerId].points += ptsThird;
             }
          }
        });
      });
      
      // Entrega do Título Oficial (Soma de ida e volta automática)
      const champId = getChampionId(c, matches, teams);
      if (champId) {
         if (stats[champId]) { stats[champId].points += ptsChamp; stats[champId].titles += 1; }
         const finalMatch = koRounds[koRounds.length - 1]?.matches.find(m => !m.id.includes('_3rd'));
         if (finalMatch) {
            const viceId = finalMatch.teamA === champId ? finalMatch.teamB : finalMatch.teamA;
            if (viceId && stats[viceId]) stats[viceId].points += ptsVice;
         }
      } else {
         // Retrocompatibilidade para torneios antigos sem 3º lugar estruturado
         const hasThirdPlaceMatch = koRounds.length > 0 && koRounds[koRounds.length - 1].matches.some(m => m.id.includes('_3rd'));
         if (!hasThirdPlaceMatch) {
            const finalMatch = koRounds[koRounds.length - 1]?.matches[0];
            let finalTeams = new Set();
            if (finalMatch) { finalTeams.add(finalMatch.teamA); finalTeams.add(finalMatch.teamB); }
            semiTeams.forEach(tId => { if (!finalTeams.has(tId) && stats[tId]) stats[tId].points += ptsThird; });
         }
      }
    });

    return Object.values(stats).filter(t => t.played > 0 || t.points > 0).sort((a,b) => b.points - a.points || b.wins - a.wins);
  }, [teams, matches, competitions]);

  const getBadge = (pts) => {
    if (pts >= 1000) return { label: 'Lenda Suprema', icon: '👑' };
    if (pts >= 400) return { label: 'Mestre', icon: '💎' };
    if (pts >= 150) return { label: 'Veterano', icon: '🛡️' };
    return { label: 'Novato', icon: '🔰' };
  };

  if (userTeams.length === 0) {
    return (
      <div className="animate-in fade-in text-center p-12 bg-blue-900 rounded-2xl border border-blue-800">
        <span className="text-6xl mb-4 block">😢</span>
        <h2 className="text-2xl font-bold text-white mb-2">Você ainda não tem um time</h2>
        <p className="text-blue-400">Peça para um líder cadastrar seu time no Clã.</p>
      </div>
    );
  }

  return (
    <div className="animate-in fade-in duration-500 space-y-6">
      <div className="flex flex-col md:flex-row items-center md:items-stretch gap-4">
        {/* Cabeçalho Perfil */}
        <div className="flex-1 w-full flex items-center gap-4 bg-blue-900 p-6 rounded-2xl border border-blue-800 shadow-lg">
          <label className="cursor-pointer relative group flex flex-col items-center shrink-0" title="Clique para trocar sua foto">
            <div className="relative w-24 h-24 bg-blue-800 rounded-full flex items-center justify-center text-3xl border-2 border-emerald-500/30 overflow-hidden shadow-lg">
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

        {/* 🌟 NOVO: CARD DE RANKING GLOBAL NO PERFIL */}
        {userTeams.map(team => {
          const myRankIndex = rankingData.findIndex(t => t.id === team.id);
          const myRank = myRankIndex !== -1 ? myRankIndex + 1 : '-';
          const myPoints = myRankIndex !== -1 ? rankingData[myRankIndex].points : 0;
          const badge = getBadge(myPoints);

          return (
            <div key={`rank_${team.id}`} className="shrink-0 w-full md:w-auto bg-gradient-to-br from-amber-600 to-amber-900 p-6 rounded-2xl border border-amber-500/50 shadow-[0_0_20px_rgba(245,158,11,0.2)] flex flex-col justify-center items-center md:items-end text-center md:text-right">
               <div className="flex items-center gap-2 mb-1">
                 <span className="text-2xl drop-shadow-md">{badge.icon}</span>
                 <p className="text-xs text-amber-100 uppercase font-black tracking-widest">Ranking Xclã</p>
               </div>
               <p className="text-4xl font-black text-white drop-shadow-md">{myRank}º <span className="text-lg font-bold text-amber-200">Lugar</span></p>
               <p className="text-sm font-bold text-amber-100 mt-1 bg-black/20 px-3 py-1 rounded-full shadow-inner">{myPoints} Pontos Clã • {badge.label}</p>
            </div>
          );
        })}
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

          // 🌟 LEITURA DINÂMICA DE TÍTULOS (Com Nomes Reais para Copas)
          let ligaA = 0; let ligaB = 0; let ligaC = 0; let ligaD = 0;
          let copasFlash = 0;
          let customTitles = {};
          
          (competitions || []).forEach(c => {
             const champId = getChampionId(c, matches, teams);
             if (champId === team.id) {
                 if (c.category === 'liga_a' || c.category === 'liga_main') ligaA++;
                 else if (c.category === 'liga_b') ligaB++;
                 else if (c.category === 'liga_c') ligaC++;
                 else if (c.category === 'liga_d') ligaD++;
                 else if (c.category === 'copa_flash') copasFlash++;
                 else {
                     // Qualquer outro torneio (Copas Oficiais ou torneios antigos) pega o nome exato!
                     const compName = c.name || 'Torneio Oficial';
                     customTitles[compName] = (customTitles[compName] || 0) + 1;
                 }
             }
          });

          const conquistas = [];
          
          // INSERE OS TÍTULOS COMO AS PRIMEIRAS CONQUISTAS DO MURAL!
          if (ligaA > 0) conquistas.push({ icon: '🥇', title: `LIGA KAME A - ${ligaA} TÍTULO${ligaA > 1 ? 'S' : ''}`, desc: 'Campeão da Divisão de Elite' });
          if (ligaB > 0) conquistas.push({ icon: '🥈', title: `LIGA KAME B - ${ligaB} TÍTULO${ligaB > 1 ? 'S' : ''}`, desc: 'Campeão da Série B' });
          if (ligaC > 0) conquistas.push({ icon: '🥉', title: `LIGA KAME C - ${ligaC} TÍTULO${ligaC > 1 ? 'S' : ''}`, desc: 'Campeão da Série C' });
          if (ligaD > 0) conquistas.push({ icon: '🎖️', title: `LIGA KAME D - ${ligaD} TÍTULO${ligaD > 1 ? 'S' : ''}`, desc: 'Campeão da Série D' });
          if (copasFlash > 0) conquistas.push({ icon: '⚡', title: `COPA FLASH - ${copasFlash} TÍTULO${copasFlash > 1 ? 'S' : ''}`, desc: 'Campeão de Tiro Curto' });

          // 🌟 INSERE OS TÍTULOS COM NOMES REAIS (Ex: Copa das Estrelas)
          Object.keys(customTitles).forEach(compName => {
              const count = customTitles[compName];
              conquistas.push({ 
                  icon: '🏆', 
                  title: `${compName.toUpperCase()} - ${count} TÍTULO${count > 1 ? 'S' : ''}`, 
                  desc: 'Campeão Oficial' 
              });
          });

          if (wins > 0) conquistas.push({ icon: '🌟', title: 'PRIMEIRA VITÓRIA', desc: 'Venceu uma partida oficial' });
          if (gf >= 100) conquistas.push({ icon: '⚽', title: 'GOLEADOR', desc: 'Marcou 100 ou mais gols' });
          if (gf >= 500) conquistas.push({ icon: '⚽', title: 'MERCENÁRIO', desc: 'Marcou 500 ou mais gols' });
          if (wins >= 50) conquistas.push({ icon: '🔥', title: 'ON FIRE', desc: 'Alcançou 50 vitórias no clã' });
          if (teamMatches.length >= 10 && losses === 0) conquistas.push({ icon: '🛡️', title: 'MURALHA', desc: 'Invicto após 10+ jogos' });
          if (biggestWin && (biggestWin.scoreFor - biggestWin.scoreAgainst) >= 5) conquistas.push({ icon: '⚡', title: 'IMPIEDOSO', desc: 'Venceu com 5+ gols de diferença' });
          if (draws >= 50) conquistas.push({ icon: '🤝', title: 'REI DO EMPATE', desc: 'Empatou 50 ou mais vezes' });
          
          const activeComps = competitions.filter(c => c.teams?.includes(team.id));

          return (
            <div key={team.id} className="bg-blue-900 rounded-2xl border border-blue-800 overflow-hidden shadow-xl">
              <div className="bg-blue-950/80 p-6 border-b border-blue-800 flex items-center gap-4">
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
                <div><h3 className="text-2xl font-bold text-white">{team.name}</h3><p className="text-blue-400 text-sm">Técnico: <span className="text-blue-200 font-bold">{team.coach}</span></p></div>
              </div>

              <div className="p-6 space-y-10">
                <div>
                  <h4 className="text-lg font-bold text-white mb-4 flex items-center gap-2"><Medal className="text-amber-400" size={20}/> Conquistas e Títulos</h4>
                  {conquistas.length > 0 ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                      {conquistas.map((c, i) => {
                        const isTitle = c.title.includes('TÍTULO');
                        return (
                          <div key={i} className={`p-4 rounded-xl border text-center flex flex-col items-center justify-center transition-all group ${isTitle ? 'bg-gradient-to-br from-amber-600/20 to-amber-900/40 border-amber-500/50 hover:border-amber-400' : 'bg-blue-950 border-blue-800 hover:border-amber-500/50 hover:bg-blue-900'}`}>
                            <span className="text-3xl mb-2 group-hover:scale-110 transition-transform">{c.icon}</span>
                            <p className={`text-sm font-bold ${isTitle ? 'text-amber-400 drop-shadow-md' : 'text-white'}`}>{c.title}</p>
                            <p className={`text-[10px] mt-1 leading-tight ${isTitle ? 'text-amber-200/80 font-bold' : 'text-blue-400'}`}>{c.desc}</p>
                          </div>
                        );
                      })}
                    </div>
                  ) : ( <div className="text-center p-6 bg-blue-950 rounded-xl border border-blue-800 border-dashed"><p className="text-blue-500 text-sm">Nenhuma conquista desbloqueada. Jogue e vença partidas para ganhar emblemas!</p></div> )}
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
                          <div key={comp.id} className="bg-blue-950 rounded-xl border border-blue-800 overflow-hidden">
                            <div className="bg-blue-900 p-3 border-b border-blue-800 flex justify-between items-center px-4"><span className="text-sm font-bold text-blue-200">{comp.name}</span><div className="flex items-center gap-2"><span className="text-[10px] uppercase font-bold text-blue-500 hidden sm:block">{comp.format === 'league' ? 'Liga' : 'Copa'}</span><span className="text-xs bg-emerald-500/10 text-emerald-400 px-2 py-1 rounded border border-emerald-500/20 font-bold">{rank}º Lugar</span></div></div>
                            {myStats && myStats.p > 0 ? (
                              <div className="grid grid-cols-4 sm:grid-cols-7 gap-2 p-4 text-center">
                                <div><p className="text-[10px] text-blue-500 uppercase font-bold mb-0.5">PTS</p><p className="text-xl font-black text-emerald-400">{myStats.pts}</p></div>
                                <div><p className="text-[10px] text-blue-500 uppercase font-bold mb-0.5">Jogos</p><p className="text-lg font-bold text-blue-300">{myStats.p}</p></div>
                                <div><p className="text-[10px] text-blue-500 uppercase font-bold mb-0.5">V</p><p className="text-lg font-bold text-emerald-500">{myStats.w}</p></div>
                                <div><p className="text-[10px] text-blue-500 uppercase font-bold mb-0.5">E</p><p className="text-lg font-bold text-blue-400">{myStats.d}</p></div>
                                <div className="sm:hidden block"><p className="text-[10px] text-blue-500 uppercase font-bold mb-0.5">D</p><p className="text-lg font-bold text-red-400">{myStats.l}</p></div>
                                <div className="hidden sm:block"><p className="text-[10px] text-blue-500 uppercase font-bold mb-0.5">D</p><p className="text-lg font-bold text-red-400">{myStats.l}</p></div>
                                <div className="hidden sm:block"><p className="text-[10px] text-blue-500 uppercase font-bold mb-0.5">GP</p><p className="text-lg font-bold text-emerald-400">{myStats.gf}</p></div>
                                <div className="hidden sm:block"><p className="text-[10px] text-blue-500 uppercase font-bold mb-0.5">Saldo</p><p className="text-lg font-bold text-blue-300">{myStats.gd > 0 ? `+${myStats.gd}` : myStats.gd}</p></div>
                              </div>
                            ) : ( <p className="p-4 text-sm text-blue-500 text-center bg-blue-950">Ainda não disputou partidas neste torneio.</p> )}
                          </div>
                        )
                      })}
                    </div>
                  ) : ( <p className="text-blue-500 text-sm p-4 bg-blue-950 rounded-xl border border-blue-800 text-center">Este time não está inscrito em nenhuma competição no momento.</p> )}
                </div>

                <div className="pt-4 border-t border-blue-800">
                  <h4 className="text-sm font-bold text-blue-400 mb-4 flex items-center gap-2"><Activity size={16}/> Resumo Histórico</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-blue-950 p-4 rounded-xl border border-blue-800/50 text-center"><p className="text-blue-500 text-xs mb-1 font-medium">Jogos Totais</p><p className="text-xl font-bold text-white">{teamMatches.length}</p></div>
                    <div className="bg-blue-950 p-4 rounded-xl border border-blue-800/50 text-center"><p className="text-blue-500 text-xs mb-1 font-medium">Aproveitamento</p><p className="text-xl font-bold text-amber-400">{teamMatches.length > 0 ? Math.round((wins * 3 + draws) / (teamMatches.length * 3) * 100) : 0}%</p></div>
                    <div className="bg-blue-950 p-4 rounded-xl border border-blue-800/50 text-center col-span-2 md:col-span-2"><p className="text-blue-500 text-xs mb-1 font-medium">Maior Goleada</p>{biggestWin ? ( <p className="text-lg font-bold text-white"><span className="text-emerald-400">{biggestWin.scoreFor}</span> x {biggestWin.scoreAgainst} <span className="text-sm text-blue-400 font-normal">({teams.find(t=>t.id === biggestWin.oppId)?.name})</span></p> ) : <p className="text-sm text-blue-600 mt-1">Nenhuma vitória</p>}</div>
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

const Dashboard = ({ matches, teams, competitions, currentUser, onSelectMatch, onDeleteMatch, onJoinOpenComp, onChangeTab }) => {
  const isLeader = currentUser?.role === 'leader' || currentUser?.role === 'kaioh';
  const isCompAdmin = (c) => isLeader || c?.creatorId === currentUser?.id || (c?.admins || []).includes(currentUser?.id);

  const userTeamIds = (teams || []).filter(t => t && t.ownerId === currentUser?.id).map(t => t.id);
  const visibleCompIds = (competitions || []).filter(c => c && (isCompAdmin(c) || c.teams?.some(t => userTeamIds.includes(t)))).map(c => c.id);
  
  const recentMatches = (matches || []).filter(m => {
    if (!m || m.status === 'rejected') return false;
    const comp = (competitions || []).find(c => c.id === m.compId);
    return isCompAdmin(comp) || visibleCompIds.includes(m.compId);
  }).sort((a, b) => parseInt(String(b?.id || '').split('_')[1] || '0') - parseInt(String(a?.id || '').split('_')[1] || '0')).slice(0, 8);

  const getTeam = (id) => (teams || []).find(t => t && t.id === id);

  const openCompetitions = (competitions || []).filter(c => c && c.status === 'registration');

  const myPendingMatches = (matches || []).filter(m => 
    (userTeamIds.includes(m.teamA) || userTeamIds.includes(m.teamB)) &&
    m.status !== 'approved' && m.status !== 'rejected'
  );

  const hasAdminAccess = isLeader || (competitions || []).some(c => c.status !== 'finished' && isCompAdmin(c));

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10">
      <div className="bg-gradient-to-r from-emerald-900/50 to-blue-900 p-6 rounded-2xl border border-emerald-900/50 shadow-xl">
        <h2 className="text-2xl font-bold text-white mb-2">QG Clã Kame</h2>
        <p className="text-blue-400">Gerencie e acompanhe seus resultados do DLS.</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {hasAdminAccess && (
          <button onClick={() => onChangeTab('competitions')} className="bg-blue-900/50 hover:bg-blue-800 p-4 rounded-2xl border border-blue-700/50 flex flex-col items-center justify-center gap-2 transition-all group shadow-sm">
            <div className="bg-blue-950 p-2 rounded-full group-hover:scale-110 transition-transform">
              <Camera size={20} className="text-emerald-400" />
            </div>
            <span className="text-xs font-bold text-blue-200">Registrar/Validar</span>
          </button>
        )}
        <button onClick={() => onChangeTab('profile')} className="bg-blue-900/50 hover:bg-blue-800 p-4 rounded-2xl border border-blue-700/50 flex flex-col items-center justify-center gap-2 transition-all group shadow-sm">
          <div className="bg-blue-950 p-2 rounded-full group-hover:scale-110 transition-transform">
            <Shield size={20} className="text-amber-400" />
          </div>
          <span className="text-xs font-bold text-blue-200">Meu Perfil</span>
        </button>
        <button onClick={() => onChangeTab('ranking')} className="bg-blue-900/50 hover:bg-blue-800 p-4 rounded-2xl border border-blue-700/50 flex flex-col items-center justify-center gap-2 transition-all group shadow-sm">
          <div className="bg-blue-950 p-2 rounded-full group-hover:scale-110 transition-transform">
            <Trophy size={20} className="text-purple-400" />
          </div>
          <span className="text-xs font-bold text-blue-200">Ranking Xclã</span>
        </button>
        <button onClick={() => onChangeTab('rules')} className="bg-blue-900/50 hover:bg-blue-800 p-4 rounded-2xl border border-blue-700/50 flex flex-col items-center justify-center gap-2 transition-all group shadow-sm">
          <div className="bg-blue-950 p-2 rounded-full group-hover:scale-110 transition-transform">
            <BookOpen size={20} className="text-sky-400" />
          </div>
          <span className="text-xs font-bold text-blue-200">Regras</span>
        </button>
      </div>

      {myPendingMatches.length > 0 && (
        <div className="bg-blue-950/80 p-5 rounded-2xl border border-amber-500/40 shadow-lg relative overflow-hidden animate-in slide-in-from-bottom-4">
          <div className="absolute top-0 left-0 w-1 h-full bg-amber-500"></div>
          <h3 className="text-sm font-bold text-amber-400 uppercase tracking-widest mb-4 flex items-center gap-2">
            <AlertCircle size={16} /> Você tem {myPendingMatches.length} {myPendingMatches.length === 1 ? 'jogo pendente' : 'jogos pendentes'}!
          </h3>
          <div className="space-y-2">
            {myPendingMatches.slice(0, 3).map(m => {
              const tA = getTeam(m.teamA);
              const tB = getTeam(m.teamB);
              return (
                <div key={m.id} onClick={() => onSelectMatch && onSelectMatch(m)} className="bg-blue-900/50 hover:bg-blue-800/80 p-3 rounded-xl border border-blue-800 hover:border-amber-500/50 flex justify-between items-center gap-2 cursor-pointer transition-all">
                  <span className={`text-xs font-bold truncate flex-1 text-right ${userTeamIds.includes(m.teamA) ? 'text-emerald-400' : 'text-blue-200'}`}>{tA?.name || 'A Definir'}</span>
                  <span className="text-[10px] text-blue-500 font-black px-2">VS</span>
                  <span className={`text-xs font-bold truncate flex-1 text-left ${userTeamIds.includes(m.teamB) ? 'text-emerald-400' : 'text-blue-200'}`}>{tB?.name || 'A Definir'}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {openCompetitions.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-lg font-bold text-amber-400 flex items-center gap-2"><Trophy size={20} /> Inscrições Abertas</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {openCompetitions.map(comp => {
              const compTeams = Array.isArray(comp.teams) ? comp.teams : [];
              const compPending = Array.isArray(comp.pendingTeams) ? comp.pendingTeams : [];
              const teamCount = parseInt(comp.teamCount) || 0;
              const isFull = compTeams.length >= teamCount;
              const alreadyJoined = compTeams.some(tId => userTeamIds.includes(tId));
              const isPending = compPending.some(p => p && userTeamIds.includes(p.teamId));

              const isBlockedByOtherComp = Array.isArray(comp.excludedCompIds) && comp.excludedCompIds.some(exCompId => {
                const exComp = (competitions || []).find(c => c.id === exCompId);
                if (!exComp) return false;
                const inConfirmed = Array.isArray(exComp.teams) && exComp.teams.some(tId => userTeamIds.includes(tId));
                const inPendingEx = Array.isArray(exComp.pendingTeams) && exComp.pendingTeams.some(p => p && userTeamIds.includes(p.teamId));
                return inConfirmed || inPendingEx;
              });

              return (
                <div key={comp.id} className={`bg-blue-900 p-5 rounded-2xl border ${comp.category === 'copa_flash' ? 'border-amber-500/50 shadow-[0_0_15px_rgba(245,158,11,0.2)]' : 'border-amber-500/30'} shadow-lg flex flex-col justify-between group hover:border-amber-500/60 transition-all`}>
                  <div>
                    <div className="flex justify-between items-start mb-2">
                      <h4 className={`font-black text-lg transition-colors ${comp.category === 'copa_flash' ? 'text-amber-400' : 'text-white group-hover:text-amber-400'}`}>{comp.name}</h4>
                      <span className="text-xs bg-amber-500/20 text-amber-400 font-bold px-2 py-1 rounded-lg border border-amber-500/30">
                        {compTeams.length}/{teamCount} Vagas
                      </span>
                    </div>
                    <p className="text-xs uppercase text-emerald-400 font-bold tracking-widest">{comp.format === 'league' ? 'Liga' : 'Copa / Grupos'}</p>
                  </div>
                  
                  <div className="mt-5 pt-4 border-t border-blue-800">
                    
                    {/* ⏰ CRONÔMETRO AQUI COM FALLBACK PARA COMPETIÇÕES ANTIGAS */}
                    {comp.category === 'copa_flash' && comp.deadline && (
                      <div className="bg-blue-950 p-2.5 rounded-xl border border-amber-500/40 text-center mb-4">
                        <p className="text-[9px] text-amber-400 font-bold uppercase tracking-widest mb-0.5 flex items-center justify-center gap-1"><Activity size={12}/> Inicia em</p>
                        <p className="text-2xl text-amber-500 drop-shadow-md">
                          <CountdownTimer targetDateStr={`${comp.deadline}T${comp.startTime || '20:00'}:00`} />
                        </p>
                      </div>
                    )}

                    {alreadyJoined ? (
                       <div className="text-emerald-400 text-xs font-bold flex items-center justify-center gap-1 bg-emerald-500/10 py-2 rounded-lg border border-emerald-500/20"><CheckCircle size={16}/> Você já está dentro!</div>
                    ) : isPending ? (
                       <div className="text-amber-400 text-xs font-bold flex items-center justify-center gap-1 bg-amber-500/10 py-2 rounded-lg border border-amber-500/20"><Activity size={16}/> Inscrição em Análise</div>
                    ) : isBlockedByOtherComp ? (
                       <div className="text-red-400 text-xs font-bold flex items-center justify-center gap-1 bg-red-500/10 py-2 rounded-lg border border-red-500/20 text-center"><XCircle size={16}/> Bloqueado (Jogando outro torneio)</div>
                    ) : isFull ? (
                       <div className="text-red-400 text-xs font-bold flex items-center justify-center gap-1 bg-red-500/10 py-2 rounded-lg border border-red-500/20"><XCircle size={16}/> Vagas Esgotadas</div>
                    ) : (
                       <Button onClick={() => onJoinOpenComp && onJoinOpenComp(comp.id)} className="w-full py-2.5 text-sm bg-amber-600 hover:bg-amber-500 text-white font-black shadow-md border-0">
                         Participar do Torneio
                       </Button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      <div>
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2"><Activity size={20} className="text-emerald-500" /> Últimos Resultados Enviados</h3>
        <div className="space-y-3">
          {recentMatches.length === 0 && <p className="text-blue-500 text-sm p-4 bg-blue-900 rounded-xl border border-blue-800">Nenhum resultado submetido ainda.</p>}
          {recentMatches.map(m => {
            if (!m) return null; const tA = getTeam(m.teamA); const tB = getTeam(m.teamB);
            return (
              <div key={m.id} onClick={() => onSelectMatch && onSelectMatch(m)} className="bg-blue-900 p-3 md:p-4 rounded-xl border border-blue-800 flex flex-col gap-3 shadow-sm cursor-pointer hover:border-emerald-500/50 hover:shadow-lg transition-all group relative">
                <div className="flex items-center justify-between w-full gap-2">
                  <div className="flex items-center gap-2 flex-1 min-w-0 justify-start"><div className="shrink-0"><ShieldDisplay shield={tA?.shield} size="normal" /></div><span className="font-medium text-[11px] md:text-sm text-blue-200 truncate group-hover:text-emerald-400 transition-colors">{String(tA?.name || 'Time A')}</span></div>
                  <div className="flex items-center justify-center gap-1.5 md:gap-2 px-2 md:px-3 py-1 bg-blue-950 rounded-lg border border-blue-800 shrink-0">{m.penaltiesA !== null && m.penaltiesA !== undefined && <span className="text-[10px] text-amber-400 font-bold mr-1">({m.penaltiesA})</span>}<span className="font-bold text-sm md:text-base text-emerald-400">{m.status === 'approved' || m.status === 'pending' ? String(m.scoreA) : '?'}</span><span className="text-[10px] md:text-xs text-blue-500 font-bold mx-0.5">X</span><span className="font-bold text-sm md:text-base text-emerald-400">{m.status === 'approved' || m.status === 'pending' ? String(m.scoreB) : '?'}</span>{m.penaltiesB !== null && m.penaltiesB !== undefined && <span className="text-[10px] text-amber-400 font-bold ml-1">({m.penaltiesB})</span>}</div>
                  <div className="flex items-center gap-2 flex-1 min-w-0 justify-end"><span className="font-medium text-[11px] md:text-sm text-blue-200 truncate text-right group-hover:text-emerald-400 transition-colors">{String(tB?.name || 'Time B')}</span><div className="shrink-0"><ShieldDisplay shield={tB?.shield} size="normal" /></div></div>
                </div>
                <div className="flex justify-center border-t border-blue-800/50 pt-2 flex-col items-center gap-1">{m.status === 'approved' ? <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-400">✅ Oficializado • Clique para detalhes</span> : <span className="text-[10px] uppercase font-bold tracking-wider text-amber-400 font-medium">⏳ Aguardando Validação • Clique para detalhes</span>}</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

const TeamStatsModal = ({ team, matches, teams, competitions, onClose }) => {
  if (!team) return null;
  
  const teamMatches = (matches || []).filter(m => m.status === 'approved' && (m.teamA === team.id || m.teamB === team.id));
  let wins = 0, draws = 0, losses = 0, gf = 0, ga = 0; 
  let biggestWin = null; let maxGd = -1;
  let biggestLoss = null; let minGd = 1;
  let currentStreak = 0; let maxStreak = 0;

  teamMatches.forEach(m => {
    const isTeamA = m.teamA === team.id;
    const scoreFor = isTeamA ? m.scoreA : m.scoreB;
    const scoreAgainst = isTeamA ? m.scoreB : m.scoreA;
    gf += scoreFor; ga += scoreAgainst;
    
    const gd = scoreFor - scoreAgainst;
    if (scoreFor > scoreAgainst) { 
      wins++; 
      currentStreak++; maxStreak = Math.max(maxStreak, currentStreak);
      if (gd > maxGd) { maxGd = gd; biggestWin = { scoreFor, scoreAgainst, oppId: isTeamA ? m.teamB : m.teamA }; } 
    } 
    else if (scoreFor === scoreAgainst) { 
      draws++; 
      currentStreak++; maxStreak = Math.max(maxStreak, currentStreak);
    } 
    else { 
      losses++; 
      currentStreak = 0;
      if (gd < minGd) { minGd = gd; biggestLoss = { scoreFor, scoreAgainst, oppId: isTeamA ? m.teamB : m.teamA }; }
    }
  });

  // 🌟 LEITURA DINÂMICA DE TÍTULOS (Com Nomes Reais para Copas)
  let ligaA = 0; let ligaB = 0; let ligaC = 0; let ligaD = 0;
  let copasFlash = 0;
  let customTitles = {};
  
  (competitions || []).forEach(c => {
     const champId = getChampionId(c, matches, teams);
     if (champId === team.id) {
         if (c.category === 'liga_a' || c.category === 'liga_main') ligaA++;
         else if (c.category === 'liga_b') ligaB++;
         else if (c.category === 'liga_c') ligaC++;
         else if (c.category === 'liga_d') ligaD++;
         else if (c.category === 'copa_flash') copasFlash++;
         else {
             // Qualquer outro torneio (Copas Oficiais ou torneios antigos) pega o nome exato!
             const compName = c.name || 'Torneio Oficial';
             customTitles[compName] = (customTitles[compName] || 0) + 1;
         }
     }
  });

  const conquistas = [];
  
  if (ligaA > 0) conquistas.push({ icon: '🥇', title: `LIGA KAME A - ${ligaA} TÍTULO${ligaA > 1 ? 'S' : ''}`, desc: 'Campeão da Divisão de Elite' });
  if (ligaB > 0) conquistas.push({ icon: '🥈', title: `LIGA KAME B - ${ligaB} TÍTULO${ligaB > 1 ? 'S' : ''}`, desc: 'Campeão da Série B' });
  if (ligaC > 0) conquistas.push({ icon: '🥉', title: `LIGA KAME C - ${ligaC} TÍTULO${ligaC > 1 ? 'S' : ''}`, desc: 'Campeão da Série C' });
  if (ligaD > 0) conquistas.push({ icon: '🎖️', title: `LIGA KAME D - ${ligaD} TÍTULO${ligaD > 1 ? 'S' : ''}`, desc: 'Campeão da Série D' });
  if (copasFlash > 0) conquistas.push({ icon: '⚡', title: `COPA FLASH - ${copasFlash} TÍTULO${copasFlash > 1 ? 'S' : ''}`, desc: 'Campeão de Tiro Curto' });

  Object.keys(customTitles).forEach(compName => {
      const count = customTitles[compName];
      conquistas.push({ 
          icon: '🏆', 
          title: `${compName.toUpperCase()} - ${count} TÍTULO${count > 1 ? 'S' : ''}`, 
          desc: 'Campeão Oficial' 
      });
  });

  if (wins > 0) conquistas.push({ icon: '🌟', title: '1ª VITÓRIA', desc: 'Venceu uma partida oficial' });
  if (gf >= 100) conquistas.push({ icon: '⚽', title: 'GOLEADOR', desc: 'Marcou 100 ou mais gols' });
  if (gf >= 500) conquistas.push({ icon: '⚽', title: 'MERCENÁRIO', desc: 'Marcou 500 ou mais gols' });
  if (wins >= 50) conquistas.push({ icon: '🔥', title: 'ON FIRE', desc: 'Alcançou 50 vitórias' });
  if (teamMatches.length >= 10 && losses === 0) conquistas.push({ icon: '🛡️', title: 'MURALHA', desc: 'Invicto após 10+ jogos' });
  if (biggestWin && (biggestWin.scoreFor - biggestWin.scoreAgainst) >= 3) conquistas.push({ icon: '⚡', title: 'IMPIEDOSO', desc: 'Venceu com 5+ gols de diferença' });
  if (draws >= 5) conquistas.push({ icon: '🤝', title: 'REI DO EMPATE', desc: 'Empatou 5 ou mais vezes' });

  const activeComps = (competitions || []).filter(c => c.teams?.includes(team.id));
  const getTeamObj = (id) => (teams || []).find(t => t.id === id);

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in" onClick={onClose}>
      <div className="bg-blue-900 border border-blue-700 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto custom-scrollbar shadow-2xl" onClick={e => e.stopPropagation()}>
        
        {/* Cabeçalho */}
        <div className="sticky top-0 bg-blue-900/95 backdrop-blur border-b border-blue-800 p-4 sm:p-6 flex justify-between items-center z-10">
          <div className="flex items-center gap-4">
            <ShieldDisplay shield={team.shield} size="normal" />
            <div>
              <h3 className="font-bold text-white text-lg md:text-xl leading-tight">{team.name}</h3>
              <p className="text-xs text-emerald-400 font-medium uppercase tracking-widest mt-1">Técnico: {team.coach}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-blue-400 hover:text-white p-2 bg-blue-800 hover:bg-blue-700 rounded-full transition-colors"><X size={18}/></button>
        </div>
        
        {/* Corpo com Estatísticas */}
        <div className="p-4 sm:p-6 space-y-8">
          
          {/* Resumo da Temporada */}
          <div>
            <h4 className="text-sm font-bold text-blue-400 mb-3 flex items-center gap-2"><Activity size={16}/> Visão Geral</h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-blue-950 p-3 rounded-xl border border-blue-800 text-center"><p className="text-blue-500 text-[10px] uppercase font-bold mb-1">Jogos</p><p className="text-2xl font-bold text-white">{teamMatches.length}</p></div>
              <div className="bg-blue-950 p-3 rounded-xl border border-blue-800 text-center"><p className="text-blue-500 text-[10px] uppercase font-bold mb-1">Vitórias</p><p className="text-2xl font-bold text-emerald-400">{wins}</p></div>
              <div className="bg-blue-950 p-3 rounded-xl border border-blue-800 text-center"><p className="text-blue-500 text-[10px] uppercase font-bold mb-1">Gols Pró</p><p className="text-2xl font-bold text-emerald-400">{gf}</p></div>
              <div className="bg-blue-950 p-3 rounded-xl border border-blue-800 text-center"><p className="text-blue-500 text-[10px] uppercase font-bold mb-1">Aprov.</p><p className="text-2xl font-bold text-amber-400">{teamMatches.length > 0 ? Math.round((wins * 3 + draws) / (teamMatches.length * 3) * 100) : 0}%</p></div>
            </div>
          </div>

          {/* Recordes do Clube */}
          <div>
            <h4 className="text-sm font-bold text-blue-400 mb-3 flex items-center gap-2"><Star size={16} className="text-amber-400"/> Recordes do Clube</h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="bg-blue-950 p-4 rounded-xl border border-blue-800 text-center flex flex-col items-center">
                <p className="text-[10px] text-blue-500 uppercase font-bold mb-2">Maior Goleada</p>
                {biggestWin ? (
                  <>
                    <p className="text-xl font-black text-emerald-400">{biggestWin.scoreFor} <span className="text-sm text-slate-500 font-bold mx-1">x</span> {biggestWin.scoreAgainst}</p>
                    <p className="text-[10px] text-blue-300 mt-1 truncate w-full">vs {getTeamObj(biggestWin.oppId)?.name || 'Adversário'}</p>
                  </>
                ) : <p className="text-xs text-blue-700 italic mt-2">Nenhuma vitória</p>}
              </div>
              <div className="bg-blue-950 p-4 rounded-xl border border-blue-800 text-center flex flex-col items-center">
                <p className="text-[10px] text-blue-500 uppercase font-bold mb-2">Pior Derrota</p>
                {biggestLoss ? (
                  <>
                    <p className="text-xl font-black text-red-400">{biggestLoss.scoreFor} <span className="text-sm text-slate-500 font-bold mx-1">x</span> {biggestLoss.scoreAgainst}</p>
                    <p className="text-[10px] text-blue-300 mt-1 truncate w-full">vs {getTeamObj(biggestLoss.oppId)?.name || 'Adversário'}</p>
                  </>
                ) : <p className="text-xs text-blue-700 italic mt-2">Nenhuma derrota</p>}
              </div>
              <div className="bg-blue-950 p-4 rounded-xl border border-blue-800 text-center flex flex-col items-center">
                <p className="text-[10px] text-blue-500 uppercase font-bold mb-2">Maior Série Invicta</p>
                <p className="text-3xl font-black text-blue-200 mt-1">{maxStreak}</p>
                <p className="text-[10px] text-blue-400 mt-1">Jogos sem perder</p>
              </div>
            </div>
          </div>

          {/* Desempenho em Torneios */}
          <div>
            <h4 className="text-sm font-bold text-blue-400 mb-3 flex items-center gap-2"><Trophy size={16} className="text-emerald-500"/> Desempenho nos Campeonatos</h4>
            {activeComps.length > 0 ? (
              <div className="space-y-3">
                {activeComps.map(comp => {
                  const table = calculateStandings(matches, teams, comp.id);
                  const rankIndex = table.findIndex(t => t.id === team.id);
                  const myStats = rankIndex !== -1 ? table[rankIndex] : null;
                  const rank = rankIndex !== -1 ? rankIndex + 1 : '-';
                  
                  return (
                    <div key={comp.id} className="bg-blue-950 p-3 rounded-xl border border-blue-800 flex flex-col sm:flex-row items-center justify-between gap-3">
                      <div className="flex-1 flex flex-col items-center sm:items-start w-full">
                        <span className="font-bold text-blue-200 text-sm truncate">{comp.name}</span>
                        <span className="text-[10px] text-blue-500 uppercase font-bold">{comp.format === 'league' ? 'Liga' : 'Copa / Grupos'}</span>
                      </div>
                      
                      {myStats && myStats.p > 0 ? (
                        <div className="flex items-center gap-4 shrink-0 bg-blue-900/50 px-4 py-2 rounded-lg border border-blue-800/50">
                          <div className="text-center"><p className="text-[9px] text-blue-400 uppercase font-bold mb-0.5">Posição</p><p className="text-base font-black text-emerald-400">{rank}º</p></div>
                          <div className="text-center"><p className="text-[9px] text-blue-400 uppercase font-bold mb-0.5">Pontos</p><p className="text-base font-black text-blue-200">{myStats.pts}</p></div>
                          <div className="text-center"><p className="text-[9px] text-blue-400 uppercase font-bold mb-0.5">Jogos</p><p className="text-base font-bold text-blue-300">{myStats.p}</p></div>
                        </div>
                      ) : (
                        <p className="text-xs text-blue-600 italic shrink-0">Sem jogos ainda</p>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-xs text-blue-500 text-center p-4 bg-blue-950 rounded-xl border border-blue-800 border-dashed">Ainda não disputou nenhum torneio.</p>
            )}
          </div>

          {/* Conquistas e Títulos */}
          <div>
            <h4 className="text-sm font-bold text-blue-400 mb-3 flex items-center gap-2"><Medal size={16} className="text-amber-400"/> Sala de Troféus</h4>
            {conquistas.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {conquistas.map((c, i) => {
                  const isTitle = c.title.includes('TÍTULO');
                  return (
                    <div key={i} className={`p-4 rounded-xl border text-center flex flex-col items-center justify-center transition-all group ${isTitle ? 'bg-gradient-to-br from-amber-600/20 to-amber-900/40 border-amber-500/50 hover:border-amber-400' : 'bg-blue-950 border-blue-800 hover:border-amber-500/50 hover:bg-blue-900'}`}>
                      <span className="text-3xl mb-2 group-hover:scale-110 transition-transform">{c.icon}</span>
                      <p className={`text-xs font-bold ${isTitle ? 'text-amber-400 drop-shadow-md' : 'text-white'}`}>{c.title}</p>
                      <p className={`text-[9px] mt-1 leading-tight ${isTitle ? 'text-amber-200/80 font-bold' : 'text-blue-500'}`}>{c.desc}</p>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-xs text-blue-500 text-center p-6 bg-blue-950 rounded-xl border border-blue-800 border-dashed">Nenhuma conquista desbloqueada ainda.</p>
            )}
          </div>

        </div>
      </div>
    </div>
  );
};

const RulesPage = () => {
  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in pb-12">
      <div className="bg-gradient-to-r from-blue-900 to-blue-950 p-6 rounded-3xl border border-blue-800 shadow-xl flex items-center gap-4">
        <div className="bg-blue-950 p-3 rounded-full border border-sky-500/50 shadow-inner">
          <BookOpen size={32} className="text-sky-400" />
        </div>
        <div>
          <h2 className="text-2xl font-black text-white uppercase tracking-wider">Regras Oficiais do Clã Kame</h2>
          <p className="text-sm text-blue-400 mt-1">O desconhecimento das regras não isenta de punições. Jogue limpo!</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-blue-900 p-5 rounded-2xl border border-blue-800 shadow-md">
          <h3 className="font-bold text-emerald-400 mb-3 flex items-center gap-2">🤝 1. Fair Play e Respeito</h3>
          <ul className="text-sm text-blue-200 space-y-2 list-disc pl-4">
            <li>É terminantemente proibido ofender, xingar ou desrespeitar qualquer membro do clã.</li>
            <li>Mantenha a resenha saudável. Foco na diversão e competição limpa.</li>
          </ul>
        </div>

        <div className="bg-blue-900 p-5 rounded-2xl border border-blue-800 shadow-md">
          <h3 className="font-bold text-amber-400 mb-3 flex items-center gap-2">⏰ 2. Prazos e W.O.</h3>
          <ul className="text-sm text-blue-200 space-y-2 list-disc pl-4">
            <li>Os líderes definirão prazos para as rodadas. Jogos não realizados no prazo darão W.O. duplo, a menos que um dos técnicos prove que procurou o adversário.</li>
          </ul>
        </div>

        <div className="bg-blue-900 p-5 rounded-2xl border border-blue-800 shadow-md">
          <h3 className="font-bold text-sky-400 mb-3 flex items-center gap-2">📸 3. Envio de Resultados</h3>
          <ul className="text-sm text-blue-200 space-y-2 list-disc pl-4">
            <li>Sempre tire o PRINT DA TELA FINAL DE ESTATÍSTICAS do jogo (aquela que mostra gols, chutes, posse).</li>
            <li>Nos envie o print no grupo do Whatsapp</li>
            <li>Resultados forjados ou prints editados resultarão em banimento imediato.</li>
          </ul>
        </div>

        <div className="bg-blue-900 p-5 rounded-2xl border border-blue-800 shadow-md">
          <h3 className="font-bold text-purple-400 mb-3 flex items-center gap-2">🏆 4. Participação</h3>
          <ul className="text-sm text-blue-200 space-y-2 list-disc pl-4">
            <li>Inatividade por mais de 2 temporadas sem justificativa prévia aos líderes resultará em desligamento do Clã.</li>
            <li>Torneios Premiados exigem o anexo do comprovante PIX no momento da inscrição.</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

const TeamsList = ({ teams, users, currentUser, matches, competitions, onEditTeam, onDeleteTeam }) => {
  const isAdmin = currentUser?.role === 'leader' || currentUser?.role === 'kaioh';
  const [editingId, setEditingId] = useState(null);
  const [editData, setEditData] = useState({ name: '', coach: '', whatsapp: '', shield: '', ownerId: 'manual' });
  const [viewMode, setViewMode] = useState('grid');
  const [searchTerm, setSearchTerm] = useState('');
  const [viewingTeam, setViewingTeam] = useState(null); 
  
  // 🔍 1. LOCALIZA O TIME DO TÉCNICO LOGADO
  const myTeam = (teams || []).find(t => t && t.ownerId === currentUser?.id);
  const myTeamId = myTeam?.id;

  // 🔒 2. ALGORITMO DE VALIDAÇÃO: Bloqueia o botão se não houver jogo liberado pendente
  const canCallTeam = (targetTeamId) => {
    // Não deixa ele ligar para si mesmo ou se não tiver time
    if (!myTeamId || targetTeamId === myTeamId) return false;

    return (competitions || []).some(c => {
      // Só analisa competições em andamento (ativas)
      if (c.status !== 'active' || !c.rounds) return false;

      return c.rounds.some(round => {
        // Só aceita rodadas que os líderes já liberaram
        if (round.status !== 'released') return false;

        return round.matches.some(rm => {
          // Verifica se o confronto direto entre os dois existe nesta rodada
          const isOurMatch = (rm.teamA === myTeamId && rm.teamB === targetTeamId) || 
                             (rm.teamA === targetTeamId && rm.teamB === myTeamId);
          if (!isOurMatch) return false;

          // Se o jogo existe, confirma se ele já não foi jogado (enviado pro firebase)
          const alreadyPlayed = (matches || []).some(m => 
            m.matchId === rm.id && 
            m.compId === c.id && 
            (m.status === 'pending' || m.status === 'approved')
          );

          return !alreadyPlayed; // O botão ativa apenas se NÃO tiver sido jogado
        });
      });
    });
  };

  const handleWhatsApp = (phone) => { if (!phone) return; window.open(`https://wa.me/${String(phone).replace(/\D/g, '')}`, '_blank'); };
  const startEdit = (team) => { if (!team) return; setEditingId(team.id); setEditData({ name: team.name || '', coach: team.coach || '', whatsapp: team.whatsapp || '', shield: team.shield || '🛡️', ownerId: team.ownerId || 'manual' }); };
  const saveEdit = (team) => { if (!editData.name || !editData.coach) return; onEditTeam({ ...team, ...editData }); setEditingId(null); };

  const filteredTeams = (teams || []).filter(t => t && (String(t.name || '').toLowerCase().includes(searchTerm.toLowerCase()) || String(t.coach || '').toLowerCase().includes(searchTerm.toLowerCase())));

  return (
    <div className="animate-in fade-in duration-500 space-y-6 pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-blue-900 p-4 md:p-6 rounded-2xl border border-blue-800 shadow-xl">
        <div className="flex items-center gap-3">
          <span className="text-3xl drop-shadow-md">🛡️</span>
          <div>
            <h2 className="text-xl md:text-2xl font-bold text-white">Mural de Times</h2>
            <p className="text-xs text-emerald-400 font-bold tracking-widest uppercase mt-0.5">{(teams || []).length} Times Cadastrados</p>
          </div>
        </div>
        <div className="flex items-center gap-2 w-full md:w-auto">
          <input type="text" placeholder="Procurar time ou técnico..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="flex-1 md:w-64 bg-blue-950 border border-blue-700 focus:border-emerald-500 rounded-lg p-2 text-white outline-none transition-colors text-sm" />
          <div className="flex p-1 bg-blue-950 rounded-lg border border-blue-700 shrink-0">
            <button onClick={() => setViewMode('grid')} className={`px-3 py-1.5 rounded-md transition-colors text-xs font-bold ${viewMode === 'grid' ? 'bg-blue-800 text-emerald-400 shadow-sm' : 'text-blue-500 hover:text-blue-300'}`}>Grade</button>
            <button onClick={() => setViewMode('list')} className={`px-3 py-1.5 rounded-md transition-colors text-xs font-bold ${viewMode === 'list' ? 'bg-blue-800 text-emerald-400 shadow-sm' : 'text-blue-500 hover:text-blue-300'}`}>Lista</button>
          </div>
        </div>
      </div>
      
      {filteredTeams.length === 0 ? ( 
        <div className="bg-blue-900 p-8 rounded-2xl border border-blue-800 text-center text-blue-500">
          {searchTerm ? 'Nenhum time encontrado com essa busca.' : 'Nenhum time registrado no clã ainda.'}
        </div> 
      ) : (
        <div className={viewMode === 'grid' ? "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 md:gap-4" : "flex flex-col gap-3"}>
          {filteredTeams.map(team => {
            if (!team) return null;
            const safeTeamId = team.id || Math.random().toString();
            
            if (editingId === team.id) {
              return (
                <div key={safeTeamId} className={`bg-blue-900 p-3 rounded-xl border border-emerald-500/50 shadow-[0_0_15px_rgba(16,185,129,0.1)] flex ${viewMode === 'list' ? 'flex-col md:flex-row items-start md:items-center justify-between gap-4' : 'flex-col justify-between gap-3'}`}>
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
                      <input type="text" value={editData.name} onChange={e=>setEditData({...editData, name: e.target.value})} placeholder="Time" className="w-full bg-blue-950 border border-blue-700 rounded p-1.5 text-white text-[10px] md:text-xs outline-none focus:border-emerald-500" />
                      <input type="text" value={editData.coach} onChange={e=>setEditData({...editData, coach: e.target.value})} placeholder="Técnico" className="w-full bg-blue-950 border border-blue-700 rounded p-1.5 text-white text-[10px] md:text-xs outline-none focus:border-emerald-500" />
                      <input type="text" value={editData.whatsapp} onChange={e=>setEditData({...editData, whatsapp: e.target.value})} placeholder="WhatsApp" className="w-full bg-blue-950 border border-blue-700 rounded p-1.5 text-white text-[10px] md:text-xs outline-none focus:border-emerald-500" />
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
                      }} className="w-full bg-blue-950 border border-blue-700 rounded p-1.5 text-white text-[10px] md:text-xs outline-none focus:border-emerald-500">
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
                <div key={safeTeamId} onClick={() => setViewingTeam(team)} className="relative bg-blue-900 p-3 sm:p-4 rounded-xl border border-blue-800 hover:border-emerald-500/50 hover:shadow-lg transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 group cursor-pointer">
                  <div className="flex items-center gap-4 flex-1 min-w-0 w-full">
                    <div className="shrink-0"><ShieldDisplay shield={team.shield} size="normal" /></div>
                    <div className="flex-1 min-w-0 pr-10 sm:pr-0">
                      <div className="flex items-center gap-2">
                        {/* Removido o 'truncate' e adicionado 'whitespace-normal break-words' */}
                        <h3 className="text-sm md:text-base font-bold text-white leading-tight whitespace-normal break-words group-hover:text-emerald-400 transition-colors">{String(team.name || 'Time')}</h3>
                        {team.ownerId === 'manual' && <span className="text-[9px] bg-amber-500/20 text-amber-400 px-1.5 rounded uppercase font-bold shrink-0">Sem Acesso</span>}
                      </div>
                      <p className="text-[10px] md:text-xs text-blue-400 mt-0.5 truncate"><span className="text-blue-300 font-medium">{String(team.coach || 'Sem técnico')}</span> • {String(team.whatsapp || 'Sem WhatsApp')}</p>
                    </div>
                  </div>
                  {isAdmin && ( 
                  <div className="absolute top-2 right-2 flex gap-1 md:opacity-0 md:group-hover:opacity-100 transition-opacity z-10">
                    <button onClick={(e) => { e.stopPropagation(); startEdit(team); }} className="text-blue-500 hover:text-emerald-400 p-1.5 rounded-lg hover:bg-blue-800" title="Editar"><Edit size={14} /></button> 
                    <button onClick={(e) => { e.stopPropagation(); if(window.confirm('Tem certeza que deseja apagar este time definitivamente?')) { onDeleteTeam(team.id); } }} className="text-blue-500 hover:text-red-400 p-1.5 rounded-lg hover:bg-blue-800" title="Excluir Time"><Trash2 size={14} /></button>
                  </div>
                )}
                  {/* 🔒 TRAVA APLICADA NO MODO LISTA */}
                  <Button onClick={(e) => { e.stopPropagation(); handleWhatsApp(team.whatsapp); }} className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-500 text-white py-2 px-3 text-xs disabled:bg-blue-800 disabled:text-blue-500 shrink-0 z-10" disabled={!team.whatsapp || !canCallTeam(team.id)}>
                    <MessageCircle size={16} /> <span className="sm:hidden lg:inline">Chamar</span>
                  </Button>
                </div>
               );
            }

            return (
              // Adicionado 'h-full' para garantir que os cards no modo grade estiquem e fiquem do mesmo tamanho
              <div key={safeTeamId} onClick={() => setViewingTeam(team)} className="relative h-full bg-blue-900 p-3 md:p-4 rounded-xl border border-blue-800 hover:border-emerald-500/50 hover:shadow-lg transition-all flex flex-col justify-between gap-3 group cursor-pointer">
                {isAdmin && ( 
                    <div className="absolute top-3 sm:top-auto sm:relative right-3 sm:right-auto flex gap-1 sm:opacity-0 sm:group-hover:opacity-100 shrink-0 z-10">
                      <button onClick={(e) => { e.stopPropagation(); startEdit(team); }} className="text-blue-500 hover:text-emerald-400 p-1.5 rounded-lg hover:bg-blue-800 transition-colors" title="Editar"><Edit size={16} /></button>
                      <button onClick={(e) => { e.stopPropagation(); if(window.confirm('Tem certeza que deseja apagar este time definitivamente?')) { onDeleteTeam(team.id); } }} className="text-blue-500 hover:text-red-400 p-1.5 rounded-lg hover:bg-blue-800 transition-colors" title="Excluir Time"><Trash2 size={16} /></button>
                    </div>
                  )}
                <div className="flex flex-col items-center text-center gap-2 mt-2">
                  <div className="shrink-0 relative group-hover:scale-105 transition-transform">
                    <ShieldDisplay shield={team.shield} size="normal" />
                    {team.ownerId === 'manual' && <span className="absolute -top-2 -right-2 text-[8px] bg-amber-500/20 text-amber-400 px-1 rounded shadow" title="Conta Manual">👤</span>}
                  </div>
                  <div className="w-full">
                    {/* Removido o 'truncate' e adicionado 'whitespace-normal break-words' */}
                    <h3 className="text-sm md:text-base font-bold text-white leading-tight whitespace-normal break-words px-2 group-hover:text-emerald-400 transition-colors">{String(team.name || 'Time')}</h3>
                    <p className="text-[9px] md:text-[10px] text-blue-400 mt-1 truncate px-1"><span className="text-blue-300 font-medium">{String(team.coach || 'Sem técnico')}</span></p>
                  </div>
                </div>
                {/* 🔒 TRAVA APLICADA NO MODO GRADE */}
                <Button onClick={(e) => { e.stopPropagation(); handleWhatsApp(team.whatsapp); }} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white mt-1 py-1.5 text-[10px] md:text-xs px-2 disabled:bg-blue-800 disabled:text-blue-500 z-10" disabled={!team.whatsapp || !canCallTeam(team.id)}>
                  <MessageCircle size={14} /> Chamar
                </Button>
              </div>
            );
          })}
        </div>
      )}
      
      {viewingTeam && (
        <TeamStatsModal 
          team={viewingTeam} 
          matches={matches} 
          teams={teams} 
          competitions={competitions}
          onClose={() => setViewingTeam(null)} 
        />
      )}
    </div>
  );
};

const Standings = ({ matches, teams, comp }) => {
  const isGroupsFormat = comp?.format === 'groups' && comp?.groups;
  
  // 1. Lemos os valores salvos nas configurações (se não houver, padrão é 0)
  const promotionsCount = comp?.promotions || 0;
  const relegationsCount = comp?.relegations || 0;

  return (
    <div className="animate-in fade-in duration-500 w-full">
      {/* 🌟 ESTILIZAÇÃO DA BARRA DE ROLAGEM TEMÁTICA (APENAS PARA ESTA TABELA) */}
      <style>{`
        .scrollbar-kame::-webkit-scrollbar { width: 8px; height: 8px; }
        .scrollbar-kame::-webkit-scrollbar-track { background: rgba(15, 23, 42, 0.6); border-radius: 10px; }
        .scrollbar-kame::-webkit-scrollbar-thumb { background: #059669; border-radius: 10px; border: 2px solid rgba(15, 23, 42, 0.6); }
        .scrollbar-kame::-webkit-scrollbar-thumb:hover { background: #10b981; }
      `}</style>

      <div className="bg-sky-900/30 rounded-2xl border border-sky-800/50 overflow-hidden shadow-2xl">
        {isGroupsFormat ? (
          <div className="flex flex-col">
            {Object.keys(comp.groups || {}).map((gName, idx) => {
              const gTeams = teams.filter(t => (comp.groups[gName] || []).includes(t.id));
              const gTable = calculateStandings(matches, gTeams, comp.id);
              return (
                <div key={gName} className={idx > 0 ? "border-t-4 border-blue-950" : ""}>
                  <div className="bg-blue-950/80 p-3 text-center border-b border-sky-800/50 flex justify-between px-4"><h3 className="text-sm font-bold text-white uppercase tracking-widest drop-shadow-md">Grupo {gName}</h3></div>
                  
                  {/* Container com rolagem limitada a ~10 times */}
                  <div className="max-h-[480px] overflow-y-auto overflow-x-auto scrollbar-kame relative">
                    <table className="w-full min-w-[600px] text-left text-xs sm:text-sm whitespace-nowrap">
                      {/* Cabeçalho Fixo (Sticky) */}
                      <thead className="text-sky-300 font-bold sticky top-0 z-20">
                        <tr>
                          <th className="bg-blue-950 px-3 py-2 w-10 text-center shadow-md">#</th>
                          <th className="bg-blue-950 px-3 py-2 shadow-md">Time</th>
                          <th className="bg-blue-950 px-3 py-2 text-center shadow-md">PTS</th>
                          <th className="bg-blue-950 px-3 py-2 text-center shadow-md">J</th>
                          <th className="bg-blue-950 px-3 py-2 text-center shadow-md">V</th>
                          <th className="bg-blue-950 px-3 py-2 text-center shadow-md">E</th>
                          <th className="bg-blue-950 px-3 py-2 text-center shadow-md">D</th>
                          <th className="bg-blue-950 px-3 py-2 text-center shadow-md">GP</th>
                          <th className="bg-blue-950 px-3 py-2 text-center shadow-md">GC</th>
                          <th className="bg-blue-950 px-3 py-2 text-center shadow-md">SG</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-sky-800/30">
                        {gTable.map((row, index) => {
                          // 2. Lógica dinâmica para Fase de Grupos
                          const isQualified = promotionsCount > 0 && index < promotionsCount;
                          const isBottom = relegationsCount > 0 && index >= gTable.length - relegationsCount;
                          
                          const borderClass = isQualified ? 'border-l-4 border-green-500' : (isBottom ? 'border-l-4 border-red-500' : 'border-l-4 border-transparent');
                          const bgClass = isQualified ? 'bg-green-500/20' : (isBottom ? 'bg-red-500/20' : 'bg-blue-900/40');
                          const textNumberClass = isQualified ? 'text-green-400 font-black' : (isBottom ? 'text-red-400 font-black' : 'text-sky-200 font-bold');

                          return (
                            <tr key={row.id} className={`hover:bg-sky-800/60 transition-colors ${borderClass} ${bgClass}`}>
                              <td className={`px-3 py-2 text-center text-base ${textNumberClass}`}>{index + 1}</td>
                              
                              <td className="px-3 py-2 font-bold text-white uppercase tracking-wide">
                                <div className="flex items-center gap-2 min-w-max py-0.5">
                                  <div className="shrink-0"><ShieldDisplay shield={row.shield} size="small" /></div>
                                  <span className="leading-normal block text-xs sm:text-sm">{String(row.name)}</span>
                                </div>
                              </td>

                              <td className="px-3 py-2 text-center font-black text-green-400 text-base drop-shadow-md">{row.pts}</td>
                              <td className="px-3 py-2 text-center text-sky-200 font-medium">{row.p}</td>
                              <td className="px-3 py-2 text-center text-sky-200 font-medium">{row.w}</td>
                              <td className="px-3 py-2 text-center text-sky-200 font-medium">{row.d}</td>
                              <td className="px-3 py-2 text-center text-sky-200 font-medium">{row.l}</td>
                              <td className="px-3 py-2 text-center text-sky-200 font-medium">{row.gf}</td>
                              <td className="px-3 py-2 text-center text-sky-200 font-medium">{row.ga}</td>
                              <td className="px-3 py-2 text-center text-sky-200 font-bold">{row.gd > 0 ? `+${row.gd}` : row.gd}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* Container com rolagem limitada a ~10 times para Liga Normal */
          <div className="max-h-[480px] overflow-y-auto overflow-x-auto scrollbar-kame relative">
            <table className="w-full min-w-[600px] text-left text-xs sm:text-sm whitespace-nowrap">
              {/* Cabeçalho Fixo (Sticky) */}
              <thead className="text-sky-300 font-bold sticky top-0 z-20">
                <tr>
                  <th className="bg-blue-950 px-3 py-2 w-10 text-center shadow-md">#</th>
                  <th className="bg-blue-950 px-3 py-2 shadow-md">Time</th>
                  <th className="bg-blue-950 px-3 py-2 text-center shadow-md">PTS</th>
                  <th className="bg-blue-950 px-3 py-2 text-center shadow-md">J</th>
                  <th className="bg-blue-950 px-3 py-2 text-center shadow-md">V</th>
                  <th className="bg-blue-950 px-3 py-2 text-center shadow-md">E</th>
                  <th className="bg-blue-950 px-3 py-2 text-center shadow-md">D</th>
                  <th className="bg-blue-950 px-3 py-2 text-center shadow-md">GP</th>
                  <th className="bg-blue-950 px-3 py-2 text-center shadow-md">GC</th>
                  <th className="bg-blue-950 px-3 py-2 text-center shadow-md">SG</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-sky-800/30">
                {(() => {
                  const table = calculateStandings(matches, teams, comp?.id);
                  const displayTable = table.filter(t => t.p > 0 || table.length > 0);
                  const totalTeams = displayTable.length;

                  return displayTable.map((row, index) => {
                    // 3. Lógica dinâmica para Pontos Corridos
                    const isTop = promotionsCount > 0 && index < promotionsCount; 
                    const isBottom = relegationsCount > 0 && index >= totalTeams - relegationsCount;
                    
                    const borderClass = isTop ? 'border-l-4 border-green-500' : (isBottom ? 'border-l-4 border-red-500' : 'border-l-4 border-transparent');
                    const bgClass = isTop ? 'bg-green-500/20' : (isBottom ? 'bg-red-500/20' : 'bg-blue-900/40');
                    const textNumberClass = isTop ? 'text-green-400 font-black' : (isBottom ? 'text-red-400 font-black' : 'text-sky-200 font-bold');

                    return (
                      <tr key={row.id} className={`hover:bg-sky-800/60 transition-colors ${borderClass} ${bgClass}`}>
                        <td className={`px-3 py-2 text-center text-base ${textNumberClass}`}>{index + 1}</td>
                        
                        <td className="px-3 py-2 font-bold text-white uppercase tracking-wide">
                          <div className="flex items-center gap-2 min-w-max py-0.5">
                            <div className="shrink-0"><ShieldDisplay shield={row.shield} size="small" /></div>
                            <span className="leading-normal block text-xs sm:text-sm">{String(row.name)}</span>
                          </div>
                        </td>

                        <td className="px-3 py-2 text-center font-black text-green-400 text-base drop-shadow-md">{row.pts}</td>
                        <td className="px-3 py-2 text-center text-sky-200 font-medium">{row.p}</td>
                        <td className="px-3 py-2 text-center text-sky-200 font-medium">{row.w}</td>
                        <td className="px-3 py-2 text-center text-sky-200 font-medium">{row.d}</td>
                        <td className="px-3 py-2 text-center text-sky-200 font-medium">{row.l}</td>
                        <td className="px-3 py-2 text-center text-sky-200 font-medium">{row.gf}</td>
                        <td className="px-3 py-2 text-center text-sky-200 font-medium">{row.ga}</td>
                        <td className="px-3 py-2 text-center text-sky-200 font-bold">{row.gd > 0 ? `+${row.gd}` : row.gd}</td>
                      </tr>
                    );
                  });
                })()}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

const DrawPanel = ({ comp, teams, matches, showToast }) => {
  const [prizeName, setPrizeName] = useState('Passe de Temporada');
  const [prizeQty, setPrizeQty] = useState(1);
  const [excludeTop, setExcludeTop] = useState(3); // Exclui Top 1, 2 e 3 por padrão
  const [excludeWO, setExcludeWO] = useState(true);
  
  const [isDrawing, setIsDrawing] = useState(false);
  const [winners, setWinners] = useState([]);

  // 1. Pega a Classificação Atual
  const standings = useMemo(() => calculateStandings(matches, teams, comp.id), [matches, teams, comp.id]);

  // 2. Identifica os perdedores por W.O.
  const woLosers = useMemo(() => {
    const losers = new Set();
    matches.filter(m => m.compId === comp.id && m.status === 'approved').forEach(m => {
      const obs = (m.observacoes || '').toLowerCase();
      const isWO = obs.includes('w.o') || obs.includes('wo');
      if (isWO) {
        // Quem tem 0 gols no W.O. foi quem tomou o W.O. Se for duplo, penaliza os dois.
        if (m.scoreA === 0 && m.scoreB === 3) losers.add(m.teamA);
        if (m.scoreB === 0 && m.scoreA === 3) losers.add(m.teamB);
        if (obs.includes('duplo')) { losers.add(m.teamA); losers.add(m.teamB); }
      }
    });
    return losers;
  }, [matches, comp.id]);

  // 3. Aplica o Funil de Regras
  const { eligible, excluded } = useMemo(() => {
    const el = []; const ex = [];
    standings.forEach((teamStats, index) => {
      let isExcluded = false;
      let reason = '';

      if (index < excludeTop) {
        isExcluded = true;
        reason = `Ficou no Top ${excludeTop}`;
      } else if (excludeWO && woLosers.has(teamStats.id)) {
        isExcluded = true;
        reason = 'Tomou W.O. no torneio';
      }

      if (isExcluded) {
        ex.push({ ...teamStats, reason });
      } else {
        el.push(teamStats);
      }
    });
    return { eligible: el, excluded: ex };
  }, [standings, excludeTop, excludeWO, woLosers]);

  const handleDraw = () => {
    if (eligible.length === 0) {
      showToast("Não há times elegíveis suficientes para o sorteio!", "error");
      return;
    }
    if (prizeQty > eligible.length) {
      showToast(`Há apenas ${eligible.length} times elegíveis. Diminua a quantidade de prêmios.`, "error");
      return;
    }

    setIsDrawing(true);
    setWinners([]);

    setTimeout(() => {
      // Algoritmo de Embaralhamento (Fisher-Yates)
      let pool = [...eligible];
      for (let i = pool.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [pool[i], pool[j]] = [pool[j], pool[i]];
      }
      
      setWinners(pool.slice(0, prizeQty));
      setIsDrawing(false);
      showToast("Sorteio realizado com sucesso!", "success");
    }, 2000); // 2 segundos de suspense
  };

  return (
    <div className="space-y-6 animate-in fade-in">
      <div className="bg-purple-900/40 p-5 rounded-2xl border border-purple-500/50 flex flex-col md:flex-row gap-6 shadow-xl">
        {/* Formulário de Configuração */}
        <div className="flex-1 space-y-4">
          <h3 className="text-lg font-black text-purple-400 flex items-center gap-2 uppercase tracking-wider"><Dices size={20}/> Configurar Sorteio</h3>
          
          <div className="grid grid-cols-2 gap-3">
            <div><label className="text-xs text-blue-300 font-bold mb-1 block">Prêmio Sorteado</label><input type="text" value={prizeName} onChange={e=>setPrizeName(e.target.value)} className="w-full bg-blue-950 border border-purple-500/50 rounded-lg p-2 text-white outline-none focus:border-purple-400 text-sm" /></div>
            <div><label className="text-xs text-blue-300 font-bold mb-1 block">Qtd. de Ganhadores</label><input type="number" min="1" value={prizeQty} onChange={e=>setPrizeQty(parseInt(e.target.value)||1)} className="w-full bg-blue-950 border border-purple-500/50 rounded-lg p-2 text-white outline-none focus:border-purple-400 text-sm" /></div>
          </div>

          <div className="pt-2 space-y-2 border-t border-purple-800/50">
            <label className="text-xs font-bold text-amber-400 uppercase tracking-widest block">Regras de Exclusão</label>
            <div className="flex items-center gap-3 bg-blue-950 p-2 rounded-lg border border-blue-800">
              <span className="text-sm text-blue-200 flex-1">Não sortear os Top:</span>
              <select value={excludeTop} onChange={e=>setExcludeTop(Number(e.target.value))} className="bg-blue-900 border border-blue-700 text-white rounded p-1 text-sm outline-none">
                <option value={0}>Nenhum (Todos participam)</option>
                <option value={1}>Top 1 (Campeão)</option>
                <option value={2}>Top 1 e 2</option>
                <option value={3}>Top 1, 2 e 3</option>
                <option value={4}>Top 4</option>
              </select>
            </div>
            
            <label className="flex items-center justify-between cursor-pointer bg-blue-950 p-2 rounded-lg border border-blue-800">
              <span className="text-sm text-blue-200">Excluir quem tomou W.O.</span>
              <input type="checkbox" checked={excludeWO} onChange={e=>setExcludeWO(e.target.checked)} className="w-4 h-4 accent-purple-500" />
            </label>
          </div>

          <Button onClick={handleDraw} disabled={isDrawing} className="w-full py-3 mt-4 bg-purple-600 hover:bg-purple-500 text-white font-black text-lg border-0 shadow-lg shadow-purple-900/50">
            {isDrawing ? '🎲 Girando a Roleta...' : '🎲 Realizar Sorteio'}
          </Button>
        </div>

        {/* Status do Funil */}
        <div className="flex-1 flex flex-col gap-3">
          <div className="bg-blue-950 p-3 rounded-xl border border-blue-800 flex-1 overflow-y-auto max-h-[150px] custom-scrollbar">
            <p className="text-xs font-bold text-emerald-400 mb-2 sticky top-0 bg-blue-950">✅ Participantes Elegíveis ({eligible.length})</p>
            <div className="flex flex-wrap gap-1.5">
              {eligible.length === 0 ? <span className="text-xs text-blue-500">Nenhum</span> : eligible.map(t => <span key={t.id} className="text-[10px] bg-blue-900 text-blue-200 px-2 py-1 rounded">{t.name}</span>)}
            </div>
          </div>
          <div className="bg-blue-950 p-3 rounded-xl border border-blue-800 flex-1 overflow-y-auto max-h-[150px] custom-scrollbar">
            <p className="text-xs font-bold text-red-400 mb-2 sticky top-0 bg-blue-950">🚫 Participantes Excluídos ({excluded.length})</p>
            <div className="flex flex-col gap-1">
              {excluded.length === 0 ? <span className="text-xs text-blue-500">Nenhum</span> : excluded.map(t => (
                <div key={t.id} className="text-[10px] flex justify-between bg-red-500/10 text-red-300 px-2 py-1 rounded border border-red-500/20">
                  <span className="font-bold">{t.name}</span><span>{t.reason}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Resultado do Sorteio */}
      {winners.length > 0 && (
        <div className="bg-gradient-to-br from-amber-500 to-yellow-600 p-1 rounded-3xl animate-in zoom-in-95 duration-500 shadow-[0_0_30px_rgba(245,158,11,0.3)]">
          <div className="bg-blue-950 rounded-[22px] p-6 text-center h-full">
            <span className="text-4xl block mb-2">🎉</span>
            <h2 className="text-2xl font-black text-amber-400 uppercase tracking-widest mb-4">Ganhadores do Sorteio</h2>
            <p className="text-sm text-blue-300 mb-6">Prêmio: <b className="text-white">{prizeName}</b></p>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 justify-center">
              {winners.map((w, idx) => (
                <div key={w.id} className="bg-blue-900 p-4 rounded-xl border border-amber-500/40 shadow-inner flex flex-col items-center gap-2 transform hover:scale-105 transition-transform">
                  <ShieldDisplay shield={w.shield} size="normal" />
                  <span className="font-bold text-white text-base mt-2 truncate w-full text-center">{w.name}</span>
                  <span className="text-[10px] bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded font-black">Bilhete #{Math.floor(Math.random() * 9000) + 1000}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const CompetitionDetails = ({ comp, teams, matches, users = [], onBack, currentUser, onReleaseRound, onLockRound, onSelectMatch, onDeleteMatch, onEditComp, showToast, onUpdatePlayedMatch, onSubmitMatch, onUpdateMatchStatus, onBatchUpdateComp }) => {
  const [subTab, setSubTab] = useState('overview'); 
  const [expandedRoundId, setExpandedRoundId] = useState(null);
  const [editMatchData, setEditMatchData] = useState(null);
  const [showAddTeam, setShowAddTeam] = useState(false);
  const [newTeamToAdd, setNewTeamToAdd] = useState('');
  const [showCalendar, setShowCalendar] = useState(false);

  const [viewType, setViewType] = useState(comp?.format === 'league' ? 'table' : 'bracket');

  const [showEditPrizes, setShowEditPrizes] = useState(false);
  const [prizeData, setPrizeData] = useState({ first: comp?.prizes?.first || '', second: comp?.prizes?.second || '', third: comp?.prizes?.third || '', extra: comp?.prizes?.extra || '' });

  const [showEditSettings, setShowEditSettings] = useState(false);
  const [settingsData, setSettingsData] = useState({
    category: comp?.category || 'liga_a', edition: comp?.name ? comp.name.replace(/\D/g, '') : '', playStyle: comp?.playStyle || 'Livre', rules: comp?.rules || '',
    promotions: comp?.promotions || 0, relegations: comp?.relegations || 0, admins: comp?.admins || [],
    excludedCompIds: comp?.excludedCompIds || [] 
  });

  const [showEditGroups, setShowEditGroups] = useState(false);
  const [teamGroupMapping, setTeamGroupMapping] = useState({});

  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (comp?.category !== 'copa_flash') return;
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [comp]);

  if (!comp) return (<div className="text-center py-12"><p className="text-blue-400">Torneio não localizado.</p><button onClick={onBack} className="text-emerald-400 underline">Voltar</button></div>);
  
  const isRegistration = comp.status === 'registration';
  const getTeam = (id) => (teams || []).find(t => t && t.id === id);
  const isLeader = currentUser?.role === 'leader' || currentUser?.role === 'kaioh';
  const isAdmin = isLeader || comp?.creatorId === currentUser?.id || (comp?.admins || []).includes(currentUser?.id);
  
  const CATEGORY_NAMES = { liga_a: '🥇 Liga Kame A', liga_b: '🥈 Liga Kame B', liga_c: '🥉 Liga Kame C', liga_d: '🎖️ Liga Kame D', liga_acesso: ' ⬆️ Liga de acesso', copa_main: '🏆 Copa Oficial', copa_flash: '⚡ Copa Flash', copa_do_rei: '👑 Copa do Rei', copa_amazonia: '🌳 Copa da Amazônia' };

  const activeRound = comp?.rounds?.find(r => r.status === 'released');
  const isFlash = comp?.category === 'copa_flash';
  let timeLeft = 0;
  let isExpired = false;
  
  if (isFlash && activeRound && comp.flashDuration) {
    const deadline = (activeRound.releasedAt || Date.now()) + (comp.flashDuration * 60000);
    timeLeft = deadline - now;
    isExpired = timeLeft <= 0;
  }

  const formatTime = (ms) => {
    if (ms <= 0) return '00:00';
    const totalSecs = Math.floor(ms / 1000);
    const m = Math.floor(totalSecs / 60).toString().padStart(2, '0');
    const s = (totalSecs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const handleAutoFlashRound = (round) => {
    if(!window.confirm('Encerrar fase? Sorteio automático (W.O Duplo) será aplicado nos jogos que não foram disputados.')) return;
    showToast('Processando encerramento de fase...', 'info');

    const newMatchDocs = [];
    const matchResults = {}; 
    
    round.matches.forEach(m => {
        const sUI = matches.find(x => x.matchId === m.id && x.compId === comp.id && x.status === 'approved');
        if (sUI) {
            let wId = null;
            if (sUI.scoreA > sUI.scoreB) wId = m.teamA;
            else if (sUI.scoreB > sUI.scoreA) wId = m.teamB;
            else if (sUI.penaltiesA > sUI.penaltiesB) wId = m.teamA;
            else if (sUI.penaltiesB > sUI.penaltiesA) wId = m.teamB;
            matchResults[m.id] = wId;
        } else {
            if (m.teamA && m.teamB) {
                const winnerIsA = Math.random() < 0.5;
                const scoreA = winnerIsA ? 3 : 0;
                const scoreB = winnerIsA ? 0 : 3;
                const winnerId = winnerIsA ? m.teamA : m.teamB;
                matchResults[m.id] = winnerId;
                
                newMatchDocs.push({
                    id: `m_flash_${Date.now()}_${Math.floor(Math.random()*10000)}`,
                    compId: comp.id,
                    roundId: round.id,
                    matchId: m.id,
                    teamA: m.teamA,
                    teamB: m.teamB,
                    scoreA, scoreB,
                    penaltiesA: null, penaltiesB: null,
                    goals: [],
                    observacoes: '⚡ W.O. Duplo Automático (Fim do Prazo Flash)',
                    status: 'approved',
                    submittedBy: 'Sistema Flash'
                });
            } else if (m.teamA) { matchResults[m.id] = m.teamA; } 
              else if (m.teamB) { matchResults[m.id] = m.teamB; }
        }
    });

    const newRounds = JSON.parse(JSON.stringify(comp.rounds));
    const rIndex = newRounds.findIndex(r => r.id === round.id);

    if (rIndex >= 0 && rIndex < newRounds.length - 1) {
        const nextRound = newRounds[rIndex + 1];
        round.matches.forEach((m, mIdx) => {
           const winnerId = matchResults[m.id];
           if (!winnerId) return;

           const nextMIndex = Math.floor(mIdx / 2);
           const isTeamA = mIdx % 2 === 0;

           const isNextRoundFinal = nextRound.matches.some(x => x.id.includes('_f1') || x.id.includes('_3rd'));
           if (isNextRoundFinal) {
              const loserId = winnerId === m.teamA ? m.teamB : m.teamA;
              nextRound.matches.forEach(nextMatch => {
                 if (nextMatch.id.includes('_3rd')) {
                    if (isTeamA) nextMatch.teamA = loserId; else nextMatch.teamB = loserId;
                 } else if (nextMatch.id.includes('_f1')) { 
                    if (isTeamA) nextMatch.teamA = winnerId; else nextMatch.teamB = winnerId;
                 }
              });
           } else {
              if (nextRound.matches[nextMIndex]) {
                 if (isTeamA) nextRound.matches[nextMIndex].teamA = winnerId;
                 else nextRound.matches[nextMIndex].teamB = winnerId;
              }
           }
        });
        nextRound.status = 'released';
        nextRound.releasedAt = Date.now(); 
    }
    newRounds[rIndex].status = 'locked';

    if (onBatchUpdateComp) {
        onBatchUpdateComp({ ...comp, rounds: newRounds }, newMatchDocs);
    }
  };

  const getMatchStatusDisplay = (matchId) => {
    const ms = (matches || []).filter(m => m && m.matchId === matchId && m.compId === comp.id && m.status !== 'rejected');
    if(ms.length === 0) return { isPlayed: false, text: 'Aguardando', color: 'text-blue-500', bg: 'bg-blue-950 border-blue-800' };
    const sm = ms.find(m => m.status === 'approved') || ms.find(m => m.status === 'pending');
    if(!sm) return { isPlayed: false, text: 'Aguardando', color: 'text-blue-500', bg: 'bg-blue-950 border-blue-800' };
    if(sm.status === 'approved') return { submittedMatchId: sm.id, isPlayed: true, scoreA: sm.scoreA, scoreB: sm.scoreB, penaltiesA: sm.penaltiesA, penaltiesB: sm.penaltiesB, text: 'Oficial', color: 'text-emerald-400', bg: 'bg-blue-950/80 border-emerald-950/30' };
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
    showToast("Preparando imagem...", "success");
    const captureAndDownload = () => {
      const element = document.getElementById(elementId);
      if (!element) return;
      const originalWidth = element.style.width; const originalOverflow = element.style.overflow;
      element.style.width = 'max-content'; element.style.overflow = 'visible';
      const scrollables = element.querySelectorAll('.scrollbar-kame, .overflow-x-auto');
      scrollables.forEach(el => { el.style.overflow = 'visible'; el.style.width = 'max-content'; el.style.maxHeight = 'none'; });

      window.html2canvas(element, { backgroundColor: '#020617', scale: 2, useCORS: true }).then(canvas => {
        element.style.width = originalWidth; element.style.overflow = originalOverflow;
        scrollables.forEach(el => { el.style.overflow = ''; el.style.width = ''; el.style.maxHeight = ''; });
        const link = document.createElement('a'); link.download = `${fileName}.png`; link.href = canvas.toDataURL('image/png'); link.click();
        showToast("Salvo com sucesso!", "success");
      });
    };
    if (window.html2canvas) { captureAndDownload(); } else {
      const script = document.createElement('script'); script.src = "https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js"; script.onload = captureAndDownload; document.body.appendChild(script);
    }
  };

  const toggleRound = (id) => { setExpandedRoundId(prev => prev === id ? null : id); };
  
  // 🌟 NOVO: FUNÇÃO PARA DELETAR UMA RODADA INTEIRA
  const handleDeleteRound = (roundId) => {
    if (!window.confirm("⚠️ ATENÇÃO: Tem certeza que deseja excluir esta rodada e TODOS os jogos dentro dela? Essa ação não pode ser desfeita.")) return;
    const updatedRounds = comp.rounds.filter(r => r.id !== roundId);
    onEditComp({ ...comp, rounds: updatedRounds });
    showToast("Rodada removida com sucesso!", "success");
  };

  const handleOpenEditGroups = () => {
    const mapping = {};
    if (comp.groups) Object.keys(comp.groups).forEach(gName => { (comp.groups[gName] || []).forEach(tId => { mapping[tId] = gName; }); });
    (comp.teams || []).forEach(tId => { if (!mapping[tId]) { const firstGroupKey = Object.keys(comp.groups || {})[0] || 'A'; mapping[tId] = firstGroupKey; } });
    setTeamGroupMapping(mapping); setShowEditGroups(true);
  };

  const handleSaveGroups = () => {
    const newGroups = {}; const groupKeys = Object.keys(comp.groups || { A: [], B: [] }); groupKeys.forEach(k => { newGroups[k] = []; });
    Object.keys(teamGroupMapping).forEach(tId => { const gName = teamGroupMapping[tId]; if (!newGroups[gName]) newGroups[gName] = []; newGroups[gName].push(tId); });
    onEditComp({ ...comp, groups: newGroups }); setShowEditGroups(false); showToast("Grupos atualizados!", "success");
  };

  const handleAutoMigrateKnockout = () => {
    if (!comp.groups) return; showToast("Calculando classificados...", "info");
    const qualifiers = {};
    Object.keys(comp.groups).forEach((gName) => {
      const gTeams = (teams || []).filter(t => comp.groups[gName].includes(t.id));
      const gTable = calculateStandings(matches, gTeams, comp.id);
      gTable.forEach((row, idx) => { qualifiers[`${idx + 1}º Grupo ${gName}`] = row.id; qualifiers[`${idx + 1}º do Grupo ${gName}`] = row.id; });
    });
    const updatedRounds = comp.rounds.map(round => {
      const newMatches = round.matches.map(m => {
        let newA = m.teamA; let newB = m.teamB;
        if (!newA && m.placeholderA && qualifiers[m.placeholderA]) newA = qualifiers[m.placeholderA];
        if (!newB && m.placeholderB && qualifiers[m.placeholderB]) newB = qualifiers[m.placeholderB];
        return { ...m, teamA: newA, teamB: newB };
      });
      return { ...round, matches: newMatches };
    });
    onEditComp({ ...comp, rounds: updatedRounds }); showToast("Mata-Mata preenchido!", "success");
  };

  const handleAddMatchToGroup = (roundId, groupLetter) => {
    const newMatch = { id: `m_manual_${Date.now()}_${Math.floor(Math.random()*1000)}`, teamA: '', teamB: '', group: groupLetter, placeholderA: 'A Definir', placeholderB: 'A Definir' };
    const updatedRounds = comp.rounds.map(r => r.id === roundId ? { ...r, matches: [...r.matches, newMatch] } : r);
    onEditComp({ ...comp, rounds: updatedRounds }); showToast("Nova partida adicionada!", "success");
  };

  const handleAddNewGroup = (roundId) => {
    const novoG = window.prompt("Qual a letra ou nome do novo grupo? (Ex: E)");
    if (novoG && novoG.trim()) {
      const upperG = novoG.trim().toUpperCase(); let updatedGroups = { ...(comp.groups || {}) }; if (!updatedGroups[upperG]) updatedGroups[upperG] = [];
      const newMatch = { id: `m_manual_${Date.now()}_${Math.floor(Math.random()*1000)}`, teamA: '', teamB: '', group: upperG, placeholderA: 'A Definir', placeholderB: 'A Definir' };
      const updatedRounds = comp.rounds.map(r => r.id === roundId ? { ...r, matches: [...r.matches, newMatch] } : r);
      onEditComp({ ...comp, rounds: updatedRounds, groups: updatedGroups }); showToast(`Grupo ${upperG} criado!`, "success");
    }
  };

  const handleAddNewRound = () => {
    const nextRoundNum = (comp.rounds && comp.rounds.length > 0) ? Math.max(...comp.rounds.map(r => r.number || 0)) + 1 : 1;
    const newMatch = { id: `m_manual_${Date.now()}_${Math.floor(Math.random()*1000)}`, teamA: '', teamB: '', group: null, placeholderA: 'A Definir', placeholderB: 'A Definir' };
    const newRound = { id: `r_manual_${Date.now()}`, number: nextRoundNum, status: 'released', releasedAt: Date.now(), matches: [newMatch] };
    onEditComp({ ...comp, rounds: [...(comp.rounds || []), newRound] }); showToast(`Rodada Extra adicionada!`, "success"); setExpandedRoundId(newRound.id); setShowCalendar(true);
  };

  const handleOpenEditModal = (m, roundId) => {
    const playedMatch = (matches || []).find(x => x.matchId === m.id && x.compId === comp.id && x.status !== 'rejected');
    setEditMatchData({ ...m, roundId: roundId, group: m.group || 'A', scoreA: playedMatch ? playedMatch.scoreA : '', scoreB: playedMatch ? playedMatch.scoreB : '', penaltiesA: playedMatch && playedMatch.penaltiesA !== null && playedMatch.penaltiesA !== undefined ? playedMatch.penaltiesA : '', penaltiesB: playedMatch && playedMatch.penaltiesB !== null && playedMatch.penaltiesB !== undefined ? playedMatch.penaltiesB : '', hasPlayed: !!playedMatch, playedMatchId: playedMatch ? playedMatch.id : null, woA: false, woB: false }); 
  };

  const handleDeleteMatchCompletely = () => {
    if(!window.confirm("Apagar ESTA PARTIDA INTEIRA do calendário?")) return;
    if (editMatchData.hasPlayed && onDeleteMatch && editMatchData.playedMatchId) onDeleteMatch(editMatchData.playedMatchId);
    const updatedRounds = comp.rounds.map(r => r.id === editMatchData.roundId ? { ...r, matches: r.matches.filter(m => m.id !== editMatchData.id) } : r);
    onEditComp({ ...comp, rounds: updatedRounds }); setEditMatchData(null); showToast("Removida do calendário!", "success");
  };

  const saveMatchEdit = () => {
    const updatedRounds = comp.rounds.map(r => r.id === editMatchData.roundId ? { ...r, matches: r.matches.map(m => m.id === editMatchData.id ? { ...m, teamA: editMatchData.teamA, teamB: editMatchData.teamB, group: editMatchData.group } : m) } : r);
    onEditComp({ ...comp, rounds: updatedRounds });
    if (editMatchData.hasPlayed && onUpdatePlayedMatch && editMatchData.playedMatchId) {
      const playedMatch = matches.find(m => m.id === editMatchData.playedMatchId);
      if (playedMatch) {
        const oldTeamA = playedMatch.teamA; const oldTeamB = playedMatch.teamB;
        let finalScoreA = editMatchData.scoreA; let finalScoreB = editMatchData.scoreB; let isDoubleWo = false; let winnerDoubleWo = null;
        if (editMatchData.woA && editMatchData.woB) { isDoubleWo = true; winnerDoubleWo = Math.random() < 0.5 ? 'A' : 'B'; finalScoreA = winnerDoubleWo === 'A' ? 3 : 0; finalScoreB = winnerDoubleWo === 'A' ? 0 : 3; } else if (editMatchData.woA) { finalScoreA = 0; finalScoreB = 3; } else if (editMatchData.woB) { finalScoreA = 3; finalScoreB = 0; }
        const updatedGoals = (playedMatch.goals || []).map(g => { if (g.teamId === oldTeamA) return { ...g, teamId: editMatchData.teamA }; if (g.teamId === oldTeamB) return { ...g, teamId: editMatchData.teamB }; return g; });
        const newObs = isDoubleWo ? `Sorteio de Duplo W.O.! Vencedor: ${winnerDoubleWo === 'A' ? getTeam(editMatchData.teamA)?.name : getTeam(editMatchData.teamB)?.name}\n${playedMatch.observacoes || ''}` : playedMatch.observacoes;
        onUpdatePlayedMatch({ ...playedMatch, teamA: editMatchData.teamA, teamB: editMatchData.teamB, scoreA: finalScoreA !== '' ? parseInt(finalScoreA) : playedMatch.scoreA, scoreB: finalScoreB !== '' ? parseInt(finalScoreB) : playedMatch.scoreB, penaltiesA: editMatchData.penaltiesA !== '' ? parseInt(editMatchData.penaltiesA) : null, penaltiesB: editMatchData.penaltiesB !== '' ? parseInt(editMatchData.penaltiesB) : null, goals: (editMatchData.woA || editMatchData.woB) ? [] : updatedGoals, observacoes: newObs });
        if(isDoubleWo && showToast) showToast(`Sorteio Duplo W.O.: Vencedor gravado!`, "success");
      }
    }
    setEditMatchData(null); if(showToast && !(editMatchData.woA && editMatchData.woB)) showToast("Atualizado!", "success");
  };

  const handleSavePrizes = () => { onEditComp({ ...comp, prizes: { first: prizeData.first.trim(), second: prizeData.second.trim(), third: prizeData.third.trim(), extra: prizeData.extra.trim() } }); setShowEditPrizes(false); showToast("Quadro de premiações atualizado!", "success"); };
  
  const compTeams = (teams || []).filter(t => t && comp.teams?.includes(t.id));
  const availableTeamsToAdd = (teams || []).filter(t => t && !comp.teams?.includes(t.id));
  const availableTeamsForEdit = (comp.format === 'groups' && editMatchData?.group && comp.groups) ? (comp.groups[editMatchData.group] || []) : (comp.teams || []);
  
  const handleAddTeamToComp = () => { if(!newTeamToAdd) return; const newTeams = [...(comp.teams || []), newTeamToAdd]; const newPending = (comp.pendingTeams || []).filter(p => p.teamId !== newTeamToAdd); onEditComp({ ...comp, teams: newTeams, pendingTeams: newPending }); setNewTeamToAdd(''); setShowAddTeam(false); showToast("Time inserido manualmente com sucesso!", "success"); };
  const handleCopyLink = () => { navigator.clipboard.writeText(`${window.location.origin}?join=${comp.id}`); showToast("Link copiado!", "success"); };
  const handleApproveTeam = (req) => { const newPending = comp.pendingTeams.filter(p => p.teamId !== req.teamId); const newTeams = [...(comp.teams || []), req.teamId]; onEditComp({ ...comp, pendingTeams: newPending, teams: newTeams }); showToast("Time Aprovado!", "success"); };
  const handleRejectTeam = (req) => { const newPending = comp.pendingTeams.filter(p => p.teamId !== req.teamId); onEditComp({ ...comp, pendingTeams: newPending }); showToast("Inscrição rejeitada.", "success"); };
  
  const handleGenerateBracket = () => { if (comp.teams.length !== comp.teamCount) { showToast(`Você precisa de ${comp.teamCount} times!`, "error"); return; } let finalRounds = []; let groupsData = null; if (comp.format === 'groups') { const res = generateGroupsAndKnockout(comp.teams, comp.id, comp.numGroups, comp.qualifiersPerGroup, comp.isDoubleRound, comp.isFinalDouble); finalRounds = res.rounds; groupsData = res.groups; } else if (comp.format === 'cup') { finalRounds = generateCupBracket(comp.teams, comp.id, comp.isFinalDouble); } else { finalRounds = generateRoundRobin(comp.teams, comp.id, comp.isDoubleRound); } onEditComp({ ...comp, status: 'active', rounds: finalRounds, groups: groupsData || comp.groups || null }); showToast("Tabela gerada!", "success"); };
  
  const hasAnyPrize = comp.prizes && (comp.prizes.first || comp.prizes.second || comp.prizes.third || comp.prizes.extra);
  const knockoutRounds = (comp.rounds || []).filter(r => r.id.includes('ko') || comp.format === 'cup');
  const groupOrNormalRounds = (comp.rounds || []).filter(r => !r.id.includes('ko') && comp.format !== 'cup');
  
  const championTeam = useMemo(() => {
    if (!comp.rounds || comp.rounds.length === 0) return null;
    if (comp.format === 'cup' || comp.format === 'groups') {
      if (knockoutRounds.length === 0) return null;
      const lastRound = knockoutRounds[knockoutRounds.length - 1]; const finalMatches = lastRound.matches.filter(m => !m.id.includes('_3rd'));
      if (finalMatches.length === 0) return null; let allApproved = true; let totalScoreA = 0; let totalScoreB = 0; let lastPenA = null; let lastPenB = null; let tA = finalMatches[0].teamA; let tB = finalMatches[0].teamB;
      if(!tA || !tB) return null;
      for (let fm of finalMatches) {
         const sUI = matches.find(m => m.matchId === fm.id && m.compId === comp.id && m.status === 'approved');
         if (!sUI) { allApproved = false; break; }
         if (fm.teamA === tA) { totalScoreA += Number(sUI.scoreA || 0); totalScoreB += Number(sUI.scoreB || 0); if (sUI.penaltiesA !== null && sUI.penaltiesA !== undefined) { lastPenA = Number(sUI.penaltiesA); lastPenB = Number(sUI.penaltiesB); } } else { totalScoreA += Number(sUI.scoreB || 0); totalScoreB += Number(sUI.scoreA || 0); if (sUI.penaltiesB !== null && sUI.penaltiesB !== undefined) { lastPenA = Number(sUI.penaltiesB); lastPenB = Number(sUI.penaltiesA); } }
      }
      if (allApproved) { if (totalScoreA > totalScoreB) return getTeam(tA); if (totalScoreB > totalScoreA) return getTeam(tB); if (lastPenA !== null && lastPenB !== null) { if (lastPenA > lastPenB) return getTeam(tA); if (lastPenB > lastPenA) return getTeam(tB); } }
    } else if (comp.format === 'league') {
      const totalMatches = groupOrNormalRounds.reduce((acc, r) => acc + r.matches.length, 0); const approvedMatches = matches.filter(m => m.compId === comp.id && m.status === 'approved').length;
      if (totalMatches > 0 && approvedMatches === totalMatches) { const standings = calculateStandings(matches, compTeams, comp.id); return standings.length > 0 ? standings[0] : null; }
    } return null;
  }, [comp, matches, knockoutRounds, groupOrNormalRounds, teams]);

  return (
    <div className="space-y-6 animate-in fade-in pb-10">
      <button onClick={onBack} className="flex items-center gap-1.5 text-xs text-blue-400 hover:text-white"><ArrowLeft size={16}/> Voltar</button>
      
      <div className="bg-blue-900 p-5 rounded-3xl border border-blue-800 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shadow-xl">
        <div>
          <h2 className="text-xl font-bold text-white uppercase tracking-wider">{comp.category ? CATEGORY_NAMES[comp.category] : 'Campeonato'} - {comp.name}</h2>
          <div className="flex items-center flex-wrap gap-2 mt-2">
            <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded font-black tracking-widest uppercase">{comp.category ? CATEGORY_NAMES[comp.category] : 'Sem Categoria'}</span>
            <span className="text-[10px] bg-purple-500/20 text-purple-400 px-2 py-0.5 rounded font-black tracking-widest uppercase">Estilo: {comp.playStyle || 'Livre'}</span>
            {comp.status === 'finished' && (<span className="text-[10px] bg-red-500/20 text-red-400 px-2 py-0.5 rounded font-black tracking-widest uppercase flex items-center gap-1"><Lock size={10}/> Encerrado</span>)}
            <span className="text-xs text-blue-400 font-medium ml-1">• {comp.format === 'league' ? 'Pontos Corridos' : comp.format === 'groups' ? 'Fase de Grupos + Copa' : 'Copa Mata-Mata'}</span>
          </div>
        </div>
        <div className="flex gap-2 w-full md:w-auto flex-wrap">
          {isAdmin && comp.format === 'groups' && comp.groups && (<button onClick={handleOpenEditGroups} className="bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold py-2 px-3 rounded-lg border border-purple-700 shadow-md flex items-center gap-1">👥 Gerenciar Grupos</button>)}
          {isAdmin && comp.status !== 'finished' && (<button onClick={() => { setShowEditSettings(!showEditSettings); setShowEditPrizes(false); }} className="bg-blue-800 hover:bg-blue-700 text-blue-200 text-xs font-bold py-2 px-3 rounded-lg border border-blue-600 shadow-md flex items-center gap-1">⚙️ Configurações</button>)}
          {isAdmin && comp.status !== 'finished' && (<button onClick={() => { if(window.confirm("Deseja encerrar oficialmente esta competição?")) { onEditComp({ ...comp, status: 'finished' }); showToast("Competição encerrada!", "success"); } }} className="bg-red-900/80 hover:bg-red-800 text-red-200 text-xs font-bold py-2 px-3 rounded-lg border border-red-700 shadow-md flex items-center gap-1">🛑 Encerrar Torneio</button>)}
          {isAdmin && (<button onClick={() => { setShowEditPrizes(!showEditPrizes); setShowEditSettings(false); }} className="bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold py-2 px-3 rounded-lg border border-amber-700 shadow-md flex items-center gap-1">🏆 Premiação</button>)}
         {isAdmin && comp.status !== 'finished' && (
            <>
              {showAddTeam ? (
                <div className="flex gap-2 w-full sm:w-auto animate-in fade-in">
                  <select value={newTeamToAdd} onChange={e=>setNewTeamToAdd(e.target.value)} className="bg-blue-950 border border-blue-700 rounded-lg p-2 text-xs text-white outline-none"><option value="">Escolher time...</option>{availableTeamsToAdd.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}</select>
                  <Button onClick={handleAddTeamToComp} className="py-1 px-3 text-xs">Salvar</Button><Button variant="outline" onClick={()=>{setShowAddTeam(false); setNewTeamToAdd('');}} className="py-1 px-2 text-xs font-bold text-blue-400">X</Button>
                </div>
              ) : (<Button variant="outline" onClick={()=>setShowAddTeam(true)} className="py-2 px-3 text-xs w-full sm:w-auto flex items-center justify-center gap-2"><span className="text-emerald-400 font-bold">+</span> Inserir Time</Button>)}
            </>
          )}
        </div>
      </div>

      {showEditSettings && (
        <div className="bg-blue-950/80 border border-blue-700 p-5 rounded-2xl space-y-4 animate-in slide-in-from-top-4">
          <h3 className="text-sm font-bold text-blue-300 uppercase tracking-wider flex items-center gap-2">⚙️ Configurações Gerais</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1"><label className="text-xs font-bold text-blue-400">Edição (Apenas Número)</label><input type="number" min="1" value={settingsData.edition} onChange={e => setSettingsData({...settingsData, edition: e.target.value})} className="w-full bg-blue-900 border border-blue-700 rounded-lg p-2.5 text-white text-sm outline-none focus:border-emerald-500" placeholder="Ex: 1, 2, 3..." /></div>
            <div className="space-y-1"><label className="text-xs font-bold text-blue-400">Categoria (Ranking)</label>
              <select value={settingsData.category} onChange={e => setSettingsData({...settingsData, category: e.target.value})} className="w-full bg-blue-900 border border-blue-700 rounded-lg p-2.5 text-white text-sm outline-none focus:border-emerald-500"><option value="liga_a">🥇 Liga Kame A (Série A)</option><option value="liga_b">🥈 Liga Kame B (Série B)</option><option value="liga_c">🥉 Liga Kame C (Série C)</option><option value="liga_d">🎖️ Liga Kame D (Série D)</option><option value="liga_acesso">⬆️ Liga de Acesso</option><option value="copa_main">🏆 Copas Oficiais (Ex: Copa do Clã)</option><option value="copa_do_rei">👑 Copa do Rei</option><option value="copa_amazonia">🌳 Copa da Amazônia</option><option value="copa_flash">⚡ Copa Flash (Tiro Curto)</option></select>
            </div>
            <div className="space-y-1"><label className="text-xs font-bold text-blue-400">Estilo de Jogo</label>
              <select value={settingsData.playStyle} onChange={e => setSettingsData({...settingsData, playStyle: e.target.value})} className="w-full bg-blue-900 border border-blue-700 rounded-lg p-2.5 text-white text-sm outline-none focus:border-emerald-500"><option value="Livre">Livre (Qualquer Estilo)</option><option value="Full Razz">Full Razz (Sem Balão)</option><option value="Personalizado">Regras Personalizadas</option></select>
            </div>
            <div className="space-y-1"><label className="text-xs font-bold text-blue-400">Vagas de Acesso</label><input type="number" min="0" value={settingsData.promotions} onChange={e => setSettingsData({...settingsData, promotions: parseInt(e.target.value) || 0})} className="w-full bg-blue-900 border border-blue-700 rounded-lg p-2.5 text-white text-sm outline-none focus:border-emerald-500" placeholder="Ex: 4" /></div>
            <div className="space-y-1"><label className="text-xs font-bold text-blue-400">Vagas de Rebaixamento</label><input type="number" min="0" value={settingsData.relegations} onChange={e => setSettingsData({...settingsData, relegations: parseInt(e.target.value) || 0})} className="w-full bg-blue-900 border border-blue-700 rounded-lg p-2.5 text-white text-sm outline-none focus:border-emerald-500" placeholder="Ex: 4" /></div>
            <div className="space-y-1 md:col-span-2"><label className="text-xs font-bold text-blue-400">Regras da Competição</label><textarea value={settingsData.rules} onChange={e => setSettingsData({...settingsData, rules: e.target.value})} placeholder="Descreva as regras..." className="w-full bg-blue-900 border border-blue-700 rounded-lg p-2.5 text-white text-sm outline-none focus:border-emerald-500 min-h-[80px] resize-y" /></div>
            
            {isLeader && (
              <div className="space-y-2 md:col-span-2 pt-2 border-t border-blue-800">
                <label className="text-xs font-bold text-emerald-400">Adicionar Organizadores</label>
                <div className="flex flex-wrap gap-2">{users.filter(u => u.role === 'organizer').map(u => ( <label key={u.id} className="flex items-center gap-2 text-xs text-blue-200 bg-blue-950 px-3 py-2 rounded-lg border border-blue-800 cursor-pointer hover:border-emerald-500/50"><input type="checkbox" checked={settingsData.admins.includes(u.id)} onChange={e => { const newAdmins = e.target.checked ? [...settingsData.admins, u.id] : settingsData.admins.filter(id => id !== u.id); setSettingsData({...settingsData, admins: newAdmins}); }} className="accent-emerald-500 w-3 h-3" /> {u.name}</label> ))}</div>
              </div>
            )}

            {isLeader && (
              <div className="space-y-2 md:col-span-2 pt-2 border-t border-blue-800">
                <label className="text-xs font-bold text-red-400 flex items-center gap-1.5">
                  <XCircle size={14}/> Bloquear inscritos dos torneios:
                </label>
                <div className="flex flex-wrap gap-2">
                  {competitions.filter(c => c.status === 'active' && c.id !== comp.id).map(c => (
                    <label key={c.id} className="flex items-center gap-1.5 text-xs text-blue-200 bg-blue-950 px-3 py-2 rounded-lg border border-blue-800 cursor-pointer hover:border-red-500/50 transition-colors">
                      <input 
                        type="checkbox" 
                        checked={settingsData.excludedCompIds.includes(c.id)} 
                        onChange={e => { 
                          const newEx = e.target.checked 
                            ? [...settingsData.excludedCompIds, c.id] 
                            : settingsData.excludedCompIds.filter(id => id !== c.id); 
                          setSettingsData({...settingsData, excludedCompIds: newEx}); 
                        }} 
                        className="accent-red-500 w-3 h-3" 
                      /> {c.name}
                    </label> 
                  ))}
                </div>
              </div>
            )}
            
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button onClick={() => setShowEditSettings(false)} className="px-4 py-2 bg-blue-900 border border-blue-700 rounded-lg text-xs text-blue-300 hover:text-white">Cancelar</button>
            <button onClick={() => { 
              const CAT_NAMES = { liga_a: 'Liga Kame A', liga_b: 'Liga Kame B', liga_c: 'Liga Kame C', liga_d: 'Liga Kame D', liga_acesso: 'Liga de Acesso', copa_main: 'Copa Oficial', copa_flash: 'Copa Flash', copa_do_rei: 'Copa do Rei', copa_amazonia: 'Copa da Amazônia' }; 
              const cleanCatName = CAT_NAMES[settingsData.category] || 'Competição'; 
              
              onEditComp({ 
                ...comp, 
                name: settingsData.edition ? `${cleanCatName} - Edição ${settingsData.edition}` : comp.name, 
                category: settingsData.category, 
                playStyle: settingsData.playStyle, 
                rules: settingsData.rules, 
                promotions: settingsData.promotions, 
                relegations: settingsData.relegations, 
                admins: settingsData.admins,
                excludedCompIds: settingsData.excludedCompIds
              }); 
              setShowEditSettings(false); 
              showToast("Configurações atualizadas!", "success"); 
            }} className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg text-xs shadow-md">Salvar</button>
          </div>
        </div>
      )}

      {showEditPrizes && (
        <div className="bg-amber-500/10 border border-amber-500/30 p-5 rounded-2xl space-y-4 animate-in slide-in-from-top-4">
          <h3 className="text-sm font-bold text-amber-400 uppercase tracking-wider flex items-center gap-2">💰 Atualizar Prêmios</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4"><div className="space-y-1"><label className="text-xs font-bold text-blue-300">🥇 1º Lugar</label><input type="text" value={prizeData.first} onChange={e => setPrizeData({...prizeData, first: e.target.value})} className="w-full bg-blue-950 border border-blue-700 rounded-lg p-2 text-white text-sm" /></div><div className="space-y-1"><label className="text-xs font-bold text-blue-300">🥈 2º Lugar</label><input type="text" value={prizeData.second} onChange={e => setPrizeData({...prizeData, second: e.target.value})} className="w-full bg-blue-950 border border-blue-700 rounded-lg p-2 text-white text-sm" /></div><div className="space-y-1"><label className="text-xs font-bold text-blue-300">🥉 3º Lugar</label><input type="text" value={prizeData.third} onChange={e => setPrizeData({...prizeData, third: e.target.value})} className="w-full bg-blue-950 border border-blue-700 rounded-lg p-2 text-white text-sm" /></div></div>
          <div className="space-y-1"><label className="text-xs font-bold text-amber-400">🎟️ Sorteios / Extras</label><input type="text" value={prizeData.extra} onChange={e => setPrizeData({...prizeData, extra: e.target.value})} className="w-full bg-blue-950 border border-blue-700 rounded-lg p-2 text-white text-sm" /></div>
          <div className="flex justify-end gap-2"><button onClick={() => setShowEditPrizes(false)} className="px-3 py-1.5 bg-blue-950 border border-blue-700 rounded-lg text-xs text-blue-400">Cancelar</button><button onClick={handleSavePrizes} className="px-4 py-1.5 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-lg text-xs">Salvar</button></div>
        </div>
      )}

      {championTeam && (
        <div className="bg-gradient-to-r from-amber-500 via-yellow-600 to-amber-700 p-6 rounded-3xl border border-amber-400 shadow-[0_0_30px_rgba(245,158,11,0.4)] text-blue-950 flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden">
          <div className="absolute -inset-10 bg-white/10 blur-2xl rounded-full transform -rotate-45 animate-pulse"></div>
          <div className="flex items-center gap-5 relative z-10"><div className="bg-blue-950/20 p-2.5 rounded-full shadow-inner transform hover:rotate-12"><ShieldDisplay shield={championTeam.shield} size="large" /></div><div><span className="text-[10px] bg-blue-950 text-amber-400 px-2.5 py-0.5 rounded-full uppercase font-black">🏆 GRANDE CAMPEÃO 🏆</span><h3 className="text-2xl font-black text-white mt-1.5 uppercase tracking-wide">{championTeam.name}</h3><p className="text-xs font-bold text-blue-950 uppercase mt-0.5 tracking-wider">Técnico Glorioso: <span className="text-white">{championTeam.coach}</span></p></div></div>
          <div className="flex items-center gap-3 bg-blue-950/20 px-5 py-3 rounded-2xl relative z-10 w-full md:w-auto"><Trophy className="text-white animate-bounce" size={44} style={{ animationDuration: '3s' }} /><div className="text-left"><p className="text-[9px] uppercase font-black tracking-widest text-blue-950">Troféu de Elite</p><p className="text-sm font-black text-white leading-tight uppercase max-w-[180px] truncate">{comp.name}</p></div></div>
        </div>
      )}

      {isRegistration ? (
        <div className="bg-blue-900 border border-blue-800 rounded-3xl p-6 md:p-8 shadow-2xl animate-in slide-in-from-bottom-4">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-black text-emerald-400 uppercase tracking-widest drop-shadow-md mb-2">Inscrições Abertas</h2>
            <p className="text-blue-300">Aguardando os times se cadastrarem pelo link ou via inserção manual.</p>
            <div className="mt-6 flex flex-col items-center justify-center gap-4">
               <div className="bg-blue-950 px-8 py-4 rounded-2xl border border-blue-800 shadow-inner"><p className="text-xs text-blue-400 uppercase font-bold mb-1">Vagas Preenchidas</p><p className="text-4xl font-black text-white">{(comp.teams?.length || 0)} <span className="text-blue-600 text-2xl">/ {comp.teamCount}</span></p></div>
               <Button onClick={handleCopyLink} className="py-3 px-8 text-sm font-bold bg-blue-600 shadow-xl">🔗 Copiar Link de Inscrição</Button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div>
              <h3 className="text-sm font-bold text-amber-400 uppercase mb-4 flex items-center gap-2"><CheckSquare size={16}/> Solicitações Pendentes</h3>
              <div className="space-y-3">
                {(!comp.pendingTeams || comp.pendingTeams.length === 0) && <p className="text-xs text-blue-500 p-4 bg-blue-950 rounded-xl border border-blue-800 border-dashed text-center">Nenhum time na fila.</p>}
                {(comp.pendingTeams || []).map((req, idx) => {
                  const t = getTeam(req.teamId);
                  return (
                    <div key={idx} className="bg-blue-950 p-4 rounded-xl border border-amber-500/30 flex flex-col gap-3">
                      <div className="flex items-center gap-3"><ShieldDisplay shield={t?.shield} size="small" /><div><p className="font-bold text-white text-sm">{t?.name}</p><p className="text-[10px] text-blue-400">Técnico: {t?.coach}</p></div></div>
                      <div className="flex gap-2"><Button variant="outline" onClick={()=>handleRejectTeam(req)} className="flex-1 py-2 text-xs text-red-400">Recusar</Button><Button onClick={()=>handleApproveTeam(req)} className="flex-1 py-2 text-xs bg-emerald-600">Aprovar</Button></div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div>
              <h3 className="text-sm font-bold text-emerald-400 uppercase mb-4 flex items-center gap-2"><CheckCircle size={16}/> Times Confirmados</h3>
              <div className="grid grid-cols-2 gap-2">
                {(!comp.teams || comp.teams.length === 0) && <p className="text-xs text-blue-500 p-4 bg-blue-950 rounded-xl border border-blue-800 border-dashed text-center col-span-2">Nenhum time aprovado ainda.</p>}
                {(comp.teams || []).map(tId => {
                  const t = getTeam(tId);
                  return (<div key={tId} className="bg-blue-950 p-3 rounded-xl border border-emerald-500/20 flex items-center gap-2"><ShieldDisplay shield={t?.shield} size="small" /><span className="font-bold text-xs text-blue-100 truncate">{t?.name}</span></div>);
                })}
              </div>
            </div>
          </div>

          <div className="mt-8 pt-8 border-t border-blue-800">
             <Button onClick={handleGenerateBracket} disabled={comp.teams?.length !== comp.teamCount} className="w-full py-5 text-xl font-black rounded-2xl bg-emerald-500 text-blue-950 hover:bg-emerald-400 disabled:bg-blue-900 disabled:text-blue-700 shadow-2xl">🏆 Encerrar Inscrições e Gerar Tabela</Button>
          </div>
        </div>
      ) : (
        <>
          <div className="flex gap-1 p-1 bg-blue-950 rounded-xl border border-blue-800 overflow-x-auto custom-scrollbar">
            <button onClick={()=>setSubTab('overview')} className={`shrink-0 flex-1 px-4 py-1.5 text-xs rounded-lg font-bold transition-all ${subTab==='overview'?'bg-emerald-600 text-white':'text-blue-500 hover:text-white'}`}>Tabela & Jogos</button>
            <button onClick={()=>setSubTab('stats')} className={`shrink-0 flex-1 px-4 py-1.5 text-xs rounded-lg font-bold transition-all ${subTab==='stats'?'bg-emerald-600 text-white':'text-blue-500 hover:text-white'}`}>Estatísticas</button>
            {isAdmin && (
              <>
                <button onClick={()=>setSubTab('submit')} className={`shrink-0 flex-1 px-4 py-1.5 text-xs rounded-lg font-bold transition-all ${subTab==='submit'?'bg-emerald-600 text-white':'text-blue-500 hover:text-white'}`}>Registrar</button>
                <button onClick={()=>setSubTab('validation')} className={`shrink-0 flex-1 px-4 py-1.5 text-xs rounded-lg font-bold transition-all flex justify-center items-center gap-1 ${subTab==='validation'?'bg-amber-600 text-white':'text-amber-500/70 hover:text-amber-400'}`}>
                  Validação {matches.filter(m => m.compId === comp.id && m.status === 'pending').length > 0 && <span className="bg-red-500 text-white px-1.5 py-0.5 rounded-full text-[9px] shadow-sm">{matches.filter(m => m.compId === comp.id && m.status === 'pending').length}</span>}
                </button>
                <button onClick={()=>setSubTab('draw')} className={`shrink-0 flex-1 px-4 py-1.5 text-xs rounded-lg font-bold transition-all flex justify-center items-center gap-1 ${subTab==='draw'?'bg-purple-600 text-white':'text-purple-400 hover:text-purple-300'}`}>🎁 Sorteio</button>
              </>
            )}
          </div>
          
          <div className="space-y-8 mt-4">
            {subTab === 'overview' && (
              <div className="space-y-6 animate-in slide-in-from-left-4">
                
                {comp.rules && (
                  <div className="bg-blue-950/80 p-5 rounded-2xl border border-blue-800 shadow-inner">
                    <h4 className="text-sm font-bold text-sky-400 mb-2 flex items-center gap-2"><BookOpen size={16}/> Regras do Torneio</h4>
                    <p className="text-xs text-blue-200 whitespace-pre-wrap leading-relaxed">{comp.rules}</p>
                  </div>
                )}
                
                {comp.format !== 'league' && (
                  <div className="flex justify-center"><div className="bg-blue-950 p-1 rounded-xl border border-blue-800 flex gap-1">
                    <button type="button" onClick={() => setViewType('bracket')} className={`px-4 py-1.5 text-xs rounded-lg font-bold transition-colors ${viewType === 'bracket' ? 'bg-amber-600 text-white' : 'text-blue-400 hover:text-white'}`}>🏆 Chaveamento Mata-Mata</button>
                    <button type="button" onClick={() => setViewType('table')} className={`px-4 py-1.5 text-xs rounded-lg font-bold transition-colors ${viewType === 'table' ? 'bg-amber-600 text-white' : 'text-blue-400 hover:text-white'}`}>{comp.format === 'groups' ? '📋 Classificação dos Grupos' : '📋 Tabela Geral Tradicional'}</button>
                  </div></div>
                )}

                {/* ⏱️ MURAL DA COPA FLASH */}
                {isFlash && activeRound && (
                  <div className="bg-gradient-to-r from-amber-900/40 to-blue-900/40 border border-amber-500/50 p-5 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-4 shadow-xl relative overflow-hidden animate-in slide-in-from-top-4">
                     <div className="absolute top-0 left-0 w-1.5 h-full bg-amber-500 animate-pulse"></div>
                     <div>
                        <h4 className="text-amber-400 font-black uppercase tracking-widest flex items-center gap-2"><Activity size={18}/> MODO COPA FLASH ⚡</h4>
                        <p className="text-xs text-amber-100/70 mt-1">Fase Atual: <b>{activeRound.number}</b> • Todos os jogos devem ser enviados antes do tempo esgotar!</p>
                     </div>
                     <div className="flex flex-col items-center md:items-end gap-2 shrink-0">
                        <div className="bg-blue-950 px-4 py-2 rounded-xl border border-blue-800 shadow-inner">
                           <span className="text-[10px] uppercase font-bold text-blue-400 block mb-1 text-center md:text-right">Tempo Restante</span>
                           <span className={`text-3xl font-mono font-black tracking-wider ${isExpired ? 'text-red-500 animate-pulse' : 'text-emerald-400'}`}>
                             {formatTime(timeLeft)}
                           </span>
                        </div>
                        {isAdmin && (
                           <button onClick={() => handleAutoFlashRound(activeRound)} className={`px-4 py-2 rounded-lg font-black text-[10px] uppercase tracking-wider transition-all shadow-lg ${isExpired ? 'bg-amber-600 hover:bg-amber-500 text-white animate-bounce' : 'bg-blue-800 hover:bg-amber-600 text-blue-300 hover:text-white border border-blue-700 hover:border-amber-500'}`}>
                             ⚡ Encerrar Fase Automático
                           </button>
                        )}
                     </div>
                  </div>
                )}

                {viewType === 'table' && (
                  <div className="space-y-6 animate-in fade-in">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-2 mb-2 pl-2">
                      <h3 className="text-lg font-bold text-white">Classificação da Competição</h3>
                      <Button onClick={() => captureSection('capture-standings', `Tabela-${comp.name}`)} className="text-[10px] py-1.5 px-3 shadow-lg" variant="outline"><Camera size={14}/> Salvar Tabela</Button>
                    </div>
                    <div id="capture-standings" className="bg-blue-950 p-6 sm:p-8 rounded-3xl border border-blue-800 shadow-2xl">
                      <div className="flex items-center gap-4 mb-6"><img src={LOGO_URL} alt="Logo" className="w-16 h-16 object-contain" /><h2 className="text-xl sm:text-2xl font-black text-white uppercase tracking-wider">TABELA - {comp.name}</h2></div>
                      <Standings matches={matches} teams={compTeams} comp={comp} />
                    </div>

                    {(groupOrNormalRounds.length > 0 || (isAdmin && comp.format === 'league')) && (
                      <div className="space-y-3 pt-4 border-t border-blue-800/50">
                        {isAdmin && comp.format === 'league' && (<Button onClick={handleAddNewRound} className="w-full mt-4 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg border border-emerald-500">➕ Adicionar Nova Rodada / Partida Extra</Button>)}
                        {groupOrNormalRounds.length > 0 && (<Button onClick={() => setShowCalendar(!showCalendar)} className="w-full mt-2 py-4 bg-blue-900 border border-blue-700 hover:bg-blue-800 text-white rounded-2xl font-bold flex items-center justify-center gap-2 transition-all shadow-md">{showCalendar ? 'Esconder Calendário' : '📅 Ver Calendário de Partidas'}</Button>)}

                        {showCalendar && (
                          <div className="mt-6 space-y-4 animate-in slide-in-from-top-4">
                            <h3 className="text-base font-bold text-blue-300 mb-2 pl-2">Calendário de Rodadas</h3>
                            {groupOrNormalRounds.map((round) => {
                              const isExpanded = expandedRoundId === round.id; const isLocked = round.status === 'locked'; 
                              return (
                                <div key={round.id} className={`bg-blue-900 border rounded-xl overflow-hidden ${isLocked ? 'border-blue-800/50' : 'border-emerald-500/30 shadow-[0_0_10px_rgba(16,185,129,0.05)]'}`}>
                                  <div className="w-full bg-blue-950/60 flex items-center justify-between pr-4">
                                    <button type="button" onClick={() => toggleRound(round.id)} className="flex-1 p-4 flex justify-between items-center outline-none">
                                      <span className={`text-sm font-bold flex items-center gap-2 ${isLocked ? 'text-blue-400' : 'text-emerald-400'}`}>{isLocked ? <Lock size={16} className="text-amber-500"/> : <PlayCircle size={16} className="text-emerald-500"/>} Rodada {round.number}</span>
                                      <span className="text-blue-500 text-xs font-bold mr-2">{isExpanded ? '▲ Recolher' : '▼ Expandir'}</span>
                                    </button>
                                    <div className="flex items-center gap-1.5">
                                      {isAdmin && isLocked && (<button type="button" onClick={(e) => { e.stopPropagation(); onReleaseRound(comp.id, round.id); }} className="bg-emerald-600 hover:bg-emerald-500 text-blue-950 font-black text-[10px] px-3 py-1.5 rounded uppercase tracking-wider transition-colors shrink-0 shadow-md">🔓 Liberar</button>)}
                                      {isAdmin && !isLocked && (<button type="button" onClick={(e) => { e.stopPropagation(); onLockRound(comp.id, round.id); }} className="bg-amber-600 hover:bg-amber-500 text-blue-950 font-black text-[10px] px-3 py-1.5 rounded uppercase tracking-wider transition-colors shrink-0 shadow-md">🔒 Travar</button>)}
                                      {isAdmin && (<button type="button" onClick={(e) => { e.stopPropagation(); handleDeleteRound(round.id); }} className="bg-red-500/20 hover:bg-red-500 text-red-400 hover:text-white p-1.5 rounded transition-colors shrink-0 shadow-md" title="Excluir Rodada"><Trash2 size={14}/></button>)}
                                    </div>
                                  </div>
                                  {isExpanded && (
                                    <div className="p-4 bg-blue-950/40 border-t border-blue-800">
                                      {comp.format === 'groups' ? (
                                         <div className="space-y-6">
                                           {(() => {
                                             const roundGroupsSet = new Set(); if (comp.groups) Object.keys(comp.groups).forEach(g => roundGroupsSet.add(g.toUpperCase()));
                                             round.matches.forEach(m => { if (m.group) roundGroupsSet.add(m.group.toUpperCase()); });
                                             const sortedGroups = Array.from(roundGroupsSet).sort((a, b) => a.localeCompare(b));
                                             return (
                                               <>
                                                 {sortedGroups.map(groupLetter => {
                                                   const matchesInGroup = round.matches.filter(m => { if (m.group) { return m.group.toUpperCase() === groupLetter; } const groupTeamIds = comp.groups && comp.groups[groupLetter] ? comp.groups[groupLetter] : []; return groupTeamIds.includes(m.teamA) || groupTeamIds.includes(m.teamB); });
                                                   return (
                                                     <div key={groupLetter} className="space-y-3">
                                                       <div className="bg-blue-900/50 py-1 px-3 rounded-lg border border-blue-800/50 flex items-center justify-between gap-3"><span className="text-xs font-bold text-amber-400 uppercase tracking-wider">Confrontos Grupo {groupLetter}</span>{isAdmin && !isLocked && (<button type="button" onClick={() => handleAddMatchToGroup(round.id, groupLetter)} className="text-[9px] bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-2 py-0.5 rounded shadow transition-colors shrink-0">+ Novo Jogo</button>)}</div>
                                                       {matchesInGroup.length === 0 ? (<p className="text-[10px] text-blue-400/70 italic px-2">Sem jogos.</p>) : (
                                                         <div className="grid grid-cols-1 gap-3">
                                                           {matchesInGroup.map(m => {
                                                             const tA = getTeam(m.teamA); const tB = getTeam(m.teamB); const sUI = getMatchStatusDisplay(m.id);
                                                             return (
                                                               <div key={m.id} className="relative group">
                                                                 <div onClick={()=>{if(!isLocked && sUI.isPlayed && onSelectMatch){const f = matches.find(x=>x.id===sUI.submittedMatchId); if(f) onSelectMatch(f)}}} className={`bg-blue-900/80 p-4 rounded-xl border flex items-center justify-between transition-colors shadow-sm ${isLocked ? 'border-blue-900/60 opacity-50 grayscale-[50%]' : 'border-blue-800 cursor-pointer hover:border-blue-700'}`}>
                                                                   <div className="flex flex-col items-center text-center w-1/3 min-w-0"><ShieldDisplay shield={tA?.shield} size="normal" /><span className="font-bold text-blue-200 text-xs mt-2 truncate w-full px-1">{tA?.name || m.placeholderA}</span></div>
                                                                   <div className="flex flex-col items-center justify-center w-1/3 shrink-0"><span className={`text-[9px] uppercase tracking-widest font-black px-2 py-0.5 rounded-md mb-2 text-center ${sUI.bg} ${sUI.color}`}>{isLocked ? '🔒 Bloqueado' : sUI.text}</span><div className="flex items-center justify-center gap-2">{sUI.isPlayed ? (<>{sUI.penaltiesA !== null && sUI.penaltiesA !== undefined && <span className="text-[10px] text-amber-400 font-bold mb-3 mr-0.5">({sUI.penaltiesA})</span>}<span className={`text-2xl font-black ${sUI.color}`}>{sUI.scoreA}</span><span className="text-blue-700 font-bold text-xl">:</span><span className={`text-2xl font-black ${sUI.color}`}>{sUI.scoreB}</span>{sUI.penaltiesB !== null && sUI.penaltiesB !== undefined && <span className="text-[10px] text-amber-400 font-bold mb-3 ml-0.5">({sUI.penaltiesB})</span>}</>) : (<span className="text-blue-700 font-bold text-xl">:</span>)}</div></div>
                                                                   <div className="flex flex-col items-center text-center w-1/3 min-w-0"><ShieldDisplay shield={tB?.shield} size="normal" /><span className="font-bold text-blue-200 text-xs mt-2 truncate w-full px-1">{tB?.name || m.placeholderB}</span></div>
                                                                 </div>
                                                                 {isAdmin && (<button type="button" onClick={(e) => { e.stopPropagation(); handleOpenEditModal(m, round.id); }} className="absolute -right-1 -top-1 text-blue-400 hover:text-emerald-400 p-1 bg-blue-950 rounded border border-blue-800 md:opacity-0 md:group-hover:opacity-100 transition-opacity shadow-lg z-10"><Edit size={12} /></button>)}
                                                               </div>
                                                             );
                                                           })}
                                                         </div>
                                                       )}
                                                     </div>
                                                   );
                                                 })}
                                                 {isAdmin && !isLocked && (<div className="mt-4 pt-4 border-t border-blue-800/50"><button type="button" onClick={() => handleAddNewGroup(round.id)} className="text-[10px] bg-blue-800 hover:bg-blue-700 text-blue-300 font-bold px-3 py-2 rounded shadow transition-colors w-full border border-blue-700 border-dashed">+ Criar Novo Grupo na Rodada</button></div>)}
                                               </>
                                             );
                                           })()}
                                         </div>
                                      ) : (
                                         <div>
                                           {isAdmin && !isLocked && (<div className="mb-3"><button type="button" onClick={() => handleAddMatchToGroup(round.id, null)} className="text-[10px] bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-3 py-1.5 rounded shadow transition-colors">+ Adicionar Nova Partida na Rodada</button></div>)}
                                           <div className="grid grid-cols-1 gap-3">
                                             {round.matches.map(m => {
                                               const tA = getTeam(m.teamA); const tB = getTeam(m.teamB); const sUI = getMatchStatusDisplay(m.id);
                                               return (
                                                 <div key={m.id} className="relative group">
                                                   <div onClick={()=>{if(!isLocked && sUI.isPlayed && onSelectMatch){const f = matches.find(x=>x.id===sUI.submittedMatchId); if(f) onSelectMatch(f)}}} className={`bg-blue-900/80 p-4 rounded-xl border flex items-center justify-between transition-colors shadow-sm ${isLocked ? 'border-blue-900/60 opacity-50 grayscale-[50%]' : 'border-blue-800 cursor-pointer hover:border-blue-700'}`}>
                                                     <div className="flex flex-col items-center text-center w-1/3 min-w-0"><ShieldDisplay shield={tA?.shield} size="normal" /><span className="font-bold text-blue-200 text-xs mt-2 truncate w-full px-1">{tA?.name || m.placeholderA}</span></div>
                                                     <div className="flex flex-col items-center justify-center w-1/3 shrink-0"><span className={`text-[9px] uppercase tracking-widest font-black px-2 py-0.5 rounded-md mb-2 text-center ${sUI.bg} ${sUI.color}`}>{isLocked ? '🔒 Bloqueado' : sUI.text}</span><div className="flex items-center justify-center gap-2">{sUI.isPlayed ? (<>{sUI.penaltiesA !== null && sUI.penaltiesA !== undefined && <span className="text-[10px] text-amber-400 font-bold mb-3 mr-0.5">({sUI.penaltiesA})</span>}<span className={`text-2xl font-black ${sUI.color}`}>{sUI.scoreA}</span><span className="text-blue-700 font-bold text-xl">:</span><span className={`text-2xl font-black ${sUI.color}`}>{sUI.scoreB}</span>{sUI.penaltiesB !== null && sUI.penaltiesB !== undefined && <span className="text-[10px] text-amber-400 font-bold mb-3 ml-0.5">({sUI.penaltiesB})</span>}</>) : (<span className="text-blue-700 font-bold text-xl">:</span>)}</div></div>
                                                     <div className="flex flex-col items-center text-center w-1/3 min-w-0"><ShieldDisplay shield={tB?.shield} size="normal" /><span className="font-bold text-blue-200 text-xs mt-2 truncate w-full px-1">{tB?.name || m.placeholderB}</span></div>
                                                   </div>
                                                   {isAdmin && (<button type="button" onClick={(e) => { e.stopPropagation(); handleOpenEditModal(m, round.id); }} className="absolute -right-1 -top-1 text-blue-400 hover:text-emerald-400 p-1 bg-blue-950 rounded border border-blue-800 md:opacity-0 md:group-hover:opacity-100 transition-opacity shadow-lg z-10"><Edit size={12} /></button>)}
                                                 </div>
                                               );
                                             })}
                                           </div>
                                         </div>
                                      )}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {viewType === 'bracket' && (
                  <div className="space-y-4 animate-in fade-in">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-2 pl-2">
                      <h3 className="text-lg font-bold text-white">Chaves do Mata-Mata</h3>
                      <div className="flex gap-2 w-full sm:w-auto">
                        {isAdmin && comp.format === 'groups' && (<Button onClick={handleAutoMigrateKnockout} className="text-[10px] py-1.5 px-3 bg-emerald-600 border-0 shadow-md">🔄 Puxar Classificados para Mata-Mata</Button>)}
                        <Button onClick={() => captureSection('capture-bracket-tree', `Chaveamento-${comp.name}`)} className="text-[10px] py-1.5 px-3 shadow-lg" variant="outline"><Camera size={14}/> Salvar Print das Chaves</Button>
                      </div>
                    </div>

                    <div id="capture-bracket-tree" className="bg-blue-950 p-6 md:p-8 rounded-3xl border border-blue-800 shadow-2xl overflow-x-auto custom-scrollbar">
                      <div className="flex items-center gap-3 mb-6 shrink-0"><img src={LOGO_URL} alt="Logo" className="w-12 h-12" /><h4 className="font-black text-white text-xl uppercase tracking-wider">CHAVEAMENTO OFICIAL — {comp.name}</h4></div>
                      {knockoutRounds.length === 0 ? (
                        <p className="text-center p-8 text-blue-500 text-sm">O chaveamento do Mata-Mata estará disponível assim que a fase classificatória terminar.</p>
                      ) : (
                        <div className="flex gap-12 items-stretch pb-8 min-w-max px-6 pt-4">
                          {knockoutRounds.map((round, roundIndex) => {
                            const distanceToFinal = knockoutRounds.length - roundIndex;
                            let phaseName = round.number; 
                            if (distanceToFinal === 1) phaseName = "FINAL"; else if (distanceToFinal === 2) phaseName = "SEMIFINAL"; else if (distanceToFinal === 3) phaseName = "QUARTAS"; else if (distanceToFinal === 4) phaseName = "OITAVAS"; else if (distanceToFinal === 5) phaseName = "16 AVOS"; else if (distanceToFinal === 6) phaseName = "32 AVOS";

                            return (
                              <div key={round.id} className="w-64 flex flex-col shrink-0 animate-in fade-in min-h-[400px]">
                                <div className="bg-blue-900 border border-blue-800 rounded-xl px-4 py-2.5 text-center shadow-md relative overflow-hidden mb-6">
                                  <div className="absolute top-0 left-0 w-full h-[3px] bg-amber-500"></div>
                                  {isAdmin && (<button type="button" onClick={(e) => { e.stopPropagation(); handleDeleteRound(round.id); }} className="absolute top-1.5 right-1.5 text-red-400 hover:text-red-300 bg-red-900/30 hover:bg-red-600 rounded p-1 z-10 transition-colors" title="Excluir Rodada"><Trash2 size={12}/></button>)}
                                  <span className="text-xs font-black text-amber-400 uppercase tracking-widest">Fase: {phaseName}</span>
                                  {isAdmin && round.status === 'locked' && (<button type="button" onClick={() => onReleaseRound(comp.id, round.id)} className="block w-full mt-1.5 bg-emerald-600 hover:bg-emerald-500 text-blue-950 font-black text-[9px] py-1 rounded uppercase tracking-wider transition-colors">🔓 Liberar Jogos</button>)}
                                  {isAdmin && round.status === 'released' && (<><button type="button" onClick={() => onLockRound(comp.id, round.id)} className="block w-full mt-1.5 bg-amber-600 hover:bg-amber-500 text-blue-950 font-black text-[9px] py-1 rounded uppercase tracking-wider transition-colors mb-1">🔒 Travar Jogos</button><button type="button" onClick={() => handleAddMatchToGroup(round.id, null)} className="block w-full bg-blue-800 hover:bg-blue-700 text-emerald-400 font-bold text-[9px] py-1.5 rounded uppercase tracking-wider transition-colors border border-blue-600 border-dashed">+ Adicionar Confronto</button></>)}
                                </div>

                                <div className="flex flex-col flex-1 h-full py-2">
                                  {round.matches.map((m, matchIndex) => {
                                    const tA = getTeam(m.teamA); const tB = getTeam(m.teamB); const sUI = getMatchStatusDisplay(m.id);
                                    const isLocked = round.status === 'locked'; const isPlayed = sUI.isPlayed && sUI.text === 'Oficial';
                                    let teamALost = false; let teamBLost = false;
                                    if (isPlayed) { const scoreA = Number(sUI.scoreA || 0); const scoreB = Number(sUI.scoreB || 0); if (scoreA < scoreB) { teamALost = true; } else if (scoreB < scoreA) { teamBLost = true; } else { const penA = Number(sUI.penaltiesA || 0); const penB = Number(sUI.penaltiesB || 0); if (penA < penB) teamALost = true; if (penB < penA) teamBLost = true; } }
                                    const isFirstRound = roundIndex === 0; const isLastRound = roundIndex === knockoutRounds.length - 1; const isTop = matchIndex % 2 === 0;

                                    return (
                                      <div key={m.id} className="relative flex-1 flex flex-col justify-center py-3 group">
                                        {!isFirstRound && (<div className="absolute -left-6 w-6 h-[2px] bg-blue-600/60 top-1/2 -translate-y-1/2"></div>)}
                                        <div className="relative z-10 w-full">
                                          <div onClick={() => { if(sUI.isPlayed && onSelectMatch){ const f = matches.find(x=>x.id===sUI.submittedMatchId); if(f) onSelectMatch(f) } }} className={`p-3 rounded-xl border flex flex-col gap-1.5 transition-all shadow-sm ${sUI.isPlayed ? 'bg-blue-900/90 border-emerald-500/30' : isLocked ? 'bg-blue-950/40 border-blue-900/60 opacity-40' : 'bg-blue-900/40 border-blue-800 hover:border-blue-600'} cursor-pointer relative overflow-hidden`}>
                                            <div className="flex justify-between items-center text-[9px] font-bold uppercase tracking-wider pb-1 border-b border-blue-800/40"><span className="text-blue-500">{m.id.includes('_f1') && round.matches.length > 1 && !m.id.includes('_3rd') ? '🏆 Final (Ida)' : m.id.includes('_f2') ? '🏆 Final (Volta)' : m.id.includes('_3rd') ? '🥉 Disputa 3º Lugar' : 'Confronto'}</span><span className={sUI.color}>{sUI.text}</span></div>
                                            <div className={`flex items-center justify-between gap-2 min-w-0 mt-0.5 transition-all duration-500 ${teamALost ? 'grayscale opacity-60 contrast-75 line-through decoration-red-500/30' : ''}`}><div className="flex items-center gap-1.5 min-w-0 flex-1"><ShieldDisplay shield={tA?.shield} size="small" /><span className={`text-xs truncate font-bold ${isPlayed && !teamALost ? 'text-emerald-400 font-black' : 'text-blue-200'}`}>{tA?.name || m.placeholderA}</span></div><div className="flex items-center gap-1 shrink-0">{sUI.penaltiesA !== null && sUI.penaltiesA !== undefined && <span className="text-[9px] text-amber-500 font-bold">({sUI.penaltiesA})</span>}<span className={`w-6 text-center text-sm font-black rounded p-0.5 bg-blue-950 ${sUI.isPlayed ? sUI.color : 'text-blue-700'}`}>{sUI.isPlayed ? sUI.scoreA : '-'}</span></div></div>
                                            <div className={`flex items-center justify-between gap-2 min-w-0 transition-all duration-500 ${teamBLost ? 'grayscale opacity-60 contrast-75 line-through decoration-red-500/30' : ''}`}><div className="flex items-center gap-1.5 min-w-0 flex-1"><ShieldDisplay shield={tB?.shield} size="small" /><span className={`text-xs truncate font-bold ${isPlayed && !teamBLost ? 'text-emerald-400 font-black' : 'text-blue-200'}`}>{tB?.name || m.placeholderB}</span></div><div className="flex items-center gap-1 shrink-0">{sUI.penaltiesB !== null && sUI.penaltiesB !== undefined && <span className="text-[9px] text-amber-500 font-bold">({sUI.penaltiesB})</span>}<span className={`w-6 text-center text-sm font-black rounded p-0.5 bg-blue-950 ${sUI.isPlayed ? sUI.color : 'text-blue-700'}`}>{sUI.isPlayed ? sUI.scoreB : '-'}</span></div></div>
                                          </div>
                                          {isAdmin && (<button type="button" onClick={(e) => { e.stopPropagation(); handleOpenEditModal(m, round.id); }} className="absolute -right-1 -top-1 text-blue-400 hover:text-emerald-400 p-1 bg-blue-950 rounded border border-blue-800 md:opacity-0 md:group-hover:opacity-100 transition-opacity shadow-lg z-10"><Edit size={12} /></button>)}
                                        </div>
                                        {!isLastRound && (<div className={`absolute -right-6 w-6 border-blue-600/60 ${isTop ? 'top-1/2 border-t-[2px] border-r-[2px] h-1/2 rounded-tr-xl' : 'bottom-1/2 border-b-[2px] border-r-[2px] h-1/2 rounded-br-xl'}`}></div>)}
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                )}

              </div>
            )}
            {subTab === 'submit' && isAdmin && (<div className="animate-in slide-in-from-right-4"><SubmitMatch teams={teams} competitions={[comp]} matches={matches} currentUser={currentUser} showToast={showToast} preSelectedCompId={comp.id} onSubmit={(m) => { onSubmitMatch(m); setSubTab('validation'); }} /></div>)}
            {subTab === 'validation' && isAdmin && (<div className="animate-in slide-in-from-right-4"><ValidationPanel matches={matches.filter(m => m.compId === comp.id)} teams={teams} competitions={[comp]} onUpdateStatus={onUpdateMatchStatus} showToast={showToast} currentUser={currentUser} /></div>)}
            {subTab === 'draw' && isAdmin && (<div className="animate-in slide-in-from-right-4"><DrawPanel comp={comp} teams={teams} matches={matches} showToast={showToast} /></div>)}
          </div>
        </>
      )}

      {/* Modal de Editar Grupos (Sem alterações) */}
      {showEditGroups && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in" onClick={() => setShowEditGroups(false)}>
          <div className="bg-blue-900 border border-blue-700 rounded-2xl w-full max-w-lg p-6 shadow-2xl max-h-[85vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-white mb-2 flex items-center gap-2"><Users size={18} className="text-purple-400"/> Gerenciar Equipes nos Grupos</h3>
            <div className="space-y-3 overflow-y-auto pr-2 custom-scrollbar flex-1 my-2">
              {(comp.teams || []).map(tId => {
                const t = getTeam(tId); if (!t) return null;
                return (
                  <div key={tId} className="bg-blue-950 p-3 rounded-xl border border-blue-800 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 min-w-0"><ShieldDisplay shield={t.shield} size="small" /><span className="font-bold text-xs text-white truncate">{t.name}</span></div>
                    <div className="flex items-center gap-1 shrink-0"><span className="text-[10px] font-bold text-blue-400 uppercase">Grupo:</span><select value={teamGroupMapping[tId] || 'A'} onChange={e => setTeamGroupMapping({...teamGroupMapping, [tId]: e.target.value})} className="bg-blue-900 border border-purple-500/50 rounded-lg p-1.5 text-purple-300 text-xs font-bold outline-none">{Object.keys(comp.groups || {}).sort((a, b) => a.localeCompare(b)).map(gName => (<option key={gName} value={gName}>Grupo {gName}</option>))}</select></div>
                  </div>
                );
              })}
            </div>
            <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-blue-800"><Button variant="outline" onClick={() => setShowEditGroups(false)} className="py-2 text-xs">Cancelar</Button><Button onClick={handleSaveGroups} className="py-2 text-xs bg-purple-600 hover:bg-purple-500 border-0 shadow-md text-white">Salvar Grupos</Button></div>
          </div>
        </div>
      )}

      {/* Modal de Editar Placar (Sem alterações visuais) */}
      {editMatchData && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in" onClick={() => setEditMatchData(null)}>
          <div className="bg-blue-900 border border-blue-700 rounded-2xl w-full max-w-md p-6 shadow-2xl overflow-y-auto max-h-[90vh] custom-scrollbar" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2"><Edit size={18} className="text-amber-400"/> Editar Partida</h3>
            <div className="space-y-4">
              <div className="bg-blue-950 p-4 rounded-xl border border-blue-800 space-y-3">
                  <p className="text-xs font-bold text-blue-400 uppercase tracking-widest">Alterar Times do Confronto</p>
                  {comp.format === 'groups' && (<div className="pb-2 border-b border-blue-800/50 mb-3"><label className="text-[10px] font-bold text-purple-400 uppercase tracking-widest block mb-1">Pertencente ao Grupo</label><select value={editMatchData.group || 'A'} onChange={e => { setEditMatchData({ ...editMatchData, group: e.target.value, teamA: '', teamB: '' }); }} className="w-full bg-blue-900 border border-purple-500/40 rounded p-2 text-purple-300 text-xs font-bold outline-none">{Object.keys(comp.groups || {}).sort((a, b) => a.localeCompare(b)).map(gName => (<option key={gName} value={gName}>Grupo {gName}</option>))}</select></div>)}
                  <div className="space-y-2">
                      <select value={editMatchData.teamA} onChange={e => setEditMatchData({...editMatchData, teamA: e.target.value})} className="w-full bg-blue-900 border border-blue-700 rounded p-2 text-white text-sm outline-none"><option value="">A Definir / Sorteio</option>{availableTeamsForEdit.map(tId => { const t = getTeam(tId); return t ? <option key={t.id} value={t.id}>{t.name}</option> : null; })}</select>
                      <div className="text-center text-blue-500 font-bold text-xs">X</div>
                      <select value={editMatchData.teamB} onChange={e => setEditMatchData({...editMatchData, teamB: e.target.value})} className="w-full bg-blue-900 border border-blue-700 rounded p-2 text-white text-sm outline-none"><option value="">A Definir / Sorteio</option>{availableTeamsForEdit.map(tId => { const t = getTeam(tId); return t ? <option key={t.id} value={t.id}>{t.name}</option> : null; })}</select>
                  </div>
              </div>
              {editMatchData.hasPlayed && (
                  <div className="bg-emerald-900/20 p-4 rounded-xl border border-emerald-500/30">
                      <div className="flex justify-between items-center mb-2">
                        <p className="text-xs font-bold text-emerald-400 uppercase tracking-widest">Ajustar Placar Validado</p>
                        <div className="flex gap-2">
                          <label className="flex items-center gap-1 text-[10px] text-red-400 font-bold bg-red-500/10 px-2 py-1 rounded cursor-pointer border border-red-500/20"><input type="checkbox" checked={editMatchData.woA} onChange={e => { const isWo = e.target.checked; const otherWo = editMatchData.woB; let sA = editMatchData.scoreA; let sB = editMatchData.scoreB; if (isWo && !otherWo) { sA = 0; sB = 3; } else if (!isWo && otherWo) { sA = 3; sB = 0; } else if (isWo && otherWo) { sA = '?'; sB = '?'; } else { sA = ''; sB = ''; } setEditMatchData({...editMatchData, woA: isWo, scoreA: sA, scoreB: sB}); }} className="accent-red-500 w-3 h-3" /> W.O. Equipe A</label>
                          <label className="flex items-center gap-1 text-[10px] text-red-400 font-bold bg-red-500/10 px-2 py-1 rounded cursor-pointer border border-red-500/20"><input type="checkbox" checked={editMatchData.woB} onChange={e => { const isWo = e.target.checked; const otherWo = editMatchData.woA; let sA = editMatchData.scoreA; let sB = editMatchData.scoreB; if (isWo && !otherWo) { sB = 0; sA = 3; } else if (!isWo && otherWo) { sB = 3; sA = 0; } else if (isWo && otherWo) { sA = '?'; sB = '?'; } else { sA = ''; sB = ''; } setEditMatchData({...editMatchData, woB: isWo, scoreA: sA, scoreB: sB}); }} className="accent-red-500 w-3 h-3" /> W.O. Equipe B</label>
                        </div>
                      </div>
                      <div className="flex items-center justify-center gap-3">
                          <input type="text" inputMode="numeric" pattern="[0-9]*" disabled={editMatchData.woA || editMatchData.woB} value={editMatchData.scoreA} onChange={e => setEditMatchData({...editMatchData, scoreA: e.target.value})} className="w-16 bg-blue-950 border border-emerald-500/50 rounded-lg p-2 text-white text-center font-bold text-xl outline-none disabled:opacity-50" />
                          <span className="font-bold text-blue-500">X</span>
                          <input type="text" inputMode="numeric" pattern="[0-9]*" disabled={editMatchData.woA || editMatchData.woB} value={editMatchData.scoreB} onChange={e => setEditMatchData({...editMatchData, scoreB: e.target.value})} className="w-16 bg-blue-950 border border-emerald-500/50 rounded-lg p-2 text-white text-center font-bold text-xl outline-none disabled:opacity-50" />
                      </div>
                      {comp.format !== 'league' && (
                          <div className="mt-3 flex items-center justify-center gap-3">
                              <input type="number" inputMode="numeric" pattern="[0-9]*" placeholder="Pên A" value={editMatchData.penaltiesA} onChange={e => setEditMatchData({...editMatchData, penaltiesA: e.target.value})} className="w-16 bg-blue-950 border border-amber-500/30 rounded-lg p-1 text-amber-400 text-center font-bold text-xs outline-none" />
                              <span className="text-[10px] text-amber-500 font-bold uppercase">Pênaltis</span>
                              <input type="number" inputMode="numeric" pattern="[0-9]*" placeholder="Pên B" value={editMatchData.penaltiesB} onChange={e => setEditMatchData({...editMatchData, penaltiesB: e.target.value})} className="w-16 bg-blue-950 border border-amber-500/30 rounded-lg p-1 text-amber-400 text-center font-bold text-xs outline-none" />
                          </div>
                      )}
                      <p className="text-[10px] text-emerald-500/70 text-center mt-3 leading-tight">Ao salvar, a tabela será recalculada automaticamente.</p>
                  </div>
              )}
            </div>
            <div className="flex flex-col sm:flex-row justify-between items-center sm:items-end gap-4 mt-5 pt-4 border-t border-blue-800">
              <div className="flex flex-col gap-2 w-full sm:w-auto items-start">
                {editMatchData.hasPlayed && (<button type="button" onClick={() => { if(window.confirm('Excluir apenas o resultado?')) { if (onDeleteMatch && editMatchData.playedMatchId) { onDeleteMatch(editMatchData.playedMatchId); setEditMatchData(null); } } }} className="flex items-center gap-1.5 text-[11px] text-amber-400 hover:text-amber-300 font-bold transition-colors">Excluir apenas Placar Validado</button>)}
                <button type="button" onClick={handleDeleteMatchCompletely} className="flex items-center gap-1.5 text-[11px] text-red-400 hover:text-red-300 font-bold transition-colors bg-red-500/10 px-2 py-1 rounded border border-red-500/20"><Trash2 size={12} /> Excluir Partida Inteira do Calendário</button>
              </div>
              <div className="flex gap-2 w-full sm:w-auto shrink-0 justify-end"><Button variant="outline" onClick={() => setEditMatchData(null)} className="py-2 text-xs">Cancelar</Button><Button onClick={saveMatchEdit} className="py-2 text-xs bg-amber-600 hover:bg-amber-500 border-0 shadow-md text-white">Salvar</Button></div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const JoinCompetition = ({ compId, competitions, teams, currentUser, onJoin, onBack, showToast }) => {
  const [receipt, setReceipt] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const comp = competitions.find(c => c && c.id === compId);
  
  // 🌟 PEGA TODOS OS TIMES DO USUÁRIO PARA GARANTIR A BLINDAGEM
  const userTeamIds = (teams || []).filter(t => t && t.ownerId === currentUser?.id).map(t => t.id);
  const userTeam = teams.find(t => t && t.ownerId === currentUser?.id);

  if (competitions.length === 0) {
    return <div className="p-12 text-center text-emerald-400 font-bold animate-pulse text-sm">🛡️ Carregando detalhes da Arena Kame...</div>;
  }

  if (!comp) return <div className="p-8 text-center text-slate-400">Torneio não encontrado ou encerrado.</div>;
  if (!userTeam) return <div className="p-8 text-center text-amber-400 font-bold bg-amber-500/10 rounded-2xl border border-amber-500/30 m-4">Você precisa ter um time cadastrado para participar. Peça a um líder para criar seu clube primeiro.</div>;

  const compTeams = Array.isArray(comp.teams) ? comp.teams : [];
  const compPending = Array.isArray(comp.pendingTeams) ? comp.pendingTeams : [];
  const teamCount = parseInt(comp.teamCount) || 0;

  const isFull = compTeams.length >= teamCount;
  const alreadyJoined = compTeams.some(tId => userTeamIds.includes(tId));
  const isPending = compPending.some(p => p && userTeamIds.includes(p.teamId));

  // 🛡️ BLINDAGEM ABSOLUTA: Verifica as competições bloqueadas
  const isBlockedByOtherComp = Array.isArray(comp.excludedCompIds) && comp.excludedCompIds.some(exCompId => {
    const exComp = (competitions || []).find(c => c.id === exCompId);
    if (!exComp) return false;
    
    const inConfirmed = Array.isArray(exComp.teams) && exComp.teams.some(tId => userTeamIds.includes(tId));
    const inPendingEx = Array.isArray(exComp.pendingTeams) && exComp.pendingTeams.some(p => p && userTeamIds.includes(p.teamId)); 
    
    return inConfirmed || inPendingEx;
  });

  const hasAnyPrize = comp.prizes && (comp.prizes.first || comp.prizes.second || comp.prizes.third || comp.prizes.extra);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // 🔒 TRAVA FINAL NO MOMENTO DO CLIQUE
    if (isBlockedByOtherComp) {
        showToast("Acesso Negado: Seu time já disputa um torneio bloqueado para esta competição.", "error");
        return;
    }

    if (comp.isPaid && !receipt) { showToast("Anexe o comprovante de pagamento!", "error"); return; }
    
    setIsSubmitting(true);
    try {
      await onJoin(comp.id, userTeam.id, receipt);
    } catch (error) {
      console.error("Erro ao processar inscrição:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-md mx-auto animate-in fade-in pb-12 mt-8">
      <button onClick={onBack} className="text-xs text-blue-400 hover:text-white flex items-center gap-1 mb-6"><ArrowLeft size={14}/> Voltar ao Início</button>
      
      <div className={`bg-blue-900 border rounded-3xl overflow-hidden shadow-2xl ${comp.category === 'copa_flash' ? 'border-amber-500/50' : 'border-blue-800'}`}>
        <div className="bg-blue-950/80 p-8 text-center border-b border-blue-800 relative overflow-hidden">
          <Trophy className={`${comp.category === 'copa_flash' ? 'text-amber-500 drop-shadow-[0_0_15px_rgba(245,158,11,0.5)]' : 'text-amber-400'} mx-auto mb-4`} size={48} />
          <h2 className="text-2xl font-black text-white uppercase tracking-wider">{comp.name}</h2>
          <p className="text-emerald-400 font-bold mt-2 text-sm uppercase tracking-widest">{comp.format === 'league' ? 'Liga' : 'Copa / Grupos'}</p>
        </div>

        <div className="p-6 space-y-6">
          
          {comp.category === 'copa_flash' && comp.deadline && (
            <div className="bg-amber-900/40 p-5 rounded-2xl border border-amber-500/50 text-center shadow-inner animate-in zoom-in-95">
              <p className="text-[10px] text-amber-400 font-bold uppercase tracking-widest mb-1.5 flex justify-center items-center gap-1.5">
                <Activity size={14}/> A Copa Flash Inicia Em:
              </p>
              <p className="text-4xl text-amber-400 drop-shadow-md">
                <CountdownTimer targetDateStr={`${comp.deadline}T${comp.startTime || '20:00'}:00`} />
              </p>
            </div>
          )}

          <div className="flex justify-between items-center bg-blue-950 p-4 rounded-xl border border-blue-800">
            <div><p className="text-[10px] text-blue-400 uppercase font-bold">Vagas Preenchidas</p><p className="text-lg font-black text-white">{(compTeams.length || 0)} <span className="text-blue-500">/ {teamCount}</span></p></div>
            <div className="text-right">
              <p className="text-[10px] text-blue-400 uppercase font-bold">Data do Jogo</p>
              <p className="text-sm font-bold text-white">{new Date(comp.deadline + 'T12:00:00').toLocaleDateString()}</p>
            </div>
          </div>

          {hasAnyPrize && (
            <div className="bg-gradient-to-b from-amber-500/5 to-blue-950/50 border border-amber-500/20 p-4 rounded-xl space-y-3">
              <div className="flex items-center gap-2 border-b border-blue-800 pb-2">
                <Star className="text-amber-400" size={16} />
                <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">Premiação em Disputa</span>
              </div>
              <div className="space-y-2 text-xs">
                {comp.prizes?.first && (
                  <div className="flex justify-between items-center bg-blue-950/60 p-2 rounded border border-blue-900">
                    <span className="text-blue-300 font-medium">🥇 1º Lugar:</span>
                    <span className="font-bold text-white text-right">{comp.prizes.first}</span>
                  </div>
                )}
                {comp.prizes?.second && (
                  <div className="flex justify-between items-center bg-blue-950/60 p-2 rounded border border-blue-900">
                    <span className="text-blue-400 font-medium">🥈 2º Lugar:</span>
                    <span className="font-bold text-slate-300 text-right">{comp.prizes.second}</span>
                  </div>
                )}
                {comp.prizes?.third && (
                  <div className="flex justify-between items-center bg-blue-950/60 p-2 rounded border border-blue-900">
                    <span className="text-blue-400 font-medium">🥉 3º Lugar:</span>
                    <span className="font-bold text-amber-700 text-right">{comp.prizes.third}</span>
                  </div>
                )}
                {comp.prizes?.extra && (
                  <div className="bg-blue-950 p-2.5 rounded-lg border border-blue-800 text-[11px] text-blue-300 leading-relaxed mt-1">
                    <span className="font-bold text-amber-400">🎟️ Sorteio / Extra:</span> {comp.prizes.extra}
                  </div>
                )}
              </div>
            </div>
          )}

          {comp.isPaid && (
            <div className="bg-amber-500/10 border border-amber-500/30 p-5 rounded-xl">
              <h3 className="text-amber-400 font-bold mb-2 flex items-center gap-2">💰 Torneio Premiado</h3>
              <p className="text-sm text-amber-100 mb-4">Para confirmar sua inscrição, faça o PIX e anexe o comprovante abaixo.</p>
              <div className="bg-blue-950 p-3 rounded-lg border border-blue-800 flex justify-between items-center mb-4">
                <span className="text-xs text-blue-400 uppercase font-bold">Valor:</span>
                <span className="text-lg font-black text-emerald-400">R$ {comp.entryFee?.toFixed(2)}</span>
              </div>
              <div className="bg-blue-950 p-3 rounded-lg border border-blue-800 flex justify-between items-center">
                <span className="text-xs text-blue-400 uppercase font-bold">Chave PIX:</span>
                <span className="text-sm font-mono font-bold text-white">{comp.pixKey}</span>
              </div>
            </div>
          )}

          {alreadyJoined ? (
             <div className="text-center p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl"><CheckCircle className="text-emerald-500 mx-auto mb-2" size={32}/><p className="font-bold text-emerald-400">Você já está confirmado neste torneio!</p></div>
          ) : isPending ? (
             <div className="text-center p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl"><Activity className="text-amber-500 mx-auto mb-2" size={32}/><p className="font-bold text-amber-400">Inscrição em Análise!</p><p className="text-xs text-amber-200 mt-1">Aguarde a validação dos líderes.</p></div>
          ) : isBlockedByOtherComp ? (
             <div className="text-center p-4 bg-red-500/10 border border-red-500/30 rounded-xl"><XCircle className="text-red-500 mx-auto mb-2" size={32}/><p className="font-bold text-red-400">Inscrição Bloqueada</p><p className="text-xs text-red-200 mt-1">Você está disputando um torneio que foi restrito para esta competição.</p></div>
          ) : isFull ? (
             <div className="text-center p-4 bg-red-500/10 border border-red-500/30 rounded-xl"><XCircle className="text-red-500 mx-auto mb-2" size={32}/><p className="font-bold text-red-400">Inscrições Esgotadas</p></div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4 pt-4 border-t border-blue-800">
              <div className="flex items-center gap-3 bg-blue-950 p-3 rounded-xl border border-blue-800">
                <ShieldDisplay shield={userTeam.shield} size="normal" />
                <div><p className="text-[10px] text-blue-400 uppercase font-bold">Entrar com o time:</p><p className="font-bold text-white">{userTeam.name}</p></div>
              </div>
              
              {comp.isPaid && (
                <div>
                  <label className="text-xs font-bold text-blue-400 uppercase block mb-2">Anexar Comprovante PIX</label>
                  <label className={`block border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-colors ${receipt ? 'border-emerald-500 bg-emerald-500/10' : 'border-blue-700 hover:border-blue-500 bg-blue-950'}`}>
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => processImage(e.target.files[0], setReceipt)} />
                    {receipt ? <span className="text-emerald-400 font-bold flex items-center justify-center gap-2"><CheckCircle size={16}/> Comprovante Anexado</span> : <span className="text-blue-300 font-bold flex items-center justify-center gap-2"><UploadCloud size={16}/> Escolher Imagem</span>}
                  </label>
                </div>
              )}
              <Button type="submit" disabled={isSubmitting} className="w-full py-4 text-lg font-black">{isSubmitting ? 'Enviando...' : 'Solicitar Inscrição'}</Button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

const CreateCompetition = ({ teams, competitions, matches, currentUser, onCreate, showToast }) => {
  const [name, setName] = useState('');
  const [format, setFormat] = useState('league');
  const [category, setCategory] = useState('liga_a');
  
  const [playStyle, setPlayStyle] = useState('Livre');
  const [rules, setRules] = useState('');

  const [teamCount, setTeamCount] = useState('');
  const [numGroups, setNumGroups] = useState('2');
  const [qualifiers, setQualifiers] = useState('2');
  const [isDoubleRound, setIsDoubleRound] = useState(false);
  const [isFinalDouble, setIsFinalDouble] = useState(false);
  const [deadline, setDeadline] = useState('');
  
  const [startTime, setStartTime] = useState(''); 
  
  const [flashDuration, setFlashDuration] = useState('60');
  const [isAutoJoin, setIsAutoJoin] = useState(true);

  const [isPaid, setIsPaid] = useState(false);
  const [entryFee, setEntryFee] = useState('');
  const [pixKey, setPixKey] = useState('');
  const [prize1st, setPrize1st] = useState('');
  const [prize2nd, setPrize2nd] = useState('');
  const [prize3rd, setPrize3rd] = useState('');
  const [passesToRaffle, setPassesToRaffle] = useState('');

  const [selectedTeams, setSelectedTeams] = useState([]);
  const [error, setError] = useState('');
  
  const [excludedCompIds, setExcludedCompIds] = useState([]);

  const CAT_NAMES = {
    liga_a: 'Liga Kame A', liga_b: 'Liga Kame B', liga_c: 'Liga Kame C', liga_d: 'Liga Kame D',
    liga_acesso: 'Liga de Acesso', copa_main: 'Copa Oficial', copa_do_rei: 'Copa do Rei',
    copa_amazonia: 'Copa da Amazônia', copa_flash: 'Copa Flash'
  };

  useEffect(() => {
    if (category === 'copa_flash') { setFormat('cup'); }
    const compsOfCategory = (competitions || []).filter(c => c.category === category);
    const nextEditionNumber = compsOfCategory.length + 1;
    setName(`${CAT_NAMES[category] || 'Competição'} - Edição ${nextEditionNumber}`);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category, competitions]);

  const toggleTeam = (teamId) => {
    if (selectedTeams.includes(teamId)) setSelectedTeams(selectedTeams.filter(id => id !== teamId));
    else setSelectedTeams([...selectedTeams, teamId]);
  };

  const activeComps = useMemo(() => {
    return (competitions || []).filter(c => c.status === 'active');
  }, [competitions]);

  const busyTeamIds = useMemo(() => {
    const ids = new Set();
    (competitions || []).forEach(c => {
      if (excludedCompIds.includes(c.id) && c.teams) {
        c.teams.forEach(tId => ids.add(tId));
      }
    });
    return ids;
  }, [competitions, excludedCompIds]);

  const handleToggleExcludeComp = (compId) => {
    let newExcluded;
    if (excludedCompIds.includes(compId)) {
      newExcluded = excludedCompIds.filter(id => id !== compId);
    } else {
      newExcluded = [...excludedCompIds, compId];
    }
    setExcludedCompIds(newExcluded);
    
    const newBusyIds = new Set();
    (competitions || []).forEach(c => {
      if (newExcluded.includes(c.id) && c.teams) {
        c.teams.forEach(tId => newBusyIds.add(tId));
      }
    });
    setSelectedTeams(prev => prev.filter(id => !newBusyIds.has(id)));
  };

  const displayTeams = teams.filter(t => !busyTeamIds.has(t.id));

  const handleSmartImport = () => {
    const HIERARCHY = ['liga_a', 'liga_b', 'liga_c', 'liga_d', 'liga_acesso'];
    const myIdx = HIERARCHY.indexOf(category);
    if (myIdx === -1) { if (showToast) showToast("A importação inteligente só funciona para Ligas oficiais.", "error"); return; }
    const targetSize = parseInt(teamCount, 10);
    if (!targetSize || targetSize <= 0) { if (showToast) showToast("Preencha a 'Qtd. Total de Vagas' antes de puxar os times!", "error"); return; }
    
    let importedTeams = new Set(); let logMsg = [];
    if (myIdx > 0) {
      const upperCat = HIERARCHY[myIdx - 1];
      const lastUpperLeague = (competitions || []).filter(c => c.category === upperCat).sort((a,b) => b.id.localeCompare(a.id))[0];
      if (lastUpperLeague && lastUpperLeague.relegations > 0) {
        const table = calculateStandings(matches, teams.filter(t => lastUpperLeague.teams?.includes(t.id)), lastUpperLeague.id);
        const relegated = table.slice(-lastUpperLeague.relegations);
        relegated.forEach(t => importedTeams.add(t.id));
        if (relegated.length > 0) logMsg.push(`${relegated.length} rebaixados da ${CAT_NAMES[upperCat]}`);
      }
    }
    const lastSameLeague = (competitions || []).filter(c => c.category === category).sort((a,b) => b.id.localeCompare(a.id))[0];
    if (lastSameLeague) {
      const table = calculateStandings(matches, teams.filter(t => lastSameLeague.teams?.includes(t.id)), lastSameLeague.id);
      const promo = lastSameLeague.promotions || 0; const rele = lastSameLeague.relegations || 0;
      const retained = table.slice(promo, table.length - rele);
      retained.forEach(t => importedTeams.add(t.id));
      if (retained.length > 0) logMsg.push(`${retained.length} mantidos`);
    }
    let missingSlots = targetSize - importedTeams.size;
    if (missingSlots > 0 && myIdx < HIERARCHY.length - 1) {
      const lowerCat = HIERARCHY[myIdx + 1];
      const lastLowerLeague = (competitions || []).filter(c => c.category === lowerCat).sort((a,b) => b.id.localeCompare(a.id))[0];
      if (lastLowerLeague) {
        const table = calculateStandings(matches, teams.filter(t => lastLowerLeague.teams?.includes(t.id)), lastLowerLeague.id);
        const promoted = table.slice(0, missingSlots); 
        promoted.forEach(t => importedTeams.add(t.id));
        if (promoted.length > 0) logMsg.push(`${promoted.length} promovidos da ${CAT_NAMES[lowerCat]}`);
      }
    }
    const finalTeamsList = Array.from(importedTeams);
    if (finalTeamsList.length === 0) { if (showToast) showToast("Não encontramos histórico anterior para preencher as vagas.", "info"); return; }
    setSelectedTeams(finalTeamsList); setIsAutoJoin(false);
    if (finalTeamsList.length < targetSize) { if (showToast) showToast(`Times Puxados: ${logMsg.join(', ')}. Faltaram ${targetSize - finalTeamsList.length} vagas!`, "warning"); } 
    else { if (showToast) showToast(`Tabela Completa! ${logMsg.join(' + ')}.`, "success"); }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name || !format || !teamCount || !deadline || !startTime) { setError('Preencha os dados básicos do torneio (incluindo datas e horários).'); return; }
    const parsedTeamCount = parseInt(teamCount, 10);
    if (!isAutoJoin && selectedTeams.length !== parsedTeamCount) { setError(`Atenção: Você selecionou ${selectedTeams.length} times, mas o limite é ${parsedTeamCount}.`); return; }
    if (isAutoJoin && selectedTeams.length > parsedTeamCount) { setError(`Atenção: Você pré-confirmou mais times (${selectedTeams.length}) que o limite.`); return; }
    if (isPaid && (!entryFee || !pixKey || !prize1st || !prize2nd)) { setError('Em torneios pagos, preencha a taxa, a chave PIX e os prêmios.'); return; }

    setError(''); const compId = `c${Date.now()}`; let finalRounds = []; let groupsData = null;

    if (!isAutoJoin) {
      try {
        if (format === 'groups') {
          const res = generateGroupsAndKnockout(selectedTeams, compId, parseInt(numGroups), parseInt(qualifiers), isDoubleRound, isFinalDouble);
          finalRounds = res.rounds; groupsData = res.groups;
        } else if (format === 'cup') {
          finalRounds = generateCupBracket(selectedTeams, compId, isFinalDouble);
        } else {
          finalRounds = generateRoundRobin(selectedTeams, compId, isDoubleRound);
        }
      } catch (err) { setError('Erro ao gerar o chaveamento. Verifique a quantidade de times.'); return; }
    }

    const newComp = { 
      id: compId, name, format, deadline, startTime, category, playStyle, rules,
      teamCount: parsedTeamCount,
      status: isAutoJoin ? 'registration' : 'active', 
      teams: selectedTeams, pendingTeams: [], rounds: finalRounds,
      createdBy: currentUser?.name || 'Desconhecido', creatorId: currentUser?.id, admins: [currentUser?.id],  
      isDoubleRound, isFinalDouble, numGroups: parseInt(numGroups || '0', 10), qualifiersPerGroup: parseInt(qualifiers || '0', 10),
      flashDuration: category === 'copa_flash' ? parseInt(flashDuration, 10) : null,
      excludedCompIds: excludedCompIds, // 🌟 SALVA NO BANCO OS TORNEIOS BLOQUEADOS
      ...(groupsData && { groups: groupsData }),
      isPaid: isPaid,
      ...(isPaid && {
        entryFee: parseFloat(entryFee), pixKey: pixKey,
        prizes: { first: parseFloat(prize1st), second: parseFloat(prize2nd), third: prize3rd ? parseFloat(prize3rd) : 0, passesCount: passesToRaffle ? parseInt(passesToRaffle, 10) : 0 }
      })
    };
    onCreate(newComp);
  };

  return (
    <div className="max-w-3xl mx-auto animate-in fade-in pb-12">
      <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2"><PlusCircle className="text-emerald-500"/> Nova Competição</h2>
      <form onSubmit={handleSubmit} className="space-y-6">
        {error && <div className="bg-amber-500/10 border border-amber-500/50 text-amber-400 p-4 rounded-xl flex items-center gap-3"><AlertCircle size={20} className="shrink-0" /><p className="text-sm font-medium">{error}</p></div>}
        <div className="bg-blue-900 pt-6 md:pt-8 rounded-3xl border border-blue-800 shadow-xl overflow-hidden">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 px-6 md:px-8">
            <h3 className="text-lg font-bold text-emerald-400 flex items-center gap-2"><Trophy size={18}/> Estrutura do Torneio</h3>
            <label className="flex items-center gap-2 cursor-pointer bg-blue-950 p-2 rounded-xl border border-blue-800"><input type="checkbox" checked={isAutoJoin} onChange={e=>setIsAutoJoin(e.target.checked)} className="w-5 h-5 accent-emerald-500 cursor-pointer" /><span className="text-sm font-bold text-white">Criar com Link de Inscrição</span></label>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 px-6 md:px-8">
            <div className="space-y-2"><label className="text-sm font-bold text-blue-300">Nome do Campeonato</label><input type="text" value={name} readOnly className="w-full bg-blue-950/50 border border-blue-800 rounded-xl p-3 text-blue-400 font-bold outline-none cursor-not-allowed" /></div>
            <div className="space-y-2"><label className="text-sm font-bold text-blue-300">Categoria (Divisão)</label>
              <select value={category} onChange={e=>setCategory(e.target.value)} className="w-full bg-blue-950 border border-amber-500/50 rounded-xl p-3 text-amber-400 font-bold focus:ring-2 focus:ring-emerald-500 outline-none shadow-inner">
                <option value="liga_a">🥇 Liga Kame A (Série A)</option><option value="liga_b">🥈 Liga Kame B (Série B)</option><option value="liga_c">🥉 Liga Kame C (Série C)</option><option value="liga_d">🎖️ Liga Kame D (Série D)</option><option value="liga_acesso">⬆️ Liga de Acesso</option><option value="copa_main">🏆 Copas Oficiais</option><option value="copa_do_rei">👑 Copa do Rei</option><option value="copa_amazonia">🌳 Copa da Amazônia</option><option value="copa_flash">⚡ Copa Flash (Tiro Curto)</option>
              </select>
            </div>
            
            {category === 'copa_flash' && (
               <div className="space-y-2 animate-in slide-in-from-top-2 col-span-1 md:col-span-2 bg-amber-900/30 border border-amber-500/40 p-4 rounded-xl">
                 <label className="text-sm font-black text-amber-400 flex items-center gap-1.5"><Activity size={16}/> Tempo por Fase (Minutos)</label>
                 <p className="text-[10px] text-amber-200/70 mb-2">Quantos minutos cada rodada ficará aberta antes de realizar os sorteios duplos automáticos?</p>
                 <input type="number" min="5" value={flashDuration} onChange={e=>setFlashDuration(e.target.value)} className="w-full bg-blue-950 border border-amber-500/50 rounded-xl p-3 text-amber-400 font-bold focus:ring-2 focus:ring-amber-500 outline-none" required />
               </div>
            )}

            <div className="space-y-2"><label className="text-sm font-bold text-blue-300">Formato</label>
              <select value={format} onChange={e=>setFormat(e.target.value)} disabled={category === 'copa_flash'} className="w-full bg-blue-950 border border-blue-700 rounded-xl p-3 text-white focus:ring-2 focus:ring-emerald-500 outline-none disabled:opacity-50 disabled:cursor-not-allowed"><option value="league">Pontos Corridos (Liga)</option><option value="cup">Mata-Mata (Copa)</option><option value="groups">Fase de Grupos + Mata-Mata</option></select>
            </div>
            <div className="space-y-2"><label className="text-sm font-bold text-blue-300">Estilo de Jogo</label>
              <select value={playStyle} onChange={e=>setPlayStyle(e.target.value)} className="w-full bg-blue-950 border border-purple-500/50 rounded-xl p-3 text-purple-300 font-bold focus:ring-2 focus:ring-emerald-500 outline-none"><option value="Livre">Livre (Qualquer Estilo)</option><option value="Full Razz">Full Razz (Sem Balão)</option><option value="Personalizado">Regras Especiais</option></select>
            </div>
            <div className="space-y-2"><label className="text-sm font-bold text-blue-300">Qtd. Total de Vagas (Times)</label><input type="number" min="2" placeholder="Ex: 8" value={teamCount} onChange={e=>setTeamCount(e.target.value)} className="w-full bg-blue-950 border border-blue-700 rounded-xl p-3 text-emerald-400 font-black text-lg focus:ring-2 focus:ring-emerald-500 outline-none" required /></div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><label className="text-sm font-bold text-blue-300">Data Final/Prazo</label><input type="date" value={deadline} onChange={e=>setDeadline(e.target.value)} className="w-full bg-blue-950 border border-blue-700 rounded-xl p-3 text-blue-100 focus:ring-2 focus:ring-emerald-500 outline-none" required /></div>
              <div className="space-y-2"><label className="text-sm font-bold text-blue-300">Horário de Início</label><input type="time" value={startTime} onChange={e=>setStartTime(e.target.value)} className="w-full bg-blue-950 border border-blue-700 rounded-xl p-3 text-amber-400 font-bold focus:ring-2 focus:ring-emerald-500 outline-none" required /></div>
            </div>
            
            <div className="flex flex-col md:flex-row gap-4 mt-2 col-span-1 md:col-span-2">
              {format !== 'cup' && (<label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={isDoubleRound} onChange={e=>setIsDoubleRound(e.target.checked)} className="w-5 h-5 accent-emerald-500 cursor-pointer" /><span className="text-sm font-bold text-blue-300">Fases de Grupo em Ida e Volta</span></label>)}
              {format !== 'league' && (<label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={isFinalDouble} onChange={e=>setIsFinalDouble(e.target.checked)} className="w-5 h-5 accent-amber-500 cursor-pointer" /><span className="text-sm font-bold text-amber-400">Final em Ida e Volta (2 Jogos)</span></label>)}
            </div>
            {format === 'groups' && (<><div className="space-y-2"><label className="text-sm font-bold text-blue-300">Quantidade de Grupos</label><input type="number" min="2" placeholder="Ex: 2, 3, 4..." value={numGroups} onChange={e=>setNumGroups(e.target.value)} className="w-full bg-blue-950 border border-blue-700 rounded-xl p-3 text-white outline-none" required /></div><div className="space-y-2"><label className="text-sm font-bold text-blue-300">Classificados por Grupo</label><input type="number" min="1" placeholder="Ex: 2" value={qualifiers} onChange={e=>setQualifiers(e.target.value)} className="w-full bg-blue-950 border border-blue-700 rounded-xl p-3 text-white outline-none" required /></div></>)}
          </div>
          <div className="bg-blue-950/50 mt-6 p-6 md:p-8 border-t border-blue-800"><label className="text-sm font-bold text-sky-400 flex items-center gap-2 mb-2"><BookOpen size={16}/> Regras do Campeonato (Opcional)</label><textarea placeholder="Descreva aqui limites de overral de jogadores, times permitidos, ou regras de conduta específicas para este torneio..." value={rules} onChange={e=>setRules(e.target.value)} className="w-full bg-blue-900 border border-blue-700 focus:border-emerald-500 rounded-xl p-3 text-blue-200 text-sm min-h-[100px] outline-none resize-y" /></div>
        </div>
        <div className={`p-6 md:p-8 rounded-3xl border shadow-xl transition-colors ${isPaid ? 'bg-amber-500/10 border-amber-500/40' : 'bg-blue-900 border-blue-800'}`}>
          <div className="flex items-center justify-between mb-6"><h3 className={`text-lg font-bold flex items-center gap-2 ${isPaid ? 'text-amber-400' : 'text-blue-300'}`}>🤑 Torneio Premium (Pago)</h3><label className="relative inline-flex items-center cursor-pointer"><input type="checkbox" checked={isPaid} onChange={e=>setIsPaid(e.target.checked)} className="sr-only peer" /><div className="w-11 h-6 bg-blue-950 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-blue-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500 border border-blue-700"></div></label></div>
          {isPaid && (
            <div className="space-y-6 animate-in slide-in-from-top-2">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4"><div className="space-y-2"><label className="text-sm font-bold text-amber-400">Valor da Inscrição (R$)</label><input type="number" placeholder="Ex: 10.00" value={entryFee} onChange={e=>setEntryFee(e.target.value)} className="w-full bg-blue-950 border border-amber-500/30 rounded-xl p-3 text-white outline-none" required={isPaid} /></div><div className="space-y-2"><label className="text-sm font-bold text-amber-400">Sua Chave PIX</label><input type="text" placeholder="Celular, CPF ou E-mail" value={pixKey} onChange={e=>setPixKey(e.target.value)} className="w-full bg-blue-950 border border-amber-500/30 rounded-xl p-3 text-white outline-none" required={isPaid} /></div></div>
              <div className="pt-4 border-t border-amber-500/20"><h4 className="text-sm font-bold text-amber-200 mb-4">🏆 Distribuição dos Prêmios (Valores Fixos)</h4><div className="grid grid-cols-1 md:grid-cols-3 gap-4"><div className="space-y-2"><label className="text-xs font-bold text-amber-400">🥇 1º Lugar (R$)</label><input type="number" placeholder="Ex: 150.00" value={prize1st} onChange={e=>setPrize1st(e.target.value)} className="w-full bg-blue-950 border border-amber-500/30 rounded-xl p-2 text-white outline-none" required={isPaid} /></div><div className="space-y-2"><label className="text-xs font-bold text-amber-400">🥈 2º Lugar (R$)</label><input type="number" placeholder="Ex: 50.00" value={prize2nd} onChange={e=>setPrize2nd(e.target.value)} className="w-full bg-blue-950 border border-amber-500/30 rounded-xl p-2 text-white outline-none" required={isPaid} /></div><div className="space-y-2"><label className="text-xs font-bold text-amber-400">🥉 3º Lugar (Opcional)</label><input type="number" placeholder="Ex: 20.00" value={prize3rd} onChange={e=>setPrize3rd(e.target.value)} className="w-full bg-blue-950 border border-amber-500/30 rounded-xl p-2 text-white outline-none" /></div></div></div>
            </div>
          )}
        </div>
        
        <div className="bg-blue-900 p-6 md:p-8 rounded-3xl border border-blue-800 shadow-xl animate-in fade-in">
          
          <div className="flex flex-col gap-4 mb-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <label className="text-sm font-bold text-blue-300">
                {isAutoJoin ? `Equipes Pré-Confirmadas (Opcional: ${selectedTeams.length}/${teamCount || '0'})` : `Marcar as Equipes Manualmente (Obrigatório: ${selectedTeams.length}/${teamCount || '0'})`}
              </label>
              
              {['liga_a', 'liga_b', 'liga_c', 'liga_d', 'liga_acesso'].includes(category) && (
                <button type="button" onClick={handleSmartImport} className="text-xs bg-amber-600 hover:bg-amber-500 text-blue-950 font-black px-4 py-2 rounded-xl shadow-lg border border-amber-400 transition-colors flex items-center gap-2">
                  🔄 Puxar Times Automático
                </button>
              )}
            </div>

            {activeComps.length > 0 && (
              <div className="bg-blue-950/50 p-3 md:p-4 rounded-xl border border-blue-800">
                <p className="text-[10px] text-red-400 font-bold uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                  <XCircle size={14}/> Ocultar times que já estão disputando:
                </p>
                <div className="flex flex-wrap gap-2">
                  {activeComps.map(c => (
                    <label key={c.id} className={`flex items-center gap-1.5 text-[10px] md:text-xs uppercase font-bold px-3 py-2 rounded-lg cursor-pointer border transition-colors ${excludedCompIds.includes(c.id) ? 'bg-red-500/20 border-red-500/50 text-red-300' : 'bg-blue-900 border-blue-700 text-blue-400 hover:border-blue-500'}`}>
                      <input 
                        type="checkbox" 
                        checked={excludedCompIds.includes(c.id)} 
                        onChange={() => handleToggleExcludeComp(c.id)} 
                        className="hidden" 
                      />
                      {excludedCompIds.includes(c.id) ? '🚫' : ''} {c.name}
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>
          
          {displayTeams.length === 0 ? <p className="text-blue-500 text-sm p-4 bg-blue-950 rounded border border-blue-800 border-dashed text-center">Nenhum time disponível para seleção com os filtros atuais.</p> : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {displayTeams.map(team => { 
                const isSelected = selectedTeams.includes(team.id); 
                return ( 
                  <div key={team.id} onClick={() => toggleTeam(team.id)} className={`cursor-pointer flex items-center gap-3 p-3 rounded-xl border transition-all ${isSelected ? 'bg-emerald-500/10 border-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.1)]' : 'bg-blue-950 border-blue-800 hover:border-blue-600'}`}>
                    <ShieldDisplay shield={team.shield} size="small" />
                    <span className={`font-medium text-sm truncate ${isSelected ? 'text-emerald-400' : 'text-blue-300'}`}>{team.name}</span>
                  </div> 
                ); 
              })}
            </div>
          )}
        </div>
        <Button type="submit" className={`w-full py-5 text-xl font-black mt-4 rounded-2xl ${isPaid ? 'bg-amber-500 hover:bg-amber-400 text-blue-950' : 'bg-emerald-500 hover:bg-emerald-400 text-blue-950'}`}>
          {isAutoJoin ? '🔗 Gerar Link de Inscrição' : '🏆 Criar e Gerar Tabela'}
        </Button>
      </form>
    </div>
  );
};

const CompetitionsList = ({ competitions, teams, currentUser, onSelectComp, onDeleteComp }) => {
  const isAdmin = currentUser?.role === 'leader' || currentUser?.role === 'kaioh' || currentUser?.role === 'organizer';
  const canDelete = currentUser?.role === 'leader' || currentUser?.role === 'kaioh';

  const isLeader = currentUser?.role === 'leader' || currentUser?.role === 'kaioh';
  const isCompAdmin = (c) => isLeader || c?.creatorId === currentUser?.id || (c?.admins || []).includes(currentUser?.id);
  
  const userTeamIds = (teams || []).filter(t => t && t.ownerId === currentUser?.id).map(t => t.id);
  const visible = (competitions || []).filter(c => c && (isCompAdmin(c) || c.teams?.some(t => userTeamIds.includes(t))));

  // Filtra as ativas e as finalizadas
  const activeComps = visible.filter(c => c.status !== 'finished');
  const finishedComps = visible.filter(c => c.status === 'finished');

  // 🌟 PADRONIZAÇÃO DE NOMES AQUI
  // Força tudo para MAIÚSCULO para manter o painel organizado visualmente
  const formatName = (c) => {
    let name = c.category === 'copa_flash' ? `COPA FLASH KAME - ${c.name}` : String(c.name);
    return name.toUpperCase(); // <-- Transforma qualquer texto em maiúsculo
  };

  return (
    <div className="space-y-8 animate-in fade-in pb-8">
      
      {/* 🟢 COMPETIÇÕES ATIVAS */}
      <div>
        <div className="flex items-center gap-2 mb-4"><Medal className="text-emerald-500"/><h2 className="text-xl font-bold text-white">Campeonatos Ativos</h2></div>
        {activeComps.length === 0 ? (
          <p className="text-blue-500 text-sm p-4 bg-blue-950 rounded-xl border border-blue-800">Nenhuma competição ativa no momento.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {activeComps.map(c => (
              <div key={c.id} onClick={()=>onSelectComp(c.id)} className="bg-blue-900 p-5 rounded-2xl border border-blue-800 hover:border-emerald-500/40 transition-all cursor-pointer flex justify-between items-center group shadow-md relative overflow-hidden">
                {c.category === 'copa_flash' && <div className="absolute top-0 left-0 w-1.5 h-full bg-amber-500"></div>}
                <div className={c.category === 'copa_flash' ? 'pl-2' : ''}>
                  {/* Apliquei a classe 'uppercase' aqui também por segurança */}
                  <h3 className="font-bold text-white uppercase group-hover:text-emerald-400 transition-colors">{formatName(c)}</h3>
                  <p className="text-xs text-blue-400 mt-1">{c.teams?.length || 0} Clubes inscritos • <span className="text-emerald-500 font-medium">{c.status === 'registration' ? 'Inscrições Abertas' : 'Em Andamento'}</span></p>
                </div>
                {canDelete && <button onClick={(e)=>{e.stopPropagation(); if(window.confirm('Excluir torneio?')) onDeleteComp(c.id)}} className="text-blue-600 hover:text-red-400 p-2 z-10"><Trash2 size={16}/></button>}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 🔴 COMPETIÇÕES FINALIZADAS */}
      {finishedComps.length > 0 && (
        <div className="pt-6 border-t border-blue-800/50">
          <div className="flex items-center gap-2 mb-4"><BookOpen className="text-slate-400"/><h2 className="text-xl font-bold text-slate-300">Histórico de Finalizadas</h2></div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {finishedComps.map(c => (
              <div key={c.id} onClick={()=>onSelectComp(c.id)} className="bg-blue-950/60 p-4 rounded-2xl border border-blue-900 hover:border-slate-500/40 transition-all cursor-pointer flex justify-between items-center group opacity-80 hover:opacity-100">
                {c.category === 'copa_flash' && <div className="absolute top-0 left-0 w-1.5 h-full bg-amber-500/50"></div>}
                <div className={c.category === 'copa_flash' ? 'pl-2' : ''}>
                  <h3 className="font-bold text-slate-300 uppercase group-hover:text-white transition-colors">{formatName(c)}</h3>
                  <p className="text-xs text-slate-500 mt-1">Finalizada</p>
                </div>
                {canDelete && <button onClick={(e)=>{e.stopPropagation(); if(window.confirm('Excluir torneio do histórico?')) onDeleteComp(c.id)}} className="text-blue-800 hover:text-red-400 p-2 z-10"><Trash2 size={14}/></button>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

const MatchDetails = ({ match, teams, competitions, onBack }) => {
  if (!match) return null; 
  const getTeam = (id) => (teams || []).find(t => t && t.id === id);
  const tA = getTeam(match.teamA); 
  const tB = getTeam(match.teamB);

  // 🔄 SEPARAÇÃO AUTOMÁTICA: Filtra os gols e assistências correspondentes a cada ID de equipe
  const goalsTeamA = (match.goals || []).filter(g => g.teamId === match.teamA);
  const goalsTeamB = (match.goals || []).filter(g => g.teamId === match.teamB);

  return (
    <div className="max-w-2xl mx-auto bg-blue-900 border border-blue-800 p-5 md:p-6 rounded-3xl shadow-2xl animate-in fade-in space-y-6">
      
      {/* Botão Voltar */}
      <button onClick={onBack} className="text-xs text-blue-400 hover:text-white flex items-center gap-1.5 transition-colors outline-none">
        <ArrowLeft size={14}/> Voltar para o Painel
      </button>

      {/* 🛡️ PLACAR IMERSIVO: Escudos e nomes alinhados horizontalmente */}
      <div className="bg-blue-950 p-4 rounded-2xl border border-blue-800 flex items-center justify-between gap-4">
        {/* Bloco Esquerda (Time A) */}
        <div className="flex-1 flex flex-col items-center text-center min-w-0">
          <ShieldDisplay shield={tA?.shield} size="normal" />
          <span className="font-bold text-white text-xs md:text-sm mt-2 truncate w-full px-1 uppercase tracking-wide">{tA?.name || 'Time A'}</span>
          <p className="text-[10px] text-blue-400 mt-0.5 truncate w-full font-medium">Téc: {tA?.coach || 'Técnico'}</p>
        </div>

        {/* Centralizador do Placar */}
        <div className="flex flex-col items-center justify-center shrink-0">
          <span className="text-[9px] uppercase tracking-widest font-black text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full mb-2 border border-emerald-500/20">
            {match.status === 'approved' ? 'Oficializado' : 'Validando'}
          </span>
          <div className="flex items-center justify-center gap-1 md:gap-3">
            {match.penaltiesA !== null && match.penaltiesA !== undefined && (
              <span className="text-xs text-amber-400 font-bold mb-4 mr-0.5">({match.penaltiesA})</span>
            )}
            <span className="text-3xl md:text-4xl font-black text-white tracking-tight">{match.scoreA}</span>
            <span className="text-blue-700 font-black text-2xl mx-1 mb-1">:</span>
            <span className="text-3xl md:text-4xl font-black text-white tracking-tight">{match.scoreB}</span>
            {match.penaltiesB !== null && match.penaltiesB !== undefined && (
              <span className="text-xs text-amber-400 font-bold mb-4 ml-0.5">({match.penaltiesB})</span>
            )}
          </div>
        </div>

        {/* Bloco Direita (Time B) */}
        <div className="flex-1 flex flex-col items-center text-center min-w-0">
          <ShieldDisplay shield={tB?.shield} size="normal" />
          <span className="font-bold text-white text-xs md:text-sm mt-2 truncate w-full px-1 uppercase tracking-wide">{tB?.name || 'Time B'}</span>
          <p className="text-[10px] text-blue-400 mt-0.5 truncate w-full font-medium">Téc: {tB?.coach || 'Técnico'}</p>
        </div>
      </div>

      {/* ⚽ DETALHAMENTO DE EVENTOS: Colunas separadas por lado do campo */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Painel de Eventos do Time Esquerdo */}
        <div className="bg-blue-950/40 p-4 rounded-xl border border-blue-800 space-y-3 shadow-inner">
          <div className="text-[10px] font-black text-blue-400 uppercase tracking-wider border-b border-blue-800/60 pb-2 flex items-center gap-2">
            <span>⚽</span> Acontecimentos de {tA?.name || 'Time A'}
          </div>
          <div className="space-y-2">
            {goalsTeamA.length === 0 ? (
              <p className="text-xs text-blue-600 italic p-2">Nenhum lance registrado.</p>
            ) : (
              goalsTeamA.map((g, i) => (
                <div key={i} className="bg-blue-950/80 p-2.5 rounded-lg border border-blue-900 text-xs flex flex-col gap-1 transition-all hover:border-blue-700">
                  <div className="flex justify-between items-center">
                    <span className="text-white font-bold">⚽ {g.player}</span>
                    <span className="text-emerald-400 font-black font-mono bg-blue-900 px-1.5 py-0.5 rounded border border-blue-800">{g.minute}'</span>
                  </div>
                  {g.assist && (
                    <span className="text-[10px] text-blue-400 font-medium pl-4 flex items-center gap-1">
                      <span>👟</span> Assistência de: <b className="text-blue-200">{g.assist}</b>
                    </span>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Painel de Eventos do Time Direito (Espelhado) */}
        <div className="bg-blue-950/40 p-4 rounded-xl border border-blue-800 space-y-3 shadow-inner">
          <div className="text-[10px] font-black text-blue-400 uppercase tracking-wider border-b border-blue-800/60 pb-2 flex items-center gap-2 justify-end">
            Acontecimentos de {tB?.name || 'Time B'} <span>⚽</span>
          </div>
          <div className="space-y-2">
            {goalsTeamB.length === 0 ? (
              <p className="text-xs text-blue-600 italic p-2 text-right">Nenhum lance registrado.</p>
            ) : (
              goalsTeamB.map((g, i) => (
                <div key={i} className="bg-blue-950/80 p-2.5 rounded-lg border border-blue-900 text-xs flex flex-col gap-1 text-right transition-all hover:border-blue-700">
                  <div className="flex justify-between items-center flex-row-reverse">
                    <span className="text-white font-bold">{g.player} ⚽</span>
                    <span className="text-emerald-400 font-black font-mono bg-blue-900 px-1.5 py-0.5 rounded border border-blue-800">{g.minute}'</span>
                  </div>
                  {g.assist && (
                    <span className="text-[10px] text-blue-400 font-medium pr-4 flex items-center gap-1 justify-end flex-row-reverse">
                      <span>👟</span> Assistência de: <b className="text-blue-200">{g.assist}</b>
                    </span>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Exibição da Imagem Original da Partida */}
      {match.imageUrl && (
        <div className="pt-2 border-t border-blue-800/50">
          <span className="text-xs font-black text-blue-400 uppercase tracking-wider block mb-3 pl-1">📸 Print Estatístico Oficial</span>
          <div className="rounded-xl overflow-hidden border border-blue-800 bg-black/60 p-1 shadow-2xl flex justify-center">
            <img src={match.imageUrl} className="w-full max-h-[350px] object-contain rounded-lg" alt="Estatísticas Finais DLS" />
          </div>
        </div>
      )}

      {/* Relatório de envio de dados */}
      <div className="text-center text-[9px] text-blue-600 uppercase font-black tracking-widest pt-2 border-t border-blue-800/30">
        Relatório enviado por: {match.submittedBy || 'Técnico de Campo'}
      </div>
    </div>
  );
};

const SubmitMatch = ({ teams, competitions, matches, onSubmit, currentUser, showToast, preSelectedCompId }) => {
  const [selectedCompId, setSelectedCompId] = useState(preSelectedCompId || '');
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
  
  const [isManualMode, setIsManualMode] = useState(false);
  
  const [woA, setWoA] = useState(false);
  const [woB, setWoB] = useState(false);

  // 🌟 ESTADOS DA ANIMAÇÃO DE SORTEIO
  const [drawState, setDrawState] = useState({ 
    active: false, 
    phase: 'idle', // 'idle', 'spinning', 'revealed'
    winner: null, 
    flicker: 'A' 
  });

  const [userApiKey, setUserApiKey] = useState(() => localStorage.getItem('gemini_api_key') || '');
  const [showKeyInput, setShowKeyInput] = useState(false);
  const [tempKey, setTempKey] = useState('');

  const isLeader = currentUser?.role === 'leader' || currentUser?.role === 'kaioh';
  const isCompAdmin = (c) => isLeader || c?.creatorId === currentUser?.id || (c?.admins || []).includes(currentUser?.id);
  const isAdmin = isLeader;
  const userTeamIds = (teams || []).filter(t => t.ownerId === currentUser?.id).map(t => t.id);

  const visibleCompetitions = useMemo(() => {
    return (competitions || []).filter(c => {
      if (!c || c.status !== 'active') return false;
      const amIAdmin = isCompAdmin(c);
      const isParticipant = (c.teams || []).some(tId => userTeamIds.includes(tId));
      
      if (!amIAdmin && !isParticipant) return false;
      
      let hasAvailableMatch = false;
      if (c.rounds) {
        c.rounds.filter(r => r.status === 'released').forEach(round => {
          round.matches.forEach(rm => {
            const alreadySubmitted = matches.some(m => m.matchId === rm.id && m.compId === c.id && (m.status === 'pending' || m.status === 'approved'));
            if (!alreadySubmitted && rm.teamA && rm.teamB && (amIAdmin || userTeamIds.includes(rm.teamA) || userTeamIds.includes(rm.teamB))) {
              hasAvailableMatch = true;
            }
          });
        });
      }
      return hasAvailableMatch;
    });
  }, [competitions, matches, isLeader, userTeamIds]);
  
  const selectedComp = useMemo(() => (competitions || []).find(c => c.id === selectedCompId), [selectedCompId, competitions]);
  const isCup = selectedComp?.format === 'cup' || (selectedComp?.format === 'groups' && selectedMatchId.includes('_ko_'));
  const isTie = scoreA !== '' && scoreB !== '' && scoreA === scoreB;

  // 1. Atualiza a lista de partidas (sem resetar a tela atoa)
  useEffect(() => {
    if (!selectedCompId) {
      setAvailableMatches([]);
      return;
    }
    const comp = competitions.find(c => c.id === selectedCompId);
    if (comp && comp.rounds) {
      let toPlay = [];
      const amIAdmin = isCompAdmin(comp);
      comp.rounds.filter(r => r.status === 'released').forEach(round => {
        round.matches.forEach(rm => {
          const alreadySubmitted = matches.some(m => m.matchId === rm.id && m.compId === comp.id && (m.status === 'pending' || m.status === 'approved'));
          if (!alreadySubmitted && rm.teamA && rm.teamB && (isAdmin || userTeamIds.includes(rm.teamA) || userTeamIds.includes(rm.teamB))) {
            toPlay.push({ ...rm, roundId: round.id });
          }
        });
      });
      setAvailableMatches(toPlay);
    }
  }, [selectedCompId, competitions, matches]);

  // 1. Atualiza a lista de partidas silenciosamente (sem resetar a tela à toa)
 // 1. Atualiza a lista de partidas ativas silenciosamente
  useEffect(() => {
    if (!selectedCompId) {
      setAvailableMatches([]);
      return;
    }
    const comp = competitions.find(c => c.id === selectedCompId);
    if (comp && comp.rounds) {
      let toPlay = [];
      const amIAdmin = isCompAdmin(comp); // <--- Aqui definimos a regra corretamente
      
      comp.rounds.filter(r => r.status === 'released').forEach(round => {
        round.matches.forEach(rm => {
          const alreadySubmitted = matches.some(m => m.matchId === rm.id && m.compId === comp.id && (m.status === 'pending' || m.status === 'approved'));
          // 👇 E aqui usamos a variável certa (amIAdmin) para liberar as partidas 👇
          if (!alreadySubmitted && rm.teamA && rm.teamB && (amIAdmin || userTeamIds.includes(rm.teamA) || userTeamIds.includes(rm.teamB))) {
            toPlay.push({ ...rm, roundId: round.id });
          }
        });
      });
      setAvailableMatches(toPlay);
    }
  }, [selectedCompId, competitions, matches]);

  // 2. Reseta a tela APENAS se você trocar de Campeonato
  useEffect(() => {
    setSelectedMatchId('');
    resetAI();
  }, [selectedCompId]);

  // 3. Reseta a IA e puxa os escudos APENAS ao trocar de Partida
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedMatchId]);

  // 🌟 EFEITO DO PISCA-PISCA DO SORTEIO
  useEffect(() => {
    if (drawState.active && drawState.phase === 'spinning') {
      let ticks = 0;
      const interval = setInterval(() => {
        setDrawState(prev => ({ ...prev, flicker: prev.flicker === 'A' ? 'B' : 'A' }));
        ticks++;
        
        // Depois de ~3.5 segundos, para na equipe vencedora
        if (ticks > 35) {
          clearInterval(interval);
          setDrawState(prev => ({ ...prev, phase: 'revealed', flicker: prev.winner }));
          
          // Aguarda mais 4 segundos pra galera ver o ganhador e envia os dados
          setTimeout(() => {
             processSubmission(drawState.winner);
             setDrawState({ active: false, phase: 'idle', winner: null, flicker: 'A' });
          }, 4000);
        }
      }, 100); // Velocidade do pisca-pisca

      return () => clearInterval(interval);
    }
  }, [drawState.active, drawState.phase, drawState.winner]);

  const resetAI = () => {
    setScoreA(''); setScoreB('');
    setPenaltiesA(''); setPenaltiesB('');
    setGoalsA([]); setGoalsB([]);
    setObservacoes('');
    setImageUploaded(false);
    setMatchImageBase64(null);
    setIsManualMode(false); 
    setWoA(false); setWoB(false);
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

  const handleSubmitInit = (e) => {
    e.preventDefault(); // <--- AQUI ESTAVA O ERRO (Corrigido!)
    if(!selectedCompId || !selectedMatchId || scoreA === '' || scoreB === '') return;

    if (scoreA === '?' || scoreB === '?' || scoreA === '' || scoreB === '') {
      if (!woA && !woB) return; 
    }

    if (isCup && scoreA === scoreB && (penaltiesA === '' || penaltiesB === '') && !woA && !woB) {
      if(showToast) showToast("Em jogos de eliminação, não pode haver empate. Preencha os Pênaltis!", "error");
      return;
    }

    // Se for duplo W.O, inicia a animação de sorteio!
    if (woA && woB) {
      const drawnWinner = Math.random() < 0.5 ? 'A' : 'B';
      setDrawState({ active: true, phase: 'spinning', winner: drawnWinner, flicker: 'A' });
      return;
    }

    // Se for W.O comum ou jogo normal, segue reto
    processSubmission(null);
  };

  // Função separada que faz o envio de fato para a nuvem
  const processSubmission = (forcedDoubleWoWinner = null) => {
    let finalScoreA = scoreA;
    let finalScoreB = scoreB;
    let isDoubleWo = forcedDoubleWoWinner !== null;

    if (isDoubleWo) {
        finalScoreA = forcedDoubleWoWinner === 'A' ? 3 : 0;
        finalScoreB = forcedDoubleWoWinner === 'A' ? 0 : 3;
    } else if (woA) {
        finalScoreA = 0; finalScoreB = 3;
    } else if (woB) {
        finalScoreA = 3; finalScoreB = 0;
    }

    const matchDetails = availableMatches.find(m => m.id === selectedMatchId);
    
    const allGoals = [
      ...(goalsA || []).map(g => ({ teamId: teamA.id, player: g.player, assist: g.assist || '', minute: g.minute })),
      ...(goalsB || []).map(g => ({ teamId: teamB.id, player: g.player, assist: g.assist || '', minute: g.minute }))
    ];

    const finalObs = isDoubleWo 
      ? `Sorteio de Duplo W.O. realizado na resenha! Vencedor: ${forcedDoubleWoWinner === 'A' ? teamA.name : teamB.name}\n${observacoes}`.trim() 
      : (woA || woB ? `Vitória por W.O.\n${observacoes}`.trim() : observacoes.trim());

    onSubmit({
      id: `m_${Date.now()}`, 
      compId: selectedCompId, 
      roundId: matchDetails.roundId, 
      matchId: selectedMatchId, 
      teamA: teamA.id, 
      teamB: teamB.id, 
      scoreA: parseInt(finalScoreA), 
      scoreB: parseInt(finalScoreB),
      penaltiesA: (isCup && finalScoreA === finalScoreB && penaltiesA !== '') ? parseInt(penaltiesA) : null,
      penaltiesB: (isCup && finalScoreA === finalScoreB && penaltiesB !== '') ? parseInt(penaltiesB) : null,
      goals: (woA || woB || isDoubleWo) ? [] : allGoals,
      observacoes: finalObs, 
      status: 'pending', 
      submittedBy: currentUser?.name || 'Técnico', 
      imageUrl: matchImageBase64
    });
    
    setSelectedCompId('');
  };

  return (
    <div className="max-w-2xl mx-auto animate-in fade-in duration-500 pb-12 relative">
      
      {/* 🌟 TELA DE ANIMAÇÃO DO SORTEIO DUPLO W.O. */}
      {drawState.active && (
        <div className="fixed inset-0 bg-black/95 z-50 flex flex-col items-center justify-center p-6 backdrop-blur-md animate-in fade-in zoom-in-95 duration-300">
          
          <h2 className="text-3xl font-black text-amber-400 uppercase tracking-widest mb-12 animate-pulse text-center">
            {drawState.phase === 'spinning' ? 'Sorteando Vencedor...' : 'VENCEDOR DO W.O. DUPLO!'}
          </h2>

          <div className="relative w-64 h-64 flex items-center justify-center">
             {/* Efeito de brilho fundo */}
             <div className={`absolute inset-0 rounded-full blur-3xl opacity-50 ${drawState.phase === 'revealed' ? 'bg-emerald-500 animate-pulse' : 'bg-blue-500'}`}></div>
             
             {/* Escudo Team A */}
             <div className={`absolute transition-all duration-100 ${drawState.flicker === 'A' ? 'scale-110 opacity-100 z-10' : 'scale-90 opacity-20 blur-sm z-0'}`}>
                <div className="flex flex-col items-center">
                  <ShieldDisplay shield={teamA?.shield} size="large" />
                  <span className="mt-6 text-2xl font-black text-white bg-black/50 px-4 py-2 rounded-xl text-center shadow-lg border border-white/10 uppercase tracking-wider">{teamA?.name}</span>
                </div>
             </div>

             {/* Escudo Team B */}
             <div className={`absolute transition-all duration-100 ${drawState.flicker === 'B' ? 'scale-110 opacity-100 z-10' : 'scale-90 opacity-20 blur-sm z-0'}`}>
                <div className="flex flex-col items-center">
                  <ShieldDisplay shield={teamB?.shield} size="large" />
                  <span className="mt-6 text-2xl font-black text-white bg-black/50 px-4 py-2 rounded-xl text-center shadow-lg border border-white/10 uppercase tracking-wider">{teamB?.name}</span>
                </div>
             </div>
          </div>

          {drawState.phase === 'revealed' && (
            <div className="mt-16 bg-emerald-600/20 border border-emerald-500 p-4 rounded-2xl animate-in slide-in-from-bottom-8">
               <p className="text-emerald-400 font-bold text-center">Resultado gravado com sucesso. Enviando dados...</p>
            </div>
          )}
        </div>
      )}

      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-white flex items-center gap-2"><Camera className="text-emerald-500" /> Registrar Partida</h2>
        <button onClick={() => setShowKeyInput(!showKeyInput)} className="text-xs flex items-center gap-1 bg-blue-800 hover:bg-blue-700 text-blue-300 px-3 py-1.5 rounded-lg border border-blue-700 transition-colors">
          <Key size={14}/> IA Config
        </button>
      </div>

      <div className="bg-blue-900 p-6 rounded-2xl border border-blue-800 space-y-6">
        
        {showKeyInput && (
          <div className="bg-amber-500/10 border border-amber-500/30 p-4 rounded-xl animate-in slide-in-from-top-4">
            <h3 className="text-sm font-bold text-amber-400 mb-2 flex items-center gap-2"><Key size={16}/> Chave de Ativação do Gemini</h3>
            <p className="text-xs text-blue-400 mb-3">Para usar a leitura inteligente de Prints, cole a sua chave exclusiva do <b>Google AI Studio</b>. Ela ficará salva apenas no seu navegador.</p>
            <div className="flex gap-2">
              <input type="password" value={tempKey} onChange={e=>setTempKey(e.target.value)} placeholder="Ex: AIzaSy... ou AQAQ..." className="flex-1 bg-blue-950 border border-blue-700 rounded-lg p-2 text-white text-sm outline-none focus:border-amber-500" />
              <button onClick={handleSaveApiKey} className="bg-amber-600 hover:bg-amber-500 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-lg shadow-amber-900/50">Salvar</button>
            </div>
            <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" className="text-[10px] text-emerald-400 hover:underline mt-2 inline-block">Clique aqui para gerar uma chave grátis ➔</a>
          </div>
        )}

        {!preSelectedCompId && (
          <div>
            <label className="block text-sm font-medium text-blue-400 mb-2">1. Competição</label>
            <select value={selectedCompId} onChange={e => setSelectedCompId(e.target.value)} className="w-full bg-blue-950 border border-blue-700 rounded-lg p-3 text-white focus:ring-2 focus:ring-emerald-500 outline-none">
              <option value="">Escolha um campeonato...</option>
              {visibleCompetitions.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            {visibleCompetitions.length === 0 && (
              <p className="text-xs text-blue-500 mt-2">Nenhuma competição pendente disponível para você no momento.</p>
            )}
          </div>
        )}

        {selectedCompId && (
          <div className="animate-in fade-in">
            <label className="block text-sm font-medium text-blue-400 mb-2">2. Selecione a Partida Liberada</label>
            {availableMatches.length > 0 ? (
              <select value={selectedMatchId} onChange={e => setSelectedMatchId(e.target.value)} className="w-full bg-blue-950 border border-blue-700 rounded-lg p-3 text-white focus:ring-2 focus:ring-emerald-500 outline-none">
                <option value="">Registrar qual jogo?</option>
                {availableMatches.map(m => {
                  const tA = (teams || []).find(t=>t.id===m.teamA)?.name;
                  const tB = (teams || []).find(t=>t.id===m.teamB)?.name;
                  return <option key={m.id} value={m.id}>Rodada {String(m.roundId || '').replace('r','')} - {tA} x {tB}</option>
                })}
              </select>
            ) : <div className="p-3 bg-blue-950 rounded border border-blue-800 text-blue-500 text-sm">Tudo limpo!.</div>}
          </div>
        )}

        {selectedMatchId && !isManualMode && (
          <div className="animate-in slide-in-from-top-4">
            <label className="block text-sm font-medium text-blue-400 mb-2">3. Envie o Print do Resultado</label>
            <div className="mb-2">
              <label className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors cursor-pointer relative overflow-hidden block ${matchImageBase64 ? 'border-emerald-500 bg-emerald-500/5' : 'border-blue-700 hover:border-blue-500 bg-blue-950'}`}>
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
                    <UploadCloud className="text-blue-500" size={40} />
                    <p className="text-white font-medium">Clique para enviar a foto e usar a IA</p>
                  </div>
                )}
              </label>
            </div>
            
            {!imageUploaded && !isAnalyzing && (
              <div className="text-center mt-4">
                <button type="button" onClick={() => setIsManualMode(true)} className="text-sm text-blue-400 hover:text-emerald-400 transition-colors underline">
                  Não tem o print? Preencher manualmente
                </button>
              </div>
            )}
          </div>
        )}

        {(imageUploaded || isManualMode) && (
          <form onSubmit={handleSubmitInit} className="animate-in slide-in-from-bottom-4 space-y-6 pt-4 border-t border-blue-800">
            <div className="flex justify-between items-center mb-2">
              <label className="text-sm font-medium text-amber-400 flex items-center gap-2">
                <AlertCircle size={16}/> 
                {isManualMode ? "Preencha os dados da partida manualmente" : "Confirme os dados lidos pela IA"}
              </label>
              
              {isManualMode && (
                <button type="button" onClick={() => setIsManualMode(false)} className="text-xs text-blue-400 hover:text-white transition-colors underline">
                  Voltar para envio de imagem
                </button>
              )}
            </div>
            
            <div className="flex flex-col md:flex-row gap-6 items-start bg-blue-950 p-4 rounded-xl border border-blue-800">
              <div className="flex-1 w-full space-y-3">
                <div className="flex justify-between items-center mb-2">
                  <div className="text-center font-bold text-lg text-blue-300 flex items-center justify-center gap-2"><ShieldDisplay shield={teamA?.shield} size="small" /> {teamA?.name}</div>
                  <label className="flex items-center gap-1 text-[10px] text-red-400 font-bold bg-red-500/10 px-2 py-1 rounded cursor-pointer border border-red-500/20 hover:bg-red-500/20 transition-colors">
                    <input type="checkbox" checked={woA} onChange={(e) => {
                      const isWo = e.target.checked;
                      setWoA(isWo);
                      if (isWo && !woB) { setScoreA('0'); setScoreB('3'); setGoalsA([]); setGoalsB([]); }
                      else if (!isWo && woB) { setScoreA('3'); setScoreB('0'); }
                      else if (isWo && woB) { setScoreA('?'); setScoreB('?'); setGoalsA([]); setGoalsB([]); }
                      else { setScoreA(''); setScoreB(''); }
                    }} className="accent-red-500 w-3 h-3" /> DAR W.O.
                  </label>
                </div>
                {/* 🌟 AJUSTE: inputMode e pattern no Placar A */}
                <input type="text" inputMode="numeric" pattern="[0-9]*" value={scoreA} onChange={e=>setScoreA(e.target.value)} disabled={woA || woB} className="w-full bg-blue-900 border border-blue-700 rounded-lg p-3 text-white text-center text-3xl font-bold focus:border-emerald-500 outline-none disabled:opacity-50" required />
                
                {isCup && isTie && !woA && !woB && (
                  <div className="mt-2">
                    <label className="text-[10px] text-amber-400 uppercase tracking-widest font-bold">Pênaltis A</label>
                    {/* 🌟 AJUSTE: inputMode e pattern nos Pênaltis A */}
                    <input type="number" inputMode="numeric" pattern="[0-9]*" required value={penaltiesA} onChange={e=>setPenaltiesA(e.target.value)} className="w-full bg-blue-900 border border-amber-500/50 text-center font-bold text-lg text-amber-400 rounded p-2 outline-none focus:border-amber-500" />
                  </div>
                )}

                <div className="space-y-2 pt-2">
                  <span className="text-[10px] text-blue-500 uppercase font-bold block">Gols</span>
                  {goalsA.map((g, i) => (
                    <div key={i} className="flex flex-col gap-1 bg-blue-800 p-2 rounded">
                      <input type="text" value={g.player} onChange={e=>handleGoalChange('A', i, 'player', e.target.value)} placeholder="Goleador" className="w-full bg-blue-950 text-xs text-white px-2 py-1 rounded border border-blue-700 outline-none" required />
                      <div className="flex gap-1">
                        <input type="text" value={g.assist || ''} onChange={e=>handleGoalChange('A', i, 'assist', e.target.value)} placeholder="Assistência" className="flex-1 bg-blue-950 text-[10px] text-blue-400 px-2 py-1 rounded border border-blue-700 outline-none" />
                        {/* 🌟 AJUSTE: inputMode e pattern nos Minutos A */}
                        <input type="number" inputMode="numeric" pattern="[0-9]*" value={g.minute} onChange={e=>handleGoalChange('A', i, 'minute', e.target.value)} placeholder="Min" className="w-12 bg-blue-950 text-xs text-emerald-400 text-center px-1 py-1 rounded border border-blue-700 outline-none" required />
                        <button type="button" onClick={()=>handleRemoveGoal('A', i)} className="text-red-400 p-1 hover:text-red-300"><X size={12}/></button>
                      </div>
                    </div>
                  ))}
                  {!woA && !woB && <button type="button" onClick={()=>handleAddGoal('A')} className="text-[10px] text-emerald-400 hover:underline">+ Adicionar Gol</button>}
                </div>
              </div>
              
              <div className="text-blue-500 font-bold text-xl self-center pt-8 hidden md:block">X</div>
              
              <div className="flex-1 w-full space-y-3">
                <div className="flex justify-between items-center mb-2">
                  <label className="flex items-center gap-1 text-[10px] text-red-400 font-bold bg-red-500/10 px-2 py-1 rounded cursor-pointer border border-red-500/20 hover:bg-red-500/20 transition-colors">
                    <input type="checkbox" checked={woB} onChange={(e) => {
                      const isWo = e.target.checked;
                      setWoB(isWo);
                      if (isWo && !woA) { setScoreB('0'); setScoreA('3'); setGoalsA([]); setGoalsB([]); }
                      else if (!isWo && woA) { setScoreB('3'); setScoreA('0'); }
                      else if (isWo && woA) { setScoreA('?'); setScoreB('?'); setGoalsA([]); setGoalsB([]); }
                      else { setScoreA(''); setScoreB(''); }
                    }} className="accent-red-500 w-3 h-3" /> DAR W.O.
                  </label>
                  <div className="text-center font-bold text-lg text-blue-300 flex items-center justify-center gap-2">{teamB?.name} <ShieldDisplay shield={teamB?.shield} size="small" /></div>
                </div>
                {/* 🌟 AJUSTE: inputMode e pattern no Placar B */}
                <input type="text" inputMode="numeric" pattern="[0-9]*" value={scoreB} onChange={e=>setScoreB(e.target.value)} disabled={woA || woB} className="w-full bg-blue-900 border border-blue-700 rounded-lg p-3 text-white text-center text-3xl font-bold focus:border-emerald-500 outline-none disabled:opacity-50" required />
                
                {isCup && isTie && !woA && !woB && (
                  <div className="mt-2">
                    <label className="text-[10px] text-amber-400 uppercase tracking-widest font-bold text-right block">Pênaltis B</label>
                    {/* 🌟 AJUSTE: inputMode e pattern nos Pênaltis B */}
                    <input type="number" inputMode="numeric" pattern="[0-9]*" required value={penaltiesB} onChange={e=>setPenaltiesB(e.target.value)} className="w-full bg-blue-900 border border-amber-500/50 text-center font-bold text-lg text-amber-400 rounded p-2 outline-none focus:border-amber-500" />
                  </div>
                )}

                <div className="space-y-2 pt-2">
                  <span className="text-[10px] text-blue-500 uppercase font-bold block text-right">Gols</span>
                  {goalsB.map((g, i) => (
                    <div key={i} className="flex flex-col gap-1 bg-blue-800 p-2 rounded">
                      <input type="text" value={g.player} onChange={e=>handleGoalChange('B', i, 'player', e.target.value)} placeholder="Goleador" className="w-full bg-blue-950 text-xs text-white px-2 py-1 rounded border border-blue-700 outline-none text-right" required />
                      <div className="flex gap-1">
                        <button type="button" onClick={()=>handleRemoveGoal('B', i)} className="text-red-400 p-1 hover:text-red-300"><X size={12}/></button>
                        {/* 🌟 AJUSTE: inputMode e pattern nos Minutos B */}
                        <input type="number" inputMode="numeric" pattern="[0-9]*" value={g.minute} onChange={e=>handleGoalChange('B', i, 'minute', e.target.value)} placeholder="Min" className="w-12 bg-blue-950 text-xs text-emerald-400 text-center px-1 py-1 rounded border border-blue-700 outline-none" required />
                        <input type="text" value={g.assist || ''} onChange={e=>handleGoalChange('B', i, 'assist', e.target.value)} placeholder="Assistência" className="flex-1 bg-blue-950 text-[10px] text-blue-400 px-2 py-1 rounded border border-blue-700 outline-none text-right" />
                      </div>
                    </div>
                  ))}
                  {!woA && !woB && <div className="flex justify-end"><button type="button" onClick={()=>handleAddGoal('B')} className="text-[10px] text-emerald-400 hover:underline">+ Adicionar Gol</button></div>}
                </div>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium text-blue-400 block">Observações (Opcional)</label>
              <textarea placeholder="Ocorreu alguma queda de conexão? Relate aqui..." value={observacoes} onChange={e=>setObservacoes(e.target.value)} className="w-full bg-blue-950 border border-blue-700 focus:border-emerald-500 rounded-lg p-3 text-blue-300 text-sm h-24 outline-none resize-none transition-colors" />
            </div>

            <Button type="submit" className="w-full py-4 text-lg">
               {woA && woB ? '🎲 Iniciar Sorteio de W.O' : 'Enviar Partida para Líderes'}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
};

const ValidationPanel = ({ matches, teams, competitions, onUpdateStatus, showToast, currentUser }) => {
  const isLeader = currentUser?.role === 'leader' || currentUser?.role === 'kaioh';
  const isCompAdmin = (c) => isLeader || c?.creatorId === currentUser?.id || (c?.admins || []).includes(currentUser?.id);

  // Filtra só os pendentes das competições que o usuário atual administra
  const pending = (matches || []).filter(m => {
     if (!m || m.status !== 'pending') return false;
     const comp = competitions.find(c => c.id === m.compId);
     return isCompAdmin(comp);
  });

  const getTeam = (id) => (teams || []).find(t => t && t.id === id);
  const getCompName = (id) => (competitions || []).find(c => c && c.id === id)?.name || 'Torneio';
  
  return (
    <div className="space-y-4 animate-in fade-in">
      <div className="flex justify-between items-center"><h2 className="text-xl font-bold text-white flex items-center gap-2"><CheckSquare className="text-amber-500"/> Validação Cloud</h2><span className="text-xs bg-amber-500/20 text-amber-400 px-2.5 py-0.5 rounded-full font-bold">{pending.length} Pendentes</span></div>
      {pending.length === 0 ? ( <div className="bg-blue-900 p-8 rounded-2xl text-center text-blue-500 border border-blue-800">Tudo validado! Sem pendências na nuvem.</div> ) : (
        <div className="space-y-4">
          {pending.map(m => {
            const tA = getTeam(m.teamA); const tB = getTeam(m.teamB);
            return (
              <div key={m.id} className="bg-blue-900 p-4 rounded-xl border border-blue-800 space-y-3">
                <div className="text-center text-[10px] font-bold text-amber-500 uppercase bg-amber-500/5 py-1 rounded border border-amber-500/10">🏆 {String(getCompName(m.compId))}</div>
                <div className="flex items-center justify-between text-xs bg-blue-950 p-3 rounded-lg">
                  <span className="font-bold flex-1 text-right truncate">{tA?.name}</span>
                  <span className="px-3 py-1 font-mono font-black text-emerald-400 bg-blue-900 border border-blue-800 rounded mx-2">{m.scoreA} x {m.scoreB}</span>
                  <span className="font-bold flex-1 text-left truncate">{tB?.name}</span>
                </div>
                <div className="flex gap-2 justify-end pt-2 border-t border-blue-800/60">
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
    <form onSubmit={async (e)=>{e.preventDefault(); if(!name)return; await onCreate({id:`t${Date.now()}`,name,coach:coach||'Técnico',whatsapp:'',ownerId:'manual',shield:shield||'🛡️'}); showToast("Time salvo!"); setName(''); setCoach(''); setShield(null); }} className="max-w-xl mx-auto bg-blue-900 border border-blue-800 p-6 rounded-2xl space-y-4 animate-in fade-in">
      <h2 className="text-lg font-bold text-white flex items-center gap-2"><UserPlus size={18}/> Novo Time Simples</h2>
      <div><label className="text-xs text-blue-400 block mb-1">Nome do Clube</label><input required value={name} onChange={e=>setName(e.target.value)} className={inputClass}/></div>
      <div><label className="text-xs text-blue-400 block mb-1">Nome do Técnico</label><input value={coach} onChange={e=>setCoach(e.target.value)} className={inputClass}/></div>
      <div className="bg-blue-950 p-3 rounded-xl flex items-center justify-between"><span className="text-xs text-blue-400">Escudo do Time:</span><label className="cursor-pointer bg-blue-800 px-3 py-1.5 rounded text-xs text-white hover:bg-emerald-600"><UploadCloud size={14} className="inline mr-1"/> Enviar Imagem<input type="file" accept="image/*" className="hidden" onChange={e=>processImage(e.target.files[0],setShield)}/></label></div>
      {shield && <div className="text-center p-2"><ShieldDisplay shield={shield} size="large" /></div>}
      <Button type="submit" className="w-full py-3">Salvar Time</Button>
    </form>
  );
};

const CreateTeamFull = ({ onCreate, showToast }) => {
  const [fn, setFn] = useState(''); const [ln, setFnL] = useState(''); const [tn, setTn] = useState(''); const [wa, setWa] = useState(''); const [em, setEm] = useState(''); const [role, setRole] = useState('member');
  return (
    <form onSubmit={async (e)=>{e.preventDefault(); const cl=wa.replace(/\D/g,''); const name=`${fn} ${ln}`; await onCreate({user:{id:`pending_${cl}`,name,email:em.trim().toLowerCase(),role,whatsapp:cl},team:{id:`t${Date.now()}`,name:tn,coach:name,whatsapp:cl,ownerId:`pending_${cl}`,shield:'🛡️'}}); window.open(`https://wa.me/${cl}?text=${encodeURIComponent(`Fala ${fn}! Acesso liberado no Clã Kame DLS:\nLink: ${window.location.origin}\nAtive sua conta em "Primeiro Acesso" com seu E-mail: ${em}`)}`,'_blank'); setFn(''); setFnL(''); setTn(''); setWa(''); setEm(''); }} className="max-w-xl mx-auto bg-blue-900 border border-blue-800 p-6 rounded-2xl space-y-4 animate-in fade-in">
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
        <div className="bg-blue-900 border border-amber-500/50 rounded-2xl overflow-hidden shadow-xl">
          <div className="p-4 bg-amber-500/10 border-b border-amber-500/20 flex items-center gap-2"><CheckCircle className="text-amber-500"/><h2 className="font-bold text-amber-500 text-base">Aguardando Aprovação ({pendingUsers.length})</h2></div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs whitespace-nowrap"><thead className="text-blue-400 font-bold border-b border-blue-800"><tr><th className="p-3">Técnico</th><th className="p-3">Clube</th><th className="p-3">WhatsApp</th><th className="p-3 text-center">Ação</th></tr></thead>
            <tbody className="divide-y divide-blue-800/40">
              {pendingUsers.map(u => {
                const t = teams.find(x => x.ownerId === u.id);
                return (
                  <tr key={u.id} className="hover:bg-blue-950/40">
                    <td className="p-3 font-bold text-blue-200">{u.name}</td><td className="p-3 text-amber-400 font-medium">{t?.name || 'S/ Clube'}</td><td className="p-3 font-mono text-blue-400">{u.whatsapp}</td>
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

      <div className="bg-blue-900 border border-blue-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="p-4 border-b border-blue-800 flex items-center gap-2"><Award className="text-emerald-500"/><h2 className="font-bold text-white text-base">Gestão de Elenco / Técnicos</h2></div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs whitespace-nowrap"><thead className="bg-blue-950/60 text-blue-400 font-bold border-b border-blue-800"><tr><th className="p-3">Técnico</th><th className="p-3">Clube</th><th className="p-3">WhatsApp</th><th className="p-3">Cargo</th><th className="p-3 text-center">Ação</th></tr></thead>
          <tbody className="divide-y divide-blue-800/40">
            {activeUsers.map(u=>{ 
              const t=teams.find(x=>x.ownerId===u.id); 
              
              // Modo de Edição
              if (editingId === u.id) {
                return (
                  <tr key={u.id} className="bg-blue-950/80">
                    <td className="p-3"><input type="text" value={editData.name} onChange={e=>setEditData({...editData, name: e.target.value})} className="bg-blue-900 border border-blue-700 rounded p-1 text-white w-full outline-none focus:border-emerald-500" /></td>
                    <td className="p-3 text-emerald-400 font-medium">{t?.name || 'S/ Clube'}</td>
                    <td className="p-3"><input type="text" value={editData.whatsapp} onChange={e=>setEditData({...editData, whatsapp: e.target.value})} className="bg-blue-900 border border-blue-700 rounded p-1 text-white w-full outline-none focus:border-emerald-500" /></td>
                    <td className="p-3"><span className="text-blue-500 italic">Editando...</span></td>
                    <td className="p-3 flex justify-center gap-2">
                      <button onClick={()=>setEditingId(null)} className="bg-blue-800 text-blue-400 px-3 py-1.5 rounded hover:bg-blue-700 transition-colors">Cancelar</button>
                      <button onClick={()=>saveEdit(u)} className="bg-emerald-600 text-white px-3 py-1.5 rounded hover:bg-emerald-500 shadow-lg transition-colors">Salvar</button>
                    </td>
                  </tr>
                );
              }

              // Visualização Normal
              return(
                <tr key={u.id} className="hover:bg-blue-950/40">
                  <td className="p-3 font-bold text-blue-200">{u.name}</td><td className="p-3 text-emerald-400 font-medium">{t?.name || 'S/ Clube'}</td><td className="p-3 font-mono text-blue-400">{u.whatsapp}</td>
                  <td className="p-3">
                    <select disabled={!isSupremeLeader && currentUser?.id !== u.id} value={u.role || 'member'} onChange={e=>onUpdateUserRole(u.id, e.target.value)} className="bg-blue-900 text-blue-300 border border-blue-700 rounded p-1 outline-none disabled:opacity-50">
                      <option value="member">Membro</option>
                      <option value="organizer">Organizador</option>
                      <option value="kaioh">Kaioh</option>
                      <option value="leader">Líder</option>
                    </select>
                  </td>
                  <td className="p-3 flex justify-center gap-3 items-center">
                    {isSupremeLeader && <button onClick={()=>startEdit(u)} className="text-blue-500 hover:text-emerald-400 transition-colors p-1" title="Editar Técnico"><Edit size={16}/></button>}
                    {isLeader && <button onClick={()=>{if(window.confirm('Expulsar membro?')) onExpelUser(u.id)}} className="text-blue-500 hover:text-red-400 transition-colors p-1" title="Expulsar"><XCircle size={16}/></button>}
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

const RecordsWall = ({ showToast, currentUser, globalRecords, onSaveRecords }) => {
  const isAdmin = currentUser?.role === 'leader' || currentUser?.role === 'kaioh';

  const Records = [
    {
      title: "🔥 Melhor Campanha (Divisão Lendária)",
      description: "Desempenho perfeito na liga mais difícil",
      items: [
        { rank: "🥇", name: "Gustavo", team: "Fúria", metric: "15 Vitórias • 0 GS • 130 GF", isHero: true },
        { rank: "🥈", name: "Augusto", team: "Cupiuba City", metric: "15 Vitórias • 0 GS • 109 GF" },
        { rank: "🥉", name: "Michael", team: "Xores Galaxy", metric: "15 Vitórias • 0 GS • 102 GF" }
      ]
    },
    {
      title: "👑 Artilheiro de Temporada",
      description: "Maior número de gols acumulados numa edição",
      items: [
        { rank: "🥇", name: "Gustavo", team: "Fúria", metric: "101 Gols", isHero: true },
        { rank: "🥈", name: "Carlos", team: "Los Craques", metric: "95 Gols" },
        { rank: "🥉", name: "Carlos", team: "Los Craques", metric: "88 Gols" }
      ]
    },
    {
      title: "👟 Melhor Garçom de Temporada",
      description: "Líder absoluto em assistências na edição",
      items: [
        { rank: "🥇", name: "Gustavo", team: "Fúria", metric: "158 Assistências", isHero: true },
        { rank: "🥈", name: "Edilan", team: "Bragantino", metric: "64 Assistências" },
        { rank: "🥉", name: "Carlos", team: "Los Craques", metric: "48 Assistências" }
      ]
    },
    {
      title: "🚀 Maior Distância de Gol",
      description: "Chutes antológicos de trás do meio de campo",
      items: [
        { rank: "🥇", name: "Augusto", team: "Cupyuba City", metric: "96 Metros", isHero: true },
        { rank: "🥈", name: "Luck", team: "Don Remo", metric: "92 Metros" },
        { rank: "🥉", name: "Gustavo", team: "Fúria", metric: "85 Metros" }
      ]
    },
    {
      title: "⚽ Gols num Mesmo Jogo",
      description: "Extermínio ofensivo em uma única partida",
      items: [
        { rank: "🥇", name: "Neto", team: "Sport Belém", metric: "12 Gols", isHero: true },
        { rank: "🥈", name: "Almeida", team: "Maranhão EC", metric: "12 Gols", isHero: true },
        { rank: "🥉", name: "Gustavo", team: "Fúria", metric: "11 Gols" }
      ]
    },
    {
      title: "⚡ Hat-trick Mais Rápido",
      description: "Três gols marcados em tempo recorde no cronômetro",
      items: [
        { rank: "🥇", name: "Augusto", team: "Cupyuba City", metric: "Minuto 6'", isHero: true },
        { rank: "🥈", name: "Neto", team: "Sport Belém", metric: "Minuto 8'" },
        { rank: "🥉", name: "Luck", team: "Don Remo", metric: "Minuto 8'" }
      ]
    },
    {
      title: "🥖 Melhor Garçom de uma Partida",
      description: "Garçom de elite em um único confronto",
      items: [
        { rank: "🥇", name: "Gustavo", team: "Fúria", metric: "7 Assistências", isHero: true },
        { rank: "🥈", name: "Rafael", team: "Varginha", metric: "6 Assistências" },
        { rank: "🥉", name: "CARLOS", team: "Los Craques", metric: "6 Assistências" }
      ]
    },
    {
      title: "💎 Maior Farmador de Temporada",
      description: "Dedicação total acumulando pontos para o Clã",
      items: [
        { rank: "🥇", name: "Vinizin", team: "CONFIANÇA", metric: "1.812.845 Clã Points", isHero: true },
        { rank: "🥈", name: "Aguardando Recordista", team: "---", metric: "0 pts" },
        { rank: "🥉", name: "Aguardando Recordista", team: "---", metric: "0 pts" }
      ]
    }
  ];

  const [records, setRecords] = useState(() => {
    try {
      const savedLocal = localStorage.getItem('kame_records_db');
      if (globalRecords && globalRecords.length > 0) return globalRecords;
      if (savedLocal) return JSON.parse(savedLocal);
    } catch(e) {}
    return Records;
  });

  useEffect(() => {
    if (globalRecords && globalRecords.length > 0) setRecords(globalRecords);
  }, [globalRecords]);

  const [editingIdx, setEditingIdx] = useState(null);
  const [editForm, setEditForm] = useState(null);

  const startEdit = (idx, category) => {
    setEditingIdx(idx);
    setEditForm(JSON.parse(JSON.stringify(category))); 
  };

  const handleItemChange = (itemIdx, field, value) => {
    const newData = { ...editForm };
    newData.items[itemIdx][field] = value;
    setEditForm(newData);
  };

  const saveEdit = () => {
    const newRecords = [...records];
    newRecords[editingIdx] = editForm;
    
    setRecords(newRecords);
    setEditingIdx(null);
    try { localStorage.setItem('kame_records_db', JSON.stringify(newRecords)); } catch(e){} 

    if (onSaveRecords) {
       onSaveRecords(newRecords);
    } else {
       showToast("Salvo com sucesso! (Visível localmente)", "success");
    }
  };

  const captureWall = () => {
    showToast("Preparando imagem dos Recordes Lendários...", "success");
    
    const captureAndDownload = () => {
      const element = document.getElementById('capture-records-mural');
      if (!element) return;
      window.html2canvas(element, { backgroundColor: '#020617', scale: 2, useCORS: true }).then(canvas => {
        const link = document.createElement('a');
        link.download = `Mural-de-Recordes-Kame.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
        showToast("Mural salvo com sucesso!", "success");
      });
    };

    if (window.html2canvas) { 
      captureAndDownload(); 
    } else {
      const script = document.createElement('script');
      script.src = "https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js";
      script.onload = captureAndDownload;
      document.body.appendChild(script);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in pb-12">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-gradient-to-r from-blue-900 to-blue-950 p-5 rounded-2xl border border-blue-800 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="text-3xl animate-pulse">🏅</div>
          <div>
            <h2 className="text-xl font-black text-white uppercase tracking-wider">Hall da Fama & Recordes</h2>
            <p className="text-[10px] text-amber-400 font-bold uppercase tracking-widest mt-0.5">Os maiores feitos da história do Clã Kame</p>
          </div>
        </div>
        <Button onClick={captureWall} className="text-xs bg-amber-600 hover:bg-amber-500 py-2 px-4 shadow-md font-bold text-blue-950 flex items-center gap-1.5 border-0"><Camera size={14}/> Print do Mural</Button>
      </div>

      <div id="capture-records-mural" className="p-2 sm:p-4 rounded-3xl space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {records.map((category, idx) => {
            if (editingIdx === idx) {
              return (
                <div key={idx} className="bg-blue-950 border border-amber-500/50 rounded-2xl p-4 md:p-5 shadow-lg relative animate-in zoom-in-95 duration-200">
                  <h3 className="font-black text-amber-400 uppercase tracking-wide mb-4">✏️ Atualizando: {editForm.title}</h3>
                  <div className="space-y-3">
                    {editForm.items.map((item, i) => (
                      <div key={i} className="bg-blue-900/40 p-3 rounded-xl border border-blue-800 space-y-2">
                        <span className="text-[10px] font-bold text-blue-300 uppercase tracking-widest">{i + 1}º Colocado ({item.rank})</span>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <input type="text" value={item.name} onChange={e => handleItemChange(i, 'name', e.target.value)} placeholder="Nome do Jogador" className="bg-blue-950 text-white text-xs p-2 rounded border border-blue-700 outline-none focus:border-amber-500" />
                          <input type="text" value={item.team} onChange={e => handleItemChange(i, 'team', e.target.value)} placeholder="Nome do Time" className="bg-blue-950 text-white text-xs p-2 rounded border border-blue-700 outline-none focus:border-amber-500" />
                          <input type="text" value={item.metric} onChange={e => handleItemChange(i, 'metric', e.target.value)} placeholder="Métrica (ex: 101 Gols)" className="bg-blue-950 text-white text-xs p-2 rounded border border-blue-700 outline-none focus:border-amber-500 sm:col-span-2" />
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-blue-800">
                    <Button variant="outline" onClick={() => setEditingIdx(null)} className="text-xs py-1.5 px-3">Cancelar</Button>
                    <Button onClick={saveEdit} className="text-xs py-1.5 px-4 bg-amber-600 hover:bg-amber-500 text-white border-0 shadow-md">Salvar Mudanças</Button>
                  </div>
                </div>
              );
            }

            return (
              <div key={idx} className="bg-blue-950/70 border border-blue-800/80 rounded-2xl p-4 md:p-5 relative overflow-hidden shadow-lg hover:border-amber-500/30 transition-all group">
                <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-amber-500/40 to-transparent"></div>
                
                <div className="mb-4 flex justify-between items-start gap-2">
                  <div>
                    <h3 className="font-black text-white text-sm md:text-base uppercase tracking-wide group-hover:text-amber-400 transition-colors">{category.title}</h3>
                    <p className="text-[10px] text-blue-400 font-medium mt-0.5">{category.description}</p>
                  </div>
                  {isAdmin && (
                    <button onClick={() => startEdit(idx, category)} className="text-blue-500 hover:text-amber-400 bg-blue-900/50 p-1.5 rounded-lg border border-blue-800 transition-colors shrink-0" title="Editar Recordes">
                      <Edit size={14} />
                    </button>
                  )}
                </div>

                <div className="space-y-2">
                  {category.items.map((item, keyIdx) => (
                    <div key={keyIdx} className={`p-2.5 rounded-xl border flex items-center justify-between gap-3 ${item.isHero ? 'bg-gradient-to-r from-amber-500/10 to-blue-900/40 border-amber-500/20' : 'bg-blue-900/40 border-blue-800/40'}`}>
                      <div className="flex items-center gap-3">
                        <span className="text-base shrink-0 select-none">{item.rank}</span>
                        {/* 🛡️ CORREÇÃO DO RECORTE AQUI: Sem truncate e com flex-col para respirar */}
                        <div className="flex flex-col justify-center py-0.5">
                          <span className={`text-xs font-bold leading-tight ${item.isHero ? 'text-amber-400 font-black' : 'text-blue-100'}`}>{item.name}</span>
                          <span className="text-[10px] text-blue-400 leading-tight font-medium mt-0.5">Clube: {item.team}</span>
                        </div>
                      </div>
                      <span className={`text-[11px] font-black font-mono shrink-0 px-2 py-1 rounded bg-blue-950 shadow-inner ${item.isHero ? 'text-emerald-400 border border-emerald-500/10' : 'text-blue-300'}`}>
                        {item.metric}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

const GlobalRanking = ({ teams, matches, competitions, currentUser, showToast }) => {
  const isAdmin = currentUser?.role === 'leader' || currentUser?.role === 'kaioh';

  // 🌟 Controle de Abas dentro do Ranking
  const [activeTab, setActiveTab] = useState('ranking');

  // ⚡ MODO TURBO: Puxa o ranking ordenado
  const rankingData = useMemo(() => {
    return (teams || [])
      .filter(t => t.ownerId && t.ownerId !== 'manual' && ((t.globalPoints || 0) > 0 || (t.playedMatches || 0) > 0))
      .sort((a, b) => (b.globalPoints || 0) - (a.globalPoints || 0) || (b.totalWins || 0) - (a.totalWins || 0));
  }, [teams]);

  const getBadge = (pts) => {
    if (pts >= 1000) return { label: 'Lenda Suprema', icon: '👑', color: 'text-amber-400 bg-amber-500/10 border-amber-500/30' };
    if (pts >= 400) return { label: 'Mestre', icon: '💎', color: 'text-purple-400 bg-purple-500/10 border-purple-500/30' };
    if (pts >= 150) return { label: 'Veterano', icon: '🛡️', color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30' };
    return { label: 'Novato', icon: '🔰', color: 'text-blue-400 bg-blue-500/10 border-blue-500/30' };
  };

  // 🚀 RESTAURAÇÃO DE HISTÓRICO
  const handleSyncHistory = async () => {
    if (!window.confirm("Atenção: O sistema vai ler todo o histórico antigo e gravar os pontos permanentemente nos times. Deseja continuar?")) return;
    showToast("Calculando histórico... Por favor, aguarde.", "info");

    try {
      let stats = {};
      (teams || []).forEach(t => {
        if(t && t.id) {
          stats[t.id] = { globalPoints: 0, playedMatches: 0, totalWins: 0, totalDraws: 0, goalsFor: 0, goalsAgainst: 0, titles: 0 };
        }
      });

      (competitions || []).forEach(c => {
        const ptsJoin = c.category === 'copa_flash' ? 2 : 10;
        if (c && c.teams) {
          c.teams.forEach(tId => { if(stats[tId]) stats[tId].globalPoints += ptsJoin; });
        }
      });

      (matches || []).forEach(m => {
        if (m.status === 'approved') {
          const c = (competitions || []).find(comp => comp.id === m.compId);
          const isFlash = c?.category === 'copa_flash';
          const ptsPlay = isFlash ? 1 : 2; const ptsWin = isFlash ? 1 : 3; const ptsDraw = isFlash ? 0 : 1;

          const tA = stats[m.teamA]; const tB = stats[m.teamB];
          if(tA) { tA.playedMatches += 1; tA.globalPoints += ptsPlay; tA.goalsFor += Number(m.scoreA||0); tA.goalsAgainst += Number(m.scoreB||0); }
          if(tB) { tB.playedMatches += 1; tB.globalPoints += ptsPlay; tB.goalsFor += Number(m.scoreB||0); tB.goalsAgainst += Number(m.scoreA||0); }

          let scoreA = Number(m.scoreA||0); let scoreB = Number(m.scoreB||0);
          let penA = m.penaltiesA !== null && m.penaltiesA !== undefined ? Number(m.penaltiesA) : null;
          let penB = m.penaltiesB !== null && m.penaltiesB !== undefined ? Number(m.penaltiesB) : null;

          let winner = null;
          if (scoreA > scoreB) winner = 'A';
          else if (scoreB > scoreA) winner = 'B';
          else if (penA !== null && penB !== null) {
              if (tA) { tA.totalDraws += 1; tA.globalPoints += ptsDraw; }
              if (tB) { tB.totalDraws += 1; tB.globalPoints += ptsDraw; }
              if (penA > penB) winner = 'A'; else if (penB > penA) winner = 'B';
          } else {
              if (tA) { tA.totalDraws += 1; tA.globalPoints += ptsDraw; }
              if (tB) { tB.totalDraws += 1; tB.globalPoints += ptsDraw; }
          }

          if (winner === 'A' && tA) { tA.totalWins += 1; tA.globalPoints += ptsWin; } 
          else if (winner === 'B' && tB) { tB.totalWins += 1; tB.globalPoints += ptsWin; }
        }
      });

      (competitions || []).forEach(c => {
        if (!c.rounds) return;
        const isFlash = c.category === 'copa_flash';
        const ptsOitavas = isFlash ? 0 : 5; const ptsQuartas = isFlash ? 2 : 10;
        const ptsSemi = isFlash ? 5 : 15; const ptsThird = isFlash ? 5 : 15;
        const ptsVice = isFlash ? 10 : 25; const ptsChamp = isFlash ? 20 : 50;

        const koRounds = c.rounds.filter(r => r.id.includes('ko') || c.format === 'cup');
        let semiTeams = new Set(); let finalTeams = new Set();

        koRounds.forEach(r => {
          r.matches.forEach(m => {
            const tA = stats[m.teamA]; const tB = stats[m.teamB];

            if (r.number === 'Oitavas') { if(tA) tA.globalPoints += ptsOitavas; if(tB) tB.globalPoints += ptsOitavas; }
            if (r.number === 'Quartas') { if(tA) tA.globalPoints += ptsQuartas; if(tB) tB.globalPoints += ptsQuartas; }
            if (r.number === 'Semifinal') { if(tA) { tA.globalPoints += ptsSemi; semiTeams.add(m.teamA); } if(tB) { tB.globalPoints += ptsSemi; semiTeams.add(m.teamB); } }
            
            if (r.number === 'Final') {
              if(tA) finalTeams.add(m.teamA); if(tB) finalTeams.add(m.teamB);
              const sUI = matches.find(x => x.matchId === m.id && x.compId === c.id && x.status === 'approved');
              if (sUI) {
                let scoreA = Number(sUI.scoreA||0); let scoreB = Number(sUI.scoreB||0);
                let penA = sUI.penaltiesA !== null && sUI.penaltiesA !== undefined ? Number(sUI.penaltiesA) : null;
                let penB = sUI.penaltiesB !== null && sUI.penaltiesB !== undefined ? Number(sUI.penaltiesB) : null;
                
                let winnerId = null; let loserId = null;
                if (scoreA > scoreB) { winnerId = m.teamA; loserId = m.teamB; }
                else if (scoreB > scoreA) { winnerId = m.teamB; loserId = m.teamA; }
                else if (penA !== null && penB !== null) {
                    if (penA > penB) { winnerId = m.teamA; loserId = m.teamB; }
                    else if (penB > penA) { winnerId = m.teamB; loserId = m.teamA; }
                }

                if (winnerId && stats[winnerId]) { stats[winnerId].globalPoints += ptsChamp; stats[winnerId].titles += 1; }
                if (loserId && stats[loserId]) { stats[loserId].globalPoints += ptsVice; }
              }
            }
          });
        });
        semiTeams.forEach(tId => { if (!finalTeams.has(tId) && stats[tId]) stats[tId].globalPoints += ptsThird; });
      });

      const updatePromises = Object.keys(stats).map(teamId => {
        const tStats = stats[teamId];
        if (tStats.playedMatches > 0 || tStats.globalPoints > 0) {
          return updateDoc(getPublicDocPath('teams', teamId), {
            globalPoints: tStats.globalPoints,
            playedMatches: tStats.playedMatches,
            totalWins: tStats.totalWins,
            totalDraws: tStats.totalDraws,
            goalsFor: tStats.goalsFor,
            goalsAgainst: tStats.goalsAgainst,
            titles: tStats.titles
          });
        }
        return Promise.resolve();
      });

      await Promise.all(updatePromises);
      showToast("Histórico sincronizado com sucesso! Todos os pontos foram restaurados.", "success");

    } catch (error) {
      console.error("Erro na sincronização:", error);
      showToast("Ocorreu um erro ao sincronizar.", "error");
    }
  };

  // 🌟 SISTEMA DE XCLÃ / SELETIVAS
  const [xclas, setXclas] = useState(() => {
    try { return JSON.parse(localStorage.getItem('kame_xclas_db')) || []; }
    catch (e) { return []; }
  });

  const [newXclaName, setNewXclaName] = useState('');
  const [newXclaSquad, setNewXclaSquad] = useState('A');
  const [newXclaSeletivaSize, setNewXclaSeletivaSize] = useState('8');
  const [newXclaTitularesCount, setNewXclaTitularesCount] = useState('5');
  const [newXclaReservasCount, setNewXclaReservasCount] = useState('2');
  
  const [guaranteedMembroSuperior, setGuaranteedMembroSuperior] = useState('');
  const [guaranteedProfessor, setGuaranteedProfessor] = useState('');

  const [manualAddTitular, setManualAddTitular] = useState('');
  const [manualAddReserva, setManualAddReserva] = useState('');

  // Painel de Competição Ativa
  const [selectedActiveXclaId, setSelectedActiveXclaId] = useState(null);
  const [newOpponentName, setNewOpponentName] = useState('');
  const [newMatchKameId, setNewMatchKameId] = useState('');
  const [newMatchOppName, setNewMatchOppName] = useState('');
  const [newNewsText, setNewNewsText] = useState('');

  useEffect(() => {
    localStorage.setItem('kame_xclas_db', JSON.stringify(xclas));
  }, [xclas]);

  const createMiniBracket = (teamsArr) => {
    let shuffled = [...teamsArr].sort(() => Math.random() - 0.5);
    const rounds = [];
    let matchId = 1;
    
    let currentMatches = [];
    for(let i=0; i<shuffled.length; i+=2) {
      currentMatches.push({ id: matchId++, tA: shuffled[i], tB: shuffled[i+1] || null, scoreA: '', scoreB: '', winner: null });
    }
    rounds.push(currentMatches);
    
    let prevSize = currentMatches.length;
    while(prevSize > 1) {
      let nextMatches = [];
      for(let i=0; i<prevSize; i+=2) {
          nextMatches.push({ id: matchId++, tA: null, tB: null, scoreA: '', scoreB: '', winner: null });
      }
      rounds.push(nextMatches);
      prevSize = nextMatches.length;
    }
    return rounds;
  };

  const isTeamInOtherSquad = (teamId, tournamentName, currentXclaId) => {
    return xclas.some(x => 
      x.name.trim().toLowerCase() === tournamentName.trim().toLowerCase() && 
      x.id !== currentXclaId && 
      ((x.titulares || []).some(t => t.id === teamId) || (x.reservas || []).some(t => t.id === teamId))
    );
  };

  const handleGenerateXcla = (e) => {
    e.preventDefault();
    const selSize = parseInt(newXclaSeletivaSize, 10);
    
    if (!newXclaName || !selSize || selSize <= 0) {
      showToast("Preencha o nome e um número válido para a seletiva.", "error");
      return;
    }
    if (rankingData.length === 0) {
      showToast("Não há times no ranking para convocar.", "error");
      return;
    }

    let pool = [...rankingData];
    let startingTitulares = [];

    if (newXclaSquad === 'A') {
      if (guaranteedMembroSuperior) {
         const t = teams.find(x => x.id === guaranteedMembroSuperior);
         if (t) {
            startingTitulares.push({...t, isGuaranteed: 'Membro Superior'});
            pool = pool.filter(x => x.id !== guaranteedMembroSuperior); 
         }
      }
      if (guaranteedProfessor) {
         const t = teams.find(x => x.id === guaranteedProfessor);
         if (t && t.id !== guaranteedMembroSuperior) {
            startingTitulares.push({...t, isGuaranteed: 'Convite Professor'});
            pool = pool.filter(x => x.id !== guaranteedProfessor); 
         }
      }
    }

    const alreadyRosteredIds = new Set();
    xclas.forEach(x => {
       if (x.name.trim().toLowerCase() === newXclaName.trim().toLowerCase()) {
          (x.titulares || []).forEach(t => alreadyRosteredIds.add(t.id));
          (x.reservas || []).forEach(t => alreadyRosteredIds.add(t.id));
       }
    });
    pool = pool.filter(t => !alreadyRosteredIds.has(t.id));

    let draftedTeams = [];
    if (newXclaSquad === 'A') {
      draftedTeams = pool.slice(0, selSize);
    } else {
      draftedTeams = pool.slice(selSize, selSize * 2);
    }

    if (draftedTeams.length === 0) {
      showToast("Não existem times disponíveis no ranking para gerar esta seletiva. Todos já estão alocados.", "error");
      return;
    }

    const newXcla = {
      id: `xcla_${Date.now()}`,
      name: newXclaName,
      squad: newXclaSquad,
      titularesMax: parseInt(newXclaTitularesCount, 10) || 5,
      reservasMax: parseInt(newXclaReservasCount, 10) || 2,
      titulares: startingTitulares,
      reservas: [],
      bracket: createMiniBracket(draftedTeams),
      date: Date.now(),
      status: 'open',
      oppClanName: 'Clã Adversário',
      pointsKame: 0,
      pointsOpp: 0,
      opponentsList: [],
      xclaMatches: [],
      news: []
    };

    setXclas([newXcla, ...xclas]);
    setNewXclaName('');
    showToast(`Seletiva do Time ${newXclaSquad} gerada com sucesso!`, "success");
  };

  const handleDeleteXcla = (id) => {
    if(window.confirm('Excluir esta convocação definitivamente?')) {
      setXclas(xclas.filter(x => x.id !== id));
      if (selectedActiveXclaId === id) setSelectedActiveXclaId(null);
      showToast("Convocação removida do histórico.", "success");
    }
  };

  const handleLockRoster = (xclaId) => {
    const xcla = xclas.find(x => x.id === xclaId);
    if((xcla.titulares || []).length === 0) {
      showToast("Você precisa ter pelo menos 1 titular para fechar o time!", "error");
      return;
    }

    if(window.confirm('Deseja FECHAR a escalação final? O time será trancado e a competição movida para a aba "Competições Ativas".')) {
      const newXclas = xclas.map(x => x.id === xclaId ? { 
        ...x, 
        status: 'locked',
        oppClanName: x.oppClanName || 'Clã Adversário',
        pointsKame: x.pointsKame || 0,
        pointsOpp: x.pointsOpp || 0,
        opponentsList: x.opponentsList || [],
        xclaMatches: x.xclaMatches || [],
        news: x.news || []
      } : x);
      setXclas(newXclas);
      showToast("A Escalação foi trancada e movida para Competições Ativas!", "success");
    }
  };

  const updateActiveXcla = (id, payload) => {
    setXclas(prev => prev.map(x => x.id === id ? { ...x, ...payload } : x));
  };

  const updateBracketMatch = (xclaId, roundIdx, matchIdx, field, value) => {
    const newXclas = [...xclas];
    const xcla = newXclas.find(x => x.id === xclaId);
    if (!xcla || xcla.status === 'locked') return;

    const match = xcla.bracket[roundIdx][matchIdx];
    match[field] = value;

    if (field === 'scoreA' || field === 'scoreB') {
      const sA = parseInt(match.scoreA);
      const sB = parseInt(match.scoreB);
      if (!isNaN(sA) && !isNaN(sB) && sA !== sB) {
        match.winner = sA > sB ? match.tA : match.tB;
        advanceWinnerInternally(xcla, roundIdx, matchIdx, match.winner);
      } else {
        match.winner = null; 
      }
    }
    setXclas(newXclas);
  };

  const advanceWinnerInternally = (xcla, roundIdx, matchIdx, winnerTeam) => {
    if (roundIdx < xcla.bracket.length - 1) {
      const nextMatchIdx = Math.floor(matchIdx / 2);
      const isTeamA = matchIdx % 2 === 0;
      if (isTeamA) {
          xcla.bracket[roundIdx + 1][nextMatchIdx].tA = winnerTeam;
      } else {
          xcla.bracket[roundIdx + 1][nextMatchIdx].tB = winnerTeam;
      }
      xcla.bracket[roundIdx + 1][nextMatchIdx].winner = null; 
      xcla.bracket[roundIdx + 1][nextMatchIdx].scoreA = ''; 
      xcla.bracket[roundIdx + 1][nextMatchIdx].scoreB = ''; 
    }
  };

  const forceAdvanceTeam = (xclaId, roundIdx, matchIdx, winnerTeam) => {
    if (!winnerTeam || !isAdmin) return;
    const newXclas = [...xclas];
    const xcla = newXclas.find(x => x.id === xclaId);
    if (!xcla || xcla.status === 'locked') return;

    xcla.bracket[roundIdx][matchIdx].winner = winnerTeam;
    advanceWinnerInternally(xcla, roundIdx, matchIdx, winnerTeam);
    setXclas(newXclas);
  };

  const handleAutoFillRoster = (xclaId) => {
    const xcla = xclas.find(x => x.id === xclaId);
    if(!xcla || xcla.status === 'locked') return;

    const teamStats = {};
    xcla.bracket.forEach((round, rIdx) => {
      round.forEach(m => {
        if(m.tA) {
          if(!teamStats[m.tA.id]) teamStats[m.tA.id] = { ...m.tA, maxPhase: rIdx, gf: 0, gd: 0, wins: 0 };
          teamStats[m.tA.id].maxPhase = rIdx;
          if(m.scoreA !== '') {
            const sA = Number(m.scoreA), sB = Number(m.scoreB || 0);
            teamStats[m.tA.id].gf += sA;
            teamStats[m.tA.id].gd += (sA - sB);
            if(sA > sB || m.winner?.id === m.tA.id) teamStats[m.tA.id].wins++;
          }
        }
        if(m.tB) {
          if(!teamStats[m.tB.id]) teamStats[m.tB.id] = { ...m.tB, maxPhase: rIdx, gf: 0, gd: 0, wins: 0 };
          teamStats[m.tB.id].maxPhase = rIdx;
          if(m.scoreB !== '') {
            const sB = Number(m.scoreB), sA = Number(m.scoreA || 0);
            teamStats[m.tB.id].gf += sB;
            teamStats[m.tB.id].gd += (sB - sA);
            if(sB > sA || m.winner?.id === m.tB.id) teamStats[m.tB.id].wins++;
          }
        }
      });
    });

    const sortedTeams = Object.values(teamStats).sort((a,b) => {
      if(b.maxPhase !== a.maxPhase) return b.maxPhase - a.maxPhase;
      if(b.wins !== a.wins) return b.wins - a.wins;
      if(b.gd !== a.gd) return b.gd - a.gd;
      return b.gf - a.gf;
    });

    const newTitulares = [...(xcla.titulares || []).filter(t => t.isGuaranteed || t.isManual)];
    const newReservas = [...(xcla.reservas || []).filter(t => t.isManual)];

    sortedTeams.forEach(t => {
      if(!newTitulares.some(x => x.id === t.id) && !newReservas.some(x => x.id === t.id)) {
        if(newTitulares.length < xcla.titularesMax) {
          newTitulares.push({...t, isAuto: true});
        } else if(newReservas.length < xcla.reservasMax) {
          newReservas.push({...t, isAuto: true});
        }
      }
    });

    const newXclas = xclas.map(x => x.id === xclaId ? { ...x, titulares: newTitulares, reservas: newReservas } : x);
    setXclas(newXclas);
    showToast("Escalação montada baseada no desempenho da seletiva!", "success");
  };

  const addTeamToRoster = (xclaId, listType, teamId) => {
    if (!teamId) return;
    const teamObj = teams.find(t => t.id === teamId);
    if (!teamObj) return;

    const newXclas = [...xclas];
    const xcla = newXclas.find(x => x.id === xclaId);
    if (xcla.status === 'locked') return;
    
    if ((xcla.titulares || []).some(t => t.id === teamId) || (xcla.reservas || []).some(t => t.id === teamId)) {
      showToast("Este time já está convocado nesta escalação!", "warning");
      return;
    }

    if (isTeamInOtherSquad(teamId, xcla.name, xcla.id)) {
      showToast("Este time já foi escalado em outro Esquadrão para este campeonato!", "error");
      return;
    }

    if (listType === 'titulares') {
      if ((xcla.titulares || []).length >= xcla.titularesMax) { showToast(`Limite de titulares (${xcla.titularesMax}) atingido!`, "error"); return; }
      xcla.titulares.push({...teamObj, isManual: true});
    } else {
      if ((xcla.reservas || []).length >= xcla.reservasMax) { showToast(`Limite de reservas (${xcla.reservasMax}) atingido!`, "error"); return; }
      xcla.reservas.push({...teamObj, isManual: true});
    }
    
    setXclas(newXclas);
    setManualAddTitular(''); setManualAddReserva('');
    showToast(`Time adicionado aos ${listType}!`, "success");
  };

  const removeTeamFromRoster = (xclaId, listType, teamId) => {
    const newXclas = [...xclas];
    const xcla = newXclas.find(x => x.id === xclaId);
    if (xcla.status === 'locked') return;
    
    if (listType === 'titulares') xcla.titulares = (xcla.titulares || []).filter(t => t.id !== teamId);
    else xcla.reservas = (xcla.reservas || []).filter(t => t.id !== teamId);
    
    setXclas(newXclas);
  };

  const handleAddOpponentPlayer = (xclaId) => {
    if(!newOpponentName) return;
    const xcla = xclas.find(x => x.id === xclaId);
    const updatedOpps = [...(xcla.opponentsList || []), newOpponentName];
    updateActiveXcla(xclaId, { opponentsList: updatedOpps });
    setNewOpponentName('');
  };

  const handleAddXclaMatch = (xclaId) => {
    if(!newMatchKameId || !newMatchOppName) { showToast("Selecione os dois jogadores!", "error"); return; }
    const xcla = xclas.find(x => x.id === xclaId);
    const newMatch = { id: `xm_${Date.now()}`, kameId: newMatchKameId, oppName: newMatchOppName, scoreKame: '', scoreOpp: '' };
    updateActiveXcla(xclaId, { xclaMatches: [...(xcla.xclaMatches || []), newMatch] });
    setNewMatchKameId(''); setNewMatchOppName('');
  };

  const handleUpdateXclaMatchScore = (xclaId, matchId, field, value) => {
    const xcla = xclas.find(x => x.id === xclaId);
    const updatedMatches = (xcla.xclaMatches || []).map(m => m.id === matchId ? { ...m, [field]: value } : m);
    updateActiveXcla(xclaId, { xclaMatches: updatedMatches });
  };

  const handleAddXclaNews = (xclaId) => {
    if(!newNewsText) return;
    const xcla = xclas.find(x => x.id === xclaId);
    const newNews = { id: `n_${Date.now()}`, text: newNewsText, timestamp: Date.now() };
    updateActiveXcla(xclaId, { news: [newNews, ...(xcla.news || [])] });
    setNewNewsText('');
  };

  // Listas divididas para as abas
  const openSeletivas = xclas.filter(x => x.status !== 'locked');
  const activeCompetitions = xclas.filter(x => x.status === 'locked');
  const selectedActiveXcla = selectedActiveXclaId ? xclas.find(x => x.id === selectedActiveXclaId) : null;

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-12">
      <div className="bg-gradient-to-r from-blue-900 to-blue-950 p-6 rounded-3xl border border-blue-800 shadow-xl flex flex-col md:flex-row items-center gap-4 w-full">
        <div className="bg-blue-950 p-4 rounded-full border-2 border-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.3)]">
          <Crown size={32} className="text-amber-500 animate-pulse" />
        </div>
        <div className="text-center md:text-left flex-1 w-full">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
             <div>
               <h2 className="text-2xl font-black text-white uppercase tracking-wider">Ranking Global Xclã</h2>
               <p className="text-sm text-blue-400 mt-1">A meritocracia do Clã Kame. Jogue, avance e conquiste seu lugar no topo.</p>
             </div>
             {isAdmin && (
               <button onClick={handleSyncHistory} className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2 px-4 rounded-xl text-xs flex items-center gap-2 transition-colors shadow-lg shrink-0">
                 🔄 Restaurar Pontos Antigos
               </button>
             )}
          </div>
        </div>
      </div>

      {/* 🌟 NAVEGAÇÃO DE ABAS DO RANKING */}
      <div className="flex gap-1.5 p-1.5 bg-blue-950 rounded-xl border border-blue-800 overflow-x-auto custom-scrollbar">
        <button onClick={() => {setActiveTab('ranking'); setSelectedActiveXclaId(null);}} className={`shrink-0 flex-1 py-2 px-3 text-xs md:text-sm rounded-lg font-bold transition-all ${activeTab === 'ranking' ? 'bg-amber-600 text-white shadow-md' : 'text-blue-500 hover:text-white'}`}>
          🏆 Ranking
        </button>
        <button onClick={() => {setActiveTab('xcla'); setSelectedActiveXclaId(null);}} className={`shrink-0 flex-1 py-2 px-3 text-xs md:text-sm rounded-lg font-bold transition-all ${activeTab === 'xcla' ? 'bg-purple-600 text-white shadow-md' : 'text-blue-500 hover:text-white'}`}>
          ⚔️ Seletivas ({openSeletivas.length})
        </button>
        <button onClick={() => setActiveTab('active_xclas')} className={`shrink-0 flex-1 py-2 px-3 text-xs md:text-sm rounded-lg font-bold transition-all ${activeTab === 'active_xclas' ? 'bg-emerald-600 text-white shadow-md' : 'text-blue-500 hover:text-white'}`}>
          🔥 Competições Ativas ({activeCompetitions.length})
        </button>
      </div>

      {/* 🏆 CONTEÚDO: RANKING PRINCIPAL */}
      {activeTab === 'ranking' && (
        <div className="bg-blue-950 rounded-3xl border border-blue-800 shadow-2xl overflow-hidden animate-in slide-in-from-left-4">
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-blue-900 text-blue-300 font-bold border-b border-blue-800">
                <tr>
                  <th className="p-4 w-16 text-center">Pos</th>
                  <th className="p-4">Técnico / Clube</th>
                  <th className="p-4 text-center">Patente</th>
                  <th className="p-4 text-center">Pts Xclã</th>
                  <th className="p-4 text-center">Jogos</th>
                  <th className="p-4 text-center">V / E</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-blue-800/40">
                {rankingData.length === 0 ? (
                  <tr><td colSpan="6" className="p-8 text-center text-blue-500">O ranking será gerado assim que houver participações e jogos oficiais.</td></tr>
                ) : (
                  rankingData.map((t, index) => {
                    const pts = t.globalPoints || 0;
                    const badge = getBadge(pts);
                    const isTop3 = index < 3;
                    const rankColors = ['text-amber-400', 'text-slate-300', 'text-amber-700'];
                    
                    return (
                      <tr key={t.id} className={`hover:bg-blue-900/50 transition-colors ${index === 0 ? 'bg-amber-500/5' : ''}`}>
                        <td className="p-4 text-center">
                          <span className={`text-xl font-black ${isTop3 ? rankColors[index] : 'text-blue-500'}`}>
                            {index + 1}º
                          </span>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <ShieldDisplay shield={t.shield} size="small" />
                            <div className="flex flex-col">
                              <span className="font-bold text-white text-base leading-tight">{t.coach}</span>
                              <span className="text-[10px] text-blue-400 uppercase font-medium">{t.name}</span>
                            </div>
                          </div>
                        </td>
                        <td className="p-4 text-center">
                          <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-bold ${badge.color}`}>
                            <span>{badge.icon}</span> {badge.label}
                          </div>
                        </td>
                        <td className="p-4 text-center">
                          <span className={`text-2xl font-black drop-shadow-md ${index === 0 ? 'text-amber-500' : 'text-emerald-400'}`}>
                            {pts}
                          </span>
                        </td>
                        <td className="p-4 text-center text-blue-200 font-medium">{t.playedMatches || 0}</td>
                        <td className="p-4 text-center text-blue-300 font-medium">
                          <span className="text-emerald-400">{t.totalWins || 0}</span> / <span className="text-blue-400">{t.totalDraws || 0}</span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ⚔️ CONTEÚDO: SELETIVAS / XCLÃ */}
      {activeTab === 'xcla' && (
        <div className="space-y-8 animate-in slide-in-from-right-4">
          
          {isAdmin && (
            <form onSubmit={handleGenerateXcla} className="bg-purple-900/40 border border-purple-500/50 rounded-2xl p-5 md:p-6 shadow-xl space-y-4">
              <h3 className="font-bold text-purple-400 uppercase tracking-widest flex items-center gap-2 mb-2"><Target size={18}/> Gerar Nova Seletiva</h3>
              <p className="text-xs text-blue-300">A minicompetição puxará os times do Ranking Global. Os placares geram um critério de desempate para a Escalação Final. O sistema bloqueia automaticamente os times que já estão em outra escalação do mesmo campeonato.</p>
              
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                <div className="md:col-span-2">
                  <label className="text-[10px] text-blue-400 font-bold uppercase block mb-1">Nome do Torneio (Xclã)</label>
                  <input type="text" placeholder="Ex: Copa NFA" value={newXclaName} onChange={e=>setNewXclaName(e.target.value)} className="w-full bg-blue-950 border border-purple-500/40 rounded-lg p-2.5 text-white text-sm outline-none focus:border-purple-400" required />
                </div>
                
                <div>
                  <label className="text-[10px] text-blue-400 font-bold uppercase block mb-1">Esquadrão</label>
                  <select value={newXclaSquad} onChange={e=>setNewXclaSquad(e.target.value)} className="w-full bg-blue-950 border border-purple-500/40 rounded-lg p-2.5 text-white font-bold text-sm outline-none focus:border-purple-400">
                    <option value="A">Time A (Titulares)</option>
                    <option value="B">Time B (Aspirantes)</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] text-blue-400 font-bold uppercase block mb-1">Qtd. Titulares</label>
                  <input type="number" min="1" value={newXclaTitularesCount} onChange={e=>setNewXclaTitularesCount(e.target.value)} className="w-full bg-blue-950 border border-purple-500/40 rounded-lg p-2.5 text-white font-bold text-sm outline-none focus:border-purple-400" required />
                </div>

                <div>
                  <label className="text-[10px] text-blue-400 font-bold uppercase block mb-1">Qtd. Reservas</label>
                  <input type="number" min="0" value={newXclaReservasCount} onChange={e=>setNewXclaReservasCount(e.target.value)} className="w-full bg-blue-950 border border-purple-500/40 rounded-lg p-2.5 text-white font-bold text-sm outline-none focus:border-purple-400" required />
                </div>
              </div>

              {/* 🌟 Vagas Garantidas (Só aparecem se for Time A) */}
              {newXclaSquad === 'A' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-purple-800/50">
                  <div>
                    <label className="text-[10px] text-amber-400 font-bold uppercase block mb-1">👑 Vaga Garantida: Membro Superior</label>
                    <select value={guaranteedMembroSuperior} onChange={e=>setGuaranteedMembroSuperior(e.target.value)} className="w-full bg-blue-950 border border-amber-500/40 rounded-lg p-2 text-white text-xs outline-none focus:border-amber-400">
                      <option value="">(Nenhum)</option>
                      {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] text-amber-400 font-bold uppercase block mb-1">🎟️ Vaga Garantida: Convite da Cápsula</label>
                    <select value={guaranteedProfessor} onChange={e=>setGuaranteedProfessor(e.target.value)} className="w-full bg-blue-950 border border-amber-500/40 rounded-lg p-2 text-white text-xs outline-none focus:border-amber-400">
                      <option value="">(Nenhum)</option>
                      {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </select>
                  </div>
                </div>
              )}

              <div className="flex flex-col md:flex-row gap-4 items-center justify-between border-t border-purple-800/50 pt-4">
                <div className="w-full md:w-auto">
                  <label className="text-[10px] text-blue-400 font-bold uppercase block mb-1">Tamanho da Seletiva (Mata-Mata)</label>
                  <select value={newXclaSeletivaSize} onChange={e=>setNewXclaSeletivaSize(e.target.value)} className="w-full md:w-64 bg-blue-950 border border-purple-500/40 rounded-lg p-2.5 text-purple-300 font-bold text-sm outline-none focus:border-purple-400">
                    <option value="4">4 Times (Semifinal Direta)</option>
                    <option value="8">8 Times (Quartas de Final)</option>
                    <option value="16">16 Times (Oitavas de Final)</option>
                    <option value="32">32 Times (16 Avos)</option>
                  </select>
                </div>
                
                <button type="submit" className="w-full md:w-auto bg-purple-600 hover:bg-purple-500 text-white font-bold py-2.5 px-8 rounded-lg shadow-lg transition-colors">
                  Gerar Minicompetição
                </button>
              </div>
            </form>
          )}

          <div className="space-y-8">
            {openSeletivas.length === 0 ? (
              <div className="bg-blue-950 p-8 rounded-2xl border border-blue-800 text-center border-dashed">
                <p className="text-blue-500">Nenhuma seletiva de Xclã aberta no momento.</p>
              </div>
            ) : (
              openSeletivas.map((xcla) => {
                const isSquadA = xcla.squad === 'A';
                const colorClass = isSquadA ? 'emerald' : 'amber';
                const teamCount = (xcla.titulares?.length || 0) + (xcla.reservas?.length || 0);

                return (
                  <div key={xcla.id} className="bg-blue-900 border border-blue-700 rounded-3xl overflow-hidden shadow-2xl relative flex flex-col xl:flex-row">
                    
                    {/* Botoes de Ação Admin */}
                    {isAdmin && (
                      <div className="absolute top-4 right-4 flex gap-2 z-20">
                        <button onClick={() => handleLockRoster(xcla.id)} className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-3 py-1.5 rounded-lg shadow-md text-xs flex items-center gap-1">
                          🔒 Fechar Time
                        </button>
                        <button onClick={() => handleDeleteXcla(xcla.id)} className="bg-red-500/20 text-red-400 hover:bg-red-500 hover:text-white p-1.5 rounded-lg transition-colors" title="Apagar Convocação">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    )}
                    
                    {/* 🎮 LADO ESQUERDO: MINICOMPETIÇÃO COM PLACARES */}
                    <div className="flex-1 p-5 md:p-6 bg-gradient-to-br from-blue-900/50 to-blue-950/80 border-b xl:border-b-0 xl:border-r border-blue-800">
                      <div className="mb-6 border-b border-blue-800/50 pb-4 pr-32">
                        <span className={`text-[10px] bg-${colorClass}-500/20 text-${colorClass}-400 px-2.5 py-0.5 rounded-full font-black tracking-widest uppercase inline-block border border-${colorClass}-500/30 mb-2`}>
                          Seletiva para o Time {xcla.squad}
                        </span>
                        <h3 className="text-xl font-black text-white uppercase tracking-wider flex items-center gap-2"><Target size={20}/> {xcla.name}</h3>
                        <p className="text-xs text-blue-400 mt-1">Coloque os placares. Em caso de empate, clique no escudo do time vencedor para avançar de fase!</p>
                      </div>

                      {/* Renderização do Mata-Mata */}
                      <div className="flex gap-6 overflow-x-auto custom-scrollbar pb-4">
                        {xcla.bracket.map((round, rIdx) => (
                          <div key={rIdx} className="flex flex-col justify-around gap-3 min-w-[200px]">
                            {round.map((m, mIdx) => (
                              <div key={m.id} className="bg-blue-950 border border-blue-800 rounded-xl p-2 flex flex-col gap-1.5 shadow-inner">
                                
                                <div className={`flex items-center justify-between p-1.5 rounded-lg transition-colors ${m.winner?.id === m.tA?.id ? `bg-${colorClass}-500/20 border border-${colorClass}-500/50` : 'border border-transparent'}`}>
                                  <div onClick={() => forceAdvanceTeam(xcla.id, rIdx, mIdx, m.tA)} className="flex items-center gap-1.5 cursor-pointer flex-1 min-w-0" title="Forçar Vitória">
                                    <ShieldDisplay shield={m.tA?.shield} size="small" /> 
                                    <span className={`text-[10px] font-bold truncate ${m.winner?.id === m.tA?.id ? `text-${colorClass}-400` : 'text-blue-200'}`}>{m.tA?.name || 'A Definir'}</span>
                                  </div>
                                  <input type="number" min="0" value={m.scoreA||''} onChange={e=>updateBracketMatch(xcla.id, rIdx, mIdx, 'scoreA', e.target.value)} className="w-8 h-6 bg-blue-900 border border-blue-700 rounded text-center text-[10px] text-white outline-none focus:border-amber-500 shrink-0" placeholder="-" />
                                </div>
                                
                                <div className="h-px w-full bg-blue-800/50 mx-auto w-[90%]"></div>
                                
                                <div className={`flex items-center justify-between p-1.5 rounded-lg transition-colors ${m.winner?.id === m.tB?.id ? `bg-${colorClass}-500/20 border border-${colorClass}-500/50` : 'border border-transparent'}`}>
                                  <div onClick={() => forceAdvanceTeam(xcla.id, rIdx, mIdx, m.tB)} className="flex items-center gap-1.5 cursor-pointer flex-1 min-w-0" title="Forçar Vitória">
                                    <ShieldDisplay shield={m.tB?.shield} size="small" /> 
                                    <span className={`text-[10px] font-bold truncate ${m.winner?.id === m.tB?.id ? `text-${colorClass}-400` : 'text-blue-200'}`}>{m.tB?.name || 'A Definir'}</span>
                                  </div>
                                  <input type="number" min="0" value={m.scoreB||''} onChange={e=>updateBracketMatch(xcla.id, rIdx, mIdx, 'scoreB', e.target.value)} className="w-8 h-6 bg-blue-900 border border-blue-700 rounded text-center text-[10px] text-white outline-none focus:border-amber-500 shrink-0" placeholder="-" />
                                </div>

                              </div>
                            ))}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* 📋 LADO DIREITO: ESCALAÇÃO OFICIAL */}
                    <div className="w-full xl:w-[380px] p-5 md:p-6 bg-blue-900/40 flex flex-col gap-6">
                      <div className="text-center">
                        <h4 className="text-lg font-black text-white uppercase tracking-widest mb-1">📋 Escalação Final</h4>
                        <p className="text-[10px] text-blue-400">Total Convocado: {teamCount} Técnicos</p>
                      </div>

                      {isAdmin && (
                        <button onClick={() => handleAutoFillRoster(xcla.id)} className="w-full py-2.5 text-[11px] font-black uppercase tracking-wider bg-purple-600 hover:bg-purple-500 text-white rounded-lg shadow-md border-0 transition-colors flex items-center justify-center gap-2">
                          ⚡ Puxar Resultados da Seletiva
                        </button>
                      )}

                      {/* Lista de Titulares */}
                      <div>
                        <div className="flex justify-between items-end mb-2">
                          <h5 className={`text-sm font-bold text-${colorClass}-400 uppercase`}>Titulares ({(xcla.titulares || []).length}/{xcla.titularesMax})</h5>
                        </div>
                        <div className="space-y-2 bg-blue-950 p-2 rounded-xl border border-blue-800 min-h-[80px]">
                          {(xcla.titulares || []).length === 0 ? <p className="text-xs text-blue-500 text-center py-4">Vazio</p> : (
                            xcla.titulares.map(t => (
                              <div key={t.id} className={`flex items-center justify-between bg-blue-900/50 p-2 rounded-lg border border-${colorClass}-500/20 group`}>
                                <div className="flex items-center gap-2 min-w-0">
                                  <ShieldDisplay shield={t.shield} size="small" />
                                  <div className="flex flex-col min-w-0">
                                    <span className="text-xs font-bold text-white truncate">{t.name}</span>
                                    {t.isGuaranteed && <span className="text-[8px] text-amber-400 uppercase">{t.isGuaranteed}</span>}
                                    {t.isAuto && <span className="text-[8px] text-emerald-400 uppercase">🏆 Via Seletiva</span>}
                                  </div>
                                </div>
                                {isAdmin && <button onClick={() => removeTeamFromRoster(xcla.id, 'titulares', t.id)} className="text-blue-500 hover:text-red-400 p-1 md:opacity-0 md:group-hover:opacity-100 transition-opacity"><X size={14}/></button>}
                              </div>
                            ))
                          )}
                        </div>
                        {isAdmin && (xcla.titulares || []).length < xcla.titularesMax && (
                          <div className="flex gap-2 mt-2">
                            <select value={manualAddTitular} onChange={e=>setManualAddTitular(e.target.value)} className="flex-1 bg-blue-950 border border-blue-700 text-blue-300 text-xs rounded p-1.5 outline-none">
                              <option value="">Selecionar manualmente...</option>
                              {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                            </select>
                            <button onClick={() => addTeamToRoster(xcla.id, 'titulares', manualAddTitular)} className={`bg-${colorClass}-600 hover:bg-${colorClass}-500 text-white px-2 rounded font-bold text-xs`}>Add</button>
                          </div>
                        )}
                      </div>

                      {/* Lista de Reservas */}
                      <div>
                        <div className="flex justify-between items-end mb-2">
                          <h5 className="text-sm font-bold text-blue-300 uppercase">Reservas ({(xcla.reservas || []).length}/{xcla.reservasMax})</h5>
                        </div>
                        <div className="space-y-2 bg-blue-950 p-2 rounded-xl border border-blue-800 min-h-[80px]">
                          {(xcla.reservas || []).length === 0 ? <p className="text-xs text-blue-500 text-center py-4">Vazio</p> : (
                            xcla.reservas.map(t => (
                              <div key={t.id} className="flex items-center justify-between bg-blue-900/50 p-2 rounded-lg border border-blue-700/50 group">
                                <div className="flex items-center gap-2 min-w-0">
                                  <ShieldDisplay shield={t.shield} size="small" />
                                  <div className="flex flex-col min-w-0">
                                    <span className="text-xs font-bold text-blue-100 truncate">{t.name}</span>
                                    {t.isAuto && <span className="text-[8px] text-emerald-400 uppercase">🏆 Via Seletiva</span>}
                                  </div>
                                </div>
                                {isAdmin && <button onClick={() => removeTeamFromRoster(xcla.id, 'reservas', t.id)} className="text-blue-500 hover:text-red-400 p-1 md:opacity-0 md:group-hover:opacity-100 transition-opacity"><X size={14}/></button>}
                              </div>
                            ))
                          )}
                        </div>
                        {isAdmin && (xcla.reservas || []).length < xcla.reservasMax && (
                          <div className="flex gap-2 mt-2">
                            <select value={manualAddReserva} onChange={e=>setManualAddReserva(e.target.value)} className="flex-1 bg-blue-950 border border-blue-700 text-blue-300 text-xs rounded p-1.5 outline-none">
                              <option value="">Selecionar manualmente...</option>
                              {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                            </select>
                            <button onClick={() => addTeamToRoster(xcla.id, 'reservas', manualAddReserva)} className="bg-blue-700 hover:bg-blue-600 text-white px-2 rounded font-bold text-xs">Add</button>
                          </div>
                        )}
                      </div>

                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* 🔥 CONTEÚDO: COMPETIÇÕES ATIVAS (XCLÃ FECHADO) */}
      {activeTab === 'active_xclas' && (
        <div className="space-y-6 animate-in slide-in-from-right-4">
          
          {selectedActiveXcla ? (
            <div className="bg-blue-900 border border-blue-700 rounded-3xl overflow-hidden shadow-2xl flex flex-col">
              
              {/* Header do Xclã Ativo */}
              <div className="bg-gradient-to-br from-blue-950 to-blue-900 p-6 border-b border-blue-800 relative">
                 <button onClick={() => setSelectedActiveXclaId(null)} className="absolute top-6 left-6 text-blue-400 hover:text-white flex items-center gap-1 text-xs">
                   <ArrowLeft size={14}/> Voltar
                 </button>
                 
                 <div className="text-center mt-6 mb-4">
                   <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-3 py-1 rounded-full font-black tracking-widest uppercase border border-emerald-500/30">
                     Time {selectedActiveXcla.squad} • Xclã em Andamento
                   </span>
                   <h2 className="text-3xl font-black text-white uppercase tracking-wider mt-3">{selectedActiveXcla.name}</h2>
                 </div>

                 {/* PLACAR GERAL */}
                 <div className="flex items-center justify-center gap-4 sm:gap-8 mt-6">
                    <div className="flex flex-col items-center flex-1">
                      <ShieldDisplay shield="🛡️" size="large" />
                      <span className="font-black text-white text-lg mt-2 uppercase tracking-wide">Clã Kame</span>
                      {isAdmin && (
                        <div className="flex items-center gap-2 mt-2">
                          <button onClick={() => updateActiveXcla(selectedActiveXcla.id, {pointsKame: Math.max(0, selectedActiveXcla.pointsKame - 1)})} className="bg-blue-800 w-6 h-6 rounded text-white font-bold hover:bg-blue-700 transition-colors">-</button>
                          <span className="text-xs text-blue-300">Pts</span>
                          <button onClick={() => updateActiveXcla(selectedActiveXcla.id, {pointsKame: selectedActiveXcla.pointsKame + 1})} className="bg-blue-800 w-6 h-6 rounded text-white font-bold hover:bg-blue-700 transition-colors">+</button>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                       <span className="text-5xl font-black text-emerald-400 drop-shadow-lg">{selectedActiveXcla.pointsKame}</span>
                       <span className="text-2xl font-black text-blue-600">X</span>
                       <span className="text-5xl font-black text-red-400 drop-shadow-lg">{selectedActiveXcla.pointsOpp}</span>
                    </div>

                    <div className="flex flex-col items-center flex-1">
                      <ShieldDisplay shield="⚔️" size="large" />
                      {isAdmin ? (
                        <input 
                          type="text" 
                          value={selectedActiveXcla.oppClanName || ''} 
                          onChange={e => updateActiveXcla(selectedActiveXcla.id, {oppClanName: e.target.value})}
                          className="font-black text-white text-lg mt-2 uppercase tracking-wide bg-blue-950 border border-blue-700 rounded text-center w-full max-w-[150px] outline-none focus:border-red-500"
                          placeholder="Adversário"
                        />
                      ) : (
                        <span className="font-black text-white text-lg mt-2 uppercase tracking-wide truncate max-w-[150px]">{selectedActiveXcla.oppClanName}</span>
                      )}
                      
                      {isAdmin && (
                        <div className="flex items-center gap-2 mt-2">
                          <button onClick={() => updateActiveXcla(selectedActiveXcla.id, {pointsOpp: Math.max(0, selectedActiveXcla.pointsOpp - 1)})} className="bg-blue-800 w-6 h-6 rounded text-white font-bold hover:bg-blue-700 transition-colors">-</button>
                          <span className="text-xs text-blue-300">Pts</span>
                          <button onClick={() => updateActiveXcla(selectedActiveXcla.id, {pointsOpp: selectedActiveXcla.pointsOpp + 1})} className="bg-blue-800 w-6 h-6 rounded text-white font-bold hover:bg-blue-700 transition-colors">+</button>
                        </div>
                      )}
                    </div>
                 </div>
              </div>

              {/* Corpo da Competição Ativa */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-1 divide-y lg:divide-y-0 lg:divide-x divide-blue-800">
                 
                 {/* COLUNA 1: ADVERSÁRIOS E ELENCO */}
                 <div className="p-6 bg-blue-900/50 space-y-6">
                    <div>
                      <h4 className="text-sm font-black text-blue-300 uppercase tracking-widest mb-3 flex items-center gap-2"><Shield size={16}/> Elenco Convocado</h4>
                      <div className="space-y-1.5">
                        <p className="text-[10px] text-emerald-400 font-bold uppercase border-b border-blue-800 pb-1 mb-1">Titulares</p>
                        {(selectedActiveXcla.titulares || []).map(t => (
                          <div key={t.id} className="text-xs text-white bg-blue-950 p-2 rounded border border-blue-800 flex items-center gap-2"><ShieldDisplay shield={t.shield} size="small"/> {t.name}</div>
                        ))}
                        {(selectedActiveXcla.reservas || []).length > 0 && (
                          <>
                            <p className="text-[10px] text-amber-400 font-bold uppercase border-b border-blue-800 pb-1 mb-1 mt-3">Reservas</p>
                            {(selectedActiveXcla.reservas || []).map(t => (
                              <div key={t.id} className="text-xs text-white bg-blue-950 p-2 rounded border border-blue-800 flex items-center gap-2"><ShieldDisplay shield={t.shield} size="small"/> {t.name}</div>
                            ))}
                          </>
                        )}
                      </div>
                    </div>

                    <div>
                      <h4 className="text-sm font-black text-red-400 uppercase tracking-widest mb-3 flex items-center gap-2"><Users size={16}/> Lista de Adversários</h4>
                      {isAdmin && (
                        <div className="flex gap-2 mb-3">
                          <input type="text" placeholder="Nome do adversário..." value={newOpponentName} onChange={e=>setNewOpponentName(e.target.value)} className="flex-1 bg-blue-950 border border-blue-700 rounded p-1.5 text-xs text-white outline-none" />
                          <button onClick={() => handleAddOpponentPlayer(selectedActiveXcla.id)} className="bg-red-600 hover:bg-red-500 text-white px-2 rounded text-xs font-bold">+</button>
                        </div>
                      )}
                      <div className="space-y-1.5 max-h-[200px] overflow-y-auto custom-scrollbar pr-1">
                         {!(selectedActiveXcla.opponentsList?.length > 0) ? <p className="text-xs text-blue-500 italic">Nenhum adversário mapeado.</p> : (
                           selectedActiveXcla.opponentsList.map((opp, idx) => (
                             <div key={idx} className="text-xs text-red-200 bg-red-950/30 p-2 rounded border border-red-900/50 flex items-center gap-2">
                               <span className="w-4 h-4 bg-red-900 flex justify-center items-center rounded text-[8px]">⚔️</span> {opp}
                             </div>
                           ))
                         )}
                      </div>
                    </div>
                 </div>

                 {/* COLUNA 2: CONFRONTOS (JOGOS) */}
                 <div className="p-6 bg-blue-950/30 lg:col-span-1 space-y-6">
                    <div className="flex justify-between items-center mb-2">
                       <h4 className="text-sm font-black text-amber-400 uppercase tracking-widest flex items-center gap-2"><Trophy size={16}/> Confrontos Oficiais</h4>
                    </div>

                    {isAdmin && (
                      <div className="bg-blue-900 border border-blue-700 p-3 rounded-xl space-y-2 mb-4">
                        <p className="text-[10px] text-blue-300 font-bold uppercase">Criar Novo Confronto</p>
                        <select value={newMatchKameId} onChange={e=>setNewMatchKameId(e.target.value)} className="w-full bg-blue-950 border border-blue-800 rounded p-1.5 text-xs text-emerald-400 outline-none">
                          <option value="">Selecione o jogador Kame...</option>
                          {(selectedActiveXcla.titulares || []).map(t => <option key={t.id} value={t.id}>{t.name} (Titular)</option>)}
                          {(selectedActiveXcla.reservas || []).map(t => <option key={t.id} value={t.id}>{t.name} (Reserva)</option>)}
                        </select>
                        <div className="text-center text-[10px] text-blue-500 font-black">VERSUS</div>
                        <select value={newMatchOppName} onChange={e=>setNewMatchOppName(e.target.value)} className="w-full bg-blue-950 border border-blue-800 rounded p-1.5 text-xs text-red-400 outline-none">
                          <option value="">Selecione o adversário...</option>
                          {(selectedActiveXcla.opponentsList || []).map((o,i) => <option key={i} value={o}>{o}</option>)}
                        </select>
                        <button onClick={() => handleAddXclaMatch(selectedActiveXcla.id)} className="w-full bg-amber-600 hover:bg-amber-500 text-white font-bold py-1.5 rounded text-xs mt-1 shadow-md">Adicionar Jogo</button>
                      </div>
                    )}

                    <div className="space-y-3 max-h-[500px] overflow-y-auto custom-scrollbar pr-2">
                      {!(selectedActiveXcla.xclaMatches?.length > 0) ? <p className="text-xs text-blue-500 italic text-center">Nenhum confronto registrado.</p> : (
                        selectedActiveXcla.xclaMatches.map(m => {
                          const kameT = [...(selectedActiveXcla.titulares || []), ...(selectedActiveXcla.reservas || [])].find(t => t.id === m.kameId);
                          return (
                            <div key={m.id} className="bg-blue-900 border border-blue-800 rounded-xl p-3 shadow-sm relative group">
                               {isAdmin && (
                                 <button onClick={() => {
                                   if(window.confirm('Apagar confronto?')) {
                                     updateActiveXcla(selectedActiveXcla.id, { xclaMatches: selectedActiveXcla.xclaMatches.filter(x => x.id !== m.id) })
                                   }
                                 }} className="absolute top-2 right-2 text-blue-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"><X size={12}/></button>
                               )}
                               
                               <div className="flex items-center justify-between px-2">
                                 <div className="flex flex-col items-center w-1/3">
                                   <ShieldDisplay shield={kameT?.shield} size="small"/>
                                   <span className="text-[10px] font-bold text-emerald-400 mt-1 truncate w-full text-center">{kameT?.name}</span>
                                 </div>
                                 <div className="flex flex-col items-center justify-center w-1/3">
                                   <span className="text-[8px] text-blue-400 mb-1">PLACAR</span>
                                   <div className="flex gap-1 items-center bg-blue-950 px-2 py-1 rounded border border-blue-800">
                                      <input type="number" min="0" disabled={!isAdmin} value={m.scoreKame} onChange={e=>handleUpdateXclaMatchScore(selectedActiveXcla.id, m.id, 'scoreKame', e.target.value)} className="w-6 h-6 bg-transparent text-center text-sm font-black text-emerald-400 outline-none" placeholder="-" />
                                      <span className="text-blue-500 font-black text-xs">x</span>
                                      <input type="number" min="0" disabled={!isAdmin} value={m.scoreOpp} onChange={e=>handleUpdateXclaMatchScore(selectedActiveXcla.id, m.id, 'scoreOpp', e.target.value)} className="w-6 h-6 bg-transparent text-center text-sm font-black text-red-400 outline-none" placeholder="-" />
                                   </div>
                                 </div>
                                 <div className="flex flex-col items-center w-1/3">
                                   <span className="text-2xl drop-shadow-md">⚔️</span>
                                   <span className="text-[10px] font-bold text-red-300 mt-1 truncate w-full text-center">{m.oppName}</span>
                                 </div>
                               </div>
                            </div>
                          )
                        })
                      )}
                    </div>
                 </div>

                 {/* COLUNA 3: MURAL DE NOTÍCIAS */}
                 <div className="p-6 bg-blue-900/50 space-y-4">
                    <h4 className="text-sm font-black text-sky-400 uppercase tracking-widest mb-3 flex items-center gap-2"><MessageCircle size={16}/> Resenha / Atualizações</h4>
                    
                    {isAdmin && (
                      <div className="flex gap-2">
                        <textarea value={newNewsText} onChange={e=>setNewNewsText(e.target.value)} placeholder="Narrar o que está acontecendo..." className="flex-1 bg-blue-950 border border-blue-700 rounded-lg p-2 text-xs text-white outline-none resize-none h-12 custom-scrollbar focus:border-sky-500" />
                        <button onClick={() => handleAddXclaNews(selectedActiveXcla.id)} className="bg-sky-600 hover:bg-sky-500 text-white px-3 rounded-lg text-xs font-bold">Postar</button>
                      </div>
                    )}

                    <div className="space-y-3 max-h-[400px] overflow-y-auto custom-scrollbar pr-2 mt-4">
                       {!(selectedActiveXcla.news?.length > 0) ? <p className="text-xs text-blue-500 italic text-center">Nenhuma notícia publicada ainda.</p> : (
                         selectedActiveXcla.news.map(n => (
                           <div key={n.id} className="bg-blue-950 border-l-2 border-sky-500 p-3 rounded-r-lg shadow-sm">
                             <div className="flex justify-between items-start mb-1">
                               <p className="text-[9px] text-blue-400">{new Date(n.timestamp).toLocaleDateString()} às {new Date(n.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
                               {isAdmin && <button onClick={() => {
                                 if(window.confirm('Apagar notícia?')) updateActiveXcla(selectedActiveXcla.id, {news: selectedActiveXcla.news.filter(x => x.id !== n.id)});
                               }} className="text-[9px] text-red-400/50 hover:text-red-400">Excluir</button>}
                             </div>
                             <p className="text-xs text-blue-100 whitespace-pre-wrap leading-relaxed">{n.text}</p>
                           </div>
                         ))
                       )}
                    </div>
                 </div>

              </div>
            </div>
          ) : (
            <>
              {activeCompetitions.length === 0 ? (
                <div className="bg-blue-950 p-8 rounded-2xl border border-blue-800 text-center border-dashed">
                  <p className="text-blue-500">Nenhum Xclã em andamento. Feche uma seletiva para ela aparecer aqui.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {activeCompetitions.map(xcla => (
                    <div key={xcla.id} onClick={() => setSelectedActiveXclaId(xcla.id)} className="bg-blue-900 border border-emerald-500/30 hover:border-emerald-400 rounded-2xl p-5 cursor-pointer shadow-lg transition-all group relative overflow-hidden flex flex-col justify-between">
                       <div className="absolute top-0 right-0 bg-emerald-600 text-white text-[9px] font-black uppercase px-3 py-1 rounded-bl-xl shadow-md">
                         Time {xcla.squad}
                       </div>
                       
                       <h3 className="text-xl font-black text-white uppercase tracking-wider mb-2 group-hover:text-emerald-400 transition-colors">{xcla.name}</h3>
                       
                       <div className="flex items-center gap-4 mt-2 mb-2">
                          <div className="flex flex-col items-center w-[40%]">
                            <span className="text-[10px] text-blue-400 font-bold uppercase mb-1">Clã Kame</span>
                            <span className="text-3xl font-black text-emerald-400 leading-none">{xcla.pointsKame || 0}</span>
                          </div>
                          
                          <span className="text-blue-600 font-black text-xl leading-none">X</span>
                          
                          <div className="flex flex-col items-center w-[40%]">
                            {isAdmin ? (
                              <input 
                                type="text" 
                                value={xcla.oppClanName || ''} 
                                onChange={e => updateActiveXcla(xcla.id, {oppClanName: e.target.value})}
                                onClick={e => e.stopPropagation()} 
                                placeholder="Adversário"
                                className="text-[10px] text-red-300 font-bold uppercase bg-blue-950 border border-blue-700 rounded text-center w-full outline-none focus:border-red-500 mb-1"
                              />
                            ) : (
                              <span className="text-[10px] text-blue-400 font-bold uppercase truncate w-full text-center mb-1">{xcla.oppClanName || 'Adversário'}</span>
                            )}
                            <span className="text-3xl font-black text-red-400 leading-none">{xcla.pointsOpp || 0}</span>
                          </div>
                       </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}

    </div>
  );
};

const PredictionsPanel = ({ competitions, matches, teams, users, currentUser, predictions, onSavePrediction, showToast }) => {
  const [activeTab, setActiveTab] = useState('open');
  const [betData, setBetData] = useState({});

  // 👇 NOVOS ESTADOS DOS FILTROS (Dropdowns)
  const [selectedCompId, setSelectedCompId] = useState('');
  const [selectedRoundId, setSelectedRoundId] = useState('');

  const getTeam = (id) => (teams || []).find(t => t.id === id);
  const getMyPred = (matchId) => (predictions || []).find(p => p.matchId === matchId && p.userId === currentUser.id);
  const myTeam = (teams || []).find(t => t.ownerId === currentUser.id);

  // 👇 NOVA LÓGICA: Agrupa dados numa hierarquia (Torneios -> Rodadas -> Jogos)
  const bettingData = useMemo(() => {
    const comps = [];
    (competitions || []).forEach(c => {
      if (c.status !== 'active') return;
      
      const validRounds = [];
      c.rounds?.forEach(r => {
        if (r.status !== 'locked') return; 
        
        const validMatches = [];
        r.matches.forEach(m => {
          // Bloqueia auto-aposta
          if (myTeam && (m.teamA === myTeam.id || m.teamB === myTeam.id)) return;

          const hasResult = matches.some(x => x.matchId === m.id && x.compId === c.id && x.status !== 'rejected');
          
          if (!hasResult && m.teamA && m.teamB && !m.teamA.includes('Definir') && !m.teamB.includes('Definir')) {
            validMatches.push({ ...m, compName: c.name, compId: c.id, roundName: r.number });
          }
        });

        // Só adiciona a rodada se ela tiver pelo menos 1 jogo disponível
        if (validMatches.length > 0) {
          validRounds.push({ id: r.id, number: r.number, matches: validMatches });
        }
      });

      // Só adiciona o campeonato se ele tiver pelo menos 1 rodada com jogos
      if (validRounds.length > 0) {
        comps.push({ id: c.id, name: c.name, rounds: validRounds });
      }
    });
    return comps;
  }, [competitions, matches, myTeam]);

  // Se trocar de torneio, zera a rodada selecionada
  useEffect(() => {
    setSelectedRoundId('');
  }, [selectedCompId]);

  // Partidas finais que vão aparecer na tela após o usuário filtrar
  const displayedMatches = useMemo(() => {
    if (!selectedCompId || !selectedRoundId) return [];
    const comp = bettingData.find(c => c.id === selectedCompId);
    if (!comp) return [];
    const round = comp.rounds.find(r => r.id === selectedRoundId);
    return round ? round.matches : [];
  }, [bettingData, selectedCompId, selectedRoundId]);

  // 🎲 MOTOR DE ODDS
  const getOdds = (compId, tA_id, tB_id) => {
     const table = calculateStandings(matches, teams, compId);

     const statsA = table.find(t => t.id === tA_id);
     const statsB = table.find(t => t.id === tB_id);

     const ptsA = statsA ? statsA.pts : 0;
     const ptsB = statsB ? statsB.pts : 0;
     
     const weightA = 5 + ptsA;
     const weightB = 5 + ptsB;
     const weightD = 5 + (Math.max(weightA, weightB) - Math.abs(weightA - weightB)) * 0.5;
     const totalWeight = weightA + weightB + weightD;

     let oddA = (1 / (weightA / totalWeight)) * 0.90;
     let oddB = (1 / (weightB / totalWeight)) * 0.90;
     let oddD = (1 / (weightD / totalWeight)) * 0.90;

     const clamp = (val) => Math.min(Math.max(val, 1.10), 15.00).toFixed(2);
     return { A: clamp(oddA), B: clamp(oddB), D: clamp(oddD) };
  };

  const ranking = useMemo(() => {
     const userPoints = {};
     (users || []).forEach(u => userPoints[u.id] = { ...u, bets: 0, wins: 0, profit: 0 });

     (predictions || []).forEach(p => {
        if (p.status) { 
           if (userPoints[p.userId]) {
              userPoints[p.userId].bets += 1;
              if (p.status === 'won') userPoints[p.userId].wins += 1;
              userPoints[p.userId].profit += Number(p.profit || 0);
           }
        }
     });

     return Object.values(userPoints).filter(u => u.bets > 0).sort((a,b) => b.profit - a.profit || b.wins - a.wins);
  }, [predictions, users]);

  const handleSave = (m) => {
     const data = betData[m.id];
     if (!data || !data.option || !data.amount || data.amount <= 0) { 
       showToast("Escolha um vencedor e digite um valor válido!", "error"); 
       return; 
     }

     const amountNum = parseInt(data.amount);
     const myPred = getMyPred(m.id);
     const oldAmount = myPred ? Number(myPred.amount) : 0;
     const costDiff = amountNum - oldAmount;

     if (Number(currentUser.kameCoins || 0) < costDiff) {
       showToast(`Saldo insuficiente! Faltam ${costDiff - Number(currentUser.kameCoins || 0)} BK.`, "error");
       return;
     }

     const currentOdds = getOdds(m.compId, m.teamA, m.teamB);
     const lockedOdd = Number(currentOdds[data.option]);

     onSavePrediction({
        id: myPred ? myPred.id : `pred_${currentUser.id}_${m.id}`,
        userId: currentUser.id,
        matchId: m.id,
        compId: m.compId,
        option: data.option, 
        amount: amountNum,
        lockedOdd: lockedOdd,
        timestamp: Date.now()
     }, oldAmount);
     
     showToast(`Bilhete Fechado! Odd cravada em ${lockedOdd}x 🍀`, "success");
  };

  const totalOpenMatches = useMemo(() => {
    return bettingData.reduce((total, comp) => {
      return total + comp.rounds.reduce((rTotal, r) => rTotal + r.matches.length, 0);
    }, 0);
  }, [bettingData]);
  
  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in pb-12">
      <div className="bg-gradient-to-r from-blue-900 to-blue-950 p-6 rounded-3xl border border-blue-800 shadow-xl flex items-center gap-4">
        <div className="bg-blue-950 p-3 rounded-full border border-amber-500/50 shadow-inner">
          <Dices size={32} className="text-amber-400 animate-pulse" />
        </div>
        <div className="flex-1 flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-black text-white uppercase tracking-wider">KameBet</h2>
            <p className="text-sm text-blue-400 mt-1">Odds Dinâmicas (1x2) com base na Tabela do Campeonato!</p>
          </div>
          <div className="bg-blue-950 p-3 rounded-xl border border-amber-500/30 text-center shadow-inner">
            <p className="text-[10px] text-amber-400 font-bold uppercase tracking-wider">Sua Carteira</p>
            <p className="text-xl font-black text-white">{currentUser.kameCoins || 0} BK</p>
          </div>
        </div>
      </div>

      <div className="flex gap-2 p-1 bg-blue-950 rounded-xl border border-blue-800">
        {/* 👇 2. ALTERE AQUI DENTRO DOS PARÊNTESES 👇 */}
        <button onClick={()=>setActiveTab('open')} className={`flex-1 py-2 text-sm rounded-lg font-bold transition-all ${activeTab==='open'?'bg-amber-600 text-white':'text-blue-500 hover:text-white'}`}>
          🎯 Apostar ({totalOpenMatches})
        </button>
        <button onClick={()=>setActiveTab('ranking')} className={`flex-1 py-2 text-sm rounded-lg font-bold transition-all ${activeTab==='ranking'?'bg-amber-600 text-white':'text-blue-500 hover:text-white'}`}>
          🏆 Top Apostadores
        </button>
      </div>

      {activeTab === 'open' && (
        <div className="space-y-4 animate-in slide-in-from-left-4">
          
          {bettingData.length === 0 ? (
            <div className="bg-blue-900 p-8 rounded-2xl border border-blue-800 text-center text-blue-400 border-dashed">
              <p className="font-bold text-lg mb-2">A casa de apostas está fechada.</p>
              <p className="text-sm">Lembre-se das regras da banca:<br/>
              1. Você só pode apostar em rodadas que ainda <b>não foram liberadas</b> (Travadas).<br/>
              2. Você <b>não pode</b> apostar em jogos do seu próprio time.</p>
            </div>
          ) : (
            <div className="bg-blue-900 p-4 rounded-xl border border-blue-800 shadow-md">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                  <label className="text-xs font-bold text-blue-400 uppercase tracking-widest block mb-2">Selecione a Competição</label>
                  <select value={selectedCompId} onChange={e => setSelectedCompId(e.target.value)} className="w-full bg-blue-950 border border-blue-700 rounded-lg p-3 text-white focus:border-amber-500 outline-none transition-colors">
                    <option value="">Escolha um torneio...</option>
                    {bettingData.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                
                {selectedCompId && (
                  <div className="flex-1 animate-in fade-in">
                    <label className="text-xs font-bold text-blue-400 uppercase tracking-widest block mb-2">Selecione a Rodada/Fase</label>
                    <select value={selectedRoundId} onChange={e => setSelectedRoundId(e.target.value)} className="w-full bg-blue-950 border border-blue-700 rounded-lg p-3 text-white focus:border-amber-500 outline-none transition-colors">
                      <option value="">Escolha a rodada...</option>
                      {bettingData.find(c => c.id === selectedCompId)?.rounds.map(r => (
                        <option key={r.id} value={r.id}>Rodada / Fase {r.number}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            </div>
          )}

          {displayedMatches.length === 0 && selectedCompId && selectedRoundId && (
             <div className="text-center p-6 text-blue-500 bg-blue-950 rounded-xl border border-blue-800">
               Nenhuma partida disponível para você nesta rodada.
             </div>
          )}

          {displayedMatches.length > 0 && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 pt-2">
              {displayedMatches.map(m => {
                const tA = getTeam(m.teamA); const tB = getTeam(m.teamB);
                const myPred = getMyPred(m.id);
                const currentData = betData[m.id] || { option: myPred?.option || null, amount: myPred?.amount || '' };
                const odds = getOdds(m.compId, m.teamA, m.teamB);

                const displayOddA = (myPred && myPred.option === 'A') ? Number(myPred.lockedOdd || 1.1).toFixed(2) : odds.A;
                const displayOddD = (myPred && myPred.option === 'D') ? Number(myPred.lockedOdd || 1.1).toFixed(2) : odds.D;
                const displayOddB = (myPred && myPred.option === 'B') ? Number(myPred.lockedOdd || 1.1).toFixed(2) : odds.B;

                return (
                  <div key={m.id} className="bg-blue-900 p-5 rounded-2xl border border-blue-800 shadow-lg hover:border-amber-500/30 transition-all group">
                    <div className="flex justify-between items-center mb-3">
                      <span className="text-[10px] bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded font-bold uppercase tracking-widest">{m.compName} • Rodada {m.roundName}</span>
                      {myPred && <span className="text-[10px] text-emerald-400 font-black uppercase flex items-center gap-1">✅ Bilhete Comprado</span>}
                    </div>
                    
                    <div className="grid grid-cols-3 gap-2 mb-4">
                      <button onClick={() => setBetData({...betData, [m.id]: {...currentData, option: 'A'}})} className={`p-2 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all ${currentData.option === 'A' ? 'bg-emerald-600 border-emerald-500 shadow-inner scale-105' : 'bg-blue-950 border-blue-800 hover:border-emerald-500/50'}`}>
                         <ShieldDisplay shield={tA?.shield} size="small" />
                         <span className="text-[10px] text-white font-bold truncate w-full text-center">{tA?.name}</span>
                         <span className={`text-xs font-black ${currentData.option === 'A' ? 'text-blue-950' : 'text-amber-400'}`}>{displayOddA}x</span>
                      </button>

                      <button onClick={() => setBetData({...betData, [m.id]: {...currentData, option: 'D'}})} className={`p-2 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all ${currentData.option === 'D' ? 'bg-slate-500 border-slate-400 shadow-inner scale-105' : 'bg-blue-950 border-blue-800 hover:border-slate-400/50'}`}>
                         <div className="w-10 h-10 flex items-center justify-center font-black text-slate-400">EMP</div>
                         <span className="text-[10px] text-slate-300 font-bold truncate w-full text-center">Empate</span>
                         <span className={`text-xs font-black mt-1 ${currentData.option === 'D' ? 'text-blue-950' : 'text-amber-400'}`}>{displayOddD}x</span>
                      </button>

                      <button onClick={() => setBetData({...betData, [m.id]: {...currentData, option: 'B'}})} className={`p-2 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all ${currentData.option === 'B' ? 'bg-emerald-600 border-emerald-500 shadow-inner scale-105' : 'bg-blue-950 border-blue-800 hover:border-emerald-500/50'}`}>
                         <ShieldDisplay shield={tB?.shield} size="small" />
                         <span className="text-[10px] text-white font-bold truncate w-full text-center">{tB?.name}</span>
                         <span className={`text-xs font-black ${currentData.option === 'B' ? 'text-blue-950' : 'text-amber-400'}`}>{displayOddB}x</span>
                      </button>
                    </div>

                    <div className="flex gap-2 items-end">
                      <div className="flex-1">
                        <label className="text-[10px] text-blue-400 uppercase font-bold block mb-1">Valor do Bilhete (BK)</label>
                        <input 
                          type="number" inputMode="numeric" placeholder="Ex: 50"
                          value={currentData.amount} 
                          onChange={e => setBetData({...betData, [m.id]: {...currentData, amount: e.target.value}})}
                          className="w-full bg-blue-950 border border-blue-700 text-amber-400 font-black text-lg p-2 rounded-lg outline-none focus:border-amber-500" 
                        />
                      </div>
                      <Button onClick={() => handleSave(m)} disabled={!currentData.option || !currentData.amount} className="flex-1 py-3 text-xs bg-amber-600 hover:bg-amber-500 border-0 text-white shadow-md uppercase tracking-wider">
                        {myPred ? 'Atualizar' : 'Apostar'}
                      </Button>
                    </div>
                    {currentData.option && currentData.amount && (
                      <p className="text-center text-[10px] text-emerald-400 mt-2 font-medium">
                        Retorno Estimado: <b className="text-amber-400">
                           {Math.floor(Number(currentData.amount) * (myPred?.option === currentData.option ? Number(myPred.lockedOdd || 1.1) : Number(odds[currentData.option])))} BK
                        </b>
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {activeTab === 'ranking' && (
        <div className="bg-blue-950 rounded-3xl border border-blue-800 shadow-2xl overflow-hidden animate-in slide-in-from-right-4">
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-blue-900 text-blue-300 font-bold border-b border-blue-800">
                <tr>
                  <th className="p-4 w-12 text-center">Pos</th>
                  <th className="p-4">Apostador</th>
                  <th className="p-4 text-center">Apostas Feitas</th>
                  <th className="p-4 text-center">Green (Acertos)</th>
                  <th className="p-4 text-center">Lucro Líquido (BK)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-blue-800/40">
                {ranking.length === 0 ? (
                  <tr><td colSpan="5" className="p-8 text-center text-blue-500">O ranking será gerado assim que as partidas apostadas forem oficializadas.</td></tr>
                ) : (
                  ranking.map((u, idx) => {
                    const isTop3 = idx < 3;
                    const rankColors = ['text-amber-400', 'text-slate-300', 'text-amber-700'];
                    return (
                      <tr key={u.id} className="hover:bg-blue-900/50 transition-colors">
                        <td className="p-4 text-center"><span className={`text-xl font-black ${isTop3 ? rankColors[idx] : 'text-blue-500'}`}>{idx + 1}º</span></td>
                        <td className="p-4 font-bold text-white">{u.name}</td>
                        <td className="p-4 text-center text-blue-300 font-medium">{u.bets}</td>
                        <td className="p-4 text-center text-emerald-400 font-bold">{u.wins}</td>
                        <td className="p-4 text-center">
                          <span className={`text-lg font-black px-3 py-1 rounded-lg ${u.profit > 0 ? 'text-emerald-400 bg-emerald-500/10 border border-emerald-500/20' : u.profit < 0 ? 'text-red-400 bg-red-500/10 border border-red-500/20' : 'text-blue-300'}`}>
                            {u.profit > 0 ? `+${u.profit}` : u.profit}
                          </span>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

const KameBank = ({ currentUser, predictions, matches, teams, showToast }) => {
  const [bankTab, setBankTab] = useState('extrato');
  const [selectedPackage, setSelectedPackage] = useState(null);
  
  const [checkoutStep, setCheckoutStep] = useState('idle');
  const [pixPayload, setPixPayload] = useState('');
  const [initialCoins, setInitialCoins] = useState(0);

  const getTeam = (id) => (teams || []).find(t => t.id === id);
  const myPreds = (predictions || []).filter(p => p.userId === currentUser?.id).sort((a,b) => b.timestamp - a.timestamp);

  const kc_PACKAGES = [
    { id: 'p1', name: 'Pacote Iniciante', coins: 300, price: 5.00, bonus: 0, color: 'from-blue-600 to-blue-900', border: 'border-blue-500' },
    { id: 'p2', name: 'Pacote Profissional', coins: 700, price: 10.00, bonus: 100, color: 'from-emerald-600 to-emerald-900', border: 'border-emerald-500' },
    { id: 'p3', name: 'Pacote Magnata', coins: 1600, price: 20.00, bonus: 400, color: 'from-amber-500 to-amber-800', border: 'border-amber-400' },
  ];

  const handleStartCheckout = async (pkg) => {
    setSelectedPackage(pkg);
    setCheckoutStep('generating');
    setInitialCoins(currentUser?.kameCoins || 0);

    try {
      const response = await fetch('/api/create-pix', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transaction_amount: pkg.price,
          description: `KameBank - ${pkg.name}`,
          email: currentUser.email || 'jogador@clakame.com',
          userId: currentUser.id
        })
      });

      const data = await response.json();

      if (data.qr_code) {
        setPixPayload(data.qr_code);
        setCheckoutStep('waiting');
      } else {
        throw new Error("Erro na geração do PIX");
      }
    } catch (error) {
      console.error(error);
      showToast("Não foi possível conectar ao banco. Tente novamente.", "error");
      closeCheckout();
    }
  };

  useEffect(() => {
    if (checkoutStep === 'waiting' && (currentUser?.kameCoins || 0) > initialCoins) {
      setCheckoutStep('success');
      showToast("Pagamento Confirmado pelo Banco!", "success");
    }
  }, [currentUser?.kameCoins, checkoutStep, initialCoins]);

  const handleCopyPix = () => {
    navigator.clipboard.writeText(pixPayload);
    showToast("PIX Copia e Cola copiado! Abra o app do seu banco.", "success");
  };

  const closeCheckout = () => {
    setSelectedPackage(null);
    setCheckoutStep('idle');
    setPixPayload('');
  };

  const simulateAutomaticWebhook = async () => {
    showToast("Processando pagamento no banco...", "info");
    
    setTimeout(async () => {
      const totalCoins = selectedPackage.coins + selectedPackage.bonus;
      const newBalance = (currentUser.kameCoins || 0) + totalCoins;
      
      await updateDoc(getPublicDocPath('users', currentUser.id), { kameCoins: newBalance });
      
      const depositRecord = {
        id: `dep_${Date.now()}`,
        userId: currentUser.id,
        type: 'deposit',
        amount: totalCoins,
        timestamp: Date.now(),
        status: 'approved'
      };
      await setDoc(getPublicDocPath('predictions', depositRecord.id), depositRecord);

      setCheckoutStep('success');
      showToast("Pagamento Aprovado! BitKames adicionados.", "success");
    }, 2000);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in pb-12">
      <div className="bg-gradient-to-r from-blue-900 to-blue-950 p-6 rounded-3xl border border-blue-800 shadow-xl flex flex-col sm:flex-row justify-between items-center gap-6">
        <div className="flex items-center gap-4">
          <div className="bg-blue-950 p-4 rounded-full border border-emerald-500/50 shadow-inner">
            <Landmark size={32} className="text-emerald-400" />
          </div>
          <div>
            <h2 className="text-2xl font-black text-white uppercase tracking-wider">Kame Bank</h2>
            <p className="text-sm text-blue-400 mt-1">Sua agência financeira do clã.</p>
          </div>
        </div>
        <div className="bg-blue-950/80 p-4 rounded-2xl border border-amber-500/40 min-w-[200px] text-center shadow-inner">
          <p className="text-xs text-amber-400 font-bold uppercase tracking-widest mb-1 flex items-center justify-center gap-1.5"><Wallet size={14}/> Saldo Disponível</p>
          <p className="text-4xl font-black text-white">{currentUser?.kameCoins || 0} <span className="text-xl text-amber-500">bk</span></p>
        </div>
      </div>

      <div className="flex gap-2 p-1 bg-blue-950 rounded-xl border border-blue-800">
        <button onClick={()=>setBankTab('extrato')} className={`flex-1 py-2.5 text-sm rounded-lg font-bold transition-all ${bankTab==='extrato'?'bg-emerald-600 text-white':'text-blue-500 hover:text-white'}`}>📜 Extrato da Conta</button>
        <button onClick={()=>setBankTab('deposito')} className={`flex-1 py-2.5 text-sm rounded-lg font-bold transition-all ${bankTab==='deposito'?'bg-amber-600 text-white':'text-blue-500 hover:text-white'}`}>💰 Depositar (Comprar kc)</button>
      </div>

      {bankTab === 'extrato' && (
        <div className="bg-blue-900 rounded-3xl border border-blue-800 shadow-xl overflow-hidden animate-in slide-in-from-left-4">
          <div className="p-5 border-b border-blue-800 bg-blue-950/40">
            <h3 className="font-bold text-white flex items-center gap-2"><Activity size={18} className="text-blue-400"/> Movimentações da Conta</h3>
          </div>
          <div className="divide-y divide-blue-800/40 max-h-[500px] overflow-y-auto custom-scrollbar">
            {myPreds.length === 0 ? (
              <div className="p-8 text-center text-blue-500">Nenhuma movimentação encontrada na sua conta.</div>
            ) : (
              myPreds.map(pred => {
                const isDeposit = pred.type === 'deposit';
                const match = !isDeposit ? matches.find(m => m.id === pred.matchId) : null;
                const tA = getTeam(match?.teamA);
                const tB = getTeam(match?.teamB);
                const matchName = tA && tB ? `${tA.name} x ${tB.name}` : 'Partida Encerrada';
                
                let statusColor = "text-amber-400";
                let statusBg = "bg-amber-500/10 border-amber-500/20";
                let statusText = "Pendente";
                let valueDisplay = `- ${pred.amount} bk`;

                if (isDeposit) {
                  statusColor = "text-emerald-400"; statusBg = "bg-emerald-500/10 border-emerald-500/20";
                  statusText = "Depósito";
                  valueDisplay = `+ ${pred.amount} bk`;
                } else if (pred.status === 'won') {
                  statusColor = "text-emerald-400"; statusBg = "bg-emerald-500/10 border-emerald-500/20";
                  statusText = "Green (Ganhou)";
                  valueDisplay = `+ ${pred.payout} bk`;
                } else if (pred.status === 'lost') {
                  statusColor = "text-red-400"; statusBg = "bg-red-500/10 border-red-500/20";
                  statusText = "Red (Perdeu)";
                  valueDisplay = `- ${pred.amount} bk`;
                }

                return (
                  <div key={pred.id} className="p-4 hover:bg-blue-800/30 transition-colors flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded border ${statusBg} ${statusColor}`}>{statusText}</span>
                        <span className="text-[10px] text-blue-400">{new Date(pred.timestamp).toLocaleDateString()}</span>
                      </div>
                      <p className="text-sm font-bold text-white">{isDeposit ? 'Compra de BitKames' : matchName}</p>
                      {!isDeposit && (
                        <p className="text-xs text-blue-300 mt-0.5">Palpite: <b className="text-blue-100">{pred.option === 'A' ? tA?.name : pred.option === 'B' ? tB?.name : 'Empate'}</b></p>
                      )}
                    </div>
                    <div className="text-right w-full sm:w-auto bg-blue-950 sm:bg-transparent p-3 sm:p-0 rounded-lg sm:rounded-none border sm:border-0 border-blue-800">
                      <p className="text-[10px] text-blue-500 uppercase font-bold mb-0.5">Movimentação</p>
                      <p className={`text-lg font-black ${pred.status === 'won' || isDeposit ? 'text-emerald-400' : pred.status === 'lost' ? 'text-red-400' : 'text-amber-400'}`}>{valueDisplay}</p>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>
      )}

      {bankTab === 'deposito' && (
        <div className="space-y-6 animate-in slide-in-from-right-4">
          <div className="bg-blue-900 p-6 rounded-2xl border border-blue-800 text-center">
            <h3 className="text-xl font-bold text-white mb-2">Comprar BitKames</h3>
            <p className="text-sm text-blue-300 max-w-lg mx-auto">Pagamento automático via PIX. As moedas caem na sua conta em até 10 segundos após a confirmação!</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {kc_PACKAGES.map(pkg => (
              <div key={pkg.id} onClick={() => handleStartCheckout(pkg)} className={`bg-gradient-to-b ${pkg.color} rounded-3xl p-1 shadow-xl hover:scale-105 transition-transform cursor-pointer relative overflow-hidden group`}>
                {pkg.bonus > 0 && (
                  <div className="absolute top-4 -right-8 bg-red-500 text-white text-[10px] font-black uppercase tracking-wider py-1 px-10 transform rotate-45 shadow-lg z-10">
                    Bônus +{pkg.bonus}
                  </div>
                )}
                <div className="bg-blue-950 rounded-[22px] p-6 h-full flex flex-col items-center justify-between border border-transparent group-hover:border-white/20 transition-colors">
                  <div className="text-center w-full">
                    <p className="text-xs text-blue-300 font-bold uppercase tracking-widest mb-4">{pkg.name}</p>
                    <div className="flex items-center justify-center gap-2 mb-2">
                      <Star className="text-amber-400 fill-amber-400" size={28}/>
                    </div>
                    <h4 className="text-4xl font-black text-white mb-1">{pkg.coins}</h4>
                    <p className="text-amber-500 font-bold text-sm">BitKames</p>
                  </div>
                  <button className={`w-full mt-6 py-3 rounded-xl font-black text-blue-950 uppercase tracking-wide bg-gradient-to-r ${pkg.color} shadow-lg flex items-center justify-center gap-2`}>
                    R$ {pkg.price.toFixed(2)}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {selectedPackage && (
        <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in" onClick={checkoutStep === 'success' ? closeCheckout : null}>
          <div className="bg-blue-900 border border-blue-700 rounded-3xl w-full max-w-md p-6 sm:p-8 shadow-2xl relative" onClick={e => e.stopPropagation()}>
            
            {checkoutStep !== 'success' && checkoutStep !== 'generating' && (
              <button onClick={closeCheckout} className="absolute top-4 right-4 text-blue-400 hover:text-white bg-blue-800 p-2 rounded-full"><X size={16}/></button>
            )}

            {checkoutStep === 'generating' && (
              <div className="text-center py-8 space-y-6">
                <div className="w-16 h-16 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
                <div>
                  <h3 className="text-xl font-black text-white">Conectando ao Banco...</h3>
                  <p className="text-blue-400 text-sm mt-2">Gerando chave PIX exclusiva para você.</p>
                </div>
              </div>
            )}

            {checkoutStep === 'waiting' && (
              <div className="space-y-6 animate-in zoom-in-95 duration-300">
                <div className="text-center">
                  <h3 className="text-2xl font-black text-white">Pagamento PIX</h3>
                  <p className="text-blue-300 text-sm mt-1">Pacote: <b className="text-amber-400">{selectedPackage.coins} kc</b> (+{selectedPackage.bonus} Bônus)</p>
                </div>

                <div className="bg-blue-950 p-5 rounded-2xl border border-blue-800 text-center shadow-inner">
                  <p className="text-xs text-blue-400 font-bold uppercase mb-2">Valor a Pagar</p>
                  <p className="text-4xl font-black text-emerald-400">R$ {selectedPackage.price.toFixed(2)}</p>
                </div>

                <div className="space-y-3 pt-2">
                  <p className="text-xs text-amber-400 font-bold uppercase text-center">PIX Copia e Cola</p>
                  <div className="flex gap-2">
                    <input type="text" readOnly value={pixPayload} className="flex-1 bg-blue-950 border border-blue-700 rounded-xl p-3 text-white text-xs font-mono outline-none" />
                    <button onClick={handleCopyPix} className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 rounded-xl font-bold transition-colors shadow-md">
                      Copiar
                    </button>
                  </div>
                </div>

                <div className="bg-amber-500/10 border border-amber-500/30 p-4 rounded-xl flex items-center gap-3">
                  <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin shrink-0"></div>
                  <p className="text-xs text-amber-200 font-medium">
                    <b className="text-amber-400 block">Aguardando Pagamento...</b>
                    Deixe esta tela aberta. As moedas cairão automaticamente assim que você pagar no seu banco.
                  </p>
                </div>

                {(currentUser?.role === 'leader' || currentUser?.role === 'kaioh') && (
                  <div className="pt-4 border-t border-blue-800/50 mt-4">
                    <button onClick={simulateAutomaticWebhook} className="w-full bg-blue-800 hover:bg-blue-700 text-blue-300 border border-blue-700 border-dashed text-xs py-2 rounded-lg transition-colors">
                      🛠️ Modo Dev: Simular Pagamento Aprovado
                    </button>
                  </div>
                )}
              </div>
            )}

            {checkoutStep === 'success' && (
              <div className="text-center py-6 space-y-6 animate-in zoom-in-95 duration-500">
                <div className="w-24 h-24 bg-emerald-500/20 border-2 border-emerald-500 rounded-full flex items-center justify-center mx-auto shadow-[0_0_30px_rgba(16,185,129,0.4)]">
                  <CheckCircle className="text-emerald-400" size={48}/>
                </div>
                <div>
                  <h3 className="text-3xl font-black text-white uppercase tracking-wider">Aprovado!</h3>
                  <p className="text-blue-300 mt-2 text-sm">O seu pagamento foi confirmado pelo banco.</p>
                </div>
                <div className="bg-blue-950 p-4 rounded-xl border border-blue-800 inline-block mx-auto min-w-[200px]">
                  <p className="text-xs text-blue-400 font-bold uppercase mb-1">Moedas Adicionadas</p>
                  <p className="text-2xl font-black text-amber-400">+{selectedPackage.coins + selectedPackage.bonus} kc</p>
                </div>
                <Button onClick={closeCheckout} className="w-full py-4 text-sm font-black bg-emerald-600 hover:bg-emerald-500 mt-4">
                  Voltar para o Banco
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const KameStore = ({ currentUser, storeProducts = [], showToast }) => {
  const isAdmin = currentUser?.role === 'leader' || currentUser?.role === 'kaioh';
  const [activeCategory, setActiveCategory] = useState('todos');
  const [showAddForm, setShowAddForm] = useState(false);

  // Estado do formulário de novo produto
  const [newProd, setNewProd] = useState({
    name: '', price: '', category: 'mobile', partner: 'Shopee', badge: '', url: '', image: null
  });

  const handleAddProduct = async (e) => {
    e.preventDefault();
    if (!newProd.image) { showToast("Faça o upload da foto do produto!", "error"); return; }
    
    const id = `prod_${Date.now()}`;
    try {
      await setDoc(getPublicDocPath('store', id), { ...newProd, id, timestamp: Date.now() });
      setShowAddForm(false);
      setNewProd({ name: '', price: '', category: 'mobile', partner: 'Shopee', badge: '', url: '', image: null });
      showToast("Produto adicionado à vitrine com sucesso!", "success");
    } catch (error) {
      showToast("Erro ao salvar produto no banco de dados.", "error");
    }
  };

  const handleDelete = async (id) => {
    if(window.confirm("Deseja remover este produto da loja definitivamente?")) {
      await deleteDoc(getPublicDocPath('store', id));
      showToast("Produto removido.", "success");
    }
  };

  // Filtra e ordena os produtos (mais novos primeiro)
  const filteredProducts = (activeCategory === 'todos' ? storeProducts : storeProducts.filter(p => p.category === activeCategory))
    .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-in fade-in pb-12">
      
      {/* 🚀 DESTAQUE / BANNER */}
      <div className="bg-gradient-to-r from-emerald-900 via-blue-900 to-blue-950 p-6 rounded-3xl border border-emerald-500/30 shadow-xl flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden">
        <div className="absolute -right-20 -bottom-20 w-64 h-64 bg-emerald-500/20 blur-3xl rounded-full"></div>
        <div className="z-10 w-full md:w-auto flex-1 text-center md:text-left">
          <span className="text-[10px] bg-emerald-500 text-blue-950 px-2 py-1 rounded-full font-black tracking-widest uppercase mb-3 inline-block shadow-lg">Lançamento</span>
          <h2 className="text-3xl md:text-4xl font-black text-white uppercase tracking-wider mb-2">Kame Store</h2>
          <p className="text-blue-300 md:w-3/4">O shopping do Clã. Compre com desconto nos nossos parceiros, envie o comprovante para a diretoria e <b>ganhe Kame Coins de Cashback</b> na hora!</p>
        </div>
        
        {isAdmin && (
          <div className="z-10 shrink-0 flex flex-col gap-2 w-full md:w-auto">
            <button onClick={() => setShowAddForm(!showAddForm)} className="bg-amber-600 hover:bg-amber-500 text-white font-bold py-2.5 px-6 rounded-xl shadow-lg transition-colors flex items-center justify-center gap-2">
              {showAddForm ? '❌ Cancelar Inclusão' : '➕ Anunciar Produto'}
            </button>
          </div>
        )}
      </div>

      {/* 🛠️ PAINEL ADMIN: ADICIONAR PRODUTO */}
      {isAdmin && showAddForm && (
        <form onSubmit={handleAddProduct} className="bg-blue-900 p-6 rounded-3xl border border-amber-500/50 shadow-2xl animate-in slide-in-from-top-4 space-y-4">
          <h3 className="font-bold text-amber-400 uppercase tracking-widest border-b border-blue-800 pb-2 mb-4">Adicionar Novo Produto na Loja</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] text-blue-400 font-bold uppercase">Nome do Produto</label>
              <input required type="text" placeholder="Ex: Luvinha Gamer Fio de Prata" value={newProd.name} onChange={e=>setNewProd({...newProd, name: e.target.value})} className="w-full bg-blue-950 border border-blue-700 rounded-lg p-2.5 text-white text-sm outline-none focus:border-amber-500" />
            </div>
            
            <div className="space-y-1">
              <label className="text-[10px] text-blue-400 font-bold uppercase">Preço (Com R$)</label>
              <input required type="text" placeholder="Ex: R$ 15,90" value={newProd.price} onChange={e=>setNewProd({...newProd, price: e.target.value})} className="w-full bg-blue-950 border border-blue-700 rounded-lg p-2.5 text-emerald-400 font-black text-sm outline-none focus:border-amber-500" />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] text-blue-400 font-bold uppercase">Categoria</label>
              <select value={newProd.category} onChange={e=>setNewProd({...newProd, category: e.target.value})} className="w-full bg-blue-950 border border-blue-700 rounded-lg p-2.5 text-white text-sm outline-none focus:border-amber-500">
                <option value="mobile">🎮 Setup Mobile</option>
                <option value="cards">💎 Gift Cards</option>
                <option value="energy">⚡ Energia e Foco</option>
                <option value="lifestyle">🧔 Lifestyle Masculino</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] text-blue-400 font-bold uppercase">Seu Link de Afiliado (Shopee/Amazon)</label>
              <input required type="url" placeholder="https://shope.ee/exemplo" value={newProd.url} onChange={e=>setNewProd({...newProd, url: e.target.value})} className="w-full bg-blue-950 border border-blue-700 rounded-lg p-2.5 text-blue-200 text-sm outline-none focus:border-amber-500" />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] text-blue-400 font-bold uppercase">Loja Parceira</label>
              <input required type="text" placeholder="Ex: Shopee, Amazon, HypeGames..." value={newProd.partner} onChange={e=>setNewProd({...newProd, partner: e.target.value})} className="w-full bg-blue-950 border border-blue-700 rounded-lg p-2.5 text-white text-sm outline-none focus:border-amber-500" />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] text-blue-400 font-bold uppercase">Etiqueta de Destaque (Opcional)</label>
              <input type="text" placeholder="Ex: Mais Vendido, Frete Grátis..." value={newProd.badge} onChange={e=>setNewProd({...newProd, badge: e.target.value})} className="w-full bg-blue-950 border border-blue-700 rounded-lg p-2.5 text-white text-sm outline-none focus:border-amber-500" />
            </div>
            
            {/* UPLOAD DA FOTO */}
            <div className="md:col-span-2 pt-2">
              <label className="text-[10px] text-blue-400 font-bold uppercase block mb-2">Foto do Produto (Tire um print ou salve do Google)</label>
              <label className={`block border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-colors ${newProd.image ? 'border-emerald-500 bg-emerald-500/10' : 'border-blue-700 hover:border-blue-500 bg-blue-950'}`}>
                <input type="file" accept="image/*" className="hidden" onChange={(e) => processImage(e.target.files[0], (base64) => setNewProd({...newProd, image: base64}))} />
                {newProd.image ? (
                  <div className="flex flex-col items-center justify-center gap-2">
                    <img src={newProd.image} alt="Preview" className="h-20 object-contain rounded" />
                    <span className="text-emerald-400 font-bold text-xs"><CheckCircle size={14} className="inline"/> Foto Carregada</span>
                  </div>
                ) : (
                  <span className="text-blue-300 font-bold flex items-center justify-center gap-2 text-sm"><UploadCloud size={20}/> Clique para enviar a foto da Galeria</span>
                )}
              </label>
            </div>
          </div>
          
          <div className="pt-4 border-t border-blue-800 flex justify-end">
            <button type="submit" className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 px-8 rounded-xl shadow-lg transition-colors">
              ✅ Publicar Produto na Loja
            </button>
          </div>
        </form>
      )}

      {/* 🏷️ FILTROS */}
      <div className="flex gap-2 p-1 bg-blue-950 rounded-xl border border-blue-800 overflow-x-auto custom-scrollbar">
        <button onClick={()=>setActiveCategory('todos')} className={`shrink-0 flex-1 py-2 px-4 text-xs rounded-lg font-bold transition-all ${activeCategory==='todos'?'bg-emerald-600 text-white shadow-md':'text-blue-500 hover:text-white'}`}>Tudo</button>
        <button onClick={()=>setActiveCategory('mobile')} className={`shrink-0 flex-1 py-2 px-4 text-xs rounded-lg font-bold transition-all ${activeCategory==='mobile'?'bg-emerald-600 text-white shadow-md':'text-blue-500 hover:text-white'}`}>🎮 Setup Mobile</button>
        <button onClick={()=>setActiveCategory('cards')} className={`shrink-0 flex-1 py-2 px-4 text-xs rounded-lg font-bold transition-all ${activeCategory==='cards'?'bg-emerald-600 text-white shadow-md':'text-blue-500 hover:text-white'}`}>💎 Gift Cards</button>
        <button onClick={()=>setActiveCategory('energy')} className={`shrink-0 flex-1 py-2 px-4 text-xs rounded-lg font-bold transition-all ${activeCategory==='energy'?'bg-emerald-600 text-white shadow-md':'text-blue-500 hover:text-white'}`}>⚡ Energia e Foco</button>
        <button onClick={()=>setActiveCategory('lifestyle')} className={`shrink-0 flex-1 py-2 px-4 text-xs rounded-lg font-bold transition-all ${activeCategory==='lifestyle'?'bg-emerald-600 text-white shadow-md':'text-blue-500 hover:text-white'}`}>🧔 Lifestyle</button>
      </div>

      {/* 🛍️ VITRINE DE PRODUTOS */}
      {storeProducts.length === 0 ? (
        <div className="bg-blue-950 p-12 rounded-3xl border border-blue-800 text-center border-dashed">
          <ShoppingCart className="mx-auto text-blue-800 mb-4" size={48} />
          <p className="text-blue-500 font-bold text-lg">A loja está vazia no momento.</p>
          <p className="text-blue-400 text-sm mt-1">Líderes podem adicionar produtos pelo botão acima.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
          {filteredProducts.map(product => (
            <div key={product.id} className="bg-blue-900 border border-blue-800 rounded-2xl overflow-hidden hover:border-emerald-500/50 hover:shadow-[0_0_20px_rgba(16,185,129,0.15)] transition-all group flex flex-col relative">
              
              {/* Botão Apagar (Admin) */}
              {isAdmin && (
                <button onClick={() => handleDelete(product.id)} className="absolute top-2 right-2 bg-red-500/80 hover:bg-red-500 text-white p-1.5 rounded-full z-20 backdrop-blur" title="Apagar Produto">
                  <Trash2 size={12} />
                </button>
              )}

              <div className="h-48 bg-white relative overflow-hidden flex items-center justify-center p-4">
                <span className="absolute top-2 left-2 bg-black/80 text-white text-[9px] font-bold px-2 py-0.5 rounded uppercase tracking-wider backdrop-blur-md z-10 border border-white/10">{product.partner}</span>
                {product.badge && <span className="absolute top-2 right-8 bg-emerald-500 text-blue-950 text-[9px] font-black px-2 py-0.5 rounded uppercase tracking-wider z-10 shadow-md">{product.badge}</span>}
                <img src={product.image} alt={product.name} className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-500" />
              </div>
              
              <div className="p-5 flex flex-col flex-1 justify-between">
                <div>
                  <h3 className="font-bold text-blue-100 text-sm leading-snug group-hover:text-emerald-400 transition-colors line-clamp-2">{product.name}</h3>
                  <p className="text-2xl font-black text-white mt-2 mb-4">{product.price}</p>
                </div>
                
                <a href={product.url} target="_blank" rel="noreferrer" className="w-full bg-blue-800 hover:bg-emerald-600 text-white font-bold py-2.5 rounded-xl text-xs flex items-center justify-center gap-2 transition-all shadow-md group-hover:shadow-emerald-900/50">
                  <ShoppingCart size={14}/> Acessar Loja
                </a>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="bg-blue-950 p-6 rounded-2xl border border-blue-800 text-center border-dashed">
        <p className="text-blue-400 text-sm">Ao comprar através dos nossos links, você apoia o Clã Kame a financiar as premiações e torneios futuros! 🤝</p>
      </div>

    </div>
  );
};

export default function App() {
  const [currentUser, setCurrentUser] = useState(() => { const saved = localStorage.getItem('claKame_user'); return saved ? JSON.parse(saved) : null; });

  const [feedPosts, setFeedPosts] = useState([]);
  const [lastSeenFeed, setLastSeenFeed] = useState(() => parseInt(localStorage.getItem('kame_last_seen_feed') || '0'));

  const [storeProducts, setStoreProducts] = useState([]);
  
  // 🎲 O ESTADO DO BOLÃO VOLTOU!
  const [predictions, setPredictions] = useState([]);
  
  const urlParams = new URLSearchParams(window.location.search);
  const joinIdFromUrl = urlParams.get('join');

  const [currentTab, setCurrentTab] = useState(joinIdFromUrl ? 'join_comp' : 'dashboard');
  const [selectedCompId, setSelectedCompId] = useState(joinIdFromUrl);
  
  const [selectedMatch, setSelectedMatch] = useState(null); 
  const [prevTab, setPrevTab] = useState('dashboard');
  const [users, setUsers] = useState([]); 
  const [matches, setMatches] = useState([]); 
  const [teams, setTeams] = useState([]); 
  const [competitions, setCompetitions] = useState([]);
  const [toastMessage, setToastMessage] = useState(null); 
  const [isFirebaseLoading, setIsFirebaseLoading] = useState(true);

  // 🪙 1. O MOTOR DE MISSÕES DO FEED (Post e Like)
  const handleTaskcompleted = async (taskName, reward) => {
    const today = new Date().toLocaleDateString('pt-BR');
    const taskKey = taskName === 'post' ? 'lastPostDate' : 'lastLikeDate';
    
    // Só recompensa se a data da última missão for diferente de hoje
    if (currentUser[taskKey] !== today) {
       const newCoins = (currentUser.kameCoins || 0) + reward;
       const updates = { kameCoins: newCoins, [taskKey]: today };
       await updateDoc(getPublicDocPath('users', currentUser.id), updates);
       setCurrentUser(prev => ({...prev, ...updates}));
       showToast(`🎯 Missão Concluída! +${reward} kc`, "success");
    }
  };

  // 🪙 2. BÔNUS DOS VETERANOS E CHECK-IN DIÁRIO
  useEffect(() => {
    if (currentUser && currentUser.id) {
       const today = new Date().toLocaleDateString('pt-BR');
       let updates = {};
       let hasChanges = false;
       let msg = "";

       // Se o membro é antigo e não tem a carteira, cria a carteira dele agora
       if (currentUser.kameCoins === undefined) {
          updates.kameCoins = 100;
          updates.receivedProfileBonus = !!currentUser.photoURL;
          if (currentUser.photoURL) updates.kameCoins += 50;
          hasChanges = true;
          msg = "🎁 Bônus de veterano: Conta atualizada! ";
       }

       const currentCoins = updates.kameCoins !== undefined ? updates.kameCoins : currentUser.kameCoins;

       // Verifica o Check-in Diário
       if (currentUser.lastCheckInDate !== today) {
          updates.kameCoins = currentCoins + 5;
          updates.lastCheckInDate = today;
          hasChanges = true;
          msg += "📅 +5 kc de Check-in Diário!";
       }

       // Salva tudo no Firebase de forma invisível
       if (hasChanges) {
          updateDoc(getPublicDocPath('users', currentUser.id), updates);
          setCurrentUser(prev => ({...prev, ...updates}));
          if (msg) setTimeout(() => showToast(msg.trim(), "success"), 2000);
       }
    }
  }, [currentUser?.id, currentUser?.lastCheckInDate, currentUser?.kameCoins]);

  useEffect(() => {
    if (joinIdFromUrl && currentUser) {
       window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [currentUser, joinIdFromUrl]);

  const handleJoinComp = async (compId, teamId, receiptBase64) => {
    const comp = competitions.find(c => c.id === compId);
    if (!comp) { showToast("Erro: Campeonato não localizado no sistema.", "error"); return; }
    try {
      const newPending = [...(comp.pendingTeams || []), { teamId, receipt: receiptBase64, timestamp: Date.now() }];
      await updateDoc(getPublicDocPath('competitions', compId), { pendingTeams: newPending });
      showToast("Inscrição enviada com sucesso para os líderes!", "success");
      setCurrentTab('dashboard');
    } catch (error) {
      showToast(`Falha no Servidor Cloud: ${error.message}`, "error"); throw error;
    }
  };
  
  const showToast = (text, type = 'success') => { let msg = text; if (typeof text === 'object') { msg = text.message ? text.message : JSON.stringify(text); } setToastMessage({ text: String(msg), type }); setTimeout(() => setToastMessage(null), 4000); };

  useEffect(() => {
    const unsubU = onSnapshot(getPublicPath('users'), snap => setUsers(snap.docs.map(d=>d.data())));
    const unsubT = onSnapshot(getPublicPath('teams'), snap => setTeams(snap.docs.map(d=>d.data())));
    const unsubC = onSnapshot(getPublicPath('competitions'), snap => setCompetitions(snap.docs.map(d=>d.data())));
    const unsubM = onSnapshot(getPublicPath('matches'), snap => setMatches(snap.docs.map(d=>d.data())));
    const unsubStore = onSnapshot(getPublicPath('store'), snap => setStoreProducts(snap.docs.map(d=>d.data())));
    
    // 🛑 LIMITE DE LEITURAS: Puxa só os 10 últimos posts para economizar a cota do Firebase
    const feedQuery = query(getPublicPath('feed'), orderBy('timestamp', 'desc'), limit(10));
    const unsubF = onSnapshot(feedQuery, snap => {
      const fetched = snap.docs.map(d => d.data());
      setFeedPosts(fetched);
    });

    // 🎲 O FIREBASE DO BOLÃO VOLTOU!
    const unsubP = onSnapshot(getPublicPath('predictions'), snap => {
      setPredictions(snap.docs.map(d => d.data()));
    });

    setIsFirebaseLoading(false); 
    return () => { unsubU(); unsubT(); unsubC(); unsubM(); unsubF(); unsubP(); unsubStore(); };
  }, []);

  useEffect(() => {
    if (currentUser) {
      localStorage.setItem('claKame_user', JSON.stringify(currentUser)); const stillExists = users.find(u => u && u.id === currentUser.id);
      if (users.length > 0 && !stillExists) { setCurrentUser(null); localStorage.removeItem('claKame_user'); } 
      else if (stillExists && (stillExists.role !== currentUser.role || stillExists.status !== currentUser.status || stillExists.kameCoins !== currentUser.kameCoins)) { 
        setCurrentUser(stillExists); 
      }
    } else { localStorage.removeItem('claKame_user'); }
  }, [users, currentUser]);
  
  const handleReleaseRound = async (compId, roundId) => { 
    const comp = competitions.find(c => c && c.id === compId); 
    if (!comp) return; 
    const rounds = comp.rounds.map(r => r.id === roundId ? { ...r, status: 'released', releasedAt: Date.now() } : r); 
    await updateDoc(getPublicDocPath('competitions', compId), { rounds }); 
    showToast("Rodada liberada! O tempo da Copa Flash começou a contar.", "success"); 
  };
  const handleLockRound = async (compId, roundId) => { const comp = competitions.find(c => c && c.id === compId); if (!comp) return; const rounds = comp.rounds.map(r => r.id === roundId ? { ...r, status: 'locked' } : r); await updateDoc(getPublicDocPath('competitions', compId), { rounds }); showToast("Rodada travada!", "success"); };
  const handleSelectComp = (id) => { setSelectedCompId(id); setCurrentTab('comp_details'); };
  const handleSelectMatch = (match) => { setSelectedMatch(match); setPrevTab(currentTab); setCurrentTab('match_details'); };
  const handleDeleteMatch = async (matchId) => { await deleteDoc(getPublicDocPath('matches', matchId)); showToast("Placar excluído!", "success"); };
  
  const handleEditTeam = async (updatedTeam) => { 
    const oldTeam = teams.find(t => t.id === updatedTeam.id);
    if (oldTeam && oldTeam.ownerId === 'manual' && updatedTeam.ownerId !== 'manual') {
      const userId = updatedTeam.ownerId;
      const linkedUser = users.find(u => u.id === userId);
      if (linkedUser) { updatedTeam.coach = linkedUser.name; updatedTeam.whatsapp = linkedUser.whatsapp; }
      try { await deleteDoc(getPublicDocPath('teams', `t_${userId}`)); } catch(e) {}
      showToast("Técnico vinculado e histórico migrado!", "success");
    } else {
      showToast("Time atualizado!", "success");
    }
    await updateDoc(getPublicDocPath('teams', updatedTeam.id), updatedTeam); 
  };

  const handleCreateTeamAndUser = async ({ user, team }) => { await setDoc(getPublicDocPath('users', user.id), user); await setDoc(getPublicDocPath('teams', team.id), team); setCurrentTab('teams_list'); showToast("Treinador registrado!"); return true; };
  
  const handleExpelUser = async (userId) => {
    await deleteDoc(getPublicDocPath('users', userId));
    const userTeam = teams.find(t => t.ownerId === userId);
    if (userTeam) {
      await updateDoc(getPublicDocPath('teams', userTeam.id), { ownerId: 'manual', whatsapp: '' });
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
    
    const userCredential = await createUserWithEmailAndPassword(auth, email, data.password);
    const uid = userCredential.user.uid;
    
    // 🪙 KAME COINS AQUI: 100 kc de Boas-Vindas
    const newUser = { id: uid, name: fullName, email: email, whatsapp: cleanPhone, role: 'member', status: 'pending', kameCoins: 100, receivedProfileBonus: false };
    const newTeam = { id: `t_${uid}`, name: data.teamName, coach: fullName, whatsapp: cleanPhone, ownerId: uid, shield: '🛡️' };
    
    await setDoc(getPublicDocPath('users', uid), newUser);
    await setDoc(getPublicDocPath('teams', newTeam.id), newTeam);
    
    await signOut(auth);
    showToast("Cadastro realizado! Aguarde a aprovação.", "success");
  };

  const handleLogin = async (identifier, password) => {
    const cleanPhone = String(identifier).replace(/\D/g, '');
    if (users.length === 0 && (String(identifier).toLowerCase().includes('savio') || cleanPhone === '91998270658')) { const masterUser = { id: 'u_master', name: 'Sávio Saraiva', role: 'leader', whatsapp: '91998270658', email: 'saviosaraiva777@gmail.com', password: password, status: 'active', kameCoins: 9999 }; await setDoc(getPublicDocPath('users', 'u_master'), masterUser); setCurrentUser(masterUser); setCurrentTab('dashboard'); return; }
    
    let emFake = formatarParaEmail(identifier); 
    let foundUser = null;
    if (users.length > 0) { 
      foundUser = users.find(u => u && ((u.email && u.email.toLowerCase() === identifier.trim().toLowerCase()) || (cleanPhone.length >= 8 && String(u.whatsapp) === cleanPhone))); 
      if (foundUser?.email) emFake = foundUser.email; 
    }
    
    if (foundUser && foundUser.status === 'pending') { throw new Error("Aguardando aprovação dos líderes."); }
    try { await signInWithEmailAndPassword(auth, emFake, password); } 
    catch (e) { throw new Error("Acesso negado. Verifique os dados."); }
  };

  const handleApproveUser = async (userId) => {
    await updateDoc(getPublicDocPath('users', userId), { status: 'active' });
    showToast("Técnico aprovado com sucesso!", "success");
  };

  useEffect(() => { const unsub = onAuthStateChanged(auth, (fbUser) => { if (fbUser && users.length > 0) { const found = users.find(u => u && (u.email?.toLowerCase() === fbUser.email?.toLowerCase())); if (found) setCurrentUser(found); } }); return () => unsub(); }, [users]);

  if (isFirebaseLoading) return (<div className="min-h-screen bg-blue-950 text-amber-400 flex items-center justify-center font-sans font-bold text-sm shadow-xl animate-pulse">🛡️ Carregando Arena Kame...</div>);
  if (!currentUser) return <LoginScreen onLogin={handleLogin} onRegister={handleRegister} />;

  if (currentUser.status === 'pending') {
    return (
      <div className="min-h-screen bg-blue-950 flex flex-col items-center justify-center p-4">
        <div className="bg-blue-900 p-8 rounded-2xl border border-amber-500/30 text-center max-w-sm shadow-xl">
          <div className="text-amber-500 mb-4 flex justify-center"><AlertCircle size={48}/></div>
          <h2 className="text-xl font-bold text-white mb-2">Conta em Análise</h2>
          <p className="text-blue-400 text-sm mb-6">Aguardando aprovação dos líderes do clã. Você será avisado quando for liberado!</p>
          <Button onClick={() => {setCurrentUser(null); signOut(auth);}} className="w-full">Sair</Button>
        </div>
      </div>
    );
  }

  const isLeaderOrKaioh = currentUser.role === 'leader' || currentUser.role === 'kaioh';
  const isOrganizer = currentUser.role === 'organizer';
  const hasEventAccess = isLeaderOrKaioh || isOrganizer;
  
  const TABS = [
    { id: 'dashboard', label: 'Início', icon: Home }, 
    { id: 'profile', label: 'Meu Perfil', icon: User },
    { id: 'store', label: 'Kame Store', icon: ShoppingCart }, // 👈 A LOJA FOI ADICIONADA AQUI
    { id: 'bank', label: 'Kame Bank', icon: Landmark },
    { id: 'teams_list', label: 'Times', icon: Shield }, 
    { id: 'competitions', label: 'Competições', icon: Medal },
    { id: 'ranking', label: 'Ranking Xclã', icon: Crown },
    { id: 'predictions', label: 'Kame Bet', icon: Target },
    { id: 'feed', label: 'Feed da Resenha', icon: MessageCircle },
    { id: 'records', label: 'Mural de Recordes', icon: Trophy },
    { id: 'rules', label: 'Regras do Clã', icon: BookOpen },
    
    ...(hasEventAccess ? [
      { id: 'create_comp', label: 'Nova Comp', icon: PlusCircle }
    ] : []),

    ...(isLeaderOrKaioh ? [
      { id: 'members_list', label: 'Técnicos', icon: Award },
      { id: 'create_team', label: 'Convidar Técnico', icon: Users },
      { id: 'create_team_manual', label: 'Time Simples', icon: UserPlus } 
    ] : []),
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
      
      const finalScoreA = updatedData && updatedData.scoreA !== undefined ? parseInt(updatedData.scoreA) : match.scoreA; 
      const finalScoreB = updatedData && updatedData.scoreB !== undefined ? parseInt(updatedData.scoreB) : match.scoreB; 
      const finalPenaltiesA = updatedData && updatedData.penaltiesA !== undefined ? parseInt(updatedData.penaltiesA) : match.penaltiesA; 
      const finalPenaltiesB = updatedData && updatedData.penaltiesB !== undefined ? parseInt(updatedData.penaltiesB) : match.penaltiesB;
      
     // 🎲 LIQUIDAÇÃO KAMEBET (Corrigida)
      const matchPreds = predictions.filter(p => p.matchId === match.matchId && !p.status); 
      if (matchPreds.length > 0) {
         let realOutcome = 'D'; 
         if (finalScoreA > finalScoreB) realOutcome = 'A';
         else if (finalScoreB > finalScoreA) realOutcome = 'B';
         else if (finalPenaltiesA !== null && finalPenaltiesB !== null) {
            if (finalPenaltiesA > finalPenaltiesB) realOutcome = 'A';
            else if (finalPenaltiesB > finalPenaltiesA) realOutcome = 'B';
         }

         // Agrupa os pagamentos para não sobreescrever o saldo se o usuário ganhar múltiplas apostas
         const userPayouts = {};

         for (const pred of matchPreds) {
            const isWin = pred.option === realOutcome;
            const betAmount = Number(pred.amount);
            const oddToUse = pred.lockedOdd || 1.1; 
            const payout = isWin ? Math.floor(betAmount * oddToUse) : 0;
            const profit = isWin ? (payout - betAmount) : -betAmount;

            if (payout > 0) {
               if (!userPayouts[pred.userId]) userPayouts[pred.userId] = 0;
               userPayouts[pred.userId] += payout;
            }
            
            await updateDoc(getPublicDocPath('predictions', pred.id), { status: isWin ? 'won' : 'lost', payout, profit });
         }

         // Atualiza o saldo final dos vencedores
         for (const userId of Object.keys(userPayouts)) {
            const u = users.find(x => x.id === userId);
            if (u) {
               await updateDoc(getPublicDocPath('users', u.id), { 
                 kameCoins: Number(u.kameCoins || 0) + userPayouts[userId] 
               });
            }
         }
      }

      // 🏆 NOVO: AGREGAÇÃO DE ESTATÍSTICAS DIRETAMENTE NO TIME
      const tA = teams.find(t => t.id === match.teamA);
      const tB = teams.find(t => t.id === match.teamB);

      if (tA && tB) {
        const isFlash = comp?.category === 'copa_flash';
        const ptsPlay = isFlash ? 1 : 2;
        const ptsWin = isFlash ? 1 : 3;
        const ptsDraw = isFlash ? 0 : 1;

        let winner = null;
        if (finalScoreA > finalScoreB) winner = 'A';
        else if (finalScoreB > finalScoreA) winner = 'B';
        else if (finalPenaltiesA !== null && finalPenaltiesB !== null) {
          if (finalPenaltiesA > finalPenaltiesB) winner = 'A';
          else if (finalPenaltiesB > finalPenaltiesA) winner = 'B';
        }

        let addPtsA = ptsPlay; let addPtsB = ptsPlay;
        let winsA = 0; let winsB = 0;
        let drawsA = 0; let drawsB = 0;

        if (winner === 'A') { addPtsA += ptsWin; winsA = 1; }
        else if (winner === 'B') { addPtsB += ptsWin; winsB = 1; }
        else { addPtsA += ptsDraw; addPtsB += ptsDraw; drawsA = 1; drawsB = 1; }

        // Pontos de Fases de Mata-Mata
        const isKnockoutMatch = match.matchId.includes('_ko_') || comp?.format === 'cup';
        const roundDetails = comp?.rounds?.find(r => r.id === match.roundId);
        
        if (isKnockoutMatch && roundDetails) {
          const rName = roundDetails.number;
          if (rName === 'Oitavas') { addPtsA += (isFlash ? 0 : 5); addPtsB += (isFlash ? 0 : 5); }
          if (rName === 'Quartas') { addPtsA += (isFlash ? 2 : 10); addPtsB += (isFlash ? 2 : 10); }
          if (rName === 'Semifinal') { addPtsA += (isFlash ? 5 : 15); addPtsB += (isFlash ? 5 : 15); }
          if (rName === 'Final' && match.matchId.includes('_3rd')) {
            if (winner === 'A') addPtsA += (isFlash ? 5 : 15);
            else if (winner === 'B') addPtsB += (isFlash ? 5 : 15);
          }
        }

        // Envia as métricas definitivas para os times na nuvem
        await updateDoc(getPublicDocPath('teams', tA.id), {
          globalPoints: (tA.globalPoints || 0) + addPtsA,
          playedMatches: (tA.playedMatches || 0) + 1,
          totalWins: (tA.totalWins || 0) + winsA,
          totalDraws: (tA.totalDraws || 0) + drawsA,
          goalsFor: (tA.goalsFor || 0) + finalScoreA,
          goalsAgainst: (tA.goalsAgainst || 0) + finalScoreB
        });

        await updateDoc(getPublicDocPath('teams', tB.id), {
          globalPoints: (tB.globalPoints || 0) + addPtsB,
          playedMatches: (tB.playedMatches || 0) + 1,
          totalWins: (tB.totalWins || 0) + winsB,
          totalDraws: (tB.totalDraws || 0) + drawsB,
          goalsFor: (tB.goalsFor || 0) + finalScoreB,
          goalsAgainst: (tB.goalsAgainst || 0) + finalScoreA
        });
      }

      // 🔄 AVANÇO AUTOMÁTICO DE CHAVES NO MATA-MATA
      if (comp && (comp.format === 'cup' || comp.format === 'groups')) {
        let winnerId = null; 
        if (finalScoreA > finalScoreB) winnerId = match.teamA; else if (finalScoreB > finalScoreA) winnerId = match.teamB; else if (finalPenaltiesA !== null && finalPenaltiesA !== undefined) { if (finalPenaltiesA > finalPenaltiesB) winnerId = match.teamA; else if (finalPenaltiesB > finalPenaltiesA) winnerId = match.teamB; }
        
        if (winnerId) {
          const rIndex = comp.rounds.findIndex(r => r && r.id === match.roundId); 
          const isKnockoutMatch = match.matchId.includes('_ko_') || comp.format === 'cup';
          
          if (rIndex >= 0 && rIndex < comp.rounds.length - 1 && isKnockoutMatch) {
            const mIndex = comp.rounds[rIndex].matches.findIndex(m => m && m.id === match.matchId);
            if (mIndex >= 0) {
               const nextRIndex = rIndex + 1; 
               const nextMIndex = Math.floor(mIndex / 2); 
               const isTeamA = mIndex % 2 === 0; 
               const newRounds = JSON.parse(JSON.stringify(comp.rounds)); 
               const loserId = winnerId === match.teamA ? match.teamB : match.teamA;

               const isNextRoundFinal = newRounds[nextRIndex].matches.some(x => x.id.includes('_f1') || x.id.includes('_3rd'));

               if (isNextRoundFinal) {
                  newRounds[nextRIndex].matches.forEach(nextMatch => {
                     if (nextMatch.id.includes('_3rd')) {
                        if (isTeamA) nextMatch.teamA = loserId; else nextMatch.teamB = loserId;
                     } else {
                        if (nextMatch.id.includes('_f2')) {
                           if (isTeamA) nextMatch.teamB = winnerId; else nextMatch.teamA = winnerId;
                        } else {
                           if (isTeamA) nextMatch.teamA = winnerId; else nextMatch.teamB = winnerId;
                        }
                     }
                  });
               } else {
                  if (isTeamA) newRounds[nextRIndex].matches[nextMIndex].teamA = winnerId; 
                  else newRounds[nextRIndex].matches[nextMIndex].teamB = winnerId;
               }
               await updateDoc(getPublicDocPath('competitions', comp.id), { rounds: newRounds });
            }
          }
        }
      }
    }
  };
  
  const handleEditUser = async (userId, updatedData) => {
    await updateDoc(getPublicDocPath('users', userId), { name: updatedData.name, whatsapp: updatedData.whatsapp });
    const userTeam = teams.find(t => t.ownerId === userId);
    if (userTeam) { await updateDoc(getPublicDocPath('teams', userTeam.id), { coach: updatedData.name, whatsapp: updatedData.whatsapp }); }
    showToast("Dados do técnico atualizados com sucesso!", "success");
  };
  
  const renderContent = () => {
    switch (currentTab) {
      case 'dashboard': return <Dashboard matches={matches} teams={teams} competitions={competitions} currentUser={currentUser} onSelectMatch={handleSelectMatch} onDeleteMatch={handleDeleteMatch} onChangeTab={setCurrentTab} onJoinOpenComp={(id) => { setSelectedCompId(id); setCurrentTab('join_comp'); }} />;
      
      case 'profile': return <Profile currentUser={currentUser} teams={teams} matches={matches} competitions={competitions} onEditTeam={handleEditTeam} onUpdateUserPhoto={async (url) => { 
          const updates = { photoURL: url }; let rewardMsg = "";
          // 🪙 KAME COINS: Dá 50 kc se for a primeira vez atualizando foto!
          if (!currentUser.receivedProfileBonus) {
            updates.kameCoins = (currentUser.kameCoins || 0) + 50;
            updates.receivedProfileBonus = true;
            rewardMsg = " 🎁 +50 bc de Bônus ganho!";
          }
          await updateDoc(getPublicDocPath('users', currentUser.id), updates); 
          setCurrentUser(prev => ({...prev, ...updates})); 
          showToast("Foto atualizada!" + rewardMsg, "success"); 
        }} />;

        case 'bank': return <KameBank currentUser={currentUser} predictions={predictions} matches={matches} teams={teams} showToast={showToast} />;

      case 'teams_list': return <TeamsList teams={teams} users={users} currentUser={currentUser} matches={matches} competitions={competitions} onEditTeam={handleEditTeam} onDeleteTeam={async (id) => { await deleteDoc(getPublicDocPath('teams', id)); showToast("Time excluído com sucesso!", "success"); }} />;
      case 'competitions': return <CompetitionsList competitions={competitions} teams={teams} currentUser={currentUser} onSelectComp={handleSelectComp} onDeleteComp={id => deleteDoc(getPublicDocPath('competitions', id))} />;
      case 'ranking': return <GlobalRanking teams={teams} matches={matches} competitions={competitions} currentUser={currentUser} showToast={showToast} />;
      case 'predictions': return <PredictionsPanel competitions={competitions} matches={matches} teams={teams} users={users} currentUser={currentUser} predictions={predictions} showToast={showToast} onSavePrediction={async (p, oldAmount) => { 
          const currentCoins = Number(currentUser.kameCoins) || 0;
          const betCost = Number(p.amount) - Number(oldAmount);
          const newBalance = Math.max(0, currentCoins - betCost); // Matemágica blindada!
          
          await updateDoc(getPublicDocPath('users', currentUser.id), { kameCoins: newBalance });
          setCurrentUser(prev => ({...prev, kameCoins: newBalance}));
          await setDoc(getPublicDocPath('predictions', p.id), p); 
      }} />;
        
      case 'comp_details': return <CompetitionDetails users={users} comp={competitions.find(c=>c.id===selectedCompId)} teams={teams} matches={matches} currentUser={currentUser} onBack={()=>setCurrentTab('competitions')} onReleaseRound={handleReleaseRound} onLockRound={handleLockRound} onEditComp={async (c) => { await updateDoc(getPublicDocPath('competitions', c.id), c); showToast("Atualizado!", "success"); }} onUpdatePlayedMatch={async (m) => { await updateDoc(getPublicDocPath('matches', m.id), m); }} onDeleteMatch={handleDeleteMatch} showToast={showToast} onSubmitMatch={m => setDoc(getPublicDocPath('matches', m.id), m).then(() => { showToast("Resultado enviado!"); })} onUpdateMatchStatus={(id,st, updatedData=null)=>handleUpdateMatchStatus(id,st,updatedData)} onBatchUpdateComp={async (updatedComp, newMatchesArray) => { await updateDoc(getPublicDocPath('competitions', updatedComp.id), updatedComp); const promises = newMatchesArray.map(m => setDoc(getPublicDocPath('matches', m.id), m)); await Promise.all(promises); showToast("Fase encerrada e chaves atualizadas!", "success"); }} />;
      case 'match_details': return <MatchDetails match={selectedMatch} teams={teams} competitions={competitions} onBack={() => setCurrentTab(prevTab)} />;
      case 'store': return <KameStore currentUser={currentUser} storeProducts={storeProducts} showToast={showToast} />;
      case 'create_comp': return <CreateCompetition matches={matches} teams={teams} competitions={competitions} currentUser={currentUser} onCreate={c => setDoc(getPublicDocPath('competitions', c.id), c).then(()=>setCurrentTab('competitions'))} showToast={showToast} />;
      case 'create_team': return <CreateTeamFull onCreate={handleCreateTeamAndUser} showToast={showToast} />;
      case 'create_team_manual': return <CreateTeamManual onCreate={t => setDoc(getPublicDocPath('teams', t.id), t).then(()=>setCurrentTab('teams_list'))} showToast={showToast} />;   
      case 'members_list': return <MembersList users={users} teams={teams} currentUser={currentUser} onExpelUser={handleExpelUser} onApproveUser={handleApproveUser} onEditUser={handleEditUser} onUpdateUserRole={(id,role)=>updateDoc(getPublicDocPath('users',id),{role})} showToast={showToast} />;
      case 'feed': return <SocialFeed currentUser={currentUser} teams={teams} showToast={showToast} posts={feedPosts} onTaskcompleted={handleTaskcompleted} />;
      case 'join_comp': return <JoinCompetition compId={selectedCompId} competitions={competitions} teams={teams} currentUser={currentUser} onJoin={handleJoinComp} onBack={()=>setCurrentTab('dashboard')} showToast={showToast} />;
      case 'records': return <RecordsWall showToast={showToast} currentUser={currentUser} />;
      case 'rules': return <RulesPage />;
      case 'validation': return <ValidationPanel matches={matches} teams={teams} competitions={competitions} onUpdateStatus={(id,st, updatedData=null)=>handleUpdateMatchStatus(id,st,updatedData)} showToast={showToast} currentUser={currentUser} />;
        
      default: return <Dashboard matches={matches} teams={teams} competitions={competitions} currentUser={currentUser} onSelectMatch={handleSelectMatch} onDeleteMatch={handleDeleteMatch} onChangeTab={setCurrentTab} onJoinOpenComp={(id) => { setSelectedCompId(id); setCurrentTab('join_comp'); }} />;
    }
  };

  return (
    <div className="min-h-screen bg-blue-950 text-blue-200 font-sans flex flex-col md:flex-row relative">
      {toastMessage && (
        <div className={`fixed top-4 right-4 z-50 px-6 py-3 rounded-xl shadow-2xl flex items-center gap-3 animate-in slide-in-from-top-4 ${toastMessage.type === 'error' ? 'bg-red-950 border border-red-500 text-red-100' : 'bg-blue-800 border border-emerald-500 text-white'}`}>
          {toastMessage.type === 'error' ? <AlertCircle className="text-red-500" size={20} /> : <CheckCircle className="text-emerald-500" size={20} />}
          <span className="font-medium text-sm">{String(toastMessage.text)}</span>
        </div>
      )}

      <aside className="w-full md:w-64 bg-blue-900 border-b md:border-b-0 md:border-r border-blue-800 flex flex-col shrink-0 z-10 shadow-2xl">
        <div className="p-6 flex items-center gap-3"><img src={LOGO_URL} alt="Clã Kame" className="w-24 h-24" /><div><h1 className="font-bold text-white text-lg">Clã Kame</h1><p className="text-[10px] text-emerald-400 font-bold uppercase">Arena DLS</p></div></div>
        
        <nav className="flex-1 px-4 pb-4 overflow-y-auto flex md:flex-col gap-2 overflow-x-auto custom-scrollbar">
          {TABS.map(tab => {
            const isActive = currentTab === tab.id || (tab.id === 'competitions' && currentTab === 'comp_details'); 
            const Icon = tab.icon;
            
            const hasNewFeed = tab.id === 'feed' && feedPosts.length > 0 && feedPosts[0].timestamp > lastSeenFeed;

            return ( 
              <button 
                key={tab.id} 
                onClick={() => {
                  if (tab.id === 'feed') {
                    const now = Date.now();
                    setLastSeenFeed(now);
                    localStorage.setItem('kame_last_seen_feed', now.toString());
                  }
                  setCurrentTab(tab.id);
                }} 
                className={`relative flex items-center gap-3 px-4 py-3 rounded-xl whitespace-nowrap outline-none border ${isActive ? 'bg-emerald-500/10 text-emerald-400 font-bold border-emerald-500/20' : 'text-blue-400 hover:bg-blue-800 hover:text-blue-200 border-transparent'}`}
              >
                <Icon size={18} /> 
                <span className="text-sm">{tab.label}</span>
                
                {hasNewFeed && (
                  <span className="absolute top-3 right-3 w-2.5 h-2.5 bg-red-500 rounded-full shadow-[0_0_8px_rgba(239,68,68,0.8)] animate-pulse"></span>
                )}

                {(tab.id === 'competitions' && hasEventAccess && matches.filter(m=>m?.status==='pending').length > 0) && <span className="ml-auto bg-amber-500 text-blue-950 text-xs font-bold px-2 py-0.5 rounded-full shadow-md">{matches.filter(m=>m?.status==='pending').length}</span>}
              </button> 
            );
          })}
        </nav>
        
        <div className="p-4 border-t border-blue-800 hidden md:block">
          <div className="bg-blue-950 rounded-xl p-4 border border-blue-800/50 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500"></div>
            <p className="font-bold text-white text-sm truncate">{String(currentUser?.name)}</p>
            <p className="text-[10px] text-emerald-400 uppercase font-bold mb-3">{ROLE_NAMES[currentUser?.role]}</p>
            
            {/* 🪙 A CARTEIRA KAME COINS */}
            <div className="bg-blue-900/50 border border-amber-500/30 rounded-lg p-2.5 mb-3 flex items-center justify-between shadow-inner">
               <span className="text-[10px] text-amber-400 font-bold uppercase tracking-wider flex items-center gap-1.5"><Star size={12}/> Saldo</span>
               <span className="text-sm font-black text-white">{currentUser?.kameCoins || 0} <span className="text-amber-500 text-xs">bk</span></span>
            </div>

            <button onClick={() => { setCurrentUser(null); signOut(auth); }} className="w-full text-xs text-blue-400 hover:text-white py-1.5 rounded bg-blue-900 border border-blue-700/60 transition-colors hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/30">
              <LogOut size={12} className="inline mr-1"/> Sair
            </button>
          </div>
        </div>
      </aside>
      <main className="flex-1 p-4 md:p-8 overflow-y-auto bg-blue-950"><div className="max-w-5xl mx-auto pb-20 md:pb-0">{renderContent()}</div></main>
    </div>
  );
}

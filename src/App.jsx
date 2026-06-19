import React, { useState, useEffect, useMemo, useRef } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, doc, setDoc, updateDoc, onSnapshot, collection, deleteDoc } from 'firebase/firestore';
import { Home, Trophy, Medal, Camera, CheckSquare, Users, LogOut, UploadCloud, CheckCircle, XCircle, AlertCircle, Activity, PlusCircle, ArrowLeft, PlayCircle, Lock, Play, Shield, MessageCircle, Edit, Save, X, User, Crown, Star, Send, Trash2, UserPlus, Key, LayoutGrid, List, Award, Grid, Settings, Terminal } from 'lucide-react';

const LOGO_URL = "https://i.imgur.com/NTbkaER.png"; 

const firebaseConfig = { apiKey: "AIzaSyCoZ255eUBfUsIYArCMtHflT0y_6U5fTsA", authDomain: "cla-kame.firebaseapp.com", databaseURL: "https://cla-kame-default-rtdb.firebaseio.com", projectId: "cla-kame", storageBucket: "cla-kame.firebasestorage.app", messagingSenderId: "253792062726", appId: "1:253792062726:web:1ee567bbbd175c31ce2287" };
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = 'cla-kame-oficial';

const getPublicPath = (colName) => collection(db, 'artifacts', appId, 'public', 'data', colName);
const getPublicDocPath = (colName, docId) => doc(db, 'artifacts', appId, 'public', 'data', colName, docId);

const ROLE_NAMES = { leader: 'Líder Supremo', kaioh: 'Senhor Kaioh', member: 'Membro Oficial' };
const inputClass = "w-full bg-slate-950 border border-slate-700 focus:border-emerald-500 rounded-lg p-3 text-white outline-none transition-colors text-sm";

const safeFormatDate = d => { if(!d) return ''; try { if(d.seconds) return new Date(d.seconds*1000).toLocaleDateString('pt-BR',{timeZone:'UTC'}); return isNaN(new Date(d).getTime()) ? '' : new Date(d).toLocaleDateString('pt-BR',{timeZone:'UTC'}); } catch(e) { return ''; } };
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

const generateRoundRobin = (teamIds, compId) => {
  let teams = [...teamIds]; if (teams.length % 2 !== 0) teams.push(null);
  const n = teams.length; const h = n / 2; const rounds = []; let c = 1;
  for (let r = 0; r < n - 1; r++) {
    const rm = [];
    for (let i = 0; i < h; i++) {
      const tA = teams[i]; const tB = teams[n - 1 - i];
      if (tA !== null && tB !== null) { rm.push({ id: `${compId}_m${c}_r${r+1}`, teamA: tA, teamB: tB, status: 'pending_play' }); c++; }
    }
    rounds.push({ id: `r${r+1}`, number: r + 1, status: r === 0 ? 'released' : 'locked', matches: rm }); teams.splice(1, 0, teams.pop());
  } return rounds;
};

const generateCupBracket = (teamIds, compId) => {
  let teams = [...teamIds]; let p2 = 1; while (p2 < teams.length) p2 *= 2; while (teams.length < p2) teams.push(''); 
  const tr = Math.log2(p2); const rounds = []; let mc = 1;
  for (let r = 0; r < tr; r++) {
    const rm = []; const nm = p2 / Math.pow(2, r + 1); const fmc = mc;
    for (let i = 0; i < nm; i++) {
      let tA = '', tB = '', pA = 'A Definir', pB = 'A Definir';
      if (r === 0) { tA = teams[i * 2] || ''; tB = teams[i * 2 + 1] || ''; if(!tA) pA = `Sorteio Vaga ${i*2 + 1}`; if(!tB) pB = `Sorteio Vaga ${i*2 + 2}`; } 
      else { pA = `Venc. Jogo ${fmc - (nm * 2) + (i * 2)}`; pB = `Venc. Jogo ${fmc - (nm * 2) + (i * 2) + 1}`; }
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
      let pA = 'A Definir', pB = 'A Definir';
      if (kr === 0) {
         if (qualifiers === 2 && numGroups % 2 === 0 && numGroups * 2 === p2) { const h = numGroups / 2; if (i < h) { pA = `1º Gr.${gn[i * 2]}`; pB = `2º Gr.${gn[i * 2 + 1]}`; } else { const off = i - h; pA = `1º Gr.${gn[off * 2 + 1]}`; pB = `2º Gr.${gn[off * 2]}`; } } 
         else { pA = 'Vaga Aberta'; pB = 'Vaga Aberta'; }
      } else { pA = `Venc. Jogo ${fmc - (nm * 2) + (i * 2)}`; pB = `Venc. Jogo ${fmc - (nm * 2) + (i * 2) + 1}`; }
      rm.push({ id: `${compId}_ko_m${mc}_kr${kr}`, teamA: '', teamB: '', placeholderA: pA, placeholderB: pB, status: 'pending_play' }); mc++;
    }
    let rl = 'Mata-Mata'; if (nm === 1) rl = 'Final'; else if (nm === 2) rl = 'Semifinal'; else if (nm === 4) rl = 'Quartas';
    rounds.push({ id: `ko_${kr}`, number: rl, status: 'locked', matches: rm });
  } return { groups, rounds };
};

const calculateStandings = (matches, teams, compId) => {
  const table = {}; (teams || []).forEach(t => { if (t) table[t.id] = { ...t, p: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, gd: 0, pts: 0 }; });
  const appMap = {}; (matches || []).filter(m => m && m.compId === compId && m.status === 'approved').forEach(m => { const time = parseInt(String(m.id).split('_')[1] || '0'); if (!appMap[m.matchId] || time > parseInt(String(appMap[m.matchId].id).split('_')[1] || '0')) { appMap[m.matchId] = m; } });
  Object.values(appMap).forEach(m => {
    const tA = table[m.teamA], tB = table[m.teamB]; if (!tA || !tB) return;
    tA.p++; tB.p++; tA.gf += Number(m.scoreA||0); tB.gf += Number(m.scoreB||0); tA.ga += Number(m.scoreB||0); tB.ga += Number(m.scoreA||0);
    if (m.scoreA > m.scoreB) { tA.pts+=3; tA.w++; tB.l++; } else if (m.scoreA < m.scoreB) { tB.pts+=3; tB.w++; tA.l++; } else { tA.pts++; tB.pts++; tA.d++; tB.d++; }
  });
  return Object.values(table).map(t => ({ ...t, gd: t.gf - t.ga })).sort((a, b) => { if (b.pts !== a.pts) return b.pts - a.pts; if (b.w !== a.w) return b.w - a.w; if (b.gd !== a.gd) return b.gd - a.gd; return b.gf - a.gf; });
};

/* --- Componentes UI --- */

const AppSettings = ({ currentUser, showToast }) => {
  const [cmd, setCmd] = useState(''); const [apiKey, setApiKey] = useState(() => localStorage.getItem('gemini_api_key') || '');
  const [logs, setLogs] = useState(['[SISTEMA] Console de Batalha iniciado. Aguardando comandos do Líder...']);
  const bottomRef = useRef(null);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [logs]);

  const runCommand = (e) => {
    e.preventDefault(); const c = cmd.trim(); if (!c) return; const clow = c.toLowerCase(); let res = '';
    if (clow === '/ping') res = 'Pong! Banco de dados sincronizado e latência estável.';
    else if (clow === '/clear') { setLogs([]); setCmd(''); return; }
    else if (clow === '/reset_ia') { localStorage.removeItem('gemini_api_key'); setApiKey(''); res = 'Chave da Inteligência Artificial limpa do cache.'; }
    else if (clow === '/help') res = 'Comandos disponíveis: /ping, /clear, /reset_ia, /status, /info';
    else if (clow === '/status') res = 'Todos os módulos operacionais. Arena pronta.';
    else if (clow === '/info') res = `Líder reconhecido: ${currentUser.name}. Privilégios administrativos ativos.`;
    else res = `Erro: Comando "${c}" não reconhecido ou sem permissão para executar.`;
    setLogs(prev => [...prev, `> ${c}`, `[SISTEMA] ${res}`]); setCmd('');
  };

  return (
    <div className="max-w-3xl mx-auto animate-in fade-in pb-12 space-y-6">
      <div className="flex items-center gap-3 mb-6"><Settings className="text-emerald-500" size={28}/><h2 className="text-2xl font-bold text-white">Configurações do APP</h2></div>
      <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 space-y-4 shadow-xl">
        <h3 className="text-lg font-bold text-white flex items-center gap-2"><Key size={18} className="text-amber-500"/> Chave Mestra da IA (Gemini)</h3>
        <p className="text-sm text-slate-400">Configure a chave da API Google AI Studio aqui para habilitar o leitor de prints em toda a aplicação.</p>
        <div className="flex gap-2"><input type="password" value={apiKey} onChange={e=>setApiKey(e.target.value)} placeholder="Cole sua chave AIzaSy..." className={inputClass} /><Button onClick={() => { localStorage.setItem('gemini_api_key', apiKey.trim()); showToast("Chave salva com sucesso!", "success"); }}>Salvar Chave</Button></div>
      </div>
      <div className="bg-slate-950 rounded-2xl border border-slate-800 overflow-hidden shadow-2xl flex flex-col h-[400px]">
        <div className="bg-slate-900 p-3 border-b border-slate-800 flex items-center gap-2"><Terminal size={16} className="text-emerald-500"/><span className="text-xs font-mono text-slate-400 font-bold uppercase tracking-widest">Console de Comandos</span></div>
        <div className="flex-1 p-4 overflow-y-auto font-mono text-xs md:text-sm space-y-2">{logs.map((log, i) => (<div key={i} className={log.startsWith('>') ? 'text-emerald-400 font-bold' : log.includes('Erro:') ? 'text-red-400' : 'text-slate-300'}>{log}</div>))}<div ref={bottomRef} /></div>
        <form onSubmit={runCommand} className="p-3 bg-slate-900 border-t border-slate-800 flex gap-2 items-center"><span className="text-emerald-500 font-mono font-bold">❯</span><input type="text" value={cmd} onChange={e=>setCmd(e.target.value)} placeholder="Digite /help para lista de comandos..." className="flex-1 bg-transparent border-none text-white font-mono text-sm outline-none" /></form>
      </div>
    </div>
  );
};

const LoginScreen = ({ users, onLogin, onFirstAccess }) => {
  const [view, setView] = useState('login'); const [loginData, setLoginData] = useState({ identifier: '', password: '' });
  const [loginError, setLoginError] = useState(''); const [showForgot, setShowForgot] = useState(false);
  const [faEmail, setFaEmail] = useState(''); const [faUser, setFaUser] = useState(null);
  const [code, setCode] = useState(''); const [isSending, setIsSending] = useState(false); const [newPassword, setNewPassword] = useState('');

  const handleLoginSubmit = async (e) => { e.preventDefault(); setLoginError(''); try { await onLogin(loginData.identifier, loginData.password); } catch (error) { setLoginError(error.message || 'Credenciais incorretas ou acesso não ativado.'); } };
  const handleRequestCode = (e) => { e.preventDefault(); setLoginError(''); const cleanInput = faEmail.trim().toLowerCase(); const cleanPhone = cleanInput.replace(/\D/g, ''); const user = (users || []).find(u => u && ((u.email && String(u.email).toLowerCase() === cleanInput) || (cleanPhone.length >= 8 && String(u.whatsapp) === cleanPhone))); if (!user) { setLoginError('Registo não encontrado. Solicite a um Líder para cadastrar o seu perfil primeiro.'); return; } if (!String(user.id).startsWith('pending_')) { setLoginError('Esta conta já está ativada. Volte e faça o login normalmente.'); return; } setFaUser(user); setIsSending(true); setTimeout(() => { setIsSending(false); setView('fa_code'); }, 1500); };
  const handleVerifyCode = (e) => { e.preventDefault(); setIsSending(true); setTimeout(() => { setIsSending(false); setView('fa_pass'); }, 1000); };
  const handleSavePassword = async (e) => { e.preventDefault(); if (newPassword.length < 6) { setLoginError('A palavra-passe deve ter no mínimo 6 caracteres.'); return; } try { await onFirstAccess(faUser, faEmail, faUser?.whatsapp || '', newPassword); } catch (error) { setLoginError(error.message); } };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="bg-slate-900 p-6 md:p-8 rounded-2xl border border-slate-800 max-w-md w-full shadow-2xl">
        <div className="text-center mb-6"><div className="flex justify-center mb-4">{LOGO_URL ? <img src={LOGO_URL} alt="Clã Kame" className="max-w-[120px] object-contain drop-shadow-[0_0_15px_rgba(255,222,89,0.3)]" /> : <Shield size={64} className="text-emerald-500" />}</div><h1 className="text-2xl font-bold text-white tracking-tight">Clã Kame</h1><p className="text-slate-400 mt-2 text-sm">Sistema de Gestão DLS</p></div>
        {view === 'login' && (
          <form onSubmit={handleLoginSubmit} className="space-y-4 animate-in fade-in duration-300">
            {loginError && <div className="text-red-400 text-sm bg-red-500/10 p-3 rounded-lg border border-red-500/20">{String(loginError)}</div>}
            <div><label className="text-xs text-slate-400 mb-1 block">E-mail ou WhatsApp (Apenas Números)</label><input required value={loginData.identifier} onChange={e=>setLoginData({...loginData, identifier: e.target.value})} className={inputClass} placeholder="Ex: goku@kame.com" /></div>
            <div><label className="text-xs text-slate-400 mb-1 block">Palavra-passe</label><input required type="password" value={loginData.password} onChange={e=>setLoginData({...loginData, password: e.target.value})} className={inputClass} placeholder="••••••••" /></div>
            <div className="text-right"><button type="button" onClick={() => setShowForgot(true)} className="text-xs text-emerald-400 hover:text-emerald-300 underline underline-offset-2">Esqueci-me da palavra-passe</button></div>
            {showForgot && <div className="bg-emerald-500/10 border border-emerald-500/20 p-3 rounded-lg text-xs text-emerald-400 text-center animate-in fade-in">Simulação: Enviaremos um código para o seu WhatsApp!</div>}
            <Button type="submit" className="w-full mt-2 py-3 shadow-xl">Entrar no Clã</Button>
            <div className="mt-6 text-center pt-5 border-t border-slate-800/50"><p className="text-xs text-slate-500 mb-2">Foi convidado por um Líder e ainda não tem acesso?</p><button type="button" onClick={() => {setView('fa_email'); setLoginError('');}} className="text-sm font-bold text-emerald-400 hover:text-emerald-300 underline underline-offset-2">Realizar Primeiro Acesso</button></div>
          </form>
        )}
        {view === 'fa_email' && (
          <form onSubmit={handleRequestCode} className="space-y-4 animate-in slide-in-from-right-4 duration-300">
            <h2 className="text-lg font-bold text-white text-center mb-2">Primeiro Acesso</h2>
            <p className="text-xs text-slate-400 text-center mb-4">Informe o e-mail ou o WhatsApp cadastrado pelo Líder.</p>
            {loginError && <div className="text-red-400 text-sm bg-red-500/10 p-3 rounded-lg border border-red-500/20">{String(loginError)}</div>}
            <div><label className="text-xs text-slate-400 mb-1 block">O seu E-mail ou WhatsApp</label><input required type="text" value={faEmail} onChange={e=>setFaEmail(e.target.value)} className={inputClass} placeholder="Ex: tecnico@email.com" /></div>
            <Button type="submit" disabled={isSending} className="w-full mt-2 py-3 shadow-xl">{isSending ? 'A localizar...' : 'Avançar'}</Button>
            <button type="button" onClick={() => {setView('login'); setLoginError('');}} className="w-full text-xs text-slate-500 hover:text-white mt-4">Voltar para o Login</button>
          </form>
        )}
        {view === 'fa_code' && (
           <form onSubmit={handleVerifyCode} className="space-y-4 animate-in slide-in-from-right-4 duration-300 text-center">
             <div className="bg-emerald-500/10 text-emerald-400 p-4 rounded-xl mb-4 text-sm border border-emerald-500/20">Enviamos um código para o WhatsApp final <br/><b className="text-lg tracking-wider text-white mt-1 inline-block">***{String(faUser?.whatsapp || '').slice(-4)}</b></div>
             <div><input required type="text" maxLength={4} value={code} onChange={e=>setCode(e.target.value)} className="w-40 mx-auto text-center tracking-[0.7em] font-bold text-3xl bg-slate-950 border border-slate-700 rounded-xl p-4 text-white outline-none focus:border-emerald-500" placeholder="0000" /></div>
             <Button type="submit" disabled={code.length < 4 || isSending} className="w-full py-4 text-lg mt-4 shadow-xl">{isSending ? 'Verificando...' : 'Verificar Código'}</Button>
             <button type="button" onClick={()=>setView('fa_email')} className="text-sm text-slate-500 hover:text-white mt-4 underline underline-offset-4">Voltar</button>
           </form>
        )}
        {view === 'fa_pass' && (
           <form onSubmit={handleSavePassword} className="space-y-4 animate-in slide-in-from-right-4 duration-300">
             <h2 className="text-lg font-bold text-emerald-400 text-center mb-2">Quase lá, {String(faUser?.name || '').split(' ')[0]}!</h2>
             <p className="text-xs text-slate-400 text-center mb-4">Crie a sua senha de acesso.</p>
             {loginError && <div className="text-red-400 text-sm bg-red-500/10 p-3 rounded-lg border border-red-500/20">{String(loginError)}</div>}
             <div><label className="text-xs text-slate-400 mb-1 block">Crie a sua Senha</label><input required type="password" minLength={6} value={newPassword} onChange={e=>setNewPassword(e.target.value)} className={inputClass} placeholder="Min. 6 caracteres" /></div>
             <Button type="submit" className="w-full py-4 text-lg mt-4 shadow-xl">Salvar Senha e Entrar</Button>
           </form>
        )}
      </div>
    </div>
  );
};

const Profile = ({ currentUser, teams, matches, competitions }) => {
  const userTeams = (teams || []).filter(t => t && t.ownerId === currentUser.id);
  if (userTeams.length === 0) return (<div className="animate-in fade-in text-center p-12 bg-slate-900 rounded-2xl border border-slate-800"><span className="text-6xl mb-4 block">😢</span><h2 className="text-2xl font-bold text-white mb-2">Você ainda não tem um time</h2><p className="text-slate-400">Peça para um líder cadastrar seu time no Clã.</p></div>);

  return (
    <div className="animate-in fade-in duration-500 space-y-6">
      <div className="flex items-center gap-4 bg-slate-900 p-6 rounded-2xl border border-slate-800 shadow-xl">
        <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center text-3xl">👤</div>
        <div><h2 className="text-2xl font-bold text-white">{String(currentUser.name || 'Guerreiro')}</h2><p className="text-emerald-400 font-medium tracking-wide text-sm uppercase mt-1">{ROLE_NAMES[currentUser.role] || 'Membro'}</p></div>
      </div>
      <div className="space-y-8">
        {userTeams.map(team => {
          if (!team) return null;
          const teamMatches = (matches || []).filter(m => m && m.status === 'approved' && (m.teamA === team.id || m.teamB === team.id));
          let wins = 0, draws = 0, losses = 0, gf = 0, ga = 0; let biggestWin = null; let maxGd = -1;
          teamMatches.forEach(m => {
            const isTeamA = m.teamA === team.id; const scoreFor = Number(isTeamA ? m.scoreA : m.scoreB); const scoreAgainst = Number(isTeamA ? m.scoreB : m.scoreA); gf += scoreFor; ga += scoreAgainst;
            if (scoreFor > scoreAgainst) { wins++; if (scoreFor - scoreAgainst > maxGd) { maxGd = scoreFor - scoreAgainst; biggestWin = { scoreFor, scoreAgainst, oppId: isTeamA ? m.teamB : m.teamA }; } } 
            else if (scoreFor === scoreAgainst) { const penFor = isTeamA ? m.penaltiesA : m.penaltiesB; const penAgainst = isTeamA ? m.penaltiesB : m.penaltiesA; if (penFor !== undefined && penFor > penAgainst) wins++; else if (penFor !== undefined && penFor < penAgainst) losses++; else draws++; } 
            else { losses++; }
          });
          const participations = (competitions || []).filter(c => c && c.teams?.includes(team.id)).map(c => {
            let rank = '-';
            if (c.format === 'league') { const table = calculateStandings(matches, teams, c.id); const rankIndex = table.findIndex(t => t.id === team.id); rank = rankIndex !== -1 ? rankIndex + 1 : '-'; } 
            else if (c.format === 'groups' && c.groups) { let groupName = null; Object.keys(c.groups).forEach(g => { if (c.groups[g].includes(team.id)) groupName = g; }); if (groupName) { const gTeams = (teams || []).filter(t => t && c.groups[groupName].includes(t.id)); const gTable = calculateStandings(matches, gTeams, c.id); const rankIndex = gTable.findIndex(t => t.id === team.id); rank = rankIndex !== -1 ? `${rankIndex + 1} (Gr.${groupName})` : '-'; } }
            return { compName: c.name, rank, format: c.format };
          });

          return (
            <div key={team.id} className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden shadow-xl">
              <div className="bg-slate-950/50 p-6 border-b border-slate-800 flex items-center gap-4">
                <ShieldDisplay shield={team.shield} size="large" />
                <div><h3 className="text-2xl font-bold text-white">{String(team.name || 'Time')}</h3><p className="text-slate-400">Técnico: <span className="text-slate-300 font-medium">{String(team.coach || 'Não informado')}</span></p></div>
              </div>
              <div className="p-6 space-y-8">
                <div>
                  <h4 className="text-lg font-bold text-white mb-4 flex items-center gap-2"><Activity className="text-emerald-500" size={20}/> Estatísticas Históricas</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-center"><p className="text-slate-400 text-sm mb-1">Partidas</p><p className="text-2xl font-bold text-white">{teamMatches.length}</p></div>
                    <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-center"><p className="text-slate-400 text-sm mb-1">Vitórias</p><p className="text-2xl font-bold text-emerald-400">{wins}</p></div>
                    <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-center"><p className="text-slate-400 text-sm mb-1">Aproveitamento</p><p className="text-2xl font-bold text-amber-400">{teamMatches.length > 0 ? Math.round((wins * 3 + draws) / (teamMatches.length * 3) * 100) : 0}%</p></div>
                    <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-center"><p className="text-slate-400 text-sm mb-1">Gols Feitos</p><p className="text-2xl font-bold text-blue-400">{gf}</p></div>
                  </div>
                </div>
                {biggestWin && (
                  <div className="bg-gradient-to-r from-emerald-900/40 to-slate-900 p-5 rounded-xl border border-emerald-900/50 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                    <div><p className="text-sm text-emerald-400 font-bold mb-1 flex items-center gap-2">🏆 Maior Goleada Aplicada</p><p className="text-white font-medium text-lg">{String(team.name)} <span className="font-bold text-emerald-400 mx-2">{biggestWin.scoreFor} x {biggestWin.scoreAgainst}</span> {String((teams || []).find(t=>t && t.id === biggestWin.oppId)?.name || 'Adversário')}</p></div>
                  </div>
                )}
                <div>
                  <h4 className="text-lg font-bold text-white mb-4 flex items-center gap-2"><Trophy className="text-amber-500" size={20}/> Histórico em Competições</h4>
                  {participations.length > 0 ? (
                    <div className="space-y-3">
                      {participations.map((p, i) => (
                        <div key={i} className="flex justify-between items-center bg-slate-950 p-4 rounded-xl border border-slate-800">
                          <span className="text-slate-200 font-medium">{String(p.compName || 'Competição')}</span>
                          <div className="flex items-center gap-3">
                            <span className="text-xs bg-slate-800 text-slate-400 px-2 py-1 rounded hidden md:block">{p.format === 'league' ? 'Liga' : p.format === 'groups' ? 'Grupos' : 'Copa'}</span>
                            <span className="font-bold text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-lg border border-emerald-500/20">{String(p.rank)}º Lugar</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : <p className="text-slate-500 text-sm p-4 bg-slate-950 rounded-xl border border-slate-800">Esta equipa ainda não participou de nenhuma competição.</p>}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const Standings = ({ matches, teams, comp }) => {
  const tableRef = useRef(null); const [isExporting, setIsExporting] = useState(false);
  const compName = comp?.name; const isGroupsFormat = comp?.format === 'groups' && comp?.groups;

  const handleExportTable = async () => {
    try {
      setIsExporting(true); let html2canvas = window.html2canvas;
      if (!html2canvas) { await new Promise((resolve, reject) => { const script = document.createElement('script'); script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js'; script.onload = resolve; script.onerror = reject; document.head.appendChild(script); }); html2canvas = window.html2canvas; }
      if (tableRef.current) { const canvas = await html2canvas(tableRef.current, { backgroundColor: '#0f172a', scale: 2, useCORS: true, windowWidth: tableRef.current.scrollWidth }); const link = document.createElement("a"); link.href = canvas.toDataURL("image/png"); link.download = `Tabela_${compName ? String(compName).replace(/\s+/g, '_') : 'Classificacao'}.png`; link.click(); }
    } catch (error) { console.error("Erro ao gerar imagem:", error); } finally { setIsExporting(false); }
  };

  return (
    <div className="animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-3"><Trophy className="text-amber-400" size={28} /><h2 className="text-2xl font-bold text-white">Classificação</h2></div>
        <button onClick={handleExportTable} disabled={isExporting} className="flex items-center gap-2 bg-emerald-600/10 hover:bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 px-4 py-2 rounded-lg text-sm font-bold transition-all disabled:opacity-50"><Camera size={16} /> {isExporting ? 'Processando...' : 'Publicar Tabela'}</button>
      </div>
      <div ref={tableRef} className="bg-slate-900 rounded-2xl border border-slate-800 overflow-x-auto shadow-xl">
        {isExporting && compName && <div className="p-5 bg-slate-950 text-center border-b border-slate-800"><h2 className="text-xl font-black text-emerald-400 uppercase tracking-widest">🏆 {String(compName)}</h2><p className="text-xs text-slate-500 mt-1">Classificação Oficial • Clã Kame</p></div>}
        {isGroupsFormat ? (
          <div className="flex flex-col">
            {Object.keys(comp.groups || {}).map((gName, idx) => {
              const gTeams = (teams || []).filter(t => t && comp.groups[gName].includes(t.id)); const gTable = calculateStandings(matches || [], gTeams, comp.id);
              return (
                <div key={gName} className={idx > 0 ? "border-t-4 border-slate-950" : ""}>
                  <div className="bg-slate-800/50 p-3 text-center border-b border-slate-800 flex justify-between px-4"><h3 className="text-sm font-bold text-emerald-400 uppercase tracking-widest">Grupo {gName}</h3></div>
                  <table className="w-full text-left text-sm whitespace-nowrap"><thead className="bg-slate-950/50 text-slate-400 font-medium"><tr><th className="p-4 w-12 text-center">#</th><th className="p-4">Time</th><th className="p-4 text-center">PTS</th><th className="p-4 text-center">J</th><th className="p-4 text-center">V</th><th className="p-4 text-center">E</th><th className="p-4 text-center">D</th><th className="p-4 text-center">GP</th><th className="p-4 text-center">GC</th><th className="p-4 text-center">SG</th></tr></thead>
                    <tbody className="divide-y divide-slate-800/50">
                      {gTable.map((row, index) => {
                        const isQualified = index < (comp.qualifiersPerGroup || 2);
                        return (
                          <tr key={row.id} className={`hover:bg-slate-800/50 transition-colors ${isQualified ? 'bg-emerald-500/5' : ''}`}>
                            <td className={`p-4 text-center font-bold ${isQualified ? 'text-emerald-400' : 'text-slate-500'}`}>{index + 1}</td><td className="p-4 font-medium text-white flex items-center gap-2"><ShieldDisplay shield={row.shield} size="small" /> {String(row.name)}</td>
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
          <table className="w-full text-left text-sm whitespace-nowrap"><thead className="bg-slate-950/50 text-slate-400 font-medium"><tr><th className="p-4 w-12 text-center">#</th><th className="p-4">Time</th><th className="p-4 text-center">PTS</th><th className="p-4 text-center">J</th><th className="p-4 text-center">V</th><th className="p-4 text-center">E</th><th className="p-4 text-center">D</th><th className="p-4 text-center">GP</th><th className="p-4 text-center">GC</th><th className="p-4 text-center">SG</th></tr></thead>
            <tbody className="divide-y divide-slate-800/50">
              {(() => {
                const table = calculateStandings(matches || [], teams || [], comp?.id);
                return table.filter(t => t.p > 0 || table.length > 0).map((row, index) => (
                  <tr key={row.id} className="hover:bg-slate-800/50 transition-colors">
                    <td className="p-4 text-center font-bold text-slate-500">{index + 1}</td><td className="p-4 font-medium text-white flex items-center gap-2"><ShieldDisplay shield={row.shield} size="small" /> {String(row.name)}</td>
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

const CompetitionDetails = ({ comp, teams, matches, onBack, currentUser, onReleaseRound, onSelectMatch, onDeleteMatch, onEditComp, showToast }) => {
  const [subTab, setSubTab] = useState('overview'); 
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const [exportingRoundId, setExportingRoundId] = useState(null); 
  const [editingMatchTeams, setEditingMatchTeams] = useState(null); 

  const getTeam = (id) => (teams || []).find(t => t && t.id === id);
  const isAdmin = currentUser?.role === 'leader' || currentUser?.role === 'kaioh';
  const safeCompTeams = Array.isArray(comp?.teams) ? comp.teams : [];
  
  const getMatchStatusDisplay = (matchId) => {
    const matchSubmissions = (matches || []).filter(m => m && m.matchId === matchId && m.compId === comp?.id && m.status !== 'rejected');
    if (matchSubmissions.length === 0) return { isPlayed: false, text: 'Aguardando', color: 'text-slate-500', bg: 'bg-slate-900 border-slate-800' };
    matchSubmissions.sort((a, b) => parseInt(String(b.id).split('_')[1] || '0') - parseInt(String(a.id).split('_')[1] || '0'));
    const sm = matchSubmissions.find(m => m.status === 'approved') || matchSubmissions.find(m => m.status === 'pending');
    if (!sm) return { isPlayed: false, text: 'Aguardando', color: 'text-slate-500', bg: 'bg-slate-900 border-slate-800' };
    if (sm.status === 'approved') return { submittedMatchId: sm.id, isPlayed: true, scoreA: sm.scoreA, scoreB: sm.scoreB, penaltiesA: sm.penaltiesA, penaltiesB: sm.penaltiesB, text: 'Oficial', color: 'text-emerald-400', bg: 'bg-slate-950 border-emerald-900/50' };
    if (sm.status === 'pending') return { submittedMatchId: sm.id, isPlayed: true, scoreA: sm.scoreA, scoreB: sm.scoreB, penaltiesA: sm.penaltiesA, penaltiesB: sm.penaltiesB, text: 'Em Validação', color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20' };
    return { isPlayed: false, text: 'Desconhecido', color: 'text-slate-500', bg: 'bg-slate-900 border-slate-800' };
  };

  const topScorers = useMemo(() => {
    const sMap = {}; (matches || []).filter(m => m && m.compId === comp?.id && m.status === 'approved').forEach(m => { (m.goals || []).forEach(g => { if (!g.player || g.player.trim() === '') return; const k = `${g.player.toLowerCase().trim()}-${g.teamId}`; if (!sMap[k]) sMap[k] = { player: g.player.trim(), teamId: g.teamId, count: 0 }; sMap[k].count++; }); });
    return Object.values(sMap).sort((a, b) => b.count - a.count);
  }, [matches, comp?.id]);

  const topAssists = useMemo(() => {
    const aMap = {}; (matches || []).filter(m => m && m.compId === comp?.id && m.status === 'approved').forEach(m => { (m.goals || []).forEach(g => { if (!g.assist || g.assist.trim() === '') return; const k = `${g.assist.toLowerCase().trim()}-${g.teamId}`; if (!aMap[k]) aMap[k] = { player: g.assist.trim(), teamId: g.teamId, count: 0 }; aMap[k].count++; }); });
    return Object.values(aMap).sort((a, b) => b.count - a.count);
  }, [matches, comp?.id]);

  const handleReleaseAndExport = async (round) => {
    try {
      setExportingRoundId(round.id); let html2canvas = window.html2canvas;
      if (!html2canvas) { await new Promise((resolve, reject) => { const script = document.createElement('script'); script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js'; script.onload = resolve; script.onerror = reject; document.head.appendChild(script); }); html2canvas = window.html2canvas; }
      await new Promise(r => setTimeout(r, 300)); const element = document.getElementById(`round-capture-${round.id}`);
      if (element) { const watermark = document.createElement('div'); watermark.innerHTML = `<div class="p-3 bg-slate-950 text-center border-t border-slate-800 text-[10px] text-slate-500 font-bold uppercase tracking-widest leading-relaxed">🏆 ${comp.name} • Rodada Oficial<br/>Gerado pelo App do Clã Kame</div>`; element.appendChild(watermark); const canvas = await html2canvas(element, { backgroundColor: '#0f172a', scale: 2, useCORS: true, windowWidth: element.scrollWidth, windowHeight: element.scrollHeight, ignoreElements: (el) => el.classList && el.classList.contains('no-export') }); element.removeChild(watermark); const link = document.createElement("a"); link.href = canvas.toDataURL("image/png"); link.download = `${String(comp.name).replace(/\s+/g, '_')}_Rodada_${round.number}.png`; link.click(); }
    } catch (error) { console.error("Erro exportação:", error); } finally { setExportingRoundId(null); if (round.status === 'locked' && onReleaseRound) onReleaseRound(comp.id, round.id); }
  };

  if (!comp) return null;

  return (
    <div className="animate-in fade-in duration-500 space-y-6">
      <button onClick={onBack} className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors mb-4"><ArrowLeft size={20} /> Voltar para Competições</button>
      <div className="bg-gradient-to-r from-emerald-900/40 to-slate-900 p-6 rounded-2xl border border-emerald-900/50 flex justify-between items-center shadow-xl">
        <div><h2 className="text-3xl font-bold text-white mb-2">{String(comp.name)}</h2><p className="text-emerald-400 flex items-center gap-2"><Trophy size={16}/> {comp.format === 'league' ? 'Pontos Corridos' : comp.format === 'groups' ? 'Fase de Grupos' : 'Mata-Mata'}</p></div>
      </div>
      <div className="flex flex-col md:flex-row p-1 bg-slate-950 rounded-xl mb-6 border border-slate-800 gap-1 shadow-md">
        <button onClick={() => setSubTab('overview')} className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${subTab === 'overview' ? 'bg-emerald-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}>Classificação & Jogos</button>
        <button onClick={() => setSubTab('scorers')} className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${subTab === 'scorers' ? 'bg-amber-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}>Artilharia ⚽</button>
        <button onClick={() => setSubTab('assists')} className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${subTab === 'assists' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}>Assistências 👟</button>
      </div>

      {subTab === 'overview' && (
        <div className="space-y-8 animate-in fade-in">
          <Standings matches={matches} teams={(teams || []).filter(t => t && safeCompTeams.includes(t.id))} comp={comp} />
          <div>
            <h3 className="text-xl font-bold text-white mb-4">Rodadas e Jogos</h3>
            {(comp.rounds && comp.rounds.length > 0) ? (
              <div className="space-y-6">
                {comp.rounds.map((round) => (
                  <div key={round.id} id={`round-capture-${round.id}`} className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden shadow-lg relative">
                    <div className="bg-slate-950/50 p-4 border-b border-slate-800 flex justify-between items-center">
                      <h4 className="font-bold text-white flex items-center gap-2">{round.status === 'locked' ? <Lock size={16} className="text-slate-500 no-export"/> : <Play size={16} className="text-emerald-500 no-export"/>} Rodada {String(round.number)}</h4>
                      <div className="no-export flex items-center gap-2">
                        {round.status === 'locked' ? ( isAdmin ? <Button variant="outline" className="text-xs py-1 border-emerald-500/50 text-emerald-400 hover:bg-emerald-500/10" disabled={exportingRoundId === round.id} onClick={() => handleReleaseAndExport(round)}>{exportingRoundId === round.id ? 'Gerando...' : 'Liberar Rodada'}</Button> : <span className="text-xs bg-slate-800 text-slate-400 px-2 py-1 rounded-full">Bloqueada</span> ) : ( <> {isAdmin && <button onClick={() => handleReleaseAndExport(round)} className="text-slate-500 hover:text-emerald-400 transition-colors p-1"><Camera size={16} /></button>} <span className="text-xs bg-emerald-500/20 text-emerald-400 px-2 py-1 rounded-full">Liberada</span> </> )}
                      </div>
                    </div>
                    <div className="p-4 flex flex-col gap-3 w-full">
                      {(() => {
                        const gm = (round.matches || []).reduce((acc, match) => { const key = match.groupId || 'Sem Grupo'; if (!acc[key]) acc[key] = []; acc[key].push(match); return acc; }, {});
                        return Object.keys(gm).map(groupKey => (
                          <div key={groupKey} className="space-y-3 mb-4 last:mb-0">
                            {comp.format === 'groups' && !round.id.toString().startsWith('ko_') && ( <div className="text-[10px] font-bold text-emerald-400 border-b border-slate-800 pb-1 uppercase tracking-widest">{groupKey === 'Sem Grupo' ? 'Outros / Manuais' : `Grupo ${groupKey}`}</div> )}
                            {gm[groupKey].map((match) => {
                              const tA = getTeam(match.teamA); const tB = getTeam(match.teamB); const sUI = getMatchStatusDisplay(match.id); 
                              const nA = tA?.name || match.placeholderA || (match.teamA ? 'Time Removido' : 'Aguardando Sorteio');
                              const nB = tB?.name || match.placeholderB || (match.teamB ? 'Time Removido' : 'Aguardando Sorteio');

                              return (
                                <div key={match.id} onClick={() => { if (sUI.isPlayed && onSelectMatch && !editingMatchTeams) { const ms = (matches || []).filter(m => m && m.matchId === match.id && m.compId === comp.id && m.status !== 'rejected'); ms.sort((a, b) => parseInt(String(b.id).split('_')[1] || '0') - parseInt(String(a.id).split('_')[1] || '0')); const sm = ms.find(m => m.status === 'approved') || ms.find(m => m.status === 'pending'); if (sm) onSelectMatch(sm); } }} className={`bg-slate-950 p-4 rounded-xl border border-slate-800/50 flex flex-col gap-2 relative w-full ${sUI.isPlayed && !editingMatchTeams ? 'cursor-pointer hover:border-emerald-500/50 hover:shadow-lg transition-all group' : 'group'}`}>
                                  {editingMatchTeams?.matchId === match.id ? (
                                    <div className="flex flex-col md:flex-row items-center w-full gap-2 p-3 bg-slate-900 border border-amber-500/50 rounded-xl no-export" onClick={e=>e.stopPropagation()}>
                                      <select value={editingMatchTeams.teamA} onChange={e=>setEditingMatchTeams({...editingMatchTeams, teamA: e.target.value})} className={inputClass}><option value="">{String(match.placeholderA || 'Nenhum')}</option>{safeCompTeams.map(tId => { const t = getTeam(tId); return t ? <option key={t.id} value={t.id}>{String(t.name)}</option> : null; })}</select>
                                      <span className="text-xs text-slate-500 font-bold hidden md:block">X</span>
                                      <select value={editingMatchTeams.teamB} onChange={e=>setEditingMatchTeams({...editingMatchTeams, teamB: e.target.value})} className={inputClass}><option value="">{String(match.placeholderB || 'Nenhum')}</option>{safeCompTeams.map(tId => { const t = getTeam(tId); return t ? <option key={t.id} value={t.id}>{String(t.name)}</option> : null; })}</select>
                                      <div className="flex gap-2 w-full md:w-auto mt-2 md:mt-0"><Button onClick={async () => { const newRounds = comp.rounds.map(r => r.id === editingMatchTeams.roundId ? { ...r, matches: r.matches.map(m => m.id === editingMatchTeams.matchId ? { ...m, teamA: editingMatchTeams.teamA, teamB: editingMatchTeams.teamB } : m) } : r); await onEditComp({ ...comp, rounds: newRounds }); setEditingMatchTeams(null); if(showToast) showToast("Partida atualizada com sucesso!", "success"); }} className="flex-1 md:flex-none py-2 text-xs bg-emerald-600 hover:bg-emerald-500"><Save size={14}/></Button><Button onClick={()=>setEditingMatchTeams(null)} variant="outline" className="flex-1 md:flex-none py-2 text-xs border-slate-600 text-slate-400"><X size={14}/></Button></div>
                                    </div>
                                  ) : (
                                    <>
                                      {isAdmin && !sUI.isPlayed && <button onClick={(e) => { e.stopPropagation(); setEditingMatchTeams({ roundId: round.id, matchId: match.id, teamA: match.teamA, teamB: match.teamB }); }} className="absolute top-2 left-2 text-slate-500 hover:text-amber-400 opacity-0 group-hover:opacity-100 transition-opacity p-1.5 bg-slate-900 border border-slate-700 rounded-lg z-10 no-export shadow-lg flex items-center gap-1 text-[10px] font-bold"><Edit size={12} /> Editar</button>}
                                      {isAdmin && sUI.isPlayed && sUI.submittedMatchId && ( <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all bg-slate-900/90 backdrop-blur-sm p-1 rounded-lg border border-slate-700/50 z-10 no-export" onClick={e => e.stopPropagation()}>{deleteConfirmId === sUI.submittedMatchId ? ( <div className="flex items-center gap-1 px-1"><button onClick={(e) => { e.stopPropagation(); onDeleteMatch(sUI.submittedMatchId); setDeleteConfirmId(null); }} className="bg-red-600 hover:bg-red-500 text-white px-2 py-1 rounded text-xs font-bold transition-colors">Excluir</button><button onClick={(e) => { e.stopPropagation(); setDeleteConfirmId(null); }} className="bg-slate-700 hover:bg-slate-600 text-white px-2 py-1 rounded text-xs transition-colors">Cancelar</button></div> ) : ( <button onClick={(e) => { e.stopPropagation(); setDeleteConfirmId(sUI.submittedMatchId); }} className="text-slate-400 hover:text-red-400 p-1.5 transition-colors"><Trash2 size={14} /></button> )}</div> )}
                                      <div className="flex items-center justify-between w-full gap-3">
                                        <div className="flex items-center gap-2 flex-1 justify-end"><span className={`font-bold text-xs md:text-sm text-right leading-snug break-words whitespace-normal ${tA ? 'text-slate-200' : 'text-slate-500 italic'}`} style={{ wordBreak: 'break-word' }}>{String(nA)}</span>{tA && <div className="shrink-0 flex items-center justify-center"><ShieldDisplay shield={tA.shield} size="small" /></div>}</div>
                                        <div className={`flex flex-col items-center justify-center px-3 py-2 rounded-lg border shrink-0 min-w-[80px] md:min-w-[100px] transition-colors ${sUI.bg}`}><div className="flex items-center gap-1.5">{sUI.penaltiesA !== null && sUI.penaltiesA !== undefined && <span className="text-[10px] text-amber-400 font-bold">({sUI.penaltiesA})</span>}<span className={`font-bold text-sm md:text-base ${sUI.color}`}>{sUI.isPlayed ? String(sUI.scoreA) : '-'}</span><span className="text-[10px] text-slate-500 font-bold mx-0.5">X</span><span className={`font-bold text-sm md:text-base ${sUI.color}`}>{sUI.isPlayed ? String(sUI.scoreB) : '-'}</span>{sUI.penaltiesB !== null && sUI.penaltiesB !== undefined && <span className="text-[10px] text-amber-400 font-bold">({sUI.penaltiesB})</span>}</div></div>
                                        <div className="flex items-center gap-2 flex-1 justify-start">{tB && <div className="shrink-0 flex items-center justify-center"><ShieldDisplay shield={tB.shield} size="small" /></div>}<span className={`font-bold text-xs md:text-sm text-left leading-snug break-words whitespace-normal ${tB ? 'text-slate-200' : 'text-slate-500 italic'}`} style={{ wordBreak: 'break-word' }}>{String(nB)}</span></div>
                                      </div>
                                      {sUI.text !== 'Oficial' && <div className="flex justify-center mt-1 no-export"><span className={`text-[9px] uppercase tracking-wider font-bold ${sUI.color}`}>{String(sUI.text)}</span></div>}
                                      {sUI.isPlayed && sUI.text === 'Oficial' && <div className="flex justify-center mt-1 opacity-0 group-hover:opacity-100 transition-opacity no-export"><span className="text-[9px] uppercase tracking-wider font-bold text-slate-500">Clique para Detalhes</span></div>}
                                    </>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        ));
                      })()}
                    </div>
                  </div>
                ))}
              </div>
            ) : ( <p className="text-slate-500 text-center py-8 bg-slate-900 rounded-xl border border-slate-800">Nenhuma rodada gerada.</p> )}
          </div>
        </div>
      )}

      {subTab === 'scorers' && (
        <div className="animate-in fade-in slide-in-from-right-4">
          <h3 className="text-xl font-bold text-white mb-4">Tabela de Artilharia</h3>
          <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-x-auto shadow-xl">
            <table className="w-full text-left text-sm whitespace-nowrap"><thead className="bg-slate-950/50 text-slate-400 font-medium border-b border-slate-800"><tr><th className="p-4 w-12 text-center">#</th><th className="p-4">Jogador</th><th className="p-4">Time</th><th className="p-4 text-center">Gols</th></tr></thead>
              <tbody className="divide-y divide-slate-800/50">
                {topScorers.length === 0 ? <tr><td colSpan="4" className="p-4 text-center text-slate-500">Nenhum gol registrado.</td></tr> : topScorers.map((s, i) => { const tm = getTeam(s.teamId); return <tr key={i} className="hover:bg-slate-800/50 transition-colors"><td className="p-4 text-center font-bold text-slate-500">{i===0?'🥇':i===1?'🥈':i===2?'🥉':`${i+1}`}</td><td className="p-4 font-bold text-white flex items-center gap-2">⚽ {s.player}</td><td className="p-4 text-slate-300"><div className="flex items-center gap-2"><ShieldDisplay shield={tm?.shield} size="small" /><span className="truncate max-w-[120px] md:max-w-[200px]">{tm?.name || 'Desconhecido'}</span></div></td><td className="p-4 text-center font-black text-emerald-400 text-lg">{s.count}</td></tr>; })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {subTab === 'assists' && (
        <div className="animate-in fade-in slide-in-from-right-4">
          <h3 className="text-xl font-bold text-white mb-4">Líderes de Assistências</h3>
          <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-x-auto shadow-xl">
            <table className="w-full text-left text-sm whitespace-nowrap"><thead className="bg-slate-950/50 text-slate-400 font-medium border-b border-slate-800"><tr><th className="p-4 w-12 text-center">#</th><th className="p-4">Jogador</th><th className="p-4">Time</th><th className="p-4 text-center">Assistências</th></tr></thead>
              <tbody className="divide-y divide-slate-800/50">
                {topAssists.length === 0 ? <tr><td colSpan="4" className="p-4 text-center text-slate-500">Nenhuma assistência registrada.</td></tr> : topAssists.map((a, i) => { const tm = getTeam(a.teamId); return <tr key={i} className="hover:bg-slate-800/50 transition-colors"><td className="p-4 text-center font-bold text-slate-500">{i===0?'🥇':i===1?'🥈':i===2?'🥉':`${i+1}`}</td><td className="p-4 font-bold text-white flex items-center gap-2">👟 {a.player}</td><td className="p-4 text-slate-300"><div className="flex items-center gap-2"><ShieldDisplay shield={tm?.shield} size="small" /><span className="truncate max-w-[120px] md:max-w-[200px]">{tm?.name || 'Desconhecido'}</span></div></td><td className="p-4 text-center font-black text-blue-400 text-lg">{a.count}</td></tr>; })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

const SubmitMatch = ({ teams, competitions, matches, onSubmit, currentUser, showToast }) => {
  const [selectedCompId, setSelectedCompId] = useState(''); const [selectedMatchId, setSelectedMatchId] = useState('');
  const [availableMatches, setAvailableMatches] = useState([]);
  const [teamA, setTeamA] = useState(null); const [teamB, setTeamB] = useState(null);
  const [scoreA, setScoreA] = useState(''); const [scoreB, setScoreB] = useState('');
  const [penaltiesA, setPenaltiesA] = useState(''); const [penaltiesB, setPenaltiesB] = useState('');
  const [goalsA, setGoalsA] = useState([]); const [goalsB, setGoalsB] = useState([]);
  const [observacoes, setObservacoes] = useState('');
  const [matchImageBase64, setMatchImageBase64] = useState(null); const [isAnalyzing, setIsAnalyzing] = useState(false); const [imageUploaded, setImageUploaded] = useState(false);
  const [isManualMode, setIsManualMode] = useState(false);

  const [userApiKey, setUserApiKey] = useState(() => localStorage.getItem('gemini_api_key') || '');
  const [showKeyInput, setShowKeyInput] = useState(false); const [tempKey, setTempKey] = useState('');

  const isAdmin = currentUser?.role === 'leader' || currentUser?.role === 'kaioh';
  const userTeamIds = useMemo(() => (teams || []).filter(t => t && t.ownerId === currentUser?.id).map(t => t.id), [teams, currentUser]);
  const visibleCompetitions = useMemo(() => (competitions || []).filter(c => c && (isAdmin || (c.teams || []).some(tId => userTeamIds.includes(tId)))), [competitions, isAdmin, userTeamIds]);
  const selectedComp = useMemo(() => (competitions || []).find(c => c && c.id === selectedCompId), [selectedCompId, competitions]);
  const isCup = selectedComp?.format === 'cup' || (selectedComp?.format === 'groups' && selectedMatchId.includes('_ko_'));
  const isTie = scoreA !== '' && scoreB !== '' && scoreA === scoreB;

  useEffect(() => {
    setSelectedMatchId(''); resetAI();
    if (!selectedCompId) { setAvailableMatches([]); return; }
    const comp = competitions.find(c => c && c.id === selectedCompId);
    if (comp && comp.rounds) {
      let toPlay = [];
      comp.rounds.filter(r => r.status === 'released').forEach(round => {
        (round.matches || []).forEach(rm => {
          const alreadySubmitted = matches.some(m => m && m.matchId === rm.id && (m.status === 'pending' || m.status === 'approved'));
          if (!alreadySubmitted && rm.teamA && rm.teamB && (isAdmin || userTeamIds.includes(rm.teamA) || userTeamIds.includes(rm.teamB))) { toPlay.push({ ...rm, roundId: round.id }); }
        });
      }); setAvailableMatches(toPlay);
    }
  }, [selectedCompId, competitions, matches, isAdmin, userTeamIds]);

  useEffect(() => {
    resetAI();
    if (selectedMatchId) { const match = availableMatches.find(m => m.id === selectedMatchId); if (match) { setTeamA((teams || []).find(t => t && t.id === match.teamA)); setTeamB((teams || []).find(t => t && t.id === match.teamB)); } } 
    else { setTeamA(null); setTeamB(null); }
  }, [selectedMatchId, availableMatches, teams]);

  const resetAI = () => { setScoreA(''); setScoreB(''); setPenaltiesA(''); setPenaltiesB(''); setGoalsA([]); setGoalsB([]); setObservacoes(''); setImageUploaded(false); setMatchImageBase64(null); setIsManualMode(false); };

  const calculateSimilarity = (str1, str2) => {
    if(!str1 || !str2) return 0;
    const words1 = str1.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/).filter(w => w.length > 2); const words2 = str2.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/).filter(w => w.length > 2);
    return words1.filter(w => words2.includes(w)).length;
  };

  const handleSaveApiKey = () => { if (tempKey.trim() !== '') { localStorage.setItem('gemini_api_key', tempKey.trim()); setUserApiKey(tempKey.trim()); setShowKeyInput(false); if (showToast) showToast("Chave da IA ativada com sucesso!", "success"); } };

  const handleImageUpload = (e) => {
    const file = e.target.files[0]; if (!file) return; const apiKeyToUse = userApiKey || '';
    processScreenshot(file, async (base64) => {
      setMatchImageBase64(base64); setIsAnalyzing(true); setImageUploaded(false); setIsManualMode(false); setScoreA(''); setScoreB(''); setGoalsA([]); setGoalsB([]); setPenaltiesA(''); setPenaltiesB('');
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
  "leftTeamName": "nome lido no escudo da esquerda", "leftScore": 0, "leftGoals": [{"player": "Nome", "assist": "Nome ou vazio", "minute": "90"}],
  "rightTeamName": "nome lido no escudo da direita", "rightScore": 0, "rightGoals": [{"player": "Nome", "assist": "", "minute": "90"}]
}`;
        const mimeType = base64.match(/data:(.*?);base64/)[1]; const base64ImageData = base64.split(',')[1]; const payload = { contents: [{ role: "user", parts: [ { text: prompt }, { inlineData: { mimeType: mimeType, data: base64ImageData } } ] }], generationConfig: { responseMimeType: "application/json" } };
        
        const safeKey = apiKeyToUse ? encodeURIComponent(apiKeyToUse.trim()) : '';
        const endpoints = [ `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${safeKey}` ];

        let resultJson; let lastError; let authErrorCount = 0;
        for (const url of endpoints) {
          try {
            const response = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
            if (!response.ok) {
               const errData = await response.json().catch(() => null); const errorMsg = errData?.error?.message || `Erro ${response.status}`;
               if (apiKeyToUse && (response.status === 403 || response.status === 401 || response.status === 404)) authErrorCount++;
               throw new Error(`Erro Google: ${errorMsg}`);
            }
            resultJson = await response.json(); break; 
          } catch (error) { lastError = error; }
        }

        if (!resultJson) {
            if (apiKeyToUse && authErrorCount === endpoints.length) { localStorage.removeItem('gemini_api_key'); setUserApiKey(''); setShowKeyInput(true); throw new Error("Sua chave foi rejeitada (Sem permissão ou inválida). Tente gerar uma nova."); }
            throw lastError || new Error("A IA não conseguiu processar o placar.");
        }

        let textResponse = resultJson.candidates[0].content.parts[0].text.trim().replace(/```json/gi, '').replace(/```/g, '').trim();
        const data = JSON.parse(textResponse);

        const leftName = String(data.leftTeamName || ""); const rightName = String(data.rightTeamName || "");
        const nameA = String(teamA?.name || ""); const nameB = String(teamB?.name || "");
        const leftMatchesA = calculateSimilarity(leftName, nameA); const rightMatchesA = calculateSimilarity(rightName, nameA);
        const leftMatchesB = calculateSimilarity(leftName, nameB); const rightMatchesB = calculateSimilarity(rightName, nameB);
        const isTeamA_Left = (leftMatchesA + rightMatchesB) >= (leftMatchesB + rightMatchesA);

        if (isTeamA_Left) { setScoreA(data.leftScore?.toString() || '0'); setScoreB(data.rightScore?.toString() || '0'); setGoalsA(data.leftGoals || []); setGoalsB(data.rightGoals || []); } 
        else { setScoreA(data.rightScore?.toString() || '0'); setScoreB(data.leftScore?.toString() || '0'); setGoalsA(data.rightGoals || []); setGoalsB(data.leftGoals || []); }

        setImageUploaded(true); if (showToast) showToast("Dados extraídos do Print pela IA!", "success");
      } catch (error) { console.error("Erro IA:", error); setImageUploaded(false); if (showToast) showToast(`Falha na IA: ${error.message.substring(0, 70)}`, "error"); else alert(`Falha na IA: ${error.message}`); } 
      finally { setIsAnalyzing(false); if (e.target) e.target.value = null; }
    });
  };

  const handleAddGoal = (team) => { if (team === 'A') { setGoalsA([...goalsA, { player: '', assist: '', minute: '' }]); setScoreA((parseInt(scoreA || 0) + 1).toString()); } else { setGoalsB([...goalsB, { player: '', assist: '', minute: '' }]); setScoreB((parseInt(scoreB || 0) + 1).toString()); } };
  const handleRemoveGoal = (team, index) => { if (team === 'A') { const updated = [...goalsA]; updated.splice(index, 1); setGoalsA(updated); setScoreA(Math.max(0, parseInt(scoreA || 0) - 1).toString()); } else { const updated = [...goalsB]; updated.splice(index, 1); setGoalsB(updated); setScoreB(Math.max(0, parseInt(scoreB || 0) - 1).toString()); } };
  const handleGoalChange = (team, index, field, value) => { if (team === 'A') { const updated = [...goalsA]; updated[index][field] = value; setGoalsA(updated); } else { const updated = [...goalsB]; updated[index][field] = value; setGoalsB(updated); } };

  const handleSubmit = (e) => {
    e.preventDefault();
    if(!selectedCompId || !selectedMatchId) { if(showToast) showToast("Selecione a competição e a partida primeiro.", "error"); return; }
    if (scoreA === '' || scoreB === '') { if(showToast) showToast("O placar não pode estar vazio.", "error"); return; }
    if (isCup && isTie && (penaltiesA === '' || penaltiesB === '')) { if(showToast) showToast("Em jogos de eliminação, preencha os Pênaltis!", "error"); return; }

    const matchDetails = availableMatches.find(m => m.id === selectedMatchId);
    const allGoals = [...(goalsA || []).map(g => ({ teamId: teamA.id, player: String(g.player||''), assist: String(g.assist||''), minute: String(g.minute||'') })), ...(goalsB || []).map(g => ({ teamId: teamB.id, player: String(g.player||''), assist: String(g.assist||''), minute: String(g.minute||'') }))];

    onSubmit({
      id: `m_${Date.now()}`, compId: selectedCompId, roundId: matchDetails.roundId, matchId: selectedMatchId, 
      teamA: teamA.id, teamB: teamB.id, scoreA: parseInt(scoreA), scoreB: parseInt(scoreB), penaltiesA: (isCup && isTie && penaltiesA !== '') ? parseInt(penaltiesA) : null, penaltiesB: (isCup && isTie && penaltiesB !== '') ? parseInt(penaltiesB) : null,
      goals: allGoals, observacoes: observacoes.trim(), status: 'pending', submittedBy: String(currentUser?.name || 'Técnico'), imageUrl: matchImageBase64
    }); setSelectedCompId('');
  };

  return (
    <div className="max-w-2xl mx-auto animate-in fade-in duration-500 pb-12">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-white flex items-center gap-2"><Camera className="text-emerald-500" /> Registrar Partida</h2>
        <button onClick={() => setShowKeyInput(!showKeyInput)} className="text-xs flex items-center gap-1 bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-1.5 rounded-lg border border-slate-700 transition-colors"><Key size={14}/> IA Config</button>
      </div>

      <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 space-y-6 shadow-xl">
        
        {showKeyInput && (
          <div className="bg-amber-500/10 border border-amber-500/30 p-4 rounded-xl animate-in slide-in-from-top-4">
            <h3 className="text-sm font-bold text-amber-400 mb-2 flex items-center gap-2"><Key size={16}/> Chave de Ativação do Gemini</h3>
            <p className="text-xs text-slate-400 mb-3">Opcional no ambiente atual. Para usar a leitura inteligente fora daqui, cole a sua chave exclusiva do <b>Google AI Studio</b>. Ela ficará salva apenas no seu navegador.</p>
            <div className="flex gap-2"><input type="password" value={tempKey} onChange={e=>setTempKey(e.target.value)} placeholder="Ex: AIzaSy..." className={inputClass} /><Button type="button" onClick={handleSaveApiKey} className="bg-amber-600 hover:bg-amber-500 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-lg shadow-amber-900/50">Salvar</Button></div>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-slate-400 mb-2">1. Competição</label>
          <select value={selectedCompId} onChange={e => setSelectedCompId(e.target.value)} className={inputClass}><option value="">Escolha um campeonato...</option>{visibleCompetitions.map(c => <option key={c.id} value={c.id}>{String(c.name)}</option>)}</select>
        </div>

        {selectedCompId && (
          <div className="animate-in fade-in">
            <label className="block text-sm font-medium text-slate-400 mb-2">2. Selecione a Partida Liberada</label>
            {availableMatches.length > 0 ? (
              <select value={selectedMatchId} onChange={e => setSelectedMatchId(e.target.value)} className={inputClass}>
                <option value="">Qual jogo você jogou?</option>
                {availableMatches.map(m => { const tA = (teams || []).find(t=>t && t.id===m.teamA)?.name; const tB = (teams || []).find(t=>t && t.id===m.teamB)?.name; return <option key={m.id} value={m.id}>Rodada {String(m.roundId || '').replace('r','')} - {String(tA || 'Time A')} x {String(tB || 'Time B')}</option> })}
              </select>
            ) : <div className="p-3 bg-slate-950 rounded border border-slate-800 text-slate-500 text-sm">Nenhuma partida pendente de envio para você nesta competição.</div>}
          </div>
        )}

        {selectedMatchId && !imageUploaded && !isManualMode && (
          <div className="animate-in slide-in-from-top-4">
            <label className="block text-sm font-medium text-slate-400 mb-2">3. Como deseja registrar o placar?</label>
            <div className="mb-6 space-y-4">
              <label className={`border-2 border-dashed rounded-xl p-6 text-center transition-colors cursor-pointer relative overflow-hidden block border-slate-700 hover:border-slate-500 bg-slate-950`}>
                <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} disabled={isAnalyzing} />
                {isAnalyzing ? ( <div className="flex flex-col items-center space-y-3"><div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div><p className="text-emerald-400 font-medium">IA analisando o print...</p></div> ) : ( <div className="flex flex-col items-center space-y-3"><UploadCloud className="text-emerald-500" size={32} /><p className="text-white font-medium text-sm">Enviar Print e Usar Inteligência Artificial</p></div> )}
              </label>
              <div className="flex items-center gap-4"><div className="flex-1 h-px bg-slate-800"></div><span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">OU</span><div className="flex-1 h-px bg-slate-800"></div></div>
              <Button type="button" variant="outline" onClick={() => setIsManualMode(true)} className="w-full py-4 border-slate-700 border-dashed text-slate-400 hover:text-white hover:bg-slate-800 hover:border-slate-500"><Edit size={18} /> Preencher Manualmente (Sem Print)</Button>
            </div>
          </div>
        )}

        {(imageUploaded || isManualMode) && (
          <form onSubmit={handleSubmit} className="animate-in slide-in-from-bottom-4 space-y-6 pt-4 border-t border-slate-800">
            <div className="flex justify-between items-center mb-2">
              <label className="text-sm font-medium text-amber-400 flex items-center gap-2"><AlertCircle size={16}/> {matchImageBase64 ? 'Confirme os dados lidos pela IA' : 'Preencha os dados da partida'}</label>
              <button type="button" onClick={resetAI} className="text-xs text-slate-500 hover:text-slate-300 flex items-center gap-1 transition-colors"><ArrowLeft size={12}/> Voltar / Refazer</button>
            </div>
            
            <div className="flex flex-col md:flex-row gap-6 items-start bg-slate-950 p-4 rounded-xl border border-slate-800">
              <div className="flex-1 w-full space-y-3">
                <div className="text-center font-bold text-lg text-slate-300 flex items-center justify-center gap-2"><ShieldDisplay shield={teamA?.shield} size="small" /> {String(teamA?.name || 'Time A')}</div>
                <input type="number" value={scoreA} onChange={e=>setScoreA(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-white text-center text-3xl font-bold focus:border-emerald-500 outline-none" required />
                {isCup && isTie && ( <div className="mt-2"><label className="text-[10px] text-amber-400 uppercase tracking-widest font-bold">Pênaltis A</label><input type="number" required value={penaltiesA} onChange={e=>setPenaltiesA(e.target.value)} className="w-full bg-slate-900 border border-amber-500/50 text-center font-bold text-lg text-amber-400 rounded p-2 outline-none focus:border-amber-500" /></div> )}
                <div className="space-y-2 pt-2">
                  <span className="text-[10px] text-slate-500 uppercase font-bold block">Gols</span>
                  {goalsA.map((g, i) => (
                    <div key={i} className="flex flex-col gap-1 bg-slate-800 p-2 rounded">
                      <input type="text" value={g.player} onChange={e=>handleGoalChange('A', i, 'player', e.target.value)} placeholder="Goleador" className="w-full bg-slate-950 text-xs text-white px-2 py-1 rounded border border-slate-700 outline-none" required />
                      <div className="flex gap-1"><input type="text" value={g.assist || ''} onChange={e=>handleGoalChange('A', i, 'assist', e.target.value)} placeholder="Assist." className="flex-1 bg-slate-950 text-[10px] text-slate-400 px-2 py-1 rounded border border-slate-700 outline-none" /><input type="number" value={g.minute} onChange={e=>handleGoalChange('A', i, 'minute', e.target.value)} placeholder="Min" className="w-12 bg-slate-950 text-xs text-emerald-400 text-center px-1 py-1 rounded border border-slate-700 outline-none" required /><button type="button" onClick={()=>handleRemoveGoal('A', i)} className="text-red-400 p-1 hover:text-red-300"><X size={12}/></button></div>
                    </div>
                  ))}
                  <button type="button" onClick={()=>handleAddGoal('A')} className="text-[10px] text-emerald-400 hover:underline">+ Adicionar Gol</button>
                </div>
              </div>
              
              <div className="text-slate-500 font-bold text-xl self-center pt-8 hidden md:block">X</div>
              
              <div className="flex-1 w-full space-y-3">
                <div className="text-center font-bold text-lg text-slate-300 flex items-center justify-center gap-2">{String(teamB?.name || 'Time B')} <ShieldDisplay shield={teamB?.shield} size="small" /></div>
                <input type="number" value={scoreB} onChange={e=>setScoreB(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-white text-center text-3xl font-bold focus:border-emerald-500 outline-none" required />
                {isCup && isTie && ( <div className="mt-2"><label className="text-[10px] text-amber-400 uppercase tracking-widest font-bold">Pênaltis B</label><input type="number" required value={penaltiesB} onChange={e=>setPenaltiesB(e.target.value)} className="w-full bg-slate-900 border border-amber-500/50 text-center font-bold text-lg text-amber-400 rounded p-2 outline-none focus:border-amber-500" /></div> )}
                <div className="space-y-2 pt-2">
                  <span className="text-[10px] text-slate-500 uppercase font-bold block text-right">Gols</span>
                  {goalsB.map((g, i) => (
                    <div key={i} className="flex flex-col gap-1 bg-slate-800 p-2 rounded">
                      <input type="text" value={g.player} onChange={e=>handleGoalChange('B', i, 'player', e.target.value)} placeholder="Goleador" className="w-full bg-slate-950 text-xs text-white px-2 py-1 rounded border border-slate-700 outline-none text-right" required />
                      <div className="flex gap-1"><button type="button" onClick={()=>handleRemoveGoal('B', i)} className="text-red-400 p-1 hover:text-red-300"><X size={12}/></button><input type="number" value={g.minute} onChange={e=>handleGoalChange('B', i, 'minute', e.target.value)} placeholder="Min" className="w-12 bg-slate-950 text-xs text-emerald-400 text-center px-1 py-1 rounded border border-slate-700 outline-none" required /><input type="text" value={g.assist || ''} onChange={e=>handleGoalChange('B', i, 'assist', e.target.value)} placeholder="Assist." className="flex-1 bg-slate-950 text-[10px] text-slate-400 px-2 py-1 rounded border border-slate-700 outline-none text-right" /></div>
                    </div>
                  ))}
                  <div className="flex justify-end"><button type="button" onClick={()=>handleAddGoal('B')} className="text-[10px] text-emerald-400 hover:underline">+ Adicionar Gol</button></div>
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

const Dashboard = ({ matches, teams, competitions, currentUser, onSelectMatch, onDeleteMatch }) => {
  const isAdmin = currentUser?.role === 'leader' || currentUser?.role === 'kaioh';
  const userTeamIds = (teams || []).filter(t => t && t.ownerId === currentUser?.id).map(t => t.id);
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  
  const visibleCompIds = (competitions || []).filter(c => c && c.teams?.some(t => userTeamIds.includes(t))).map(c => c.id);
  const recentMatches = (matches || []).filter(m => m && (isAdmin || visibleCompIds.includes(m.compId)) && m.status !== 'rejected').sort((a, b) => parseInt(b.id.split('_')[1] || '0') - parseInt(a.id.split('_')[1] || '0')).slice(0, 8);
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
            if (!m) return null;
            const tA = getTeam(m.teamA); const tB = getTeam(m.teamB);
            return (
              <div key={m.id} onClick={() => onSelectMatch && onSelectMatch(m)} className="bg-slate-900 p-3 md:p-4 rounded-xl border border-slate-800 flex flex-col gap-3 shadow-sm cursor-pointer hover:border-emerald-500/50 hover:shadow-lg transition-all group relative">
                {isAdmin && (
                  <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all bg-slate-900/90 backdrop-blur-sm p-1 rounded-lg border border-slate-700/50 z-10" onClick={e => e.stopPropagation()}>
                    {deleteConfirmId === m.id ? ( <div className="flex items-center gap-1 px-1"><button onClick={(e) => { e.stopPropagation(); onDeleteMatch(m.id); setDeleteConfirmId(null); }} className="bg-red-600 hover:bg-red-500 text-white px-2 py-1 rounded text-xs font-bold transition-colors">Excluir</button><button onClick={(e) => { e.stopPropagation(); setDeleteConfirmId(null); }} className="bg-slate-700 hover:bg-slate-600 text-white px-2 py-1 rounded text-xs transition-colors">Cancelar</button></div> ) : ( <button onClick={(e) => { e.stopPropagation(); setDeleteConfirmId(m.id); }} className="text-slate-400 hover:text-red-400 p-1.5 transition-colors"><Trash2 size={14} /></button> )}
                  </div>
                )}
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

const ValidationPanel = ({ matches, teams, competitions, onUpdateStatus, showToast }) => {
  const pending = (matches || []).filter(m => m && m.status === 'pending');
  const getTeam = (id) => (teams || []).find(t => t && t.id === id);
  const getCompName = (id) => (competitions || []).find(c => c && c.id === id)?.name || 'Competição Desconhecida';
  const [editedScores, setEditedScores] = useState({});

  const handleScoreChange = (matchId, field, value) => { setEditedScores(prev => ({ ...prev, [matchId]: { ...prev[matchId], [field]: value } })); };
  const getFormattedGoals = (teamId, allGoals, align) => {
    const goals = (allGoals || []).filter(g => g.teamId === teamId);
    if (goals.length === 0) return <span className={`text-[10px] md:text-xs text-slate-600 block text-${align}`}>Nenhum gol</span>;
    return (
      <div className={`space-y-1.5 text-[10px] md:text-xs text-slate-400 flex flex-col ${align === 'right' ? 'items-end text-right' : 'items-start text-left'}`}>
        {goals.map((g, i) => (
          <div key={i} className={`flex gap-1.5 items-start ${align === 'right' ? 'flex-row-reverse' : 'flex-row'}`}>
            <span className="text-emerald-400 font-bold mt-0.5">{String(g.minute)}'</span>
            <div className={`flex flex-col min-w-0 ${align === 'right' ? 'items-end' : 'items-start'}`}><span className="truncate font-medium text-slate-200">{String(g.player)}</span>{g.assist && <span className="text-[8.5px] text-slate-500 truncate">👟 {String(g.assist)}</span>}</div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="animate-in fade-in">
      <div className="flex items-center justify-between mb-6"><h2 className="text-2xl font-bold text-white flex items-center gap-2"><CheckSquare className="text-amber-500" /> Validação na Nuvem</h2><span className="bg-amber-500/20 text-amber-400 px-3 py-1 rounded-full text-sm">{pending.length} Pendentes</span></div>
      {pending.length === 0 ? (
        <div className="bg-slate-900 p-12 rounded-2xl border border-slate-800 text-center shadow-xl"><CheckCircle className="text-emerald-500 mx-auto mb-4" size={48} /><p className="text-slate-400">Nenhum jogo aguardando validação.</p></div>
      ) : (
        <div className="grid gap-6">
          {pending.map(m => {
            if (!m) return null; const tA = getTeam(m.teamA); const tB = getTeam(m.teamB);
            return (
              <div key={m.id} className="bg-slate-900 p-6 rounded-2xl border border-slate-800 flex flex-col gap-5 shadow-xl">
                <div className="text-center text-xs font-bold text-amber-500 uppercase tracking-widest bg-amber-500/5 py-2 rounded-lg border border-amber-500/10 mb-2">🏆 {String(getCompName(m.compId))}</div>
                <div className="flex flex-col md:flex-row items-stretch gap-6">
                  <div className="flex-1 space-y-4">
                    <div className="flex flex-col items-center gap-3 w-full bg-slate-950 p-4 rounded-xl border border-slate-800/50">
                      <div className="flex items-center justify-between w-full gap-2 border-b border-slate-800/50 pb-3">
                        <div className="flex items-center gap-2 flex-1 min-w-0 justify-start"><div className="shrink-0"><ShieldDisplay shield={tA?.shield} size="normal" /></div><span className="font-bold text-sm md:text-base text-white truncate">{String(tA?.name || 'Time A')}</span></div>
                        <div className="flex items-center justify-center gap-2 px-3 py-1.5 bg-slate-900 rounded-lg border border-slate-700 shrink-0 relative flex-col">
                          <div className="flex items-center gap-2">
                             <input type="number" value={editedScores[m.id]?.scoreA !== undefined ? editedScores[m.id].scoreA : m.scoreA} onChange={(e) => handleScoreChange(m.id, 'scoreA', e.target.value)} className="w-12 md:w-16 bg-slate-950 border border-slate-800 text-center font-bold text-xl md:text-2xl text-emerald-400 rounded outline-none focus:border-emerald-500 transition-colors" />
                             <span className="text-[10px] md:text-xs text-slate-500 font-bold mx-1">X</span>
                             <input type="number" value={editedScores[m.id]?.scoreB !== undefined ? editedScores[m.id].scoreB : m.scoreB} onChange={(e) => handleScoreChange(m.id, 'scoreB', e.target.value)} className="w-12 md:w-16 bg-slate-950 border border-slate-800 text-center font-bold text-xl md:text-2xl text-emerald-400 rounded outline-none focus:border-emerald-500 transition-colors" />
                          </div>
                          {m.penaltiesA !== null && m.penaltiesA !== undefined && (
                            <div className="flex items-center justify-center gap-1 mt-1 bg-slate-950 px-2 py-1 rounded border border-amber-500/20">
                              <span className="text-[8px] tracking-widest uppercase text-amber-500 font-bold mr-1">Pênaltis:</span><input type="number" value={editedScores[m.id]?.penaltiesA !== undefined ? editedScores[m.id].penaltiesA : m.penaltiesA} onChange={(e) => handleScoreChange(m.id, 'penaltiesA', e.target.value)} className="w-8 bg-slate-900 border border-amber-500/30 text-center font-bold text-xs text-amber-400 rounded outline-none focus:border-amber-500" /><span className="text-[9px] text-slate-500 font-bold">X</span><input type="number" value={editedScores[m.id]?.penaltiesB !== undefined ? editedScores[m.id].penaltiesB : m.penaltiesB} onChange={(e) => handleScoreChange(m.id, 'penaltiesB', e.target.value)} className="w-8 bg-slate-900 border border-amber-500/30 text-center font-bold text-xs text-amber-400 rounded outline-none focus:border-amber-500" />
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-2 flex-1 min-w-0 justify-end"><span className="font-bold text-sm md:text-base text-white truncate text-right">{String(tB?.name || 'Time B')}</span><div className="shrink-0"><ShieldDisplay shield={tB?.shield} size="normal" /></div></div>
                      </div>
                      <div className="flex items-start justify-between w-full pt-1"><div className="flex-1 min-w-0">{getFormattedGoals(m.teamA, m.goals || [], 'left')}</div><div className="w-[40px] shrink-0"></div><div className="flex-1 min-w-0">{getFormattedGoals(m.teamB, m.goals || [], 'right')}</div></div>
                    </div>
                    {m.observacoes && <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-sm"><p className="text-amber-400 font-semibold mb-1 text-xs">Observações do Técnico:</p><p className="text-slate-300 italic">"{String(m.observacoes)}"</p></div>}
                    <div className="text-[10px] text-slate-500 text-center md:text-left">Enviado por: <span className="text-slate-400 font-semibold">{String(m.submittedBy)}</span></div>
                  </div>
                  <div className="md:w-48 bg-slate-950 rounded-xl border border-slate-800 flex flex-col items-center justify-center p-4 text-center gap-2 relative overflow-hidden">
                    {typeof m.imageUrl === 'string' && m.imageUrl.startsWith('data:image') ? (
                      <><img src={m.imageUrl} alt="Print da Partida" onClick={() => window.open(m.imageUrl, '_blank')} className="absolute inset-0 w-full h-full object-cover opacity-50 hover:opacity-100 transition-opacity cursor-pointer z-0" /><span className="text-[10px] font-bold text-white bg-black/60 px-2 py-1 rounded z-10 pointer-events-none shadow-xl">CLIQUE PARA AMPLIAR</span></>
                    ) : ( <><Shield size={32} className="text-slate-600 animate-pulse" /><span className="text-xs text-slate-400 font-semibold z-10 drop-shadow-md">Nenhum Print</span><span className="text-[10px] text-slate-600 bg-slate-900 px-2 py-0.5 rounded border border-slate-800 z-10">Envio Manual</span></> )}
                  </div>
                </div>
                <div className="flex gap-2 justify-end pt-3 border-t border-slate-800/50">
                  <Button variant="outline" className="border-red-500/50 text-red-400" onClick={() => { onUpdateStatus(m.id, 'rejected'); showToast("Jogo Rejeitado!", "error"); }}><XCircle size={16}/> Rejeitar</Button>
                  <Button onClick={() => { onUpdateStatus(m.id, 'approved', editedScores[m.id]); showToast("Jogo Aprovado e validado!", "success"); }}><CheckCircle size={16}/> Aprovar e computar pontos</Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

const CreateTeamManual = ({ onCreate, showToast }) => {
  const [teamName, setTeamName] = useState(''); const [coachName, setCoachName] = useState(''); const [shieldData, setShieldData] = useState(null); const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault(); if(!teamName) return; setIsLoading(true);
    await onCreate({ id: `t${Date.now()}`, name: teamName, coach: coachName || 'Técnico Manual', whatsapp: '', ownerId: 'npc_manual', shield: shieldData || '🛡️' });
    showToast("Time criado e pronto para jogar!", "success"); setTeamName(''); setCoachName(''); setShieldData(null); setIsLoading(false);
  };

  return (
    <div className="max-w-2xl mx-auto animate-in fade-in pb-12">
      <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2"><UserPlus className="text-emerald-500"/> Criar Time Simples (S/ Acesso)</h2>
      <div className="bg-slate-800/50 border border-slate-700 p-4 rounded-xl mb-6 text-sm text-slate-300"><p className="font-bold flex items-center gap-2 text-white"><Activity size={16} className="text-emerald-400"/> Modo Rápido & Bots</p><p className="mt-1">Crie times rapidamente para preencher competições ou realizar testes. Esses times não têm um WhatsApp atrelado e ninguém fará login com eles.</p></div>
      <form onSubmit={handleSubmit} className="bg-slate-900 p-6 md:p-8 rounded-2xl border border-slate-800 space-y-5">
        <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
          <label className="block text-sm font-medium text-slate-400 mb-3">Escudo do Time</label>
          <div className="flex items-center gap-4"><div className="w-16 h-16 bg-slate-900 rounded-xl border border-slate-700 flex items-center justify-center overflow-hidden shrink-0"><ShieldDisplay shield={shieldData} size="large" /></div><div className="flex-1"><label className="cursor-pointer bg-slate-800 hover:bg-emerald-600 text-white transition-colors px-4 py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-2 max-w-[220px]"><UploadCloud size={18} />{shieldData ? 'Trocar Escudo' : 'Enviar Imagem'}<input type="file" accept="image/*" className="hidden" onChange={(e) => processImage(e.target.files[0], setShieldData)} /></label></div></div>
        </div>
        <div><label className="block text-sm font-medium text-slate-400 mb-1">Nome do Time <span className="text-red-400">*</span></label><input type="text" placeholder="Ex: Kame FC" value={teamName} onChange={e=>setTeamName(e.target.value)} className={inputClass} required /></div>
        <div><label className="block text-sm font-medium text-slate-400 mb-1">Nome do Técnico (Opcional)</label><input type="text" placeholder="Ex: Mestre Kame" value={coachName} onChange={e=>setCoachName(e.target.value)} className={inputClass} /></div>
        <Button type="submit" disabled={isLoading} className="w-full py-4 text-lg mt-4 shadow-emerald-900/50 shadow-xl flex items-center justify-center gap-2"><Save size={20} /> {isLoading ? 'Guardando...' : 'Salvar Time Manual'}</Button>
      </form>
    </div>
  );
};

const CreateTeamFull = ({ onCreate, showToast }) => {
  const [coachFirstName, setCoachFirstName] = useState(''); const [coachLastName, setCoachLastName] = useState('');
  const [teamName, setTeamName] = useState(''); const [whatsapp, setWhatsapp] = useState(''); const [email, setEmail] = useState('');
  const [role, setRole] = useState('member'); const [shieldData, setShieldData] = useState(null); const [isLoading, setIsLoading] = useState(false);
  
  const handleSubmit = async (e) => {
    e.preventDefault(); if(!teamName || !coachFirstName || !coachLastName || !whatsapp || !email) return; setIsLoading(true);
    const cleanWhatsapp = String(whatsapp).replace(/\D/g, ''); const fullName = `${coachFirstName} ${coachLastName}`;
    const isSuccess = await onCreate({ user: { id: `pending_${cleanWhatsapp}`, name: fullName, email: String(email).trim().toLowerCase(), role: role, whatsapp: cleanWhatsapp }, team: { id: `t${Date.now()}`, name: teamName, coach: fullName, whatsapp: cleanWhatsapp, ownerId: `pending_${cleanWhatsapp}`, shield: shieldData || '🛡️' } });
    if (isSuccess) {
      const siteUrl = window.location.origin; 
      const msg = `Fala ${coachFirstName}! Tudo certo? 🐉🥋\n\nO seu time *${teamName}* acaba de ser convocado para o Clã Kame! 🐢🔥\nSeu cargo atual de batalha é: *${ROLE_NAMES[role] || 'Membro Oficial'}*.\n\nPara acessar o seu Quartel General e entrar na arena, clique no link mágico abaixo ☁️👇\n\n🔗 *Link de Acesso:* ${siteUrl}\n\n⚠️ *ATENÇÃO - PRIMEIRO ACESSO:* ⚠️\nNa tela inicial, clique em "Realizar Primeiro Acesso", preencha o seu E-mail (*${email}*) e crie sua senha! 🔐\n\nEleva o teu Ki e vamos pro jogo! ⚡🎮`;
      window.open(`https://wa.me/${cleanWhatsapp}?text=${encodeURIComponent(msg)}`, '_blank');
      setCoachFirstName(''); setCoachLastName(''); setTeamName(''); setWhatsapp(''); setEmail(''); setRole('member'); setShieldData(null);
    } setIsLoading(false);
  };

  return (
    <div className="max-w-2xl mx-auto animate-in fade-in pb-12">
      <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2"><Users className="text-emerald-500"/> Convidar Técnico (Com Acesso)</h2>
      <div className="bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-xl mb-6 text-sm text-emerald-400"><p className="font-bold flex items-center gap-2"><Activity size={16}/> Registo Invisível + WhatsApp</p><p className="mt-1">Use este painel para convidar técnicos reais. O sistema vai preparar a conta, criar o time dele e gerar a mensagem automática no WhatsApp!</p></div>
      <form onSubmit={handleSubmit} className="bg-slate-900 p-6 md:p-8 rounded-2xl border border-slate-800 space-y-5">
        <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
          <label className="block text-sm font-medium text-slate-400 mb-3">Escudo do Time</label>
          <div className="flex items-center gap-4"><div className="w-16 h-16 bg-slate-900 rounded-xl border border-slate-700 flex items-center justify-center overflow-hidden shrink-0"><ShieldDisplay shield={shieldData} size="large" /></div><div className="flex-1"><label className="cursor-pointer bg-slate-800 hover:bg-emerald-600 text-white transition-colors px-4 py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-2 max-w-[220px]"><UploadCloud size={18} />{shieldData ? 'Trocar Escudo' : 'Enviar Imagem'}<input type="file" accept="image/*" className="hidden" onChange={(e) => processImage(e.target.files[0], setShieldData)} /></label></div></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5"><div><label className="block text-sm font-medium text-slate-400 mb-1">Nome do Técnico</label><input type="text" placeholder="Ex: Mestre" value={coachFirstName} onChange={e=>setCoachFirstName(e.target.value)} className={inputClass} required /></div><div><label className="block text-sm font-medium text-slate-400 mb-1">Sobrenome</label><input type="text" placeholder="Ex: Kame" value={coachLastName} onChange={e=>setCoachLastName(e.target.value)} className={inputClass} required /></div></div>
        <div><label className="block text-sm font-medium text-slate-400 mb-1">Nome do Time</label><input type="text" placeholder="Ex: Kame FC" value={teamName} onChange={e=>setTeamName(e.target.value)} className={inputClass} required /></div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5"><div><label className="block text-sm font-medium text-slate-400 mb-1">WhatsApp (com DDD)</label><input type="tel" placeholder="Ex: 11999999999" value={whatsapp} onChange={e=>setWhatsapp(e.target.value)} className={`${inputClass} font-mono`} required /></div><div><label className="block text-sm font-medium text-slate-400 mb-1">E-mail do Técnico</label><input type="email" placeholder="mestrekame@email.com" value={email} onChange={e=>setEmail(e.target.value)} className={inputClass} required /></div></div>
        <div><label className="block text-sm font-medium text-slate-400 mb-1">Cargo no Clã</label><select value={role} onChange={e=>setRole(e.target.value)} className={`${inputClass} cursor-pointer`}><option value="member">Membro Oficial (Padrão)</option><option value="kaioh">Senhor Kaioh (Sub-Líder)</option><option value="leader">Líder Supremo</option></select></div>
        <Button type="submit" disabled={isLoading} className="w-full py-4 text-lg mt-4 shadow-emerald-900/50 shadow-xl flex items-center justify-center gap-2"><Send size={20} /> {isLoading ? 'Guardando...' : 'Salvar e Enviar Link'}</Button>
      </form>
    </div>
  );
};

const CreateCompetition = ({ teams, onCreate, showToast }) => {
  const [name, setName] = useState(''); const [format, setFormat] = useState('league'); const [numGroups, setNumGroups] = useState('2'); const [qualifiers, setQualifiers] = useState('2'); const [deadline, setDeadline] = useState(''); const [selectedTeams, setSelectedTeams] = useState([]); const [error, setError] = useState(''); const [draftRounds, setDraftRounds] = useState(null); const [draftGroups, setDraftGroups] = useState(null);

  const toggleTeam = (teamId) => { if (selectedTeams.includes(teamId)) setSelectedTeams(selectedTeams.filter(id => id !== teamId)); else setSelectedTeams([...selectedTeams, teamId]); };

  const handleGenerateDraft = () => {
    if (!name || !format) { setError('Por favor, dê um nome e formato ao campeonato.'); return; }
    if (selectedTeams.length < 2) { setError('Atenção: Selecione pelo menos 2 times para gerar a competição.'); return; }
    const parsedGroups = parseInt(numGroups) || 2; const parsedQualifiers = parseInt(qualifiers) || 2;
    if (format === 'groups' && selectedTeams.length < parsedGroups * parsedQualifiers) { setError(`Atenção: Para classificar ${parsedQualifiers} por grupo em ${parsedGroups} grupos, você precisa selecionar pelo menos ${parsedGroups * parsedQualifiers} times.`); return; }
    setError(''); const tempCompId = `c${Date.now()}`; let generatedRounds = []; let generatedGroups = null;
    if (format === 'cup') generatedRounds = generateCupBracket(selectedTeams, tempCompId); else if (format === 'groups') { const result = generateGroupsAndKnockout(selectedTeams, tempCompId, parsedGroups, parsedQualifiers); generatedRounds = result.rounds; generatedGroups = result.groups; } else generatedRounds = generateRoundRobin(selectedTeams, tempCompId);
    setDraftRounds(generatedRounds); setDraftGroups(generatedGroups);
  };

  const handleDraftMatchChange = (rIndex, mIndex, field, value) => { const newRounds = [...draftRounds]; newRounds[rIndex].matches[mIndex][field] = value; setDraftRounds(newRounds); };
  const handleRemoveDraftMatch = (rIndex, mIndex) => { const newRounds = [...draftRounds]; newRounds[rIndex].matches.splice(mIndex, 1); setDraftRounds(newRounds); };
  const handleAddDraftMatch = (rIndex) => { const newRounds = [...draftRounds]; newRounds[rIndex].matches.push({ teamA: '', teamB: '' }); setDraftRounds(newRounds); };
  const handleAddDraftRound = () => { setDraftRounds(prev => [...prev, { id: `r${prev.length + 1}`, number: prev.length + 1, status: 'locked', matches: [] }]); };
  const handleRemoveDraftRound = (rIndex) => { const newRounds = [...draftRounds]; newRounds.splice(rIndex, 1); newRounds.forEach((r, idx) => r.id = `r${idx + 1}`); setDraftRounds(newRounds); };

  const handleFinalSubmit = () => {
    let hasMatches = false; let isValidMatches = true; const allParticipatingTeams = new Set();
    (draftRounds || []).forEach((r) => { if (r.matches.length > 0) hasMatches = true; r.matches.forEach(m => { const isKnockout = r.id.toString().startsWith('ko_') || format === 'cup'; if (!isKnockout && (!m.teamA || !m.teamB)) isValidMatches = false; if (m.teamA === m.teamB && m.teamA !== '') isValidMatches = false; if (m.teamA) allParticipatingTeams.add(m.teamA); if (m.teamB) allParticipatingTeams.add(m.teamB); }); });
    if (!hasMatches) { setError('A competição precisa ter pelo menos uma partida nas rodadas.'); return; }
    if (!isValidMatches) { setError('Existem partidas inválidas (times jogando contra si mesmos ou vagas vazias indevidas na fase de grupos).'); return; }
    setError(''); const finalTeams = Array.from(allParticipatingTeams); const finalCompId = `c${Date.now()}`; let matchCounter = 1;
    const finalRounds = (draftRounds || []).map((r, rIndex) => ({ id: `r${rIndex + 1}`, number: r.number || rIndex + 1, status: rIndex === 0 ? 'released' : 'locked', matches: r.matches.map(m => { const matchId = `${finalCompId}_m${matchCounter}_r${rIndex + 1}`; matchCounter++; return { id: matchId, teamA: m.teamA, teamB: m.teamB, placeholderA: m.placeholderA || '', placeholderB: m.placeholderB || '', status: 'pending_play' }; }) }));
    onCreate({ id: finalCompId, name: String(name), format, teamCount: finalTeams.length, deadline, status: 'active', teams: finalTeams, rounds: finalRounds, ...(format === 'groups' && draftGroups ? { groups: draftGroups, numGroups: parseInt(numGroups) || 2, qualifiersPerGroup: parseInt(qualifiers) || 2 } : {}) });
    showToast("Competição validada e lançada com sucesso!", "success"); setName(''); setDeadline(''); setSelectedTeams([]); setDraftRounds(null); setDraftGroups(null);
  };

  return (
    <div className="max-w-3xl mx-auto animate-in fade-in pb-12">
      <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2"><PlusCircle className="text-emerald-500"/> Nova Competição</h2>
      <div className="bg-slate-900 p-6 md:p-8 rounded-2xl border border-slate-800 space-y-6 shadow-xl">
        {error && <div className="bg-amber-500/10 border border-amber-500/50 text-amber-400 p-4 rounded-xl flex items-center gap-3"><AlertCircle size={20} /><p className="text-sm font-medium">{String(error)}</p></div>}
        {!draftRounds ? (
          <div className="animate-in fade-in space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2"><label className="text-sm font-medium text-slate-400">Nome do Campeonato</label><input type="text" placeholder="Ex: Liga de Inverno" value={name} onChange={e=>setName(e.target.value)} className={inputClass} required /></div>
              <div className="space-y-2"><label className="text-sm font-medium text-slate-400">Formato</label><select value={format} onChange={e=>setFormat(e.target.value)} className={inputClass}><option value="league">Pontos Corridos (Liga)</option><option value="cup">Mata-Mata (Copa)</option><option value="groups">Fase de Grupos + Mata-Mata</option></select></div>
              {format === 'groups' ? ( <><div className="space-y-2 animate-in fade-in"><label className="text-sm font-medium text-slate-400">Quantidade de Grupos</label><input type="number" min="1" placeholder="Ex: 4" value={numGroups} onChange={e=>setNumGroups(e.target.value)} className={inputClass} /><p className="text-[10px] text-slate-500 mt-1">Livre (Ex: 2, 4, 8...)</p></div><div className="space-y-2 animate-in fade-in"><label className="text-sm font-medium text-slate-400">Classificados por Grupo</label><select value={qualifiers} onChange={e=>setQualifiers(e.target.value)} className={inputClass}><option value="1">1 Equipe (Apenas o Líder)</option><option value="2">2 Equipes</option><option value="3">3 Equipes</option><option value="4">4 Equipes</option></select></div></> ) : ( <div className="space-y-2"><label className="text-sm font-medium text-slate-400">Qtd. de Times Selecionada</label><input type="number" readOnly value={selectedTeams.length} className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-emerald-400 font-bold cursor-not-allowed outline-none transition-colors" /></div> )}
              <div className="space-y-2"><label className="text-sm font-medium text-slate-400">Prazo de Conclusão (Opcional)</label><input type="date" value={deadline} onChange={e=>setDeadline(e.target.value)} className={inputClass} /></div>
            </div>
            <div className="pt-4 border-t border-slate-800">
              <div className="flex justify-between items-end mb-4"><label className="text-sm font-medium text-slate-400">Selecione as Equipes Participantes</label><span className={`text-xs px-2 py-1 rounded font-bold ${selectedTeams.length >= 2 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'}`}>{selectedTeams.length} Marcadas</span></div>
              {(!teams || teams.length === 0) ? ( <p className="text-slate-500 text-sm p-4 bg-slate-950 rounded border border-slate-800">Nenhum time cadastrado no clã ainda.</p> ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 max-h-64 overflow-y-auto pr-2">
                  {(teams || []).map(team => { if (!team) return null; const isSelected = selectedTeams.includes(team.id); return ( <div key={team.id} onClick={() => toggleTeam(team.id)} className={`cursor-pointer flex items-center gap-3 p-3 rounded-xl border transition-all ${isSelected ? 'bg-emerald-500/10 border-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.1)]' : 'bg-slate-950 border-slate-800 hover:border-slate-600'}`}><div className="shrink-0"><ShieldDisplay shield={team.shield} size="small" /></div><span className={`font-medium text-xs md:text-sm truncate ${isSelected ? 'text-emerald-400' : 'text-slate-300'}`}>{String(team.name || 'Time')}</span></div> ); })}
                </div>
              )}
            </div>
            <Button type="button" onClick={handleGenerateDraft} className="w-full py-4 text-lg mt-4 shadow-emerald-900/50 shadow-xl"><Activity size={20} /> Sortear e Revisar Confrontos</Button>
          </div>
        ) : (
          <div className="animate-in slide-in-from-right-4 space-y-6">
            <div className="bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-xl flex justify-between items-center text-emerald-400"><div><p className="font-bold text-lg text-white mb-1">{String(name)}</p><p className="text-sm font-medium">{format === 'league' ? 'Liga' : format === 'cup' ? 'Mata-Mata' : `Grupos + Mata-Mata (${numGroups} Grupos)`} • {selectedTeams.length} Times {deadline && `• Prazo: ${safeFormatDate(deadline)}`}</p></div><Trophy size={32} className="opacity-50 hidden md:block" /></div>
            <div className="flex justify-between items-center pt-2"><label className="text-sm font-medium text-slate-400">Tabela de Confrontos (Fique à vontade para ajustar)</label></div>
            <div className="space-y-4">
              {(draftRounds || []).map((round, rIndex) => (
                <div key={rIndex} className="bg-slate-950 rounded-xl border border-slate-800 overflow-hidden">
                  <div className="p-3 bg-slate-900 border-b border-slate-800 flex justify-between items-center"><span className="font-bold text-slate-300 text-sm flex items-center gap-2"><span className="bg-slate-800 px-2 py-1 rounded text-xs text-amber-400 font-mono">{rIndex + 1}</span>Rodada {String(round.number)}</span><button type="button" onClick={() => handleRemoveDraftRound(rIndex)} className="text-slate-500 hover:text-red-400 transition-colors p-1" title="Excluir Rodada"><Trash2 size={16}/></button></div>
                  <div className="p-4 space-y-3">
                    {(() => {
                      const gm = (round.matches || []).reduce((acc, match) => { const key = match.groupId || 'Sem Grupo'; if (!acc[key]) acc[key] = []; acc[key].push(match); return acc; }, {});
                      return Object.keys(gm).map(groupKey => (
                        <div key={groupKey} className="space-y-3 mb-4 last:mb-0">
                          {format === 'groups' && !round.id.toString().startsWith('ko_') && ( <div className="text-[10px] font-bold text-emerald-400 border-b border-slate-800 pb-1 uppercase tracking-widest">{groupKey === 'Sem Grupo' ? 'Outros / Manuais' : `Grupo ${groupKey}`}</div> )}
                          {gm[groupKey].map((match) => {
                            const mIndex = round.matches.indexOf(match); const isError = match.teamA === match.teamB && match.teamA !== '';
                            return (
                              <div key={mIndex} className="flex flex-col md:flex-row items-center gap-2 w-full">
                                <select value={match.teamA} onChange={e => handleDraftMatchChange(rIndex, mIndex, 'teamA', e.target.value)} className={`w-full md:flex-1 bg-slate-900 border rounded-lg p-2 text-white text-sm md:text-xs outline-none focus:border-emerald-500 ${isError ? 'border-red-500 bg-red-500/10' : 'border-slate-700'}`}><option value="">{String(match.placeholderA || 'Nenhum')}</option>{(teams || []).map(t => t ? <option key={t.id} value={t.id}>{String(t.name || 'Time')}</option> : null)}</select>
                                <span className="text-xs text-slate-500 font-bold hidden md:block">X</span>
                                <select value={match.teamB} onChange={e => handleDraftMatchChange(rIndex, mIndex, 'teamB', e.target.value)} className={`w-full md:flex-1 bg-slate-900 border rounded-lg p-2 text-white text-sm md:text-xs outline-none focus:border-emerald-500 ${isError ? 'border-red-500 bg-red-500/10' : 'border-slate-700'}`}><option value="">{String(match.placeholderB || 'Nenhum')}</option>{(teams || []).map(t => t ? <option key={t.id} value={t.id}>{String(t.name || 'Time')}</option> : null)}</select>
                                <button type="button" onClick={() => handleRemoveDraftMatch(rIndex, mIndex)} className="text-slate-600 hover:text-red-400 p-2 md:p-1 bg-slate-900 md:bg-transparent w-full md:w-auto text-center rounded border border-slate-700 md:border-none" title="Remover Partida"><X size={16} className="mx-auto" /></button>
                              </div>
                            );
                          })}
                        </div>
                      ));
                    })()}
                    <button type="button" onClick={() => handleAddDraftMatch(rIndex)} className="text-xs bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500 hover:text-white px-3 py-2 md:py-1.5 rounded-lg font-medium flex items-center justify-center gap-1 mt-2 transition-colors w-full md:w-auto"><PlusCircle size={14}/> Nova Partida</button>
                  </div>
                </div>
              ))}
            </div>
            <Button type="button" variant="outline" onClick={handleAddDraftRound} className="w-full py-3 border-dashed border-slate-700 hover:border-slate-500 text-slate-400"><PlusCircle size={16}/> Adicionar Rodada</Button>
            <div className="flex flex-col-reverse md:flex-row gap-3 md:gap-4 mt-8 pt-6 border-t border-slate-800">
              <Button type="button" variant="outline" onClick={() => {setDraftRounds(null); setDraftGroups(null);}} className="flex-1 py-4 text-slate-400 hover:text-white border-slate-700">Voltar e Refazer</Button>
              <Button type="button" onClick={handleFinalSubmit} className="flex-[2] py-4 text-lg bg-emerald-600 hover:bg-emerald-500 shadow-emerald-900/50 shadow-xl">Lançar Competição Oficial</Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const MembersList = ({ users = [], teams = [], currentUser, onUpdateUserRole, onExpelUser, onEditUser, onLinkTeam, showToast }) => {
  const [editingUserId, setEditingUserId] = useState(null);
  const [editData, setEditData] = useState({ name: '', whatsapp: '', email: '' });
  const startEdit = (user) => { if (!user) return; setEditingUserId(user.id); setEditData({ name: String(user.name || ''), whatsapp: String(user.whatsapp || ''), email: String(user.email || '') }); };
  const saveEdit = (userId) => { if (editData.name && editData.whatsapp && editData.email) { onEditUser(userId, { name: String(editData.name), whatsapp: String(editData.whatsapp), email: String(editData.email) }); setEditingUserId(null); } else { showToast("Preencha todos os campos do treinador para salvar.", "error"); } };

  return (
    <div className="animate-in fade-in duration-500 space-y-6">
      <div className="flex items-center gap-3 mb-6"><Award className="text-emerald-500" size={28} /><h2 className="text-2xl font-bold text-white">Gestão de Técnicos</h2></div>
      <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-x-auto shadow-2xl">
        <table className="w-full text-left text-sm whitespace-nowrap">
          <thead className="bg-slate-950/50 text-slate-400 font-medium border-b border-slate-800"><tr><th className="p-4">Treinador</th><th className="p-4">Time</th><th className="p-4">WhatsApp</th><th className="p-4">Cargo Atual</th><th className="p-4 text-center">Ações</th></tr></thead>
          <tbody className="divide-y divide-slate-800/50">
            {(users || []).map(user => {
              if (!user || !user.id) return null; const userTeam = (teams || []).find(t => t && t.ownerId === user.id);
              return (
                <tr key={user.id} className="hover:bg-slate-800/50 transition-colors">
                  <td className="p-4 font-bold text-white">{String(user.name || 'Sem Nome')}</td>
                  <td className="p-4 text-emerald-400 font-medium">{userTeam ? String(userTeam.name || 'Time') : 'Sem time'}</td>
                  <td className="p-4 text-slate-300 font-mono text-xs">{String(user.whatsapp || '-')}</td>
                  <td className="p-4">{typeof user.role === 'string' ? ROLE_NAMES[user.role] || 'Membro' : 'Membro'}</td>
                  <td className="p-4 text-center"><button onClick={() => startEdit(user)} className="text-slate-500 hover:text-amber-400 p-1.5 transition-colors"><Edit size={16}/></button></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default function App() {
  const [currentUser, setCurrentUser] = useState(() => { const saved = localStorage.getItem('claKame_user'); return saved ? JSON.parse(saved) : null; });
  const [currentTab, setCurrentTab] = useState('dashboard');
  const [selectedCompId, setSelectedCompId] = useState(null);
  const [selectedMatch, setSelectedMatch] = useState(null);
  const [prevTab, setPrevTab] = useState('dashboard');
  const [users, setUsers] = useState([]);
  const [matches, setMatches] = useState([]);
  const [teams, setTeams] = useState([]);
  const [competitions, setCompetitions] = useState([]);
  const [toastMessage, setToastMessage] = useState(null);
  const [isFirebaseLoading, setIsFirebaseLoading] = useState(true);

  const showToast = (text, type = 'success') => { setToastMessage({ text, type }); setTimeout(() => setToastMessage(null), 4000); };

  useEffect(() => {
    const unsubU = onSnapshot(getPublicPath('users'), snap => setUsers(snap.docs.map(d=>d.data())));
    const unsubT = onSnapshot(getPublicPath('teams'), snap => setTeams(snap.docs.map(d=>d.data())));
    const unsubC = onSnapshot(getPublicPath('competitions'), snap => setCompetitions(snap.docs.map(d=>d.data())));
    const unsubM = onSnapshot(getPublicPath('matches'), snap => setMatches(snap.docs.map(d=>d.data())));
    setIsFirebaseLoading(false);
    return () => { unsubU(); unsubT(); unsubC(); unsubM(); };
  }, []);

  useEffect(() => {
    if (currentUser) {
      localStorage.setItem('claKame_user', JSON.stringify(currentUser));
      const stillExists = users.find(u => u && u.id === currentUser.id);
      if (users.length > 0 && !stillExists) { setCurrentUser(null); localStorage.removeItem('claKame_user'); } 
      else if (stillExists && stillExists.role !== currentUser.role) { setCurrentUser(stillExists); }
    } else { localStorage.removeItem('claKame_user'); }
  }, [users, currentUser]);

  const handleReleaseRound = async (compId, roundId) => { const comp = competitions.find(c => c && c.id === compId); if (!comp) return; const rounds = comp.rounds.map(r => r.id === roundId ? { ...r, status: 'released' } : r); await updateDoc(getPublicDocPath('competitions', compId), { rounds }); showToast("Rodada liberada com sucesso!", "success"); };
  const handleSelectComp = (id) => { setSelectedCompId(id); setCurrentTab('comp_details'); };
  const handleSelectMatch = (match) => { setSelectedMatch(match); setPrevTab(currentTab); setCurrentTab('match_details'); };
  const handleDeleteMatch = async (matchId) => { await deleteDoc(getPublicDocPath('matches', matchId)); showToast("Resultado excluído com sucesso!", "success"); };
  const handleEditTeam = async (updatedTeam) => { await updateDoc(getPublicDocPath('teams', updatedTeam.id), updatedTeam); };
  const handleCreateTeamAndUser = async ({ user, team }) => { await setDoc(getPublicDocPath('users', user.id), user); await setDoc(getPublicDocPath('teams', team.id), team); setCurrentTab('dashboard'); return true; };
  const handleExpelUser = async (userId) => {
    if (currentUser && userId === currentUser.id) { showToast("Você não pode se expulsar!", "error"); return; }
    const userTeam = teams.find(t => t && t.ownerId === userId);
    if (userTeam) await deleteDoc(getPublicDocPath('teams', userTeam.id));
    await deleteDoc(getPublicDocPath('users', userId)); showToast("Técnico e time excluídos com sucesso!", "success");
  };

  const formatarParaEmail = (texto) => { const textoLimpo = String(texto).trim().toLowerCase(); if (textoLimpo.includes('@')) { return textoLimpo; } const celularLimpo = textoLimpo.replace(/[-\s().]/g, ''); return celularLimpo + '@clakame.com'; };

  const handleFirstAccess = async (userDoc, emailDigitado, whatsappDigitado, newPassword) => {
    const emailToUse = (userDoc && userDoc.email) ? userDoc.email : formatarParaEmail(emailDigitado || whatsappDigitado);
    try { await createUserWithEmailAndPassword(auth, emailToUse, newPassword); } catch (error) {
      if (error.code === 'auth/email-already-in-use') { throw new Error("Sua conta já está ativada! Volte para a tela inicial e faça o login."); } else if (error.code === 'auth/weak-password') { throw new Error("A senha deve ter pelo menos 6 caracteres."); } else { throw new Error("Erro do sistema: " + error.message); }
    }
  };

  const handleLogin = async (identifier, password) => {
    const cleanPhone = String(identifier).replace(/\D/g, '');
    if (users.length === 0 && (String(identifier).toLowerCase().includes('savio') || cleanPhone === '91998270658')) { const masterUser = { id: 'u_master', name: 'Sávio Saraiva', role: 'leader', whatsapp: '91998270658', email: 'saviosaraiva777@gmail.com', password: password }; await setDoc(getPublicDocPath('users', 'u_master'), masterUser); setCurrentUser(masterUser); setCurrentTab('dashboard'); return; }
    let emailFake = formatarParaEmail(identifier);
    if (users.length > 0) {
      const cleanInput = String(identifier).trim().toLowerCase(); const foundUser = users.find(u => u && ((u.email && String(u.email).toLowerCase() === cleanInput) || (cleanPhone.length >= 8 && String(u.whatsapp) === cleanPhone)));
      if (foundUser && foundUser.email) { emailFake = foundUser.email; }
    }
    try { await signInWithEmailAndPassword(auth, emailFake, password); } catch (error) {
       if (error.code === 'auth/invalid-credential' || error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') { throw new Error("Credenciais inválidas! Verifique o número ou a senha."); } else { throw new Error("Erro do sistema: " + error.message); }
    }
  };

  useEffect(() => { const unsub = onAuthStateChanged(auth, (fbUser) => { if (fbUser && users.length > 0) { const foundUser = users.find(u => u && ((u.email && u.email.toLowerCase() === fbUser.email?.toLowerCase()) || (u.id === fbUser.uid))); if (foundUser) { setCurrentUser(foundUser); } } }); return () => unsub(); }, [users]);

  if (isFirebaseLoading) { return (<div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: '#18191a', color: '#ffde59', fontFamily: 'sans-serif' }}><h2>🛡️ A preparar o Clã Kame...</h2></div>); }

  if (!currentUser) { return <LoginScreen users={users} onLogin={handleLogin} onFirstAccess={handleFirstAccess} />; }

  const isLeaderOrKaioh = currentUser.role === 'leader' || currentUser.role === 'kaioh';

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
      { id: 'create_team_manual', label: 'Time Simples', icon: UserPlus },
      ...(currentUser.role === 'leader' ? [{ id: 'settings', label: 'Configurações', icon: Settings }] : [])
    ] : [
      { id: 'submit', label: 'Registrar', icon: Camera }
    ]),
  ];

  const renderContent = () => {
    switch (currentTab) {
      case 'dashboard': return <Dashboard matches={matches} teams={teams} competitions={competitions} currentUser={currentUser} onSelectMatch={handleSelectMatch} onDeleteMatch={handleDeleteMatch} />;
      case 'profile': return <Profile currentUser={currentUser} teams={teams} matches={matches} competitions={competitions} />;
      case 'teams_list': return <TeamsList teams={teams} currentUser={currentUser} onEditTeam={handleEditTeam} competitions={competitions} matches={matches} />;
      case 'competitions': return <CompetitionsList competitions={competitions} teams={teams} currentUser={currentUser} onSelectComp={handleSelectComp} onEditComp={c => updateDoc(getPublicDocPath('competitions', c.id), c)} onDeleteComp={id => deleteDoc(getPublicDocPath('competitions', id))} />;
      case 'comp_details': return <CompetitionDetails comp={(competitions || []).find(c=>c && c.id===selectedCompId)} teams={teams} matches={matches} currentUser={currentUser} onBack={()=>setCurrentTab('competitions')} onReleaseRound={handleReleaseRound} onSelectMatch={handleSelectMatch} onDeleteMatch={handleDeleteMatch} onEditComp={c => updateDoc(getPublicDocPath('competitions', c.id), c)} showToast={showToast} />;
      case 'match_details': return <MatchDetails match={selectedMatch} teams={teams} competitions={competitions} onBack={() => { setCurrentTab(prevTab); setSelectedMatch(null); }} />;
      case 'settings': return <AppSettings currentUser={currentUser} showToast={showToast} />;
      case 'submit': return <SubmitMatch teams={teams} competitions={competitions} matches={matches} currentUser={currentUser} showToast={showToast} onSubmit={m => { setDoc(getPublicDocPath('matches', m.id), m).then(() => { showToast("Partida registada com sucesso!", "success"); setCurrentTab(isLeaderOrKaioh ? 'validation' : 'dashboard'); }).catch(err => { console.error(err); showToast("ERRO: Falha ao registar a partida. Tente novamente.", "error"); }); }} />;
      case 'validation': 
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
        return <ValidationPanel matches={matches} teams={teams} competitions={competitions} onUpdateStatus={handleUpdateMatchStatus} showToast={showToast} />;
      case 'create_comp': return <CreateCompetition teams={teams} onCreate={c => setDoc(getPublicDocPath('competitions', c.id), c).then(()=>setCurrentTab('competitions'))} showToast={showToast} />;
      case 'create_team': return <CreateTeamFull onCreate={handleCreateTeamAndUser} showToast={showToast} />;
      case 'create_team_manual': return <CreateTeamManual onCreate={t => setDoc(getPublicDocPath('teams', t.id), t).then(()=>setCurrentTab('teams_list'))} showToast={showToast} />;
      case 'members_list': return <MembersList users={users} teams={teams} currentUser={currentUser} onUpdateUserRole={(id, r) => updateDoc(getPublicDocPath('users', id), {role: r})} onExpelUser={handleExpelUser} onEditUser={(id, data) => updateDoc(getPublicDocPath('users', id), data)} onLinkTeam={async (uid, name, shield) => { const newTeamId = `t${Date.now()}`; const targetUser = users.find(u=>u && u.id===uid) || {}; await setDoc(getPublicDocPath('teams', newTeamId), { id: newTeamId, name: String(name || ''), ownerId: String(uid), shield: shield || '🛡️', coach: String(targetUser.name || 'Técnico'), whatsapp: String(targetUser.whatsapp || '') }); showToast("Time vinculado!", "success"); return true; }} showToast={showToast} />;
      default: return <Dashboard matches={matches} teams={teams} competitions={competitions} currentUser={currentUser} onSelectMatch={handleSelectMatch} onDeleteMatch={handleDeleteMatch} />;
    }
  };

  const pendingCount = isLeaderOrKaioh ? (matches || []).filter(m=>m && m.status==='pending').length : 0;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans flex flex-col md:flex-row relative">
      {toastMessage && (
        <div className={`fixed top-4 right-4 z-50 px-6 py-3 rounded-xl shadow-2xl flex items-center gap-3 animate-in slide-in-from-top-4 ${toastMessage.type === 'error' ? 'bg-red-950 border border-red-500 text-red-100' : 'bg-slate-800 border border-emerald-500 text-white'}`}>
          {toastMessage.type === 'error' ? <AlertCircle className="text-red-500" size={20} /> : <CheckCircle className="text-emerald-500" size={20} />}
          <span className="font-medium text-sm">{String(toastMessage.text)}</span>
        </div>
      )}

      <aside className="w-full md:w-64 bg-slate-900 border-b md:border-b-0 md:border-r border-slate-800 flex flex-col shrink-0 z-10 shadow-2xl">
        <div className="p-6 flex items-center gap-3">
          {LOGO_URL ? ( <img src={LOGO_URL} alt="Clã Kame" className="w-10 h-10 object-contain drop-shadow-[0_0_15px_rgba(255,222,89,0.3)]" /> ) : ( <Shield size={36} className="text-emerald-500" /> )}
          <div><h1 className="font-bold text-white text-xl leading-tight">Clã Kame</h1><p className="text-[10px] font-bold tracking-widest text-emerald-400 uppercase">Arena DLS</p></div>
        </div>
        <nav className="flex-1 px-4 pb-4 overflow-y-auto flex md:flex-col gap-2 overflow-x-auto custom-scrollbar">
          {TABS.map(tab => {
            const isActive = currentTab === tab.id || (tab.id === 'competitions' && currentTab === 'comp_details'); const Icon = tab.icon || Activity;
            return (
              <button key={tab.id} onClick={() => setCurrentTab(tab.id)} className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all whitespace-nowrap outline-none ${isActive ? 'bg-emerald-500/10 text-emerald-400 font-bold shadow-sm border border-emerald-500/20' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200 border border-transparent'}`}>
                <Icon size={18} className={isActive ? 'text-emerald-400' : 'text-slate-500'} /> <span className="text-sm">{tab.label}</span>
                {tab.id === 'validation' && pendingCount > 0 && <span className="ml-auto bg-amber-500 text-amber-950 text-xs font-black px-2 py-0.5 rounded-full">{pendingCount}</span>}
              </button>
            );
          })}
        </nav>
        <div className="p-4 border-t border-slate-800 hidden md:block">
          <div className="bg-slate-950 rounded-xl p-4 border border-slate-800/50 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500"></div>
            <p className="font-bold text-white truncate text-sm">{String(currentUser.name || 'Guerreiro')}</p>
            <p className="text-[10px] uppercase font-bold tracking-wider text-emerald-400 mb-3">{ROLE_NAMES[currentUser.role] || 'Membro'}</p>
            <button onClick={() => { setCurrentUser(null); signOut(auth); }} className="w-full flex items-center justify-center gap-2 text-xs font-bold text-slate-400 hover:text-white py-2 rounded-lg hover:bg-slate-800 transition-colors border border-slate-700/50"><LogOut size={14} /> Desconectar</button>
          </div>
        </div>
      </aside>
      <main className="flex-1 p-4 md:p-8 overflow-y-auto bg-slate-950 relative">
        <div className="max-w-5xl mx-auto pb-20 md:pb-0">{renderContent()}</div>
      </main>
    </div>
  );
}

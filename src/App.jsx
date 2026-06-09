import React, { useState, useEffect, useMemo } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, doc, setDoc, updateDoc, onSnapshot, collection, getDocs, getDoc, deleteDoc } from 'firebase/firestore';
import { 
  Home, Trophy, Medal, Camera, CheckSquare, Users, 
  LogOut, UploadCloud, CheckCircle, XCircle, AlertCircle, 
  Activity, PlusCircle, ArrowLeft, PlayCircle, Lock,
  Shield, MessageCircle, Edit, Save, X, User, Crown, Star, Send, Trash2, Settings, UserPlus
} from 'lucide-react';

// ==========================================
// CONFIGURAÇÃO DE LOGÓTIPO PERSONALIZADO
// ==========================================
const LOGO_URL = "https://i.imgur.com/NTbkaER.png"; 

// ==========================================
// 1. CONFIGURAÇÃO REAL DO FIREBASE E API
// ==========================================
const firebaseConfig = {
  apiKey : "AIzaSyCoZ255eUBfUsIYArCMtHflT0y_6U5fTsA", 
  authDomain : "cla-kame.firebaseapp.com", 
  databaseURL : "https://cla-kame-default-rtdb.firebaseio.com", 
  projectId : "cla-kame", 
  storageBucket : "cla-kame.firebasestorage.app", 
  messagingSenderId : "253792062726", 
  appId : "1:253792062726:web:1ee567bbbd175c31ce2287"  
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = 'cla-kame-oficial';

const getGeminiApiKey = () => {
  try { 
    if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_GEMINI_API_KEY) {
      return import.meta.env.VITE_GEMINI_API_KEY;
    }
  } catch(e) {}
  return ""; 
};

const getPublicPath = (colName) => collection(db, 'artifacts', appId, 'public', 'data', colName);
const getPublicDocPath = (colName, docId) => doc(db, 'artifacts', appId, 'public', 'data', colName, docId);

// ==========================================
// 2. FUNÇÕES E COMPONENTES AUXILIARES
// ==========================================
const ROLE_NAMES = {
  leader: 'Líder Supremo',
  kaioh: 'Senhor Kaioh',
  member: 'Membro Oficial'
};

const fetchWithBackoff = async (url, options, retries = 3) => {
  let delay = 1000;
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url, options);
      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}));
        const errMsg = errJson?.error?.message || await response.text();
        throw new Error(`${errMsg.substring(0, 150)}`); 
      }
      return await response.json();
    } catch (error) {
      if (i === retries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, delay));
      delay *= 2;
    }
  }
};

const processImage = (file, callback) => {
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (event) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const MAX_SIZE = 128;
      let width = img.width; let height = img.height;
      if (width > height) { if (width > MAX_SIZE) { height *= MAX_SIZE / width; width = MAX_SIZE; } }
      else { if (height > MAX_SIZE) { width *= MAX_SIZE / height; height = MAX_SIZE; } }
      canvas.width = width; canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);
      callback(canvas.toDataURL('image/png'));
    };
    img.src = event.target.result;
  };
  reader.readAsDataURL(file);
};

const processScreenshot = (file, callback) => {
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (event) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const MAX_SIZE = 900; 
      let width = img.width; let height = img.height;
      if (width > height) { if (width > MAX_SIZE) { height *= MAX_SIZE / width; width = MAX_SIZE; } }
      else { if (height > MAX_SIZE) { width *= MAX_SIZE / height; height = MAX_SIZE; } }
      canvas.width = width; canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);
      callback(canvas.toDataURL('image/jpeg', 0.8)); 
    };
    img.src = event.target.result;
  };
  reader.readAsDataURL(file);
};

const ShieldDisplay = ({ shield, size = 'normal' }) => {
  const isImage = shield?.startsWith('data:') || shield?.startsWith('http');
  const sizeClasses = {
    'small': isImage ? 'w-6 h-6' : 'text-xl',
    'normal': isImage ? 'w-8 h-8' : 'text-2xl',
    'large': isImage ? 'w-14 h-14' : 'text-5xl'
  };
  
  if (isImage) {
    return <img src={shield} alt="Escudo" className={`${sizeClasses[size]} object-contain drop-shadow-lg`} />;
  }
  return <span className={`${sizeClasses[size]} inline-block text-center`} style={{lineHeight: 1}}>{shield || '🛡️'}</span>;
};

// ==========================================
// MÁQUINA DE SORTEIO DE RODADAS (ROUND-ROBIN)
// ==========================================
const generateRoundRobin = (teamIds, compId) => {
  let teams = [...teamIds];
  if (teams.length % 2 !== 0) {
    teams.push(null);
  }
  
  const numTeams = teams.length;
  const numRounds = numTeams - 1;
  const half = numTeams / 2;
  const rounds = [];
  let matchCounter = 1;

  for (let r = 0; r < numRounds; r++) {
    const roundMatches = [];
    for (let i = 0; i < half; i++) {
      const teamA = teams[i];
      const teamB = teams[numTeams - 1 - i];
      
      if (teamA !== null && teamB !== null) {
        roundMatches.push({
          id: `${compId}_m${matchCounter}_r${r+1}`,
          teamA: teamA,
          teamB: teamB,
          status: 'pending_play'
        });
        matchCounter++;
      }
    }
    
    rounds.push({
      id: `r${r+1}`,
      number: r + 1,
      status: r === 0 ? 'released' : 'locked', 
      matches: roundMatches
    });

    teams.splice(1, 0, teams.pop());
  }
  return rounds;
};

const calculateStandings = (matches, teams, compId) => {
  const table = {};
  teams.forEach(t => { table[t.id] = { ...t, p: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, gd: 0, pts: 0 }; });

  // Garante que pega apenas a última partida validada para cada confronto (matchId)
  const approvedMatchesMap = {};
  matches.filter(m => m.compId === compId && m.status === 'approved').forEach(m => {
    const time = parseInt(m.id.split('_')[1] || 0);
    if (!approvedMatchesMap[m.matchId]) {
      approvedMatchesMap[m.matchId] = m;
    } else {
      const prevTime = parseInt(approvedMatchesMap[m.matchId].id.split('_')[1] || 0);
      if (time > prevTime) approvedMatchesMap[m.matchId] = m;
    }
  });

  const compMatches = Object.values(approvedMatchesMap);

  compMatches.forEach(m => {
    const tA = table[m.teamA]; const tB = table[m.teamB];
    if (!tA || !tB) return;
    tA.p += 1; tB.p += 1; tA.gf += m.scoreA; tB.gf += m.scoreB; tA.ga += m.scoreB; tB.ga += m.scoreA;

    if (m.scoreA > m.scoreB) { tA.pts += 3; tA.w += 1; tB.l += 1; } 
    else if (m.scoreA < m.scoreB) { tB.pts += 3; tB.w += 1; tA.l += 1; } 
    else { tA.pts += 1; tB.pts += 1; tA.d += 1; tB.d += 1; }
  });

  return Object.values(table).map(t => ({ ...t, gd: t.gf - t.ga })).sort((a, b) => {
    if (b.pts !== a.pts) return b.pts - a.pts;
    if (b.w !== a.w) return b.w - a.w;
    if (b.gd !== a.gd) return b.gd - a.gd;
    return b.gf - a.gf;
  });
};

const Button = ({ children, onClick, variant = 'primary', className = '', disabled = false, type = 'button' }) => {
  const baseStyle = "px-4 py-2 rounded-lg font-medium transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed";
  const variants = {
    primary: "bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-900/50",
    secondary: "bg-slate-700 hover:bg-slate-600 text-white",
    danger: "bg-red-600 hover:bg-red-500 text-white",
    outline: "border border-slate-600 text-slate-300 hover:bg-slate-800"
  };
  return <button type={type} onClick={onClick} disabled={disabled} className={`${baseStyle} ${variants[variant]} ${className}`}>{children}</button>;
};

// ==========================================
// TELA DE LOGIN BLINDADA + PRIMEIRO ACESSO
// ==========================================
const LoginScreen = ({ users, onLogin, onFirstAccess }) => {
  const [view, setView] = useState('login'); 
  const [loginData, setLoginData] = useState({ identifier: '', password: '' });
  const [loginError, setLoginError] = useState('');
  const [showForgot, setShowForgot] = useState(false);

  const [faEmail, setFaEmail] = useState('');
  const [faUser, setFaUser] = useState(null);
  const [code, setCode] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [newPassword, setNewPassword] = useState('');

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setLoginError('');
    try {
      await onLogin(loginData.identifier, loginData.password);
    } catch (error) {
      setLoginError(error.message || 'Credenciais incorretas ou acesso não ativado.');
    }
  };

  const handleRequestCode = (e) => {
    e.preventDefault();
    setLoginError('');
    
    const cleanInput = faEmail.trim().toLowerCase();
    const cleanPhone = cleanInput.replace(/\D/g, '');

    const user = users.find(u => 
      (u.email && u.email.toLowerCase() === cleanInput) || 
      (cleanPhone.length >= 8 && u.whatsapp === cleanPhone)
    );
    
    if (!user) {
      setLoginError('Cadastro não encontrado. Peça para um Líder cadastrar o seu perfil primeiro.');
      return;
    }
    
    if (!user.id.startsWith('pending_')) {
      setLoginError('Esta conta já está ativada. Volte e faça o login normalmente.');
      return;
    }
    
    setFaUser(user);
    setIsSending(true);
    setTimeout(() => { 
      setIsSending(false); 
      setView('fa_code'); 
    }, 1500);
  };

  const handleVerifyCode = (e) => {
    e.preventDefault();
    setIsSending(true);
    setTimeout(() => {
      setIsSending(false);
      setView('fa_pass');
    }, 1000);
  };

  const handleSavePassword = async (e) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      setLoginError('A senha deve ter no mínimo 6 caracteres por segurança.');
      return;
    }
    try {
      await onFirstAccess(faUser, faEmail, faUser.whatsapp, newPassword);
    } catch (error) {
      setLoginError(error.message);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="bg-slate-900 p-6 md:p-8 rounded-2xl border border-slate-800 max-w-md w-full shadow-2xl">
        <div className="text-center mb-6">
          <div className="flex justify-center mb-4">
            {LOGO_URL ? (
              <img src={LOGO_URL} alt="Clã Kame" className="max-w-[120px] object-contain drop-shadow-[0_0_15px_rgba(255,222,89,0.3)]" />
            ) : (
              <Shield size={64} className="text-emerald-500 drop-shadow-[0_0_15px_rgba(16,185,129,0.3)]" />
            )}
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Clã Kame</h1>
          <p className="text-slate-400 mt-2 text-sm">Sistema de Gestão DLS</p>
        </div>

        {view === 'login' && (
          <form onSubmit={handleLoginSubmit} className="space-y-4 animate-in fade-in duration-300">
            {loginError && <div className="text-red-400 text-sm bg-red-500/10 p-3 rounded-lg border border-red-500/20">{loginError}</div>}
            <div>
              <label className="text-xs text-slate-400 mb-1 block">E-mail ou WhatsApp (Apenas Números)</label>
              <input required value={loginData.identifier} onChange={e=>setLoginData({...loginData, identifier: e.target.value})} className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-white outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-sm transition-all" placeholder="Ex: goku@kame.com ou 11999999999" />
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Senha</label>
              <input required type="password" value={loginData.password} onChange={e=>setLoginData({...loginData, password: e.target.value})} className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-white outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-sm transition-all" placeholder="••••••••" />
            </div>
            <div className="text-right">
              <button type="button" onClick={() => setShowForgot(true)} className="text-xs text-emerald-400 hover:text-emerald-300 transition-colors underline underline-offset-2">Esqueci a senha</button>
            </div>
            {showForgot && (
              <div className="bg-emerald-500/10 border border-emerald-500/20 p-3 rounded-lg text-xs text-emerald-400 text-center animate-in fade-in">
                Funcionalidade simulada: No app real, enviaremos um código de redefinição para o seu WhatsApp!
              </div>
            )}
            <Button type="submit" className="w-full mt-2 py-3 shadow-xl">Entrar no Clã</Button>

            <div className="mt-6 text-center pt-5 border-t border-slate-800/50">
              <p className="text-xs text-slate-500 mb-2">Foi convidado por um Líder e ainda não tem senha?</p>
              <button type="button" onClick={() => {setView('fa_email'); setLoginError('');}} className="text-sm font-bold text-emerald-400 hover:text-emerald-300 transition-colors underline underline-offset-2">
                Realizar Primeiro Acesso
              </button>
            </div>
          </form>
        )}

        {view === 'fa_email' && (
          <form onSubmit={handleRequestCode} className="space-y-4 animate-in slide-in-from-right-4 duration-300">
            <h2 className="text-lg font-bold text-white text-center mb-2">Primeiro Acesso</h2>
            <p className="text-xs text-slate-400 text-center mb-4">Para configurar a sua conta, informe o e-mail ou o WhatsApp que o Líder utilizou para cadastrar o seu perfil.</p>
            {loginError && <div className="text-red-400 text-sm bg-red-500/10 p-3 rounded-lg border border-red-500/20">{loginError}</div>}
            
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Seu E-mail ou WhatsApp</label>
              <input required type="text" value={faEmail} onChange={e=>setFaEmail(e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-white outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-sm transition-all" placeholder="Ex: tecnico@email.com" />
            </div>
            
            <Button type="submit" disabled={isSending} className="w-full mt-2 py-3 shadow-xl">
              {isSending ? 'Localizando Perfil...' : 'Avançar'}
            </Button>
            
            <button type="button" onClick={() => {setView('login'); setLoginError('');}} className="w-full text-xs text-slate-500 hover:text-white mt-4 transition-colors">Voltar para o Login</button>
          </form>
        )}

        {view === 'fa_code' && (
           <form onSubmit={handleVerifyCode} className="space-y-4 animate-in slide-in-from-right-4 duration-300 text-center">
             <div className="bg-emerald-500/10 text-emerald-400 p-4 rounded-xl mb-4 text-sm border border-emerald-500/20">
               Enviamos um código para o WhatsApp final <br/>
               <b className="text-lg tracking-wider text-white mt-1 inline-block">***{faUser?.whatsapp?.slice(-4)}</b>
               <span className="text-xs text-slate-400 mt-4 block p-2 bg-slate-950 rounded-lg border border-slate-800">
                 (Modo Simulação: Como este é um teste, digite qualquer código numérico, ex: <b>1234</b>)
               </span>
             </div>
             <div>
               <input required type="text" maxLength={4} value={code} onChange={e=>setCode(e.target.value)} className="w-40 mx-auto text-center tracking-[0.7em] font-bold text-3xl bg-slate-950 border border-slate-700 rounded-xl p-4 text-white outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/50 transition-all" placeholder="0000" />
             </div>
             <Button type="submit" disabled={code.length < 4 || isSending} className="w-full py-4 text-lg mt-4 shadow-xl">
               {isSending ? 'Verificando...' : 'Verificar Código'}
             </Button>
             <button type="button" onClick={()=>setView('fa_email')} className="text-sm text-slate-500 hover:text-white mt-4 underline underline-offset-4 transition-colors">Voltar</button>
           </form>
        )}

        {view === 'fa_pass' && (
           <form onSubmit={handleSavePassword} className="space-y-4 animate-in slide-in-from-right-4 duration-300">
             <h2 className="text-lg font-bold text-emerald-400 text-center mb-2">Quase lá, {faUser?.name?.split(' ')[0]}!</h2>
             <p className="text-xs text-slate-400 text-center mb-4">Seu WhatsApp foi verificado. Agora, crie a sua senha de acesso. Você usará ela para entrar no painel nas próximas vezes.</p>
             {loginError && <div className="text-red-400 text-sm bg-red-500/10 p-3 rounded-lg border border-red-500/20">{loginError}</div>}
             
             <div>
               <label className="text-xs text-slate-400 mb-1 block">Crie a sua Senha</label>
               <input required type="password" minLength={6} value={newPassword} onChange={e=>setNewPassword(e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-white outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-sm transition-all" placeholder="Min. 6 caracteres" />
             </div>
             <Button type="submit" className="w-full py-4 text-lg mt-4 shadow-xl">Salvar Senha e Entrar</Button>
           </form>
        )}

      </div>
    </div>
  );
};

// ==========================================
// 3. ECRÃS DE GESTÃO DO CLÃ
// ==========================================

const Profile = ({ currentUser, teams, matches, competitions }) => {
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
      <div className="flex items-center gap-4 bg-slate-900 p-6 rounded-2xl border border-slate-800">
        <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center text-3xl">👤</div>
        <div>
          <h2 className="text-2xl font-bold text-white">{currentUser.name}</h2>
          <p className="text-emerald-400 font-medium tracking-wide text-sm uppercase mt-1">
            {ROLE_NAMES[currentUser.role] || 'Guerreiro'}
          </p>
        </div>
      </div>
      <div className="space-y-8">
        {userTeams.map(team => {
          const teamMatches = matches.filter(m => m.status === 'approved' && (m.teamA === team.id || m.teamB === team.id));
          let wins = 0, draws = 0, losses = 0, gf = 0, ga = 0;
          let biggestWin = null;
          let maxGd = -1;

          teamMatches.forEach(m => {
            const isTeamA = m.teamA === team.id;
            const scoreFor = isTeamA ? m.scoreA : m.scoreB;
            const scoreAgainst = isTeamA ? m.scoreB : m.scoreA;
            gf += scoreFor; ga += scoreAgainst;
            
            if (scoreFor > scoreAgainst) {
              wins++;
              const gd = scoreFor - scoreAgainst;
              if (gd > maxGd) { maxGd = gd; biggestWin = { scoreFor, scoreAgainst, oppId: isTeamA ? m.teamB : m.teamA }; }
            } else if (scoreFor === scoreAgainst) { draws++; } 
            else { losses++; }
          });

          const participations = competitions.filter(c => c.teams?.includes(team.id)).map(c => {
            const table = calculateStandings(matches, teams.filter(t => c.teams?.includes(t.id)), c.id);
            const rankIndex = table.findIndex(t => t.id === team.id);
            const rank = rankIndex !== -1 ? rankIndex + 1 : '-';
            return { compName: c.name, rank, format: c.format };
          });

          return (
            <div key={team.id} className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden">
              <div className="bg-slate-950/50 p-6 border-b border-slate-800 flex items-center gap-4">
                <ShieldDisplay shield={team.shield} size="large" />
                <div>
                  <h3 className="text-2xl font-bold text-white">{team.name}</h3>
                  <p className="text-slate-400">Técnico: <span className="text-slate-300 font-medium">{team.coach || 'Não informado'}</span></p>
                </div>
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
                    <div>
                      <p className="text-sm text-emerald-400 font-bold mb-1 flex items-center gap-2">🏆 Maior Goleada Aplicada</p>
                      <p className="text-white font-medium text-lg">{team.name} <span className="font-bold text-emerald-400 mx-2">{biggestWin.scoreFor} x {biggestWin.scoreAgainst}</span> {teams.find(t=>t.id === biggestWin.oppId)?.name}</p>
                    </div>
                  </div>
                )}
                <div>
                  <h4 className="text-lg font-bold text-white mb-4 flex items-center gap-2"><Trophy className="text-amber-500" size={20}/> Histórico em Competições</h4>
                  {participations.length > 0 ? (
                    <div className="space-y-3">
                      {participations.map((p, i) => (
                        <div key={i} className="flex justify-between items-center bg-slate-950 p-4 rounded-xl border border-slate-800">
                          <span className="text-slate-200 font-medium">{p.compName}</span>
                          <div className="flex items-center gap-3">
                            <span className="text-xs bg-slate-800 text-slate-400 px-2 py-1 rounded hidden md:block">{p.format === 'league' ? 'Liga' : 'Copa'}</span>
                            <span className="font-bold text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-lg border border-emerald-500/20">{p.rank}º Lugar</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : <p className="text-slate-500 text-sm p-4 bg-slate-950 rounded-xl border border-slate-800">Este time ainda não participou de nenhuma competição.</p>}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const Standings = ({ matches, teams, compId, compName }) => {
  const table = useMemo(() => calculateStandings(matches, teams, compId), [matches, teams, compId]);

  return (
    <div className="animate-in fade-in duration-500">
      {compName && (
        <div className="flex items-center gap-3 mb-6">
          <Trophy className="text-amber-400" size={28} />
          <h2 className="text-2xl font-bold text-white">Tabela - {compName}</h2>
        </div>
      )}
      <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-x-auto shadow-xl">
        <table className="w-full text-left text-sm whitespace-nowrap">
          <thead className="bg-slate-950/50 text-slate-400 font-medium">
            <tr>
              <th className="p-4 w-12 text-center">#</th>
              <th className="p-4">Time</th>
              <th className="p-4 text-center">PTS</th>
              <th className="p-4 text-center">J</th>
              <th className="p-4 text-center">V</th>
              <th className="p-4 text-center">E</th>
              <th className="p-4 text-center">D</th>
              <th className="p-4 text-center">GP</th>
              <th className="p-4 text-center">GC</th>
              <th className="p-4 text-center">SG</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/50">
            {table.filter(t => t.p > 0 || table.length > 0).map((row, index) => (
              <tr key={row.id} className="hover:bg-slate-800/50 transition-colors">
                <td className="p-4 text-center font-bold text-slate-500">{index + 1}</td>
                <td className="p-4 font-medium text-white flex items-center gap-2">
                  <ShieldDisplay shield={row.shield} size="small" /> {row.name}
                </td>
                <td className="p-4 text-center font-bold text-emerald-400">{row.pts}</td>
                <td className="p-4 text-center text-slate-300">{row.p}</td>
                <td className="p-4 text-center text-slate-300">{row.w}</td>
                <td className="p-4 text-center text-slate-300">{row.d}</td>
                <td className="p-4 text-center text-slate-300">{row.l}</td>
                <td className="p-4 text-center text-slate-400">{row.gf}</td>
                <td className="p-4 text-center text-slate-400">{row.ga}</td>
                <td className="p-4 text-center text-slate-400 font-medium">{row.gd > 0 ? `+${row.gd}` : row.gd}</td>
              </tr>
            ))}
            {table.length === 0 && (
              <tr><td colSpan="10" className="p-4 text-center text-slate-500">Nenhum time registrado.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const CompetitionDetails = ({ comp, teams, matches, onBack, currentUser, onReleaseRound }) => {
  const getTeam = (id) => teams.find(t => t.id === id);
  const isAdmin = currentUser?.role === 'leader' || currentUser?.role === 'kaioh';
  
  const getMatchStatusDisplay = (matchId) => {
    // Recolhe todos os envios desta partida e ordena do mais recente para o mais antigo
    const matchSubmissions = matches.filter(m => m.matchId === matchId && m.compId === comp.id);
    
    if (matchSubmissions.length === 0) {
      return { isPlayed: false, text: 'Aguardando', color: 'text-slate-500', bg: 'bg-slate-900 border-slate-800' };
    }

    matchSubmissions.sort((a, b) => {
      const timeA = parseInt(a.id.split('_')[1] || 0);
      const timeB = parseInt(b.id.split('_')[1] || 0);
      return timeB - timeA;
    });

    // Filtra pelo último placar validado, senão exibe o último pendente ou rejeitado
    const submittedMatch = matchSubmissions.find(m => m.status === 'approved') || 
                           matchSubmissions.find(m => m.status === 'pending') || 
                           matchSubmissions[0];

    if (submittedMatch.status === 'approved') return { isPlayed: true, scoreA: submittedMatch.scoreA, scoreB: submittedMatch.scoreB, text: 'Oficial', color: 'text-emerald-400', bg: 'bg-slate-950 border-emerald-900/50' };
    if (submittedMatch.status === 'pending') return { isPlayed: true, scoreA: submittedMatch.scoreA, scoreB: submittedMatch.scoreB, text: 'Em Validação', color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20' };
    if (submittedMatch.status === 'rejected') return { isPlayed: false, text: 'Rejeitado', color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/20' };
    return { isPlayed: false, text: 'Desconhecido', color: 'text-slate-500', bg: 'bg-slate-900' };
  };

  return (
    <div className="animate-in fade-in duration-500 space-y-6">
      <button onClick={onBack} className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors mb-4"><ArrowLeft size={20} /> Voltar para Competições</button>
      <div className="bg-gradient-to-r from-emerald-900/40 to-slate-900 p-6 rounded-2xl border border-emerald-900/50 flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold text-white mb-2">{comp.name}</h2>
          <p className="text-emerald-400 flex items-center gap-2">
            <Trophy size={16}/> {comp.format === 'league' ? 'Pontos Corridos' : 'Mata-Mata'}
          </p>
        </div>
        <span className="bg-emerald-500/20 text-emerald-400 px-3 py-1 rounded-full text-sm font-medium">Em Andamento</span>
      </div>

      <Standings matches={matches} teams={teams.filter(t => comp.teams?.includes(t.id))} compId={comp.id} />

      <div className="mt-8">
        <h3 className="text-xl font-bold text-white mb-4">Rodadas</h3>
        {comp.rounds?.length > 0 ? (
          <div className="space-y-6">
            {comp.rounds.map((round) => (
              <div key={round.id} className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden">
                <div className="bg-slate-950/50 p-4 border-b border-slate-800 flex justify-between items-center"><h4 className="font-bold text-white flex items-center gap-2">{round.status === 'locked' ? <Lock size={16} className="text-slate-500"/> : <PlayCircle size={16} className="text-emerald-500"/>} Rodada {round.number}</h4>{round.status === 'locked' ? (isAdmin ? <Button variant="outline" className="text-xs py-1 border-emerald-500/50 text-emerald-400 hover:bg-emerald-500/10" onClick={() => onReleaseRound(comp.id, round.id)}>Liberar Rodada</Button> : <span className="text-xs bg-slate-800 text-slate-400 px-2 py-1 rounded-full">Bloqueada</span>) : <span className="text-xs bg-emerald-500/20 text-emerald-400 px-2 py-1 rounded-full">Liberada</span>}</div>
                <div className="p-4 grid gap-3">
                  {(round.matches || []).map(match => { 
                    const tA = getTeam(match.teamA); 
                    const tB = getTeam(match.teamB); 
                    const statusUI = getMatchStatusDisplay(match.id); 
                    return (
                      <div key={match.id} className="bg-slate-950 p-3 rounded-xl border border-slate-800/50 flex flex-col gap-2">
                        <div className="flex items-center justify-between w-full gap-1.5">
                          <div className="flex items-center gap-1.5 flex-1 min-w-0 justify-start">
                            <div className="shrink-0"><ShieldDisplay shield={tA?.shield} size="small" /></div>
                            <span className="font-medium text-[11px] md:text-sm text-slate-200 truncate">{tA?.name}</span>
                          </div>
                          
                          <div className={`flex items-center justify-center gap-1 md:gap-2 px-2 py-1 md:px-3 rounded-lg border shrink-0 ${statusUI.bg}`}>
                            <span className={`font-bold text-sm md:text-base ${statusUI.color}`}>{statusUI.isPlayed ? statusUI.scoreA : '-'}</span>
                            <span className="text-[10px] md:text-xs text-slate-500 font-bold mx-0.5">X</span>
                            <span className={`font-bold text-sm md:text-base ${statusUI.color}`}>{statusUI.isPlayed ? statusUI.scoreB : '-'}</span>
                          </div>

                          <div className="flex items-center gap-1.5 flex-1 min-w-0 justify-end">
                            <span className="font-medium text-[11px] md:text-sm text-slate-200 truncate text-right">{tB?.name}</span>
                            <div className="shrink-0"><ShieldDisplay shield={tB?.shield} size="small" /></div>
                          </div>
                        </div>
                        {statusUI.text !== 'Oficial' && (
                          <div className="flex justify-center mt-1">
                            <span className={`text-[9px] uppercase tracking-wider font-bold ${statusUI.color}`}>{statusUI.text}</span>
                          </div>
                        )}
                      </div>
                    ); 
                  })}
                </div>
              </div>
            ))}
          </div>
        ) : ( <p className="text-slate-500 text-center py-8 bg-slate-900 rounded-xl border border-slate-800">Nenhuma rodada gerada.</p> )}
      </div>
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
  const [goalsA, setGoalsA] = useState([]); 
  const [goalsB, setGoalsB] = useState([]);
  const [observacoes, setObservacoes] = useState('');
  
  const [matchImageBase64, setMatchImageBase64] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false); 
  const [imageUploaded, setImageUploaded] = useState(false);

  const [localKeyInput, setLocalKeyInput] = useState('');
  const [showKeyConfig, setShowKeyConfig] = useState(false);
  
  const [aiKey, setAiKey] = useState(() => {
    try { 
      const local = localStorage.getItem('claKame_gemini_key');
      if (local && local.startsWith('AIzaSy')) return local;
      if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_GEMINI_API_KEY) {
        return import.meta.env.VITE_GEMINI_API_KEY;
      }
    } catch(e) {}
    return ""; 
  });

  const isAdmin = currentUser?.role === 'leader' || currentUser?.role === 'kaioh';
  
  const userTeamIds = (teams || []).filter(t => t.ownerId === currentUser?.id).map(t => t.id);
  const visibleCompetitions = (competitions || []).filter(c => isAdmin || (c.teams || []).some(tId => userTeamIds.includes(tId)));

  useEffect(() => {
    setSelectedMatchId(''); resetMatchData();
    if (!selectedCompId) { setAvailableMatches([]); return; }
    
    const comp = competitions.find(c => c.id === selectedCompId);
    
    if (comp && Array.isArray(comp.rounds)) {
      let toPlay = [];
      comp.rounds.filter(r => r.status === 'released').forEach(round => {
        if (Array.isArray(round.matches)) {
          round.matches.forEach(rm => {
            const alreadySubmitted = matches.some(m => m.matchId === rm.id && (m.status === 'pending' || m.status === 'approved'));
            if (!alreadySubmitted && (isAdmin || userTeamIds.includes(rm.teamA) || userTeamIds.includes(rm.teamB))) {
              toPlay.push({ ...rm, roundId: round.id });
            }
          });
        }
      });
      setAvailableMatches(toPlay);
    }
  }, [selectedCompId, competitions, matches]);

  useEffect(() => {
    resetMatchData();
    if (selectedMatchId) {
      const match = availableMatches.find(m => m.id === selectedMatchId);
      if (match) { 
        setTeamA(teams.find(t => t.id === match.teamA)); 
        setTeamB(teams.find(t => t.id === match.teamB)); 
      }
    } else { 
      setTeamA(null); setTeamB(null); 
    }
  }, [selectedMatchId, availableMatches, teams]);

  const resetMatchData = () => { 
    setScoreA(''); setScoreB(''); setGoalsA([]); setGoalsB([]); 
    setObservacoes(''); setImageUploaded(false); setMatchImageBase64(null);
  };

  const saveLocalKey = () => {
    const cleanKey = localKeyInput.trim();
    if (!cleanKey.startsWith('AIzaSy')) {
      showToast("Chave inválida! A chave deve começar com 'AIzaSy'.", "error");
      return;
    }
    localStorage.setItem('claKame_gemini_key', cleanKey);
    setAiKey(cleanKey);
    setShowKeyConfig(false);
    setLocalKeyInput('');
    showToast("Chave protegida e guardada no seu dispositivo!", "success");
  };

  const calculateSimilarity = (str1, str2) => {
    if(!str1 || !str2) return 0;
    const words1 = str1.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/).filter(w => w.length > 2);
    const words2 = str2.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/).filter(w => w.length > 2);
    return words1.filter(w => words2.includes(w)).length;
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    processScreenshot(file, async (base64) => {
      setMatchImageBase64(base64);

      if (!aiKey || !aiKey.startsWith('AIzaSy')) {
        showToast("Você anexou a imagem! Preencha o placar manualmente abaixo.", "success");
        return; 
      }

      setIsAnalyzing(true);
      setScoreA('0'); setScoreB('0'); setGoalsA([]); setGoalsB([]);

      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${aiKey}`;

        const b64Data = base64.split(',')[1];
        const mimeType = base64.match(/data:(.*?);base64/)[1];

        const promptText = `
Analise o placar final deste jogo de Dream League Soccer (DLS).
REGRAS:
1. O escudo do lado ESQUERDO tem um placar. O escudo do lado DIREITO tem um placar.
2. Na lista central, identifique quem fez gol. GOLS possuem o ícone de uma BOLA DE FUTEBOL (⚽) ao lado.
3. CARTÕES possuem um ícone retangular (🟨/🟥). IGNORE COMPLETAMENTE os jogadores com cartões.
4. Liste os jogadores e minutos agrupando por quem está no lado esquerdo ou direito.

Retorne EXATAMENTE este formato JSON. Não use marcações de código Markdown e não escreva mais nada.
{
  "leftTeamName": "nome lido no escudo da esquerda",
  "leftScore": 0,
  "leftGoals": [{"player": "Nome", "minute": "90"}],
  "rightTeamName": "nome lido no escudo da direita",
  "rightScore": 0,
  "rightGoals": [{"player": "Nome", "minute": "90"}]
}
        `;

        const payload = {
          contents: [{ role: "user", parts: [ { text: promptText }, { inlineData: { mimeType: mimeType, data: b64Data } } ] }],
          generationConfig: { responseMimeType: "application/json" }
        };

        const result = await fetchWithBackoff(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });

        if (!result || !result.candidates) throw new Error("A IA processou mas retornou vazio.");

        let textResponse = result.candidates[0].content.parts[0].text.trim();
        if (textResponse.startsWith('```')) textResponse = textResponse.replace(/^```json/i, '').replace(/```$/, '').trim();
        
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

        showToast("Dados extraídos do Print pela IA!", "success");

      } catch (error) {
        console.error("Erro IA:", error);
        showToast(`IA falhou. Preencha manualmente abaixo.`, "error");
      } finally {
        setIsAnalyzing(false);
        setImageUploaded(true);
      }
    });
  };

  const handleAddGoal = (team) => {
    if (team === 'A') { setGoalsA([...goalsA, { player: '', minute: '' }]); setScoreA((parseInt(scoreA || 0) + 1).toString()); } 
    else { setGoalsB([...goalsB, { player: '', minute: '' }]); setScoreB((parseInt(scoreB || 0) + 1).toString()); }
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
    const matchDetails = availableMatches.find(m => m.id === selectedMatchId);
    
    const allGoals = [
      ...(goalsA || []).map(g => ({ teamId: teamA.id, player: g.player, minute: g.minute })),
      ...(goalsB || []).map(g => ({ teamId: teamB.id, player: g.player, minute: g.minute }))
    ];

    onSubmit({
      id: `m_${Date.now()}`, compId: selectedCompId, roundId: matchDetails.roundId, matchId: selectedMatchId, teamA: teamA.id, teamB: teamB.id, scoreA: parseInt(scoreA), scoreB: parseInt(scoreB),
      goals: allGoals, observacoes: observacoes.trim(), status: 'pending', submittedBy: currentUser?.name || 'Técnico', imageUrl: matchImageBase64
    });
    setSelectedCompId('');
    showToast("Partida enviada para validação dos Líderes!", "success");
  };

  return (
    <div className="max-w-2xl mx-auto animate-in fade-in duration-500 pb-12">
      <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2"><Camera className="text-emerald-500" /> Registrar Partida</h2>

      {isAdmin && (!aiKey || showKeyConfig) && (
        <div className="bg-amber-500/10 p-5 rounded-xl border border-amber-500/30 mb-6 animate-in fade-in">
          <label className="text-amber-400 font-bold text-sm flex items-center gap-2 mb-2">
            <Lock size={16} /> Chave Secreta da API Gemini (Cofre Local)
          </label>
          <p className="text-xs text-slate-400 mb-4">
            Como Líder, você pode colar a sua chave oficial (começa com <b>AIzaSy</b>) diretamente aqui. Ela ficará guardada no seu dispositivo e ativará a Inteligência Artificial na hora, sem depender da Vercel!
          </p>
          <div className="flex flex-col md:flex-row gap-3">
            <input 
              type="password" 
              value={localKeyInput} 
              onChange={e => setLocalKeyInput(e.target.value)} 
              placeholder="Ex: AIzaSy..." 
              className="flex-1 bg-slate-950 border border-amber-500/30 rounded-lg p-3 text-white text-sm outline-none focus:border-amber-500" 
            />
            <Button onClick={saveLocalKey} className="bg-amber-600 hover:bg-amber-500 text-amber-950 px-6 font-bold shadow-amber-900/50">
              Salvar Chave
            </Button>
          </div>
        </div>
      )}

      <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 space-y-6">
        <div>
          <label className="block text-sm font-medium text-slate-400 mb-2">1. Selecione o Campeonato</label>
          <select value={selectedCompId} onChange={e => setSelectedCompId(e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-white focus:ring-2 focus:ring-emerald-500 outline-none">
            <option value="">Escolha um campeonato...</option>
            {visibleCompetitions.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        
        {selectedCompId && (
          <div className="animate-in fade-in">
            <label className="block text-sm font-medium text-slate-400 mb-2">2. Selecione a Partida</label>
            {availableMatches.length > 0 ? (
              <select value={selectedMatchId} onChange={e => setSelectedMatchId(e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-white focus:ring-2 focus:ring-emerald-500 outline-none">
                <option value="">Qual jogo você jogou?</option>
                {availableMatches.map(m => {
                  const tA = teams.find(t=>t.id===m.teamA)?.name || 'Time A'; 
                  const tB = teams.find(t=>t.id===m.teamB)?.name || 'Time B';
                  const formattedRoundId = String(m.roundId || '').replace('r', '');
                  return <option key={m.id} value={m.id}>Rodada {formattedRoundId} - {tA} x {tB}</option>
                })}
              </select>
            ) : <div className="p-3 bg-slate-950 rounded border border-slate-800 text-slate-500 text-sm">Nenhuma partida pendente.</div>}
          </div>
        )}

        {selectedMatchId && (
          <div className="animate-in slide-in-from-top-4 border-t border-slate-800 pt-6 mt-6">
            
            <div className="mb-6 p-4 border border-slate-800 bg-slate-950 rounded-xl">
              <div className="flex justify-between items-center mb-2">
                <label className="block text-sm font-bold text-emerald-400">Anexar Print (Opcional)</label>
                {isAdmin && aiKey && (
                  <button type="button" onClick={() => setShowKeyConfig(!showKeyConfig)} className="text-slate-500 hover:text-amber-400 transition-colors p-1" title="Configurar API Key da IA">
                    <Settings size={18} />
                  </button>
                )}
              </div>
              <p className="text-xs text-slate-500 mb-3">Opcionalmente, anexe o print do resultado. A nossa IA tentará preencher tudo automaticamente para você.</p>
              <label className={`border-2 border-dashed rounded-xl p-4 text-center transition-colors cursor-pointer relative overflow-hidden block ${matchImageBase64 ? 'border-emerald-500 bg-emerald-500/5' : 'border-slate-700 hover:border-slate-500 bg-slate-900'}`}>
                <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} disabled={isAnalyzing} />
                {isAnalyzing && (
                  <div className="absolute inset-0 bg-emerald-500/5 flex flex-col items-center justify-center space-y-2 z-10">
                    <div className="w-6 h-6 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-emerald-400 font-medium text-sm">IA analisando o print...</p>
                  </div>
                )}
                {matchImageBase64 ? (
                  <div className="flex flex-col items-center space-y-2">
                    <CheckCircle className="text-emerald-500" size={24} />
                    <p className="text-emerald-400 font-medium text-sm">Print Anexado!</p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center space-y-2">
                    <UploadCloud className="text-slate-500" size={28} />
                    <p className="text-white font-medium text-sm">Clique para anexar o print</p>
                  </div>
                )}
              </label>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <h3 className="text-sm font-semibold text-white flex items-center gap-1.5"><Edit size={16} className="text-slate-400"/> Preencha o Resultado:</h3>
              
              <div className="flex flex-col items-center gap-4 w-full bg-slate-950 p-4 md:p-6 rounded-2xl border border-slate-800 shadow-xl">
                <div className="flex items-center justify-between w-full gap-2 border-b border-slate-800/50 pb-4 mb-2">
                  <div className="flex items-center gap-2 flex-1 min-w-0 justify-start">
                    <div className="shrink-0"><ShieldDisplay shield={teamA?.shield} size="normal" /></div>
                    <span className="font-bold text-sm md:text-base text-white truncate">{teamA?.name}</span>
                  </div>

                  <div className="flex items-center justify-center gap-2 shrink-0">
                    <input type="number" required value={scoreA} onChange={e=>setScoreA(e.target.value)} className="w-12 md:w-16 bg-slate-900 border border-slate-700 text-center font-bold text-xl md:text-2xl text-emerald-400 rounded-lg p-2 outline-none focus:border-emerald-500" />
                    <span className="text-xs text-slate-500 font-bold">X</span>
                    <input type="number" required value={scoreB} onChange={e=>setScoreB(e.target.value)} className="w-12 md:w-16 bg-slate-900 border border-slate-700 text-center font-bold text-xl md:text-2xl text-emerald-400 rounded-lg p-2 outline-none focus:border-emerald-500" />
                  </div>

                  <div className="flex items-center gap-2 flex-1 min-w-0 justify-end">
                    <span className="font-bold text-sm md:text-base text-white truncate text-right">{teamB?.name}</span>
                    <div className="shrink-0"><ShieldDisplay shield={teamB?.shield} size="normal" /></div>
                  </div>
                </div>

                <div className="flex items-start justify-between w-full gap-4 mt-2">
                  <div className="flex-1 w-full space-y-2">
                    <span className="text-[10px] text-slate-500 uppercase font-bold block text-left">Gols (Opcional)</span>
                    {goalsA.map((g, index) => (
                      <div key={index} className="flex gap-1.5 items-center bg-slate-900 border border-slate-800 rounded p-1.5">
                        <input type="text" placeholder="Jogador" value={g.player} onChange={e=>handleGoalChange('A', index, 'player', e.target.value)} className="flex-1 bg-transparent text-[10px] md:text-xs text-white outline-none w-full min-w-0" required />
                        <input type="number" placeholder="Min" value={g.minute} onChange={e=>handleGoalChange('A', index, 'minute', e.target.value)} className="w-10 bg-transparent text-[10px] md:text-xs text-emerald-400 text-center outline-none" required />
                        <button type="button" onClick={() => handleRemoveGoal('A', index)} className="text-red-500 hover:text-red-400 p-0.5"><X size={12} /></button>
                      </div>
                    ))}
                    <button type="button" onClick={() => handleAddGoal('A')} className="text-[10px] md:text-xs text-emerald-400 hover:underline flex items-center gap-1">+ Adicionar Gol</button>
                  </div>

                  <div className="w-4 shrink-0"></div>

                  <div className="flex-1 w-full space-y-2">
                    <span className="text-[10px] text-slate-500 uppercase font-bold block text-right">Gols (Opcional)</span>
                    {goalsB.map((g, index) => (
                      <div key={index} className="flex gap-1.5 items-center bg-slate-900 border border-slate-800 rounded p-1.5">
                        <input type="text" placeholder="Jogador" value={g.player} onChange={e=>handleGoalChange('B', index, 'player', e.target.value)} className="flex-1 bg-transparent text-[10px] md:text-xs text-white outline-none w-full min-w-0 text-right" required />
                        <input type="number" placeholder="Min" value={g.minute} onChange={e=>handleGoalChange('B', index, 'minute', e.target.value)} className="w-10 bg-transparent text-[10px] md:text-xs text-emerald-400 text-center outline-none" required />
                        <button type="button" onClick={() => handleRemoveGoal('B', index)} className="text-red-500 hover:text-red-400 p-0.5"><X size={12} /></button>
                      </div>
                    ))}
                    <div className="flex justify-end">
                      <button type="button" onClick={() => handleAddGoal('B')} className="text-[10px] md:text-xs text-emerald-400 hover:underline flex items-center gap-1">+ Adicionar Gol</button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium text-slate-400 block">Observações (Opcional)</label>
                <textarea placeholder="Ocorreu alguma queda de conexão? Relate aqui..." value={observacoes} onChange={e=>setObservacoes(e.target.value)} className="w-full bg-slate-950 border border-slate-700 focus:border-emerald-500 rounded-lg p-3 text-slate-300 text-sm h-24 outline-none resize-none transition-colors" />
              </div>

              <Button type="submit" className="w-full py-4 text-lg shadow-emerald-950/50 shadow-2xl">Enviar Partida para Nuvem</Button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};

const Dashboard = ({ matches, teams, competitions, currentUser }) => {
  const isAdmin = currentUser?.role === 'leader' || currentUser?.role === 'kaioh';
  const userTeamIds = teams.filter(t => t.ownerId === currentUser?.id).map(t => t.id);
  
  const visibleCompIds = competitions
    .filter(c => c.teams?.some(t => userTeamIds.includes(t)))
    .map(c => c.id);

  const recentMatches = matches
    .filter(m => isAdmin || visibleCompIds.includes(m.compId))
    .reverse()
    .slice(0, 5);
    
  const getTeam = (id) => teams.find(t => t.id === id);
  
  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="bg-gradient-to-r from-emerald-900/50 to-slate-900 p-6 rounded-2xl border border-emerald-900/50">
        <h2 className="text-2xl font-bold text-white mb-2">QG Clã Kame</h2>
        <p className="text-slate-400">Gerencie e acompanhe seus resultados do DLS.</p>
      </div>
      <div>
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2"><Activity size={20} className="text-emerald-500" /> Últimos Resultados Enviados</h3>
        <div className="space-y-3">
          {recentMatches.length === 0 && <p className="text-slate-500 text-sm p-4 bg-slate-900 rounded-xl border border-slate-800">Nenhum resultado submetido ainda.</p>}
          {recentMatches.map(m => {
            const tA = getTeam(m.teamA); const tB = getTeam(m.teamB);
            return (
              <div key={m.id} className="bg-slate-900 p-3 md:p-4 rounded-xl border border-slate-800 flex flex-col gap-3 shadow-sm">
                <div className="flex items-center justify-between w-full gap-2">
                  <div className="flex items-center gap-2 flex-1 min-w-0 justify-start">
                    <div className="shrink-0"><ShieldDisplay shield={tA?.shield} size="small" /></div>
                    <span className="font-medium text-[11px] md:text-sm text-slate-200 truncate">{tA?.name}</span>
                  </div>
                  
                  <div className="flex items-center justify-center gap-1.5 md:gap-3 px-3 py-1.5 bg-slate-950 rounded-lg border border-slate-800 shrink-0">
                    <span className="font-bold text-sm md:text-lg text-emerald-400">{m.status === 'approved' || m.status === 'pending' ? m.scoreA : '?'}</span>
                    <span className="text-[10px] md:text-xs text-slate-500 font-bold mx-0.5">X</span>
                    <span className="font-bold text-sm md:text-lg text-emerald-400">{m.status === 'approved' || m.status === 'pending' ? m.scoreB : '?'}</span>
                  </div>

                  <div className="flex items-center gap-2 flex-1 min-w-0 justify-end">
                    <span className="font-medium text-[11px] md:text-sm text-slate-200 truncate text-right">{tB?.name}</span>
                    <div className="shrink-0"><ShieldDisplay shield={tB?.shield} size="small" /></div>
                  </div>
                </div>
                
                <div className="flex justify-center border-t border-slate-800/50 pt-2">
                  {m.status === 'approved' ? <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-400">✅ Oficializado</span> : m.status === 'rejected' ? <span className="text-[10px] uppercase font-bold tracking-wider text-red-400">❌ Rejeitado</span> : <span className="text-[10px] uppercase font-bold tracking-wider text-amber-400">⏳ Aguardando Validação</span>}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default function App() {
  const [fbUser, setFbUser] = useState(null);
  const [isFirebaseLoading, setIsFirebaseLoading] = useState(true);
  const [isProfileLoading, setIsProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState('');
  
  const [users, setUsers] = useState([]);
  const [matches, setMatches] = useState([]);
  const [teams, setTeams] = useState([]);
  const [competitions, setCompetitions] = useState([]);

  const [currentTab, setCurrentTab] = useState('dashboard');
  const [selectedCompId, setSelectedCompId] = useState(null);

  const [toastMessage, setToastMessage] = useState(null);

  const showToast = (text, type = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 4000);
  };

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      setFbUser(user);
      setIsFirebaseLoading(false);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!fbUser) return;
    
    setIsProfileLoading(true);
    setProfileError('');

    const setupProfile = async () => {
      try {
        const userRef = getPublicDocPath('users', fbUser.uid);
        const snap = await getDoc(userRef);
        let emailOriginal = fbUser.email || '';
        let userWhatsapp = emailOriginal.includes('@clakame.com') ? emailOriginal.replace('@clakame.com', '') : '';
        
        if (!snap.exists()) {
          const pendingRefWa = getPublicDocPath('users', `pending_${userWhatsapp}`);
          const pendingRefEmail = getPublicDocPath('users', `pending_${emailOriginal}`);
          
          let pendingSnap = await getDoc(pendingRefWa);
          if(!pendingSnap.exists() && emailOriginal) pendingSnap = await getDoc(pendingRefEmail);

          if (pendingSnap.exists()) {
             const pData = pendingSnap.data();
             await setDoc(userRef, {
               id: fbUser.uid,
               email: emailOriginal,
               name: pData.name,
               role: pData.role,
               whatsapp: pData.whatsapp
             });
             await deleteDoc(pendingSnap.ref); 
          } else {
             const isSavio = emailOriginal === 'saviosaraiva777@gmail.com' || emailOriginal.includes('savio') || emailOriginal.includes('91998270658');
             
             let finalName = userWhatsapp || emailOriginal.split('@')[0];
             let finalWhatsapp = userWhatsapp;
             let finalRole = isSavio ? 'leader' : 'member';

             if (isSavio) {
                 finalName = 'Sávio Saraiva';
                 finalWhatsapp = '91998270658';
                 finalRole = 'leader';
             }

             await setDoc(userRef, {
               id: fbUser.uid, 
               email: emailOriginal, 
               name: finalName, 
               role: finalRole, 
               whatsapp: finalWhatsapp
             });
          }
        }
        setIsProfileLoading(false);
      } catch (err) { 
        setIsProfileLoading(false);
        setProfileError(err.message || 'Ocorreu um erro de conexão.');
      }
    };
    setupProfile();

    const unsubU = onSnapshot(getPublicPath('users'), snap => setUsers(snap.docs.map(d=>d.data())));
    const unsubT = onSnapshot(getPublicPath('teams'), snap => setTeams(snap.docs.map(d=>d.data())));
    const unsubC = onSnapshot(getPublicPath('competitions'), snap => setCompetitions(snap.docs.map(d=>d.data())));
    const unsubM = onSnapshot(getPublicPath('matches'), snap => setMatches(snap.docs.map(d=>d.data())));

    return () => { unsubU(); unsubT(); unsubC(); unsubM(); };
  }, [fbUser]);

  useEffect(() => {
    const linkPendingTeams = async () => {
      if (!fbUser || teams.length === 0) return;
      const currentUser = users.find(u => u.id === fbUser.uid);
      if(!currentUser) return;

      const userWhatsapp = currentUser.whatsapp;
      const userEmail = currentUser.email;

      const pendingTeams = teams.filter(t => t.ownerId === `pending_${userWhatsapp}` || t.ownerId === `pending_${userEmail}`);
      
      for (const t of pendingTeams) {
        await updateDoc(getPublicDocPath('teams', t.id), { ownerId: fbUser.uid });
      }
    };
    linkPendingTeams();
  }, [teams, fbUser, users]);

  const handleReleaseRound = async (compId, roundId) => {
    const comp = competitions.find(c => c.id === compId);
    if (!comp) return;
    const rounds = comp.rounds.map(r => r.id === roundId ? { ...r, status: 'released' } : r);
    await updateDoc(getPublicDocPath('competitions', compId), { rounds });
    showToast("Rodada liberada com sucesso!", "success");
  };

  const handleSelectComp = (id) => {
    setSelectedCompId(id);
    setCurrentTab('comp_details');
  };

  const handleEditTeam = async (updatedTeam) => {
    await updateDoc(getPublicDocPath('teams', updatedTeam.id), updatedTeam);
  };

  const handleCreateTeamAndUser = async ({ user, team }) => {
    await setDoc(getPublicDocPath('users', user.id), user);
    await setDoc(getPublicDocPath('teams', team.id), team);
    setCurrentTab('dashboard');
  };

  const handleExpelUser = async (userId) => {
    if (fbUser && userId === fbUser.uid) {
      showToast("Você não pode se expulsar!", "error");
      return;
    }
    const userTeam = teams.find(t => t.ownerId === userId);
    if (userTeam) await deleteDoc(getPublicDocPath('teams', userTeam.id));
    await deleteDoc(getPublicDocPath('users', userId));
    showToast("Técnico e time excluídos com sucesso!", "success");
  };

  const formatarParaEmail = (texto) => {
    const textoLimpo = texto.trim().toLowerCase();
    if (textoLimpo.includes('@')) { return textoLimpo; }
    const celularLimpo = textoLimpo.replace(/[-\s().]/g, '');
    return celularLimpo + '@clakame.com';
  };

  const handleFirstAccess = async (userDoc, emailDigitado, whatsappDigitado, newPassword) => {
    const emailToUse = (userDoc && userDoc.email) ? userDoc.email : formatarParaEmail(emailDigitado || whatsappDigitado);
    try {
      await createUserWithEmailAndPassword(auth, emailToUse, newPassword);
    } catch (error) {
      if (error.code === 'auth/email-already-in-use') {
         throw new Error("Sua conta já está ativada! Volte para a tela inicial e faça login.");
      } else if (error.code === 'auth/weak-password') {
         throw new Error("A senha deve ter pelo menos 6 caracteres.");
      } else {
         throw new Error("Erro do sistema: " + error.message);
      }
    }
  };

  const handleLogin = async (identifier, password) => {
    const cleanPhone = identifier.replace(/\D/g, '');

    if (users.length === 0 && (identifier.toLowerCase().includes('savio') || cleanPhone === '91998270658')) {
       const masterUser = { id: 'u_master', name: 'Sávio Saraiva', role: 'leader', whatsapp: '91998270658', email: 'saviosaraiva777@gmail.com', password: password };
       await setDoc(getPublicDocPath('users', 'u_master'), masterUser);
       return;
    }

    const emailFake = formatarParaEmail(identifier);
    await signInWithEmailAndPassword(auth, emailFake, password);
  };

  const currentUser = users.find(u => u.id === fbUser?.uid) || (fbUser ? {
    id: fbUser.uid, email: fbUser.email, name: fbUser.email?.split('@')[0] || 'Guerreiro',
    role: (fbUser.email?.includes('11989000858') || fbUser.email?.includes('savio')) ? 'leader' : 'member',
    whatsapp: fbUser.email?.split('@')[0] || ''
  } : null);

  if (isFirebaseLoading) {
    return (<div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: '#18191a', color: '#ffde59', fontFamily: 'sans-serif' }}><h2>🛡️ A preparar o Clã Kame...</h2></div>);
  }
  if (fbUser && isProfileLoading) {
    return (<div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: '#18191a', color: '#ffde59', fontFamily: 'sans-serif' }}><h2>⏳ A carregar o seu Quartel General...</h2></div>);
  }
  if (fbUser && profileError) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', backgroundColor: '#18191a', color: '#e4e6eb', fontFamily: 'sans-serif', textAlign: 'center', padding: '20px' }}>
        <h2 style={{ color: '#ffde59', marginBottom: '10px' }}>Erro de Conexão</h2>
        <p style={{ color: '#ff914d', fontWeight: 'bold' }}>{profileError}</p>
        <button onClick={async () => { await signOut(auth); window.location.reload(); }} style={{ marginTop: '20px', padding: '12px 24px', backgroundColor: '#ff914d', fontWeight: 'bold', borderRadius: '8px', cursor: 'pointer', border: 'none' }}>Sair e Tentar Novamente</button>
      </div>
    );
  }

  if (!currentUser) {
    return <LoginScreen users={users} onLogin={handleLogin} onFirstAccess={handleFirstAccess} />;
  }

  const TABS = [
    { id: 'dashboard', label: 'Início', icon: Home },
    { id: 'profile', label: 'Meu Perfil', icon: User },
    { id: 'teams_list', label: 'Times', icon: Shield },
    { id: 'competitions', label: 'Competições', icon: Medal },
    { id: 'submit', label: 'Registrar', icon: Camera },
    ...(currentUser.role === 'leader' || currentUser.role === 'kaioh' ? [
      { id: 'validation', label: 'Validação', icon: CheckSquare },
      { id: 'members_list', label: 'Técnicos', icon: Crown },
      { id: 'create_comp', label: 'Nova Comp', icon: PlusCircle },
      { id: 'create_team', label: 'Convidar Técnico', icon: Users },
      { id: 'create_team_manual', label: 'Time Simples', icon: UserPlus }
    ] : []),
  ];

  const renderContent = () => {
    switch (currentTab) {
      case 'dashboard': return <Dashboard matches={matches} teams={teams} competitions={competitions} currentUser={currentUser} />;
      case 'profile': return <Profile currentUser={currentUser} teams={teams} matches={matches} competitions={competitions} />;
      case 'teams_list': return <TeamsList teams={teams} currentUser={currentUser} onEditTeam={handleEditTeam} competitions={competitions} matches={matches} />;
      case 'competitions': return <CompetitionsList competitions={competitions} teams={teams} currentUser={currentUser} onSelectComp={handleSelectComp} onEditComp={c => updateDoc(getPublicDocPath('competitions', c.id), c)} onDeleteComp={id => deleteDoc(getPublicDocPath('competitions', id))} />;
      case 'comp_details': return <CompetitionDetails comp={competitions.find(c=>c.id===selectedCompId)} teams={teams} matches={matches} currentUser={currentUser} onBack={()=>setCurrentTab('competitions')} onReleaseRound={handleReleaseRound} />;
      case 'submit': return <SubmitMatch teams={teams} competitions={competitions} matches={matches} onSubmit={m => setDoc(getPublicDocPath('matches', m.id), m).then(()=>setCurrentTab('dashboard'))} currentUser={currentUser} showToast={showToast} />;
      case 'validation': return <ValidationPanel matches={matches} teams={teams} competitions={competitions} onUpdateStatus={(id, st) => updateDoc(getPublicDocPath('matches', id), { status: st })} showToast={showToast} />;
      case 'create_comp': return <CreateCompetition teams={teams} onCreate={c => setDoc(getPublicDocPath('competitions', c.id), c).then(()=>setCurrentTab('competitions'))} showToast={showToast} />;
      case 'create_team': return <CreateTeamFull onCreate={handleCreateTeamAndUser} showToast={showToast} />;
      case 'create_team_manual': return <CreateTeamManual onCreate={t => setDoc(getPublicDocPath('teams', t.id), t).then(()=>setCurrentTab('teams_list'))} showToast={showToast} />;
      case 'members_list': return <MembersList users={users} teams={teams} currentUser={currentUser} onUpdateUserRole={(id, r) => updateDoc(getPublicDocPath('users', id), {role: r})} onExpelUser={handleExpelUser} onEditUser={(id, data) => updateDoc(getPublicDocPath('users', id), data)} onLinkTeam={async (uid, name, shield) => { const newTeamId = `t${Date.now()}`; await setDoc(getPublicDocPath('teams', newTeamId), { id: newTeamId, name, ownerId: uid, shield, coach: users.find(u=>u.id===uid)?.name, whatsapp: users.find(u=>u.id===uid)?.whatsapp }); showToast("Time vinculado!", "success"); return true; }} showToast={showToast} />;
      default: return <Dashboard matches={matches} teams={teams} competitions={competitions} currentUser={currentUser} />;
    }
  };

  const pendingCount = (currentUser.role === 'leader' || currentUser.role === 'kaioh') ? matches.filter(m=>m.status==='pending').length : 0;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans flex flex-col md:flex-row relative">
      
      {toastMessage && (
        <div className={`fixed top-4 right-4 z-50 px-6 py-3 rounded-xl shadow-2xl flex items-center gap-3 animate-in slide-in-from-top-4 ${toastMessage.type === 'error' ? 'bg-red-950 border border-red-500 text-red-100' : 'bg-slate-800 border border-emerald-500 text-white'}`}>
          {toastMessage.type === 'error' ? <AlertCircle className="text-red-500" size={20} /> : <CheckCircle className="text-emerald-500" size={20} />}
          <span className="font-medium text-sm">{toastMessage.text}</span>
        </div>
      )}

      <aside className="w-full md:w-64 bg-slate-900 border-b md:border-b-0 md:border-r border-slate-800 flex flex-col shrink-0 z-10 shadow-2xl">
        <div className="p-6 flex items-center gap-3">
          {LOGO_URL ? (
            <img src={LOGO_URL} alt="Clã Kame" className="w-10 h-10 object-contain drop-shadow-[0_0_15px_rgba(255,222,89,0.3)]" />
          ) : (
            <Shield size={36} className="text-emerald-500" />
          )}
          <div><h1 className="font-bold text-white text-xl leading-tight">Clã Kame</h1><p className="text-[10px] font-bold tracking-widest text-emerald-400 uppercase">Arena DLS</p></div>
        </div>
        <nav className="flex-1 px-4 pb-4 overflow-y-auto flex md:flex-col gap-2 overflow-x-auto custom-scrollbar">
          {TABS.map(tab => {
            const isActive = currentTab === tab.id || (tab.id === 'competitions' && currentTab === 'comp_details');
            return (
              <button key={tab.id} onClick={() => setCurrentTab(tab.id)} className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all whitespace-nowrap outline-none ${isActive ? 'bg-emerald-500/10 text-emerald-400 font-bold shadow-sm border border-emerald-500/20' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200 border border-transparent'}`}>
                <tab.icon size={18} className={isActive ? 'text-emerald-400' : 'text-slate-500'} /> 
                <span className="text-sm">{tab.label}</span>
                {tab.id === 'validation' && pendingCount > 0 && <span className="ml-auto bg-amber-500 text-amber-950 text-xs font-black px-2 py-0.5 rounded-full">{pendingCount}</span>}
              </button>
            );
          })}
        </nav>
        <div className="p-4 border-t border-slate-800 hidden md:block">
          <div className="bg-slate-950 rounded-xl p-4 border border-slate-800/50 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500"></div>
            <p className="font-bold text-white truncate text-sm">{currentUser.name}</p>
            <p className="text-[10px] uppercase font-bold tracking-wider text-emerald-400 mb-3">{ROLE_NAMES[currentUser.role]}</p>
            <button onClick={async () => { await signOut(auth); setCurrentTab('dashboard'); }} className="w-full flex items-center justify-center gap-2 text-xs font-bold text-slate-400 hover:text-white py-2 rounded-lg hover:bg-slate-800 transition-colors border border-slate-700/50"><LogOut size={14} /> Desconectar</button>
          </div>
        </div>
      </aside>
      <main className="flex-1 p-4 md:p-8 overflow-y-auto bg-slate-950 relative">
        <div className="max-w-5xl mx-auto pb-20 md:pb-0">{renderContent()}</div>
      </main>
    </div>
  );
}

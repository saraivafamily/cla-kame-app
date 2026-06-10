import React, { useState, useEffect, useMemo } from 'react';
import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged
} from 'firebase/auth';
import { 
  getFirestore, 
  doc, 
  setDoc, 
  updateDoc, 
  onSnapshot, 
  collection, 
  deleteDoc 
} from 'firebase/firestore';
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
      const MAX_SIZE = 1920; 
      let width = img.width; let height = img.height;
      if (width > height) { if (width > MAX_SIZE) { height *= MAX_SIZE / width; width = MAX_SIZE; } }
      else { if (height > MAX_SIZE) { width *= MAX_SIZE / height; height = MAX_SIZE; } }
      canvas.width = width; canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);
      callback(canvas.toDataURL('image/jpeg', 0.95)); 
    };
    img.src = event.target.result;
  };
  reader.readAsDataURL(file);
};

const ShieldDisplay = ({ shield, size = 'normal' }) => {
  const isImage = typeof shield === 'string' && (shield.startsWith('data:') || shield.startsWith('http'));
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
// MÁQUINAS DE SORTEIO (ROUND-ROBIN & MATA-MATA)
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

const generateCupBracket = (teamIds, compId) => {
  let teams = [...teamIds];
  
  let powerOf2 = 1;
  while (powerOf2 < teams.length) powerOf2 *= 2;
  
  while (teams.length < powerOf2) {
    teams.push(''); 
  }

  const totalRounds = Math.log2(powerOf2);
  const rounds = [];
  let matchCounter = 1;

  for (let r = 0; r < totalRounds; r++) {
    const roundMatches = [];
    const numMatches = powerOf2 / Math.pow(2, r + 1);
    
    for (let i = 0; i < numMatches; i++) {
      let tA = '';
      let tB = '';
      
      if (r === 0) {
        tA = teams[i * 2] || '';
        tB = teams[i * 2 + 1] || '';
      }

      roundMatches.push({
        id: `${compId}_m${matchCounter}_r${r+1}`,
        teamA: tA,
        teamB: tB,
        status: 'pending_play'
      });
      matchCounter++;
    }

    let roundLabel = String(r + 1);
    if (numMatches === 1) roundLabel = 'Final';
    else if (numMatches === 2) roundLabel = 'Semifinal';
    else if (numMatches === 4) roundLabel = 'Quartas';
    else if (numMatches === 8) roundLabel = 'Oitavas';

    rounds.push({
      id: `r${r+1}`,
      number: roundLabel,
      status: r === 0 ? 'released' : 'locked',
      matches: roundMatches
    });
  }
  return rounds;
};

const calculateStandings = (matches, teams, compId) => {
  const table = {};
  teams.forEach(t => { table[t.id] = { ...t, p: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, gd: 0, pts: 0 }; });

  const approvedMatchesMap = {};
  matches.filter(m => m.compId === compId && m.status === 'approved').forEach(m => {
    const time = parseInt(String(m.id).split('_')[1] || '0');
    if (!approvedMatchesMap[m.matchId]) {
      approvedMatchesMap[m.matchId] = m;
    } else {
      const prevTime = parseInt(String(approvedMatchesMap[m.matchId].id).split('_')[1] || '0');
      if (time > prevTime) approvedMatchesMap[m.matchId] = m;
    }
  });

  const compMatches = Object.values(approvedMatchesMap);

  compMatches.forEach(m => {
    const tA = table[m.teamA]; const tB = table[m.teamB];
    if (!tA || !tB) return;
    tA.p += 1; tB.p += 1; tA.gf += Number(m.scoreA || 0); tB.gf += Number(m.scoreB || 0); tA.ga += Number(m.scoreB || 0); tB.ga += Number(m.scoreA || 0);

    if (Number(m.scoreA) > Number(m.scoreB)) { tA.pts += 3; tA.w += 1; tB.l += 1; } 
    else if (Number(m.scoreA) < Number(m.scoreB)) { tB.pts += 3; tB.w += 1; tA.l += 1; } 
    else { tA.pts += 1; tB.pts += 1; tA.d += 1; tB.d += 1; }
  });

  return Object.values(table).map(t => ({ ...t, gd: t.gf - t.ga })).sort((a, b) => {
    if (b.pts !== a.pts) return b.pts - a.pts;
    if (b.w !== a.w) return b.w - a.w;
    if (b.gd !== a.gd) return b.gd - a.gd;
    return b.gf - a.gf;
  });
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
      (u.email && String(u.email).toLowerCase() === cleanInput) || 
      (cleanPhone.length >= 8 && String(u.whatsapp) === cleanPhone)
    );
    
    if (!user) {
      setLoginError('Registo não encontrado. Solicite a um Líder para cadastrar o seu perfil primeiro.');
      return;
    }
    
    if (!String(user.id).startsWith('pending_')) {
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
      setLoginError('A palavra-passe deve ter no mínimo 6 caracteres.');
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
              <label className="text-xs text-slate-400 mb-1 block">Palavra-passe</label>
              <input required type="password" value={loginData.password} onChange={e=>setLoginData({...loginData, password: e.target.value})} className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-white outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-sm transition-all" placeholder="••••••••" />
            </div>
            <div className="text-right">
              <button type="button" onClick={() => setShowForgot(true)} className="text-xs text-emerald-400 hover:text-emerald-300 transition-colors underline underline-offset-2">Esqueci-me da palavra-passe</button>
            </div>
            {showForgot && (
              <div className="bg-emerald-500/10 border border-emerald-500/20 p-3 rounded-lg text-xs text-emerald-400 text-center animate-in fade-in">
                Funcionalidade simulada: No app real, enviaremos um código de redefinição para o seu WhatsApp!
              </div>
            )}
            <Button type="submit" className="w-full mt-2 py-3 shadow-xl">Entrar no Clã</Button>

            <div className="mt-6 text-center pt-5 border-t border-slate-800/50">
              <p className="text-xs text-slate-500 mb-2">Foi convidado por um Líder e ainda não tem acesso?</p>
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
              <label className="text-xs text-slate-400 mb-1 block">O seu E-mail ou WhatsApp</label>
              <input required type="text" value={faEmail} onChange={e=>setFaEmail(e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-white outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-sm transition-all" placeholder="Ex: tecnico@email.com" />
            </div>
            
            <Button type="submit" disabled={isSending} className="w-full mt-2 py-3 shadow-xl">
              {isSending ? 'A localizar perfil...' : 'Avançar'}
            </Button>
            
            <button type="button" onClick={() => {setView('login'); setLoginError('');}} className="w-full text-xs text-slate-500 hover:text-white mt-4 transition-colors">Voltar para o Login</button>
          </form>
        )}

        {view === 'fa_code' && (
           <form onSubmit={handleVerifyCode} className="space-y-4 animate-in slide-in-from-right-4 duration-300 text-center">
             <div className="bg-emerald-500/10 text-emerald-400 p-4 rounded-xl mb-4 text-sm border border-emerald-500/20">
               Enviamos um código para o WhatsApp final <br/>
               <b className="text-lg tracking-wider text-white mt-1 inline-block">***{String(faUser?.whatsapp || '').slice(-4)}</b>
               <span className="text-xs text-slate-400 mt-4 block p-2 bg-slate-950 rounded-lg border border-slate-800">
                 (Modo Simulação: Como este é um teste, digite qualquer código numérico, ex: <b>1234</b>)
               </span>
             </div>
             <div>
               <input required type="text" maxLength={4} value={code} onChange={e=>setCode(e.target.value)} className="w-40 mx-auto text-center tracking-[0.7em] font-bold text-3xl bg-slate-950 border border-slate-700 rounded-xl p-4 text-white outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/50 transition-all" placeholder="0000" />
             </div>
             <Button type="submit" disabled={code.length < 4 || isSending} className="w-full py-4 text-lg mt-4 shadow-xl">
               {isSending ? 'A verificar...' : 'Verificar Código'}
             </Button>
             <button type="button" onClick={()=>setView('fa_email')} className="text-sm text-slate-500 hover:text-white mt-4 underline underline-offset-4 transition-colors">Voltar</button>
           </form>
        )}

        {view === 'fa_pass' && (
           <form onSubmit={handleSavePassword} className="space-y-4 animate-in slide-in-from-right-4 duration-300">
             <h2 className="text-lg font-bold text-emerald-400 text-center mb-2">Quase lá, {String(faUser?.name || '').split(' ')[0]}!</h2>
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
          <h2 className="text-2xl font-bold text-white">{String(currentUser.name)}</h2>
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
            const scoreFor = Number(isTeamA ? m.scoreA : m.scoreB);
            const scoreAgainst = Number(isTeamA ? m.scoreB : m.scoreA);
            gf += scoreFor; ga += scoreAgainst;
            
            // Vitória simples
            if (scoreFor > scoreAgainst) {
              wins++;
              const gd = scoreFor - scoreAgainst;
              if (gd > maxGd) { maxGd = gd; biggestWin = { scoreFor, scoreAgainst, oppId: isTeamA ? m.teamB : m.teamA }; }
            } 
            // Empate
            else if (scoreFor === scoreAgainst) { 
              // Verificação de penalidades para vitória
              const penFor = isTeamA ? m.penaltiesA : m.penaltiesB;
              const penAgainst = isTeamA ? m.penaltiesB : m.penaltiesA;
              
              if (penFor !== undefined && penFor > penAgainst) {
                wins++;
              } else if (penFor !== undefined && penFor < penAgainst) {
                losses++;
              } else {
                draws++; 
              }
            } 
            else { losses++; }
          });

          const participations = competitions.filter(c => c.teams?.includes(team.id)).map(c => {
            const table = calculateStandings(matches, teams, c.id);
            const rankIndex = table.findIndex(t => t.id === team.id);
            const rank = rankIndex !== -1 ? rankIndex + 1 : '-';
            return { compName: c.name, rank, format: c.format };
          });

          return (
            <div key={team.id} className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden">
              <div className="bg-slate-950/50 p-6 border-b border-slate-800 flex items-center gap-4">
                <ShieldDisplay shield={team.shield} size="large" />
                <div>
                  <h3 className="text-2xl font-bold text-white">{String(team.name)}</h3>
                  <p className="text-slate-400">Técnico: <span className="text-slate-300 font-medium">{String(team.coach || 'Não informado')}</span></p>
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
                      <p className="text-white font-medium text-lg">{String(team.name)} <span className="font-bold text-emerald-400 mx-2">{biggestWin.scoreFor} x {biggestWin.scoreAgainst}</span> {String(teams.find(t=>t.id === biggestWin.oppId)?.name || '')}</p>
                    </div>
                  </div>
                )}
                <div>
                  <h4 className="text-lg font-bold text-white mb-4 flex items-center gap-2"><Trophy className="text-amber-500" size={20}/> Histórico em Competições</h4>
                  {participations.length > 0 ? (
                    <div className="space-y-3">
                      {participations.map((p, i) => (
                        <div key={i} className="flex justify-between items-center bg-slate-950 p-4 rounded-xl border border-slate-800">
                          <span className="text-slate-200 font-medium">{String(p.compName)}</span>
                          <div className="flex items-center gap-3">
                            <span className="text-xs bg-slate-800 text-slate-400 px-2 py-1 rounded hidden md:block">{p.format === 'league' ? 'Liga' : 'Copa'}</span>
                            <span className="font-bold text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-lg border border-emerald-500/20">{p.rank}º Lugar</span>
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

const Standings = ({ matches, teams, compId, compName }) => {
  const table = useMemo(() => calculateStandings(matches || [], teams || [], compId), [matches, teams, compId]);
  const tableRef = React.useRef(null);
  const [isExporting, setIsExporting] = useState(false);

  const handleExportTable = async () => {
    try {
      setIsExporting(true);
      // Carrega a ferramenta fotográfica (html2canvas) de forma dinâmica
      let html2canvas = window.html2canvas;
      if (!html2canvas) {
        await new Promise((resolve, reject) => {
          const script = document.createElement('script');
          script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';
          script.onload = resolve;
          script.onerror = reject;
          document.head.appendChild(script);
        });
        html2canvas = window.html2canvas;
      }

      if (tableRef.current) {
        // Tira a foto focando no container, injetando fundo slate escuro
        const canvas = await html2canvas(tableRef.current, {
          backgroundColor: '#0f172a',
          scale: 2, // Maior qualidade (HD)
          useCORS: true,
          windowWidth: tableRef.current.scrollWidth,
        });
        
        const image = canvas.toDataURL("image/png");
        const link = document.createElement("a");
        link.href = image;
        link.download = `Tabela_${compName ? compName.replace(/\s+/g, '_') : 'Classificacao'}.png`;
        link.click();
      }
    } catch (error) {
      console.error("Erro ao gerar imagem da tabela:", error);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-3">
          <Trophy className="text-amber-400" size={28} />
          <h2 className="text-2xl font-bold text-white">Classificação</h2>
        </div>
        <button 
          onClick={handleExportTable} 
          disabled={isExporting} 
          className="flex items-center gap-2 bg-emerald-600/10 hover:bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 px-4 py-2 rounded-lg text-sm font-bold transition-all disabled:opacity-50"
        >
          <Camera size={16} /> {isExporting ? 'A Processar...' : 'Publicar Tabela'}
        </button>
      </div>
      <div ref={tableRef} className="bg-slate-900 rounded-2xl border border-slate-800 overflow-x-auto shadow-xl">
        {isExporting && compName && (
          <div className="p-5 bg-slate-950 text-center border-b border-slate-800">
            <h2 className="text-xl font-black text-emerald-400 uppercase tracking-widest">🏆 {String(compName)}</h2>
            <p className="text-xs text-slate-500 mt-1">Classificação Oficial • Clã Kame</p>
          </div>
        )}
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
                  <ShieldDisplay shield={row.shield} size="small" /> {String(row.name)}
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
        {isExporting && (
          <div className="p-3 bg-slate-950 text-center border-t border-slate-800 text-[10px] text-slate-500 font-bold uppercase tracking-widest">
            Gerado pelo App Oficial do Clã Kame
          </div>
        )}
      </div>
    </div>
  );
};

const TeamsList = ({ teams, currentUser, onEditTeam, competitions, matches }) => {
  const [editingId, setEditingId] = useState(null);
  const [editData, setEditData] = useState({ name: '', coach: '', whatsapp: '', shield: '' });

  const userTeamIds = useMemo(() => (teams || []).filter(t => t.ownerId === currentUser?.id).map(t => t.id), [teams, currentUser]);

  const hasPendingMatch = (targetTeamId) => {
    if (!currentUser || userTeamIds.length === 0 || userTeamIds.includes(targetTeamId)) return false;
    
    let canPlay = false;
    (competitions || []).forEach(comp => {
      if (comp.rounds && Array.isArray(comp.rounds)) {
        comp.rounds.filter(r => r.status === 'released').forEach(round => {
          if (Array.isArray(round.matches)) {
            round.matches.forEach(rm => {
              const alreadySubmitted = (matches || []).some(m => m.matchId === rm.id && (m.status === 'pending' || m.status === 'approved'));
              if (!alreadySubmitted) {
                const isUserInvolved = userTeamIds.includes(rm.teamA) || userTeamIds.includes(rm.teamB);
                const isTargetInvolved = rm.teamA === targetTeamId || rm.teamB === targetTeamId;
                if (isUserInvolved && isTargetInvolved) {
                  canPlay = true;
                }
              }
            });
          }
        });
      }
    });
    return canPlay;
  };

  const handleWhatsApp = (phone) => {
    if (!phone) return;
    const cleanPhone = String(phone).replace(/\D/g, ''); 
    window.open(`https://wa.me/${cleanPhone}`, '_blank');
  };

  const startEdit = (team) => {
    setEditingId(team.id);
    setEditData({ name: team.name, coach: team.coach || '', whatsapp: team.whatsapp || '', shield: team.shield || '🛡️' });
  };

  const saveEdit = (team) => {
    if (!editData.name || !editData.coach) return;
    onEditTeam({ ...team, ...editData });
    setEditingId(null);
  };

  return (
    <div className="animate-in fade-in duration-500">
      <div className="flex items-center gap-3 mb-6">
        <Shield className="text-emerald-500" size={28} />
        <h2 className="text-2xl font-bold text-white">Mural de Times</h2>
      </div>
      
      {(!teams || teams.length === 0) ? (
        <div className="bg-slate-900 p-8 rounded-2xl border border-slate-800 text-center text-slate-500">
          Nenhum time registrado no clã ainda.
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 md:gap-4">
          {teams.map(team => {
            if (editingId === team.id) {
              return (
                <div key={team.id} className="bg-slate-900 p-3 rounded-xl border border-emerald-500/50 shadow-[0_0_15px_rgba(16,185,129,0.1)] flex flex-col justify-between gap-3">
                  <div className="flex flex-col items-center gap-2">
                    <div className="shrink-0 pt-1">
                      <label className="cursor-pointer relative group flex flex-col items-center">
                        <div className="relative">
                          <ShieldDisplay shield={editData.shield} size="normal" />
                          <div className="absolute -bottom-1 -right-2 bg-emerald-600 rounded-full p-1 shadow-lg group-hover:scale-110 transition-transform flex items-center justify-center">
                            <UploadCloud size={10} className="text-white" />
                          </div>
                        </div>
                        <input type="file" accept="image/*" className="hidden" onChange={(e) => processImage(e.target.files[0], (base64) => setEditData({...editData, shield: base64}))} />
                      </label>
                    </div>
                    <div className="flex-1 space-y-1.5 w-full mt-1">
                      <input type="text" value={editData.name} onChange={e=>setEditData({...editData, name: e.target.value})} placeholder="Time" className="w-full bg-slate-950 border border-slate-700 rounded p-1.5 text-white text-[10px] md:text-xs outline-none focus:border-emerald-500 transition-colors" />
                      <input type="text" value={editData.coach} onChange={e=>setEditData({...editData, coach: e.target.value})} placeholder="Técnico" className="w-full bg-slate-950 border border-slate-700 rounded p-1.5 text-white text-[10px] md:text-xs outline-none focus:border-emerald-500 transition-colors" />
                      <input type="text" value={editData.whatsapp} onChange={e=>setEditData({...editData, whatsapp: e.target.value})} placeholder="WhatsApp" className="w-full bg-slate-950 border border-slate-700 rounded p-1.5 text-white text-[10px] md:text-xs outline-none focus:border-emerald-500 transition-colors" />
                    </div>
                  </div>
                  <div className="flex gap-1.5 mt-1">
                    <Button variant="outline" onClick={() => setEditingId(null)} className="flex-1 py-1.5 text-[10px] px-0 hover:text-white"><X size={12}/></Button>
                    <Button onClick={() => saveEdit(team)} className="flex-1 py-1.5 text-[10px] px-0"><Save size={12}/></Button>
                  </div>
                </div>
              );
            }

            return (
              <div key={team.id} className="relative bg-slate-900 p-3 md:p-4 rounded-xl border border-slate-800 hover:border-slate-700 transition-all flex flex-col justify-between gap-3 group">
                {currentUser?.role === 'leader' && (
                  <button onClick={() => startEdit(team)} className="absolute top-2 right-2 text-slate-500 hover:text-emerald-400 md:opacity-0 md:group-hover:opacity-100 transition-opacity p-1.5 rounded-lg hover:bg-slate-800" title="Editar Time">
                    <Edit size={14} />
                  </button>
                )}
                <div className="flex flex-col items-center text-center gap-2 mt-2">
                  <div className="shrink-0"><ShieldDisplay shield={team.shield} size="normal" /></div>
                  <div className="w-full">
                    <h3 className="text-sm md:text-base font-bold text-white leading-tight truncate px-2">{String(team.name)}</h3>
                    <p className="text-[9px] md:text-[10px] text-slate-400 mt-1 truncate px-1"><span className="text-slate-300 font-medium">{String(team.coach || 'Sem técnico')}</span></p>
                  </div>
                </div>
                <Button 
                  onClick={() => handleWhatsApp(team.whatsapp)}
                  className="w-full bg-emerald-600 hover:bg-emerald-500 text-white mt-1 py-1.5 text-[10px] md:text-xs px-2 disabled:bg-slate-800 disabled:text-slate-500"
                  disabled={!team.whatsapp || !hasPendingMatch(team.id)}
                >
                  <MessageCircle size={14} /> Chamar
                </Button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

const CreateTeamManual = ({ onCreate, showToast }) => {
  const [teamName, setTeamName] = useState('');
  const [coachName, setCoachName] = useState('');
  const [shieldData, setShieldData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if(!teamName) return;
    setIsLoading(true);

    await onCreate({ 
      id: `t${Date.now()}`, 
      name: teamName, 
      coach: coachName || 'Técnico Manual', 
      whatsapp: '', 
      ownerId: 'npc_manual', 
      shield: shieldData || '🛡️' 
    });

    showToast("Time criado e pronto para jogar!", "success");
    setTeamName(''); setCoachName(''); setShieldData(null);
    setIsLoading(false);
  };

  return (
    <div className="max-w-2xl mx-auto animate-in fade-in pb-12">
      <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2"><UserPlus className="text-emerald-500"/> Criar Time Simples (S/ Acesso)</h2>
      <div className="bg-slate-800/50 border border-slate-700 p-4 rounded-xl mb-6 text-sm text-slate-300">
        <p className="font-bold flex items-center gap-2 text-white"><Activity size={16} className="text-emerald-400"/> Modo Rápido & Bots</p>
        <p className="mt-1">Crie times rapidamente para preencher competições ou realizar testes. Esses times não têm um WhatsApp atrelado e ninguém fará login com eles.</p>
      </div>
      
      <form onSubmit={handleSubmit} className="bg-slate-900 p-6 md:p-8 rounded-2xl border border-slate-800 space-y-5">
        <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
          <label className="block text-sm font-medium text-slate-400 mb-3">Escudo do Time</label>
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-slate-900 rounded-xl border border-slate-700 flex items-center justify-center overflow-hidden shrink-0">
              <ShieldDisplay shield={shieldData} size="large" />
            </div>
            <div className="flex-1">
              <label className="cursor-pointer bg-slate-800 hover:bg-emerald-600 text-white transition-colors px-4 py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-2 max-w-[220px]">
                <UploadCloud size={18} />
                {shieldData ? 'Trocar Escudo' : 'Enviar Imagem'}
                <input type="file" accept="image/*" className="hidden" onChange={(e) => processImage(e.target.files[0], setShieldData)} />
              </label>
              <p className="text-xs text-slate-500 mt-2">Dica: Envie imagens em .PNG para manter o fundo transparente.</p>
            </div>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-400 mb-1">Nome do Time <span className="text-red-400">*</span></label>
          <input type="text" placeholder="Ex: Kame FC" value={teamName} onChange={e=>setTeamName(e.target.value)} className="w-full bg-slate-950 border border-slate-700 focus:border-emerald-500 rounded-lg p-3 text-white outline-none transition-colors" required />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-400 mb-1">Nome do Técnico (Opcional)</label>
          <input type="text" placeholder="Ex: Mestre Kame" value={coachName} onChange={e=>setCoachName(e.target.value)} className="w-full bg-slate-950 border border-slate-700 focus:border-emerald-500 rounded-lg p-3 text-white outline-none transition-colors" />
        </div>

        <Button type="submit" disabled={isLoading} className="w-full py-4 text-lg mt-4 shadow-emerald-900/50 shadow-xl flex items-center justify-center gap-2">
          <Save size={20} /> {isLoading ? 'Guardando...' : 'Salvar Time Manual'}
        </Button>
      </form>
    </div>
  );
};

const CreateTeamFull = ({ onCreate, showToast }) => {
  const [coachFirstName, setCoachFirstName] = useState('');
  const [coachLastName, setCoachLastName] = useState('');
  const [teamName, setTeamName] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('member');
  const [shieldData, setShieldData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    if(!teamName || !coachFirstName || !coachLastName || !whatsapp || !email) return;
    setIsLoading(true);

    const cleanWhatsapp = String(whatsapp).replace(/\D/g, '');
    const fullName = `${coachFirstName} ${coachLastName}`;
    
    const isSuccess = await onCreate({ 
      user: {
        id: `pending_${cleanWhatsapp}`,
        name: fullName,
        email: String(email).trim().toLowerCase(),
        role: role,
        whatsapp: cleanWhatsapp,
      },
      team: {
        id: `t${Date.now()}`,
        name: teamName,
        coach: fullName,
        whatsapp: cleanWhatsapp,
        ownerId: `pending_${cleanWhatsapp}`,
        shield: shieldData || '🛡️'
      }
    });

    if (isSuccess) {
      const siteUrl = window.location.origin; 
      const msg = `Fala ${coachFirstName}! Tudo certo? 🐉🥋\n\nO seu time *${teamName}* acaba de ser convocado para o Clã Kame! 🐢🔥\nSeu cargo atual de batalha é: *${ROLE_NAMES[role] || 'Membro Oficial'}*.\n\nPara acessar o seu Quartel General e entrar na arena, clique no link mágico abaixo ☁️👇\n\n🔗 *Link de Acesso:* ${siteUrl}\n\n⚠️ *ATENÇÃO - PRIMEIRO ACESSO:* ⚠️\nNa tela inicial, clique em "Realizar Primeiro Acesso", preencha o seu E-mail (*${email}*) e crie sua senha! 🔐\n\nEleva o teu Ki e vamos pro jogo! ⚡🎮`;
      
      const waUrl = `https://wa.me/${cleanWhatsapp}?text=${encodeURIComponent(msg)}`;
      window.open(waUrl, '_blank');

      setCoachFirstName(''); setCoachLastName(''); setTeamName(''); setWhatsapp(''); setEmail(''); setRole('member'); setShieldData(null);
    }
    setIsLoading(false);
  };

  return (
    <div className="max-w-2xl mx-auto animate-in fade-in pb-12">
      <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2"><Users className="text-emerald-500"/> Convidar Técnico (Com Acesso)</h2>
      <div className="bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-xl mb-6 text-sm text-emerald-400">
        <p className="font-bold flex items-center gap-2"><Activity size={16}/> Registo Invisível + WhatsApp</p>
        <p className="mt-1">Use este painel para convidar técnicos reais. O sistema vai preparar a conta, criar o time dele e gerar a mensagem automática no WhatsApp!</p>
      </div>
      
      <form onSubmit={handleSubmit} className="bg-slate-900 p-6 md:p-8 rounded-2xl border border-slate-800 space-y-5">
        <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
          <label className="block text-sm font-medium text-slate-400 mb-3">Escudo do Time</label>
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-slate-900 rounded-xl border border-slate-700 flex items-center justify-center overflow-hidden shrink-0">
              <ShieldDisplay shield={shieldData} size="large" />
            </div>
            <div className="flex-1">
              <label className="cursor-pointer bg-slate-800 hover:bg-emerald-600 text-white transition-colors px-4 py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-2 max-w-[220px]">
                <UploadCloud size={18} />
                {shieldData ? 'Trocar Escudo' : 'Enviar Imagem'}
                <input type="file" accept="image/*" className="hidden" onChange={(e) => processImage(e.target.files[0], setShieldData)} />
              </label>
              <p className="text-xs text-slate-500 mt-2">Dica: Envie imagens em .PNG para manter o fundo transparente.</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div><label className="block text-sm font-medium text-slate-400 mb-1">Nome do Técnico</label><input type="text" placeholder="Ex: Mestre" value={coachFirstName} onChange={e=>setCoachFirstName(e.target.value)} className="w-full bg-slate-950 border border-slate-700 focus:border-emerald-500 rounded-lg p-3 text-white outline-none transition-colors" required /></div>
          <div><label className="block text-sm font-medium text-slate-400 mb-1">Sobrenome</label><input type="text" placeholder="Ex: Kame" value={coachLastName} onChange={e=>setCoachLastName(e.target.value)} className="w-full bg-slate-950 border border-slate-700 focus:border-emerald-500 rounded-lg p-3 text-white outline-none transition-colors" required /></div>
        </div>
        <div><label className="block text-sm font-medium text-slate-400 mb-1">Nome do Time</label><input type="text" placeholder="Ex: Kame FC" value={teamName} onChange={e=>setTeamName(e.target.value)} className="w-full bg-slate-950 border border-slate-700 focus:border-emerald-500 rounded-lg p-3 text-white outline-none transition-colors" required /></div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div><label className="block text-sm font-medium text-slate-400 mb-1">WhatsApp (com DDD)</label><input type="tel" placeholder="Ex: 11999999999" value={whatsapp} onChange={e=>setWhatsapp(e.target.value)} className="w-full bg-slate-950 border border-slate-700 focus:border-emerald-500 rounded-lg p-3 text-white outline-none transition-colors font-mono" required /></div>
          <div><label className="block text-sm font-medium text-slate-400 mb-1">E-mail do Técnico</label><input type="email" placeholder="mestrekame@email.com" value={email} onChange={e=>setEmail(e.target.value)} className="w-full bg-slate-950 border border-slate-700 focus:border-emerald-500 rounded-lg p-3 text-white outline-none transition-colors" required /></div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-400 mb-1">Cargo no Clã</label>
          <select value={role} onChange={e=>setRole(e.target.value)} className="w-full bg-slate-950 border border-slate-700 focus:border-emerald-500 rounded-lg p-3 text-white outline-none cursor-pointer">
            <option value="member">Membro Oficial (Padrão)</option>
            <option value="kaioh">Senhor Kaioh (Sub-Líder)</option>
            <option value="leader">Líder Supremo</option>
          </select>
        </div>

        <Button type="submit" disabled={isLoading} className="w-full py-4 text-lg mt-4 shadow-emerald-900/50 shadow-xl flex items-center justify-center gap-2">
          <Send size={20} /> {isLoading ? 'Guardando...' : 'Salvar e Enviar Link'}
        </Button>
      </form>
    </div>
  );
};

const CreateCompetition = ({ teams, onCreate, showToast }) => {
  const [creationMode, setCreationMode] = useState('auto'); // 'auto' | 'manual'
  const [name, setName] = useState('');
  const [format, setFormat] = useState('league');
  const [deadline, setDeadline] = useState('');
  const [selectedTeams, setSelectedTeams] = useState([]);
  const [error, setError] = useState('');
  
  // Guardará as rodadas do sorteio para revisão antes do envio final
  const [draftRounds, setDraftRounds] = useState(null);

  const toggleTeam = (teamId) => {
    if (selectedTeams.includes(teamId)) {
      setSelectedTeams(selectedTeams.filter(id => id !== teamId));
    } else {
      setSelectedTeams([...selectedTeams, teamId]);
    }
  };

  const handleGenerateDraft = () => {
    if (!name || !format || !deadline) {
      setError('Por favor, preencha todos os campos do formulário.');
      return;
    }
    
    if (selectedTeams.length < 2) {
      setError('Atenção: Selecione pelo menos 2 times para gerar a competição.');
      return;
    }

    setError('');
    
    // Gera o sorteio em memória usando um ID temporário
    const tempCompId = `c${Date.now()}`;
    let generatedRounds = [];

    if (format === 'cup') {
      generatedRounds = generateCupBracket(selectedTeams, tempCompId);
    } else {
      generatedRounds = generateRoundRobin(selectedTeams, tempCompId);
    }

    setDraftRounds(generatedRounds);
  };

  // Funções de manipulação do Draft (Edição Manual)
  const handleDraftMatchChange = (roundIndex, matchIndex, field, value) => {
    const newRounds = [...draftRounds];
    newRounds[roundIndex].matches[matchIndex][field] = value;
    setDraftRounds(newRounds);
  };

  const handleRemoveDraftMatch = (roundIndex, matchIndex) => {
    const newRounds = [...draftRounds];
    newRounds[roundIndex].matches.splice(matchIndex, 1);
    setDraftRounds(newRounds);
  };

  const handleAddDraftMatch = (roundIndex) => {
    const newRounds = [...draftRounds];
    newRounds[roundIndex].matches.push({ teamA: '', teamB: '' });
    setDraftRounds(newRounds);
  };

  const handleAddDraftRound = () => {
    setDraftRounds(prev => [
      ...prev,
      { id: `r${prev.length + 1}`, number: prev.length + 1, status: 'locked', matches: [] }
    ]);
  };

  const handleRemoveDraftRound = (roundIndex) => {
    const newRounds = [...draftRounds];
    newRounds.splice(roundIndex, 1);
    // Renumera apenas os IDs das rodadas para manter a ordem estrutural (preservando o label 'number' se for Copa)
    newRounds.forEach((r, idx) => r.id = `r${idx + 1}`);
    setDraftRounds(newRounds);
  };

  const handleFinalSubmit = () => {
    let hasMatches = false;
    let isValidMatches = true;
    const allParticipatingTeams = new Set();

    draftRounds.forEach((r, rIndex) => {
      if (r.matches.length > 0) hasMatches = true;
      r.matches.forEach(m => {
        const isFutureCupRound = format === 'cup' && rIndex > 0;
        
        if (!isFutureCupRound && !m.teamA && !m.teamB) isValidMatches = false; // Duas vagas vazias é inválido apenas na 1ª fase
        if (m.teamA === m.teamB && m.teamA !== '') isValidMatches = false; // Jogando contra si mesmo
        
        if (m.teamA) allParticipatingTeams.add(m.teamA);
        if (m.teamB) allParticipatingTeams.add(m.teamB);
      });
    });

    if (!hasMatches) {
      setError('A competição precisa ter pelo menos uma partida nas rodadas.');
      return;
    }
    if (!isValidMatches) {
      setError('Existem partidas inválidas (times jogando contra si mesmos ou vagas vazias indevidas na 1ª rodada).');
      return;
    }

    setError('');
    
    // Prepara os dados finais
    const finalTeams = Array.from(allParticipatingTeams);
    const finalCompId = `c${Date.now()}`;
    let matchCounter = 1;
    
    // Regera os IDs das partidas oficiais de acordo com as alterações manuais do Líder
    const finalRounds = draftRounds.map((r, rIndex) => ({
      id: `r${rIndex + 1}`,
      number: r.number || rIndex + 1,
      status: rIndex === 0 ? 'released' : 'locked',
      matches: r.matches.map(m => {
        const matchId = `${finalCompId}_m${matchCounter}_r${rIndex + 1}`;
        matchCounter++;
        return {
          id: matchId,
          teamA: m.teamA,
          teamB: m.teamB,
          status: 'pending_play'
        };
      })
    }));

    onCreate({ 
      id: finalCompId, 
      name, 
      format, 
      teamCount: finalTeams.length,
      deadline, 
      status: 'active', 
      teams: finalTeams, 
      rounds: finalRounds
    });
    
    showToast("Competição validada e lançada com sucesso!", "success");
    
    // Limpa a tela
    setName(''); setDeadline(''); setSelectedTeams([]); setDraftRounds(null);
  };

  return (
    <div className="max-w-3xl mx-auto animate-in fade-in pb-12">
      <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
        <PlusCircle className="text-emerald-500"/> Nova Competição
      </h2>
      
      <div className="bg-slate-900 p-6 md:p-8 rounded-2xl border border-slate-800 space-y-6 shadow-xl">
        
        {error && (
          <div className="bg-amber-500/10 border border-amber-500/50 text-amber-400 p-4 rounded-xl flex items-center gap-3">
            <AlertCircle size={20} />
            <p className="text-sm font-medium">{error}</p>
          </div>
        )}

        {!draftRounds ? (
          // --- FASE 1: CONFIGURAÇÃO INICIAL ---
          <div className="animate-in fade-in space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-400">Nome do Campeonato</label>
                <input type="text" placeholder="Ex: Liga de Inverno" value={name} onChange={e=>setName(e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-white focus:ring-2 focus:ring-emerald-500 outline-none" required />
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-400">Formato</label>
                <select value={format} onChange={e=>setFormat(e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-white focus:ring-2 focus:ring-emerald-500 outline-none">
                  <option value="league">Pontos Corridos (Liga)</option>
                  <option value="cup">Mata-Mata (Copa)</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-400">Qtd. de Times Selecionada</label>
                <input type="number" readOnly value={selectedTeams.length} className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-emerald-400 font-bold cursor-not-allowed outline-none transition-colors" />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-400">Prazo de Conclusão (Opcional)</label>
                <input type="date" value={deadline} onChange={e=>setDeadline(e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-slate-300 focus:ring-2 focus:ring-emerald-500 outline-none" />
              </div>
            </div>

            <div className="pt-4 border-t border-slate-800">
              <div className="flex justify-between items-end mb-4">
                <label className="text-sm font-medium text-slate-400">Selecione as Equipes Participantes</label>
                <span className={`text-xs px-2 py-1 rounded font-bold ${selectedTeams.length >= 2 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'}`}>{selectedTeams.length} Marcadas</span>
              </div>
              {(!teams || teams.length === 0) ? (
                <p className="text-slate-500 text-sm p-4 bg-slate-950 rounded border border-slate-800">Nenhum time cadastrado no clã ainda.</p>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 max-h-64 overflow-y-auto pr-2">
                  {teams.map(team => {
                    const isSelected = selectedTeams.includes(team.id);
                    return (
                      <div 
                        key={team.id} 
                        onClick={() => toggleTeam(team.id)}
                        className={`cursor-pointer flex items-center gap-3 p-3 rounded-xl border transition-all ${isSelected ? 'bg-emerald-500/10 border-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.1)]' : 'bg-slate-950 border-slate-800 hover:border-slate-600'}`}
                      >
                        <div className="shrink-0"><ShieldDisplay shield={team.shield} size="small" /></div>
                        <span className={`font-medium text-xs md:text-sm truncate ${isSelected ? 'text-emerald-400' : 'text-slate-300'}`}>{String(team.name)}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <Button type="button" onClick={handleGenerateDraft} className="w-full py-4 text-lg mt-4 shadow-emerald-900/50 shadow-xl">
               <Activity size={20} /> Sortear e Revisar Confrontos
            </Button>
          </div>
        ) : (
          // --- FASE 2: REVISÃO E EDIÇÃO MANUAL (DRAFT) ---
          <div className="animate-in slide-in-from-right-4 space-y-6">
            
            <div className="bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-xl flex justify-between items-center text-emerald-400">
               <div>
                 <p className="font-bold text-lg text-white mb-1">{name}</p>
                 <p className="text-sm font-medium">{format === 'league' ? 'Liga' : 'Mata-Mata'} • {selectedTeams.length} Times {deadline && `• Prazo: ${new Date(deadline).toLocaleDateString('pt-BR', {timeZone: 'UTC'})}`}</p>
               </div>
               <Trophy size={32} className="opacity-50 hidden md:block" />
            </div>

            <div className="flex justify-between items-center pt-2">
              <label className="text-sm font-medium text-slate-400">Tabela de Confrontos (Fique à vontade para ajustar)</label>
            </div>
            
            <div className="space-y-4">
              {draftRounds.map((round, rIndex) => (
                <div key={rIndex} className="bg-slate-950 rounded-xl border border-slate-800 overflow-hidden">
                  <div className="p-3 bg-slate-900 border-b border-slate-800 flex justify-between items-center">
                    <span className="font-bold text-slate-300 text-sm flex items-center gap-2">
                      <span className="bg-slate-800 px-2 py-1 rounded text-xs text-amber-400 font-mono">{rIndex + 1}</span>
                      Rodada {round.number}
                    </span>
                    <button type="button" onClick={() => handleRemoveDraftRound(rIndex)} className="text-slate-500 hover:text-red-400 transition-colors p-1" title="Excluir Rodada">
                      <Trash2 size={16}/>
                    </button>
                  </div>
                  
                  <div className="p-4 space-y-3">
                    {round.matches.map((match, mIndex) => (
                      <div key={mIndex} className="flex flex-col md:flex-row items-center gap-2 w-full">
                        <select value={match.teamA} onChange={e => handleDraftMatchChange(rIndex, mIndex, 'teamA', e.target.value)} className="w-full md:flex-1 bg-slate-900 border border-slate-700 rounded-lg p-2 text-white text-sm md:text-xs outline-none focus:border-emerald-500">
                          <option value="">Nenhum (Vaga Vazia / Bye)</option>
                          {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                        </select>
                        
                        <span className="text-xs text-slate-500 font-bold hidden md:block">X</span>
                        
                        <select value={match.teamB} onChange={e => handleDraftMatchChange(rIndex, mIndex, 'teamB', e.target.value)} className="w-full md:flex-1 bg-slate-900 border border-slate-700 rounded-lg p-2 text-white text-sm md:text-xs outline-none focus:border-emerald-500">
                          <option value="">Nenhum (Vaga Vazia / Bye)</option>
                          {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                        </select>
                        
                        <button type="button" onClick={() => handleRemoveDraftMatch(rIndex, mIndex)} className="text-slate-600 hover:text-red-400 p-2 md:p-1 bg-slate-900 md:bg-transparent w-full md:w-auto text-center rounded border border-slate-700 md:border-none" title="Remover Partida">
                          <X size={16} className="mx-auto" />
                        </button>
                      </div>
                    ))}
                    
                    <button type="button" onClick={() => handleAddDraftMatch(rIndex)} className="text-xs bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500 hover:text-white px-3 py-2 md:py-1.5 rounded-lg font-medium flex items-center justify-center gap-1 mt-2 transition-colors w-full md:w-auto">
                      <PlusCircle size={14}/> Nova Partida
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <Button type="button" variant="outline" onClick={handleAddDraftRound} className="w-full py-3 border-dashed border-slate-700 hover:border-slate-500 text-slate-400">
              <PlusCircle size={16}/> Adicionar Rodada
            </Button>

            <div className="flex flex-col-reverse md:flex-row gap-3 md:gap-4 mt-8 pt-6 border-t border-slate-800">
              <Button type="button" variant="outline" onClick={() => setDraftRounds(null)} className="flex-1 py-4 text-slate-400 hover:text-white border-slate-700">
                 Voltar e Refazer
              </Button>
              <Button type="button" onClick={handleFinalSubmit} className="flex-[2] py-4 text-lg bg-emerald-600 hover:bg-emerald-500 shadow-emerald-900/50 shadow-xl">
                 Lançar Competição Oficial
              </Button>
            </div>
            
          </div>
        )}
      </div>
    </div>
  );
};

const CompetitionsList = ({ competitions, teams, currentUser, onSelectComp, onEditComp, onDeleteComp }) => {
  const [editingId, setEditingId] = useState(null);
  const [editData, setEditData] = useState({ name: '', format: 'league', deadline: '', teams: [] });
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);

  const isAdmin = currentUser?.role === 'leader' || currentUser?.role === 'kaioh';
  const userTeamIds = (teams || []).filter(t => t.ownerId === currentUser?.id).map(t => t.id);
  const visibleComps = (competitions || []).filter(c => isAdmin || (c.teams || []).some(t => userTeamIds.includes(t)));

  const startEdit = (comp, e) => {
    e.stopPropagation();
    setEditingId(comp.id);
    setEditData({ name: comp.name || '', format: comp.format || 'league', deadline: comp.deadline || '', teams: comp.teams || [] });
  };

  const toggleEditTeam = (teamId) => {
    setEditData(prev => ({
      ...prev,
      teams: prev.teams.includes(teamId)
        ? prev.teams.filter(id => id !== teamId)
        : [...prev.teams, teamId]
    }));
  };

  const saveEdit = async (comp, e) => {
    e.stopPropagation();
    if (editData.name) {
      let newRounds = comp.rounds || [];
      
      const currentTeams = comp.teams || [];
      const teamsChanged = editData.teams.length !== currentTeams.length || editData.teams.some(t => !currentTeams.includes(t));
      
      if (teamsChanged) {
        newRounds = editData.format === 'cup' ? generateCupBracket(editData.teams, comp.id) : generateRoundRobin(editData.teams, comp.id);
      }

      await onEditComp({ 
        ...comp, 
        ...editData,
        teamCount: editData.teams.length,
        rounds: newRounds
      });
      setEditingId(null);
    }
  };

  return (
    <div className="animate-in fade-in duration-500">
      <div className="flex items-center gap-3 mb-6"><Medal className="text-emerald-500" size={28} /><h2 className="text-2xl font-bold text-white">Competições</h2></div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {visibleComps.length === 0 && <p className="text-slate-500 col-span-2">Nenhuma competição ativa.</p>}
        {visibleComps.map(comp => {
          const isPart = (comp.teams || []).some(t => userTeamIds.includes(t));
          if (editingId === comp.id) {
            return (
              <div key={comp.id} className="bg-slate-900 p-6 rounded-2xl border border-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.1)] flex flex-col gap-4 relative z-10" onClick={e => e.stopPropagation()}>
                <div className="space-y-3 w-full">
                  <div>
                    <label className="text-xs text-slate-400">Nome da Competição</label>
                    <input type="text" value={editData.name} onChange={e=>setEditData({...editData, name: e.target.value})} className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white text-sm outline-none focus:border-amber-500 mt-1" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-slate-400">Formato</label>
                      <select value={editData.format} onChange={e=>setEditData({...editData, format: e.target.value})} className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white text-sm" >
                        <option value="league">Liga</option>
                        <option value="cup">Copa</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-slate-400">Prazo Final</label>
                      <input type="date" value={editData.deadline} onChange={e=>setEditData({...editData, deadline: e.target.value})} className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-slate-300 text-sm" />
                    </div>
                  </div>
                  <div className="pt-3 border-t border-slate-800">
                    <div className="flex justify-between items-center mb-2">
                      <label className="text-xs text-slate-400 font-bold">Equipas ({editData.teams.length})</label>
                    </div>
                    <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto pr-1">
                      {(teams || []).map(t => {
                        const isSelected = editData.teams.includes(t.id);
                        return (
                          <div key={t.id} onClick={() => toggleEditTeam(t.id)} className={`cursor-pointer flex items-center gap-2 p-2 rounded-lg border transition-all ${isSelected ? 'bg-emerald-500/10 border-emerald-500' : 'bg-slate-950 border-slate-800 hover:border-slate-700'}`}>
                            <ShieldDisplay shield={t.shield} size="small" />
                            <span className={`font-medium text-[10px] truncate ${isSelected ? 'text-emerald-400' : 'text-slate-300'}`}>{String(t.name)}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
                <div className="flex gap-2 mt-2">
                  <Button variant="outline" onClick={(e) => { e.stopPropagation(); setEditingId(null); }} className="flex-1 py-2 text-slate-400"><X size={16}/> Cancelar</Button>
                  <Button onClick={(e) => saveEdit(comp, e)} className="flex-1 py-2 bg-amber-600 hover:bg-amber-500 shadow-amber-900/50"><Save size={16}/> Guardar</Button>
                </div>
              </div>
            );
          }

          return (
            <div key={comp.id} onClick={() => onSelectComp(comp.id)} className={`relative cursor-pointer bg-slate-900 p-6 rounded-2xl border transition-all hover:scale-[1.02] group ${isAdmin && isPart ? 'border-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.15)]' : isPart ? 'border-emerald-500/50 shadow-[0_0_15px_rgba(16,185,129,0.1)]' : 'border-slate-800 hover:border-slate-700'}`}>
              {isAdmin && (
                <div className="absolute top-3 right-3 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all bg-slate-900/90 backdrop-blur-sm p-1 rounded-lg border border-slate-700/50 shadow-xl" onClick={e => e.stopPropagation()}>
                  {deleteConfirmId === comp.id ? (
                    <div className="flex items-center gap-1 px-1">
                      <button onClick={(e) => { e.stopPropagation(); onDeleteComp(comp.id); setDeleteConfirmId(null); }} className="bg-red-600 hover:bg-red-500 text-white px-2 py-1 rounded text-xs font-bold transition-colors">Excluir</button>
                      <button onClick={(e) => { e.stopPropagation(); setDeleteConfirmId(null); }} className="bg-slate-700 hover:bg-slate-600 text-white px-2 py-1 rounded text-xs transition-colors">Cancelar</button>
                    </div>
                  ) : (
                    <>
                      <button onClick={(e) => startEdit(comp, e)} className="text-slate-400 hover:text-amber-400 p-1.5 transition-colors" title="Editar Competição"><Edit size={16} /></button>
                      <button onClick={(e) => { e.stopPropagation(); setDeleteConfirmId(comp.id); }} className="text-slate-400 hover:text-red-400 p-1.5 transition-colors" title="Remover Competição"><Trash2 size={16} /></button>
                    </>
                  )}
                </div>
              )}
              <div className="flex justify-between items-start mb-2 pr-16"><h3 className="text-xl font-bold text-white">{String(comp.name)}</h3>{isPart && <span className={`text-xs px-2 py-1 rounded-md font-bold ${isAdmin ? 'bg-amber-500/20 text-amber-400' : 'bg-emerald-500/20 text-emerald-400'}`}>Participa</span>}</div>
              <p className="text-sm text-slate-400 mb-4">{comp.format === 'league' ? 'Liga' : 'Copa'} • {String(comp.teams?.length || 0)} equipas {comp.deadline ? `• Prazo: ${new Date(comp.deadline).toLocaleDateString('pt-BR', {timeZone: 'UTC'})}` : ''}</p>
              <div className="text-xs text-slate-500 flex justify-between items-center"><span>Ver Tabela ➔</span></div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const CompetitionDetails = ({ comp, teams, matches, onBack, currentUser, onReleaseRound, onSelectMatch, onDeleteMatch }) => {
  const [subTab, setSubTab] = useState('overview'); // 'overview' | 'scorers' | 'assists'
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const getTeam = (id) => (teams || []).find(t => t.id === id);
  const isAdmin = currentUser?.role === 'leader' || currentUser?.role === 'kaioh';
  
  const getMatchStatusDisplay = (matchId) => {
    const matchSubmissions = (matches || []).filter(m => m.matchId === matchId && m.compId === comp?.id && m.status !== 'rejected');
    
    if (matchSubmissions.length === 0) {
      return { isPlayed: false, text: 'Aguardando', color: 'text-slate-500', bg: 'bg-slate-900 border-slate-800' };
    }

    matchSubmissions.sort((a, b) => {
      const timeA = parseInt(String(a.id).split('_')[1] || '0');
      const timeB = parseInt(String(b.id).split('_')[1] || '0');
      return timeB - timeA;
    });

    const submittedMatch = matchSubmissions.find(m => m.status === 'approved') || matchSubmissions.find(m => m.status === 'pending');

    if (!submittedMatch) {
      return { isPlayed: false, text: 'Aguardando', color: 'text-slate-500', bg: 'bg-slate-900 border-slate-800' };
    }

    if (submittedMatch.status === 'approved') return { submittedMatchId: submittedMatch.id, isPlayed: true, scoreA: submittedMatch.scoreA, scoreB: submittedMatch.scoreB, penaltiesA: submittedMatch.penaltiesA, penaltiesB: submittedMatch.penaltiesB, text: 'Oficial', color: 'text-emerald-400', bg: 'bg-slate-950 border-emerald-900/50' };
    if (submittedMatch.status === 'pending') return { submittedMatchId: submittedMatch.id, isPlayed: true, scoreA: submittedMatch.scoreA, scoreB: submittedMatch.scoreB, penaltiesA: submittedMatch.penaltiesA, penaltiesB: submittedMatch.penaltiesB, text: 'Em Validação', color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20' };
    
    return { isPlayed: false, text: 'Desconhecido', color: 'text-slate-500', bg: 'bg-slate-900 border-slate-800' };
  };

  const topScorers = useMemo(() => {
    const scorersMap = {};
    (matches || []).filter(m => m.compId === comp?.id && m.status === 'approved').forEach(match => {
      (match.goals || []).forEach(goal => {
        if (!goal.player || goal.player.trim() === '') return;
        const key = `${goal.player.toLowerCase().trim()}-${goal.teamId}`;
        if (!scorersMap[key]) {
          scorersMap[key] = { player: goal.player.trim(), teamId: goal.teamId, count: 0 };
        }
        scorersMap[key].count += 1;
      });
    });
    return Object.values(scorersMap).sort((a, b) => b.count - a.count);
  }, [matches, comp?.id]);

  const topAssists = useMemo(() => {
    const assistsMap = {};
    (matches || []).filter(m => m.compId === comp?.id && m.status === 'approved').forEach(match => {
      (match.goals || []).forEach(goal => {
        if (!goal.assist || goal.assist.trim() === '') return;
        const key = `${goal.assist.toLowerCase().trim()}-${goal.teamId}`;
        if (!assistsMap[key]) {
          assistsMap[key] = { player: goal.assist.trim(), teamId: goal.teamId, count: 0 };
        }
        assistsMap[key].count += 1;
      });
    });
    return Object.values(assistsMap).sort((a, b) => b.count - a.count);
  }, [matches, comp?.id]);

  if (!comp) return null;

  return (
    <div className="animate-in fade-in duration-500 space-y-6">
      <button onClick={onBack} className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors mb-4"><ArrowLeft size={20} /> Voltar para Competições</button>
      <div className="bg-gradient-to-r from-emerald-900/40 to-slate-900 p-6 rounded-2xl border border-emerald-900/50 flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold text-white mb-2">{String(comp.name)}</h2>
          <p className="text-emerald-400 flex items-center gap-2">
            <Trophy size={16}/> {comp.format === 'league' ? 'Pontos Corridos' : 'Mata-Mata'}
          </p>
        </div>
        <span className="bg-emerald-500/20 text-emerald-400 px-3 py-1 rounded-full text-sm font-medium">Em Andamento</span>
      </div>

      <div className="flex flex-col md:flex-row p-1 bg-slate-950 rounded-xl mb-6 border border-slate-800 gap-1">
        <button onClick={() => setSubTab('overview')} className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${subTab === 'overview' ? 'bg-emerald-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}>Classificação & Jogos</button>
        <button onClick={() => setSubTab('scorers')} className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${subTab === 'scorers' ? 'bg-amber-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}>Artilharia ⚽</button>
        <button onClick={() => setSubTab('assists')} className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${subTab === 'assists' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}>Assistências 👟</button>
      </div>

      {subTab === 'overview' && (
        <div className="space-y-8 animate-in fade-in">
          <Standings matches={matches} teams={(teams || []).filter(t => (comp.teams || []).includes(t.id))} compId={comp.id} compName={comp.name} />

          <div>
            <h3 className="text-xl font-bold text-white mb-4">Rodadas</h3>
            {(comp.rounds && comp.rounds.length > 0) ? (
              <div className="space-y-6">
                {comp.rounds.map((round) => (
                  <div key={round.id} className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden">
                    <div className="bg-slate-950/50 p-4 border-b border-slate-800 flex justify-between items-center"><h4 className="font-bold text-white flex items-center gap-2">{round.status === 'locked' ? <Lock size={16} className="text-slate-500"/> : <PlayCircle size={16} className="text-emerald-500"/>} Rodada {String(round.number)}</h4>{round.status === 'locked' ? (isAdmin ? <Button variant="outline" className="text-xs py-1 border-emerald-500/50 text-emerald-400 hover:bg-emerald-500/10" onClick={() => onReleaseRound(comp.id, round.id)}>Liberar Rodada</Button> : <span className="text-xs bg-slate-800 text-slate-400 px-2 py-1 rounded-full">Bloqueada</span>) : <span className="text-xs bg-emerald-500/20 text-emerald-400 px-2 py-1 rounded-full">Liberada</span>}</div>
                    <div className="p-4 grid gap-3">
                      {(round.matches || []).map(match => { 
                        const tA = getTeam(match.teamA); 
                        const tB = getTeam(match.teamB); 
                        const statusUI = getMatchStatusDisplay(match.id); 
                        return (
                          <div 
                            key={match.id} 
                            onClick={() => {
                              if (statusUI.isPlayed && onSelectMatch) {
                                const matchSubmissions = (matches || []).filter(m => m.matchId === match.id && m.compId === comp.id && m.status !== 'rejected');
                                matchSubmissions.sort((a, b) => parseInt(String(b.id).split('_')[1] || '0') - parseInt(String(a.id).split('_')[1] || '0'));
                                const submittedMatch = matchSubmissions.find(m => m.status === 'approved') || matchSubmissions.find(m => m.status === 'pending');
                                if (submittedMatch) onSelectMatch(submittedMatch);
                              }
                            }}
                            className={`bg-slate-950 p-3 rounded-xl border border-slate-800/50 flex flex-col gap-2 relative ${statusUI.isPlayed ? 'cursor-pointer hover:border-emerald-500/50 hover:shadow-lg transition-all group' : ''}`}
                          >
                            {isAdmin && statusUI.isPlayed && statusUI.submittedMatchId && (
                              <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all bg-slate-900/90 backdrop-blur-sm p-1 rounded-lg border border-slate-700/50 z-10" onClick={e => e.stopPropagation()}>
                                {deleteConfirmId === statusUI.submittedMatchId ? (
                                  <div className="flex items-center gap-1 px-1">
                                    <button onClick={(e) => { e.stopPropagation(); onDeleteMatch(statusUI.submittedMatchId); setDeleteConfirmId(null); }} className="bg-red-600 hover:bg-red-500 text-white px-2 py-1 rounded text-xs font-bold transition-colors">Excluir</button>
                                    <button onClick={(e) => { e.stopPropagation(); setDeleteConfirmId(null); }} className="bg-slate-700 hover:bg-slate-600 text-white px-2 py-1 rounded text-xs transition-colors">Cancelar</button>
                                  </div>
                                ) : (
                                  <button onClick={(e) => { e.stopPropagation(); setDeleteConfirmId(statusUI.submittedMatchId); }} className="text-slate-400 hover:text-red-400 p-1.5 transition-colors" title="Excluir Resultado permanentemente">
                                    <Trash2 size={14} />
                                  </button>
                                )}
                              </div>
                            )}
                            <div className="flex items-center justify-between w-full gap-1.5">
                              <div className="flex items-center gap-1.5 flex-1 min-w-0 justify-start">
                                <div className="shrink-0"><ShieldDisplay shield={tA?.shield} size="small" /></div>
                                <span className="font-medium text-[11px] md:text-sm text-slate-200 truncate group-hover:text-emerald-400 transition-colors">{String(tA?.name || 'Time A')}</span>
                              </div>
                              
                              <div className={`flex items-center justify-center gap-1 md:gap-2 px-2 py-1 md:px-3 rounded-lg border shrink-0 transition-colors ${statusUI.isPlayed ? 'group-hover:border-emerald-500/50' : ''} ${statusUI.bg}`}>
                                {statusUI.penaltiesA !== null && statusUI.penaltiesA !== undefined && (
                                  <span className="text-[10px] text-amber-400 font-bold mr-1">({statusUI.penaltiesA})</span>
                                )}
                                <span className={`font-bold text-sm md:text-base ${statusUI.color}`}>{statusUI.isPlayed ? String(statusUI.scoreA) : '-'}</span>
                                <span className="text-[10px] md:text-xs text-slate-500 font-bold mx-0.5">X</span>
                                <span className={`font-bold text-sm md:text-base ${statusUI.color}`}>{statusUI.isPlayed ? String(statusUI.scoreB) : '-'}</span>
                                {statusUI.penaltiesB !== null && statusUI.penaltiesB !== undefined && (
                                  <span className="text-[10px] text-amber-400 font-bold ml-1">({statusUI.penaltiesB})</span>
                                )}
                              </div>

                              <div className="flex items-center gap-1.5 flex-1 min-w-0 justify-end">
                                <span className="font-medium text-[11px] md:text-sm text-slate-200 truncate text-right group-hover:text-emerald-400 transition-colors">{String(tB?.name || 'Time B')}</span>
                                <div className="shrink-0"><ShieldDisplay shield={tB?.shield} size="small" /></div>
                              </div>
                            </div>
                            {statusUI.text !== 'Oficial' && (
                              <div className="flex justify-center mt-1">
                                <span className={`text-[9px] uppercase tracking-wider font-bold ${statusUI.color}`}>{String(statusUI.text)}</span>
                              </div>
                            )}
                            {statusUI.isPlayed && statusUI.text === 'Oficial' && (
                              <div className="flex justify-center mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <span className="text-[9px] uppercase tracking-wider font-bold text-slate-500">Clique para Detalhes</span>
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
      )}

      {subTab === 'scorers' && (
        <div className="animate-in fade-in slide-in-from-right-4">
          <h3 className="text-xl font-bold text-white mb-4">Tabela de Artilharia</h3>
          <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-x-auto shadow-xl">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-slate-950/50 text-slate-400 font-medium border-b border-slate-800">
                <tr>
                  <th className="p-4 w-12 text-center">#</th>
                  <th className="p-4">Jogador</th>
                  <th className="p-4">Time</th>
                  <th className="p-4 text-center">Gols</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {topScorers.length === 0 ? (
                  <tr><td colSpan="4" className="p-4 text-center text-slate-500">Nenhum gol registrado ou aprovado nesta competição.</td></tr>
                ) : (
                  topScorers.map((scorer, index) => {
                    const team = getTeam(scorer.teamId);
                    return (
                      <tr key={index} className="hover:bg-slate-800/50 transition-colors">
                        <td className="p-4 text-center font-bold text-slate-500">
                          {index === 0 ? <span className="text-amber-400 text-lg">🥇</span> : index === 1 ? <span className="text-slate-300 text-lg">🥈</span> : index === 2 ? <span className="text-amber-700 text-lg">🥉</span> : `${index + 1}`}
                        </td>
                        <td className="p-4 font-bold text-white flex items-center gap-2">⚽ {scorer.player}</td>
                        <td className="p-4 text-slate-300">
                          <div className="flex items-center gap-2">
                            <ShieldDisplay shield={team?.shield} size="small" />
                            <span className="truncate max-w-[120px] md:max-w-[200px]">{team?.name || 'Desconhecido'}</span>
                          </div>
                        </td>
                        <td className="p-4 text-center font-black text-emerald-400 text-lg">{scorer.count}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {subTab === 'assists' && (
        <div className="animate-in fade-in slide-in-from-right-4">
          <h3 className="text-xl font-bold text-white mb-4">Líderes de Assistências</h3>
          <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-x-auto shadow-xl">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-slate-950/50 text-slate-400 font-medium border-b border-slate-800">
                <tr>
                  <th className="p-4 w-12 text-center">#</th>
                  <th className="p-4">Jogador</th>
                  <th className="p-4">Time</th>
                  <th className="p-4 text-center">Assistências</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {topAssists.length === 0 ? (
                  <tr><td colSpan="4" className="p-4 text-center text-slate-500">Nenhuma assistência registrada ou aprovada nesta competição.</td></tr>
                ) : (
                  topAssists.map((assist, index) => {
                    const team = getTeam(assist.teamId);
                    return (
                      <tr key={index} className="hover:bg-slate-800/50 transition-colors">
                        <td className="p-4 text-center font-bold text-slate-500">
                          {index === 0 ? <span className="text-amber-400 text-lg">🥇</span> : index === 1 ? <span className="text-slate-300 text-lg">🥈</span> : index === 2 ? <span className="text-amber-700 text-lg">🥉</span> : `${index + 1}`}
                        </td>
                        <td className="p-4 font-bold text-white flex items-center gap-2">👟 {assist.player}</td>
                        <td className="p-4 text-slate-300">
                          <div className="flex items-center gap-2">
                            <ShieldDisplay shield={team?.shield} size="small" />
                            <span className="truncate max-w-[120px] md:max-w-[200px]">{team?.name || 'Desconhecido'}</span>
                          </div>
                        </td>
                        <td className="p-4 text-center font-black text-blue-400 text-lg">{assist.count}</td>
                      </tr>
                    );
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

const MatchDetails = ({ match, teams, competitions, onBack }) => {
  if (!match) return null;
  const getTeam = (id) => (teams || []).find(t => t.id === id);
  const tA = getTeam(match.teamA);
  const tB = getTeam(match.teamB);
  const compName = (competitions || []).find(c => c.id === match.compId)?.name || 'Campeonato';
  const roundNum = String(match.roundId || '').replace('r', '');

  const goals = match.goals || [];

  return (
    <div className="animate-in fade-in duration-500 space-y-6 max-w-2xl mx-auto pb-12">
      <button onClick={onBack} className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors mb-4">
        <ArrowLeft size={20} /> Voltar
      </button>

      <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden shadow-2xl">
        {/* Topo */}
        <div className="bg-slate-950/50 p-4 border-b border-slate-800 flex justify-between items-center">
          <div>
            <span className="text-[10px] uppercase tracking-wider text-emerald-400 font-bold block mb-0.5">Resumo do Jogo</span>
            <h2 className="text-xs md:text-sm font-bold text-slate-300 truncate max-w-[200px] md:max-w-xs">{String(compName)}</h2>
          </div>
          <span className="text-xs bg-slate-800 text-slate-300 px-3 py-1 rounded-full font-bold shrink-0">
            Rodada {String(roundNum)}
          </span>
        </div>

        {/* Placar Principal */}
        <div className="p-6 md:p-8 flex items-center justify-between gap-2 bg-gradient-to-b from-slate-900 to-slate-950">
          <div className="flex-1 flex flex-col items-center text-center gap-2 min-w-0">
            <ShieldDisplay shield={tA?.shield} size="large" />
            <span className="font-bold text-xs md:text-base text-white truncate w-full">{String(tA?.name || 'Equipa A')}</span>
            <span className="text-[10px] text-slate-500 truncate w-full">Técnico: {String(tA?.coach || 'NPC')}</span>
          </div>

          <div className="flex flex-col items-center justify-center shrink-0 bg-slate-950/80 px-4 py-3 md:px-6 md:py-4 rounded-xl border border-slate-800 shadow-inner">
            <div className="flex items-center gap-3 md:gap-5">
              {match.penaltiesA !== null && match.penaltiesA !== undefined && (
                <span className="text-sm md:text-lg font-bold text-amber-500">({match.penaltiesA})</span>
              )}
              <span className="text-3xl md:text-4xl font-black text-emerald-400 tracking-tight">{String(match.scoreA)}</span>
              <span className="text-[10px] font-black text-slate-600">X</span>
              <span className="text-3xl md:text-4xl font-black text-emerald-400 tracking-tight">{String(match.scoreB)}</span>
              {match.penaltiesB !== null && match.penaltiesB !== undefined && (
                <span className="text-sm md:text-lg font-bold text-amber-500">({match.penaltiesB})</span>
              )}
            </div>
            <span className="text-[9px] uppercase font-bold tracking-widest text-emerald-500 mt-2.5 px-2 py-0.5 bg-emerald-500/10 rounded border border-emerald-500/20">
              {match.status === 'approved' ? '✓ Oficializado' : '⏳ Em validação'}
            </span>
          </div>

          <div className="flex-1 flex flex-col items-center text-center gap-2 min-w-0">
            <ShieldDisplay shield={tB?.shield} size="large" />
            <span className="font-bold text-xs md:text-base text-white truncate w-full">{String(tB?.name || 'Equipa B')}</span>
            <span className="text-[10px] text-slate-500 truncate w-full">Técnico: {String(tB?.coach || 'NPC')}</span>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Marcadores de Gols */}
          <div>
            <h3 className="text-[10px] uppercase tracking-wider text-slate-500 font-bold mb-3 flex items-center gap-2">
              <Activity size={14} className="text-emerald-500" /> Linha do Tempo dos Golos
            </h3>
            
            {goals.length === 0 ? (
              <p className="text-xs text-slate-500 italic p-4 bg-slate-950/50 rounded-xl border border-slate-800/40 text-center">Nenhum golo registrado nesta partida.</p>
            ) : (
              <div className="space-y-2 bg-slate-950/40 p-4 rounded-xl border border-slate-800">
                {goals.map((g, idx) => {
                  const isA = g.teamId === match.teamA;
                  return (
                    <div key={idx} className={`flex items-start gap-2.5 text-xs md:text-sm ${isA ? 'flex-row' : 'flex-row-reverse'}`}>
                      <span className="text-base mt-0.5">⚽</span>
                      <div className={`flex flex-col ${isA ? 'items-start' : 'items-end'}`}>
                        <span className="font-bold text-slate-200">{String(g.player)}</span>
                        {g.assist && <span className="text-[10px] text-slate-400 font-medium">👟 {String(g.assist)}</span>}
                        <span className="text-[9px] text-emerald-400 font-semibold mt-0.5">{String(g.minute)}' Minuto</span>
                      </div>
                      <span className="text-[10px] text-slate-600 font-mono mt-1">({isA ? 'Casa' : 'Fora'})</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Relatório / Observações */}
          {match.observacoes && (
            <div>
              <h3 className="text-[10px] uppercase tracking-wider text-slate-500 font-bold mb-3 flex items-center gap-2">
                <MessageCircle size={14} className="text-emerald-500" /> Observações do Técnico
              </h3>
              <div className="bg-slate-950/50 p-4 rounded-xl border border-slate-800 text-xs md:text-sm text-slate-300 italic">
                "{String(match.observacoes)}"
              </div>
            </div>
          )}

          {/* Captura de Tela (Mídia) */}
          <div>
            <h3 className="text-[10px] uppercase tracking-wider text-slate-500 font-bold mb-3 flex items-center gap-2">
              <Camera size={14} className="text-emerald-500" /> Print de Validação
            </h3>
            {match.imageUrl ? (
              <div className="bg-slate-950 p-1.5 rounded-xl border border-slate-800 overflow-hidden relative group">
                <img 
                  src={match.imageUrl} 
                  alt="Print do Jogo" 
                  className="w-full rounded-lg object-contain max-h-[350px] cursor-pointer hover:scale-[1.01] transition-transform duration-200"
                  onClick={() => window.open(match.imageUrl, '_blank')}
                />
                <div className="absolute bottom-3 right-3 bg-slate-900/95 text-slate-300 px-2 py-1 rounded text-[9px] font-semibold backdrop-blur-sm border border-slate-700 pointer-events-none">
                  Clique para ver imagem ampliada 🗖
                </div>
              </div>
            ) : (
              <div className="p-8 bg-slate-950/30 rounded-xl border border-slate-800 border-dashed text-center text-slate-500 text-xs">
                Nenhum print ou imagem comprovativa anexada a este resultado.
              </div>
            )}
          </div>

          {/* Detalhes do Envio */}
          <div className="pt-3 border-t border-slate-800 flex justify-between items-center text-[9px] text-slate-500">
            <span>Enviado por: <strong className="text-slate-400">{String(match.submittedBy)}</strong></span>
            <span>Ref: {String(match.id)}</span>
          </div>
        </div>
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
  const [penaltiesA, setPenaltiesA] = useState('');
  const [penaltiesB, setPenaltiesB] = useState('');

  const [goalsA, setGoalsA] = useState([]); 
  const [goalsB, setGoalsB] = useState([]);
  const [observacoes, setObservacoes] = useState('');
  
  const [matchImageBase64, setMatchImageBase64] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false); 
  const [imageUploaded, setImageUploaded] = useState(false);

  // =========================================================================
  // 🔑 CHAVE DA INTELIGÊNCIA ARTIFICIAL EMBUTIDA (EXCLUSIVO PARA LÍDERES)
  // Substitua o texto "SUA_NOVA_CHAVE_AQUI" pela chave que começa com AIzaSy...
  // =========================================================================
  const GEMINI_API_KEY = AQ.Ab8RN6IjWM0j2jk-DRkhgRJyOdh7Z01J38hwGMBFitm8lT_Cbg; 
  // =========================================================================

  const isAdmin = currentUser?.role === 'leader' || currentUser?.role === 'kaioh';
  
  const userTeamIds = (teams || []).filter(t => t.ownerId === currentUser?.id).map(t => t.id);
  const visibleCompetitions = (competitions || []).filter(c => isAdmin || (c.teams || []).some(tId => userTeamIds.includes(tId)));

  const selectedComp = useMemo(() => (competitions || []).find(c => c.id === selectedCompId), [selectedCompId, competitions]);
  const isCup = selectedComp?.format === 'cup';
  const isTie = scoreA !== '' && scoreB !== '' && scoreA === scoreB;

  useEffect(() => {
    setSelectedMatchId(''); resetMatchData();
    if (!selectedCompId) { setAvailableMatches([]); return; }
    
    if (selectedComp && Array.isArray(selectedComp.rounds)) {
      let toPlay = [];
      selectedComp.rounds.filter(r => r.status === 'released').forEach(round => {
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
    setScoreA(''); setScoreB(''); 
    setPenaltiesA(''); setPenaltiesB('');
    setGoalsA([]); setGoalsB([]); 
    setObservacoes(''); setImageUploaded(false); setMatchImageBase64(null);
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

      const currentKeyToUse = GEMINI_API_KEY.trim();

      if (!currentKeyToUse || currentKeyToUse === "SUA_NOVA_CHAVE_AQUI" || currentKeyToUse.length < 30 || currentKeyToUse.startsWith('AQ.')) {
        showToast("Chave inválida! Você precisa colar sua nova chave AIzaSy... no arquivo App.jsx.", "error");
        return;
      }

      setIsAnalyzing(true);
      setScoreA('0'); setScoreB('0'); setGoalsA([]); setGoalsB([]); setPenaltiesA(''); setPenaltiesB('');

      try {
        const payload = {
          contents: [{ 
            role: "user", 
            parts: [ 
              { text: `
Analise o placar final deste jogo de Dream League Soccer (DLS).
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
}
              `}, 
              { inlineData: { mimeType: base64.match(/data:(.*?);base64/)[1], data: base64.split(',')[1] } } 
            ] 
          }],
          generationConfig: { responseMimeType: "application/json" }
        };

        // Usa o modelo estável padrão
        let url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${encodeURIComponent(currentKeyToUse)}`;
        let response = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });

        if (!response.ok) {
           const errJson = await response.json().catch(() => ({}));
           const errMsg = errJson?.error?.message || "";
           
           // Se der erro 404, tenta o modelo PRO estável
           if (response.status === 404 || errMsg.includes("not found")) {
              url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key=${encodeURIComponent(currentKeyToUse)}`;
              response = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
              
              if (!response.ok) {
                 const fallbackErr = await response.json().catch(() => ({}));
                 throw new Error(fallbackErr?.error?.message || "Erro desconhecido no servidor do Google.");
              }
           } else {
              throw new Error(errMsg || `Falha na requisição. Código: ${response.status}`);
           }
        }

        const resultJson = await response.json();

        if (!resultJson || !resultJson.candidates) throw new Error("A IA processou a imagem mas não retornou nada.");

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

        showToast("Dados extraídos do Print pela IA!", "success");

      } catch (error) {
        console.error("Erro completo da IA:", error);
        showToast(`Erro Google: ${error.message.substring(0, 80)}.`, "error");
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
      showToast("Numa Copa, o jogo não pode terminar empatado. Preencha os Pênaltis!", "error");
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
    showToast("Partida enviada para validação dos Líderes!", "success");
  };

  return (
    <div className="max-w-2xl mx-auto animate-in fade-in duration-500 pb-12">
      <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2"><Camera className="text-emerald-500" /> Registrar Partida</h2>

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

                  <div className="flex flex-col items-center shrink-0">
                    <div className="flex items-center justify-center gap-2">
                      <input type="number" required value={scoreA} onChange={e=>setScoreA(e.target.value)} className="w-12 md:w-16 bg-slate-900 border border-slate-700 text-center font-bold text-xl md:text-2xl text-emerald-400 rounded-lg p-2 outline-none focus:border-emerald-500 transition-colors" />
                      <span className="text-xs text-slate-500 font-bold">X</span>
                      <input type="number" required value={scoreB} onChange={e=>setScoreB(e.target.value)} className="w-12 md:w-16 bg-slate-900 border border-slate-700 text-center font-bold text-xl md:text-2xl text-emerald-400 rounded-lg p-2 outline-none focus:border-emerald-500 transition-colors" />
                    </div>

                    {isCup && isTie && (
                      <div className="flex flex-col items-center mt-4 w-full animate-in fade-in slide-in-from-top-2 bg-slate-900/50 p-2 rounded-lg border border-amber-500/20">
                        <span className="text-[9px] uppercase tracking-widest text-amber-500 font-bold mb-1">Penalidades</span>
                        <div className="flex items-center justify-center gap-1.5">
                          <input type="number" required value={penaltiesA} onChange={e=>setPenaltiesA(e.target.value)} className="w-10 bg-slate-950 border border-amber-500/50 text-center font-bold text-sm text-amber-400 rounded outline-none focus:border-amber-500 transition-colors" />
                          <span className="text-[10px] text-slate-500 font-bold">X</span>
                          <input type="number" required value={penaltiesB} onChange={e=>setPenaltiesB(e.target.value)} className="w-10 bg-slate-950 border border-amber-500/50 text-center font-bold text-sm text-amber-400 rounded outline-none focus:border-amber-500 transition-colors" />
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2 flex-1 min-w-0 justify-end">
                    <span className="font-bold text-sm md:text-base text-white truncate text-right">{teamB?.name}</span>
                    <div className="shrink-0"><ShieldDisplay shield={teamB?.shield} size="normal" /></div>
                  </div>
                </div>

                <div className="flex items-start justify-between w-full gap-4 mt-2">
                  <div className="flex-1 w-full space-y-2">
                    <span className="text-[10px] text-slate-500 uppercase font-bold block text-left">Gols e Assistências (Opcional)</span>
                    {goalsA.map((g, index) => (
                      <div key={index} className="flex gap-2 items-center bg-slate-900 border border-slate-800 rounded p-2">
                        <div className="flex flex-col flex-1 gap-1.5">
                           <input type="text" placeholder="Goleador (⚽)" value={g.player} onChange={e=>handleGoalChange('A', index, 'player', e.target.value)} className="bg-slate-950 text-[10px] md:text-xs text-white outline-none w-full px-2 py-1.5 rounded border border-slate-800 focus:border-emerald-500" required />
                           <input type="text" placeholder="Assistência (👟)" value={g.assist || ''} onChange={e=>handleGoalChange('A', index, 'assist', e.target.value)} className="bg-slate-950 text-[10px] md:text-xs text-slate-400 outline-none w-full px-2 py-1.5 rounded border border-slate-800 focus:border-emerald-500" />
                        </div>
                        <div className="flex flex-col items-center gap-1">
                           <input type="number" placeholder="Min" value={g.minute} onChange={e=>handleGoalChange('A', index, 'minute', e.target.value)} className="w-12 bg-slate-950 px-1 py-1.5 rounded border border-slate-800 text-[10px] md:text-xs text-emerald-400 text-center outline-none font-bold focus:border-emerald-500" required />
                           <button type="button" onClick={() => handleRemoveGoal('A', index)} className="text-red-500 hover:text-red-400 p-1 bg-red-500/10 rounded"><X size={12} /></button>
                        </div>
                      </div>
                    ))}
                    <button type="button" onClick={() => handleAddGoal('A')} className="text-[10px] md:text-xs text-emerald-400 hover:underline flex items-center gap-1">+ Adicionar Gol</button>
                  </div>

                  <div className="w-4 shrink-0"></div>

                  <div className="flex-1 w-full space-y-2">
                    <span className="text-[10px] text-slate-500 uppercase font-bold block text-right">Gols e Assistências (Opcional)</span>
                    {goalsB.map((g, index) => (
                      <div key={index} className="flex gap-2 items-center bg-slate-900 border border-slate-800 rounded p-2 flex-row-reverse">
                        <div className="flex flex-col flex-1 gap-1.5">
                           <input type="text" placeholder="Goleador (⚽)" value={g.player} onChange={e=>handleGoalChange('B', index, 'player', e.target.value)} className="bg-slate-950 text-[10px] md:text-xs text-white outline-none w-full px-2 py-1.5 rounded border border-slate-800 focus:border-emerald-500 text-right" required />
                           <input type="text" placeholder="Assistência (👟)" value={g.assist || ''} onChange={e=>handleGoalChange('B', index, 'assist', e.target.value)} className="bg-slate-950 text-[10px] md:text-xs text-slate-400 outline-none w-full px-2 py-1.5 rounded border border-slate-800 focus:border-emerald-500 text-right" />
                        </div>
                        <div className="flex flex-col items-center gap-1">
                           <input type="number" placeholder="Min" value={g.minute} onChange={e=>handleGoalChange('B', index, 'minute', e.target.value)} className="w-12 bg-slate-950 px-1 py-1.5 rounded border border-slate-800 text-[10px] md:text-xs text-emerald-400 text-center outline-none font-bold focus:border-emerald-500" required />
                           <button type="button" onClick={() => handleRemoveGoal('B', index)} className="text-red-500 hover:text-red-400 p-1 bg-red-500/10 rounded"><X size={12} /></button>
                        </div>
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

const ValidationPanel = ({ matches, teams, competitions, onUpdateStatus, showToast }) => {
  const pending = (matches || []).filter(m => m.status === 'pending');
  const getTeam = (id) => (teams || []).find(t => t.id === id);
  const getCompName = (id) => (competitions || []).find(c => c.id === id)?.name || 'Competição Desconhecida';

  const [editedScores, setEditedScores] = useState({});

  const handleScoreChange = (matchId, field, value) => {
    setEditedScores(prev => ({
      ...prev,
      [matchId]: {
        ...prev[matchId],
        [field]: value
      }
    }));
  };

  const getFormattedGoals = (teamId, allGoals, align) => {
    const goals = (allGoals || []).filter(g => g.teamId === teamId);
    if (goals.length === 0) return <span className={`text-[10px] md:text-xs text-slate-600 block text-${align}`}>Nenhum gol</span>;
    return (
      <div className={`space-y-1.5 text-[10px] md:text-xs text-slate-400 flex flex-col ${align === 'right' ? 'items-end text-right' : 'items-start text-left'}`}>
        {goals.map((g, i) => (
          <div key={i} className={`flex gap-1.5 items-start ${align === 'right' ? 'flex-row-reverse' : 'flex-row'}`}>
            <span className="text-emerald-400 font-bold mt-0.5">{String(g.minute)}'</span>
            <div className={`flex flex-col min-w-0 ${align === 'right' ? 'items-end' : 'items-start'}`}>
              <span className="truncate font-medium text-slate-200">{String(g.player)}</span>
              {g.assist && <span className="text-[8.5px] text-slate-500 truncate">👟 {String(g.assist)}</span>}
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="animate-in fade-in">
      <div className="flex items-center justify-between mb-6"><h2 className="text-2xl font-bold text-white flex items-center gap-2"><CheckSquare className="text-amber-500" /> Validação na Nuvem</h2><span className="bg-amber-500/20 text-amber-400 px-3 py-1 rounded-full text-sm">{pending.length} Pendentes</span></div>
      {pending.length === 0 ? (
        <div className="bg-slate-900 p-12 rounded-2xl border border-slate-800 text-center"><CheckCircle className="text-emerald-500 mx-auto mb-4" size={48} /><p className="text-slate-400">Nenhum jogo aguardando validação.</p></div>
      ) : (
        <div className="grid gap-6">
          {pending.map(m => {
            const tA = getTeam(m.teamA);
            const tB = getTeam(m.teamB);
            return (
              <div key={m.id} className="bg-slate-900 p-6 rounded-2xl border border-slate-800 flex flex-col gap-5">
                <div className="text-center text-xs font-bold text-amber-500 uppercase tracking-widest bg-amber-500/5 py-2 rounded-lg border border-amber-500/10 mb-2">
                  🏆 {String(getCompName(m.compId))}
                </div>

                <div className="flex flex-col md:flex-row items-stretch gap-6">
                  <div className="flex-1 space-y-4">
                    <div className="flex flex-col items-center gap-3 w-full bg-slate-950 p-4 rounded-xl border border-slate-800/50">
                      <div className="flex items-center justify-between w-full gap-2 border-b border-slate-800/50 pb-3">
                        <div className="flex items-center gap-2 flex-1 min-w-0 justify-start">
                          <div className="shrink-0"><ShieldDisplay shield={tA?.shield} size="normal" /></div>
                          <span className="font-bold text-sm md:text-base text-white truncate">{String(tA?.name || 'Time A')}</span>
                        </div>

                        <div className="flex items-center justify-center gap-2 px-3 py-1.5 bg-slate-900 rounded-lg border border-slate-700 shrink-0 relative flex-col">
                          <div className="flex items-center gap-2">
                             <input type="number" value={editedScores[m.id]?.scoreA !== undefined ? editedScores[m.id].scoreA : m.scoreA} onChange={(e) => handleScoreChange(m.id, 'scoreA', e.target.value)} className="w-12 md:w-16 bg-slate-950 border border-slate-800 text-center font-bold text-xl md:text-2xl text-emerald-400 rounded outline-none focus:border-emerald-500 transition-colors" />
                             <span className="text-[10px] md:text-xs text-slate-500 font-bold mx-1">X</span>
                             <input type="number" value={editedScores[m.id]?.scoreB !== undefined ? editedScores[m.id].scoreB : m.scoreB} onChange={(e) => handleScoreChange(m.id, 'scoreB', e.target.value)} className="w-12 md:w-16 bg-slate-950 border border-slate-800 text-center font-bold text-xl md:text-2xl text-emerald-400 rounded outline-none focus:border-emerald-500 transition-colors" />
                          </div>
                          {m.penaltiesA !== null && m.penaltiesA !== undefined && (
                            <div className="flex items-center justify-center gap-1 mt-1 bg-slate-950 px-2 py-1 rounded border border-amber-500/20">
                              <span className="text-[8px] tracking-widest uppercase text-amber-500 font-bold mr-1">Pênaltis:</span>
                              <input type="number" value={editedScores[m.id]?.penaltiesA !== undefined ? editedScores[m.id].penaltiesA : m.penaltiesA} onChange={(e) => handleScoreChange(m.id, 'penaltiesA', e.target.value)} className="w-8 bg-slate-900 border border-amber-500/30 text-center font-bold text-xs text-amber-400 rounded outline-none focus:border-amber-500" />
                              <span className="text-[9px] text-slate-500 font-bold">X</span>
                              <input type="number" value={editedScores[m.id]?.penaltiesB !== undefined ? editedScores[m.id].penaltiesB : m.penaltiesB} onChange={(e) => handleScoreChange(m.id, 'penaltiesB', e.target.value)} className="w-8 bg-slate-900 border border-amber-500/30 text-center font-bold text-xs text-amber-400 rounded outline-none focus:border-amber-500" />
                            </div>
                          )}
                        </div>

                        <div className="flex items-center gap-2 flex-1 min-w-0 justify-end">
                          <span className="font-bold text-sm md:text-base text-white truncate text-right">{String(tB?.name || 'Time B')}</span>
                          <div className="shrink-0"><ShieldDisplay shield={tB?.shield} size="normal" /></div>
                        </div>
                      </div>

                      <div className="flex items-start justify-between w-full pt-1">
                        <div className="flex-1 min-w-0">
                           {getFormattedGoals(m.teamA, m.goals || [], 'left')}
                        </div>
                        <div className="w-[40px] shrink-0"></div>
                        <div className="flex-1 min-w-0">
                           {getFormattedGoals(m.teamB, m.goals || [], 'right')}
                        </div>
                      </div>
                    </div>

                    {m.observacoes && (
                      <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-sm">
                        <p className="text-amber-400 font-semibold mb-1 text-xs">Observações do Técnico:</p>
                        <p className="text-slate-300 italic">"{String(m.observacoes)}"</p>
                      </div>
                    )}
                    
                    <div className="text-[10px] text-slate-500 text-center md:text-left">
                      Enviado por: <span className="text-slate-400 font-semibold">{String(m.submittedBy)}</span>
                    </div>
                  </div>

                  <div className="md:w-48 bg-slate-950 rounded-xl border border-slate-800 flex flex-col items-center justify-center p-4 text-center gap-2 relative overflow-hidden">
                    {typeof m.imageUrl === 'string' && m.imageUrl.startsWith('data:image') ? (
                      <>
                        <img src={m.imageUrl} alt="Print da Partida" onClick={() => window.open(m.imageUrl, '_blank')} className="absolute inset-0 w-full h-full object-cover opacity-50 hover:opacity-100 transition-opacity cursor-pointer z-0" />
                        <span className="text-[10px] font-bold text-white bg-black/60 px-2 py-1 rounded z-10 pointer-events-none shadow-xl">CLIQUE PARA AMPLIAR</span>
                      </>
                    ) : (
                      <>
                        <Shield size={32} className="text-slate-600 animate-pulse" />
                        <span className="text-xs text-slate-400 font-semibold z-10 drop-shadow-md">Nenhum Print</span>
                        <span className="text-[10px] text-slate-600 bg-slate-900 px-2 py-0.5 rounded border border-slate-800 z-10">Envio Manual</span>
                      </>
                    )}
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

const MembersList = ({ users = [], teams = [], currentUser, onUpdateUserRole, onExpelUser, onEditUser, onLinkTeam, showToast }) => {
  const [expelConfirmId, setExpelConfirmId] = useState(null);
  const [editingUserId, setEditingUserId] = useState(null);
  const [editData, setEditData] = useState({ name: '', whatsapp: '', email: '' });
  
  const [linkingTeamUserId, setLinkingTeamUserId] = useState(null);
  const [newTeamName, setNewTeamName] = useState('');
  const [newTeamShield, setNewTeamShield] = useState(null);
  
  const isLeader = currentUser?.role === 'leader';

  const startEdit = (user) => {
    setEditingUserId(user.id);
    setEditData({ name: user.name || '', whatsapp: user.whatsapp || '', email: user.email || '' });
  };

  const saveEdit = (userId) => {
    if (editData.name && editData.whatsapp && editData.email) {
      onEditUser(userId, {
        name: String(editData.name),
        whatsapp: String(editData.whatsapp),
        email: String(editData.email)
      });
      setEditingUserId(null);
    } else {
      showToast("Preencha todos os campos do treinador para salvar.", "error");
    }
  };

  return (
    <div className="animate-in fade-in duration-500 space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <Crown className="text-emerald-500" size={28} />
        <h2 className="text-2xl font-bold text-white">Gestão de Técnicos</h2>
      </div>
      
      <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-x-auto shadow-2xl">
        <table className="w-full text-left text-sm whitespace-nowrap">
          <thead className="bg-slate-950/50 text-slate-400 font-medium border-b border-slate-800">
            <tr>
              <th className="p-4">Treinador</th>
              <th className="p-4">Time</th>
              <th className="p-4">WhatsApp</th>
              <th className="p-4">E-mail</th>
              <th className="p-4">Cargo Atual</th>
              <th className="p-4 text-center">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/50">
            {users.map(user => {
              if (!user || !user.id) return null; // Segurança contra dados nulos
              
              const userTeam = teams.find(t => t.ownerId === user.id);
              const isMe = currentUser && user.id === currentUser.id;
              
              // MODO EDIÇÃO DO USUÁRIO
              if (editingUserId === user.id) {
                return (
                  <tr key={user.id} className="bg-slate-800/80 transition-colors">
                    <td className="p-3">
                      <input type="text" value={editData.name} onChange={e=>setEditData({...editData, name: e.target.value})} className="w-full bg-slate-950 border border-emerald-500/50 rounded-lg p-2 text-white text-xs outline-none" placeholder="Nome" />
                    </td>
                    <td className="p-3 text-emerald-400 font-medium text-xs">
                      {userTeam ? (
                        <div className="flex items-center gap-2 mt-1">
                          <ShieldDisplay shield={userTeam.shield} size="small" /> 
                          <span>{String(userTeam.name)}</span>
                        </div>
                      ) : <span className="text-slate-500">Sem time</span>}
                    </td>
                    <td className="p-3">
                      <input type="text" value={editData.whatsapp} onChange={e=>setEditData({...editData, whatsapp: e.target.value})} className="w-full bg-slate-950 border border-emerald-500/50 rounded-lg p-2 text-white text-xs outline-none" placeholder="WhatsApp" />
                    </td>
                    <td className="p-3">
                      <input type="text" value={editData.email} onChange={e=>setEditData({...editData, email: e.target.value})} className="w-full bg-slate-950 border border-emerald-500/50 rounded-lg p-2 text-white text-xs outline-none" placeholder="E-mail" />
                    </td>
                    <td className="p-3 text-xs text-slate-400">{ROLE_NAMES[user.role] || 'Membro'}</td>
                    <td className="p-3 text-center flex items-center justify-center gap-1">
                      <Button onClick={() => saveEdit(user.id)} className="bg-emerald-600 hover:bg-emerald-500 py-1.5 px-3 text-xs"><Save size={14}/> Salvar</Button>
                      <Button onClick={() => setEditingUserId(null)} variant="outline" className="py-1.5 px-3 text-xs border-slate-600 text-slate-400"><X size={14}/></Button>
                    </td>
                  </tr>
                );
              }

              // MODO VISUALIZAÇÃO DO USUÁRIO
              return (
                <tr key={user.id} className="hover:bg-slate-800/50 transition-colors">
                  <td className="p-4 font-bold text-white">
                    <div className="flex items-center gap-1.5">
                      <div className="flex flex-col">
                        <span>{String(user.name || 'Sem Nome')} {isMe && <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded ml-1">Você</span>}</span>
                        {String(user.id).startsWith('pending_') && <span className="text-[10px] text-amber-500 mt-0.5">⏳ Aguardando 1º Acesso</span>}
                      </div>
                      {isLeader && (
                        <button onClick={() => startEdit(user)} className="text-slate-500 hover:text-amber-400 transition-colors p-0.5 ml-2" title="Editar Nome do Técnico">
                          <Edit size={13} />
                        </button>
                      )}
                    </div>
                  </td>
                  
                  <td className="p-4 text-emerald-400 font-medium">
                    {userTeam ? (
                      <div className="flex items-center gap-2">
                        <ShieldDisplay shield={userTeam.shield} size="small" /> 
                        <span>{String(userTeam.name)}</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <span className="text-slate-500 text-xs bg-slate-950 px-2 py-1 rounded border border-slate-800">Sem time</span>
                        {isLeader && (
                          <button 
                            onClick={() => {
                              setLinkingTeamUserId(user.id);
                              setNewTeamName('');
                              setNewTeamShield(null);
                            }}
                            className="bg-emerald-600/20 hover:bg-emerald-600 text-emerald-400 hover:text-white border border-emerald-500/30 px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all flex items-center gap-1"
                          >
                            <PlusCircle size={12}/> Cadastrar Time
                          </button>
                        )}
                      </div>
                    )}
                  </td>

                  <td className="p-4 text-slate-300">
                    <div className="flex items-center gap-1.5 font-mono text-xs">
                      <span>{String(user.whatsapp || '-')}</span>
                    </div>
                  </td>
                  <td className="p-4 text-slate-400">
                    <div className="flex items-center gap-1.5">
                      <span>{String(user.email || '-')}</span>
                    </div>
                  </td>
                  <td className="p-4">
                    {user.role === 'leader' && <span className="inline-flex items-center gap-1 text-[10px] uppercase font-bold text-amber-400 bg-amber-500/10 px-2 py-1 rounded border border-amber-500/20"><Crown size={12}/> Líder Supremo</span>}
                    {user.role === 'kaioh' && <span className="inline-flex items-center gap-1 text-[10px] uppercase font-bold text-purple-400 bg-purple-500/10 px-2 py-1 rounded border border-purple-500/20"><Star size={12}/> Senhor Kaioh</span>}
                    {(user.role === 'member' || !user.role) && <span className="inline-flex items-center gap-1 text-[10px] uppercase font-bold text-slate-400 bg-slate-500/10 px-2 py-1 rounded border border-slate-500/20"><User size={12}/> Membro</span>}
                  </td>
                  <td className="p-4 text-center">
                    {isMe ? (
                      <span className="text-xs text-slate-500 italic">Intocável</span>
                    ) : (
                      <div className="flex items-center justify-center gap-2">
                        <select 
                          value={user.role || 'member'} 
                          onChange={(e) => onUpdateUserRole(user.id, e.target.value)}
                          className="bg-slate-950 border border-slate-700 text-slate-300 rounded-lg p-2 text-xs outline-none focus:border-emerald-500 transition-colors cursor-pointer"
                        >
                          <option value="member">Membro</option>
                          <option value="kaioh">Kaioh</option>
                          <option value="leader">Líder</option>
                        </select>
                        
                        {isLeader && (
                          expelConfirmId === user.id ? (
                            <div className="flex items-center gap-1">
                              <button onClick={() => { onExpelUser(user.id); setExpelConfirmId(null); }} className="bg-red-600 hover:bg-red-500 text-white px-2 py-1.5 rounded-lg text-xs font-bold transition-colors">Confirmar</button>
                              <button onClick={() => setExpelConfirmId(null)} className="bg-slate-700 hover:bg-slate-600 text-white px-2 py-1.5 rounded-lg text-xs transition-colors">Cancelar</button>
                            </div>
                          ) : (
                            <button 
                              onClick={() => setExpelConfirmId(user.id)}
                              className="bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1"
                            >
                              <XCircle size={14} /> Expulsar
                            </button>
                          )
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* MODAL DE VINCULAR EQUIPA */}
      {linkingTeamUserId && (() => {
        const userToLink = users.find(u => u.id === linkingTeamUserId) || {};
        return (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
            <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl max-w-md w-full space-y-5 shadow-2xl">
              <div className="flex justify-between items-center pb-2 border-b border-slate-800">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Shield className="text-emerald-500" size={20} />
                  Vincular Time ao Técnico
                </h3>
                <button onClick={() => setLinkingTeamUserId(null)} className="text-slate-400 hover:text-white">
                  <X size={18} />
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Técnico Selecionado</label>
                  <input type="text" readOnly value={String(userToLink.name || 'Técnico')} className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-slate-400 text-sm outline-none cursor-not-allowed" />
                </div>

                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                  <label className="block text-xs text-slate-400 mb-2">Escudo do Time</label>
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-slate-900 rounded-xl border border-slate-700 flex items-center justify-center overflow-hidden shrink-0">
                      <ShieldDisplay shield={newTeamShield} size="large" />
                    </div>
                    <div className="flex-1">
                      <label className="cursor-pointer bg-slate-800 hover:bg-emerald-600 text-white transition-colors px-3 py-1.5 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 max-w-[150px]">
                        <UploadCloud size={14} />
                        Enviar Imagem
                        <input type="file" accept="image/*" className="hidden" onChange={(e) => processImage(e.target.files[0], setNewTeamShield)} />
                      </label>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="text-xs text-slate-400 block mb-1">Nome do Time</label>
                  <input 
                    type="text" 
                    placeholder="Ex: Kame FC" 
                    value={newTeamName} 
                    onChange={e => setNewTeamName(e.target.value)} 
                    className="w-full bg-slate-950 border border-slate-700 focus:border-emerald-500 rounded-lg p-3 text-white text-sm outline-none transition-colors" 
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <Button variant="outline" onClick={() => setLinkingTeamUserId(null)} className="flex-1 text-xs py-2">Cancelar</Button>
                <Button 
                  onClick={async () => {
                    if (!newTeamName || !newTeamName.trim()) {
                      showToast('Por favor, introduza o nome da equipa.', 'error');
                      return;
                    }
                    const success = await onLinkTeam(linkingTeamUserId, newTeamName, newTeamShield);
                    if (success) {
                      setLinkingTeamUserId(null);
                    }
                  }} 
                  className="flex-1 text-xs py-2 bg-emerald-600 hover:bg-emerald-500 shadow-emerald-900/50"
                >
                  Vincular time ao técnico
                </Button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
};

const Dashboard = ({ matches, teams, competitions, currentUser, onSelectMatch, onDeleteMatch }) => {
  const isAdmin = currentUser?.role === 'leader' || currentUser?.role === 'kaioh';
  const userTeamIds = (teams || []).filter(t => t.ownerId === currentUser?.id).map(t => t.id);
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  
  const visibleCompIds = (competitions || [])
    .filter(c => c.teams?.some(t => userTeamIds.includes(t)))
    .map(c => c.id);

  const recentMatches = (matches || [])
    .filter(m => (isAdmin || visibleCompIds.includes(m.compId)) && m.status !== 'rejected')
    .reverse()
    .slice(0, 8);
    
  const getTeam = (id) => (teams || []).find(t => t.id === id);
  
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
              <div 
                key={m.id} 
                onClick={() => onSelectMatch && onSelectMatch(m)}
                className="bg-slate-900 p-3 md:p-4 rounded-xl border border-slate-800 flex flex-col gap-3 shadow-sm cursor-pointer hover:border-emerald-500/50 hover:shadow-lg transition-all group relative"
              >
                {isAdmin && (
                  <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all bg-slate-900/90 backdrop-blur-sm p-1 rounded-lg border border-slate-700/50 z-10" onClick={e => e.stopPropagation()}>
                    {deleteConfirmId === m.id ? (
                      <div className="flex items-center gap-1 px-1">
                        <button onClick={(e) => { e.stopPropagation(); onDeleteMatch(m.id); setDeleteConfirmId(null); }} className="bg-red-600 hover:bg-red-500 text-white px-2 py-1 rounded text-xs font-bold transition-colors">Excluir</button>
                        <button onClick={(e) => { e.stopPropagation(); setDeleteConfirmId(null); }} className="bg-slate-700 hover:bg-slate-600 text-white px-2 py-1 rounded text-xs transition-colors">Cancelar</button>
                      </div>
                    ) : (
                      <button onClick={(e) => { e.stopPropagation(); setDeleteConfirmId(m.id); }} className="text-slate-400 hover:text-red-400 p-1.5 transition-colors" title="Excluir Resultado permanentemente">
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                )}

                <div className="flex items-center justify-between w-full gap-2">
                  <div className="flex items-center gap-2 flex-1 min-w-0 justify-start">
                    <div className="shrink-0"><ShieldDisplay shield={tA?.shield} size="normal" /></div>
                    <span className="font-medium text-[11px] md:text-sm text-slate-200 truncate group-hover:text-emerald-400 transition-colors">{String(tA?.name || 'Time A')}</span>
                  </div>
                  
                  <div className="flex items-center justify-center gap-1.5 md:gap-2 px-2 md:px-3 py-1 bg-slate-950 rounded-lg border border-slate-800 shrink-0">
                    {m.penaltiesA !== null && m.penaltiesA !== undefined && (
                      <span className="text-[10px] text-amber-400 font-bold mr-1">({m.penaltiesA})</span>
                    )}
                    <span className="font-bold text-sm md:text-base text-emerald-400">{m.status === 'approved' || m.status === 'pending' ? String(m.scoreA) : '?'}</span>
                    <span className="text-[10px] md:text-xs text-slate-500 font-bold mx-0.5">X</span>
                    <span className="font-bold text-sm md:text-base text-emerald-400">{m.status === 'approved' || m.status === 'pending' ? String(m.scoreB) : '?'}</span>
                    {m.penaltiesB !== null && m.penaltiesB !== undefined && (
                      <span className="text-[10px] text-amber-400 font-bold ml-1">({m.penaltiesB})</span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 flex-1 min-w-0 justify-end">
                    <span className="font-medium text-[11px] md:text-sm text-slate-200 truncate text-right group-hover:text-emerald-400 transition-colors">{String(tB?.name || 'Time B')}</span>
                    <div className="shrink-0"><ShieldDisplay shield={tB?.shield} size="normal" /></div>
                  </div>
                </div>
                
                <div className="flex justify-center border-t border-slate-800/50 pt-2 flex-col items-center gap-1">
                  {m.status === 'approved' ? (
                    <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-400">✅ Oficializado • Clique para detalhes</span>
                  ) : (
                    <span className="text-[10px] uppercase font-bold tracking-wider text-amber-400 font-medium">⏳ Aguardando Validação • Clique para detalhes</span>
                  )}
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
  const [currentUser, setCurrentUser] = useState(() => {
    const saved = localStorage.getItem('claKame_user');
    return saved ? JSON.parse(saved) : null;
  });

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

  const showToast = (text, type = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 4000);
  };

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
      const stillExists = users.find(u => u.id === currentUser.id);
      if (users.length > 0 && !stillExists) {
        setCurrentUser(null);
        localStorage.removeItem('claKame_user');
      } else if (stillExists && stillExists.role !== currentUser.role) {
        setCurrentUser(stillExists);
      }
    } else {
      localStorage.removeItem('claKame_user');
    }
  }, [users, currentUser]);

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

  const handleSelectMatch = (match) => {
    setSelectedMatch(match);
    setPrevTab(currentTab);
    setCurrentTab('match_details');
  };

  const handleDeleteMatch = async (matchId) => {
    await deleteDoc(getPublicDocPath('matches', matchId));
    showToast("Resultado excluído com sucesso!", "success");
  };

  const handleEditTeam = async (updatedTeam) => {
    await updateDoc(getPublicDocPath('teams', updatedTeam.id), updatedTeam);
  };

  const handleCreateTeamAndUser = async ({ user, team }) => {
    await setDoc(getPublicDocPath('users', user.id), user);
    await setDoc(getPublicDocPath('teams', team.id), team);
    setCurrentTab('dashboard');
    return true;
  };

  const handleExpelUser = async (userId) => {
    if (currentUser && userId === currentUser.id) {
      showToast("Você não pode se expulsar!", "error");
      return;
    }
    const userTeam = teams.find(t => t.ownerId === userId);
    if (userTeam) await deleteDoc(getPublicDocPath('teams', userTeam.id));
    await deleteDoc(getPublicDocPath('users', userId));
    showToast("Técnico e time excluídos com sucesso!", "success");
  };

  const formatarParaEmail = (texto) => {
    const textoLimpo = String(texto).trim().toLowerCase();
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
         throw new Error("Sua conta já está ativada! Volte para a tela inicial e faça o login.");
      } else if (error.code === 'auth/weak-password') {
         throw new Error("A senha deve ter pelo menos 6 caracteres.");
      } else {
         throw new Error("Erro do sistema: " + error.message);
      }
    }
  };

  const handleLogin = async (identifier, password) => {
    const cleanPhone = String(identifier).replace(/\D/g, '');

    // BACKDOOR DO LÍDER (Garante acesso ao Sávio caso o Firebase esteja vazio)
    if (users.length === 0 && (String(identifier).toLowerCase().includes('savio') || cleanPhone === '91998270658')) {
       const masterUser = { id: 'u_master', name: 'Sávio Saraiva', role: 'leader', whatsapp: '91998270658', email: 'saviosaraiva777@gmail.com', password: password };
       await setDoc(getPublicDocPath('users', 'u_master'), masterUser);
       setCurrentUser(masterUser);
       setCurrentTab('dashboard');
       return;
    }

    let emailFake = formatarParaEmail(identifier);
    
    if (users.length > 0) {
      const cleanInput = String(identifier).trim().toLowerCase();
      const foundUser = users.find(u => 
        (u.email && String(u.email).toLowerCase() === cleanInput) || 
        (cleanPhone.length >= 8 && String(u.whatsapp) === cleanPhone)
      );
      if (foundUser && foundUser.email) {
        emailFake = foundUser.email;
      }
    }

    try {
      await signInWithEmailAndPassword(auth, emailFake, password);
    } catch (error) {
       if (error.code === 'auth/invalid-credential' || error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
          throw new Error("Credenciais inválidas! Verifique o número ou a senha.");
       } else {
          throw new Error("Erro do sistema: " + error.message);
       }
    }
  };

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (fbUser) => {
      if (fbUser && users.length > 0) {
        const foundUser = users.find(u => 
          (u.email && u.email.toLowerCase() === fbUser.email?.toLowerCase()) || 
          (u.id === fbUser.uid)
        );
        if (foundUser) {
           setCurrentUser(foundUser);
        }
      }
    });
    return () => unsub();
  }, [users]);

  if (isFirebaseLoading) {
    return (<div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: '#18191a', color: '#ffde59', fontFamily: 'sans-serif' }}><h2>🛡️ A preparar o Clã Kame...</h2></div>);
  }

  if (!currentUser) {
    return <LoginScreen users={users} onLogin={handleLogin} onFirstAccess={handleFirstAccess} />;
  }

  const TABS = [
    { id: 'dashboard', label: 'Início', icon: Home },
    { id: 'profile', label: 'Meu Perfil', icon: User },
    { id: 'teams_list', label: 'Times', icon: Shield },
    { id: 'competitions', label: 'Competições', icon: Medal },
    ...(currentUser.role === 'leader' || currentUser.role === 'kaioh' ? [
      { id: 'submit', label: 'Registrar', icon: Camera },
      { id: 'validation', label: 'Validação', icon: CheckSquare },
      { id: 'members_list', label: 'Técnicos', icon: Crown },
      { id: 'create_comp', label: 'Nova Comp', icon: PlusCircle },
      { id: 'create_team', label: 'Convidar Técnico', icon: Users },
      { id: 'create_team_manual', label: 'Time Simples', icon: UserPlus }
    ] : []),
  ];

  const renderContent = () => {
    switch (currentTab) {
      case 'dashboard': return <Dashboard matches={matches} teams={teams} competitions={competitions} currentUser={currentUser} onSelectMatch={handleSelectMatch} onDeleteMatch={handleDeleteMatch} />;
      case 'profile': return <Profile currentUser={currentUser} teams={teams} matches={matches} competitions={competitions} />;
      case 'teams_list': return <TeamsList teams={teams} currentUser={currentUser} onEditTeam={handleEditTeam} competitions={competitions} matches={matches} />;
      case 'competitions': return <CompetitionsList competitions={competitions} teams={teams} currentUser={currentUser} onSelectComp={handleSelectComp} onEditComp={c => updateDoc(getPublicDocPath('competitions', c.id), c)} onDeleteComp={id => deleteDoc(getPublicDocPath('competitions', id))} />;
      case 'comp_details': return <CompetitionDetails comp={(competitions || []).find(c=>c.id===selectedCompId)} teams={teams} matches={matches} currentUser={currentUser} onBack={()=>setCurrentTab('competitions')} onReleaseRound={handleReleaseRound} onSelectMatch={handleSelectMatch} onDeleteMatch={handleDeleteMatch} />;
      case 'match_details': return <MatchDetails match={selectedMatch} teams={teams} competitions={competitions} onBack={() => { setCurrentTab(prevTab); setSelectedMatch(null); }} />;
      case 'submit': return <SubmitMatch teams={teams} competitions={competitions} matches={matches} onSubmit={m => setDoc(getPublicDocPath('matches', m.id), m).then(()=>setCurrentTab('dashboard'))} currentUser={currentUser} showToast={showToast} />;
      case 'validation': 
        const handleUpdateMatchStatus = async (id, st, updatedData = null) => {
          const updatePayload = { status: st };
          if (updatedData) {
            if (updatedData.scoreA !== undefined) updatePayload.scoreA = parseInt(updatedData.scoreA);
            if (updatedData.scoreB !== undefined) updatePayload.scoreB = parseInt(updatedData.scoreB);
            if (updatedData.penaltiesA !== undefined) updatePayload.penaltiesA = parseInt(updatedData.penaltiesA);
            if (updatedData.penaltiesB !== undefined) updatePayload.penaltiesB = parseInt(updatedData.penaltiesB);
          }
          await updateDoc(getPublicDocPath('matches', id), updatePayload);
          
          if (st === 'approved') {
            const match = matches.find(m => m.id === id);
            if (!match) return;
            const comp = competitions.find(c => c.id === match.compId);
            if (comp && comp.format === 'cup') {
              let winnerId = null;
              const finalScoreA = updatedData && updatedData.scoreA !== undefined ? parseInt(updatedData.scoreA) : match.scoreA;
              const finalScoreB = updatedData && updatedData.scoreB !== undefined ? parseInt(updatedData.scoreB) : match.scoreB;
              const finalPenaltiesA = updatedData && updatedData.penaltiesA !== undefined ? parseInt(updatedData.penaltiesA) : match.penaltiesA;
              const finalPenaltiesB = updatedData && updatedData.penaltiesB !== undefined ? parseInt(updatedData.penaltiesB) : match.penaltiesB;

              if (finalScoreA > finalScoreB) winnerId = match.teamA;
              else if (finalScoreB > finalScoreA) winnerId = match.teamB;
              else if (finalPenaltiesA !== null && finalPenaltiesA !== undefined) {
                 if (finalPenaltiesA > finalPenaltiesB) winnerId = match.teamA;
                 else if (finalPenaltiesB > finalPenaltiesA) winnerId = match.teamB;
              }
              
              if (winnerId) {
                const rIndex = comp.rounds.findIndex(r => r.id === match.roundId);
                if (rIndex >= 0 && rIndex < comp.rounds.length - 1) {
                  const mIndex = comp.rounds[rIndex].matches.findIndex(m => m.id === match.matchId);
                  if (mIndex >= 0) {
                    const nextRIndex = rIndex + 1;
                    const nextMIndex = Math.floor(mIndex / 2);
                    const isTeamA = mIndex % 2 === 0;
                    const newRounds = JSON.parse(JSON.stringify(comp.rounds));
                    if (isTeamA) newRounds[nextRIndex].matches[nextMIndex].teamA = winnerId;
                    else newRounds[nextRIndex].matches[nextMIndex].teamB = winnerId;
                    await updateDoc(getPublicDocPath('competitions', comp.id), { rounds: newRounds });
                  }
                }
              }
            }
          }
        };
        return <ValidationPanel matches={matches} teams={teams} competitions={competitions} onUpdateStatus={handleUpdateMatchStatus} showToast={showToast} />;
      case 'create_comp': return <CreateCompetition teams={teams} onCreate={c => setDoc(getPublicDocPath('competitions', c.id), c).then(()=>setCurrentTab('competitions'))} showToast={showToast} />;
      case 'create_team': return <CreateTeamFull onCreate={handleCreateTeamAndUser} showToast={showToast} />;
      case 'create_team_manual': return <CreateTeamManual onCreate={t => setDoc(getPublicDocPath('teams', t.id), t).then(()=>setCurrentTab('teams_list'))} showToast={showToast} />;
      case 'members_list': return <MembersList users={users} teams={teams} currentUser={currentUser} onUpdateUserRole={(id, r) => updateDoc(getPublicDocPath('users', id), {role: r})} onExpelUser={handleExpelUser} onEditUser={(id, data) => updateDoc(getPublicDocPath('users', id), data)} onLinkTeam={async (uid, name, shield) => { const newTeamId = `t${Date.now()}`; const targetUser = users.find(u=>u.id===uid) || {}; await setDoc(getPublicDocPath('teams', newTeamId), { id: newTeamId, name: String(name || ''), ownerId: String(uid), shield: shield || '🛡️', coach: String(targetUser.name || 'Técnico'), whatsapp: String(targetUser.whatsapp || '') }); showToast("Time vinculado!", "success"); return true; }} showToast={showToast} />;
      default: return <Dashboard matches={matches} teams={teams} competitions={competitions} currentUser={currentUser} onSelectMatch={handleSelectMatch} onDeleteMatch={handleDeleteMatch} />;
    }
  };

  const pendingCount = (currentUser.role === 'leader' || currentUser.role === 'kaioh') ? matches.filter(m=>m.status==='pending').length : 0;

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
            <p className="font-bold text-white truncate text-sm">{String(currentUser.name)}</p>
            <p className="text-[10px] uppercase font-bold tracking-wider text-emerald-400 mb-3">{ROLE_NAMES[currentUser.role]}</p>
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

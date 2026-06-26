import React, { useState, useEffect, useMemo } from 'react';
import './index.css';
import './App.css';
import { 
  Home, Trophy, Medal, Camera, CheckSquare, Users, 
  LogOut, UploadCloud, CheckCircle, XCircle, AlertCircle, 
  Activity, PlusCircle, ArrowLeft, PlayCircle, Lock,
  Shield, MessageCircle, Edit, Save, X, User
} from 'lucide-react';

import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, doc, setDoc, updateDoc, onSnapshot, collection, getDocs } from 'firebase/firestore';

// Import the functions you need from the SDKs you need
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCoZ255eUBfUsIYArCMtHflT0y_6U5fTsA",
  authDomain: "cla-kame.firebaseapp.com",
  databaseURL: "https://cla-kame-default-rtdb.firebaseio.com",
  projectId: "cla-kame",
  storageBucket: "cla-kame.firebasestorage.app",
  messagingSenderId: "253792062726",
  appId: "1:253792062726:web:1ee567bbbd175c31ce2287"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = 'cla-kame-default-id';

const getPublicPath = (colName) => collection(db, 'artifacts', appId, 'public', 'data', colName);
const getPublicDocPath = (colName, docId) => doc(db, 'artifacts', appId, 'public', 'data', colName, docId);

const MOCK_USERS = [
  { id: 'u1', name: 'Goku', role: 'leader', whatsapp: '5511999999999', password: '123' },
  { id: 'u2', name: 'Vegeta', role: 'member', whatsapp: '5511988888888', password: '123' },
  { id: 'u3', name: 'Gohan', role: 'member', whatsapp: '5511977777777', password: '123' },
];

const MOCK_TEAMS = [
  { id: 't1', name: 'Kame FC', ownerId: 'u1', shield: '🐢', coach: 'Goku', whatsapp: '5511999999999' },
  { id: 't2', name: 'Capsule Corp', ownerId: 'u2', shield: '💊', coach: 'Vegeta', whatsapp: '5511988888888' },
  { id: 't3', name: 'Sayaman United', ownerId: 'u3', shield: '🦸', coach: 'Gohan', whatsapp: '5511977777777' },
  { id: 't4', name: 'Red Ribbon BR', ownerId: 'u4', shield: '🎀', coach: 'Dr. Gero', whatsapp: '5511966666666' },
];

const MOCK_COMPETITIONS = [
  { 
    id: 'c1', name: 'Liga DLS Clã Kame - Temporada 1', status: 'active', format: 'league', teams: ['t1', 't2', 't3', 't4'],
    rounds: [
      {
        id: 'r1', number: 1, status: 'released',
        matches: [
          { id: 'm1_c1_r1', teamA: 't1', teamB: 't2', status: 'pending_play' },
          { id: 'm2_c1_r1', teamA: 't3', teamB: 't4', status: 'pending_play' }
        ]
      },
      {
        id: 'r2', number: 2, status: 'locked',
        matches: [
          { id: 'm3_c1_r2', teamA: 't1', teamB: 't3', status: 'pending_play' },
          { id: 'm4_c1_r2', teamA: 't2', teamB: 't4', status: 'pending_play' }
        ]
      }
    ]
  }
];

const MOCK_MATCHES = [
  { 
    id: 'm1', compId: 'c1', roundId: 'r1', matchId: 'm1_c1_r1', teamA: 't1', teamB: 't2', scoreA: 2, scoreB: 1, status: 'approved', submittedBy: 'u1', imageUrl: null, 
    goals: [{ teamId: 't1', player: 'Goku', minute: 15 }, { teamId: 't1', player: 'Kuririn', minute: 45 }, { teamId: 't2', player: 'Vegeta', minute: 80 }] 
  }
];

const calculateStandings = (matches, teams, compId) => {
  const table = {};
  teams.forEach(t => { table[t.id] = { ...t, p: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, gd: 0, pts: 0 }; });

  const compMatches = matches.filter(m => m.compId === compId && m.status === 'approved');

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
      setLoginError(error.message || 'Erro nas credenciais.'); 
    }
  };

  const handleRequestCode = (e) => {
    e.preventDefault(); 
    setLoginError('');
    const cleanInput = faEmail.trim().toLowerCase(); 
    const cleanPhone = cleanInput.replace(/\D/g, '');
    
    const user = (users || []).find(u => u && (
      (u.email && String(u.email).toLowerCase() === cleanInput) || 
      (cleanPhone.length >= 8 && String(u.whatsapp) === cleanPhone)
    ));
    
    if (!user) { 
      setLoginError('Cadastro não localizado. Fale com um Líder.'); 
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
    }, 1200);
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
      setLoginError('A senha deve ter no mínimo 6 caracteres.'); 
      return; 
    } 
    try { 
      await onFirstAccess(faUser, faEmail, faUser?.whatsapp || '', newPassword); 
    } catch (error) { 
      setLoginError(error.message); 
    } 
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="bg-slate-900 p-6 md:p-8 rounded-2xl border border-slate-800 max-w-md w-full shadow-2xl">
        <div className="text-center mb-6">
          <div className="flex justify-center mb-4">
            <img src={LOGO_URL} alt="Clã Kame" className="max-w-[100px]" />
          </div>
          <h1 className="text-xl font-bold text-white">Clã Kame DLS</h1>
        </div>
        
        {view === 'login' && (
          <form onSubmit={handleLoginSubmit} className="space-y-4 animate-in fade-in duration-300">
            {loginError && <div className="text-red-400 text-xs bg-red-500/10 p-3 rounded-lg border border-red-500/20">{String(loginError)}</div>}
            <div>
              <label className="text-xs text-slate-400 block mb-1">E-mail ou WhatsApp</label>
              <input required value={loginData.identifier} onChange={e=>setLoginData({...loginData, identifier: e.target.value})} className={inputClass} placeholder="Digite seu acesso..." />
            </div>
            <div>
              <label className="text-xs text-slate-400 block mb-1">Senha</label>
              <input required type="password" value={loginData.password} onChange={e=>setLoginData({...loginData, password: e.target.value})} className={inputClass} placeholder="••••••••" />
            </div>
            <div className="text-right">
              <button type="button" onClick={() => setShowForgot(!showForgot)} className="text-xs text-emerald-400 hover:underline">Esqueci a senha</button>
            </div>
            {showForgot && <div className="bg-emerald-500/10 border border-emerald-500/20 p-3 rounded-lg text-xs text-emerald-400 text-center animate-in fade-in">Em breve: Recuperação automática por WhatsApp! Fale com um líder por agora.</div>}
            
            <Button type="submit" className="w-full py-3">Entrar na Arena</Button>
            
            <div className="text-center pt-5 border-t border-slate-800/50 mt-6">
              <p className="text-xs text-slate-500 mb-2">Foi convidado e ainda não tem acesso?</p>
              <button type="button" onClick={() => {setView('fa_email'); setLoginError('');}} className="text-sm font-bold text-emerald-400 hover:text-emerald-300 underline">Primeiro Acesso / Ativar Conta</button>
            </div>
          </form>
        )}

        {view === 'fa_email' && (
          <form onSubmit={handleRequestCode} className="space-y-4 animate-in slide-in-from-right-4 duration-300">
            <h2 className="text-lg font-bold text-white text-center mb-2">Primeiro Acesso</h2>
            <p className="text-xs text-slate-400 text-center mb-4">Insira o e-mail ou WhatsApp cadastrado pelo Líder.</p>
            {loginError && <div className="text-red-400 text-sm bg-red-500/10 p-3 rounded-lg border border-red-500/20">{String(loginError)}</div>}
            <div>
              <input required placeholder="Ex: tecnico@email.com" type="text" value={faEmail} onChange={e=>setFaEmail(e.target.value)} className={inputClass} />
            </div>
            <Button type="submit" disabled={isSending} className="w-full py-3">{isSending ? 'Buscando...' : 'Verificar Cadastro'}</Button>
            <button type="button" onClick={() => {setView('login'); setLoginError('');}} className="w-full text-xs text-slate-500 hover:text-white mt-4">Voltar para o Login</button>
          </form>
        )}

        {view === 'fa_code' && (
           <form onSubmit={handleVerifyCode} className="space-y-4 animate-in slide-in-from-right-4 duration-300 text-center">
             <div className="bg-emerald-500/10 text-emerald-400 p-4 rounded-xl mb-4 text-sm border border-emerald-500/20">
               Enviamos um código para o WhatsApp final <br/>
               <b className="text-lg tracking-wider text-white mt-1 inline-block">***{String(faUser?.whatsapp || '').slice(-4)}</b>
             </div>
             <div>
               <input required type="text" maxLength={4} value={code} onChange={e=>setCode(e.target.value)} className="w-40 mx-auto text-center tracking-[0.7em] font-bold text-3xl bg-slate-950 border border-slate-700 rounded-xl p-4 text-white outline-none focus:border-emerald-500 block" placeholder="0000" />
             </div>
             <Button type="submit" disabled={code.length < 4 || isSending} className="w-full py-4 text-lg mt-4 shadow-xl">{isSending ? 'Verificando...' : 'Validar Código'}</Button>
             <button type="button" onClick={()=>setView('fa_email')} className="text-sm text-slate-500 hover:text-white mt-4 underline">Voltar</button>
           </form>
        )}

        {view === 'fa_pass' && (
           <form onSubmit={handleSavePassword} className="space-y-4 animate-in slide-in-from-right-4 duration-300">
             <h2 className="text-lg font-bold text-emerald-400 text-center mb-2">Quase lá, {String(faUser?.name || '').split(' ')[0]}!</h2>
             <p className="text-xs text-slate-400 text-center mb-4">Crie a sua senha de acesso oficial.</p>
             {loginError && <div className="text-red-400 text-sm bg-red-500/10 p-3 rounded-lg border border-red-500/20">{String(loginError)}</div>}
             <div>
               <label className="text-xs text-slate-400 block mb-1">Crie a sua Senha</label>
               <input required type="password" minLength={6} value={newPassword} onChange={e=>setNewPassword(e.target.value)} className={inputClass} placeholder="No mínimo 6 caracteres" />
             </div>
             <Button type="submit" className="w-full py-4 text-lg mt-4 shadow-xl">Salvar Senha e Entrar</Button>
           </form>
        )}
      </div>
    </div>
  );
};

const Profile = ({ currentUser, teams, matches, competitions }) => {
  const userTeams = teams.filter(t => t.ownerId === currentUser.id);

  if (userTeams.length === 0) return (<div className="animate-in fade-in text-center p-12 bg-slate-900 rounded-2xl border border-slate-800"><span className="text-6xl mb-4 block">😢</span><h2 className="text-2xl font-bold text-white mb-2">Você não tem um time</h2><p className="text-slate-400">Peça para um líder cadastrar seu time.</p></div>);

  return (
    <div className="animate-in fade-in duration-500 space-y-6">
      <div className="flex items-center gap-4 bg-slate-900 p-6 rounded-2xl border border-slate-800">
        <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center text-3xl">👤</div>
        <div><h2 className="text-2xl font-bold text-white">{currentUser.name}</h2><p className="text-emerald-400 font-medium tracking-wide text-sm uppercase mt-1">{currentUser.role === 'leader' ? 'Líder Supremo' : 'Membro Oficial'}</p></div>
      </div>
      <div className="space-y-8">
        {userTeams.map(team => {
          const teamMatches = matches.filter(m => m.status === 'approved' && (m.teamA === team.id || m.teamB === team.id));
          let wins = 0, draws = 0, losses = 0, gf = 0, ga = 0, biggestWin = null, maxGd = -1;
          teamMatches.forEach(m => {
            const isTeamA = m.teamA === team.id; const scoreFor = isTeamA ? m.scoreA : m.scoreB; const scoreAgainst = isTeamA ? m.scoreB : m.scoreA;
            gf += scoreFor; ga += scoreAgainst;
            if (scoreFor > scoreAgainst) {
              wins++; const gd = scoreFor - scoreAgainst;
              if (gd > maxGd) { maxGd = gd; biggestWin = { scoreFor, scoreAgainst, oppId: isTeamA ? m.teamB : m.teamA }; }
            } else if (scoreFor === scoreAgainst) draws++; else losses++;
          });
          const participations = competitions.filter(c => c.teams?.includes(team.id)).map(c => {
            const table = calculateStandings(matches, teams, c.id);
            const rankIndex = table.findIndex(t => t.id === team.id);
            return { compName: c.name, rank: rankIndex !== -1 ? rankIndex + 1 : '-', format: c.format };
          });

          return (
            <div key={team.id} className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden">
              <div className="bg-slate-950/50 p-6 border-b border-slate-800 flex items-center gap-4"><span className="text-5xl">{team.shield}</span><div><h3 className="text-2xl font-bold text-white">{team.name}</h3><p className="text-slate-400">Técnico: <span className="text-slate-300 font-medium">{team.coach}</span></p></div></div>
              <div className="p-6 space-y-8">
                <div>
                  <h4 className="text-lg font-bold text-white mb-4 flex items-center gap-2"><Activity className="text-emerald-500" size={20}/> Estatísticas Históricas</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-center"><p className="text-slate-400 text-sm mb-1">Partidas</p><p className="text-2xl font-bold text-white">{teamMatches.length}</p></div>
                    <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-center"><p className="text-slate-400 text-sm mb-1">Vitórias</p><p className="text-2xl font-bold text-emerald-400">{wins}</p></div>
                    <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-center"><p className="text-slate-400 text-sm mb-1">Aprov.</p><p className="text-2xl font-bold text-amber-400">{teamMatches.length > 0 ? Math.round((wins * 3 + draws) / (teamMatches.length * 3) * 100) : 0}%</p></div>
                    <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-center"><p className="text-slate-400 text-sm mb-1">Gols Marcados</p><p className="text-2xl font-bold text-blue-400">{gf}</p></div>
                  </div>
                </div>
                {biggestWin && (
                  <div className="bg-gradient-to-r from-emerald-900/40 to-slate-900 p-5 rounded-xl border border-emerald-900/50 flex items-center gap-4">
                    <div><p className="text-sm text-emerald-400 font-bold mb-1">🏆 Maior Goleada</p><p className="text-white font-medium text-lg">{team.name} <span className="font-bold text-emerald-400 mx-2">{biggestWin.scoreFor} x {biggestWin.scoreAgainst}</span> {teams.find(t=>t.id === biggestWin.oppId)?.name}</p></div>
                  </div>
                )}
                <div>
                  <h4 className="text-lg font-bold text-white mb-4 flex items-center gap-2"><Trophy className="text-amber-500" size={20}/> Histórico em Competições</h4>
                  {participations.length > 0 ? (
                    <div className="space-y-3">{participations.map((p, i) => <div key={i} className="flex justify-between items-center bg-slate-950 p-4 rounded-xl border border-slate-800"><span className="text-slate-200 font-medium">{p.compName}</span><span className="font-bold text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-lg border border-emerald-500/20">{p.rank}º Lugar</span></div>)}</div>
                  ) : <p className="text-slate-500 text-sm">Sem histórico.</p>}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default function App() {
  const [fbUser, setFbUser] = useState(null);
  const [isFirebaseLoading, setIsFirebaseLoading] = useState(true);
  
  const [users, setUsers] = useState([]);
  const [teams, setTeams] = useState([]);
  const [competitions, setCompetitions] = useState([]);
  const [matches, setMatches] = useState([]);

  const [currentUserId, setCurrentUserId] = useState(() => localStorage.getItem('claKameUserId'));
  const [currentTab, setCurrentTab] = useState('dashboard');
  const [selectedCompId, setSelectedCompId] = useState(null);

  const currentUser = users.find(u => u.id === currentUserId);

  useEffect(() => {
    const initAuth = async () => {
      try {
        // Only attempt anonymous login if a real API key seems to be present.
        // Otherwise, Firebase Auth will throw an error and crash the app state.
        if (firebaseConfig.apiKey !== "demo-api-key-so-app-loads" && !firebaseConfig.apiKey.includes("AIzaSyC...")) {
             await signInAnonymously(auth);
        } else {
             // Mock user state if no real firebase config is present so you can still use the UI
             setFbUser({ uid: 'mock-user-123' });
             setIsFirebaseLoading(false);
             console.warn("Using mock Firebase configuration. Authentication and Database are simulated.");
        }
      } catch (err) { 
          console.error("Erro Auth:", err);
          setIsFirebaseLoading(false); // Stop loading even on error so UI can show
      }
    };
    initAuth();
    
    // Only set up real auth listener if keys are valid
     if (firebaseConfig.apiKey !== "demo-api-key-so-app-loads" && !firebaseConfig.apiKey.includes("AIzaSyC...")) {
        const unsub = onAuthStateChanged(auth, user => { setFbUser(user); });
        return () => unsub();
     }
  }, []);

  useEffect(() => {
    if (!fbUser) return;
    
    // If using fake keys, just load mock data directly and don't try to connect to Firestore
    if (firebaseConfig.apiKey === "demo-api-key-so-app-loads" || firebaseConfig.apiKey.includes("AIzaSyC...")) {
        setUsers(MOCK_USERS);
        setTeams(MOCK_TEAMS);
        setCompetitions(MOCK_COMPETITIONS);
        setMatches(MOCK_MATCHES);
        setIsFirebaseLoading(false);
        return;
    }

    const unsubU = onSnapshot(getPublicPath('users'), snap => setUsers(snap.docs.map(d=>d.data())), err => console.error(err));
    const unsubT = onSnapshot(getPublicPath('teams'), snap => setTeams(snap.docs.map(d=>d.data())), err => console.error(err));
    const unsubC = onSnapshot(getPublicPath('competitions'), snap => setCompetitions(snap.docs.map(d=>d.data())), err => console.error(err));
    const unsubM = onSnapshot(getPublicPath('matches'), snap => setMatches(snap.docs.map(d=>d.data())), err => console.error(err));

    const seedDB = async () => {
      const snap = await getDocs(getPublicPath('users'));
      if (snap.empty) {
        MOCK_USERS.forEach(u => setDoc(getPublicDocPath('users', u.id), u));
        MOCK_TEAMS.forEach(t => setDoc(getPublicDocPath('teams', t.id), t));
        MOCK_COMPETITIONS.forEach(c => setDoc(getPublicDocPath('competitions', c.id), c));
        MOCK_MATCHES.forEach(m => setDoc(getPublicDocPath('matches', m.id), m));
      }
      setIsFirebaseLoading(false);
    };
    seedDB();

    return () => { unsubU(); unsubT(); unsubC(); unsubM(); };
  }, [fbUser]);

  const handleRegister = async (data) => {
    const newUserId = `u${Date.now()}`; const newTeamId = `t${Date.now()}`;
    const fullName = `${data.firstName} ${data.lastName}`;
    const isLeader = ["vitor", "daniel", "don luck", "goku"].some(name => fullName.toLowerCase().includes(name));
    
    const newUser = { id: newUserId, name: fullName, role: isLeader ? 'leader' : 'member', whatsapp: data.whatsapp, password: data.password };
    const newTeam = { id: newTeamId, name: data.teamName, ownerId: newUserId, shield: '🛡️', coach: fullName, whatsapp: data.whatsapp };
    
    await setDoc(getPublicDocPath('users', newUserId), newUser);
    await setDoc(getPublicDocPath('teams', newTeamId), newTeam);
    
    localStorage.setItem('claKameUserId', newUserId);
    setCurrentUserId(newUserId);
    setCurrentTab('dashboard');
  };

  const handleLogin = (userId, rememberMe) => {
    if (rememberMe) localStorage.setItem('claKameUserId', userId);
    setCurrentUserId(userId);
    setCurrentTab('dashboard');
  };

  const handleLogout = () => { setCurrentUserId(null); localStorage.removeItem('claKameUserId'); };

  const handleEditTeam = async (updatedTeam) => { await updateDoc(getPublicDocPath('teams', updatedTeam.id), updatedTeam); };

  const handleReleaseRound = async (compId, roundId) => {
    const comp = competitions.find(c => c.id === compId);
    if (!comp) return;
    const rounds = comp.rounds.map(r => r.id === roundId ? { ...r, status: 'released' } : r);
    await updateDoc(getPublicDocPath('competitions', compId), { rounds });
  };

  const handleCreateComp = async (c) => { await setDoc(getPublicDocPath('competitions', c.id), c); setCurrentTab('competitions'); };
  const handleCreateTeam = async (t) => { await setDoc(getPublicDocPath('teams', t.id), t); setCurrentTab('teams_list'); };
  const handleSubmitMatch = async (m) => { await setDoc(getPublicDocPath('matches', m.id), m); setCurrentTab('dashboard'); };
  const handleUpdateMatchStatus = async (id, st) => { await updateDoc(getPublicDocPath('matches', id), { status: st }); };

  if (isFirebaseLoading) return <div className="min-h-screen bg-slate-950 flex items-center justify-center text-emerald-500"><div className="animate-spin text-5xl">🐢</div><span className="ml-4 text-white">Conectando à Nuvem...</span></div>;
  if (!currentUserId || !currentUser) return <LoginScreen users={users} onLogin={handleLogin} onRegister={handleRegister} />;

  const TABS = [
    { id: 'dashboard', label: 'Início', icon: Home },
    { id: 'profile', label: 'Meu Perfil', icon: User },
    { id: 'teams_list', label: 'Times', icon: Shield },
    { id: 'competitions', label: 'Competições', icon: Medal },
    { id: 'submit', label: 'Registrar Jogo', icon: Camera },
    ...(currentUser.role === 'leader' ? [
      { id: 'validation', label: 'Validação', icon: CheckSquare },
      { id: 'create_comp', label: 'Nova Comp', icon: PlusCircle },
      { id: 'create_team', label: 'Novo Time', icon: Users }
    ] : []),
  ];

  const renderContent = () => {
    switch (currentTab) {
      case 'dashboard': return <Dashboard matches={matches} teams={teams} />;
      case 'profile': return <Profile currentUser={currentUser} teams={teams} matches={matches} competitions={competitions} />;
      case 'teams_list': return <TeamsList teams={teams} currentUser={currentUser} onEditTeam={handleEditTeam} />;
      case 'competitions': return <CompetitionsList competitions={competitions} teams={teams} currentUser={currentUser} onSelectComp={id => {setSelectedCompId(id); setCurrentTab('comp_details');}} />;
      case 'comp_details': return <CompetitionDetails comp={competitions.find(c=>c.id===selectedCompId)} teams={teams} matches={matches} currentUser={currentUser} onBack={()=>setCurrentTab('competitions')} onReleaseRound={handleReleaseRound} />;
      case 'submit': return <SubmitMatch teams={teams} competitions={competitions} matches={matches} onSubmit={handleSubmitMatch} currentUser={currentUser} />;
      case 'validation': return <ValidationPanel matches={matches} teams={teams} onUpdateStatus={handleUpdateMatchStatus} />;
      case 'create_comp': return <CreateCompetition teams={teams} onCreate={handleCreateComp} />;
      case 'create_team': return <CreateTeam onCreate={handleCreateTeam} />;
      default: return null;
    }
  };

  const pendingCount = currentUser.role === 'leader' ? matches.filter(m=>m.status==='pending').length : 0;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans flex flex-col md:flex-row">
      <aside className="w-full md:w-64 bg-slate-900 border-b md:border-b-0 md:border-r border-slate-800 flex flex-col shrink-0">
        <div className="p-6 flex items-center gap-3">
          <span className="text-3xl">🐢</span><div><h1 className="font-bold text-white text-xl">Clã Kame</h1><p className="text-xs text-emerald-400">Ao Vivo • Nuvem</p></div>
        </div>
        <nav className="flex-1 px-4 pb-4 overflow-y-auto flex md:flex-col gap-2 overflow-x-auto">
          {TABS.map(tab => {
            const isActive = currentTab === tab.id || (tab.id === 'competitions' && currentTab === 'comp_details');
            return (
              <button key={tab.id} onClick={() => setCurrentTab(tab.id)} className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all whitespace-nowrap ${isActive ? 'bg-emerald-500/10 text-emerald-400 font-medium' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'}`}>
                <tab.icon size={20} /> <span>{tab.label}</span>
                {tab.id === 'validation' && pendingCount > 0 && <span className="ml-auto bg-amber-500 text-amber-950 text-xs font-bold px-2 py-0.5 rounded-full">{pendingCount}</span>}
              </button>
            );
          })}
        </nav>
        <div className="p-4 border-t border-slate-800 hidden md:block">
          <div className="bg-slate-950 rounded-xl p-4 border border-slate-800/50">
            <p className="font-medium text-white truncate text-sm">{currentUser.name}</p>
            <p className="text-xs text-slate-500 mb-3">{currentUser.role === 'leader' ? 'Líder Supremo' : 'Membro Oficial'}</p>
            <button onClick={handleLogout} className="w-full flex items-center justify-center gap-2 text-xs text-slate-400 hover:text-white py-2 rounded-lg hover:bg-slate-800 transition-colors"><LogOut size={14} /> Sair</button>
          </div>
        </div>
      </aside>
      <main className="flex-1 p-4 md:p-8 overflow-y-auto"><div className="max-w-5xl mx-auto pb-20 md:pb-0">{renderContent()}</div></main>
    </div>
  );
}

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

// MOCKS PARA TESTE (SEM FIREBASE ATIVO NO PREVIEW)
const MOCK_USERS = [
  { id: 'u1', name: 'Goku', role: 'leader', whatsapp: '11999999999', password: '123' },
  { id: 'u2', name: 'Vegeta', role: 'member', whatsapp: '11988888888', password: '123' },
  { id: 'u3', name: 'Gohan', role: 'member', whatsapp: '11977777777', password: '123' },
];

const MOCK_TEAMS = [
  { id: 't1', name: 'Kame FC', ownerId: 'u1', shield: '🐢', coach: 'Goku', whatsapp: '11999999999' },
  { id: 't2', name: 'Capsule Corp', ownerId: 'u2', shield: '💊', coach: 'Vegeta', whatsapp: '11988888888' },
  { id: 't3', name: 'Sayaman United', ownerId: 'u3', shield: '🦸', coach: 'Gohan', whatsapp: '11977777777' }
];

const MOCK_COMPETITIONS = [
  { 
    id: 'c1', 
    name: 'Liga DLS Clã Kame - Temporada 1', 
    status: 'active', 
    format: 'league', 
    teams: ['t1', 't2', 't3'],
    rounds: [
      {
        id: 'r1', number: 1, status: 'released',
        matches: [
          { id: 'm1_c1_r1', teamA: 't1', teamB: 't2', status: 'pending_play' }
        ]
      }
    ]
  }
];

const MOCK_MATCHES = [];

// ==========================================
// 2. FUNÇÕES E COMPONENTES AUXILIARES
// ==========================================
const ROLE_NAMES = {
  leader: 'Líder Supremo',
  kaioh: 'Senhor Kaioh',
  member: 'Membro Oficial'
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

// ==========================================
// TELA DE LOGIN BLINDADA
// ==========================================
const LoginScreen = ({ users, onLogin, onFirstAccess }) => {
  const [whatsapp, setWhatsapp] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    
    // Formata o número tirando espaços e parênteses
    const cleanPhone = whatsapp.replace(/\D/g, '');
    const foundUser = users.find(u => u.whatsapp === cleanPhone);

    if (!foundUser) {
      setError('Acesso negado. Seu perfil ainda não foi criado por um Líder do clã.');
      return;
    }

    if (!foundUser.password) {
      // Primeiro acesso: o usuário não tem senha ainda, a que ele digitar agora será salva
      if (password.length < 6) {
        setError('Para o seu primeiro acesso, crie uma senha segura com no mínimo 6 caracteres.');
        return;
      }
      onFirstAccess(foundUser.id, password);
      onLogin({ ...foundUser, password });
    } else {
      // Acesso normal
      if (foundUser.password === password) {
        onLogin(foundUser);
      } else {
        setError('Senha incorreta. Tente novamente.');
      }
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="bg-slate-900 p-6 md:p-8 rounded-2xl border border-slate-800 max-w-md w-full shadow-2xl">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <Shield size={64} className="text-emerald-500 drop-shadow-[0_0_15px_rgba(16,185,129,0.3)]" />
          </div>
          <h1 className="text-3xl font-black text-white tracking-tight">Clã Kame</h1>
          <p className="text-slate-400 mt-2 text-sm">Acesso Restrito aos Técnicos</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 animate-in fade-in duration-300">
          {error && <div className="text-red-400 text-sm bg-red-500/10 p-4 rounded-lg border border-red-500/20 font-medium text-center">{error}</div>}
          
          <div className="bg-emerald-500/5 border border-emerald-500/20 p-3 rounded-xl mb-6">
            <p className="text-xs text-emerald-400/80 text-center leading-relaxed">
              <span className="font-bold text-emerald-400">Primeiro acesso?</span><br/>
              Digite o WhatsApp cadastrado pelo seu líder e crie a sua senha agora mesmo!
            </p>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-400 mb-1.5 block uppercase tracking-wider">WhatsApp (Apenas Números)</label>
            <input required type="tel" value={whatsapp} onChange={e=>setWhatsapp(e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3.5 text-white outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-base font-medium transition-all" placeholder="Ex: 11999999999" />
          </div>
          <div>
            <label className="text-xs font-bold text-slate-400 mb-1.5 block uppercase tracking-wider">Senha</label>
            <input required type="password" value={password} onChange={e=>setPassword(e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3.5 text-white outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-base font-medium transition-all" placeholder="••••••••" />
          </div>
          
          <Button type="submit" className="w-full mt-4 py-4 text-lg font-bold shadow-xl shadow-emerald-900/20">Entrar na Arena</Button>
        </form>
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
        <p className="text-slate-400">Peça para um líder criar o seu perfil no Clã.</p>
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

const MembersList = ({ users, teams, currentUser, onExpelUser, showToast }) => {
  const [expelConfirmId, setExpelConfirmId] = useState(null);
  
  return (
    <div className="animate-in fade-in duration-500 space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <Crown className="text-emerald-500" size={28} />
        <h2 className="text-2xl font-bold text-white">Gestão de Técnicos</h2>
      </div>
      
      <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-x-auto shadow-xl">
        <table className="w-full text-left text-sm whitespace-nowrap">
          <thead className="bg-slate-950/50 text-slate-400 font-medium border-b border-slate-800">
            <tr>
              <th className="p-4">Técnico</th>
              <th className="p-4">Time Vinculado</th>
              <th className="p-4">WhatsApp (Login)</th>
              <th className="p-4">Cargo</th>
              <th className="p-4 text-center">Status / Ação</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/50">
            {users.map(user => {
              const userTeam = teams.find(t => t.ownerId === user.id);
              const isMe = user.id === currentUser.id;

              return (
                <tr key={user.id} className="hover:bg-slate-800/50 transition-colors">
                  <td className="p-4 font-bold text-white">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-xs">👤</div>
                      <div className="flex flex-col">
                        <span>{user.name} {isMe && <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded ml-1">Você</span>}</span>
                        {!user.password && <span className="text-[10px] text-amber-500">⏳ Aguardando 1º Acesso</span>}
                      </div>
                    </div>
                  </td>
                  
                  <td className="p-4 text-emerald-400 font-medium">
                    {userTeam ? (
                      <div className="flex items-center gap-2">
                        <ShieldDisplay shield={userTeam.shield} size="small" /> 
                        <span>{userTeam.name}</span>
                      </div>
                    ) : (
                      <span className="text-slate-500 text-xs bg-slate-950 px-2 py-1 rounded">Sem time</span>
                    )}
                  </td>

                  <td className="p-4 text-slate-300 font-mono text-xs">{user.whatsapp}</td>
                  
                  <td className="p-4">
                    {user.role === 'leader' && <span className="inline-flex items-center gap-1 text-[10px] uppercase font-bold text-amber-400 bg-amber-500/10 px-2 py-1 rounded border border-amber-500/20"><Crown size={12}/> Líder Supremo</span>}
                    {user.role === 'kaioh' && <span className="inline-flex items-center gap-1 text-[10px] uppercase font-bold text-purple-400 bg-purple-500/10 px-2 py-1 rounded border border-purple-500/20"><Star size={12}/> Senhor Kaioh</span>}
                    {user.role === 'member' && <span className="inline-flex items-center gap-1 text-[10px] uppercase font-bold text-slate-400 bg-slate-500/10 px-2 py-1 rounded border border-slate-500/20"><User size={12}/> Membro</span>}
                  </td>
                  
                  <td className="p-4 text-center">
                    {isMe ? (
                      <span className="text-xs text-slate-500 italic">Intocável</span>
                    ) : expelConfirmId === user.id ? (
                      <div className="flex items-center justify-center gap-1">
                        <button onClick={() => { onExpelUser(user.id); showToast('Técnico expulso e bloqueado!', 'success'); setExpelConfirmId(null); }} className="bg-red-600 hover:bg-red-500 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-colors shadow-lg shadow-red-900/50">Confirmar Expulsão</button>
                        <button onClick={() => setExpelConfirmId(null)} className="bg-slate-700 hover:bg-slate-600 text-white px-3 py-1.5 rounded-lg text-xs transition-colors">Cancelar</button>
                      </div>
                    ) : (
                      <button 
                        onClick={() => setExpelConfirmId(user.id)}
                        className="bg-slate-950 hover:bg-red-500/20 text-red-500 border border-slate-800 hover:border-red-500/30 px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 mx-auto"
                      >
                        <XCircle size={14} /> Expulsar
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const CreateTeamFull = ({ onCreate, showToast }) => {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [teamName, setTeamName] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [role, setRole] = useState('member');
  
  const handleSubmit = (e) => {
    e.preventDefault();
    const cleanWhatsapp = whatsapp.replace(/\D/g, '');
    if(!teamName || !firstName || !cleanWhatsapp) return;
    
    // Gera ID único
    const newUserId = `u${Date.now()}`;
    const fullName = `${firstName} ${lastName}`.trim();

    onCreate({ 
      user: {
        id: newUserId,
        name: fullName,
        role: role,
        whatsapp: cleanWhatsapp,
        password: null // IMPORTANTÍSSIMO: Null significa que o acesso não tem senha, ele criará no 1º login
      },
      team: {
        id: `t${Date.now()}`,
        name: teamName,
        coach: fullName,
        whatsapp: cleanWhatsapp,
        ownerId: newUserId,
        shield: '🛡️'
      }
    });

    const siteUrl = window.location.origin; 
    const msg = `Fala ${firstName}! Tudo certo? 🐉🥋\n\nO seu perfil e o time *${teamName}* acabam de ser criados no Clã Kame! 🐢🔥\n\nPara acessar o seu Quartel General e registrar suas partidas, clique no link abaixo 👇\n\n🔗 *Link:* ${siteUrl}\n\n⚠️ *SEU PRIMEIRO ACESSO:* ⚠️\n1. Na tela inicial, coloque o seu WhatsApp: *${cleanWhatsapp}*\n2. No campo de Senha, *INVENTE UMA SENHA AGORA MESMO*! 🔐\n\nO sistema vai salvar a senha que você digitar como a sua senha oficial para todas as próximas vezes.\n\nVamos pro jogo! ⚡🎮`;
    
    window.open(`https://wa.me/${cleanWhatsapp}?text=${encodeURIComponent(msg)}`, '_blank');

    showToast('Técnico cadastrado com sucesso!', 'success');
    setFirstName(''); setLastName(''); setTeamName(''); setWhatsapp(''); setRole('member');
  };

  return (
    <div className="max-w-2xl mx-auto animate-in fade-in pb-12">
      <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2"><Users className="text-emerald-500"/> Cadastrar Novo Técnico</h2>
      <div className="bg-emerald-500/10 border border-emerald-500/20 p-5 rounded-xl mb-6 text-sm text-emerald-400">
        <p className="font-bold flex items-center gap-2 text-base"><Lock size={18}/> Liberação de Acesso Segura</p>
        <p className="mt-2 text-emerald-400/80 leading-relaxed">
          Preencha os dados abaixo. O sistema criará o perfil do técnico e o time dele, <b>liberando imediatamente a entrada dele no painel</b> através do número de WhatsApp. Ele definirá a própria senha quando fizer o primeiro login.
        </p>
      </div>
      
      <form onSubmit={handleSubmit} className="bg-slate-900 p-6 md:p-8 rounded-2xl border border-slate-800 space-y-5 shadow-2xl">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div><label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase">Nome do Técnico</label><input type="text" placeholder="Ex: Mestre" value={firstName} onChange={e=>setFirstName(e.target.value)} className="w-full bg-slate-950 border border-slate-700 focus:border-emerald-500 rounded-xl p-3 text-white outline-none transition-colors" required /></div>
          <div><label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase">Sobrenome</label><input type="text" placeholder="Ex: Kame" value={lastName} onChange={e=>setLastName(e.target.value)} className="w-full bg-slate-950 border border-slate-700 focus:border-emerald-500 rounded-xl p-3 text-white outline-none transition-colors" /></div>
        </div>
        
        <div><label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase">Nome do Time</label><input type="text" placeholder="Ex: Kame FC" value={teamName} onChange={e=>setTeamName(e.target.value)} className="w-full bg-slate-950 border border-slate-700 focus:border-emerald-500 rounded-xl p-3 text-white outline-none transition-colors" required /></div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div><label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase">WhatsApp (Chave de Login)</label><input type="tel" placeholder="Ex: 11999999999" value={whatsapp} onChange={e=>setWhatsapp(e.target.value)} className="w-full bg-slate-950 border border-slate-700 focus:border-emerald-500 rounded-xl p-3 text-white outline-none transition-colors font-mono" required /></div>
          <div>
            <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase">Cargo no Clã</label>
            <select value={role} onChange={e=>setRole(e.target.value)} className="w-full bg-slate-950 border border-slate-700 focus:border-emerald-500 rounded-xl p-3 text-white outline-none cursor-pointer">
              <option value="member">Membro Oficial (Padrão)</option>
              <option value="kaioh">Senhor Kaioh (Sub-Líder)</option>
              <option value="leader">Líder Supremo</option>
            </select>
          </div>
        </div>

        <Button type="submit" className="w-full py-4 text-lg mt-6 shadow-emerald-900/50 shadow-xl flex items-center justify-center gap-2">
          <CheckCircle size={20} /> Liberar Acesso e Enviar Convite
        </Button>
      </form>
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

const TeamsList = ({ teams, currentUser, onEditTeam }) => {
  const [editingId, setEditingId] = useState(null);
  const [editData, setEditData] = useState({ name: '', coach: '', whatsapp: '', shield: '' });

  const handleWhatsApp = (phone) => {
    if (!phone) return;
    const cleanPhone = phone.replace(/\D/g, ''); 
    window.open(`https://wa.me/${cleanPhone}`, '_blank');
  };

  const startEdit = (team) => {
    setEditingId(team.id);
    setEditData({ name: team.name, coach: team.coach || '', whatsapp: team.whatsapp || '', shield: team.shield || '🛡️' });
  };

  const saveEdit = (team) => {
    if (!editData.name || !editData.coach || !editData.whatsapp) return;
    onEditTeam({ ...team, ...editData });
    setEditingId(null);
  };

  return (
    <div className="animate-in fade-in duration-500">
      <div className="flex items-center gap-3 mb-6">
        <Shield className="text-emerald-500" size={28} />
        <h2 className="text-2xl font-bold text-white">Mural de Times</h2>
      </div>
      
      {teams.length === 0 ? (
        <div className="bg-slate-900 p-8 rounded-2xl border border-slate-800 text-center text-slate-500">
          Nenhum time registrado no clã ainda.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {teams.map(team => {
            if (editingId === team.id) {
              return (
                <div key={team.id} className="bg-slate-900 p-6 rounded-2xl border border-emerald-500/50 shadow-[0_0_15px_rgba(16,185,129,0.1)] flex flex-col justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <div className="shrink-0 pt-2"><ShieldDisplay shield={editData.shield} size="large" /></div>
                    <div className="flex-1 space-y-2 w-full">
                      <input type="text" value={editData.name} onChange={e=>setEditData({...editData, name: e.target.value})} placeholder="Nome do Time" className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white text-sm outline-none focus:border-emerald-500 transition-colors" />
                      <input type="text" value={editData.coach} onChange={e=>setEditData({...editData, coach: e.target.value})} placeholder="Nome do Técnico" className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white text-sm outline-none focus:border-emerald-500 transition-colors" />
                      <input type="text" value={editData.whatsapp} onChange={e=>setEditData({...editData, whatsapp: e.target.value})} placeholder="WhatsApp" className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white text-sm outline-none focus:border-emerald-500 transition-colors" />
                    </div>
                  </div>
                  <div className="flex gap-2 mt-2">
                    <Button variant="outline" onClick={() => setEditingId(null)} className="flex-1 py-2 text-slate-400 hover:text-white"><X size={16}/> Cancelar</Button>
                    <Button onClick={() => saveEdit(team)} className="flex-1 py-2"><Save size={16}/> Salvar</Button>
                  </div>
                </div>
              );
            }

            return (
              <div key={team.id} className="relative bg-slate-900 p-6 rounded-2xl border border-slate-800 hover:border-slate-700 transition-all flex flex-col justify-between gap-4 group">
                {currentUser?.role === 'leader' && (
                  <button onClick={() => startEdit(team)} className="absolute top-4 right-4 text-slate-500 hover:text-emerald-400 opacity-0 group-hover:opacity-100 transition-opacity p-2 rounded-lg hover:bg-slate-800" title="Editar Time">
                    <Edit size={18} />
                  </button>
                )}
                <div className="flex items-center gap-4">
                  <div className="shrink-0"><ShieldDisplay shield={team.shield} size="large" /></div>
                  <div>
                    <h3 className="text-xl font-bold text-white pr-8">{team.name}</h3>
                    <p className="text-sm text-slate-400">Técnico: <span className="text-slate-300 font-medium">{team.coach || 'Não informado'}</span></p>
                  </div>
                </div>
                <Button 
                  onClick={() => handleWhatsApp(team.whatsapp)}
                  className="w-full bg-emerald-600 hover:bg-emerald-500 text-white mt-2"
                  disabled={!team.whatsapp}
                >
                  <MessageCircle size={18} /> Chamar pra Batalha
                </Button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

const CreateCompetition = ({ teams, onCreate, showToast }) => {
  const [name, setName] = useState('');
  const [format, setFormat] = useState('league');
  const [teamCount, setTeamCount] = useState('');
  const [deadline, setDeadline] = useState('');
  const [selectedTeams, setSelectedTeams] = useState([]);
  const [error, setError] = useState('');

  const toggleTeam = (teamId) => {
    if (selectedTeams.includes(teamId)) {
      setSelectedTeams(selectedTeams.filter(id => id !== teamId));
    } else {
      setSelectedTeams([...selectedTeams, teamId]);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name || !format || !teamCount || !deadline) {
      setError('Por favor, preencha todos os campos do formulário.');
      return;
    }
    
    if (selectedTeams.length !== parseInt(teamCount)) {
      setError(`Atenção: O formato exige ${teamCount} times, mas você selecionou ${selectedTeams.length}.`);
      return;
    }

    setError('');

    const newCompId = `c${Date.now()}`;
    const generatedRounds = generateRoundRobin(selectedTeams, newCompId);

    onCreate({ 
      id: newCompId, 
      name, 
      format, 
      deadline,
      status: 'active', 
      teams: selectedTeams, 
      rounds: generatedRounds
    });
    
    showToast(`Competição criada com sucesso! Foram geradas ${generatedRounds.length} rodadas.`, "success");
  };

  return (
    <div className="max-w-3xl mx-auto animate-in fade-in pb-12">
      <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
        <PlusCircle className="text-emerald-500"/> Nova Competição Automática
      </h2>
      
      <form onSubmit={handleSubmit} className="bg-slate-900 p-6 md:p-8 rounded-2xl border border-slate-800 space-y-6 shadow-xl">
        {error && (
          <div className="bg-amber-500/10 border border-amber-500/50 text-amber-400 p-4 rounded-xl flex items-center gap-3">
            <AlertCircle size={20} />
            <p className="text-sm font-medium">{error}</p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-400">Nome do Campeonato</label>
            <input type="text" placeholder="Ex: Liga de Inverno" value={name} onChange={e=>setName(e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-white focus:ring-2 focus:ring-emerald-500 outline-none" required />
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-400">Formato</label>
            <select value={format} onChange={e=>setFormat(e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-white focus:ring-2 focus:ring-emerald-500 outline-none">
              <option value="league">Pontos Corridos (Sorteio Automático)</option>
              <option value="cup">Mata-Mata (Copa)</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-400">Qtd. de Times</label>
            <input type="number" min="2" placeholder="Ex: 8" value={teamCount} onChange={e=>setTeamCount(e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-white focus:ring-2 focus:ring-emerald-500 outline-none" required />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-400">Prazo de Conclusão</label>
            <input type="date" value={deadline} onChange={e=>setDeadline(e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-slate-300 focus:ring-2 focus:ring-emerald-500 outline-none" required />
          </div>
        </div>

        <div className="pt-4 border-t border-slate-800">
          <div className="flex justify-between items-end mb-4">
            <label className="text-sm font-medium text-slate-400">Selecione as Equipes Participantes</label>
            <span className={`text-xs px-2 py-1 rounded font-bold ${selectedTeams.length === parseInt(teamCount || 0) ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'}`}>{selectedTeams.length} Marcadas</span>
          </div>
          {teams.length === 0 ? (
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
                    <span className={`font-medium text-xs md:text-sm truncate ${isSelected ? 'text-emerald-400' : 'text-slate-300'}`}>{team.name}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <Button type="submit" className="w-full py-4 text-lg mt-4 shadow-emerald-900/50 shadow-xl">
           <Trophy size={20} /> Sortear Tabela e Lançar Competição
        </Button>
      </form>
    </div>
  );
};

const Dashboard = ({ matches, teams }) => {
  const recentMatches = [...matches].reverse().slice(0, 5);
  const getTeam = (id) => teams.find(t => t.id === id);
  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="bg-gradient-to-r from-emerald-900/50 to-slate-900 p-6 rounded-2xl border border-emerald-900/50">
        <h2 className="text-2xl font-bold text-white mb-2">QG Clã Kame</h2>
        <p className="text-slate-400">Acompanhe os resultados da arena em tempo real.</p>
      </div>
      <div>
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2"><Activity size={20} className="text-emerald-500" /> Últimos Resultados</h3>
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
                    <span className="text-[10px] md:text-xs text-slate-500 font-bold">X</span>
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

const CompetitionsList = ({ competitions, teams, currentUser, onSelectComp }) => {
  const userTeamIds = teams.filter(t => t.ownerId === currentUser.id).map(t => t.id);
  const visibleComps = competitions.filter(c => currentUser.role === 'leader' || c.teams?.some(t => userTeamIds.includes(t)));

  return (
    <div className="animate-in fade-in duration-500">
      <div className="flex items-center gap-3 mb-6"><Medal className="text-emerald-500" size={28} /><h2 className="text-2xl font-bold text-white">Competições</h2></div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {visibleComps.length === 0 && <p className="text-slate-500 col-span-2">Nenhuma competição.</p>}
        {visibleComps.map(comp => {
          const isPart = comp.teams?.some(t => userTeamIds.includes(t));
          return (
            <div key={comp.id} onClick={() => onSelectComp(comp.id)} className={`cursor-pointer bg-slate-900 p-6 rounded-2xl border transition-all hover:scale-[1.02] shadow-lg ${currentUser.role === 'leader' && isPart ? 'border-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.15)]' : isPart ? 'border-emerald-500/50' : 'border-slate-800 hover:border-slate-700'}`}>
              <div className="flex justify-between items-start mb-3">
                <h3 className="text-xl font-bold text-white leading-tight">{comp.name}</h3>
                {isPart && <span className={`text-[10px] px-2 py-1 rounded font-bold uppercase tracking-wider shrink-0 ${currentUser.role === 'leader' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'}`}>Sua Equipe</span>}
              </div>
              <p className="text-sm text-slate-400 mb-4 flex items-center gap-2"><Trophy size={14} className="text-slate-500"/> {comp.format === 'league' ? 'Liga (Pontos Corridos)' : 'Mata-Mata'} • {comp.teams?.length || 0} times</p>
              <div className="text-xs text-emerald-400 flex justify-between items-center font-bold uppercase tracking-wider"><span>Ver Tabela e Jogos ➔</span></div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const ValidationPanel = ({ matches, teams, onUpdateStatus, showToast }) => {
  const pending = matches.filter(m => m.status === 'pending');
  const getTeam = (id) => teams.find(t => t.id === id);
  return (
    <div className="animate-in fade-in">
      <div className="flex items-center justify-between mb-6"><h2 className="text-2xl font-bold text-white flex items-center gap-2"><CheckSquare className="text-amber-500" /> Validação de Resultados</h2><span className="bg-amber-500/20 text-amber-400 px-3 py-1 rounded-full text-sm font-bold shadow-lg shadow-amber-900/20">{pending.length} Pendentes</span></div>
      {pending.length === 0 ? (
        <div className="bg-slate-900 p-12 rounded-2xl border border-slate-800 text-center"><CheckCircle className="text-emerald-500 mx-auto mb-4" size={48} /><p className="text-slate-400">Excelente! Nenhum jogo aguardando validação.</p></div>
      ) : (
        <div className="grid gap-6">
          {pending.map(m => (
            <div key={m.id} className="bg-slate-900 p-5 md:p-6 rounded-2xl border border-slate-800 shadow-xl flex flex-col gap-4">
               <div className="flex flex-col items-center gap-3 w-full bg-slate-950 p-4 rounded-xl border border-slate-800/50">
                  <div className="flex items-center justify-between w-full gap-2">
                    <div className="flex items-center gap-2 flex-1 min-w-0 justify-start">
                      <div className="shrink-0"><ShieldDisplay shield={getTeam(m.teamA)?.shield} size="normal" /></div>
                      <span className="font-bold text-sm md:text-base text-white truncate">{getTeam(m.teamA)?.name}</span>
                    </div>

                    <div className="flex items-center justify-center gap-2 px-3 py-1.5 bg-slate-900 rounded-lg border border-slate-700 shrink-0">
                      <span className="font-bold text-xl md:text-2xl text-emerald-400">{m.scoreA}</span>
                      <span className="text-[10px] md:text-xs text-slate-500 font-bold mx-1">X</span>
                      <span className="font-bold text-xl md:text-2xl text-emerald-400">{m.scoreB}</span>
                    </div>

                    <div className="flex items-center gap-2 flex-1 min-w-0 justify-end">
                      <span className="font-bold text-sm md:text-base text-white truncate text-right">{getTeam(m.teamB)?.name}</span>
                      <div className="shrink-0"><ShieldDisplay shield={getTeam(m.teamB)?.shield} size="normal" /></div>
                    </div>
                  </div>
              </div>
              <div className="flex justify-end gap-2 mt-2">
                <Button variant="outline" className="border-red-500/50 text-red-400 py-2 px-6" onClick={() => {onUpdateStatus(m.id, 'rejected'); showToast("Jogo Rejeitado!", "error");}}><XCircle size={16}/> Rejeitar</Button>
                <Button onClick={() => {onUpdateStatus(m.id, 'approved'); showToast("Aprovado! Pontos Computados.", "success");}} className="py-2 px-6 shadow-emerald-900/50"><CheckCircle size={16}/> Aprovar Partida</Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [currentTab, setCurrentTab] = useState('dashboard');
  const [selectedCompId, setSelectedCompId] = useState(null);
  
  const [users, setUsers] = useState(MOCK_USERS);
  const [matches, setMatches] = useState(MOCK_MATCHES);
  const [teams, setTeams] = useState(MOCK_TEAMS);
  const [competitions, setCompetitions] = useState(MOCK_COMPETITIONS);

  const [toastMessage, setToastMessage] = useState(null);

  const showToast = (text, type = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Efeito de segurança: Se o usuário logado for deletado/expulso, ele é deslogado instantaneamente
  useEffect(() => {
    if (currentUser) {
      const stillExists = users.find(u => u.id === currentUser.id);
      if (!stillExists) {
        setCurrentUser(null);
      }
    }
  }, [users, currentUser]);

  const handleReleaseRound = (compId, roundId) => {
    setCompetitions(prev => prev.map(c => {
      if (c.id !== compId) return c;
      return {
        ...c,
        rounds: c.rounds.map(r => r.id === roundId ? { ...r, status: 'released' } : r)
      };
    }));
  };

  const handleSelectComp = (id) => {
    setSelectedCompId(id);
    setCurrentTab('comp_details');
  };

  const handleEditTeam = (updatedTeam) => {
    setTeams(prev => prev.map(t => t.id === updatedTeam.id ? updatedTeam : t));
  };

  const handleCreateTeamAndUser = ({ user, team }) => {
    setUsers([...users, user]);
    setTeams([...teams, team]);
    setCurrentTab('members_list');
  };

  const handleExpelUser = (userId) => {
    if (currentUser && userId === currentUser.id) {
      showToast("Você não pode se expulsar!", "error");
      return;
    }
    // Remove o usuário E o time associado a ele
    setUsers(users.filter(u => u.id !== userId));
    setTeams(teams.filter(t => t.ownerId !== userId));
  };

  const handleFirstAccess = (userId, newPassword) => {
    setUsers(users.map(u => u.id === userId ? { ...u, password: newPassword } : u));
    showToast("Senha registrada com sucesso!", "success");
  };

  // TELA DE LOGIN BLINDADA
  if (!currentUser) {
    return <LoginScreen users={users} onLogin={u => { setCurrentUser(u); setCurrentTab('dashboard'); }} onFirstAccess={handleFirstAccess} />;
  }

  const TABS = [
    { id: 'dashboard', label: 'Início', icon: Home },
    { id: 'profile', label: 'Meu Perfil', icon: User },
    { id: 'teams_list', label: 'Times', icon: Shield },
    { id: 'competitions', label: 'Competições', icon: Medal },
    { id: 'submit', label: 'Registrar', icon: Camera },
    ...(currentUser.role === 'leader' ? [
      { id: 'validation', label: 'Validação', icon: CheckSquare },
      { id: 'members_list', label: 'Técnicos (Acessos)', icon: Crown },
      { id: 'create_comp', label: 'Nova Comp', icon: PlusCircle },
      { id: 'create_team', label: 'Convidar Técnico', icon: Users }
    ] : []),
  ];

  const renderContent = () => {
    switch (currentTab) {
      case 'dashboard': return <Dashboard matches={matches} teams={teams} />;
      case 'profile': return <Profile currentUser={currentUser} teams={teams} matches={matches} competitions={competitions} />;
      case 'teams_list': return <TeamsList teams={teams} currentUser={currentUser} onEditTeam={handleEditTeam} />;
      case 'competitions': return <CompetitionsList competitions={competitions} teams={teams} currentUser={currentUser} onSelectComp={handleSelectComp} />;
      case 'comp_details': return <CompetitionDetails comp={competitions.find(c=>c.id===selectedCompId)} teams={teams} matches={matches} currentUser={currentUser} onBack={()=>setCurrentTab('competitions')} onReleaseRound={handleReleaseRound} />;
      case 'submit': return <SubmitMatch teams={teams} competitions={competitions} matches={matches} onSubmit={m => { setMatches([...matches, { ...m, id: Date.now().toString() }]); setCurrentTab('dashboard'); }} currentUser={currentUser} showToast={showToast} />;
      case 'validation': return <ValidationPanel matches={matches} teams={teams} onUpdateStatus={(id, st) => setMatches(matches.map(m => m.id === id ? { ...m, status: st } : m))} showToast={showToast} />;
      case 'create_comp': return <CreateCompetition teams={teams} onCreate={c => { setCompetitions([...competitions, c]); setCurrentTab('competitions'); }} showToast={showToast} />;
      case 'create_team': return <CreateTeamFull onCreate={handleCreateTeamAndUser} showToast={showToast} />;
      case 'members_list': return <MembersList users={users} teams={teams} currentUser={currentUser} onExpelUser={handleExpelUser} showToast={showToast} />;
      default: return <Dashboard matches={matches} teams={teams} />;
    }
  };

  const pendingCount = currentUser.role === 'leader' ? matches.filter(m=>m.status==='pending').length : 0;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans flex flex-col md:flex-row relative">
      
      {/* Toast Notification global */}
      {toastMessage && (
        <div className={`fixed top-4 right-4 z-50 px-6 py-3 rounded-xl shadow-2xl flex items-center gap-3 animate-in slide-in-from-top-4 ${toastMessage.type === 'error' ? 'bg-red-950 border border-red-500 text-red-100' : 'bg-slate-800 border border-emerald-500 text-white'}`}>
          {toastMessage.type === 'error' ? <AlertCircle className="text-red-500" size={20} /> : <CheckCircle className="text-emerald-500" size={20} />}
          <span className="font-medium text-sm">{toastMessage.text}</span>
        </div>
      )}

      <aside className="w-full md:w-64 bg-slate-900 border-b md:border-b-0 md:border-r border-slate-800 flex flex-col shrink-0 z-10 shadow-2xl">
        <div className="p-6 flex items-center gap-3">
          <Shield size={36} className="text-emerald-500" />
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
            <button onClick={() => setCurrentUser(null)} className="w-full flex items-center justify-center gap-2 text-xs font-bold text-slate-400 hover:text-white py-2 rounded-lg hover:bg-slate-800 transition-colors border border-slate-700/50"><LogOut size={14} /> Desconectar</button>
          </div>
        </div>
      </aside>
      <main className="flex-1 p-4 md:p-8 overflow-y-auto bg-slate-950 relative">
        <div className="max-w-5xl mx-auto pb-20 md:pb-0">{renderContent()}</div>
      </main>
    </div>
  );
}

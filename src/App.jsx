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

const ShieldDisplay = ({ shield, size = 'large' }) => {
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

const MembersList = ({ users, teams, currentUser, onUpdateUserRole, onExpelUser, onEditUser, onLinkTeam }) => {
  const [expelConfirmId, setExpelConfirmId] = useState(null);
  const [editingUserId, setEditingUserId] = useState(null);
  const [editData, setEditData] = useState({ name: '', whatsapp: '', email: '' });
  
  const [linkingTeamUserId, setLinkingTeamUserId] = useState(null);
  const [newTeamName, setNewTeamName] = useState('');
  const [newTeamShield, setNewTeamShield] = useState(null);
  
  const isLeader = currentUser?.role === 'leader';

  const startEdit = (user) => {
    setEditingUserId(user.id);
    setEditData({ name: user.name, whatsapp: user.whatsapp || '', email: user.email || '' });
  };

  const saveEdit = (userId) => {
    if (editData.name && editData.whatsapp && editData.email) {
      onEditUser(userId, editData);
      setEditingUserId(null);
    }
  };

  return (
    <div className="animate-in fade-in duration-500 space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <Crown className="text-emerald-500" size={28} />
        <h2 className="text-2xl font-bold text-white">Gestão de Técnicos</h2>
      </div>
      
      <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-x-auto">
        <table className="w-full text-left text-sm whitespace-nowrap">
          <thead className="bg-slate-950/50 text-slate-400 font-medium border-b border-slate-800">
            <tr>
              <th className="p-4">Técnico</th>
              <th className="p-4">Time</th>
              <th className="p-4">WhatsApp</th>
              <th className="p-4">E-mail</th>
              <th className="p-4">Cargo Atual</th>
              <th className="p-4 text-center">Ações (Cargo e Expulsão)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/50">
            {users.map(user => {
              const userTeam = teams.find(t => t.ownerId === user.id);
              
              if (editingUserId === user.id) {
                return (
                  <tr key={user.id} className="bg-slate-800/80 transition-colors">
                    <td className="p-3">
                      <input type="text" value={editData.name} onChange={e=>setEditData({...editData, name: e.target.value})} className="w-full bg-slate-950 border border-emerald-500/50 rounded-lg p-2 text-white text-xs outline-none" placeholder="Nome" />
                    </td>
                    <td className="p-3 text-emerald-400 font-medium text-xs flex items-center gap-2 mt-1">
                      {userTeam ? <><ShieldDisplay shield={userTeam.shield} size="small" /> {userTeam.name}</> : <span className="text-slate-500">Sem time</span>}
                    </td>
                    <td className="p-3">
                      <input type="text" value={editData.whatsapp} onChange={e=>setEditData({...editData, whatsapp: e.target.value})} className="w-full bg-slate-950 border border-emerald-500/50 rounded-lg p-2 text-white text-xs outline-none" placeholder="WhatsApp" />
                    </td>
                    <td className="p-3">
                      <input type="text" value={editData.email} onChange={e=>setEditData({...editData, email: e.target.value})} className="w-full bg-slate-950 border border-emerald-500/50 rounded-lg p-2 text-white text-xs outline-none" placeholder="E-mail" />
                    </td>
                    <td className="p-3 text-xs text-slate-400">{ROLE_NAMES[user.role]}</td>
                    <td className="p-3 text-center flex items-center justify-center gap-1">
                      <Button onClick={() => saveEdit(user.id)} className="bg-emerald-600 hover:bg-emerald-500 py-1.5 px-3 text-xs"><Save size={14}/> Salvar</Button>
                      <Button onClick={() => setEditingUserId(null)} variant="outline" className="py-1.5 px-3 text-xs border-slate-600 text-slate-400"><X size={14}/></Button>
                    </td>
                  </tr>
                );
              }

              return (
                <tr key={user.id} className="hover:bg-slate-800/50 transition-colors">
                  <td className="p-4 font-bold text-white">
                    <div className="flex items-center gap-1.5">
                      <span>{user.name}</span>
                      {isLeader && (
                        <button onClick={() => startEdit(user)} className="text-slate-500 hover:text-amber-400 transition-colors p-0.5" title="Editar Nome do Técnico">
                          <Edit size={13} />
                        </button>
                      )}
                    </div>
                  </td>
                  
                  <td className="p-4 text-emerald-400 font-medium">
                    {userTeam ? (
                      <div className="flex items-center gap-2">
                        <ShieldDisplay shield={userTeam.shield} size="small" /> 
                        <span>{userTeam.name}</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <span className="text-slate-500 text-xs">Sem time</span>
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
                    <div className="flex items-center gap-1.5">
                      <span>{user.whatsapp || '-'}</span>
                      {isLeader && (
                        <button onClick={() => startEdit(user)} className="text-slate-500 hover:text-amber-400 transition-colors p-0.5" title="Editar WhatsApp">
                          <Edit size={13} />
                        </button>
                      )}
                    </div>
                  </td>
                  <td className="p-4 text-slate-400">
                    <div className="flex items-center gap-1.5">
                      <span>{user.email || '-'}</span>
                      {isLeader && (
                        <button onClick={() => startEdit(user)} className="text-slate-500 hover:text-amber-400 transition-colors p-0.5" title="Editar E-mail">
                          <Edit size={13} />
                        </button>
                      )}
                    </div>
                  </td>
                  <td className="p-4">
                    {user.role === 'leader' && <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-400 bg-amber-500/10 px-2 py-1 rounded border border-amber-500/20"><Crown size={12}/> Líder Supremo</span>}
                    {user.role === 'kaioh' && <span className="inline-flex items-center gap-1 text-xs font-bold text-purple-400 bg-purple-500/10 px-2 py-1 rounded border border-purple-500/20"><Star size={12}/> Senhor Kaioh</span>}
                    {user.role === 'member' && <span className="inline-flex items-center gap-1 text-xs font-bold text-slate-400 bg-slate-500/10 px-2 py-1 rounded border border-slate-500/20"><User size={12}/> Membro Oficial</span>}
                  </td>
                  <td className="p-4 text-center flex items-center justify-center gap-2">
                    <select 
                      value={user.role} 
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
                          <button onClick={() => onExpelUser(user.id)} className="bg-red-600 hover:bg-red-500 text-white px-2 py-1.5 rounded-lg text-xs font-bold transition-colors">Confirmar</button>
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
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {linkingTeamUserId && (() => {
        const userToLink = users.find(u => u.id === linkingTeamUserId);
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
                  <input type="text" readOnly value={userToLink ? userToLink.name : ''} className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-slate-400 text-sm outline-none cursor-not-allowed" />
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
                    required 
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <Button variant="outline" onClick={() => setLinkingTeamUserId(null)} className="flex-1 text-xs py-2">Cancelar</Button>
                <Button 
                  onClick={async () => {
                    if (!newTeamName.trim()) {
                      alert('Por favor, insira o nome do time.');
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
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 md:gap-4">
          {teams.map(team => {
            if (editingId === team.id) {
              return (
                <div key={team.id} className="bg-slate-900 p-3 rounded-xl border border-emerald-500/50 shadow-[0_0_15px_rgba(16,185,129,0.1)] flex flex-col justify-between gap-3">
                  <div className="flex flex-col items-center gap-2">
                    <div className="shrink-0 pt-1">
                      <ShieldDisplay shield={editData.shield} size="normal" />
                    </div>
                    <div className="flex-1 space-y-1.5 w-full">
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
                    <h3 className="text-sm md:text-base font-bold text-white leading-tight truncate px-2">{team.name}</h3>
                    <p className="text-[9px] md:text-[10px] text-slate-400 mt-1 truncate px-1"><span className="text-slate-300 font-medium">{team.coach || 'Sem técnico'}</span></p>
                  </div>
                </div>
                <Button 
                  onClick={() => handleWhatsApp(team.whatsapp)}
                  className="w-full bg-emerald-600 hover:bg-emerald-500 text-white mt-1 py-1.5 text-[10px] md:text-xs px-2"
                  disabled={!team.whatsapp}
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

    const cleanWhatsapp = whatsapp.replace(/\D/g, '');
    const fullName = `${coachFirstName} ${coachLastName}`;
    
    const isSuccess = await onCreate({ 
      id: `t${Date.now()}`, 
      name: teamName, 
      coach: fullName, 
      whatsapp: cleanWhatsapp, 
      email: email.trim().toLowerCase(),
      role: role,
      shield: shieldData || '🛡️' 
    });

    if (isSuccess) {
      const siteUrl = window.location.origin; 
      const msg = `Fala ${coachFirstName}! Tudo certo? 🐉🥋\n\nO seu time *${teamName}* acaba de ser convocado para o Clã Kame! 🐢🔥\nSeu cargo atual de batalha é: *${ROLE_NAMES[role] || 'Membro Oficial'}*.\n\nPara acessar o seu Quartel General e entrar na arena, clique no link mágico abaixo ☁️👇\n\n🔗 *Link de Acesso:* ${siteUrl}\n\n⚠️ *ATENÇÃO - PRIMEIRO ACESSO:* ⚠️\nNa tela inicial, preencha o seu E-mail (*${email}*) ou WhatsApp.\nNo campo de Senha, *CRIE A SENHA QUE VOCÊ QUISER NA HORA*! 🔐\n\nComo é a sua primeira vez, o nosso Radar do Dragão vai gravar essa senha automaticamente como a sua senha oficial para as próximas batalhas! 🐉✨\n\nEleva o teu Ki e vamos pro jogo! ⚡🎮`;
      
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
          <div><label className="block text-sm font-medium text-slate-400 mb-1">WhatsApp (com DDD)</label><input type="tel" placeholder="Ex: 11999999999" value={whatsapp} onChange={e=>setWhatsapp(e.target.value)} className="w-full bg-slate-950 border border-slate-700 focus:border-emerald-500 rounded-lg p-3 text-white outline-none transition-colors" required /></div>
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
  const [name, setName] = useState('');
  const [format, setFormat] = useState('league');
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
    if (!name || !format || !deadline) {
      setError('Por favor, preencha todos os campos do formulário.');
      return;
    }
    
    if (selectedTeams.length < 2) {
      setError(`Atenção: Selecione pelo menos 2 times para iniciar a competição.`);
      return;
    }

    setError('');

    const count = selectedTeams.length;
    const newCompId = `c${Date.now()}`;
    const generatedRounds = generateRoundRobin(selectedTeams, newCompId);

    onCreate({ 
      id: newCompId, 
      name, 
      format, 
      teamCount: count,
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
            <input type="number" readOnly value={selectedTeams.length} className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-slate-500 cursor-not-allowed outline-none transition-colors" />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-400">Prazo de Conclusão</label>
            <input type="date" value={deadline} onChange={e=>setDeadline(e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-slate-300 focus:ring-2 focus:ring-emerald-500 outline-none" required />
          </div>
        </div>

        <div className="pt-4 border-t border-slate-800">
          <div className="flex justify-between items-end mb-4">
            <label className="text-sm font-medium text-slate-400">Selecione as Equipes Participantes</label>
            <span className={`text-xs px-2 py-1 rounded font-bold ${selectedTeams.length >= 2 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'}`}>{selectedTeams.length} Marcadas</span>
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
    const submittedMatch = matches.find(m => m.matchId === matchId && m.compId === comp.id);
    
    if (!submittedMatch) return { isPlayed: false, text: 'Aguardando', color: 'text-slate-500', bg: 'bg-slate-900 border-slate-800' };
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
                          <div className="flex justify-center">
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
  
  const [scoreA, setScoreA] = useState('0'); 
  const [scoreB, setScoreB] = useState('0');
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
    setScoreA('0'); setScoreB('0'); setGoalsA([]); setGoalsB([]); 
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
    if (team === 'A') { setGoalsA([...goalsA, { player: '', minute: '' }]); setScoreA((parseInt(scoreA) + 1).toString()); } 
    else { setGoalsB([...goalsB, { player: '', minute: '' }]); setScoreB((parseInt(scoreB) + 1).toString()); }
  };

  const handleRemoveGoal = (team, index) => {
    if (team === 'A') { const updated = [...goalsA]; updated.splice(index, 1); setGoalsA(updated); setScoreA(Math.max(0, parseInt(scoreA) - 1).toString()); } 
    else { const updated = [...goalsB]; updated.splice(index, 1); setGoalsB(updated); setScoreB(Math.max(0, parseInt(scoreB) - 1).toString()); }
  };

  const handleGoalChange = (team, index, field, value) => {
    if (team === 'A') { const updated = [...goalsA]; updated[index][field] = value; setGoalsA(updated); } 
    else { const updated = [...goalsB]; updated[index][field] = value; setGoalsB(updated); }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if(!selectedCompId || !selectedMatchId) return;
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
                    <input type="number" value={scoreA} onChange={e=>setScoreA(e.target.value)} className="w-12 md:w-16 bg-slate-900 border border-slate-700 text-center font-bold text-xl md:text-2xl text-emerald-400 rounded-lg p-2 outline-none focus:border-emerald-500" />
                    <span className="text-xs text-slate-500 font-bold">X</span>
                    <input type="number" value={scoreB} onChange={e=>setScoreB(e.target.value)} className="w-12 md:w-16 bg-slate-900 border border-slate-700 text-center font-bold text-xl md:text-2xl text-emerald-400 rounded-lg p-2 outline-none focus:border-emerald-500" />
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

const Dashboard = ({ matches, teams }) => {
  const recentMatches = [...matches].reverse().slice(0, 5);
  const getTeam = (id) => teams.find(t => t.id === id);
  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="bg-gradient-to-r from-emerald-900/50 to-slate-900 p-6 rounded-2xl border border-emerald-900/50"><h2 className="text-2xl font-bold text-white mb-2">QG Nuvem Clã Kame</h2><p className="text-slate-400">Dados sincronizados em tempo real.</p></div>
      <div>
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2"><Activity size={20} className="text-emerald-500" /> Últimos Resultados</h3>
        <div className="space-y-3">
          {recentMatches.length === 0 && <p className="text-slate-500 text-sm">Nenhum resultado enviado na nuvem.</p>}
          {recentMatches.map(m => {
            const tA = getTeam(m.teamA); const tB = getTeam(m.teamB);
            return (
              <div key={m.id} className="bg-slate-900 p-3 md:p-4 rounded-xl border border-slate-800 flex flex-col gap-2">
                <div className="flex items-center justify-between w-full gap-1.5">
                  <div className="flex items-center gap-1.5 flex-1 min-w-0 justify-start">
                    <div className="shrink-0"><ShieldDisplay shield={tA?.shield} size="small" /></div>
                    <span className="font-medium text-[11px] md:text-sm text-slate-200 truncate">{tA?.name}</span>
                  </div>
                  
                  <div className="flex items-center justify-center gap-1.5 md:gap-2 px-2 md:px-3 py-1 bg-slate-950 rounded-lg border border-slate-800 shrink-0">
                    <span className="font-bold text-sm md:text-base text-emerald-400">{m.status === 'approved' || m.status === 'pending' ? m.scoreA : '?'}</span>
                    <span className="text-[10px] text-slate-500 font-bold mx-0.5">X</span>
                    <span className="font-bold text-sm md:text-base text-emerald-400">{m.status === 'approved' || m.status === 'pending' ? m.scoreB : '?'}</span>
                  </div>

                  <div className="flex items-center gap-1.5 flex-1 min-w-0 justify-end">
                    <span className="font-medium text-[11px] md:text-sm text-slate-200 truncate text-right">{tB?.name}</span>
                    <div className="shrink-0"><ShieldDisplay shield={tB?.shield} size="small" /></div>
                  </div>
                </div>
                
                <div className="flex justify-center mt-1">
                  {m.status === 'approved' ? <span className="text-[10px] text-emerald-400 font-medium bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">✅ Oficial</span> : m.status === 'rejected' ? <span className="text-[10px] text-red-400 font-medium bg-red-500/10 px-2 py-0.5 rounded-md border border-red-500/20">❌ Rejeitado</span> : <span className="text-[10px] text-amber-400 font-medium bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20">⏳ Pendente</span>}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

const CompetitionsList = ({ competitions, teams, currentUser, onSelectComp, onEditComp, onDeleteComp }) => {
  const [editingId, setEditingId] = useState(null);
  const [editData, setEditData] = useState({ name: '', format: 'league', deadline: '', teams: [] });
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);

  const isAdmin = currentUser?.role === 'leader' || currentUser?.role === 'kaioh';
  const userTeamIds = teams.filter(t => t.ownerId === currentUser?.id).map(t => t.id);
  const visibleComps = competitions.filter(c => isAdmin || c.teams?.some(t => userTeamIds.includes(t)));

  const startEdit = (comp, e) => {
    e.stopPropagation();
    setEditingId(comp.id);
    setEditData({ name: comp.name, format: comp.format || 'league', deadline: comp.deadline || '', teams: comp.teams || [] });
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
      let newRounds = comp.rounds;
      
      const currentTeams = comp.teams || [];
      const teamsChanged = editData.teams.length !== currentTeams.length || editData.teams.some(t => !currentTeams.includes(t));
      
      if (teamsChanged) {
        newRounds = generateRoundRobin(editData.teams, comp.id);
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
        {visibleComps.length === 0 && <p className="text-slate-500 col-span-2">Nenhuma competição.</p>}
        {visibleComps.map(comp => {
          const isPart = comp.teams?.some(t => userTeamIds.includes(t));
          
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
                      <select value={editData.format} onChange={e=>setEditData({...editData, format: e.target.value})} className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white text-sm outline-none focus:border-amber-500 mt-1">
                        <option value="league">Liga</option>
                        <option value="cup">Copa</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-slate-400">Prazo Final</label>
                      <input type="date" value={editData.deadline} onChange={e=>setEditData({...editData, deadline: e.target.value})} className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-slate-300 text-sm outline-none focus:border-amber-500 mt-1" />
                    </div>
                  </div>
                  
                  <div className="pt-3 border-t border-slate-800">
                    <div className="flex justify-between items-center mb-2">
                      <label className="text-xs text-slate-400 font-bold">Times Participantes ({editData.teams.length})</label>
                      <span className="text-[10px] text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">Atenção: Mudar times recriará TODAS as rodadas</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto pr-1">
                      {teams.map(t => {
                        const isSelected = editData.teams.includes(t.id);
                        return (
                          <div
                            key={t.id}
                            onClick={() => toggleEditTeam(t.id)}
                            className={`cursor-pointer flex items-center gap-2 p-2 rounded-lg border transition-all ${isSelected ? 'bg-emerald-500/10 border-emerald-500' : 'bg-slate-950 border-slate-800 hover:border-slate-700'}`}
                          >
                            <ShieldDisplay shield={t.shield} size="small" />
                            <span className={`font-medium text-[10px] truncate ${isSelected ? 'text-emerald-400' : 'text-slate-300'}`}>{t.name}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                </div>
                <div className="flex gap-2 mt-2">
                  <Button variant="outline" onClick={(e) => { e.stopPropagation(); setEditingId(null); }} className="flex-1 py-2 text-slate-400"><X size={16}/> Cancelar</Button>
                  <Button onClick={(e) => saveEdit(comp, e)} className="flex-1 py-2 bg-amber-600 hover:bg-amber-500 shadow-amber-900/50"><Save size={16}/> Salvar</Button>
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
              <div className="flex justify-between items-start mb-2 pr-16"><h3 className="text-xl font-bold text-white">{comp.name}</h3>{isPart && <span className={`text-xs px-2 py-1 rounded-md font-bold ${isAdmin ? 'bg-amber-500/20 text-amber-400' : 'bg-emerald-500/20 text-emerald-400'}`}>Participa</span>}</div>
              <p className="text-sm text-slate-400 mb-4">{comp.format === 'league' ? 'Liga' : 'Copa'} • {comp.teams?.length || 0} equipes {comp.deadline ? `• Prazo: ${new Date(comp.deadline).toLocaleDateString('pt-BR', {timeZone: 'UTC'})}` : ''}</p>
              <div className="text-xs text-slate-500 flex justify-between items-center"><span>Ver Tabela ➔</span></div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const ValidationPanel = ({ matches, teams, competitions, onUpdateStatus, showToast }) => {
  const pending = matches.filter(m => m.status === 'pending');
  const getTeam = (id) => teams.find(t => t.id === id);
  const getCompName = (id) => competitions?.find(c => c.id === id)?.name || 'Competição Desconhecida';

  const getFormattedGoals = (teamId, allGoals, align) => {
    const goals = allGoals.filter(g => g.teamId === teamId);
    if (goals.length === 0) return <span className={`text-[10px] md:text-xs text-slate-600 block text-${align}`}>Nenhum gol</span>;
    return (
      <div className={`space-y-0.5 text-[10px] md:text-xs text-slate-400 flex flex-col ${align === 'right' ? 'items-end text-right' : 'items-start text-left'}`}>
        {goals.map((g, i) => (
          <div key={i} className="flex gap-1.5 items-center">
            {align === 'left' ? (
              <><span className="text-emerald-400 font-bold">{g.minute}'</span><span className="truncate">{g.player}</span></>
            ) : (
              <><span className="truncate">{g.player}</span><span className="text-emerald-400 font-bold">{g.minute}'</span></>
            )}
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
                  🏆 {getCompName(m.compId)}
                </div>

                <div className="flex flex-col md:flex-row items-stretch gap-6">
                  <div className="flex-1 space-y-4">
                    <div className="flex flex-col items-center gap-3 w-full bg-slate-950 p-4 rounded-xl border border-slate-800/50">
                      <div className="flex items-center justify-between w-full gap-2 border-b border-slate-800/50 pb-3">
                        <div className="flex items-center gap-2 flex-1 min-w-0 justify-start">
                          <div className="shrink-0"><ShieldDisplay shield={tA?.shield} size="normal" /></div>
                          <span className="font-bold text-sm md:text-base text-white truncate">{tA?.name}</span>
                        </div>

                        <div className="flex items-center justify-center gap-2 px-3 py-1.5 bg-slate-900 rounded-lg border border-slate-700 shrink-0">
                          <span className="font-bold text-xl md:text-2xl text-emerald-400">{m.scoreA}</span>
                          <span className="text-[10px] md:text-xs text-slate-500 font-bold mx-1">X</span>
                          <span className="font-bold text-xl md:text-2xl text-emerald-400">{m.scoreB}</span>
                        </div>

                        <div className="flex items-center gap-2 flex-1 min-w-0 justify-end">
                          <span className="font-bold text-sm md:text-base text-white truncate text-right">{tB?.name}</span>
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
                        <p className="text-slate-300 italic">"{m.observacoes}"</p>
                      </div>
                    )}
                    
                    <div className="text-[10px] text-slate-500 text-center md:text-left">
                      Enviado por: <span className="text-slate-400 font-semibold">{m.submittedBy}</span>
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
                  <Button onClick={() => { onUpdateStatus(m.id, 'approved'); showToast("Jogo Aprovado e validado!", "success"); }}><CheckCircle size={16}/> Aprovar e computar pontos</Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default function App() {
  const [fbUser, setFbUser] = useState(null);
  const [isFirebaseLoading, setIsFirebaseLoading] = useState(true);
  const [isProfileLoading, setIsProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState('');
  
  const [users, setUsers] = useState([]);
  const [teams, setTeams] = useState([]);
  const [competitions, setCompetitions] = useState([]);
  const [matches, setMatches] = useState([]);

  const [identificacao, setIdentificacao] = useState('');
  const [palavraPasse, setPalavraPasse] = useState('');
  const [manterConectado, setManterConectado] = useState(false);
  const [mensagemErro, setMensagemErro] = useState('');

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

  const formatarParaEmail = (texto) => {
    const textoLimpo = texto.trim().toLowerCase();
    if (textoLimpo.includes('@')) { return textoLimpo; }
    const celularLimpo = textoLimpo.replace(/[-\s().]/g, '');
    return celularLimpo + '@clakame.com';
  };

  const tentarLogin = async () => {
    setMensagemErro('');
    if (!identificacao || !palavraPasse) { setMensagemErro('Preencha os dados da batalha!'); return; }
    const emailFake = formatarParaEmail(identificacao);
    
    try {
      setIsFirebaseLoading(true);
      await signInWithEmailAndPassword(auth, emailFake, palavraPasse);
    } catch (error) {
      if (error.code === 'auth/invalid-credential' || error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
        try {
          await createUserWithEmailAndPassword(auth, emailFake, palavraPasse);
        } catch (createError) {
           setIsFirebaseLoading(false);
           if (createError.code === 'auth/email-already-in-use') {
              setMensagemErro(`Acesso negado: Senha incorreta para este utilizador.`);
           } else {
              setMensagemErro(`Erro ao aceder: ${createError.message}`);
           }
        }
      } else {
        setIsFirebaseLoading(false);
        setMensagemErro(`Erro do Firebase: ${error.code}`);
      }
    }
  };

  const fazerLogout = async () => { await signOut(auth); setCurrentTab('dashboard'); };
  
  const handleReleaseRound = async (compId, roundId) => {
    const comp = competitions.find(c => c.id === compId);
    if (!comp) return;
    const rounds = comp.rounds.map(r => r.id === roundId ? { ...r, status: 'released' } : r);
    await updateDoc(getPublicDocPath('competitions', compId), { rounds });
    showToast("Rodada liberada com sucesso!", "success");
  };
  const handleSubmitMatch = async (m) => { await setDoc(getPublicDocPath('matches', m.id), m); setCurrentTab('dashboard'); };
  const handleUpdateMatchStatus = async (id, st) => { await updateDoc(getPublicDocPath('matches', id), { status: st }); };

  const handleUpdateUserRole = async (userId, newRole) => {
    const currentLeaders = users.filter(u => u.role === 'leader');
    const currentKaiohs = users.filter(u => u.role === 'kaioh');
    const targetUser = users.find(u => u.id === userId);

    if (targetUser.role === newRole) return;

    if (newRole === 'leader' && currentLeaders.length >= 1) {
      showToast('O clã só pode ter 1 Líder Supremo. Despromova o líder atual primeiro.', 'error');
      return;
    }
    if (newRole === 'kaioh' && currentKaiohs.length >= 3) {
      showToast('Limite máximo de 3 Senhores Kaioh já foi atingido.', 'error');
      return;
    }

    await updateDoc(getPublicDocPath('users', userId), { role: newRole });
    showToast(`O técnico ${targetUser.name} agora é ${ROLE_NAMES[newRole]}!`, 'success');
  };

  const handleExpelUser = async (userId) => {
    const userToFind = users.find(u => u.id === userId);
    if (!userToFind) return;
    if (userId === fbUser?.uid) {
      showToast('Você não pode expulsar a si mesmo!', 'error');
      return;
    }

    const userTeam = teams.find(t => t.ownerId === userId);
    if (userTeam) {
      await deleteDoc(getPublicDocPath('teams', userTeam.id));
    }
    await deleteDoc(getPublicDocPath('users', userId));
    showToast('Técnico e time excluídos com sucesso!', 'success');
  };

  const handleEditUser = async (userId, updatedData) => {
    await updateDoc(getPublicDocPath('users', userId), {
      name: updatedData.name,
      whatsapp: updatedData.whatsapp.replace(/\D/g, ''),
      email: updatedData.email.trim().toLowerCase()
    });
    showToast("Dados do técnico atualizados com sucesso!", "success");
  };

  const handleLinkTeam = async (userId, teamName, teamShield) => {
    const targetUser = users.find(u => u.id === userId);
    if (!targetUser) return false;

    const cleanTeamName = teamName.trim().toLowerCase();
    
    const isDuplicateTeam = teams.some(t => t.name.trim().toLowerCase() === cleanTeamName);
    if (isDuplicateTeam) {
      showToast("Erro: Já existe outro time registrado com este nome.", "error");
      return false;
    }

    const teamId = `t${Date.now()}`;
    await setDoc(getPublicDocPath('teams', teamId), {
      id: teamId,
      name: teamName,
      coach: targetUser.name,
      whatsapp: targetUser.whatsapp,
      ownerId: userId,
      shield: teamShield || '🛡'
    });

    showToast(`Time ${teamName} criado e vinculado com sucesso!`, "success");
    return true;
  };

  const handleDeleteTeam = async (teamId, ownerId) => {
    await deleteDoc(getPublicDocPath('teams', teamId));
    
    if (ownerId && !ownerId.startsWith('pending_') && !ownerId.startsWith('npc_')) {
      if (ownerId === fbUser?.uid) {
        showToast('Seu time foi removido, mas sua conta de Líder foi mantida para não perder acesso.', 'error');
      } else {
        await deleteDoc(getPublicDocPath('users', ownerId));
      }
    } else if (ownerId && ownerId.startsWith('pending_')) {
      await deleteDoc(getPublicDocPath('users', ownerId));
    }
    showToast('Time removido com sucesso!', 'success');
  };

  const handleEditTeam = async (updatedTeam) => {
    const { id, name, coach, whatsapp, shield } = updatedTeam;
    const cleanWhatsapp = whatsapp ? whatsapp.replace(/\D/g, '') : '';
    const cleanTeamName = name.trim().toLowerCase();
    const cleanCoachName = coach ? coach.trim().toLowerCase() : '';

    const isDuplicateTeam = teams.some(t => 
      t.id !== id && (
        t.name.trim().toLowerCase() === cleanTeamName ||
        (cleanWhatsapp !== '' && t.whatsapp === cleanWhatsapp)
      )
    );

    if (isDuplicateTeam) {
      showToast('Erro: Já existe outro time registrado com esse Nome ou WhatsApp.', 'error');
      return false;
    }

    await updateDoc(getPublicDocPath('teams', id), { name, coach, whatsapp: cleanWhatsapp, shield });
    showToast("Dados do time salvos com sucesso!", "success");
    return true;
  };

  const handleCreateTeamFull = async (teamData) => { 
    const currentLeaders = users.filter(u => u.role === 'leader');
    const currentKaiohs = users.filter(u => u.role === 'kaioh');

    if (teamData.role === 'leader' && currentLeaders.length >= 1) {
      showToast('O clã só pode ter 1 Líder Supremo. Despromova o líder atual primeiro.', 'error');
      return false;
    }
    if (teamData.role === 'kaioh' && currentKaiohs.length >= 3) {
      showToast('Limite máximo de 3 Senhores Kaioh já foi atingido.', 'error');
      return false;
    }

    const cleanWhatsapp = teamData.whatsapp;
    const cleanEmail = teamData.email;
    const cleanTeamName = teamData.name.trim().toLowerCase();

    const isDuplicateTeam = teams.some(t => 
      t.name.trim().toLowerCase() === cleanTeamName || t.whatsapp === cleanWhatsapp
    );

    if (isDuplicateTeam) {
      showToast('Ação Bloqueada: Já existe um cadastro registrado no sistema com esse Time, Técnico, E-mail ou WhatsApp!', 'error');
      return false;
    }

    const ownerId = `pending_${cleanWhatsapp}`;
    
    await setDoc(getPublicDocPath('teams', teamData.id), { 
      id: teamData.id, name: teamData.name, coach: teamData.coach, whatsapp: cleanWhatsapp, ownerId: ownerId, shield: teamData.shield
    }); 
    
    await setDoc(getPublicDocPath('users', ownerId), {
      id: ownerId, email: cleanEmail, name: teamData.coach, whatsapp: cleanWhatsapp, role: teamData.role
    });

    setCurrentTab('teams_list'); 
    return true;
  };
  
  const handleCreateTeamManual = async (teamData) => {
    await setDoc(getPublicDocPath('teams', teamData.id), teamData);
    setCurrentTab('teams_list');
    return true;
  };

  const handleCreateComp = async (c) => { 
    await setDoc(getPublicDocPath('competitions', c.id), c); 
    setCurrentTab('competitions'); 
  };

  const handleEditComp = async (updatedComp) => {
    await updateDoc(getPublicDocPath('competitions', updatedComp.id), updatedComp);
    showToast("Competição atualizada com sucesso!", "success");
  };

  const handleDeleteComp = async (compId) => {
    await deleteDoc(getPublicDocPath('competitions', compId));
    showToast("Competição excluída com sucesso!", "success");
  };

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

  const currentUser = users.find(u => u.id === fbUser?.uid) || (fbUser ? {
    id: fbUser.uid, email: fbUser.email, name: fbUser.email?.split('@')[0] || 'Guerreiro',
    role: (fbUser.email?.includes('11989000858') || fbUser.email?.includes('savio')) ? 'leader' : 'member',
    whatsapp: fbUser.email?.split('@')[0] || ''
  } : null);

  if (!fbUser || !currentUser) {
    return (
      <div className="login-wrapper" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', backgroundColor: '#18191a' }}>
        <div className="login-container" style={{ backgroundColor: '#242526', padding: '40px', borderRadius: '20px', textAlign: 'center', width: '90%', maxWidth: '400px', border: '2px solid #3a3b3c', color: 'white', fontFamily: 'sans-serif' }}>
          <div style={{ marginBottom: '20px' }}>
            {LOGO_URL ? (
              <img src={LOGO_URL} alt="Clã Kame" style={{ margin: '0 auto 15px auto', display: 'block', maxHeight: '100px', objectFit: 'contain' }} />
            ) : (
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '10px' }}><Shield size={64} color="#ffde59" /></div>
            )}
            <h1 style={{ margin: 0, color: 'white', fontSize: '32px', fontWeight: 'bold' }}>Clã Kame</h1>
            <p style={{ color: '#b0b3b8', fontSize: '14px', marginTop: '5px' }}>Sistema de Gestão DLS na Nuvem</p>
          </div>
          {mensagemErro && (<div style={{ color: '#ff914d', fontWeight: 'bold', marginBottom: '15px', padding: '10px', backgroundColor: 'rgba(255, 145, 77, 0.1)', borderRadius: '8px', fontSize: '14px' }}>{mensagemErro}</div>)}
          <div style={{ textAlign: 'left', marginBottom: '15px' }}><label style={{ fontSize: '14px', color: '#b0b3b8', fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>E-mail ou Celular (com DDD)</label><input type="text" placeholder="Ex: tecnico@email.com ou 11999999999" value={identificacao} onChange={(evento) => setIdentificacao(evento.target.value)} style={{ width: '100%', padding: '12px', backgroundColor: '#3a3b3c', border: 'none', borderRadius: '8px', color: 'white', outline: 'none' }}/></div>
          <div style={{ textAlign: 'left', marginBottom: '15px' }}><label style={{ fontSize: '14px', color: '#b0b3b8', fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>Senha</label><input type="password" placeholder="••••••••" value={palavraPasse} onChange={(evento) => setPalavraPasse(evento.target.value)} style={{ width: '100%', padding: '12px', backgroundColor: '#3a3b3c', border: 'none', borderRadius: '8px', color: 'white', outline: 'none' }}/></div>
          <div style={{ display: 'flex', justify_content: 'space-between', fontSize: '14px', marginBottom: '25px', color: '#b0b3b8' }}><label style={{ display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer' }}><input type="checkbox" checked={manterConectado} onChange={(evento) => setManterConectado(evento.target.checked)} /> Manter conectado</label><span style={{ color: '#ffde59', cursor: 'pointer' }} onClick={() => setMensagemErro('Função Esqueci a Senha em construção')}>Esqueci a senha</span></div>
          <button onClick={tentarLogin} style={{ width: '100%', padding: '15px', borderRadius: '10px', background: 'linear-gradient(135deg, #ffde59 0%, #ff914d 100%)', color: 'black', fontWeight: 'bold', fontSize: '16px', border: 'none', cursor: 'pointer', textTransform: 'uppercase' }}>Entrar</button>
        </div>
      </div>
    );
  }

  const isAdmin = currentUser?.role === 'leader' || currentUser?.role === 'kaioh';
  const roleName = ROLE_NAMES[currentUser?.role] || ROLE_NAMES.member;
  
  const TABS = [
    { id: 'dashboard', label: 'Início', icon: Home },
    { id: 'profile', label: 'Meu Perfil', icon: User },
    { id: 'teams_list', label: 'Times', icon: Shield },
    { id: 'competitions', label: 'Competições', icon: Medal },
    { id: 'submit', label: 'Registrar', icon: Camera },
    ...(isAdmin ? [ 
      { id: 'validation', label: 'Validação', icon: CheckSquare },
      { id: 'members_list', label: 'Técnicos', icon: Crown },
      { id: 'create_comp', label: 'Nova Comp', icon: PlusCircle },
      { id: 'create_team', label: 'Convidar Técnico', icon: Users },
      { id: 'create_team_manual', label: 'Time Simples', icon: UserPlus }
    ] : []),
  ];

  const renderContent = () => {
    switch (currentTab) {
      case 'dashboard': return <Dashboard matches={matches} teams={teams} />;
      case 'profile': return <Profile currentUser={currentUser} teams={teams} matches={matches} competitions={competitions} />;
      case 'teams_list': return <TeamsList teams={teams} users={users} currentUser={currentUser} onEditTeam={handleEditTeam} onDeleteTeam={handleDeleteTeam} />;
      case 'competitions': return <CompetitionsList competitions={competitions} teams={teams} currentUser={currentUser} onSelectComp={id => {setSelectedCompId(id); setCurrentTab('comp_details');}} onEditComp={handleEditComp} onDeleteComp={handleDeleteComp} />;
      case 'comp_details': return <CompetitionDetails comp={competitions.find(c=>c.id===selectedCompId)} teams={teams} matches={matches} currentUser={currentUser} onBack={()=>setCurrentTab('competitions')} onReleaseRound={handleReleaseRound} />;
      case 'submit': return <SubmitMatch teams={teams} competitions={competitions} matches={matches} onSubmit={handleSubmitMatch} currentUser={currentUser} showToast={showToast} />;
      case 'validation': return <ValidationPanel matches={matches} teams={teams} competitions={competitions} onUpdateStatus={handleUpdateMatchStatus} showToast={showToast} />;
      case 'create_comp': return <CreateCompetition teams={teams} onCreate={handleCreateComp} showToast={showToast} />;
      case 'create_team': return <CreateTeamFull onCreate={handleCreateTeamFull} showToast={showToast} />;
      case 'create_team_manual': return <CreateTeamManual onCreate={handleCreateTeamManual} showToast={showToast} />;
      case 'members_list': return <MembersList users={users} teams={teams} currentUser={currentUser} onUpdateUserRole={handleUpdateUserRole} onExpelUser={handleExpelUser} onEditUser={handleEditUser} onLinkTeam={handleLinkTeam} />;
      default: return <Dashboard matches={matches} teams={teams} />;
    }
  };

  const pendingCount = isAdmin ? matches.filter(m=>m.status==='pending').length : 0;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans flex flex-col md:flex-row relative">
      {toastMessage && (
        <div className={`fixed top-4 right-4 z-50 px-6 py-3 rounded-xl shadow-2xl flex items-center gap-3 animate-in slide-in-from-top-4 ${toastMessage.type === 'error' ? 'bg-red-950 border border-red-500 text-red-100' : 'bg-slate-800 border border-emerald-500 text-white'}`}>
          {toastMessage.type === 'error' ? <AlertCircle className="text-red-500" size={20} /> : <CheckCircle className="text-emerald-500" size={20} />}
          <span className="font-medium text-sm">{toastMessage.text}</span>
        </div>
      )}

      <aside className="w-full md:w-64 bg-slate-900 border-b md:border-b-0 md:border-r border-slate-800 flex flex-col shrink-0">
        <div className="p-6 flex items-center gap-3">
          {LOGO_URL ? (
            <img src={LOGO_URL} alt="Clã Kame" className="w-10 h-10 object-contain" />
          ) : (
            <Shield size={32} color="#ffde59" />
          )}
          <div><h1 className="font-bold text-white text-xl">Clã Kame</h1><p className="text-xs text-emerald-400">Ao Vivo • Nuvem</p></div>
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
            <p className="font-medium text-white truncate text-sm">{currentUser?.name}</p>
            <p className="text-xs text-slate-500 mb-3">{roleName}</p>
            <button onClick={fazerLogout} className="w-full flex items-center justify-center gap-2 text-xs text-slate-400 hover:text-white py-2 rounded-lg hover:bg-slate-800 transition-colors"><LogOut size={14} /> Sair</button>
          </div>
        </div>
      </aside>
      <main className="flex-1 p-4 md:p-8 overflow-y-auto"><div className="max-w-5xl mx-auto pb-20 md:pb-0">{renderContent()}</div></main>
    </div>
  );
}

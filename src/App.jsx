import React, { useState, useEffect, useMemo } from 'react';
import { 
  Home, Trophy, Medal, Camera, CheckSquare, Users, 
  LogOut, UploadCloud, CheckCircle, XCircle, AlertCircle, 
  Activity, PlusCircle, ArrowLeft, PlayCircle, Lock,
  Shield, MessageCircle, Edit, Save, X, User
} from 'lucide-react';

import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, doc, setDoc, updateDoc, onSnapshot, collection, getDocs } from 'firebase/firestore';

// --- ATENÇÃO: COLOQUE AS SUAS CHAVES DO FIREBASE ABAIXO ---
// Substitua estas chaves de demonstração pelas suas chaves reais do Firebase Console antes de publicar.
const firebaseConfig = {
  apiKey : "AIzaSyCoZ255eUBfUsIYArCMtHflT0y_6U5fTsA" , 
  authDomain : "cla-kame.firebaseapp.com" , 
  databaseURL : "https://cla-kame-default-rtdb.firebaseio.com" , 
  projectId : "cla-kame" , 
  storageBucket : "cla-kame.firebasestorage.app" , 
  messagingSenderId : "253792062726" , 
  appId : "1:253792062726:web:1ee567bbbd175c31ce2287"
};
// -----------------------------------------------------------

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

const LoginScreen = ({ users, onLogin, onRegister }) => {
  const [view, setView] = useState('login'); 
  const [step, setStep] = useState(1); 
  const [formData, setFormData] = useState({ firstName: '', lastName: '', teamName: '', whatsapp: '', password: '' });
  const [loginData, setLoginData] = useState({ identifier: '', password: '' });
  const [loginError, setLoginError] = useState('');
  const [code, setCode] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [showForgot, setShowForgot] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  const handleSendCode = (e) => {
    e.preventDefault();
    setIsSending(true);
    setTimeout(() => { setIsSending(false); setStep(2); }, 1500);
  };

  const handleLoginSubmit = (e) => {
    e.preventDefault();
    setLoginError('');
    const foundUser = users.find(u => 
      (u.name.toLowerCase() === loginData.identifier.toLowerCase() || u.whatsapp === loginData.identifier) && 
      u.password === loginData.password
    );
    if (foundUser) {
      onLogin(foundUser.id, rememberMe); 
    } else {
      setLoginError('Credenciais inválidas. Verifique os dados e tente novamente.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 login-wrapper">
      <div className="login-container">
        <div className="text-center mb-6 login-header">
          <div className="text-5xl mb-3 flex justify-center"><Shield size={64} color="#ffde59" /></div>
          <h1>Clã Kame</h1>
          <p className="login-subtitle">Sistema de Gestão DLS na Nuvem</p>
        </div>

        <div className="flex p-1 bg-slate-950 rounded-xl mb-6">
          <button onClick={() => setView('login')} className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${view === 'login' ? 'bg-slate-800 text-white' : 'text-slate-500 hover:text-slate-300'}`}>Entrar</button>
          <button onClick={() => {setView('register'); setStep(1);}} className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${view === 'register' ? 'bg-[#ff914d] text-slate-950 shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}>Criar Conta</button>
        </div>

        {view === 'login' && (
          <form onSubmit={handleLoginSubmit} className="space-y-4 animate-in fade-in duration-300 login-form-area">
            {loginError && (
              <div style={{ color: '#ff914d', fontWeight: 'bold', marginBottom: '15px', padding: '10px', backgroundColor: 'rgba(255, 145, 77, 0.1)', borderRadius: '8px', fontSize: '14px' }}>
                <AlertCircle size={16} className="inline-block mr-2" /><span>{loginError}</span>
              </div>
            )}
            <div className="input-group">
              <label>WhatsApp ou Nome do Técnico</label>
              <input required value={loginData.identifier} onChange={e=>setLoginData({...loginData, identifier: e.target.value})} placeholder="Ex: Vitor ou 5511999999999" />
            </div>
            <div className="input-group">
              <label>Senha</label>
              <input required type="password" value={loginData.password} onChange={e=>setLoginData({...loginData, password: e.target.value})} placeholder="••••••••" />
            </div>
            <div className="login-opcoes">
              <label className="checkbox-label">
                <input type="checkbox" checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)} />
                Manter conectado
              </label>
              <button type="button" onClick={() => setShowForgot(true)} className="link-esqueci">Esqueci a senha</button>
            </div>
            {showForgot && (
              <div className="bg-emerald-500/10 border border-emerald-500/20 p-3 rounded-lg text-xs text-emerald-400 text-center animate-in fade-in mt-2">
                Enviaremos um link de redefinição para o seu WhatsApp cadastrado!
              </div>
            )}
            <button type="submit" className="btn-degrade mt-4">Entrar na Batalha</button>
          </form>
        )}

        {view === 'register' && step === 1 && (
          <form onSubmit={handleSendCode} className="space-y-4 animate-in slide-in-from-right-4 duration-300">
            <div className="grid grid-cols-2 gap-3">
              <div className="input-group">
                <label>Nome</label>
                <input required value={formData.firstName} onChange={e=>setFormData({...formData, firstName: e.target.value})} placeholder="Ex: Don" />
              </div>
              <div className="input-group">
                <label>Sobrenome</label>
                <input required value={formData.lastName} onChange={e=>setFormData({...formData, lastName: e.target.value})} placeholder="Ex: Luck" />
              </div>
            </div>
            <div className="input-group">
              <label>Nome do Time</label>
              <input required value={formData.teamName} onChange={e=>setFormData({...formData, teamName: e.target.value})} placeholder="Ex: Luckers FC" />
            </div>
            <div className="input-group">
              <label>WhatsApp (com DDD)</label>
              <input required type="tel" value={formData.whatsapp} onChange={e=>setFormData({...formData, whatsapp: e.target.value})} placeholder="Ex: 11999999999" />
            </div>
            <div className="input-group">
              <label>Crie uma Senha</label>
              <input required type="password" value={formData.password} onChange={e=>setFormData({...formData, password: e.target.value})} placeholder="Min. 6 caracteres" minLength={6} />
            </div>
            <button type="submit" disabled={isSending} className="btn-degrade mt-4">
              {isSending ? 'A Enviar...' : 'Enviar Código via WhatsApp'}
            </button>
          </form>
        )}

        {view === 'register' && step === 2 && (
           <form onSubmit={(e) => { e.preventDefault(); onRegister(formData); }} className="space-y-4 animate-in slide-in-from-right-4 duration-300 text-center">
             <div className="bg-emerald-500/10 text-emerald-400 p-4 rounded-xl mb-4 text-sm border border-emerald-500/20">
               Código de 4 dígitos enviado para <br/><b className="text-lg tracking-wider text-white mt-1 inline-block">{formData.whatsapp}</b>
               <span className="text-xs text-slate-400 mt-4 block p-2 bg-slate-950 rounded-lg border border-slate-800">
                 (Teste: Digite qualquer código, ex: <b>1234</b>)
               </span>
             </div>
             <div>
               <input required type="text" maxLength={4} value={code} onChange={e=>setCode(e.target.value)} className="w-40 mx-auto text-center tracking-[0.7em] font-bold text-3xl bg-[#3a3b3c] border border-slate-700 rounded-xl p-4 text-white outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/50" placeholder="0000" />
             </div>
             <button type="submit" disabled={code.length < 4} className="btn-degrade mt-4">Verificar e Criar Conta</button>
             <button type="button" onClick={()=>setStep(1)} className="link-esqueci mt-4 block mx-auto">Voltar e corrigir número</button>
           </form>
        )}
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
      <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-x-auto">
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
                <td className="p-4 font-medium text-white flex items-center gap-2"><span className="text-xl">{row.shield}</span> {row.name}</td>
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
            {table.length === 0 && <tr><td colSpan="10" className="p-4 text-center text-slate-500">Nenhum time registrado.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const CompetitionDetails = ({ comp, teams, matches, onBack, currentUser, onReleaseRound }) => {
  const getTeam = (id) => teams.find(t => t.id === id);

  const getMatchStatusDisplay = (matchId) => {
    const submittedMatch = matches.find(m => m.matchId === matchId);
    if (!submittedMatch) return { text: 'Aguardando Jogo', color: 'text-slate-400', bg: 'bg-slate-800' };
    if (submittedMatch.status === 'approved') return { text: `${submittedMatch.scoreA} - ${submittedMatch.scoreB}`, color: 'text-emerald-400 font-bold text-lg', bg: 'bg-slate-950 border border-emerald-900' };
    if (submittedMatch.status === 'pending') return { text: 'Em Validação', color: 'text-amber-400', bg: 'bg-amber-500/10' };
    if (submittedMatch.status === 'rejected') return { text: 'Rejeitado (Rejogar)', color: 'text-red-400', bg: 'bg-red-500/10' };
    return { text: 'Desconhecido', color: 'text-slate-400', bg: 'bg-slate-800' };
  };

  return (
    <div className="animate-in fade-in duration-500 space-y-6">
      <button onClick={onBack} className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors mb-4"><ArrowLeft size={20} /> Voltar para Competições</button>
      <div className="bg-gradient-to-r from-emerald-900/40 to-slate-900 p-6 rounded-2xl border border-emerald-900/50 flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold text-white mb-2">{comp.name}</h2>
          <p className="text-emerald-400 flex items-center gap-2"><Trophy size={16}/> {comp.format === 'league' ? 'Pontos Corridos' : 'Mata-Mata'}</p>
        </div>
        <span className="bg-emerald-500/20 text-emerald-400 px-3 py-1 rounded-full text-sm font-medium">Em Andamento</span>
      </div>

      <Standings matches={matches} teams={teams} compId={comp.id} />

      <div className="mt-8">
        <h3 className="text-xl font-bold text-white mb-4">Rodadas</h3>
        {comp.rounds?.length > 0 ? (
          <div className="space-y-6">
            {comp.rounds.map((round) => (
              <div key={round.id} className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden">
                <div className="bg-slate-950/50 p-4 border-b border-slate-800 flex justify-between items-center">
                  <h4 className="font-bold text-white flex items-center gap-2">
                    {round.status === 'locked' ? <Lock size={16} className="text-slate-500"/> : <PlayCircle size={16} className="text-emerald-500"/>}
                    Rodada {round.number}
                  </h4>
                  {round.status === 'locked' ? (
                    currentUser.role === 'leader' ? (
                      <Button variant="outline" className="text-xs py-1 border-emerald-500/50 text-emerald-400 hover:bg-emerald-500/10" onClick={() => onReleaseRound(comp.id, round.id)}>Liberar Rodada</Button>
                    ) : ( <span className="text-xs bg-slate-800 text-slate-400 px-2 py-1 rounded-full">Bloqueada</span> )
                  ) : ( <span className="text-xs bg-emerald-500/20 text-emerald-400 px-2 py-1 rounded-full">Liberada para Jogar</span> )}
                </div>
                <div className="p-4 grid gap-3">
                  {round.matches.map(match => {
                    const tA = getTeam(match.teamA); const tB = getTeam(match.teamB); const statusUI = getMatchStatusDisplay(match.id);
                    return (
                      <div key={match.id} className="flex items-center justify-between p-3 bg-slate-950 rounded-xl border border-slate-800/50">
                        <div className="flex-1 text-right font-medium text-slate-200">{tA?.name} <span className="ml-2 text-xl">{tA?.shield}</span></div>
                        <div className={`mx-4 px-4 py-2 rounded-lg text-sm text-center min-w-[120px] ${statusUI.bg} ${statusUI.color}`}>{statusUI.text}</div>
                        <div className="flex-1 text-left font-medium text-slate-200"><span className="mr-2 text-xl">{tB?.shield}</span> {tB?.name}</div>
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

const SubmitMatch = ({ teams, competitions, matches, onSubmit, currentUser }) => {
  const [selectedCompId, setSelectedCompId] = useState('');
  const [selectedMatchId, setSelectedMatchId] = useState('');
  const [availableMatches, setAvailableMatches] = useState([]);
  
  const [teamA, setTeamA] = useState(null); const [teamB, setTeamB] = useState(null);
  const [scoreA, setScoreA] = useState(''); const [scoreB, setScoreB] = useState('');
  const [goalsA, setGoalsA] = useState([]); const [goalsB, setGoalsB] = useState([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false); const [imageUploaded, setImageUploaded] = useState(false);

  const userTeamIds = teams.filter(t => t.ownerId === currentUser.id).map(t => t.id);
  const visibleCompetitions = competitions.filter(c => currentUser.role === 'leader' || c.teams?.some(tId => userTeamIds.includes(tId)));

  useEffect(() => {
    setSelectedMatchId(''); resetAI();
    if (!selectedCompId) { setAvailableMatches([]); return; }
    const comp = competitions.find(c => c.id === selectedCompId);
    if (comp && comp.rounds) {
      let toPlay = [];
      comp.rounds.filter(r => r.status === 'released').forEach(round => {
        round.matches.forEach(rm => {
          const alreadySubmitted = matches.some(m => m.matchId === rm.id && (m.status === 'pending' || m.status === 'approved'));
          if (!alreadySubmitted && (currentUser.role === 'leader' || userTeamIds.includes(rm.teamA) || userTeamIds.includes(rm.teamB))) {
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
      if (match) { setTeamA(teams.find(t => t.id === match.teamA)); setTeamB(teams.find(t => t.id === match.teamB)); }
    } else { setTeamA(null); setTeamB(null); }
  }, [selectedMatchId, availableMatches, teams]);

  const resetAI = () => { setScoreA(''); setScoreB(''); setGoalsA([]); setGoalsB([]); setImageUploaded(false); };

  const simulateAIAnalysis = () => {
    if (!selectedMatchId) return;
    setIsAnalyzing(true);
    setTimeout(() => {
      const sA = Math.floor(Math.random() * 4); const sB = Math.floor(Math.random() * 4);
      setScoreA(sA.toString()); setScoreB(sB.toString());
      const mockPlayers = ['Goku', 'Vegeta', 'Gohan', 'Piccolo', 'Kuririn', 'Trunks'];
      setGoalsA(Array.from({length: sA}, () => ({ player: mockPlayers[Math.floor(Math.random()*3)], minute: Math.floor(Math.random()*90)+1 })).sort((a,b)=>a.minute-b.minute));
      setGoalsB(Array.from({length: sB}, () => ({ player: mockPlayers[Math.floor(Math.random()*3)+3], minute: Math.floor(Math.random()*90)+1 })).sort((a,b)=>a.minute-b.minute));
      setIsAnalyzing(false); setImageUploaded(true);
    }, 2000);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if(!selectedCompId || !selectedMatchId || scoreA === '' || scoreB === '') return;
    const matchDetails = availableMatches.find(m => m.id === selectedMatchId);
    onSubmit({
      id: `m_${Date.now()}`,
      compId: selectedCompId, roundId: matchDetails.roundId, matchId: selectedMatchId,
      teamA: teamA.id, teamB: teamB.id, scoreA: parseInt(scoreA), scoreB: parseInt(scoreB),
      goals: [...goalsA.map(g => ({ teamId: teamA.id, player: g.player, minute: g.minute })), ...goalsB.map(g => ({ teamId: teamB.id, player: g.player, minute: g.minute }))],
      status: 'pending', submittedBy: currentUser.id, imageUrl: 'simulated_image_url'
    });
    setSelectedCompId('');
  };

  return (
    <div className="max-w-2xl mx-auto animate-in fade-in duration-500 pb-12">
      <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2"><Camera className="text-emerald-500" /> Registrar Partida (IA)</h2>
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
            <label className="block text-sm font-medium text-slate-400 mb-2">2. Selecione a Partida Liberada</label>
            {availableMatches.length > 0 ? (
              <select value={selectedMatchId} onChange={e => setSelectedMatchId(e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-white focus:ring-2 focus:ring-emerald-500 outline-none">
                <option value="">Qual jogo você jogou?</option>
                {availableMatches.map(m => {
                  const tA = teams.find(t=>t.id===m.teamA)?.name; const tB = teams.find(t=>t.id===m.teamB)?.name;
                  return <option key={m.id} value={m.id}>Rodada {m.roundId.replace('r','')} - {tA} x {tB}</option>
                })}
              </select>
            ) : <div className="p-3 bg-slate-950 rounded border border-slate-800 text-slate-500 text-sm">Nenhuma partida pendente para você.</div>}
          </div>
        )}

        {selectedMatchId && (
          <div className="animate-in slide-in-from-top-4">
            <label className="block text-sm font-medium text-slate-400 mb-2">3. Envie o Print do Resultado</label>
            <div className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors cursor-pointer ${imageUploaded ? 'border-emerald-500 bg-emerald-500/5' : 'border-slate-700 hover:border-slate-500 bg-slate-950'}`} onClick={!isAnalyzing ? simulateAIAnalysis : undefined}>
              {isAnalyzing ? (
                <div className="flex flex-col items-center space-y-3"><div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div><p className="text-emerald-400 font-medium">IA lendo placar e gols...</p></div>
              ) : imageUploaded ? (
                <div className="flex flex-col items-center space-y-2"><CheckCircle className="text-emerald-500" size={40} /><p className="text-emerald-400 font-medium">Dados extraídos com sucesso!</p></div>
              ) : (
                <div className="flex flex-col items-center space-y-3"><UploadCloud className="text-slate-500" size={40} /><p className="text-white font-medium">Clique para simular upload do print</p></div>
              )}
            </div>
          </div>
        )}

        {imageUploaded && (
          <form onSubmit={handleSubmit} className="animate-in slide-in-from-bottom-4 space-y-6 pt-4 border-t border-slate-800">
            <label className="block text-sm font-medium text-amber-400 mb-2 flex items-center gap-2"><AlertCircle size={16}/> Confirme os dados da IA</label>
            <div className="flex flex-col md:flex-row gap-6 items-start bg-slate-950 p-4 rounded-xl border border-slate-800">
              <div className="flex-1 w-full space-y-3">
                <div className="text-center font-bold text-lg text-slate-300 flex items-center justify-center gap-2">{teamA?.shield} {teamA?.name}</div>
                <input type="number" value={scoreA} readOnly className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-emerald-400 text-center text-3xl font-bold cursor-not-allowed opacity-80" />
                <div className="space-y-1">{goalsA.map((g, i) => <div key={i} className="text-xs bg-slate-800 p-2 rounded text-slate-300 flex justify-between"><span>{g.player}</span><span className="text-emerald-400">{g.minute}'</span></div>)}</div>
              </div>
              <div className="text-slate-500 font-bold text-xl self-center pt-8">X</div>
              <div className="flex-1 w-full space-y-3">
                <div className="text-center font-bold text-lg text-slate-300 flex items-center justify-center gap-2">{teamB?.name} {teamB?.shield}</div>
                <input type="number" value={scoreB} readOnly className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-emerald-400 text-center text-3xl font-bold cursor-not-allowed opacity-80" />
                <div className="space-y-1">{goalsB.map((g, i) => <div key={i} className="text-xs bg-slate-800 p-2 rounded text-slate-300 flex justify-between"><span>{g.player}</span><span className="text-emerald-400">{g.minute}'</span></div>)}</div>
              </div>
            </div>
            <Button type="submit" className="w-full py-3 text-lg">Enviar Partida para Nuvem</Button>
          </form>
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
      <div className="bg-gradient-to-r from-emerald-900/50 to-slate-900 p-6 rounded-2xl border border-emerald-900/50">
        <h2 className="text-2xl font-bold text-white mb-2">QG Nuvem Clã Kame</h2>
        <p className="text-slate-400">Dados sincronizados em tempo real com todos os líderes e membros.</p>
      </div>
      <div>
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2"><Activity size={20} className="text-emerald-500" /> Últimos Resultados da Nuvem</h3>
        <div className="space-y-3">
          {recentMatches.length === 0 && <p className="text-slate-500 text-sm">Nenhum resultado enviado na nuvem.</p>}
          {recentMatches.map(m => {
            const tA = getTeam(m.teamA); const tB = getTeam(m.teamB);
            return (
              <div key={m.id} className="bg-slate-900 p-4 rounded-xl border border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-4 flex-1">
                  <div className="text-right flex-1 font-medium text-slate-200">{tA?.name} <span className="ml-1 text-xl">{tA?.shield}</span></div>
                  <div className="bg-slate-950 px-4 py-2 rounded-lg font-bold text-xl text-emerald-400 border border-slate-800">
                    {m.status === 'approved' || m.status === 'pending' ? `${m.scoreA} - ${m.scoreB}` : '? - ?'}
                  </div>
                  <div className="flex-1 font-medium text-slate-200"><span className="mr-1 text-xl">{tB?.shield}</span> {tB?.name}</div>
                </div>
                <div className="ml-4 w-24 text-right">
                  {m.status === 'approved' ? <span className="text-xs text-emerald-400">✅ Oficial</span> : m.status === 'rejected' ? <span className="text-xs text-red-400">❌ Rejeitado</span> : <span className="text-xs text-amber-400">⏳ Pendente</span>}
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
        {visibleComps.length === 0 && <p className="text-slate-500 col-span-2">Nenhuma competição cadastrada.</p>}
        {visibleComps.map(comp => {
          const isPart = comp.teams?.some(t => userTeamIds.includes(t));
          return (
            <div key={comp.id} onClick={() => onSelectComp(comp.id)} className={`cursor-pointer bg-slate-900 p-6 rounded-2xl border transition-all hover:scale-[1.02] ${currentUser.role === 'leader' && isPart ? 'border-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.15)]' : isPart ? 'border-emerald-500/50 shadow-[0_0_15px_rgba(16,185,129,0.1)]' : 'border-slate-800 hover:border-slate-700'}`}>
              <div className="flex justify-between items-start mb-2">
                <h3 className="text-xl font-bold text-white">{comp.name}</h3>
                {isPart && <span className={`text-xs px-2 py-1 rounded-md font-bold ${currentUser.role === 'leader' ? 'bg-amber-500/20 text-amber-400' : 'bg-emerald-500/20 text-emerald-400'}`}>Você Participa</span>}
              </div>
              <p className="text-sm text-slate-400 mb-4">{comp.format === 'league' ? 'Liga' : 'Copa'} • {comp.teams?.length || 0} equipes</p>
              <div className="text-xs text-slate-500 flex justify-between items-center"><span>Ver Tabela e Jogos ➔</span></div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const ValidationPanel = ({ matches, teams, onUpdateStatus }) => {
  const pending = matches.filter(m => m.status === 'pending');
  const getTeam = (id) => teams.find(t => t.id === id);
  return (
    <div className="animate-in fade-in">
      <div className="flex items-center justify-between mb-6"><h2 className="text-2xl font-bold text-white flex items-center gap-2"><CheckSquare className="text-amber-500" /> Validação na Nuvem</h2><span className="bg-amber-500/20 text-amber-400 px-3 py-1 rounded-full text-sm">{pending.length} Pendentes</span></div>
      {pending.length === 0 ? (
        <div className="bg-slate-900 p-12 rounded-2xl border border-slate-800 text-center"><CheckCircle className="text-emerald-500 mx-auto mb-4" size={48} /><p className="text-slate-400">Nenhum jogo aguardando validação.</p></div>
      ) : (
        <div className="grid gap-4">
          {pending.map(m => (
            <div key={m.id} className="bg-slate-900 p-6 rounded-2xl border border-slate-800 flex flex-col md:flex-row items-center gap-6">
              <div className="flex items-center gap-4 flex-1 w-full justify-center">
                <div className="text-right flex-1 font-bold text-white">{getTeam(m.teamA)?.name}</div>
                <div className="bg-slate-950 px-4 py-2 rounded-lg font-bold text-2xl text-emerald-400 border border-slate-800">{m.scoreA} - {m.scoreB}</div>
                <div className="flex-1 font-bold text-white">{getTeam(m.teamB)?.name}</div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" className="border-red-500/50 text-red-400" onClick={() => onUpdateStatus(m.id, 'rejected')}><XCircle size={16}/> Rejeitar</Button>
                <Button onClick={() => onUpdateStatus(m.id, 'approved')}><CheckCircle size={16}/> Aprovar</Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const CreateCompetition = ({ teams, onCreate }) => {
  const [name, setName] = useState(''); const [format, setFormat] = useState('league');
  const [teamCount, setTeamCount] = useState(''); const [deadline, setDeadline] = useState('');
  const [prize, setPrize] = useState('');
  const [selectedTeams, setSelectedTeams] = useState([]);
  const [error, setError] = useState('');

  const toggleTeam = (teamId) => { setSelectedTeams(selectedTeams.includes(teamId) ? selectedTeams.filter(id => id !== teamId) : [...selectedTeams, teamId]); };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name || !format || !teamCount || !deadline) return setError('Preencha todos os campos.');
    if (selectedTeams.length !== parseInt(teamCount)) return setError(`Selecione exatamente ${teamCount} times.`);
    
    setError('');
    const roundMatches = [];
    let matchCounter = 1;
    for (let i = 0; i < selectedTeams.length - 1; i += 2) {
      roundMatches.push({ id: `m${matchCounter}_new_r1`, teamA: selectedTeams[i], teamB: selectedTeams[i+1], status: 'pending_play' });
      matchCounter++;
    }

    onCreate({ 
      id: `c${Date.now()}`, name, format, deadline, prize, status: 'active', teams: selectedTeams, 
      rounds: roundMatches.length > 0 ? [{ id: 'r1', number: 1, status: 'locked', matches: roundMatches }] : []
    });
  };

  return (
    <div className="max-w-2xl mx-auto animate-in fade-in pb-12">
      <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2"><PlusCircle className="text-emerald-500"/> Nova Competição</h2>
      <form onSubmit={handleSubmit} className="bg-slate-900 p-6 md:p-8 rounded-2xl border border-slate-800 space-y-6">
        {error && <div className="bg-amber-500/10 border border-amber-500/50 text-amber-400 p-4 rounded-xl flex items-center gap-3"><AlertCircle size={20} /><p className="text-sm font-medium">{error}</p></div>}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2"><label className="text-sm font-medium text-slate-400">Nome</label><input type="text" placeholder="Ex: Liga de Inverno" value={name} onChange={e=>setName(e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-white focus:ring-emerald-500 outline-none" required /></div>
          <div className="space-y-2"><label className="text-sm font-medium text-slate-400">Formato</label><select value={format} onChange={e=>setFormat(e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-white focus:ring-emerald-500 outline-none"><option value="league">Pontos Corridos</option><option value="cup">Mata-Mata</option></select></div>
          <div className="space-y-2"><label className="text-sm font-medium text-slate-400">Qtd. Times</label><input type="number" min="2" placeholder="Ex: 8" value={teamCount} onChange={e=>setTeamCount(e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-white focus:ring-emerald-500 outline-none" required /></div>
          <div className="space-y-2"><label className="text-sm font-medium text-slate-400">Prazo Final</label><input type="date" value={deadline} onChange={e=>setDeadline(e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-slate-300 focus:ring-emerald-500 outline-none" required /></div>
          <div className="space-y-2 col-span-1 md:col-span-2"><label className="text-sm font-medium text-slate-400">Premiação</label><input type="text" placeholder="Ex: Troféu + R$ 100,00" value={prize} onChange={e=>setPrize(e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-white focus:ring-emerald-500 outline-none" /></div>
        </div>
        <div className="pt-4 border-t border-slate-800">
          <label className="text-sm font-medium text-slate-400 block mb-4">Selecione as Equipes ({selectedTeams.length} marcadas)</label>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {teams.map(t => {
              const isSelected = selectedTeams.includes(t.id);
              return (
                <div key={t.id} onClick={() => toggleTeam(t.id)} className={`cursor-pointer flex items-center gap-3 p-3 rounded-xl border transition-all ${isSelected ? 'bg-emerald-500/10 border-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.1)]' : 'bg-slate-950 border-slate-800'}`}>
                  <span className="text-2xl">{t.shield}</span><span className={`font-medium text-sm ${isSelected ? 'text-emerald-400' : 'text-slate-300'}`}>{t.name}</span>
                </div>
              );
            })}
          </div>
        </div>
        <Button type="submit" className="w-full py-4 text-lg mt-4">Criar na Nuvem</Button>
      </form>
    </div>
  );
};

const CreateTeam = ({ onCreate }) => {
  const [name, setName] = useState(''); const [coach, setCoach] = useState(''); const [whatsapp, setWhatsapp] = useState('');
  const handleSubmit = (e) => {
    e.preventDefault();
    if(!name || !coach || !whatsapp) return;
    onCreate({ id: `t${Date.now()}`, name, coach, whatsapp, ownerId: 'u1', shield: '🛡️' });
  };
  return (
    <div className="max-w-xl mx-auto animate-in fade-in pb-12">
      <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2"><Users className="text-emerald-500"/> Novo Time</h2>
      <form onSubmit={handleSubmit} className="bg-slate-900 p-6 md:p-8 rounded-2xl border border-slate-800 space-y-5">
        <div><label className="block text-sm font-medium text-slate-400 mb-1">Nome do Time</label><input type="text" placeholder="Ex: Kame FC" value={name} onChange={e=>setName(e.target.value)} className="w-full bg-slate-950 border border-slate-700 focus:border-emerald-500 rounded-lg p-3 text-white outline-none" required /></div>
        <div><label className="block text-sm font-medium text-slate-400 mb-1">Nome do Técnico</label><input type="text" placeholder="Ex: Mestre Kame" value={coach} onChange={e=>setCoach(e.target.value)} className="w-full bg-slate-950 border border-slate-700 focus:border-emerald-500 rounded-lg p-3 text-white outline-none" required /></div>
        <div><label className="block text-sm font-medium text-slate-400 mb-1">WhatsApp</label><input type="tel" placeholder="Ex: (11) 99999-9999" value={whatsapp} onChange={e=>setWhatsapp(e.target.value)} className="w-full bg-slate-950 border border-slate-700 focus:border-emerald-500 rounded-lg p-3 text-white outline-none" required /></div>
        <Button type="submit" className="w-full py-4 text-lg mt-2">Cadastrar na Nuvem</Button>
      </form>
    </div>
  );
};

const TeamsList = ({ teams, currentUser, onEditTeam }) => {
  const [editingId, setEditingId] = useState(null);
  const [editData, setEditData] = useState({ name: '', coach: '', whatsapp: '' });

  const handleWhatsApp = (phone) => { if (phone) window.open(`https://wa.me/${phone.replace(/\D/g, '')}`, '_blank'); };
  const startEdit = (team) => { setEditingId(team.id); setEditData({ name: team.name, coach: team.coach || '', whatsapp: team.whatsapp || '' }); };
  const saveEdit = (team) => { if (editData.name) { onEditTeam({ ...team, ...editData }); setEditingId(null); } };

  return (
    <div className="animate-in fade-in duration-500">
      <div className="flex items-center gap-3 mb-6"><Shield className="text-emerald-500" size={28} /><h2 className="text-2xl font-bold text-white">Mural de Times</h2></div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {teams.map(team => {
          if (editingId === team.id) {
            return (
              <div key={team.id} className="bg-slate-900 p-6 rounded-2xl border border-emerald-500/50 shadow-[0_0_15px_rgba(16,185,129,0.1)] flex flex-col justify-between gap-4">
                <div className="flex items-start gap-4"><span className="text-5xl mt-2">{team.shield}</span><div className="flex-1 space-y-2 w-full"><input type="text" value={editData.name} onChange={e=>setEditData({...editData, name: e.target.value})} className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white text-sm" /><input type="text" value={editData.coach} onChange={e=>setEditData({...editData, coach: e.target.value})} className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white text-sm" /><input type="text" value={editData.whatsapp} onChange={e=>setEditData({...editData, whatsapp: e.target.value})} className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white text-sm" /></div></div>
                <div className="flex gap-2 mt-2"><Button variant="outline" onClick={() => setEditingId(null)} className="flex-1 py-2 text-slate-400 hover:text-white"><X size={16}/> Cancelar</Button><Button onClick={() => saveEdit(team)} className="flex-1 py-2"><Save size={16}/> Salvar</Button></div>
              </div>
            );
          }
          return (
            <div key={team.id} className="relative bg-slate-900 p-6 rounded-2xl border border-slate-800 hover:border-slate-700 transition-all flex flex-col justify-between gap-4 group">
              {currentUser?.role === 'leader' && <button onClick={() => startEdit(team)} className="absolute top-4 right-4 text-slate-500 hover:text-emerald-400 opacity-0 group-hover:opacity-100 p-2"><Edit size={18} /></button>}
              <div className="flex items-center gap-4"><span className="text-5xl">{team.shield}</span><div><h3 className="text-xl font-bold text-white pr-8">{team.name}</h3><p className="text-sm text-slate-400">Técnico: <span className="text-slate-300 font-medium">{team.coach || 'Não informado'}</span></p></div></div>
              <Button onClick={() => handleWhatsApp(team.whatsapp)} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white mt-2" disabled={!team.whatsapp}><MessageCircle size={18} /> Chamar pra Batalha</Button>
            </div>
          );
        })}
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
        if (firebaseConfig.apiKey !== "demo-api-key-so-app-loads" && !firebaseConfig.apiKey.includes("AIzaSyC...")) {
             await signInAnonymously(auth);
        } else {
             setFbUser({ uid: 'mock-user-123' });
             setIsFirebaseLoading(false);
             console.warn("Using mock Firebase configuration.");
        }
      } catch (err) { 
          console.error("Erro Auth:", err);
          setIsFirebaseLoading(false); 
      }
    };
    initAuth();
    
     if (firebaseConfig.apiKey !== "demo-api-key-so-app-loads" && !firebaseConfig.apiKey.includes("AIzaSyC...")) {
        const unsub = onAuthStateChanged(auth, user => { setFbUser(user); });
        return () => unsub();
     }
  }, []);

  useEffect(() => {
    if (!fbUser) return;
    
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

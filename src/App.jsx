import React, { useState, useEffect, useMemo } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, doc, setDoc, updateDoc, onSnapshot, collection, getDocs, getDoc } from 'firebase/firestore';
import { 
  Home, Trophy, Medal, Camera, CheckSquare, Users, 
  LogOut, UploadCloud, CheckCircle, XCircle, AlertCircle, 
  Activity, PlusCircle, ArrowLeft, PlayCircle, Lock,
  Shield, MessageCircle, Edit, Save, X, User
} from 'lucide-react';

// ==========================================
// 1. CONFIGURAÇÃO DO FIREBASE (O SEU CÓDIGO)
// ==========================================
const firebaseConfig = {
  apiKey: "AIzaSyCoZ255eUBfUsIYArCMtHf1T0y_6U5fTsA",
  authDomain: "cla-kame.firebaseapp.com",
  databaseURL: "https://cla-kame-default-rtdb.firebaseio.com",
  projectId: "cla-kame",
  storageBucket: "cla-kame.appspot.com",
  messagingSenderId: "253792062726",
  appId: "1:253792062726:web:1ee567bbbd175c31ce2287"
};

// Inicializa o Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = 'cla-kame-oficial';

const getPublicPath = (colName) => collection(db, 'artifacts', appId, 'public', 'data', colName);
const getPublicDocPath = (colName, docId) => doc(db, 'artifacts', appId, 'public', 'data', colName, docId);

// ==========================================
// 2. COMPONENTES DO PAINEL DE CONTROLO
// ==========================================
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

// ... SUB-ECRÃS DO PAINEL ...
const Standings = ({ matches, teams, compId, compName }) => {
  const table = useMemo(() => calculateStandings(matches, teams, compId), [matches, teams, compId]);
  return (
    <div className="animate-in fade-in duration-500">
      {compName && (<div className="flex items-center gap-3 mb-6"><Trophy className="text-amber-400" size={28} /><h2 className="text-2xl font-bold text-white">Tabela - {compName}</h2></div>)}
      <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-x-auto">
        <table className="w-full text-left text-sm whitespace-nowrap">
          <thead className="bg-slate-950/50 text-slate-400 font-medium"><tr><th className="p-4 w-12 text-center">#</th><th className="p-4">Time</th><th className="p-4 text-center">PTS</th><th className="p-4 text-center">J</th><th className="p-4 text-center">V</th><th className="p-4 text-center">E</th><th className="p-4 text-center">D</th><th className="p-4 text-center">GP</th><th className="p-4 text-center">GC</th><th className="p-4 text-center">SG</th></tr></thead>
          <tbody className="divide-y divide-slate-800/50">
            {table.filter(t => t.p > 0 || table.length > 0).map((row, index) => (
              <tr key={row.id} className="hover:bg-slate-800/50 transition-colors"><td className="p-4 text-center font-bold text-slate-500">{index + 1}</td><td className="p-4 font-medium text-white flex items-center gap-2"><span className="text-xl">{row.shield}</span> {row.name}</td><td className="p-4 text-center font-bold text-emerald-400">{row.pts}</td><td className="p-4 text-center text-slate-300">{row.p}</td><td className="p-4 text-center text-slate-300">{row.w}</td><td className="p-4 text-center text-slate-300">{row.d}</td><td className="p-4 text-center text-slate-300">{row.l}</td><td className="p-4 text-center text-slate-400">{row.gf}</td><td className="p-4 text-center text-slate-400">{row.ga}</td><td className="p-4 text-center text-slate-400 font-medium">{row.gd > 0 ? `+${row.gd}` : row.gd}</td></tr>
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
      <div className="bg-gradient-to-r from-emerald-900/40 to-slate-900 p-6 rounded-2xl border border-emerald-900/50 flex justify-between items-center"><div><h2 className="text-3xl font-bold text-white mb-2">{comp.name}</h2><p className="text-emerald-400 flex items-center gap-2"><Trophy size={16}/> {comp.format === 'league' ? 'Pontos Corridos' : 'Mata-Mata'}</p></div><span className="bg-emerald-500/20 text-emerald-400 px-3 py-1 rounded-full text-sm font-medium">Em Andamento</span></div>
      <Standings matches={matches} teams={teams} compId={comp.id} />
      <div className="mt-8">
        <h3 className="text-xl font-bold text-white mb-4">Rodadas</h3>
        {comp.rounds?.length > 0 ? (
          <div className="space-y-6">
            {comp.rounds.map((round) => (
              <div key={round.id} className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden">
                <div className="bg-slate-950/50 p-4 border-b border-slate-800 flex justify-between items-center"><h4 className="font-bold text-white flex items-center gap-2">{round.status === 'locked' ? <Lock size={16} className="text-slate-500"/> : <PlayCircle size={16} className="text-emerald-500"/>} Rodada {round.number}</h4>{round.status === 'locked' ? (currentUser?.role === 'leader' ? <Button variant="outline" className="text-xs py-1 border-emerald-500/50 text-emerald-400 hover:bg-emerald-500/10" onClick={() => onReleaseRound(comp.id, round.id)}>Liberar Rodada</Button> : <span className="text-xs bg-slate-800 text-slate-400 px-2 py-1 rounded-full">Bloqueada</span>) : <span className="text-xs bg-emerald-500/20 text-emerald-400 px-2 py-1 rounded-full">Liberada</span>}</div>
                <div className="p-4 grid gap-3">{round.matches.map(match => { const tA = getTeam(match.teamA); const tB = getTeam(match.teamB); const statusUI = getMatchStatusDisplay(match.id); return (<div key={match.id} className="flex items-center justify-between p-3 bg-slate-950 rounded-xl border border-slate-800/50"><div className="flex-1 text-right font-medium text-slate-200">{tA?.name} <span className="ml-2 text-xl">{tA?.shield}</span></div><div className={`mx-4 px-4 py-2 rounded-lg text-sm text-center min-w-[120px] ${statusUI.bg} ${statusUI.color}`}>{statusUI.text}</div><div className="flex-1 text-left font-medium text-slate-200"><span className="mr-2 text-xl">{tB?.shield}</span> {tB?.name}</div></div>); })}</div>
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

  const userTeamIds = teams.filter(t => t.ownerId === currentUser?.id).map(t => t.id);
  const visibleCompetitions = competitions.filter(c => currentUser?.role === 'leader' || c.teams?.some(tId => userTeamIds.includes(tId)));

  useEffect(() => {
    setSelectedMatchId(''); resetAI();
    if (!selectedCompId) { setAvailableMatches([]); return; }
    const comp = competitions.find(c => c.id === selectedCompId);
    if (comp && comp.rounds) {
      let toPlay = [];
      comp.rounds.filter(r => r.status === 'released').forEach(round => {
        round.matches.forEach(rm => {
          const alreadySubmitted = matches.some(m => m.matchId === rm.id && (m.status === 'pending' || m.status === 'approved'));
          if (!alreadySubmitted && (currentUser?.role === 'leader' || userTeamIds.includes(rm.teamA) || userTeamIds.includes(rm.teamB))) {
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
      id: `m_${Date.now()}`, compId: selectedCompId, roundId: matchDetails.roundId, matchId: selectedMatchId, teamA: teamA.id, teamB: teamB.id, scoreA: parseInt(scoreA), scoreB: parseInt(scoreB),
      goals: [...goalsA.map(g => ({ teamId: teamA.id, player: g.player, minute: g.minute })), ...goalsB.map(g => ({ teamId: teamB.id, player: g.player, minute: g.minute }))],
      status: 'pending', submittedBy: currentUser?.id, imageUrl: 'simulated_image_url'
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
            ) : <div className="p-3 bg-slate-950 rounded border border-slate-800 text-slate-500 text-sm">Nenhuma partida pendente.</div>}
          </div>
        )}
        {selectedMatchId && (
          <div className="animate-in slide-in-from-top-4">
            <label className="block text-sm font-medium text-slate-400 mb-2">3. Envie o Print do Resultado</label>
            <div className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors cursor-pointer ${imageUploaded ? 'border-emerald-500 bg-emerald-500/5' : 'border-slate-700 hover:border-slate-500 bg-slate-950'}`} onClick={!isAnalyzing ? simulateAIAnalysis : undefined}>
              {isAnalyzing ? (
                <div className="flex flex-col items-center space-y-3"><div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div><p className="text-emerald-400 font-medium">IA a ler placar...</p></div>
              ) : imageUploaded ? (
                <div className="flex flex-col items-center space-y-2"><CheckCircle className="text-emerald-500" size={40} /><p className="text-emerald-400 font-medium">Dados extraídos!</p></div>
              ) : (
                <div className="flex flex-col items-center space-y-3"><UploadCloud className="text-slate-500" size={40} /><p className="text-white font-medium">Clique para simular upload</p></div>
              )}
            </div>
          </div>
        )}
        {imageUploaded && (
          <form onSubmit={handleSubmit} className="animate-in slide-in-from-bottom-4 space-y-6 pt-4 border-t border-slate-800">
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
      <div className="bg-gradient-to-r from-emerald-900/50 to-slate-900 p-6 rounded-2xl border border-emerald-900/50"><h2 className="text-2xl font-bold text-white mb-2">QG Nuvem Clã Kame</h2><p className="text-slate-400">Dados sincronizados em tempo real.</p></div>
      <div>
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2"><Activity size={20} className="text-emerald-500" /> Últimos Resultados</h3>
        <div className="space-y-3">
          {recentMatches.length === 0 && <p className="text-slate-500 text-sm">Nenhum resultado enviado na nuvem.</p>}
          {recentMatches.map(m => {
            const tA = getTeam(m.teamA); const tB = getTeam(m.teamB);
            return (
              <div key={m.id} className="bg-slate-900 p-4 rounded-xl border border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-4 flex-1">
                  <div className="text-right flex-1 font-medium text-slate-200">{tA?.name} <span className="ml-1 text-xl">{tA?.shield}</span></div>
                  <div className="bg-slate-950 px-4 py-2 rounded-lg font-bold text-xl text-emerald-400 border border-slate-800">{m.status === 'approved' || m.status === 'pending' ? `${m.scoreA} - ${m.scoreB}` : '? - ?'}</div>
                  <div className="flex-1 font-medium text-slate-200"><span className="mr-1 text-xl">{tB?.shield}</span> {tB?.name}</div>
                </div>
                <div className="ml-4 w-24 text-right">{m.status === 'approved' ? <span className="text-xs text-emerald-400">✅ Oficial</span> : m.status === 'rejected' ? <span className="text-xs text-red-400">❌ Rejeitado</span> : <span className="text-xs text-amber-400">⏳ Pendente</span>}</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

const CompetitionsList = ({ competitions, teams, currentUser, onSelectComp }) => {
  const userTeamIds = teams.filter(t => t.ownerId === currentUser?.id).map(t => t.id);
  const visibleComps = competitions.filter(c => currentUser?.role === 'leader' || c.teams?.some(t => userTeamIds.includes(t)));
  return (
    <div className="animate-in fade-in duration-500">
      <div className="flex items-center gap-3 mb-6"><Medal className="text-emerald-500" size={28} /><h2 className="text-2xl font-bold text-white">Competições</h2></div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {visibleComps.length === 0 && <p className="text-slate-500 col-span-2">Nenhuma competição.</p>}
        {visibleComps.map(comp => {
          const isPart = comp.teams?.some(t => userTeamIds.includes(t));
          return (
            <div key={comp.id} onClick={() => onSelectComp(comp.id)} className={`cursor-pointer bg-slate-900 p-6 rounded-2xl border transition-all hover:scale-[1.02] ${currentUser?.role === 'leader' && isPart ? 'border-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.15)]' : isPart ? 'border-emerald-500/50 shadow-[0_0_15px_rgba(16,185,129,0.1)]' : 'border-slate-800 hover:border-slate-700'}`}>
              <div className="flex justify-between items-start mb-2"><h3 className="text-xl font-bold text-white">{comp.name}</h3>{isPart && <span className={`text-xs px-2 py-1 rounded-md font-bold ${currentUser?.role === 'leader' ? 'bg-amber-500/20 text-amber-400' : 'bg-emerald-500/20 text-emerald-400'}`}>Participa</span>}</div>
              <p className="text-sm text-slate-400 mb-4">{comp.format === 'league' ? 'Liga' : 'Copa'} • {comp.teams?.length || 0} equipes</p>
              <div className="text-xs text-slate-500 flex justify-between items-center"><span>Ver Tabela ➔</span></div>
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

// ==========================================
// 4. MOTOR PRINCIPAL
// ==========================================
export default function App() {
  const [fbUser, setFbUser] = useState(null);
  const [isFirebaseLoading, setIsFirebaseLoading] = useState(true);
  
  const [users, setUsers] = useState([]);
  const [teams, setTeams] = useState([]);
  const [competitions, setCompetitions] = useState([]);
  const [matches, setMatches] = useState([]);

  // ==========================================
  // ESTADOS DO SEU CÓDIGO DE LOGIN
  // ==========================================
  const [identificacao, setIdentificacao] = useState('');
  const [palavraPasse, setPalavraPasse] = useState('');
  const [manterConectado, setManterConectado] = useState(false);
  const [mensagemErro, setMensagemErro] = useState('');

  const [currentTab, setCurrentTab] = useState('dashboard');
  const [selectedCompId, setSelectedCompId] = useState(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      setFbUser(user);
      setIsFirebaseLoading(false);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!fbUser) return;
    
    // Auto-cria perfil no Firestore caso não exista
    const setupProfile = async () => {
      try {
        const userRef = getPublicDocPath('users', fbUser.uid);
        const snap = await getDoc(userRef);
        if (!snap.exists()) {
          const emailOriginal = fbUser.email || '';
          const isLeader = emailOriginal.includes('11989000858') || emailOriginal.includes('savio');
          await setDoc(userRef, {
            id: fbUser.uid, email: emailOriginal, name: emailOriginal.split('@')[0], role: isLeader ? 'leader' : 'member', whatsapp: emailOriginal.split('@')[0]
          });
        }
      } catch (err) { console.error("Erro ao criar perfil:", err); }
    };
    setupProfile();

    const unsubU = onSnapshot(getPublicPath('users'), snap => setUsers(snap.docs.map(d=>d.data())));
    const unsubT = onSnapshot(getPublicPath('teams'), snap => setTeams(snap.docs.map(d=>d.data())));
    const unsubC = onSnapshot(getPublicPath('competitions'), snap => setCompetitions(snap.docs.map(d=>d.data())));
    const unsubM = onSnapshot(getPublicPath('matches'), snap => setMatches(snap.docs.map(d=>d.data())));

    return () => { unsubU(); unsubT(); unsubC(); unsubM(); };
  }, [fbUser]);

  // ==========================================
  // FUNÇÕES DO SEU CÓDIGO (Intactas)
  // ==========================================
  const formatarParaEmail = (texto) => {
    const textoLimpo = texto.trim().toLowerCase();
    if (textoLimpo.includes('@')) { return textoLimpo; }
    const celularLimpo = textoLimpo.replace(/[-\s().]/g, '');
    return celularLimpo + '@clakame.com';
  };

  const tentarLogin = async () => {
    setMensagemErro('');
    if (!identificacao || !palavraPasse) {
      setMensagemErro('Preencha os dados da batalha!');
      return;
    }
    const emailFake = formatarParaEmail(identificacao);
    try {
      setIsFirebaseLoading(true);
      await signInWithEmailAndPassword(auth, emailFake, palavraPasse);
    } catch (error) {
      setIsFirebaseLoading(false);
      if (error.code === 'auth/invalid-credential' || error.code === 'auth/wrong-password' || error.code === 'auth/user-not-found') {
        setMensagemErro(`Acesso negado: Palavra-passe incorreta ou técnico não encontrado.`);
      } else if (error.code === 'auth/operation-not-allowed') {
        setMensagemErro(`Erro: O método E-mail/Senha está desativado no Firebase!`);
      } else {
        setMensagemErro(`Erro do Firebase: ${error.code}`);
      }
    }
  };

  const fazerLogout = async () => { 
    await signOut(auth); 
    setCurrentTab('dashboard');
  };

  // Funções de Gestão do Painel
  const handleReleaseRound = async (compId, roundId) => {
    const comp = competitions.find(c => c.id === compId);
    if (!comp) return;
    const rounds = comp.rounds.map(r => r.id === roundId ? { ...r, status: 'released' } : r);
    await updateDoc(getPublicDocPath('competitions', compId), { rounds });
  };
  const handleSubmitMatch = async (m) => { await setDoc(getPublicDocPath('matches', m.id), m); setCurrentTab('dashboard'); };
  const handleUpdateMatchStatus = async (id, st) => { await updateDoc(getPublicDocPath('matches', id), { status: st }); };

  // ==========================================
  // RENDERIZAÇÃO
  // ==========================================
  
  if (isFirebaseLoading) {
    return <div className="min-h-screen bg-[#18191a] flex items-center justify-center text-[#ffde59] font-bold text-xl"><Shield size={40} className="mr-3 animate-pulse"/> A conectar ao Clã Kame...</div>;
  }

  const currentUser = users.find(u => u.id === fbUser?.uid);

  // SE NÃO ESTIVER LOGADO -> MOSTRA EXATAMENTE O SEU ECRÃ (Mas embrulhado no 'login-wrapper' para centralizar)
  if (!fbUser || !currentUser) {
    return (
      <div className="login-wrapper">
        <div className="login-container">
          <div className="login-header">
            <Shield size={64} color="#ffde59" style={{ margin: '0 auto -10px auto', display: 'block' }} />
            <h1>Clã Kame</h1>
            <p className="login-subtitle" style={{ marginBottom: '20px' }}>Sistema de Gestão DLS na Nuvem</p>
          </div>

          <div className="login-form-area">
            {mensagemErro && (
              <div style={{ color: '#ff914d', fontWeight: 'bold', marginBottom: '15px', padding: '10px', backgroundColor: 'rgba(255, 145, 77, 0.1)', borderRadius: '8px' }}>
                {mensagemErro}
              </div>
            )}

            <div className="input-group">
              <label>E-mail ou Celular (com DDD)</label>
              <input 
                type="text" 
                placeholder="Ex: vitor@email.com ou 11999999999" 
                value={identificacao}
                onChange={(evento) => setIdentificacao(evento.target.value)}
              />
            </div>

            <div className="input-group">
              <label>Senha</label>
              <input 
                type="password" 
                placeholder="••••••••" 
                value={palavraPasse}
                onChange={(evento) => setPalavraPasse(evento.target.value)}
              />
            </div>

            <div className="login-opcoes">
              <label className="checkbox-label">
                <input 
                  type="checkbox" 
                  checked={manterConectado} 
                  onChange={(evento) => setManterConectado(evento.target.checked)} 
                /> 
                Manter conectado
              </label>
              <button className="link-esqueci" onClick={() => alert('Função Esqueci a Senha em construção')}>
                Esqueci a senha
              </button>
            </div>

            {/* APENAS O BOTÃO DE ENTRAR */}
            <button className="btn-degrade" onClick={tentarLogin}>
              Entrar
            </button>
          </div>
        </div>
      </div>
    );
  }

  // SE ESTIVER LOGADO -> MOSTRA O PAINEL DE GESTÃO COMPLETO
  const isLeader = currentUser?.role === 'leader';
  const TABS = [
    { id: 'dashboard', label: 'Início', icon: Home },
    { id: 'competitions', label: 'Competições', icon: Medal },
    { id: 'submit', label: 'Registrar Jogo', icon: Camera },
    ...(isLeader ? [ { id: 'validation', label: 'Validação', icon: CheckSquare } ] : []),
  ];

  const renderContent = () => {
    switch (currentTab) {
      case 'dashboard': return <Dashboard matches={matches} teams={teams} />;
      case 'competitions': return <CompetitionsList competitions={competitions} teams={teams} currentUser={currentUser} onSelectComp={id => {setSelectedCompId(id); setCurrentTab('comp_details');}} />;
      case 'comp_details': return <CompetitionDetails comp={competitions.find(c=>c.id===selectedCompId)} teams={teams} matches={matches} currentUser={currentUser} onBack={()=>setCurrentTab('competitions')} onReleaseRound={handleReleaseRound} />;
      case 'submit': return <SubmitMatch teams={teams} competitions={competitions} matches={matches} onSubmit={handleSubmitMatch} currentUser={currentUser} />;
      case 'validation': return <ValidationPanel matches={matches} teams={teams} onUpdateStatus={handleUpdateMatchStatus} />;
      default: return null;
    }
  };

  const pendingCount = isLeader ? matches.filter(m=>m.status==='pending').length : 0;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans flex flex-col md:flex-row">
      <aside className="w-full md:w-64 bg-slate-900 border-b md:border-b-0 md:border-r border-slate-800 flex flex-col shrink-0">
        <div className="p-6 flex items-center gap-3">
          <Shield size={32} color="#ffde59" />
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
            <p className="text-xs text-slate-500 mb-3">{isLeader ? 'Líder Supremo' : 'Membro Oficial'}</p>
            <button onClick={fazerLogout} className="w-full flex items-center justify-center gap-2 text-xs text-slate-400 hover:text-white py-2 rounded-lg hover:bg-slate-800 transition-colors"><LogOut size={14} /> Sair</button>
          </div>
        </div>
      </aside>
      <main className="flex-1 p-4 md:p-8 overflow-y-auto"><div className="max-w-5xl mx-auto pb-20 md:pb-0">{renderContent()}</div></main>
    </div>
  );
}

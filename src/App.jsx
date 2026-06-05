import React, { useState, useEffect, useMemo } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, doc, setDoc, updateDoc, onSnapshot, collection, getDocs, getDoc } from 'firebase/firestore';
import { 
  Home, Trophy, Medal, Camera, CheckSquare, Users, 
  LogOut, UploadCloud, CheckCircle, XCircle, AlertCircle, 
  Activity, PlusCircle, ArrowLeft, PlayCircle, Lock,
  Shield, MessageCircle, Edit, Save, X, User, Crown, Star
} from 'lucide-react';

// ==========================================
// 1. CONFIGURAÇÃO REAL DO FIREBASE
// ==========================================
const firebaseConfig = {
  apiKey : "AIzaSyCoZ255eUBfUsIYArCMtHflT0y_6U5fTsA" , 
  authDomain : "cla-kame.firebaseapp.com" , 
  databaseURL : "https://cla-kame-default-rtdb.firebaseio.com" , 
  projectId : "cla-kame" , 
  storageBucket : "cla-kame.firebasestorage.app" , 
  messagingSenderId : "253792062726" , 
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
const TeamsList = ({ teams, users, currentUser, onEditTeam }) => {
  const [editingId, setEditingId] = useState(null);
  const [editData, setEditData] = useState({ name: '', coach: '', whatsapp: '', role: 'member' });
  const isAdmin = currentUser?.role === 'leader' || currentUser?.role === 'kaioh';

  const handleWhatsApp = (phone) => { if (phone) window.open(`https://wa.me/${phone.replace(/\D/g, '')}`, '_blank'); };
  
  const startEdit = (team) => { 
    const owner = users.find(u => u.id === team.ownerId);
    setEditingId(team.id); 
    setEditData({ 
      name: team.name, 
      coach: team.coach || '', 
      whatsapp: team.whatsapp || '',
      role: owner?.role || 'member'
    }); 
  };

  const saveEdit = (team) => { 
    if (editData.name) { 
      onEditTeam({ ...team, ...editData }, editData.role); 
      setEditingId(null); 
    } 
  };

  return (
    <div className="animate-in fade-in duration-500">
      <div className="flex items-center gap-3 mb-6"><Shield className="text-emerald-500" size={28} /><h2 className="text-2xl font-bold text-white">Mural de Times</h2></div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {teams.map(team => {
          const owner = users.find(u => u.id === team.ownerId);
          const role = owner?.role || 'member';
          
          if (editingId === team.id) {
            return (
              <div key={team.id} className="bg-slate-900 p-6 rounded-2xl border border-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.1)] flex flex-col gap-4">
                <div className="flex items-start gap-4">
                  <span className="text-5xl mt-2">{team.shield}</span>
                  <div className="flex-1 space-y-2 w-full">
                    <label className="text-xs text-slate-400">Nome do Time</label>
                    <input type="text" value={editData.name} onChange={e=>setEditData({...editData, name: e.target.value})} className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white text-sm outline-none focus:border-amber-500" />
                    
                    <label className="text-xs text-slate-400">Técnico e WhatsApp</label>
                    <input type="text" value={editData.coach} onChange={e=>setEditData({...editData, coach: e.target.value})} className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white text-sm outline-none focus:border-amber-500" placeholder="Nome do Técnico" />
                    <input type="text" value={editData.whatsapp} onChange={e=>setEditData({...editData, whatsapp: e.target.value})} className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white text-sm outline-none focus:border-amber-500" placeholder="11999999999" />
                    
                    {owner && currentUser?.role === 'leader' && (
                      <>
                        <label className="text-xs text-amber-400 mt-2 block">Cargo no Clã</label>
                        <select value={editData.role} onChange={e=>setEditData({...editData, role: e.target.value})} className="w-full bg-slate-950 border border-amber-500/50 text-amber-400 rounded p-2 text-sm outline-none">
                          <option value="member">Membro Oficial</option>
                          <option value="kaioh">Senhor Kaioh (Sub-Líder)</option>
                          <option value="leader">Líder Supremo</option>
                        </select>
                      </>
                    )}
                  </div>
                </div>
                <div className="flex gap-2 mt-2">
                  <Button variant="outline" onClick={() => setEditingId(null)} className="flex-1 py-2 text-slate-400"><X size={16}/> Cancelar</Button>
                  <Button onClick={() => saveEdit(team)} className="flex-1 py-2 bg-amber-600 hover:bg-amber-500 shadow-amber-900/50"><Save size={16}/> Salvar</Button>
                </div>
              </div>
            );
          }
          return (
            <div key={team.id} className="relative bg-slate-900 p-6 rounded-2xl border border-slate-800 hover:border-slate-700 transition-all flex flex-col justify-between gap-4 group">
              {isAdmin && (
                <button onClick={() => startEdit(team)} className="absolute top-4 right-4 text-slate-500 hover:text-amber-400 opacity-0 group-hover:opacity-100 p-2 transition-all">
                  <Edit size={18} />
                </button>
              )}
              <div className="flex items-center gap-4">
                <span className="text-5xl">{team.shield}</span>
                <div>
                  <h3 className="text-xl font-bold text-white pr-8">{team.name}</h3>
                  <p className="text-sm text-slate-400">Técnico: <span className="text-slate-300 font-medium">{team.coach || 'Não informado'}</span></p>
                  
                  {role === 'leader' && <span className="inline-flex items-center gap-1 mt-2 text-xs font-bold text-amber-400 bg-amber-500/10 px-2 py-1 rounded border border-amber-500/20"><Crown size={12}/> Líder</span>}
                  {role === 'kaioh' && <span className="inline-flex items-center gap-1 mt-2 text-xs font-bold text-purple-400 bg-purple-500/10 px-2 py-1 rounded border border-purple-500/20"><Star size={12}/> Kaioh</span>}
                </div>
              </div>
              <Button onClick={() => handleWhatsApp(team.whatsapp)} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white mt-2" disabled={!team.whatsapp}><MessageCircle size={18} /> Chamar pra Batalha</Button>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const CreateTeam = ({ onCreate }) => {
  const [name, setName] = useState(''); const [coach, setCoach] = useState(''); const [whatsapp, setWhatsapp] = useState('');
  
  const handleSubmit = (e) => {
    e.preventDefault();
    if(!name || !coach || !whatsapp) return;
    onCreate({ 
      id: `t${Date.now()}`, 
      name, 
      coach, 
      whatsapp: whatsapp.replace(/\D/g, ''), 
      shield: '🛡️' 
    });
    setName(''); setCoach(''); setWhatsapp('');
    alert("Time criado! O técnico receberá a posse quando fizer o primeiro login com este WhatsApp.");
  };

  return (
    <div className="max-w-xl mx-auto animate-in fade-in pb-12">
      <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2"><Users className="text-emerald-500"/> Cadastrar Novo Time</h2>
      <div className="bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-xl mb-6 text-sm text-emerald-400">
        <p className="font-bold flex items-center gap-2"><Activity size={16}/> Entrega Automática</p>
        <p className="mt-1">Cadastre o WhatsApp correto do técnico. Assim que ele aceder ao site pela primeira vez com esse número, o sistema irá entregar-lhe a gestão deste time automaticamente!</p>
      </div>
      
      <form onSubmit={handleSubmit} className="bg-slate-900 p-6 md:p-8 rounded-2xl border border-slate-800 space-y-5">
        <div><label className="block text-sm font-medium text-slate-400 mb-1">Nome do Time</label><input type="text" placeholder="Ex: Kame FC" value={name} onChange={e=>setName(e.target.value)} className="w-full bg-slate-950 border border-slate-700 focus:border-emerald-500 rounded-lg p-3 text-white outline-none" required /></div>
        <div><label className="block text-sm font-medium text-slate-400 mb-1">Nome do Técnico</label><input type="text" placeholder="Ex: Mestre Kame" value={coach} onChange={e=>setCoach(e.target.value)} className="w-full bg-slate-950 border border-slate-700 focus:border-emerald-500 rounded-lg p-3 text-white outline-none" required /></div>
        <div><label className="block text-sm font-medium text-slate-400 mb-1">WhatsApp do Técnico (com DDD)</label><input type="tel" placeholder="Ex: 11999999999" value={whatsapp} onChange={e=>setWhatsapp(e.target.value)} className="w-full bg-slate-950 border border-slate-700 focus:border-emerald-500 rounded-lg p-3 text-white outline-none" required /></div>
        <Button type="submit" className="w-full py-4 text-lg mt-2 shadow-emerald-900/50 shadow-xl">Salvar e Preparar Entrega</Button>
      </form>
    </div>
  );
};

const CreateCompetition = ({ teams, onCreate }) => {
  const [name, setName] = useState(''); const [format, setFormat] = useState('league');
  const [selectedTeams, setSelectedTeams] = useState([]);
  const [error, setError] = useState('');

  const toggleTeam = (teamId) => { setSelectedTeams(selectedTeams.includes(teamId) ? selectedTeams.filter(id => id !== teamId) : [...selectedTeams, teamId]); };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name || !format) return setError('Preencha o nome da competição.');
    if (selectedTeams.length < 2) return setError('Selecione pelo menos 2 times para competir.');
    
    setError('');
    
    // Gerador Simples de 1ª Rodada (Pares Aleatórios)
    const shuffledTeams = [...selectedTeams].sort(() => 0.5 - Math.random());
    const roundMatches = [];
    let matchCounter = 1;
    
    for (let i = 0; i < shuffledTeams.length - 1; i += 2) {
      roundMatches.push({ 
        id: `m${matchCounter}_new_r1`, 
        teamA: shuffledTeams[i], 
        teamB: shuffledTeams[i+1], 
        status: 'pending_play' 
      });
      matchCounter++;
    }

    onCreate({ 
      id: `c${Date.now()}`, 
      name, 
      format, 
      status: 'active', 
      teams: selectedTeams, 
      rounds: roundMatches.length > 0 ? [{ id: 'r1', number: 1, status: 'released', matches: roundMatches }] : []
    });
  };

  return (
    <div className="max-w-3xl mx-auto animate-in fade-in pb-12">
      <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2"><PlusCircle className="text-emerald-500"/> Criar Nova Competição</h2>
      <form onSubmit={handleSubmit} className="bg-slate-900 p-6 md:p-8 rounded-2xl border border-slate-800 space-y-6">
        {error && <div className="bg-amber-500/10 border border-amber-500/50 text-amber-400 p-4 rounded-xl flex items-center gap-3"><AlertCircle size={20} /><p className="text-sm font-medium">{error}</p></div>}
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-400">Nome do Torneio</label>
            <input type="text" placeholder="Ex: Copa Clã Kame" value={name} onChange={e=>setName(e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-white focus:ring-emerald-500 outline-none" required />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-400">Formato</label>
            <select value={format} onChange={e=>setFormat(e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-white focus:ring-emerald-500 outline-none">
              <option value="league">Pontos Corridos (Liga)</option>
              <option value="cup">Mata-Mata (Copa)</option>
            </select>
          </div>
        </div>
        
        <div className="pt-6 border-t border-slate-800">
          <div className="flex justify-between items-center mb-4">
            <label className="text-sm font-medium text-slate-400">Quais times vão participar?</label>
            <span className="text-xs bg-emerald-500/20 text-emerald-400 px-2 py-1 rounded font-bold">{selectedTeams.length} Selecionados</span>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {teams.map(t => {
              const isSelected = selectedTeams.includes(t.id);
              return (
                <div key={t.id} onClick={() => toggleTeam(t.id)} className={`cursor-pointer flex items-center gap-3 p-3 rounded-xl border transition-all ${isSelected ? 'bg-emerald-500/10 border-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.1)]' : 'bg-slate-950 border-slate-800 hover:border-slate-700'}`}>
                  <span className="text-2xl">{t.shield}</span>
                  <div className="flex flex-col">
                    <span className={`font-medium text-sm ${isSelected ? 'text-emerald-400' : 'text-slate-300'}`}>{t.name}</span>
                    <span className="text-[10px] text-slate-500">{t.coach}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        
        <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-sm text-slate-400 text-center">
          O sistema irá pegar nos times selecionados e <b className="text-emerald-400">gerar a 1ª Rodada automaticamente</b> ao clicar em salvar.
        </div>

        <Button type="submit" className="w-full py-4 text-lg mt-4">Lançar Competição</Button>
      </form>
    </div>
  );
};

// ==========================================
// 4. RESTANTES ECRÃS DO SISTEMA
// ==========================================
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
  const isAdmin = currentUser?.role === 'leader' || currentUser?.role === 'kaioh';
  
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
                <div className="bg-slate-950/50 p-4 border-b border-slate-800 flex justify-between items-center"><h4 className="font-bold text-white flex items-center gap-2">{round.status === 'locked' ? <Lock size={16} className="text-slate-500"/> : <PlayCircle size={16} className="text-emerald-500"/>} Rodada {round.number}</h4>{round.status === 'locked' ? (isAdmin ? <Button variant="outline" className="text-xs py-1 border-emerald-500/50 text-emerald-400 hover:bg-emerald-500/10" onClick={() => onReleaseRound(comp.id, round.id)}>Liberar Rodada</Button> : <span className="text-xs bg-slate-800 text-slate-400 px-2 py-1 rounded-full">Bloqueada</span>) : <span className="text-xs bg-emerald-500/20 text-emerald-400 px-2 py-1 rounded-full">Liberada</span>}</div>
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

  const isAdmin = currentUser?.role === 'leader' || currentUser?.role === 'kaioh';
  const userTeamIds = teams.filter(t => t.ownerId === currentUser?.id).map(t => t.id);
  const visibleCompetitions = competitions.filter(c => isAdmin || c.teams?.some(tId => userTeamIds.includes(tId)));

  useEffect(() => {
    setSelectedMatchId(''); resetAI();
    if (!selectedCompId) { setAvailableMatches([]); return; }
    const comp = competitions.find(c => c.id === selectedCompId);
    if (comp && comp.rounds) {
      let toPlay = [];
      comp.rounds.filter(r => r.status === 'released').forEach(round => {
        round.matches.forEach(rm => {
          const alreadySubmitted = matches.some(m => m.matchId === rm.id && (m.status === 'pending' || m.status === 'approved'));
          if (!alreadySubmitted && (isAdmin || userTeamIds.includes(rm.teamA) || userTeamIds.includes(rm.teamB))) {
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
  const isAdmin = currentUser?.role === 'leader' || currentUser?.role === 'kaioh';
  const userTeamIds = teams.filter(t => t.ownerId === currentUser?.id).map(t => t.id);
  const visibleComps = competitions.filter(c => isAdmin || c.teams?.some(t => userTeamIds.includes(t)));
  return (
    <div className="animate-in fade-in duration-500">
      <div className="flex items-center gap-3 mb-6"><Medal className="text-emerald-500" size={28} /><h2 className="text-2xl font-bold text-white">Competições</h2></div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {visibleComps.length === 0 && <p className="text-slate-500 col-span-2">Nenhuma competição.</p>}
        {visibleComps.map(comp => {
          const isPart = comp.teams?.some(t => userTeamIds.includes(t));
          return (
            <div key={comp.id} onClick={() => onSelectComp(comp.id)} className={`cursor-pointer bg-slate-900 p-6 rounded-2xl border transition-all hover:scale-[1.02] ${isAdmin && isPart ? 'border-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.15)]' : isPart ? 'border-emerald-500/50 shadow-[0_0_15px_rgba(16,185,129,0.1)]' : 'border-slate-800 hover:border-slate-700'}`}>
              <div className="flex justify-between items-start mb-2"><h3 className="text-xl font-bold text-white">{comp.name}</h3>{isPart && <span className={`text-xs px-2 py-1 rounded-md font-bold ${isAdmin ? 'bg-amber-500/20 text-amber-400' : 'bg-emerald-500/20 text-emerald-400'}`}>Participa</span>}</div>
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
// 4. MOTOR CENTRAL DO APLICATIVO
// ==========================================
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

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      setFbUser(user);
      setIsFirebaseLoading(false);
    });
    return () => unsub();
  }, []);

  // Sincroniza dados e auto-vincula times pendentes
  useEffect(() => {
    if (!fbUser) return;
    
    setIsProfileLoading(true);
    setProfileError('');

    const setupProfile = async () => {
      try {
        const userRef = getPublicDocPath('users', fbUser.uid);
        const snap = await getDoc(userRef);
        let userWhatsapp = fbUser.email?.split('@')[0] || '';
        
        if (!snap.exists()) {
          const isLeader = fbUser.email.includes('11989000858') || fbUser.email.includes('savio');
          await setDoc(userRef, {
            id: fbUser.uid, email: fbUser.email, name: userWhatsapp, role: isLeader ? 'leader' : 'member', whatsapp: userWhatsapp
          });
        }
        setIsProfileLoading(false);
      } catch (err) { 
        console.error("Erro perfil:", err);
        setIsProfileLoading(false);
        setProfileError(err.message || 'Ocorreu um erro de conexão (Offline).');
      }
    };
    setupProfile();

    const unsubU = onSnapshot(getPublicPath('users'), snap => setUsers(snap.docs.map(d=>d.data())));
    const unsubT = onSnapshot(getPublicPath('teams'), snap => setTeams(snap.docs.map(d=>d.data())));
    const unsubC = onSnapshot(getPublicPath('competitions'), snap => setCompetitions(snap.docs.map(d=>d.data())));
    const unsubM = onSnapshot(getPublicPath('matches'), snap => setMatches(snap.docs.map(d=>d.data())));

    return () => { unsubU(); unsubT(); unsubC(); unsubM(); };
  }, [fbUser]);

  // Vínculo inteligente de times (Se o técnico entrar, ganha o time que criaram para ele)
  useEffect(() => {
    const linkPendingTeams = async () => {
      if (!fbUser || teams.length === 0) return;
      const userWhatsapp = fbUser.email?.split('@')[0];
      const pendingTeams = teams.filter(t => t.whatsapp === userWhatsapp && t.ownerId === `pending_${userWhatsapp}`);
      
      for (const t of pendingTeams) {
        await updateDoc(getPublicDocPath('teams', t.id), { ownerId: fbUser.uid });
      }
    };
    linkPendingTeams();
  }, [teams, fbUser]);

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
      setIsFirebaseLoading(false);
      if (error.code === 'auth/invalid-credential' || error.code === 'auth/wrong-password' || error.code === 'auth/user-not-found') {
        setMensagemErro(`Acesso negado: Palavra-passe incorreta ou técnico não encontrado.`);
      } else {
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
  };
  const handleSubmitMatch = async (m) => { await setDoc(getPublicDocPath('matches', m.id), m); setCurrentTab('dashboard'); };
  const handleUpdateMatchStatus = async (id, st) => { await updateDoc(getPublicDocPath('matches', id), { status: st }); };

  // ==========================================
  // NOVAS FUNÇÕES PARA LÍDERES
  // ==========================================
  const handleEditTeam = async (updatedTeam, newRole) => {
    // 1. Atualiza as informações do Time
    const { id, name, coach, whatsapp, ownerId } = updatedTeam;
    await updateDoc(getPublicDocPath('teams', id), { name, coach, whatsapp: whatsapp.replace(/\D/g, '') });
    
    // 2. Atualiza o Cargo do utilizador (se o time já tiver um dono)
    if (ownerId && !ownerId.startsWith('pending_') && newRole) {
      await updateDoc(getPublicDocPath('users', ownerId), { role: newRole });
    }
  };

  const handleCreateTeam = async (teamData) => { 
    // Define um dono provisório caso o utilizador ainda não exista
    const ownerId = `pending_${teamData.whatsapp}`;
    await setDoc(getPublicDocPath('teams', teamData.id), { ...teamData, ownerId }); 
    setCurrentTab('teams_list'); 
  };
  
  const handleCreateComp = async (c) => { 
    await setDoc(getPublicDocPath('competitions', c.id), c); 
    setCurrentTab('competitions'); 
  };

  // ==========================================
  // RENDERIZAÇÃO
  // ==========================================
  if (isFirebaseLoading) {
    return (<div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: '#18191a', color: '#ffde59', fontFamily: 'sans-serif' }}><h2>🛡️ A preparar o Clã Kame...</h2></div>);
  }

  if (fbUser && isProfileLoading) {
    return (<div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: '#18191a', color: '#ffde59', fontFamily: 'sans-serif' }}><h2>⏳ A carregar o seu Quartel General...</h2></div>);
  }

  if (fbUser && profileError) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', backgroundColor: '#18191a', color: '#e4e6eb', fontFamily: 'sans-serif', textAlign: 'center', padding: '20px' }}>
        <AlertCircle size={64} color="#ff914d" style={{ marginBottom: '20px' }} />
        <h2 style={{ color: '#ffde59', marginBottom: '10px' }}>Ocorreu um erro na Base de Dados</h2>
        <div style={{ maxWidth: '600px', backgroundColor: '#242526', padding: '20px', borderRadius: '12px', border: '1px solid #3a3b3c', textAlign: 'left', lineHeight: '1.6' }}>
          <p style={{ color: '#ff914d', fontWeight: 'bold', marginTop: 0 }}>Erro exato: "{profileError}"</p>
          <p style={{ color: '#b0b3b8' }}>Se o erro disser <b>"Missing or insufficient permissions"</b>, significa que o seu Firestore bloqueou o acesso.</p>
        </div>
        <div style={{ display: 'flex', gap: '15px', marginTop: '25px' }}>
          <button onClick={() => window.location.reload()} style={{ padding: '12px 24px', backgroundColor: '#ff914d', fontWeight: 'bold', borderRadius: '8px', cursor: 'pointer', border: 'none', color: 'black', textTransform: 'uppercase' }}>Tentar Novamente</button>
          <button onClick={async () => { await signOut(auth); window.location.reload(); }} style={{ padding: '12px 24px', backgroundColor: 'transparent', border: '2px solid #ff914d', color: '#ff914d', fontWeight: 'bold', borderRadius: '8px', cursor: 'pointer', textTransform: 'uppercase' }}>Desconectar / Sair</button>
        </div>
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
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '10px' }}><Shield size={64} color="#ffde59" /></div>
            <h1 style={{ margin: 0, color: 'white', fontSize: '32px', fontWeight: 'bold' }}>Clã Kame</h1>
            <p style={{ color: '#b0b3b8', fontSize: '14px', marginTop: '5px' }}>Sistema de Gestão DLS na Nuvem</p>
          </div>
          {mensagemErro && (<div style={{ color: '#ff914d', fontWeight: 'bold', marginBottom: '15px', padding: '10px', backgroundColor: 'rgba(255, 145, 77, 0.1)', borderRadius: '8px', fontSize: '14px' }}>{mensagemErro}</div>)}
          <div style={{ textAlign: 'left', marginBottom: '15px' }}><label style={{ fontSize: '14px', color: '#b0b3b8', fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>E-mail ou Celular (com DDD)</label><input type="text" placeholder="Ex: vitor@email.com ou 11999999999" value={identificacao} onChange={(evento) => setIdentificacao(evento.target.value)} style={{ width: '100%', padding: '12px', backgroundColor: '#3a3b3c', border: 'none', borderRadius: '8px', color: 'white', outline: 'none' }}/></div>
          <div style={{ textAlign: 'left', marginBottom: '15px' }}><label style={{ fontSize: '14px', color: '#b0b3b8', fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>Senha</label><input type="password" placeholder="••••••••" value={palavraPasse} onChange={(evento) => setPalavraPasse(evento.target.value)} style={{ width: '100%', padding: '12px', backgroundColor: '#3a3b3c', border: 'none', borderRadius: '8px', color: 'white', outline: 'none' }}/></div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', marginBottom: '25px', color: '#b0b3b8' }}><label style={{ display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer' }}><input type="checkbox" checked={manterConectado} onChange={(evento) => setManterConectado(evento.target.checked)} /> Manter conectado</label><span style={{ color: '#ffde59', cursor: 'pointer' }} onClick={() => alert('Função em construção')}>Esqueci a senha</span></div>
          <button onClick={tentarLogin} style={{ width: '100%', padding: '15px', borderRadius: '10px', background: 'linear-gradient(135deg, #ffde59 0%, #ff914d 100%)', color: 'black', fontWeight: 'bold', fontSize: '16px', border: 'none', cursor: 'pointer', textTransform: 'uppercase' }}>Entrar</button>
        </div>
      </div>
    );
  }

  const isAdmin = currentUser?.role === 'leader' || currentUser?.role === 'kaioh';
  const roleName = ROLE_NAMES[currentUser?.role] || ROLE_NAMES.member;
  
  const TABS = [
    { id: 'dashboard', label: 'Início', icon: Home },
    { id: 'teams_list', label: 'Times do Clã', icon: Shield },
    { id: 'competitions', label: 'Competições', icon: Medal },
    { id: 'submit', label: 'Registrar Jogo', icon: Camera },
    ...(isAdmin ? [ 
      { id: 'validation', label: 'Validação', icon: CheckSquare },
      { id: 'create_comp', label: 'Nova Competição', icon: PlusCircle },
      { id: 'create_team', label: 'Novo Time', icon: Users }
    ] : []),
  ];

  const renderContent = () => {
    switch (currentTab) {
      case 'dashboard': return <Dashboard matches={matches} teams={teams} />;
      case 'teams_list': return <TeamsList teams={teams} users={users} currentUser={currentUser} onEditTeam={handleEditTeam} />;
      case 'competitions': return <CompetitionsList competitions={competitions} teams={teams} currentUser={currentUser} onSelectComp={id => {setSelectedCompId(id); setCurrentTab('comp_details');}} />;
      case 'comp_details': return <CompetitionDetails comp={competitions.find(c=>c.id===selectedCompId)} teams={teams} matches={matches} currentUser={currentUser} onBack={()=>setCurrentTab('competitions')} onReleaseRound={handleReleaseRound} />;
      case 'submit': return <SubmitMatch teams={teams} competitions={competitions} matches={matches} onSubmit={handleSubmitMatch} currentUser={currentUser} />;
      case 'validation': return <ValidationPanel matches={matches} teams={teams} onUpdateStatus={handleUpdateMatchStatus} />;
      case 'create_comp': return <CreateCompetition teams={teams} onCreate={handleCreateComp} />;
      case 'create_team': return <CreateTeam onCreate={handleCreateTeam} />;
      default: return null;
    }
  };

  const pendingCount = isAdmin ? matches.filter(m=>m.status==='pending').length : 0;

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
            <p className="text-xs text-slate-500 mb-3">{roleName}</p>
            <button onClick={fazerLogout} className="w-full flex items-center justify-center gap-2 text-xs text-slate-400 hover:text-white py-2 rounded-lg hover:bg-slate-800 transition-colors"><LogOut size={14} /> Sair</button>
          </div>
        </div>
      </aside>
      <main className="flex-1 p-4 md:p-8 overflow-y-auto"><div className="max-w-5xl mx-auto pb-20 md:pb-0">{renderContent()}</div></main>
    </div>
  );
}

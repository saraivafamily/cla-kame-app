import React, { useState, useEffect } from 'react';
import { updateDoc } from 'firebase/firestore';
import { getPublicDocPath } from '../utils/firebase';
import { Save, Zap, ArrowLeft, RotateCcw, Edit3, RefreshCw, XCircle, PlusCircle } from 'lucide-react';
import Button from './Button';
import ShieldDisplay from './ShieldDisplay';

const XPointsManager = ({ users, teams, onBack, showToast }) => {
  const [draftPoints, setDraftPoints] = useState({});
  const [draftTeamNames, setDraftTeamNames] = useState({});
  const [draftBranches, setDraftBranches] = useState({});
  const [isEditingName, setIsEditingName] = useState({});
  const [isSaving, setIsSaving] = useState(false);
  
  // 🌟 ESTADOS INDEPENDENTES PARA CADA ILHA
  const [selectedTropical, setSelectedTropical] = useState('');
  const [selectedCeu, setSelectedCeu] = useState('');
  
  const validUsers = (users || []).filter(u => {
    // Esconde o Master, quem não tem nome, e quem não está ativo
    if (!u.name || u.id === 'u_master' || u.status !== 'active') return false;
    
    // Procura o time e esconde se estiver marcado como Inativo
    const userTeam = (teams || []).find(t => t.ownerId === u.id);
    if (userTeam && userTeam.status === 'inactive') return false;
    
    return true;
  });
  
  useEffect(() => {
    const initialPoints = {}; const initialTeams = {}; const initialBranches = {};
    validUsers.forEach(u => {
      initialPoints[u.id] = u.dlsXPoints || '';
      initialTeams[u.id] = u.dlsTeamName || ''; 
      if (u.clanBranch) initialBranches[u.id] = u.clanBranch;
    });
    setDraftPoints(initialPoints); setDraftTeamNames(initialTeams); setDraftBranches(initialBranches);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [users]);

  const unassignedUsers = validUsers.filter(u => !draftBranches[u.id]).sort((a,b) => a.name.localeCompare(b.name));
  const tropicalUsers = validUsers.filter(u => draftBranches[u.id] === 'tropical').sort((a,b) => (Number(draftPoints[b.id])||0) - (Number(draftPoints[a.id])||0));
  const ceuUsers = validUsers.filter(u => draftBranches[u.id] === 'ceu').sort((a,b) => (Number(draftPoints[b.id])||0) - (Number(draftPoints[a.id])||0));

  // 🌟 FUNÇÕES DE ADIÇÃO ESPECÍFICAS
  const handleAddTropical = () => {
    if (!selectedTropical) return;
    setDraftBranches(prev => ({ ...prev, [selectedTropical]: 'tropical' }));
    setSelectedTropical('');
  };

  const handleAddCeu = () => {
    if (!selectedCeu) return;
    setDraftBranches(prev => ({ ...prev, [selectedCeu]: 'ceu' }));
    setSelectedCeu('');
  };

  const handleRemoveUser = (id) => {
    if(!window.confirm("Remover este técnico do controle de XPoints?")) return;
    setDraftBranches(prev => { const next = {...prev}; delete next[id]; return next; });
  };

  const toggleBranch = (id, currentBranch) => {
    setDraftBranches(prev => ({ ...prev, [id]: currentBranch === 'tropical' ? 'ceu' : 'tropical' }));
  };

  const handleSaveManual = async () => {
    setIsSaving(true);
    try {
      const promises = validUsers.map(u => {
        const branch = draftBranches[u.id];
        if (!branch) {
            if (u.clanBranch) return updateDoc(getPublicDocPath('users', u.id), { clanBranch: null, dlsTeamName: '', dlsXPoints: 0, dlsXPointsTargetReached: false });
            return Promise.resolve();
        }
        const newTeamName = (draftTeamNames[u.id] || '').trim();
        const pts = Number(draftPoints[u.id]) || 0;
        const reachedTarget = branch === 'tropical' ? pts >= 200000 : true;

        return updateDoc(getPublicDocPath('users', u.id), { 
            dlsTeamName: newTeamName, dlsXPoints: pts, clanBranch: branch, dlsXPointsTargetReached: reachedTarget
        });
      });
      
      await Promise.all(promises);
      setIsEditingName({});
      showToast("XPoints salvos com sucesso nas Ilhas!", "success");
    } catch (error) { showToast("Erro ao salvar os dados.", "error"); }
    setIsSaving(false);
  };

  const handleResetAllPoints = async () => {
    if (!window.confirm("🚨 ATENÇÃO: Deseja ZERAR os saldos para iniciar uma nova temporada?")) return;
    setIsSaving(true);
    try {
      const promises = validUsers.filter(u => draftBranches[u.id]).map(u => updateDoc(getPublicDocPath('users', u.id), { dlsXPoints: 0, dlsXPointsTargetReached: false }));
      await Promise.all(promises);
      const resetDraft = {}; Object.keys(draftPoints).forEach(id => resetDraft[id] = 0);
      setDraftPoints(resetDraft);
      showToast("Saldos zerados com sucesso!", "success");
    } catch (error) { showToast("Erro ao zerar ranking.", "error"); }
    setIsSaving(false);
  };

  // Função para desenhar a linha de cada jogador
  const renderUserRow = (u, branch) => (
    <div key={u.id} className={`p-3 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all ${branch === 'tropical' ? 'bg-emerald-950/20 border-emerald-500/30' : 'bg-sky-950/20 border-sky-500/30'}`}>
      <div className="flex items-center gap-3 w-full sm:w-1/3 min-w-[180px]">
        <ShieldDisplay shield={u.shield} size="small" />
        <div className="flex flex-col">
          <span className="text-[11px] text-white font-bold truncate pr-2">{u.name}</span>
          <div className="flex items-center gap-3 mt-1">
             <button onClick={() => toggleBranch(u.id, branch)} className="text-[9px] text-amber-500 hover:text-amber-400 flex items-center gap-1 font-bold">
               <RefreshCw size={10} /> Mover p/ {branch === 'tropical' ? 'Céu' : 'Tropical'}
             </button>
             <button onClick={() => handleRemoveUser(u.id)} className="text-[9px] text-red-400 hover:text-red-300 flex items-center gap-1"><XCircle size={10}/> Remover</button>
          </div>
        </div>
      </div>

      <div className="flex-1 w-full sm:w-auto">
        <span className="text-[9px] text-blue-400 uppercase font-bold mb-1 block sm:hidden">Nome DLS</span>
        {u.dlsTeamName && !isEditingName[u.id] ? (
            <div className="flex items-center gap-2 bg-blue-950/50 p-2.5 rounded-lg border border-blue-800">
               <span className="text-xs font-black text-white uppercase truncate flex-1">{draftTeamNames[u.id] || u.dlsTeamName}</span>
               <button onClick={() => setIsEditingName(prev => ({...prev, [u.id]: true}))} className="text-emerald-400 hover:text-emerald-300 shrink-0"><Edit3 size={14} /></button>
            </div>
        ) : (
            <input 
              type="text" value={draftTeamNames[u.id] || ''} onChange={e => setDraftTeamNames(prev => ({...prev, [u.id]: e.target.value.toUpperCase()}))} placeholder="Nome do Time no Jogo"
              className="w-full bg-blue-950 border border-amber-500/50 rounded-lg p-2.5 text-xs font-black uppercase text-amber-400 focus:border-amber-400 outline-none"
            />
        )}
      </div>

      <div className="w-full sm:w-32 shrink-0">
        <span className="text-[9px] text-blue-400 uppercase font-bold mb-1 block sm:hidden">Saldo XPoints</span>
        <input 
          type="number" value={draftPoints[u.id] !== undefined ? draftPoints[u.id] : ''} onChange={e => setDraftPoints(prev => ({...prev, [u.id]: e.target.value}))} placeholder="0"
          className="w-full sm:text-right p-2.5 rounded-lg font-black text-sm bg-blue-950 text-amber-400 border border-blue-700 outline-none focus:border-amber-400"
        />
      </div>
    </div>
  );

  return (
    <div className="space-y-6 animate-in fade-in pb-10 max-w-5xl mx-auto min-h-screen">
      
      <div className="flex justify-between items-center">
        <button onClick={onBack} className="flex items-center gap-1.5 text-xs text-blue-400 hover:text-white transition-colors"><ArrowLeft size={16}/> Voltar ao Início</button>
      </div>

      <div className="bg-blue-900 p-6 rounded-3xl border border-amber-500/30 shadow-xl flex flex-col md:flex-row items-center justify-between gap-4">
        <div>
          <h2 className="text-xl md:text-2xl font-black text-amber-400 uppercase tracking-widest flex items-center gap-2"><Zap size={24} /> Gestão de Ilhas (XPoints)</h2>
          <p className="text-blue-300 text-xs md:text-sm mt-1">Atualize os saldos oficiais das divisões do Clã Kame.</p>
        </div>
        <div className="flex gap-2 w-full md:w-auto">
            <Button onClick={handleResetAllPoints} disabled={isSaving} className="text-xs bg-red-900/40 hover:bg-red-600 text-red-400 hover:text-white border border-red-800 py-3 px-4 flex-1 md:flex-none justify-center shadow-md"><RotateCcw size={16}/> Zerar</Button>
            <Button onClick={handleSaveManual} disabled={isSaving} className="text-xs bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 px-6 flex-1 md:flex-none justify-center shadow-[0_0_15px_rgba(16,185,129,0.4)]"><Save size={16}/> Salvar Tudo</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
         
         {/* 🌴 ILHA TROPICAL */}
         <div className="bg-blue-950/40 border border-emerald-500/30 rounded-2xl p-5 shadow-lg flex flex-col h-full">
            <h3 className="text-sm font-black text-emerald-400 uppercase tracking-widest mb-4 flex justify-between items-center border-b border-emerald-500/30 pb-3">
               <span>🌴 Ilha Tropical</span>
               <span className="text-[9px] bg-emerald-900/50 text-emerald-300 px-2 py-1 rounded">Meta: 200K</span>
            </h3>
            
            {/* NOVO: BARRA DE ADIÇÃO EXCLUSIVA TROPICAL */}
            <div className="flex gap-2 mb-4 bg-emerald-950/20 p-2 rounded-xl border border-emerald-500/20">
               <select value={selectedTropical} onChange={e => setSelectedTropical(e.target.value)} className="flex-1 min-w-0 bg-blue-950 text-white text-xs p-2.5 rounded-lg border border-emerald-500/30 outline-none">
                  <option value="">Adicionar Membro...</option>
                  {unassignedUsers.map(u => {
                     const userTeam = (teams || []).find(t => t.ownerId === u.id);
                     return <option key={u.id} value={u.id}>{u.name} - {userTeam?.name || 'Sem Time'}</option>;
                  })}
               </select>
               <button onClick={handleAddTropical} className="bg-emerald-600 hover:bg-emerald-500 text-white p-2.5 rounded-lg transition-colors shrink-0">
                 <PlusCircle size={18} />
               </button>
            </div>

            <div className="flex flex-col gap-3 flex-1 overflow-y-auto custom-scrollbar pr-1 max-h-[600px]">
               {tropicalUsers.length === 0 ? <p className="text-xs text-blue-500/50 text-center py-4">Nenhum membro selecionado.</p> : tropicalUsers.map(u => renderUserRow(u, 'tropical'))}
            </div>
         </div>

         {/* ☁️ ILHA DO CÉU */}
         <div className="bg-blue-950/40 border border-sky-500/30 rounded-2xl p-5 shadow-lg flex flex-col h-full">
            <h3 className="text-sm font-black text-sky-400 uppercase tracking-widest mb-4 flex justify-between items-center border-b border-sky-500/30 pb-3">
               <span>☁️ Ilha do Céu</span>
               <span className="text-[9px] bg-sky-900/50 text-sky-300 px-2 py-1 rounded">Sem Meta</span>
            </h3>

            {/* NOVO: BARRA DE ADIÇÃO EXCLUSIVA CÉU */}
            <div className="flex gap-2 mb-4 bg-sky-950/20 p-2 rounded-xl border border-sky-500/20">
               <select value={selectedCeu} onChange={e => setSelectedCeu(e.target.value)} className="flex-1 min-w-0 bg-blue-950 text-white text-xs p-2.5 rounded-lg border border-sky-500/30 outline-none">
                  <option value="">Adicionar Membro...</option>
                  {unassignedUsers.map(u => {
                     const userTeam = (teams || []).find(t => t.ownerId === u.id);
                     return <option key={u.id} value={u.id}>{u.name} - {userTeam?.name || 'Sem Time'}</option>;
                  })}
               </select>
               <button onClick={handleAddCeu} className="bg-sky-600 hover:bg-sky-500 text-white p-2.5 rounded-lg transition-colors shrink-0">
                 <PlusCircle size={18} />
               </button>
            </div>

            <div className="flex flex-col gap-3 flex-1 overflow-y-auto custom-scrollbar pr-1 max-h-[600px]">
               {ceuUsers.length === 0 ? <p className="text-xs text-blue-500/50 text-center py-4">Nenhum membro selecionado.</p> : ceuUsers.map(u => renderUserRow(u, 'ceu'))}
            </div>
         </div>

      </div>
    </div>
  );
};

export default XPointsManager;
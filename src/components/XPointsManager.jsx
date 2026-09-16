import React, { useState, useEffect } from 'react';
import { updateDoc } from 'firebase/firestore';
import { getPublicDocPath } from '../utils/firebase';
import { Zap, ArrowLeft, RotateCcw, RefreshCw, XCircle, PlusCircle } from 'lucide-react';
import Button from './Button';
import ShieldDisplay from './ShieldDisplay';

const XPointsManager = ({ users, teams, onBack, showToast }) => {
  const [draftPoints, setDraftPoints] = useState({});
  const [draftBranches, setDraftBranches] = useState({});
  
  const [selectedTropical, setSelectedTropical] = useState('');
  const [selectedCeu, setSelectedCeu] = useState('');
  
  const validUsers = (users || []).filter(u => {
    if (!u.name || u.id === 'u_master' || u.status !== 'active') return false;
    const userTeam = (teams || []).find(t => t.ownerId === u.id);
    if (userTeam && userTeam.status === 'inactive') return false;
    return true;
  });
  
  // 🌟 Carrega do banco apenas uma vez para não travar o cursor ao digitar
  useEffect(() => {
    setDraftPoints(prev => {
      const next = { ...prev };
      validUsers.forEach(u => { if (next[u.id] === undefined) next[u.id] = u.dlsXPoints || ''; });
      return next;
    });
    setDraftBranches(prev => {
      const next = { ...prev };
      validUsers.forEach(u => { if (next[u.id] === undefined && u.clanBranch) next[u.id] = u.clanBranch; });
      return next;
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [users]);

  const unassignedUsers = validUsers.filter(u => !draftBranches[u.id]).sort((a,b) => a.name.localeCompare(b.name));
  const tropicalUsers = validUsers.filter(u => draftBranches[u.id] === 'tropical').sort((a,b) => (Number(draftPoints[b.id])||0) - (Number(draftPoints[a.id])||0));
  const ceuUsers = validUsers.filter(u => draftBranches[u.id] === 'ceu').sort((a,b) => (Number(draftPoints[b.id])||0) - (Number(draftPoints[a.id])||0));

  const handleAddTropical = async () => {
    if (!selectedTropical) return;
    const uId = selectedTropical;
    setDraftBranches(prev => ({ ...prev, [uId]: 'tropical' }));
    setSelectedTropical('');
    await updateDoc(getPublicDocPath('users', uId), { clanBranch: 'tropical' });
  };

  const handleAddCeu = async () => {
    if (!selectedCeu) return;
    const uId = selectedCeu;
    setDraftBranches(prev => ({ ...prev, [uId]: 'ceu' }));
    setSelectedCeu('');
    await updateDoc(getPublicDocPath('users', uId), { clanBranch: 'ceu' });
  };

  const handleRemoveUser = async (id) => {
    if(!window.confirm("Remover este técnico do controle de XPoints?")) return;
    setDraftBranches(prev => { const next = {...prev}; delete next[id]; return next; });
    await updateDoc(getPublicDocPath('users', id), { clanBranch: null, dlsXPoints: 0, dlsXPointsTargetReached: false });
  };

  const toggleBranch = async (id, currentBranch) => {
    const newBranch = currentBranch === 'tropical' ? 'ceu' : 'tropical';
    setDraftBranches(prev => ({ ...prev, [id]: newBranch }));
    
    const pts = Number(draftPoints[id]) || 0;
    const reachedTarget = newBranch === 'tropical' ? pts >= 200000 : true;

    await updateDoc(getPublicDocPath('users', id), { 
        clanBranch: newBranch, 
        dlsXPointsTargetReached: reachedTarget 
    });
  };

  const handleResetAllPoints = async () => {
    if (!window.confirm("🚨 ATENÇÃO: Deseja ZERAR os saldos para iniciar uma nova temporada?")) return;
    try {
      const promises = validUsers.filter(u => draftBranches[u.id]).map(u => updateDoc(getPublicDocPath('users', u.id), { dlsXPoints: 0, dlsXPointsTargetReached: false }));
      await Promise.all(promises);
      const resetDraft = {}; Object.keys(draftPoints).forEach(id => resetDraft[id] = 0);
      setDraftPoints(resetDraft);
      showToast("Saldos zerados com sucesso!", "success");
    } catch (error) { showToast("Erro ao zerar ranking.", "error"); }
  };

  // 🌟 AUTO-SAVE MILISSEGUNDO: Salva a cada dígito inserido silenciosamente!
  const handlePointChange = (id, branch, val) => {
    setDraftPoints(prev => ({...prev, [id]: val})); 
    
    const pts = Number(val) || 0;
    const reachedTarget = branch === 'tropical' ? pts >= 200000 : true;

    updateDoc(getPublicDocPath('users', id), { 
        dlsXPoints: pts, 
        dlsXPointsTargetReached: reachedTarget 
    }).catch(err => console.error(err));
  };

  const renderUserRow = (u, branch) => {
    const userTeam = (teams || []).find(t => t.ownerId === u.id);
    const teamName = userTeam ? userTeam.name : 'Sem Time';

    return (
      <div key={u.id} className={`p-3 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all ${branch === 'tropical' ? 'bg-emerald-950/20 border-emerald-500/30 hover:border-emerald-500/60' : 'bg-sky-950/20 border-sky-500/30 hover:border-sky-500/60'}`}>
        
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <ShieldDisplay shield={u.shield} size="small" />
          <div className="flex flex-col min-w-0">
            <span className="text-[11px] text-white font-bold truncate">
              {u.name} <span className="text-blue-500 font-normal hidden sm:inline mx-1">•</span> <span className="text-amber-400">{teamName}</span>
            </span>
            <div className="flex items-center gap-3 mt-1.5">
               <button onClick={() => toggleBranch(u.id, branch)} className="text-[9px] text-amber-500 hover:text-amber-400 flex items-center gap-1 font-bold transition-colors">
                 <RefreshCw size={10} /> Mover p/ {branch === 'tropical' ? 'Céu' : 'Tropical'}
               </button>
               <button onClick={() => handleRemoveUser(u.id)} className="text-[9px] text-red-400 hover:text-red-300 flex items-center gap-1 transition-colors"><XCircle size={10}/> Remover</button>
            </div>
          </div>
        </div>

        <div className="w-full sm:w-32 shrink-0">
          <span className="text-[9px] text-blue-400 uppercase font-bold mb-1 block sm:hidden">Saldo XPoints</span>
          <input 
            type="number" 
            value={draftPoints[u.id] !== undefined ? draftPoints[u.id] : ''} 
            onChange={e => handlePointChange(u.id, branch, e.target.value)}
            placeholder="0"
            className="w-full sm:text-right p-2.5 rounded-lg font-black text-sm bg-blue-950 text-amber-400 border border-blue-700 outline-none focus:border-amber-400 focus:bg-blue-900 transition-colors"
          />
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6 animate-in fade-in pb-10 max-w-5xl mx-auto min-h-screen">
      
      <div className="flex justify-between items-center">
        <button onClick={onBack} className="flex items-center gap-1.5 text-xs text-blue-400 hover:text-white transition-colors"><ArrowLeft size={16}/> Voltar ao Início</button>
      </div>

      <div className="bg-blue-900 p-6 rounded-3xl border border-amber-500/30 shadow-xl flex flex-col md:flex-row items-center justify-between gap-4">
        <div>
          <h2 className="text-xl md:text-2xl font-black text-amber-400 uppercase tracking-widest flex items-center gap-2"><Zap size={24} /> Gestão de Ilhas (XPoints)</h2>
          <p className="text-blue-300 text-xs md:text-sm mt-1">O sistema <span className="font-bold text-white">salva automaticamente</span> cada número que você digita!</p>
        </div>
        <div className="flex gap-2 w-full md:w-auto">
            <Button onClick={handleResetAllPoints} className="text-xs bg-red-900/40 hover:bg-red-600 text-red-400 hover:text-white border border-red-800 py-3 px-6 flex-1 md:flex-none justify-center shadow-md"><RotateCcw size={16}/> Zerar Temporada</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
         
         {/* 🌴 ILHA TROPICAL */}
         <div className="bg-blue-950/40 border border-emerald-500/30 rounded-2xl p-5 shadow-lg flex flex-col h-full">
            <h3 className="text-sm font-black text-emerald-400 uppercase tracking-widest mb-4 flex justify-between items-center border-b border-emerald-500/30 pb-3">
               <span>🌴 Ilha Tropical</span>
               <span className="text-[9px] bg-emerald-900/50 text-emerald-300 px-2 py-1 rounded">Meta: 200K</span>
            </h3>
            
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
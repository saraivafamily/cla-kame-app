import React from 'react';
import { Medal, BookOpen, Trash2 } from 'lucide-react';

const CompetitionsList = ({ competitions, teams, currentUser, onSelectComp, onDeleteComp }) => {
  const isAdmin = currentUser?.role === 'leader' || currentUser?.role === 'kaioh' || currentUser?.role === 'organizer';
  const canDelete = currentUser?.role === 'leader' || currentUser?.role === 'kaioh';

  const isLeader = currentUser?.role === 'leader' || currentUser?.role === 'kaioh';
  const isCompAdmin = (c) => isLeader || c?.creatorId === currentUser?.id || (c?.admins || []).includes(currentUser?.id);
  
  const userTeamIds = (teams || []).filter(t => t && t.ownerId === currentUser?.id).map(t => t.id);
  const visible = (competitions || []).filter(c => c && (isCompAdmin(c) || c.teams?.some(t => userTeamIds.includes(t))));

  // Filtra as ativas e as finalizadas
  const activeComps = visible.filter(c => c.status !== 'finished');
  const finishedComps = visible.filter(c => c.status === 'finished');

  // 🌟 PADRONIZAÇÃO DE NOMES AQUI
  // Força tudo para MAIÚSCULO para manter o painel organizado visualmente
  const formatName = (c) => {
    let name = c.category === 'copa_flash' ? `COPA FLASH KAME - ${c.name}` : String(c.name);
    return name.toUpperCase(); // <-- Transforma qualquer texto em maiúsculo
  };

  return (
    <div className="space-y-8 animate-in fade-in pb-8">
      
      {/* 🟢 COMPETIÇÕES ATIVAS */}
      <div>
        <div className="flex items-center gap-2 mb-4"><Medal className="text-emerald-500"/><h2 className="text-xl font-bold text-white">Campeonatos Ativos</h2></div>
        {activeComps.length === 0 ? (
          <p className="text-blue-500 text-sm p-4 bg-blue-950 rounded-xl border border-blue-800">Nenhuma competição ativa no momento.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {activeComps.map(c => (
              <div key={c.id} onClick={()=>onSelectComp(c.id)} className="bg-blue-900 p-5 rounded-2xl border border-blue-800 hover:border-emerald-500/40 transition-all cursor-pointer flex justify-between items-center group shadow-md relative overflow-hidden">
                {c.category === 'copa_flash' && <div className="absolute top-0 left-0 w-1.5 h-full bg-amber-500"></div>}
                <div className={c.category === 'copa_flash' ? 'pl-2' : ''}>
                  {/* Apliquei a classe 'uppercase' aqui também por segurança */}
                  <h3 className="font-bold text-white uppercase group-hover:text-emerald-400 transition-colors">{formatName(c)}</h3>
                  <p className="text-xs text-blue-400 mt-1">{c.teams?.length || 0} Clubes inscritos • <span className="text-emerald-500 font-medium">{c.status === 'registration' ? 'Inscrições Abertas' : 'Em Andamento'}</span></p>
                </div>
                {canDelete && <button onClick={(e)=>{e.stopPropagation(); if(window.confirm('Excluir torneio?')) onDeleteComp(c.id)}} className="text-blue-600 hover:text-red-400 p-2 z-10"><Trash2 size={16}/></button>}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 🔴 COMPETIÇÕES FINALIZADAS */}
      {finishedComps.length > 0 && (
        <div className="pt-6 border-t border-blue-800/50">
          <div className="flex items-center gap-2 mb-4"><BookOpen className="text-slate-400"/><h2 className="text-xl font-bold text-slate-300">Histórico de Finalizadas</h2></div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {finishedComps.map(c => (
              <div key={c.id} onClick={()=>onSelectComp(c.id)} className="bg-blue-950/60 p-4 rounded-2xl border border-blue-900 hover:border-slate-500/40 transition-all cursor-pointer flex justify-between items-center group opacity-80 hover:opacity-100">
                {c.category === 'copa_flash' && <div className="absolute top-0 left-0 w-1.5 h-full bg-amber-500/50"></div>}
                <div className={c.category === 'copa_flash' ? 'pl-2' : ''}>
                  <h3 className="font-bold text-slate-300 uppercase group-hover:text-white transition-colors">{formatName(c)}</h3>
                  <p className="text-xs text-slate-500 mt-1">Finalizada</p>
                </div>
                {canDelete && <button onClick={(e)=>{e.stopPropagation(); if(window.confirm('Excluir torneio do histórico?')) onDeleteComp(c.id)}} className="text-blue-800 hover:text-red-400 p-2 z-10"><Trash2 size={14}/></button>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default CompetitionsList;

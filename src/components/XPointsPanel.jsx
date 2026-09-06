import React, { useState, useEffect } from 'react';
import { updateDoc } from 'firebase/firestore';
import { getPublicDocPath } from '../utils/firebase';
import { Target, Edit, CheckCircle, AlertCircle, Zap, Save, X, Trophy, Clock } from 'lucide-react';
import CountdownTimer from './CountdownTimer';

const XPointsPanel = ({ users, currentUser }) => {
  const [editingId, setEditingId] = useState(null);
  const [editValue, setEditValue] = useState('');
  
  // Controle para evitar re-render excessivo do cronômetro interno
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 60000); // Atualiza o relógio interno a cada minuto
    return () => clearInterval(interval);
  }, []);

  const isAdmin = currentUser?.role === 'leader' || currentUser?.role === 'kaioh';
  
  // 🌟 CONFIGURAÇÕES DAS METAS
  const COLLECTIVE_GOAL = 10000000;
  const MIN_INDIVIDUAL_GOAL = 200000;
  const MAX_INDIVIDUAL_GOAL = 350000; // Teto para o Sorteio do Passe
  const SEASON_END_DATE = "2026-09-16T09:00:00"; // ⏱️ Altere aqui a data de fim da temporada

  // Filtra apenas membros válidos e calcula o total
  const validUsers = (users || []).filter(u => u.name && u.id !== 'u_master');
  const totalPoints = validUsers.reduce((acc, u) => acc + (Number(u.dlsXPoints) || 0), 0);
  const progressPercent = Math.min((totalPoints / COLLECTIVE_GOAL) * 100, 100);

  const sortedUsers = [...validUsers].sort((a, b) => (Number(b.dlsXPoints) || 0) - (Number(a.dlsXPoints) || 0));

  const handleSavePoints = async (userId) => {
    if (editValue === '') return;
    try {
      await updateDoc(getPublicDocPath('users', userId), { dlsXPoints: Number(editValue) });
      setEditingId(null);
    } catch (error) {
      console.error("Erro ao atualizar pontos:", error);
    }
  };

  const formatNumber = (num) => {
    return new Intl.NumberFormat('pt-BR').format(num || 0);
  };

  return (
    <div className="bg-blue-900 border border-blue-700 rounded-3xl p-6 shadow-2xl mb-8 animate-in fade-in">
      
      {/* 🌟 CABEÇALHO COM CRONÔMETRO */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between mb-8 gap-4">
        <div className="flex items-center gap-3">
          <div className="bg-blue-950 p-3 rounded-xl border border-amber-500/30 shadow-[0_0_15px_rgba(245,158,11,0.2)]">
            <Zap size={28} className="text-amber-400 animate-pulse" />
          </div>
          <div>
            <h2 className="text-xl font-black text-white uppercase tracking-wider">Meta Global XClã (Live)</h2>
            <p className="text-xs text-blue-400 mt-0.5">Jogue as partidas na Live do DLS e some pontos para o Clã Kame!</p>
          </div>
        </div>

        <div className="bg-blue-950/80 px-4 py-2.5 rounded-xl border border-blue-800 shadow-inner flex items-center gap-3 w-full lg:w-auto">
           <Clock size={20} className="text-blue-400 shrink-0"/>
           <div>
              <p className="text-[10px] font-bold text-blue-500 uppercase tracking-widest leading-none mb-1">Fim da Temporada</p>
              <div className="text-sm font-black text-white font-mono tracking-wider">
                 <CountdownTimer targetDateStr={SEASON_END_DATE} />
              </div>
           </div>
        </div>
      </div>

      {/* 🌟 TERMÔMETRO GIGANTE DO CLÃ */}
      <div className="bg-blue-950 p-5 rounded-2xl border border-blue-800 shadow-inner mb-6 relative overflow-hidden">
        <div className="flex justify-between items-end mb-3 relative z-10">
          <div>
            <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-widest block mb-1">Pontos Acumulados</span>
            <span className="text-3xl md:text-4xl font-black text-white drop-shadow-md">{formatNumber(totalPoints)}</span>
          </div>
          <div className="text-right">
            <span className="text-[10px] text-amber-400 font-bold uppercase tracking-widest block mb-1">Objetivo Final</span>
            <span className="text-xl md:text-2xl font-black text-amber-500">{formatNumber(COLLECTIVE_GOAL)}</span>
          </div>
        </div>
        
        <div className="w-full bg-blue-900 rounded-full h-6 border border-blue-800 relative z-10 overflow-hidden">
          <div 
            className="bg-gradient-to-r from-emerald-600 to-emerald-400 h-full transition-all duration-1000 ease-out relative"
            style={{ width: `${progressPercent}%` }}
          >
            <div className="absolute top-0 right-0 bottom-0 w-4 bg-white/30 blur-sm"></div>
          </div>
          <div className="absolute top-0 left-0 w-full h-full flex items-center justify-center">
             <span className="text-[10px] font-black text-white drop-shadow-md">{progressPercent.toFixed(1)}% CONCLUÍDO</span>
          </div>
        </div>
      </div>

      {/* 🌟 MURAL DE COBRANÇA E SORTEIO DE PASSE */}
      <div className="bg-blue-950/50 rounded-2xl p-5 border border-blue-800/50">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 pb-3 border-b border-blue-800/50 gap-3">
          <h3 className="text-sm font-bold text-sky-400 uppercase tracking-widest flex items-center gap-2">
            <Target size={16}/> Desempenho Individual
          </h3>
          <div className="flex items-center gap-2 text-[10px] font-bold">
             <span className="bg-blue-900 text-emerald-400 px-2 py-1 rounded border border-emerald-900">Mínimo: {formatNumber(MIN_INDIVIDUAL_GOAL)}</span>
             <span className="bg-amber-900/30 text-amber-400 px-2 py-1 rounded border border-amber-500/30 shadow-inner flex items-center gap-1">
               <Trophy size={10}/> Teto Sorteio: {formatNumber(MAX_INDIVIDUAL_GOAL)}
             </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-[400px] overflow-y-auto custom-scrollbar pr-2">
          {sortedUsers.map(u => {
            const userPts = Number(u.dlsXPoints) || 0;
            const hasReachedMaxGoal = userPts >= MAX_INDIVIDUAL_GOAL; // 350K+ (Passe de Temporada)
            const hasReachedMinGoal = userPts >= MIN_INDIVIDUAL_GOAL && userPts < MAX_INDIVIDUAL_GOAL; // Entre 250K e 349K
            const isEditing = editingId === u.id;

            // Define o design do card baseado na meta batida
            let cardBg = 'bg-blue-900/30 border-blue-800 hover:border-blue-600';
            let iconBg = 'bg-red-500/10 text-red-400';
            let nameColor = 'text-white';
            let statusBadge = null;
            let icon = <AlertCircle size={16} />;

            if (hasReachedMaxGoal) {
                cardBg = 'bg-gradient-to-r from-amber-900/40 to-yellow-900/20 border-amber-500/50 shadow-[0_0_10px_rgba(245,158,11,0.1)]';
                iconBg = 'bg-amber-500/20 text-amber-400';
                nameColor = 'text-amber-400';
                icon = <Trophy size={16} />;
                statusBadge = <span className="text-[9px] text-amber-400 font-bold uppercase flex items-center gap-1"><Trophy size={10}/> Sorteio Passe</span>;
            } else if (hasReachedMinGoal) {
                cardBg = 'bg-emerald-900/10 border-emerald-500/30';
                iconBg = 'bg-emerald-500/20 text-emerald-400';
                nameColor = 'text-emerald-400';
                icon = <CheckCircle size={16} />;
                statusBadge = <span className="text-[9px] text-emerald-500 font-bold uppercase">Meta Cumprida ✅</span>;
            } else {
                statusBadge = <span className="text-[9px] text-red-400 font-medium">Faltam {formatNumber(MIN_INDIVIDUAL_GOAL - userPts)} pts</span>;
            }

            return (
              <div key={u.id} className={`p-3 rounded-xl border flex items-center justify-between transition-colors shadow-sm ${cardBg}`}>
                
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className={`shrink-0 p-1.5 rounded-lg ${iconBg}`}>
                    {icon}
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className={`text-xs font-bold truncate ${nameColor}`}>{u.name}</span>
                    {statusBadge}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {isEditing ? (
                    <div className="flex items-center gap-1 animate-in zoom-in-95">
                      <input 
                        type="number" 
                        value={editValue} 
                        onChange={e => setEditValue(e.target.value)}
                        className="w-20 bg-blue-950 border border-amber-500 rounded p-1 text-xs text-white text-center outline-none"
                        autoFocus
                      />
                      <button onClick={() => handleSavePoints(u.id)} className="text-emerald-400 hover:text-emerald-300 p-1"><Save size={14}/></button>
                      <button onClick={() => setEditingId(null)} className="text-red-400 hover:text-red-300 p-1"><X size={14}/></button>
                    </div>
                  ) : (
                    <>
                      <span className={`text-sm font-black ${hasReachedMaxGoal ? 'text-amber-400' : 'text-blue-200'}`}>
                        {formatNumber(userPts)}
                      </span>
                      {isAdmin && (
                        <button onClick={() => { setEditingId(u.id); setEditValue(userPts); }} className="text-blue-500 hover:text-amber-400 p-1 transition-colors">
                          <Edit size={14} />
                        </button>
                      )}
                    </>
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

export default XPointsPanel;
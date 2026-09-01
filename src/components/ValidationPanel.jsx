import React from 'react';
import { CheckSquare } from 'lucide-react';
import Button from './Button';

const ValidationPanel = ({ matches, teams, competitions, onUpdateStatus, showToast, currentUser }) => {
  const isLeader = currentUser?.role === 'leader' || currentUser?.role === 'kaioh';
  const isCompAdmin = (c) => isLeader || c?.creatorId === currentUser?.id || (c?.admins || []).includes(currentUser?.id);

  // Filtra só os pendentes das competições que o usuário atual administra
  const pending = (matches || []).filter(m => {
     if (!m || m.status !== 'pending') return false;
     const comp = competitions.find(c => c.id === m.compId);
     return isCompAdmin(comp);
  });

  const getTeam = (id) => (teams || []).find(t => t && t.id === id);
  const getCompName = (id) => (competitions || []).find(c => c && c.id === id)?.name || 'Torneio';
  
  return (
    <div className="space-y-4 animate-in fade-in">
      <div className="flex justify-between items-center"><h2 className="text-xl font-bold text-white flex items-center gap-2"><CheckSquare className="text-amber-500"/> Validação Cloud</h2><span className="text-xs bg-amber-500/20 text-amber-400 px-2.5 py-0.5 rounded-full font-bold">{pending.length} Pendentes</span></div>
      {pending.length === 0 ? ( <div className="bg-blue-900 p-8 rounded-2xl text-center text-blue-500 border border-blue-800">Tudo validado! Sem pendências na nuvem.</div> ) : (
        <div className="space-y-4">
          {pending.map(m => {
            const tA = getTeam(m.teamA); const tB = getTeam(m.teamB);
            return (
              <div key={m.id} className="bg-blue-900 p-4 rounded-xl border border-blue-800 space-y-3">
                <div className="text-center text-[10px] font-bold text-amber-500 uppercase bg-amber-500/5 py-1 rounded border border-amber-500/10">🏆 {String(getCompName(m.compId))}</div>
                <div className="flex items-center justify-between text-xs bg-blue-950 p-3 rounded-lg">
                  <span className="font-bold flex-1 text-right truncate">{tA?.name}</span>
                  <span className="px-3 py-1 font-mono font-black text-emerald-400 bg-blue-900 border border-blue-800 rounded mx-2">{m.scoreA} x {m.scoreB}</span>
                  <span className="font-bold flex-1 text-left truncate">{tB?.name}</span>
                </div>
                <div className="flex gap-2 justify-end pt-2 border-t border-blue-800/60">
                  <Button variant="outline" className="py-1 text-[11px] border-red-500/30 text-red-400" onClick={()=>onUpdateStatus(m.id,'rejected')}>Recusar</Button>
                  <Button className="py-1 text-[11px]" onClick={()=>onUpdateStatus(m.id,'approved')}>Computar Pontos</Button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  );
};

export default ValidationPanel;

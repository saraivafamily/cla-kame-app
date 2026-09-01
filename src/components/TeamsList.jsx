import React, { useState } from 'react';
import { Shield, Edit, Trash2, MessageCircle, UploadCloud, X, Save } from 'lucide-react';
import ShieldDisplay from './ShieldDisplay';
import Button from './Button';
import { processImage } from '../utils/helpers';

const TeamsList = ({ teams, users, currentUser, matches, competitions, onEditTeam, onDeleteTeam }) => {
  const isAdmin = currentUser?.role === 'leader' || currentUser?.role === 'kaioh';
  const [editingId, setEditingId] = useState(null);
  const [editData, setEditData] = useState({ name: '', coach: '', whatsapp: '', shield: '', ownerId: 'manual' });
  const [viewMode, setViewMode] = useState('grid');
  const [searchTerm, setSearchTerm] = useState('');
  const [viewingTeam, setViewingTeam] = useState(null); 
  
  // 🔍 1. LOCALIZA O TIME DO TÉCNICO LOGADO
  const myTeam = (teams || []).find(t => t && t.ownerId === currentUser?.id);
  const myTeamId = myTeam?.id;

  // 🔒 2. ALGORITMO DE VALIDAÇÃO: Bloqueia o botão se não houver jogo liberado pendente
  const canCallTeam = (targetTeamId) => {
    // Não deixa ele ligar para si mesmo ou se não tiver time
    if (!myTeamId || targetTeamId === myTeamId) return false;

    return (competitions || []).some(c => {
      // Só analisa competições em andamento (ativas)
      if (c.status !== 'active' || !c.rounds) return false;

      return c.rounds.some(round => {
        // Só aceita rodadas que os líderes já liberaram
        if (round.status !== 'released') return false;

        return round.matches.some(rm => {
          // Verifica se o confronto direto entre os dois existe nesta rodada
          const isOurMatch = (rm.teamA === myTeamId && rm.teamB === targetTeamId) || 
                             (rm.teamA === targetTeamId && rm.teamB === myTeamId);
          if (!isOurMatch) return false;

          // Se o jogo existe, confirma se ele já não foi jogado (enviado pro firebase)
          const alreadyPlayed = (matches || []).some(m => 
            m.matchId === rm.id && 
            m.compId === c.id && 
            (m.status === 'pending' || m.status === 'approved')
          );

          return !alreadyPlayed; // O botão ativa apenas se NÃO tiver sido jogado
        });
      });
    });
  };

  const handleWhatsApp = (phone) => { if (!phone) return; window.open(`https://wa.me/${String(phone).replace(/\D/g, '')}`, '_blank'); };
  const startEdit = (team) => { if (!team) return; setEditingId(team.id); setEditData({ name: team.name || '', coach: team.coach || '', whatsapp: team.whatsapp || '', shield: team.shield || '🛡️', ownerId: team.ownerId || 'manual' }); };
  const saveEdit = (team) => { if (!editData.name || !editData.coach) return; onEditTeam({ ...team, ...editData }); setEditingId(null); };

  const filteredTeams = (teams || []).filter(t => t && (String(t.name || '').toLowerCase().includes(searchTerm.toLowerCase()) || String(t.coach || '').toLowerCase().includes(searchTerm.toLowerCase())));

  return (
    <div className="animate-in fade-in duration-500 space-y-6 pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-blue-900 p-4 md:p-6 rounded-2xl border border-blue-800 shadow-xl">
        <div className="flex items-center gap-3">
          <span className="text-3xl drop-shadow-md">🛡️</span>
          <div>
            <h2 className="text-xl md:text-2xl font-bold text-white">Mural de Times</h2>
            <p className="text-xs text-emerald-400 font-bold tracking-widest uppercase mt-0.5">{(teams || []).length} Times Cadastrados</p>
          </div>
        </div>
        <div className="flex items-center gap-2 w-full md:w-auto">
          <input type="text" placeholder="Procurar time ou técnico..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="flex-1 md:w-64 bg-blue-950 border border-blue-700 focus:border-emerald-500 rounded-lg p-2 text-white outline-none transition-colors text-sm" />
          <div className="flex p-1 bg-blue-950 rounded-lg border border-blue-700 shrink-0">
            <button onClick={() => setViewMode('grid')} className={`px-3 py-1.5 rounded-md transition-colors text-xs font-bold ${viewMode === 'grid' ? 'bg-blue-800 text-emerald-400 shadow-sm' : 'text-blue-500 hover:text-blue-300'}`}>Grade</button>
            <button onClick={() => setViewMode('list')} className={`px-3 py-1.5 rounded-md transition-colors text-xs font-bold ${viewMode === 'list' ? 'bg-blue-800 text-emerald-400 shadow-sm' : 'text-blue-500 hover:text-blue-300'}`}>Lista</button>
          </div>
        </div>
      </div>
      
      {filteredTeams.length === 0 ? ( 
        <div className="bg-blue-900 p-8 rounded-2xl border border-blue-800 text-center text-blue-500">
          {searchTerm ? 'Nenhum time encontrado com essa busca.' : 'Nenhum time registrado no clã ainda.'}
        </div> 
      ) : (
        <div className={viewMode === 'grid' ? "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 md:gap-4" : "flex flex-col gap-3"}>
          {filteredTeams.map(team => {
            if (!team) return null;
            const safeTeamId = team.id || Math.random().toString();
            
            if (editingId === team.id) {
              return (
                <div key={safeTeamId} className={`bg-blue-900 p-3 rounded-xl border border-emerald-500/50 shadow-[0_0_15px_rgba(16,185,129,0.1)] flex ${viewMode === 'list' ? 'flex-col md:flex-row items-start md:items-center justify-between gap-4' : 'flex-col justify-between gap-3'}`}>
                  <div className={`flex items-center gap-2 ${viewMode === 'list' ? 'flex-row w-full flex-wrap' : 'flex-col'}`}>
                    <div className="shrink-0 pt-1">
                      <label className="cursor-pointer relative group flex flex-col items-center">
                        <div className="relative">
                          <ShieldDisplay shield={editData.shield} size="normal" />
                          <div className="absolute -bottom-1 -right-2 bg-emerald-600 rounded-full p-1 shadow-lg group-hover:scale-110 transition-transform flex items-center justify-center"><UploadCloud size={10} className="text-white" /></div>
                        </div>
                        <input type="file" accept="image/*" className="hidden" onChange={(e) => processImage(e.target.files[0], (base64) => setEditData({...editData, shield: base64}))} />
                      </label>
                    </div>
                    <div className={`flex-1 space-y-1.5 w-full ${viewMode === 'list' ? 'grid grid-cols-2 sm:grid-cols-4 gap-2 space-y-0 mt-0' : 'mt-1'}`}>
                      <input type="text" value={editData.name} onChange={e=>setEditData({...editData, name: e.target.value})} placeholder="Time" className="w-full bg-blue-950 border border-blue-700 rounded p-1.5 text-white text-[10px] md:text-xs outline-none focus:border-emerald-500" />
                      <input type="text" value={editData.coach} onChange={e=>setEditData({...editData, coach: e.target.value})} placeholder="Técnico" className="w-full bg-blue-950 border border-blue-700 rounded p-1.5 text-white text-[10px] md:text-xs outline-none focus:border-emerald-500" />
                      <input type="text" value={editData.whatsapp} onChange={e=>setEditData({...editData, whatsapp: e.target.value})} placeholder="WhatsApp" className="w-full bg-blue-950 border border-blue-700 rounded p-1.5 text-white text-[10px] md:text-xs outline-none focus:border-emerald-500" />
                      <select value={editData.ownerId} onChange={e => {
                        const newOwnerId = e.target.value;
                        if (newOwnerId === 'manual') {
                          setEditData({ ...editData, ownerId: newOwnerId });
                        } else {
                          const linkedU = (users || []).find(u => u.id === newOwnerId);
                          if (linkedU) {
                            setEditData({ ...editData, ownerId: newOwnerId, coach: linkedU.name, whatsapp: linkedU.whatsapp });
                          } else {
                            setEditData({ ...editData, ownerId: newOwnerId });
                          }
                        }
                      }} className="w-full bg-blue-950 border border-blue-700 rounded p-1.5 text-white text-[10px] md:text-xs outline-none focus:border-emerald-500">
                        <option value="manual">👤 Conta Manual</option>
                        {(users || []).map(u => <option key={u.id} value={u.id}>📱 Vincular: {u.name}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className={`flex gap-1.5 ${viewMode === 'list' ? 'w-full md:w-auto shrink-0 justify-end' : 'mt-1'}`}>
                    <Button variant="outline" onClick={(e) => { e.stopPropagation(); setEditingId(null); }} className="flex-1 md:flex-none py-1.5 text-[10px] px-3"><X size={12}/> {viewMode === 'list' && <span className="hidden sm:inline">Cancelar</span>}</Button>
                    <Button onClick={(e) => { e.stopPropagation(); saveEdit(team); }} className="flex-1 md:flex-none py-1.5 text-[10px] px-3"><Save size={12}/> {viewMode === 'list' && <span className="hidden sm:inline">Salvar</span>}</Button>
                  </div>
                </div>
              );
            }

            if (viewMode === 'list') {
               return (
                <div key={safeTeamId} onClick={() => setViewingTeam(team)} className="relative bg-blue-900 p-3 sm:p-4 rounded-xl border border-blue-800 hover:border-emerald-500/50 hover:shadow-lg transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 group cursor-pointer">
                  <div className="flex items-center gap-4 flex-1 min-w-0 w-full">
                    <div className="shrink-0"><ShieldDisplay shield={team.shield} size="normal" /></div>
                    <div className="flex-1 min-w-0 pr-10 sm:pr-0">
                      <div className="flex items-center gap-2">
                        {/* Removido o 'truncate' e adicionado 'whitespace-normal break-words' */}
                        <h3 className="text-sm md:text-base font-bold text-white leading-tight whitespace-normal break-words group-hover:text-emerald-400 transition-colors">{String(team.name || 'Time')}</h3>
                        {team.ownerId === 'manual' && <span className="text-[9px] bg-amber-500/20 text-amber-400 px-1.5 rounded uppercase font-bold shrink-0">Sem Acesso</span>}
                      </div>
                      <p className="text-[10px] md:text-xs text-blue-400 mt-0.5 truncate"><span className="text-blue-300 font-medium">{String(team.coach || 'Sem técnico')}</span> • {String(team.whatsapp || 'Sem WhatsApp')}</p>
                    </div>
                  </div>
                  {isAdmin && ( 
                  <div className="absolute top-2 right-2 flex gap-1 md:opacity-0 md:group-hover:opacity-100 transition-opacity z-10">
                    <button onClick={(e) => { e.stopPropagation(); startEdit(team); }} className="text-blue-500 hover:text-emerald-400 p-1.5 rounded-lg hover:bg-blue-800" title="Editar"><Edit size={14} /></button> 
                    <button onClick={(e) => { e.stopPropagation(); if(window.confirm('Tem certeza que deseja apagar este time definitivamente?')) { onDeleteTeam(team.id); } }} className="text-blue-500 hover:text-red-400 p-1.5 rounded-lg hover:bg-blue-800" title="Excluir Time"><Trash2 size={14} /></button>
                  </div>
                )}
                  {/* 🔒 TRAVA APLICADA NO MODO LISTA */}
                  <Button onClick={(e) => { e.stopPropagation(); handleWhatsApp(team.whatsapp); }} className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-500 text-white py-2 px-3 text-xs disabled:bg-blue-800 disabled:text-blue-500 shrink-0 z-10" disabled={!team.whatsapp || !canCallTeam(team.id)}>
                    <MessageCircle size={16} /> <span className="sm:hidden lg:inline">Chamar</span>
                  </Button>
                </div>
               );
            }

            return (
              // Adicionado 'h-full' para garantir que os cards no modo grade estiquem e fiquem do mesmo tamanho
              <div key={safeTeamId} onClick={() => setViewingTeam(team)} className="relative h-full bg-blue-900 p-3 md:p-4 rounded-xl border border-blue-800 hover:border-emerald-500/50 hover:shadow-lg transition-all flex flex-col justify-between gap-3 group cursor-pointer">
                {isAdmin && ( 
                    <div className="absolute top-3 sm:top-auto sm:relative right-3 sm:right-auto flex gap-1 sm:opacity-0 sm:group-hover:opacity-100 shrink-0 z-10">
                      <button onClick={(e) => { e.stopPropagation(); startEdit(team); }} className="text-blue-500 hover:text-emerald-400 p-1.5 rounded-lg hover:bg-blue-800 transition-colors" title="Editar"><Edit size={16} /></button>
                      <button onClick={(e) => { e.stopPropagation(); if(window.confirm('Tem certeza que deseja apagar este time definitivamente?')) { onDeleteTeam(team.id); } }} className="text-blue-500 hover:text-red-400 p-1.5 rounded-lg hover:bg-blue-800 transition-colors" title="Excluir Time"><Trash2 size={16} /></button>
                    </div>
                  )}
                <div className="flex flex-col items-center text-center gap-2 mt-2">
                  <div className="shrink-0 relative group-hover:scale-105 transition-transform">
                    <ShieldDisplay shield={team.shield} size="normal" />
                    {team.ownerId === 'manual' && <span className="absolute -top-2 -right-2 text-[8px] bg-amber-500/20 text-amber-400 px-1 rounded shadow" title="Conta Manual">👤</span>}
                  </div>
                  <div className="w-full">
                    {/* Removido o 'truncate' e adicionado 'whitespace-normal break-words' */}
                    <h3 className="text-sm md:text-base font-bold text-white leading-tight whitespace-normal break-words px-2 group-hover:text-emerald-400 transition-colors">{String(team.name || 'Time')}</h3>
                    <p className="text-[9px] md:text-[10px] text-blue-400 mt-1 truncate px-1"><span className="text-blue-300 font-medium">{String(team.coach || 'Sem técnico')}</span></p>
                  </div>
                </div>
                {/* 🔒 TRAVA APLICADA NO MODO GRADE */}
                <Button onClick={(e) => { e.stopPropagation(); handleWhatsApp(team.whatsapp); }} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white mt-1 py-1.5 text-[10px] md:text-xs px-2 disabled:bg-blue-800 disabled:text-blue-500 z-10" disabled={!team.whatsapp || !canCallTeam(team.id)}>
                  <MessageCircle size={14} /> Chamar
                </Button>
              </div>
            );
          })}
        </div>
      )}
      
      {viewingTeam && (
        <TeamStatsModal 
          team={viewingTeam} 
          matches={matches} 
          teams={teams} 
          competitions={competitions}
          onClose={() => setViewingTeam(null)} 
        />
      )}
    </div>
  );
};

export default TeamsList;

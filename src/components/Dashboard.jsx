import React, { useMemo } from 'react';
import { Camera, Dices, Shield, Trophy, BookOpen, PlayCircle, Activity, MessageCircle, AlertCircle, CheckCircle, XCircle, X, Star, Medal } from 'lucide-react';
import ShieldDisplay from './ShieldDisplay';
import CountdownTimer from './CountdownTimer';
import Button from './Button';
import { calculateStandings, getChampionIds } from '../utils/torneios';

const Dashboard = ({ matches, teams, competitions, currentUser, onSelectMatch, onDeleteMatch, onJoinOpenComp, onChangeTab }) => {
  const isLeader = currentUser?.role === 'leader' || currentUser?.role === 'kaioh';
  const isCompAdmin = (c) => isLeader || c?.creatorId === currentUser?.id || (c?.admins || []).includes(currentUser?.id);

  const userTeamIds = (teams || []).filter(t => t && t.ownerId === currentUser?.id).map(t => t.id);
  const visibleCompIds = (competitions || []).filter(c => c && (isCompAdmin(c) || c.teams?.some(t => userTeamIds.includes(t)))).map(c => c.id);
  
  const recentMatches = (matches || []).filter(m => {
    if (!m || m.status === 'rejected') return false;
    const comp = (competitions || []).find(c => c.id === m.compId);
    return isCompAdmin(comp) || visibleCompIds.includes(m.compId);
  }).sort((a, b) => parseInt(String(b?.id || '').split('_')[1] || '0') - parseInt(String(a?.id || '').split('_')[1] || '0')).slice(0, 8);

  const getTeam = (id) => (teams || []).find(t => t && t.id === id);

  const openCompetitions = (competitions || []).filter(c => c && c.status === 'registration');

  const myPendingMatches = (matches || []).filter(m => 
    (userTeamIds.includes(m.teamA) || userTeamIds.includes(m.teamB)) &&
    m.status !== 'approved' && m.status !== 'rejected'
  );

  const matchesToPlay = useMemo(() => {
    const available = [];
    (competitions || []).forEach(comp => {
      if (comp.status !== 'active') return;
      
      (comp.rounds || []).filter(r => r.status === 'released').forEach(round => {
        (round.matches || []).forEach(m => {
          if (userTeamIds.includes(m.teamA) || userTeamIds.includes(m.teamB)) {
            const alreadyPlayed = (matches || []).some(
              submitted => submitted.matchId === m.id && submitted.compId === comp.id && submitted.status !== 'rejected'
            );
            
            if (!alreadyPlayed) {
              available.push({ 
                ...m, 
                compName: comp.name, 
                compId: comp.id, 
                roundName: round.number,
                isFlash: comp.category === 'copa_flash' || comp.category === 'copa_flash_dupla'
              });
            }
          }
        });
      });
    });
    return available;
  }, [competitions, matches, userTeamIds]);

  const hasAdminAccess = isLeader || (competitions || []).some(c => c.status !== 'finished' && isCompAdmin(c));

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10">
      <div className="bg-gradient-to-r from-emerald-900/50 to-blue-900 p-6 rounded-2xl border border-emerald-900/50 shadow-xl">
        <h2 className="text-2xl font-bold text-white mb-2">QG Clã Kame</h2>
        <p className="text-blue-400">Um app para guardar a sua história!</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {hasAdminAccess && (
          <button onClick={() => onChangeTab('competitions')} className="bg-blue-900/50 hover:bg-blue-800 p-4 rounded-2xl border border-blue-700/50 flex flex-col items-center justify-center gap-2 transition-all group shadow-sm">
            <div className="bg-blue-950 p-2 rounded-full group-hover:scale-110 transition-transform">
              <Camera size={20} className="text-emerald-400" />
            </div>
            <span className="text-xs font-bold text-blue-200">Registrar/Validar</span>
          </button>
        )}
        
        <button onClick={() => onChangeTab('predictions')} className="bg-blue-900/50 hover:bg-blue-800 p-4 rounded-2xl border border-blue-700/50 flex flex-col items-center justify-center gap-2 transition-all group shadow-sm">
          <div className="bg-blue-950 p-2 rounded-full group-hover:scale-110 transition-transform">
            <Dices size={20} className="text-amber-500" />
          </div>
          <span className="text-xs font-bold text-blue-200">KameBet</span>
        </button>

        <button onClick={() => onChangeTab('profile')} className="bg-blue-900/50 hover:bg-blue-800 p-4 rounded-2xl border border-blue-700/50 flex flex-col items-center justify-center gap-2 transition-all group shadow-sm">
          <div className="bg-blue-950 p-2 rounded-full group-hover:scale-110 transition-transform">
            <Shield size={20} className="text-amber-400" />
          </div>
          <span className="text-xs font-bold text-blue-200">Meu Perfil</span>
        </button>

        <button onClick={() => onChangeTab('ranking')} className="bg-blue-900/50 hover:bg-blue-800 p-4 rounded-2xl border border-blue-700/50 flex flex-col items-center justify-center gap-2 transition-all group shadow-sm">
          <div className="bg-blue-950 p-2 rounded-full group-hover:scale-110 transition-transform">
            <Trophy size={20} className="text-purple-400" />
          </div>
          <span className="text-xs font-bold text-blue-200">Ranking Xclã</span>
        </button>

        <button onClick={() => onChangeTab('rules')} className="bg-blue-900/50 hover:bg-blue-800 p-4 rounded-2xl border border-blue-700/50 flex flex-col items-center justify-center gap-2 transition-all group shadow-sm">
          <div className="bg-blue-950 p-2 rounded-full group-hover:scale-110 transition-transform">
            <BookOpen size={20} className="text-sky-400" />
          </div>
          <span className="text-xs font-bold text-blue-200">Regras</span>
        </button>
      </div>

      {/* 🌟 PAINEL DE PARTIDAS LIBERADAS */}
      {matchesToPlay.length > 0 && (
        <div className="space-y-3 animate-in slide-in-from-left-4">
          <h3 className="text-lg font-bold text-emerald-400 flex items-center gap-2">
            <PlayCircle size={20} /> Seus Confrontos Liberados
          </h3>
          <p className="text-xs text-blue-400 -mt-2 mb-2">Partidas que já foram liberadas pelos líderes. Chame seu adversário para o jogo!</p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {matchesToPlay.map(m => {
              const compForMatch = competitions.find(c => c.id === m.compId);
              const isDupla = compForMatch?.category === 'copa_flash_dupla';
              const isVolta = m.id.includes('_volta');
              
              if (isDupla && isVolta) {
                 const idaMatchId = m.id.replace('_volta', '_ida');
                 const idaPlayed = (matches || []).some(sub => sub.matchId === idaMatchId && sub.compId === m.compId && sub.status !== 'rejected');
                 if (!idaPlayed) return null; 
              }

              const tA = getTeam(m.teamA);
              const tB = getTeam(m.teamB);
              
              const isUserTeamA = userTeamIds.includes(m.teamA);
              const opponentTeam = isUserTeamA ? tB : tA;
              const myTeamObj = isUserTeamA ? tA : tB;

              return (
                <div key={m.id} className="bg-blue-900/80 border border-emerald-500/40 hover:border-emerald-400/80 rounded-2xl p-4 shadow-lg transition-all flex flex-col justify-between group">
                  <div className="flex justify-between items-start mb-4">
                    <span className="text-[10px] bg-blue-950 text-blue-300 px-2.5 py-1 rounded font-bold uppercase tracking-widest border border-blue-800 shadow-inner">
                      {m.compName} • Rodada {m.roundName}
                    </span>
                    {m.isFlash && <span className="text-[10px] bg-amber-500/20 text-amber-400 px-2 py-1 rounded font-bold uppercase animate-pulse border border-amber-500/30 shadow-md flex items-center gap-1"><Activity size={10}/> Flash</span>}
                  </div>
                  
                  <div className="flex items-center justify-between gap-2 mb-5 px-2">
                    <div className="flex flex-col items-center flex-1 min-w-0">
                      <ShieldDisplay shield={myTeamObj?.shield} size="small" />
                      <span className={`text-xs font-bold mt-2 truncate w-full text-center text-emerald-400 drop-shadow-md`}>{myTeamObj?.name}</span>
                    </div>
                    <span className="text-blue-600 font-black text-lg px-2 shrink-0">X</span>
                    <div className="flex flex-col items-center flex-1 min-w-0">
                      <ShieldDisplay shield={opponentTeam?.shield} size="small" />
                      <span className={`text-xs font-bold mt-2 truncate w-full text-center text-blue-100`}>{opponentTeam?.name || 'Adversário'}</span>
                    </div>
                  </div>
                  
                  <button 
                    onClick={() => {
                      if (opponentTeam?.whatsapp) {
                        window.open(`https://wa.me/${String(opponentTeam.whatsapp).replace(/\D/g, '')}`, '_blank');
                      }
                    }} 
                    disabled={!opponentTeam?.whatsapp}
                    className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:bg-blue-800 disabled:text-blue-500 text-white font-bold py-2.5 rounded-xl text-xs uppercase tracking-wide transition-colors shadow-md flex items-center justify-center gap-2"
                  >
                    <MessageCircle size={14}/> 
                    {opponentTeam?.whatsapp ? 'Chamar Adversário' : 'Adversário sem Zap'}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {myPendingMatches.length > 0 && (
        <div className="bg-blue-950/80 p-5 rounded-2xl border border-amber-500/40 shadow-lg relative overflow-hidden animate-in slide-in-from-bottom-4">
          <div className="absolute top-0 left-0 w-1 h-full bg-amber-500"></div>
          <h3 className="text-sm font-bold text-amber-400 uppercase tracking-widest mb-4 flex items-center gap-2">
            <AlertCircle size={16} /> Aguardando Validação ({myPendingMatches.length})
          </h3>
          <p className="text-xs text-amber-400/70 mb-3 -mt-3">Estes placares já foram enviados e estão na fila de aprovação dos líderes.</p>
          <div className="space-y-2">
            {myPendingMatches.slice(0, 3).map(m => {
              const tA = getTeam(m.teamA);
              const tB = getTeam(m.teamB);
              return (
                <div key={m.id} onClick={() => onSelectMatch && onSelectMatch(m)} className="bg-blue-900/50 hover:bg-blue-800/80 p-3 rounded-xl border border-blue-800 hover:border-amber-500/50 flex justify-between items-center gap-2 cursor-pointer transition-all">
                  <span className={`text-xs font-bold truncate flex-1 text-right ${userTeamIds.includes(m.teamA) ? 'text-emerald-400' : 'text-blue-200'}`}>{tA?.name || 'A Definir'}</span>
                  <span className="text-[10px] text-blue-500 font-black px-2">VS</span>
                  <span className={`text-xs font-bold truncate flex-1 text-left ${userTeamIds.includes(m.teamB) ? 'text-emerald-400' : 'text-blue-200'}`}>{tB?.name || 'A Definir'}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {openCompetitions.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-lg font-bold text-amber-400 flex items-center gap-2"><Trophy size={20} /> Inscrições Abertas</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {openCompetitions.map(comp => {
              const isFlash = comp.category === 'copa_flash' || comp.category === 'copa_flash_dupla'; 
              const compTeams = Array.isArray(comp.teams) ? comp.teams : [];
              const compPending = Array.isArray(comp.pendingTeams) ? comp.pendingTeams : [];
              const teamCount = parseInt(comp.teamCount) || 0;
              const isFull = isFlash ? false : compTeams.length >= teamCount;
              const alreadyJoined = compTeams.some(tId => userTeamIds.includes(tId));
              const isPending = compPending.some(p => p && userTeamIds.includes(p.teamId));

              const isBlockedByOtherComp = Array.isArray(comp.excludedCompIds) && comp.excludedCompIds.some(exCompId => {
                const exComp = (competitions || []).find(c => c.id === exCompId);
                if (!exComp) return false;
                const inConfirmed = Array.isArray(exComp.teams) && exComp.teams.some(tId => userTeamIds.includes(tId));
                const inPendingEx = Array.isArray(exComp.pendingTeams) && exComp.pendingTeams.some(p => p && userTeamIds.includes(p.teamId));
                return inConfirmed || inPendingEx;
              });

              return (
                <div key={comp.id} className={`bg-blue-900 p-5 rounded-2xl border ${isFlash ? 'border-amber-500/50 shadow-[0_0_15px_rgba(245,158,11,0.2)]' : 'border-amber-500/30'} shadow-lg flex flex-col justify-between group hover:border-amber-500/60 transition-all`}>
                  <div>
                    <div className="flex justify-between items-start mb-2">
                      <h4 className={`font-black text-lg transition-colors ${isFlash ? 'text-amber-400' : 'text-white group-hover:text-amber-400'}`}>{comp.name}</h4>
                      <span className="text-xs bg-amber-500/20 text-amber-400 font-bold px-2 py-1 rounded-lg border border-amber-500/30">
                        {compTeams.length}/{isFlash ? '∞' : teamCount} Vagas
                      </span>
                    </div>
                    <p className="text-xs uppercase text-emerald-400 font-bold tracking-widest">{comp.format === 'league' ? 'Liga' : 'Copa / Grupos'}</p>
                  </div>
                  
                  <div className="mt-5 pt-4 border-t border-blue-800">
                    
                    {isFlash && comp.deadline && (
                      <div className="bg-blue-950 p-2.5 rounded-xl border border-amber-500/40 text-center mb-4">
                        <p className="text-[9px] text-amber-400 font-bold uppercase tracking-widest mb-0.5 flex items-center justify-center gap-1"><Activity size={12}/> Inicia em</p>
                        <p className="text-2xl text-amber-500 drop-shadow-md">
                          <CountdownTimer targetDateStr={`${comp.deadline}T${comp.startTime || '20:00'}:00`} />
                        </p>
                      </div>
                    )}

                    {alreadyJoined ? (
                       <div className="text-emerald-400 text-xs font-bold flex items-center justify-center gap-1 bg-emerald-500/10 py-2 rounded-lg border border-emerald-500/20"><CheckCircle size={16}/> Você já está dentro!</div>
                    ) : isPending ? (
                       <div className="text-amber-400 text-xs font-bold flex items-center justify-center gap-1 bg-amber-500/10 py-2 rounded-lg border border-amber-500/20"><Activity size={16}/> Inscrição em Análise</div>
                    ) : isBlockedByOtherComp ? (
                       <div className="text-red-400 text-xs font-bold flex items-center justify-center gap-1 bg-red-500/10 py-2 rounded-lg border border-red-500/20 text-center"><XCircle size={16}/> Bloqueado (Jogando outro torneio)</div>
                    ) : isFull ? (
                       <div className="text-red-400 text-xs font-bold flex items-center justify-center gap-1 bg-red-500/10 py-2 rounded-lg border border-red-500/20"><XCircle size={16}/> Vagas Esgotadas</div>
                    ) : (
                       <Button onClick={() => onJoinOpenComp && onJoinOpenComp(comp.id)} className="w-full py-2.5 text-sm bg-amber-600 hover:bg-amber-500 text-white font-black shadow-md border-0">
                         Participar do Torneio
                       </Button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      <div>
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2"><Activity size={20} className="text-emerald-500" /> Últimos Resultados Enviados</h3>
        <div className="space-y-3">
          {recentMatches.length === 0 && <p className="text-blue-500 text-sm p-4 bg-blue-900 rounded-xl border border-blue-800">Nenhum resultado submetido ainda.</p>}
          {recentMatches.map(m => {
            if (!m) return null; const tA = getTeam(m.teamA); const tB = getTeam(m.teamB);
            return (
              <div key={m.id} onClick={() => onSelectMatch && onSelectMatch(m)} className="bg-blue-900 p-3 md:p-4 rounded-xl border border-blue-800 flex flex-col gap-3 shadow-sm cursor-pointer hover:border-emerald-500/50 hover:shadow-lg transition-all group relative">
                <div className="flex items-center justify-between w-full gap-2">
                  <div className="flex items-center gap-2 flex-1 min-w-0 justify-start"><div className="shrink-0"><ShieldDisplay shield={tA?.shield} size="normal" /></div><span className="font-medium text-[11px] md:text-sm text-blue-200 truncate group-hover:text-emerald-400 transition-colors">{String(tA?.name || 'Time A')}</span></div>
                  <div className="flex items-center justify-center gap-1.5 md:gap-2 px-2 md:px-3 py-1 bg-blue-950 rounded-lg border border-blue-800 shrink-0">{m.penaltiesA !== null && m.penaltiesA !== undefined && <span className="text-[10px] text-amber-400 font-bold mr-1">({m.penaltiesA})</span>}<span className="font-bold text-sm md:text-base text-emerald-400">{m.status === 'approved' || m.status === 'pending' ? String(m.scoreA) : '?'}</span><span className="text-[10px] md:text-xs text-blue-500 font-bold mx-0.5">X</span><span className="font-bold text-sm md:text-base text-emerald-400">{m.status === 'approved' || m.status === 'pending' ? String(m.scoreB) : '?'}</span>{m.penaltiesB !== null && m.penaltiesB !== undefined && <span className="text-[10px] text-amber-400 font-bold ml-1">({m.penaltiesB})</span>}</div>
                  <div className="flex items-center gap-2 flex-1 min-w-0 justify-end"><span className="font-medium text-[11px] md:text-sm text-blue-200 truncate text-right group-hover:text-emerald-400 transition-colors">{String(tB?.name || 'Time B')}</span><div className="shrink-0"><ShieldDisplay shield={tB?.shield} size="normal" /></div></div>
                </div>
                <div className="flex justify-center border-t border-blue-800/50 pt-2 flex-col items-center gap-1">{m.status === 'approved' ? <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-400">✅ Oficializado • Clique para detalhes</span> : <span className="text-[10px] uppercase font-bold tracking-wider text-amber-400 font-medium">⏳ Aguardando Validação • Clique para detalhes</span>}</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

const TeamStatsModal = ({ team, matches, teams, competitions, onClose }) => {
  if (!team) return null;
  
  const teamMatches = (matches || []).filter(m => {
    if (m.status !== 'approved' || (m.teamA !== team.id && m.teamB !== team.id)) return false;
    return !!competitions.find(c => c.id === m.compId); // 👈 Filtra apagados
  });
  let wins = 0, draws = 0, losses = 0, gf = 0, ga = 0; 
  let biggestWin = null; let maxGd = -1;
  let biggestLoss = null; let minGd = 1;
  let currentStreak = 0; let maxStreak = 0;

  teamMatches.forEach(m => {
    const isTeamA = m.teamA === team.id;
    const scoreFor = isTeamA ? m.scoreA : m.scoreB;
    const scoreAgainst = isTeamA ? m.scoreB : m.scoreA;
    gf += scoreFor; ga += scoreAgainst;
    
    const gd = scoreFor - scoreAgainst;
    if (scoreFor > scoreAgainst) { 
      wins++; 
      currentStreak++; maxStreak = Math.max(maxStreak, currentStreak);
      if (gd > maxGd) { maxGd = gd; biggestWin = { scoreFor, scoreAgainst, oppId: isTeamA ? m.teamB : m.teamA }; } 
    } 
    else if (scoreFor === scoreAgainst) { 
      draws++; 
      currentStreak++; maxStreak = Math.max(maxStreak, currentStreak);
    } 
    else { 
      losses++; 
      currentStreak = 0;
      if (gd < minGd) { minGd = gd; biggestLoss = { scoreFor, scoreAgainst, oppId: isTeamA ? m.teamB : m.teamA }; }
    }
  });

  // 🌟 LEITURA DINÂMICA DE TÍTULOS
          let ligaA = 0; let ligaB = 0; let ligaC = 0; let ligaD = 0;
          let copasFlash = 0;
          let customTitles = {};
          
          (competitions || []).forEach(c => {
             const champIds = getChampionIds(c, matches, teams);
             if (champIds.includes(team.id)) {
                 if (c.category === 'liga_a' || c.category === 'liga_main') ligaA++;
                 else if (c.category === 'liga_b') ligaB++;
                 else if (c.category === 'liga_c') ligaC++;
                 else if (c.category === 'liga_d') ligaD++;
                 else if (c.category === 'copa_flash' || c.category === 'copa_flash_dupla') copasFlash++;
                 else {
                     const compName = c.name || 'Torneio Oficial';
                     customTitles[compName] = (customTitles[compName] || 0) + 1;
                 }
             }
          });

  const conquistas = [];
  
  if (ligaA > 0) conquistas.push({ icon: '🥇', title: `LIGA KAME A - ${ligaA} TÍTULO${ligaA > 1 ? 'S' : ''}`, desc: 'Campeão da Divisão de Elite' });
  if (ligaB > 0) conquistas.push({ icon: '🥈', title: `LIGA KAME B - ${ligaB} TÍTULO${ligaB > 1 ? 'S' : ''}`, desc: 'Campeão da Série B' });
  if (ligaC > 0) conquistas.push({ icon: '🥉', title: `LIGA KAME C - ${ligaC} TÍTULO${ligaC > 1 ? 'S' : ''}`, desc: 'Campeão da Série C' });
  if (ligaD > 0) conquistas.push({ icon: '🎖️', title: `LIGA KAME D - ${ligaD} TÍTULO${ligaD > 1 ? 'S' : ''}`, desc: 'Campeão da Série D' });
  if (copasFlash > 0) conquistas.push({ icon: '⚡', title: `COPA FLASH - ${copasFlash} TÍTULO${copasFlash > 1 ? 'S' : ''}`, desc: 'Campeão de Tiro Curto' });

  Object.keys(customTitles).forEach(compName => {
      const count = customTitles[compName];
      conquistas.push({ 
          icon: '🏆', 
          title: `${compName.toUpperCase()} - ${count} TÍTULO${count > 1 ? 'S' : ''}`, 
          desc: 'Campeão Oficial' 
      });
  });

  if (wins > 0) conquistas.push({ icon: '🌟', title: '1ª VITÓRIA', desc: 'Venceu uma partida oficial' });
  if (gf >= 100) conquistas.push({ icon: '⚽', title: 'GOLEADOR', desc: 'Marcou 100 ou mais gols' });
  if (gf >= 500) conquistas.push({ icon: '⚽', title: 'MERCENÁRIO', desc: 'Marcou 500 ou mais gols' });
  if (wins >= 50) conquistas.push({ icon: '🔥', title: 'ON FIRE', desc: 'Alcançou 50 vitórias' });
  if (teamMatches.length >= 10 && losses === 0) conquistas.push({ icon: '🛡️', title: 'MURALHA', desc: 'Invicto após 10+ jogos' });
  if (biggestWin && (biggestWin.scoreFor - biggestWin.scoreAgainst) >= 3) conquistas.push({ icon: '⚡', title: 'IMPIEDOSO', desc: 'Venceu com 5+ gols de diferença' });
  if (draws >= 5) conquistas.push({ icon: '🤝', title: 'REI DO EMPATE', desc: 'Empatou 5 ou mais vezes' });

  const activeComps = (competitions || []).filter(c => c.teams?.includes(team.id));
  const getTeamObj = (id) => (teams || []).find(t => t.id === id);

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in" onClick={onClose}>
      <div className="bg-blue-900 border border-blue-700 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto custom-scrollbar shadow-2xl" onClick={e => e.stopPropagation()}>
        
        {/* Cabeçalho */}
        <div className="sticky top-0 bg-blue-900/95 backdrop-blur border-b border-blue-800 p-4 sm:p-6 flex justify-between items-center z-10">
          <div className="flex items-center gap-4">
            <ShieldDisplay shield={team.shield} size="normal" />
            <div>
              <h3 className="font-bold text-white text-lg md:text-xl leading-tight">{team.name}</h3>
              <p className="text-xs text-emerald-400 font-medium uppercase tracking-widest mt-1">Técnico: {team.coach}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-blue-400 hover:text-white p-2 bg-blue-800 hover:bg-blue-700 rounded-full transition-colors"><X size={18}/></button>
        </div>
        
        {/* Corpo com Estatísticas */}
        <div className="p-4 sm:p-6 space-y-8">
          
          {/* Resumo da Temporada */}
          <div>
            <h4 className="text-sm font-bold text-blue-400 mb-3 flex items-center gap-2"><Activity size={16}/> Visão Geral</h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-blue-950 p-3 rounded-xl border border-blue-800 text-center"><p className="text-blue-500 text-[10px] uppercase font-bold mb-1">Jogos</p><p className="text-2xl font-bold text-white">{teamMatches.length}</p></div>
              <div className="bg-blue-950 p-3 rounded-xl border border-blue-800 text-center"><p className="text-blue-500 text-[10px] uppercase font-bold mb-1">Vitórias</p><p className="text-2xl font-bold text-emerald-400">{wins}</p></div>
              <div className="bg-blue-950 p-3 rounded-xl border border-blue-800 text-center"><p className="text-blue-500 text-[10px] uppercase font-bold mb-1">Gols Pró</p><p className="text-2xl font-bold text-emerald-400">{gf}</p></div>
              <div className="bg-blue-950 p-3 rounded-xl border border-blue-800 text-center"><p className="text-blue-500 text-[10px] uppercase font-bold mb-1">Aprov.</p><p className="text-2xl font-bold text-amber-400">{teamMatches.length > 0 ? Math.round((wins * 3 + draws) / (teamMatches.length * 3) * 100) : 0}%</p></div>
            </div>
          </div>

          {/* Recordes do Clube */}
          <div>
            <h4 className="text-sm font-bold text-blue-400 mb-3 flex items-center gap-2"><Star size={16} className="text-amber-400"/> Recordes do Clube</h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="bg-blue-950 p-4 rounded-xl border border-blue-800 text-center flex flex-col items-center">
                <p className="text-[10px] text-blue-500 uppercase font-bold mb-2">Maior Goleada</p>
                {biggestWin ? (
                  <>
                    <p className="text-xl font-black text-emerald-400">{biggestWin.scoreFor} <span className="text-sm text-slate-500 font-bold mx-1">x</span> {biggestWin.scoreAgainst}</p>
                    <p className="text-[10px] text-blue-300 mt-1 truncate w-full">vs {getTeamObj(biggestWin.oppId)?.name || 'Adversário'}</p>
                  </>
                ) : <p className="text-xs text-blue-700 italic mt-2">Nenhuma vitória</p>}
              </div>
              <div className="bg-blue-950 p-4 rounded-xl border border-blue-800 text-center flex flex-col items-center">
                <p className="text-[10px] text-blue-500 uppercase font-bold mb-2">Pior Derrota</p>
                {biggestLoss ? (
                  <>
                    <p className="text-xl font-black text-red-400">{biggestLoss.scoreFor} <span className="text-sm text-slate-500 font-bold mx-1">x</span> {biggestLoss.scoreAgainst}</p>
                    <p className="text-[10px] text-blue-300 mt-1 truncate w-full">vs {getTeamObj(biggestLoss.oppId)?.name || 'Adversário'}</p>
                  </>
                ) : <p className="text-xs text-blue-700 italic mt-2">Nenhuma derrota</p>}
              </div>
              <div className="bg-blue-950 p-4 rounded-xl border border-blue-800 text-center flex flex-col items-center">
                <p className="text-[10px] text-blue-500 uppercase font-bold mb-2">Maior Série Invicta</p>
                <p className="text-3xl font-black text-blue-200 mt-1">{maxStreak}</p>
                <p className="text-[10px] text-blue-400 mt-1">Jogos sem perder</p>
              </div>
            </div>
          </div>

          {/* Desempenho em Torneios */}
          <div>
            <h4 className="text-sm font-bold text-blue-400 mb-3 flex items-center gap-2"><Trophy size={16} className="text-emerald-500"/> Desempenho nos Campeonatos</h4>
            {activeComps.length > 0 ? (
              <div className="space-y-3">
                {activeComps.map(comp => {
                  const table = calculateStandings(matches, teams, comp.id);
                  const rankIndex = table.findIndex(t => t.id === team.id);
                  const myStats = rankIndex !== -1 ? table[rankIndex] : null;
                  const rank = rankIndex !== -1 ? rankIndex + 1 : '-';
                  
                  return (
                    <div key={comp.id} className="bg-blue-950 p-3 rounded-xl border border-blue-800 flex flex-col sm:flex-row items-center justify-between gap-3">
                      <div className="flex-1 flex flex-col items-center sm:items-start w-full">
                        <span className="font-bold text-blue-200 text-sm truncate">{comp.name}</span>
                        <span className="text-[10px] text-blue-500 uppercase font-bold">{comp.format === 'league' ? 'Liga' : 'Copa / Grupos'}</span>
                      </div>
                      
                      {myStats && myStats.p > 0 ? (
                        <div className="flex items-center gap-4 shrink-0 bg-blue-900/50 px-4 py-2 rounded-lg border border-blue-800/50">
                          <div className="text-center"><p className="text-[9px] text-blue-400 uppercase font-bold mb-0.5">Posição</p><p className="text-base font-black text-emerald-400">{rank}º</p></div>
                          <div className="text-center"><p className="text-[9px] text-blue-400 uppercase font-bold mb-0.5">Pontos</p><p className="text-base font-black text-blue-200">{myStats.pts}</p></div>
                          <div className="text-center"><p className="text-[9px] text-blue-400 uppercase font-bold mb-0.5">Jogos</p><p className="text-base font-bold text-blue-300">{myStats.p}</p></div>
                        </div>
                      ) : (
                        <p className="text-xs text-blue-600 italic shrink-0">Sem jogos ainda</p>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-xs text-blue-500 text-center p-4 bg-blue-950 rounded-xl border border-blue-800 border-dashed">Ainda não disputou nenhum torneio.</p>
            )}
          </div>

          {/* Conquistas e Títulos */}
          <div>
            <h4 className="text-sm font-bold text-blue-400 mb-3 flex items-center gap-2"><Medal size={16} className="text-amber-400"/> Sala de Troféus</h4>
            {conquistas.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {conquistas.map((c, i) => {
                  const isTitle = c.title.includes('TÍTULO');
                  return (
                    <div key={i} className={`p-4 rounded-xl border text-center flex flex-col items-center justify-center transition-all group ${isTitle ? 'bg-gradient-to-br from-amber-600/20 to-amber-900/40 border-amber-500/50 hover:border-amber-400' : 'bg-blue-950 border-blue-800 hover:border-amber-500/50 hover:bg-blue-900'}`}>
                      <span className="text-3xl mb-2 group-hover:scale-110 transition-transform">{c.icon}</span>
                      <p className={`text-xs font-bold ${isTitle ? 'text-amber-400 drop-shadow-md' : 'text-white'}`}>{c.title}</p>
                      <p className={`text-[9px] mt-1 leading-tight ${isTitle ? 'text-amber-200/80 font-bold' : 'text-blue-500'}`}>{c.desc}</p>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-xs text-blue-500 text-center p-6 bg-blue-950 rounded-xl border border-blue-800 border-dashed">Nenhuma conquista desbloqueada ainda.</p>
            )}
          </div>

        </div>
      </div>
    </div>
  );
};


export default Dashboard;

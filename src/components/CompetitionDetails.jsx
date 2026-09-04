import React, { useState, useEffect, useMemo } from 'react';
import { Trophy, BookOpen, Trash2, Edit, XCircle, X, Shield, Activity, Camera, Users, AlertCircle, PlayCircle, Lock, MessageCircle, Star, Medal, ArrowLeft } from 'lucide-react';
import { updateDoc, setDoc } from 'firebase/firestore';
import { getPublicDocPath } from '../utils/firebase';
import ShieldDisplay from './ShieldDisplay';
import Button from './Button';
import Standings from './Standings';
import CountdownTimer from './CountdownTimer';
import { calculateStandings, getChampionIds } from '../utils/torneios';
import { processImage } from '../utils/helpers';
import SubmitMatch from './SubmitMatch';
import ValidationPanel from './ValidationPanel';
import { DrawPanel, LiveDrawPanel } from './DrawPanels';
const LOGO_URL = "https://i.imgur.com/dhXA0ni.png";

const CompetitionDetails = ({ comp, teams, matches, competitions = [], users = [], onBack, currentUser, onReleaseRound, onLockRound, onSelectMatch, onDeleteMatch, onEditComp, showToast, onUpdatePlayedMatch, onSubmitMatch, onUpdateMatchStatus, onBatchUpdateComp }) => {
  const [subTab, setSubTab] = useState('overview'); 
  const [expandedRoundId, setExpandedRoundId] = useState(null);
  const [editMatchData, setEditMatchData] = useState(null);
  const [showAddTeam, setShowAddTeam] = useState(false);
  const [newTeamToAdd, setNewTeamToAdd] = useState('');
  const [selectedDuplaMatchup, setSelectedDuplaMatchup] = useState(null);
  const [showCalendar, setShowCalendar] = useState(false);

  const [viewType, setViewType] = useState(comp?.format === 'league' ? 'table' : 'bracket');

  const [showEditPrizes, setShowEditPrizes] = useState(false);
  const [prizeData, setPrizeData] = useState({ first: comp?.prizes?.first || '', second: comp?.prizes?.second || '', third: comp?.prizes?.third || '', extra: comp?.prizes?.extra || '' });

  const [showEditSettings, setShowEditSettings] = useState(false);
  const [settingsData, setSettingsData] = useState({
    category: comp?.category || 'liga_a', edition: comp?.name ? comp.name.replace(/\D/g, '') : '', playStyle: comp?.playStyle || 'Livre', rules: comp?.rules || '',
    promotions: comp?.promotions || 0, relegations: comp?.relegations || 0, admins: comp?.admins || [],
    excludedCompIds: comp?.excludedCompIds || [],
    registrationStartTime: comp?.registrationStartTime || ''
  });
  
  const [showEditGroups, setShowEditGroups] = useState(false);
  const [teamGroupMapping, setTeamGroupMapping] = useState({});
  const [newGroupName, setNewGroupName] = useState('');
  
  // 🌟 NOVO ESTADO: Controle de Desistência
  const [withdrawTeamId, setWithdrawTeamId] = useState('');

  // 🌟 NOVO ESTADO: Histórico de Partidas do Time Selecionado
  const [selectedTeamHistory, setSelectedTeamHistory] = useState(null);

  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (comp?.category !== 'copa_flash' && comp?.category !== 'copa_flash_dupla') return;
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [comp]);

  if (!comp) return (<div className="text-center py-12"><p className="text-blue-400">Torneio não localizado.</p><button onClick={onBack} className="text-emerald-400 underline">Voltar</button></div>);
  
  const isRegistration = comp.status === 'registration';
  const getTeam = (id) => (teams || []).find(t => t && t.id === id);
  const isLeader = currentUser?.role === 'leader' || currentUser?.role === 'kaioh';
  const isAdmin = isLeader || comp?.creatorId === currentUser?.id || (comp?.admins || []).includes(currentUser?.id);
  
  const CATEGORY_NAMES = { liga_a: '🥇 Liga Kame A', liga_b: '🥈 Liga Kame B', liga_c: '🥉 Liga Kame C', liga_d: '🎖️ Liga Kame D', liga_acesso: ' ⬆️ Liga de acesso', copa_estrelas: '⭐ Copa das Estrelas', copa_main: '🏆 Copa Oficial', copa_flash: '⚡ Copa Flash Solo', copa_flash_dupla: '👥 Copa Flash Duplas', copa_do_rei: '👑 Copa do Rei', copa_amazonia: '🌳 Copa da Amazônia' };

  const activeRound = comp?.rounds?.find(r => r.status === 'released');
  const isFlash = comp?.category === 'copa_flash' || comp?.category === 'copa_flash_dupla';
  let timeLeft = 0;
  let isExpired = false;
  
  if (isFlash && activeRound && comp.flashDuration) {
    const deadline = (activeRound.releasedAt || Date.now()) + (comp.flashDuration * 60000);
    timeLeft = deadline - now;
    isExpired = timeLeft <= 0;
  }

  const formatTime = (ms) => {
    if (ms <= 0) return '00:00';
    const totalSecs = Math.floor(ms / 1000);
    const m = Math.floor(totalSecs / 60).toString().padStart(2, '0');
    const s = (totalSecs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const handleWithdrawTeam = () => {
    if (!withdrawTeamId) return;
    if (!window.confirm("🚨 ATENÇÃO: O time selecionado sofrerá W.O. (0x3) em TODOS os jogos restantes e será bloqueado de participar da PRÓXIMA EDIÇÃO desta competição. Confirma?")) return;

    const newSuspended = [...(comp.suspendedTeams || [])];
    if (!newSuspended.includes(withdrawTeamId)) newSuspended.push(withdrawTeamId);

    const newMatchDocs = [];
    const newRounds = JSON.parse(JSON.stringify(comp.rounds || []));

    newRounds.forEach(round => {
        round.matches.forEach(m => {
            if (m.teamA === withdrawTeamId || m.teamB === withdrawTeamId) {
                const isPlayed = matches.some(x => x.matchId === m.id && x.compId === comp.id && x.status !== 'rejected');
                
                if (!isPlayed && m.teamA && m.teamB && !m.teamA.includes('Definir') && !m.teamB.includes('Definir')) {
                    const isTeamA = m.teamA === withdrawTeamId;
                    newMatchDocs.push({
                        id: `m_wo_quit_${Date.now()}_${Math.floor(Math.random()*10000)}`,
                        compId: comp.id,
                        roundId: round.id,
                        matchId: m.id,
                        teamA: m.teamA,
                        teamB: m.teamB,
                        scoreA: isTeamA ? 0 : 3,
                        scoreB: isTeamA ? 3 : 0,
                        penaltiesA: null,
                        penaltiesB: null,
                        goals: [],
                        observacoes: '🏳️ W.O. por Desistência / Abandono de Campeonato',
                        status: 'pending', 
                        submittedBy: 'Sistema Admin'
                    });
                }
            }
        });
    });

    onBatchUpdateComp({ ...comp, suspendedTeams: newSuspended, rounds: newRounds }, newMatchDocs);
    showToast(`Desistência registrada! ${newMatchDocs.length} W.O(s) gerados para validação.`, "success");
    setWithdrawTeamId('');
  };

  // 🌟 FUNÇÃO PARA REMOVER O TIME COMPLETAMENTE DA TABELA
  const handleRemoveTeamEntirely = () => {
    if (!withdrawTeamId) return;
    if (!window.confirm("🚨 EXCLUSÃO TOTAL: O time desaparecerá da tabela de classificação. Tem certeza que deseja remover o time definitivamente da competição?")) return;

    const newTeams = (comp.teams || []).filter(id => id !== withdrawTeamId);
    onEditComp({ ...comp, teams: newTeams });
    showToast("Time removido da tabela com sucesso!", "success");
    setWithdrawTeamId('');
  };

  const handleAutoFlashRound = (round) => {
    if(!window.confirm('Encerrar fase? Sorteio automático (W.O Duplo) será aplicado nos jogos que não foram disputados.')) return;
    showToast('Processando encerramento de fase...', 'info');

    const newMatchDocs = [];
    const matchResults = {}; 
    
    round.matches.forEach(m => {
        const sUI = matches.find(x => x.matchId === m.id && x.compId === comp.id && x.status === 'approved');
        if (sUI) {
            let wId = null;
            if (sUI.scoreA > sUI.scoreB) wId = m.teamA;
            else if (sUI.scoreB > sUI.scoreA) wId = m.teamB;
            else if (sUI.penaltiesA > sUI.penaltiesB) wId = m.teamA;
            else if (sUI.penaltiesB > sUI.penaltiesA) wId = m.teamB;
            matchResults[m.id] = wId;
        } else {
            if (m.teamA && m.teamB) {
                const winnerIsA = Math.random() < 0.5;
                const scoreA = winnerIsA ? 3 : 0;
                const scoreB = winnerIsA ? 0 : 3;
                const winnerId = winnerIsA ? m.teamA : m.teamB;
                matchResults[m.id] = winnerId;
                
                newMatchDocs.push({
                    id: `m_flash_${Date.now()}_${Math.floor(Math.random()*10000)}`,
                    compId: comp.id,
                    roundId: round.id,
                    matchId: m.id,
                    teamA: m.teamA,
                    teamB: m.teamB,
                    scoreA, scoreB,
                    penaltiesA: null, penaltiesB: null,
                    goals: [],
                    observacoes: '⚡ W.O. Duplo Automático (Fim do Prazo Flash)',
                    status: 'approved',
                    submittedBy: 'Sistema Flash'
                });
            } else if (m.teamA) { matchResults[m.id] = m.teamA; } 
              else if (m.teamB) { matchResults[m.id] = m.teamB; }
        }
    });

    const newRounds = JSON.parse(JSON.stringify(comp.rounds));
    const rIndex = newRounds.findIndex(r => r.id === round.id);

    if (rIndex >= 0 && rIndex < newRounds.length - 1) {
        const nextRound = newRounds[rIndex + 1];
        round.matches.forEach((m, mIdx) => {
           const winnerId = matchResults[m.id];
           if (!winnerId) return;

           const nextMIndex = Math.floor(mIdx / 2);
           const isTeamA = mIdx % 2 === 0;

           const isNextRoundFinal = nextRound.matches.some(x => x.id.includes('_f1') || x.id.includes('_3rd'));
           if (isNextRoundFinal) {
              const loserId = winnerId === m.teamA ? m.teamB : m.teamA;
              nextRound.matches.forEach(nextMatch => {
                 if (nextMatch.id.includes('_3rd')) {
                    if (isTeamA) nextMatch.teamA = loserId; else nextMatch.teamB = loserId;
                 } else if (nextMatch.id.includes('_f1')) { 
                    if (isTeamA) nextMatch.teamA = winnerId; else nextMatch.teamB = winnerId;
                 }
              });
           } else {
              if (nextRound.matches[nextMIndex]) {
                 if (isTeamA) nextRound.matches[nextMIndex].teamA = winnerId;
                 else nextRound.matches[nextMIndex].teamB = winnerId;
              }
           }
        });
        nextRound.status = 'released';
        nextRound.releasedAt = Date.now(); 
    }
    newRounds[rIndex].status = 'locked';

    if (onBatchUpdateComp) {
        onBatchUpdateComp({ ...comp, rounds: newRounds }, newMatchDocs);
    }
  };

  const getMatchStatusDisplay = (matchId) => {
    if(!matchId) return { isPlayed: false, text: 'Aguardando', color: 'text-blue-500', bg: 'bg-blue-950 border-blue-800' };
    const ms = (matches || []).filter(m => m && m.matchId === matchId && m.compId === comp.id && m.status !== 'rejected');
    if(ms.length === 0) return { isPlayed: false, text: 'Aguardando', color: 'text-blue-500', bg: 'bg-blue-950 border-blue-800' };
    const sm = ms.find(m => m.status === 'approved') || ms.find(m => m.status === 'pending');
    if(!sm) return { isPlayed: false, text: 'Aguardando', color: 'text-blue-500', bg: 'bg-blue-950 border-blue-800' };
    if(sm.status === 'approved') return { submittedMatchId: sm.id, isPlayed: true, scoreA: sm.scoreA, scoreB: sm.scoreB, penaltiesA: sm.penaltiesA, penaltiesB: sm.penaltiesB, text: 'Oficial', color: 'text-emerald-400', bg: 'bg-blue-950/80 border-emerald-950/30' };
    return { submittedMatchId: sm.id, isPlayed: true, scoreA: sm.scoreA, scoreB: sm.scoreB, penaltiesA: sm.penaltiesA, penaltiesB: sm.penaltiesB, text: 'Validando', color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20' };
  };

  const { topScorers, topAssists } = useMemo(() => {
    const scorers = {}; const assists = {};
    (matches || []).filter(m => m.compId === comp.id && m.status === 'approved').forEach(m => {
      (m.goals || []).forEach(g => {
        if (g.player) {
          const pKey = g.player.trim().toLowerCase() + '_' + g.teamId;
          if(!scorers[pKey]) scorers[pKey] = { player: g.player, teamId: g.teamId, count: 0 };
          scorers[pKey].count += 1;
        }
        if (g.assist) {
          const aKey = g.assist.trim().toLowerCase() + '_' + g.teamId;
          if(!assists[aKey]) assists[aKey] = { player: g.assist, teamId: g.teamId, count: 0 };
          assists[aKey].count += 1;
        }
      });
    });
    return {
      topScorers: Object.values(scorers).sort((a,b) => b.count - a.count).slice(0, 15),
      topAssists: Object.values(assists).sort((a,b) => b.count - a.count).slice(0, 15)
    };
  }, [matches, comp.id]);

  const captureSection = (elementId, fileName) => {
    showToast("Preparando imagem...", "success");
    const captureAndDownload = () => {
      const element = document.getElementById(elementId);
      if (!element) return;
      const originalWidth = element.style.width; const originalOverflow = element.style.overflow;
      element.style.width = 'max-content'; element.style.overflow = 'visible';
      const scrollables = element.querySelectorAll('.scrollbar-kame, .overflow-x-auto');
      scrollables.forEach(el => { el.style.overflow = 'visible'; el.style.width = 'max-content'; el.style.maxHeight = 'none'; });

      window.html2canvas(element, { backgroundColor: '#020617', scale: 2, useCORS: true }).then(canvas => {
        element.style.width = originalWidth; element.style.overflow = originalOverflow;
        scrollables.forEach(el => { el.style.overflow = ''; el.style.width = ''; el.style.maxHeight = ''; });
        const link = document.createElement('a'); link.download = `${fileName}.png`; link.href = canvas.toDataURL('image/png'); link.click();
        showToast("Salvo com sucesso!", "success");
      });
    };
    if (window.html2canvas) { captureAndDownload(); } else {
      const script = document.createElement('script'); script.src = "https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js"; script.onload = captureAndDownload; document.body.appendChild(script);
    }
  };

  const toggleRound = (id) => { setExpandedRoundId(prev => prev === id ? null : id); };
  
  const handleDeleteRound = (roundId) => {
    if (!window.confirm("⚠️ ATENÇÃO: Tem certeza que deseja excluir esta rodada e TODOS os jogos dentro dela? Essa ação não pode ser desfeita.")) return;
    const updatedRounds = comp.rounds.filter(r => r.id !== roundId);
    onEditComp({ ...comp, rounds: updatedRounds });
    showToast("Rodada removida com sucesso!", "success");
  };

  const handleOpenEditGroups = () => {
    const mapping = {};
    if (comp.groups) Object.keys(comp.groups).forEach(gName => { (comp.groups[gName] || []).forEach(tId => { mapping[tId] = gName; }); });
    (comp.teams || []).forEach(tId => { if (!mapping[tId]) { const firstGroupKey = Object.keys(comp.groups || {})[0] || 'A'; mapping[tId] = firstGroupKey; } });
    setTeamGroupMapping(mapping); setShowEditGroups(true);
  };

  const handleSaveGroups = () => {
    const newGroups = {}; const groupKeys = Object.keys(comp.groups || { A: [], B: [] }); groupKeys.forEach(k => { newGroups[k] = []; });
    Object.keys(teamGroupMapping).forEach(tId => { const gName = teamGroupMapping[tId]; if (!newGroups[gName]) newGroups[gName] = []; newGroups[gName].push(tId); });
    onEditComp({ ...comp, groups: newGroups }); setShowEditGroups(false); showToast("Grupos atualizados!", "success");
  };

  const handleAutoMigrateKnockout = () => {
    if (!comp.groups) return; showToast("Calculando classificados...", "info");
    const qualifiers = {};
    Object.keys(comp.groups).forEach((gName) => {
      const gTeams = (teams || []).filter(t => comp.groups[gName].includes(t.id));
      const gTable = calculateStandings(matches, gTeams, comp.id);
      gTable.forEach((row, idx) => { 
         qualifiers[`${idx + 1}º Grupo ${gName}`] = row.id; 
         qualifiers[`${idx + 1}º do Grupo ${gName}`] = row.id; 
         qualifiers[`${idx + 1}º Gr.${gName}`] = row.id;
      });
    });
      
    const updatedRounds = comp.rounds.map(round => {
      const newMatches = round.matches.map(m => {
        let newA = m.teamA; let newB = m.teamB;
        if (!newA && m.placeholderA && qualifiers[m.placeholderA]) newA = qualifiers[m.placeholderA];
        if (!newB && m.placeholderB && qualifiers[m.placeholderB]) newB = qualifiers[m.placeholderB];
        return { ...m, teamA: newA, teamB: newB };
      });
      return { ...round, matches: newMatches };
    });
    onEditComp({ ...comp, rounds: updatedRounds }); showToast("Mata-Mata preenchido!", "success");
  };

  const handleAddMatchToGroup = (roundId, groupLetter) => {
    const newMatch = { id: `m_manual_${Date.now()}_${Math.floor(Math.random()*1000)}`, teamA: '', teamB: '', group: groupLetter, placeholderA: 'A Definir', placeholderB: 'A Definir' };
    const updatedRounds = comp.rounds.map(r => r.id === roundId ? { ...r, matches: [...r.matches, newMatch] } : r);
    onEditComp({ ...comp, rounds: updatedRounds }); showToast("Nova partida adicionada!", "success");
  };

  const handleAddNewGroup = (roundId) => {
    const novoG = window.prompt("Qual a letra ou nome do novo grupo? (Ex: E)");
    if (novoG && novoG.trim()) {
      const upperG = novoG.trim().toUpperCase(); let updatedGroups = { ...(comp.groups || {}) }; if (!updatedGroups[upperG]) updatedGroups[upperG] = [];
      const newMatch = { id: `m_manual_${Date.now()}_${Math.floor(Math.random()*1000)}`, teamA: '', teamB: '', group: upperG, placeholderA: 'A Definir', placeholderB: 'A Definir' };
      const updatedRounds = comp.rounds.map(r => r.id === roundId ? { ...r, matches: [...r.matches, newMatch] } : r);
      onEditComp({ ...comp, rounds: updatedRounds, groups: updatedGroups }); showToast(`Grupo ${upperG} criado!`, "success");
    }
  };

  const handleAddNewRound = () => {
    const nextRoundNum = (comp.rounds && comp.rounds.length > 0) ? Math.max(...comp.rounds.map(r => r.number || 0)) + 1 : 1;
    const newMatch = { id: `m_manual_${Date.now()}_${Math.floor(Math.random()*1000)}`, teamA: '', teamB: '', group: null, placeholderA: 'A Definir', placeholderB: 'A Definir' };
    const newRound = { id: `r_manual_${Date.now()}`, number: nextRoundNum, status: 'released', releasedAt: Date.now(), matches: [newMatch] };
    onEditComp({ ...comp, rounds: [...(comp.rounds || []), newRound] }); showToast(`Rodada Extra adicionada!`, "success"); setExpandedRoundId(newRound.id); setShowCalendar(true);
  };

  const handleOpenEditModal = (m, roundId) => {
    const playedMatch = (matches || []).find(x => x.matchId === m.id && x.compId === comp.id && x.status !== 'rejected');
    setEditMatchData({ ...m, roundId: roundId, group: m.group || 'A', dlsCode: m.dlsCode || '', scoreA: playedMatch ? playedMatch.scoreA : '', scoreB: playedMatch ? playedMatch.scoreB : '', penaltiesA: playedMatch && playedMatch.penaltiesA !== null && playedMatch.penaltiesA !== undefined ? playedMatch.penaltiesA : '', penaltiesB: playedMatch && playedMatch.penaltiesB !== null && playedMatch.penaltiesB !== undefined ? playedMatch.penaltiesB : '', hasPlayed: !!playedMatch, playedMatchId: playedMatch ? playedMatch.id : null, woA: false, woB: false }); 
  };

  const handleDeleteMatchCompletely = () => {
    if(!window.confirm("Apagar ESTA PARTIDA INTEIRA do calendário?")) return;
    if (editMatchData.hasPlayed && onDeleteMatch && editMatchData.playedMatchId) onDeleteMatch(editMatchData.playedMatchId);
    const updatedRounds = comp.rounds.map(r => r.id === editMatchData.roundId ? { ...r, matches: r.matches.filter(m => m.id !== editMatchData.id) } : r);
    onEditComp({ ...comp, rounds: updatedRounds }); setEditMatchData(null); showToast("Removida do calendário!", "success");
  };

  const saveMatchEdit = () => {
    const updatedRounds = comp.rounds.map(r => r.id === editMatchData.roundId ? { ...r, matches: r.matches.map(m => m.id === editMatchData.id ? { ...m, teamA: editMatchData.teamA, teamB: editMatchData.teamB, group: editMatchData.group, dlsCode: editMatchData.dlsCode } : m) } : r);
    onEditComp({ ...comp, rounds: updatedRounds });
    setEditMatchData(null);
    showToast("Confronto salvo!", "success");
  };

  const handleSavePrizes = () => { onEditComp({ ...comp, prizes: { first: prizeData.first.trim(), second: prizeData.second.trim(), third: prizeData.third.trim(), extra: prizeData.extra.trim() } }); setShowEditPrizes(false); showToast("Quadro de premiações atualizado!", "success"); };
  
  const compTeams = (teams || []).filter(t => t && comp.teams?.includes(t.id));
  const availableTeamsToAdd = (teams || []).filter(t => t && !comp.teams?.includes(t.id));
  const isKnockoutEdit = editMatchData?.id?.includes('_ko_');
  const availableTeamsForEdit = (comp.format === 'groups' && editMatchData?.group && comp.groups && !isKnockoutEdit) ? (comp.groups[editMatchData.group] || []) : (comp.teams || []);
  
  const handleAddTeamToComp = () => { 
    if(!newTeamToAdd) return; 
    
    const newTeams = [...(comp.teams || []), newTeamToAdd]; 
    const newPending = (comp.pendingTeams || []).filter(p => p.teamId !== newTeamToAdd); 
    
    // 🔥 CORREÇÃO: Limpa o "nome sujo" do time na lista de banidos ao readicioná-lo!
    const newSuspended = (comp.suspendedTeams || []).filter(id => id !== newTeamToAdd);

    onEditComp({ 
        ...comp, 
        teams: newTeams, 
        pendingTeams: newPending,
        suspendedTeams: newSuspended 
    }); 
    
    setNewTeamToAdd(''); 
    setShowAddTeam(false); 
    showToast("Time reinserido e banimento removido com sucesso!", "success"); 
  };
  
  const handleCopyLink = () => { navigator.clipboard.writeText(`${window.location.origin}/api/share?id=${comp.id}`); showToast("Link de compartilhamento especial copiado!", "success"); };
  const handleApproveTeam = (req) => { const newPending = comp.pendingTeams.filter(p => p.teamId !== req.teamId); const newTeams = [...(comp.teams || []), req.teamId]; onEditComp({ ...comp, pendingTeams: newPending, teams: newTeams }); showToast("Time Aprovado!", "success"); };
  const handleRemoveConfirmedTeam = (teamId) => {
    if (window.confirm("Deseja remover este time da lista de confirmados?")) {
      const newTeams = (comp.teams || []).filter(id => id !== teamId);
      onEditComp({ ...comp, teams: newTeams });
      showToast("Time removido da competição.", "success");
    }
  };
  
  const handleGenerateBracket = () => { 
    if (comp.teams.length !== comp.teamCount) { showToast(`Você precisa de ${comp.teamCount} times!`, "error"); return; } 
    
    if (comp.category === 'copa_flash_dupla') {
        onEditComp({ ...comp, status: 'drawing' });
        showToast("Modo Sorteio Ao Vivo Ativado!", "success");
        return;
    }

    let finalRounds = []; let groupsData = null; 
    if (comp.format === 'groups') { 
        const res = generateGroupsAndKnockout(comp.teams, comp.id, comp.numGroups, comp.qualifiersPerGroup, comp.isDoubleRound, comp.isFinalDouble); 
        finalRounds = res.rounds; groupsData = res.groups; 
    } else if (comp.format === 'cup') { 
        finalRounds = generateCupBracket(comp.teams, comp.id, comp.isFinalDouble); 
    } else { 
        finalRounds = generateRoundRobin(comp.teams, comp.id, comp.isDoubleRound); 
    } 
    onEditComp({ ...comp, status: 'active', rounds: finalRounds, groups: groupsData || comp.groups || null }); 
    showToast("Tabela gerada com sucesso!", "success"); 
  };

  const handleForceAdvanceDupla = (roundId, mIda, winnerDupla) => {
    if (!isAdmin || typeof winnerDupla === 'string') return;
    if (!window.confirm(`Tem certeza que deseja avançar a dupla ${winnerDupla.name} para a próxima fase?`)) return;

    const rIndex = comp.rounds.findIndex(r => r.id === roundId);
    if (rIndex >= 0 && rIndex < comp.rounds.length - 1) {
        const mIndex = comp.rounds[rIndex].matches.findIndex(m => m.id === mIda.id);
        const nextRIndex = rIndex + 1;
        const nextMIndex = Math.floor(mIndex / 4) * 2;
        const isTeamA = (Math.floor(mIndex / 2) % 2) === 0;

        const newRounds = JSON.parse(JSON.stringify(comp.rounds));

        if (isTeamA) {
            newRounds[nextRIndex].matches[nextMIndex].duplaA = winnerDupla;
            newRounds[nextRIndex].matches[nextMIndex].teamA = winnerDupla.p1;
            newRounds[nextRIndex].matches[nextMIndex].placeholderA = `${winnerDupla.name} (Téc 1)`;

            newRounds[nextRIndex].matches[nextMIndex + 1].duplaB = winnerDupla;
            newRounds[nextRIndex].matches[nextMIndex + 1].teamB = winnerDupla.p2;
            newRounds[nextRIndex].matches[nextMIndex + 1].placeholderB = `${winnerDupla.name} (Téc 2)`;
        } else {
            newRounds[nextRIndex].matches[nextMIndex].duplaB = winnerDupla;
            newRounds[nextRIndex].matches[nextMIndex].teamB = winnerDupla.p1;
            newRounds[nextRIndex].matches[nextMIndex].placeholderB = `${winnerDupla.name} (Téc 1)`;

            newRounds[nextRIndex].matches[nextMIndex + 1].duplaA = winnerDupla;
            newRounds[nextRIndex].matches[nextMIndex + 1].teamA = winnerDupla.p2;
            newRounds[nextRIndex].matches[nextMIndex + 1].placeholderA = `${winnerDupla.name} (Téc 2)`;
        }

        onEditComp({ ...comp, rounds: newRounds });
        showToast("Dupla avançada com sucesso!", "success");
        setSelectedDuplaMatchup(null);
    }
  };
  
  const hasAnyPrize = comp.prizes && (comp.prizes.first || comp.prizes.second || comp.prizes.third || comp.prizes.extra);
  const knockoutRounds = (comp.rounds || []).filter(r => r.id.includes('ko') || comp.format === 'cup' || comp.category === 'copa_flash_dupla');
  const groupOrNormalRounds = (comp.rounds || []).filter(r => !r.id.includes('ko') && comp.format !== 'cup' && comp.category !== 'copa_flash_dupla');
  
  const championTeams = useMemo(() => {
    const ids = getChampionIds(comp, matches, teams);
    return ids.map(id => getTeam(id)).filter(Boolean);
  }, [comp, matches, teams]);

  if (comp.status === 'drawing') {
    if (isAdmin) {
      return (
        <LiveDrawPanel 
          comp={comp} 
          teams={teams} 
          matches={matches} 
          onCancel={() => onEditComp({ ...comp, status: 'registration' })}
          onFinish={(rounds, duplasResult) => {
            onEditComp({ ...comp, status: 'active', rounds: rounds, groups: duplasResult });
            showToast("Sorteio Concluído! A Tabela Oficial foi gerada.", "success");
          }} 
        />
      );
    }

    return (
      <div className="space-y-6 animate-in fade-in pb-10">
        <button onClick={onBack} className="flex items-center gap-1.5 text-xs text-blue-400 hover:text-white"><ArrowLeft size={16}/> Voltar</button>
        <div className="bg-blue-900 p-8 md:p-12 rounded-3xl border border-amber-500/50 flex flex-col items-center text-center shadow-2xl mt-8">
            <span className="text-6xl mb-6 animate-bounce">🎲</span>
            <h2 className="text-3xl md:text-4xl font-black text-amber-400 uppercase tracking-widest mb-4">Sorteio Ao Vivo Ativo</h2>
            <p className="text-blue-300 md:w-2/3 leading-relaxed">As inscrições foram encerradas. Acompanhe a live dos líderes!<br/><br/>A tabela e os confrontos estão bloqueados enquanto a diretoria realiza o sorteio oficial ao vivo.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in pb-10">
      <button onClick={onBack} className="flex items-center gap-1.5 text-xs text-blue-400 hover:text-white"><ArrowLeft size={16}/> Voltar</button>
      
      <div className="bg-blue-900 p-5 rounded-3xl border border-blue-800 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shadow-xl">
        <div>
          <h2 className="text-xl font-bold text-white uppercase tracking-wider">{comp.category ? CATEGORY_NAMES[comp.category] : 'Campeonato'} - {comp.name}</h2>
          <div className="flex items-center flex-wrap gap-2 mt-2">
            <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded font-black tracking-widest uppercase">{comp.category ? CATEGORY_NAMES[comp.category] : 'Sem Categoria'}</span>
            <span className="text-[10px] bg-purple-500/20 text-purple-400 px-2 py-0.5 rounded font-black tracking-widest uppercase">Estilo: {comp.playStyle || 'Livre'}</span>
            {comp.status === 'finished' && (<span className="text-[10px] bg-red-500/20 text-red-400 px-2 py-0.5 rounded font-black tracking-widest uppercase flex items-center gap-1"><Lock size={10}/> Encerrado</span>)}
            <span className="text-xs text-blue-400 font-medium ml-1">• {comp.format === 'league' ? 'Pontos Corridos' : comp.format === 'groups' ? 'Fase de Grupos + Copa' : 'Copa Mata-Mata'}</span>
          </div>
        </div>
        <div className="flex gap-2 w-full md:w-auto flex-wrap">
          {isAdmin && comp.format === 'groups' && comp.groups && (<button onClick={handleOpenEditGroups} className="bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold py-2 px-3 rounded-lg border border-purple-700 shadow-md flex items-center gap-1">👥 Gerenciar Grupos</button>)}
          {isAdmin && comp.status !== 'finished' && (<button onClick={() => { setShowEditSettings(!showEditSettings); setShowEditPrizes(false); }} className="bg-blue-800 hover:bg-blue-700 text-blue-200 text-xs font-bold py-2 px-3 rounded-lg border border-blue-600 shadow-md flex items-center gap-1">⚙️ Configurações</button>)}
          {isAdmin && comp.status !== 'finished' && (<button onClick={() => { if(window.confirm("Deseja encerrar oficialmente esta competição?")) { onEditComp({ ...comp, status: 'finished' }); showToast("Competição encerrada!", "success"); } }} className="bg-red-900/80 hover:bg-red-800 text-red-200 text-xs font-bold py-2 px-3 rounded-lg border border-red-700 shadow-md flex items-center gap-1">🛑 Encerrar Torneio</button>)}
          {isAdmin && (<button onClick={() => { setShowEditPrizes(!showEditPrizes); setShowEditSettings(false); }} className="bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold py-2 px-3 rounded-lg border border-amber-700 shadow-md flex items-center gap-1">🏆 Premiação</button>)}
         {isAdmin && comp.status !== 'finished' && (
            <>
              {showAddTeam ? (
                <div className="flex gap-2 w-full sm:w-auto animate-in fade-in">
                  <select value={newTeamToAdd} onChange={e=>setNewTeamToAdd(e.target.value)} className="bg-blue-950 border border-blue-700 rounded-lg p-2 text-xs text-white outline-none"><option value="">Escolher time...</option>{availableTeamsToAdd.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}</select>
                  <Button onClick={handleAddTeamToComp} className="py-1 px-3 text-xs">Salvar</Button><Button variant="outline" onClick={()=>{setShowAddTeam(false); setNewTeamToAdd('');}} className="py-1 px-2 text-xs font-bold text-blue-400">X</Button>
                </div>
              ) : (<Button variant="outline" onClick={()=>setShowAddTeam(true)} className="py-2 px-3 text-xs w-full sm:w-auto flex items-center justify-center gap-2"><span className="text-emerald-400 font-bold">+</span> Inserir Time</Button>)}
            </>
          )}
        </div>
      </div>

      {showEditSettings && (
        <div className="bg-blue-950/80 border border-blue-700 p-5 rounded-2xl space-y-4 animate-in slide-in-from-top-4">
          <h3 className="text-sm font-bold text-blue-300 uppercase tracking-wider flex items-center gap-2">⚙️ Configurações Gerais</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1"><label className="text-xs font-bold text-blue-400">Edição (Apenas Número)</label><input type="number" min="1" value={settingsData.edition} onChange={e => setSettingsData({...settingsData, edition: e.target.value})} className="w-full bg-blue-900 border border-blue-700 rounded-lg p-2.5 text-white text-sm outline-none focus:border-emerald-500" placeholder="Ex: 1, 2, 3..." /></div>
            <div className="space-y-1"><label className="text-xs font-bold text-blue-400">Categoria (Ranking)</label>
              <select value={settingsData.category} onChange={e => setSettingsData({...settingsData, category: e.target.value})} className="w-full bg-blue-900 border border-blue-700 rounded-lg p-2.5 text-white text-sm outline-none focus:border-emerald-500">
                <option value="liga_a">🥇 Liga Kame A (Série A)</option>
                <option value="liga_b">🥈 Liga Kame B (Série B)</option>
                <option value="liga_c">🥉 Liga Kame C (Série C)</option>
                <option value="liga_d">🎖️ Liga Kame D (Série D)</option>
                <option value="liga_acesso">⬆️ Liga de Acesso</option>
                <option value="copa_main">🏆 Copas Oficiais (Ex: Copa do Clã)</option>
                <option value="copa_do_rei">👑 Copa do Rei</option>
                <option value="copa_estrela"> ⭐ Copa das Estrelas</option>
                <option value="copa_amazonia">🌳 Copa da Amazônia</option>
                <option value="copa_flash">⚡ Copa Flash Solo</option>
                <option value="copa_flash_dupla">👥 Copa Flash Duplas</option>
              </select>
            </div>
            <div className="space-y-1"><label className="text-xs font-bold text-blue-400">Estilo de Jogo</label>
              <select value={settingsData.playStyle} onChange={e => setSettingsData({...settingsData, playStyle: e.target.value})} className="w-full bg-blue-900 border border-blue-700 rounded-lg p-2.5 text-white text-sm outline-none focus:border-emerald-500"><option value="Livre">Livre (Qualquer Estilo)</option><option value="Full Razz">Full Razz (Sem Balão)</option><option value="Personalizado">Regras Personalizadas</option></select>
            </div>
            <div className="space-y-1"><label className="text-xs font-bold text-blue-400">Vagas de Acesso</label><input type="number" min="0" value={settingsData.promotions} onChange={e => setSettingsData({...settingsData, promotions: parseInt(e.target.value) || 0})} className="w-full bg-blue-900 border border-blue-700 rounded-lg p-2.5 text-white text-sm outline-none focus:border-emerald-500" placeholder="Ex: 4" /></div>
            <div className="space-y-1"><label className="text-xs font-bold text-blue-400">Vagas de Rebaixamento</label><input type="number" min="0" value={settingsData.relegations} onChange={e => setSettingsData({...settingsData, relegations: parseInt(e.target.value) || 0})} className="w-full bg-blue-900 border border-blue-700 rounded-lg p-2.5 text-white text-sm outline-none focus:border-emerald-500" placeholder="Ex: 4" /></div>
            <div className="space-y-1 md:col-span-2"><label className="text-xs font-bold text-blue-400">Regras da Competição</label><textarea value={settingsData.rules} onChange={e => setSettingsData({...settingsData, rules: e.target.value})} placeholder="Descreva as regras..." className="w-full bg-blue-900 border border-blue-700 rounded-lg p-2.5 text-white text-sm outline-none focus:border-emerald-500 min-h-[80px] resize-y" /></div>
            <div className="space-y-1">
   <label className="text-xs font-bold text-emerald-400">⏰ Abertura das Inscrições (Opcional)</label>
   <input type="datetime-local" value={settingsData.registrationStartTime} onChange={e => setSettingsData({...settingsData, registrationStartTime: e.target.value})} className="w-full bg-blue-900 border border-emerald-500/50 rounded-lg p-2.5 text-white text-sm outline-none focus:border-emerald-500" />
</div>
            {isLeader && (
              <div className="space-y-2 md:col-span-2 pt-2 border-t border-blue-800">
                <label className="text-xs font-bold text-emerald-400">Adicionar Organizadores</label>
                <div className="flex flex-wrap gap-2">{users.filter(u => u.role === 'organizer').map(u => ( <label key={u.id} className="flex items-center gap-2 text-xs text-blue-200 bg-blue-950 px-3 py-2 rounded-lg border border-blue-800 cursor-pointer hover:border-emerald-500/50"><input type="checkbox" checked={settingsData.admins.includes(u.id)} onChange={e => { const newAdmins = e.target.checked ? [...settingsData.admins, u.id] : settingsData.admins.filter(id => id !== u.id); setSettingsData({...settingsData, admins: newAdmins}); }} className="accent-emerald-500 w-3 h-3" /> {u.name}</label> ))}</div>
              </div>
            )}

            {isLeader && (
              <div className="space-y-2 md:col-span-2 pt-2 border-t border-blue-800">
                <label className="text-xs font-bold text-red-400 flex items-center gap-1.5">
                  <XCircle size={14}/> Bloquear inscritos dos torneios:
                </label>
                <div className="flex flex-wrap gap-2">
                  {competitions.filter(c => c.status === 'active' && c.id !== comp.id).map(c => (
                    <label key={c.id} className="flex items-center gap-1.5 text-xs text-blue-200 bg-blue-950 px-3 py-2 rounded-lg border border-blue-800 cursor-pointer hover:border-red-500/50 transition-colors">
                      <input 
                        type="checkbox" 
                        checked={settingsData.excludedCompIds.includes(c.id)} 
                        onChange={e => { 
                          const newEx = e.target.checked 
                            ? [...settingsData.excludedCompIds, c.id] 
                            : settingsData.excludedCompIds.filter(id => id !== c.id); 
                          setSettingsData({...settingsData, excludedCompIds: newEx}); 
                        }} 
                        className="accent-red-500 w-3 h-3" 
                      /> {c.name}
                    </label> 
                  ))}
                </div>
              </div>
            )}
            
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button onClick={() => setShowEditSettings(false)} className="px-4 py-2 bg-blue-900 border border-blue-700 rounded-lg text-xs text-blue-300 hover:text-white">Cancelar</button>
            <button onClick={() => { 
              const CAT_NAMES = { liga_a: 'Liga Kame A', liga_b: 'Liga Kame B', liga_c: 'Liga Kame C', liga_d: 'Liga Kame D', liga_acesso: 'Liga de Acesso', copa_main: 'Copa Oficial', copa_flash: 'Copa Flash Solo', copa_flash_dupla: 'Copa Flash Duplas', copa_do_rei: 'Copa do Rei', copa_estrelas: 'Copa das Estrelas', copa_amazonia: 'Copa da Amazônia' }; 
              const cleanCatName = CAT_NAMES[settingsData.category] || 'Competição'; 
              
             onEditComp({ 
                ...comp, 
                name: settingsData.edition ? `${cleanCatName} - Edição ${settingsData.edition}` : comp.name, 
                category: settingsData.category, 
                playStyle: settingsData.playStyle, 
                rules: settingsData.rules, 
                promotions: settingsData.promotions, 
                relegations: settingsData.relegations, 
                admins: settingsData.admins,
                excludedCompIds: settingsData.excludedCompIds,
                registrationStartTime: settingsData.registrationStartTime
              });
              setShowEditSettings(false); 
              showToast("Configurações atualizadas!", "success"); 
            }} className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg text-xs shadow-md">Salvar</button>
          </div>
        </div>
      )}

      {showEditGroups && (
        <div className="bg-purple-900/30 border border-purple-500/50 p-5 rounded-2xl space-y-4 animate-in slide-in-from-top-4 shadow-xl mb-6">
          <h3 className="text-sm font-black text-purple-400 uppercase tracking-wider flex items-center gap-2">
            <Users size={16}/> Gerenciar Divisão de Grupos
          </h3>
          <p className="text-xs text-blue-300">Escolha a qual grupo cada time pertence. Isso vai reorganizar a tabela de classificação.</p>
          
          <div className="flex flex-col sm:flex-row gap-2 mt-4 pb-4 border-b border-purple-800/50">
             <input type="text" value={newGroupName} onChange={e => setNewGroupName(e.target.value)} placeholder="Letra/Nome de um Novo Grupo (Opcional)" className="flex-1 bg-blue-950 border border-purple-700/50 rounded-lg p-2 text-white text-xs outline-none focus:border-purple-400 uppercase" />
             <button onClick={() => {
                if(!newGroupName) return;
                const gn = newGroupName.trim().toUpperCase();
                if(Object.values(teamGroupMapping).includes(gn)) { showToast("Esse grupo já existe!", "warning"); return; }
                const currentUnassigned = Object.keys(teamGroupMapping).find(k => !teamGroupMapping[k]);
                if (currentUnassigned) setTeamGroupMapping({...teamGroupMapping, [currentUnassigned]: gn});
                setNewGroupName('');
                showToast(`Grupo ${gn} disponibilizado para marcação!`, "success");
             }} className="bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold py-2 px-4 rounded-lg shadow-md shrink-0">Criar Nova Coluna de Grupo</button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 mt-4 max-h-[400px] overflow-y-auto custom-scrollbar pr-2">
            {compTeams.map(t => {
              const currentGroup = teamGroupMapping[t.id] || 'A';
              const uniqueGroups = Array.from(new Set(Object.values(teamGroupMapping)));
              if (!uniqueGroups.includes('A')) uniqueGroups.push('A');
              
              return (
                <div key={t.id} className="bg-blue-950 p-3 rounded-xl border border-blue-800 flex flex-col gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <ShieldDisplay shield={t.shield} size="small" />
                    <span className="font-bold text-xs text-blue-100 truncate">{t.name}</span>
                  </div>
                  <select 
                    value={currentGroup} 
                    onChange={e => setTeamGroupMapping({...teamGroupMapping, [t.id]: e.target.value})}
                    className="w-full bg-blue-900 border border-purple-500/30 rounded p-1.5 text-purple-300 text-xs font-bold outline-none cursor-pointer"
                  >
                    {uniqueGroups.sort((a,b)=>a.localeCompare(b)).map(g => (
                      <option key={g} value={g}>Grupo {g}</option>
                    ))}
                  </select>
                </div>
              );
            })}
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-purple-800/50 mt-4">
            <button onClick={() => setShowEditGroups(false)} className="px-4 py-2 bg-blue-950 border border-purple-700/50 rounded-lg text-xs text-purple-300 hover:text-white transition-colors">Cancelar</button>
            <button onClick={handleSaveGroups} className="px-5 py-2 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-lg text-xs shadow-md transition-colors">💾 Salvar Divisão</button>
          </div>
        </div>
      )}
              
      {showEditPrizes && (
        <div className="bg-amber-500/10 border border-amber-500/30 p-5 rounded-2xl space-y-4 animate-in slide-in-from-top-4">
          <h3 className="text-sm font-bold text-amber-400 uppercase tracking-wider flex items-center gap-2">💰 Atualizar Prêmios</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4"><div className="space-y-1"><label className="text-xs font-bold text-blue-300">🥇 1º Lugar</label><input type="text" value={prizeData.first} onChange={e => setPrizeData({...prizeData, first: e.target.value})} className="w-full bg-blue-950 border border-blue-700 rounded-lg p-2 text-white text-sm" /></div><div className="space-y-1"><label className="text-xs font-bold text-blue-300">🥈 2º Lugar</label><input type="text" value={prizeData.second} onChange={e => setPrizeData({...prizeData, second: e.target.value})} className="w-full bg-blue-950 border border-blue-700 rounded-lg p-2 text-white text-sm" /></div><div className="space-y-1"><label className="text-xs font-bold text-blue-300">🥉 3º Lugar</label><input type="text" value={prizeData.third} onChange={e => setPrizeData({...prizeData, third: e.target.value})} className="w-full bg-blue-950 border border-blue-700 rounded-lg p-2 text-white text-sm" /></div></div>
          <div className="space-y-1"><label className="text-xs font-bold text-amber-400">🎟️ Sorteios / Extras</label><input type="text" value={prizeData.extra} onChange={e => setPrizeData({...prizeData, extra: e.target.value})} className="w-full bg-blue-950 border border-blue-700 rounded-lg p-2 text-white text-sm" /></div>
          <div className="flex justify-end gap-2"><button onClick={() => setShowEditPrizes(false)} className="px-3 py-1.5 bg-blue-950 border border-blue-700 rounded-lg text-xs text-blue-400">Cancelar</button><button onClick={handleSavePrizes} className="px-4 py-1.5 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-lg text-xs">Salvar</button></div>
        </div>
      )}

      {championTeams && championTeams.length > 0 && (
        <div className="bg-gradient-to-r from-amber-500 via-yellow-600 to-amber-700 p-6 rounded-3xl border border-amber-400 shadow-[0_0_30px_rgba(245,158,11,0.4)] text-blue-950 flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden">
          <div className="absolute -inset-10 bg-white/10 blur-2xl rounded-full transform -rotate-45 animate-pulse"></div>
          
          {championTeams.length === 1 ? (
             <div className="flex items-center gap-5 relative z-10"><div className="bg-blue-950/20 p-2.5 rounded-full shadow-inner transform hover:rotate-12"><ShieldDisplay shield={championTeams[0].shield} size="large" /></div><div><span className="text-[10px] bg-blue-950 text-amber-400 px-2.5 py-0.5 rounded-full uppercase font-black">🏆 GRANDE CAMPEÃO 🏆</span><h3 className="text-2xl font-black text-white mt-1.5 uppercase tracking-wide">{championTeams[0].name}</h3><p className="text-xs font-bold text-blue-950 uppercase mt-0.5 tracking-wider">Técnico Glorioso: <span className="text-white">{championTeams[0].coach}</span></p></div></div>
          ) : (
             <div className="flex items-center gap-5 relative z-10 w-full md:w-auto justify-center">
                 <div className="flex flex-col items-center gap-2">
                    <ShieldDisplay shield={championTeams[0]?.shield} size="large" />
                    <span className="font-black text-white text-sm uppercase">{championTeams[0]?.name}</span>
                 </div>
                 <div className="text-center mx-2 mt-4 md:mt-0">
                    <span className="text-[10px] bg-blue-950 text-amber-400 px-2.5 py-0.5 rounded-full uppercase font-black tracking-widest block mb-2 shadow-lg">🏆 DUPLA CAMPEÃ 🏆</span>
                    <span className="text-3xl font-black text-blue-950 drop-shadow-md">&</span>
                 </div>
                 <div className="flex flex-col items-center gap-2">
                    <ShieldDisplay shield={championTeams[1]?.shield} size="large" />
                    <span className="font-black text-white text-sm uppercase">{championTeams[1]?.name}</span>
                 </div>
             </div>
          )}

          <div className="flex items-center gap-3 bg-blue-950/20 px-5 py-3 rounded-2xl relative z-10 w-full md:w-auto mt-4 md:mt-0"><Trophy className="text-white animate-bounce" size={44} style={{ animationDuration: '3s' }} /><div className="text-left"><p className="text-[9px] uppercase font-black tracking-widest text-blue-950">Troféu de Elite</p><p className="text-sm font-black text-white leading-tight uppercase max-w-[180px] truncate">{comp.name}</p></div></div>
        </div>
      )}

      {isRegistration ? (
        <div className="bg-blue-900 border border-blue-800 rounded-3xl p-6 md:p-8 shadow-2xl animate-in slide-in-from-bottom-4">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-black text-emerald-400 uppercase tracking-widest drop-shadow-md mb-2">Inscrições Abertas</h2>
            <p className="text-blue-300">Aguardando os times se cadastrarem pelo link ou via inserção manual.</p>
            <div className="mt-6 flex flex-col items-center justify-center gap-4">
               <div className="bg-blue-950 px-8 py-4 rounded-2xl border border-blue-800 shadow-inner"><p className="text-xs text-blue-400 uppercase font-bold mb-1">Vagas Preenchidas</p><p className="text-4xl font-black text-white">{(comp.teams?.length || 0)} <span className="text-blue-600 text-2xl">/ {comp.teamCount}</span></p></div>
               <Button onClick={handleCopyLink} className="py-3 px-8 text-sm font-bold bg-blue-600 shadow-xl">🔗 Copiar Link de Inscrição</Button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div>
              <h3 className="text-sm font-bold text-amber-400 uppercase mb-4 flex items-center gap-2"><CheckSquare size={16}/> Solicitações Pendentes</h3>
              <div className="space-y-3">
                {(!comp.pendingTeams || comp.pendingTeams.length === 0) && <p className="text-xs text-blue-500 p-4 bg-blue-950 rounded-xl border border-blue-800 border-dashed text-center">Nenhum time na fila.</p>}
                {(comp.pendingTeams || []).map((req, idx) => {
                  const t = getTeam(req.teamId);
                  return (
                    <div key={idx} className="bg-blue-950 p-4 rounded-xl border border-amber-500/30 flex flex-col gap-3">
                      <div className="flex items-center gap-3"><ShieldDisplay shield={t?.shield} size="small" /><div><p className="font-bold text-white text-sm">{t?.name}</p><p className="text-[10px] text-blue-400">Técnico: {t?.coach}</p></div></div>
                      <div className="flex gap-2"><Button variant="outline" onClick={()=>handleRejectTeam(req)} className="flex-1 py-2 text-xs text-red-400">Recusar</Button><Button onClick={()=>handleApproveTeam(req)} className="flex-1 py-2 text-xs bg-emerald-600">Aprovar</Button></div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div>
              <h3 className="text-sm font-bold text-emerald-400 uppercase mb-4 flex items-center gap-2"><CheckCircle size={16}/> Times Confirmados</h3>
              <div className="grid grid-cols-2 gap-2">
                {(!comp.teams || comp.teams.length === 0) && <p className="text-xs text-blue-500 p-4 bg-blue-950 rounded-xl border border-blue-800 border-dashed text-center col-span-2">Nenhum time aprovado ainda.</p>}
                {(comp.teams || []).map(tId => {
                  const t = getTeam(tId);
                  return (<div key={tId} className="bg-blue-950 p-3 rounded-xl border border-emerald-500/20 flex items-center justify-between gap-2 group cursor-pointer" onClick={() => setSelectedTeamHistory(tId)}>
                      <div className="flex items-center gap-2 min-w-0">
                        <ShieldDisplay shield={t?.shield} size="small" />
                        <span className="font-bold text-xs text-blue-100 truncate hover:text-emerald-400 transition-colors">{t?.name}</span>
                      </div>
                      {isAdmin && (
                        <button onClick={(e) => { e.stopPropagation(); handleRemoveConfirmedTeam(tId); }} className="text-blue-500 hover:text-red-400 p-1 md:opacity-0 group-hover:opacity-100 transition-opacity" title="Remover Time">
                          <X size={14} />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="mt-8 pt-8 border-t border-blue-800">
             <Button onClick={handleGenerateBracket} disabled={comp.teams?.length !== comp.teamCount} className="w-full py-5 text-xl font-black rounded-2xl bg-emerald-500 text-blue-950 hover:bg-emerald-400 disabled:bg-blue-900 disabled:text-blue-700 shadow-2xl">🏆 Encerrar Inscrições e Gerar Tabela</Button>
          </div>
        </div>
      ) : (
        <>
          <div className="flex gap-1 p-1 bg-blue-950 rounded-xl border border-blue-800 overflow-x-auto custom-scrollbar">
            <button onClick={()=>setSubTab('overview')} className={`shrink-0 flex-1 px-4 py-1.5 text-xs rounded-lg font-bold transition-all ${subTab==='overview'?'bg-emerald-600 text-white':'text-blue-500 hover:text-white'}`}>Tabela & Jogos</button>
            <button onClick={()=>setSubTab('stats')} className={`shrink-0 flex-1 px-4 py-1.5 text-xs rounded-lg font-bold transition-all ${subTab==='stats'?'bg-emerald-600 text-white':'text-blue-500 hover:text-white'}`}>Estatísticas</button>
            {isAdmin && (
              <>
                <button onClick={()=>setSubTab('submit')} className={`shrink-0 flex-1 px-4 py-1.5 text-xs rounded-lg font-bold transition-all ${subTab==='submit'?'bg-emerald-600 text-white':'text-blue-500 hover:text-white'}`}>Registrar</button>
                <button onClick={()=>setSubTab('validation')} className={`shrink-0 flex-1 px-4 py-1.5 text-xs rounded-lg font-bold transition-all flex justify-center items-center gap-1 ${subTab==='validation'?'bg-amber-600 text-white':'text-amber-500/70 hover:text-amber-400'}`}>
                  Validação {matches.filter(m => m.compId === comp.id && m.status === 'pending').length > 0 && <span className="bg-red-500 text-white px-1.5 py-0.5 rounded-full text-[9px] shadow-sm">{matches.filter(m => m.compId === comp.id && m.status === 'pending').length}</span>}
                </button>
                <button onClick={()=>setSubTab('draw')} className={`shrink-0 flex-1 px-4 py-1.5 text-xs rounded-lg font-bold transition-all flex justify-center items-center gap-1 ${subTab==='draw'?'bg-purple-600 text-white':'text-purple-400 hover:text-purple-300'}`}>🎁 Sorteio</button>
              </>
            )}
          </div>
          
          <div className="space-y-8 mt-4">
            {subTab === 'overview' && (
              <div className="space-y-6 animate-in slide-in-from-left-4">
                
                {comp.rules && (
                  <div className="bg-blue-950/80 p-5 rounded-2xl border border-blue-800 shadow-inner">
                    <h4 className="text-sm font-bold text-sky-400 mb-2 flex items-center gap-2"><BookOpen size={16}/> Regras do Torneio</h4>
                    <p className="text-xs text-blue-200 whitespace-pre-wrap leading-relaxed">{comp.rules}</p>
                  </div>
                )}

                {/* 🌟 NOVO: PAINEL DE DESISTÊNCIA E REMOÇÃO (ADMIN) */}
                {isAdmin && comp.status === 'active' && (
                  <div className="bg-red-950/40 p-5 rounded-xl border border-red-800 shadow-inner mb-6 animate-in slide-in-from-top-2">
                    <h4 className="text-sm font-bold text-red-400 mb-2 flex items-center gap-2">
                      <Trash2 size={16}/> Gerenciar Saída de Equipe
                    </h4>
                    <div className="text-[10px] text-red-200 mb-4 space-y-1">
                       <p><b>⚠️ Banimento (W.O):</b> Mantém o time na tabela. Dá vitória de 3x0 para os adversários restantes e suspende para a próxima edição.</p>
                       <p><b>❌ Remover da Competição:</b> Apaga o time da tabela de classificação como se ele nunca tivesse entrado.</p>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-2">
                       <select value={withdrawTeamId} onChange={e=>setWithdrawTeamId(e.target.value)} className="flex-1 bg-blue-900 border border-red-500/50 rounded-lg p-2 text-white text-xs outline-none focus:border-red-400">
                         <option value="">Selecione a equipe...</option>
                         {compTeams.map(t => (
                           <option key={t.id} value={t.id}>{t.name}</option>
                         ))}
                       </select>
                       <button onClick={handleWithdrawTeam} className="bg-red-600 hover:bg-red-500 text-white font-bold text-xs py-2 px-3 rounded-lg shadow-lg transition-colors shrink-0">
                         Aplicar Banimento (W.O)
                       </button>
                       <button onClick={handleRemoveTeamEntirely} className="bg-blue-950 hover:bg-blue-900 border border-red-800 text-red-400 hover:text-red-300 font-bold text-xs py-2 px-3 rounded-lg shadow-lg transition-colors shrink-0">
                         Remover da Tabela
                       </button>
                    </div>
                    {(comp.suspendedTeams || []).length > 0 && (
                       <div className="mt-4 pt-3 border-t border-red-800/50">
                         <span className="text-[10px] text-red-400 font-bold uppercase tracking-widest block mb-2">Equipes Banidas Deste Torneio:</span>
                         <div className="flex flex-wrap gap-2">
                           {comp.suspendedTeams.map(id => {
                              const t = getTeam(id);
                              return <span key={id} className="bg-red-500/10 text-red-300 border border-red-500/30 px-2 py-1 rounded text-[10px] flex items-center gap-1"><Lock size={10}/> {t?.name || 'Desconhecido'}</span>
                           })}
                         </div>
                       </div>
                    )}
                  </div>
                )}
                
                {comp.format !== 'league' && (
                  <div className="flex justify-center"><div className="bg-blue-950 p-1 rounded-xl border border-blue-800 flex gap-1">
                    <button type="button" onClick={() => setViewType('bracket')} className={`px-4 py-1.5 text-xs rounded-lg font-bold transition-colors ${viewType === 'bracket' ? 'bg-amber-600 text-white' : 'text-blue-400 hover:text-white'}`}>🏆 Chaveamento Mata-Mata</button>
                    <button type="button" onClick={() => setViewType('table')} className={`px-4 py-1.5 text-xs rounded-lg font-bold transition-colors ${viewType === 'table' ? 'bg-amber-600 text-white' : 'text-blue-400 hover:text-white'}`}>{comp.format === 'groups' ? '📋 Classificação dos Grupos' : '📋 Tabela Geral Tradicional'}</button>
                  </div></div>
                )}

                {/* ⏱️ MURAL DA COPA FLASH */}
                {isFlash && activeRound && (
                  <div className="bg-gradient-to-r from-amber-900/40 to-blue-900/40 border border-amber-500/50 p-5 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-4 shadow-xl relative overflow-hidden animate-in slide-in-from-top-4">
                     <div className="absolute top-0 left-0 w-1.5 h-full bg-amber-500 animate-pulse"></div>
                     <div>
                        <h4 className="text-amber-400 font-black uppercase tracking-widest flex items-center gap-2"><Activity size={18}/> MODO COPA FLASH ⚡</h4>
                        <p className="text-xs text-amber-100/70 mt-1">Fase Atual: <b>{activeRound.number}</b> • Todos os jogos devem ser enviados antes do tempo esgotar!</p>
                     </div>
                     <div className="flex flex-col items-center md:items-end gap-2 shrink-0">
                        <div className="bg-blue-950 px-4 py-2 rounded-xl border border-blue-800 shadow-inner">
                           <span className="text-[10px] uppercase font-bold text-blue-400 block mb-1 text-center md:text-right">Tempo Restante</span>
                           <span className={`text-3xl font-mono font-black tracking-wider ${isExpired ? 'text-red-500 animate-pulse' : 'text-emerald-400'}`}>
                             {formatTime(timeLeft)}
                           </span>
                        </div>
                        {isAdmin && (
                           <button onClick={() => handleAutoFlashRound(activeRound)} className={`px-4 py-2 rounded-lg font-black text-[10px] uppercase tracking-wider transition-all shadow-lg ${isExpired ? 'bg-amber-600 hover:bg-amber-500 text-white animate-bounce' : 'bg-blue-800 hover:bg-amber-600 text-blue-300 hover:text-white border border-blue-700 hover:border-amber-500'}`}>
                              ⚡ Encerrar Fase Automático
                           </button>
                        )}
                     </div>
                  </div>
                )}

                {viewType === 'table' && (
                  <div className="space-y-6 animate-in fade-in">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-2 mb-2 pl-2">
                      <h3 className="text-lg font-bold text-white">Classificação da Competição</h3>
                      <Button onClick={() => captureSection('capture-standings', `Tabela-${comp.name}`)} className="text-[10px] py-1.5 px-3 shadow-lg" variant="outline"><Camera size={14}/> Salvar Tabela</Button>
                    </div>
                    <div id="capture-standings" className="bg-blue-950 p-6 sm:p-8 rounded-3xl border border-blue-800 shadow-2xl">
                      <div className="flex items-center gap-4 mb-6"><img src={LOGO_URL} alt="Logo" className="w-16 h-16 object-contain" /><h2 className="text-xl sm:text-2xl font-black text-white uppercase tracking-wider">TABELA - {comp.name}</h2></div>
                      <Standings matches={matches} teams={compTeams} comp={comp} onTeamClick={(teamId) => setSelectedTeamHistory(teamId)} />
                    </div>

                    {(groupOrNormalRounds.length > 0 || (isAdmin && comp.format === 'league')) && (
                      <div className="space-y-3 pt-4 border-t border-blue-800/50">
                        {isAdmin && comp.format === 'league' && (<Button onClick={handleAddNewRound} className="w-full mt-4 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg border border-emerald-500">➕ Adicionar Nova Rodada / Partida Extra</Button>)}
                        {groupOrNormalRounds.length > 0 && (<Button onClick={() => setShowCalendar(!showCalendar)} className="w-full mt-2 py-4 bg-blue-900 border border-blue-700 hover:bg-blue-800 text-white rounded-2xl font-bold flex items-center justify-center gap-2 transition-all shadow-md">{showCalendar ? 'Esconder Calendário' : '📅 Ver Calendário de Partidas'}</Button>)}

                        {showCalendar && (
                          <div className="mt-6 space-y-4 animate-in slide-in-from-top-4">
                            <h3 className="text-base font-bold text-blue-300 mb-2 pl-2">Calendário de Rodadas</h3>
                            {groupOrNormalRounds.map((round) => {
                              const isExpanded = expandedRoundId === round.id; const isLocked = round.status === 'locked'; 
                              return (
                                <div key={round.id} className={`bg-blue-900 border rounded-xl overflow-hidden ${isLocked ? 'border-blue-800/50' : 'border-emerald-500/30 shadow-[0_0_10px_rgba(16,185,129,0.05)]'}`}>
                                  <div className="w-full bg-blue-950/60 flex items-center justify-between pr-4">
                                    <button type="button" onClick={() => toggleRound(round.id)} className="flex-1 p-4 flex justify-between items-center outline-none">
                                      <span className={`text-sm font-bold flex items-center gap-2 ${isLocked ? 'text-blue-400' : 'text-emerald-400'}`}>{isLocked ? <Lock size={16} className="text-amber-500"/> : <PlayCircle size={16} className="text-emerald-500"/>} Rodada {round.number}</span>
                                      <span className="text-blue-500 text-xs font-bold mr-2">{isExpanded ? '▲ Recolher' : '▼ Expandir'}</span>
                                    </button>
                                    <div className="flex items-center gap-1.5">
                                      {isAdmin && isLocked && (<button type="button" onClick={(e) => { e.stopPropagation(); onReleaseRound(comp.id, round.id); }} className="bg-emerald-600 hover:bg-emerald-500 text-blue-950 font-black text-[10px] px-3 py-1.5 rounded uppercase tracking-wider transition-colors shrink-0 shadow-md">🔓 Liberar</button>)}
                                      {isAdmin && !isLocked && (<button type="button" onClick={(e) => { e.stopPropagation(); onLockRound(comp.id, round.id); }} className="bg-amber-600 hover:bg-amber-500 text-blue-950 font-black text-[10px] px-3 py-1.5 rounded uppercase tracking-wider transition-colors shrink-0 shadow-md">🔒 Travar</button>)}
                                      {isAdmin && (<button type="button" onClick={(e) => { e.stopPropagation(); handleDeleteRound(round.id); }} className="bg-red-500/20 hover:bg-red-500 text-red-400 hover:text-white p-1.5 rounded transition-colors shrink-0 shadow-md" title="Excluir Rodada"><Trash2 size={14}/></button>)}
                                    </div>
                                  </div>
                                  {isExpanded && (
                                    <div className="p-4 bg-blue-950/40 border-t border-blue-800">
                                      {comp.format === 'groups' ? (
                                         <div className="space-y-6">
                                           {(() => {
                                             const roundGroupsSet = new Set(); if (comp.groups) Object.keys(comp.groups).forEach(g => roundGroupsSet.add(g.toUpperCase()));
                                             round.matches.forEach(m => { if (m.group) roundGroupsSet.add(m.group.toUpperCase()); });
                                             const sortedGroups = Array.from(roundGroupsSet).sort((a, b) => a.localeCompare(b));
                                             return (
                                               <>
                                                 {sortedGroups.map(groupLetter => {
                                                   const matchesInGroup = round.matches.filter(m => { if (m.group) { return m.group.toUpperCase() === groupLetter; } const groupTeamIds = comp.groups && comp.groups[groupLetter] ? comp.groups[groupLetter] : []; return groupTeamIds.includes(m.teamA) || groupTeamIds.includes(m.teamB); });
                                                   return (
                                                     <div key={groupLetter} className="space-y-3">
                                                       <div className="bg-blue-900/50 py-1 px-3 rounded-lg border border-blue-800/50 flex items-center justify-between gap-3"><span className="text-xs font-bold text-amber-400 uppercase tracking-wider">Confrontos Grupo {groupLetter}</span>{isAdmin && !isLocked && (<button type="button" onClick={() => handleAddMatchToGroup(round.id, groupLetter)} className="text-[9px] bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-2 py-0.5 rounded shadow transition-colors shrink-0">+ Novo Jogo</button>)}</div>
                                                       {matchesInGroup.length === 0 ? (<p className="text-[10px] text-blue-400/70 italic px-2">Sem jogos.</p>) : (
                                                         <div className="grid grid-cols-1 gap-3">
                                                           {matchesInGroup.map(m => {
                                                             const tA = getTeam(m.teamA); const tB = getTeam(m.teamB); const sUI = getMatchStatusDisplay(m.id);
                                                             return (
                                                               <div key={m.id} className="relative group">
                                                                 <div onClick={()=>{if(!isLocked && sUI.isPlayed && onSelectMatch){const f = matches.find(x=>x.id===sUI.submittedMatchId); if(f) onSelectMatch(f)}}} className={`bg-blue-900/80 p-4 rounded-xl border flex items-center justify-between transition-colors shadow-sm ${isLocked ? 'border-blue-900/60 opacity-50 grayscale-[50%]' : 'border-blue-800 cursor-pointer hover:border-blue-700'}`}>
                                                                   <div className="flex flex-col items-center text-center w-1/3 min-w-0 cursor-pointer hover:text-emerald-400 transition-colors" onClick={(e) => { e.stopPropagation(); setSelectedTeamHistory(m.teamA); }}><ShieldDisplay shield={tA?.shield} size="normal" /><span className="font-bold text-blue-200 text-xs mt-2 truncate w-full px-1 hover:text-emerald-400">{tA?.name || m.placeholderA}</span></div>
                                                                   <div className="flex flex-col items-center justify-center w-1/3 shrink-0"><span className={`text-[9px] uppercase tracking-widest font-black px-2 py-0.5 rounded-md mb-2 text-center ${sUI.bg} ${sUI.color}`}>{isLocked ? '🔒 Bloqueado' : sUI.text}</span><div className="flex items-center justify-center gap-2">{sUI.isPlayed ? (<>{sUI.penaltiesA !== null && sUI.penaltiesA !== undefined && <span className="text-[10px] text-amber-400 font-bold mb-3 mr-0.5">({sUI.penaltiesA})</span>}<span className={`text-2xl font-black ${sUI.color}`}>{sUI.scoreA}</span><span className="text-blue-700 font-bold text-xl">:</span><span className={`text-2xl font-black ${sUI.color}`}>{sUI.scoreB}</span>{sUI.penaltiesB !== null && sUI.penaltiesB !== undefined && <span className="text-[10px] text-amber-400 font-bold mb-3 ml-0.5">({sUI.penaltiesB})</span>}</>) : (<span className="text-blue-700 font-bold text-xl">:</span>)}</div></div>
                                                                   <div className="flex flex-col items-center text-center w-1/3 min-w-0 cursor-pointer hover:text-emerald-400 transition-colors" onClick={(e) => { e.stopPropagation(); setSelectedTeamHistory(m.teamB); }}><ShieldDisplay shield={tB?.shield} size="normal" /><span className="font-bold text-blue-200 text-xs mt-2 truncate w-full px-1 hover:text-emerald-400">{tB?.name || m.placeholderB}</span></div>
                                                                 </div>
                                                                 {isAdmin && (<button type="button" onClick={(e) => { e.stopPropagation(); handleOpenEditModal(m, round.id); }} className="absolute -right-1 -top-1 text-blue-400 hover:text-emerald-400 p-1 bg-blue-950 rounded border border-blue-800 md:opacity-0 md:group-hover:opacity-100 transition-opacity shadow-lg z-10"><Edit size={12} /></button>)}
                                                               </div>
                                                             );
                                                           })}
                                                         </div>
                                                       )}
                                                     </div>
                                                   );
                                                 })}
                                                 {isAdmin && !isLocked && (<div className="mt-4 pt-4 border-t border-blue-800/50"><button type="button" onClick={() => handleAddNewGroup(round.id)} className="text-[10px] bg-blue-800 hover:bg-blue-700 text-blue-300 font-bold px-3 py-2 rounded shadow transition-colors w-full border border-blue-700 border-dashed">+ Criar Novo Grupo na Rodada</button></div>)}
                                               </>
                                             );
                                           })()}
                                         </div>
                                      ) : (
                                         <div>
                                           {isAdmin && !isLocked && (<div className="mb-3"><button type="button" onClick={() => handleAddMatchToGroup(round.id, null)} className="text-[10px] bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-3 py-1.5 rounded shadow transition-colors">+ Adicionar Nova Partida na Rodada</button></div>)}
                                           <div className="grid grid-cols-1 gap-3">
                                             {round.matches.map(m => {
                                               const tA = getTeam(m.teamA); const tB = getTeam(m.teamB); const sUI = getMatchStatusDisplay(m.id);
                                               return (
                                                 <div key={m.id} className="relative group">
                                                   <div onClick={()=>{if(!isLocked && sUI.isPlayed && onSelectMatch){const f = matches.find(x=>x.id===sUI.submittedMatchId); if(f) onSelectMatch(f)}}} className={`bg-blue-900/80 p-4 rounded-xl border flex items-center justify-between transition-colors shadow-sm ${isLocked ? 'border-blue-900/60 opacity-50 grayscale-[50%]' : 'border-blue-800 cursor-pointer hover:border-blue-700'}`}>
                                                     <div className="flex flex-col items-center text-center w-1/3 min-w-0 cursor-pointer hover:text-emerald-400 transition-colors" onClick={(e) => { e.stopPropagation(); setSelectedTeamHistory(m.teamA); }}><ShieldDisplay shield={tA?.shield} size="normal" /><span className="font-bold text-blue-200 text-xs mt-2 truncate w-full px-1 hover:text-emerald-400">{tA?.name || m.placeholderA}</span></div>
                                                     <div className="flex flex-col items-center justify-center w-1/3 shrink-0"><span className={`text-[9px] uppercase tracking-widest font-black px-2 py-0.5 rounded-md mb-2 text-center ${sUI.bg} ${sUI.color}`}>{isLocked ? '🔒 Bloqueado' : sUI.text}</span><div className="flex items-center justify-center gap-2">{sUI.isPlayed ? (<>{sUI.penaltiesA !== null && sUI.penaltiesA !== undefined && <span className="text-[10px] text-amber-400 font-bold mb-3 mr-0.5">({sUI.penaltiesA})</span>}<span className={`text-2xl font-black ${sUI.color}`}>{sUI.scoreA}</span><span className="text-blue-700 font-bold text-xl">:</span><span className={`text-2xl font-black ${sUI.color}`}>{sUI.scoreB}</span>{sUI.penaltiesB !== null && sUI.penaltiesB !== undefined && <span className="text-[10px] text-amber-400 font-bold mb-3 ml-0.5">({sUI.penaltiesB})</span>}</>) : (<span className="text-blue-700 font-bold text-xl">:</span>)}</div></div>
                                                     <div className="flex flex-col items-center text-center w-1/3 min-w-0 cursor-pointer hover:text-emerald-400 transition-colors" onClick={(e) => { e.stopPropagation(); setSelectedTeamHistory(m.teamB); }}><ShieldDisplay shield={tB?.shield} size="normal" /><span className="font-bold text-blue-200 text-xs mt-2 truncate w-full px-1 hover:text-emerald-400">{tB?.name || m.placeholderB}</span></div>
                                                   </div>
                                                   {isAdmin && (<button type="button" onClick={(e) => { e.stopPropagation(); handleOpenEditModal(m, round.id); }} className="absolute -right-1 -top-1 text-blue-400 hover:text-emerald-400 p-1 bg-blue-950 rounded border border-blue-800 md:opacity-0 md:group-hover:opacity-100 transition-opacity shadow-lg z-10"><Edit size={12} /></button>)}
                                                 </div>
                                               );
                                             })}
                                           </div>
                                         </div>
                                      )}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {viewType === 'bracket' && (
                  <div className="space-y-4 animate-in fade-in">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-2 pl-2">
                      <h3 className="text-lg font-bold text-white">Chaves do Mata-Mata</h3>
                      <div className="flex gap-2 w-full sm:w-auto">
                        {isAdmin && comp.format === 'groups' && (<Button onClick={handleAutoMigrateKnockout} className="text-[10px] py-1.5 px-3 bg-emerald-600 border-0 shadow-md">🔄 Puxar Classificados para Mata-Mata</Button>)}
                        <Button onClick={() => captureSection('capture-bracket-tree', `Chaveamento-${comp.name}`)} className="text-[10px] py-1.5 px-3 shadow-lg" variant="outline"><Camera size={14}/> Salvar Print das Chaves</Button>
                      </div>
                    </div>

                    <div id="capture-bracket-tree" className="bg-blue-950 p-6 md:p-8 rounded-3xl border border-blue-800 shadow-2xl overflow-x-auto custom-scrollbar">
                      <div className="flex items-center gap-3 mb-6 shrink-0"><img src={LOGO_URL} alt="Logo" className="w-12 h-12" /><h4 className="font-black text-white text-xl uppercase tracking-wider">CHAVEAMENTO OFICIAL — {comp.name}</h4></div>
                      {knockoutRounds.length === 0 ? (
                        <p className="text-center p-8 text-blue-500 text-sm">O chaveamento do Mata-Mata estará disponível assim que a fase classificatória terminar.</p>
                      ) : (
                        <div className="flex gap-12 items-stretch pb-8 min-w-max px-6 pt-4">
                          {knockoutRounds.map((round, roundIndex) => {
                            const distanceToFinal = knockoutRounds.length - roundIndex;
                            let phaseName = round.number; 
                            if (distanceToFinal === 1) phaseName = "FINAL"; else if (distanceToFinal === 2) phaseName = "SEMIFINAL"; else if (distanceToFinal === 3) phaseName = "QUARTAS"; else if (distanceToFinal === 4) phaseName = "OITAVAS"; else if (distanceToFinal === 5) phaseName = "16 AVOS"; else if (distanceToFinal === 6) phaseName = "32 AVOS";

                            return (
                              <div key={round.id} className="w-64 flex flex-col shrink-0 animate-in fade-in min-h-[400px]">
                                <div className="bg-blue-900 border border-blue-800 rounded-xl px-4 py-2.5 text-center shadow-md relative overflow-hidden mb-6">
                                  <div className="absolute top-0 left-0 w-full h-[3px] bg-amber-500"></div>
                                  {isAdmin && (<button type="button" onClick={(e) => { e.stopPropagation(); handleDeleteRound(round.id); }} className="absolute top-1.5 right-1.5 text-red-400 hover:text-red-300 bg-red-900/30 hover:bg-red-600 rounded p-1 z-10 transition-colors" title="Excluir Rodada"><Trash2 size={12}/></button>)}
                                  <span className="text-xs font-black text-amber-400 uppercase tracking-widest">Fase: {phaseName}</span>
                                  {isAdmin && round.status === 'locked' && (<button type="button" onClick={() => onReleaseRound(comp.id, round.id)} className="block w-full mt-1.5 bg-emerald-600 hover:bg-emerald-500 text-blue-950 font-black text-[9px] py-1 rounded uppercase tracking-wider transition-colors">🔓 Liberar Jogos</button>)}
                                  {isAdmin && round.status === 'released' && (<><button type="button" onClick={() => onLockRound(comp.id, round.id)} className="block w-full mt-1.5 bg-amber-600 hover:bg-amber-500 text-blue-950 font-black text-[9px] py-1 rounded uppercase tracking-wider transition-colors mb-1">🔒 Travar Jogos</button><button type="button" onClick={() => handleAddMatchToGroup(round.id, null)} className="block w-full bg-blue-800 hover:bg-blue-700 text-emerald-400 font-bold text-[9px] py-1.5 rounded uppercase tracking-wider transition-colors border border-blue-600 border-dashed">+ Adicionar Confronto</button></>)}
                                </div>

                                <div className="flex flex-col flex-1 h-full py-2">
                                  {comp.category === 'copa_flash_dupla' ? (
                                    Array.from({ length: Math.ceil(round.matches.length / 2) }).map((_, idx) => {
                                      const mIda = round.matches[idx * 2];
                                      const mVolta = round.matches[idx * 2 + 1];
                                      if (!mIda || !mVolta) return null;
                                      
                                      const isLocked = round.status === 'locked';
                                      const sIda = getMatchStatusDisplay(mIda.id);
                                      const sVolta = getMatchStatusDisplay(mVolta.id);
                                      const idaIsFinished = sIda.isPlayed;
                                      
                                      let aggScoreA = '?'; let aggScoreB = '?';
                                      let isPlayed = false; let statusText = 'Aguardando'; let statusColor = 'text-blue-500';
                                      let teamALost = false; let teamBLost = false;

                                      if (sIda.isPlayed && sIda.text === 'Oficial' && sVolta.isPlayed && sVolta.text === 'Oficial') {
                                        isPlayed = true; statusText = 'Oficializado'; statusColor = 'text-emerald-400';
                                        aggScoreA = Number(sIda.scoreA||0) + Number(sVolta.scoreB||0);
                                        aggScoreB = Number(sIda.scoreB||0) + Number(sVolta.scoreA||0);
                                        const aggPenA = Number(sIda.penaltiesA||0) + Number(sVolta.penaltiesB||0);
                                        const aggPenB = Number(sIda.penaltiesB||0) + Number(sVolta.penaltiesA||0);
                                        if (aggScoreA < aggScoreB) teamALost = true; else if (aggScoreB < aggScoreA) teamBLost = true;
                                        else { if (aggPenA < aggPenB) teamALost = true; if (aggPenB < aggPenA) teamBLost = true; }
                                      } else if (sIda.isPlayed || sVolta.isPlayed) {
                                        statusText = 'Em Andamento'; statusColor = 'text-amber-400';
                                      }

                                      const realDuplaA = (comp.groups || []).find(d => d.id === mIda.duplaA?.id) || mIda.duplaA;
                                      const realDuplaB = (comp.groups || []).find(d => d.id === mIda.duplaB?.id) || mIda.duplaB;
                                      const isTop = idx % 2 === 0; const isFirstRound = roundIndex === 0; const isLastRound = roundIndex === knockoutRounds.length - 1;

                                      return (
                                        <div key={`dupla_${idx}`} className="relative flex-1 flex flex-col justify-center py-3 group">
                                          {!isFirstRound && (<div className="absolute -left-6 w-6 h-[2px] bg-blue-600/60 top-1/2 -translate-y-1/2"></div>)}
                                          <div className="relative z-10 w-full">
                                            <div 
                                              onClick={(e) => {
                                                e.stopPropagation(); e.preventDefault();
                                                try { setSelectedDuplaMatchup({ mIda, mVolta, duplaA: realDuplaA, duplaB: realDuplaB, aggScoreA, aggScoreB, isLocked, roundId: round.id, idaIsFinished }); } 
                                                catch(err) { console.error("Erro", err); }
                                              }} 
                                              className={`p-3 rounded-xl border flex flex-col gap-1.5 transition-all shadow-sm cursor-pointer hover:-translate-y-1 ${isPlayed ? 'bg-blue-900/90 border-emerald-500/50 shadow-emerald-500/20' : isLocked ? 'bg-blue-950/40 border-blue-900/60 opacity-60' : 'bg-blue-900/40 border-blue-700 hover:border-amber-500/50'}`}
                                            >
                                              <div className="flex justify-between items-center text-[9px] font-bold uppercase tracking-wider pb-1 border-b border-blue-800/40">
                                                <span className="text-amber-400 flex items-center gap-1">👥 Confronto Duplo</span>
                                                <span className={statusColor}>{statusText}</span>
                                              </div>
                                              <div className={`flex items-center justify-between gap-2 min-w-0 mt-1 transition-all ${teamALost ? 'grayscale opacity-50 line-through' : ''}`}>
                                                <span className={`text-xs truncate font-bold ${isPlayed && !teamALost ? 'text-emerald-400' : 'text-blue-100'}`}>{idaIsFinished || isFirstRound || isAdmin ? (realDuplaA?.name || 'A Definir') : 'Dupla Oculta 🕵️'}</span>
                                                <span className={`w-7 text-center text-sm font-black rounded p-0.5 bg-blue-950 ${isPlayed ? statusColor : 'text-blue-700'}`}>{aggScoreA}</span>
                                              </div>
                                              <div className={`flex items-center justify-between gap-2 min-w-0 transition-all ${teamBLost ? 'grayscale opacity-50 line-through' : ''}`}>
                                                <span className={`text-xs truncate font-bold ${isPlayed && !teamBLost ? 'text-emerald-400' : 'text-blue-100'}`}>{idaIsFinished || isFirstRound || isAdmin ? (realDuplaB?.name || 'A Definir') : 'Dupla Oculta 🕵️'}</span>
                                                <span className={`w-7 text-center text-sm font-black rounded p-0.5 bg-blue-950 ${isPlayed ? statusColor : 'text-blue-700'}`}>{aggScoreB}</span>
                                              </div>
                                            </div>
                                          </div>
                                          {!isLastRound && (<div className={`absolute -right-6 w-6 border-blue-600/60 ${isTop ? 'top-1/2 border-t-[2px] border-r-[2px] h-1/2 rounded-tr-xl' : 'bottom-1/2 border-b-[2px] border-r-[2px] h-1/2 rounded-br-xl'}`}></div>)}
                                        </div>
                                      );
                                    })
                                  ) : (
                                    round.matches.map((m, matchIndex) => {
                                      const tA = getTeam(m.teamA); const tB = getTeam(m.teamB); const sUI = getMatchStatusDisplay(m.id);
                                      const isLocked = round.status === 'locked'; const isPlayed = sUI.isPlayed && sUI.text === 'Oficial';
                                      
                                      const isBye = (m.teamA && !m.teamB && m.placeholderB.includes('Vaga')) || (!m.teamA && m.teamB && m.placeholderA.includes('Vaga'));

                                      let teamALost = false; let teamBLost = false;
                                      if (isPlayed && !isBye) {
                                        const scoreA = Number(sUI.scoreA || 0); const scoreB = Number(sUI.scoreB || 0); 
                                        if (scoreA < scoreB) teamALost = true; else if (scoreB < scoreA) teamBLost = true; 
                                        else { const penA = Number(sUI.penaltiesA||0); const penB = Number(sUI.penaltiesB||0); if (penA < penB) teamALost = true; if (penB < penA) teamBLost = true; }
                                      }
                                      const isFirstRound = roundIndex === 0; const isLastRound = roundIndex === knockoutRounds.length - 1; const isTop = matchIndex % 2 === 0;

                                      return (
                                        <div key={m.id} className="relative flex-1 flex flex-col justify-center py-3 group">
                                          {!isFirstRound && (<div className="absolute -left-6 w-6 h-[2px] bg-blue-600/60 top-1/2 -translate-y-1/2"></div>)}
                                          <div className="relative z-10 w-full">
                                            <div onClick={() => { if(sUI.isPlayed && onSelectMatch && !isBye){ const f = matches.find(x=>x.id===sUI.submittedMatchId); if(f) onSelectMatch(f) } }} className={`p-3 rounded-xl border flex flex-col gap-1.5 transition-all shadow-sm ${sUI.isPlayed || isBye ? 'bg-blue-900/90 border-emerald-500/30' : isLocked ? 'bg-blue-950/40 border-blue-900/60 opacity-40' : 'bg-blue-900/40 border-blue-800 hover:border-blue-600'} ${!isBye ? 'cursor-pointer' : ''} relative overflow-hidden`}>
                                              <div className="flex justify-between items-center text-[9px] font-bold uppercase tracking-wider pb-1 border-b border-blue-800/40">
                                                <span className="text-blue-500">{m.id.includes('_f1') && round.matches.length > 1 && !m.id.includes('_3rd') ? '🏆 Final (Ida)' : m.id.includes('_f2') ? '🏆 Final (Volta)' : m.id.includes('_3rd') ? '🥉 Disputa 3º Lugar' : 'Confronto'}</span>
                                                <span className={isBye ? 'text-emerald-400' : sUI.color}>{isBye ? 'Avanço Direto' : sUI.text}</span>
                                              </div>
                                              <div className={`flex items-center justify-between gap-2 min-w-0 mt-0.5 transition-all duration-500 ${teamALost ? 'grayscale opacity-60 contrast-75 line-through decoration-red-500/30' : ''}`}><div className="flex items-center gap-1.5 min-w-0 flex-1 cursor-pointer hover:text-emerald-400 transition-colors" onClick={(e) => { e.stopPropagation(); setSelectedTeamHistory(m.teamA); }}><ShieldDisplay shield={tA?.shield} size="small" /><span className={`text-xs truncate font-bold ${isPlayed && !teamALost || (isBye && tA) ? 'text-emerald-400 font-black' : 'text-blue-200'} hover:text-emerald-400`}>{tA?.name || m.placeholderA}</span></div><div className="flex items-center gap-1 shrink-0">{sUI.penaltiesA !== null && sUI.penaltiesA !== undefined && !isBye && <span className="text-[9px] text-amber-500 font-bold">({sUI.penaltiesA})</span>}<span className={`w-6 text-center text-sm font-black rounded p-0.5 bg-blue-950 ${sUI.isPlayed || (isBye && tA) ? 'text-emerald-400' : 'text-blue-700'}`}>{isBye ? (tA ? 'W' : '-') : sUI.isPlayed ? sUI.scoreA : '-'}</span></div></div>
                                              <div className={`flex items-center justify-between gap-2 min-w-0 transition-all duration-500 ${teamBLost ? 'grayscale opacity-60 contrast-75 line-through decoration-red-500/30' : ''}`}><div className="flex items-center gap-1.5 min-w-0 flex-1 cursor-pointer hover:text-emerald-400 transition-colors" onClick={(e) => { e.stopPropagation(); setSelectedTeamHistory(m.teamB); }}><ShieldDisplay shield={tB?.shield} size="small" /><span className={`text-xs truncate font-bold ${isPlayed && !teamBLost || (isBye && tB) ? 'text-emerald-400 font-black' : 'text-blue-200'} hover:text-emerald-400`}>{tB?.name || m.placeholderB}</span></div><div className="flex items-center gap-1 shrink-0">{sUI.penaltiesB !== null && sUI.penaltiesB !== undefined && !isBye && <span className="text-[9px] text-amber-500 font-bold">({sUI.penaltiesB})</span>}<span className={`w-6 text-center text-sm font-black rounded p-0.5 bg-blue-950 ${sUI.isPlayed || (isBye && tB) ? 'text-emerald-400' : 'text-blue-700'}`}>{isBye ? (tB ? 'W' : '-') : sUI.isPlayed ? sUI.scoreB : '-'}</span></div></div>
                                            </div>
                                            {isAdmin && !isBye && (<button type="button" onClick={(e) => { e.stopPropagation(); handleOpenEditModal(m, round.id); }} className="absolute -right-1 -top-1 text-blue-400 hover:text-emerald-400 p-1 bg-blue-950 rounded border border-blue-800 md:opacity-0 md:group-hover:opacity-100 transition-opacity shadow-lg z-10"><Edit size={12} /></button>)}
                                          </div>
                                          {!isLastRound && (<div className={`absolute -right-6 w-6 border-blue-600/60 ${isTop ? 'top-1/2 border-t-[2px] border-r-[2px] h-1/2 rounded-tr-xl' : 'bottom-1/2 border-b-[2px] border-r-[2px] h-1/2 rounded-br-xl'}`}></div>)}
                                        </div>
                                      );
                                    })
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div> 
            )}

            {subTab === 'stats' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-in slide-in-from-right-4">
                
                {/* TOP GOLEADORES */}
                <div className="space-y-2">
                  <div className="flex justify-between items-end mb-2">
                    <h3 className="text-lg font-bold text-white pl-2">Top Goleadores</h3>
                    <Button onClick={() => captureSection('capture-scorers', `Artilharia-${comp.name}`)} className="text-[10px] py-1 px-3 shadow-lg" variant="outline">
                      <Camera size={14}/> Salvar
                    </Button>
                  </div>
                  <div id="capture-scorers" className="bg-blue-900 rounded-xl border border-blue-800 overflow-hidden shadow-xl p-2 sm:p-4">
                    <div className="bg-blue-950/80 p-4 border border-blue-800 rounded-xl mb-4 flex flex-col items-center justify-center">
                      <h3 className="font-bold text-emerald-400 text-lg uppercase tracking-widest text-center">⚽ Artilharia</h3>
                      <span className="text-[10px] font-bold text-blue-400 mt-1">{comp.name}</span>
                    </div>
                    <div className="divide-y divide-blue-800/50 bg-blue-950 rounded-xl border border-blue-800">
                      {topScorers.length === 0 ? (
                        <p className="p-6 text-sm text-blue-500 text-center">Nenhum gol validado até o momento.</p>
                      ) : (
                        topScorers.map((s, idx) => (
                          <div key={idx} className="p-3 flex items-center justify-between hover:bg-blue-800/50 transition-colors">
                            <div className="flex items-center gap-3">
                              <span className={`font-black w-6 text-center ${idx === 0 ? 'text-amber-400 text-lg' : idx === 1 ? 'text-blue-300 text-lg' : idx === 2 ? 'text-amber-700 text-lg' : 'text-blue-600'}`}>{idx + 1}º</span>
                              <ShieldDisplay shield={getTeam(s.teamId)?.shield} size="normal" />
                              <div className="flex flex-col">
                                <span className="font-bold text-blue-200 text-sm md:text-base leading-tight">{s.player}</span>
                                <span className="text-[10px] md:text-xs text-blue-400 font-medium">{getTeam(s.teamId)?.name}</span>
                              </div>
                            </div>
                            <div className="bg-blue-900 px-4 py-2 rounded-lg border border-blue-800 text-emerald-400 font-black text-lg">{s.count}</div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>

                {/* TOP GARÇONS */}
                <div className="space-y-2">
                  <div className="flex justify-between items-end mb-2">
                    <h3 className="text-lg font-bold text-white pl-2">Top Garçons</h3>
                    <Button onClick={() => captureSection('capture-assists', `Assistencias-${comp.name}`)} className="text-[10px] py-1 px-3 shadow-lg" variant="outline">
                      <Camera size={14}/> Salvar
                    </Button>
                  </div>
                  <div id="capture-assists" className="bg-blue-900 rounded-xl border border-blue-800 overflow-hidden shadow-xl p-2 sm:p-4">
                    <div className="bg-blue-950/80 p-4 border border-blue-800 rounded-xl mb-4 flex flex-col items-center justify-center">
                      <h3 className="font-bold text-emerald-400 text-lg uppercase tracking-widest text-center flex items-center gap-2">
                        <Star size={20}/> Assistências
                      </h3>
                      <span className="text-[10px] font-bold text-blue-400 mt-1">{comp.name}</span>
                    </div>
                    <div className="divide-y divide-blue-800/50 bg-blue-950 rounded-xl border border-blue-800">
                      {topAssists.length === 0 ? (
                        <p className="p-6 text-sm text-blue-500 text-center">Nenhuma assistência validada até o momento.</p>
                      ) : (
                        topAssists.map((a, idx) => (
                          <div key={idx} className="p-3 flex items-center justify-between hover:bg-blue-800/50 transition-colors">
                            <div className="flex items-center gap-3">
                              <span className={`font-black w-6 text-center ${idx === 0 ? 'text-amber-400 text-lg' : idx === 1 ? 'text-blue-300 text-lg' : idx === 2 ? 'text-amber-700 text-lg' : 'text-blue-600'}`}>{idx + 1}º</span>
                              <ShieldDisplay shield={getTeam(a.teamId)?.shield} size="normal" />
                              <div className="flex flex-col">
                                <span className="font-bold text-blue-200 text-sm md:text-base leading-tight">{a.player}</span>
                                <span className="text-[10px] md:text-xs text-blue-400 font-medium">{getTeam(a.teamId)?.name}</span>
                              </div>
                            </div>
                            <div className="bg-blue-900 px-4 py-2 rounded-lg border border-blue-800 text-blue-400 font-black text-lg">{a.count}</div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>

              </div>
            )}
            
            {subTab === 'submit' && isAdmin && (<div className="animate-in slide-in-from-right-4"><SubmitMatch teams={teams} competitions={[comp]} matches={matches} currentUser={currentUser} showToast={showToast} preSelectedCompId={comp.id} onSubmit={async (m) => { await onSubmitMatch(m); setSubTab('validation'); }} /></div>)}
            {subTab === 'validation' && isAdmin && (<div className="animate-in slide-in-from-right-4"><ValidationPanel matches={matches.filter(m => m.compId === comp.id)} teams={teams} competitions={[comp]} onUpdateStatus={onUpdateMatchStatus} showToast={showToast} currentUser={currentUser} /></div>)}
            {subTab === 'draw' && isAdmin && (<div className="animate-in slide-in-from-right-4"><DrawPanel comp={comp} teams={teams} matches={matches} showToast={showToast} /></div>)}
          </div>
        </>
      )}

      {/* MODAL DE EDITAR PARTIDA (ADMIN) */}
      {editMatchData && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in" onClick={() => setEditMatchData(null)}>
          <div className="bg-blue-900 border border-blue-700 rounded-2xl w-full max-w-md p-6 shadow-2xl overflow-y-auto max-h-[90vh] custom-scrollbar" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2"><Edit size={18} className="text-amber-400"/> Editar Partida</h3>
            <div className="space-y-4">
              <div className="bg-blue-950 p-4 rounded-xl border border-blue-800 space-y-3">
                  <p className="text-xs font-bold text-blue-400 uppercase tracking-widest">Alterar Times do Confronto</p>
                  {comp.format === 'groups' && !isKnockoutEdit && (<div className="pb-2 border-b border-blue-800/50 mb-3"><label className="text-[10px] font-bold text-purple-400 uppercase tracking-widest block mb-1">Pertencente ao Grupo</label><select value={editMatchData.group || 'A'} onChange={e => { setEditMatchData({ ...editMatchData, group: e.target.value, teamA: '', teamB: '' }); }} className="w-full bg-blue-900 border border-purple-500/40 rounded p-2 text-purple-300 text-xs font-bold outline-none">{Object.keys(comp.groups || {}).sort((a, b) => a.localeCompare(b)).map(gName => (<option key={gName} value={gName}>Grupo {gName}</option>))}</select></div>)}
                 <div className="space-y-2">
                      <select value={editMatchData.teamA} onChange={e => setEditMatchData({...editMatchData, teamA: e.target.value})} className="w-full bg-blue-900 border border-blue-700 rounded p-2 text-white text-sm outline-none"><option value="">A Definir / Sorteio</option>{availableTeamsForEdit.map(tId => { const t = getTeam(tId); return t ? <option key={t.id} value={t.id}>{t.name}</option> : null; })}</select>
                      <div className="text-center text-blue-500 font-bold text-xs">X</div>
                      <select value={editMatchData.teamB} onChange={e => setEditMatchData({...editMatchData, teamB: e.target.value})} className="w-full bg-blue-900 border border-blue-700 rounded p-2 text-white text-sm outline-none"><option value="">A Definir / Sorteio</option>{availableTeamsForEdit.map(tId => { const t = getTeam(tId); return t ? <option key={t.id} value={t.id}>{t.name}</option> : null; })}</select>
                  </div>

                  {/* 🌟 NOVO CAMPO DE CÓDIGO DLS */}
                  <div className="space-y-1 mt-3 border-t border-blue-800/50 pt-3">
                    <label className="text-[10px] font-bold text-amber-400 uppercase tracking-widest block mb-1">Código DLS (Para Sala Oculta)</label>
                    <div className="flex gap-2">
                       <input type="text" value={editMatchData.dlsCode || ''} onChange={e => setEditMatchData({...editMatchData, dlsCode: e.target.value.toUpperCase()})} placeholder="Ex: KAME12" className="flex-1 bg-blue-900 border border-amber-500/40 rounded p-2 text-amber-400 font-black text-sm outline-none focus:border-amber-400 uppercase placeholder:text-amber-700/50" />
                       <button type="button" onClick={() => setEditMatchData({...editMatchData, dlsCode: "KAM" + Math.floor(Math.random() * 900 + 100)})} className="bg-amber-600 hover:bg-amber-500 text-blue-950 px-3 rounded font-bold text-xs shadow-md transition-colors">Gerar Auto.</button>
                    </div>
                  </div>

              </div>
              {editMatchData.hasPlayed && (
                  <div className="bg-emerald-900/20 p-4 rounded-xl border border-emerald-500/30">
                      <div className="flex justify-between items-center mb-2">
                        <p className="text-xs font-bold text-emerald-400 uppercase tracking-widest">Ajustar Placar Validado</p>
                        <div className="flex gap-2">
                          <label className="flex items-center gap-1 text-[10px] text-red-400 font-bold bg-red-500/10 px-2 py-1 rounded cursor-pointer border border-red-500/20 hover:bg-red-500/20 transition-colors"><input type="checkbox" checked={editMatchData.woA} onChange={e => { const isWo = e.target.checked; const otherWo = editMatchData.woB; let sA = editMatchData.scoreA; let sB = editMatchData.scoreB; if (isWo && !otherWo) { sA = 0; sB = 3; } else if (!isWo && otherWo) { sA = 3; sB = 0; } else if (isWo && otherWo) { sA = '?'; sB = '?'; } else { sA = ''; sB = ''; } setEditMatchData({...editMatchData, woA: isWo, scoreA: sA, scoreB: sB}); }} className="accent-red-500 w-3 h-3" /> W.O. Equipe A</label>
                          <label className="flex items-center gap-1 text-[10px] text-red-400 font-bold bg-red-500/10 px-2 py-1 rounded cursor-pointer border border-red-500/20 hover:bg-red-500/20 transition-colors"><input type="checkbox" checked={editMatchData.woB} onChange={e => { const isWo = e.target.checked; const otherWo = editMatchData.woA; let sA = editMatchData.scoreA; let sB = editMatchData.scoreB; if (isWo && !otherWo) { sB = 0; sA = 3; } else if (!isWo && otherWo) { sB = 3; sA = 0; } else if (isWo && otherWo) { sA = '?'; sB = '?'; } else { sA = ''; sB = ''; } setEditMatchData({...editMatchData, woB: isWo, scoreA: sA, scoreB: sB}); }} className="accent-red-500 w-3 h-3" /> W.O. Equipe B</label>
                        </div>
                      </div>
                      <div className="flex items-center justify-center gap-3">
                          <input type="text" inputMode="numeric" pattern="[0-9]*" disabled={editMatchData.woA || editMatchData.woB} value={editMatchData.scoreA} onChange={e => setEditMatchData({...editMatchData, scoreA: e.target.value})} className="w-16 bg-blue-950 border border-emerald-500/50 rounded-lg p-2 text-white text-center font-bold text-xl outline-none disabled:opacity-50" />
                          <span className="font-bold text-blue-500">X</span>
                          <input type="text" inputMode="numeric" pattern="[0-9]*" disabled={editMatchData.woA || editMatchData.woB} value={editMatchData.scoreB} onChange={e => setEditMatchData({...editMatchData, scoreB: e.target.value})} className="w-16 bg-blue-950 border border-emerald-500/50 rounded-lg p-2 text-white text-center font-bold text-xl outline-none disabled:opacity-50" />
                      </div>
                      {comp.format !== 'league' && (
                          <div className="mt-3 flex items-center justify-center gap-3">
                              <input type="number" inputMode="numeric" pattern="[0-9]*" placeholder="Pên A" value={editMatchData.penaltiesA} onChange={e => setEditMatchData({...editMatchData, penaltiesA: e.target.value})} className="w-16 bg-blue-950 border border-amber-500/30 rounded-lg p-1 text-amber-400 text-center font-bold text-xs outline-none" />
                              <span className="text-[10px] text-amber-500 font-bold uppercase">Pênaltis</span>
                              <input type="number" inputMode="numeric" pattern="[0-9]*" placeholder="Pên B" value={editMatchData.penaltiesB} onChange={e => setEditMatchData({...editMatchData, penaltiesB: e.target.value})} className="w-16 bg-blue-950 border border-amber-500/30 rounded-lg p-1 text-amber-400 text-center font-bold text-xs outline-none" />
                          </div>
                      )}
                      <p className="text-[10px] text-emerald-500/70 text-center mt-3 leading-tight">Ao salvar, a tabela será recalculada automaticamente.</p>
                  </div>
              )}
            </div>
            <div className="flex flex-col sm:flex-row justify-between items-center sm:items-end gap-4 mt-5 pt-4 border-t border-blue-800">
              <div className="flex flex-col gap-2 w-full sm:w-auto items-start">
                {editMatchData.hasPlayed && (<button type="button" onClick={() => { if(window.confirm('Excluir apenas o resultado?')) { if (onDeleteMatch && editMatchData.playedMatchId) { onDeleteMatch(editMatchData.playedMatchId); setEditMatchData(null); } } }} className="flex items-center gap-1.5 text-[11px] text-amber-400 hover:text-amber-300 font-bold transition-colors">Excluir apenas Placar Validado</button>)}
                <button type="button" onClick={handleDeleteMatchCompletely} className="flex items-center gap-1.5 text-[11px] text-red-400 hover:text-red-300 font-bold transition-colors bg-red-500/10 px-2 py-1 rounded border border-red-500/20"><Trash2 size={12} /> Excluir Partida Inteira do Calendário</button>
              </div>
              <div className="flex gap-2 w-full sm:w-auto shrink-0 justify-end"><Button variant="outline" onClick={() => setEditMatchData(null)} className="py-2 text-xs">Cancelar</Button><Button onClick={saveMatchEdit} className="py-2 text-xs bg-amber-600 hover:bg-amber-500 border-0 shadow-md text-white">Salvar</Button></div>
            </div>
          </div>
        </div>
      )}

      {/* 👥 MODAL DETALHES DA DUPLA */}
      {selectedDuplaMatchup && (() => {
        try {
          const { mIda, mVolta, duplaA, duplaB, aggScoreA, aggScoreB, isLocked, roundId, idaIsFinished } = selectedDuplaMatchup;
          
          const sIda = mIda ? getMatchStatusDisplay(mIda.id) : { isPlayed: false, text: '' };
          const sVolta = mVolta ? getMatchStatusDisplay(mVolta.id) : { isPlayed: false, text: '' };
          const isPlayed = sIda.isPlayed && sIda.text === 'Oficial' && sVolta.isPlayed && sVolta.text === 'Oficial';
          
          return (
            <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in" onClick={() => setSelectedDuplaMatchup(null)}>
              <div className="bg-blue-900 border border-blue-700 rounded-2xl w-full max-w-md p-6 shadow-2xl flex flex-col" onClick={e => e.stopPropagation()}>
                
                <div className="flex justify-between items-center mb-6 border-b border-blue-800 pb-4">
                  <h3 className="text-lg font-black text-amber-400 uppercase tracking-widest flex items-center gap-2">👥 Confronto</h3>
                  <button onClick={() => setSelectedDuplaMatchup(null)} className="text-blue-400 hover:text-white bg-blue-800 p-1.5 rounded-full"><X size={16}/></button>
                </div>

                <div className="space-y-4 mb-6">
                  <div>
                    <label className="text-[10px] font-bold text-blue-400 uppercase tracking-widest block mb-1">Dupla 1 (Mandante Ida)</label>
                    <input type="text" value={duplaA?.name || ''} disabled={!isAdmin || typeof duplaA === 'string'}
                      onChange={(e) => {
                          const newGroups = Array.isArray(comp.groups) ? comp.groups.map(d => d.id === duplaA?.id ? {...d, name: e.target.value} : d) : [];
                          onEditComp({...comp, groups: newGroups});
                          setSelectedDuplaMatchup({...selectedDuplaMatchup, duplaA: {...duplaA, name: e.target.value}});
                      }}
                      className="w-full bg-blue-950 border border-blue-700 rounded p-2 text-white text-sm outline-none focus:border-amber-500 disabled:opacity-70" 
                    />
                    <p className="text-[9px] text-emerald-400 mt-1">Formação: {getTeam(duplaA?.p1)?.name || 'Oculto'} & {getTeam(duplaA?.p2)?.name || 'Oculto'}</p>
                  </div>
                  <div className="text-center font-black text-blue-500 text-lg">X</div>
                  <div>
                    <label className="text-[10px] font-bold text-blue-400 uppercase tracking-widest block mb-1">Dupla 2 (Mandante Volta)</label>
                    <input type="text" value={duplaB?.name || ''} disabled={!isAdmin || typeof duplaB === 'string'}
                      onChange={(e) => {
                          const newGroups = Array.isArray(comp.groups) ? comp.groups.map(d => d.id === duplaB?.id ? {...d, name: e.target.value} : d) : [];
                          onEditComp({...comp, groups: newGroups});
                          setSelectedDuplaMatchup({...selectedDuplaMatchup, duplaB: {...duplaB, name: e.target.value}});
                      }}
                      className="w-full bg-blue-950 border border-blue-700 rounded p-2 text-white text-sm outline-none focus:border-amber-500 disabled:opacity-70" 
                    />
                    <p className="text-[9px] text-emerald-400 mt-1">Formação: {getTeam(duplaB?.p1)?.name || 'Oculto'} & {getTeam(duplaB?.p2)?.name || 'Oculto'}</p>
                  </div>
                </div>

                <div className="bg-blue-950/50 p-4 rounded-xl border border-blue-800 space-y-4">
                  <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs font-bold text-white uppercase tracking-wider mb-1">Jogo de Ida (Pote 1)</p>
                        <p className="text-[9px] text-blue-300">{mIda?.teamA ? getTeam(mIda.teamA)?.name : '?'} x {mIda?.teamB ? getTeam(mIda.teamB)?.name : '?'}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-lg font-black bg-blue-900 px-3 py-1 rounded border border-blue-700 ${sIda.isPlayed ? 'text-emerald-400' : 'text-blue-500'}`}>
                          {sIda.isPlayed ? `${sIda.scoreA} x ${sIda.scoreB}` : '-'}
                        </span>
                        {isAdmin && (<button onClick={() => { setSelectedDuplaMatchup(null); handleOpenEditModal(mIda, roundId); }} className="p-2 bg-blue-800 text-blue-300 hover:text-white rounded transition-colors" title="Editar Placar"><Edit size={14}/></button>)}
                      </div>
                  </div>
                  <div className="h-px bg-blue-800/50 w-full"></div>
                  <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs font-bold text-white uppercase tracking-wider mb-1">Jogo de Volta (Pote 2)</p>
                        <p className="text-[9px] text-blue-300">
                          {idaIsFinished || isAdmin ? `${mVolta?.teamA ? getTeam(mVolta.teamA)?.name : '?'} x ${mVolta?.teamB ? getTeam(mVolta.teamB)?.name : '?'}` : '🕵️ Adversário Oculto'}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-lg font-black bg-blue-900 px-3 py-1 rounded border border-blue-700 ${sVolta.isPlayed ? 'text-emerald-400' : 'text-blue-500'}`}>
                          {sVolta.isPlayed ? `${sVolta.scoreA} x ${sVolta.scoreB}` : '-'}
                        </span>
                        {isAdmin && (<button onClick={() => { setSelectedDuplaMatchup(null); handleOpenEditModal(mVolta, roundId); }} className="p-2 bg-blue-800 text-blue-300 hover:text-white rounded transition-colors" title="Editar Placar"><Edit size={14}/></button>)}
                      </div>
                  </div>
                </div>

                <div className="mt-4 bg-amber-500/10 p-3 rounded-xl border border-amber-500/30 text-center">
                  <p className="text-[10px] font-bold text-amber-400 uppercase tracking-widest mb-1">Placar Agregado</p>
                  <p className="text-xl font-black text-white">{aggScoreA} x {aggScoreB}</p>
                </div>

                {isAdmin && isPlayed && (comp.rounds.findIndex(r => r.id === roundId) < comp.rounds.length - 1) && (
                  <div className="mt-4 grid grid-cols-2 gap-3">
                      <button onClick={() => handleForceAdvanceDupla(roundId, mIda, duplaA)} className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold py-2.5 rounded-lg shadow-md transition-colors truncate px-2">
                        Avançar {duplaA && typeof duplaA.name === 'string' ? duplaA.name.split(' ')[0] : (duplaA?.name || 'Dupla 1')}
                      </button>
                      <button onClick={() => handleForceAdvanceDupla(roundId, mIda, duplaB)} className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold py-2.5 rounded-lg shadow-md transition-colors truncate px-2">
                        Avançar {duplaB && typeof duplaB.name === 'string' ? duplaB.name.split(' ')[0] : (duplaB?.name || 'Dupla 2')}
                      </button>
                  </div>
                )}

              </div>
            </div>
          );
        } catch (error) {
          console.error(error);
          return (
            <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4" onClick={() => setSelectedDuplaMatchup(null)}>
              <div className="bg-red-900 border border-red-500 p-8 rounded-xl text-center">
                <p className="text-white font-bold mb-4">Erro ao carregar os dados desta partida. Avise os líderes.</p>
                <button className="bg-white text-red-900 px-4 py-2 rounded font-bold">Fechar</button>
              </div>
            </div>
          );
        }
      })()}

      {/* 📜 MODAL DE HISTÓRICO DE PARTIDAS DO TIME NA COMPETIÇÃO */}
      {selectedTeamHistory && (() => {
        const teamInfo = getTeam(selectedTeamHistory);
        
        const teamMatches = [];
        (comp.rounds || []).forEach(round => {
          (round.matches || []).forEach(m => {
            if (m.teamA === selectedTeamHistory || m.teamB === selectedTeamHistory) {
              const sUI = getMatchStatusDisplay(m.id);
              teamMatches.push({
                roundNumber: round.number,
                match: m,
                statusUI: sUI,
                isTeamA: m.teamA === selectedTeamHistory
              });
            }
          });
        });

        return (
          <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in" onClick={() => setSelectedTeamHistory(null)}>
            <div className="bg-blue-900 border border-blue-700 rounded-2xl w-full max-w-lg p-6 shadow-2xl flex flex-col max-h-[85vh]" onClick={e => e.stopPropagation()}>
              
              {/* Cabeçalho do Modal */}
              <div className="flex justify-between items-center mb-4 border-b border-blue-800 pb-4">
                <div className="flex items-center gap-3">
                  <ShieldDisplay shield={teamInfo?.shield} size="normal" />
                  <div>
                    <h3 className="text-base sm:text-lg font-black text-white uppercase tracking-wider">{teamInfo?.name || 'Time'}</h3>
                    <p className="text-[10px] text-emerald-400 font-bold uppercase tracking-widest">Histórico na Competição</p>
                  </div>
                </div>
                <button onClick={() => setSelectedTeamHistory(null)} className="text-blue-400 hover:text-white bg-blue-800 p-1.5 rounded-full"><X size={16}/></button>
              </div>

              {/* Lista de Partidas */}
              <div className="overflow-y-auto custom-scrollbar space-y-3 pr-1 flex-1">
                {teamMatches.length === 0 ? (
                  <p className="text-xs text-blue-400 text-center py-8">Nenhuma partida registrada para este time ainda.</p>
                ) : (
                  teamMatches.map((item, idx) => {
                    const { roundNumber, match, statusUI, isTeamA } = item;
                    const oppId = isTeamA ? match.teamB : match.teamA;
                    const oppTeam = getTeam(oppId);

                    return (
                      <div key={idx} className="bg-blue-950 p-3.5 rounded-xl border border-blue-800 flex items-center justify-between gap-3 shadow-inner">
                        <div className="flex flex-col">
                          <span className="text-[9px] font-black uppercase text-amber-400 tracking-wider">Rodada {roundNumber}</span>
                          <span className="text-xs font-bold text-blue-200 mt-0.5">vs {oppTeam?.name || match.placeholderB || match.placeholderA || 'Adversário'}</span>
                        </div>

                        <div className="flex items-center gap-3 shrink-0">
                          <span className={`text-[9px] uppercase font-black px-2 py-0.5 rounded ${statusUI.bg} ${statusUI.color}`}>
                            {statusUI.text}
                          </span>
                          <div className="bg-blue-900 px-3 py-1 rounded-lg border border-blue-800 text-sm font-black text-white">
                            {statusUI.isPlayed ? (
                              isTeamA ? `${statusUI.scoreA} : ${statusUI.scoreB}` : `${statusUI.scoreB} : ${statusUI.scoreA}`
                            ) : (
                              <span className="text-blue-500 font-bold text-xs">x</span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              <div className="mt-4 pt-3 border-t border-blue-800 text-center">
                <button onClick={() => setSelectedTeamHistory(null)} className="w-full py-2 bg-blue-800 hover:bg-blue-700 text-white font-bold text-xs rounded-xl transition-colors">Fechar Histórico</button>
              </div>

            </div>
          </div>
        );
      })()}

    </div>
  );
};

export default CompetitionDetails;
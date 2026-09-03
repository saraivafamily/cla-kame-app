import React, { useState, useEffect, useMemo } from 'react';
import { Crown, Target, Trophy, Activity, Zap, Eye, Camera, Brain, Shield, Lock, X, XCircle } from 'lucide-react';
import { updateDoc, setDoc } from 'firebase/firestore';
import { getPublicDocPath } from '../utils/firebase';
import ShieldDisplay from './ShieldDisplay';
import Button from './Button';
import { PONTOS } from '../utils/pontuacoes';
import { calculateStandings, getChampionIds } from '../utils/torneios';

const GlobalRanking = ({ teams, matches, competitions, currentUser, showToast }) => {
  const isAdmin = currentUser?.role === 'leader' || currentUser?.role === 'kaioh';

  // 🌟 Controle de Abas dentro do Ranking
  const [activeTab, setActiveTab] = useState('ranking');
  const [showPointsTable, setShowPointsTable] = useState(false); // Controle da tabela de pontuação

  // ⚡ MODO TURBO: Puxa o ranking ordenado
  const rankingData = useMemo(() => {
    return (teams || [])
      .filter(t => t.ownerId && t.ownerId !== 'manual' && ((t.globalPoints || 0) !== 0 || (t.playedMatches || 0) > 0))
      .sort((a, b) => (b.globalPoints || 0) - (a.globalPoints || 0) || (b.totalWins || 0) - (a.totalWins || 0));
  }, [teams]);

  const getBadge = (pts) => {
    if (pts >= 3000) return { label: 'Monstro Sagrado', icon: '🐉', color: 'text-amber-400 bg-amber-500/10 border-amber-500/30' };
    if (pts >= 2000) return { label: 'Lenda Suprema', icon: '👑', color: 'text-amber-400 bg-amber-500/10 border-amber-500/30' };
    if (pts >= 1900) return { label: 'Mestre III', icon: '🥋', color: 'text-purple-400 bg-purple-500/10 border-purple-500/30' };
    if (pts >= 1600) return { label: 'Mestre II', icon: '✨', color: 'text-purple-400 bg-purple-500/10 border-purple-500/30' };
    if (pts >= 1300) return { label: 'Mestre I', icon: '🎓', color: 'text-purple-400 bg-purple-500/10 border-purple-500/30' };
    if (pts >= 750) return { label: 'Veterano III', icon: '🎖️', color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30' };
    if (pts >= 500) return { label: 'Veterano II', icon: '🛡️', color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30' };
    if (pts >= 250) return { label: 'Veterano I', icon: '🪖', color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30' };
    return { label: 'Aprendiz', icon: '🦆', color: 'text-blue-400 bg-blue-500/10 border-blue-500/30' };
  };

  // 🌟 NOVO MOTOR: Calcula quanto falta para a PRÓXIMA patente
  const getNextBadgeInfo = (pts) => {
    if (pts >= 3000) return null; // Já é Monstro Sagrado (MÁXIMO)
    if (pts >= 2000) return { next: 3000, label: 'Monstro Sagrado' };
    if (pts >= 1900) return { next: 2000, label: 'Lenda Suprema' };
    if (pts >= 1600) return { next: 1900, label: 'Mestre III' };
    if (pts >= 1300) return { next: 1600, label: 'Mestre II' };
    if (pts >= 750) return { next: 1300, label: 'Mestre I' };
    if (pts >= 500) return { next: 750, label: 'Veterano III' };
    if (pts >= 250) return { next: 500, label: 'Veterano II' };
    return { next: 250, label: 'Veterano I' };
  };

  // 🚀 RESTAURAÇÃO DE HISTÓRICO COM REGRA DE W.O.
  const handleSyncHistory = async () => {
    if (!window.confirm("Atenção: O sistema vai ler todo o histórico antigo e gravar os pontos permanentemente nos times (incluindo punições de W.O.). Deseja continuar?")) return;
    showToast("Calculando histórico... Por favor, aguarde.", "info");

    try {
      let stats = {};
      (teams || []).forEach(t => {
        if(t && t.id) {
          stats[t.id] = { globalPoints: 0, playedMatches: 0, totalWins: 0, totalDraws: 0, goalsFor: 0, goalsAgainst: 0, titles: 0 };
        }
      });

      (competitions || []).forEach(c => {
        const ptsJoin = c.category === 'copa_flash' ? PONTOS.FLASH.JOIN : PONTOS.NORMAL.JOIN;
        if (c && c.teams) {
          c.teams.forEach(tId => { if(stats[tId]) stats[tId].globalPoints += ptsJoin; });
        }
      });

      (matches || []).forEach(m => {
        if (m.status === 'approved') {
          const c = (competitions || []).find(comp => comp.id === m.compId);
          if (!c) return; 
          
          const isFlash = c.category === 'copa_flash';
          const ptsPlay = isFlash ? PONTOS.FLASH.PLAY : PONTOS.NORMAL.PLAY;
          const ptsWin = isFlash ? PONTOS.FLASH.WIN : PONTOS.NORMAL.WIN;
          const ptsDraw = isFlash ? PONTOS.FLASH.DRAW : PONTOS.NORMAL.DRAW;
          const ptsPunicaoWo = isFlash ? PONTOS.FLASH.PUNICAO_WO : PONTOS.NORMAL.PUNICAO_WO;

          const tA = stats[m.teamA]; const tB = stats[m.teamB];
          let scoreA = Number(m.scoreA||0); let scoreB = Number(m.scoreB||0);
          let penA = m.penaltiesA !== null && m.penaltiesA !== undefined ? Number(m.penaltiesA) : null;
          let penB = m.penaltiesB !== null && m.penaltiesB !== undefined ? Number(m.penaltiesB) : null;

          // VERIFICAÇÃO DE W.O
          let isWoA = false; let isWoB = false;
          const obs = (m.observacoes || '').toLowerCase();
          if (obs.includes('w.o') || obs.includes('wo')) {
             if (obs.includes('duplo')) { isWoA = true; isWoB = true; }
             else if (scoreA === 0 && scoreB === 3) isWoA = true;
             else if (scoreB === 0 && scoreA === 3) isWoB = true;
          }

          if(tA) { 
             tA.playedMatches += 1; 
             if (isWoA) {
                 tA.globalPoints += ptsPunicaoWo; 
             } else {
                 tA.globalPoints += ptsPlay; 
             }
             tA.goalsFor += scoreA; tA.goalsAgainst += scoreB; 
          }
          if(tB) { 
             tB.playedMatches += 1; 
             if (isWoB) {
                 tB.globalPoints += ptsPunicaoWo; 
             } else {
                 tB.globalPoints += ptsPlay; 
             }
             tB.goalsFor += scoreB; tB.goalsAgainst += scoreA; 
          }

          let winner = null;
          if (!isWoA && !isWoB) {
            if (scoreA > scoreB) winner = 'A';
            else if (scoreB > scoreA) winner = 'B';
            else if (penA !== null && penB !== null) {
                if (penA > penB) winner = 'A'; else if (penB > penA) winner = 'B';
            }
          }

          if (winner === 'A' && tA) { tA.totalWins += 1; tA.globalPoints += ptsWin; } 
          else if (winner === 'B' && tB) { tB.totalWins += 1; tB.globalPoints += ptsWin; }
          else if (!winner && !isWoA && !isWoB) {
              if (tA) { tA.totalDraws += 1; tA.globalPoints += ptsDraw; }
              if (tB) { tB.totalDraws += 1; tB.globalPoints += ptsDraw; }
          }
        }
      });

      (competitions || []).forEach(c => {
        if (!c.rounds) return;
        const isFlash = c.category === 'copa_flash';
        const ptsOitavas = isFlash ? PONTOS.FLASH.OITAVAS : PONTOS.NORMAL.OITAVAS;
        const ptsQuartas = isFlash ? PONTOS.FLASH.QUARTAS : PONTOS.NORMAL.QUARTAS;
        const ptsSemi = isFlash ? PONTOS.FLASH.SEMI : PONTOS.NORMAL.SEMI;
        const ptsThird = isFlash ? PONTOS.FLASH.TERCEIRO : PONTOS.NORMAL.TERCEIRO;
        const ptsVice = isFlash ? PONTOS.FLASH.VICE : PONTOS.NORMAL.VICE;
        const ptsChamp = isFlash ? PONTOS.FLASH.CAMPEAO : PONTOS.NORMAL.CAMPEAO;

        const koRounds = c.rounds.filter(r => r.id.includes('ko') || c.format === 'cup');
        let semiTeams = new Set(); let finalTeams = new Set();

        koRounds.forEach(r => {
          r.matches.forEach(m => {
            const tA = stats[m.teamA]; const tB = stats[m.teamB];

            if (r.number === 'Oitavas') { if(tA) tA.globalPoints += ptsOitavas; if(tB) tB.globalPoints += ptsOitavas; }
            if (r.number === 'Quartas') { if(tA) tA.globalPoints += ptsQuartas; if(tB) tB.globalPoints += ptsQuartas; }
            if (r.number === 'Semifinal') { if(tA) { tA.globalPoints += ptsSemi; semiTeams.add(m.teamA); } if(tB) { tB.globalPoints += ptsSemi; semiTeams.add(m.teamB); } }
            
            if (r.number === 'Final') {
              if(tA) finalTeams.add(m.teamA); if(tB) finalTeams.add(m.teamB);
              const sUI = matches.find(x => x.matchId === m.id && x.compId === c.id && x.status === 'approved');
              if (sUI) {
                let scoreA = Number(sUI.scoreA||0); let scoreB = Number(sUI.scoreB||0);
                let penA = sUI.penaltiesA !== null && sUI.penaltiesA !== undefined ? Number(sUI.penaltiesA) : null;
                let penB = sUI.penaltiesB !== null && sUI.penaltiesB !== undefined ? Number(sUI.penaltiesB) : null;
                
                let winnerId = null; let loserId = null;
                if (scoreA > scoreB) { winnerId = m.teamA; loserId = m.teamB; }
                else if (scoreB > scoreA) { winnerId = m.teamB; loserId = m.teamA; }
                else if (penA !== null && penB !== null) {
                    if (penA > penB) { winnerId = m.teamA; loserId = m.teamB; }
                    else if (penB > penA) { winnerId = m.teamB; loserId = m.teamA; }
                }

                if (winnerId && stats[winnerId]) { stats[winnerId].globalPoints += ptsChamp; stats[winnerId].titles += 1; }
                if (loserId && stats[loserId]) { stats[loserId].globalPoints += ptsVice; }
              }
            }
          });
        });
        semiTeams.forEach(tId => { if (!finalTeams.has(tId) && stats[tId]) stats[tId].globalPoints += ptsThird; });
      });

      const updatePromises = Object.keys(stats).map(teamId => {
        const tStats = stats[teamId];
        if (tStats.playedMatches > 0 || tStats.globalPoints !== 0) {
          return updateDoc(getPublicDocPath('teams', teamId), {
            globalPoints: tStats.globalPoints,
            playedMatches: tStats.playedMatches,
            totalWins: tStats.totalWins,
            totalDraws: tStats.totalDraws,
            goalsFor: tStats.goalsFor,
            goalsAgainst: tStats.goalsAgainst,
            titles: tStats.titles
          });
        }
        return Promise.resolve();
      });

      await Promise.all(updatePromises);
      showToast("Histórico sincronizado com sucesso! Punições de W.O aplicadas.", "success");

    } catch (error) {
      console.error("Erro na sincronização:", error);
      showToast("Ocorreu um erro ao sincronizar.", "error");
    }
  };

  // 🌟 NOVO MOTOR DE EXTRATO DO JOGADOR
  const extratoData = useMemo(() => {
    if (!currentUser) return [];
    const myTeam = (teams || []).find(t => t.ownerId === currentUser.id);
    if (!myTeam) return [];

    const events = [];

    (competitions || []).forEach(c => {
        if (c.teams && c.teams.includes(myTeam.id)) {
            const isFlash = c.category === 'copa_flash';
            events.push({
                id: `join_${c.id}`,
                date: c.deadline ? new Date(c.deadline).getTime() : Date.now(),
                title: `Inscrição: ${c.name}`,
                pts: isFlash ? 2 : 10
            });
        }

        if (c.rounds) {
            const isFlash = c.category === 'copa_flash';
            const ptsOitavas = isFlash ? 0 : 5; const ptsQuartas = isFlash ? 2 : 10;
            const ptsSemi = isFlash ? 5 : 15; const ptsThird = isFlash ? 5 : 15;
            const ptsVice = isFlash ? 10 : 25; const ptsChamp = isFlash ? 20 : 50;

            const koRounds = c.rounds.filter(r => r.id.includes('ko') || c.format === 'cup');
            koRounds.forEach(r => {
                r.matches.forEach(m => {
                    if (m.teamA === myTeam.id || m.teamB === myTeam.id) {
                        const matchDate = parseInt(m.id.split('_')[1] || Date.now());

                        if (r.number === 'Oitavas' && ptsOitavas > 0) events.push({ id: `oitavas_${m.id}`, date: matchDate, title: `Avançou: Oitavas - ${c.name}`, pts: ptsOitavas });
                        if (r.number === 'Quartas' && ptsQuartas > 0) events.push({ id: `quartas_${m.id}`, date: matchDate, title: `Avançou: Quartas - ${c.name}`, pts: ptsQuartas });
                        if (r.number === 'Semifinal' && ptsSemi > 0) events.push({ id: `semi_${m.id}`, date: matchDate, title: `Avançou: Semifinal - ${c.name}`, pts: ptsSemi });

                        if (r.number === 'Final') {
                            const sUI = matches.find(x => x.matchId === m.id && x.compId === c.id && x.status === 'approved');
                            if (sUI) {
                                let scoreA = Number(sUI.scoreA||0); let scoreB = Number(sUI.scoreB||0);
                                let penA = sUI.penaltiesA !== null ? Number(sUI.penaltiesA) : null; let penB = sUI.penaltiesB !== null ? Number(sUI.penaltiesB) : null;
                                
                                let winnerId = null; 
                                if (scoreA > scoreB) winnerId = m.teamA; else if (scoreB > scoreA) winnerId = m.teamB;
                                else if (penA !== null && penB !== null) { if (penA > penB) winnerId = m.teamA; else if (penB > penA) winnerId = m.teamB; }

                                if (m.id.includes('_3rd') && winnerId === myTeam.id) {
                                    events.push({ id: `third_${m.id}`, date: matchDate, title: `3º Lugar: ${c.name}`, pts: ptsThird });
                                } else if (!m.id.includes('_3rd')) {
                                    if (winnerId === myTeam.id) events.push({ id: `champ_${m.id}`, date: matchDate, title: `🏆 Campeão: ${c.name}`, pts: ptsChamp });
                                    else if (winnerId && winnerId !== myTeam.id) events.push({ id: `vice_${m.id}`, date: matchDate, title: `🥈 Vice-Campeão: ${c.name}`, pts: ptsVice });
                                }
                            }
                        }
                    }
                });
            });
        }
    });

    (matches || []).forEach(m => {
        if (m.status === 'approved' && (m.teamA === myTeam.id || m.teamB === myTeam.id)) {
            const c = competitions.find(comp => comp.id === m.compId);
            if (!c) return; 
            const isFlash = c.category === 'copa_flash';
            const ptsPlay = isFlash ? PONTOS.FLASH.PLAY : PONTOS.NORMAL.PLAY; 
            const ptsWin = isFlash ? PONTOS.FLASH.WIN : PONTOS.NORMAL.WIN; 
            const ptsDraw = isFlash ? PONTOS.FLASH.DRAW : PONTOS.NORMAL.DRAW;

            const matchDate = parseInt(String(m.id).split('_')[1] || Date.now());
            const oppId = m.teamA === myTeam.id ? m.teamB : m.teamA;
            const oppName = teams.find(t => t.id === oppId)?.name || 'Adversário';

            let isWoMe = false;
            const obs = (m.observacoes || '').toLowerCase();
            if (obs.includes('w.o') || obs.includes('wo')) {
                if (obs.includes('duplo')) isWoMe = true;
                else if (m.teamA === myTeam.id && m.scoreA === 0 && m.scoreB === 3) isWoMe = true;
                else if (m.teamB === myTeam.id && m.scoreB === 0 && m.scoreA === 3) isWoMe = true;
            }

            if (isWoMe) {
                events.push({ id: `wo_${m.id}`, date: matchDate + 1, title: `🛑 Punição por W.O. vs ${oppName}`, pts: -10 });
            } else {
                events.push({ id: `play_${m.id}`, date: matchDate, title: `Partida Jogada vs ${oppName}`, pts: ptsPlay });

                let scoreMe = m.teamA === myTeam.id ? Number(m.scoreA||0) : Number(m.scoreB||0);
                let scoreOpp = m.teamA === myTeam.id ? Number(m.scoreB||0) : Number(m.scoreA||0);
                let penMe = m.teamA === myTeam.id ? m.penaltiesA : m.penaltiesB;
                let penOpp = m.teamA === myTeam.id ? m.penaltiesB : m.penaltiesA;

                if (scoreMe > scoreOpp) {
                    events.push({ id: `win_${m.id}`, date: matchDate + 1, title: `Vitória vs ${oppName}`, pts: ptsWin });
                } else if (scoreMe === scoreOpp && penMe !== null && penOpp !== null && Number(penMe) > Number(penOpp)) {
                    events.push({ id: `winpen_${m.id}`, date: matchDate + 1, title: `Vitória (Pênaltis) vs ${oppName}`, pts: ptsWin });
                } else if (scoreMe === scoreOpp && penMe === null && ptsDraw > 0) {
                    events.push({ id: `draw_${m.id}`, date: matchDate + 1, title: `Empate vs ${oppName}`, pts: ptsDraw });
                }
            }
        }
    });

    return events.sort((a,b) => b.date - a.date);
  }, [competitions, matches, teams, currentUser]);

  // 🌟 SISTEMA DE XCLÃ / SELETIVAS
  const [xclas, setXclas] = useState(() => {
    try { return JSON.parse(localStorage.getItem('kame_xclas_db')) || []; }
    catch (e) { return []; }
  });

  const [newXclaName, setNewXclaName] = useState('');
  const [newXclaSquad, setNewXclaSquad] = useState('A');
  const [newXclaSeletivaSize, setNewXclaSeletivaSize] = useState('8');
  const [newXclaTitularesCount, setNewXclaTitularesCount] = useState('5');
  const [newXclaReservasCount, setNewXclaReservasCount] = useState('2');
  
  const [guaranteedMembroSuperior, setGuaranteedMembroSuperior] = useState('');
  const [guaranteedProfessor, setGuaranteedProfessor] = useState('');

  const [manualAddTitular, setManualAddTitular] = useState('');
  const [manualAddReserva, setManualAddReserva] = useState('');

  const [selectedActiveXclaId, setSelectedActiveXclaId] = useState(null);
  const [newOpponentName, setNewOpponentName] = useState('');
  const [newMatchKameId, setNewMatchKameId] = useState('');
  const [newMatchOppName, setNewMatchOppName] = useState('');
  const [newNewsText, setNewNewsText] = useState('');

  useEffect(() => {
    try {
      localStorage.setItem('kame_xclas_db', JSON.stringify(xclas));
    } catch(e) {
      console.warn("Sem permissão para salvar histórico local na aba anônima.");
    }
  }, [xclas]);

  const createMiniBracket = (teamsArr) => {
    let shuffled = [...teamsArr].sort(() => Math.random() - 0.5);
    const rounds = [];
    let matchId = 1;
    
    let currentMatches = [];
    for(let i=0; i<shuffled.length; i+=2) {
      currentMatches.push({ id: matchId++, tA: shuffled[i], tB: shuffled[i+1] || null, scoreA: '', scoreB: '', winner: null });
    }
    rounds.push(currentMatches);
    
    let prevSize = currentMatches.length;
    while(prevSize > 1) {
      let nextMatches = [];
      for(let i=0; i<prevSize; i+=2) {
          nextMatches.push({ id: matchId++, tA: null, tB: null, scoreA: '', scoreB: '', winner: null });
      }
      rounds.push(nextMatches);
      prevSize = nextMatches.length;
    }
    return rounds;
  };

  const isTeamInOtherSquad = (teamId, tournamentName, currentXclaId) => {
    return xclas.some(x => 
      x.name.trim().toLowerCase() === tournamentName.trim().toLowerCase() && 
      x.id !== currentXclaId && 
      ((x.titulares || []).some(t => t.id === teamId) || (x.reservas || []).some(t => t.id === teamId))
    );
  };

  const handleGenerateXcla = (e) => {
    e.preventDefault();
    const selSize = parseInt(newXclaSeletivaSize, 10);
    if (!newXclaName || !selSize || selSize <= 0) { showToast("Preencha o nome e um número válido para a seletiva.", "error"); return; }
    if (rankingData.length === 0) { showToast("Não há times no ranking para convocar.", "error"); return; }

    let pool = [...rankingData];
    let startingTitulares = [];

    if (newXclaSquad === 'A') {
      if (guaranteedMembroSuperior) {
         const t = teams.find(x => x.id === guaranteedMembroSuperior);
         if (t) { startingTitulares.push({...t, isGuaranteed: 'Membro Superior'}); pool = pool.filter(x => x.id !== guaranteedMembroSuperior); }
      }
      if (guaranteedProfessor) {
         const t = teams.find(x => x.id === guaranteedProfessor);
         if (t && t.id !== guaranteedMembroSuperior) { startingTitulares.push({...t, isGuaranteed: 'Convite Professor'}); pool = pool.filter(x => x.id !== guaranteedProfessor); }
      }
    }

    const alreadyRosteredIds = new Set();
    xclas.forEach(x => {
       if (x.name.trim().toLowerCase() === newXclaName.trim().toLowerCase()) {
          (x.titulares || []).forEach(t => alreadyRosteredIds.add(t.id));
          (x.reservas || []).forEach(t => alreadyRosteredIds.add(t.id));
       }
    });
    pool = pool.filter(t => !alreadyRosteredIds.has(t.id));

    let draftedTeams = newXclaSquad === 'A' ? pool.slice(0, selSize) : pool.slice(selSize, selSize * 2);

    if (draftedTeams.length === 0) { showToast("Não existem times disponíveis no ranking para gerar esta seletiva. Todos já estão alocados.", "error"); return; }

    const newXcla = {
      id: `xcla_${Date.now()}`, name: newXclaName, squad: newXclaSquad,
      titularesMax: parseInt(newXclaTitularesCount, 10) || 5, reservasMax: parseInt(newXclaReservasCount, 10) || 2,
      titulares: startingTitulares, reservas: [], bracket: createMiniBracket(draftedTeams), date: Date.now(), status: 'open',
      oppClanName: 'Clã Adversário', pointsKame: 0, pointsOpp: 0, opponentsList: [], xclaMatches: [], news: []
    };

    setXclas([newXcla, ...xclas]);
    setNewXclaName('');
    showToast(`Seletiva do Time ${newXclaSquad} gerada com sucesso!`, "success");
  };

  const handleDeleteXcla = (id) => {
    if(window.confirm('Excluir esta convocação definitivamente?')) {
      setXclas(xclas.filter(x => x.id !== id));
      if (selectedActiveXclaId === id) setSelectedActiveXclaId(null);
      showToast("Convocação removida do histórico.", "success");
    }
  };

  const handleLockRoster = (xclaId) => {
    const xcla = xclas.find(x => x.id === xclaId);
    if((xcla.titulares || []).length === 0) { showToast("Você precisa ter pelo menos 1 titular para fechar o time!", "error"); return; }
    if(window.confirm('Deseja FECHAR a escalação final? O time será trancado e a competição movida para a aba "Competições Ativas".')) {
      const newXclas = xclas.map(x => x.id === xclaId ? { ...x, status: 'locked', oppClanName: x.oppClanName || 'Clã Adversário', pointsKame: x.pointsKame || 0, pointsOpp: x.pointsOpp || 0, opponentsList: x.opponentsList || [], xclaMatches: x.xclaMatches || [], news: x.news || [] } : x);
      setXclas(newXclas); showToast("A Escalação foi trancada e movida para Competições Ativas!", "success");
    }
  };

  const updateActiveXcla = (id, payload) => { setXclas(prev => prev.map(x => x.id === id ? { ...x, ...payload } : x)); };

  const updateBracketMatch = (xclaId, roundIdx, matchIdx, field, value) => {
    const newXclas = [...xclas]; const xcla = newXclas.find(x => x.id === xclaId);
    if (!xcla || xcla.status === 'locked') return;
    const match = xcla.bracket[roundIdx][matchIdx]; match[field] = value;
    if (field === 'scoreA' || field === 'scoreB') {
      const sA = parseInt(match.scoreA); const sB = parseInt(match.scoreB);
      if (!isNaN(sA) && !isNaN(sB) && sA !== sB) { match.winner = sA > sB ? match.tA : match.tB; advanceWinnerInternally(xcla, roundIdx, matchIdx, match.winner); } else { match.winner = null; }
    }
    setXclas(newXclas);
  };

  const advanceWinnerInternally = (xcla, roundIdx, matchIdx, winnerTeam) => {
    if (roundIdx < xcla.bracket.length - 1) {
      const nextMatchIdx = Math.floor(matchIdx / 2); const isTeamA = matchIdx % 2 === 0;
      if (isTeamA) { xcla.bracket[roundIdx + 1][nextMatchIdx].tA = winnerTeam; } else { xcla.bracket[roundIdx + 1][nextMatchIdx].tB = winnerTeam; }
      xcla.bracket[roundIdx + 1][nextMatchIdx].winner = null; xcla.bracket[roundIdx + 1][nextMatchIdx].scoreA = ''; xcla.bracket[roundIdx + 1][nextMatchIdx].scoreB = ''; 
    }
  };

  const forceAdvanceTeam = (xclaId, roundIdx, matchIdx, winnerTeam) => {
    if (!winnerTeam || !isAdmin) return;
    const newXclas = [...xclas]; const xcla = newXclas.find(x => x.id === xclaId);
    if (!xcla || xcla.status === 'locked') return;
    xcla.bracket[roundIdx][matchIdx].winner = winnerTeam; advanceWinnerInternally(xcla, roundIdx, matchIdx, winnerTeam); setXclas(newXclas);
  };

  const handleAutoFillRoster = (xclaId) => {
    const xcla = xclas.find(x => x.id === xclaId);
    if(!xcla || xcla.status === 'locked') return;
    const teamStats = {};
    xcla.bracket.forEach((round, rIdx) => {
      round.forEach(m => {
        if(m.tA) {
          if(!teamStats[m.tA.id]) teamStats[m.tA.id] = { ...m.tA, maxPhase: rIdx, gf: 0, gd: 0, wins: 0 }; teamStats[m.tA.id].maxPhase = rIdx;
          if(m.scoreA !== '') { const sA = Number(m.scoreA), sB = Number(m.scoreB || 0); teamStats[m.tA.id].gf += sA; teamStats[m.tA.id].gd += (sA - sB); if(sA > sB || m.winner?.id === m.tA.id) teamStats[m.tA.id].wins++; }
        }
        if(m.tB) {
          if(!teamStats[m.tB.id]) teamStats[m.tB.id] = { ...m.tB, maxPhase: rIdx, gf: 0, gd: 0, wins: 0 }; teamStats[m.tB.id].maxPhase = rIdx;
          if(m.scoreB !== '') { const sB = Number(m.scoreB), sA = Number(m.scoreA || 0); teamStats[m.tB.id].gf += sB; teamStats[m.tB.id].gd += (sB - sA); if(sB > sA || m.winner?.id === m.tB.id) teamStats[m.tB.id].wins++; }
        }
      });
    });
    const sortedTeams = Object.values(teamStats).sort((a,b) => { if(b.maxPhase !== a.maxPhase) return b.maxPhase - a.maxPhase; if(b.wins !== a.wins) return b.wins - a.wins; if(b.gd !== a.gd) return b.gd - a.gd; return b.gf - a.gf; });
    const newTitulares = [...(xcla.titulares || []).filter(t => t.isGuaranteed || t.isManual)];
    const newReservas = [...(xcla.reservas || []).filter(t => t.isManual)];
    sortedTeams.forEach(t => {
      if(!newTitulares.some(x => x.id === t.id) && !newReservas.some(x => x.id === t.id)) {
        if(newTitulares.length < xcla.titularesMax) { newTitulares.push({...t, isAuto: true}); } else if(newReservas.length < xcla.reservasMax) { newReservas.push({...t, isAuto: true}); }
      }
    });
    const newXclas = xclas.map(x => x.id === xclaId ? { ...x, titulares: newTitulares, reservas: newReservas } : x); setXclas(newXclas); showToast("Escalação montada baseada no desempenho da seletiva!", "success");
  };

  const addTeamToRoster = (xclaId, listType, teamId) => {
    if (!teamId) return; const teamObj = teams.find(t => t.id === teamId); if (!teamObj) return;
    const newXclas = [...xclas]; const xcla = newXclas.find(x => x.id === xclaId); if (xcla.status === 'locked') return;
    if ((xcla.titulares || []).some(t => t.id === teamId) || (xcla.reservas || []).some(t => t.id === teamId)) { showToast("Este time já está convocado nesta escalação!", "warning"); return; }
    if (isTeamInOtherSquad(teamId, xcla.name, xcla.id)) { showToast("Este time já foi escalado em outro Esquadrão para este campeonato!", "error"); return; }
    if (listType === 'titulares') {
      if ((xcla.titulares || []).length >= xcla.titularesMax) { showToast(`Limite de titulares (${xcla.titularesMax}) atingido!`, "error"); return; } xcla.titulares.push({...teamObj, isManual: true});
    } else {
      if ((xcla.reservas || []).length >= xcla.reservasMax) { showToast(`Limite de reservas (${xcla.reservasMax}) atingido!`, "error"); return; } xcla.reservas.push({...teamObj, isManual: true});
    }
    setXclas(newXclas); setManualAddTitular(''); setManualAddReserva(''); showToast(`Time adicionado aos ${listType}!`, "success");
  };

  const removeTeamFromRoster = (xclaId, listType, teamId) => {
    const newXclas = [...xclas]; const xcla = newXclas.find(x => x.id === xclaId); if (xcla.status === 'locked') return;
    if (listType === 'titulares') xcla.titulares = (xcla.titulares || []).filter(t => t.id !== teamId); else xcla.reservas = (xcla.reservas || []).filter(t => t.id !== teamId);
    setXclas(newXclas);
  };

  const handleAddOpponentPlayer = (xclaId) => {
    if(!newOpponentName) return; const xcla = xclas.find(x => x.id === xclaId); const updatedOpps = [...(xcla.opponentsList || []), newOpponentName];
    updateActiveXcla(xclaId, { opponentsList: updatedOpps }); setNewOpponentName('');
  };

  const handleAddXclaMatch = (xclaId) => {
    if(!newMatchKameId || !newMatchOppName) { showToast("Selecione os dois jogadores!", "error"); return; }
    const xcla = xclas.find(x => x.id === xclaId); const newMatch = { id: `xm_${Date.now()}`, kameId: newMatchKameId, oppName: newMatchOppName, scoreKame: '', scoreOpp: '' };
    updateActiveXcla(xclaId, { xclaMatches: [...(xcla.xclaMatches || []), newMatch] }); setNewMatchKameId(''); setNewMatchOppName('');
  };

  const handleUpdateXclaMatchScore = (xclaId, matchId, field, value) => {
    const xcla = xclas.find(x => x.id === xclaId); const updatedMatches = (xcla.xclaMatches || []).map(m => m.id === matchId ? { ...m, [field]: value } : m);
    updateActiveXcla(xclaId, { xclaMatches: updatedMatches });
  };

  const handleAddXclaNews = (xclaId) => {
    if(!newNewsText) return; const xcla = xclas.find(x => x.id === xclaId); const newNews = { id: `n_${Date.now()}`, text: newNewsText, timestamp: Date.now() };
    updateActiveXcla(xclaId, { news: [newNews, ...(xcla.news || [])] }); setNewNewsText('');
  };

  const openSeletivas = xclas.filter(x => x.status !== 'locked');
  const activeCompetitions = xclas.filter(x => x.status === 'locked');
  const selectedActiveXcla = selectedActiveXclaId ? xclas.find(x => x.id === selectedActiveXclaId) : null;

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-12">
      <div className="bg-gradient-to-r from-blue-900 to-blue-950 p-6 rounded-3xl border border-blue-800 shadow-xl flex flex-col md:flex-row items-center gap-4 w-full">
        <div className="bg-blue-950 p-4 rounded-full border-2 border-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.3)]">
          <Crown size={32} className="text-amber-500 animate-pulse" />
        </div>
        <div className="text-center md:text-left flex-1 w-full">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
             <div>
               <h2 className="text-2xl font-black text-white uppercase tracking-wider">Ranking Global Xclã</h2>
               <p className="text-sm text-blue-400 mt-1">A meritocracia do Clã Kame. Jogue, avance e conquiste seu lugar no topo.</p>
             </div>
             {isAdmin && (
               <div className="flex gap-2">
                 <button onClick={() => setShowPointsTable(!showPointsTable)} className="bg-blue-800 hover:bg-blue-700 text-blue-300 font-bold py-2 px-4 rounded-xl text-xs flex items-center gap-2 transition-colors border border-blue-700">
                   📋 Tabela de Pontos
                 </button>
                 <button onClick={handleSyncHistory} className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2 px-4 rounded-xl text-xs flex items-center gap-2 transition-colors shadow-lg shrink-0">
                   🔄 Restaurar Pontos Antigos
                 </button>
               </div>
             )}
             {!isAdmin && (
               <button onClick={() => setShowPointsTable(!showPointsTable)} className="bg-blue-800 hover:bg-blue-700 text-blue-300 font-bold py-2 px-4 rounded-xl text-xs flex items-center gap-2 transition-colors border border-blue-700">
                 📋 Tabela de Pontos
               </button>
             )}
          </div>
        </div>
      </div>

      {/* 🌟 TABELA DE PONTUAÇÃO (GAVETA) */}
      {showPointsTable && (
        <div className="bg-blue-900/60 p-5 rounded-2xl border border-blue-800 animate-in slide-in-from-top-2 shadow-inner">
          <h4 className="text-amber-400 font-bold mb-4 flex items-center gap-2 text-lg"><Target size={18}/> Como ganhar KAME POINTS?</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm text-blue-200">
             
             {/* Torneios Oficiais */}
             <div className="bg-blue-950 p-4 rounded-xl border border-blue-800 shadow-md">
               <p className="font-bold text-white mb-3 pb-2 border-b border-blue-800/50 flex items-center gap-2"><Trophy size={16}/> Ligas e Copas Oficiais</p>
               <ul className="space-y-2.5">
                 <li className="flex justify-between items-center"><span>Inscrição Confirmada</span> <span className="font-black text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">+1 pts</span></li>
                 <li className="flex justify-between items-center"><span>Partida Jogada</span> <span className="font-black text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">+2 pts</span></li>
                 <li className="flex justify-between items-center"><span>Vitória na Partida</span> <span className="font-black text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">+10 pts</span></li>
                 <li className="flex justify-between items-center"><span>Empate</span> <span className="font-black text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20">+1 pt</span></li>
                 <li className="flex justify-between items-center"><span>Avanço Oitavas (Mata-Mata)</span> <span className="font-black text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">+15 pts</span></li>
                 <li className="flex justify-between items-center"><span>Avanço Quartas (Mata-Mata)</span> <span className="font-black text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">+20 pts</span></li>
                 <li className="flex justify-between items-center"><span>Avanço Semifinal (Mata-Mata)</span> <span className="font-black text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">+35 pts</span></li>
                 <li className="flex justify-between items-center text-amber-400 font-bold mt-3 pt-3 border-t border-blue-800/50"><span>🥉 3º Lugar</span> <span>+40 pts</span></li>
                 <li className="flex justify-between items-center text-amber-400 font-bold"><span>🥈 Vice-Campeão</span> <span>+50 pts</span></li>
                 <li className="flex justify-between items-center text-amber-400 font-bold"><span>🥇 Campeão</span> <span>+100 pts</span></li>
               </ul>
             </div>

             {/* Copa Flash */}
             <div className="bg-blue-950 p-4 rounded-xl border border-amber-500/30 shadow-md">
               <p className="font-bold text-amber-400 mb-3 pb-2 border-b border-blue-800/50 flex items-center gap-2"><Activity size={16}/> Copa Flash (Tiro Curto)</p>
               <ul className="space-y-2.5">
                 <li className="flex justify-between items-center"><span>Inscrição Confirmada</span> <span className="font-black text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">+1 pts</span></li>
                 <li className="flex justify-between items-center"><span>Partida Jogada</span> <span className="font-black text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">+2 pt</span></li>
                 <li className="flex justify-between items-center"><span>Vitória na Partida</span> <span className="font-black text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">+3 pt</span></li>
                 <li className="flex justify-between items-center opacity-50"><span>Empate (Não há em Flash)</span> <span className="font-black text-slate-400">0 pts</span></li>
                 <li className="flex justify-between items-center opacity-50"><span>Avanço Oitavas</span> <span className="font-black text-slate-400">0 pts</span></li>
                 <li className="flex justify-between items-center"><span>Avanço Quartas (Mata-Mata)</span> <span className="font-black text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">+5 pts</span></li>
                 <li className="flex justify-between items-center"><span>Avanço Semifinal (Mata-Mata)</span> <span className="font-black text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">+10 pts</span></li>
                 <li className="flex justify-between items-center text-amber-400 font-bold mt-3 pt-3 border-t border-blue-800/50"><span>🥉 3º Lugar</span> <span>+15 pts</span></li>
                 <li className="flex justify-between items-center text-amber-400 font-bold"><span>🥈 Vice-Campeão</span> <span>+20 pts</span></li>
                 <li className="flex justify-between items-center text-amber-400 font-bold"><span>🥇 Campeão</span> <span>+40 pts</span></li>
               </ul>
               
               <div className="mt-4 bg-red-500/10 p-3 rounded-lg border border-red-500/20">
                 <p className="text-[11px] text-red-400 font-bold flex justify-between items-center"><span>🛑 Punição por W.O (Geral)</span> <span className="bg-red-500 text-white px-2 py-0.5 rounded">-10 pts</span></p>
               </div>
             </div>
          </div>
        </div>
      )}

      {/* 🌟 NAVEGAÇÃO DE ABAS DO RANKING */}
      <div className="flex gap-1.5 p-1.5 bg-blue-950 rounded-xl border border-blue-800 overflow-x-auto custom-scrollbar">
        <button onClick={() => {setActiveTab('ranking'); setSelectedActiveXclaId(null);}} className={`shrink-0 flex-1 py-2 px-3 text-xs md:text-sm rounded-lg font-bold transition-all ${activeTab === 'ranking' ? 'bg-amber-600 text-white shadow-md' : 'text-blue-500 hover:text-white'}`}>
          🏆 Ranking
        </button>
        <button onClick={() => {setActiveTab('extrato'); setSelectedActiveXclaId(null);}} className={`shrink-0 flex-1 py-2 px-3 text-xs md:text-sm rounded-lg font-bold transition-all ${activeTab === 'extrato' ? 'bg-indigo-600 text-white shadow-md' : 'text-blue-500 hover:text-white'}`}>
          📜 Meu Extrato
        </button>
        <button onClick={() => {setActiveTab('xcla'); setSelectedActiveXclaId(null);}} className={`shrink-0 flex-1 py-2 px-3 text-xs md:text-sm rounded-lg font-bold transition-all ${activeTab === 'xcla' ? 'bg-purple-600 text-white shadow-md' : 'text-blue-500 hover:text-white'}`}>
          ⚔️ Seletivas ({openSeletivas.length})
        </button>
        <button onClick={() => setActiveTab('active_xclas')} className={`shrink-0 flex-1 py-2 px-3 text-xs md:text-sm rounded-lg font-bold transition-all ${activeTab === 'active_xclas' ? 'bg-emerald-600 text-white shadow-md' : 'text-blue-500 hover:text-white'}`}>
          🔥 Competições Ativas ({activeCompetitions.length})
        </button>
      </div>

      {/* 🏆 CONTEÚDO: RANKING PRINCIPAL */}
      {activeTab === 'ranking' && (
        <div className="bg-blue-950 rounded-3xl border border-blue-800 shadow-2xl overflow-hidden animate-in slide-in-from-left-4">
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-blue-900 text-blue-300 font-bold border-b border-blue-800">
                <tr>
                  <th className="p-4 w-16 text-center">Pos</th>
                  <th className="p-4">Técnico / Clube</th>
                  <th className="p-4 text-center">Patente</th>
                  <th className="p-4 text-center">Pts Xclã</th>
                  <th className="p-4 text-center">Jogos</th>
                  <th className="p-4 text-center">V / E</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-blue-800/40">
                {rankingData.length === 0 ? (
                  <tr><td colSpan="6" className="p-8 text-center text-blue-500">O ranking será gerado assim que houver participações e jogos oficiais.</td></tr>
                ) : (
                  rankingData.map((t, index) => {
                    const pts = t.globalPoints || 0;
                    const badge = getBadge(pts);
                    const nextBadge = getNextBadgeInfo(pts); // 🌟 Puxa quanto falta para o próximo nível
                    const isTop3 = index < 3;
                    const rankColors = ['text-amber-400', 'text-slate-300', 'text-amber-700'];
                    
                    return (
                      <tr key={t.id} className={`hover:bg-blue-900/50 transition-colors ${index === 0 ? 'bg-amber-500/5' : ''}`}>
                        <td className="p-4 text-center">
                          <span className={`text-xl font-black ${isTop3 ? rankColors[index] : 'text-blue-500'}`}>
                            {index + 1}º
                          </span>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <ShieldDisplay shield={t.shield} size="small" />
                            <div className="flex flex-col">
                              <span className="font-bold text-white text-base leading-tight">{t.coach}</span>
                              <span className="text-[10px] text-blue-400 uppercase font-medium">{t.name}</span>
                            </div>
                          </div>
                        </td>
                        <td className="p-4 text-center">
                          <div className="flex flex-col items-center justify-center">
                            <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-bold ${badge.color}`}>
                              <span>{badge.icon}</span> {badge.label}
                            </div>
                            {/* 🌟 Exibição visual dos pontos restantes */}
                            {nextBadge && (
                              <span className="text-[9px] text-blue-300 mt-1.5 font-medium bg-blue-900/50 px-2 py-0.5 rounded shadow-inner border border-blue-800">
                                Faltam <b className="text-emerald-400">{nextBadge.next - pts} pts</b> para {nextBadge.label}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="p-4 text-center">
                          <span className={`text-2xl font-black drop-shadow-md ${index === 0 ? 'text-amber-500' : 'text-emerald-400'}`}>
                            {pts}
                          </span>
                        </td>
                        <td className="p-4 text-center text-blue-200 font-medium">{t.playedMatches || 0}</td>
                        <td className="p-4 text-center text-blue-300 font-medium">
                          <span className="text-emerald-400">{t.totalWins || 0}</span> / <span className="text-blue-400">{t.totalDraws || 0}</span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 📜 CONTEÚDO: EXTRATO DE PONTOS */}
      {activeTab === 'extrato' && (
        <div className="bg-blue-950 rounded-3xl border border-blue-800 shadow-2xl overflow-hidden animate-in slide-in-from-right-4 p-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
              <div>
                <h3 className="text-xl font-black text-white uppercase tracking-wider">Meu Extrato Xclã</h3>
                <p className="text-xs text-blue-400 mt-1">Histórico completo de pontuações e penalidades do seu time.</p>
              </div>
              <div className="bg-blue-900 border border-blue-700 px-6 py-3 rounded-xl text-center shadow-inner w-full sm:w-auto">
                <p className="text-[10px] text-blue-400 uppercase font-bold mb-1">Saldo Atual</p>
                <p className="text-2xl font-black text-emerald-400">{extratoData.reduce((acc, ev) => acc + ev.pts, 0)} Pts</p>
              </div>
          </div>

          {extratoData.length === 0 ? (
              <div className="text-center p-8 bg-blue-900/50 rounded-2xl border border-blue-800 border-dashed text-blue-500">
                 Nenhuma movimentação de pontos encontrada no seu histórico.
              </div>
          ) : (
              <div className="space-y-3 max-h-[500px] overflow-y-auto custom-scrollbar pr-2">
                  {extratoData.map((ev, idx) => (
                      <div key={idx} className="flex justify-between items-center bg-blue-900/40 p-4 rounded-xl border border-blue-800/50 hover:bg-blue-800/40 transition-colors">
                          <div>
                              <p className="text-sm font-bold text-white leading-tight">{ev.title}</p>
                              <p className="text-[10px] text-blue-400 mt-1">{new Date(ev.date).toLocaleDateString('pt-BR')} às {new Date(ev.date).toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'})}</p>
                          </div>
                          <div className={`text-lg font-black px-3 py-1 rounded-lg ${ev.pts > 0 ? 'text-emerald-400 bg-emerald-500/10' : ev.pts < 0 ? 'text-red-400 bg-red-500/10' : 'text-blue-300 bg-blue-500/10'}`}>
                              {ev.pts > 0 ? `+${ev.pts}` : ev.pts}
                          </div>
                      </div>
                  ))}
              </div>
          )}
        </div>
      )}

      {/* ⚔️ CONTEÚDO: SELETIVAS / XCLÃ */}
      {activeTab === 'xcla' && (
        <div className="space-y-8 animate-in slide-in-from-right-4">
          
          {isAdmin && (
            <form onSubmit={handleGenerateXcla} className="bg-purple-900/40 border border-purple-500/50 rounded-2xl p-5 md:p-6 shadow-xl space-y-4">
              <h3 className="font-bold text-purple-400 uppercase tracking-widest flex items-center gap-2 mb-2"><Target size={18}/> Gerar Nova Seletiva</h3>
              <p className="text-xs text-blue-300">A minicompetição puxará os times do Ranking Global. Os placares geram um critério de desempate para a Escalação Final.</p>
              
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                <div className="md:col-span-2">
                  <label className="text-[10px] text-blue-400 font-bold uppercase block mb-1">Nome do Torneio (Xclã)</label>
                  <input type="text" placeholder="Ex: Copa NFA" value={newXclaName} onChange={e=>setNewXclaName(e.target.value)} className="w-full bg-blue-950 border border-purple-500/40 rounded-lg p-2.5 text-white text-sm outline-none focus:border-purple-400" required />
                </div>
                
                <div>
                  <label className="text-[10px] text-blue-400 font-bold uppercase block mb-1">Esquadrão</label>
                  <select value={newXclaSquad} onChange={e=>setNewXclaSquad(e.target.value)} className="w-full bg-blue-950 border border-purple-500/40 rounded-lg p-2.5 text-white font-bold text-sm outline-none focus:border-purple-400">
                    <option value="A">Time A (Titulares)</option>
                    <option value="B">Time B (Aspirantes)</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] text-blue-400 font-bold uppercase block mb-1">Qtd. Titulares</label>
                  <input type="number" min="1" value={newXclaTitularesCount} onChange={e=>setNewXclaTitularesCount(e.target.value)} className="w-full bg-blue-950 border border-purple-500/40 rounded-lg p-2.5 text-white font-bold text-sm outline-none focus:border-purple-400" required />
                </div>

                <div>
                  <label className="text-[10px] text-blue-400 font-bold uppercase block mb-1">Qtd. Reservas</label>
                  <input type="number" min="0" value={newXclaReservasCount} onChange={e=>setNewXclaReservasCount(e.target.value)} className="w-full bg-blue-950 border border-purple-500/40 rounded-lg p-2.5 text-white font-bold text-sm outline-none focus:border-purple-400" required />
                </div>
              </div>

              {/* 🌟 Vagas Garantidas */}
              {newXclaSquad === 'A' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-purple-800/50">
                  <div>
                    <label className="text-[10px] text-amber-400 font-bold uppercase block mb-1">👑 Vaga Garantida: Membro Superior</label>
                    <select value={guaranteedMembroSuperior} onChange={e=>setGuaranteedMembroSuperior(e.target.value)} className="w-full bg-blue-950 border border-amber-500/40 rounded-lg p-2 text-white text-xs outline-none focus:border-amber-400">
                      <option value="">(Nenhum)</option>
                      {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] text-amber-400 font-bold uppercase block mb-1">🎟️ Vaga Garantida: Convite da Cápsula</label>
                    <select value={guaranteedProfessor} onChange={e=>setGuaranteedProfessor(e.target.value)} className="w-full bg-blue-950 border border-amber-500/40 rounded-lg p-2 text-white text-xs outline-none focus:border-amber-400">
                      <option value="">(Nenhum)</option>
                      {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </select>
                  </div>
                </div>
              )}

              <div className="flex flex-col md:flex-row gap-4 items-center justify-between border-t border-purple-800/50 pt-4">
                <div className="w-full md:w-auto">
                  <label className="text-[10px] text-blue-400 font-bold uppercase block mb-1">Tamanho da Seletiva (Mata-Mata)</label>
                  <select value={newXclaSeletivaSize} onChange={e=>setNewXclaSeletivaSize(e.target.value)} className="w-full md:w-64 bg-blue-950 border border-purple-500/40 rounded-lg p-2.5 text-purple-300 font-bold text-sm outline-none focus:border-purple-400">
                    <option value="4">4 Times (Semifinal Direta)</option>
                    <option value="8">8 Times (Quartas de Final)</option>
                    <option value="16">16 Times (Oitavas de Final)</option>
                    <option value="32">32 Times (16 Avos)</option>
                  </select>
                </div>
                
                <button type="submit" className="w-full md:w-auto bg-purple-600 hover:bg-purple-500 text-white font-bold py-2.5 px-8 rounded-lg shadow-lg transition-colors">
                  Gerar Minicompetição
                </button>
              </div>
            </form>
          )}

          <div className="space-y-8">
            {openSeletivas.length === 0 ? (
              <div className="bg-blue-950 p-8 rounded-2xl border border-blue-800 text-center border-dashed">
                <p className="text-blue-500">Nenhuma seletiva de Xclã aberta no momento.</p>
              </div>
            ) : (
              openSeletivas.map((xcla) => {
                const isSquadA = xcla.squad === 'A';
                const colorClass = isSquadA ? 'emerald' : 'amber';
                const teamCount = (xcla.titulares?.length || 0) + (xcla.reservas?.length || 0);

                return (
                  <div key={xcla.id} className="bg-blue-900 border border-blue-700 rounded-3xl overflow-hidden shadow-2xl relative flex flex-col xl:flex-row">
                    
                    {isAdmin && (
                      <div className="absolute top-4 right-4 flex gap-2 z-20">
                        <button onClick={() => handleLockRoster(xcla.id)} className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-3 py-1.5 rounded-lg shadow-md text-xs flex items-center gap-1">
                          🔒 Fechar Time
                        </button>
                        <button onClick={() => handleDeleteXcla(xcla.id)} className="bg-red-500/20 text-red-400 hover:bg-red-500 hover:text-white p-1.5 rounded-lg transition-colors" title="Apagar Convocação">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    )}
                    
                    <div className="flex-1 p-5 md:p-6 bg-gradient-to-br from-blue-900/50 to-blue-950/80 border-b xl:border-b-0 xl:border-r border-blue-800">
                      <div className="mb-6 border-b border-blue-800/50 pb-4 pr-32">
                        <span className={`text-[10px] bg-${colorClass}-500/20 text-${colorClass}-400 px-2.5 py-0.5 rounded-full font-black tracking-widest uppercase inline-block border border-${colorClass}-500/30 mb-2`}>
                          Seletiva para o Time {xcla.squad}
                        </span>
                        <h3 className="text-xl font-black text-white uppercase tracking-wider flex items-center gap-2"><Target size={20}/> {xcla.name}</h3>
                        <p className="text-xs text-blue-400 mt-1">Coloque os placares. Em caso de empate, clique no escudo do time vencedor para avançar de fase!</p>
                      </div>

                      <div className="flex gap-6 overflow-x-auto custom-scrollbar pb-4">
                        {xcla.bracket.map((round, rIdx) => (
                          <div key={rIdx} className="flex flex-col justify-around gap-3 min-w-[200px]">
                            {round.map((m, mIdx) => (
                              <div key={m.id} className="bg-blue-950 border border-blue-800 rounded-xl p-2 flex flex-col gap-1.5 shadow-inner">
                                <div className={`flex items-center justify-between p-1.5 rounded-lg transition-colors ${m.winner?.id === m.tA?.id ? `bg-${colorClass}-500/20 border border-${colorClass}-500/50` : 'border border-transparent'}`}>
                                  <div onClick={() => forceAdvanceTeam(xcla.id, rIdx, mIdx, m.tA)} className="flex items-center gap-1.5 cursor-pointer flex-1 min-w-0" title="Forçar Vitória">
                                    <ShieldDisplay shield={m.tA?.shield} size="small" /> 
                                    <span className={`text-[10px] font-bold truncate ${m.winner?.id === m.tA?.id ? `text-${colorClass}-400` : 'text-blue-200'}`}>{m.tA?.name || 'A Definir'}</span>
                                  </div>
                                  <input type="number" min="0" value={m.scoreA||''} onChange={e=>updateBracketMatch(xcla.id, rIdx, mIdx, 'scoreA', e.target.value)} className="w-8 h-6 bg-blue-900 border border-blue-700 rounded text-center text-[10px] text-white outline-none focus:border-amber-500 shrink-0" placeholder="-" />
                                </div>
                                <div className="h-px w-full bg-blue-800/50 mx-auto w-[90%]"></div>
                                <div className={`flex items-center justify-between p-1.5 rounded-lg transition-colors ${m.winner?.id === m.tB?.id ? `bg-${colorClass}-500/20 border border-${colorClass}-500/50` : 'border border-transparent'}`}>
                                  <div onClick={() => forceAdvanceTeam(xcla.id, rIdx, mIdx, m.tB)} className="flex items-center gap-1.5 cursor-pointer flex-1 min-w-0" title="Forçar Vitória">
                                    <ShieldDisplay shield={m.tB?.shield} size="small" /> 
                                    <span className={`text-[10px] font-bold truncate ${m.winner?.id === m.tB?.id ? `text-${colorClass}-400` : 'text-blue-200'}`}>{m.tB?.name || 'A Definir'}</span>
                                  </div>
                                  <input type="number" min="0" value={m.scoreB||''} onChange={e=>updateBracketMatch(xcla.id, rIdx, mIdx, 'scoreB', e.target.value)} className="w-8 h-6 bg-blue-900 border border-blue-700 rounded text-center text-[10px] text-white outline-none focus:border-amber-500 shrink-0" placeholder="-" />
                                </div>
                              </div>
                            ))}
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="w-full xl:w-[380px] p-5 md:p-6 bg-blue-900/40 flex flex-col gap-6">
                      <div className="text-center">
                        <h4 className="text-lg font-black text-white uppercase tracking-widest mb-1">📋 Escalação Final</h4>
                        <p className="text-[10px] text-blue-400">Total Convocado: {teamCount} Técnicos</p>
                      </div>

                      {isAdmin && (
                        <button onClick={() => handleAutoFillRoster(xcla.id)} className="w-full py-2.5 text-[11px] font-black uppercase tracking-wider bg-purple-600 hover:bg-purple-500 text-white rounded-lg shadow-md border-0 transition-colors flex items-center justify-center gap-2">
                          ⚡ Puxar Resultados da Seletiva
                        </button>
                      )}

                      <div>
                        <div className="flex justify-between items-end mb-2">
                          <h5 className={`text-sm font-bold text-${colorClass}-400 uppercase`}>Titulares ({(xcla.titulares || []).length}/{xcla.titularesMax})</h5>
                        </div>
                        <div className="space-y-2 bg-blue-950 p-2 rounded-xl border border-blue-800 min-h-[80px]">
                          {(xcla.titulares || []).length === 0 ? <p className="text-xs text-blue-500 text-center py-4">Vazio</p> : (
                            xcla.titulares.map(t => (
                              <div key={t.id} className={`flex items-center justify-between bg-blue-900/50 p-2 rounded-lg border border-${colorClass}-500/20 group`}>
                                <div className="flex items-center gap-2 min-w-0">
                                  <ShieldDisplay shield={t.shield} size="small" />
                                  <div className="flex flex-col min-w-0">
                                    <span className="text-xs font-bold text-white truncate">{t.name}</span>
                                    {t.isGuaranteed && <span className="text-[8px] text-amber-400 uppercase">{t.isGuaranteed}</span>}
                                    {t.isAuto && <span className="text-[8px] text-emerald-400 uppercase">🏆 Via Seletiva</span>}
                                  </div>
                                </div>
                                {isAdmin && <button onClick={() => removeTeamFromRoster(xcla.id, 'titulares', t.id)} className="text-blue-500 hover:text-red-400 p-1 md:opacity-0 md:group-hover:opacity-100 transition-opacity"><X size={14}/></button>}
                              </div>
                            ))
                          )}
                        </div>
                        {isAdmin && (xcla.titulares || []).length < xcla.titularesMax && (
                          <div className="flex gap-2 mt-2">
                            <select value={manualAddTitular} onChange={e=>setManualAddTitular(e.target.value)} className="flex-1 bg-blue-950 border border-blue-700 text-blue-300 text-xs rounded p-1.5 outline-none">
                              <option value="">Selecionar manualmente...</option>
                              {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                            </select>
                            <button onClick={() => addTeamToRoster(xcla.id, 'titulares', manualAddTitular)} className={`bg-${colorClass}-600 hover:bg-${colorClass}-500 text-white px-2 rounded font-bold text-xs`}>Add</button>
                          </div>
                        )}
                      </div>

                      <div>
                        <div className="flex justify-between items-end mb-2">
                          <h5 className="text-sm font-bold text-blue-300 uppercase">Reservas ({(xcla.reservas || []).length}/{xcla.reservasMax})</h5>
                        </div>
                        <div className="space-y-2 bg-blue-950 p-2 rounded-xl border border-blue-800 min-h-[80px]">
                          {(xcla.reservas || []).length === 0 ? <p className="text-xs text-blue-500 text-center py-4">Vazio</p> : (
                            xcla.reservas.map(t => (
                              <div key={t.id} className="flex items-center justify-between bg-blue-900/50 p-2 rounded-lg border border-blue-700/50 group">
                                <div className="flex items-center gap-2 min-w-0">
                                  <ShieldDisplay shield={t.shield} size="small" />
                                  <div className="flex flex-col min-w-0">
                                    <span className="text-xs font-bold text-blue-100 truncate">{t.name}</span>
                                    {t.isAuto && <span className="text-[8px] text-emerald-400 uppercase">🏆 Via Seletiva</span>}
                                  </div>
                                </div>
                                {isAdmin && <button onClick={() => removeTeamFromRoster(xcla.id, 'reservas', t.id)} className="text-blue-500 hover:text-red-400 p-1 md:opacity-0 md:group-hover:opacity-100 transition-opacity"><X size={14}/></button>}
                              </div>
                            ))
                          )}
                        </div>
                        {isAdmin && (xcla.reservas || []).length < xcla.reservasMax && (
                          <div className="flex gap-2 mt-2">
                            <select value={manualAddReserva} onChange={e=>setManualAddReserva(e.target.value)} className="flex-1 bg-blue-950 border border-blue-700 text-blue-300 text-xs rounded p-1.5 outline-none">
                              <option value="">Selecionar manualmente...</option>
                              {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                            </select>
                            <button onClick={() => addTeamToRoster(xcla.id, 'reservas', manualAddReserva)} className="bg-blue-700 hover:bg-blue-600 text-white px-2 rounded font-bold text-xs">Add</button>
                          </div>
                        )}
                      </div>

                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* 🔥 CONTEÚDO: COMPETIÇÕES ATIVAS (XCLÃ FECHADO) */}
      {activeTab === 'active_xclas' && (
        <div className="space-y-6 animate-in slide-in-from-right-4">
          
          {selectedActiveXcla ? (
            <div className="bg-blue-900 border border-blue-700 rounded-3xl overflow-hidden shadow-2xl flex flex-col">
              
              <div className="bg-gradient-to-br from-blue-950 to-blue-900 p-6 border-b border-blue-800 relative">
                 <button onClick={() => setSelectedActiveXclaId(null)} className="absolute top-6 left-6 text-blue-400 hover:text-white flex items-center gap-1 text-xs">
                   <ArrowLeft size={14}/> Voltar
                 </button>
                 
                 <div className="text-center mt-6 mb-4">
                   <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-3 py-1 rounded-full font-black tracking-widest uppercase border border-emerald-500/30">
                     Time {selectedActiveXcla.squad} • Xclã em Andamento
                   </span>
                   <h2 className="text-3xl font-black text-white uppercase tracking-wider mt-3">{selectedActiveXcla.name}</h2>
                 </div>

                 <div className="flex items-center justify-center gap-4 sm:gap-8 mt-6">
                    <div className="flex flex-col items-center flex-1">
                      <ShieldDisplay shield="🛡️" size="large" />
                      <span className="font-black text-white text-lg mt-2 uppercase tracking-wide">Clã Kame</span>
                      {isAdmin && (
                        <div className="flex items-center gap-2 mt-2">
                          <button onClick={() => updateActiveXcla(selectedActiveXcla.id, {pointsKame: Math.max(0, selectedActiveXcla.pointsKame - 1)})} className="bg-blue-800 w-6 h-6 rounded text-white font-bold hover:bg-blue-700 transition-colors">-</button>
                          <span className="text-xs text-blue-300">Pts</span>
                          <button onClick={() => updateActiveXcla(selectedActiveXcla.id, {pointsKame: selectedActiveXcla.pointsKame + 1})} className="bg-blue-800 w-6 h-6 rounded text-white font-bold hover:bg-blue-700 transition-colors">+</button>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                       <span className="text-5xl font-black text-emerald-400 drop-shadow-lg">{selectedActiveXcla.pointsKame}</span>
                       <span className="text-2xl font-black text-blue-600">X</span>
                       <span className="text-5xl font-black text-red-400 drop-shadow-lg">{selectedActiveXcla.pointsOpp}</span>
                    </div>

                    <div className="flex flex-col items-center flex-1">
                      <ShieldDisplay shield="⚔️" size="large" />
                      {isAdmin ? (
                        <input 
                          type="text" 
                          value={selectedActiveXcla.oppClanName || ''} 
                          onChange={e => updateActiveXcla(selectedActiveXcla.id, {oppClanName: e.target.value})}
                          onClick={e => e.stopPropagation()} 
                          placeholder="Adversário"
                          className="text-[10px] text-red-300 font-bold uppercase bg-blue-950 border border-blue-700 rounded text-center w-full outline-none focus:border-red-500 mb-1"
                        />
                      ) : (
                        <span className="text-[10px] text-blue-400 font-bold uppercase truncate w-full text-center mb-1">{selectedActiveXcla.oppClanName || 'Adversário'}</span>
                      )}
                      
                      {isAdmin && (
                        <div className="flex items-center gap-2 mt-2">
                          <button onClick={() => updateActiveXcla(selectedActiveXcla.id, {pointsOpp: Math.max(0, selectedActiveXcla.pointsOpp - 1)})} className="bg-blue-800 w-6 h-6 rounded text-white font-bold hover:bg-blue-700 transition-colors">-</button>
                          <span className="text-xs text-blue-300">Pts</span>
                          <button onClick={() => updateActiveXcla(selectedActiveXcla.id, {pointsOpp: selectedActiveXcla.pointsOpp + 1})} className="bg-blue-800 w-6 h-6 rounded text-white font-bold hover:bg-blue-700 transition-colors">+</button>
                        </div>
                      )}
                    </div>
                 </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-1 divide-y lg:divide-y-0 lg:divide-x divide-blue-800">
                 
                 <div className="p-6 bg-blue-900/50 space-y-6">
                    <div>
                      <h4 className="text-sm font-black text-blue-300 uppercase tracking-widest mb-3 flex items-center gap-2"><Shield size={16}/> Elenco Convocado</h4>
                      <div className="space-y-1.5">
                        <p className="text-[10px] text-emerald-400 font-bold uppercase border-b border-blue-800 pb-1 mb-1">Titulares</p>
                        {(selectedActiveXcla.titulares || []).map(t => (
                          <div key={t.id} className="text-xs text-white bg-blue-950 p-2 rounded border border-blue-800 flex items-center gap-2"><ShieldDisplay shield={t.shield} size="small"/> {t.name}</div>
                        ))}
                        {(selectedActiveXcla.reservas || []).length > 0 && (
                          <>
                            <p className="text-[10px] text-amber-400 font-bold uppercase border-b border-blue-800 pb-1 mb-1 mt-3">Reservas</p>
                            {(selectedActiveXcla.reservas || []).map(t => (
                              <div key={t.id} className="text-xs text-white bg-blue-950 p-2 rounded border border-blue-800 flex items-center gap-2"><ShieldDisplay shield={t.shield} size="small"/> {t.name}</div>
                            ))}
                          </>
                        )}
                      </div>
                    </div>

                    <div>
                      <h4 className="text-sm font-black text-red-400 uppercase tracking-widest mb-3 flex items-center gap-2"><Users size={16}/> Lista de Adversários</h4>
                      {isAdmin && (
                        <div className="flex gap-2 mb-3">
                          <input type="text" placeholder="Nome do adversário..." value={newOpponentName} onChange={e=>setNewOpponentName(e.target.value)} className="flex-1 bg-blue-950 border border-blue-700 rounded p-1.5 text-xs text-white outline-none" />
                          <button onClick={() => handleAddOpponentPlayer(selectedActiveXcla.id)} className="bg-red-600 hover:bg-red-500 text-white px-2 rounded text-xs font-bold">+</button>
                        </div>
                      )}
                      <div className="space-y-1.5 max-h-[200px] overflow-y-auto custom-scrollbar pr-1">
                         {!(selectedActiveXcla.opponentsList?.length > 0) ? <p className="text-xs text-blue-500 italic">Nenhum adversário mapeado.</p> : (
                           selectedActiveXcla.opponentsList.map((opp, idx) => (
                             <div key={idx} className="text-xs text-red-200 bg-red-950/30 p-2 rounded border border-red-900/50 flex items-center gap-2">
                               <span className="w-4 h-4 bg-red-900 flex justify-center items-center rounded text-[8px]">⚔️</span> {opp}
                             </div>
                           ))
                         )}
                      </div>
                    </div>
                 </div>

                 <div className="p-6 bg-blue-950/30 lg:col-span-1 space-y-6">
                    <div className="flex justify-between items-center mb-2">
                       <h4 className="text-sm font-black text-amber-400 uppercase tracking-widest flex items-center gap-2"><Trophy size={16}/> Confrontos Oficiais</h4>
                    </div>

                    {isAdmin && (
                      <div className="bg-blue-900 border border-blue-700 p-3 rounded-xl space-y-2 mb-4">
                        <p className="text-[10px] text-blue-300 font-bold uppercase">Criar Novo Confronto</p>
                        <select value={newMatchKameId} onChange={e=>setNewMatchKameId(e.target.value)} className="w-full bg-blue-950 border border-blue-800 rounded p-1.5 text-xs text-emerald-400 outline-none">
                          <option value="">Selecione o jogador Kame...</option>
                          {(selectedActiveXcla.titulares || []).map(t => <option key={t.id} value={t.id}>{t.name} (Titular)</option>)}
                          {(selectedActiveXcla.reservas || []).map(t => <option key={t.id} value={t.id}>{t.name} (Reserva)</option>)}
                        </select>
                        <div className="text-center text-[10px] text-blue-500 font-black">VERSUS</div>
                        <select value={newMatchOppName} onChange={e=>setNewMatchOppName(e.target.value)} className="w-full bg-blue-950 border border-blue-800 rounded p-1.5 text-xs text-red-400 outline-none">
                          <option value="">Selecione o adversário...</option>
                          {(selectedActiveXcla.opponentsList || []).map((o,i) => <option key={i} value={o}>{o}</option>)}
                        </select>
                        <button onClick={() => handleAddXclaMatch(selectedActiveXcla.id)} className="w-full bg-amber-600 hover:bg-amber-500 text-white font-bold py-1.5 rounded text-xs mt-1 shadow-md">Adicionar Jogo</button>
                      </div>
                    )}

                    <div className="space-y-3 max-h-[500px] overflow-y-auto custom-scrollbar pr-2">
                      {!(selectedActiveXcla.xclaMatches?.length > 0) ? <p className="text-xs text-blue-500 italic text-center">Nenhum confronto registrado.</p> : (
                        selectedActiveXcla.xclaMatches.map(m => {
                          const kameT = [...(selectedActiveXcla.titulares || []), ...(selectedActiveXcla.reservas || [])].find(t => t.id === m.kameId);
                          return (
                            <div key={m.id} className="bg-blue-900 border border-blue-800 rounded-xl p-3 shadow-sm relative group">
                               {isAdmin && (
                                 <button onClick={() => {
                                   if(window.confirm('Apagar confronto?')) {
                                     updateActiveXcla(selectedActiveXcla.id, { xclaMatches: selectedActiveXcla.xclaMatches.filter(x => x.id !== m.id) })
                                   }
                                 }} className="absolute top-2 right-2 text-blue-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"><X size={12}/></button>
                               )}
                               
                               <div className="flex items-center justify-between px-2">
                                 <div className="flex flex-col items-center w-1/3">
                                   <ShieldDisplay shield={kameT?.shield} size="small"/>
                                   <span className="text-[10px] font-bold text-emerald-400 mt-1 truncate w-full text-center">{kameT?.name}</span>
                                 </div>
                                 <div className="flex flex-col items-center justify-center w-1/3">
                                   <span className="text-[8px] text-blue-400 mb-1">PLACAR</span>
                                   <div className="flex gap-1 items-center bg-blue-950 px-2 py-1 rounded border border-blue-800">
                                      <input type="number" min="0" disabled={!isAdmin} value={m.scoreKame} onChange={e=>handleUpdateXclaMatchScore(selectedActiveXcla.id, m.id, 'scoreKame', e.target.value)} className="w-6 h-6 bg-transparent text-center text-sm font-black text-emerald-400 outline-none" placeholder="-" />
                                      <span className="text-blue-500 font-black text-xs">x</span>
                                      <input type="number" min="0" disabled={!isAdmin} value={m.scoreOpp} onChange={e=>handleUpdateXclaMatchScore(selectedActiveXcla.id, m.id, 'scoreOpp', e.target.value)} className="w-6 h-6 bg-transparent text-center text-sm font-black text-red-400 outline-none" placeholder="-" />
                                   </div>
                                 </div>
                                 <div className="flex flex-col items-center w-1/3">
                                   <span className="text-2xl drop-shadow-md">⚔️</span>
                                   <span className="text-[10px] font-bold text-red-300 mt-1 truncate w-full text-center">{m.oppName}</span>
                                 </div>
                               </div>
                            </div>
                          )
                        })
                      )}
                    </div>
                 </div>

                 <div className="p-6 bg-blue-900/50 space-y-4">
                    <h4 className="text-sm font-black text-sky-400 uppercase tracking-widest mb-3 flex items-center gap-2"><MessageCircle size={16}/> Resenha / Atualizações</h4>
                    
                    {isAdmin && (
                      <div className="flex gap-2">
                        <textarea value={newNewsText} onChange={e=>setNewNewsText(e.target.value)} placeholder="Narrar o que está acontecendo..." className="flex-1 bg-blue-950 border border-blue-700 rounded-lg p-2 text-xs text-white outline-none resize-none h-12 custom-scrollbar focus:border-sky-500" />
                        <button onClick={() => handleAddXclaNews(selectedActiveXcla.id)} className="bg-sky-600 hover:bg-sky-500 text-white px-3 rounded-lg text-xs font-bold">Postar</button>
                      </div>
                    )}

                    <div className="space-y-3 max-h-[400px] overflow-y-auto custom-scrollbar pr-2 mt-4">
                       {!(selectedActiveXcla.news?.length > 0) ? <p className="text-xs text-blue-500 italic text-center">Nenhuma notícia publicada ainda.</p> : (
                         selectedActiveXcla.news.map(n => (
                           <div key={n.id} className="bg-blue-950 border-l-2 border-sky-500 p-3 rounded-r-lg shadow-sm">
                             <div className="flex justify-between items-start mb-1">
                               <p className="text-[9px] text-blue-400">{new Date(n.timestamp).toLocaleDateString()} às {new Date(n.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
                               {isAdmin && <button onClick={() => {
                                 if(window.confirm('Apagar notícia?')) updateActiveXcla(selectedActiveXcla.id, {news: selectedActiveXcla.news.filter(x => x.id !== n.id)});
                               }} className="text-[9px] text-red-400/50 hover:text-red-400">Excluir</button>}
                             </div>
                             <p className="text-xs text-blue-100 whitespace-pre-wrap leading-relaxed">{n.text}</p>
                           </div>
                         ))
                       )}
                    </div>
                 </div>

              </div>
            </div>
          ) : (
            <>
              {activeCompetitions.length === 0 ? (
                <div className="bg-blue-950 p-8 rounded-2xl border border-blue-800 text-center border-dashed">
                  <p className="text-blue-500">Nenhum Xclã em andamento. Feche uma seletiva para ela aparecer aqui.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {activeCompetitions.map(xcla => (
                    <div key={xcla.id} onClick={() => setSelectedActiveXclaId(xcla.id)} className="bg-blue-900 border border-emerald-500/30 hover:border-emerald-400 rounded-2xl p-5 cursor-pointer shadow-lg transition-all group relative overflow-hidden flex flex-col justify-between">
                       <div className="absolute top-0 right-0 bg-emerald-600 text-white text-[9px] font-black uppercase px-3 py-1 rounded-bl-xl shadow-md">
                         Time {xcla.squad}
                       </div>
                       
                       <h3 className="text-xl font-black text-white uppercase tracking-wider mb-2 group-hover:text-emerald-400 transition-colors">{xcla.name}</h3>
                       
                       <div className="flex items-center gap-4 mt-2 mb-2">
                          <div className="flex flex-col items-center w-[40%]">
                            <span className="text-[10px] text-blue-400 font-bold uppercase mb-1">Clã Kame</span>
                            <span className="text-3xl font-black text-emerald-400 leading-none">{xcla.pointsKame || 0}</span>
                          </div>
                          
                          <span className="text-blue-600 font-black text-xl leading-none">X</span>
                          
                          <div className="flex flex-col items-center w-[40%]">
                            {isAdmin ? (
                              <input 
                                type="text" 
                                value={xcla.oppClanName || ''} 
                                onChange={e => updateActiveXcla(xcla.id, {oppClanName: e.target.value})}
                                onClick={e => e.stopPropagation()} 
                                placeholder="Adversário"
                                className="text-[10px] text-red-300 font-bold uppercase bg-blue-950 border border-blue-700 rounded text-center w-full outline-none focus:border-red-500 mb-1"
                              />
                            ) : (
                              <span className="text-[10px] text-blue-400 font-bold uppercase truncate w-full text-center mb-1">{xcla.oppClanName || 'Adversário'}</span>
                            )}
                            <span className="text-3xl font-black text-red-400 leading-none">{xcla.pointsOpp || 0}</span>
                          </div>
                       </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}

    </div>
  );
};

export default GlobalRanking;

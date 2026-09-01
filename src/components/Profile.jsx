import React, { useState, useMemo } from 'react';
import { UploadCloud, Medal, Star, Trophy, Activity } from 'lucide-react';
import { updateDoc } from 'firebase/firestore';
import { getPublicDocPath } from '../utils/firebase';
import ShieldDisplay from './ShieldDisplay';
import { processImage, ROLE_NAMES } from '../utils/helpers';
import { calculateStandings, getChampionIds } from '../utils/torneios';
import { PONTOS } from '../utils/pontuacoes';
//Corrigido

const Profile = ({ currentUser, teams, matches, competitions, onEditTeam, onUpdateUserPhoto }) => { 
  const userTeams = teams.filter(t => t.ownerId === currentUser.id);

  // 🌟 NOVO: Controle das gavetas (acordeão) abertas/fechadas
  const [expandedCats, setExpandedCats] = useState({});

  // 🧠 MOTOR DE RANKING ESPELHADO
  const rankingData = useMemo(() => {
    let stats = {};
    (teams || []).forEach(t => { if(t && t.ownerId) stats[t.id] = { ...t, points: 0, played: 0, wins: 0, titles: 0 }; });

    (competitions || []).forEach(c => {
      const ptsJoin = c.category === 'copa_flash' ? PONTOS.FLASH.JOIN : PONTOS.NORMAL.JOIN;
      if (c && c.teams) c.teams.forEach(tId => { if(stats[tId]) stats[tId].points += ptsJoin; });
    });

    (matches || []).forEach(m => {
      if (m.status === 'approved') {
        const c = (competitions || []).find(comp => comp.id === m.compId);
        if (!c) return; // 👈 Ignora partidas de torneios excluídos
        
        const isFlash = c.category === 'copa_flash';
        const ptsPlay = isFlash ? PONTOS.FLASH.PLAY : PONTOS.NORMAL.PLAY;
        const ptsWin = isFlash ? PONTOS.FLASH.WIN : PONTOS.NORMAL.WIN;
        const ptsDraw = isFlash ? PONTOS.FLASH.DRAW : PONTOS.NORMAL.DRAW;

        const tA = stats[m.teamA]; const tB = stats[m.teamB];
        if(tA) { tA.played += 1; tA.points += ptsPlay; }
        if(tB) { tB.played += 1; tB.points += ptsPlay; }

        let scoreA = Number(m.scoreA||0); let scoreB = Number(m.scoreB||0);
        let penA = m.penaltiesA !== null && m.penaltiesA !== undefined ? Number(m.penaltiesA) : null;
        let penB = m.penaltiesB !== null && m.penaltiesB !== undefined ? Number(m.penaltiesB) : null;

        let winner = null;
        if (scoreA > scoreB) winner = 'A';
        else if (scoreB > scoreA) winner = 'B';
        else if (penA !== null && penB !== null) {
            if (penA > penB) winner = 'A'; else if (penB > penA) winner = 'B';
        } else {
            if (tA) tA.points += ptsDraw; if (tB) tB.points += ptsDraw;
        }

        if (winner === 'A' && tA) { tA.wins += 1; tA.points += ptsWin; }
        else if (winner === 'B' && tB) { tB.wins += 1; tB.points += ptsWin; }
      }
    });

    (competitions || []).forEach(c => {
      if (!c.rounds) return;
      
      const isFlash = c.category === 'copa_flash';
      // 🌟 OS VALORES DINÂMICOS SÃO CHAMADOS AQUI
      const ptsOitavas = isFlash ? PONTOS.FLASH.OITAVAS : PONTOS.NORMAL.OITAVAS;
      const ptsQuartas = isFlash ? PONTOS.FLASH.QUARTAS : PONTOS.NORMAL.QUARTAS;
      const ptsSemi = isFlash ? PONTOS.FLASH.SEMI : PONTOS.NORMAL.SEMI;
      const ptsThird = isFlash ? PONTOS.FLASH.TERCEIRO : PONTOS.NORMAL.TERCEIRO;
      const ptsVice = isFlash ? PONTOS.FLASH.VICE : PONTOS.NORMAL.VICE;
      const ptsChamp = isFlash ? PONTOS.FLASH.CAMPEAO : PONTOS.NORMAL.CAMPEAO;

      const koRounds = c.rounds.filter(r => r.id.includes('ko') || c.format === 'cup');
      let semiTeams = new Set(); 

      koRounds.forEach(r => {
        r.matches.forEach(m => {
          const tA = stats[m.teamA]; const tB = stats[m.teamB];
          if (r.number === 'Oitavas') { if(tA) tA.points += ptsOitavas; if(tB) tB.points += ptsOitavas; }
          if (r.number === 'Quartas') { if(tA) tA.points += ptsQuartas; if(tB) tB.points += ptsQuartas; }
          if (r.number === 'Semifinal') { if(tA) { tA.points += ptsSemi; semiTeams.add(m.teamA); } if(tB) { tB.points += ptsSemi; semiTeams.add(m.teamB); } }
          
          if (r.number === 'Final' && m.id.includes('_3rd')) {
             const sUI = matches.find(x => x.matchId === m.id && x.compId === c.id && x.status === 'approved');
             if (sUI) {
                const scoreA = Number(sUI.scoreA||0); const scoreB = Number(sUI.scoreB||0);
                const penA = sUI.penaltiesA !== null && sUI.penaltiesA !== undefined ? Number(sUI.penaltiesA) : null;
                const penB = sUI.penaltiesB !== null && sUI.penaltiesB !== undefined ? Number(sUI.penaltiesB) : null;
                let winnerId = null;
                if (scoreA > scoreB) winnerId = m.teamA;
                else if (scoreB > scoreA) winnerId = m.teamB;
                else if (penA !== null && penB !== null) { if (penA > penB) winnerId = m.teamA; else if (penB > penA) winnerId = m.teamB; }
                
                if (winnerId && stats[winnerId]) stats[winnerId].points += ptsThird;
             }
          }
        });
      });
      
      const champIds = getChampionIds(c, matches, teams);
      if (champIds.length > 0) {
         champIds.forEach(id => {
            if (stats[id]) { stats[id].points += ptsChamp; stats[id].titles += 1; }
         });

         const finalMatches = koRounds[koRounds.length - 1]?.matches.filter(m => !m.id.includes('_3rd')) || [];
         let viceIds = [];
         
         if (c.category === 'copa_flash_dupla' && finalMatches.length >= 2) {
             const mIda = finalMatches[0];
             if (champIds.includes(mIda.duplaA?.p1)) {
                 viceIds = [mIda.duplaB?.p1, mIda.duplaB?.p2].filter(Boolean);
             } else {
                 viceIds = [mIda.duplaA?.p1, mIda.duplaA?.p2].filter(Boolean);
             }
         } else if (finalMatches.length > 0) {
             const viceId = finalMatches[0].teamA === champIds[0] ? finalMatches[0].teamB : finalMatches[0].teamA;
             if (viceId) viceIds.push(viceId);
         }
         
         viceIds.forEach(id => {
            if (stats[id]) stats[id].points += ptsVice;
         });
      } else {
         const hasThirdPlaceMatch = koRounds.length > 0 && koRounds[koRounds.length - 1].matches.some(m => m.id.includes('_3rd'));
         if (!hasThirdPlaceMatch) {
            const finalMatch = koRounds[koRounds.length - 1]?.matches[0];
            let finalTeams = new Set();
            if (finalMatch) { finalTeams.add(finalMatch.teamA); finalTeams.add(finalMatch.teamB); }
            semiTeams.forEach(tId => { if (!finalTeams.has(tId) && stats[tId]) stats[tId].points += ptsThird; });
         }
      }
    });

    return Object.values(stats).filter(t => t.played > 0 || t.points > 0).sort((a,b) => b.points - a.points || b.wins - a.wins);
  }, [teams, matches, competitions]);

  const getBadge = (pts) => {
    if (pts >= 1000) return { label: 'Lenda Suprema', icon: '👑' };
    if (pts >= 400) return { label: 'Mestre', icon: '💎' };
    if (pts >= 150) return { label: 'Veterano', icon: '🛡️' };
    return { label: 'Novato', icon: '🔰' };
  };

  const CATEGORY_NAMES = {
    liga_a: '🥇 Liga Kame A', liga_b: '🥈 Liga Kame B', liga_c: '🥉 Liga Kame C', liga_d: '🎖️ Liga Kame D',
    liga_acesso: '⬆️ Liga de Acesso', copa_do_rei: '👑 Copa do Rei', copa_amazonia: '🌳 Copa da Amazônia',
    copa_main: '🏆 Copas Oficiais', copa_estrelas: '⭐ Copa das Estrelas', copa_flash: '⚡ Copa Flash', copa_flash_dupla: '👥 Copa Flash (Dupla)',  outros: '🏅 Outros Torneios'
  };

  const CATEGORY_ORDER = ['liga_a', 'liga_b', 'liga_c', 'liga_d', 'liga_acesso', 'copa_do_rei', 'copa_amazonia', 'copa_main', 'copa_flash', 'outros'];

  if (userTeams.length === 0) {
    return (
      <div className="animate-in fade-in text-center p-12 bg-blue-900 rounded-2xl border border-blue-800">
        <span className="text-6xl mb-4 block">😢</span>
        <h2 className="text-2xl font-bold text-white mb-2">Você ainda não tem um time</h2>
        <p className="text-blue-400">Peça para um líder cadastrar seu time no Clã.</p>
      </div>
    );
  }

  return (
    <div className="animate-in fade-in duration-500 space-y-6">
      <div className="flex flex-col md:flex-row items-center md:items-stretch gap-4">
        {/* Cabeçalho Perfil */}
        <div className="flex-1 w-full flex items-center gap-4 bg-blue-900 p-6 rounded-2xl border border-blue-800 shadow-lg">
          <label className="cursor-pointer relative group flex flex-col items-center shrink-0" title="Clique para trocar sua foto">
            <div className="relative w-24 h-24 bg-blue-800 rounded-full flex items-center justify-center text-3xl border-2 border-emerald-500/30 overflow-hidden shadow-lg">
              {currentUser.photoURL ? <img src={currentUser.photoURL} alt="Perfil" className="w-full h-full object-cover" /> : <span>👤</span>}
              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <UploadCloud size={20} className="text-white" />
              </div>
            </div>
            <input type="file" accept="image/*" className="hidden" onChange={(e) => {
              processImage(e.target.files[0], (base64) => {
                if (onUpdateUserPhoto) onUpdateUserPhoto(base64);
              });
            }} />
          </label>
          <div>
            <h2 className="text-2xl font-bold text-white">{currentUser.name}</h2>
            <p className="text-emerald-400 font-bold tracking-widest text-xs uppercase mt-1">{ROLE_NAMES[currentUser.role] || 'Membro'}</p>
          </div>
        </div>

        {/* CARD DE RANKING GLOBAL NO PERFIL */}
        {userTeams.map(team => {
          const myRankIndex = rankingData.findIndex(t => t.id === team.id);
          const myRank = myRankIndex !== -1 ? myRankIndex + 1 : '-';
          const myPoints = myRankIndex !== -1 ? rankingData[myRankIndex].points : 0;
          const badge = getBadge(myPoints);

          return (
            <div key={`rank_${team.id}`} className="shrink-0 w-full md:w-auto bg-gradient-to-br from-amber-600 to-amber-900 p-6 rounded-2xl border border-amber-500/50 shadow-[0_0_20px_rgba(245,158,11,0.2)] flex flex-col justify-center items-center md:items-end text-center md:text-right">
               <div className="flex items-center gap-2 mb-1">
                 <span className="text-2xl drop-shadow-md">{badge.icon}</span>
                 <p className="text-xs text-amber-100 uppercase font-black tracking-widest">Ranking Xclã</p>
               </div>
               <p className="text-4xl font-black text-white drop-shadow-md">{myRank}º <span className="text-lg font-bold text-amber-200">Lugar</span></p>
               <p className="text-sm font-bold text-amber-100 mt-1 bg-black/20 px-3 py-1 rounded-full shadow-inner">{myPoints} Pontos Clã • {badge.label}</p>
            </div>
          );
        })}
      </div>

      <div className="space-y-8">
        {userTeams.map(team => {
          const teamMatches = matches.filter(m => {
            if (m.status !== 'approved' || (m.teamA !== team.id && m.teamB !== team.id)) return false;
            return !!competitions.find(comp => comp.id === m.compId); // 👈 Filtra apagados
          });
          let wins = 0, draws = 0, losses = 0, gf = 0, ga = 0; let biggestWin = null; let maxGd = -1;

          teamMatches.forEach(m => {
            const isTeamA = m.teamA === team.id;
            const scoreFor = isTeamA ? m.scoreA : m.scoreB;
            const scoreAgainst = isTeamA ? m.scoreB : m.scoreA;
            gf += scoreFor; ga += scoreAgainst;
            if (scoreFor > scoreAgainst) { wins++; const gd = scoreFor - scoreAgainst; if (gd > maxGd) { maxGd = gd; biggestWin = { scoreFor, scoreAgainst, oppId: isTeamA ? m.teamB : m.teamA }; } } 
            else if (scoreFor === scoreAgainst) { draws++; } 
            else { losses++; }
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

          // 🌟 SEPARAÇÃO: Títulos (Botões) x Marcos (Badges)
          const titulos = [];
          const marcos = [];
          
          if (ligaA > 0) titulos.push({ icon: '🥇', title: `LIGA KAME A`, count: ligaA });
          if (ligaB > 0) titulos.push({ icon: '🥈', title: `LIGA KAME B`, count: ligaB });
          if (ligaC > 0) titulos.push({ icon: '🥉', title: `LIGA KAME C`, count: ligaC });
          if (ligaD > 0) titulos.push({ icon: '🎖️', title: `LIGA KAME D`, count: ligaD });
          if (copasFlash > 0) titulos.push({ icon: '⚡', title: `COPA FLASH`, count: copasFlash });

          Object.keys(customTitles).forEach(compName => {
              titulos.push({ icon: '🏆', title: compName.toUpperCase(), count: customTitles[compName] });
          });

          if (wins > 0) marcos.push({ icon: '🌟', title: 'PRIMEIRA VITÓRIA', desc: 'Venceu uma partida oficial' });
          if (gf >= 100) marcos.push({ icon: '⚽', title: 'GOLEADOR', desc: 'Marcou 100 ou mais gols' });
          if (gf >= 500) marcos.push({ icon: '⚽', title: 'MERCENÁRIO', desc: 'Marcou 500 ou mais gols' });
          if (wins >= 50) marcos.push({ icon: '🔥', title: 'ON FIRE', desc: 'Alcançou 50 vitórias no clã' });
          if (teamMatches.length >= 10 && losses === 0) marcos.push({ icon: '🛡️', title: 'MURALHA', desc: 'Invicto após 10+ jogos' });
          if (biggestWin && (biggestWin.scoreFor - biggestWin.scoreAgainst) >= 5) marcos.push({ icon: '⚡', title: 'IMPIEDOSO', desc: 'Venceu com 5+ gols de diferença' });
          if (draws >= 50) marcos.push({ icon: '🤝', title: 'REI DO EMPATE', desc: 'Empatou 50 ou mais vezes' });
          
          // Lógica de Competições Ativas com AGRUPAMENTO
          const activeComps = competitions.filter(c => c.teams?.includes(team.id));
          const groupedComps = {};
          
          activeComps.forEach(comp => {
            const cat = comp.category || 'outros';
            if (!groupedComps[cat]) groupedComps[cat] = [];
            groupedComps[cat].push(comp);
          });

          const sortedCategories = Object.keys(groupedComps).sort((a, b) => {
            let idxA = CATEGORY_ORDER.indexOf(a);
            let idxB = CATEGORY_ORDER.indexOf(b);
            if (idxA === -1) idxA = 99;
            if (idxB === -1) idxB = 99;
            return idxA - idxB;
          });

          return (
            <div key={team.id} className="bg-blue-900 rounded-2xl border border-blue-800 overflow-hidden shadow-xl">
              <div className="bg-blue-950/80 p-6 border-b border-blue-800 flex items-center gap-4">
               <label className="cursor-pointer relative group flex flex-col items-center" title="Clique para trocar o escudo">
                  <div className="relative">
                    <span className="text-5xl"><ShieldDisplay shield={team.shield} size="large" /></span>
                    <div className="absolute -bottom-1 -right-2 bg-emerald-600 rounded-full p-2 shadow-lg opacity-0 group-hover:opacity-100 group-hover:scale-110 transition-all flex items-center justify-center">
                      <UploadCloud size={14} className="text-white" />
                    </div>
                  </div>
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => {
                    processImage(e.target.files[0], (base64) => {
                      if (onEditTeam) onEditTeam({...team, shield: base64});
                    });
                  }} />
                </label>
                <div><h3 className="text-2xl font-bold text-white">{team.name}</h3><p className="text-blue-400 text-sm">Técnico: <span className="text-blue-200 font-bold">{team.coach}</span></p></div>
              </div>

              <div className="p-6 space-y-10">
                
                {/* 🏆 BOTÕES DOS TÍTULOS CONQUISTADOS */}
                <div>
                  <h4 className="text-lg font-bold text-white mb-4 flex items-center gap-2"><Medal className="text-amber-400" size={20}/> Títulos Conquistados</h4>
                  {titulos.length > 0 ? (
                    <div className="flex flex-wrap gap-3">
                      {titulos.map((t, i) => (
                        <button key={i} className="relative group bg-gradient-to-br from-amber-600 to-amber-900 border border-amber-500 hover:border-amber-300 px-5 py-3 rounded-xl shadow-lg flex items-center gap-3 transition-all hover:scale-105 hover:shadow-amber-500/50 cursor-default">
                           <span className="text-2xl drop-shadow-md group-hover:animate-bounce">{t.icon}</span>
                           <div className="text-left">
                              <p className="text-sm font-black text-white leading-none drop-shadow-sm">{t.title}</p>
                              <p className="text-[10px] text-amber-200 font-bold uppercase mt-1 tracking-widest">{t.count}x Campeão</p>
                           </div>
                        </button>
                      ))}
                    </div>
                  ) : ( 
                    <div className="text-center p-6 bg-blue-950 rounded-xl border border-blue-800 border-dashed"><p className="text-blue-500 text-sm">A estante de troféus ainda está vazia. Vença competições para adicionar títulos aqui!</p></div> 
                  )}
                </div>

                {/* 🏅 MARCOS E CONQUISTAS SECUNDÁRIAS */}
                <div>
                  <h4 className="text-lg font-bold text-white mb-4 flex items-center gap-2"><Star className="text-emerald-500" size={20}/> Marcos e Conquistas</h4>
                  {marcos.length > 0 ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                      {marcos.map((c, i) => (
                        <div key={i} className="bg-blue-950 border border-blue-800 hover:border-emerald-500/50 hover:bg-blue-900 p-4 rounded-xl text-center flex flex-col items-center justify-center transition-all group">
                          <span className="text-3xl mb-2 group-hover:scale-110 transition-transform">{c.icon}</span>
                          <p className="text-sm font-bold text-white">{c.title}</p>
                          <p className="text-[10px] mt-1 leading-tight text-blue-400">{c.desc}</p>
                        </div>
                      ))}
                    </div>
                  ) : ( 
                    <div className="text-center p-6 bg-blue-950 rounded-xl border border-blue-800 border-dashed"><p className="text-blue-500 text-sm">Nenhum marco desbloqueado. Jogue partidas para ganhar emblemas!</p></div> 
                  )}
                </div>

                {/* 📋 DESEMPENHO SEGMENTADO (GAVETAS) */}
                <div>
                  <h4 className="text-lg font-bold text-white mb-4 flex items-center gap-2"><Trophy className="text-emerald-500" size={20}/> Desempenho nos Torneios</h4>
                  {sortedCategories.length > 0 ? (
                    <div className="space-y-4">
                      {sortedCategories.map(catKey => {
                        const compsInCategory = groupedComps[catKey];
                        const key = `${team.id}_${catKey}`;
                        const isExpanded = expandedCats[key];

                        let totalPts = 0, totalP = 0, totalW = 0, totalD = 0, totalL = 0, totalGf = 0, totalGa = 0;
                        
                        const compsData = compsInCategory.map(comp => {
                           const table = calculateStandings(matches, teams, comp.id);
                           const rankIndex = table.findIndex(t => t.id === team.id);
                           const myStats = rankIndex !== -1 ? table[rankIndex] : null;
                           const rank = rankIndex !== -1 ? rankIndex + 1 : '-';

                           if (myStats) {
                              totalPts += myStats.pts || 0;
                              totalP += myStats.p || 0;
                              totalW += myStats.w || 0;
                              totalD += myStats.d || 0;
                              totalL += myStats.l || 0;
                              totalGf += myStats.gf || 0;
                              totalGa += myStats.ga || 0;
                           }

                           return { comp, myStats, rank };
                        });
                        
                        const totalGd = totalGf - totalGa;

                        return (
                          <div key={catKey} className="space-y-2">
                             {/* GAVETA - CABEÇALHO / RESUMO GERAL */}
                             <div onClick={() => setExpandedCats(prev => ({...prev, [key]: !prev[key]}))} className="bg-blue-950 rounded-xl border border-blue-800 overflow-hidden cursor-pointer hover:border-emerald-500/50 transition-colors shadow-sm">
                                <div className="bg-blue-900/40 p-3 border-b border-blue-800/50 flex justify-between items-center px-4">
                                  <h5 className="text-[11px] font-black text-blue-300 uppercase tracking-widest flex items-center gap-2">
                                    {CATEGORY_NAMES[catKey] || 'Outros Torneios'} <span className="text-blue-500 ml-1">({compsInCategory.length})</span>
                                  </h5>
                                  <span className="text-xs font-bold text-blue-400">{isExpanded ? '▲ Fechar Detalhes' : '▼ Ver Detalhes'}</span>
                                </div>
                                
                                {totalP > 0 ? (
                                  <div className="grid grid-cols-4 sm:grid-cols-7 gap-2 p-4 text-center bg-blue-950/80">
                                    <div><p className="text-[10px] text-blue-500 uppercase font-bold mb-0.5">PTS</p><p className="text-xl font-black text-emerald-400">{totalPts}</p></div>
                                    <div><p className="text-[10px] text-blue-500 uppercase font-bold mb-0.5">Jogos</p><p className="text-lg font-bold text-blue-300">{totalP}</p></div>
                                    <div><p className="text-[10px] text-blue-500 uppercase font-bold mb-0.5">V</p><p className="text-lg font-bold text-emerald-500">{totalW}</p></div>
                                    <div><p className="text-[10px] text-blue-500 uppercase font-bold mb-0.5">E</p><p className="text-lg font-bold text-blue-400">{totalD}</p></div>
                                    <div className="sm:hidden block"><p className="text-[10px] text-blue-500 uppercase font-bold mb-0.5">D</p><p className="text-lg font-bold text-red-400">{totalL}</p></div>
                                    <div className="hidden sm:block"><p className="text-[10px] text-blue-500 uppercase font-bold mb-0.5">D</p><p className="text-lg font-bold text-red-400">{totalL}</p></div>
                                    <div className="hidden sm:block"><p className="text-[10px] text-blue-500 uppercase font-bold mb-0.5">GP</p><p className="text-lg font-bold text-emerald-400">{totalGf}</p></div>
                                    <div className="hidden sm:block"><p className="text-[10px] text-blue-500 uppercase font-bold mb-0.5">Saldo</p><p className="text-lg font-bold text-blue-300">{totalGd > 0 ? `+${totalGd}` : totalGd}</p></div>
                                  </div>
                                ) : (
                                  <p className="p-3 text-xs text-blue-500 text-center bg-blue-950/80">Sem jogos disputados nesta categoria.</p>
                                )}
                             </div>

                             {/* GAVETA - CONTEÚDO EXPANDIDO (DETALHES DE CADA TORNEIO) */}
                             {isExpanded && (
                               <div className="pl-3 sm:pl-4 mt-2 space-y-3 animate-in slide-in-from-top-2 border-l-2 border-blue-800/50 ml-1 sm:ml-2">
                                 {compsData.map(({comp, myStats, rank}) => (
                                   <div key={comp.id} className="bg-blue-950/60 rounded-xl border border-blue-800/60 overflow-hidden shadow-sm hover:border-blue-600 transition-colors">
                                     <div className="bg-blue-900/30 p-2.5 border-b border-blue-800/50 flex justify-between items-center px-4">
                                       <span className="text-xs font-bold text-blue-200">{comp.name}</span>
                                       <div className="flex items-center gap-2">
                                         <span className="text-[10px] bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded border border-emerald-500/20 font-bold">{rank}º Lugar</span>
                                       </div>
                                     </div>
                                     {myStats && myStats.p > 0 ? (
                                       <div className="grid grid-cols-4 sm:grid-cols-7 gap-2 p-3 text-center">
                                         <div><p className="text-[9px] text-blue-500 uppercase font-bold mb-0.5">PTS</p><p className="text-lg font-black text-emerald-400">{myStats.pts}</p></div>
                                         <div><p className="text-[9px] text-blue-500 uppercase font-bold mb-0.5">Jogos</p><p className="text-base font-bold text-blue-300">{myStats.p}</p></div>
                                         <div><p className="text-[9px] text-blue-500 uppercase font-bold mb-0.5">V</p><p className="text-base font-bold text-emerald-500">{myStats.w}</p></div>
                                         <div><p className="text-[9px] text-blue-500 uppercase font-bold mb-0.5">E</p><p className="text-base font-bold text-blue-400">{myStats.d}</p></div>
                                         <div className="sm:hidden block"><p className="text-[9px] text-blue-500 uppercase font-bold mb-0.5">D</p><p className="text-base font-bold text-red-400">{myStats.l}</p></div>
                                         <div className="hidden sm:block"><p className="text-[9px] text-blue-500 uppercase font-bold mb-0.5">D</p><p className="text-base font-bold text-red-400">{myStats.l}</p></div>
                                         <div className="hidden sm:block"><p className="text-[9px] text-blue-500 uppercase font-bold mb-0.5">GP</p><p className="text-base font-bold text-emerald-400">{myStats.gf}</p></div>
                                         <div className="hidden sm:block"><p className="text-[9px] text-blue-500 uppercase font-bold mb-0.5">Saldo</p><p className="text-base font-bold text-blue-300">{myStats.gd > 0 ? `+${myStats.gd}` : myStats.gd}</p></div>
                                       </div>
                                     ) : (
                                       <p className="p-3 text-[10px] text-blue-500 text-center">Ainda não disputou partidas neste torneio.</p>
                                     )}
                                   </div>
                                 ))}
                               </div>
                             )}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-xs text-blue-500 text-center p-4 bg-blue-950 rounded-xl border border-blue-800 border-dashed">Ainda não disputou nenhum torneio.</p>
                  )}
                </div>

                <div className="pt-4 border-t border-blue-800">
                  <h4 className="text-sm font-bold text-blue-400 mb-4 flex items-center gap-2"><Activity size={16}/> Resumo Histórico</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-blue-950 p-4 rounded-xl border border-blue-800/50 text-center"><p className="text-blue-500 text-xs mb-1 font-medium">Jogos Totais</p><p className="text-xl font-bold text-white">{teamMatches.length}</p></div>
                    <div className="bg-blue-950 p-4 rounded-xl border border-blue-800/50 text-center"><p className="text-blue-500 text-xs mb-1 font-medium">Aproveitamento</p><p className="text-xl font-bold text-amber-400">{teamMatches.length > 0 ? Math.round((wins * 3 + draws) / (teamMatches.length * 3) * 100) : 0}%</p></div>
                    <div className="bg-blue-950 p-4 rounded-xl border border-blue-800/50 text-center col-span-2 md:col-span-2"><p className="text-blue-500 text-xs mb-1 font-medium">Maior Goleada</p>{biggestWin ? ( <p className="text-lg font-bold text-white"><span className="text-emerald-400">{biggestWin.scoreFor}</span> x {biggestWin.scoreAgainst} <span className="text-sm text-blue-400 font-normal">({teams.find(t=>t.id === biggestWin.oppId)?.name})</span></p> ) : <p className="text-sm text-blue-600 mt-1">Nenhuma vitória</p>}</div>
                  </div>
                </div>

              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
export default Profile;

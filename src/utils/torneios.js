import { PONTOS } from './pontuacoes';

export const calculateStandings = (matches, teams, compId) => {
  const table = {}; 
  (teams || []).forEach(t => { if (t) table[t.id] = { ...t, p: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, gd: 0, pts: 0 }; });
  
  const appMap = {}; 
  (matches || []).filter(m => m && m.compId === compId && m.status === 'approved').forEach(m => { 
      // CORREÇÃO: Salva no mapa todos os jogos aprovados sem a falha do ID
      appMap[m.matchId] = m; 
  });
  
  Object.values(appMap).forEach(m => {
    const tA = table[m.teamA], tB = table[m.teamB]; if (!tA || !tB) return;
    tA.p++; tB.p++; 
    tA.gf += Number(m.scoreA||0); tB.gf += Number(m.scoreB||0); 
    tA.ga += Number(m.scoreB||0); tB.ga += Number(m.scoreA||0);
    
    if (Number(m.scoreA) > Number(m.scoreB)) { 
        tA.pts += 3; tA.w++; tB.l++; 
    } else if (Number(m.scoreA) < Number(m.scoreB)) { 
        tB.pts += 3; tB.w++; tA.l++; 
    } else { 
        tA.pts++; tB.pts++; tA.d++; tB.d++; 
    }
  });
  
  return Object.values(table).map(t => ({ ...t, gd: t.gf - t.ga })).sort((a, b) => { 
      if (b.pts !== a.pts) return b.pts - a.pts; 
      if (b.w !== a.w) return b.w - a.w; 
      if (b.gd !== a.gd) return b.gd - a.gd; 
      return b.gf - a.gf; 
  });
};

export const getChampionIds = (comp, matches, teams) => {
  if (!comp || comp.status !== 'finished') return [];

  // 🌟 1. O PODER SUPREMO: Lê o campeão forçado manualmente pelo Administrador
  if (comp.championIds && comp.championIds.length > 0) {
      return comp.championIds;
  }

  // 2. LIGAS (Pontos Corridos)
  if (comp.format === 'league') {
    const compTeams = (teams || []).filter(t => comp.teams && comp.teams.includes(t.id));
    const table = calculateStandings(matches, compTeams, comp.id);
    if (table && table.length > 0) return [table[0].id];
    return [];
  }

  // 3. COPAS E MATA-MATA
  if (!comp.rounds || comp.rounds.length === 0) return [];
  const finalRound = comp.rounds[comp.rounds.length - 1];
  if (!finalRound || !finalRound.matches || finalRound.matches.length === 0) return [];

  const matchIda = finalRound.matches[0];
  const matchVolta = finalRound.matches[1];
  
  const sUI_ida = matches.find(m => m.matchId === matchIda.id && m.compId === comp.id && m.status === 'approved');
  const sUI_volta = matchVolta ? matches.find(m => m.matchId === matchVolta.id && m.compId === comp.id && m.status === 'approved') : null;

  if (!sUI_ida) return [];

  let scoreA = Number(sUI_ida.scoreA || 0); let scoreB = Number(sUI_ida.scoreB || 0);
  let penA = Number(sUI_ida.penaltiesA || 0); let penB = Number(sUI_ida.penaltiesB || 0);

  if (sUI_volta) {
      scoreA += Number(sUI_volta.scoreB || 0); scoreB += Number(sUI_volta.scoreA || 0);
      penA += Number(sUI_volta.penaltiesB || 0); penB += Number(sUI_volta.penaltiesA || 0);
  }

  let winnerId = null;
  if (scoreA > scoreB) winnerId = matchIda.teamA;
  else if (scoreB > scoreA) winnerId = matchIda.teamB;
  else {
      if (penA > penB) winnerId = matchIda.teamA;
      else if (penB > penA) winnerId = matchIda.teamB;
  }

  if (!winnerId) return [];

  if (comp.category === 'copa_flash_dupla') {
      if (winnerId === matchIda.teamA) return [matchIda.duplaA?.p1 || matchIda.teamA, matchIda.duplaA?.p2].filter(Boolean);
      else return [matchIda.duplaB?.p1 || matchIda.teamB, matchIda.duplaB?.p2].filter(Boolean);
  }

  return [winnerId];
};

export const generateCupBracket = (teamIds, compId, isFinalDouble = false, isIdaEVolta = false) => {
  if (!teamIds || teamIds.length === 0) return [];
  const sh = [...teamIds].sort(() => 0.5 - Math.random());
  
  // Calcula a potência de 2 mais próxima (Ex: 13 times -> chave de 16)
  let p2 = 1; while (p2 < sh.length) p2 *= 2;
  const tkr = Math.log2(p2);
  const rounds = [];
  
  const byes = p2 - sh.length; 
  const playing = sh.length - byes; 
  
  // 🌟 MUDANÇA 1: Distribuição justa dos "Avanços Diretos" (Byes) para não ficar tudo de um lado só
  const firstRoundMatches = new Array(p2 / 2).fill(null).map(() => [null, null]);
  let teamIndex = 0;
  
  const step = byes > 0 ? Math.floor((p2 / 2) / byes) : 1;
  for (let i = 0; i < byes; i++) {
      let pos = (i * step) % (p2 / 2);
      while (firstRoundMatches[pos][0] !== null) pos = (pos + 1) % (p2 / 2);
      firstRoundMatches[pos] = [sh[teamIndex++], null];
  }
  
  // Preenche o restante com as partidas reais da 1ª fase
  for (let i = 0; i < p2 / 2; i++) {
      if (firstRoundMatches[i][0] === null) {
          firstRoundMatches[i] = [sh[teamIndex++], sh[teamIndex++]];
      }
  }
  
  let mc = 1;
  let prevRoundMatches = firstRoundMatches.map(m => { 
      return { tA: m[0] || '', tB: m[1] || '', isBye: (!m[0] || !m[1]) }; 
  });

  for (let kr = 0; kr < tkr; kr++) {
    const rm = []; const nm = p2 / Math.pow(2, kr + 1); const fmc = mc;
    let rl = 'Mata-Mata'; 
    if (nm === 1) rl = 'Final'; 
    else if (nm === 2) rl = 'Semifinal'; 
    else if (nm === 4) rl = 'Quartas'; 
    else if (nm === 8) rl = 'Oitavas'; 
    else if (nm === 16) rl = '16 Avos'; 
    else if (nm === 32) rl = '32 Avos';
    
    const currentRoundMatches = [];

    for (let i = 0; i < nm; i++) {
      let tA = ''; let tB = ''; let pA = 'A Definir'; let pB = 'A Definir';

      if (kr === 0) {
        tA = prevRoundMatches[i].tA; tB = prevRoundMatches[i].tB;
        if (!tA && !tB) { pA = 'Vaga Aberta'; pB = 'Vaga Aberta'; } 
        else if (!tA) { pA = 'Vaga Aberta'; pB = 'A Definir'; } 
        else if (!tB) { pA = 'A Definir'; pB = 'Vaga Aberta'; }
        
        // 🌟 MUDANÇA 2 (O BUG CRÍTICO RESOLVIDO): Se for uma partida normal (tA e tB existem), 
        // ele NÃO avança ninguém ainda (null). Se for um Bye, avança o time que sobrou.
        currentRoundMatches.push({ advanced: (tA && tB) ? null : (tA || tB) });
      } else {
        const prevA = prevRoundMatches[i * 2]; const prevB = prevRoundMatches[i * 2 + 1];
        if (prevA && prevA.advanced) { tA = prevA.advanced; pA = 'Avanço Automático'; } else { pA = `Venc. Jogo ${fmc - (nm * 2) + (i * 2)}`; }
        if (prevB && prevB.advanced) { tB = prevB.advanced; pB = 'Avanço Automático'; } else { pB = `Venc. Jogo ${fmc - (nm * 2) + (i * 2) + 1}`; }
        
        if (tA && !tB && pB.includes('Avanço')) currentRoundMatches.push({ advanced: tA }); 
        else if (!tA && tB && pA.includes('Avanço')) currentRoundMatches.push({ advanced: tB }); 
        else currentRoundMatches.push({ advanced: null });
      }

      if (nm === 1) {
        if (isIdaEVolta || isFinalDouble) {
            rm.push({ id: `${compId}_ko_m${mc++}_kr${kr}_ida`, teamA: tA, teamB: tB, placeholderA: pA, placeholderB: pB, status: 'pending_play' });
            rm.push({ id: `${compId}_ko_m${mc++}_kr${kr}_volta`, teamA: tB, teamB: tA, placeholderA: `Volta: ${pB}`, placeholderB: `Volta: ${pA}`, status: 'pending_play' });
        } else {
            rm.push({ id: `${compId}_ko_m${mc++}_kr${kr}_f1`, teamA: tA, teamB: tB, placeholderA: pA, placeholderB: pB, status: 'pending_play' });
        }
        if (kr > 0) {
            let p3A = `Perd. Jogo ${fmc - (nm * 2) + (i * 2)}`; let p3B = `Perd. Jogo ${fmc - (nm * 2) + (i * 2) + 1}`;
            rm.push({ id: `${compId}_ko_m${mc}_kr${kr}_3rd`, teamA: '', teamB: '', placeholderA: `🥉 ${p3A}`, placeholderB: `🥉 ${p3B}`, status: 'pending_play' }); mc++;
        }
      } else {
        if (isIdaEVolta) {
            rm.push({ id: `${compId}_ko_m${mc++}_kr${kr}_ida`, teamA: tA, teamB: tB, placeholderA: pA, placeholderB: pB, status: 'pending_play' });
            rm.push({ id: `${compId}_ko_m${mc++}_kr${kr}_volta`, teamA: tB, teamB: tA, placeholderA: `Volta: ${pB}`, placeholderB: `Volta: ${pA}`, status: 'pending_play' });
        } else {
            rm.push({ id: `${compId}_ko_m${mc++}_kr${kr}`, teamA: tA, teamB: tB, placeholderA: pA, placeholderB: pB, status: 'pending_play' });
        }
      }
    }
    prevRoundMatches = currentRoundMatches;
    rounds.push({ id: `ko_${kr}`, number: rl, status: kr === 0 ? 'released' : 'locked', releasedAt: kr === 0 ? Date.now() : null, matches: rm });
  }
  return rounds;
};

export const generateRoundRobin = (teams, compId, isDoubleRound = false) => {
  if (!teams || teams.length === 0) return [];
  const t = [...teams];
  if (t.length % 2 !== 0) t.push(null);
  const numRounds = t.length - 1;
  const half = t.length / 2;
  const rounds = [];
  let matchCounter = 1;

  for (let r = 0; r < numRounds; r++) {
    const matches = [];
    for (let i = 0; i < half; i++) {
      const teamA = t[i];
      const teamB = t[t.length - 1 - i];
      if (teamA !== null && teamB !== null) {
        matches.push({ id: `${compId}_m${matchCounter}_r${r + 1}`, teamA: teamA, teamB: teamB, placeholderA: 'A Definir', placeholderB: 'A Definir', status: 'pending_play' });
        matchCounter++;
      }
    }
    rounds.push({ id: `r${r + 1}`, number: r + 1, status: r === 0 ? 'released' : 'locked', releasedAt: r === 0 ? Date.now() : null, matches });
    t.splice(1, 0, t.pop());
  }

  if (isDoubleRound) {
    const extraRounds = [];
    for (let r = 0; r < numRounds; r++) {
      const matches = rounds[r].matches.map(m => {
        const newMatch = { ...m, id: `${compId}_m${matchCounter}_r${r + 1 + numRounds}`, teamA: m.teamB, teamB: m.teamA };
        matchCounter++; return newMatch;
      });
      extraRounds.push({ id: `r${r + 1 + numRounds}`, number: r + 1 + numRounds, status: 'locked', releasedAt: null, matches });
    }
    return [...rounds, ...extraRounds];
  }
  return rounds;
};

export const generateGroupsAndKnockout = (teamIds, compId, numGroups, qualifiers = 2, isDoubleRound = false, isFinalDouble = false, isIdaEVolta = false) => {
  const sh = [...teamIds].sort(() => 0.5 - Math.random()); const groups = {}; const gn = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
  for(let i=0; i<numGroups; i++) groups[gn[i]] = []; sh.forEach((t, i) => groups[gn[i % numGroups]].push(t));
  
  let mr = 0; const agr = {}; 
  Object.keys(groups).forEach(g => { 
    const rrs = generateRoundRobin(groups[g], compId, isDoubleRound); 
    mr = Math.max(mr, rrs.length); agr[g] = rrs; 
  });
  
  const rounds = []; let mc = 1;
  for(let r=0; r<mr; r++) {
    const rm = []; Object.keys(groups).forEach(g => { if(agr[g][r]) { agr[g][r].matches.forEach(m => { rm.push({...m, id: `${compId}_m${mc}_r${r+1}`, groupId: g}); mc++; }); } });
    rounds.push({ id: `r${r+1}`, number: r+1, status: r===0?'released':'locked', releasedAt: r===0 ? Date.now() : null, matches: rm });
  }
  
  let kt = numGroups * qualifiers; let p2 = 1; while (p2 < kt) p2 *= 2; const tkr = Math.log2(p2);
  for (let kr=0; kr<tkr; kr++) {
    const rm = []; const nm = p2 / Math.pow(2, kr + 1); const fmc = mc;
    let rl = 'Mata-Mata'; if (nm === 1) rl = 'Final'; else if (nm === 2) rl = 'Semifinal'; else if (nm === 4) rl = 'Quartas';
    
    for (let i=0; i<nm; i++) {
      let pA = 'A Definir', pB = 'A Definir'; 
      if (kr === 0) { 
         if (qualifiers === 2 && numGroups % 2 === 0 && numGroups * 2 === p2) { 
            const h = numGroups / 2; 
            if (i < h) { pA = `1º Gr.${gn[i * 2]}`; pB = `2º Gr.${gn[i * 2 + 1]}`; } 
            else { const off = i - h; pA = `1º Gr.${gn[off * 2 + 1]}`; pB = `2º Gr.${gn[off * 2]}`; } 
         } else { pA = 'Vaga Aberta'; pB = 'Vaga Aberta'; } 
      } else { 
         pA = `Venc. Jogo ${fmc - (nm * 2) + (i * 2)}`; pB = `Venc. Jogo ${fmc - (nm * 2) + (i * 2) + 1}`; 
      }

      if (nm === 1) { 
          if (isIdaEVolta || isFinalDouble) {
              rm.push({ id: `${compId}_ko_m${mc++}_kr${kr}_ida`, teamA: '', teamB: '', placeholderA: pA, placeholderB: pB, status: 'pending_play' });
              rm.push({ id: `${compId}_ko_m${mc++}_kr${kr}_volta`, teamA: '', teamB: '', placeholderA: `Volta: ${pB}`, placeholderB: `Volta: ${pA}`, status: 'pending_play' });
          } else {
              rm.push({ id: `${compId}_ko_m${mc++}_kr${kr}_f1`, teamA: '', teamB: '', placeholderA: pA, placeholderB: pB, status: 'pending_play' });
          }
          if (kr > 0) { 
             let p3A = `Perd. Jogo ${fmc - (nm * 2) + (i * 2)}`; let p3B = `Perd. Jogo ${fmc - (nm * 2) + (i * 2) + 1}`;
             rm.push({ id: `${compId}_ko_m${mc}_kr${kr}_3rd`, teamA: '', teamB: '', placeholderA: `🥉 ${p3A}`, placeholderB: `🥉 ${p3B}`, status: 'pending_play' }); mc++;
          }
      } else {
          if (isIdaEVolta) {
              rm.push({ id: `${compId}_ko_m${mc++}_kr${kr}_ida`, teamA: '', teamB: '', placeholderA: pA, placeholderB: pB, status: 'pending_play' });
              rm.push({ id: `${compId}_ko_m${mc++}_kr${kr}_volta`, teamA: '', teamB: '', placeholderA: `Volta: ${pB}`, placeholderB: `Volta: ${pA}`, status: 'pending_play' });
          } else {
              rm.push({ id: `${compId}_ko_m${mc++}_kr${kr}`, teamA: '', teamB: '', placeholderA: pA, placeholderB: pB, status: 'pending_play' });
          }
      }
    }
    rounds.push({ id: `ko_${kr}`, number: rl, status: 'locked', releasedAt: null, matches: rm });
  } 
  return { groups, rounds };
};

export const generateDuplasCupBracket = (teamIds, compId, teamsData, matchesData, competitionsData) => {
  if (teamIds.length % 2 !== 0) throw new Error("Para gerar uma Copa em Duplas, o número de times inscritos precisa ser par.");

  const getTeamScore = (tId) => { const t = teamsData.find(x => x.id === tId); return t ? (t.globalPoints || 0) : 0; };
  const sortedInscritos = [...teamIds].sort((a, b) => getTeamScore(b) - getTeamScore(a));

  const half = Math.ceil(sortedInscritos.length / 2);
  let pote1 = sortedInscritos.slice(0, half);
  let pote2 = sortedInscritos.slice(half).sort(() => 0.5 - Math.random()); 

  const duplas = [];
  for (let i = 0; i < pote1.length; i++) {
    const time1 = teamsData.find(t => t.id === pote1[i]);
    const time2 = teamsData.find(t => t.id === pote2[i]);
    const nameP1 = time1 && time1.name ? time1.name.split(' ')[0] : 'Time 1';
    const nameP2 = time2 && time2.name ? time2.name.split(' ')[0] : 'Time 2';
    duplas.push({ id: `dp_${i+1}`, name: `${nameP1} & ${nameP2}`, p1: pote1[i], p2: pote2[i] });
  }

  const sh = [...duplas].sort(() => 0.5 - Math.random());
  let p2_count = 1; while (p2_count < sh.length) p2_count *= 2; const tkr = Math.log2(p2_count);
  const rounds = []; let mc = 1;

  for (let kr = 0; kr < tkr; kr++) {
    const rm = []; const nm = p2_count / Math.pow(2, kr + 1); const fmc = mc;
    let rl = 'Mata-Mata (Duplas)'; if (nm === 1) rl = 'Final'; else if (nm === 2) rl = 'Semifinal'; else if (nm === 4) rl = 'Quartas'; else if (nm === 8) rl = 'Oitavas';

    for (let i = 0; i < nm; i++) {
      let dA = null; let dB = null; let pA = 'A Definir'; let pB = 'A Definir';
      if (kr === 0) { dA = sh[i * 2] || null; dB = sh[i * 2 + 1] || null; pA = dA ? dA.name : 'Vaga Aberta'; pB = dB ? dB.name : 'Vaga Aberta'; } 
      else { pA = `Venc. Jogo ${fmc - (nm * 2) + (i * 2)}`; pB = `Venc. Jogo ${fmc - (nm * 2) + (i * 2) + 1}`; }

      rm.push({ id: `${compId}_ko_m${mc}_kr${kr}_ida`, isDupla: true, duplaA: dA, duplaB: dB, teamA: dA ? dA.p1 : '', teamB: dB ? dB.p1 : '', placeholderA: `${pA} (Técnico 1)`, placeholderB: `${pB} (Técnico 1)`, status: 'pending_play' }); mc++;
      rm.push({ id: `${compId}_ko_m${mc}_kr${kr}_volta`, isDupla: true, duplaA: dB, duplaB: dA, teamA: dB ? dB.p2 : '', teamB: dA ? dA.p2 : '', placeholderA: `${pB} (Técnico 2)`, placeholderB: `${pA} (Técnico 2)`, status: 'pending_play' }); mc++;
    }
    rounds.push({ id: `ko_${kr}`, number: rl, status: kr === 0 ? 'released' : 'locked', releasedAt: kr === 0 ? Date.now() : null, matches: rm });
  }
  return { rounds, duplas };
};

export const generateCopaRecompensaBracket = (teamIds, compId, teamsData, isFinalDouble = false, isIdaEVolta = false) => {
  const sortedTeams = [...teamIds].sort((a, b) => {
    const tA = teamsData.find(t => t.id === a); const tB = teamsData.find(t => t.id === b);
    const ptsA = tA ? (tA.globalPoints || 0) : 0; const ptsB = tB ? (tB.globalPoints || 0) : 0;
    return ptsB - ptsA;
  });

  const elite = sortedTeams.slice(0, 6); const preliminar = sortedTeams.slice(6);
  const shuffledPrelim = [...preliminar].sort(() => 0.5 - Math.random());
  const shuffledElite = [...elite].sort(() => 0.5 - Math.random());

  const rounds = []; let mc = 1;

  const pushMatch = (rm, baseId, tA, tB, pA, pB) => {
      if (isIdaEVolta) {
          rm.push({ id: `${baseId}_ida`, teamA: tA, teamB: tB, placeholderA: pA, placeholderB: pB, status: 'pending_play' });
          rm.push({ id: `${baseId}_volta`, teamA: tB, teamB: tA, placeholderA: `Volta: ${pB}`, placeholderB: `Volta: ${pA}`, status: 'pending_play' });
      } else {
          rm.push({ id: baseId, teamA: tA, teamB: tB, placeholderA: pA, placeholderB: pB, status: 'pending_play' });
      }
  };

  const r0Matches = [];
  for(let i=0; i<8; i++) { pushMatch(r0Matches, `${compId}_ko_m${mc++}_kr0`, shuffledPrelim[i*2] || '', shuffledPrelim[i*2+1] || '', shuffledPrelim[i*2] ? '' : 'A Definir', shuffledPrelim[i*2+1] ? '' : 'A Definir'); }
  rounds.push({ id: `ko_0`, number: 'Fase 1 (Preliminar)', status: 'released', releasedAt: Date.now(), matches: r0Matches });

  const r1Matches = [];
  for(let i=0; i<4; i++) { pushMatch(r1Matches, `${compId}_ko_m${mc++}_kr1`, '', '', `Venc. Jogo ${r0Matches[i*(isIdaEVolta?4:2)].id.split('_m')[1].split('_')[0]}`, `Venc. Jogo ${r0Matches[(i*(isIdaEVolta?4:2))+(isIdaEVolta?2:1)].id.split('_m')[1].split('_')[0]}`); }
  rounds.push({ id: `ko_1`, number: 'Fase 2 (Preliminar)', status: 'locked', releasedAt: null, matches: r1Matches });

  const r2Matches = [];
  for(let i=0; i<2; i++) { pushMatch(r2Matches, `${compId}_ko_m${mc++}_kr2`, '', '', `Venc. Jogo ${r1Matches[i*(isIdaEVolta?4:2)].id.split('_m')[1].split('_')[0]}`, `Venc. Jogo ${r1Matches[(i*(isIdaEVolta?4:2))+(isIdaEVolta?2:1)].id.split('_m')[1].split('_')[0]}`); }
  rounds.push({ id: `ko_2`, number: 'Playoff de Acesso', status: 'locked', releasedAt: null, matches: r2Matches });

  const r3Matches = [];
  pushMatch(r3Matches, `${compId}_ko_m${mc++}_kr3`, shuffledElite[0] || '', '', 'Elite Rank #1', `Venc. Playoff 1`);
  pushMatch(r3Matches, `${compId}_ko_m${mc++}_kr3`, shuffledElite[1] || '', shuffledElite[2] || '', 'Elite Rank #2', 'Elite Rank #3');
  pushMatch(r3Matches, `${compId}_ko_m${mc++}_kr3`, shuffledElite[3] || '', shuffledElite[4] || '', 'Elite Rank #4', 'Elite Rank #5');
  pushMatch(r3Matches, `${compId}_ko_m${mc++}_kr3`, shuffledElite[5] || '', '', 'Elite Rank #6', `Venc. Playoff 2`);
  rounds.push({ id: `ko_3`, number: 'Quartas', status: 'locked', releasedAt: null, matches: r3Matches });

  const r4Matches = [];
  for(let i=0; i<2; i++) { pushMatch(r4Matches, `${compId}_ko_m${mc++}_kr4`, '', '', `Venc. Quartas ${i*2 + 1}`, `Venc. Quartas ${i*2 + 2}`); }
  rounds.push({ id: `ko_4`, number: 'Semifinal', status: 'locked', releasedAt: null, matches: r4Matches });

  const r5Matches = [];
  if (isIdaEVolta || isFinalDouble) {
      r5Matches.push({ id: `${compId}_ko_m${mc++}_kr5_ida`, teamA: '', teamB: '', placeholderA: `Venc. Semi 1`, placeholderB: `Venc. Semi 2`, status: 'pending_play' });
      r5Matches.push({ id: `${compId}_ko_m${mc++}_kr5_volta`, teamA: '', teamB: '', placeholderA: `Venc. Semi 2`, placeholderB: `Venc. Semi 1`, status: 'pending_play' });
  } else {
      r5Matches.push({ id: `${compId}_ko_m${mc++}_kr5_f1`, teamA: '', teamB: '', placeholderA: `Venc. Semi 1`, placeholderB: `Venc. Semi 2`, status: 'pending_play' });
  }
  r5Matches.push({ id: `${compId}_ko_m${mc}_kr5_3rd`, teamA: '', teamB: '', placeholderA: `🥉 Perd. Semi 1`, placeholderB: `🥉 Perd. Semi 2`, status: 'pending_play' });
  rounds.push({ id: `ko_5`, number: 'Final', status: 'locked', releasedAt: null, matches: r5Matches });

  return rounds;
};
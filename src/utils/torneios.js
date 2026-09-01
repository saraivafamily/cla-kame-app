// src/utils/torneios.js

export const calculateStandings = (matches, teams, compId) => {
  const table = {}; 
  (teams || []).forEach(t => { if (t) table[t.id] = { ...t, p: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, gd: 0, pts: 0 }; });
  
  const appMap = {}; 
  (matches || []).filter(m => m && m.compId === compId && m.status === 'approved').forEach(m => { 
      const time = parseInt(String(m?.id || '').split('_')[1] || '0'); 
      if (!appMap[m.matchId] || time > parseInt(String(appMap[m.matchId].id).split('_')[1] || '0')) { appMap[m.matchId] = m; } 
  });
  
  Object.values(appMap).forEach(m => {
    const tA = table[m.teamA], tB = table[m.teamB]; if (!tA || !tB) return;
    tA.p++; tB.p++; tA.gf += Number(m.scoreA||0); tB.gf += Number(m.scoreB||0); tA.ga += Number(m.scoreB||0); tB.ga += Number(m.scoreA||0);
    if (m.scoreA > m.scoreB) { tA.pts+=3; tA.w++; tB.l++; } else if (m.scoreA < m.scoreB) { tB.pts+=3; tB.w++; tA.l++; } else { tA.pts++; tB.pts++; tA.d++; tB.d++; }
  });
  
  return Object.values(table).map(t => ({ ...t, gd: t.gf - t.ga })).sort((a, b) => { 
      if (b.pts !== a.pts) return b.pts - a.pts; 
      if (b.w !== a.w) return b.w - a.w; 
      if (b.gd !== a.gd) return b.gd - a.gd; 
      return b.gf - a.gf; 
  });
};

export const getChampionIds = (comp, matches, teams) => {
  if (!comp || !comp.rounds || comp.rounds.length === 0) return [];
  if (comp.format === 'cup' || comp.format === 'groups' || comp.category === 'copa_flash_dupla') {
    const knockoutRounds = comp.rounds.filter(r => r.id.includes('ko') || comp.format === 'cup' || comp.category === 'copa_flash_dupla');
    if (knockoutRounds.length === 0) return [];
    const lastRound = knockoutRounds[knockoutRounds.length - 1];
    const finalMatches = lastRound.matches.filter(m => !m.id.includes('_3rd'));
    if (finalMatches.length === 0) return [];

    if (comp.category === 'copa_flash_dupla') {
        const mIda = finalMatches[0];
        const mVolta = finalMatches[1];
        if (!mIda || !mVolta) return [];
        
        const sIda = matches.find(m => m.matchId === mIda.id && m.compId === comp.id && m.status === 'approved');
        const sVolta = matches.find(m => m.matchId === mVolta.id && m.compId === comp.id && m.status === 'approved');
        if (!sIda || !sVolta) return [];
        
        const scoreDuplaA = Number(sIda.scoreA || 0) + Number(sVolta.scoreB || 0);
        const scoreDuplaB = Number(sIda.scoreB || 0) + Number(sVolta.scoreA || 0);
        const penDuplaA = Number(sIda.penaltiesA || 0) + Number(sVolta.penaltiesB || 0);
        const penDuplaB = Number(sIda.penaltiesB || 0) + Number(sVolta.penaltiesA || 0);
        
        if (scoreDuplaA > scoreDuplaB) return [mIda.duplaA?.p1, mIda.duplaA?.p2].filter(Boolean);
        if (scoreDuplaB > scoreDuplaA) return [mIda.duplaB?.p1, mIda.duplaB?.p2].filter(Boolean);
        if (penDuplaA > penDuplaB) return [mIda.duplaA?.p1, mIda.duplaA?.p2].filter(Boolean);
        if (penDuplaB > penDuplaA) return [mIda.duplaB?.p1, mIda.duplaB?.p2].filter(Boolean);
        return [];
    }

    let allApproved = true;
    let totalScoreA = 0; let totalScoreB = 0;
    let lastPenA = null; let lastPenB = null;
    let tA = finalMatches[0].teamA; let tB = finalMatches[0].teamB;

    if(!tA || !tB) return [];

    for (let fm of finalMatches) {
       const sUI = matches.find(m => m.matchId === fm.id && m.compId === comp.id && m.status === 'approved');
       if (!sUI) { allApproved = false; break; }
       
       if (fm.teamA === tA) {
          totalScoreA += Number(sUI.scoreA || 0); totalScoreB += Number(sUI.scoreB || 0);
          if (sUI.penaltiesA !== null && sUI.penaltiesA !== undefined) { lastPenA = Number(sUI.penaltiesA); lastPenB = Number(sUI.penaltiesB); }
       } else {
          totalScoreA += Number(sUI.scoreB || 0); totalScoreB += Number(sUI.scoreA || 0);
          if (sUI.penaltiesB !== null && sUI.penaltiesB !== undefined) { lastPenA = Number(sUI.penaltiesB); lastPenB = Number(sUI.penaltiesA); }
       }
    }

    if (allApproved) {
       if (totalScoreA > totalScoreB) return [tA];
       if (totalScoreB > totalScoreA) return [tB];
       if (lastPenA !== null && lastPenB !== null) {
          if (lastPenA > lastPenB) return [tA];
          if (lastPenB > lastPenA) return [tB];
       }
    }
  } else if (comp.format === 'league') {
    const groupOrNormalRounds = comp.rounds.filter(r => !r.id.includes('ko'));
    const totalMatches = groupOrNormalRounds.reduce((acc, r) => acc + r.matches.length, 0);
    const approvedMatches = matches.filter(m => m.compId === comp.id && m.status === 'approved').length;
    if (totalMatches > 0 && approvedMatches === totalMatches) {
      const compTeams = teams.filter(t => comp.teams?.includes(t.id));
      const standings = calculateStandings(matches, compTeams, comp.id);
      return standings.length > 0 ? [standings[0].id] : [];
    }
  }
  return [];
};

export const generateCupBracket = (teamIds, compId, isFinalDouble = false) => {
  if (!teamIds || teamIds.length === 0) return [];
  const sh = [...teamIds].sort(() => 0.5 - Math.random());
  let p2 = 1; while (p2 < sh.length) p2 *= 2;
  const tkr = Math.log2(p2);
  const rounds = [];
  const firstRoundMatches = [];
  const byes = p2 - sh.length; 
  const playing = sh.length - byes; 
  
  let teamIndex = 0;
  for (let i = 0; i < p2 / 2; i++) {
     if (i < playing / 2) { firstRoundMatches.push([sh[teamIndex++], sh[teamIndex++]]); } 
     else { firstRoundMatches.push([sh[teamIndex++], null]); }
  }
  
  let mc = 1;
  let prevRoundMatches = firstRoundMatches.map(m => { return { tA: m[0] || '', tB: m[1] || '', isBye: (!m[0] || !m[1]) }; });

  for (let kr = 0; kr < tkr; kr++) {
    const rm = [];
    const nm = p2 / Math.pow(2, kr + 1);
    const fmc = mc;
    let rl = 'Mata-Mata';
    if (nm === 1) rl = 'Final';
    else if (nm === 2) rl = 'Semifinal';
    else if (nm === 4) rl = 'Quartas';
    else if (nm === 8) rl = 'Oitavas';
    else if (nm === 16) rl = '16 Avos';
    else if (nm === 32) rl = '32 Avos';

    const currentRoundMatches = [];

    for (let i = 0; i < nm; i++) {
      let tA = ''; let tB = '';
      let pA = 'A Definir'; let pB = 'A Definir';

      if (kr === 0) {
        tA = prevRoundMatches[i].tA; tB = prevRoundMatches[i].tB;
        if (!tA && !tB) { pA = 'Vaga Aberta'; pB = 'Vaga Aberta'; }
        else if (!tA) { pA = 'Vaga Aberta'; pB = 'A Definir'; } 
        else if (!tB) { pA = 'A Definir'; pB = 'Vaga Aberta'; }
        currentRoundMatches.push({ advanced: tA || tB });
      } else {
        const prevA = prevRoundMatches[i * 2]; const prevB = prevRoundMatches[i * 2 + 1];
        if (prevA && prevA.advanced) { tA = prevA.advanced; pA = 'Avanço Automático'; }
        else { pA = `Venc. Jogo ${fmc - (nm * 2) + (i * 2)}`; }
        if (prevB && prevB.advanced) { tB = prevB.advanced; pB = 'Avanço Automático'; }
        else { pB = `Venc. Jogo ${fmc - (nm * 2) + (i * 2) + 1}`; }

        if (tA && !tB && pB.includes('Avanço')) currentRoundMatches.push({ advanced: tA });
        else if (!tA && tB && pA.includes('Avanço')) currentRoundMatches.push({ advanced: tB });
        else currentRoundMatches.push({ advanced: null });
      }

      if (nm === 1) {
        rm.push({ id: `${compId}_ko_m${mc}_kr${kr}_f1`, teamA: tA, teamB: tB, placeholderA: pA, placeholderB: pB, status: 'pending_play' }); mc++;
        if (isFinalDouble) {
          rm.push({ id: `${compId}_ko_m${mc}_kr${kr}_f2`, teamA: tB, teamB: tA, placeholderA: pB, placeholderB: pA, status: 'pending_play' }); mc++;
        }
        if (kr > 0) {
          let p3A = `Perd. Jogo ${fmc - (nm * 2) + (i * 2)}`; let p3B = `Perd. Jogo ${fmc - (nm * 2) + (i * 2) + 1}`;
          rm.push({ id: `${compId}_ko_m${mc}_kr${kr}_3rd`, teamA: '', teamB: '', placeholderA: `🥉 ${p3A}`, placeholderB: `🥉 ${p3B}`, status: 'pending_play' }); mc++;
        }
      } else {
        rm.push({ id: `${compId}_ko_m${mc}_kr${kr}`, teamA: tA, teamB: tB, placeholderA: pA, placeholderB: pB, status: 'pending_play' }); mc++;
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

export const generateGroupsAndKnockout = (teamIds, compId, numGroups, qualifiers = 2, isDoubleRound = false, isFinalDouble = false) => {
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
          rm.push({ id: `${compId}_ko_m${mc}_kr${kr}_f1`, teamA: '', teamB: '', placeholderA: pA, placeholderB: pB, status: 'pending_play' }); mc++;
          if (isFinalDouble) {
             rm.push({ id: `${compId}_ko_m${mc}_kr${kr}_f2`, teamA: '', teamB: '', placeholderA: pB, placeholderB: pA, status: 'pending_play' }); mc++;
          }
          if (kr > 0) { 
             let p3A = `Perd. Jogo ${fmc - (nm * 2) + (i * 2)}`; let p3B = `Perd. Jogo ${fmc - (nm * 2) + (i * 2) + 1}`;
             rm.push({ id: `${compId}_ko_m${mc}_kr${kr}_3rd`, teamA: '', teamB: '', placeholderA: `🥉 ${p3A}`, placeholderB: `🥉 ${p3B}`, status: 'pending_play' }); mc++;
          }
      } else {
          rm.push({ id: `${compId}_ko_m${mc}_kr${kr}`, teamA: '', teamB: '', placeholderA: pA, placeholderB: pB, status: 'pending_play' }); mc++;
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
      
      if (kr === 0) {
        dA = sh[i * 2] || null; dB = sh[i * 2 + 1] || null;
        pA = dA ? dA.name : 'Vaga Aberta'; pB = dB ? dB.name : 'Vaga Aberta';
      } else {
        pA = `Venc. Jogo ${fmc - (nm * 2) + (i * 2)}`; pB = `Venc. Jogo ${fmc - (nm * 2) + (i * 2) + 1}`;
      }

      rm.push({ id: `${compId}_ko_m${mc}_kr${kr}_ida`, isDupla: true, duplaA: dA, duplaB: dB, teamA: dA ? dA.p1 : '', teamB: dB ? dB.p1 : '', placeholderA: `${pA} (Técnico 1)`, placeholderB: `${pB} (Técnico 1)`, status: 'pending_play' }); mc++;
      rm.push({ id: `${compId}_ko_m${mc}_kr${kr}_volta`, isDupla: true, duplaA: dB, duplaB: dA, teamA: dB ? dB.p2 : '', teamB: dA ? dA.p2 : '', placeholderA: `${pB} (Técnico 2)`, placeholderB: `${pA} (Técnico 2)`, status: 'pending_play' }); mc++;
    }
    rounds.push({ id: `ko_${kr}`, number: rl, status: kr === 0 ? 'released' : 'locked', releasedAt: kr === 0 ? Date.now() : null, matches: rm });
  }
  
  return { rounds, duplas };
};

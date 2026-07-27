export const calculateGlobalRanking = (teams, matches, competitions) => {
  // Cria um objeto base para cada time com pontuação zerada
  let ranking = teams.map(team => ({
    ...team,
    rankingPoints: 0,
    matchesPlayed: 0,
    wins: 0,
    draws: 0,
    titles: 0
  }));

  // Função auxiliar para achar o time e adicionar pontos
  const addPoints = (teamId, points, type) => {
    const teamIndex = ranking.findIndex(t => t.id === teamId);
    if (teamIndex > -1) {
      ranking[teamIndex].rankingPoints += points;
      if (type === 'win') ranking[teamIndex].wins += 1;
      if (type === 'draw') ranking[teamIndex].draws += 1;
      if (type === 'match') ranking[teamIndex].matchesPlayed += 1;
      if (type === 'title') ranking[teamIndex].titles += 1;
    }
  };

  // 1. Pontuação por Partidas (Apenas partidas aprovadas)
  const approvedMatches = matches.filter(m => m.status === 'approved');
  approvedMatches.forEach(match => {
    addPoints(match.teamA, 0, 'match');
    addPoints(match.teamB, 0, 'match');

    if (match.scoreA > match.scoreB) {
      addPoints(match.teamA, 3, 'win'); // Vitória
    } else if (match.scoreB > match.scoreA) {
      addPoints(match.teamB, 3, 'win'); // Vitória
    } else {
      // Empate (considerando pênaltis no mata-mata)
      if (match.penaltiesA > match.penaltiesB) {
        addPoints(match.teamA, 3, 'win');
      } else if (match.penaltiesB > match.penaltiesA) {
        addPoints(match.teamB, 3, 'win');
      } else {
        addPoints(match.teamA, 1, 'draw'); // Empate
        addPoints(match.teamB, 1, 'draw'); // Empate
      }
    }
  });

  // 2. Pontuação por Competições Concluídas
  const finishedComps = competitions.filter(comp => comp.status === 'finished');
  finishedComps.forEach(comp => {
    // Todos que participaram ganham pontos de presença
    comp.teams.forEach(teamId => addPoints(teamId, 10, 'participation'));

    // Pontos para o Campeão e Vice (Lógica simplificada dependendo de como você salva o campeão)
    if (comp.championId) {
      addPoints(comp.championId, 50, 'title'); 
    }
    if (comp.runnerUpId) {
      addPoints(comp.runnerUpId, 30, 'runnerUp');
    }
  });

  // Ordena do maior para o menor pontuador
  return ranking.sort((a, b) => b.rankingPoints - a.rankingPoints);
};

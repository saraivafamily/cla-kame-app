import React, { useState, useMemo, useEffect } from 'react';
import { Target, AlertCircle, CheckCircle, Dices } from 'lucide-react';
import { updateDoc, setDoc, getDocs, query, where } from 'firebase/firestore';
import { getPublicDocPath, getPublicPath } from '../utils/firebase';
import ShieldDisplay from './ShieldDisplay';
import Button from './Button';
import { calculateStandings } from '../utils/torneios';

const PredictionsPanel = ({ competitions, matches, teams, users, currentUser, predictions, onSavePrediction, showToast }) => {
  const [activeTab, setActiveTab] = useState('open');
  const [betData, setBetData] = useState({});

  const [selectedCompId, setSelectedCompId] = useState('');
  const [selectedRoundId, setSelectedRoundId] = useState('');

  const [customOdds, setCustomOdds] = useState({});

  const getTeam = (id) => (teams || []).find(t => t.id === id);
  const getMyPred = (matchId) => (predictions || []).find(p => p.matchId === matchId && p.userId === currentUser.id);
  const myTeam = (teams || []).find(t => t.ownerId === currentUser.id);
  const isAdmin = currentUser?.role === 'leader' || currentUser?.role === 'kaioh';

  const bettingData = useMemo(() => {
    const comps = [];
    (competitions || []).forEach(c => {
      if (c.status !== 'active') return;
      
      const validRounds = [];
      c.rounds?.forEach(r => {
        if (r.status !== 'locked') return; 
        
        const validMatches = [];
        r.matches.forEach(m => {
          if (myTeam && (m.teamA === myTeam.id || m.teamB === myTeam.id)) return;

          const hasResult = matches.some(x => x.matchId === m.id && x.compId === c.id && x.status !== 'rejected');
          
          if (!hasResult && m.teamA && m.teamB && !m.teamA.includes('Definir') && !m.teamB.includes('Definir')) {
            validMatches.push({ ...m, compName: c.name, compId: c.id, roundName: r.number });
          }
        });

        if (validMatches.length > 0) {
          validRounds.push({ id: r.id, number: r.number, matches: validMatches });
        }
      });

      if (validRounds.length > 0) {
        comps.push({ id: c.id, name: c.name, rounds: validRounds });
      }
    });
    return comps;
  }, [competitions, matches, myTeam]);

  useEffect(() => {
    setSelectedRoundId('');
  }, [selectedCompId]);

  const displayedMatches = useMemo(() => {
    if (!selectedCompId || !selectedRoundId) return [];
    const comp = bettingData.find(c => c.id === selectedCompId);
    if (!comp) return [];
    const round = comp.rounds.find(r => r.id === selectedRoundId);
    return round ? round.matches : [];
  }, [bettingData, selectedCompId, selectedRoundId]);

  const getOdds = (matchId, compId, tA_id, tB_id) => {
     if (customOdds[matchId]) return customOdds[matchId];

     const table = calculateStandings(matches, teams, compId);

     const statsA = table.find(t => t.id === tA_id);
     const statsB = table.find(t => t.id === tB_id);

     const ptsA = statsA ? statsA.pts : 0;
     const ptsB = statsB ? statsB.pts : 0;
     
     const weightA = 5 + ptsA;
     const weightB = 5 + ptsB;
     const weightD = 5 + (Math.max(weightA, weightB) - Math.abs(weightA - weightB)) * 0.5;
     const totalWeight = weightA + weightB + weightD;

     let oddA = (1 / (weightA / totalWeight)) * 0.90;
     let oddB = (1 / (weightB / totalWeight)) * 0.90;
     let oddD = (1 / (weightD / totalWeight)) * 0.90;

     const clamp = (val) => Math.min(Math.max(val, 1.10), 15.00).toFixed(2);
     return { A: clamp(oddA), B: clamp(oddB), D: clamp(oddD) };
  };

  const handleCustomOddChange = (matchId, option, newValue) => {
      const matchOdds = getOdds(matchId, displayedMatches.find(m => m.id === matchId)?.compId, displayedMatches.find(m => m.id === matchId)?.teamA, displayedMatches.find(m => m.id === matchId)?.teamB);
      setCustomOdds({
          ...customOdds,
          [matchId]: {
              ...matchOdds,
              [option]: newValue
          }
      });
  };

  const ranking = useMemo(() => {
     const userPoints = {};
     (users || []).forEach(u => userPoints[u.id] = { ...u, bets: 0, wins: 0, profit: 0 });

     (predictions || []).forEach(p => {
        if (p.status) { 
           if (userPoints[p.userId]) {
              userPoints[p.userId].bets += 1;
              if (p.status === 'won') userPoints[p.userId].wins += 1;
              userPoints[p.userId].profit += Number(p.profit || 0);
           }
        }
     });

     return Object.values(userPoints).filter(u => u.bets > 0).sort((a,b) => b.profit - a.profit || b.wins - a.wins);
  }, [predictions, users]);

  const handleSave = (m) => {
     const data = betData[m.id];
     if (!data || !data.option || !data.amount || data.amount <= 0) { 
       showToast("Escolha um vencedor e digite um valor válido!", "error"); 
       return; 
     }

     const amountNum = parseInt(data.amount);
     const myPred = getMyPred(m.id);
     const oldAmount = myPred ? Number(myPred.amount) : 0;
     const costDiff = amountNum - oldAmount;

     if (Number(currentUser.kameCoins || 0) < costDiff) {
       showToast(`Saldo insuficiente! Faltam ${costDiff - Number(currentUser.kameCoins || 0)} BK.`, "error");
       return;
     }

     const currentOdds = getOdds(m.id, m.compId, m.teamA, m.teamB);
     const lockedOdd = Number(currentOdds[data.option]);

     onSavePrediction({
        id: myPred ? myPred.id : `pred_${currentUser.id}_${m.id}`,
        userId: currentUser.id,
        matchId: m.id,
        compId: m.compId,
        option: data.option, 
        amount: amountNum,
        lockedOdd: lockedOdd,
        timestamp: Date.now()
     }, oldAmount);
     
     showToast(`Bilhete Fechado! Odd cravada em ${lockedOdd}x 🍀`, "success");
  };

  // 🚀 MOTOR DE AUDITORIA DO KAMEBET: Recalcula falsos Reds e ajusta a conta bancária
  const handleSyncBettingHistory = async () => {
    if (!window.confirm("Atenção! Isso vai varrer TODOS os palpites antigos do servidor, corrigir os falsos Reds causados pelo bug do placar e devolver o saldo para a conta dos jogadores corretamente. Deseja iniciar a varredura?")) return;
    showToast("Analisando bilhetes e recalculando saldos... Isso pode levar alguns segundos.", "info");

    try {
      const balanceDiffs = {}; 
      const predictionsToUpdate = [];

      for (const pred of predictions) {
          if (pred.type === 'deposit') continue; // Ignora as compras de KameCoins

          const match = matches.find(m => m.matchId === pred.matchId && m.compId === pred.compId && m.status === 'approved');
          if (!match) continue; 

          // Lendo os placares como NUMEROS REAIS
          const scoreA = Number(match.scoreA || 0);
          const scoreB = Number(match.scoreB || 0);
          const penA = match.penaltiesA !== null && match.penaltiesA !== undefined ? Number(match.penaltiesA) : null;
          const penB = match.penaltiesB !== null && match.penaltiesB !== undefined ? Number(match.penaltiesB) : null;

          let realOutcome = 'D';
          if (scoreA > scoreB) realOutcome = 'A';
          else if (scoreB > scoreA) realOutcome = 'B';
          else if (penA !== null && penB !== null) {
              if (penA > penB) realOutcome = 'A';
              else if (penB > penA) realOutcome = 'B';
          }

          const isWin = pred.option === realOutcome;
          const betAmount = Number(pred.amount);
          const oddToUse = pred.lockedOdd || 1.1;
          const correctPayout = isWin ? Math.floor(betAmount * oddToUse) : 0;
          const correctProfit = isWin ? (correctPayout - betAmount) : -betAmount;
          const correctStatus = isWin ? 'won' : 'lost';

          const currentProfit = pred.status ? Number(pred.profit || 0) : 0;
          
          // Se o sistema marcou errado ou o lucro anotado for diferente do real, joga pra fila de correção
          if (pred.status !== correctStatus || currentProfit !== correctProfit) {
              const diff = correctProfit - currentProfit;
              
              if (!balanceDiffs[pred.userId]) balanceDiffs[pred.userId] = 0;
              balanceDiffs[pred.userId] += diff;

              predictionsToUpdate.push({
                  id: pred.id,
                  status: correctStatus,
                  payout: correctPayout,
                  profit: correctProfit
              });
          }
      }

      // Devolvendo e ajustando os BitKames dos usuários prejudicados
      for (const userId of Object.keys(balanceDiffs)) {
          const u = users.find(x => x.id === userId);
          if (u) {
              const newBalance = Math.max(0, Number(u.kameCoins || 0) + balanceDiffs[userId]);
              await updateDoc(getPublicDocPath('users', u.id), { kameCoins: newBalance });
          }
      }

      // Corrigindo a etiqueta dos bilhetes (de Loss para Won)
      for (const pUpdate of predictionsToUpdate) {
          await updateDoc(getPublicDocPath('predictions', pUpdate.id), {
              status: pUpdate.status,
              payout: pUpdate.payout,
              profit: pUpdate.profit
          });
      }

      showToast(`Auditoria concluída! ${predictionsToUpdate.length} bilhetes com erro foram consertados e os lucros pagos.`, "success");
    } catch (error) {
      console.error(error);
      showToast("Erro durante a sincronização de auditoria.", "error");
    }
  };

  const totalOpenMatches = useMemo(() => {
    return bettingData.reduce((total, comp) => {
      return total + comp.rounds.reduce((rTotal, r) => rTotal + r.matches.length, 0);
    }, 0);
  }, [bettingData]);
  
  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in pb-12">
      <div className="bg-gradient-to-r from-blue-900 to-blue-950 p-6 rounded-3xl border border-blue-800 shadow-xl flex flex-col md:flex-row items-center gap-4">
        <div className="bg-blue-950 p-3 rounded-full border border-amber-500/50 shadow-inner shrink-0">
          <Dices size={32} className="text-amber-400 animate-pulse" />
        </div>
        <div className="flex-1 text-center md:text-left">
          <h2 className="text-2xl font-black text-white uppercase tracking-wider">KameBet</h2>
          <p className="text-sm text-blue-400 mt-1">Minigame social de palpites interno do Clã Kame.</p>
        </div>
        <div className="bg-blue-950 p-3 rounded-xl border border-amber-500/30 text-center shadow-inner w-full md:w-auto shrink-0">
          <p className="text-[10px] text-amber-400 font-bold uppercase tracking-wider">Sua Carteira</p>
          <p className="text-xl font-black text-white">{currentUser.kameCoins || 0} BK</p>
        </div>
      </div>

      <div className="flex gap-2 p-1 bg-blue-950 rounded-xl border border-blue-800">
        <button onClick={()=>setActiveTab('open')} className={`flex-1 py-2 text-sm rounded-lg font-bold transition-all ${activeTab==='open'?'bg-amber-600 text-white':'text-blue-500 hover:text-white'}`}>
          🎯 Palpitar ({totalOpenMatches})
        </button>
        <button onClick={()=>setActiveTab('ranking')} className={`flex-1 py-2 text-sm rounded-lg font-bold transition-all ${activeTab==='ranking'?'bg-amber-600 text-white':'text-blue-500 hover:text-white'}`}>
          🏆 Top Estrategistas
        </button>
      </div>

      {activeTab === 'open' && (
        <div className="space-y-4 animate-in slide-in-from-left-4">
          
          {bettingData.length === 0 ? (
            <div className="bg-blue-900 p-8 rounded-2xl border border-blue-800 text-center text-blue-400 border-dashed">
              <p className="font-bold text-lg mb-2">A central de palpites está fechada.</p>
              <p className="text-sm">Lembre-se das regras do jogo:<br/>
              1. Só é possível dar palpites em rodadas que ainda <b>não foram liberadas</b> (Travadas).<br/>
              2. Por ética, você <b>não pode</b> dar palpites nos jogos do seu próprio time.</p>
            </div>
          ) : (
            <div className="bg-blue-900 p-4 rounded-xl border border-blue-800 shadow-md">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                  <label className="text-xs font-bold text-blue-400 uppercase tracking-widest block mb-2">Selecione a Competição</label>
                  <select value={selectedCompId} onChange={e => setSelectedCompId(e.target.value)} className="w-full bg-blue-950 border border-blue-700 rounded-lg p-3 text-white focus:border-amber-500 outline-none transition-colors">
                    <option value="">Escolha um torneio...</option>
                    {bettingData.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                
                {selectedCompId && (
                  <div className="flex-1 animate-in fade-in">
                    <label className="text-xs font-bold text-blue-400 uppercase tracking-widest block mb-2">Selecione a Rodada/Fase</label>
                    <select value={selectedRoundId} onChange={e => setSelectedRoundId(e.target.value)} className="w-full bg-blue-950 border border-blue-700 rounded-lg p-3 text-white focus:border-amber-500 outline-none transition-colors">
                      <option value="">Escolha a rodada...</option>
                      {bettingData.find(c => c.id === selectedCompId)?.rounds.map(r => (
                        <option key={r.id} value={r.id}>Rodada / Fase {r.number}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            </div>
          )}

          {displayedMatches.length === 0 && selectedCompId && selectedRoundId && (
             <div className="text-center p-6 text-blue-500 bg-blue-950 rounded-xl border border-blue-800">
               Nenhuma partida disponível para palpites nesta rodada.
             </div>
          )}

          {displayedMatches.length > 0 && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 pt-2">
              {displayedMatches.map(m => {
                const tA = getTeam(m.teamA); const tB = getTeam(m.teamB);
                const myPred = getMyPred(m.id);
                const currentData = betData[m.id] || { option: myPred?.option || null, amount: myPred?.amount || '' };
                const odds = getOdds(m.id, m.compId, m.teamA, m.teamB);

                const displayOddA = (myPred && myPred.option === 'A') ? Number(myPred.lockedOdd || 1.1).toFixed(2) : odds.A;
                const displayOddD = (myPred && myPred.option === 'D') ? Number(myPred.lockedOdd || 1.1).toFixed(2) : odds.D;
                const displayOddB = (myPred && myPred.option === 'B') ? Number(myPred.lockedOdd || 1.1).toFixed(2) : odds.B;

                return (
                  <div key={m.id} className="bg-blue-900 p-5 rounded-2xl border border-blue-800 shadow-lg hover:border-amber-500/30 transition-all group">
                    <div className="flex justify-between items-center mb-3">
                      <span className="text-[10px] bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded font-bold uppercase tracking-widest">{m.compName} • Rodada {m.roundName}</span>
                      {myPred && <span className="text-[10px] text-emerald-400 font-black uppercase flex items-center gap-1">✅ Bilhete Salvo</span>}
                    </div>
                    
                    {/* 🌟 MODO ADMIN: Edição Manual das Odds */}
                    {isAdmin && !myPred && (
                        <div className="flex justify-between items-center mb-3 bg-blue-950/50 p-2 rounded-lg border border-blue-800/50">
                            <span className="text-[10px] text-emerald-400 font-bold uppercase">👑 Ajuste Manual de Odd (Admin)</span>
                            <div className="flex gap-2">
                                <input type="number" step="0.1" value={odds.A} onChange={(e) => handleCustomOddChange(m.id, 'A', e.target.value)} className="w-12 bg-blue-900 text-[10px] text-white p-1 rounded outline-none border border-blue-700 focus:border-emerald-500 text-center" title="Editar Odd Time A" />
                                <input type="number" step="0.1" value={odds.D} onChange={(e) => handleCustomOddChange(m.id, 'D', e.target.value)} className="w-12 bg-blue-900 text-[10px] text-white p-1 rounded outline-none border border-blue-700 focus:border-emerald-500 text-center" title="Editar Odd Empate" />
                                <input type="number" step="0.1" value={odds.B} onChange={(e) => handleCustomOddChange(m.id, 'B', e.target.value)} className="w-12 bg-blue-900 text-[10px] text-white p-1 rounded outline-none border border-blue-700 focus:border-emerald-500 text-center" title="Editar Odd Time B" />
                            </div>
                        </div>
                    )}

                    <div className="grid grid-cols-3 gap-2 mb-4">
                      <button onClick={() => setBetData({...betData, [m.id]: {...currentData, option: 'A'}})} className={`p-2 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all ${currentData.option === 'A' ? 'bg-emerald-600 border-emerald-500 shadow-inner scale-105' : 'bg-blue-950 border-blue-800 hover:border-emerald-500/50'}`}>
                         <ShieldDisplay shield={tA?.shield} size="small" />
                         <span className="text-[10px] text-white font-bold truncate w-full text-center">{tA?.name}</span>
                         <span className={`text-xs font-black ${currentData.option === 'A' ? 'text-blue-950' : 'text-amber-400'}`}>{displayOddA}x</span>
                      </button>

                      <button onClick={() => setBetData({...betData, [m.id]: {...currentData, option: 'D'}})} className={`p-2 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all ${currentData.option === 'D' ? 'bg-slate-500 border-slate-400 shadow-inner scale-105' : 'bg-blue-950 border-blue-800 hover:border-slate-400/50'}`}>
                         <div className="w-10 h-10 flex items-center justify-center font-black text-slate-400">EMP</div>
                         <span className="text-[10px] text-slate-300 font-bold truncate w-full text-center">Empate</span>
                         <span className={`text-xs font-black mt-1 ${currentData.option === 'D' ? 'text-blue-950' : 'text-amber-400'}`}>{displayOddD}x</span>
                      </button>

                      <button onClick={() => setBetData({...betData, [m.id]: {...currentData, option: 'B'}})} className={`p-2 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all ${currentData.option === 'B' ? 'bg-emerald-600 border-emerald-500 shadow-inner scale-105' : 'bg-blue-950 border-blue-800 hover:border-emerald-500/50'}`}>
                         <ShieldDisplay shield={tB?.shield} size="small" />
                         <span className="text-[10px] text-white font-bold truncate w-full text-center">{tB?.name}</span>
                         <span className={`text-xs font-black ${currentData.option === 'B' ? 'text-blue-950' : 'text-amber-400'}`}>{displayOddB}x</span>
                      </button>
                    </div>

                    <div className="flex gap-2 items-end">
                      <div className="flex-1">
                        <label className="text-[10px] text-blue-400 uppercase font-bold block mb-1">Valor do Bilhete (BK)</label>
                        <input 
                          type="number" inputMode="numeric" placeholder="Ex: 50"
                          value={currentData.amount} 
                          onChange={e => setBetData({...betData, [m.id]: {...currentData, amount: e.target.value}})}
                          className="w-full bg-blue-950 border border-blue-700 text-amber-400 font-black text-lg p-2 rounded-lg outline-none focus:border-amber-500" 
                        />
                      </div>
                      <button onClick={() => handleSave(m)} disabled={!currentData.option || !currentData.amount} className="flex-1 py-3 px-4 text-xs font-bold bg-amber-600 hover:bg-amber-500 rounded-lg text-white shadow-md uppercase tracking-wider disabled:opacity-50 transition-colors">
                        {myPred ? 'Atualizar' : 'Fechar Palpite'}
                      </button>
                    </div>
                    {currentData.option && currentData.amount && (
                      <p className="text-center text-[10px] text-emerald-400 mt-2 font-medium">
                        Retorno Estimado: <b className="text-amber-400">
                           {Math.floor(Number(currentData.amount) * (myPred?.option === currentData.option ? Number(myPred.lockedOdd || 1.1) : Number(odds[currentData.option])))} BK
                        </b>
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {activeTab === 'ranking' && (
        <div className="bg-blue-950 rounded-3xl border border-blue-800 shadow-2xl overflow-hidden animate-in slide-in-from-right-4">
          
          {/* 🚀 BOTÃO DA AUDITORIA MÁGICA PARA LÍDERES */}
          {isAdmin && (
            <div className="p-4 bg-blue-900/60 border-b border-blue-800 flex flex-col sm:flex-row justify-between sm:items-center gap-3">
              <div className="flex flex-col">
                <span className="text-xs font-bold text-amber-400 uppercase tracking-widest">Painel Administrativo</span>
                <span className="text-[10px] text-blue-400 mt-0.5">Corrige falsos "reds" perdidos no passado.</span>
              </div>
              <button onClick={handleSyncBettingHistory} className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2 px-4 rounded-xl text-xs shadow-md transition-colors flex items-center gap-2">
                🔄 Corrigir Bilhetes Antigos
              </button>
            </div>
          )}

          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-blue-900 text-blue-300 font-bold border-b border-blue-800">
                <tr>
                  <th className="p-4 w-12 text-center">Pos</th>
                  <th className="p-4">Estrategista</th>
                  <th className="p-4 text-center">Palpites Feitos</th>
                  <th className="p-4 text-center">Acertos</th>
                  <th className="p-4 text-center">Saldo Acumulado (BK)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-blue-800/40">
                {ranking.length === 0 ? (
                  <tr><td colSpan="5" className="p-8 text-center text-blue-500">O ranking será gerado assim que as partidas com palpites forem oficializadas.</td></tr>
                ) : (
                  ranking.map((u, idx) => {
                    const isTop3 = idx < 3;
                    const rankColors = ['text-amber-400', 'text-slate-300', 'text-amber-700'];
                    return (
                      <tr key={u.id} className="hover:bg-blue-900/50 transition-colors">
                        <td className="p-4 text-center"><span className={`text-xl font-black ${isTop3 ? rankColors[idx] : 'text-blue-500'}`}>{idx + 1}º</span></td>
                        <td className="p-4 font-bold text-white">{u.name}</td>
                        <td className="p-4 text-center text-blue-300 font-medium">{u.bets}</td>
                        <td className="p-4 text-center text-emerald-400 font-bold">{u.wins}</td>
                        <td className="p-4 text-center">
                          <span className={`text-lg font-black px-3 py-1 rounded-lg ${u.profit > 0 ? 'text-emerald-400 bg-emerald-500/10 border border-emerald-500/20' : u.profit < 0 ? 'text-red-400 bg-red-500/10 border border-red-500/20' : 'text-blue-300'}`}>
                            {u.profit > 0 ? `+${u.profit}` : u.profit}
                          </span>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default PredictionsPanel;

import React, { useState, useEffect, useMemo } from 'react';
import { Dices, XCircle, CheckCircle } from 'lucide-react';
import ShieldDisplay from './ShieldDisplay';
import Button from './Button';
import { calculateStandings } from '../utils/torneios';

export const DrawPanel = ({ comp, teams, matches, showToast }) => {
const DrawPanel = ({ comp, teams, matches, showToast }) => {
  const [prizeName, setPrizeName] = useState('Passe de Temporada');
  const [prizeQty, setPrizeQty] = useState(1);
  const [excludeTop, setExcludeTop] = useState(3); // Exclui Top 1, 2 e 3 por padrão
  const [excludeWO, setExcludeWO] = useState(true);
  
  const [isDrawing, setIsDrawing] = useState(false);
  const [winners, setWinners] = useState([]);

  // 1. Pega a Classificação Atual
  const standings = useMemo(() => {
    // Filtra para manter APENAS os times que estão inscritos nesta competição
    const compTeams = (teams || []).filter(t => comp.teams?.includes(t.id));
    return calculateStandings(matches, compTeams, comp.id);
  }, [matches, teams, comp]);

  // 2. Identifica os perdedores por W.O.
  const woLosers = useMemo(() => {
    const losers = new Set();
    matches.filter(m => m.compId === comp.id && m.status === 'approved').forEach(m => {
      const obs = (m.observacoes || '').toLowerCase();
      const isWO = obs.includes('w.o') || obs.includes('wo');
      if (isWO) {
        // Quem tem 0 gols no W.O. foi quem tomou o W.O. Se for duplo, penaliza os dois.
        if (m.scoreA === 0 && m.scoreB === 3) losers.add(m.teamA);
        if (m.scoreB === 0 && m.scoreA === 3) losers.add(m.teamB);
        if (obs.includes('duplo')) { losers.add(m.teamA); losers.add(m.teamB); }
      }
    });
    return losers;
  }, [matches, comp.id]);

  // 3. Aplica o Funil de Regras
  const { eligible, excluded } = useMemo(() => {
    const el = []; const ex = [];
    standings.forEach((teamStats, index) => {
      let isExcluded = false;
      let reason = '';

      if (index < excludeTop) {
        isExcluded = true;
        reason = `Ficou no Top ${excludeTop}`;
      } else if (excludeWO && woLosers.has(teamStats.id)) {
        isExcluded = true;
        reason = 'Tomou W.O. no torneio';
      }

      if (isExcluded) {
        ex.push({ ...teamStats, reason });
      } else {
        el.push(teamStats);
      }
    });
    return { eligible: el, excluded: ex };
  }, [standings, excludeTop, excludeWO, woLosers]);

  const handleDraw = () => {
    if (eligible.length === 0) {
      showToast("Não há times elegíveis suficientes para o sorteio!", "error");
      return;
    }
    if (prizeQty > eligible.length) {
      showToast(`Há apenas ${eligible.length} times elegíveis. Diminua a quantidade de prêmios.`, "error");
      return;
    }

    setIsDrawing(true);
    setWinners([]);

    setTimeout(() => {
      // Algoritmo de Embaralhamento (Fisher-Yates)
      let pool = [...eligible];
      for (let i = pool.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [pool[i], pool[j]] = [pool[j], pool[i]];
      }
      
      setWinners(pool.slice(0, prizeQty));
      setIsDrawing(false);
      showToast("Sorteio realizado com sucesso!", "success");
    }, 2000); // 2 segundos de suspense
  };

  return (
    <div className="space-y-6 animate-in fade-in">
      <div className="bg-purple-900/40 p-5 rounded-2xl border border-purple-500/50 flex flex-col md:flex-row gap-6 shadow-xl">
        {/* Formulário de Configuração */}
        <div className="flex-1 space-y-4">
          <h3 className="text-lg font-black text-purple-400 flex items-center gap-2 uppercase tracking-wider"><Dices size={20}/> Configurar Sorteio</h3>
          
          <div className="grid grid-cols-2 gap-3">
            <div><label className="text-xs text-blue-300 font-bold mb-1 block">Prêmio Sorteado</label><input type="text" value={prizeName} onChange={e=>setPrizeName(e.target.value)} className="w-full bg-blue-950 border border-purple-500/50 rounded-lg p-2 text-white outline-none focus:border-purple-400 text-sm" /></div>
            <div><label className="text-xs text-blue-300 font-bold mb-1 block">Qtd. de Ganhadores</label><input type="number" min="1" value={prizeQty} onChange={e=>setPrizeQty(parseInt(e.target.value)||1)} className="w-full bg-blue-950 border border-purple-500/50 rounded-lg p-2 text-white outline-none focus:border-purple-400 text-sm" /></div>
          </div>

          <div className="pt-2 space-y-2 border-t border-purple-800/50">
            <label className="text-xs font-bold text-amber-400 uppercase tracking-widest block">Regras de Exclusão</label>
            <div className="flex items-center gap-3 bg-blue-950 p-2 rounded-lg border border-blue-800">
              <span className="text-sm text-blue-200 flex-1">Não sortear os Top:</span>
              <select value={excludeTop} onChange={e=>setExcludeTop(Number(e.target.value))} className="bg-blue-900 border border-blue-700 text-white rounded p-1 text-sm outline-none">
                <option value={0}>Nenhum (Todos participam)</option>
                <option value={1}>Top 1 (Campeão)</option>
                <option value={2}>Top 1 e 2</option>
                <option value={3}>Top 1, 2 e 3</option>
                <option value={4}>Top 4</option>
              </select>
            </div>
            
            <label className="flex items-center justify-between cursor-pointer bg-blue-950 p-2 rounded-lg border border-blue-800">
              <span className="text-sm text-blue-200">Excluir quem tomou W.O.</span>
              <input type="checkbox" checked={excludeWO} onChange={e=>setExcludeWO(e.target.checked)} className="w-4 h-4 accent-purple-500" />
            </label>
          </div>

          <Button onClick={handleDraw} disabled={isDrawing} className="w-full py-3 mt-4 bg-purple-600 hover:bg-purple-500 text-white font-black text-lg border-0 shadow-lg shadow-purple-900/50">
            {isDrawing ? '🎲 Girando a Roleta...' : '🎲 Realizar Sorteio'}
          </Button>
        </div>

        {/* Status do Funil */}
        <div className="flex-1 flex flex-col gap-3">
          <div className="bg-blue-950 p-3 rounded-xl border border-blue-800 flex-1 overflow-y-auto max-h-[150px] custom-scrollbar">
            <p className="text-xs font-bold text-emerald-400 mb-2 sticky top-0 bg-blue-950">✅ Participantes Elegíveis ({eligible.length})</p>
            <div className="flex flex-wrap gap-1.5">
              {eligible.length === 0 ? <span className="text-xs text-blue-500">Nenhum</span> : eligible.map(t => <span key={t.id} className="text-[10px] bg-blue-900 text-blue-200 px-2 py-1 rounded">{t.name}</span>)}
            </div>
          </div>
          <div className="bg-blue-950 p-3 rounded-xl border border-blue-800 flex-1 overflow-y-auto max-h-[150px] custom-scrollbar">
            <p className="text-xs font-bold text-red-400 mb-2 sticky top-0 bg-blue-950">🚫 Participantes Excluídos ({excluded.length})</p>
            <div className="flex flex-col gap-1">
              {excluded.length === 0 ? <span className="text-xs text-blue-500">Nenhum</span> : excluded.map(t => (
                <div key={t.id} className="text-[10px] flex justify-between bg-red-500/10 text-red-300 px-2 py-1 rounded border border-red-500/20">
                  <span className="font-bold">{t.name}</span><span>{t.reason}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Resultado do Sorteio */}
      {winners.length > 0 && (
        <div className="bg-gradient-to-br from-amber-500 to-yellow-600 p-1 rounded-3xl animate-in zoom-in-95 duration-500 shadow-[0_0_30px_rgba(245,158,11,0.3)]">
          <div className="bg-blue-950 rounded-[22px] p-6 text-center h-full">
            <span className="text-4xl block mb-2">🎉</span>
            <h2 className="text-2xl font-black text-amber-400 uppercase tracking-widest mb-4">Ganhadores do Sorteio</h2>
            <p className="text-sm text-blue-300 mb-6">Prêmio: <b className="text-white">{prizeName}</b></p>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 justify-center">
              {winners.map((w, idx) => (
                <div key={w.id} className="bg-blue-900 p-4 rounded-xl border border-amber-500/40 shadow-inner flex flex-col items-center gap-2 transform hover:scale-105 transition-transform">
                  <ShieldDisplay shield={w.shield} size="normal" />
                  <span className="font-bold text-white text-base mt-2 truncate w-full text-center">{w.name}</span>
                  <span className="text-[10px] bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded font-black">Bilhete #{Math.floor(Math.random() * 9000) + 1000}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export const LiveDrawPanel = ({ comp, teams, onFinish, onCancel }) => {
// 🌟 PAINEL DE SORTEIO AO VIVO (MODO OBS COM ÁRVORE DE MATA-MATA)
const LiveDrawPanel = ({ comp, teams, onFinish, onCancel }) => {
  const [step, setStep] = useState(0); // 0: Init, 1: Sortear Parceiro, 2: Nomear Dupla, 3: Sortear Chave, 4: Concluído
  const [p1List, setP1List] = useState([]);
  const [p2List, setP2List] = useState([]);
  const [duplas, setDuplas] = useState([]);
  const [bracketDuplas, setBracketDuplas] = useState([]);
  
  const [spinning, setSpinning] = useState(false);
  const [currentP2, setCurrentP2] = useState(null);
  const [spinTarget, setSpinTarget] = useState(null);
  const [duplaName, setDuplaName] = useState('');
  const [chromaMode, setChromaMode] = useState(false);

  // 🔊 Efeito sonoro de clique de suspense
  const playTick = () => {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;
      const audioCtx = new AudioContext();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1200, audioCtx.currentTime);
      gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.05);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.05);
    } catch(e) {}
  };

  // Passo 0: Puxa o Ranking e Separa os Potes automaticamente
  useEffect(() => {
    if (step === 0) {
      const getTeamScore = (tId) => { const t = teams.find(x => x.id === tId); return t ? (t.globalPoints || 0) : 0; };
      const sorted = [...comp.teams].sort((a, b) => getTeamScore(b) - getTeamScore(a));
      const half = Math.ceil(sorted.length / 2);
      
      setP1List(sorted.slice(0, half).map(id => teams.find(t => t.id === id)));
      setP2List(sorted.slice(half).map(id => teams.find(t => t.id === id)));
      setStep(1);
    }
  }, [comp.teams, teams, step]);

  const handleSpinParceiro = () => {
    if (p2List.length === 0) return;
    setSpinning(true);
    let ticks = 0;
    const interval = setInterval(() => {
      const randomP2 = p2List[Math.floor(Math.random() * p2List.length)];
      setCurrentP2(randomP2);
      playTick();
      
      ticks++;
      if (ticks > 25) {
        clearInterval(interval);
        const finalP2 = p2List[Math.floor(Math.random() * p2List.length)];
        setCurrentP2(finalP2); 
        setSpinTarget(finalP2);
        
        // Sugestão Automática de Nome
        const p1 = p1List[0];
        const n1 = p1?.name ? p1.name.split(' ')[0] : 'Time1';
        const n2 = finalP2?.name ? finalP2.name.split(' ')[0] : 'Time2';
        setDuplaName(`${n1} & ${n2}`);
        
        setSpinning(false);
        setTimeout(() => setStep(2), 600);
      }
    }, 100);
  };

  const handleSaveDupla = () => {
    const p1 = p1List[0]; 
    const p2 = spinTarget;
    if (!duplaName) return;

    const novaDupla = { id: `dp_${Date.now()}_${Math.random()}`, name: duplaName.toUpperCase(), p1: p1.id, p2: p2.id };
    const updatedDuplas = [...duplas, novaDupla];
    setDuplas(updatedDuplas);
    
    const newP1List = p1List.slice(1);
    const newP2List = p2List.filter(t => t.id !== p2.id);
    
    setP1List(newP1List); 
    setP2List(newP2List);
    setCurrentP2(null); 
    setSpinTarget(null); 
    setDuplaName('');
    
    if (newP1List.length === 0) {
      setStep(3); // Vai direto para o chaveamento de mata-mata
    } else {
      setStep(1);
    }
  };

  const handleSpinBracket = () => {
    const availableDuplas = duplas.filter(d => !bracketDuplas.find(b => b.id === d.id));
    if (availableDuplas.length === 0) return;

    setSpinning(true);
    let ticks = 0;
    
    const interval = setInterval(() => {
      const randomDupla = availableDuplas[Math.floor(Math.random() * availableDuplas.length)];
      setCurrentP2(randomDupla);
      playTick();
      
      ticks++;
      if (ticks > 20) {
        clearInterval(interval);
        const selected = availableDuplas[Math.floor(Math.random() * availableDuplas.length)];
        setCurrentP2(null);
        
        setBracketDuplas(prev => {
          const newBracket = [...prev, selected];
          if (newBracket.length === duplas.length) {
            setTimeout(() => setStep(4), 1000); // Libera o botão verde no final
          }
          return newBracket;
        });
        
        setSpinning(false);
      }
    }, 100);
  };

  const finalizeBracketAndSave = () => {
    let p2_count = 1; 
    while (p2_count < bracketDuplas.length) p2_count *= 2;
    const tkr = Math.log2(p2_count);
    const rounds = []; 
    let mc = 1;

    for (let kr = 0; kr < tkr; kr++) {
        const rm = []; 
        const nm = p2_count / Math.pow(2, kr + 1); 
        const fmc = mc;
        let rl = 'Mata-Mata (Duplas)'; 
        if (nm === 1) rl = 'Final'; 
        else if (nm === 2) rl = 'Semifinal'; 
        else if (nm === 4) rl = 'Quartas'; 
        else if (nm === 8) rl = 'Oitavas';

        for (let i = 0; i < nm; i++) {
            let dA = null; let dB = null; let pA = 'A Definir'; let pB = 'A Definir';
            if (kr === 0) {
                dA = bracketDuplas[i * 2] || null; 
                dB = bracketDuplas[i * 2 + 1] || null;
                pA = dA ? dA.name : 'Vaga Aberta'; 
                pB = dB ? dB.name : 'Vaga Aberta';
            } else {
                pA = `Venc. Jogo ${fmc - (nm * 2) + (i * 2)}`; 
                pB = `Venc. Jogo ${fmc - (nm * 2) + (i * 2) + 1}`;
            }

            rm.push({ 
              id: `${comp.id}_ko_m${mc}_kr${kr}_ida`, 
              isDupla: true, duplaA: dA, duplaB: dB, teamA: dA ? dA.p1 : '', teamB: dB ? dB.p1 : '', 
              placeholderA: `${pA} (Téc 1)`, placeholderB: `${pB} (Téc 1)`, status: 'pending_play' 
            }); mc++;

            rm.push({ 
              id: `${comp.id}_ko_m${mc}_kr${kr}_volta`, 
              isDupla: true, duplaA: dB, duplaB: dA, teamA: dB ? dB.p2 : '', teamB: dA ? dA.p2 : '', 
              placeholderA: `${pB} (Téc 2)`, placeholderB: `${pA} (Téc 2)`, status: 'pending_play' 
            }); mc++;
        }
        rounds.push({ id: `ko_${kr}`, number: rl, status: kr === 0 ? 'released' : 'locked', releasedAt: kr === 0 ? Date.now() : null, matches: rm });
    }
    
    onFinish(rounds, duplas);
  };

  const isBracketFull = duplas.length > 0 && bracketDuplas.length === duplas.length;

  return (
    <div className={`fixed inset-0 z-50 overflow-y-auto custom-scrollbar flex flex-col p-6 sm:p-8 transition-colors duration-500 ${chromaMode ? 'bg-[#00FF00] text-black' : 'bg-[#020617] text-white'}`}>
      
      {/* CABEÇALHO */}
      <div className={`flex justify-between items-center border-b pb-4 mb-6 ${chromaMode ? 'border-green-800' : 'border-blue-900'}`}>
        <div className="flex items-center gap-4 sm:gap-6 flex-wrap">
          <div>
            <h2 className={`text-2xl sm:text-3xl font-black uppercase tracking-widest flex items-center gap-3 ${chromaMode ? 'text-black' : 'text-amber-400'}`}>
              <Dices size={32} className={chromaMode ? 'text-black' : ''} /> Transmissão de Sorteio Ao Vivo
            </h2>
            <p className={`font-bold mt-1 text-xs sm:text-sm ${chromaMode ? 'text-green-900' : 'text-blue-400'}`}>
              Copa Flash em Duplas • {comp.name}
            </p>
          </div>
          <button onClick={() => setChromaMode(!chromaMode)} className="bg-emerald-600 hover:bg-emerald-500 px-4 py-2 rounded-xl text-white text-xs font-black uppercase tracking-wider shadow-lg flex items-center gap-2 transition-transform hover:scale-105 border border-white/20">
             🟩 Modo OBS (Tela Verde)
          </button>
        </div>
        <button onClick={onCancel} className={`font-bold flex items-center gap-1.5 text-xs sm:text-sm ${chromaMode ? 'text-red-700 hover:text-red-900' : 'text-blue-500 hover:text-red-400'}`}>
          <XCircle size={20}/> Cancelar Sorteio
        </button>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center max-w-5xl mx-auto w-full">
        
        {/* ETAPA 1 e 2: FORMAR AS DUPLAS (POTE 1 x POTE 2) */}
        {(step === 1 || step === 2) && (
          <div className="w-full text-center animate-in zoom-in-95 duration-500">
            <h3 className={`text-xl sm:text-2xl font-black uppercase tracking-widest mb-8 sm:mb-12 ${chromaMode ? 'text-black' : 'text-blue-300'}`}>
              Formação da {duplas.length + 1}ª Dupla ({duplas.length + 1} de {comp.teams.length / 2})
            </h3>
            
            <div className="flex flex-col md:flex-row justify-center items-center gap-6 md:gap-16 mb-12">
              <div className={`flex flex-col items-center p-6 sm:p-8 rounded-3xl border shadow-2xl min-w-[260px] ${chromaMode ? 'bg-white/95 border-green-700' : 'bg-blue-900/40 border-emerald-500/30'}`}>
                 <p className={`text-xs font-bold tracking-widest uppercase mb-4 ${chromaMode ? 'text-green-700' : 'text-emerald-400'}`}>Pote 1 (Cabeça de Chave)</p>
                 <ShieldDisplay shield={p1List[0]?.shield} size="large" />
                 <p className={`text-2xl font-black mt-4 leading-tight ${chromaMode ? 'text-black' : 'text-white'}`}>{p1List[0]?.name}</p>
                 <p className={`font-bold mt-1 uppercase text-xs ${chromaMode ? 'text-green-800' : 'text-emerald-500'}`}>{p1List[0]?.coach}</p>
              </div>
              
              <div className={`text-4xl sm:text-6xl font-black animate-pulse ${chromaMode ? 'text-black' : 'text-amber-500'}`}>X</div>
              
              <div className={`flex flex-col items-center p-6 sm:p-8 rounded-3xl border shadow-2xl min-w-[260px] ${chromaMode ? 'bg-white/95 border-green-700' : 'bg-blue-900/40 border-amber-500/30'}`}>
                 <p className={`text-xs font-bold tracking-widest uppercase mb-4 ${chromaMode ? 'text-green-700' : 'text-amber-400'}`}>Pote 2 (Sorteado)</p>
                 {spinning || currentP2 || spinTarget ? (
                    <>
                      <ShieldDisplay shield={(currentP2 || spinTarget)?.shield} size="large" />
                      <p className={`text-2xl font-black mt-4 leading-tight ${spinning ? 'opacity-50 blur-[2px]' : ''} ${chromaMode ? 'text-black' : 'text-white'}`}>{(currentP2 || spinTarget)?.name}</p>
                      <p className={`font-bold mt-1 uppercase text-xs ${spinning ? 'opacity-50 blur-[2px]' : ''} ${chromaMode ? 'text-green-800' : 'text-amber-500'}`}>{(currentP2 || spinTarget)?.coach}</p>
                    </>
                 ) : (
                    <div className={`w-20 h-20 rounded-full flex items-center justify-center text-4xl border shadow-inner ${chromaMode ? 'bg-gray-200 border-gray-400 text-gray-500' : 'bg-blue-950 border-amber-500/50 text-amber-500'}`}>?</div>
                 )}
              </div>
            </div>

            {step === 1 && (
              <button onClick={handleSpinParceiro} disabled={spinning} className="bg-amber-600 hover:bg-amber-500 text-white font-black text-xl sm:text-2xl py-5 px-12 sm:px-16 rounded-full shadow-[0_0_40px_rgba(245,158,11,0.4)] disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105 transition-all">
                {spinning ? 'SORTEANDO PARCEIRO...' : '🎲 GIRAR ROLETA (POTE 2)'}
              </button>
            )}

            {step === 2 && (
              <div className={`p-6 sm:p-8 rounded-3xl border animate-in slide-in-from-bottom-8 max-w-xl mx-auto shadow-2xl ${chromaMode ? 'bg-white border-green-600' : 'bg-blue-950/90 border-blue-700'}`}>
                <p className={`font-black uppercase tracking-widest mb-3 flex items-center justify-center gap-2 text-sm sm:text-base ${chromaMode ? 'text-green-700' : 'text-emerald-400'}`}>
                  <CheckCircle size={20}/> Dupla Formada!
                </p>
                <label className={`text-xs font-bold uppercase tracking-widest block mb-2 ${chromaMode ? 'text-black' : 'text-blue-300'}`}>
                  Nome oficial da dupla na competição:
                </label>
                <input type="text" value={duplaName} onChange={e=>setDuplaName(e.target.value)} className={`w-full border-2 rounded-xl p-3 sm:p-4 font-black text-xl sm:text-2xl text-center outline-none ${chromaMode ? 'bg-gray-100 border-green-500 text-black' : 'bg-blue-900 border-emerald-500 text-white focus:bg-blue-800'}`} autoFocus />
                <button onClick={handleSaveDupla} className="w-full mt-5 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-lg py-3.5 rounded-xl shadow-lg hover:scale-105 transition-all">
                  SALVAR E PROSSEGUIR
                </button>
              </div>
            )}
          </div>
        )}

        {/* ETAPA 3 e 4: CHAVEAMENTO EM FORMATO OFICIAL DE MATA-MATA */}
        {(step === 3 || step === 4) && (
          <div className="w-full animate-in zoom-in-95 duration-500 flex flex-col items-center">
             
             <div className="text-center mb-8">
               <h3 className={`text-2xl sm:text-3xl font-black uppercase tracking-widest ${chromaMode ? 'text-black' : 'text-amber-400'}`}>
                 Chaveamento Oficial
               </h3>
               <p className={`text-xs sm:text-sm mt-1 ${chromaMode ? 'text-green-900 font-bold' : 'text-blue-300'}`}>
                 Sorteie as duplas para definir os confrontos diretos na chave.
               </p>
             </div>

             {/* CONTROLES DO SORTEIO NO TOPO */}
             <div className="flex flex-col items-center justify-center mb-8 w-full max-w-2xl min-h-[120px]">
               {currentP2 && step === 3 && (
                 <div className="text-center animate-in fade-in">
                   <p className={`text-xs font-bold uppercase tracking-widest mb-1 ${chromaMode ? 'text-black' : 'text-amber-400'}`}>Sorteando Posição para:</p>
                   <p className={`text-3xl font-black ${chromaMode ? 'text-black' : 'text-white'}`}>{currentP2.name}</p>
                 </div>
               )}

               {!isBracketFull && step === 3 && !currentP2 && (
                 <button onClick={handleSpinBracket} disabled={spinning} className="bg-amber-600 hover:bg-amber-500 text-white font-black text-lg sm:text-xl py-4 px-10 rounded-full shadow-[0_0_30px_rgba(245,158,11,0.4)] disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105 transition-all">
                   {spinning ? 'SORTEANDO POSIÇÃO...' : `SORTEAR PRÓXIMA DUPLA (${bracketDuplas.length + 1}/${duplas.length})`}
                 </button>
               )}

               {isBracketFull && step === 4 && (
                 <div className="w-full text-center animate-in slide-in-from-bottom-6 space-y-4 pt-2">
                   <div className="bg-emerald-500/10 border border-emerald-500/30 p-3 rounded-2xl">
                     <p className="text-emerald-400 font-black uppercase text-sm flex items-center justify-center gap-1.5">
                       <CheckCircle size={18}/> Todos os confrontos foram definidos!
                     </p>
                   </div>
                   <button onClick={finalizeBracketAndSave} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xl py-5 rounded-2xl shadow-[0_0_40px_rgba(16,185,129,0.5)] hover:-translate-y-1 transition-all flex items-center justify-center gap-2 cursor-pointer">
                     🏆 OFICIALIZAR E GERAR TABELA NO APP
                   </button>
                 </div>
               )}
             </div>

             {/* ÁRVORE DE CONFRONTOS */}
             <div className="w-full flex justify-center overflow-x-auto custom-scrollbar pb-8">
                {/* Coluna da 1ª Fase */}
                <div className="w-64 flex flex-col shrink-0 min-h-[400px]">
                   <div className={`border rounded-xl px-4 py-2.5 text-center shadow-md relative overflow-hidden mb-6 ${chromaMode ? 'bg-green-100 border-green-600' : 'bg-blue-900 border-blue-800'}`}>
                      <span className={`text-xs font-black uppercase tracking-widest ${chromaMode ? 'text-green-800' : 'text-amber-400'}`}>FASE INICIAL</span>
                   </div>

                   <div className="flex flex-col flex-1 h-full py-2">
                      {Array.from({ length: Math.ceil(duplas.length / 2) }).map((_, matchIdx) => {
                         const duplaA = bracketDuplas[matchIdx * 2];
                         const duplaB = bracketDuplas[matchIdx * 2 + 1];
                         const isTop = matchIdx % 2 === 0;

                         return (
                             <div key={matchIdx} className="relative flex-1 flex flex-col justify-center py-3 group">
                                 <div className={`p-3 rounded-xl border flex flex-col gap-1.5 shadow-sm relative z-10 transition-colors ${chromaMode ? 'bg-white border-green-500' : 'bg-blue-900/80 border-blue-800'}`}>
                                    <div className={`flex justify-between items-center text-[9px] font-bold uppercase tracking-wider pb-1 border-b ${chromaMode ? 'border-green-200' : 'border-blue-800/40'}`}>
                                       <span className={chromaMode ? 'text-green-800' : 'text-blue-500'}>Confronto {matchIdx + 1}</span>
                                       <span className={chromaMode ? 'text-gray-500' : 'text-blue-500/50'}>Sorteio</span>
                                    </div>
                                    
                                    <div className="flex items-center justify-between gap-2 min-w-0 mt-0.5">
                                       <div className="flex items-center gap-1.5 min-w-0 flex-1">
                                          <ShieldDisplay shield="🛡️" size="small" />
                                          <span className={`text-xs truncate font-bold ${duplaA ? (chromaMode ? 'text-black' : 'text-white') : (chromaMode ? 'text-gray-400' : 'text-blue-500/50')}`}>
                                             {duplaA ? duplaA.name : 'Aguardando Sorteio'}
                                          </span>
                                       </div>
                                    </div>

                                    <div className="flex items-center justify-between gap-2 min-w-0">
                                       <div className="flex items-center gap-1.5 min-w-0 flex-1">
                                          <ShieldDisplay shield="🛡️" size="small" />
                                          <span className={`text-xs truncate font-bold ${duplaB ? (chromaMode ? 'text-black' : 'text-white') : (chromaMode ? 'text-gray-400' : 'text-blue-500/50')}`}>
                                             {duplaB ? duplaB.name : 'Aguardando Sorteio'}
                                          </span>
                                       </div>
                                    </div>
                                 </div>
                                 
                                 {/* Linha conectora (Mata-mata) */}
                                 {Math.ceil(duplas.length / 2) > 1 && (
                                   <div className={`absolute -right-6 w-6 ${chromaMode ? 'border-green-600' : 'border-blue-600/60'} ${isTop ? 'top-1/2 border-t-[2px] border-r-[2px] h-1/2 rounded-tr-xl' : 'bottom-1/2 border-b-[2px] border-r-[2px] h-1/2 rounded-br-xl'}`}></div>
                                 )}
                             </div>
                         );
                      })}
                   </div>
                </div>
                
                {/* Coluna Visual Mockada da 2ª Fase (Apenas para estética de árvore) */}
                {Math.ceil(duplas.length / 2) > 1 && (
                  <div className="w-64 flex flex-col shrink-0 min-h-[400px] ml-6 opacity-60">
                     <div className={`border rounded-xl px-4 py-2.5 text-center shadow-md relative overflow-hidden mb-6 ${chromaMode ? 'bg-green-100 border-green-600' : 'bg-blue-900 border-blue-800'}`}>
                        <span className={`text-xs font-black uppercase tracking-widest ${chromaMode ? 'text-green-800' : 'text-blue-400'}`}>PRÓXIMA FASE</span>
                     </div>
                     <div className="flex flex-col flex-1 h-full py-2">
                        {Array.from({ length: Math.ceil(duplas.length / 4) }).map((_, matchIdx) => (
                            <div key={matchIdx} className="relative flex-1 flex flex-col justify-center py-3 group">
                               <div className={`p-3 rounded-xl border flex flex-col gap-1.5 shadow-sm relative z-10 ${chromaMode ? 'bg-white border-green-500' : 'bg-blue-900/80 border-blue-800'}`}>
                                   <div className={`flex justify-between items-center text-[9px] font-bold uppercase tracking-wider pb-1 border-b ${chromaMode ? 'border-green-200' : 'border-blue-800/40'}`}>
                                       <span className={chromaMode ? 'text-gray-400' : 'text-blue-500/50'}>A Definir</span>
                                   </div>
                                   <div className="h-10"></div>
                               </div>
                            </div>
                        ))}
                     </div>
                  </div>
                )}
             </div>
          </div>
        )}

      </div>
    </div>
  );
};

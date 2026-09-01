import React, { useState, useEffect, useMemo, useRef } from 'react';
import { initializeApp } from 'firebase/app';
import Dashboard from './components/Dashboard';
import { auth, db, getPublicPath, getPublicDocPath } from './utils/firebase';
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged, sendPasswordResetEmail, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { getFirestore, doc, setDoc, updateDoc, onSnapshot, collection, deleteDoc, query, orderBy, limit, where, initializeFirestore, getDocs } from 'firebase/firestore';
import { PONTOS } from './utils/pontuacoes';
import { 
  calculateStandings, 
  getChampionIds, 
  generateCupBracket, 
  generateRoundRobin, 
  generateGroupsAndKnockout, 
  generateDuplasCupBracket 
} from './utils/torneios';
import ShieldDisplay from './components/ShieldDisplay';
import RulesPage from './components/RulesPage';
import TrainingCenter from './components/TrainingCenter';
import { Home, Trophy, Medal, Camera, CheckSquare, Users, LogOut, UploadCloud, CheckCircle, XCircle, AlertCircle, Activity, PlusCircle, ArrowLeft, PlayCircle, Lock, Shield, BookOpen, Trash2, Edit, Save, X, MessageCircle, Send, Crown, User, UserPlus, Award, Star, Key, Heart, MoreHorizontal, Target, Dices, Landmark, Wallet, ShoppingCart, Zap, Brain, Eye, Flame, Calendar, Globe } from 'lucide-react';
import { processImage, processScreenshot, ROLE_NAMES } from './utils/helpers';
import KameBank from './components/KameBank';
import KameStore from './components/KameStore';
import GlobalRanking from './components/GlobalRanking';
import SocialFeed from './components/SocialFeed';
import Profile from './components/Profile';
import PredictionsPanel from './components/PredictionsPanel';
import LoginScreen from './components/LoginScreen';
import Standings from './components/Standings';
import MatchDetails from './components/MatchDetails';
import TeamsList from './components/TeamsList';
import Button from './components/Button';
import CompetitionDetails from './components/CompetitionDetails';
import CreateCompetition from './components/CreateCompetition';
import JoinCompetition from './components/JoinCompetition';

const LOGO_URL = "https://i.imgur.com/dhXA0ni.png"; 

const inputClass = "w-full bg-blue-950 border border-blue-700 focus:border-emerald-500 rounded-lg p-3 text-white outline-none transition-colors text-sm";

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

const CompetitionsList = ({ competitions, teams, currentUser, onSelectComp, onDeleteComp }) => {
  const isAdmin = currentUser?.role === 'leader' || currentUser?.role === 'kaioh' || currentUser?.role === 'organizer';
  const canDelete = currentUser?.role === 'leader' || currentUser?.role === 'kaioh';

  const isLeader = currentUser?.role === 'leader' || currentUser?.role === 'kaioh';
  const isCompAdmin = (c) => isLeader || c?.creatorId === currentUser?.id || (c?.admins || []).includes(currentUser?.id);
  
  const userTeamIds = (teams || []).filter(t => t && t.ownerId === currentUser?.id).map(t => t.id);
  const visible = (competitions || []).filter(c => c && (isCompAdmin(c) || c.teams?.some(t => userTeamIds.includes(t))));

  // Filtra as ativas e as finalizadas
  const activeComps = visible.filter(c => c.status !== 'finished');
  const finishedComps = visible.filter(c => c.status === 'finished');

  // 🌟 PADRONIZAÇÃO DE NOMES AQUI
  // Força tudo para MAIÚSCULO para manter o painel organizado visualmente
  const formatName = (c) => {
    let name = c.category === 'copa_flash' ? `COPA FLASH KAME - ${c.name}` : String(c.name);
    return name.toUpperCase(); // <-- Transforma qualquer texto em maiúsculo
  };

  return (
    <div className="space-y-8 animate-in fade-in pb-8">
      
      {/* 🟢 COMPETIÇÕES ATIVAS */}
      <div>
        <div className="flex items-center gap-2 mb-4"><Medal className="text-emerald-500"/><h2 className="text-xl font-bold text-white">Campeonatos Ativos</h2></div>
        {activeComps.length === 0 ? (
          <p className="text-blue-500 text-sm p-4 bg-blue-950 rounded-xl border border-blue-800">Nenhuma competição ativa no momento.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {activeComps.map(c => (
              <div key={c.id} onClick={()=>onSelectComp(c.id)} className="bg-blue-900 p-5 rounded-2xl border border-blue-800 hover:border-emerald-500/40 transition-all cursor-pointer flex justify-between items-center group shadow-md relative overflow-hidden">
                {c.category === 'copa_flash' && <div className="absolute top-0 left-0 w-1.5 h-full bg-amber-500"></div>}
                <div className={c.category === 'copa_flash' ? 'pl-2' : ''}>
                  {/* Apliquei a classe 'uppercase' aqui também por segurança */}
                  <h3 className="font-bold text-white uppercase group-hover:text-emerald-400 transition-colors">{formatName(c)}</h3>
                  <p className="text-xs text-blue-400 mt-1">{c.teams?.length || 0} Clubes inscritos • <span className="text-emerald-500 font-medium">{c.status === 'registration' ? 'Inscrições Abertas' : 'Em Andamento'}</span></p>
                </div>
                {canDelete && <button onClick={(e)=>{e.stopPropagation(); if(window.confirm('Excluir torneio?')) onDeleteComp(c.id)}} className="text-blue-600 hover:text-red-400 p-2 z-10"><Trash2 size={16}/></button>}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 🔴 COMPETIÇÕES FINALIZADAS */}
      {finishedComps.length > 0 && (
        <div className="pt-6 border-t border-blue-800/50">
          <div className="flex items-center gap-2 mb-4"><BookOpen className="text-slate-400"/><h2 className="text-xl font-bold text-slate-300">Histórico de Finalizadas</h2></div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {finishedComps.map(c => (
              <div key={c.id} onClick={()=>onSelectComp(c.id)} className="bg-blue-950/60 p-4 rounded-2xl border border-blue-900 hover:border-slate-500/40 transition-all cursor-pointer flex justify-between items-center group opacity-80 hover:opacity-100">
                {c.category === 'copa_flash' && <div className="absolute top-0 left-0 w-1.5 h-full bg-amber-500/50"></div>}
                <div className={c.category === 'copa_flash' ? 'pl-2' : ''}>
                  <h3 className="font-bold text-slate-300 uppercase group-hover:text-white transition-colors">{formatName(c)}</h3>
                  <p className="text-xs text-slate-500 mt-1">Finalizada</p>
                </div>
                {canDelete && <button onClick={(e)=>{e.stopPropagation(); if(window.confirm('Excluir torneio do histórico?')) onDeleteComp(c.id)}} className="text-blue-800 hover:text-red-400 p-2 z-10"><Trash2 size={14}/></button>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

const SubmitMatch = ({ teams, competitions, matches, onSubmit, currentUser, showToast, preSelectedCompId }) => {
  const [selectedCompId, setSelectedCompId] = useState(preSelectedCompId || '');
  const [selectedMatchId, setSelectedMatchId] = useState('');
  const [availableMatches, setAvailableMatches] = useState([]);
  
  const [teamA, setTeamA] = useState(null);
  const [teamB, setTeamB] = useState(null);
  const [scoreA, setScoreA] = useState('');
  const [scoreB, setScoreB] = useState('');
  const [penaltiesA, setPenaltiesA] = useState('');
  const [penaltiesB, setPenaltiesB] = useState('');

  const [goalsA, setGoalsA] = useState([]);
  const [goalsB, setGoalsB] = useState([]);
  const [observacoes, setObservacoes] = useState('');
  
  const [matchImageBase64, setMatchImageBase64] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [imageUploaded, setImageUploaded] = useState(false);
  const [isSubmittingMatch, setIsSubmittingMatch] = useState(false);
  
  const [isManualMode, setIsManualMode] = useState(false);
  
  const [woA, setWoA] = useState(false);
  const [woB, setWoB] = useState(false);

  const [drawState, setDrawState] = useState({ 
    active: false, phase: 'idle', winner: null, flicker: 'A' 
  });

  const [userApiKey, setUserApiKey] = useState(() => {
    try { return localStorage.getItem('gemini_api_key') || ''; }
    catch(e) { return ''; }
  });
  
  const [showKeyInput, setShowKeyInput] = useState(false);
  const [tempKey, setTempKey] = useState('');

  const isLeader = currentUser?.role === 'leader' || currentUser?.role === 'kaioh';
  const isCompAdmin = (c) => isLeader || c?.creatorId === currentUser?.id || (c?.admins || []).includes(currentUser?.id);
  const isAdmin = isLeader;
  const userTeamIds = (teams || []).filter(t => t.ownerId === currentUser?.id).map(t => t.id);

  const visibleCompetitions = useMemo(() => {
    return (competitions || []).filter(c => {
      if (!c || c.status !== 'active') return false;
      const amIAdmin = isCompAdmin(c);
      const isParticipant = (c.teams || []).some(tId => userTeamIds.includes(tId));
      
      if (!amIAdmin && !isParticipant) return false;
      
      let hasAvailableMatch = false;
      if (c.rounds) {
        c.rounds.filter(r => r.status === 'released').forEach(round => {
          round.matches.forEach(rm => {
            const alreadySubmitted = matches.some(m => m.matchId === rm.id && m.compId === c.id && (m.status === 'pending' || m.status === 'approved'));
            if (!alreadySubmitted && rm.teamA && rm.teamB && (amIAdmin || userTeamIds.includes(rm.teamA) || userTeamIds.includes(rm.teamB))) {
              hasAvailableMatch = true;
            }
          });
        });
      }
      return hasAvailableMatch;
    });
  }, [competitions, matches, isLeader, userTeamIds]);
  
  const selectedComp = useMemo(() => (competitions || []).find(c => c.id === selectedCompId), [selectedCompId, competitions]);
  const isCup = selectedComp?.format === 'cup' || (selectedComp?.format === 'groups' && selectedMatchId.includes('_ko_'));
  const isTie = scoreA !== '' && scoreB !== '' && scoreA === scoreB;

  useEffect(() => {
    if (!selectedCompId) { setAvailableMatches([]); return; }
    const comp = competitions.find(c => c.id === selectedCompId);
    if (comp && comp.rounds) {
      let toPlay = [];
      const amIAdmin = isCompAdmin(comp); 
      comp.rounds.filter(r => r.status === 'released').forEach(round => {
        round.matches.forEach(rm => {
          const alreadySubmitted = matches.some(m => m.matchId === rm.id && m.compId === comp.id && (m.status === 'pending' || m.status === 'approved'));
          if (!alreadySubmitted && rm.teamA && rm.teamB && (amIAdmin || userTeamIds.includes(rm.teamA) || userTeamIds.includes(rm.teamB))) {
            toPlay.push({ ...rm, roundId: round.id, roundName: round.number }); // 👈 AQUI!
          }
        });
      });
      setAvailableMatches(toPlay);
    }
  }, [selectedCompId, competitions, matches]);

  useEffect(() => { setSelectedMatchId(''); resetAI(); }, [selectedCompId]);

  useEffect(() => {
    resetAI();
    if (selectedMatchId) {
      const match = availableMatches.find(m => m.id === selectedMatchId);
      if (match) {
        setTeamA((teams || []).find(t => t.id === match.teamA));
        setTeamB((teams || []).find(t => t.id === match.teamB));
      }
    } else {
      setTeamA(null); setTeamB(null);
    }
  }, [selectedMatchId]);

  useEffect(() => {
    if (drawState.active && drawState.phase === 'spinning') {
      let ticks = 0;
      const interval = setInterval(() => {
        setDrawState(prev => ({ ...prev, flicker: prev.flicker === 'A' ? 'B' : 'A' }));
        ticks++;
        if (ticks > 35) {
          clearInterval(interval);
          setDrawState(prev => ({ ...prev, phase: 'revealed', flicker: prev.winner }));
          setTimeout(() => {
             processSubmission(drawState.winner);
             setDrawState({ active: false, phase: 'idle', winner: null, flicker: 'A' });
          }, 4000);
        }
      }, 100); 
      return () => clearInterval(interval);
    }
  }, [drawState.active, drawState.phase, drawState.winner]);

  const resetAI = () => {
    setScoreA(''); setScoreB('');
    setPenaltiesA(''); setPenaltiesB('');
    setGoalsA([]); setGoalsB([]);
    setObservacoes('');
    setImageUploaded(false);
    setMatchImageBase64(null);
    setIsManualMode(false); 
    setWoA(false); setWoB(false);
  };

  const calculateSimilarity = (str1, str2) => {
    if(!str1 || !str2) return 0;
    const words1 = str1.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/).filter(w => w.length > 2);
    const words2 = str2.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/).filter(w => w.length > 2);
    return words1.filter(w => words2.includes(w)).length;
  };

  const handleSaveApiKey = () => {
    if (tempKey.trim() !== '') {
      try { localStorage.setItem('gemini_api_key', tempKey.trim()); } catch(e) {}
      setUserApiKey(tempKey.trim());
      setShowKeyInput(false);
      showToast("Chave da IA ativada com sucesso!", "success");
    }
  };

  const runAIOnFile = (file) => {
    if (!file) return;

    if (!userApiKey) {
      setShowKeyInput(true);
      showToast("Por favor, cole a sua chave do Gemini primeiro.", "error");
      return;
    }

    processScreenshot(file, async (base64) => {
      setMatchImageBase64(base64);
      setIsAnalyzing(true);
      setScoreA('0'); setScoreB('0'); setGoalsA([]); setGoalsB([]); setPenaltiesA(''); setPenaltiesB('');

      try {
        const prompt = `Analise o placar final deste jogo de Dream League Soccer (DLS).
REGRAS:
1. O escudo do lado ESQUERDO tem um placar. O escudo do lado DIREITO tem um placar.
2. Na lista central, identifique quem fez gol. GOLS possuem o ícone de uma BOLA DE FUTEBOL (⚽) ao lado.
3. ASSISTÊNCIAS: Possuem o ícone de uma CHUTEIRA (👟) ao lado. Vincule a assistência ao gol do mesmo lado correspondente. Nem todo gol tem assistência. Deixe o campo assist vazio ("") se não houver.
4. CARTÕES possuem um ícone retangular (🟨/🟥). IGNORE COMPLETAMENTE os jogadores com cartões.
5. Liste os jogadores e minutos agrupando por quem está no lado esquerdo ou direito. Remova os parênteses dos minutos.

Retorne EXATAMENTE este formato JSON. Não use marcações de código Markdown e não escreva mais nada.
{
  "leftTeamName": "nome lido no escudo da esquerda",
  "leftScore": 0,
  "leftGoals": [{"player": "Nome do Goleador", "assist": "Nome da Assistência ou vazio", "minute": "90"}],
  "rightTeamName": "nome lido no escudo da direita",
  "rightScore": 0,
  "rightGoals": [{"player": "Nome do Goleador", "assist": "", "minute": "90"}]
}`;
        
        const mimeType = base64.match(/data:(.*?);base64/)[1];
        const base64ImageData = base64.split(',')[1];

        const payload = {
          contents: [{ role: "user", parts: [ { text: prompt }, { inlineData: { mimeType: mimeType, data: base64ImageData } } ] }],
          generationConfig: { responseMimeType: "application/json" }
        };

        const safeKey = userApiKey.trim();
        
        // 🌟 LISTA BLINDADA (2026): Nomes exatos dos modelos que o Google não deletou.
        const modelsToTry = [
          "gemini-3.7-flash",
          "gemini-3.5-flash",
          "gemini-1.5-flash-002",
          "gemini-1.5-pro-002"
        ];
        
        let resultJson = null;
        let lastErrorMsg = "";

        for (const modelName of modelsToTry) {
           const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${safeKey}`;
           try {
             const response = await fetch(endpoint, { 
               method: 'POST', 
               headers: { 'Content-Type': 'application/json' }, 
               body: JSON.stringify(payload) 
             });

             if (response.ok) {
                resultJson = await response.json();
                break; // Achou um modelo vivo! Sai do loop.
             } else {
                const errData = await response.json().catch(() => null);
                const errorMsg = errData?.error?.message || `Erro ${response.status}`;
                lastErrorMsg = errorMsg;
                
                // Se a chave for inválida de fato, aborta imediatamente
                if (response.status === 403 || (response.status === 400 && errorMsg.includes("API key not valid"))) {
                  try { localStorage.removeItem('gemini_api_key'); } catch(e) {}
                  setUserApiKey(''); setShowKeyInput(true);
                  throw new Error("Sua chave do Gemini é inválida. Cole uma nova.");
                }
             }
           } catch (err) {
             if (err.message.includes('inválida')) throw err;
             lastErrorMsg = err.message;
           }
        }

        if (!resultJson || !resultJson.candidates) {
           throw new Error(`Falha do Google. Último erro: ${lastErrorMsg}`);
        }

        let textResponse = resultJson.candidates[0].content.parts[0].text.trim();
        textResponse = textResponse.replace(/```json/gi, '').replace(/```/g, '').trim();
        
        const data = JSON.parse(textResponse);
        const leftName = String(data.leftTeamName || "");
        const rightName = String(data.rightTeamName || "");
        const nameA = String(teamA?.name || "");
        const nameB = String(teamB?.name || "");

        const leftMatchesA = calculateSimilarity(leftName, nameA);
        const rightMatchesA = calculateSimilarity(rightName, nameA);
        const leftMatchesB = calculateSimilarity(leftName, nameB);
        const rightMatchesB = calculateSimilarity(rightName, nameB);

        const isTeamA_Left = (leftMatchesA + rightMatchesB) >= (leftMatchesB + rightMatchesA);

        if (isTeamA_Left) {
          setScoreA(data.leftScore?.toString() || '0'); setScoreB(data.rightScore?.toString() || '0');
          setGoalsA(data.leftGoals || []); setGoalsB(data.rightGoals || []);
        } else {
          setScoreA(data.rightScore?.toString() || '0'); setScoreB(data.leftScore?.toString() || '0');
          setGoalsA(data.rightGoals || []); setGoalsB(data.leftGoals || []);
        }

        if (showToast) showToast("Dados extraídos do Print pela IA!", "success");
        setImageUploaded(true);

      } catch (error) {
        console.error("Erro IA:", error);
        if (showToast) { showToast(`Falha: ${error.message.substring(0, 100)}`, "error"); } else { alert(`Falha na IA: ${error.message}`); }
        setMatchImageBase64(null); 
      } finally {
        setIsAnalyzing(false); 
      }
    });
  };
  
  const handleImageUpload = (e) => {
    runAIOnFile(e.target.files[0]);
  };

  useEffect(() => {
    const handlePaste = (e) => {
      if (!selectedMatchId || isManualMode || isAnalyzing || imageUploaded) return;
      const items = e.clipboardData?.items;
      if (!items) return;
      
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const file = items[i].getAsFile();
          runAIOnFile(file);
          break;
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedMatchId, isManualMode, isAnalyzing, imageUploaded, userApiKey, teamA, teamB]);

  const handlePasteFromClipboardClick = async () => {
    try {
      if (!navigator.clipboard || !navigator.clipboard.read) {
         showToast("Seu navegador não suporta colar direto do botão. Envie o arquivo normalmente.", "error");
         return;
      }
      const clipboardItems = await navigator.clipboard.read();
      for (const clipboardItem of clipboardItems) {
        const imageTypes = clipboardItem.types.filter(type => type.startsWith('image/'));
        if (imageTypes.length > 0) {
          const blob = await clipboardItem.getType(imageTypes[0]);
          const file = new File([blob], "pasted-image.png", { type: imageTypes[0] });
          runAIOnFile(file);
          return;
        }
      }
      showToast("Nenhuma imagem encontrada na área de transferência.", "error");
    } catch (err) {
      console.error(err);
      showToast("Permissão negada ou não há imagem copiada.", "error");
    }
  };

  const handleAddGoal = (team) => {
    if (team === 'A') { setGoalsA([...goalsA, { player: '', assist: '', minute: '' }]); setScoreA((parseInt(scoreA || 0) + 1).toString()); } 
    else { setGoalsB([...goalsB, { player: '', assist: '', minute: '' }]); setScoreB((parseInt(scoreB || 0) + 1).toString()); }
  };

  const handleRemoveGoal = (team, index) => {
    if (team === 'A') { const updated = [...goalsA]; updated.splice(index, 1); setGoalsA(updated); setScoreA(Math.max(0, parseInt(scoreA || 0) - 1).toString()); } 
    else { const updated = [...goalsB]; updated.splice(index, 1); setGoalsB(updated); setScoreB(Math.max(0, parseInt(scoreB || 0) - 1).toString()); }
  };

  const handleGoalChange = (team, index, field, value) => {
    if (team === 'A') { const updated = [...goalsA]; updated[index][field] = value; setGoalsA(updated); } 
    else { const updated = [...goalsB]; updated[index][field] = value; setGoalsB(updated); }
  };

  const handleSubmitInit = async (e) => {
    e.preventDefault(); 
    
    if(!selectedCompId || !selectedMatchId) {
       showToast("Selecione o campeonato e a partida primeiro.", "error");
       return;
    }
    
    if (scoreA === '' || scoreB === '') {
      if (!woA && !woB) {
         showToast("Preencha o placar das duas equipes antes de enviar.", "error");
         return; 
      }
    }

    if (isCup && scoreA === scoreB && (penaltiesA === '' || penaltiesB === '') && !woA && !woB) {
      if(showToast) showToast("⚠️ Em Mata-Mata não pode haver empate! Preencha os Pênaltis para enviar.", "error");
      return;
    }

    if (woA && woB) {
      const drawnWinner = Math.random() < 0.5 ? 'A' : 'B';
      setDrawState({ active: true, phase: 'spinning', winner: drawnWinner, flicker: 'A' });
      return;
    }

    await processSubmission(null);
  };

  const processSubmission = async (forcedDoubleWoWinner = null) => {
    setIsSubmittingMatch(true);
    let finalScoreA = scoreA;
    let finalScoreB = scoreB;
    let isDoubleWo = forcedDoubleWoWinner !== null;

    if (isDoubleWo) {
        finalScoreA = forcedDoubleWoWinner === 'A' ? 3 : 0;
        finalScoreB = forcedDoubleWoWinner === 'A' ? 0 : 3;
    } else if (woA) {
        finalScoreA = 0; finalScoreB = 3;
    } else if (woB) {
        finalScoreA = 3; finalScoreB = 0;
    }

    const matchDetails = availableMatches.find(m => m.id === selectedMatchId);
    
    const safeTeamAId = teamA?.id || '';
    const safeTeamBId = teamB?.id || '';

    const allGoals = [
      ...(goalsA || []).map(g => ({ teamId: safeTeamAId, player: g.player, assist: g.assist || '', minute: g.minute })),
      ...(goalsB || []).map(g => ({ teamId: safeTeamBId, player: g.player, assist: g.assist || '', minute: g.minute }))
    ];

    const finalObs = isDoubleWo 
      ? `Sorteio de Duplo W.O.! Vencedor: ${forcedDoubleWoWinner === 'A' ? teamA?.name : teamB?.name}\n${observacoes}`.trim() 
      : (woA || woB ? `Vitória por W.O.\n${observacoes}`.trim() : observacoes.trim());

    await onSubmit({
      id: `m_${Date.now()}`, 
      compId: selectedCompId, 
      roundId: matchDetails?.roundId || '', 
      matchId: selectedMatchId, 
      teamA: safeTeamAId, 
      teamB: safeTeamBId, 
      scoreA: parseInt(finalScoreA), 
      scoreB: parseInt(finalScoreB),
      penaltiesA: (isCup && finalScoreA === finalScoreB && penaltiesA !== '') ? parseInt(penaltiesA) : null,
      penaltiesB: (isCup && finalScoreA === finalScoreB && penaltiesB !== '') ? parseInt(penaltiesB) : null,
      goals: (woA || woB || isDoubleWo) ? [] : allGoals,
      observacoes: finalObs, 
      status: 'pending', 
      submittedBy: currentUser?.name || 'Técnico', 
      imageUrl: matchImageBase64
    });
    
    setIsSubmittingMatch(false);
    setSelectedCompId('');
  };

  return (
    <div className="max-w-2xl mx-auto animate-in fade-in duration-500 pb-12 relative">
      
      {drawState.active && (
        <div className="fixed inset-0 bg-black/95 z-50 flex flex-col items-center justify-center p-6 backdrop-blur-md animate-in fade-in zoom-in-95 duration-300">
          <h2 className="text-3xl font-black text-amber-400 uppercase tracking-widest mb-12 animate-pulse text-center">
            {drawState.phase === 'spinning' ? 'Sorteando Vencedor...' : 'VENCEDOR DO W.O. DUPLO!'}
          </h2>

          <div className="relative w-64 h-64 flex items-center justify-center">
             <div className={`absolute inset-0 rounded-full blur-3xl opacity-50 ${drawState.phase === 'revealed' ? 'bg-emerald-500 animate-pulse' : 'bg-blue-500'}`}></div>
             
             <div className={`absolute transition-all duration-100 ${drawState.flicker === 'A' ? 'scale-110 opacity-100 z-10' : 'scale-90 opacity-20 blur-sm z-0'}`}>
                <div className="flex flex-col items-center">
                  <ShieldDisplay shield={teamA?.shield} size="large" />
                  <span className="mt-6 text-2xl font-black text-white bg-black/50 px-4 py-2 rounded-xl text-center shadow-lg border border-white/10 uppercase tracking-wider">{teamA?.name}</span>
                </div>
             </div>

             <div className={`absolute transition-all duration-100 ${drawState.flicker === 'B' ? 'scale-110 opacity-100 z-10' : 'scale-90 opacity-20 blur-sm z-0'}`}>
                <div className="flex flex-col items-center">
                  <ShieldDisplay shield={teamB?.shield} size="large" />
                  <span className="mt-6 text-2xl font-black text-white bg-black/50 px-4 py-2 rounded-xl text-center shadow-lg border border-white/10 uppercase tracking-wider">{teamB?.name}</span>
                </div>
             </div>
          </div>

          {drawState.phase === 'revealed' && (
            <div className="mt-16 bg-emerald-600/20 border border-emerald-500 p-4 rounded-2xl animate-in slide-in-from-bottom-8">
               <p className="text-emerald-400 font-bold text-center">Resultado gravado com sucesso. Enviando dados...</p>
            </div>
          )}
        </div>
      )}

      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-white flex items-center gap-2"><Camera className="text-emerald-500" /> Registrar Partida</h2>
        <button onClick={() => setShowKeyInput(!showKeyInput)} className="text-xs flex items-center gap-1 bg-blue-800 hover:bg-blue-700 text-blue-300 px-3 py-1.5 rounded-lg border border-blue-700 transition-colors">
          <Key size={14}/> IA Config
        </button>
      </div>

      <div className="bg-blue-900 p-6 rounded-2xl border border-blue-800 space-y-6">
        
        {showKeyInput && (
          <div className="bg-amber-500/10 border border-amber-500/30 p-4 rounded-xl animate-in slide-in-from-top-4">
            <h3 className="text-sm font-bold text-amber-400 mb-2 flex items-center gap-2"><Key size={16}/> Chave de Ativação do Gemini</h3>
            <p className="text-xs text-blue-400 mb-3">Para usar a leitura inteligente de Prints, cole a sua chave exclusiva do <b>Google AI Studio</b>. Ela ficará salva apenas no seu navegador.</p>
            <div className="flex gap-2">
              <input type="password" value={tempKey} onChange={e=>setTempKey(e.target.value)} placeholder="Ex: AIzaSy... ou AQAQ..." className="flex-1 bg-blue-950 border border-blue-700 rounded-lg p-2 text-white text-sm outline-none focus:border-amber-500" />
              <button onClick={handleSaveApiKey} className="bg-amber-600 hover:bg-amber-500 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-lg shadow-amber-900/50">Salvar</button>
            </div>
            <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" className="text-[10px] text-emerald-400 hover:underline mt-2 inline-block">Clique aqui para gerar uma chave grátis ➔</a>
          </div>
        )}

        {!preSelectedCompId && (
          <div>
            <label className="block text-sm font-medium text-blue-400 mb-2">1. Competição</label>
            <select value={selectedCompId} onChange={e => setSelectedCompId(e.target.value)} className="w-full bg-blue-950 border border-blue-700 rounded-lg p-3 text-white focus:ring-2 focus:ring-emerald-500 outline-none">
              <option value="">Escolha um campeonato...</option>
              {visibleCompetitions.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            {visibleCompetitions.length === 0 && (
              <p className="text-xs text-blue-500 mt-2">Nenhuma competição pendente disponível para você no momento.</p>
            )}
          </div>
        )}

        {selectedCompId && (
          <div className="animate-in fade-in">
            <label className="block text-sm font-medium text-blue-400 mb-2">2. Selecione a Partida Liberada</label>
            {availableMatches.length > 0 ? (
              <select value={selectedMatchId} onChange={e => setSelectedMatchId(e.target.value)} className="w-full bg-blue-950 border border-blue-700 rounded-lg p-3 text-white text-sm outline-none focus:border-emerald-500">
            <option value="">Selecione o Confronto...</option>
            {availableMatches.map(m => {
              const isDupla = selectedComp?.category === 'copa_flash_dupla';
              const isIda = m.id.includes('_ida');
              
              const tA = teams.find(t => t.id === m.teamA);
              const tB = teams.find(t => t.id === m.teamB);
              
              let nameA = tA?.name || 'A Definir';
              let nameB = tB?.name || 'A Definir';

              // Esconde o adversário no jogo de ida das duplas (apenas para jogadores normais)
              if (isDupla && isIda && !isAdmin) {
                  if (userTeamIds.includes(m.teamA)) {
                      nameB = 'Adversário Oculto 🕵️';
                  } else if (userTeamIds.includes(m.teamB)) {
                      nameA = 'Adversário Oculto 🕵️';
                  }
              }

              return (
                <option key={m.id} value={m.id}>Rodada {m.roundName}: {nameA} x {nameB}</option>
              )
            })}
          </select>
            ) : <div className="p-3 bg-blue-950 rounded border border-blue-800 text-blue-500 text-sm">Tudo limpo!.</div>}
          </div>
        )}

        {selectedMatchId && !isManualMode && (
          <div className="animate-in slide-in-from-top-4">
            <label className="block text-sm font-medium text-blue-400 mb-2 flex justify-between items-end">
              <span>3. Envie o Print do Resultado</span>
              <span className="text-[10px] text-amber-400/80 uppercase font-black tracking-widest hidden sm:inline-block">Dica: CTRL+V para Colar</span>
            </label>
            
            <div className="flex flex-col gap-3 mb-2">
              <label className={`block border-2 border-dashed rounded-xl p-6 text-center transition-colors cursor-pointer relative overflow-hidden focus:outline-none ${matchImageBase64 ? 'border-emerald-500 bg-emerald-500/5' : 'border-blue-700 hover:border-blue-500 bg-blue-950'}`}>
                <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} disabled={isAnalyzing} />
                {isAnalyzing ? (
                  <div className="flex flex-col items-center space-y-3">
                    <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-emerald-400 font-medium">IA analisando o print...</p>
                  </div>
                ) : imageUploaded ? (
                  <div className="flex flex-col items-center space-y-2">
                    <CheckCircle className="text-emerald-500" size={40} />
                    <p className="text-emerald-400 font-medium">Dados extraídos com sucesso!</p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center space-y-3">
                    <UploadCloud className="text-blue-500" size={40} />
                    <p className="text-white font-medium px-4">
                      Clique para buscar na Galeria
                    </p>
                  </div>
                )}
              </label>

              {!isAnalyzing && !imageUploaded && (
                <button 
                  type="button" 
                  onClick={handlePasteFromClipboardClick}
                  className="bg-blue-800/80 hover:bg-blue-700 border border-blue-600/50 text-blue-200 font-bold py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition-colors shadow-sm"
                >
                  📋 Colar Imagem Copiada (Celular)
                </button>
              )}
            </div>
            
            {!imageUploaded && !isAnalyzing && (
              <div className="text-center mt-4">
                <button type="button" onClick={() => setIsManualMode(true)} className="text-sm text-blue-400 hover:text-emerald-400 transition-colors underline">
                  Não tem o print? Preencher manualmente
                </button>
              </div>
            )}
          </div>
        )}

        {(imageUploaded || isManualMode) && (
          <form onSubmit={handleSubmitInit} className="animate-in slide-in-from-bottom-4 space-y-6 pt-4 border-t border-blue-800">
            <div className="flex justify-between items-center mb-2">
              <label className="text-sm font-medium text-amber-400 flex items-center gap-2">
                <AlertCircle size={16}/> 
                {isManualMode ? "Preencha os dados da partida manualmente" : "Confirme os dados lidos pela IA"}
              </label>
              
              {isManualMode && (
                <button type="button" onClick={() => setIsManualMode(false)} className="text-xs text-blue-400 hover:text-white transition-colors underline">
                  Voltar para envio de imagem
                </button>
              )}
            </div>
            
            {(() => {
              const m = availableMatches.find(x=>x.id===selectedMatchId);
              const isDupla = selectedComp?.category === 'copa_flash_dupla';
              const isIda = m?.id?.includes('_ida'); // 👈 O segredo está neste ponto de interrogação extra!
              const hideOpponent = isDupla && isIda && !isAdmin;

              const teamAObj = teams.find(t=>t.id===m?.teamA);
              const teamBObj = teams.find(t=>t.id===m?.teamB);
              
              const amITeamA = userTeamIds.includes(m?.teamA);

              const shieldA = (hideOpponent && !amITeamA) ? "❓" : teamAObj?.shield;
              const shieldB = (hideOpponent && amITeamA) ? "❓" : teamBObj?.shield;
              const nameA = (hideOpponent && !amITeamA) ? 'Oculto' : teamAObj?.name;
              const nameB = (hideOpponent && amITeamA) ? 'Oculto' : teamBObj?.name;

              return (
                <div className="flex flex-col md:flex-row gap-6 items-start bg-blue-950 p-4 rounded-xl border border-blue-800">
                  <div className="flex-1 w-full space-y-3">
                    <div className="flex justify-between items-center mb-2">
                      <div className="text-center font-bold text-lg text-blue-300 flex items-center justify-center gap-2"><ShieldDisplay shield={shieldA} size="small" /> {nameA}</div>
                      <label className="flex items-center gap-1 text-[10px] text-red-400 font-bold bg-red-500/10 px-2 py-1 rounded cursor-pointer border border-red-500/20 hover:bg-red-500/20 transition-colors">
                        <input type="checkbox" checked={woA} onChange={(e) => {
                          const isWo = e.target.checked;
                          setWoA(isWo);
                          if (isWo && !woB) { setScoreA('0'); setScoreB('3'); setGoalsA([]); setGoalsB([]); }
                          else if (!isWo && woB) { setScoreA('3'); setScoreB('0'); }
                          else if (isWo && woB) { setScoreA('?'); setScoreB('?'); setGoalsA([]); setGoalsB([]); }
                          else { setScoreA(''); setScoreB(''); }
                        }} className="accent-red-500 w-3 h-3" /> DAR W.O.
                      </label>
                    </div>
                    <input type="text" inputMode="numeric" pattern="[0-9]*" value={scoreA} onChange={e=>setScoreA(e.target.value)} disabled={woA || woB} className="w-full bg-blue-900 border border-blue-700 rounded-lg p-3 text-white text-center text-3xl font-bold focus:border-emerald-500 outline-none disabled:opacity-50" required />
                    
                    {isCup && isTie && !woA && !woB && (
                      <div className="mt-2">
                        <label className="text-[10px] text-amber-400 uppercase tracking-widest font-bold">Pênaltis A</label>
                        <input type="number" inputMode="numeric" pattern="[0-9]*" required value={penaltiesA} onChange={e=>setPenaltiesA(e.target.value)} className="w-full bg-blue-900 border border-amber-500/50 text-center font-bold text-lg text-amber-400 rounded p-2 outline-none focus:border-amber-500" />
                      </div>
                    )}

                    <div className="space-y-2 pt-2">
                      <span className="text-[10px] text-blue-500 uppercase font-bold block">Gols</span>
                      {goalsA.map((g, i) => (
                        <div key={i} className="flex flex-col gap-1 bg-blue-800 p-2 rounded">
                          <input type="text" value={g.player} onChange={e=>handleGoalChange('A', i, 'player', e.target.value)} placeholder="Goleador" className="w-full bg-blue-950 text-xs text-white px-2 py-1 rounded border border-blue-700 outline-none" required />
                          <div className="flex gap-1">
                            <input type="text" value={g.assist || ''} onChange={e=>handleGoalChange('A', i, 'assist', e.target.value)} placeholder="Assistência" className="flex-1 bg-blue-950 text-[10px] text-blue-400 px-2 py-1 rounded border border-blue-700 outline-none" />
                            <input type="number" inputMode="numeric" pattern="[0-9]*" value={g.minute} onChange={e=>handleGoalChange('A', i, 'minute', e.target.value)} placeholder="Min" className="w-12 bg-blue-950 text-xs text-emerald-400 text-center px-1 py-1 rounded border border-blue-700 outline-none" required />
                            <button type="button" onClick={()=>handleRemoveGoal('A', i)} className="text-red-400 p-1 hover:text-red-300"><X size={12}/></button>
                          </div>
                        </div>
                      ))}
                      {!woA && !woB && <button type="button" onClick={()=>handleAddGoal('A')} className="text-[10px] text-emerald-400 hover:underline">+ Adicionar Gol</button>}
                    </div>
                  </div>
                  
                  <div className="text-blue-500 font-bold text-xl self-center pt-8 hidden md:block">X</div>
                  
                  <div className="flex-1 w-full space-y-3">
                    <div className="flex justify-between items-center mb-2">
                      <label className="flex items-center gap-1 text-[10px] text-red-400 font-bold bg-red-500/10 px-2 py-1 rounded cursor-pointer border border-red-500/20 hover:bg-red-500/20 transition-colors">
                        <input type="checkbox" checked={woB} onChange={(e) => {
                          const isWo = e.target.checked;
                          setWoB(isWo);
                          if (isWo && !woA) { setScoreB('0'); setScoreA('3'); setGoalsA([]); setGoalsB([]); }
                          else if (!isWo && woA) { setScoreB('3'); setScoreA('0'); }
                          else if (isWo && woA) { setScoreA('?'); setScoreB('?'); setGoalsA([]); setGoalsB([]); }
                          else { setScoreA(''); setScoreB(''); }
                        }} className="accent-red-500 w-3 h-3" /> DAR W.O.
                      </label>
                      <div className="text-center font-bold text-lg text-blue-300 flex items-center justify-center gap-2">{nameB} <ShieldDisplay shield={shieldB} size="small" /></div>
                    </div>
                    <input type="text" inputMode="numeric" pattern="[0-9]*" value={scoreB} onChange={e=>setScoreB(e.target.value)} disabled={woA || woB} className="w-full bg-blue-900 border border-blue-700 rounded-lg p-3 text-white text-center text-3xl font-bold focus:border-emerald-500 outline-none disabled:opacity-50" required />
                    
                    {isCup && isTie && !woA && !woB && (
                      <div className="mt-2">
                        <label className="text-[10px] text-amber-400 uppercase tracking-widest font-bold text-right block">Pênaltis B</label>
                        <input type="number" inputMode="numeric" pattern="[0-9]*" required value={penaltiesB} onChange={e=>setPenaltiesB(e.target.value)} className="w-full bg-blue-900 border border-amber-500/50 text-center font-bold text-lg text-amber-400 rounded p-2 outline-none focus:border-amber-500" />
                      </div>
                    )}

                    <div className="space-y-2 pt-2">
                      <span className="text-[10px] text-blue-500 uppercase font-bold block text-right">Gols</span>
                      {goalsB.map((g, i) => (
                        <div key={i} className="flex flex-col gap-1 bg-blue-800 p-2 rounded">
                          <input type="text" value={g.player} onChange={e=>handleGoalChange('B', i, 'player', e.target.value)} placeholder="Goleador" className="w-full bg-blue-950 text-xs text-white px-2 py-1 rounded border border-blue-700 outline-none text-right" required />
                          <div className="flex gap-1">
                            <button type="button" onClick={()=>handleRemoveGoal('B', i)} className="text-red-400 p-1 hover:text-red-300"><X size={12}/></button>
                            <input type="number" inputMode="numeric" pattern="[0-9]*" value={g.minute} onChange={e=>handleGoalChange('B', i, 'minute', e.target.value)} placeholder="Min" className="w-12 bg-blue-950 text-xs text-emerald-400 text-center px-1 py-1 rounded border border-blue-700 outline-none" required />
                            <input type="text" value={g.assist || ''} onChange={e=>handleGoalChange('B', i, 'assist', e.target.value)} placeholder="Assistência" className="flex-1 bg-blue-950 text-[10px] text-blue-400 px-2 py-1 rounded border border-blue-700 outline-none text-right" />
                          </div>
                        </div>
                      ))}
                      {!woA && !woB && <div className="flex justify-end"><button type="button" onClick={()=>handleAddGoal('B')} className="text-[10px] text-emerald-400 hover:underline">+ Adicionar Gol</button></div>}
                    </div>
                  </div>
                </div>
              );
            })()}

            <div className="space-y-1">
              <label className="text-sm font-medium text-blue-400 block">Observações (Opcional)</label>
              <textarea placeholder="Ocorreu alguma queda de conexão? Relate aqui..." value={observacoes} onChange={e=>setObservacoes(e.target.value)} className="w-full bg-blue-950 border border-blue-700 focus:border-emerald-500 rounded-lg p-3 text-blue-300 text-sm h-24 outline-none resize-none transition-colors" />
            </div>

            <Button type="submit" disabled={isSubmittingMatch} className="w-full py-4 text-lg">
               {isSubmittingMatch ? '⏳ Enviando...' : (woA && woB ? '🎲 Iniciar Sorteio de W.O' : 'Enviar Partida para Líderes')}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
};

const ValidationPanel = ({ matches, teams, competitions, onUpdateStatus, showToast, currentUser }) => {
  const isLeader = currentUser?.role === 'leader' || currentUser?.role === 'kaioh';
  const isCompAdmin = (c) => isLeader || c?.creatorId === currentUser?.id || (c?.admins || []).includes(currentUser?.id);

  // Filtra só os pendentes das competições que o usuário atual administra
  const pending = (matches || []).filter(m => {
     if (!m || m.status !== 'pending') return false;
     const comp = competitions.find(c => c.id === m.compId);
     return isCompAdmin(comp);
  });

  const getTeam = (id) => (teams || []).find(t => t && t.id === id);
  const getCompName = (id) => (competitions || []).find(c => c && c.id === id)?.name || 'Torneio';
  
  return (
    <div className="space-y-4 animate-in fade-in">
      <div className="flex justify-between items-center"><h2 className="text-xl font-bold text-white flex items-center gap-2"><CheckSquare className="text-amber-500"/> Validação Cloud</h2><span className="text-xs bg-amber-500/20 text-amber-400 px-2.5 py-0.5 rounded-full font-bold">{pending.length} Pendentes</span></div>
      {pending.length === 0 ? ( <div className="bg-blue-900 p-8 rounded-2xl text-center text-blue-500 border border-blue-800">Tudo validado! Sem pendências na nuvem.</div> ) : (
        <div className="space-y-4">
          {pending.map(m => {
            const tA = getTeam(m.teamA); const tB = getTeam(m.teamB);
            return (
              <div key={m.id} className="bg-blue-900 p-4 rounded-xl border border-blue-800 space-y-3">
                <div className="text-center text-[10px] font-bold text-amber-500 uppercase bg-amber-500/5 py-1 rounded border border-amber-500/10">🏆 {String(getCompName(m.compId))}</div>
                <div className="flex items-center justify-between text-xs bg-blue-950 p-3 rounded-lg">
                  <span className="font-bold flex-1 text-right truncate">{tA?.name}</span>
                  <span className="px-3 py-1 font-mono font-black text-emerald-400 bg-blue-900 border border-blue-800 rounded mx-2">{m.scoreA} x {m.scoreB}</span>
                  <span className="font-bold flex-1 text-left truncate">{tB?.name}</span>
                </div>
                <div className="flex gap-2 justify-end pt-2 border-t border-blue-800/60">
                  <Button variant="outline" className="py-1 text-[11px] border-red-500/30 text-red-400" onClick={()=>onUpdateStatus(m.id,'rejected')}>Recusar</Button>
                  <Button className="py-1 text-[11px]" onClick={()=>onUpdateStatus(m.id,'approved')}>Computar Pontos</Button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  );
};

const CreateTeamManual = ({ onCreate, showToast }) => {
  const [name, setName] = useState(''); const [coach, setCoach] = useState(''); const [shield, setShield] = useState(null);
  return (
    <form onSubmit={async (e)=>{e.preventDefault(); if(!name)return; await onCreate({id:`t${Date.now()}`,name,coach:coach||'Técnico',whatsapp:'',ownerId:'manual',shield:shield||'🛡️'}); showToast("Time salvo!"); setName(''); setCoach(''); setShield(null); }} className="max-w-xl mx-auto bg-blue-900 border border-blue-800 p-6 rounded-2xl space-y-4 animate-in fade-in">
      <h2 className="text-lg font-bold text-white flex items-center gap-2"><UserPlus size={18}/> Novo Time Simples</h2>
      <div><label className="text-xs text-blue-400 block mb-1">Nome do Clube</label><input required value={name} onChange={e=>setName(e.target.value)} className={inputClass}/></div>
      <div><label className="text-xs text-blue-400 block mb-1">Nome do Técnico</label><input value={coach} onChange={e=>setCoach(e.target.value)} className={inputClass}/></div>
      <div className="bg-blue-950 p-3 rounded-xl flex items-center justify-between"><span className="text-xs text-blue-400">Escudo do Time:</span><label className="cursor-pointer bg-blue-800 px-3 py-1.5 rounded text-xs text-white hover:bg-emerald-600"><UploadCloud size={14} className="inline mr-1"/> Enviar Imagem<input type="file" accept="image/*" className="hidden" onChange={e=>processImage(e.target.files[0],setShield)}/></label></div>
      {shield && <div className="text-center p-2"><ShieldDisplay shield={shield} size="large" /></div>}
      <Button type="submit" className="w-full py-3">Salvar Time</Button>
    </form>
  );
};

const CreateTeamFull = ({ onCreate, showToast }) => {
  const [fn, setFn] = useState(''); const [ln, setFnL] = useState(''); const [tn, setTn] = useState(''); const [wa, setWa] = useState(''); const [em, setEm] = useState(''); const [role, setRole] = useState('member');
  return (
    <form onSubmit={async (e)=>{e.preventDefault(); const cl=wa.replace(/\D/g,''); const name=`${fn} ${ln}`; await onCreate({user:{id:`pending_${cl}`,name,email:em.trim().toLowerCase(),role,whatsapp:cl},team:{id:`t${Date.now()}`,name:tn,coach:name,whatsapp:cl,ownerId:`pending_${cl}`,shield:'🛡️'}}); window.open(`https://wa.me/${cl}?text=${encodeURIComponent(`Fala ${fn}! Acesso liberado no Clã Kame DLS:\nLink: ${window.location.origin}\nAtive sua conta em "Primeiro Acesso" com seu E-mail: ${em}`)}`,'_blank'); setFn(''); setFnL(''); setTn(''); setWa(''); setEm(''); }} className="max-w-xl mx-auto bg-blue-900 border border-blue-800 p-6 rounded-2xl space-y-4 animate-in fade-in">
      <h2 className="text-lg font-bold text-white flex items-center gap-2"><Users size={18}/> Convidar Técnico Oficial</h2>
      <div className="grid grid-cols-2 gap-4"><div><input required placeholder="Nome" value={fn} onChange={e=>setFn(e.target.value)} className={inputClass}/></div><div><input required placeholder="Sobrenome" value={ln} onChange={e=>setFnL(e.target.value)} className={inputClass}/></div></div>
      <div><input required placeholder="Nome do Clube" value={tn} onChange={e=>setTn(e.target.value)} className={inputClass}/></div>
      <div className="grid grid-cols-2 gap-4"><div><input required placeholder="WhatsApp com DDD" value={wa} onChange={e=>setWa(e.target.value)} className={inputClass}/></div><div><input required placeholder="E-mail" type="email" value={em} onChange={e=>setEm(e.target.value)} className={inputClass}/></div></div>
      <div><select value={role} onChange={e=>setRole(e.target.value)} className={inputClass}><option value="member">Membro Oficial</option><option value="kaioh">Senhor Kaioh</option></select></div>
      <Button type="submit" className="w-full py-3">Gerar Convite & Chamar no Zap</Button>
    </form>
  );
};

const MembersList = ({ users = [], teams = [], currentUser, onUpdateUserRole, onExpelUser, onApproveUser, onEditUser, showToast }) => {
  const pendingUsers = users.filter(u => u.status === 'pending');
  const activeUsers = users.filter(u => u.status !== 'pending');
  
  // Verificação de segurança com acesso irrestrito para o e-mail Master
  const isSuperAdmin = currentUser?.email === 'saviosaraiva777@gmail.com';
  const isLeader = isSuperAdmin || currentUser?.role === 'leader' || currentUser?.role === 'kaioh';
  const isSupremeLeader = isSuperAdmin || currentUser?.role === 'leader'; 
  
  const [editingId, setEditingId] = useState(null);
  const [editData, setEditData] = useState({ name: '', whatsapp: '' });
  const [searchTerm, setSearchTerm] = useState('');

  const startEdit = (u) => {
    setEditingId(u.id);
    setEditData({ name: u.name, whatsapp: u.whatsapp });
  };

  const saveEdit = (u) => {
    if (!editData.name || !editData.whatsapp) {
      showToast("Preencha o nome e WhatsApp", "error");
      return;
    }
    onEditUser(u.id, editData);
    setEditingId(null);
  };

  // 🌟 CÓDIGO BLINDADO: A lógica de pesos foi movida para DENTRO do sort 
  // para não sofrer problemas de "initialization" (Tela Preta) no Vercel.
  const processedUsers = activeUsers
    .filter(u => (u.name || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
                 (teams.find(t => t.ownerId === u.id)?.name || '').toLowerCase().includes(searchTerm.toLowerCase()))
    .sort((a, b) => {
      // O peso fica embutido aqui dentro, impossível dar erro de escopo!
      const getPrio = (r) => {
        if (r === 'leader') return 1;
        if (r === 'kaioh') return 2;
        if (r === 'organizer') return 3;
        if (r === 'member') return 4;
        return 5;
      };
      
      const priorityA = getPrio(a.role);
      const priorityB = getPrio(b.role);
      
      if (priorityA !== priorityB) {
        return priorityA - priorityB; // Menor número sobe
      }
      return (a.name || '').localeCompare(b.name || ''); // Desempata no nome
    });

  return (
    <div className="space-y-6 animate-in fade-in">
      {isLeader && pendingUsers.length > 0 && (
        <div className="bg-blue-900 border border-amber-500/50 rounded-2xl overflow-hidden shadow-xl">
          <div className="p-4 bg-amber-500/10 border-b border-amber-500/20 flex items-center gap-2"><CheckCircle className="text-amber-500"/><h2 className="font-bold text-amber-500 text-base">Aguardando Aprovação ({pendingUsers.length})</h2></div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs whitespace-nowrap"><thead className="text-blue-400 font-bold border-b border-blue-800"><tr><th className="p-3">Técnico</th><th className="p-3">Clube</th><th className="p-3">WhatsApp</th><th className="p-3 text-center">Ação</th></tr></thead>
            <tbody className="divide-y divide-blue-800/40">
              {pendingUsers.map(u => {
                const t = teams.find(x => x.ownerId === u.id);
                return (
                  <tr key={u.id} className="hover:bg-blue-950/40">
                    <td className="p-3 font-bold text-blue-200">{u.name}</td><td className="p-3 text-amber-400 font-medium">{t?.name || 'S/ Clube'}</td><td className="p-3 font-mono text-blue-400">{u.whatsapp}</td>
                    <td className="p-3 flex justify-center gap-2">
                      <button onClick={()=>{if(window.confirm('Rejeitar cadastro?')) onExpelUser(u.id)}} className="bg-red-500/10 text-red-400 px-3 py-1.5 rounded hover:bg-red-500/20 transition-colors">Rejeitar</button>
                      <button onClick={()=>onApproveUser(u.id)} className="bg-emerald-500/10 text-emerald-400 px-3 py-1.5 rounded hover:bg-emerald-500/20 transition-colors">Aprovar</button>
                    </td>
                  </tr>
                )
              })}
            </tbody></table>
          </div>
        </div>
      )}

      <div className="bg-blue-900 border border-blue-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="p-4 border-b border-blue-800 flex flex-col sm:flex-row justify-between sm:items-center gap-3">
          <div className="flex items-center gap-2">
            <Award className="text-emerald-500"/>
            <h2 className="font-bold text-white text-base">Gestão de Elenco / Técnicos</h2>
          </div>
          {/* Barra de pesquisa inteligente */}
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Pesquisar técnico ou clube..."
            className="bg-blue-950 border border-blue-700 rounded-lg p-2 text-white text-xs outline-none focus:border-emerald-500 w-full sm:w-64"
          />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs whitespace-nowrap"><thead className="bg-blue-950/60 text-blue-400 font-bold border-b border-blue-800"><tr><th className="p-3">Técnico</th><th className="p-3">Clube</th><th className="p-3">WhatsApp</th><th className="p-3">Cargo</th><th className="p-3 text-center">Ação</th></tr></thead>
          <tbody className="divide-y divide-blue-800/40">
            {processedUsers.length === 0 ? (
              <tr><td colSpan="5" className="p-6 text-center text-blue-500 text-sm">Nenhum membro encontrado com essa busca.</td></tr>
            ) : (
              processedUsers.map(u => { 
                const t = teams.find(x => x.ownerId === u.id); 
                
                // Modo de Edição
                if (editingId === u.id) {
                  return (
                    <tr key={u.id} className="bg-blue-950/80">
                      <td className="p-3"><input type="text" value={editData.name} onChange={e=>setEditData({...editData, name: e.target.value})} className="bg-blue-900 border border-blue-700 rounded p-1 text-white w-full outline-none focus:border-emerald-500" /></td>
                      <td className="p-3 text-emerald-400 font-medium">{t?.name || 'S/ Clube'}</td>
                      <td className="p-3"><input type="text" value={editData.whatsapp} onChange={e=>setEditData({...editData, whatsapp: e.target.value})} className="bg-blue-900 border border-blue-700 rounded p-1 text-white w-full outline-none focus:border-emerald-500" /></td>
                      <td className="p-3"><span className="text-blue-500 italic">Editando...</span></td>
                      <td className="p-3 flex justify-center gap-2">
                        <button onClick={()=>setEditingId(null)} className="bg-blue-800 text-blue-400 px-3 py-1.5 rounded hover:bg-blue-700 transition-colors">Cancelar</button>
                        <button onClick={()=>saveEdit(u)} className="bg-emerald-600 text-white px-3 py-1.5 rounded hover:bg-emerald-500 shadow-lg transition-colors">Salvar</button>
                      </td>
                    </tr>
                  );
                }

                // Visualização Normal (Ordenada por Hierarquia!)
                return(
                  <tr key={u.id} className="hover:bg-blue-950/40">
                    <td className="p-3 font-bold text-blue-200">{u.name}</td><td className="p-3 text-emerald-400 font-medium">{t?.name || 'S/ Clube'}</td><td className="p-3 font-mono text-blue-400">{u.whatsapp}</td>
                    <td className="p-3">
                      <select disabled={!isSupremeLeader && currentUser?.id !== u.id} value={u.role || 'member'} onChange={e=>onUpdateUserRole(u.id, e.target.value)} className="bg-blue-900 text-blue-300 border border-blue-700 rounded p-1 outline-none disabled:opacity-50">
                        <option value="member">Membro</option>
                        <option value="organizer">Organizador</option>
                        <option value="kaioh">Kaioh</option>
                        <option value="leader">Líder</option>
                      </select>
                    </td>
                    <td className="p-3 flex justify-center gap-3 items-center">
                      {isSupremeLeader && <button onClick={()=>startEdit(u)} className="text-blue-500 hover:text-emerald-400 transition-colors p-1" title="Editar Técnico"><Edit size={16}/></button>}
                      {isLeader && <button onClick={()=>{if(window.confirm('Expulsar membro?')) onExpelUser(u.id)}} className="text-blue-500 hover:text-red-400 transition-colors p-1" title="Expulsar"><XCircle size={16}/></button>}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody></table>
        </div>
      </div>
    </div>
  );
};

const ClanManagement = ({
  currentUser, users, teams, matches, competitions,
  onExpelUser, onApproveUser, onEditUser, onUpdateUserRole,
  onCreateTeamAndUser, onCreateTeamManual, onCreateComp,
  showToast
}) => {
  const isLeaderOrKaioh = currentUser?.role === 'leader' || currentUser?.role === 'kaioh';
  const isOrganizer = currentUser?.role === 'organizer';
  const hasEventAccess = isLeaderOrKaioh || isOrganizer;

  // Se for organizador, cai direto na aba de Competições. Se for líder, cai nos Técnicos.
  const [activeTab, setActiveTab] = useState(isLeaderOrKaioh ? 'members' : 'comp');

  const pendingCount = users.filter(u => u.status === 'pending').length;

  return (
    <div className="space-y-6 animate-in fade-in pb-12 max-w-5xl mx-auto">
      <div className="bg-gradient-to-r from-blue-900 to-blue-950 p-6 rounded-3xl border border-blue-800 shadow-xl flex items-center gap-4">
        <div className="bg-blue-950 p-3 rounded-full border border-emerald-500/50 shadow-inner">
          <Award size={32} className="text-emerald-400" />
        </div>
        <div>
          <h2 className="text-2xl font-black text-white uppercase tracking-wider">Gestão Clã</h2>
          <p className="text-sm text-blue-400 mt-1">Painel administrativo para Líderes e Organizadores.</p>
        </div>
      </div>

      <div className="flex gap-2 p-1 bg-blue-950 rounded-xl border border-blue-800 overflow-x-auto custom-scrollbar">
        {isLeaderOrKaioh && (
          <>
            <button onClick={() => setActiveTab('members')} className={`shrink-0 flex-1 py-2 px-3 text-xs md:text-sm rounded-lg font-bold transition-all ${activeTab === 'members' ? 'bg-emerald-600 text-white shadow-md' : 'text-blue-500 hover:text-white'}`}>
              👥 Elenco
              {pendingCount > 0 && <span className="bg-amber-500 text-blue-950 px-1.5 py-0.5 rounded-full text-[10px] ml-1 shadow-sm">{pendingCount}</span>}
            </button>
            <button onClick={() => setActiveTab('invite')} className={`shrink-0 flex-1 py-2 px-3 text-xs md:text-sm rounded-lg font-bold transition-all ${activeTab === 'invite' ? 'bg-emerald-600 text-white shadow-md' : 'text-blue-500 hover:text-white'}`}>
              📩 Convidar
            </button>
            <button onClick={() => setActiveTab('manual')} className={`shrink-0 flex-1 py-2 px-3 text-xs md:text-sm rounded-lg font-bold transition-all ${activeTab === 'manual' ? 'bg-emerald-600 text-white shadow-md' : 'text-blue-500 hover:text-white'}`}>
              🤖 Time Simples
            </button>
          </>
        )}
        {hasEventAccess && (
           <button onClick={() => setActiveTab('comp')} className={`shrink-0 flex-1 py-2 px-3 text-xs md:text-sm rounded-lg font-bold transition-all ${activeTab === 'comp' ? 'bg-emerald-600 text-white shadow-md' : 'text-blue-500 hover:text-white'}`}>
             🏆 Nova Competição
           </button>
        )}
      </div>

      <div className="mt-4">
        {activeTab === 'members' && isLeaderOrKaioh && (
          <MembersList users={users} teams={teams} currentUser={currentUser} onExpelUser={onExpelUser} onApproveUser={onApproveUser} onEditUser={onEditUser} onUpdateUserRole={onUpdateUserRole} showToast={showToast} />
        )}
        {activeTab === 'invite' && isLeaderOrKaioh && (
          <CreateTeamFull onCreate={onCreateTeamAndUser} showToast={showToast} />
        )}
        {activeTab === 'manual' && isLeaderOrKaioh && (
          <CreateTeamManual onCreate={onCreateTeamManual} showToast={showToast} />
        )}
        {activeTab === 'comp' && hasEventAccess && (
          <CreateCompetition matches={matches} teams={teams} competitions={competitions} currentUser={currentUser} onCreate={onCreateComp} showToast={showToast} />
        )}
      </div>
    </div>
  );
};

export default function App() {
  // 🛡️ BLINDAGEM TOTAL: Se a aba for anônima, o localStorage não derruba o React
  const [currentUser, setCurrentUser] = useState(() => { 
    try { 
      const saved = localStorage.getItem('claKame_user'); 
      return saved ? JSON.parse(saved) : null; 
    } catch (e) { return null; } 
  });

  const [feedPosts, setFeedPosts] = useState([]);
  const [lastSeenFeed, setLastSeenFeed] = useState(() => {
    try { return parseInt(localStorage.getItem('kame_last_seen_feed') || '0'); }
    catch (e) { return 0; }
  });

  const [storeProducts, setStoreProducts] = useState([]);
  const [predictions, setPredictions] = useState([]);
  
  const urlParams = new URLSearchParams(window.location.search);
  const joinIdFromUrl = urlParams.get('join');

  const [currentTab, setCurrentTab] = useState(joinIdFromUrl ? 'join_comp' : 'dashboard');
  const [selectedCompId, setSelectedCompId] = useState(joinIdFromUrl);
  
  const [selectedMatch, setSelectedMatch] = useState(null); 
  const [prevTab, setPrevTab] = useState('dashboard');
  const [users, setUsers] = useState([]); 
  const [matches, setMatches] = useState([]); 
  const [teams, setTeams] = useState([]); 
  const [competitions, setCompetitions] = useState([]);
  const [toastMessage, setToastMessage] = useState(null); 
  const [isFirebaseLoading, setIsFirebaseLoading] = useState(true);

  const handleTaskcompleted = async (taskName, reward) => {
    const today = new Date().toLocaleDateString('pt-BR');
    const taskKey = taskName === 'post' ? 'lastPostDate' : 'lastLikeDate';
    
    if (currentUser[taskKey] !== today) {
       const newCoins = (currentUser.kameCoins || 0) + reward;
       const updates = { kameCoins: newCoins, [taskKey]: today };
       await setDoc(getPublicDocPath('users', currentUser.id), updates, { merge: true });
       setCurrentUser(prev => ({...prev, ...updates}));
       showToast(`🎯 Missão Concluída! +${reward} kc`, "success");
    }
  };

  useEffect(() => {
    if (currentUser && currentUser.id) {
       const today = new Date().toLocaleDateString('pt-BR');
       let updates = {};
       let hasChanges = false;
       let msg = "";

       if (currentUser.kameCoins === undefined) {
          updates.kameCoins = 100;
          updates.receivedProfileBonus = !!currentUser.photoURL;
          if (currentUser.photoURL) updates.kameCoins += 50;
          hasChanges = true;
          msg = "🎁 Bônus de veterano: Conta atualizada! ";
       }

       const currentCoins = updates.kameCoins !== undefined ? updates.kameCoins : currentUser.kameCoins;

       if (currentUser.lastCheckInDate !== today) {
          updates.kameCoins = currentCoins + 5;
          updates.lastCheckInDate = today;
          hasChanges = true;
          msg += "📅 +5 kc de Check-in Diário!";
       }

       if (hasChanges) {
              setDoc(getPublicDocPath('users', currentUser.id), updates, { merge: true });
              setCurrentUser(prev => ({...prev, ...updates}));
              if (msg) setTimeout(() => showToast(msg.trim(), "success"), 2000);
           }
    }
  }, [currentUser?.id, currentUser?.lastCheckInDate, currentUser?.kameCoins]);

  useEffect(() => {
    if (joinIdFromUrl && currentUser) {
       window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [currentUser, joinIdFromUrl]);

  // 🚀 GATILHO AUTOMÁTICO DE ENCERRAMENTO DA COPA FLASH
  useEffect(() => {
    // O gatilho só roda no celular de um Líder/Kaioh para não duplicar o comando de criação
    if (!currentUser || (currentUser.role !== 'leader' && currentUser.role !== 'kaioh')) return;
    if (competitions.length === 0) return;

    const checkAutoStart = async () => {
       const now = Date.now();
       
       for (const comp of competitions) {
          const isFlash = comp.category === 'copa_flash';
          
          // Só atua se for Flash, se as inscrições estiverem abertas e tiver um horário definido
          if (isFlash && comp.status === 'registration' && comp.deadline && comp.startTime) {
             
             // Converte o "Dia e Hora" agendados em um Timestamp numérico real
             const targetTime = new Date(`${comp.deadline}T${comp.startTime}:00`).getTime();
             
             // Se o relógio bateu ou passou do horário programado:
             if (now >= targetTime) {
                showToast(`⏳ O tempo esgotou! Gerando tabela automática da ${comp.name}...`, "info");
                
                let finalRounds = []; 
                let groupsData = null;
                let finalTeams = [...(comp.teams || [])];

                // Regra de Segurança: Precisa de pelo menos 2 times para existir um torneio
                if (finalTeams.length < 2) {
                   showToast(`A ${comp.name} foi cancelada por falta de times.`, "error");
                   await updateDoc(getPublicDocPath('competitions', comp.id), { status: 'finished' });
                   continue;
                }

                  try {
                    // Como a Flash Dupla não roda mais automático, geramos apenas a tabela da Flash Solo
                    finalRounds = generateCupBracket(finalTeams, comp.id, comp.isFinalDouble);

                    // Grava o torneio como 'Ativo' e salva a tabela
                    await updateDoc(getPublicDocPath('competitions', comp.id), { 
                       status: 'active', 
                       teams: finalTeams, 
                       rounds: finalRounds, 
                       ...(groupsData && { groups: groupsData })
                    });
                    
                    showToast(`✅ ${comp.name} iniciada e chaves criadas!`, "success");

                } catch (err) {
                    console.error("Erro no Auto-Start:", err);
                    showToast("Erro ao gerar tabela automática.", "error");
                }
             }
          }
       }
    };

    // Checa o relógio a cada 10 segundos silenciosamente no fundo do app
    const interval = setInterval(checkAutoStart, 10000); 
    return () => clearInterval(interval);
  }, [competitions, currentUser, teams, matches]);

  const handleJoinComp = async (compId, teamId, receiptBase64) => {
    const comp = competitions.find(c => c.id === compId);
    if (!comp) { showToast("Erro: Campeonato não localizado no sistema.", "error"); return; }
    
    try {
      const isFlash = comp.category === 'copa_flash' || comp.category === 'copa_flash_dupla';
      
      if (isFlash) {
        // ⚡ INSCRIÇÃO IMEDIATA (COPA FLASH)
        const newTeams = [...(comp.teams || []), teamId];
        await updateDoc(getPublicDocPath('competitions', compId), { teams: newTeams });
        showToast("Você foi inscrito imediatamente na Copa Flash!", "success");
        setCurrentTab('dashboard');
      } else {
        // ⏳ INSCRIÇÃO TRADICIONAL (Vai para Análise dos Líderes)
        const newPending = [...(comp.pendingTeams || []), { teamId, receipt: receiptBase64, timestamp: Date.now() }];
        await updateDoc(getPublicDocPath('competitions', compId), { pendingTeams: newPending });
        showToast("Inscrição enviada com sucesso para os líderes!", "success");
        setCurrentTab('dashboard');
      }
    } catch (error) {
      showToast(`Falha no Servidor Cloud: ${error.message}`, "error"); throw error;
    }
  };
  
  const showToast = (text, type = 'success') => { let msg = text; if (typeof text === 'object') { msg = text.message ? text.message : JSON.stringify(text); } setToastMessage({ text: String(msg), type }); setTimeout(() => setToastMessage(null), 4000); };

  useEffect(() => {
    const unsubU = onSnapshot(getPublicPath('users'), snap => setUsers(snap.docs.map(d=>d.data())));
    const unsubT = onSnapshot(getPublicPath('teams'), snap => setTeams(snap.docs.map(d=>d.data())));
    const unsubC = onSnapshot(getPublicPath('competitions'), snap => setCompetitions(snap.docs.map(d=>d.data())));
    const unsubM = onSnapshot(getPublicPath('matches'), snap => setMatches(snap.docs.map(d=>d.data())));
    const unsubStore = onSnapshot(getPublicPath('store'), snap => setStoreProducts(snap.docs.map(d=>d.data())));
    
    const feedQuery = query(getPublicPath('feed'), orderBy('timestamp', 'desc'), limit(10));
    const unsubF = onSnapshot(feedQuery, snap => {
      const fetched = snap.docs.map(d => d.data());
      setFeedPosts(fetched);
    });

    const unsubP = onSnapshot(getPublicPath('predictions'), snap => {
      setPredictions(snap.docs.map(d => d.data()));
    });

    setIsFirebaseLoading(false); 
    return () => { unsubU(); unsubT(); unsubC(); unsubM(); unsubF(); unsubP(); unsubStore(); };
  }, []);

  // 🛡️ BLINDADO: Monitoramento de Login à prova de aba anônima
  useEffect(() => {
    try {
      if (currentUser) {
        localStorage.setItem('claKame_user', JSON.stringify(currentUser)); 
        const stillExists = users.find(u => u && u.id === currentUser.id);
        if (users.length > 0 && !stillExists) { 
           setCurrentUser(null); 
           localStorage.removeItem('claKame_user'); 
        } 
        else if (stillExists && (stillExists.role !== currentUser.role || stillExists.status !== currentUser.status || stillExists.kameCoins !== currentUser.kameCoins)) { 
          setCurrentUser(stillExists); 
        }
      } else { 
        localStorage.removeItem('claKame_user'); 
      }
    } catch (error) {
      console.warn("Aba anônima: localStorage ignorado.");
    }
  }, [users, currentUser]);
  
  const handleReleaseRound = async (compId, roundId) => { 
    const comp = competitions.find(c => c && c.id === compId); 
    if (!comp) return; 
    const rounds = comp.rounds.map(r => r.id === roundId ? { ...r, status: 'released', releasedAt: Date.now() } : r); 
    await updateDoc(getPublicDocPath('competitions', compId), { rounds }); 
    showToast("Rodada liberada! O tempo da Copa Flash começou a contar.", "success"); 
  };
  const handleLockRound = async (compId, roundId) => { const comp = competitions.find(c => c && c.id === compId); if (!comp) return; const rounds = comp.rounds.map(r => r.id === roundId ? { ...r, status: 'locked' } : r); await updateDoc(getPublicDocPath('competitions', compId), { rounds }); showToast("Rodada travada!", "success"); };
  const handleSelectComp = (id) => { setSelectedCompId(id); setCurrentTab('comp_details'); };
  const handleSelectMatch = (match) => { setSelectedMatch(match); setPrevTab(currentTab); setCurrentTab('match_details'); };
  const handleDeleteMatch = async (matchId) => { await deleteDoc(getPublicDocPath('matches', matchId)); showToast("Placar excluído!", "success"); };
  
  const handleEditTeam = async (updatedTeam) => { 
    const oldTeam = teams.find(t => t.id === updatedTeam.id);
    if (oldTeam && oldTeam.ownerId === 'manual' && updatedTeam.ownerId !== 'manual') {
      const userId = updatedTeam.ownerId;
      const linkedUser = users.find(u => u.id === userId);
      if (linkedUser) { updatedTeam.coach = linkedUser.name; updatedTeam.whatsapp = linkedUser.whatsapp; }
      try { await deleteDoc(getPublicDocPath('teams', `t_${userId}`)); } catch(e) {}
      showToast("Técnico vinculado e histórico migrado!", "success");
    } else {
      showToast("Time atualizado!", "success");
    }
    await updateDoc(getPublicDocPath('teams', updatedTeam.id), updatedTeam); 
  };

  const handleCreateTeamAndUser = async ({ user, team }) => { await setDoc(getPublicDocPath('users', user.id), user); await setDoc(getPublicDocPath('teams', team.id), team); setCurrentTab('teams_list'); showToast("Treinador registrado!"); return true; };
  
  const handleExpelUser = async (userId) => {
    await deleteDoc(getPublicDocPath('users', userId));
    const userTeam = teams.find(t => t.ownerId === userId);
    if (userTeam) {
      await updateDoc(getPublicDocPath('teams', userTeam.id), { ownerId: 'manual', whatsapp: '' });
      showToast("Técnico expulso. O time dele agora é manual (sem dono).", "success");
    } else {
      showToast("Técnico expulso com sucesso.", "success");
    }
  };

  const formatarParaEmail = (texto) => { const textoLimpo = String(texto).trim().toLowerCase(); if (textoLimpo.includes('@')) return textoLimpo; return textoLimpo.replace(/[-\s().]/g, '') + '@clakame.com'; };
  
  const handleRegister = async (data) => {
    const email = data.email.trim().toLowerCase();
    const cleanPhone = data.whatsapp.replace(/\D/g, '');
    const fullName = `${data.firstName} ${data.lastName}`.trim();
    
    const userCredential = await createUserWithEmailAndPassword(auth, email, data.password);
    const uid = userCredential.user.uid;
    
    const newUser = { id: uid, name: fullName, email: email, whatsapp: cleanPhone, role: 'member', status: 'pending', kameCoins: 100, receivedProfileBonus: false };
    const newTeam = { id: `t_${uid}`, name: data.teamName, coach: fullName, whatsapp: cleanPhone, ownerId: uid, shield: '🛡️' };
    
    await setDoc(getPublicDocPath('users', uid), newUser);
    await setDoc(getPublicDocPath('teams', newTeam.id), newTeam);
    
    await signOut(auth);
    showToast("Cadastro realizado! Aguarde a aprovação.", "success");
  };

  const handleLogin = async (identifier, password) => {
    const cleanPhone = String(identifier).replace(/\D/g, '');
    if (users.length === 0 && (String(identifier).toLowerCase().includes('savio') || cleanPhone === '91998270658')) { const masterUser = { id: 'u_master', name: 'Sávio Saraiva', role: 'leader', whatsapp: '91998270658', email: 'saviosaraiva777@gmail.com', password: password, status: 'active', kameCoins: 9999 }; await setDoc(getPublicDocPath('users', 'u_master'), masterUser); setCurrentUser(masterUser); setCurrentTab('dashboard'); return; }
    
    let emFake = formatarParaEmail(identifier); 
    let foundUser = null;
    if (users.length > 0) { 
      foundUser = users.find(u => u && ((u.email && u.email.toLowerCase() === identifier.trim().toLowerCase()) || (cleanPhone.length >= 8 && String(u.whatsapp) === cleanPhone))); 
      if (foundUser?.email) emFake = foundUser.email; 
    }
    
    if (foundUser && foundUser.status === 'pending') { throw new Error("Aguardando aprovação dos líderes."); }
    try { await signInWithEmailAndPassword(auth, emFake, password); } 
    catch (e) { throw new Error("Acesso negado. Verifique os dados."); }
  };

  const handleGoogleLogin = async (googleUser) => {
    const email = googleUser.email.toLowerCase();
    const existingUser = users.find(u => u.email && u.email.toLowerCase() === email);
    
    if (existingUser) {
      if (existingUser.status === 'pending') throw new Error("Sua conta ainda está aguardando aprovação dos líderes.");
      setCurrentUser(existingUser);
      setCurrentTab('dashboard');
    } else {
      const uid = googleUser.uid;
      const newUser = { 
        id: uid, 
        name: googleUser.displayName || 'Jogador Convidado', 
        email: email, 
        whatsapp: '00000000000', 
        role: 'member', 
        status: 'pending', 
        kameCoins: 100, 
        receivedProfileBonus: true,
        photoURL: googleUser.photoURL || null
      };
      const newTeam = { id: `t_${uid}`, name: 'Time Google', coach: googleUser.displayName || 'Jogador', whatsapp: '', ownerId: uid, shield: '🛡️' };
      
      await setDoc(getPublicDocPath('users', uid), newUser);
      await setDoc(getPublicDocPath('teams', newTeam.id), newTeam);
      
      await signOut(auth); 
      throw new Error("Cadastro via Google realizado! Aguarde a aprovação dos líderes.");
    }
  };

  const handleApproveUser = async (userId) => {
    await updateDoc(getPublicDocPath('users', userId), { status: 'active' });
    showToast("Técnico aprovado com sucesso!", "success");
  };

  useEffect(() => { const unsub = onAuthStateChanged(auth, (fbUser) => { if (fbUser && users.length > 0) { const found = users.find(u => u && (u.email?.toLowerCase() === fbUser.email?.toLowerCase())); if (found) setCurrentUser(found); } }); return () => unsub(); }, [users]);

  if (isFirebaseLoading) return (<div className="min-h-screen bg-blue-950 text-amber-400 flex items-center justify-center font-sans font-bold text-sm shadow-xl animate-pulse">🛡️ Carregando Arena Kame...</div>);
  if (!currentUser) return <LoginScreen onLogin={handleLogin} onRegister={handleRegister} onGoogleLogin={handleGoogleLogin} />;

  if (currentUser.status === 'pending') {
    return (
      <div className="min-h-screen bg-blue-950 flex flex-col items-center justify-center p-4">
        <div className="bg-blue-900 p-8 rounded-2xl border border-amber-500/30 text-center max-w-sm shadow-xl">
          <div className="text-amber-500 mb-4 flex justify-center"><AlertCircle size={48}/></div>
          <h2 className="text-xl font-bold text-white mb-2">Conta em Análise</h2>
          <p className="text-blue-400 text-sm mb-6">Aguardando aprovação dos líderes do clã. Você será avisado quando for liberado!</p>
          <Button onClick={() => {setCurrentUser(null); signOut(auth);}} className="w-full">Sair</Button>
        </div>
      </div>
    );
  }

  const isLeaderOrKaioh = currentUser.role === 'leader' || currentUser.role === 'kaioh';
  const isOrganizer = currentUser.role === 'organizer';
  const hasEventAccess = isLeaderOrKaioh || isOrganizer;
  
  const TABS = [
    { id: 'dashboard', label: 'Início', icon: Home }, 
    { id: 'profile', label: 'Meu Perfil', icon: User },
    { id: 'bank', label: 'Kame Bank', icon: Landmark },
    { id: 'predictions', label: 'Kame Bet', icon: Target },
    { id: 'competitions', label: 'Competições', icon: Medal },
    { id: 'teams_list', label: 'Times', icon: Shield }, 
    { id: 'ranking', label: 'Ranking Xclã', icon: Crown },
    { id: 'feed', label: 'Feed da Resenha', icon: MessageCircle },
    { id: 'trophies', label: 'Sala de Troféus', icon: Star },
    { id: 'records', label: 'Mural de Recordes', icon: Trophy },
    { id: 'rules', label: 'Regras do Clã', icon: BookOpen },
    
    // Apenas quem é da diretoria vê este botão
    ...(hasEventAccess ? [
      { id: 'training', label: 'CT Kame', icon: Brain },
      { id: 'store', label: 'Kame Store', icon: ShoppingCart },
      { id: 'gestao_cla', label: 'Gestão Clã', icon: Award }
    ] : []),
    ];

  const handleUpdateMatchStatus = async (id, st, updatedData = null) => {
    const updatePayload = { status: st };
    if (updatedData) {
      if (updatedData.scoreA !== undefined) updatePayload.scoreA = parseInt(updatedData.scoreA); 
      if (updatedData.scoreB !== undefined) updatePayload.scoreB = parseInt(updatedData.scoreB);
      if (updatedData.penaltiesA !== undefined) updatePayload.penaltiesA = parseInt(updatedData.penaltiesA); 
      if (updatedData.penaltiesB !== undefined) updatePayload.penaltiesB = parseInt(updatedData.penaltiesB);
    }
    await updateDoc(getPublicDocPath('matches', id), updatePayload);
    
    if (st === 'approved') {
      const match = matches.find(m => m && m.id === id); if (!match) return; 
      const comp = competitions.find(c => c && c.id === match.compId);
      
      // 🛡️ CORREÇÃO 1: Conversão estrita para números (evita que placares de "10" percam para "2" por serem lidos como texto)
      const finalScoreA = parseInt(updatedData && updatedData.scoreA !== undefined ? updatedData.scoreA : match.scoreA) || 0; 
      const finalScoreB = parseInt(updatedData && updatedData.scoreB !== undefined ? updatedData.scoreB : match.scoreB) || 0; 
      const finalPenaltiesA = updatedData && updatedData.penaltiesA !== undefined ? parseInt(updatedData.penaltiesA) : (match.penaltiesA !== null && match.penaltiesA !== undefined ? parseInt(match.penaltiesA) : null); 
      const finalPenaltiesB = updatedData && updatedData.penaltiesB !== undefined ? parseInt(updatedData.penaltiesB) : (match.penaltiesB !== null && match.penaltiesB !== undefined ? parseInt(match.penaltiesB) : null);
      
      const matchPreds = predictions.filter(p => p.matchId === match.matchId && !p.status); 
      if (matchPreds.length > 0) {
         let realOutcome = 'D'; 
         if (finalScoreA > finalScoreB) realOutcome = 'A';
         else if (finalScoreB > finalScoreA) realOutcome = 'B';
         else if (finalPenaltiesA !== null && finalPenaltiesB !== null) {
            if (finalPenaltiesA > finalPenaltiesB) realOutcome = 'A';
            else if (finalPenaltiesB > finalPenaltiesA) realOutcome = 'B';
         }

         const userPayouts = {};

         for (const pred of matchPreds) {
            const isWin = pred.option === realOutcome;
            const betAmount = Number(pred.amount);
            const oddToUse = pred.lockedOdd || 1.1; 
            const payout = isWin ? Math.floor(betAmount * oddToUse) : 0;
            const profit = isWin ? (payout - betAmount) : -betAmount;

            if (payout > 0) {
               if (!userPayouts[pred.userId]) userPayouts[pred.userId] = 0;
               userPayouts[pred.userId] += payout;
            }
            
            await updateDoc(getPublicDocPath('predictions', pred.id), { status: isWin ? 'won' : 'lost', payout, profit });
         }

         // 🛡️ CORREÇÃO 2: Busca o saldo atualizado direto do banco para evitar sobreposição (Race Condition) na validação rápida
         for (const userId of Object.keys(userPayouts)) {
            const uQuery = query(getPublicPath('users'), where('id', '==', userId));
            const uSnap = await getDocs(uQuery);
            if (!uSnap.empty) {
               const uData = uSnap.docs[0].data();
               await updateDoc(getPublicDocPath('users', userId), { 
                 kameCoins: Number(uData.kameCoins || 0) + userPayouts[userId] 
               });
            }
         }
      }

      const tA = teams.find(t => t.id === match.teamA);
      const tB = teams.find(t => t.id === match.teamB);

      if (tA && tB) {
        const isFlash = comp?.category === 'copa_flash';
        const ptsPlay = isFlash ? PONTOS.FLASH.PLAY : PONTOS.NORMAL.PLAY;
        const ptsWin = isFlash ? PONTOS.FLASH.WIN : PONTOS.NORMAL.WIN;
        const ptsDraw = isFlash ? PONTOS.FLASH.DRAW : PONTOS.NORMAL.DRAW;

        let winner = null;
        if (finalScoreA > finalScoreB) winner = 'A';
        else if (finalScoreB > finalScoreA) winner = 'B';
        else if (finalPenaltiesA !== null && finalPenaltiesB !== null) {
          if (finalPenaltiesA > finalPenaltiesB) winner = 'A';
          else if (finalPenaltiesB > finalPenaltiesA) winner = 'B';
        }

        let addPtsA = 0; let addPtsB = 0;
        let winsA = 0; let winsB = 0;
        let drawsA = 0; let drawsB = 0;

        let isWoMe = false; let isWoOpp = false;
        const obs = (match.observacoes || '').toLowerCase();
        if (obs.includes('w.o') || obs.includes('wo')) {
           if (obs.includes('duplo')) { isWoMe = true; isWoOpp = true; }
           else if (finalScoreA === 0 && finalScoreB === 3) isWoMe = true;
           else if (finalScoreB === 0 && finalScoreA === 3) isWoOpp = true;
        }

        // 🛡️ NOVA REGRA: Punição (-10), zera pontos e SUSPENDE o infrator do torneio!
        if (isWoMe || isWoOpp) {
           const suspendedTeams = comp.suspendedTeams || [];
           let newSuspended = [...suspendedTeams];
           
           if (isWoMe && !newSuspended.includes(tA.id)) newSuspended.push(tA.id);
           if (isWoOpp && !newSuspended.includes(tB.id)) newSuspended.push(tB.id);

           // Remove o time da lista de confirmados para limpar a chave futura se houver repescagem
           const newTeams = (comp.teams || []).filter(tId => !newSuspended.includes(tId));
           
           await updateDoc(getPublicDocPath('competitions', comp.id), { 
              suspendedTeams: newSuspended,
              teams: newTeams
           });
        }

        if (isWoMe) addPtsA = ptsPunicaoWo;
        else addPtsA = ptsPlay;
        
        if (isWoOpp) addPtsB = ptsPunicaoWo;
        else addPtsB = ptsPlay;

        if (winner === 'A') { 
            if (!isWoMe) addPtsA += ptsWin; 
            winsA = 1; 
        }
        else if (winner === 'B') { 
            if (!isWoOpp) addPtsB += ptsWin; 
            winsB = 1; 
        }
        else { 
            if (!isWoMe) addPtsA += ptsDraw; 
            if (!isWoOpp) addPtsB += ptsDraw; 
            drawsA = 1; drawsB = 1; 
        }

        const isKnockoutMatch = match.matchId.includes('_ko_') || comp?.format === 'cup';
        const roundDetails = comp?.rounds?.find(r => r.id === match.roundId);
        
        if (isKnockoutMatch && roundDetails) {
          const rName = roundDetails.number;
          if (rName === 'Oitavas') { addPtsA += (isFlash ? 0 : 5); addPtsB += (isFlash ? 0 : 5); }
          if (rName === 'Quartas') { addPtsA += (isFlash ? 2 : 10); addPtsB += (isFlash ? 2 : 10); }
          if (rName === 'Semifinal') { addPtsA += (isFlash ? 5 : 15); addPtsB += (isFlash ? 5 : 15); }
          if (rName === 'Final' && match.matchId.includes('_3rd')) {
            if (winner === 'A') addPtsA += (isFlash ? 5 : 15);
            else if (winner === 'B') addPtsB += (isFlash ? 5 : 15);
          }
        }

        // 🛡️ CORREÇÃO 3: Atualizando os times pegando os dados mais recentes também (evita erro no saldo de vitórias do time)
        const tAQuery = query(getPublicPath('teams'), where('id', '==', tA.id));
        const tBQuery = query(getPublicPath('teams'), where('id', '==', tB.id));
        const [tASnap, tBSnap] = await Promise.all([getDocs(tAQuery), getDocs(tBQuery)]);

        if (!tASnap.empty) {
           const tAData = tASnap.docs[0].data();
           await updateDoc(getPublicDocPath('teams', tA.id), {
             globalPoints: (tAData.globalPoints || 0) + addPtsA,
             playedMatches: (tAData.playedMatches || 0) + 1,
             totalWins: (tAData.totalWins || 0) + winsA,
             totalDraws: (tAData.totalDraws || 0) + drawsA,
             goalsFor: (tAData.goalsFor || 0) + finalScoreA,
             goalsAgainst: (tAData.goalsAgainst || 0) + finalScoreB
           });
        }
        
        if (!tBSnap.empty) {
           const tBData = tBSnap.docs[0].data();
           await updateDoc(getPublicDocPath('teams', tB.id), {
             globalPoints: (tBData.globalPoints || 0) + addPtsB,
             playedMatches: (tBData.playedMatches || 0) + 1,
             totalWins: (tBData.totalWins || 0) + winsB,
             totalDraws: (tBData.totalDraws || 0) + drawsB,
             goalsFor: (tBData.goalsFor || 0) + finalScoreB,
             goalsAgainst: (tBData.goalsAgainst || 0) + finalScoreA
           });
        }
      }

      if (comp && (comp.format === 'cup' || comp.format === 'groups' || comp.category === 'copa_flash_dupla')) {
        let winnerId = null; 
        
        if (comp.category === 'copa_flash_dupla') {
           const isIda = match.matchId.includes('_ida');
           const partnerMatchId = match.matchId.replace(isIda ? '_ida' : '_volta', isIda ? '_volta' : '_ida');
           
           const qPartner = query(getPublicPath('matches'), where('matchId', '==', partnerMatchId), where('compId', '==', comp.id), where('status', '==', 'approved'));
           const snapPartner = await getDocs(qPartner);
           
           if (!snapPartner.empty) {
               const partnerMatch = snapPartner.docs[0].data();
               
               const currentRoundUI = comp.rounds.find(r => r.id === match.roundId);
               const idaMatchId = isIda ? match.matchId : partnerMatchId;
               const idaMatchUI = currentRoundUI.matches.find(x => x.id === idaMatchId);
               
               const duplaA = idaMatchUI.duplaA; 
               const duplaB = idaMatchUI.duplaB;

               let aggScoreA = 0; let aggScoreB = 0; let aggPenA = 0; let aggPenB = 0;
               
               if (isIda) {
                 aggScoreA = finalScoreA + Number(partnerMatch.scoreB||0); 
                 aggScoreB = finalScoreB + Number(partnerMatch.scoreA||0);
                 aggPenA = (finalPenaltiesA||0) + Number(partnerMatch.penaltiesB||0);
                 aggPenB = (finalPenaltiesB||0) + Number(partnerMatch.penaltiesA||0);
               } else {
                 aggScoreA = Number(partnerMatch.scoreA||0) + finalScoreB;
                 aggScoreB = Number(partnerMatch.scoreB||0) + finalScoreA;
                 aggPenA = Number(partnerMatch.penaltiesA||0) + (finalPenaltiesB||0);
                 aggPenB = Number(partnerMatch.penaltiesB||0) + (finalPenaltiesA||0);
               }

               if (aggScoreA > aggScoreB) winnerId = duplaA; 
               else if (aggScoreB > aggScoreA) winnerId = duplaB;
               else if (aggPenA > aggPenB) winnerId = duplaA;
               else if (aggPenB > aggPenA) winnerId = duplaB;
               else {
                   winnerId = Math.random() < 0.5 ? duplaA : duplaB;
               }
           }
        } else {
           if (finalScoreA > finalScoreB) winnerId = match.teamA; 
           else if (finalScoreB > finalScoreA) winnerId = match.teamB; 
           else if (finalPenaltiesA !== null && finalPenaltiesA !== undefined) { 
             if (finalPenaltiesA > finalPenaltiesB) winnerId = match.teamA; 
             else if (finalPenaltiesB > finalPenaltiesA) winnerId = match.teamB; 
           }
        }
        
        if (winnerId) {
          const rIndex = comp.rounds.findIndex(r => r && r.id === match.roundId); 
          const isKnockoutMatch = match.matchId.includes('_ko_') || comp.format === 'cup' || comp.category === 'copa_flash_dupla';
          
          const divisorIndex = comp.category === 'copa_flash_dupla' ? 4 : 2;

          if (rIndex >= 0 && rIndex < comp.rounds.length - 1 && isKnockoutMatch) {
            const mIndex = comp.rounds[rIndex].matches.findIndex(m => m && m.id === match.matchId);
            if (mIndex >= 0) {
               const nextRIndex = rIndex + 1; 
               const nextMIndex = Math.floor(mIndex / divisorIndex) * (comp.category === 'copa_flash_dupla' ? 2 : 1); 
               const isTeamA = (Math.floor(mIndex / (comp.category === 'copa_flash_dupla' ? 2 : 1)) % 2) === 0; 
               const newRounds = JSON.parse(JSON.stringify(comp.rounds)); 

               if (comp.category === 'copa_flash_dupla') {
                   if (isTeamA) {
                       newRounds[nextRIndex].matches[nextMIndex].duplaA = winnerId;
                       newRounds[nextRIndex].matches[nextMIndex].teamA = winnerId.p1;
                       newRounds[nextRIndex].matches[nextMIndex].placeholderA = `${winnerId.name} (Téc 1)`;
                       
                       newRounds[nextRIndex].matches[nextMIndex + 1].duplaB = winnerId;
                       newRounds[nextRIndex].matches[nextMIndex + 1].teamB = winnerId.p2;
                       newRounds[nextRIndex].matches[nextMIndex + 1].placeholderB = `${winnerId.name} (Téc 2)`;
                   } else {
                       newRounds[nextRIndex].matches[nextMIndex].duplaB = winnerId;
                       newRounds[nextRIndex].matches[nextMIndex].teamB = winnerId.p1;
                       newRounds[nextRIndex].matches[nextMIndex].placeholderA = `${winnerId.name} (Téc 1)`;

                       newRounds[nextRIndex].matches[nextMIndex + 1].duplaA = winnerId;
                       newRounds[nextRIndex].matches[nextMIndex + 1].teamA = winnerId.p2;
                       newRounds[nextRIndex].matches[nextMIndex + 1].placeholderA = `${winnerId.name} (Téc 2)`;
                   }
               } else {
                   const loserId = winnerId === match.teamA ? match.teamB : match.teamA;
                   const isNextRoundFinal = newRounds[nextRIndex].matches.some(x => x.id.includes('_f1') || x.id.includes('_3rd'));

                   if (isNextRoundFinal) {
                      newRounds[nextRIndex].matches.forEach(nextMatch => {
                         if (nextMatch.id.includes('_3rd')) {
                            if (isTeamA) nextMatch.teamA = loserId; else nextMatch.teamB = loserId;
                         } else {
                            if (nextMatch.id.includes('_f2')) {
                               if (isTeamA) nextMatch.teamB = winnerId; else nextMatch.teamA = winnerId;
                            } else {
                               if (isTeamA) nextMatch.teamA = winnerId; else nextMatch.teamB = winnerId;
                            }
                         }
                      });
                   } else {
                      if (isTeamA) newRounds[nextRIndex].matches[nextMIndex].teamA = winnerId; 
                      else newRounds[nextRIndex].matches[nextMIndex].teamB = winnerId;
                   }
               }
               await updateDoc(getPublicDocPath('competitions', comp.id), { rounds: newRounds });
            }
          }
        }
      }
    }
  };
  
  const handleEditUser = async (userId, updatedData) => {
    await updateDoc(getPublicDocPath('users', userId), { name: updatedData.name, whatsapp: updatedData.whatsapp });
    const userTeam = teams.find(t => t.ownerId === userId);
    if (userTeam) { await updateDoc(getPublicDocPath('teams', userTeam.id), { coach: updatedData.name, whatsapp: updatedData.whatsapp }); }
    showToast("Dados do técnico atualizados com sucesso!", "success");
  };
  
  const renderContent = () => {
    switch (currentTab) {
      case 'dashboard': return <Dashboard matches={matches} teams={teams} competitions={competitions} currentUser={currentUser} onSelectMatch={handleSelectMatch} onDeleteMatch={handleDeleteMatch} onChangeTab={setCurrentTab} onJoinOpenComp={(id) => { setSelectedCompId(id); setCurrentTab('join_comp'); }} />;
      case 'profile': return <Profile currentUser={currentUser} teams={teams} matches={matches} competitions={competitions} onEditTeam={handleEditTeam} onUpdateUserPhoto={async (url) => { 
          const updates = { photoURL: url }; let rewardMsg = "";
          if (!currentUser.receivedProfileBonus) {
            updates.kameCoins = (currentUser.kameCoins || 0) + 50;
            updates.receivedProfileBonus = true;
            rewardMsg = " 🎁 +50 bc de Bônus ganho!";
          }
          await updateDoc(getPublicDocPath('users', currentUser.id), updates); 
          setCurrentUser(prev => ({...prev, ...updates})); 
          showToast("Foto atualizada!" + rewardMsg, "success"); 
        }} />;

      case 'bank': return <KameBank currentUser={currentUser} users={users} predictions={predictions} matches={matches} teams={teams} showToast={showToast} />;
      case 'teams_list': return <TeamsList teams={teams} users={users} currentUser={currentUser} matches={matches} competitions={competitions} onEditTeam={handleEditTeam} onDeleteTeam={async (id) => { await deleteDoc(getPublicDocPath('teams', id)); showToast("Time excluído com sucesso!", "success"); }} />;
      case 'competitions': return <CompetitionsList competitions={competitions} teams={teams} currentUser={currentUser} onSelectComp={handleSelectComp} onDeleteComp={id => deleteDoc(getPublicDocPath('competitions', id))} />;
      case 'ranking': return <GlobalRanking teams={teams} matches={matches} competitions={competitions} currentUser={currentUser} showToast={showToast} />;
      case 'predictions': return <PredictionsPanel competitions={competitions} matches={matches} teams={teams} users={users} currentUser={currentUser} predictions={predictions} showToast={showToast} onSavePrediction={async (p, oldAmount) => { 
          const currentCoins = Number(currentUser.kameCoins) || 0;
          const betCost = Number(p.amount) - Number(oldAmount);
          const newBalance = Math.max(0, currentCoins - betCost); 
          
          await updateDoc(getPublicDocPath('users', currentUser.id), { kameCoins: newBalance });
          setCurrentUser(prev => ({...prev, kameCoins: newBalance}));
          await setDoc(getPublicDocPath('predictions', p.id), p); 
      }} />;
        
     case 'comp_details': return <CompetitionDetails users={users} comp={competitions.find(c=>c.id===selectedCompId)} teams={teams} matches={matches} competitions={competitions} currentUser={currentUser} onBack={()=>setCurrentTab('competitions')} onReleaseRound={handleReleaseRound} onLockRound={handleLockRound} onEditComp={async (c) => { await updateDoc(getPublicDocPath('competitions', c.id), c); showToast("Atualizado!", "success"); }} onUpdatePlayedMatch={async (m) => { await updateDoc(getPublicDocPath('matches', m.id), m); }} onDeleteMatch={handleDeleteMatch} showToast={showToast} onSubmitMatch={async (m) => { try { await setDoc(getPublicDocPath('matches', m.id), m); showToast("Resultado enviado!"); } catch(e) { showToast("Erro ao salvar no banco: " + e.message, "error"); } }} onUpdateMatchStatus={(id,st, updatedData=null)=>handleUpdateMatchStatus(id,st,updatedData)} onBatchUpdateComp={async (updatedComp, newMatchesArray) => { await updateDoc(getPublicDocPath('competitions', updatedComp.id), updatedComp); const promises = newMatchesArray.map(m => setDoc(getPublicDocPath('matches', m.id), m)); await Promise.all(promises); showToast("Fase encerrada e chaves atualizadas!", "success"); }} />;
      case 'match_details': return <MatchDetails match={selectedMatch} teams={teams} competitions={competitions} onBack={() => setCurrentTab(prevTab)} />;
      case 'training': return <TrainingCenter currentUser={currentUser} showToast={showToast} />;
      case 'store': return <KameStore currentUser={currentUser} storeProducts={storeProducts} showToast={showToast} />;
      
      // 🌟 NOVA ROTA UNIFICADA DA GESTÃO CLÃ
      case 'gestao_cla': 
        return <ClanManagement 
          currentUser={currentUser} users={users} teams={teams} matches={matches} competitions={competitions} 
          onExpelUser={handleExpelUser} onApproveUser={handleApproveUser} onEditUser={handleEditUser} 
          onUpdateUserRole={(id,role)=>updateDoc(getPublicDocPath('users',id),{role})} 
          onCreateTeamAndUser={handleCreateTeamAndUser} 
          onCreateTeamManual={t => setDoc(getPublicDocPath('teams', t.id), t).then(()=>setCurrentTab('teams_list'))} 
          onCreateComp={c => setDoc(getPublicDocPath('competitions', c.id), c).then(()=>setCurrentTab('competitions'))} 
          showToast={showToast} 
        />;

      case 'feed': return <SocialFeed currentUser={currentUser} teams={teams} showToast={showToast} posts={feedPosts} onTaskcompleted={handleTaskcompleted} />;
      case 'join_comp': return <JoinCompetition compId={selectedCompId} competitions={competitions} teams={teams} currentUser={currentUser} onJoin={handleJoinComp} onBack={()=>setCurrentTab('dashboard')} showToast={showToast} onEditComp={async (c) => { await updateDoc(getPublicDocPath('competitions', c.id), c); setCurrentTab('competitions'); }} />;

      case 'records': return <RecordsWall showToast={showToast} currentUser={currentUser} />;
      case 'trophies': return <TrophyRoom competitions={competitions} matches={matches} teams={teams} />;
      case 'rules': return <RulesPage />;
      case 'validation': return <ValidationPanel matches={matches} teams={teams} competitions={competitions} onUpdateStatus={(id,st, updatedData=null)=>handleUpdateMatchStatus(id,st,updatedData)} showToast={showToast} currentUser={currentUser} />;
        
      default: return <Dashboard matches={matches} teams={teams} competitions={competitions} currentUser={currentUser} onSelectMatch={handleSelectMatch} onDeleteMatch={handleDeleteMatch} onChangeTab={setCurrentTab} onJoinOpenComp={(id) => { setSelectedCompId(id); setCurrentTab('join_comp'); }} />;
    }
  };

  return (
    <div className="min-h-screen bg-blue-950 text-blue-200 font-sans flex flex-col md:flex-row relative">
      {toastMessage && (
        <div className={`fixed top-4 right-4 z-50 px-6 py-3 rounded-xl shadow-2xl flex items-center gap-3 animate-in slide-in-from-top-4 ${toastMessage.type === 'error' ? 'bg-red-950 border border-red-500 text-red-100' : 'bg-blue-800 border border-emerald-500 text-white'}`}>
          {toastMessage.type === 'error' ? <AlertCircle className="text-red-500" size={20} /> : <CheckCircle className="text-emerald-500" size={20} />}
          <span className="font-medium text-sm">{String(toastMessage.text)}</span>
        </div>
      )}

      <aside className="w-full md:w-64 bg-blue-900 border-b md:border-b-0 md:border-r border-blue-800 flex flex-col shrink-0 z-10 shadow-2xl">
        <div className="p-6 flex items-center gap-3"><img src={LOGO_URL} alt="Clã Kame" className="w-24 h-24" /><div><h1 className="font-bold text-white text-lg">Clã Kame</h1><p className="text-[10px] text-emerald-400 font-bold uppercase">Arena DLS</p></div></div>
        
        <nav className="flex-1 px-4 pb-4 overflow-y-auto flex md:flex-col gap-2 overflow-x-auto custom-scrollbar">
          {TABS.map(tab => {
            const isActive = currentTab === tab.id || (tab.id === 'competitions' && currentTab === 'comp_details'); 
            const Icon = tab.icon;
            
            const hasNewFeed = tab.id === 'feed' && feedPosts.length > 0 && feedPosts[0].timestamp > lastSeenFeed;

            return ( 
              <button 
                key={tab.id} 
                onClick={() => {
                  if (tab.id === 'feed') {
                    const now = Date.now();
                    setLastSeenFeed(now);
                    // 🛡️ BLINDADO
                    try { localStorage.setItem('kame_last_seen_feed', now.toString()); } catch(e){}
                  }
                  setCurrentTab(tab.id);
                }} 
                className={`relative flex items-center gap-3 px-4 py-3 rounded-xl whitespace-nowrap outline-none border ${isActive ? 'bg-emerald-500/10 text-emerald-400 font-bold border-emerald-500/20' : 'text-blue-400 hover:bg-blue-800 hover:text-blue-200 border-transparent'}`}
              >
                <Icon size={18} /> 
                <span className="text-sm">{tab.label}</span>
                
                {hasNewFeed && (
                  <span className="absolute top-3 right-3 w-2.5 h-2.5 bg-red-500 rounded-full shadow-[0_0_8px_rgba(239,68,68,0.8)] animate-pulse"></span>
                )}

                {(tab.id === 'competitions' && hasEventAccess && matches.filter(m=>m?.status==='pending').length > 0) && <span className="ml-auto bg-amber-500 text-blue-950 text-xs font-bold px-2 py-0.5 rounded-full shadow-md">{matches.filter(m=>m?.status==='pending').length}</span>}
              </button> 
            );
          })}
        </nav>
        
        <div className="p-4 border-t border-blue-800 hidden md:block">
          <div className="bg-blue-950 rounded-xl p-4 border border-blue-800/50 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500"></div>
            <p className="font-bold text-white text-sm truncate">{String(currentUser?.name)}</p>
            <p className="text-[10px] text-emerald-400 uppercase font-bold mb-3">{ROLE_NAMES[currentUser?.role]}</p>
            
            <div className="bg-blue-900/50 border border-amber-500/30 rounded-lg p-2.5 mb-3 flex items-center justify-between shadow-inner">
               <span className="text-[10px] text-amber-400 font-bold uppercase tracking-wider flex items-center gap-1.5"><Star size={12}/> Saldo</span>
               <span className="text-sm font-black text-white">{currentUser?.kameCoins || 0} <span className="text-amber-500 text-xs">bk</span></span>
            </div>

            <button onClick={() => { setCurrentUser(null); signOut(auth); }} className="w-full text-xs text-blue-400 hover:text-white py-1.5 rounded bg-blue-900 border border-blue-700/60 transition-colors hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/30">
              <LogOut size={12} className="inline mr-1"/> Sair
            </button>
          </div>
        </div>
      </aside>
      <main className="flex-1 p-4 md:p-8 overflow-y-auto bg-blue-950"><div className="max-w-5xl mx-auto pb-20 md:pb-0">{renderContent()}</div></main>
    </div>
  );
}

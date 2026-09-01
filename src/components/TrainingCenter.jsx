import React, { useState, useEffect, useRef } from 'react';
import { Brain, Flame, Calendar, Trophy, Zap, Eye, Activity, XCircle, Camera, Target, Shield, CheckCircle } from 'lucide-react';
  
 const TrainingCenter = ({ currentUser, showToast }) => {
  const [activeCategory, setActiveCategory] = useState('cognitivo'); 
  const [activeDrill, setActiveDrill] = useState('reflex'); 

  // ==========================================
  // 🗓️ SISTEMA DE ROTINAS E RELATÓRIOS
  // ==========================================
  const getTodayKey = () => {
    const date = new Date();
    const localDate = new Date(date.getTime() - (date.getTimezoneOffset() * 60000)).toISOString().split('T')[0];
    return `kame_daily_${localDate}_${currentUser?.id}`;
  };

  const [activeRoutine, setActiveRoutine] = useState(null); // 'warmup', 'daily' ou 'summary'
  const [routineStep, setRoutineStep] = useState(0);
  const [routineTimeLeft, setRoutineTimeLeft] = useState(0);
  const [dailyProgress, setDailyProgress] = useState(() => parseInt(localStorage.getItem(getTodayKey()) || '0'));
  
  // 🌟 O NOVO CÉREBRO: Analista de Dados
  const [routineSummary, setRoutineSummary] = useState(null);
  const currentRoutineScores = useRef({ reflex: 0, radar: 0, decision: 0, memory: 0, force: 0, timing: 0 });

  const WARMUP_ROUTINE = [
    { drill: 'reflex', time: 60, name: 'Reflexos (1/3)' },
    { drill: 'force', time: 60, name: 'Controle de Força (2/3)' },
    { drill: 'radar', time: 60, name: 'Visão de Radar (3/3)' }
  ];

  const DAILY_ROUTINE = [
    { drill: 'reflex', time: 60, name: 'Reflexos (1/5)' },
    { drill: 'decision', time: 60, name: 'Quiz Tático (2/5)' },
    { drill: 'force', time: 60, name: 'Calibragem (3/5)' },
    { drill: 'memory', time: 60, name: 'Tracking Espacial (4/5)' },
    { drill: 'timing', time: 60, name: 'Bote (5/5)' }
  ];

  const resetAllDrillStates = () => {
    setReflexState('idle'); setRadarState('idle'); setDecisionState('idle');
    setMemoryState('idle'); setForceState('idle'); setTimingState('idle');
    clearInterval(radarTimerInterval.current); clearInterval(timerInterval.current);
    cancelAnimationFrame(reqRef.current); cancelAnimationFrame(reqTimingRef.current);
  };

  const startRoutine = (type) => {
    if (type === 'daily' && dailyProgress >= 300) {
       showToast("O treino obrigatório de hoje já foi concluído!", "info"); return;
    }
    setActiveRoutine(type);
    setRoutineStep(0);
    setRoutineSummary(null);
    currentRoutineScores.current = { reflex: 0, radar: 0, decision: 0, memory: 0, force: 0, timing: 0 };
    
    const steps = type === 'warmup' ? WARMUP_ROUTINE : DAILY_ROUTINE;
    setRoutineTimeLeft(steps[0].time);
    setActiveDrill(steps[0].drill);
    resetAllDrillStates();
  };

  const cancelRoutine = () => {
    setActiveRoutine(null);
    setRoutineSummary(null);
    resetAllDrillStates();
    showToast("Sessão cancelada.", "warning");
  };

  // Motor Global das Rotinas e da Barra Verde
  useEffect(() => {
    let interval;
    if (activeRoutine && activeRoutine !== 'summary') {
      interval = setInterval(() => {
        setRoutineTimeLeft(prev => prev - 1);
        
        if (activeRoutine === 'daily') {
          setDailyProgress(p => {
            const np = p + 1;
            localStorage.setItem(getTodayKey(), np.toString());
            return np;
          });
        }
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [activeRoutine]);

  // Transição Automática e Geração de Relatório
  useEffect(() => {
    if ((activeRoutine === 'warmup' || activeRoutine === 'daily') && routineTimeLeft <= 0) {
       const steps = activeRoutine === 'warmup' ? WARMUP_ROUTINE : DAILY_ROUTINE;
       const nextStep = routineStep + 1;
       if (nextStep < steps.length) {
          setRoutineStep(nextStep);
          setRoutineTimeLeft(steps[nextStep].time);
          setActiveDrill(steps[nextStep].drill);
          resetAllDrillStates();
       } else {
          // Fim do Treino! Gera o Boletim do Analista
          setRoutineSummary({ type: activeRoutine, scores: { ...currentRoutineScores.current } });
          setActiveRoutine('summary');
          resetAllDrillStates();
          if (activeRoutine === 'daily') showToast("Treino de Hoje Concluído! 🏆", "success");
       }
    }
  }, [routineTimeLeft, activeRoutine, routineStep]);

  const formatTime = (secs) => {
    const m = Math.floor(Math.max(0, secs) / 60).toString().padStart(2, '0');
    const s = (Math.max(0, secs) % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  // ==========================================
  // 🧠 GAME 1: TEMPO DE REAÇÃO
  // ==========================================
  const [reflexState, setReflexState] = useState('idle'); 
  const [reactionTime, setReactionTime] = useState(null);
  const [bestReflex, setBestReflex] = useState(() => parseInt(localStorage.getItem(`kame_reflex_${currentUser?.id}`) || '0'));
  const reflexTimeout = useRef(null);
  const reflexStart = useRef(null);

  const startReflex = () => {
    setReflexState('waiting'); setReactionTime(null);
    const delay = Math.floor(Math.random() * 9000) + 1000;
    reflexTimeout.current = setTimeout(() => { setReflexState('ready'); reflexStart.current = Date.now(); }, delay);
  };

  const handleReflexClick = () => {
    if (reflexState === 'idle' || reflexState === 'result' || reflexState === 'early') { startReflex(); } 
    else if (reflexState === 'waiting') { clearTimeout(reflexTimeout.current); setReflexState('early'); } 
    else if (reflexState === 'ready') {
      const time = Date.now() - reflexStart.current;
      setReactionTime(time); setReflexState('result');
      if (!bestReflex || time < bestReflex) {
        setBestReflex(time); localStorage.setItem(`kame_reflex_${currentUser?.id}`, time);
        showToast("Novo Recorde de Reflexo! ⚡", "success");
      }
      // 🌟 Grava no Analista
      if (currentRoutineScores.current.reflex === 0 || time < currentRoutineScores.current.reflex) {
         currentRoutineScores.current.reflex = time;
      }
    }
  };

  // ==========================================
  // 👁️ GAME 2: VISÃO PERIFÉRICA (RADAR)
  // ==========================================
  const [radarState, setRadarState] = useState('idle');
  const [radarScore, setRadarScore] = useState(0);
  const [radarTimeLeft, setRadarTimeLeft] = useState(45);
  const [radarDots, setRadarDots] = useState([]);
  const [targetCount, setTargetCount] = useState(0);
  const [radarOptions, setRadarOptions] = useState([]);
  const [bestRadar, setBestRadar] = useState(() => parseInt(localStorage.getItem(`kame_radar_${currentUser?.id}`) || '0'));
  
  const radarTimeout = useRef(null);
  const radarTimerInterval = useRef(null);
  const radarScoreRef = useRef(0);

  const startRadarGame = () => {
    setRadarScore(0); radarScoreRef.current = 0;
    const timeLimit = (activeRoutine === 'warmup' || activeRoutine === 'daily') ? 60 : 45;
    setRadarTimeLeft(timeLimit); 
    
    clearInterval(radarTimerInterval.current);
    radarTimerInterval.current = setInterval(() => {
      setRadarTimeLeft(prev => { if (prev <= 1) { endRadarGame(); return 0; } return prev - 1; });
    }, 1000);
    nextRadarRound();
  };

  const nextRadarRound = () => {
    const enemyCount = Math.floor(Math.random() * 5) + 3;
    const allyCount = Math.floor(Math.random() * 4) + 2; 
    setTargetCount(enemyCount);

    const dots = [];
    for(let i=0; i<enemyCount; i++) dots.push({ type: 'enemy', top: Math.floor(Math.random() * 80) + 10 + '%', left: Math.floor(Math.random() * 80) + 10 + '%' });
    for(let i=0; i<allyCount; i++) dots.push({ type: 'ally', top: Math.floor(Math.random() * 80) + 10 + '%', left: Math.floor(Math.random() * 80) + 10 + '%' });
    setRadarDots(dots.sort(() => Math.random() - 0.5)); 

    let opts = new Set([enemyCount]);
    while(opts.size < 4) {
       let wOpt = enemyCount + (Math.floor(Math.random() * 5) - 2);
       if (wOpt > 0 && wOpt !== enemyCount) opts.add(wOpt);
    }
    setRadarOptions(Array.from(opts).sort((a,b) => a - b));

    setRadarState('memorizing');
    clearTimeout(radarTimeout.current);
    radarTimeout.current = setTimeout(() => { setRadarState('answering'); }, 700); 
  };

  const handleRadarAnswer = (ans) => {
    if (ans === targetCount) { 
      radarScoreRef.current += 1; 
      setRadarScore(radarScoreRef.current); 
      currentRoutineScores.current.radar += 1; // 🌟 Analista
    } 
    nextRadarRound();
  };

  const endRadarGame = () => {
    clearInterval(radarTimerInterval.current); clearTimeout(radarTimeout.current); setRadarState('result');
    if (radarScoreRef.current > bestRadar) { setBestRadar(radarScoreRef.current); localStorage.setItem(`kame_radar_${currentUser?.id}`, radarScoreRef.current); }
  };

  // ==========================================
  // 🧠 GAME 3: TOMADA DE DECISÃO
  // ==========================================
  const DLS_SCENARIOS = [
    { q: "Adversário ataca pela ponta e seu zagueiro está na área. O que NÃO fazer?", opts: ["Trocar cursor para o volante (C) e dobrar marcação.", "Sair puxando o zagueiro da área até a lateral.", "Acompanhar a corrida pelo meio fechando o passe."], ans: 1 },
    { q: "Aos 88 minutos, você vence por 1x0 e tem um escanteio a favor. Melhor decisão?", opts: ["Tocar curto e prender a bola na lateral.", "Cruzar na pequena área com a barra cheia.", "Bater direto pro gol fechado."], ans: 0 },
    { q: "Seu adversário joga na 4-1-2-3 congestionando o meio de campo. Por onde atacar?", opts: ["Forçar tabela pelo meio dos volantes.", "Dar lançamentos diretos (C) do goleiro pro CA.", "Explorar as pontas com laterais e pontas (W)."], ans: 2 },
    { q: "Contra-ataque 3 contra 2. Você carrega a bola pelo meio chegando na área. O que fazer?", opts: ["Tocar em profundidade no atacante que faz a ultrapassagem.", "Chutar de longe sem carregar muito a barra.", "Dar um drible (Swipe) no primeiro zagueiro."], ans: 0 },
    { q: "Adversário cruza muita bola na área. Qual a melhor postura defensiva?", opts: ["Adiantar a zaga até o meio de campo.", "Recuar a defesa e focar o cursor (C) no zagueiro central.", "Segurar o botão do goleiro pra ele sair do gol na ponta."], ans: 1 }
  ];

  const [decisionState, setDecisionState] = useState('idle');
  const [decisionScore, setDecisionScore] = useState(0);
  const [currentScenario, setCurrentScenario] = useState(null);
  const [timeLeft, setTimeLeft] = useState(7);
  const [bestDecision, setBestDecision] = useState(() => parseInt(localStorage.getItem(`kame_decision_${currentUser?.id}`) || '0'));
  const timerInterval = useRef(null);

  const startDecisionGame = () => { setDecisionScore(0); setDecisionState('playing'); loadNextScenario(); };
  const loadNextScenario = () => { setCurrentScenario(DLS_SCENARIOS[Math.floor(Math.random() * DLS_SCENARIOS.length)]); setTimeLeft(7); };

  const handleDecisionSubmit = (selectedIndex) => {
    if (selectedIndex === currentScenario.ans) {
      const newScore = decisionScore + 1; setDecisionScore(newScore); showToast("Decisão Correta! +1", "success");
      currentRoutineScores.current.decision += 1; // 🌟 Analista
      if (newScore > bestDecision) { setBestDecision(newScore); localStorage.setItem(`kame_decision_${currentUser?.id}`, newScore); }
      loadNextScenario();
    } else { setDecisionState('result'); clearInterval(timerInterval.current); }
  };

  // ==========================================
  // 📸 GAME 5: MEMÓRIA FOTOGRÁFICA
  // ==========================================
  const PITCH_ZONES = [
    { id: 0, name: 'Ponta Esquerda' }, { id: 1, name: 'Meio Avançado' }, { id: 2, name: 'Ponta Direita' },
    { id: 3, name: 'Defesa Esq.' }, { id: 4, name: 'Meio Defensivo' }, { id: 5, name: 'Defesa Dir.' }
  ];
  const [memoryState, setMemoryState] = useState('idle');
  const [memoryScore, setMemoryScore] = useState(0);
  const [bestMemory, setBestMemory] = useState(() => parseInt(localStorage.getItem(`kame_memory_${currentUser?.id}`) || '0'));
  const [emptyZone, setEmptyZone] = useState(null);
  const memoryTimeout = useRef(null);

  const startMemoryGame = () => { setMemoryScore(0); nextMemoryRound(0); };
  const nextMemoryRound = (currentScore) => {
    const target = Math.floor(Math.random() * 6);
    setEmptyZone(target); setMemoryState('memorizing');
    const displayTime = Math.max(400, 1500 - (currentScore * 100));
    memoryTimeout.current = setTimeout(() => { setMemoryState('question'); }, displayTime);
  };
  const handleMemoryAnswer = (zoneId) => {
    if (zoneId === emptyZone) {
      const newScore = memoryScore + 1; setMemoryScore(newScore); showToast("Visão Perfeita! +1 📸", "success");
      currentRoutineScores.current.memory += 1; // 🌟 Analista
      if (newScore > bestMemory) { setBestMemory(newScore); localStorage.setItem(`kame_memory_${currentUser?.id}`, newScore); }
      nextMemoryRound(newScore);
    } else { setMemoryState('result'); }
  };

  // ==========================================
  // 🎚️ GAME 4: CONTROLE DE FORÇA
  // ==========================================
  const [forceState, setForceState] = useState('idle'); 
  const [forceScore, setForceScore] = useState(0);
  const [bestForce, setBestForce] = useState(() => parseInt(localStorage.getItem(`kame_force_${currentUser?.id}`) || '0'));
  const [power, setPower] = useState(0);
  const [targetZone, setTargetZone] = useState({ min: 35, max: 45, label: 'Perto da Peq. Área' });
  
  const reqRef = useRef(null);
  const powerRef = useRef(0);
  const speedRef = useRef(2.5); 

  const startForceGame = () => { setForceScore(0); speedRef.current = 2.5; nextForceRound(0); };
  const nextForceRound = (currentScore) => {
    const rand = Math.random(); let center, width, label;
    if (rand < 0.33) { center = 47.5; width = Math.max(8, 15 - (currentScore * 0.5)); label = 'Chute na Gaveta (A)'; } 
    else if (rand < 0.66) { center = 75.0; width = Math.max(10, 20 - (currentScore * 0.5)); label = 'Inversão Longa (C)'; } 
    else { center = 20.0; width = Math.max(5, 12 - (currentScore * 0.5)); label = 'Passe Curto Fino (B)'; }
    setTargetZone({ min: center - (width / 2), max: center + (width / 2), label });
    powerRef.current = 0; setPower(0); setForceState('waiting_press'); 
  };
  const updatePower = () => {
    powerRef.current += speedRef.current;
    if (powerRef.current >= 100) { powerRef.current = 100; setPower(100); evaluateForce(100); return; }
    setPower(powerRef.current); reqRef.current = requestAnimationFrame(updatePower);
  };
  const evaluateForce = (finalPower) => {
    cancelAnimationFrame(reqRef.current);
    setForceState(prev => {
       if (prev !== 'charging') return prev; 
       if (finalPower >= targetZone.min && finalPower <= targetZone.max) {
         const newScore = forceScore + 1; setForceScore(newScore);
         currentRoutineScores.current.force += 1; // 🌟 Analista
         if (newScore > bestForce) { setBestForce(newScore); localStorage.setItem(`kame_force_${currentUser?.id}`, newScore); }
         showToast("Medida Exata! 🎯", "success");
         setTimeout(() => { speedRef.current += 0.10; nextForceRound(newScore); }, 1000);
         return 'success';
       } else { return 'result'; }
    });
  };
  const handlePointerDown = (e) => {
    if (e.button !== undefined && e.button !== 0) return; 
    if (forceState === 'waiting_press') { setForceState('charging'); powerRef.current = 0; setPower(0); reqRef.current = requestAnimationFrame(updatePower); }
  };
  const handlePointerUp = () => { if (forceState === 'charging') evaluateForce(powerRef.current); };

  // ==========================================
  // 🛡️ GAME 6: TIMING DE BOTE
  // ==========================================
  const [timingState, setTimingState] = useState('idle'); 
  const [timingScore, setTimingScore] = useState(0);
  const [bestTiming, setBestTiming] = useState(() => parseInt(localStorage.getItem(`kame_timing_${currentUser?.id}`) || '0'));
  const [attackerPos, setAttackerPos] = useState(0);
  
  const reqTimingRef = useRef(null);
  const posTimingRef = useRef(0);
  const speedTimingRef = useRef(1.0); 

  const startTimingGame = () => { setTimingScore(0); speedTimingRef.current = 0.8; nextTimingRound(); };
  const nextTimingRound = () => { posTimingRef.current = 0; setTimingState('playing'); cancelAnimationFrame(reqTimingRef.current); updateTiming(); };
  const updateTiming = () => {
    posTimingRef.current += speedTimingRef.current;
    if (posTimingRef.current > 88) { cancelAnimationFrame(reqTimingRef.current); setTimingState('result_late'); return; }
    setAttackerPos(posTimingRef.current); reqTimingRef.current = requestAnimationFrame(updateTiming);
  };
  const handleTackle = () => {
    if (timingState === 'idle' || timingState.startsWith('result')) { startTimingGame(); } 
    else if (timingState === 'playing') {
        cancelAnimationFrame(reqTimingRef.current); const p = posTimingRef.current;
        if (p >= 68 && p <= 85) {
            const newScore = timingScore + 1; setTimingScore(newScore);
            currentRoutineScores.current.timing += 1; // 🌟 Analista
            if (newScore > bestTiming) { setBestTiming(newScore); localStorage.setItem(`kame_timing_${currentUser?.id}`, newScore); }
            setTimingState('success'); showToast("Bote Cirúrgico! 🛡️", "success");
            setTimeout(() => { speedTimingRef.current += 0.15; nextTimingRound(); }, 1000);
        } else { setTimingState('result_early'); }
    }
  };

  const handleCategoryChange = (cat) => {
    if(activeRoutine) return; 
    setActiveCategory(cat);
    if (cat === 'cognitivo') setActiveDrill('reflex');
    if (cat === 'tatica') setActiveDrill('memory');
    if (cat === 'mecanica') setActiveDrill('force');
  };

  // ==========================================
  // RENDERIZAÇÕES DOS JOGOS E RESUMO
  // ==========================================
  const renderRoutineSummary = () => {
    if (!routineSummary) return null;
    const s = routineSummary.scores;
    const isWarmup = routineSummary.type === 'warmup';

    // Notas dinâmicas de 0 a 10 baseadas em desempenho humano
    const nReflex = s.reflex === 0 ? 0 : Math.max(0, Math.min(10, 10 - (s.reflex - 200)/20));
    const nForce = Math.min(10, s.force / 1.5); 
    const nRadar = Math.min(10, s.radar / 1.5); 
    const nDecision = Math.min(10, s.decision / 1.2); 
    const nMemory = Math.min(10, s.memory / 1.2); 
    const nTiming = Math.min(10, s.timing / 1.5); 

    let totalScore = 0; let items = [];

    if (isWarmup) {
       totalScore = (nReflex + nForce + nRadar) / 3;
       items = [
         { name: 'Reflexos', n: nReflex, raw: s.reflex ? `${s.reflex}ms` : '0ms', tip: "Tempo de reação lento. Recue as linhas, jogue com mais segurança na defesa e evite dar o bote de primeira." },
         { name: 'Força (A/B/C)', n: nForce, raw: `${s.force} acertos`, tip: "Calibragem ruim. Foque em passes curtos seguros (botão B) e evite lançamentos longos e inversões arriscadas." },
         { name: 'Radar DLS', n: nRadar, raw: `${s.radar} acertos`, tip: "Leitura de mapa lenta. Cuidado extremo com contra-ataques nas costas da zaga! Olhe o minimapa antes de atacar." }
       ];
    } else {
       totalScore = (nReflex + nDecision + nForce + nMemory + nTiming) / 5;
       items = [
         { name: 'Reflexos', n: nReflex, raw: s.reflex ? `${s.reflex}ms` : '0ms', tip: "Seu cérebro está demorando a processar o estímulo visual. Treine mais Bote para calibrar." },
         { name: 'Tática', n: nDecision, raw: `${s.decision} acertos`, tip: "Hesitação tática detectada. Jogue o 'feijão com arroz' hoje: passe e movimentação simples." },
         { name: 'Chutes', n: nForce, raw: `${s.force} acertos`, tip: "Dedos descalibrados. Você tem grandes chances de isolar a bola ou forçar passes nas mãos do goleiro." },
         { name: 'Espaços', n: nMemory, raw: `${s.memory} acertos`, tip: "Falta de visão espacial nas entrelinhas. Evite forçar a bola em profundidade no CA." },
         { name: 'Desarme', n: nTiming, raw: `${s.timing} acertos`, tip: "Tempo de bote precipitado. Faça contenção (cercar) com o cursor em vez de apertar o desarme." }
       ];
    }

    // A inteligência acha o PIOR atributo para alertar o jogador
    const worst = items.reduce((prev, curr) => (curr.n < prev.n ? curr : prev));

    let grade = 'D'; let color = 'text-red-500'; let bg = 'bg-red-500/20';
    if (totalScore >= 8.5) { grade = 'S'; color = 'text-amber-400'; bg = 'bg-amber-500/20'; }
    else if (totalScore >= 7.0) { grade = 'A'; color = 'text-emerald-400'; bg = 'bg-emerald-500/20'; }
    else if (totalScore >= 5.0) { grade = 'B'; color = 'text-blue-400'; bg = 'bg-blue-500/20'; }
    else if (totalScore >= 3.0) { grade = 'C'; color = 'text-orange-400'; bg = 'bg-orange-500/20'; }

    return (
       <div className="flex flex-col h-full animate-in zoom-in-95 justify-center py-4">
          <div className="text-center mb-6">
             <h2 className="text-2xl sm:text-3xl font-black text-white uppercase tracking-wider mb-2">
               Relatório do Analista
             </h2>
             <p className="text-blue-300 text-sm">Resumo da sua inteligência e mecânica na sessão.</p>
          </div>

          <div className="flex flex-col md:flex-row gap-6 mb-8 items-center justify-center px-4">
             <div className={`${bg} border-4 border-current ${color} w-32 h-32 rounded-full flex flex-col items-center justify-center shadow-[0_0_30px_currentColor] shrink-0`}>
                <span className="text-[10px] uppercase font-bold text-white mb-1">Rank</span>
                <span className="text-6xl font-black leading-none">{grade}</span>
             </div>
             
             <div className="bg-blue-900/50 p-5 rounded-2xl border border-blue-700 max-w-sm w-full shadow-inner">
                <p className="text-[10px] uppercase font-bold text-amber-400 tracking-widest mb-1.5 flex items-center gap-1"><Brain size={12}/> Análise Tática e Conselho</p>
                <p className="text-sm font-medium text-blue-100 leading-relaxed">
                   {grade === 'S' 
                     ? "Você está 'ON FIRE'! Reflexos sobre-humanos e mecânica perfeita. Pode entrar na partida e amassar o adversário sem dó!" 
                     : <><b className="text-red-400 block mb-1">Ponto de Risco: {worst.name}</b> {worst.tip}</>}
                </p>
             </div>
          </div>

          <div className="grid grid-cols-3 gap-3 w-full max-w-2xl mx-auto px-4">
             {items.map(it => (
                <div key={it.name} className="bg-blue-950 border border-blue-800 p-3 rounded-xl text-center shadow-sm">
                   <p className="text-[9px] uppercase font-bold text-blue-400 tracking-widest mb-1">{it.name}</p>
                   <p className={`text-lg font-black ${it.n >= 7 ? 'text-emerald-400' : it.n >= 5 ? 'text-blue-300' : 'text-red-400'}`}>{it.raw}</p>
                </div>
             ))}
          </div>

          <div className="px-4 mt-8">
             <button onClick={() => { setActiveRoutine(null); setRoutineSummary(null); }} className="bg-blue-600 hover:bg-blue-500 text-white font-black py-4 px-8 w-full max-w-sm mx-auto block rounded-xl uppercase tracking-widest transition-transform hover:scale-[1.02] shadow-lg">
                Encerrar Relatório
             </button>
          </div>
       </div>
    );
  };

  const renderReflexGame = () => {
    const getBgColor = () => {
      if (reflexState === 'waiting') return 'bg-red-600 cursor-wait';
      if (reflexState === 'ready') return 'bg-emerald-500 cursor-pointer shadow-[0_0_50px_rgba(16,185,129,0.8)] scale-[1.02]';
      return 'bg-blue-900 cursor-pointer hover:bg-blue-800 border-blue-700';
    };
    const getMsg = () => {
      if (reflexState === 'idle') return { title: 'Iniciar Teste', sub: 'Toque para começar' };
      if (reflexState === 'waiting') return { title: 'Aguarde...', sub: 'Prepare-se para tocar no verde' };
      if (reflexState === 'ready') return { title: 'CLIQUE AGORA!', sub: '⚡⚡⚡' };
      if (reflexState === 'early') return { title: 'Queimou a largada!', sub: 'Clicou antes do verde. Toque para recomeçar.' };
      return { title: `${reactionTime} ms`, sub: 'Toque para tentar de novo' };
    };
    const msg = getMsg();

    return (
      <div className="flex flex-col h-full animate-in slide-in-from-right-4">
        <h3 className="text-white font-bold mb-4 flex items-center gap-2 uppercase tracking-widest text-sm"><Zap size={18} className="text-amber-400"/> Reação e Bote</h3>
        <div onClick={handleReflexClick} className={`flex-1 min-h-[350px] rounded-3xl border-4 ${reflexState === 'ready' ? 'border-white' : 'border-transparent'} flex flex-col items-center justify-center text-center transition-all duration-150 select-none ${getBgColor()}`}>
          <h1 className={`text-4xl sm:text-5xl font-black tracking-widest uppercase ${reflexState === 'waiting' || reflexState === 'ready' ? 'text-white' : 'text-emerald-400'}`}>{msg.title}</h1>
          <p className={`mt-4 text-sm font-bold ${reflexState === 'waiting' ? 'text-red-200' : reflexState === 'ready' ? 'text-emerald-100' : 'text-blue-300'}`}>{msg.sub}</p>
          {reflexState === 'result' && (
            <div className="mt-8 bg-blue-950/80 px-6 py-3 rounded-xl border border-blue-800 shadow-inner animate-in zoom-in-95">
              <span className="block text-[10px] text-blue-400 uppercase tracking-widest font-bold mb-1">Diagnóstico</span>
              <span className={`text-xl font-black ${reactionTime < 220 ? 'text-amber-400' : reactionTime < 280 ? 'text-emerald-400' : 'text-blue-300'}`}>
                {reactionTime < 220 ? '👽 Bote Alienígena' : reactionTime < 280 ? '⚡ Antecipação Perfeita' : reactionTime < 350 ? '🥷 Corte Padrão' : '🐢 Zagueiro Lento'}
              </span>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderRadarGame = () => {
    return (
      <div className="flex flex-col h-full animate-in slide-in-from-right-4">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h3 className="text-white font-bold flex items-center gap-2 uppercase tracking-widest text-sm"><Eye size={18} className="text-emerald-400"/> Visão Radar Blitz</h3>
            {(activeRoutine !== 'warmup' && activeRoutine !== 'daily') && <p className="text-xs text-blue-400 mt-1">Identifique apenas os pontos <b className="text-red-400">VERMELHOS</b>. Você tem 45s!</p>}
          </div>
          {(activeRoutine !== 'warmup' && activeRoutine !== 'daily') && (radarState === 'memorizing' || radarState === 'answering') && (
             <div className={`px-4 py-2 rounded-xl font-black text-xl border ${radarTimeLeft <= 10 ? 'bg-red-500/20 text-red-400 border-red-500/50 animate-pulse' : 'bg-blue-950 text-emerald-400 border-blue-800'}`}>⏱️ {radarTimeLeft}s</div>
          )}
        </div>

        <div className="flex-1 bg-blue-900 border border-blue-700 rounded-3xl p-6 flex flex-col items-center justify-center relative overflow-hidden shadow-inner min-h-[350px]">
          {radarState === 'idle' && (
             <div className="text-center my-auto">
                <div className="w-20 h-20 bg-blue-950 rounded-full flex items-center justify-center mx-auto mb-4 border border-blue-800 shadow-lg"><Eye size={36} className="text-emerald-400"/></div>
                <h2 className="text-2xl font-black text-white mb-2 uppercase">{(activeRoutine === 'warmup' || activeRoutine === 'daily') ? 'Treino Rápido' : 'Modo Blitz 45s'}</h2>
                <button onClick={startRadarGame} className="mt-4 bg-emerald-600 hover:bg-emerald-500 text-white font-black py-3 px-8 rounded-xl uppercase tracking-wider shadow-lg transition-transform hover:scale-105">Iniciar Treino</button>
             </div>
          )}
          {radarState === 'memorizing' && (
             <div className="w-full flex flex-col items-center justify-center animate-in fade-in">
                <div className="w-full max-w-md flex justify-between px-2 mb-2">
                   <span className="text-emerald-400 font-bold text-xs uppercase tracking-widest animate-pulse">Escaneando...</span>
                   <span className="text-white font-black text-xs">Acertos: {radarScore}</span>
                </div>
                <div className="w-full max-w-md aspect-[4/3] bg-emerald-800 border-4 border-white/20 rounded-xl relative overflow-hidden shadow-2xl">
                  <div className="absolute top-1/2 left-0 w-full h-0.5 bg-white/30"></div>
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 rounded-full border-2 border-white/30"></div>
                  {radarDots.map((dot, i) => ( 
                     <div key={i} className={`absolute w-4 h-4 rounded-full border border-white/50 shadow-lg ${dot.type === 'enemy' ? 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.8)]' : 'bg-blue-400 shadow-[0_0_10px_rgba(96,165,250,0.8)]'}`} style={{ top: dot.top, left: dot.left }}></div> 
                  ))}
               </div>
             </div>
          )}
          {radarState === 'answering' && (
             <div className="w-full max-w-xs text-center animate-in zoom-in-95">
                <h3 className="text-xl font-bold text-white mb-6 uppercase tracking-wider">Quantos Vermelhos?</h3>
                <div className="grid grid-cols-2 gap-4">
                   {radarOptions.map((opt, idx) => (
                      <button key={idx} onClick={() => handleRadarAnswer(opt)} className="bg-blue-950 hover:bg-emerald-600 text-white font-black text-3xl py-6 rounded-2xl border border-blue-600 hover:border-emerald-400 transition-colors shadow-md">
                         {opt}
                      </button>
                   ))}
                </div>
             </div>
          )}
          {radarState === 'result' && (
             <div className="w-full max-w-sm text-center animate-in zoom-in-95">
                <div className="w-20 h-20 bg-emerald-500/20 border-2 border-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4 shadow-[0_0_20px_rgba(16,185,129,0.4)]"><Trophy size={36} className="text-emerald-500"/></div>
                <h2 className="text-3xl font-black text-white uppercase tracking-wider mb-2">Fim de Jogo!</h2>
                <div className="bg-blue-950 p-4 rounded-xl border border-blue-800 mb-6"><p className="text-xs text-blue-400 uppercase font-bold tracking-widest">Leituras Certas</p><p className="text-4xl font-black text-emerald-400 mt-1">{radarScore}</p></div>
                {(activeRoutine !== 'warmup' && activeRoutine !== 'daily') && <button onClick={startRadarGame} className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 px-8 rounded-xl uppercase shadow-md w-full">Jogar Novamente</button>}
             </div>
          )}
        </div>
      </div>
    );
  };

  const renderDecisionGame = () => {
    return (
      <div className="flex flex-col h-full animate-in slide-in-from-right-4">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-white font-bold flex items-center gap-2 uppercase tracking-widest text-sm"><Brain size={18} className="text-purple-400"/> Quiz de Pressão</h3>
          {decisionState === 'playing' && ( <div className={`px-4 py-2 rounded-xl font-black text-xl border ${timeLeft <= 3 ? 'bg-red-500/20 text-red-400 border-red-500/50 animate-pulse' : 'bg-blue-950 text-emerald-400 border-blue-800'}`}>⏱️ {timeLeft}s</div> )}
        </div>
        <div className="flex-1 bg-blue-900 border border-blue-700 rounded-3xl p-6 flex flex-col relative overflow-hidden shadow-inner min-h-[350px]">
          {decisionState === 'idle' && (
             <div className="text-center my-auto">
                <div className="w-20 h-20 bg-blue-950 rounded-full flex items-center justify-center mx-auto mb-4 border border-blue-800 shadow-lg"><Brain size={36} className="text-purple-400"/></div>
                <h2 className="text-2xl font-black text-white mb-2 uppercase">Decisão Rápida</h2>
                <button onClick={startDecisionGame} className="mt-6 bg-purple-600 hover:bg-purple-500 text-white font-black py-3 px-8 rounded-xl uppercase tracking-wider shadow-lg transition-transform hover:scale-105">Começar Treino</button>
             </div>
          )}
          {decisionState === 'playing' && currentScenario && (
             <div className="flex flex-col h-full animate-in zoom-in-95 duration-200">
                <div className="bg-blue-950 border border-purple-500/50 p-5 rounded-2xl mb-6 shadow-md"><p className="text-[10px] text-purple-400 font-bold uppercase tracking-widest mb-2 border-b border-blue-800 pb-2">Situação de Jogo | Acertos: {decisionScore}</p><p className="text-white font-medium sm:text-lg leading-relaxed">{currentScenario.q}</p></div>
                <div className="flex-1 flex flex-col gap-3">{currentScenario.opts.map((opt, idx) => ( <button key={idx} onClick={() => handleDecisionSubmit(idx)} className="w-full text-left bg-blue-800/50 hover:bg-purple-600/80 border border-blue-700 hover:border-purple-400 p-4 rounded-xl text-blue-100 font-medium transition-colors text-sm sm:text-base shadow-sm">{opt}</button> ))}</div>
             </div>
          )}
          {decisionState === 'result' && (
             <div className="text-center my-auto animate-in zoom-in-95">
                <div className="w-20 h-20 bg-red-500/20 border-2 border-red-500 rounded-full flex items-center justify-center mx-auto mb-4 shadow-[0_0_20px_rgba(239,68,68,0.4)]">{timeLeft === 0 ? <Activity size={36} className="text-red-500"/> : <XCircle size={36} className="text-red-500"/>}</div>
                <h2 className="text-3xl font-black text-white uppercase tracking-wider mb-2">{timeLeft === 0 ? 'Tempo Esgotado!' : 'Decisão Errada!'}</h2>
                <div className="bg-blue-950 p-4 rounded-xl border border-blue-800 mb-6 inline-block w-full max-w-xs"><p className="text-xs text-blue-400 uppercase font-bold tracking-widest">Tomadas Corretas</p><p className="text-4xl font-black text-purple-400 mt-1">{decisionScore}</p></div>
                <button onClick={startDecisionGame} className="bg-purple-600 hover:bg-purple-500 text-white font-bold py-3 px-8 rounded-xl uppercase shadow-md w-full max-w-xs block mx-auto transition-colors">Tentar Novamente</button>
             </div>
          )}
        </div>
      </div>
    );
  };

  const renderMemoryGame = () => {
    return (
      <div className="flex flex-col h-full animate-in slide-in-from-right-4">
        <h3 className="text-white font-bold mb-4 flex items-center gap-2 uppercase tracking-widest text-sm"><Camera size={18} className="text-purple-400"/> Memória Fotográfica</h3>
        <div className="flex-1 bg-blue-900 border border-blue-700 rounded-3xl p-6 flex flex-col items-center justify-center relative overflow-hidden shadow-inner min-h-[350px]">
          {memoryState === 'idle' && (
             <div className="text-center">
                <div className="w-20 h-20 bg-blue-950 rounded-full flex items-center justify-center mx-auto mb-4 border border-blue-800 shadow-lg"><Camera size={36} className="text-purple-400"/></div>
                <h2 className="text-2xl font-black text-white mb-2 uppercase">Mapear Espaços</h2>
                <button onClick={startMemoryGame} className="mt-4 bg-purple-600 hover:bg-purple-500 text-white font-black py-3 px-8 rounded-xl uppercase tracking-wider shadow-lg transition-transform hover:scale-105">Iniciar Mapeamento</button>
             </div>
          )}
          {memoryState === 'memorizing' && (
             <div className="w-full max-w-md aspect-[4/3] bg-emerald-800 border-4 border-white/20 rounded-xl relative overflow-hidden shadow-2xl grid grid-cols-3 grid-rows-2 gap-1.5 p-2 animate-in fade-in">
                <div className="absolute top-1/2 left-0 w-full h-0.5 bg-white/30 z-0"></div>
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 rounded-full border-2 border-white/30 z-0"></div>
                {PITCH_ZONES.map(z => (
                   <div key={z.id} className="bg-emerald-900/40 rounded flex items-center justify-center relative z-10">
                      {emptyZone !== z.id && ( <div className="w-5 h-5 bg-red-500 rounded-full border border-red-300 shadow-[0_0_15px_rgba(239,68,68,1)]"></div> )}
                   </div>
                ))}
             </div>
          )}
          {memoryState === 'question' && (
             <div className="w-full max-w-md animate-in zoom-in-95">
                <h3 className="text-xl font-bold text-white text-center mb-4 uppercase tracking-wider">Onde estava o buraco na defesa?</h3>
                <div className="aspect-[4/3] bg-blue-950 border-2 border-blue-800 rounded-xl grid grid-cols-3 grid-rows-2 gap-2 p-3 shadow-inner">
                  {PITCH_ZONES.map(z => ( <button key={z.id} onClick={() => handleMemoryAnswer(z.id)} className="bg-blue-900 hover:bg-purple-600 text-[10px] sm:text-xs text-blue-200 hover:text-white font-bold rounded-lg p-2 text-center transition-colors border border-blue-700">{z.name}</button> ))}
                </div>
             </div>
          )}
          {memoryState === 'result' && (
             <div className="w-full max-w-sm text-center animate-in zoom-in-95">
                <div className="w-20 h-20 bg-red-500/20 border-2 border-red-500 rounded-full flex items-center justify-center mx-auto mb-4 shadow-[0_0_20px_rgba(239,68,68,0.4)]"><XCircle size={36} className="text-red-500"/></div>
                <h2 className="text-3xl font-black text-white uppercase tracking-wider mb-2">Visão Bloqueada!</h2>
                <div className="bg-blue-950 p-4 rounded-xl border border-blue-800 mb-6"><p className="text-xs text-blue-400 uppercase font-bold tracking-widest">Leituras Seguidas</p><p className="text-2xl font-black text-purple-400 mt-1">{memoryScore}</p></div>
                <button onClick={startMemoryGame} className="bg-purple-600 hover:bg-purple-500 text-white font-bold py-3 px-8 rounded-xl uppercase shadow-md w-full">Tentar Novamente</button>
             </div>
          )}
        </div>
      </div>
    );
  };

  const renderForceGame = () => {
    return (
      <div className="flex flex-col h-full animate-in slide-in-from-right-4">
        <h3 className="text-white font-bold mb-4 flex items-center gap-2 uppercase tracking-widest text-sm"><Target size={18} className="text-sky-400"/> Calibragem de Dedo</h3>
        <div className="flex-1 bg-blue-900 border border-blue-700 rounded-3xl p-6 flex flex-col items-center justify-center relative overflow-hidden shadow-inner min-h-[350px]">
          {forceState === 'idle' && (
             <div className="text-center my-auto">
                <div className="w-20 h-20 bg-blue-950 rounded-full flex items-center justify-center mx-auto mb-4 border border-blue-800 shadow-lg"><Target size={36} className="text-sky-400"/></div>
                <h2 className="text-2xl font-black text-white mb-2 uppercase">A Física do Jogo</h2>
                <p className="text-blue-300 text-sm max-w-sm mx-auto mb-6">A barra enche rápido e se chegar a 100% isola a bola. Pressione e solte para calibrar botões A, B e C.</p>
                <button onClick={startForceGame} className="bg-sky-600 hover:bg-sky-500 text-white font-black py-3 px-8 rounded-xl uppercase tracking-wider shadow-lg transition-transform hover:scale-105">Iniciar Treino</button>
             </div>
          )}
          {(forceState === 'waiting_press' || forceState === 'charging' || forceState === 'success') && (
             <div 
                className="w-full max-w-sm flex flex-col items-center animate-in zoom-in-95 cursor-pointer h-full justify-center select-none"
                style={{ touchAction: 'none' }}
                onPointerDown={handlePointerDown}
                onPointerUp={handlePointerUp}
                onPointerLeave={handlePointerUp}
                onContextMenu={(e) => e.preventDefault()}
             >
                <div className="flex justify-between w-full mb-1 px-2"><span className="text-blue-400 font-bold uppercase text-[10px] tracking-widest">Acertos Seguidos</span><span className="text-sky-400 font-black text-lg">{forceScore}</span></div>
                
                <div className="text-center mb-6">
                    <span className={`border text-xs px-4 py-1.5 rounded-lg font-black uppercase tracking-widest shadow-md ${targetZone.label.includes('A') ? 'bg-red-500/20 border-red-500 text-red-300' : targetZone.label.includes('B') ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300' : 'bg-amber-500/20 border-amber-500 text-amber-300'}`}>
                        {targetZone.label}
                    </span>
                </div>

                <div className="w-full h-8 bg-black/40 border-2 border-slate-700/50 rounded-full relative overflow-hidden shadow-inner">
                   <div className="absolute h-full bg-white/20 border-l-2 border-r-2 border-white z-10" style={{ left: `${targetZone.min}%`, width: `${targetZone.max - targetZone.min}%` }}></div>
                   <div className={`h-full transition-none ${forceState === 'success' ? 'bg-emerald-500' : (power > 80 ? 'bg-red-500' : power > 50 ? 'bg-amber-500' : 'bg-green-500')}`} style={{ width: `${power}%` }}></div>
                </div>

                <p className={`text-[10px] uppercase mt-8 font-black tracking-widest px-4 py-2 rounded-xl border ${forceState === 'waiting_press' ? 'bg-blue-950 border-blue-800 text-blue-400 animate-pulse' : forceState === 'charging' ? 'bg-amber-500/20 border-amber-500 text-amber-400 scale-110 transition-transform' : 'bg-emerald-500/20 border-emerald-500 text-emerald-400'}`}>
                   {forceState === 'waiting_press' ? '👇 Pressione a Tela' : forceState === 'charging' ? '⚡ Solte na Zona Branca!' : '🎯 Medida Exata!'}
                </p>
             </div>
          )}
          {forceState === 'result' && (
             <div className="w-full max-w-sm text-center animate-in zoom-in-95">
                <div className="w-20 h-20 bg-red-500/20 border-2 border-red-500 rounded-full flex items-center justify-center mx-auto mb-4 shadow-[0_0_20px_rgba(239,68,68,0.4)]"><XCircle size={36} className="text-red-500"/></div>
                <h2 className="text-3xl font-black text-white uppercase tracking-wider mb-2">Passe Errado!</h2>
                <div className="bg-blue-950 p-4 rounded-xl border border-blue-800 mb-6 mt-4"><p className="text-xs text-blue-400 uppercase font-bold tracking-widest">Jogadas Concluídas</p><p className="text-4xl font-black text-sky-400 mt-1">{forceScore}</p></div>
                <button onClick={startForceGame} className="bg-sky-600 hover:bg-sky-500 text-white font-bold py-3 px-8 rounded-xl uppercase shadow-md w-full">Tentar Novamente</button>
             </div>
          )}
        </div>
      </div>
    );
  };

  const renderTimingGame = () => {
    return (
      <div className="flex flex-col h-full animate-in slide-in-from-right-4">
        <h3 className="text-white font-bold mb-4 flex items-center gap-2 uppercase tracking-widest text-sm"><Shield size={18} className="text-red-400"/> Timing de Bote</h3>
        <div className="flex-1 bg-blue-900 border border-blue-700 rounded-3xl p-6 flex flex-col items-center justify-center relative overflow-hidden shadow-inner min-h-[350px]">
          {timingState === 'idle' && (
             <div className="text-center my-auto">
                <div className="w-20 h-20 bg-blue-950 rounded-full flex items-center justify-center mx-auto mb-4 border border-blue-800 shadow-lg"><Shield size={36} className="text-red-400"/></div>
                <h2 className="text-2xl font-black text-white mb-2 uppercase">Tempo do Desarme</h2>
                <button onClick={handleTackle} className="bg-red-600 hover:bg-red-500 text-white font-black py-3 px-8 rounded-xl uppercase tracking-wider shadow-lg transition-transform hover:scale-105">Iniciar Treino</button>
             </div>
          )}
          {(timingState === 'playing' || timingState === 'success') && (
             <div className="w-full max-w-sm flex flex-col items-center animate-in zoom-in-95 cursor-pointer h-full justify-center" onClick={handleTackle}>
                <div className="flex justify-between w-full mb-3 px-2"><span className="text-blue-400 font-bold uppercase text-[10px] tracking-widest">Desarmes Seguidos</span><span className="text-red-400 font-black text-lg">{timingScore}</span></div>
                <div className="w-16 h-64 bg-blue-950 border-2 border-blue-700 rounded-full relative overflow-hidden shadow-inner mx-auto">
                   <div className="absolute w-full bg-emerald-500/40 border-t-2 border-b-2 border-emerald-400 z-10" style={{ top: '68%', height: '17%' }}></div>
                   <div className={`absolute w-10 h-10 left-1/2 -translate-x-1/2 rounded-full border-2 shadow-[0_0_15px_rgba(239,68,68,0.8)] z-20 transition-none ${timingState === 'success' ? 'bg-emerald-500 border-white shadow-[0_0_15px_rgba(16,185,129,0.8)]' : 'bg-red-500 border-red-300'}`} style={{ top: `${attackerPos}%` }}></div>
                </div>
                <p className="text-[10px] text-blue-400 uppercase mt-6 animate-pulse font-bold bg-blue-950 px-4 py-2 rounded-lg border border-blue-800">Toque para dar o Bote!</p>
             </div>
          )}
          {timingState.startsWith('result') && (
             <div className="w-full max-w-sm text-center animate-in zoom-in-95">
                <div className="w-20 h-20 bg-red-500/20 border-2 border-red-500 rounded-full flex items-center justify-center mx-auto mb-4 shadow-[0_0_20px_rgba(239,68,68,0.4)]"><XCircle size={36} className="text-red-500"/></div>
                <h2 className="text-2xl font-black text-white uppercase tracking-wider mb-2">{timingState === 'result_early' ? 'Falta Dura!' : 'Tomou o drible!'}</h2>
                <div className="bg-blue-950 p-4 rounded-xl border border-blue-800 mb-6"><p className="text-xs text-blue-400 uppercase font-bold tracking-widest">Botes Certos</p><p className="text-4xl font-black text-red-400 mt-1">{timingScore}</p></div>
                <button onClick={startTimingGame} className="bg-red-600 hover:bg-red-500 text-white font-bold py-3 px-8 rounded-xl uppercase shadow-md w-full">Tentar Novamente</button>
             </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-in fade-in pb-12">
      
      {/* CABEÇALHO DO CT */}
      <div className="bg-gradient-to-r from-blue-900 to-blue-950 p-6 sm:p-8 rounded-3xl border border-sky-500/30 shadow-2xl flex flex-col md:flex-row items-center gap-6 relative overflow-hidden">
        <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-sky-500/10 blur-3xl rounded-full"></div>
        <div className="bg-blue-950 p-4 rounded-full border-2 border-sky-400 shadow-[0_0_20px_rgba(56,189,248,0.3)] z-10 shrink-0">
          <Brain size={40} className="text-sky-400" />
        </div>
        <div className="z-10 text-center md:text-left flex-1">
          <span className="text-[10px] bg-sky-500/20 text-sky-400 px-2 py-0.5 rounded font-black tracking-widest uppercase mb-2 inline-block border border-sky-500/30">Módulo Experimental</span>
          <h2 className="text-2xl sm:text-4xl font-black text-white uppercase tracking-wider leading-none">CT Kame <span className="text-sky-400 drop-shadow-md">Pro</span></h2>
          <p className="text-sm text-blue-300 mt-2">Centro de Treinamento Cognitivo e Mecânico. Aprimore sua gameplay baseada em ciência para amassar no DLS.</p>
        </div>
      </div>

      {/* 🌟 PLANOS DE TREINO (AQUECIMENTO E DIÁRIO) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
         <button onClick={() => startRoutine('warmup')} disabled={activeRoutine !== null} className={`bg-gradient-to-r from-orange-600 to-amber-500 p-4 rounded-2xl flex items-center gap-4 hover:scale-[1.02] transition-transform shadow-lg border border-amber-400/30 text-left ${activeRoutine ? 'opacity-50 cursor-not-allowed' : ''}`}>
            <div className="bg-white/20 p-3 rounded-full shrink-0"><Flame className="text-white" size={24}/></div>
            <div>
               <h4 className="text-white font-black uppercase tracking-wider">Aquecimento Pré-Jogo</h4>
               <p className="text-white/80 text-[10px] mt-0.5 uppercase tracking-widest font-bold">3 Minutos • Avaliação Rápida</p>
            </div>
         </button>

         <button onClick={() => startRoutine('daily')} disabled={activeRoutine !== null} className={`p-4 rounded-2xl flex items-center gap-4 transition-transform shadow-lg border text-left ${dailyProgress >= 300 ? 'bg-emerald-600 border-emerald-400/30 cursor-default' : 'bg-gradient-to-r from-blue-600 to-indigo-500 border-indigo-400/30 hover:scale-[1.02]'} ${activeRoutine ? 'opacity-50 cursor-not-allowed' : ''}`}>
            <div className="bg-white/20 p-3 rounded-full shrink-0">
               {dailyProgress >= 300 ? <CheckCircle className="text-white" size={24}/> : <Calendar className="text-white" size={24}/>}
            </div>
            <div className="flex-1">
               <h4 className="text-white font-black uppercase tracking-wider">Treino Diário</h4>
               {dailyProgress >= 300 ? (
                  <p className="text-white/90 text-xs mt-0.5 font-bold uppercase tracking-widest">Concluído! Volte amanhã 🏆</p>
               ) : (
                  <div className="mt-1">
                     <div className="flex justify-between text-[10px] text-white/80 mb-0.5 font-bold uppercase tracking-widest">
                       <span>Progresso Geral</span>
                       <span>{Math.floor(dailyProgress/60)}/5 Min</span>
                     </div>
                     <div className="w-full bg-black/30 rounded-full h-1.5 overflow-hidden"><div className="bg-white h-1.5 rounded-full transition-all duration-1000" style={{width: `${Math.min(100, (dailyProgress/300)*100)}%`}}></div></div>
                  </div>
               )}
            </div>
         </button>
      </div>

      {/* 🌟 NAVEGAÇÃO DE CATEGORIAS OU BANNER DE ROTINA */}
      {activeRoutine === 'summary' ? (
         <div className="border rounded-2xl p-4 bg-emerald-900/80 border-emerald-500 shadow-xl animate-in slide-in-from-top-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
               <Trophy className="text-emerald-400" size={28}/>
               <div><h3 className="text-white font-black uppercase tracking-wider text-sm sm:text-base">Treino Concluído</h3><p className="text-emerald-200/70 text-[10px] font-bold uppercase tracking-widest mt-0.5">Analista de Desempenho Ativo</p></div>
            </div>
         </div>
      ) : activeRoutine ? (
         <div className={`border rounded-2xl p-4 flex items-center justify-between shadow-xl animate-in slide-in-from-top-4 ${activeRoutine === 'warmup' ? 'bg-amber-900 border-amber-500' : 'bg-indigo-900 border-indigo-500'}`}>
            <div className="flex items-center gap-3">
               {activeRoutine === 'warmup' ? <Flame className="text-amber-500 animate-pulse" size={28}/> : <Calendar className="text-blue-400 animate-pulse" size={28}/>}
               <div>
                  <h3 className="text-white font-black uppercase tracking-wider text-sm sm:text-base">
                     {activeRoutine === 'warmup' ? 'Aquecimento em Andamento' : 'Treino Diário em Andamento'}
                  </h3>
                  <p className="text-white/70 text-[10px] sm:text-xs font-bold uppercase tracking-widest mt-0.5">
                     Etapa {routineStep + 1} de {activeRoutine === 'warmup' ? 3 : 5} • <span className="text-white">{activeRoutine === 'warmup' ? WARMUP_ROUTINE[routineStep].name : DAILY_ROUTINE[routineStep].name}</span>
                  </p>
               </div>
            </div>
            <div className="text-right shrink-0">
               <span className={`text-2xl sm:text-3xl font-black font-mono ${routineTimeLeft <= 10 ? 'text-red-400 animate-pulse' : 'text-white'}`}>{formatTime(routineTimeLeft)}</span>
               <button onClick={cancelRoutine} className="block w-full text-right text-[9px] text-white/50 uppercase font-bold mt-1 hover:text-red-400 transition-colors">Cancelar</button>
            </div>
         </div>
      ) : (
         <>
            <div className="flex gap-2 p-1.5 bg-blue-950/80 rounded-xl border border-blue-800 overflow-x-auto custom-scrollbar shadow-inner">
               <button onClick={() => handleCategoryChange('cognitivo')} className={`shrink-0 flex-1 py-3 px-4 text-xs md:text-sm rounded-lg font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${activeCategory === 'cognitivo' ? 'bg-amber-600 text-blue-950 shadow-md' : 'text-amber-500/60 hover:text-amber-400 hover:bg-blue-900/50'}`}>🧠 Cognitivo</button>
               <button onClick={() => handleCategoryChange('tatica')} className={`shrink-0 flex-1 py-3 px-4 text-xs md:text-sm rounded-lg font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${activeCategory === 'tatica' ? 'bg-purple-600 text-white shadow-md' : 'text-purple-400/60 hover:text-purple-400 hover:bg-blue-900/50'}`}>🎯 Tática</button>
               <button onClick={() => handleCategoryChange('mecanica')} className={`shrink-0 flex-1 py-3 px-4 text-xs md:text-sm rounded-lg font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${activeCategory === 'mecanica' ? 'bg-sky-600 text-white shadow-md' : 'text-sky-400/60 hover:text-sky-400 hover:bg-blue-900/50'}`}>🕹️ Mecânica</button>
            </div>

            <div className="flex gap-2 p-1 bg-blue-900/40 rounded-xl border border-blue-800/50 overflow-x-auto custom-scrollbar">
               {activeCategory === 'cognitivo' && (
                 <>
                   <button onClick={() => setActiveDrill('reflex')} className={`shrink-0 flex-1 py-2 px-4 text-xs rounded-lg font-bold transition-all flex items-center justify-center gap-2 ${activeDrill === 'reflex' ? 'bg-blue-800 text-amber-400 border border-amber-500/30 shadow-md' : 'text-blue-500 hover:text-blue-300'}`}><Zap size={14}/> Reflexos</button>
                   <button onClick={() => setActiveDrill('radar')} className={`shrink-0 flex-1 py-2 px-4 text-xs rounded-lg font-bold transition-all flex items-center justify-center gap-2 ${activeDrill === 'radar' ? 'bg-blue-800 text-emerald-400 border border-emerald-500/30 shadow-md' : 'text-blue-500 hover:text-blue-300'}`}><Eye size={14}/> Visão Radar</button>
                 </>
               )}
               {activeCategory === 'tatica' && (
                 <>
                   <button onClick={() => setActiveDrill('decision')} className={`shrink-0 flex-1 py-2 px-4 text-xs rounded-lg font-bold transition-all flex items-center justify-center gap-2 ${activeDrill === 'decision' ? 'bg-blue-800 text-purple-400 border border-purple-500/30 shadow-md' : 'text-blue-500 hover:text-blue-300'}`}><Brain size={14}/> Quiz de Pressão</button>
                   <button onClick={() => setActiveDrill('memory')} className={`shrink-0 flex-1 py-2 px-4 text-xs rounded-lg font-bold transition-all flex items-center justify-center gap-2 ${activeDrill === 'memory' ? 'bg-blue-800 text-purple-400 border border-purple-500/30 shadow-md' : 'text-blue-500 hover:text-blue-300'}`}><Camera size={14}/> Tracking Espacial</button>
                 </>
               )}
               {activeCategory === 'mecanica' && (
                 <>
                   <button onClick={() => setActiveDrill('force')} className={`shrink-0 flex-1 py-2 px-4 text-xs rounded-lg font-bold transition-all flex items-center justify-center gap-2 ${activeDrill === 'force' ? 'bg-blue-800 text-sky-400 border border-sky-500/30 shadow-md' : 'text-blue-500 hover:text-blue-300'}`}><Target size={14}/> Controle de Força</button>
                   <button onClick={() => setActiveDrill('timing')} className={`shrink-0 flex-1 py-2 px-4 text-xs rounded-lg font-bold transition-all flex items-center justify-center gap-2 ${activeDrill === 'timing' ? 'bg-blue-800 text-red-400 border border-red-500/30 shadow-md' : 'text-blue-500 hover:text-blue-300'}`}><Shield size={14}/> Timing de Bote</button>
                 </>
               )}
            </div>
         </>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* ÁREA PRINCIPAL DO MINIGAME OU DO RELATÓRIO FINAL */}
        <div className={`lg:col-span-2 bg-blue-950 p-4 sm:p-6 rounded-3xl border shadow-xl overflow-hidden min-h-[450px] flex flex-col transition-colors ${activeRoutine === 'warmup' ? 'border-amber-500/50' : activeRoutine === 'daily' ? 'border-indigo-500/50' : activeRoutine === 'summary' ? 'border-emerald-500/50' : 'border-blue-800'}`}>
          {activeRoutine === 'summary' ? renderRoutineSummary() : (
            <>
               {activeDrill === 'reflex' && renderReflexGame()}
               {activeDrill === 'radar' && renderRadarGame()}
               {activeDrill === 'decision' && renderDecisionGame()}
               {activeDrill === 'memory' && renderMemoryGame()}
               {activeDrill === 'force' && renderForceGame()}
               {activeDrill === 'timing' && renderTimingGame()}
            </>
          )}
        </div>

        {/* PAINEL LATERAL DE STATUS DO JOGADOR */}
        <div className="bg-blue-900 p-6 rounded-3xl border border-blue-800 shadow-xl flex flex-col gap-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-full h-1 bg-gradient-to-r from-amber-400 via-emerald-400 to-sky-400"></div>
          
          <div>
            <h3 className="text-white font-black uppercase tracking-widest text-sm mb-4 border-b border-blue-800 pb-3 flex items-center gap-2">
              <Activity size={18} className="text-blue-400"/> Boletim Geral
            </h3>
            
            <div className="space-y-6">
              <div>
                <div className="flex justify-between items-end mb-1.5">
                  <span className="text-[10px] font-bold uppercase text-amber-400 tracking-wider flex items-center gap-1"><Zap size={12}/> Reação</span>
                  <span className="text-xs font-black text-white">{bestReflex ? `${bestReflex} ms` : 'N/A'}</span>
                </div>
                <div className="w-full bg-blue-950 rounded-full h-2.5 border border-blue-800 overflow-hidden shadow-inner relative"><div className="bg-gradient-to-r from-amber-600 to-amber-400 h-2.5 rounded-full transition-all duration-1000 ease-out" style={{ width: `${bestReflex ? Math.max(5, Math.min(100, 100 - ((bestReflex - 150) / 4))) : 0}%` }}></div></div>
              </div>

              <div>
                <div className="flex justify-between items-end mb-1.5">
                  <span className="text-[10px] font-bold uppercase text-emerald-400 tracking-wider flex items-center gap-1"><Eye size={12}/> Radar Blitz</span>
                  <span className="text-xs font-black text-white">{bestRadar ? `${bestRadar} Acertos` : 'N/A'}</span>
                </div>
                <div className="w-full bg-blue-950 rounded-full h-2.5 border border-blue-800 overflow-hidden shadow-inner relative"><div className="bg-gradient-to-r from-emerald-600 to-emerald-400 h-2.5 rounded-full transition-all duration-1000 ease-out" style={{ width: `${bestRadar ? Math.min(100, (bestRadar / 25) * 100) : 0}%` }}></div></div>
              </div>

              <div>
                <div className="flex justify-between items-end mb-1.5">
                  <span className="text-[10px] font-bold uppercase text-purple-400 tracking-wider flex items-center gap-1"><Camera size={12}/> Visão Espacial</span>
                  <span className="text-xs font-black text-white">{bestMemory ? `${bestMemory} Leituras` : 'N/A'}</span>
                </div>
                <div className="w-full bg-blue-950 rounded-full h-2.5 border border-blue-800 overflow-hidden shadow-inner relative"><div className="bg-gradient-to-r from-purple-600 to-purple-400 h-2.5 rounded-full transition-all duration-1000 ease-out" style={{ width: `${bestMemory ? Math.min(100, (bestMemory / 15) * 100) : 0}%` }}></div></div>
              </div>

              <div>
                <div className="flex justify-between items-end mb-1.5">
                  <span className="text-[10px] font-bold uppercase text-purple-400 tracking-wider flex items-center gap-1"><Brain size={12}/> QI Tático</span>
                  <span className="text-xs font-black text-white">{bestDecision ? `${bestDecision} Acertos` : 'N/A'}</span>
                </div>
                <div className="w-full bg-blue-950 rounded-full h-2.5 border border-blue-800 overflow-hidden shadow-inner relative"><div className="bg-gradient-to-r from-purple-600 to-purple-400 h-2.5 rounded-full transition-all duration-1000 ease-out" style={{ width: `${bestDecision ? Math.min(100, (bestDecision / 15) * 100) : 0}%` }}></div></div>
              </div>

              <div>
                <div className="flex justify-between items-end mb-1.5">
                  <span className="text-[10px] font-bold uppercase text-sky-400 tracking-wider flex items-center gap-1"><Target size={12}/> Calibragem</span>
                  <span className="text-xs font-black text-white">{bestForce ? `${bestForce} Hits` : 'N/A'}</span>
                </div>
                <div className="w-full bg-blue-950 rounded-full h-2.5 border border-blue-800 overflow-hidden shadow-inner relative"><div className="bg-gradient-to-r from-sky-600 to-sky-400 h-2.5 rounded-full transition-all duration-1000 ease-out" style={{ width: `${bestForce ? Math.min(100, (bestForce / 20) * 100) : 0}%` }}></div></div>
              </div>

              <div>
                <div className="flex justify-between items-end mb-1.5">
                  <span className="text-[10px] font-bold uppercase text-red-400 tracking-wider flex items-center gap-1"><Shield size={12}/> Bote Perfeito</span>
                  <span className="text-xs font-black text-white">{bestTiming ? `${bestTiming} Desarmes` : 'N/A'}</span>
                </div>
                <div className="w-full bg-blue-950 rounded-full h-2.5 border border-blue-800 overflow-hidden shadow-inner relative"><div className="bg-gradient-to-r from-red-600 to-red-400 h-2.5 rounded-full transition-all duration-1000 ease-out" style={{ width: `${bestTiming ? Math.min(100, (bestTiming / 20) * 100) : 0}%` }}></div></div>
              </div>

            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
  
export default TrainingCenter;

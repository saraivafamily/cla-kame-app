import React, { useState, useEffect, useMemo } from 'react';
import { Camera, Key, UploadCloud, CheckCircle, AlertCircle, X } from 'lucide-react';
import ShieldDisplay from './ShieldDisplay';
import Button from './Button';
import { processScreenshot } from '../utils/helpers';

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

export default SubmitMatch;

import React, { useState, useEffect } from 'react';
import { updateDoc } from 'firebase/firestore';
import { getPublicDocPath } from '../utils/firebase';
import { Zap, ArrowLeft, RotateCcw, RefreshCw, XCircle, PlusCircle, Search, Bot, UploadCloud, Loader2, Key } from 'lucide-react';
import Button from './Button';
import ShieldDisplay from './ShieldDisplay';

const XPointsManager = ({ users, teams, onBack, showToast }) => {
  const [draftPoints, setDraftPoints] = useState({});
  const [draftBranches, setDraftBranches] = useState({});
  
  const [selectedTropical, setSelectedTropical] = useState('');
  const [selectedCeu, setSelectedCeu] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  // 🌟 ESTADOS DA IA
  const [isExtractingImage, setIsExtractingImage] = useState(false);
  const [aiReadLog, setAiReadLog] = useState([]);
  const [showKeyInput, setShowKeyInput] = useState(false);
  const [tempKey, setTempKey] = useState('');
  const [userApiKey, setUserApiKey] = useState(() => {
    try { return localStorage.getItem('gemini_api_key') || ''; }
    catch(e) { return ''; }
  });
  
  const validUsers = (users || []).filter(u => {
    if (!u.name || u.id === 'u_master' || u.status !== 'active') return false;
    const userTeam = (teams || []).find(t => t.ownerId === u.id);
    if (userTeam && userTeam.status === 'inactive') return false;
    return true;
  });
  
  useEffect(() => {
    setDraftPoints(prev => {
      const next = { ...prev };
      validUsers.forEach(u => { if (next[u.id] === undefined) next[u.id] = u.dlsXPoints || ''; });
      return next;
    });
    setDraftBranches(prev => {
      const next = { ...prev };
      validUsers.forEach(u => { if (next[u.id] === undefined && u.clanBranch) next[u.id] = u.clanBranch; });
      return next;
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [users]);

  const matchesSearch = (u) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    const uName = u.name.toLowerCase();
    const userTeam = (teams || []).find(t => t.ownerId === u.id);
    const tName = (userTeam ? userTeam.name : 'Sem Time').toLowerCase();
    return uName.includes(term) || tName.includes(term);
  };

  const unassignedUsers = validUsers.filter(u => !draftBranches[u.id]).sort((a,b) => a.name.localeCompare(b.name));
  
  const tropicalAllSorted = validUsers.filter(u => draftBranches[u.id] === 'tropical').sort((a,b) => (Number(draftPoints[b.id])||0) - (Number(draftPoints[a.id])||0));
  const ceuAllSorted = validUsers.filter(u => draftBranches[u.id] === 'ceu').sort((a,b) => (Number(draftPoints[b.id])||0) - (Number(draftPoints[a.id])||0));

  const displayTropical = tropicalAllSorted.filter(matchesSearch);
  const displayCeu = ceuAllSorted.filter(matchesSearch);

  // 🌟 FUNÇÕES DE MANEJO
  const handleAddTropical = async () => {
    if (!selectedTropical) return;
    const uId = selectedTropical;
    setDraftBranches(prev => ({ ...prev, [uId]: 'tropical' }));
    setSelectedTropical('');
    await updateDoc(getPublicDocPath('users', uId), { clanBranch: 'tropical' });
  };

  const handleAddCeu = async () => {
    if (!selectedCeu) return;
    const uId = selectedCeu;
    setDraftBranches(prev => ({ ...prev, [uId]: 'ceu' }));
    setSelectedCeu('');
    await updateDoc(getPublicDocPath('users', uId), { clanBranch: 'ceu' });
  };

  const handleRemoveUser = async (id) => {
    if(!window.confirm("Remover este técnico do controle de XPoints?")) return;
    setDraftBranches(prev => { const next = {...prev}; delete next[id]; return next; });
    await updateDoc(getPublicDocPath('users', id), { clanBranch: null, dlsXPoints: 0, dlsXPointsTargetReached: false });
  };

  const toggleBranch = async (id, currentBranch) => {
    const newBranch = currentBranch === 'tropical' ? 'ceu' : 'tropical';
    if(!window.confirm(`Tem certeza que deseja transferir este jogador para a Ilha ${newBranch === 'tropical' ? 'Tropical' : 'do Céu'}?\n\n🚨 O SALDO DELE SERÁ ZERADO.`)) return;

    setDraftBranches(prev => ({ ...prev, [id]: newBranch }));
    setDraftPoints(prev => ({ ...prev, [id]: 0 }));
    const reachedTarget = newBranch === 'tropical' ? false : true;

    await updateDoc(getPublicDocPath('users', id), { clanBranch: newBranch, dlsXPoints: 0, dlsXPointsTargetReached: reachedTarget });
  };

  const handlePointChange = (id, branch, val) => {
    setDraftPoints(prev => ({...prev, [id]: val})); 
    const pts = Number(val) || 0;
    const reachedTarget = branch === 'tropical' ? pts >= 200000 : true;
    updateDoc(getPublicDocPath('users', id), { dlsXPoints: pts, dlsXPointsTargetReached: reachedTarget }).catch(err => console.error(err));
  };

  const handleResetAllPoints = async () => {
    if (!window.confirm("🚨 ATENÇÃO: Deseja ZERAR os saldos para iniciar uma nova temporada?")) return;
    try {
      const promises = validUsers.filter(u => draftBranches[u.id]).map(u => updateDoc(getPublicDocPath('users', u.id), { dlsXPoints: 0, dlsXPointsTargetReached: false }));
      await Promise.all(promises);
      const resetDraft = {}; Object.keys(draftPoints).forEach(id => resetDraft[id] = 0);
      setDraftPoints(resetDraft);
      showToast("Saldos zerados com sucesso!", "success");
    } catch (error) { showToast("Erro ao zerar ranking.", "error"); }
  };

  // 🌟 FUNÇÕES DA IA VISION
  const handleSaveApiKey = () => {
    if (tempKey.trim() !== '') {
      try { localStorage.setItem('gemini_api_key', tempKey.trim()); } catch(e) {}
      setUserApiKey(tempKey.trim());
      setShowKeyInput(false);
      showToast("Chave da IA ativada!", "success");
    }
  };

  const processImageWithVisionAI = async (file) => {
    if (!userApiKey) {
       setShowKeyInput(true);
       showToast("Por favor, cole a sua chave do Gemini primeiro.", "error");
       return;
    }
    setIsExtractingImage(true);
    showToast("A IA Vision está lendo o print...", "info");

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onerror = () => { showToast("Falha ao ler o arquivo.", "error"); setIsExtractingImage(false); };
      
    reader.onload = async () => {
      try {
        const mimeType = file.type;
        const base64ImageData = reader.result.split(',')[1];
        
        const prompt = `Analise este print do ranking do jogo Dream League Soccer.
        Para cada time listado, extraia:
        1. O NOME DO TIME (apenas letras maiores, ignorar nome do técnico se houver).
        2. O SALDO (número grande).
        Remova os pontos do número (ex: 417.400 vira 417400).
        Retorne APENAS um array JSON puro. Exemplo: [{"team": "NOME", "points": 123456}]`;

        const payload = { contents: [{ role: "user", parts: [ { text: prompt }, { inlineData: { mimeType, data: base64ImageData } } ] }] };
        const safeKey = userApiKey.trim();
        const models = [
  "gemini-3.7-flash",
  "gemini-3.5-flash",
  "gemini-1.5-flash-002",
  "gemini-flash-latest"
];
        
        let resultJson = null;
        for (const modelName of models) {
           try {
             const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${safeKey}`, { 
               method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) 
             });
             if (response.ok) { resultJson = await response.json(); break; }
           } catch (err) {}
        }

        if (!resultJson || !resultJson.candidates) throw new Error("A IA falhou em gerar os dados. Tente outro print.");

        let textResponse = resultJson.candidates[0].content.parts[0].text.trim();
        textResponse = textResponse.replace(/```json/gi, '').replace(/```/g, '').trim();
        
        applyVisionDataToTable(JSON.parse(textResponse));
      } catch (err) {
        showToast("Erro na leitura inteligente.", "error");
        setIsExtractingImage(false); 
      }
    };
  };

  const applyVisionDataToTable = async (aiDataArray) => {
    if (!Array.isArray(aiDataArray)) { showToast("Erro no formato recebido.", "error"); setIsExtractingImage(false); return; }

    const newDraft = { ...draftPoints };
    const logs = [];
    const promises = [];

    aiDataArray.forEach(item => {
       const aiTeamName = String(item.team || '').toUpperCase().trim();
       const aiPoints = parseInt(item.points, 10);
       if (!aiTeamName || isNaN(aiPoints)) return;

       let bestMatchUser = null;
       validUsers.forEach(u => {
          const userTeam = (teams || []).find(t => t.ownerId === u.id);
          const mappedName = (userTeam ? userTeam.name : '').toUpperCase().replace('KAM', '').trim();
          if (mappedName && (aiTeamName.includes(mappedName) || mappedName.includes(aiTeamName))) {
             bestMatchUser = u;
          }
       });

       if (bestMatchUser) {
          const branch = draftBranches[bestMatchUser.id];
          // Atualiza apenas se o cara já estiver em alguma ilha
          if (branch) {
             newDraft[bestMatchUser.id] = aiPoints;
             logs.push({ raw: aiTeamName, points: aiPoints, mappedTo: bestMatchUser.name, success: true });
             
             // 🌟 SALVAMENTO AUTOMÁTICO IMEDIATO
             const reachedTarget = branch === 'tropical' ? aiPoints >= 200000 : true;
             promises.push(updateDoc(getPublicDocPath('users', bestMatchUser.id), { 
                 dlsXPoints: aiPoints, dlsXPointsTargetReached: reachedTarget 
             }));
          }
       } else {
          logs.push({ raw: aiTeamName, points: aiPoints, mappedTo: 'Time Não Localizado', success: false });
       }
    });

    setDraftPoints(newDraft);
    setAiReadLog(logs);
    
    if (promises.length > 0) {
       await Promise.all(promises);
       showToast(`Visão de IA Concluída! ${promises.length} times foram atualizados automaticamente.`, "success");
    } else {
       showToast("A IA leu, mas não encontrou nenhum time do clã no print.", "warning");
    }
    
    setIsExtractingImage(false);
  };

  const handleGlobalPaste = (e) => {
    if (isExtractingImage) return;
    const items = e.clipboardData?.items;
    if (!items) return;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        processImageWithVisionAI(items[i].getAsFile()); break; 
      }
    }
  };

  // 🌟 DESENHO DE CADA LINHA
  const renderUserRow = (u, branch, fullSortedList) => {
    const userTeam = (teams || []).find(t => t.ownerId === u.id);
    const teamName = userTeam ? userTeam.name : 'Sem Time';
    const realRank = fullSortedList.findIndex(x => x.id === u.id) + 1;
    let rankColor = 'text-blue-500';
    if (realRank === 1) rankColor = 'text-amber-400 text-lg drop-shadow-md';
    else if (realRank === 2) rankColor = 'text-slate-300 text-base';
    else if (realRank === 3) rankColor = 'text-amber-600 text-base';

    return (
      <div key={u.id} className={`p-3 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all ${branch === 'tropical' ? 'bg-emerald-950/20 border-emerald-500/30 hover:border-emerald-500/60' : 'bg-sky-950/20 border-sky-500/30 hover:border-sky-500/60'}`}>
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <span className={`font-black w-6 text-center shrink-0 ${rankColor}`}>{realRank}º</span>
          <ShieldDisplay shield={u.shield} size="small" />
          <div className="flex flex-col min-w-0">
            <span className="text-[11px] text-white font-bold truncate">
              {u.name} <span className="text-blue-500 font-normal hidden sm:inline mx-1">•</span> <span className="text-amber-400">{teamName}</span>
            </span>
            <div className="flex items-center gap-3 mt-1.5">
               <button onClick={() => toggleBranch(u.id, branch)} className="text-[9px] text-amber-500 hover:text-amber-400 flex items-center gap-1 font-bold transition-colors"><RefreshCw size={10} /> Mover p/ {branch === 'tropical' ? 'Céu' : 'Tropical'}</button>
               <button onClick={() => handleRemoveUser(u.id)} className="text-[9px] text-red-400 hover:text-red-300 flex items-center gap-1 transition-colors"><XCircle size={10}/> Remover</button>
            </div>
          </div>
        </div>
        <div className="w-full sm:w-32 shrink-0">
          <input type="number" value={draftPoints[u.id] !== undefined ? draftPoints[u.id] : ''} onChange={e => handlePointChange(u.id, branch, e.target.value)} placeholder="0" className="w-full sm:text-right p-2.5 rounded-lg font-black text-sm bg-blue-950 text-amber-400 border border-blue-700 outline-none focus:border-amber-400 focus:bg-blue-900 transition-colors" />
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6 animate-in fade-in pb-10 max-w-5xl mx-auto min-h-screen outline-none" onPaste={handleGlobalPaste} tabIndex={0}>
      
      <div className="flex justify-between items-center">
        <button onClick={onBack} className="flex items-center gap-1.5 text-xs text-blue-400 hover:text-white transition-colors"><ArrowLeft size={16}/> Voltar ao Início</button>
      </div>

      <div className="bg-blue-900 p-6 rounded-3xl border border-amber-500/30 shadow-xl flex flex-col md:flex-row items-center justify-between gap-4">
        <div>
          <h2 className="text-xl md:text-2xl font-black text-amber-400 uppercase tracking-widest flex items-center gap-2"><Zap size={24} /> Gestão de Ilhas (XPoints)</h2>
          <p className="text-blue-300 text-xs md:text-sm mt-1">O sistema <span className="font-bold text-white">salva automaticamente</span> manual ou via <span className="text-emerald-400 font-bold">Inteligência Artificial</span>!</p>
        </div>
        <div className="flex gap-2 w-full md:w-auto">
            <Button onClick={() => setShowKeyInput(!showKeyInput)} className="text-xs bg-blue-950 hover:bg-blue-800 text-blue-300 border border-blue-700 py-3 px-4 flex items-center justify-center gap-2 shadow-md"><Key size={16}/> Config IA</Button>
            <Button onClick={handleResetAllPoints} className="text-xs bg-red-900/40 hover:bg-red-600 text-red-400 hover:text-white border border-red-800 py-3 px-4 flex-1 md:flex-none justify-center shadow-md"><RotateCcw size={16}/> Zerar Temporada</Button>
        </div>
      </div>

      {showKeyInput && (
        <div className="bg-amber-500/10 border border-amber-500/30 p-4 rounded-xl animate-in slide-in-from-top-4">
          <h3 className="text-sm font-bold text-amber-400 mb-2 flex items-center gap-2"><Key size={16}/> Chave de Ativação Gemini</h3>
          <div className="flex gap-2">
            <input type="password" value={tempKey} onChange={e=>setTempKey(e.target.value)} placeholder="Cole aqui a sua API Key..." className="flex-1 bg-blue-950 border border-blue-700 rounded-lg p-2 text-white text-sm outline-none focus:border-amber-500" />
            <button onClick={handleSaveApiKey} className="bg-amber-600 hover:bg-amber-500 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-md">Salvar</button>
          </div>
        </div>
      )}

      {/* 🌟 PAINEL DA INTELIGÊNCIA ARTIFICIAL */}
      <div className="bg-blue-950/80 p-5 rounded-2xl border border-blue-700 shadow-inner flex flex-col md:flex-row gap-5">
         <div className="flex-1">
            <h3 className="text-sm font-bold text-sky-400 uppercase tracking-widest mb-3 flex items-center gap-2"><Bot size={18}/> Leitor Inteligente (Visão IA)</h3>
            <p className="text-[10px] text-emerald-400 font-bold bg-emerald-900/20 p-2 rounded-lg border border-emerald-500/30 mb-3">
              Dê um <span className="bg-blue-950 px-1.5 py-0.5 rounded text-white">Ctrl + V</span> do print aqui na tela ou faça o upload abaixo. A IA vai achar os membros do clã e atualizar o banco na hora!
            </p>
            <label className={`w-full ${isExtractingImage ? 'bg-amber-600 cursor-wait' : 'bg-emerald-600 hover:bg-emerald-500 cursor-pointer'} text-white font-black py-3 px-4 rounded-xl flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(16,185,129,0.3)] transition-all`}>
              {isExtractingImage ? <Loader2 size={18} className="animate-spin" /> : <UploadCloud size={18} />}
              {isExtractingImage ? 'Processando Imagem...' : '📸 ENVIAR PRINT DA TABELA'}
              <input type="file" accept="image/*" onChange={e => { if(e.target.files[0]) processImageWithVisionAI(e.target.files[0]); e.target.value=''; }} className="hidden" disabled={isExtractingImage} />
            </label>
         </div>

         {/* LOGS DA IA */}
         {aiReadLog.length > 0 && (
           <div className="flex-1 bg-blue-900/40 border border-blue-800 rounded-xl p-3 max-h-[150px] overflow-y-auto custom-scrollbar">
              <span className="text-[9px] font-bold text-blue-500 uppercase block mb-2 border-b border-blue-800 pb-1">Resultados da Última Leitura</span>
              <div className="flex flex-col gap-1.5">
                 {aiReadLog.map((log, idx) => (
                    <div key={idx} className={`p-2 rounded border flex justify-between items-center ${log.success ? 'bg-emerald-900/20 border-emerald-500/30' : 'bg-red-900/20 border-red-500/30'}`}>
                       <div><p className="text-[9px] text-blue-300">Leu: <span className="text-white font-bold">{log.raw}</span></p><p className={`text-[10px] font-bold ${log.success ? 'text-emerald-400' : 'text-red-400'}`}>{log.mappedTo}</p></div>
                       <span className="text-[10px] font-black text-amber-400">{log.points.toLocaleString('pt-BR')}</span>
                    </div>
                 ))}
              </div>
           </div>
         )}
      </div>

      <div className="bg-blue-950/80 border border-blue-800 p-3 rounded-2xl flex items-center gap-3 shadow-inner focus-within:border-emerald-500 transition-colors">
        <Search size={20} className="text-blue-500 shrink-0 ml-2" />
        <input type="text" placeholder="Pesquisar por nome do técnico ou nome do time..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full bg-transparent text-white outline-none placeholder-blue-500/70 text-sm py-1" />
        {searchTerm && <button onClick={() => setSearchTerm('')} className="text-blue-500 hover:text-red-400 shrink-0 mr-2 transition-colors"><XCircle size={18} /></button>}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
         
         {/* 🌴 ILHA TROPICAL */}
         <div className="bg-blue-950/40 border border-emerald-500/30 rounded-2xl p-5 shadow-lg flex flex-col h-full">
            <h3 className="text-sm font-black text-emerald-400 uppercase tracking-widest mb-4 flex justify-between items-center border-b border-emerald-500/30 pb-3">
               <span>🌴 Ilha Tropical</span><span className="text-[9px] bg-emerald-900/50 text-emerald-300 px-2 py-1 rounded">Meta: 200K</span>
            </h3>
            <div className="flex gap-2 mb-4 bg-emerald-950/20 p-2 rounded-xl border border-emerald-500/20">
               <select value={selectedTropical} onChange={e => setSelectedTropical(e.target.value)} className="flex-1 min-w-0 bg-blue-950 text-white text-xs p-2.5 rounded-lg border border-emerald-500/30 outline-none">
                  <option value="">Adicionar Membro...</option>
                  {unassignedUsers.map(u => <option key={u.id} value={u.id}>{u.name} - {(teams || []).find(t => t.ownerId === u.id)?.name || 'Sem Time'}</option>)}
               </select>
               <button onClick={handleAddTropical} className="bg-emerald-600 hover:bg-emerald-500 text-white p-2.5 rounded-lg transition-colors shrink-0"><PlusCircle size={18} /></button>
            </div>
            <div className="flex flex-col gap-3 flex-1 overflow-y-auto custom-scrollbar pr-1 max-h-[600px]">
               {displayTropical.length === 0 ? <p className="text-xs text-blue-500/50 text-center py-4">Nenhum membro encontrado.</p> : displayTropical.map(u => renderUserRow(u, 'tropical', tropicalAllSorted))}
            </div>
         </div>

         {/* ☁️ ILHA DO CÉU */}
         <div className="bg-blue-950/40 border border-sky-500/30 rounded-2xl p-5 shadow-lg flex flex-col h-full">
            <h3 className="text-sm font-black text-sky-400 uppercase tracking-widest mb-4 flex justify-between items-center border-b border-sky-500/30 pb-3">
               <span>☁️ Ilha do Céu</span><span className="text-[9px] bg-sky-900/50 text-sky-300 px-2 py-1 rounded">Sem Meta</span>
            </h3>
            <div className="flex gap-2 mb-4 bg-sky-950/20 p-2 rounded-xl border border-sky-500/20">
               <select value={selectedCeu} onChange={e => setSelectedCeu(e.target.value)} className="flex-1 min-w-0 bg-blue-950 text-white text-xs p-2.5 rounded-lg border border-sky-500/30 outline-none">
                  <option value="">Adicionar Membro...</option>
                  {unassignedUsers.map(u => <option key={u.id} value={u.id}>{u.name} - {(teams || []).find(t => t.ownerId === u.id)?.name || 'Sem Time'}</option>)}
               </select>
               <button onClick={handleAddCeu} className="bg-sky-600 hover:bg-sky-500 text-white p-2.5 rounded-lg transition-colors shrink-0"><PlusCircle size={18} /></button>
            </div>
            <div className="flex flex-col gap-3 flex-1 overflow-y-auto custom-scrollbar pr-1 max-h-[600px]">
               {displayCeu.length === 0 ? <p className="text-xs text-blue-500/50 text-center py-4">Nenhum membro encontrado.</p> : displayCeu.map(u => renderUserRow(u, 'ceu', ceuAllSorted))}
            </div>
         </div>

      </div>
    </div>
  );
};

export default XPointsManager;
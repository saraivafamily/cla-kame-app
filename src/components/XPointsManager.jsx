import React, { useState, useEffect } from 'react';
import { updateDoc } from 'firebase/firestore';
import { getPublicDocPath } from '../utils/firebase';
import { Save, Zap, ArrowLeft, Bot, UploadCloud, Loader2, CheckCircle, ListFilter, Image as ImageIcon, AlertTriangle, Trophy, RotateCcw, Key } from 'lucide-react';
import Button from './Button';
import ShieldDisplay from './ShieldDisplay';

const XPointsManager = ({ users, onBack, showToast }) => {
  const [draftPoints, setDraftPoints] = useState({});
  const [draftTeamNames, setDraftTeamNames] = useState({});
  const [isSaving, setIsSaving] = useState(false);
  const [isExtractingImage, setIsExtractingImage] = useState(false);
  const [aiReadLog, setAiReadLog] = useState([]);
  
  const [matchedIds, setMatchedIds] = useState([]);
  const [viewMode, setViewMode] = useState('all'); 

  // 🌟 GERENCIAMENTO DA CHAVE DA IA
  const [userApiKey, setUserApiKey] = useState(() => {
    try { return localStorage.getItem('gemini_api_key') || ''; }
    catch(e) { return ''; }
  });
  const [showKeyInput, setShowKeyInput] = useState(false);
  const [tempKey, setTempKey] = useState('');

  const validUsers = (users || []).filter(u => u.name && u.id !== 'u_master');
  
  const sortedUsers = [...validUsers].sort((a, b) => {
    const ptsA = Number(a.dlsXPoints) || 0;
    const ptsB = Number(b.dlsXPoints) || 0;
    if (ptsB !== ptsA) return ptsB - ptsA; 
    const tA = (a.dlsTeamName || '').toLowerCase();
    const tB = (b.dlsTeamName || '').toLowerCase();
    return tA.localeCompare(tB); 
  });

  useEffect(() => {
    const initialPoints = {};
    const initialTeams = {};
    validUsers.forEach(u => {
      initialPoints[u.id] = u.dlsXPoints || '';
      initialTeams[u.id] = u.dlsTeamName || ''; 
    });
    setDraftPoints(initialPoints);
    setDraftTeamNames(initialTeams);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [users]);

  const handleSaveApiKey = () => {
    if (tempKey.trim() !== '') {
      try { localStorage.setItem('gemini_api_key', tempKey.trim()); } catch(e) {}
      setUserApiKey(tempKey.trim());
      setShowKeyInput(false);
      showToast("Chave da IA ativada com sucesso!", "success");
    }
  };

  const handleSaveMapping = async () => {
    setIsSaving(true);
    try {
      const promises = validUsers.map(u => {
        const newTeamName = (draftTeamNames[u.id] || '').trim();
        const teamChanged = newTeamName !== (u.dlsTeamName || '');
        if (teamChanged) {
          return updateDoc(getPublicDocPath('users', u.id), { dlsTeamName: newTeamName });
        }
        return Promise.resolve();
      });
      await Promise.all(promises);
      showToast("Nomes dos Times mapeados e salvos com sucesso!", "success");
    } catch (error) {
      console.error("Erro:", error);
      showToast("Erro ao salvar mapeamento.", "error");
    }
    setIsSaving(false);
  };

  const handleSaveAIRegister = async () => {
    setIsSaving(true);
    try {
      const promises = matchedIds.map(id => {
        const pts = Number(draftPoints[id]);
        return updateDoc(getPublicDocPath('users', id), { dlsXPoints: pts });
      });
      await Promise.all(promises);
      
      showToast("Ranking atualizado com os novos saldos!", "success");
      setMatchedIds([]);
      setViewMode('all');
    } catch (error) {
      showToast("Erro ao salvar o registro da IA.", "error");
    }
    setIsSaving(false);
  };

  const handleResetAllPoints = async () => {
    if (!window.confirm("🚨 ATENÇÃO: Tem certeza que deseja ZERAR os XPoints de TODOS os times?")) return;
    setIsSaving(true);
    try {
      const promises = validUsers.map(u => updateDoc(getPublicDocPath('users', u.id), { dlsXPoints: 0 }));
      await Promise.all(promises);
      
      const resetDraft = {};
      validUsers.forEach(u => { resetDraft[u.id] = 0; });
      setDraftPoints(resetDraft);
      showToast("Ranking zerado com sucesso!", "success");
    } catch (error) {
      console.error("Erro ao zerar:", error);
    }
    setIsSaving(false);
  };

  // 🤖 CÉREBRO VISION
  const processImageWithVisionAI = async (file) => {
    if (!userApiKey) {
       setShowKeyInput(true);
       showToast("Por favor, cole a sua chave do Gemini primeiro.", "error");
       return;
    }

    setIsExtractingImage(true);
    showToast("A IA Vision está analisando a imagem...", "info");

    const reader = new FileReader();
    reader.readAsDataURL(file);
    
    reader.onerror = () => {
       showToast("Falha ao ler o arquivo de imagem no seu navegador.", "error");
       setIsExtractingImage(false);
    };
      
    reader.onload = async () => {
      try {
        const mimeType = file.type;
        const base64ImageData = reader.result.split(',')[1];
        
        const prompt = `Analise este print do ranking do jogo Dream League Soccer.
        Para cada time listado, extraia estritamente:
        1. O NOME DO TIME (letras menores, ignorar o nome do técnico).
        2. O SALDO (número grande na mesma linha, geralmente perto da letra C).
        
        Remova os pontos do número (ex: 417.400 vira 417400).
        Retorne APENAS um array JSON puro e válido. Exemplo de retorno:
        [
          {"team": "NOME DO TIME", "points": 123456}
        ]`;

        const payload = {
          contents: [{ role: "user", parts: [ { text: prompt }, { inlineData: { mimeType: mimeType, data: base64ImageData } } ] }]
        };

        const safeKey = userApiKey.trim();
        
        // 🌟 LISTA DE MODELOS ATUALIZADA (Igual ao seu SubmitMatch)
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
                break; 
             } else {
                const errData = await response.json().catch(() => null);
                const errorMsg = errData?.error?.message || `Erro ${response.status}`;
                lastErrorMsg = errorMsg;
                
                if (response.status === 403 || (response.status === 400 && errorMsg.includes("API key not valid"))) {
                  try { localStorage.removeItem('gemini_api_key'); } catch(e) {}
                  setUserApiKey(''); setShowKeyInput(true);
                  throw new Error("Sua chave do Gemini é inválida ou expirou. Cole uma nova.");
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
        
        const extractedData = JSON.parse(textResponse);
        applyVisionDataToTable(extractedData);

      } catch (err) {
        console.error("ERRO DA IA VISION:", err);
        alert(`Ocorreu um erro na IA:\n\n${err.message}`);
        showToast("Erro na IA. Verifique o alerta que apareceu na tela.", "error");
        setIsExtractingImage(false); 
      }
    };
  };

  const applyVisionDataToTable = (aiDataArray) => {
    const newDraft = { ...draftPoints };
    const newlyMatchedIds = [];
    const logs = [];

    if (!Array.isArray(aiDataArray)) {
        showToast("A IA não retornou os dados no formato esperado.", "error");
        setIsExtractingImage(false);
        return;
    }

    aiDataArray.forEach(item => {
       const aiTeamName = String(item.team || '').toUpperCase().trim();
       const aiPoints = parseInt(item.points, 10);

       if (!aiTeamName || isNaN(aiPoints)) return;

       let bestMatchUser = null;
       validUsers.forEach(u => {
          const mappedName = (draftTeamNames[u.id] || u.dlsTeamName || '').trim().toUpperCase();
          if (!mappedName) return;
          
          if (aiTeamName.includes(mappedName) || mappedName.includes(aiTeamName)) {
             bestMatchUser = u;
          }
       });

       if (bestMatchUser && !newlyMatchedIds.includes(bestMatchUser.id)) {
          newDraft[bestMatchUser.id] = aiPoints;
          newlyMatchedIds.push(bestMatchUser.id);
          logs.push({ raw: aiTeamName, points: aiPoints, mappedTo: bestMatchUser.name, success: true });
       } else {
          logs.push({ raw: aiTeamName, points: aiPoints, mappedTo: 'Time Não Mapeado', success: false });
       }
    });

    setDraftPoints(newDraft);
    setAiReadLog(logs);
    
    if (newlyMatchedIds.length > 0) {
       setMatchedIds(newlyMatchedIds);
       setViewMode('matched');
       showToast(`Visão de IA Concluída! ${newlyMatchedIds.length} saldos extraídos perfeitamente. Salve o registro.`, "success");
    } else {
       setViewMode('all'); 
       showToast("A IA leu a imagem, mas os times encontrados não estão mapeados na sua tabela.", "warning");
    }
    
    setIsExtractingImage(false);
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) processImageWithVisionAI(file);
    e.target.value = '';
  };

  const handleGlobalPaste = (e) => {
    if (isExtractingImage) return;
    const items = e.clipboardData?.items;
    if (!items) return;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const file = items[i].getAsFile();
        processImageWithVisionAI(file);
        break; 
      }
    }
  };

  const usersToDisplay = viewMode === 'matched' ? sortedUsers.filter(u => matchedIds.includes(u.id)) : sortedUsers;
  const mappedCount = validUsers.filter(u => (draftTeamNames[u.id] || u.dlsTeamName || '').trim().length > 0).length;

  return (
    <div className="space-y-6 animate-in fade-in pb-10 max-w-5xl mx-auto min-h-screen outline-none" onPaste={handleGlobalPaste} tabIndex={0}>
      <div className="flex justify-between items-center">
        <button onClick={onBack} className="flex items-center gap-1.5 text-xs text-blue-400 hover:text-white transition-colors">
          <ArrowLeft size={16}/> Voltar ao Início
        </button>
        <button onClick={() => setShowKeyInput(!showKeyInput)} className="text-xs flex items-center gap-1 bg-blue-800 hover:bg-blue-700 text-blue-300 px-3 py-1.5 rounded-lg border border-blue-700 transition-colors">
          <Key size={14}/> IA Config
        </button>
      </div>

      {showKeyInput && (
        <div className="bg-amber-500/10 border border-amber-500/30 p-4 rounded-xl animate-in slide-in-from-top-4">
          <h3 className="text-sm font-bold text-amber-400 mb-2 flex items-center gap-2"><Key size={16}/> Chave de Ativação do Gemini</h3>
          <p className="text-xs text-blue-400 mb-3">Para usar a leitura inteligente de Prints, cole a sua chave do <b>Google AI Studio</b>.</p>
          <div className="flex gap-2">
            <input type="password" value={tempKey} onChange={e=>setTempKey(e.target.value)} placeholder="Ex: AIzaSy... ou AQ..." className="flex-1 bg-blue-950 border border-blue-700 rounded-lg p-2 text-white text-sm outline-none focus:border-amber-500" />
            <button onClick={handleSaveApiKey} className="bg-amber-600 hover:bg-amber-500 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-lg shadow-amber-900/50">Salvar</button>
          </div>
        </div>
      )}

      <div className="bg-blue-900 p-6 rounded-3xl border border-amber-500/30 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 relative overflow-hidden">
        <div className="absolute -right-10 -top-10 opacity-10 pointer-events-none">
           <ImageIcon size={150} />
        </div>
        <div className="relative z-10">
          <h2 className="text-2xl font-black text-amber-400 uppercase tracking-widest flex items-center gap-2">
            <Zap size={24} /> Ranking XPoints (Vision AI)
          </h2>
          <p className="text-blue-300 text-sm mt-1">Dê <span className="font-bold text-white bg-blue-950 px-2 py-0.5 rounded">Ctrl + V</span> com o Print do Jogo na tela para a IA trabalhar!</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* 🤖 PAINEL DE UPLOAD E STATUS DA IA */}
        <div className="col-span-1">
          <div className="bg-blue-950/80 p-5 rounded-2xl border border-blue-700 shadow-inner sticky top-4">
            <h3 className="text-sm font-bold text-sky-400 uppercase tracking-widest mb-3 flex items-center gap-2">
              <Bot size={18}/> Leitor Inteligente
            </h3>
            
            <p className="text-[10px] text-emerald-400 font-bold bg-emerald-900/20 p-2 rounded-lg border border-emerald-500/30 leading-relaxed mb-4">
              A IA Vision ignora gráficos e foca na extração perfeita de Nomes e Saldos!
            </p>

            <div className="mb-4">
              <label className={`w-full ${isExtractingImage ? 'bg-amber-600 cursor-wait' : 'bg-emerald-600 hover:bg-emerald-500 cursor-pointer'} text-white font-black py-4 px-4 rounded-xl flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(16,185,129,0.4)] transition-all transform hover:scale-105`}>
                {isExtractingImage ? <Loader2 size={20} className="animate-spin" /> : <UploadCloud size={20} />}
                {isExtractingImage ? 'Processando Imagem...' : '📸 ENVIAR IMAGEM'}
                <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" disabled={isExtractingImage} />
              </label>
            </div>

            {/* LOG DA IA */}
            <div className="bg-blue-900/40 border border-blue-800 rounded-xl p-3 h-[250px] overflow-y-auto custom-scrollbar">
               <span className="text-[9px] font-bold text-blue-500 uppercase block mb-2 border-b border-blue-800 pb-1">Resultados da IA Vision</span>
               {aiReadLog.length === 0 ? (
                  <p className="text-xs text-blue-400/50 italic text-center mt-8">Nenhum print recente.</p>
               ) : (
                  <div className="flex flex-col gap-2">
                     {aiReadLog.map((log, idx) => (
                        <div key={idx} className={`p-2 rounded border ${log.success ? 'bg-emerald-900/20 border-emerald-500/30' : 'bg-red-900/20 border-red-500/30'}`}>
                           <p className="text-[9px] text-blue-300 truncate" title={log.raw}>Leu o time: <span className="text-white font-bold">{log.raw}</span></p>
                           <div className="flex justify-between items-center mt-1">
                              <span className={`text-[10px] font-bold truncate pr-2 ${log.success ? 'text-emerald-400' : 'text-red-400'}`}>Membro: {log.mappedTo}</span>
                              <span className="text-[10px] font-black text-amber-400">{log.points.toLocaleString('pt-BR')}</span>
                           </div>
                        </div>
                     ))}
                  </div>
               )}
            </div>
          </div>
        </div>

        {/* 📝 TABELA DE RANKING LIMPA */}
        <div className="col-span-1 lg:col-span-2">
          <div className="bg-blue-950/50 rounded-2xl p-5 border border-blue-800 shadow-sm">
            
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-4 border-b border-blue-800 pb-4">
              <div>
                 <h3 className="text-sm font-bold text-white uppercase tracking-widest flex items-center gap-2">
                   <Trophy size={18} className="text-amber-400"/> Tabela do Ranking
                 </h3>
                 {viewMode === 'matched' ? (
                    <p className="text-[10px] text-emerald-400 font-bold mt-1 bg-emerald-900/20 px-2 py-0.5 rounded inline-block">✅ Dados processados pela IA.</p>
                 ) : (
                    <p className="text-[10px] text-blue-400 mt-1">Classificação Oficial dos Times</p>
                 )}
              </div>
              
              <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                 {viewMode === 'all' ? (
                   <>
                     <Button onClick={handleResetAllPoints} disabled={isSaving || isExtractingImage} className="text-[10px] bg-red-900/40 hover:bg-red-600 text-red-400 hover:text-white border border-red-800 font-bold py-2 px-3 flex items-center justify-center gap-1.5 shadow-md w-full">
                        <RotateCcw size={14}/> Zerar Temporada
                     </Button>
                     <Button onClick={handleSaveMapping} disabled={isSaving || isExtractingImage} className="text-[10px] bg-blue-600 hover:bg-blue-500 text-white font-bold py-2 px-3 flex items-center justify-center gap-1.5 shadow-md w-full">
                        <Save size={14}/> Salvar Nomes DLS
                     </Button>
                   </>
                 ) : (
                   <>
                     <Button onClick={() => setViewMode('all')} className="text-[10px] bg-red-600/50 hover:bg-red-500 text-white font-bold py-2 px-3 flex items-center justify-center gap-1.5 shadow-md w-full">
                        Cancelar
                     </Button>
                     <Button onClick={handleSaveAIRegister} disabled={isSaving} className="text-[10px] bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2 px-3 flex items-center justify-center gap-1.5 shadow-md w-full shadow-[0_0_15px_rgba(16,185,129,0.4)]">
                        <Save size={14}/> Salvar Registro da IA
                     </Button>
                   </>
                 )}
              </div>
            </div>
            
            {viewMode === 'all' && mappedCount === 0 && (
               <div className="bg-red-900/20 p-3 rounded-xl border border-red-500/30 mb-4 flex items-start gap-2 shadow-inner">
                  <AlertTriangle size={16} className="text-red-500 shrink-0 mt-0.5" />
                  <p className="text-[10px] text-red-200">
                    Preencha os nomes dos times abaixo e salve para a IA começar a trabalhar!
                  </p>
               </div>
            )}

            <div className="flex flex-col gap-2 max-h-[600px] overflow-y-auto custom-scrollbar pr-2">
              <div className="hidden md:flex items-center gap-3 px-3 pb-2 border-b border-blue-800/50 text-[10px] font-bold text-blue-400 uppercase tracking-widest">
                 <div className="flex-1">Posição & Time (DLS)</div>
                 <div className="w-32 text-right">Saldo XPoints</div>
              </div>

              {usersToDisplay.map((u, index) => {
                const draftVal = Number(draftPoints[u.id]) || 0;
                const isMatched = viewMode === 'matched' && matchedIds.includes(u.id);
                
                const realRank = sortedUsers.findIndex(user => user.id === u.id) + 1;
                let rankColor = 'text-blue-500';
                if (realRank === 1) rankColor = 'text-amber-400 text-lg drop-shadow-md';
                else if (realRank === 2) rankColor = 'text-slate-300 text-base';
                else if (realRank === 3) rankColor = 'text-amber-700 text-base';

                return (
                  <div key={u.id} className={`p-3 rounded-xl border flex items-center justify-between gap-3 transition-all ${isMatched ? 'bg-emerald-900/20 border-emerald-500/60 shadow-sm' : 'bg-blue-900/40 border-blue-800'}`}>
                    
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <span className={`font-black w-6 text-center shrink-0 ${rankColor}`}>{realRank}º</span>
                      <ShieldDisplay shield={u.shield} size="small" />
                      
                      {viewMode === 'all' ? (
                        <div className="flex flex-col min-w-0 w-full">
                          <span className="text-[9px] text-blue-400 uppercase font-bold mb-1">Dono(a): {u.name}</span>
                          <input 
                            type="text"
                            value={draftTeamNames[u.id] !== undefined ? draftTeamNames[u.id] : ''}
                            onChange={e => setDraftTeamNames(prev => ({ ...prev, [u.id]: e.target.value.toUpperCase() }))}
                            placeholder="Nome do Time (DLS)"
                            className="w-full bg-blue-950/80 border border-blue-700/50 rounded-lg p-2 text-xs font-black outline-none transition-colors uppercase text-amber-400 focus:border-amber-500"
                          />
                        </div>
                      ) : (
                        <div className="flex flex-col min-w-0">
                          <span className={`text-sm font-black uppercase truncate ${isMatched ? 'text-emerald-400' : 'text-white'}`}>
                            {draftTeamNames[u.id] || u.dlsTeamName || 'TIME NÃO MAPEADO'}
                          </span>
                          {isMatched && <span className="text-[9px] text-emerald-500 font-bold flex items-center gap-1 mt-0.5"><CheckCircle size={10}/> Saldo Capturado</span>}
                        </div>
                      )}
                    </div>

                    <div className="shrink-0 w-28 md:w-32">
                      <div className={`w-full text-right p-2 rounded-lg font-black text-sm md:text-base transition-colors ${isMatched ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.3)]' : 'bg-blue-950 text-emerald-400/80 border border-blue-700'}`}>
                         {draftVal.toLocaleString('pt-BR')}
                      </div>
                    </div>

                  </div>
                );
              })}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default XPointsManager;
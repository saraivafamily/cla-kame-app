import React, { useState, useEffect } from 'react';
import { Crown, Swords, Clock, Upload, Shield, CheckCircle, XCircle, AlertCircle, Camera, Users, Target, Eye, X } from 'lucide-react';
import { getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { getPublicDocPath } from '../utils/firebase';
import ShieldDisplay from './ShieldDisplay';
import Button from './Button';
import { processImage } from '../utils/helpers';

const SupremeArena = ({ currentUser, users, teams, showToast }) => {
  const [supremeData, setSupremeData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [proofImage, setProofImage] = useState('');
  
  // 🌟 Controle de Abas (Arena vs Gestão)
  const [activeTab, setActiveTab] = useState('arena');
  
  // Modal de validação do Admin
  const [selectedChallenge, setSelectedChallenge] = useState(null);

  // Coroação Manual
  const [manualHolderId, setManualHolderId] = useState('');

  const isAdmin = currentUser?.role === 'leader' || currentUser?.role === 'kaioh';

  // Placar da MD3
  const [bo3, setBo3] = useState({
     m1A: '', m1B: '', m2A: '', m2B: '', m3A: '', m3B: '', penA: '', penB: ''
  });

  useEffect(() => {
    const fetchSupreme = async () => {
      try {
        const docRef = getPublicDocPath('globals', 'supreme');
        const snap = await getDoc(docRef);
        if (snap.exists()) {
          setSupremeData(snap.data());
        } else {
          const initialData = {
            holderId: null,
            status: 'idle', // idle, pending_holder, bo3
            cooldownUntil: 0,
            loserCooldowns: {},
            challenge: null,
            challengeQueue: [] // 🌟 NOVA FILA DE DESAFIOS
          };
          await setDoc(docRef, initialData);
          setSupremeData(initialData);
        }
      } catch (error) {
        console.error("Erro ao buscar dados do Player Superior:", error);
      }
      setLoading(false);
    };
    fetchSupreme();
  }, []);

  const getTeam = (userId) => (teams || []).find(t => t.ownerId === userId);
  const getUser = (userId) => (users || []).find(u => u.id === userId);

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    showToast("Processando imagem...", "info");
    processImage(file, (base64) => {
      setProofImage(base64);
      showToast("Print anexado com sucesso!", "success");
    });
  };

  // 🌟 ENTRAR NA FILA DE DESAFIOS
  const handleChallenge = async () => {
    if (!proofImage) return showToast("Anexe o print comprovando que você já venceu a Live 1!", "error");
    if (!window.confirm("Entrar na fila oficial pelo Cinturão?")) return;

    setIsProcessing(true);
    try {
      const newChallenge = {
        id: `chal_${Date.now()}`,
        challengerId: currentUser.id,
        proofUrl: proofImage,
        timestamp: Date.now()
      };

      const newData = {
        ...supremeData,
        challengeQueue: [...(supremeData.challengeQueue || []), newChallenge]
      };

      await updateDoc(getPublicDocPath('globals', 'supreme'), newData);
      setSupremeData(newData);
      setProofImage('');
      showToast("Você entrou na Fila de Desafios! Aguarde a liderança.", "success");
    } catch (e) {
      showToast("Erro ao enviar desafio.", "error");
    }
    setIsProcessing(false);
  };

  // 🌟 COROAR MANUALMENTE (SÓ ADMIN)
  const handleManualCoronation = async () => {
    if (!manualHolderId) return showToast("Selecione um jogador primeiro.", "error");
    if (!window.confirm("Tem certeza que deseja coroar este jogador como Player Superior manualmente? Isso apagará os combates em andamento.")) return;

    setIsProcessing(true);
    try {
      const oldHolderId = supremeData.holderId;
      
      const newData = {
        ...supremeData,
        holderId: manualHolderId,
        status: 'idle',
        challenge: null,
        cooldownUntil: Date.now() + (15 * 24 * 60 * 60 * 1000)
      };

      // Tira a patente do antigo e dá pro novo
      if (oldHolderId) await updateDoc(getPublicDocPath('users', oldHolderId), { isSupreme: false });
      await updateDoc(getPublicDocPath('users', manualHolderId), { isSupreme: true });

      await updateDoc(getPublicDocPath('globals', 'supreme'), newData);
      setSupremeData(newData);
      setManualHolderId('');
      showToast("Novo Player Superior coroado com sucesso!", "success");
    } catch (e) {
      showToast("Erro ao coroar.", "error");
    }
    setIsProcessing(false);
  };

  // 🌟 VALIDAR PRINT DA FILA (ADMIN)
  const handleAdminValidate = async (isApproved) => {
    if (!selectedChallenge) return;
    setIsProcessing(true);
    try {
      const remainingQueue = (supremeData.challengeQueue || []).filter(c => c.id !== selectedChallenge.id);

      if (isApproved) {
        // Dispara o combate
        const expiresAt = Date.now() + (3 * 24 * 60 * 60 * 1000); 
        const newData = {
          ...supremeData,
          status: 'pending_holder',
          challenge: { ...selectedChallenge, expiresAt },
          challengeQueue: remainingQueue
        };
        await updateDoc(getPublicDocPath('globals', 'supreme'), newData);
        setSupremeData(newData);
        showToast("Desafio Aprovado! O Campeão tem 3 dias para aceitar.", "success");
      } else {
        // Apenas remove da fila
        const newData = { ...supremeData, challengeQueue: remainingQueue };
        await updateDoc(getPublicDocPath('globals', 'supreme'), newData);
        setSupremeData(newData);
        showToast("Desafio rejeitado e removido da fila.", "info");
      }
      setSelectedChallenge(null);
    } catch (e) {
      showToast("Erro na validação.", "error");
    }
    setIsProcessing(false);
  };

  const handleHolderAccept = async () => {
    setIsProcessing(true);
    try {
      const newData = { ...supremeData, status: 'bo3' };
      await updateDoc(getPublicDocPath('globals', 'supreme'), newData);
      setSupremeData(newData);
      showToast("Desafio Aceito! A Melhor de 3 começou.", "success");
    } catch (e) {
      showToast("Erro ao aceitar.", "error");
    }
    setIsProcessing(false);
  };

  const handleWO = async () => {
    if (!window.confirm("O prazo de 3 dias expirou. Declarar W.O. e transferir o cinturão?")) return;
    setIsProcessing(true);
    try {
       const newHolderId = supremeData.challenge.challengerId;
       const oldHolderId = supremeData.holderId;
       
       const newData = {
         ...supremeData,
         holderId: newHolderId,
         status: 'idle',
         cooldownUntil: Date.now() + (15 * 24 * 60 * 60 * 1000),
         loserCooldowns: {
           ...supremeData.loserCooldowns,
           [oldHolderId]: Date.now() + (30 * 24 * 60 * 60 * 1000)
         },
         challenge: null
       };

       if (oldHolderId) await updateDoc(getPublicDocPath('users', oldHolderId), { isSupreme: false });
       await updateDoc(getPublicDocPath('users', newHolderId), { isSupreme: true });

       await updateDoc(getPublicDocPath('globals', 'supreme'), newData);
       setSupremeData(newData);
       showToast("W.O. Aplicado! Temos um NOVO PLAYER SUPERIOR!", "success");
    } catch (e) {
      showToast("Erro ao aplicar W.O.", "error");
    }
    setIsProcessing(false);
  };

  const submitBO3 = async () => {
     const p1 = supremeData.holderId; 
     const p2 = supremeData.challenge.challengerId;

     let v1 = 0, v2 = 0;
     let sg1 = 0, sg2 = 0;

     if (bo3.m1A !== '' && bo3.m1B !== '') {
        const a = Number(bo3.m1A), b = Number(bo3.m1B);
        if (a > b) v1++; else if (b > a) v2++;
        sg1 += (a - b); sg2 += (b - a);
     }
     
     if (bo3.m2A !== '' && bo3.m2B !== '') {
        const a = Number(bo3.m2A), b = Number(bo3.m2B);
        if (a > b) v1++; else if (b > a) v2++;
        sg1 += (a - b); sg2 += (b - a);
     }

     let winnerId = null;
     let loserId = null;

     if (v1 === 2 || (v1 === 1 && v2 === 0 && sg1 > sg2 && bo3.m2A !== '')) winnerId = p1;
     else if (v2 === 2 || (v2 === 1 && v1 === 0 && sg2 > sg1 && bo3.m2A !== '')) winnerId = p2;
     else if (bo3.m1A !== '' && bo3.m2A !== '') {
         if (sg1 === sg2) {
             if (bo3.m3A !== '' && bo3.m3B !== '') {
                 const a = Number(bo3.m3A), b = Number(bo3.m3B);
                 if (a > b) winnerId = p1;
                 else if (b > a) winnerId = p2;
                 else {
                     if (bo3.penA !== '' && bo3.penB !== '') {
                         if (Number(bo3.penA) > Number(bo3.penB)) winnerId = p1;
                         else winnerId = p2;
                     } else return showToast("Jogo 3 empatado! Digite o placar dos Pênaltis.", "error");
                 }
             } else return showToast("Empate agregado! É necessário preencher o Jogo 3.", "info");
         } else {
             winnerId = sg1 > sg2 ? p1 : p2;
         }
     } else return showToast("Preencha os placares para finalizar.", "error");

     if (!winnerId) return;
     loserId = winnerId === p1 ? p2 : p1;

     if (!window.confirm(`Finalizar MD3 e declarar ${getUser(winnerId)?.name} como Campeão?`)) return;

     setIsProcessing(true);
     try {
       const newData = {
         ...supremeData,
         holderId: winnerId,
         status: 'idle',
         cooldownUntil: Date.now() + (15 * 24 * 60 * 60 * 1000),
         loserCooldowns: {
           ...supremeData.loserCooldowns,
           [loserId]: Date.now() + (30 * 24 * 60 * 60 * 1000)
         },
         challenge: null
       };

       await updateDoc(getPublicDocPath('users', p1), { isSupreme: false });
       await updateDoc(getPublicDocPath('users', p2), { isSupreme: false });
       await updateDoc(getPublicDocPath('users', winnerId), { isSupreme: true });

       await updateDoc(getPublicDocPath('globals', 'supreme'), newData);
       setSupremeData(newData);
       setBo3({ m1A: '', m1B: '', m2A: '', m2B: '', m3A: '', m3B: '', penA: '', penB: '' });
       showToast("MD3 Finalizada! A coroa encontrou seu dono.", "success");
     } catch (e) {
       showToast("Erro ao finalizar MD3.", "error");
     }
     setIsProcessing(false);
  };

  if (loading) return <div className="text-center p-10 text-amber-400 font-bold animate-pulse">Carregando Arena do Cinturão...</div>;

  const holderTeam = getTeam(supremeData.holderId);
  const holderUser = getUser(supremeData.holderId);
  const isHolder = currentUser.id === supremeData.holderId;

  const challengerTeam = supremeData.challenge ? getTeam(supremeData.challenge.challengerId) : null;
  const isChallenger = supremeData.challenge?.challengerId === currentUser.id;
  
  const myLoserCooldown = supremeData.loserCooldowns?.[currentUser.id] || 0;
  
  // Verifica se o usuário já está na fila ou se já é o desafiante ativo
  const isAlreadyInQueue = (supremeData.challengeQueue || []).some(c => c.challengerId === currentUser.id);
  const canChallenge = !isHolder && !isAlreadyInQueue && !isChallenger && Date.now() > myLoserCooldown;

  const isWO_Active = supremeData.status === 'pending_holder' && Date.now() > (supremeData.challenge.expiresAt || 0);
  const isArenaBusy = supremeData.status !== 'idle';

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in pb-12">
      
      {/* 🌟 ABAS DE NAVEGAÇÃO (SÓ ADMIN) */}
      {isAdmin && (
        <div className="flex gap-2 p-1.5 bg-blue-950 rounded-xl border border-blue-800">
          <button onClick={() => setActiveTab('arena')} className={`flex-1 py-2 text-sm rounded-lg font-bold transition-all ${activeTab === 'arena' ? 'bg-amber-600 text-white shadow-md' : 'text-blue-500 hover:text-white'}`}>
            ⚔️ Arena do Cinturão
          </button>
          <button onClick={() => setActiveTab('gestao')} className={`flex-1 py-2 text-sm rounded-lg font-bold transition-all ${activeTab === 'gestao' ? 'bg-indigo-600 text-white shadow-md' : 'text-blue-500 hover:text-white flex items-center justify-center gap-2'}`}>
            📋 Gestão Liderança 
            {(supremeData.challengeQueue || []).length > 0 && (
                <span className="bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full">{(supremeData.challengeQueue || []).length}</span>
            )}
          </button>
        </div>
      )}

      {/* =========================================
          ABA 1: ARENA DO CINTURÃO (PÚBLICA)
          ========================================= */}
      {activeTab === 'arena' && (
        <>
          {/* O TRONO */}
          <div className="bg-gradient-to-b from-amber-900 to-blue-950 p-8 rounded-3xl border-2 border-amber-500 shadow-[0_0_40px_rgba(245,158,11,0.3)] text-center relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
            <Crown size={64} className="text-amber-400 mx-auto mb-4 drop-shadow-[0_0_15px_rgba(245,158,11,1)] animate-bounce" />
            <h2 className="text-3xl font-black text-white uppercase tracking-widest relative z-10">Trono do Player Superior</h2>
            <p className="text-amber-300 text-sm font-bold tracking-widest uppercase mb-8 relative z-10">A Cadeira Mais Cobiçada do Clã</p>

            {supremeData.holderId ? (
                <div className="flex flex-col items-center relative z-10">
                    <ShieldDisplay shield={holderTeam?.shield} frame="frame_ouro" size="xl" className="mb-4" />
                    <h3 className="text-4xl font-black text-amber-400 drop-shadow-lg uppercase">{holderUser?.name}</h3>
                    <p className="text-emerald-400 font-bold uppercase tracking-widest mt-2">{holderTeam?.name}</p>
                    {supremeData.cooldownUntil > Date.now() && (
                        <div className="mt-4 bg-amber-900/50 border border-amber-500/50 px-4 py-2 rounded-xl inline-block">
                            <p className="text-[10px] text-amber-300 font-bold uppercase flex items-center gap-2">
                              <Shield size={14}/> Proteção de Campeão (Período de Paz)
                            </p>
                        </div>
                    )}
                </div>
            ) : (
                <div className="py-10 relative z-10">
                    <h3 className="text-2xl font-black text-blue-300 uppercase opacity-50">Trono Vazio</h3>
                    <p className="text-sm text-blue-400 mt-2">A liderança precisa coroar o primeiro campeão ou aprovar um desafio.</p>
                </div>
            )}
          </div>

          {/* ÁREA DE DESAFIO / FILA */}
          <div className="bg-blue-900 border border-blue-700 rounded-2xl p-6 shadow-xl text-center">
              <Swords size={40} className="text-red-400 mx-auto mb-3" />
              <h3 className="text-xl font-black text-white uppercase mb-2">Fila de Desafiantes</h3>
              
              {/* Box de Envio */}
              {!isHolder && !isChallenger && (
                  <div className="max-w-md mx-auto mt-4 mb-6">
                      {isAlreadyInQueue ? (
                          <div className="bg-indigo-900/50 p-4 rounded-xl border border-indigo-500/50 text-indigo-300 font-bold text-sm flex items-center justify-center gap-2">
                              <Clock size={16}/> Seu desafio está na fila de avaliação!
                          </div>
                      ) : Date.now() < myLoserCooldown ? (
                          <div className="bg-blue-950 p-4 rounded-xl border border-red-800 text-red-400 font-bold text-sm">
                              Você perdeu recentemente. Aguarde 30 dias na geladeira!
                          </div>
                      ) : (
                          <>
                              <label className="flex flex-col items-center justify-center bg-blue-950 border-2 border-dashed border-blue-700 rounded-xl p-6 cursor-pointer hover:border-emerald-500 hover:bg-blue-900/50 transition-colors mb-3">
                                  <Camera size={32} className={proofImage ? 'text-emerald-500 mb-2' : 'text-blue-500 mb-2'} />
                                  <span className="text-xs font-bold text-blue-300">{proofImage ? 'Print Anexado! ✅' : 'Clique para enviar Print da Live 1'}</span>
                                  <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                              </label>
                              <Button onClick={handleChallenge} disabled={!proofImage || isProcessing} className="w-full bg-red-600 hover:bg-red-500 text-white font-black py-3 uppercase tracking-widest shadow-lg">
                                  Entrar na Fila de Desafios
                              </Button>
                          </>
                      )}
                  </div>
              )}

              {/* Lista Visual da Fila Pública */}
              <div className="bg-blue-950 rounded-xl p-4 border border-blue-800">
                  <p className="text-[10px] text-blue-400 font-bold uppercase mb-3 tracking-widest">Jogadores na Fila de Espera</p>
                  {(supremeData.challengeQueue || []).length === 0 ? (
                      <p className="text-xs text-blue-500 italic">A fila está vazia.</p>
                  ) : (
                      <div className="flex gap-3 overflow-x-auto custom-scrollbar pb-2">
                          {(supremeData.challengeQueue || []).map((c, i) => {
                              const qUser = getUser(c.challengerId);
                              const qTeam = getTeam(c.challengerId);
                              return (
                                  <div key={c.id} className="min-w-[120px] bg-blue-900 border border-blue-700 p-3 rounded-lg flex flex-col items-center shadow-sm">
                                      <span className="text-[10px] bg-indigo-500/20 text-indigo-300 px-2 rounded-full mb-2">#{i + 1}</span>
                                      <ShieldDisplay shield={qTeam?.shield} size="small" />
                                      <span className="text-[10px] font-bold text-white mt-2 truncate w-full text-center">{qUser?.name}</span>
                                  </div>
                              );
                          })}
                      </div>
                  )}
              </div>
          </div>

          {/* ÁREA PENDENTE ACEITE DO CAMPEÃO (Ou W.O.) */}
          {supremeData.status === 'pending_holder' && (
              <div className={`bg-blue-900 border-2 rounded-2xl p-6 shadow-xl text-center ${isWO_Active ? 'border-red-500' : 'border-amber-500'}`}>
                  <AlertCircle size={48} className={`mx-auto mb-4 ${isWO_Active ? 'text-red-500 animate-bounce' : 'text-amber-400 animate-pulse'}`} />
                  <h3 className="text-2xl font-black text-white uppercase mb-2">Combate Iminente!</h3>
                  
                  <div className="flex items-center justify-center gap-4 my-6">
                      <div className="text-center"><ShieldDisplay shield={holderTeam?.shield} size="normal" /><p className="text-[10px] text-amber-400 font-bold mt-2">CAMPEÃO</p></div>
                      <span className="text-xl font-black text-blue-500">VS</span>
                      <div className="text-center"><ShieldDisplay shield={challengerTeam?.shield} size="normal" /><p className="text-[10px] text-red-400 font-bold mt-2">DESAFIANTE</p></div>
                  </div>

                  {isWO_Active ? (
                      <div className="bg-red-900/30 p-4 rounded-xl border border-red-500/50">
                          <p className="text-red-400 font-black uppercase mb-2">Prazo Esgotado!</p>
                          <p className="text-sm text-red-200 mb-4">O Campeão não respondeu em 3 dias.</p>
                          {(isAdmin || isChallenger) && (
                             <Button onClick={handleWO} className="bg-red-600 hover:bg-red-500 w-full font-black uppercase tracking-widest">Declarar W.O. ao Desafiante</Button>
                          )}
                      </div>
                  ) : (
                      <>
                          <p className="text-sm text-blue-300 mb-6">O campeão tem até <b className="text-amber-400">{new Date(supremeData.challenge.expiresAt).toLocaleString()}</b> para aceitar, senão perderá por W.O.</p>
                          {isHolder && (
                              <Button onClick={handleHolderAccept} disabled={isProcessing} className="bg-emerald-600 hover:bg-emerald-500 w-full max-w-md mx-auto font-black uppercase py-4 shadow-lg">
                                  Aceitar e Iniciar MD3
                              </Button>
                          )}
                      </>
                  )}
              </div>
          )}

          {/* ÁREA DA MELHOR DE 3 */}
          {supremeData.status === 'bo3' && (
              <div className="bg-gradient-to-b from-red-900/80 to-blue-950 border border-red-500/50 rounded-3xl p-6 shadow-2xl">
                  <h3 className="text-2xl font-black text-white uppercase text-center mb-6 tracking-widest flex items-center justify-center gap-3"><Swords className="text-red-400"/> A Grande Disputa (MD3)</h3>
                  
                  <div className="flex items-center justify-center gap-8 mb-6">
                      <div className="text-center"><ShieldDisplay shield={holderTeam?.shield} size="large" /><p className="text-xs text-amber-400 font-bold mt-2 uppercase">{holderUser?.name}</p></div>
                      <span className="text-3xl font-black text-red-600 drop-shadow-md">VS</span>
                      <div className="text-center"><ShieldDisplay shield={challengerTeam?.shield} size="large" /><p className="text-xs text-blue-400 font-bold mt-2 uppercase">{getUser(supremeData.challenge.challengerId)?.name}</p></div>
                  </div>

                  <div className="space-y-4 max-w-md mx-auto">
                      {/* JOGO 1 */}
                      <div className="bg-blue-950 p-4 rounded-xl border border-blue-800 flex justify-between items-center">
                          <span className="text-[10px] text-blue-400 font-bold uppercase w-12">Jogo 1</span>
                          <div className="flex items-center gap-3">
                              <input type="number" value={bo3.m1A} onChange={e=>setBo3({...bo3, m1A: e.target.value})} disabled={!isAdmin && !isHolder && !isChallenger} className="w-12 h-10 bg-blue-900 border border-blue-700 rounded-lg text-center font-black text-white outline-none" />
                              <span className="text-blue-600 font-black">X</span>
                              <input type="number" value={bo3.m1B} onChange={e=>setBo3({...bo3, m1B: e.target.value})} disabled={!isAdmin && !isHolder && !isChallenger} className="w-12 h-10 bg-blue-900 border border-blue-700 rounded-lg text-center font-black text-white outline-none" />
                          </div>
                      </div>

                      {/* JOGO 2 */}
                      <div className="bg-blue-950 p-4 rounded-xl border border-blue-800 flex justify-between items-center">
                          <span className="text-[10px] text-blue-400 font-bold uppercase w-12">Jogo 2</span>
                          <div className="flex items-center gap-3">
                              <input type="number" value={bo3.m2A} onChange={e=>setBo3({...bo3, m2A: e.target.value})} disabled={!isAdmin && !isHolder && !isChallenger} className="w-12 h-10 bg-blue-900 border border-blue-700 rounded-lg text-center font-black text-white outline-none" />
                              <span className="text-blue-600 font-black">X</span>
                              <input type="number" value={bo3.m2B} onChange={e=>setBo3({...bo3, m2B: e.target.value})} disabled={!isAdmin && !isHolder && !isChallenger} className="w-12 h-10 bg-blue-900 border border-blue-700 rounded-lg text-center font-black text-white outline-none" />
                          </div>
                      </div>

                      {/* JOGO 3 */}
                      <div className="bg-blue-950/50 p-4 rounded-xl border border-blue-800 border-dashed">
                          <div className="flex justify-between items-center mb-3">
                              <span className="text-[10px] text-red-400 font-bold uppercase w-12">Jogo 3</span>
                              <div className="flex items-center gap-3">
                                  <input type="number" value={bo3.m3A} onChange={e=>setBo3({...bo3, m3A: e.target.value})} disabled={!isAdmin && !isHolder && !isChallenger} className="w-12 h-10 bg-blue-900 border border-blue-700 rounded-lg text-center font-black text-white outline-none" />
                                  <span className="text-blue-600 font-black">X</span>
                                  <input type="number" value={bo3.m3B} onChange={e=>setBo3({...bo3, m3B: e.target.value})} disabled={!isAdmin && !isHolder && !isChallenger} className="w-12 h-10 bg-blue-900 border border-blue-700 rounded-lg text-center font-black text-white outline-none" />
                              </div>
                          </div>
                          <div className="flex justify-between items-center border-t border-blue-800/50 pt-3">
                              <span className="text-[9px] text-blue-500 font-bold uppercase">Pênaltis (Se Empate)</span>
                              <div className="flex items-center gap-3">
                                  <input type="number" value={bo3.penA} onChange={e=>setBo3({...bo3, penA: e.target.value})} disabled={!isAdmin && !isHolder && !isChallenger} className="w-10 h-8 bg-blue-900 border border-amber-700/50 rounded text-center text-xs font-bold text-amber-400" placeholder="P" />
                                  <input type="number" value={bo3.penB} onChange={e=>setBo3({...bo3, penB: e.target.value})} disabled={!isAdmin && !isHolder && !isChallenger} className="w-10 h-8 bg-blue-900 border border-blue-700/50 rounded text-center text-xs font-bold text-red-400" placeholder="P" />
                              </div>
                          </div>
                      </div>
                  </div>

                  {(isAdmin || isHolder || isChallenger) && (
                      <Button onClick={submitBO3} disabled={isProcessing} className="w-full max-w-md mx-auto mt-6 bg-red-600 hover:bg-red-500 font-black py-4 uppercase tracking-widest shadow-[0_0_20px_rgba(220,38,38,0.4)]">
                          Submeter Placar e Coroar Campeão
                      </Button>
                  )}
              </div>
          )}
        </>
      )}


      {/* =========================================
          ABA 2: GESTÃO E FILA (SÓ ADMIN)
          ========================================= */}
      {isAdmin && activeTab === 'gestao' && (
        <div className="space-y-6 animate-in slide-in-from-right-4">
            
            {/* Bloco 1: Coroar Manualmente */}
            <div className="bg-indigo-900/40 border border-indigo-500/50 rounded-2xl p-6 shadow-xl">
                <h3 className="text-lg font-black text-indigo-400 uppercase tracking-widest flex items-center gap-2 mb-2"><Crown size={20}/> Definir Player Superior (Manual)</h3>
                <p className="text-xs text-blue-300 mb-4">Selecione um técnico para entregar o cinturão diretamente, pulando as regras de desafio.</p>
                <div className="flex flex-col sm:flex-row gap-3">
                    <select value={manualHolderId} onChange={(e) => setManualHolderId(e.target.value)} className="flex-1 bg-blue-950 border border-indigo-500/40 rounded-xl p-3 text-white text-sm outline-none focus:border-indigo-400">
                        <option value="">Selecione o jogador...</option>
                        {users.map(u => {
                            const t = getTeam(u.id);
                            return <option key={u.id} value={u.id}>{u.name} {t ? `(${t.name})` : ''}</option>
                        })}
                    </select>
                    <button onClick={handleManualCoronation} disabled={isProcessing || !manualHolderId} className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 px-6 rounded-xl shadow-lg transition-colors whitespace-nowrap">
                        Coroar Jogador
                    </button>
                </div>
            </div>

            {/* Bloco 2: Gestão da Fila */}
            <div className="bg-blue-950 border border-blue-800 rounded-2xl p-6 shadow-xl">
                <div className="flex justify-between items-center mb-6 border-b border-blue-800/50 pb-4">
                    <div>
                        <h3 className="text-lg font-black text-white uppercase tracking-widest flex items-center gap-2"><Users size={20}/> Fila de Pedidos de Desafio</h3>
                        <p className="text-xs text-blue-400 mt-1">Jogadores aguardando validação do print da Live 1.</p>
                    </div>
                    {isArenaBusy && (
                        <div className="bg-amber-500/10 border border-amber-500/30 text-amber-400 text-[10px] font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5">
                            <AlertCircle size={14}/> Arena Ocupada
                        </div>
                    )}
                </div>

                <div className="space-y-3">
                    {(supremeData.challengeQueue || []).length === 0 ? (
                        <div className="text-center py-10 text-blue-500 border border-dashed border-blue-800 rounded-xl">Nenhum jogador na fila de desafios.</div>
                    ) : (
                        (supremeData.challengeQueue || []).map((c, index) => {
                            const u = getUser(c.challengerId);
                            const t = getTeam(c.challengerId);
                            const sendDate = new Date(c.timestamp);
                            
                            return (
                                <div key={c.id} className="flex flex-col sm:flex-row items-center justify-between bg-blue-900/40 p-4 rounded-xl border border-blue-700/50 gap-4 hover:bg-blue-800/40 transition-colors">
                                    <div className="flex items-center gap-4 w-full sm:w-auto">
                                        <span className="text-lg font-black text-blue-500 w-6">#{index + 1}</span>
                                        <ShieldDisplay shield={t?.shield} size="normal" />
                                        <div className="flex flex-col">
                                            <span className="text-sm font-bold text-white">{u?.name}</span>
                                            <span className="text-[10px] text-emerald-400 uppercase">{t?.name}</span>
                                        </div>
                                    </div>
                                    
                                    <div className="flex items-center justify-between w-full sm:w-auto gap-6 border-t sm:border-t-0 sm:border-l border-blue-800 pt-3 sm:pt-0 sm:pl-6">
                                        <div className="text-left sm:text-right flex flex-col">
                                            <span className="text-[9px] text-blue-400 font-bold uppercase">Enviado em</span>
                                            <span className="text-xs text-blue-200">{sendDate.toLocaleDateString('pt-BR')} às {sendDate.toLocaleTimeString('pt-BR', {hour:'2-digit', minute:'2-digit'})}</span>
                                        </div>
                                        <button 
                                            onClick={() => setSelectedChallenge(c)}
                                            className="bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs px-4 py-2 rounded-lg flex items-center gap-2 shadow-md transition-colors"
                                        >
                                            <Eye size={14}/> Avaliar
                                        </button>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>
        </div>
      )}

      {/* 🌟 MODAL DE AVALIAÇÃO DO PRINT (ADMIN) */}
      {selectedChallenge && (
          <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4">
              <div className="bg-blue-950 border border-blue-700 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                  
                  <div className="bg-blue-900 p-4 flex justify-between items-center border-b border-blue-800">
                      <h3 className="text-white font-bold flex items-center gap-2"><Target size={18}/> Avaliação de Desafio</h3>
                      <button onClick={() => setSelectedChallenge(null)} className="text-blue-400 hover:text-white"><X size={20}/></button>
                  </div>

                  <div className="p-4 overflow-y-auto custom-scrollbar text-center">
                      <p className="text-xs text-blue-300 mb-4">Print enviado por: <b className="text-white">{getUser(selectedChallenge.challengerId)?.name}</b></p>
                      
                      <div className="border-2 border-blue-800 rounded-xl overflow-hidden bg-black mb-6">
                          <img src={selectedChallenge.proofUrl} alt="Comprovante" className="w-full object-contain max-h-[50vh]" />
                      </div>

                      {isArenaBusy ? (
                          <div className="bg-amber-900/40 border border-amber-500/50 p-4 rounded-xl">
                              <p className="text-amber-400 font-bold text-sm mb-1">A Arena está ocupada!</p>
                              <p className="text-xs text-amber-200">Você não pode aprovar um desafio enquanto houver um combate ativo ou outro jogador aguardando o Campeão. Aguarde o término.</p>
                          </div>
                      ) : (
                          <div className="flex gap-4">
                              <button onClick={() => handleAdminValidate(true)} disabled={isProcessing} className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 rounded-xl flex flex-col items-center justify-center gap-1 shadow-lg">
                                  <span className="flex items-center gap-2"><CheckCircle size={18}/> APROVAR</span>
                                  <span className="text-[9px] font-normal opacity-80">Inicia prazo de 3 dias</span>
                              </button>
                              <button onClick={() => handleAdminValidate(false)} disabled={isProcessing} className="flex-1 bg-red-600 hover:bg-red-500 text-white font-bold py-3 rounded-xl flex flex-col items-center justify-center gap-1 shadow-lg">
                                  <span className="flex items-center gap-2"><XCircle size={18}/> REJEITAR</span>
                                  <span className="text-[9px] font-normal opacity-80">Exclui da fila</span>
                              </button>
                          </div>
                      )}
                  </div>

              </div>
          </div>
      )}

    </div>
  );
};

export default SupremeArena;
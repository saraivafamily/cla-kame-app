import React, { useState, useEffect } from 'react';
import { Crown, Swords, Clock, Upload, Shield, CheckCircle, XCircle, AlertCircle, Camera, Activity } from 'lucide-react';
import { getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { getPublicDocPath } from '../utils/firebase';
import ShieldDisplay from './ShieldDisplay';
import Button from './Button';
import { processImage } from '../utils/helpers'; // Para fazer o upload do print

const SupremeArena = ({ currentUser, users, teams, showToast }) => {
  const [supremeData, setSupremeData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [proofImage, setProofImage] = useState('');

  const isAdmin = currentUser?.role === 'leader' || currentUser?.role === 'kaioh';

  // Placar da MD3
  const [bo3, setBo3] = useState({
     m1A: '', m1B: '',
     m2A: '', m2B: '',
     m3A: '', m3B: '', penA: '', penB: ''
  });

  // Busca os dados do Cinturão no banco
  useEffect(() => {
    const fetchSupreme = async () => {
      try {
        const docRef = getPublicDocPath('globals', 'supreme');
        const snap = await getDoc(docRef);
        if (snap.exists()) {
          setSupremeData(snap.data());
        } else {
          // Cria o documento vazio se for a primeira vez
          const initialData = {
            holderId: null, // Ninguém tem o cinturão ainda
            status: 'idle', // idle, pending_admin, pending_holder, bo3
            cooldownUntil: 0,
            loserCooldowns: {},
            challenge: null
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

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    showToast("Processando imagem...", "info");
    const base64 = await processImage(file);
    setProofImage(base64);
    showToast("Print anexado com sucesso!", "success");
  };

  const handleChallenge = async () => {
    if (!proofImage) return showToast("Anexe o print comprovando que você já venceu a Live 1!", "error");
    if (!window.confirm("Enviar desafio oficial pelo Cinturão?")) return;

    setIsProcessing(true);
    try {
      const newData = {
        ...supremeData,
        status: 'pending_admin',
        challenge: {
          challengerId: currentUser.id,
          proofUrl: proofImage,
          timestamp: Date.now()
        }
      };
      await updateDoc(getPublicDocPath('globals', 'supreme'), newData);
      setSupremeData(newData);
      showToast("Desafio enviado! Aguardando validação da liderança.", "success");
    } catch (e) {
      showToast("Erro ao enviar desafio.", "error");
    }
    setIsProcessing(false);
  };

  const handleAdminValidate = async (isApproved) => {
    setIsProcessing(true);
    try {
      if (isApproved) {
        // Dá 3 dias para o Player Superior aceitar
        const expiresAt = Date.now() + (3 * 24 * 60 * 60 * 1000); 
        const newData = {
          ...supremeData,
          status: 'pending_holder',
          challenge: { ...supremeData.challenge, expiresAt }
        };
        await updateDoc(getPublicDocPath('globals', 'supreme'), newData);
        setSupremeData(newData);
        showToast("Print validado! O Player Superior tem 3 dias para aceitar.", "success");
      } else {
        const newData = { ...supremeData, status: 'idle', challenge: null };
        await updateDoc(getPublicDocPath('globals', 'supreme'), newData);
        setSupremeData(newData);
        showToast("Desafio rejeitado. Print inválido.", "info");
      }
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
         holderId: newHolderId,
         status: 'idle',
         cooldownUntil: Date.now() + (15 * 24 * 60 * 60 * 1000), // 15 dias de paz para o novo campeão
         loserCooldowns: {
           ...supremeData.loserCooldowns,
           [oldHolderId]: Date.now() + (30 * 24 * 60 * 60 * 1000) // Antigo campeão fica 30 dias na geladeira
         },
         challenge: null
       };

       // Atualiza a TAG especial nos usuários
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
     // Lógica matemática da MD3
     const p1 = supremeData.holderId; 
     const p2 = supremeData.challenge.challengerId;

     let v1 = 0, v2 = 0; // Vitórias
     let sg1 = 0, sg2 = 0; // Saldo de gols

     // Jogo 1
     if (bo3.m1A !== '' && bo3.m1B !== '') {
        const a = Number(bo3.m1A), b = Number(bo3.m1B);
        if (a > b) v1++; else if (b > a) v2++;
        sg1 += (a - b); sg2 += (b - a);
     }
     
     // Jogo 2
     if (bo3.m2A !== '' && bo3.m2B !== '') {
        const a = Number(bo3.m2A), b = Number(bo3.m2B);
        if (a > b) v1++; else if (b > a) v2++;
        sg1 += (a - b); sg2 += (b - a);
     }

     let winnerId = null;
     let loserId = null;

     // Verifica se já temos um campeão na MD2
     if (v1 === 2 || (v1 === 1 && v2 === 0 && sg1 > sg2 && bo3.m2A !== '')) winnerId = p1;
     else if (v2 === 2 || (v2 === 1 && v1 === 0 && sg2 > sg1 && bo3.m2A !== '')) winnerId = p2;
     else if (bo3.m1A !== '' && bo3.m2A !== '') {
         // Se empatou vitórias e saldo, precisa do Jogo 3
         if (sg1 === sg2) {
             if (bo3.m3A !== '' && bo3.m3B !== '') {
                 const a = Number(bo3.m3A), b = Number(bo3.m3B);
                 if (a > b) winnerId = p1;
                 else if (b > a) winnerId = p2;
                 else {
                     // Pênaltis do Jogo 3
                     if (bo3.penA !== '' && bo3.penB !== '') {
                         if (Number(bo3.penA) > Number(bo3.penB)) winnerId = p1;
                         else winnerId = p2;
                     } else {
                         return showToast("Jogo 3 empatado! Digite o placar dos Pênaltis.", "error");
                     }
                 }
             } else {
                 return showToast("Empate agregado! É necessário preencher o Jogo 3.", "info");
             }
         } else {
             // Quem tiver melhor saldo ganha
             winnerId = sg1 > sg2 ? p1 : p2;
         }
     } else {
         return showToast("Preencha os placares para finalizar.", "error");
     }

     if (!winnerId) return;

     loserId = winnerId === p1 ? p2 : p1;

     if (!window.confirm(`Finalizar MD3 e declarar ${getUser(winnerId)?.name} como Campeão?`)) return;

     setIsProcessing(true);
     try {
       const newData = {
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
  const challengerUser = supremeData.challenge ? getUser(supremeData.challenge.challengerId) : null;
  const isChallenger = supremeData.challenge?.challengerId === currentUser.id;

  const myLoserCooldown = supremeData.loserCooldowns?.[currentUser.id] || 0;
  const canChallenge = supremeData.status === 'idle' 
      && !isHolder 
      && Date.now() > (supremeData.cooldownUntil || 0)
      && Date.now() > myLoserCooldown;

  // Lógica de WO
  const isWO_Active = supremeData.status === 'pending_holder' && Date.now() > (supremeData.challenge.expiresAt || 0);

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in pb-12">
      
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
                           <Shield size={14}/> Proteção de Campeão Ativa (Período de Paz)
                        </p>
                    </div>
                )}
            </div>
        ) : (
            <div className="py-10 relative z-10">
                <h3 className="text-2xl font-black text-blue-300 uppercase opacity-50">Trono Vazio</h3>
                <p className="text-sm text-blue-400 mt-2">O primeiro a enviar o comprovante assume a coroa automaticamente.</p>
                {isAdmin && (
                    <button onClick={async () => {
                        await updateDoc(getPublicDocPath('globals', 'supreme'), { holderId: currentUser.id });
                        await updateDoc(getPublicDocPath('users', currentUser.id), { isSupreme: true });
                        window.location.reload();
                    }} className="mt-4 bg-amber-600 px-4 py-2 rounded text-white font-bold text-xs">Admin: Assumir Trono Provisório</button>
                )}
            </div>
        )}
      </div>

      {/* ÁREA DE DESAFIO (Se estiver IDLE) */}
      {supremeData.status === 'idle' && (
         <div className="bg-blue-900 border border-blue-700 rounded-2xl p-6 shadow-xl text-center">
             <Swords size={40} className="text-red-400 mx-auto mb-3" />
             <h3 className="text-xl font-black text-white uppercase mb-2">Desafiar o Cinturão</h3>
             
             {!isHolder ? (
                 <div className="max-w-md mx-auto space-y-4 mt-4">
                     {Date.now() < (supremeData.cooldownUntil || 0) ? (
                         <div className="bg-blue-950 p-4 rounded-xl border border-blue-800 text-amber-400 font-bold text-sm">
                             O Campeão está no período de paz de 15 dias. Aguarde!
                         </div>
                     ) : Date.now() < myLoserCooldown ? (
                         <div className="bg-blue-950 p-4 rounded-xl border border-red-800 text-red-400 font-bold text-sm">
                             Você perdeu recentemente. Aguarde 30 dias na geladeira para tentar de novo!
                         </div>
                     ) : (
                         <>
                            <div className="bg-blue-950/50 p-4 rounded-xl border border-blue-800 text-left">
                                <p className="text-xs text-blue-300 font-bold mb-2 flex items-center gap-2"><AlertCircle size={14}/> Requisitos para Desafiar:</p>
                                <ul className="text-[10px] text-blue-400 space-y-1 list-disc pl-4">
                                    <li>Ter sido campeão da <b>Live 1</b> pelo menos uma vez.</li>
                                    <li>Anexar um print comprovando a vitória.</li>
                                </ul>
                            </div>
                            
                            <label className="flex flex-col items-center justify-center bg-blue-950 border-2 border-dashed border-blue-700 rounded-xl p-6 cursor-pointer hover:border-emerald-500 hover:bg-blue-900/50 transition-colors">
                                <Camera size={32} className={proofImage ? 'text-emerald-500 mb-2' : 'text-blue-500 mb-2'} />
                                <span className="text-xs font-bold text-blue-300">{proofImage ? 'Print Anexado! ✅' : 'Clique para enviar Print da Live 1'}</span>
                                <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                            </label>

                            <Button onClick={handleChallenge} disabled={!proofImage || isProcessing} className="w-full bg-red-600 hover:bg-red-500 text-white font-black py-4 uppercase tracking-widest shadow-lg">
                                Enviar Desafio Oficial
                            </Button>
                         </>
                     )}
                 </div>
             ) : (
                 <p className="text-amber-400 font-bold mt-4">Você é o Campeão. Aguarde o próximo desafiante!</p>
             )}
         </div>
      )}

      {/* ÁREA PENDENTE ADMIN */}
      {supremeData.status === 'pending_admin' && (
          <div className="bg-blue-900 border border-amber-500/50 rounded-2xl p-6 shadow-xl text-center">
              <Clock size={40} className="text-amber-400 mx-auto mb-3 animate-pulse" />
              <h3 className="text-xl font-black text-white uppercase mb-2">Análise de Liderança</h3>
              <p className="text-sm text-blue-300 mb-6">O Desafiante <b className="text-white">{challengerUser?.name}</b> enviou o print. Aguardando admin.</p>
              
              <div className="max-w-xs mx-auto mb-6">
                  <img src={supremeData.challenge.proofUrl} alt="Print Live 1" className="w-full rounded-xl border-2 border-blue-700 shadow-md" />
              </div>

              {isAdmin && (
                  <div className="flex gap-4 max-w-md mx-auto">
                      <button onClick={() => handleAdminValidate(true)} disabled={isProcessing} className="flex-1 bg-emerald-600 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2"><CheckCircle size={18}/> Validar Print</button>
                      <button onClick={() => handleAdminValidate(false)} disabled={isProcessing} className="flex-1 bg-red-600 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2"><XCircle size={18}/> Rejeitar</button>
                  </div>
              )}
          </div>
      )}

      {/* ÁREA PENDENTE ACEITE DO CAMPEÃO (Ou W.O.) */}
      {supremeData.status === 'pending_holder' && (
          <div className={`bg-blue-900 border-2 rounded-2xl p-6 shadow-xl text-center ${isWO_Active ? 'border-red-500' : 'border-amber-500'}`}>
              <AlertCircle size={48} className={`mx-auto mb-4 ${isWO_Active ? 'text-red-500 animate-bounce' : 'text-amber-400 animate-pulse'}`} />
              <h3 className="text-2xl font-black text-white uppercase mb-2">Desafio Validado!</h3>
              
              <div className="flex items-center justify-center gap-4 my-6">
                  <div className="text-center"><ShieldDisplay shield={holderTeam?.shield} size="normal" /><p className="text-[10px] text-amber-400 font-bold mt-2">CAMPEÃO</p></div>
                  <span className="text-xl font-black text-blue-500">VS</span>
                  <div className="text-center"><ShieldDisplay shield={challengerTeam?.shield} size="normal" /><p className="text-[10px] text-red-400 font-bold mt-2">DESAFIANTE</p></div>
              </div>

              {isWO_Active ? (
                  <div className="bg-red-900/30 p-4 rounded-xl border border-red-500/50">
                      <p className="text-red-400 font-black uppercase mb-2">Prazo Esgotado!</p>
                      <p className="text-sm text-red-200 mb-4">O Campeão não respondeu em 3 dias.</p>
                      <Button onClick={handleWO} className="bg-red-600 hover:bg-red-500 w-full font-black uppercase tracking-widest">Declarar W.O. ao Desafiante</Button>
                  </div>
              ) : (
                  <>
                      <p className="text-sm text-blue-300 mb-6">O campeão tem até <b className="text-amber-400">{new Date(supremeData.challenge.expiresAt).toLocaleString()}</b> para aceitar o combate, senão perderá por W.O.</p>
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
              
              {/* Placar de Entradas */}
              <div className="space-y-6">
                  {/* JOGO 1 */}
                  <div className="bg-blue-950 p-4 rounded-2xl border border-blue-800">
                      <p className="text-[10px] text-blue-400 font-bold uppercase tracking-widest text-center mb-3">Jogo 1</p>
                      <div className="flex items-center justify-center gap-4">
                          <div className="text-center"><span className="text-xs text-amber-400 font-bold block mb-1">Campeão</span><input type="number" value={bo3.m1A} onChange={e=>setBo3({...bo3, m1A: e.target.value})} className="w-16 h-12 bg-blue-900 border border-blue-700 rounded-lg text-center text-xl font-black text-white" /></div>
                          <span className="text-blue-600 font-black">X</span>
                          <div className="text-center"><span className="text-xs text-red-400 font-bold block mb-1">Desafiante</span><input type="number" value={bo3.m1B} onChange={e=>setBo3({...bo3, m1B: e.target.value})} className="w-16 h-12 bg-blue-900 border border-blue-700 rounded-lg text-center text-xl font-black text-white" /></div>
                      </div>
                  </div>

                  {/* JOGO 2 */}
                  <div className="bg-blue-950 p-4 rounded-2xl border border-blue-800">
                      <p className="text-[10px] text-blue-400 font-bold uppercase tracking-widest text-center mb-3">Jogo 2</p>
                      <div className="flex items-center justify-center gap-4">
                          <div className="text-center"><input type="number" value={bo3.m2A} onChange={e=>setBo3({...bo3, m2A: e.target.value})} className="w-16 h-12 bg-blue-900 border border-blue-700 rounded-lg text-center text-xl font-black text-white" /></div>
                          <span className="text-blue-600 font-black">X</span>
                          <div className="text-center"><input type="number" value={bo3.m2B} onChange={e=>setBo3({...bo3, m2B: e.target.value})} className="w-16 h-12 bg-blue-900 border border-blue-700 rounded-lg text-center text-xl font-black text-white" /></div>
                      </div>
                  </div>

                  {/* JOGO 3 (Desempate) */}
                  <div className="bg-blue-950/50 p-4 rounded-2xl border border-blue-800 border-dashed">
                      <p className="text-[10px] text-red-400 font-bold uppercase tracking-widest text-center mb-3">Jogo 3 (Apenas se houver empate no Agregado)</p>
                      <div className="flex items-center justify-center gap-4 mb-4">
                          <div className="text-center"><input type="number" value={bo3.m3A} onChange={e=>setBo3({...bo3, m3A: e.target.value})} className="w-16 h-12 bg-blue-900 border border-blue-700 rounded-lg text-center text-xl font-black text-white" /></div>
                          <span className="text-blue-600 font-black">X</span>
                          <div className="text-center"><input type="number" value={bo3.m3B} onChange={e=>setBo3({...bo3, m3B: e.target.value})} className="w-16 h-12 bg-blue-900 border border-blue-700 rounded-lg text-center text-xl font-black text-white" /></div>
                      </div>
                      <p className="text-[9px] text-blue-500 font-bold uppercase tracking-widest text-center mb-2">Pênaltis do Jogo 3</p>
                      <div className="flex items-center justify-center gap-4">
                          <input type="number" value={bo3.penA} onChange={e=>setBo3({...bo3, penA: e.target.value})} className="w-12 h-8 bg-blue-900 border border-blue-700 rounded-lg text-center text-sm font-bold text-amber-400" placeholder="Pen" />
                          <input type="number" value={bo3.penB} onChange={e=>setBo3({...bo3, penB: e.target.value})} className="w-12 h-8 bg-blue-900 border border-blue-700 rounded-lg text-center text-sm font-bold text-red-400" placeholder="Pen" />
                      </div>
                  </div>
              </div>

              {(isAdmin || isHolder || isChallenger) && (
                  <Button onClick={submitBO3} disabled={isProcessing} className="w-full mt-6 bg-red-600 hover:bg-red-500 font-black py-4 uppercase tracking-widest shadow-[0_0_20px_rgba(220,38,38,0.4)]">
                      Submeter Placar e Coroar Campeão
                  </Button>
              )}
          </div>
      )}

    </div>
  );
};

export default SupremeArena;
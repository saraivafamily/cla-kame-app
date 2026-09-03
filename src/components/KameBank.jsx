import React, { useState, useEffect } from 'react';
import { Landmark, Wallet, Star, CheckCircle, X, AlertCircle, Activity, Crown } from 'lucide-react';
import { updateDoc, setDoc } from 'firebase/firestore';
import { getPublicDocPath } from '../utils/firebase';
import Button from './Button';

const KameBank = ({ currentUser, users, predictions, matches, teams, showToast }) => {
  const [bankTab, setBankTab] = useState('extrato');
  const [selectedPackage, setSelectedPackage] = useState(null);
  
  const [checkoutStep, setCheckoutStep] = useState('idle');
  const [pixPayload, setPixPayload] = useState('');
  const [initialCoins, setInitialCoins] = useState(0);
  const [isAuditing, setIsAuditing] = useState(false);

  const getTeam = (id) => (teams || []).find(t => t.id === id);
  const myPreds = (predictions || []).filter(p => p.userId === currentUser?.id).sort((a,b) => b.timestamp - a.timestamp);
  const isAdmin = currentUser?.role === 'leader' || currentUser?.role === 'kaioh';

  const BK_PACKAGES = [
    { id: 'p1', name: 'Pacote Iniciante', coins: 300, price: 5.00, bonus: 0, color: 'from-blue-600 to-blue-900', border: 'border-blue-500' },
    { id: 'p2', name: 'Pacote Profissional', coins: 700, price: 10.00, bonus: 100, color: 'from-emerald-600 to-emerald-900', border: 'border-emerald-500' },
    { id: 'p3', name: 'Pacote Magnata', coins: 1600, price: 20.00, bonus: 400, color: 'from-amber-500 to-amber-800', border: 'border-amber-400' },
  ];

  const handleStartCheckout = async (pkg) => {
    setSelectedPackage(pkg);
    setCheckoutStep('generating');
    setInitialCoins(currentUser?.kameCoins || 0);

    try {
      const response = await fetch('/api/create-pix', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transaction_amount: pkg.price,
          description: `Apoio Clã Kame - ${pkg.name}`,
          email: currentUser.email || 'jogador@clakame.com',
          userId: currentUser.id
        })
      });

      const data = await response.json();

      if (data.qr_code) {
        setPixPayload(data.qr_code);
        setCheckoutStep('waiting');
      } else {
        throw new Error("Erro na geração do PIX");
      }
    } catch (error) {
      console.error(error);
      showToast("Não foi possível conectar ao banco. Tente novamente.", "error");
      closeCheckout();
    }
  };

  useEffect(() => {
    if (checkoutStep === 'waiting' && (currentUser?.kameCoins || 0) > initialCoins) {
      setCheckoutStep('success');
      showToast("Pagamento Confirmado pelo Banco!", "success");
    }
  }, [currentUser?.kameCoins, checkoutStep, initialCoins]);

  const handleCopyPix = () => {
    navigator.clipboard.writeText(pixPayload);
    showToast("PIX Copia e Cola copiado! Abra o app do seu banco.", "success");
  };

  const closeCheckout = () => {
    setSelectedPackage(null);
    setCheckoutStep('idle');
    setPixPayload('');
  };

  const simulateAutomaticWebhook = async () => {
    showToast("Processando pagamento no banco...", "info");
    
    setTimeout(async () => {
      const totalCoins = selectedPackage.coins + selectedPackage.bonus;
      const newBalance = (currentUser.kameCoins || 0) + totalCoins;
      
      await updateDoc(getPublicDocPath('users', currentUser.id), { kameCoins: newBalance });
      
      const depositRecord = {
        id: `dep_${Date.now()}`,
        userId: currentUser.id,
        type: 'deposit',
        amount: totalCoins,
        timestamp: Date.now(),
        status: 'approved'
      };
      await setDoc(getPublicDocPath('predictions', depositRecord.id), depositRecord);

      setCheckoutStep('success');
      showToast("Pagamento Aprovado! BitKames adicionados.", "success");
    }, 2000);
  };

  // 🚀 O MOTOR DE AUDITORIA E RECÁLCULO GLOBAL DO BANCO
  const handleSyncBalancesFromExtract = async () => {
    if (!window.confirm("ATENÇÃO: O sistema vai reconstruir a carteira de TODOS os membros lendo cada linha do Extrato (Apostas + Depósitos) e salvar as correções em massa. Tem certeza?")) return;
    
    setIsAuditing(true);
    showToast("⚖️ Auditoria iniciada! Recalculando todos os saldos... Aguarde.", "info");

    try {
      const BEM_VINDO_BASE = 100;
      const BONUS_SOCIAL_COMPENSACAO = 100; // Dá 100 moedas pra cobrir os check-ins velhos que não tinham extrato

      const updatePromises = (users || []).map(async (u) => {
         let calcBalance = BEM_VINDO_BASE + BONUS_SOCIAL_COMPENSACAO;
         
         // Se ele colocou foto de perfil, ganha os 50
         if (u.receivedProfileBonus) {
             calcBalance += 50;
         }

         // Puxa o extrato inteiro da pessoa
         const userMovements = (predictions || []).filter(p => p.userId === u.id);

         // Reconstrói o saldo baseado apenas nos números matemáticos do extrato
         userMovements.forEach(m => {
            if (m.type === 'deposit') {
               // É um pacote comprado ou depósito (soma)
               calcBalance += Number(m.amount || 0);
            } else {
               // É um bilhete de aposta. Cobra o valor do bilhete.
               calcBalance -= Number(m.amount || 0);

               // Se o bilhete deu GREEN (Vitória), devolve o Payout pro bolso
               if (m.status === 'won') {
                  calcBalance += Number(m.payout || 0);
               }
            }
         });

         // Blindagem extra: Nenhuma conta pode ficar negativa. Se der ruim, zera.
         calcBalance = Math.max(0, Math.floor(calcBalance));

         // Só chama o banco de dados se o saldo real for diferente do que está bugado hoje
         if (calcBalance !== (u.kameCoins || 0)) {
             return updateDoc(getPublicDocPath('users', u.id), { kameCoins: calcBalance });
         }
         return Promise.resolve();
      });

      await Promise.all(updatePromises);
      showToast("🎉 Auditoria concluída! A carteira de todo mundo bate 100% com os Extratos agora.", "success");
      
    } catch (err) {
      console.error(err);
      showToast("Falha na auditoria. Verifique sua conexão.", "error");
    } finally {
      setIsAuditing(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in pb-12">
      <div className="bg-gradient-to-r from-blue-900 to-blue-950 p-6 rounded-3xl border border-blue-800 shadow-xl flex flex-col sm:flex-row justify-between items-center gap-6">
        <div className="flex items-center gap-4">
          <div className="bg-blue-950 p-4 rounded-full border border-emerald-500/50 shadow-inner">
            <Landmark size={32} className="text-emerald-400" />
          </div>
          <div>
            <h2 className="text-2xl font-black text-white uppercase tracking-wider">Kame Bank</h2>
            <p className="text-sm text-blue-400 mt-1">Sua agência financeira do clã.</p>
          </div>
        </div>
        <div className="bg-blue-950/80 p-4 rounded-2xl border border-amber-500/40 min-w-[200px] text-center shadow-inner">
          <p className="text-xs text-amber-400 font-bold uppercase tracking-widest mb-1 flex items-center justify-center gap-1.5"><Wallet size={14}/> Saldo Disponível</p>
          <p className="text-4xl font-black text-white">{currentUser?.kameCoins || 0} <span className="text-xl text-amber-500">BK</span></p>
        </div>
      </div>

      <div className="flex gap-2 p-1 bg-blue-950 rounded-xl border border-blue-800 overflow-x-auto custom-scrollbar">
        <button onClick={()=>setBankTab('extrato')} className={`shrink-0 flex-1 py-2.5 px-4 text-sm rounded-lg font-bold transition-all ${bankTab==='extrato'?'bg-emerald-600 text-white shadow-md':'text-blue-500 hover:text-white'}`}>📜 Extrato da Conta</button>
        <button onClick={()=>setBankTab('deposito')} className={`shrink-0 flex-1 py-2.5 px-4 text-sm rounded-lg font-bold transition-all ${bankTab==='deposito'?'bg-amber-600 text-white shadow-md':'text-blue-500 hover:text-white'}`}>💰 Adquirir BK</button>
        {isAdmin && (
           <button onClick={()=>setBankTab('admin')} className={`shrink-0 flex-1 py-2.5 px-4 text-sm rounded-lg font-bold transition-all ${bankTab==='admin'?'bg-red-600 text-white shadow-md':'text-red-400 hover:text-white border border-red-500/30'}`}>👑 Central Admin</button>
        )}
      </div>

      {bankTab === 'admin' && isAdmin && (
        <div className="bg-blue-900 rounded-3xl border border-blue-800 shadow-xl overflow-hidden animate-in slide-in-from-right-4 p-8 text-center space-y-6">
           <div className="flex flex-col items-center justify-center">
             <Crown size={48} className="text-amber-400 mb-4 animate-bounce" />
             <h3 className="text-3xl font-black text-white uppercase tracking-wider mb-2">Banco Central do Clã</h3>
             <p className="text-blue-300 max-w-lg">Painel de recálculo de saldos. Utilize esta ferramenta para auditar e corrigir as carteiras de todos os membros de forma automática.</p>
           </div>
           
           <div className="bg-red-500/10 border border-red-500/30 p-6 md:p-8 rounded-2xl inline-block max-w-2xl mx-auto w-full text-left shadow-inner">
               <div className="flex items-center gap-3 mb-4 border-b border-red-500/30 pb-4">
                 <AlertCircle className="text-red-500 shrink-0" size={32} />
                 <div>
                   <h4 className="font-black text-red-400 text-lg uppercase tracking-widest">Auditoria Matemática</h4>
                   <p className="text-xs text-red-300">Corrige bugs de saldos ausentes instantaneamente.</p>
                 </div>
               </div>
               
               <p className="text-sm text-blue-200 mb-4 leading-relaxed">
                 Esta ferramenta varrerá todas as contas e forçará o saldo de todo mundo a bater com a conta exata dos extratos individuais.<br/><br/>
                 O novo saldo final de todos será igual a: <b>100 BK Iniciais + 50 BK (Foto) + Bônus Fixo Social (100) + Todos Depósitos - Bilhetes Comprados + Lucro de Vitórias</b>.
               </p>
               
               <button onClick={handleSyncBalancesFromExtract} disabled={isAuditing} className="bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white font-black py-4 px-6 rounded-xl shadow-[0_0_20px_rgba(220,38,38,0.4)] transition-all w-full flex items-center justify-center gap-2 text-lg">
                  {isAuditing ? 'Calculando saldos...' : '⚖️ Recalcular e Corrigir Contas'}
               </button>
           </div>
        </div>
      )}

      {bankTab === 'extrato' && (
        <div className="bg-blue-900 rounded-3xl border border-blue-800 shadow-xl overflow-hidden animate-in slide-in-from-left-4">
          <div className="p-5 border-b border-blue-800 bg-blue-950/40">
            <h3 className="font-bold text-white flex items-center gap-2"><Activity size={18} className="text-blue-400"/> Movimentações da Conta</h3>
          </div>
          <div className="divide-y divide-blue-800/40 max-h-[500px] overflow-y-auto custom-scrollbar">
            {myPreds.length === 0 ? (
              <div className="p-8 text-center text-blue-500">Nenhuma movimentação encontrada na sua conta.</div>
            ) : (
              myPreds.map(pred => {
                const isDeposit = pred.type === 'deposit';
                
                const match = !isDeposit ? matches.find(m => m.matchId === pred.matchId) : null;
                const tA = getTeam(match?.teamA);
                const tB = getTeam(match?.teamB);
                const matchName = tA && tB ? `${tA.name} x ${tB.name}` : 'Palpite Oficial (Aguardando Resultado)';
                
                let statusColor = "text-amber-400";
                let statusBg = "bg-amber-500/10 border-amber-500/20";
                let statusText = "Pendente";
                let valueDisplay = `- ${pred.amount} BK`;

                if (isDeposit) {
                  statusColor = "text-emerald-400"; statusBg = "bg-emerald-500/10 border-emerald-500/20";
                  statusText = "Apoio Clã";
                  valueDisplay = `+ ${pred.amount} BK`;
                } else if (pred.status === 'won') {
                  statusColor = "text-emerald-400"; statusBg = "bg-emerald-500/10 border-emerald-500/20";
                  statusText = "Acerto (Green)";
                  valueDisplay = `+ ${pred.payout} BK`;
                } else if (pred.status === 'lost') {
                  statusColor = "text-red-400"; statusBg = "bg-red-500/10 border-red-500/20";
                  statusText = "Erro (Red)";
                  valueDisplay = `- ${pred.amount} BK`;
                }

                return (
                  <div key={pred.id} className="p-4 hover:bg-blue-800/30 transition-colors flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded border ${statusBg} ${statusColor}`}>{statusText}</span>
                        <span className="text-[10px] text-blue-400">{new Date(pred.timestamp).toLocaleDateString()}</span>
                      </div>
                      <p className="text-sm font-bold text-white">{isDeposit ? 'Pacote de BitKames' : matchName}</p>
                      {!isDeposit && (
                        <p className="text-xs text-blue-300 mt-0.5">Palpite: <b className="text-blue-100">{pred.option === 'A' ? tA?.name || 'Time A' : pred.option === 'B' ? tB?.name || 'Time B' : 'Empate'}</b></p>
                      )}
                    </div>
                    <div className="text-right w-full sm:w-auto bg-blue-950 sm:bg-transparent p-3 sm:p-0 rounded-lg sm:rounded-none border sm:border-0 border-blue-800">
                      <p className="text-[10px] text-blue-500 uppercase font-bold mb-0.5">Movimentação</p>
                      <p className={`text-lg font-black ${pred.status === 'won' || isDeposit ? 'text-emerald-400' : pred.status === 'lost' ? 'text-red-400' : 'text-amber-400'}`}>{valueDisplay}</p>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>
      )}

      {bankTab === 'deposito' && (
        <div className="space-y-6 animate-in slide-in-from-right-4">
          <div className="bg-blue-900 p-6 rounded-2xl border border-blue-800 text-center">
            <h3 className="text-xl font-bold text-white mb-2">Apoie o Clã e Ganhe BitKames</h3>
            <p className="text-sm text-blue-300 max-w-lg mx-auto">
              Ao adquirir pacotes de BitKames (BK), você ajuda a financiar nossos torneios e premiações.
            </p>
            
            <div className="mt-5 bg-blue-950/50 p-4 rounded-xl border border-blue-800 inline-block text-left text-xs text-blue-400 shadow-inner">
               <p className="text-amber-400 font-bold mb-1.5">⚠️ Aviso Legal</p>
               <ul className="list-disc pl-4 space-y-1">
                 <li>Os BitKames são bens virtuais exclusivos para uso no minigame (KameBet).</li>
                 <li><b>Não possuem valor monetário real</b>, não sendo passíveis de saque ou troca por dinheiro.</li>
                 <li>Ao realizar o apoio via PIX, você confirma ter <b>mais de 18 anos</b> de idade.</li>
               </ul>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {BK_PACKAGES.map(pkg => (
              <div key={pkg.id} onClick={() => handleStartCheckout(pkg)} className={`bg-gradient-to-b ${pkg.color} rounded-3xl p-1 shadow-xl hover:scale-105 transition-transform cursor-pointer relative overflow-hidden group`}>
                {pkg.bonus > 0 && (
                  <div className="absolute top-4 -right-8 bg-red-500 text-white text-[10px] font-black uppercase tracking-wider py-1 px-10 transform rotate-45 shadow-lg z-10">
                    Bônus +{pkg.bonus}
                  </div>
                )}
                <div className="bg-blue-950 rounded-[22px] p-6 h-full flex flex-col items-center justify-between border border-transparent group-hover:border-white/20 transition-colors">
                  <div className="text-center w-full">
                    <p className="text-xs text-blue-300 font-bold uppercase tracking-widest mb-4">{pkg.name}</p>
                    <div className="flex items-center justify-center gap-2 mb-2">
                      <Star className="text-amber-400 fill-amber-400" size={28}/>
                    </div>
                    <h4 className="text-4xl font-black text-white mb-1">{pkg.coins}</h4>
                    <p className="text-amber-500 font-bold text-sm">BitKames</p>
                  </div>
                  <button className={`w-full mt-6 py-3 rounded-xl font-black text-blue-950 uppercase tracking-wide bg-gradient-to-r ${pkg.color} shadow-lg flex items-center justify-center gap-2`}>
                    R$ {pkg.price.toFixed(2)}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {selectedPackage && (
        <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in" onClick={checkoutStep === 'success' ? closeCheckout : null}>
          <div className="bg-blue-900 border border-blue-700 rounded-3xl w-full max-w-md p-6 sm:p-8 shadow-2xl relative" onClick={e => e.stopPropagation()}>
            
            {checkoutStep !== 'success' && checkoutStep !== 'generating' && (
              <button onClick={closeCheckout} className="absolute top-4 right-4 text-blue-400 hover:text-white bg-blue-800 p-2 rounded-full"><X size={16}/></button>
            )}

            {checkoutStep === 'generating' && (
              <div className="text-center py-8 space-y-6">
                <div className="w-16 h-16 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
                <div>
                  <h3 className="text-xl font-black text-white">Conectando ao Banco...</h3>
                  <p className="text-blue-400 text-sm mt-2">Gerando chave PIX exclusiva para você.</p>
                </div>
              </div>
            )}

            {checkoutStep === 'waiting' && (
              <div className="space-y-6 animate-in zoom-in-95 duration-300">
                <div className="text-center">
                  <h3 className="text-2xl font-black text-white">Pagamento PIX</h3>
                  <p className="text-blue-300 text-sm mt-1">Pacote: <b className="text-amber-400">{selectedPackage.coins} BK</b> (+{selectedPackage.bonus} Bônus)</p>
                </div>

                <div className="bg-blue-950 p-5 rounded-2xl border border-blue-800 text-center shadow-inner">
                  <p className="text-xs text-blue-400 font-bold uppercase mb-2">Valor a Pagar</p>
                  <p className="text-4xl font-black text-emerald-400">R$ {selectedPackage.price.toFixed(2)}</p>
                </div>

                <div className="space-y-3 pt-2">
                  <p className="text-xs text-amber-400 font-bold uppercase text-center">PIX Copia e Cola</p>
                  <div className="flex gap-2">
                    <input type="text" readOnly value={pixPayload} className="flex-1 bg-blue-950 border border-blue-700 rounded-xl p-3 text-white text-xs font-mono outline-none" />
                    <button onClick={handleCopyPix} className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 rounded-xl font-bold transition-colors shadow-md">
                      Copiar
                    </button>
                  </div>
                </div>

                <div className="bg-amber-500/10 border border-amber-500/30 p-4 rounded-xl flex items-center gap-3">
                  <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin shrink-0"></div>
                  <p className="text-xs text-amber-200 font-medium">
                    <b className="text-amber-400 block">Aguardando Pagamento...</b>
                    As moedas cairão automaticamente assim que você pagar no seu banco.
                  </p>
                </div>

                {(currentUser?.role === 'leader' || currentUser?.role === 'kaioh') && (
                  <div className="pt-4 border-t border-blue-800/50 mt-4">
                    <button onClick={simulateAutomaticWebhook} className="w-full bg-blue-800 hover:bg-blue-700 text-blue-300 border border-blue-700 border-dashed text-xs py-2 rounded-lg transition-colors">
                      🛠️ Modo Dev: Simular Pagamento Aprovado
                    </button>
                  </div>
                )}
              </div>
            )}

            {checkoutStep === 'success' && (
              <div className="text-center py-6 space-y-6 animate-in zoom-in-95 duration-500">
                <div className="w-24 h-24 bg-emerald-500/20 border-2 border-emerald-500 rounded-full flex items-center justify-center mx-auto shadow-[0_0_30px_rgba(16,185,129,0.4)]">
                  <CheckCircle className="text-emerald-400" size={48}/>
                </div>
                <div>
                  <h3 className="text-3xl font-black text-white uppercase tracking-wider">Aprovado!</h3>
                  <p className="text-blue-300 mt-2 text-sm">Muito obrigado por apoiar o Clã Kame.</p>
                </div>
                <div className="bg-blue-950 p-4 rounded-xl border border-blue-800 inline-block mx-auto min-w-[200px]">
                  <p className="text-xs text-blue-400 font-bold uppercase mb-1">Moedas Adicionadas</p>
                  <p className="text-2xl font-black text-amber-400">+{selectedPackage.coins + selectedPackage.bonus} BK</p>
                </div>
                <Button onClick={closeCheckout} className="w-full py-4 text-sm font-black bg-emerald-600 hover:bg-emerald-500 mt-4">
                  Voltar para o Banco
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default KameBank;

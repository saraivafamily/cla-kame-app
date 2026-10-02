import React, { useState, useEffect } from 'react';
import { Landmark, Wallet, Star, CheckCircle, X, AlertCircle, Activity, Crown } from 'lucide-react';
import { updateDoc, setDoc } from 'firebase/firestore';
import { getPublicDocPath } from '../utils/firebase';
import Button from './Button';

const KameBank = ({ currentUser, users, predictions, matches, teams, competitions, showToast }) => {
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
    setSelectedPackage(pkg); setCheckoutStep('generating'); setInitialCoins(currentUser?.kameCoins || 0);
    try {
      const response = await fetch('/api/create-pix', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ transaction_amount: pkg.price, description: `Apoio Clã Kame - ${pkg.name}`, email: currentUser.email || 'jogador@clakame.com', userId: currentUser.id }) });
      const data = await response.json();
      if (data.qr_code) { setPixPayload(data.qr_code); setCheckoutStep('waiting'); } else throw new Error("Erro PIX");
    } catch (error) { showToast("Não foi possível conectar ao banco.", "error"); closeCheckout(); }
  };

  useEffect(() => { if (checkoutStep === 'waiting' && (currentUser?.kameCoins || 0) > initialCoins) { setCheckoutStep('success'); showToast("Pagamento Confirmado!", "success"); } }, [currentUser?.kameCoins, checkoutStep, initialCoins]);
  const handleCopyPix = () => { navigator.clipboard.writeText(pixPayload); showToast("PIX Copiado!", "success"); };
  const closeCheckout = () => { setSelectedPackage(null); setCheckoutStep('idle'); setPixPayload(''); };

  const simulateAutomaticWebhook = async () => {
    showToast("Processando pagamento...", "info");
    setTimeout(async () => {
      const totalCoins = selectedPackage.coins + selectedPackage.bonus;
      const newBalance = (currentUser.kameCoins || 0) + totalCoins;
      await updateDoc(getPublicDocPath('users', currentUser.id), { kameCoins: newBalance });
      const depositRecord = { id: `dep_${Date.now()}`, userId: currentUser.id, type: 'deposit', amount: totalCoins, timestamp: Date.now(), status: 'approved' };
      await setDoc(getPublicDocPath('predictions', depositRecord.id), depositRecord);
      setCheckoutStep('success'); showToast("Aprovado!", "success");
    }, 2000);
  };

  const handleSyncBalancesFromExtract = async () => {
    if (!window.confirm("O sistema vai reconstruir a carteira de TODOS os membros lendo cada linha do Extrato. Tem certeza?")) return;
    setIsAuditing(true); showToast("⚖️ Auditoria iniciada...", "info");
    try {
      const updatePromises = (users || []).map(async (u) => {
         if (!u || !u.id || u.id === 'u_master') return Promise.resolve();
         let calcBalance = 100 + 100;
         if (u.receivedProfileBonus) calcBalance += 50;
         const userMovements = (predictions || []).filter(p => p.userId === u.id);

         userMovements.forEach(m => {
            if (m.type === 'deposit' || m.type === 'bonus' || m.type === 'prize') {
               calcBalance += Number(m.amount || 0);
            } 
            // 🌟 NOVA REGRA: A loja subtrai do saldo!
            else if (m.type === 'store') {
               calcBalance -= Number(m.amount || 0);
            }
            else if (!m.type || m.type === 'bet') {
               const betAmount = Number(m.amount || 0);
               calcBalance -= betAmount;
               if (m.status === 'won') {
                  let payout = Number(m.payout || 0);
                  if (payout === 0) { const odd = Number(m.lockedOdd || 1.1); payout = Math.floor(betAmount * odd); }
                  calcBalance += payout;
               }
            }
         });
         calcBalance = Math.max(0, Math.floor(calcBalance));
         if (calcBalance !== (u.kameCoins || 0)) return updateDoc(getPublicDocPath('users', u.id), { kameCoins: calcBalance });
         return Promise.resolve();
      });
      await Promise.all(updatePromises); showToast("Auditoria concluída!", "success");
    } catch (err) { showToast("Falha na auditoria.", "error"); } finally { setIsAuditing(false); }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in pb-12">
      <div className="bg-gradient-to-r from-blue-900 to-blue-950 p-6 rounded-3xl border border-blue-800 shadow-xl flex flex-col sm:flex-row justify-between items-center gap-6">
        <div className="flex items-center gap-4">
          <div className="bg-blue-950 p-4 rounded-full border border-emerald-500/50 shadow-inner"><Landmark size={32} className="text-emerald-400" /></div>
          <div><h2 className="text-2xl font-black text-white uppercase tracking-wider">Kame Bank</h2><p className="text-sm text-blue-400 mt-1">Sua agência financeira do clã.</p></div>
        </div>
        <div className="bg-blue-950/80 p-4 rounded-2xl border border-amber-500/40 min-w-[200px] text-center shadow-inner">
          <p className="text-xs text-amber-400 font-bold uppercase tracking-widest mb-1 flex items-center justify-center gap-1.5"><Wallet size={14}/> Saldo</p>
          <p className="text-4xl font-black text-white">{currentUser?.kameCoins || 0} <span className="text-xl text-amber-500">BK</span></p>
        </div>
      </div>

      <div className="flex gap-2 p-1 bg-blue-950 rounded-xl border border-blue-800 overflow-x-auto custom-scrollbar">
        <button onClick={()=>setBankTab('extrato')} className={`shrink-0 flex-1 py-2.5 px-4 text-sm rounded-lg font-bold transition-all ${bankTab==='extrato'?'bg-emerald-600 text-white shadow-md':'text-blue-500 hover:text-white'}`}>📜 Extrato</button>
        <button onClick={()=>setBankTab('deposito')} className={`shrink-0 flex-1 py-2.5 px-4 text-sm rounded-lg font-bold transition-all ${bankTab==='deposito'?'bg-amber-600 text-white shadow-md':'text-blue-500 hover:text-white'}`}>💰 Adquirir BK</button>
        {isAdmin && <button onClick={()=>setBankTab('admin')} className={`shrink-0 flex-1 py-2.5 px-4 text-sm rounded-lg font-bold transition-all ${bankTab==='admin'?'bg-red-600 text-white shadow-md':'text-red-400 hover:text-white border border-red-500/30'}`}>👑 Auditoria</button>}
      </div>

      {bankTab === 'admin' && isAdmin && (
        <div className="bg-blue-900 rounded-3xl border border-blue-800 shadow-xl overflow-hidden animate-in slide-in-from-right-4 p-8 text-center space-y-6">
           <div className="flex flex-col items-center justify-center"><Crown size={48} className="text-amber-400 mb-4 animate-bounce" /><h3 className="text-3xl font-black text-white uppercase tracking-wider mb-2">Banco Central do Clã</h3></div>
           <div className="bg-red-500/10 border border-red-500/30 p-6 md:p-8 rounded-2xl inline-block max-w-2xl mx-auto w-full text-left shadow-inner">
               <button onClick={handleSyncBalancesFromExtract} disabled={isAuditing} className="bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white font-black py-4 px-6 rounded-xl shadow-[0_0_20px_rgba(220,38,38,0.4)] transition-all w-full text-lg">
                  {isAuditing ? 'Calculando saldos...' : '⚖️ Recalcular e Corrigir Contas'}
               </button>
           </div>
        </div>
      )}

      {bankTab === 'extrato' && (
        <div className="bg-blue-900 rounded-3xl border border-blue-800 shadow-xl overflow-hidden animate-in slide-in-from-left-4">
          <div className="divide-y divide-blue-800/40 max-h-[500px] overflow-y-auto custom-scrollbar">
            {myPreds.length === 0 ? (<div className="p-8 text-center text-blue-500">Nenhuma movimentação.</div>) : (
              myPreds.map(pred => {
                const isDeposit = pred.type === 'deposit' || pred.type === 'bonus' || pred.type === 'prize';
                const isStore = pred.type === 'store'; // 🌟 RECONHECE A LOJA
                let tA = null; let tB = null; let compTag = '';

                if (!isDeposit && !isStore) {
                    let mResult = (matches || []).find(m => m.matchId === pred.matchId && m.compId === pred.compId);
                    if (mResult) { tA = getTeam(mResult.teamA); tB = getTeam(mResult.teamB); } 
                    else if (competitions) {
                        const comp = competitions.find(c => c.id === pred.compId);
                        if (comp) { compTag = comp.name; comp.rounds?.forEach(r => { const m = r.matches?.find(x => x.id === pred.matchId); if (m) { tA = getTeam(m.teamA); tB = getTeam(m.teamB); } }); }
                    }
                }
                
                let statusColor = "text-amber-400"; let statusBg = "bg-amber-500/10 border-amber-500/20"; let statusText = "Pendente"; let valueDisplay = `- ${pred.amount} BK`;

                if (isDeposit) {
                  statusColor = "text-emerald-400"; statusBg = "bg-emerald-500/10 border-emerald-500/20"; statusText = pred.type === 'prize' ? 'Premiação' : 'Depósito'; valueDisplay = `+ ${pred.amount} BK`;
                } else if (isStore) {
                  // 🌟 VISUAL DO EXTRATO PARA COMPRAS
                  statusColor = "text-purple-400"; statusBg = "bg-purple-500/10 border-purple-500/20"; statusText = pred.status === 'delivered' ? 'Entregue' : 'Em Preparo'; valueDisplay = `- ${pred.amount} BK`;
                } else if (pred.status === 'won') {
                  let visualPayout = Number(pred.payout || 0); if (visualPayout === 0) visualPayout = Math.floor(Number(pred.amount || 0) * Number(pred.lockedOdd || 1.1));
                  statusColor = "text-emerald-400"; statusBg = "bg-emerald-500/10 border-emerald-500/20"; statusText = "Acerto (Green)"; valueDisplay = `+ ${visualPayout} BK`;
                } else if (pred.status === 'lost') {
                  statusColor = "text-red-400"; statusBg = "bg-red-500/10 border-red-500/20"; statusText = "Erro (Red)";
                }

                return (
                  <div key={pred.id} className="p-4 hover:bg-blue-800/30 transition-colors flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded border ${statusBg} ${statusColor}`}>{statusText}</span>
                        <span className="text-[10px] text-blue-400">{new Date(pred.timestamp).toLocaleDateString()}</span>
                      </div>
                      <p className="text-sm font-bold text-white">{isDeposit ? 'Transação BitKame' : isStore ? 'Kame Store' : (tA && tB ? `${tA.name} x ${tB.name}` : 'Aposta em Processamento')}</p>
                      
                      {isStore && <p className="text-xs text-blue-300 mt-0.5">Item: <b className="text-purple-300">{pred.productName}</b></p>}
                      {!isDeposit && !isStore && <p className="text-xs text-blue-300 mt-0.5">Sua Escolha: <b className="text-blue-100">{pred.option === 'A' ? tA?.name : pred.option === 'B' ? tB?.name : 'Empate'}</b></p>}
                    </div>
                    <div className="text-right w-full sm:w-auto bg-blue-950 sm:bg-transparent p-3 sm:p-0 rounded-lg sm:rounded-none border sm:border-0 border-blue-800">
                      <p className={`text-lg font-black ${pred.status === 'won' || isDeposit ? 'text-emerald-400' : pred.status === 'lost' || isStore ? 'text-red-400' : 'text-amber-400'}`}>{valueDisplay}</p>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>
      )}

      {bankTab === 'deposito' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {BK_PACKAGES.map(pkg => (
              <div key={pkg.id} onClick={() => handleStartCheckout(pkg)} className={`bg-gradient-to-b ${pkg.color} rounded-3xl p-1 shadow-xl hover:scale-105 transition-transform cursor-pointer relative group`}>
                <div className="bg-blue-950 rounded-[22px] p-6 h-full flex flex-col items-center justify-between">
                  <div className="text-center w-full"><p className="text-xs text-blue-300 font-bold uppercase mb-4">{pkg.name}</p><h4 className="text-4xl font-black text-white mb-1">{pkg.coins}</h4></div>
                  <button className={`w-full mt-6 py-3 rounded-xl font-black text-blue-950 uppercase bg-gradient-to-r ${pkg.color}`}>R$ {pkg.price.toFixed(2)}</button>
                </div>
              </div>
            ))}
        </div>
      )}

      {selectedPackage && (
        <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4 backdrop-blur-sm" onClick={checkoutStep === 'success' ? closeCheckout : null}>
          <div className="bg-blue-900 border border-blue-700 rounded-3xl w-full max-w-md p-6 sm:p-8 shadow-2xl relative" onClick={e => e.stopPropagation()}>
            {checkoutStep !== 'success' && checkoutStep !== 'generating' && <button onClick={closeCheckout} className="absolute top-4 right-4 text-blue-400 bg-blue-800 p-2 rounded-full"><X size={16}/></button>}
            
            {checkoutStep === 'generating' && <div className="text-center py-8"><div className="w-16 h-16 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto"></div></div>}
            
            {checkoutStep === 'waiting' && (
              <div className="space-y-6 text-center">
                <h3 className="text-2xl font-black text-white">Pagamento PIX</h3>
                <div className="bg-blue-950 p-5 rounded-2xl border border-blue-800"><p className="text-4xl font-black text-emerald-400">R$ {selectedPackage.price.toFixed(2)}</p></div>
                <div className="flex gap-2"><input type="text" readOnly value={pixPayload} className="flex-1 bg-blue-950 border border-blue-700 rounded-xl p-3 text-white text-xs font-mono" /><button onClick={handleCopyPix} className="bg-emerald-600 text-white px-4 rounded-xl font-bold">Copiar</button></div>
                {(currentUser?.role === 'leader' || currentUser?.role === 'kaioh') && <button onClick={simulateAutomaticWebhook} className="w-full bg-blue-800 text-blue-300 border border-blue-700 text-xs py-2 rounded-lg mt-4">Simular Pagamento</button>}
              </div>
            )}

            {checkoutStep === 'success' && (
              <div className="text-center py-6 space-y-6">
                <div className="w-24 h-24 bg-emerald-500/20 border-2 border-emerald-500 rounded-full flex items-center justify-center mx-auto"><CheckCircle className="text-emerald-400" size={48}/></div>
                <h3 className="text-3xl font-black text-white">Aprovado!</h3>
                <Button onClick={closeCheckout} className="w-full py-4 text-sm font-black bg-emerald-600">Voltar para o Banco</Button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
export default KameBank;
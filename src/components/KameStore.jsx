import React, { useState } from 'react';
import { ShoppingCart, Shield, Edit3, Image as ImageIcon, Zap, Hexagon, Clock, CheckCircle, Package, AlertCircle } from 'lucide-react';
import { updateDoc, setDoc } from 'firebase/firestore';
import { getPublicDocPath } from '../utils/firebase';
import ShieldDisplay from './ShieldDisplay';

const KameStore = ({ currentUser, users, teams, predictions, showToast }) => {
  const [activeTab, setActiveTab] = useState('store');
  const [isProcessing, setIsProcessing] = useState(false);
  
  const isAdmin = currentUser?.role === 'leader' || currentUser?.role === 'kaioh';

  const STORE_ITEMS = [
    { id: 'frame_ouro', name: 'Aura Ouro', cat: 'Cosmético', price: 1000, icon: Hexagon, color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/30', desc: 'Brilho dourado reluzente ao redor do seu escudo em todo o app.' },
    { id: 'frame_diamante', name: 'Aura Diamante', cat: 'Cosmético', price: 2000, icon: Hexagon, color: 'text-cyan-400', bg: 'bg-cyan-500/10', border: 'border-cyan-500/30', desc: 'Cristal azulado. O escudo fica maior e recebe destaque premium.' },
    { id: 'frame_fogo', name: 'Aura Fogo Infernal', cat: 'Cosmético', price: 3500, icon: Hexagon, color: 'text-red-500', bg: 'bg-red-500/10', border: 'border-red-500/30', desc: 'Chamas com animação pulsante ao vivo. Impõe respeito imediato na tabela.' },
    
    { id: 'fura_fila', name: 'Fura-Fila VIP', cat: 'Vantagem', price: 800, icon: Zap, color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/30', desc: 'Garanta sua vaga na próxima Copa Flash antes das inscrições abrirem para o público.' },
    { id: 'troca_nome', name: 'Troca de Nome', cat: 'Serviços', price: 500, icon: Edit3, color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/30', desc: 'Mude o nome do seu time oficialmente nos registros do clã no meio da temporada.' },
    { id: 'escudo_dls', name: 'Vetor Escudo DLS', cat: 'Design', price: 1200, icon: Shield, color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', desc: 'Criamos seu escudo e geramos o link limpo para colar dentro do jogo.' },
    { id: 'mockup_uni', name: 'Mockup 3D', cat: 'Design', price: 2000, icon: ImageIcon, color: 'text-purple-400', bg: 'bg-purple-500/10', border: 'border-purple-500/30', desc: 'Arte hiper-realista em 3D do seu uniforme para você postar nas redes sociais.' }
  ];

  const storeOrders = (predictions || []).filter(p => p.type === 'store').sort((a,b) => b.timestamp - a.timestamp);
  const myOrders = storeOrders.filter(p => p.userId === currentUser.id);

  const handleBuy = async (item) => {
      if ((currentUser.kameCoins || 0) < item.price) return showToast(`Saldo insuficiente!`, "error");
      if (!window.confirm(`Tem certeza que deseja comprar "${item.name}" por ${item.price} BK?`)) return;

      setIsProcessing(true);
      try {
          const newBalance = (currentUser.kameCoins || 0) - item.price;
          await updateDoc(getPublicDocPath('users', currentUser.id), { kameCoins: newBalance });

          const orderId = `store_${Date.now()}_${currentUser.id}`;
          await setDoc(getPublicDocPath('predictions', orderId), {
              id: orderId, userId: currentUser.id, type: 'store',
              productId: item.id, productName: item.name, amount: item.price,
              timestamp: Date.now(), status: 'pending'
          });

          showToast("Compra confirmada! Acesse 'Meus Pedidos'.", "success");
      } catch(e) {
          showToast("Erro ao processar a compra.", "error");
      }
      setIsProcessing(false);
  };

  // 🌟 O ADMIN ENTREGA O PEDIDO AQUI
  const handleDeliver = async (order) => {
      if (!window.confirm("Marcar este pedido como Entregue / Aplicado?")) return;

      // 🛡️ SE COMPROU UMA AURA, EQUIPA NO TIME AUTOMATICAMENTE!
      if (order.productId.startsWith('frame_')) {
          const userTeam = teams.find(t => t.ownerId === order.userId);
          if (userTeam) {
              await updateDoc(getPublicDocPath('teams', userTeam.id), { frame: order.productId });
          } else {
              showToast("Usuário não tem time para aplicar a aura, mas o pedido foi baixado.", "warning");
          }
      }

      await updateDoc(getPublicDocPath('predictions', order.id), { status: 'delivered' });
      showToast("Pedido finalizado com sucesso!", "success");
  };

  const getUserName = (id) => (users || []).find(u => u.id === id)?.name || 'Técnico';
  const getUserTeam = (id) => (teams || []).find(t => t.ownerId === id);

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-in fade-in pb-12">
      <div className="bg-gradient-to-r from-purple-900 to-indigo-950 p-6 rounded-3xl border border-purple-500/30 shadow-xl flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="bg-purple-950 p-3 rounded-full border border-purple-500/50"><ShoppingCart size={28} className="text-purple-400" /></div>
          <div><h2 className="text-2xl font-black text-white uppercase tracking-widest">Kame Store</h2><p className="text-sm text-purple-300 mt-1">Gaste seus BitKames com vantagens exclusivas.</p></div>
        </div>
        <div className="bg-purple-950/80 p-3 rounded-2xl border border-amber-500/40 text-center min-w-[150px]">
          <p className="text-[10px] text-amber-400 font-bold uppercase tracking-widest mb-0.5">Sua Carteira</p>
          <p className="text-2xl font-black text-white">{currentUser?.kameCoins || 0} <span className="text-sm text-amber-500">BK</span></p>
        </div>
      </div>

      <div className="flex gap-2 p-1 bg-blue-950 rounded-xl border border-blue-800 overflow-x-auto custom-scrollbar">
        <button onClick={()=>setActiveTab('store')} className={`shrink-0 flex-1 py-2.5 px-4 text-sm rounded-lg font-bold transition-all ${activeTab==='store'?'bg-purple-600 text-white shadow-md':'text-blue-500 hover:text-white'}`}>🛍️ Vitrine</button>
        <button onClick={()=>setActiveTab('my_orders')} className={`shrink-0 flex-1 py-2.5 px-4 text-sm rounded-lg font-bold transition-all ${activeTab==='my_orders'?'bg-emerald-600 text-white shadow-md':'text-blue-500 hover:text-white'}`}>📦 Meus Pedidos ({myOrders.length})</button>
        {isAdmin && <button onClick={()=>setActiveTab('admin')} className={`shrink-0 flex-1 py-2.5 px-4 text-sm rounded-lg font-bold transition-all ${activeTab==='admin'?'bg-red-600 text-white shadow-md':'text-red-400 hover:text-white border border-red-500/30'}`}>👑 Gestão de Entregas</button>}
      </div>

      {activeTab === 'store' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 animate-in slide-in-from-left-4">
           {STORE_ITEMS.map(item => {
              const Icon = item.icon; const canAfford = (currentUser.kameCoins || 0) >= item.price;
              return (
                 <div key={item.id} className="bg-blue-900/80 rounded-2xl border border-blue-800 overflow-hidden flex flex-col hover:border-purple-500/50 transition-all group shadow-lg">
                    <div className={`p-6 ${item.bg} border-b ${item.border} flex flex-col items-center justify-center text-center relative`}>
                       <span className={`absolute top-3 left-3 text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded border ${item.border} ${item.color}`}>{item.cat}</span>
                       <Icon size={48} className={`${item.color} mt-4 mb-3 group-hover:scale-110 transition-transform drop-shadow-lg`} />
                       <h3 className="text-lg font-black text-white uppercase tracking-wider">{item.name}</h3>
                    </div>
                    <div className="p-5 flex-1 flex flex-col justify-between gap-4">
                       <p className="text-sm text-blue-300 text-center leading-relaxed">{item.desc}</p>
                       <button onClick={() => handleBuy(item)} disabled={isProcessing} className={`w-full py-3 rounded-xl font-black uppercase tracking-widest transition-all shadow-md ${canAfford ? 'bg-amber-600 hover:bg-amber-500 text-white' : 'bg-blue-950 text-blue-600 border border-blue-800 cursor-not-allowed'}`}>
                          {isProcessing ? 'Processando...' : `${item.price} BK`}
                       </button>
                    </div>
                 </div>
              )
           })}
        </div>
      )}

      {activeTab === 'my_orders' && (
        <div className="bg-blue-900 rounded-3xl border border-blue-800 shadow-xl overflow-hidden animate-in slide-in-from-right-4">
          <div className="p-5 border-b border-blue-800 bg-blue-950/40"><h3 className="font-bold text-white flex items-center gap-2"><Package size={18} className="text-emerald-400"/> Acompanhamento de Pedidos</h3></div>
          <div className="divide-y divide-blue-800/40">
            {myOrders.length === 0 ? (<div className="p-8 text-center text-blue-500">Você ainda não comprou nada.</div>) : (
               myOrders.map(order => (
                  <div key={order.id} className="p-4 flex flex-col sm:flex-row justify-between sm:items-center gap-4 hover:bg-blue-800/20">
                     <div><p className="text-sm font-bold text-white mb-1">{order.productName}</p><p className="text-[10px] text-blue-400 font-mono">{new Date(order.timestamp).toLocaleString()}</p></div>
                     <div className="flex items-center gap-4">
                        <span className="text-amber-400 font-black text-sm">{order.amount} BK</span>
                        {order.status === 'delivered' ? <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1"><CheckCircle size={14}/> Entregue</span> : <span className="bg-purple-500/10 text-purple-400 border border-purple-500/20 px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1"><Clock size={14}/> Em Preparo</span>}
                     </div>
                  </div>
               ))
            )}
          </div>
        </div>
      )}

      {activeTab === 'admin' && isAdmin && (
        <div className="bg-blue-900 rounded-3xl border border-blue-800 shadow-xl overflow-hidden animate-in slide-in-from-right-4">
          <div className="p-5 border-b border-blue-800 bg-red-950/20"><h3 className="font-bold text-white flex items-center gap-2"><AlertCircle size={18} className="text-red-400"/> Fila de Entregas (Admin)</h3></div>
          <div className="divide-y divide-blue-800/40">
            {storeOrders.length === 0 ? (<div className="p-8 text-center text-blue-500">Nenhum pedido na loja ainda.</div>) : (
               storeOrders.map(order => {
                  const tObj = getUserTeam(order.userId);
                  return (
                     <div key={order.id} className="p-4 flex flex-col md:flex-row justify-between md:items-center gap-4 hover:bg-blue-800/20">
                        <div className="flex items-center gap-3">
                           <ShieldDisplay shield={tObj?.shield} size="small" />
                           <div>
                              <p className="text-sm font-bold text-white">{order.productName}</p>
                              <p className="text-xs text-blue-300 mt-0.5">De: <b className="text-blue-100">{getUserName(order.userId)}</b> {tObj ? `(${tObj.name})` : ''}</p>
                           </div>
                        </div>
                        <div className="flex items-center gap-4">
                           {order.status === 'delivered' ? (
                              <span className="text-emerald-500 text-xs font-bold flex items-center gap-1"><CheckCircle size={14}/> Finalizado</span>
                           ) : (
                              <button onClick={() => handleDeliver(order)} className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-md">
                                 Marcar como Entregue
                              </button>
                           )}
                        </div>
                     </div>
                  )
               })
            )}
          </div>
        </div>
      )}
    </div>
  );
};
export default KameStore;
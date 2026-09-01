import React, { useState } from 'react';
import { ShoppingCart, CheckCircle, UploadCloud, Trash2 } from 'lucide-react';
import { setDoc, deleteDoc } from 'firebase/firestore';
import { getPublicDocPath } from '../utils/firebase';
import { processImage } from '../utils/helpers';

const KameStore = ({ currentUser, storeProducts = [], showToast }) => {
  const isAdmin = currentUser?.role === 'leader' || currentUser?.role === 'kaioh';
  const [activeCategory, setActiveCategory] = useState('todos');
  const [showAddForm, setShowAddForm] = useState(false);

  // Estado do formulário de novo produto
  const [newProd, setNewProd] = useState({
    name: '', price: '', category: 'mobile', partner: 'Shopee', badge: '', url: '', image: null
  });

  const handleAddProduct = async (e) => {
    e.preventDefault();
    if (!newProd.image) { showToast("Faça o upload da foto do produto!", "error"); return; }
    
    const id = `prod_${Date.now()}`;
    try {
      await setDoc(getPublicDocPath('store', id), { ...newProd, id, timestamp: Date.now() });
      setShowAddForm(false);
      setNewProd({ name: '', price: '', category: 'mobile', partner: 'Shopee', badge: '', url: '', image: null });
      showToast("Produto adicionado à vitrine com sucesso!", "success");
    } catch (error) {
      showToast("Erro ao salvar produto no banco de dados.", "error");
    }
  };

  const handleDelete = async (id) => {
    if(window.confirm("Deseja remover este produto da loja definitivamente?")) {
      await deleteDoc(getPublicDocPath('store', id));
      showToast("Produto removido.", "success");
    }
  };

  // Filtra e ordena os produtos (mais novos primeiro)
  const filteredProducts = (activeCategory === 'todos' ? storeProducts : storeProducts.filter(p => p.category === activeCategory))
    .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-in fade-in pb-12">
      
      {/* 🚀 DESTAQUE / BANNER */}
      <div className="bg-gradient-to-r from-emerald-900 via-blue-900 to-blue-950 p-6 rounded-3xl border border-emerald-500/30 shadow-xl flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden">
        <div className="absolute -right-20 -bottom-20 w-64 h-64 bg-emerald-500/20 blur-3xl rounded-full"></div>
        <div className="z-10 w-full md:w-auto flex-1 text-center md:text-left">
          <span className="text-[10px] bg-emerald-500 text-blue-950 px-2 py-1 rounded-full font-black tracking-widest uppercase mb-3 inline-block shadow-lg">Lançamento</span>
          <h2 className="text-3xl md:text-4xl font-black text-white uppercase tracking-wider mb-2">Kame Store</h2>
          <p className="text-blue-300 md:w-3/4">O shopping do Clã. Compre com desconto nos nossos parceiros, envie o comprovante para a diretoria e <b>ganhe Kame Coins de Cashback</b> na hora!</p>
        </div>
        
        {isAdmin && (
          <div className="z-10 shrink-0 flex flex-col gap-2 w-full md:w-auto">
            <button onClick={() => setShowAddForm(!showAddForm)} className="bg-amber-600 hover:bg-amber-500 text-white font-bold py-2.5 px-6 rounded-xl shadow-lg transition-colors flex items-center justify-center gap-2">
              {showAddForm ? '❌ Cancelar Inclusão' : '➕ Anunciar Produto'}
            </button>
          </div>
        )}
      </div>

      {/* 🛠️ PAINEL ADMIN: ADICIONAR PRODUTO */}
      {isAdmin && showAddForm && (
        <form onSubmit={handleAddProduct} className="bg-blue-900 p-6 rounded-3xl border border-amber-500/50 shadow-2xl animate-in slide-in-from-top-4 space-y-4">
          <h3 className="font-bold text-amber-400 uppercase tracking-widest border-b border-blue-800 pb-2 mb-4">Adicionar Novo Produto na Loja</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] text-blue-400 font-bold uppercase">Nome do Produto</label>
              <input required type="text" placeholder="Ex: Luvinha Gamer Fio de Prata" value={newProd.name} onChange={e=>setNewProd({...newProd, name: e.target.value})} className="w-full bg-blue-950 border border-blue-700 rounded-lg p-2.5 text-white text-sm outline-none focus:border-amber-500" />
            </div>
            
            <div className="space-y-1">
              <label className="text-[10px] text-blue-400 font-bold uppercase">Preço (Com R$)</label>
              <input required type="text" placeholder="Ex: R$ 15,90" value={newProd.price} onChange={e=>setNewProd({...newProd, price: e.target.value})} className="w-full bg-blue-950 border border-blue-700 rounded-lg p-2.5 text-emerald-400 font-black text-sm outline-none focus:border-amber-500" />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] text-blue-400 font-bold uppercase">Categoria</label>
              <select value={newProd.category} onChange={e=>setNewProd({...newProd, category: e.target.value})} className="w-full bg-blue-950 border border-blue-700 rounded-lg p-2.5 text-white text-sm outline-none focus:border-amber-500">
                <option value="mobile">🎮 Setup Mobile</option>
                <option value="cards">💎 Gift Cards</option>
                <option value="energy">⚡ Energia e Foco</option>
                <option value="lifestyle">🧔 Lifestyle Masculino</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] text-blue-400 font-bold uppercase">Seu Link de Afiliado (Shopee/Amazon)</label>
              <input required type="url" placeholder="https://shope.ee/exemplo" value={newProd.url} onChange={e=>setNewProd({...newProd, url: e.target.value})} className="w-full bg-blue-950 border border-blue-700 rounded-lg p-2.5 text-blue-200 text-sm outline-none focus:border-amber-500" />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] text-blue-400 font-bold uppercase">Loja Parceira</label>
              <input required type="text" placeholder="Ex: Shopee, Amazon, HypeGames..." value={newProd.partner} onChange={e=>setNewProd({...newProd, partner: e.target.value})} className="w-full bg-blue-950 border border-blue-700 rounded-lg p-2.5 text-white text-sm outline-none focus:border-amber-500" />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] text-blue-400 font-bold uppercase">Etiqueta de Destaque (Opcional)</label>
              <input type="text" placeholder="Ex: Mais Vendido, Frete Grátis..." value={newProd.badge} onChange={e=>setNewProd({...newProd, badge: e.target.value})} className="w-full bg-blue-950 border border-blue-700 rounded-lg p-2.5 text-white text-sm outline-none focus:border-amber-500" />
            </div>
            
            {/* UPLOAD DA FOTO */}
            <div className="md:col-span-2 pt-2">
              <label className="text-[10px] text-blue-400 font-bold uppercase block mb-2">Foto do Produto (Tire um print ou salve do Google)</label>
              <label className={`block border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-colors ${newProd.image ? 'border-emerald-500 bg-emerald-500/10' : 'border-blue-700 hover:border-blue-500 bg-blue-950'}`}>
                <input type="file" accept="image/*" className="hidden" onChange={(e) => processImage(e.target.files[0], (base64) => setNewProd({...newProd, image: base64}))} />
                {newProd.image ? (
                  <div className="flex flex-col items-center justify-center gap-2">
                    <img src={newProd.image} alt="Preview" className="h-20 object-contain rounded" />
                    <span className="text-emerald-400 font-bold text-xs"><CheckCircle size={14} className="inline"/> Foto Carregada</span>
                  </div>
                ) : (
                  <span className="text-blue-300 font-bold flex items-center justify-center gap-2 text-sm"><UploadCloud size={20}/> Clique para enviar a foto da Galeria</span>
                )}
              </label>
            </div>
          </div>
          
          <div className="pt-4 border-t border-blue-800 flex justify-end">
            <button type="submit" className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 px-8 rounded-xl shadow-lg transition-colors">
              ✅ Publicar Produto na Loja
            </button>
          </div>
        </form>
      )}

      {/* 🏷️ FILTROS */}
      <div className="flex gap-2 p-1 bg-blue-950 rounded-xl border border-blue-800 overflow-x-auto custom-scrollbar">
        <button onClick={()=>setActiveCategory('todos')} className={`shrink-0 flex-1 py-2 px-4 text-xs rounded-lg font-bold transition-all ${activeCategory==='todos'?'bg-emerald-600 text-white shadow-md':'text-blue-500 hover:text-white'}`}>Tudo</button>
        <button onClick={()=>setActiveCategory('mobile')} className={`shrink-0 flex-1 py-2 px-4 text-xs rounded-lg font-bold transition-all ${activeCategory==='mobile'?'bg-emerald-600 text-white shadow-md':'text-blue-500 hover:text-white'}`}>🎮 Setup Mobile</button>
        <button onClick={()=>setActiveCategory('cards')} className={`shrink-0 flex-1 py-2 px-4 text-xs rounded-lg font-bold transition-all ${activeCategory==='cards'?'bg-emerald-600 text-white shadow-md':'text-blue-500 hover:text-white'}`}>💎 Gift Cards</button>
        <button onClick={()=>setActiveCategory('energy')} className={`shrink-0 flex-1 py-2 px-4 text-xs rounded-lg font-bold transition-all ${activeCategory==='energy'?'bg-emerald-600 text-white shadow-md':'text-blue-500 hover:text-white'}`}>⚡ Energia e Foco</button>
        <button onClick={()=>setActiveCategory('lifestyle')} className={`shrink-0 flex-1 py-2 px-4 text-xs rounded-lg font-bold transition-all ${activeCategory==='lifestyle'?'bg-emerald-600 text-white shadow-md':'text-blue-500 hover:text-white'}`}>🧔 Lifestyle</button>
      </div>

      {/* 🛍️ VITRINE DE PRODUTOS */}
      {storeProducts.length === 0 ? (
        <div className="bg-blue-950 p-12 rounded-3xl border border-blue-800 text-center border-dashed">
          <ShoppingCart className="mx-auto text-blue-800 mb-4" size={48} />
          <p className="text-blue-500 font-bold text-lg">A loja está vazia no momento.</p>
          <p className="text-blue-400 text-sm mt-1">Líderes podem adicionar produtos pelo botão acima.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
          {filteredProducts.map(product => (
            <div key={product.id} className="bg-blue-900 border border-blue-800 rounded-2xl overflow-hidden hover:border-emerald-500/50 hover:shadow-[0_0_20px_rgba(16,185,129,0.15)] transition-all group flex flex-col relative">
              
              {/* Botão Apagar (Admin) */}
              {isAdmin && (
                <button onClick={() => handleDelete(product.id)} className="absolute top-2 right-2 bg-red-500/80 hover:bg-red-500 text-white p-1.5 rounded-full z-20 backdrop-blur" title="Apagar Produto">
                  <Trash2 size={12} />
                </button>
              )}

              <div className="h-48 bg-white relative overflow-hidden flex items-center justify-center p-4">
                <span className="absolute top-2 left-2 bg-black/80 text-white text-[9px] font-bold px-2 py-0.5 rounded uppercase tracking-wider backdrop-blur-md z-10 border border-white/10">{product.partner}</span>
                {product.badge && <span className="absolute top-2 right-8 bg-emerald-500 text-blue-950 text-[9px] font-black px-2 py-0.5 rounded uppercase tracking-wider z-10 shadow-md">{product.badge}</span>}
                <img src={product.image} alt={product.name} className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-500" />
              </div>
              
              <div className="p-5 flex flex-col flex-1 justify-between">
                <div>
                  <h3 className="font-bold text-blue-100 text-sm leading-snug group-hover:text-emerald-400 transition-colors line-clamp-2">{product.name}</h3>
                  <p className="text-2xl font-black text-white mt-2 mb-4">{product.price}</p>
                </div>
                
                <a href={product.url} target="_blank" rel="noreferrer" className="w-full bg-blue-800 hover:bg-emerald-600 text-white font-bold py-2.5 rounded-xl text-xs flex items-center justify-center gap-2 transition-all shadow-md group-hover:shadow-emerald-900/50">
                  <ShoppingCart size={14}/> Acessar Loja
                </a>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="bg-blue-950 p-6 rounded-2xl border border-blue-800 text-center border-dashed">
        <p className="text-blue-400 text-sm">Ao comprar através dos nossos links, você apoia o Clã Kame a financiar as premiações e torneios futuros! 🤝</p>
      </div>

    </div>
  );
};

export default KameStore;

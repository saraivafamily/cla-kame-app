import React, { useState } from 'react';
import { Dices, Gift, Crown, Search, X, Users, Trash2, ArrowLeft, PlusCircle, PlayCircle } from 'lucide-react';
import ShieldDisplay from './ShieldDisplay';
import Button from './Button';

const GeneralDraw = ({ teams, onBack }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTeams, setSelectedTeams] = useState([]);
  const [showDrawModal, setShowDrawModal] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawWinner, setDrawWinner] = useState(null);

  // Puxa todos os times ativos do clã
  const availableTeams = (teams || [])
    .filter(t => t.status !== 'inactive')
    .sort((a, b) => a.name.localeCompare(b.name));

  // Filtra pela barra de pesquisa
  const filteredTeams = availableTeams.filter(t => 
    t.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (t.coach && t.coach.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const toggleTeam = (team) => {
    if (selectedTeams.find(t => t.id === team.id)) {
      setSelectedTeams(prev => prev.filter(t => t.id !== team.id));
    } else {
      setSelectedTeams(prev => [...prev, team]);
    }
  };

  const addAllFiltered = () => {
    const newAdditions = filteredTeams.filter(ft => !selectedTeams.find(st => st.id === ft.id));
    setSelectedTeams(prev => [...prev, ...newAdditions]);
  };

  const clearUrna = () => {
    if(window.confirm("Deseja esvaziar a urna?")) setSelectedTeams([]);
  };

  const handleStartDraw = () => {
    if (selectedTeams.length < 2) return alert("Adicione pelo menos 2 times na urna para realizar um sorteio!");
    
    setDrawWinner(null);
    setShowDrawModal(true);
    setIsDrawing(true);

    // Suspense da Roleta
    setTimeout(() => {
        const randomIndex = Math.floor(Math.random() * selectedTeams.length);
        setDrawWinner(selectedTeams[randomIndex]);
        setIsDrawing(false);
    }, 4000);
  };

  return (
    <div className="space-y-6 animate-in fade-in pb-10 max-w-5xl mx-auto min-h-screen">
      
      <div className="flex justify-between items-center">
        <button onClick={onBack} className="flex items-center gap-1.5 text-xs text-blue-400 hover:text-white transition-colors">
          <ArrowLeft size={16}/> Voltar
        </button>
      </div>

      <div className="bg-gradient-to-r from-blue-900 to-indigo-950 p-6 rounded-3xl border border-indigo-500/30 shadow-xl flex flex-col md:flex-row items-center justify-between gap-4 relative overflow-hidden">
        <div className="absolute -right-5 -top-5 opacity-10 pointer-events-none">
           <Dices size={120} />
        </div>
        <div className="relative z-10">
          <h2 className="text-xl md:text-2xl font-black text-indigo-400 uppercase tracking-widest flex items-center gap-2">
            <Dices size={24} /> Roleta do Clã Livre
          </h2>
          <p className="text-blue-300 text-xs md:text-sm mt-1">Adicione os times na urna e faça sorteios customizados.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
         
         {/* 🔍 PAINEL ESQUERDO: SELEÇÃO DE TIMES */}
         <div className="bg-blue-950/40 border border-blue-800 rounded-2xl p-5 shadow-lg flex flex-col h-full">
            <h3 className="text-sm font-black text-white uppercase tracking-widest mb-4 border-b border-blue-800 pb-3">Lista de Membros</h3>
            
            <div className="bg-blue-900/50 border border-blue-700 p-2.5 rounded-xl flex items-center gap-3 mb-4 focus-within:border-indigo-500 transition-colors">
              <Search size={18} className="text-blue-500 ml-2 shrink-0" />
              <input 
                type="text" 
                placeholder="Buscar time ou técnico..." 
                value={searchTerm} 
                onChange={e => setSearchTerm(e.target.value)} 
                className="w-full bg-transparent text-white outline-none text-xs"
              />
            </div>

            <button onClick={addAllFiltered} className="mb-4 bg-blue-900 hover:bg-blue-800 text-blue-300 text-[10px] font-bold uppercase tracking-widest py-2 rounded-lg border border-blue-700 transition-colors">
               + Adicionar todos os {filteredTeams.length} times visíveis
            </button>

            <div className="flex flex-col gap-2 flex-1 overflow-y-auto custom-scrollbar pr-1 max-h-[500px]">
               {filteredTeams.map(team => {
                 const isSelected = selectedTeams.find(t => t.id === team.id);
                 return (
                   <div key={team.id} onClick={() => toggleTeam(team)} className={`p-3 rounded-xl border flex items-center justify-between gap-3 cursor-pointer transition-all ${isSelected ? 'bg-indigo-900/40 border-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.3)]' : 'bg-blue-950/50 border-blue-800 hover:border-blue-600'}`}>
                     <div className="flex items-center gap-3 min-w-0">
                       <ShieldDisplay shield={team.shield} size="small" />
                       <div className="flex flex-col min-w-0">
                         <span className={`text-xs font-bold truncate ${isSelected ? 'text-white' : 'text-blue-200'}`}>{team.name}</span>
                         <span className="text-[9px] text-blue-400 truncate">{team.coach}</span>
                       </div>
                     </div>
                     {isSelected ? <X size={16} className="text-indigo-400 shrink-0"/> : <PlusCircle size={16} className="text-blue-600 shrink-0"/>}
                   </div>
                 );
               })}
               {filteredTeams.length === 0 && <p className="text-xs text-blue-500/50 text-center py-4">Nenhum time encontrado.</p>}
            </div>
         </div>

         {/* 🎁 PAINEL DIREITO: A URNA E SORTEIO */}
         <div className="bg-gradient-to-b from-indigo-950/40 to-blue-950/40 border border-indigo-500/30 rounded-2xl p-5 shadow-lg flex flex-col h-full">
            <div className="flex justify-between items-center border-b border-indigo-500/30 pb-3 mb-4">
               <h3 className="text-sm font-black text-indigo-400 uppercase tracking-widest flex items-center gap-2">
                 <Users size={16}/> A Urna <span className="text-white">({selectedTeams.length})</span>
               </h3>
               <button onClick={clearUrna} className="text-[10px] text-red-400 hover:text-red-300 flex items-center gap-1 font-bold uppercase tracking-widest transition-colors">
                  <Trash2 size={12}/> Limpar Urna
               </button>
            </div>

            <div className="flex flex-col gap-2 flex-1 overflow-y-auto custom-scrollbar pr-1 max-h-[400px] mb-4">
               {selectedTeams.length === 0 ? (
                 <div className="flex-1 flex flex-col items-center justify-center opacity-50 py-10">
                    <Gift size={48} className="text-blue-700 mb-3" />
                    <p className="text-xs text-blue-400 text-center px-4">Urna vazia.<br/>Clique nos times ao lado para adicioná-los ao sorteio.</p>
                 </div>
               ) : (
                 selectedTeams.map(team => (
                   <div key={team.id} className="p-2.5 rounded-lg border border-indigo-500/30 bg-indigo-900/20 flex items-center justify-between gap-3 animate-in slide-in-from-right-2">
                     <div className="flex items-center gap-3 min-w-0">
                       <ShieldDisplay shield={team.shield} size="small" />
                       <span className="text-xs font-bold text-white truncate">{team.name}</span>
                     </div>
                     <button onClick={() => toggleTeam(team)} className="text-blue-500 hover:text-red-400 shrink-0"><X size={14}/></button>
                   </div>
                 ))
               )}
            </div>

            <Button onClick={handleStartDraw} disabled={selectedTeams.length < 2} className={`w-full py-4 text-sm font-black uppercase tracking-widest shadow-lg flex items-center justify-center gap-2 ${selectedTeams.length >= 2 ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-[0_0_20px_rgba(79,70,229,0.4)]' : 'bg-blue-900/50 text-blue-600 border-blue-800'}`}>
               <PlayCircle size={18} /> Girar Roleta Oficial
            </Button>
         </div>

      </div>

      {/* 🌟 MODAL DO RESULTADO */}
      {showDrawModal && (
        <div className="fixed inset-0 bg-black/90 z-[100] flex items-center justify-center p-4 backdrop-blur-md animate-in fade-in">
           <div className="bg-blue-950 border-2 border-indigo-500 rounded-3xl w-full max-w-md p-6 text-center shadow-[0_0_50px_rgba(99,102,241,0.3)] relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-indigo-500/20 via-blue-950/0 to-blue-950/0 pointer-events-none"></div>

              <Gift size={64} className={`mx-auto mb-4 ${isDrawing ? 'text-indigo-400 animate-bounce' : 'text-emerald-400 drop-shadow-[0_0_15px_rgba(52,211,153,0.8)]'}`} />
              
              <h2 className="text-2xl font-black text-white uppercase tracking-widest mb-2 relative z-10">
                 {isDrawing ? 'Girando a Roleta...' : 'Temos um Vencedor!'}
              </h2>
              
              <p className="text-xs text-blue-300 mb-6 relative z-10">
                 {isDrawing ? `Sorteando a sorte entre os ${selectedTeams.length} times da urna...` : 'O grande vencedor do sorteio livre é:'}
              </p>

              <div className="bg-blue-900 border border-blue-700 rounded-2xl p-6 mb-6 min-h-[140px] flex items-center justify-center shadow-inner relative z-10">
                 {isDrawing ? (
                    <div className="flex flex-col items-center animate-pulse">
                       <Dices size={40} className="text-indigo-400 mb-2 animate-spin-slow" />
                       <span className="text-indigo-400 font-black tracking-widest">CRUZANDO OS DEDOS</span>
                    </div>
                 ) : (
                    <div className="animate-in zoom-in duration-500 flex flex-col items-center w-full">
                       <Crown size={40} className="text-amber-400 mb-3 drop-shadow-md" />
                       <ShieldDisplay shield={drawWinner?.shield} size="normal" />
                       <h3 className="text-2xl font-black text-amber-400 drop-shadow-lg leading-tight mt-3">{drawWinner?.name}</h3>
                       <p className="text-xs text-emerald-400 font-bold mt-1 uppercase tracking-widest">Técnico: {drawWinner?.coach}</p>
                    </div>
                 )}
              </div>

              <Button onClick={() => setShowDrawModal(false)} disabled={isDrawing} className="w-full relative z-10 bg-indigo-600 hover:bg-indigo-500 text-white py-3 shadow-md">
                 {isDrawing ? 'Aguarde o sorteio...' : 'Fechar'}
              </Button>
           </div>
        </div>
      )}

    </div>
  );
};

export default GeneralDraw;
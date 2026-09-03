import React, { useState, useEffect } from 'react';
import { Trophy, Star, Edit } from 'lucide-react';
import Button from './Button';

const RecordsWall = ({ showToast, currentUser, globalRecords, onSaveRecords }) => {
  const isAdmin = currentUser?.role === 'leader' || currentUser?.role === 'kaioh';

  const Records = [
    {
      title: "🔥 Melhor Campanha (Divisão Lendária)",
      description: "Desempenho perfeito na liga mais difícil",
      items: [
        { rank: "🥇", name: "Gustavo", team: "Fúria", metric: "15 Vitórias • 0 GS • 130 GF", isHero: true },
        { rank: "🥈", name: "Augusto", team: "Cupiuba City", metric: "15 Vitórias • 0 GS • 109 GF" },
        { rank: "🥉", name: "Michael", team: "Xores Galaxy", metric: "15 Vitórias • 0 GS • 102 GF" }
      ]
    },
    {
      title: "👑 Artilheiro de Temporada",
      description: "Maior número de gols acumulados numa edição",
      items: [
        { rank: "🥇", name: "Gustavo", team: "Fúria", metric: "101 Gols", isHero: true },
        { rank: "🥈", name: "Carlos", team: "Los Craques", metric: "95 Gols" },
        { rank: "🥉", name: "Carlos", team: "Los Craques", metric: "88 Gols" }
      ]
    },
    {
      title: "👟 Melhor Garçom de Temporada",
      description: "Líder absoluto em assistências na edição",
      items: [
        { rank: "🥇", name: "Gustavo", team: "Fúria", metric: "158 Assistências", isHero: true },
        { rank: "🥈", name: "Edilan", team: "Bragantino", metric: "64 Assistências" },
        { rank: "🥉", name: "Carlos", team: "Los Craques", metric: "48 Assistências" }
      ]
    },
    {
      title: "🚀 Maior Distância de Gol",
      description: "Chutes antológicos de trás do meio de campo",
      items: [
        { rank: "🥇", name: "Augusto", team: "Cupyuba City", metric: "96 Metros", isHero: true },
        { rank: "🥈", name: "Luck", team: "Don Remo", metric: "92 Metros" },
        { rank: "🥉", name: "Gustavo", team: "Fúria", metric: "85 Metros" }
      ]
    },
    {
      title: "⚽ Gols num Mesmo Jogo",
      description: "Extermínio ofensivo em uma única partida",
      items: [
        { rank: "🥇", name: "Neto", team: "Sport Belém", metric: "12 Gols", isHero: true },
        { rank: "🥈", name: "Almeida", team: "Maranhão EC", metric: "12 Gols", isHero: true },
        { rank: "🥉", name: "Gustavo", team: "Fúria", metric: "11 Gols" }
      ]
    },
    {
      title: "⚡ Hat-trick Mais Rápido",
      description: "Três gols marcados em tempo recorde no cronômetro",
      items: [
        { rank: "🥇", name: "Augusto", team: "Cupyuba City", metric: "Minuto 6'", isHero: true },
        { rank: "🥈", name: "Neto", team: "Sport Belém", metric: "Minuto 8'" },
        { rank: "🥉", name: "Luck", team: "Don Remo", metric: "Minuto 8'" }
      ]
    },
    {
      title: "🥖 Melhor Garçom de uma Partida",
      description: "Garçom de elite em um único confronto",
      items: [
        { rank: "🥇", name: "Gustavo", team: "Fúria", metric: "7 Assistências", isHero: true },
        { rank: "🥈", name: "Rafael", team: "Varginha", metric: "6 Assistências" },
        { rank: "🥉", name: "CARLOS", team: "Los Craques", metric: "6 Assistências" }
      ]
    },
    {
      title: "💎 Maior Farmador de Temporada",
      description: "Dedicação total acumulando pontos para o Clã",
      items: [
        { rank: "🥇", name: "Vinizin", team: "CONFIANÇA", metric: "1.812.845 Clã Points", isHero: true },
        { rank: "🥈", name: "Aguardando Recordista", team: "---", metric: "0 pts" },
        { rank: "🥉", name: "Aguardando Recordista", team: "---", metric: "0 pts" }
      ]
    }
  ];

  const [records, setRecords] = useState(() => {
    try {
      const savedLocal = localStorage.getItem('kame_records_db');
      if (globalRecords && globalRecords.length > 0) return globalRecords;
      if (savedLocal) return JSON.parse(savedLocal);
    } catch(e) {}
    return Records;
  });

  useEffect(() => {
    if (globalRecords && globalRecords.length > 0) setRecords(globalRecords);
  }, [globalRecords]);

  const [editingIdx, setEditingIdx] = useState(null);
  const [editForm, setEditForm] = useState(null);

  const startEdit = (idx, category) => {
    setEditingIdx(idx);
    setEditForm(JSON.parse(JSON.stringify(category))); 
  };

  const handleItemChange = (itemIdx, field, value) => {
    const newData = { ...editForm };
    newData.items[itemIdx][field] = value;
    setEditForm(newData);
  };

  const saveEdit = () => {
    const newRecords = [...records];
    newRecords[editingIdx] = editForm;
    
    setRecords(newRecords);
    setEditingIdx(null);
    try { localStorage.setItem('kame_records_db', JSON.stringify(newRecords)); } catch(e){} 

    if (onSaveRecords) {
       onSaveRecords(newRecords);
    } else {
       showToast("Salvo com sucesso! (Visível localmente)", "success");
    }
  };

  const captureWall = () => {
    showToast("Preparando imagem dos Recordes Lendários...", "success");
    
    const captureAndDownload = () => {
      const element = document.getElementById('capture-records-mural');
      if (!element) return;
      window.html2canvas(element, { backgroundColor: '#020617', scale: 2, useCORS: true }).then(canvas => {
        const link = document.createElement('a');
        link.download = `Mural-de-Recordes-Kame.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
        showToast("Mural salvo com sucesso!", "success");
      });
    };

    if (window.html2canvas) { 
      captureAndDownload(); 
    } else {
      const script = document.createElement('script');
      script.src = "https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js";
      script.onload = captureAndDownload;
      document.body.appendChild(script);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in pb-12">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-gradient-to-r from-blue-900 to-blue-950 p-5 rounded-2xl border border-blue-800 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="text-3xl animate-pulse">🏅</div>
          <div>
            <h2 className="text-xl font-black text-white uppercase tracking-wider">Hall da Fama & Recordes</h2>
            <p className="text-[10px] text-amber-400 font-bold uppercase tracking-widest mt-0.5">Os maiores feitos da história do Clã Kame</p>
          </div>
        </div>
        <Button onClick={captureWall} className="text-xs bg-amber-600 hover:bg-amber-500 py-2 px-4 shadow-md font-bold text-blue-950 flex items-center gap-1.5 border-0"><Camera size={14}/> Print do Mural</Button>
      </div>

      <div id="capture-records-mural" className="p-2 sm:p-4 rounded-3xl space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {records.map((category, idx) => {
            if (editingIdx === idx) {
              return (
                <div key={idx} className="bg-blue-950 border border-amber-500/50 rounded-2xl p-4 md:p-5 shadow-lg relative animate-in zoom-in-95 duration-200">
                  <h3 className="font-black text-amber-400 uppercase tracking-wide mb-4">✏️ Atualizando: {editForm.title}</h3>
                  <div className="space-y-3">
                    {editForm.items.map((item, i) => (
                      <div key={i} className="bg-blue-900/40 p-3 rounded-xl border border-blue-800 space-y-2">
                        <span className="text-[10px] font-bold text-blue-300 uppercase tracking-widest">{i + 1}º Colocado ({item.rank})</span>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <input type="text" value={item.name} onChange={e => handleItemChange(i, 'name', e.target.value)} placeholder="Nome do Jogador" className="bg-blue-950 text-white text-xs p-2 rounded border border-blue-700 outline-none focus:border-amber-500" />
                          <input type="text" value={item.team} onChange={e => handleItemChange(i, 'team', e.target.value)} placeholder="Nome do Time" className="bg-blue-950 text-white text-xs p-2 rounded border border-blue-700 outline-none focus:border-amber-500" />
                          <input type="text" value={item.metric} onChange={e => handleItemChange(i, 'metric', e.target.value)} placeholder="Métrica (ex: 101 Gols)" className="bg-blue-950 text-white text-xs p-2 rounded border border-blue-700 outline-none focus:border-amber-500 sm:col-span-2" />
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-blue-800">
                    <Button variant="outline" onClick={() => setEditingIdx(null)} className="text-xs py-1.5 px-3">Cancelar</Button>
                    <Button onClick={saveEdit} className="text-xs py-1.5 px-4 bg-amber-600 hover:bg-amber-500 text-white border-0 shadow-md">Salvar Mudanças</Button>
                  </div>
                </div>
              );
            }

            return (
              <div key={idx} className="bg-blue-950/70 border border-blue-800/80 rounded-2xl p-4 md:p-5 relative overflow-hidden shadow-lg hover:border-amber-500/30 transition-all group">
                <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-amber-500/40 to-transparent"></div>
                
                <div className="mb-4 flex justify-between items-start gap-2">
                  <div>
                    <h3 className="font-black text-white text-sm md:text-base uppercase tracking-wide group-hover:text-amber-400 transition-colors">{category.title}</h3>
                    <p className="text-[10px] text-blue-400 font-medium mt-0.5">{category.description}</p>
                  </div>
                  {isAdmin && (
                    <button onClick={() => startEdit(idx, category)} className="text-blue-500 hover:text-amber-400 bg-blue-900/50 p-1.5 rounded-lg border border-blue-800 transition-colors shrink-0" title="Editar Recordes">
                      <Edit size={14} />
                    </button>
                  )}
                </div>

                <div className="space-y-2">
                  {category.items.map((item, keyIdx) => (
                    <div key={keyIdx} className={`p-2.5 rounded-xl border flex items-center justify-between gap-3 ${item.isHero ? 'bg-gradient-to-r from-amber-500/10 to-blue-900/40 border-amber-500/20' : 'bg-blue-900/40 border-blue-800/40'}`}>
                      <div className="flex items-center gap-3">
                        <span className="text-base shrink-0 select-none">{item.rank}</span>
                        {/* 🛡️ CORREÇÃO DO RECORTE AQUI: Sem truncate e com flex-col para respirar */}
                        <div className="flex flex-col justify-center py-0.5">
                          <span className={`text-xs font-bold leading-tight ${item.isHero ? 'text-amber-400 font-black' : 'text-blue-100'}`}>{item.name}</span>
                          <span className="text-[10px] text-blue-400 leading-tight font-medium mt-0.5">Clube: {item.team}</span>
                        </div>
                      </div>
                      <span className={`text-[11px] font-black font-mono shrink-0 px-2 py-1 rounded bg-blue-950 shadow-inner ${item.isHero ? 'text-emerald-400 border border-emerald-500/10' : 'text-blue-300'}`}>
                        {item.metric}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default RecordsWall;

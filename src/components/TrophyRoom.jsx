import React, { useMemo } from 'react';
import { Trophy, Crown, Medal, Star } from 'lucide-react';
import ShieldDisplay from './ShieldDisplay';
import { getChampionIds } from '../utils/torneios';
  
const TrophyRoom = ({ competitions, matches, teams }) => {
  const CATEGORY_NAMES = {
    liga_a: '🥇 Liga Kame A', liga_b: '🥈 Liga Kame B', liga_c: '🥉 Liga Kame C', liga_d: '🎖️ Liga Kame D',
    liga_acesso: '⬆️ Liga de Acesso', copa_main: '🏆 Copas Oficiais', copa_estrelas: '⭐ Copa das Estrelas',
    copa_do_rei: '👑 Copa do Rei', copa_amazonia: '🌳 Copa da Amazônia', copa_flash: '⚡ Copa Flash', copa_flash_dupla: '👥 Copa Flash (Duplas)'
  };

  // 🧠 MOTOR ÚNICO: Extrai e agrupa campeões (Travado para APENAS campeonatos Finalizados)
  const getProcessedChampions = () => {
    const stats = {};
    
    (competitions || []).forEach(c => {
       // 🛡️ TRAVA ABSOLUTA: Ignora qualquer torneio que o Líder ainda não clicou em "Encerrar Torneio"
       if (c.status !== 'finished') return;

       const champs = getChampionIds(c, matches, teams);
       if (champs && champs.length > 0) {
          const cat = c.category || 'outros';
          if (!stats[cat]) stats[cat] = {};
          
          // 🛡️ Lógica para Agrupar as Duplas como 1 único título
          if (cat === 'copa_flash_dupla' && champs.length >= 2) {
             const sortedIds = [champs[0], champs[1]].sort();
             const duoKey = `dupla_${sortedIds[0]}_${sortedIds[1]}`;
             
             let duoName = "Dupla Campeã";
             if (c.groups && Array.isArray(c.groups)) {
                const duoObj = c.groups.find(d => 
                   (d.p1 === champs[0] && d.p2 === champs[1]) || 
                   (d.p1 === champs[1] && d.p2 === champs[0])
                );
                if (duoObj && duoObj.name) duoName = duoObj.name;
             }
             
             stats[cat][duoKey] = stats[cat][duoKey] || { count: 0, isDupla: true, p1: champs[0], p2: champs[1], name: duoName };
             stats[cat][duoKey].count += 1;
             
          } else {
             // Lógica Normal Single Player
             const uniqueChamps = [...new Set(champs)];
             uniqueChamps.forEach(tId => {
                stats[cat][tId] = stats[cat][tId] || { count: 0, isDupla: false, teamId: tId };
                stats[cat][tId].count += 1;
             });
          }
       }
    });
    return stats;
  };

  // 🌟 MEGA PÓDIO GLOBAL - Puxa do Motor Único e soma tudo
  const overallChampions = useMemo(() => {
    const statsByCat = getProcessedChampions();
    const globalStats = {};

    // Junta todas as categorias em um pote só
    Object.keys(statsByCat).forEach(cat => {
        Object.keys(statsByCat[cat]).forEach(key => {
            if (!globalStats[key]) {
                globalStats[key] = { ...statsByCat[cat][key], count: 0 };
            }
            globalStats[key].count += statsByCat[cat][key].count;
        });
    });

    return Object.keys(globalStats)
        .map(key => {
            const data = globalStats[key];
            if (data.isDupla) {
               const t1 = teams.find(t => t.id === data.p1);
               const t2 = teams.find(t => t.id === data.p2);
               return { id: key, count: data.count, isDupla: true, team: { name: data.name, shield1: t1?.shield, shield2: t2?.shield } };
            } else {
               const t = teams.find(t => t.id === data.teamId);
               return t ? { id: key, count: data.count, isDupla: false, team: t } : null;
            }
        })
        .filter(Boolean)
        .sort((a, b) => b.count - a.count)
        .slice(0, 3); // Pega apenas os 3 maiores vencedores da história do Clã
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [competitions, matches, teams]);

  // 🌟 PÓDIOS DE DIVISÃO - Puxa do Motor Único e separa por categoria
  const categoryStats = useMemo(() => {
    const statsByCat = getProcessedChampions();
    const result = [];
    
    Object.keys(statsByCat).forEach(catKey => {
       const items = statsByCat[catKey];
       const sortedItems = Object.keys(items)
         .map(key => {
            const data = items[key];
            if (data.isDupla) {
               const t1 = teams.find(t => t.id === data.p1);
               const t2 = teams.find(t => t.id === data.p2);
               return { id: key, count: data.count, isDupla: true, team: { name: data.name, shield1: t1?.shield, shield2: t2?.shield } };
            } else {
               const t = teams.find(t => t.id === data.teamId);
               return t ? { id: key, count: data.count, isDupla: false, team: t } : null;
            }
         })
         .filter(Boolean)
         .sort((a, b) => b.count - a.count); 
       
       if (sortedItems.length > 0) {
          result.push({ key: catKey, name: CATEGORY_NAMES[catKey] || catKey.toUpperCase(), top3: sortedItems.slice(0, 3) });
       }
    });
    
    const order = Object.keys(CATEGORY_NAMES);
    return result.sort((a, b) => {
       const idxA = order.indexOf(a.key);
       const idxB = order.indexOf(b.key);
       return (idxA !== -1 ? idxA : 99) - (idxB !== -1 ? idxB : 99);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [competitions, matches, teams]);

  const RenderShields = ({ item, size }) => {
     if (item.isDupla) {
        return (
           <div className="flex items-center -space-x-3 mb-1.5 hover:-translate-y-2 transition-transform cursor-pointer" title={item.team.name}>
              <ShieldDisplay shield={item.team.shield1} size={size} />
              <ShieldDisplay shield={item.team.shield2} size={size} />
           </div>
        );
     }
     return (
        <div className="mb-1.5 hover:-translate-y-2 transition-transform cursor-pointer" title={item.team.name}>
           <ShieldDisplay shield={item.team.shield} size={size} />
        </div>
     );
  };

  return (
    <div className="max-w-5xl mx-auto space-y-12 animate-in fade-in pb-12">
      {/* Cabeçalho */}
      <div className="bg-gradient-to-r from-blue-900 to-blue-950 p-6 sm:p-8 rounded-3xl border border-amber-500/30 shadow-2xl flex flex-col md:flex-row items-center gap-6 relative overflow-hidden">
        <div className="absolute -right-10 -bottom-10 w-48 h-48 bg-amber-500/20 blur-3xl rounded-full"></div>
        <div className="bg-blue-950 p-4 rounded-full border-2 border-amber-500 shadow-[0_0_20px_rgba(245,158,11,0.3)] shrink-0 z-10">
          <Trophy size={40} className="text-amber-400 animate-pulse" />
        </div>
        <div className="text-center md:text-left z-10">
          <h2 className="text-2xl md:text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-200 to-amber-500 uppercase tracking-widest mb-1">
            Sala de Troféus
          </h2>
          <p className="text-sm text-blue-300">
            A galeria eterna dos maiores campeões de cada categoria do Clã Kame.
          </p>
        </div>
      </div>

      {/* 🌟 MEGA PÓDIO GLOBAL - MAIORES DA HISTÓRIA */}
      {overallChampions.length > 0 && (
        <div className="bg-gradient-to-b from-amber-900/40 to-blue-950/80 rounded-3xl border border-amber-500/50 shadow-[0_0_30px_rgba(245,158,11,0.15)] overflow-hidden relative">
          <div className="text-center pt-8 pb-4 relative z-10">
            <h3 className="text-2xl md:text-3xl font-black text-amber-400 uppercase tracking-widest drop-shadow-md flex justify-center items-center gap-3">
              <Crown size={28} className="text-amber-400"/> Maiores Campeões <Crown size={28} className="text-amber-400"/>
            </h3>
            <p className="text-amber-200/70 text-xs md:text-sm mt-1 uppercase font-bold tracking-widest">
              Ranking Geral de Títulos da História do Clã
            </p>
          </div>

          <div className="p-4 sm:p-6 pt-16 flex items-end justify-center h-[320px] sm:h-[360px] gap-1 sm:gap-2 relative overflow-hidden z-10">
             <div className="absolute bottom-0 w-full h-40 bg-amber-500/20 blur-3xl rounded-full"></div>

             {/* Pódio 2º Lugar */}
             <div className="flex flex-col items-center w-1/3 justify-end z-10 relative">
               {overallChampions[1] ? (
                 <>
                   <RenderShields item={overallChampions[1]} size="normal" />
                   <span className="text-xs sm:text-sm font-bold text-slate-300 truncate w-full text-center px-1 drop-shadow-md">{overallChampions[1].team.name}</span>
                   <span className="text-[10px] sm:text-xs text-slate-400 font-black mb-2">{overallChampions[1].count} TÍTULO{overallChampions[1].count > 1 ? 'S' : ''}</span>
                 </>
               ) : (
                 <div className="h-20"></div>
               )}
               <div className="w-full h-24 bg-gradient-to-t from-slate-600 to-slate-400 rounded-tl-xl border-t-2 border-l-2 border-slate-300 shadow-lg flex justify-center pt-2 relative overflow-hidden">
                  <div className="absolute inset-0 bg-white/10 w-full h-1/2"></div>
                  <span className="text-slate-100 font-black text-3xl drop-shadow-md relative z-10">2</span>
               </div>
             </div>

             {/* Pódio 1º Lugar */}
             <div className="flex flex-col items-center w-1/3 justify-end z-20 relative -mx-2 sm:-mx-4">
               {overallChampions[0] ? (
                 <>
                   <Crown className="absolute -top-10 sm:-top-12 text-amber-400 drop-shadow-[0_0_15px_rgba(245,158,11,1)]" size={40} />
                   <RenderShields item={overallChampions[0]} size="large" />
                   <span className="text-sm sm:text-base font-black text-amber-400 truncate w-full text-center px-1 drop-shadow-md">{overallChampions[0].team.name}</span>
                   <span className="text-[10px] sm:text-xs text-amber-200/90 font-black mb-3 bg-amber-500/10 px-3 py-1 rounded border border-amber-500/30 shadow-inner">{overallChampions[0].count} TÍTULO{overallChampions[0].count > 1 ? 'S' : ''}</span>
                 </>
               ) : (
                 <div className="h-32"></div>
               )}
               <div className="w-full h-36 bg-gradient-to-t from-amber-600 to-amber-400 rounded-t-xl border-t-2 border-l-2 border-r-2 border-amber-300 shadow-2xl flex justify-center pt-3 relative overflow-hidden">
                  <div className="absolute inset-0 bg-white/20 w-full h-1/2"></div>
                  <span className="text-amber-100 font-black text-4xl drop-shadow-md relative z-10">1</span>
               </div>
             </div>

             {/* Pódio 3º Lugar */}
             <div className="flex flex-col items-center w-1/3 justify-end z-10 relative">
               {overallChampions[2] ? (
                 <>
                   <RenderShields item={overallChampions[2]} size="small" />
                   <span className="text-[10px] sm:text-xs font-bold text-amber-700 truncate w-full text-center px-1 drop-shadow-md">{overallChampions[2].team.name}</span>
                   <span className="text-[9px] sm:text-[10px] text-amber-700/80 font-black mb-2">{overallChampions[2].count} TÍTULO{overallChampions[2].count > 1 ? 'S' : ''}</span>
                 </>
               ) : (
                 <div className="h-16"></div>
               )}
               <div className="w-full h-16 bg-gradient-to-t from-amber-900 to-amber-700 rounded-tr-xl border-t-2 border-r-2 border-amber-600 shadow-lg flex justify-center pt-2 relative overflow-hidden">
                  <div className="absolute inset-0 bg-white/5 w-full h-1/2"></div>
                  <span className="text-amber-200/50 font-black text-2xl drop-shadow-md relative z-10">3</span>
               </div>
             </div>
          </div>
        </div>
      )}

      {/* Título Divisório */}
      {categoryStats.length > 0 && (
        <div className="flex items-center gap-4 py-4">
          <div className="h-px bg-blue-800 flex-1"></div>
          <h3 className="text-lg font-bold text-blue-300 uppercase tracking-widest text-center">Pódios por Divisão</h3>
          <div className="h-px bg-blue-800 flex-1"></div>
        </div>
      )}

      {/* Estantes / Pódios por Categoria */}
      {categoryStats.length === 0 ? (
        <div className="bg-blue-950 p-12 rounded-3xl border border-blue-800 text-center border-dashed">
          <Trophy className="mx-auto text-blue-800 mb-4" size={48} />
          <p className="text-blue-500 font-bold text-lg">A estante de troféus está vazia.</p>
          <p className="text-blue-400 text-sm mt-1">Os maiores campeões aparecerão aqui quando os torneios forem finalizados com sucesso.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {categoryStats.map((cat, idx) => {
            const first = cat.top3[0];
            const second = cat.top3[1];
            const third = cat.top3[2];

            return (
              <div key={idx} className="bg-blue-900/60 rounded-3xl border border-blue-800/80 shadow-xl overflow-hidden group hover:border-amber-500/40 transition-colors">
                <div className="bg-blue-950/80 p-4 border-b border-blue-800 flex justify-center shadow-sm">
                   <h3 className="font-black text-white uppercase tracking-widest text-sm sm:text-base drop-shadow-md">
                     {cat.name}
                   </h3>
                </div>
                
                <div className="p-4 sm:p-6 pt-16 flex items-end justify-center h-[280px] sm:h-[300px] gap-1 relative overflow-hidden">
                   <div className="absolute bottom-0 w-3/4 h-32 bg-amber-500/10 blur-2xl rounded-full"></div>

                   <div className="flex flex-col items-center w-1/3 justify-end z-10 relative">
                     {second ? (
                       <>
                         <RenderShields item={second} size="small" />
                         <span className="text-[10px] sm:text-xs font-bold text-slate-300 truncate w-full text-center px-1 drop-shadow-md">{second.team ? second.team.name : ''}</span>
                         <span className="text-[9px] sm:text-[10px] text-slate-400 font-black mb-2">{second.count} TÍTULO{second.count > 1 ? 'S' : ''}</span>
                       </>
                     ) : (
                       <div className="h-16"></div>
                     )}
                     <div className="w-full h-20 bg-gradient-to-t from-slate-600 to-slate-400 rounded-tl-lg border-t-2 border-l-2 border-slate-300 shadow-lg flex justify-center pt-2 relative overflow-hidden">
                        <div className="absolute inset-0 bg-white/10 w-full h-1/2"></div>
                        <span className="text-slate-100 font-black text-2xl drop-shadow-md relative z-10">2</span>
                     </div>
                   </div>

                   <div className="flex flex-col items-center w-1/3 justify-end z-20 relative -mx-2">
                     {first ? (
                       <>
                         <Crown className="absolute -top-7 sm:-top-8 text-amber-400 drop-shadow-[0_0_10px_rgba(245,158,11,0.8)]" size={28} />
                         <RenderShields item={first} size="normal" />
                         <span className="text-xs sm:text-sm font-black text-amber-400 truncate w-full text-center px-1 drop-shadow-md">{first.team ? first.team.name : ''}</span>
                         <span className="text-[9px] sm:text-[10px] text-amber-200/90 font-black mb-2 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/30 shadow-inner">{first.count} TÍTULO{first.count > 1 ? 'S' : ''}</span>
                       </>
                     ) : (
                       <div className="h-24"></div>
                     )}
                     <div className="w-full h-28 bg-gradient-to-t from-amber-600 to-amber-400 rounded-t-lg border-t-2 border-l-2 border-r-2 border-amber-300 shadow-2xl flex justify-center pt-2 relative overflow-hidden">
                        <div className="absolute inset-0 bg-white/20 w-full h-1/2"></div>
                        <span className="text-amber-100 font-black text-3xl drop-shadow-md relative z-10">1</span>
                     </div>
                   </div>

                   <div className="flex flex-col items-center w-1/3 justify-end z-10 relative">
                     {third ? (
                       <>
                         <RenderShields item={third} size="small" />
                         <span className="text-[10px] sm:text-xs font-bold text-amber-700 truncate w-full text-center px-1 drop-shadow-md">{third.team ? third.team.name : ''}</span>
                         <span className="text-[9px] sm:text-[10px] text-amber-700/80 font-black mb-2">{third.count} TÍTULO{third.count > 1 ? 'S' : ''}</span>
                       </>
                     ) : (
                       <div className="h-12"></div>
                     )}
                     <div className="w-full h-16 bg-gradient-to-t from-amber-900 to-amber-700 rounded-tr-lg border-t-2 border-r-2 border-amber-600 shadow-lg flex justify-center pt-2 relative overflow-hidden">
                        <div className="absolute inset-0 bg-white/5 w-full h-1/2"></div>
                        <span className="text-amber-200/50 font-black text-xl drop-shadow-md relative z-10">3</span>
                     </div>
                   </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default TrophyRoom;

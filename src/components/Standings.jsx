import React from 'react';
import { calculateStandings } from '../utils/torneios';
import ShieldDisplay from './ShieldDisplay';

const Standings = ({ matches, teams, comp }) => {
  const isGroupsFormat = comp?.format === 'groups' && comp?.groups;
  
  // 1. Lemos os valores salvos nas configurações (se não houver, padrão é 0)
  const promotionsCount = comp?.promotions || 0;
  const relegationsCount = comp?.relegations || 0;

  return (
    <div className="animate-in fade-in duration-500 w-full">
      {/* 🌟 ESTILIZAÇÃO DA BARRA DE ROLAGEM TEMÁTICA (APENAS PARA ESTA TABELA) */}
      <style>{`
        .scrollbar-kame::-webkit-scrollbar { width: 8px; height: 8px; }
        .scrollbar-kame::-webkit-scrollbar-track { background: rgba(15, 23, 42, 0.6); border-radius: 10px; }
        .scrollbar-kame::-webkit-scrollbar-thumb { background: #059669; border-radius: 10px; border: 2px solid rgba(15, 23, 42, 0.6); }
        .scrollbar-kame::-webkit-scrollbar-thumb:hover { background: #10b981; }
      `}</style>

      <div className="bg-sky-900/30 rounded-2xl border border-sky-800/50 overflow-hidden shadow-2xl">
        {isGroupsFormat ? (
          <div className="flex flex-col">
            {Object.keys(comp.groups || {}).map((gName, idx) => {
              const gTeams = teams.filter(t => (comp.groups[gName] || []).includes(t.id));
              const gTable = calculateStandings(matches, gTeams, comp.id);
              return (
                <div key={gName} className={idx > 0 ? "border-t-4 border-blue-950" : ""}>
                  <div className="bg-blue-950/80 p-3 text-center border-b border-sky-800/50 flex justify-between px-4"><h3 className="text-sm font-bold text-white uppercase tracking-widest drop-shadow-md">Grupo {gName}</h3></div>
                  
                  {/* Container com rolagem limitada a ~10 times */}
                  <div className="max-h-[480px] overflow-y-auto overflow-x-auto scrollbar-kame relative">
                    <table className="w-full min-w-[600px] text-left text-xs sm:text-sm whitespace-nowrap">
                      {/* Cabeçalho Fixo (Sticky) */}
                      <thead className="text-sky-300 font-bold sticky top-0 z-20">
                        <tr>
                          <th className="bg-blue-950 px-3 py-2 w-10 text-center shadow-md">#</th>
                          <th className="bg-blue-950 px-3 py-2 shadow-md">Time</th>
                          <th className="bg-blue-950 px-3 py-2 text-center shadow-md">PTS</th>
                          <th className="bg-blue-950 px-3 py-2 text-center shadow-md">J</th>
                          <th className="bg-blue-950 px-3 py-2 text-center shadow-md">V</th>
                          <th className="bg-blue-950 px-3 py-2 text-center shadow-md">E</th>
                          <th className="bg-blue-950 px-3 py-2 text-center shadow-md">D</th>
                          <th className="bg-blue-950 px-3 py-2 text-center shadow-md">GP</th>
                          <th className="bg-blue-950 px-3 py-2 text-center shadow-md">GC</th>
                          <th className="bg-blue-950 px-3 py-2 text-center shadow-md">SG</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-sky-800/30">
                        {gTable.map((row, index) => {
                          // 2. Lógica dinâmica para Fase de Grupos
                          const isQualified = promotionsCount > 0 && index < promotionsCount;
                          const isBottom = relegationsCount > 0 && index >= gTable.length - relegationsCount;
                          
                          const borderClass = isQualified ? 'border-l-4 border-green-500' : (isBottom ? 'border-l-4 border-red-500' : 'border-l-4 border-transparent');
                          const bgClass = isQualified ? 'bg-green-500/20' : (isBottom ? 'bg-red-500/20' : 'bg-blue-900/40');
                          const textNumberClass = isQualified ? 'text-green-400 font-black' : (isBottom ? 'text-red-400 font-black' : 'text-sky-200 font-bold');

                          return (
                            <tr key={row.id} className={`hover:bg-sky-800/60 transition-colors ${borderClass} ${bgClass}`}>
                              <td className={`px-3 py-2 text-center text-base ${textNumberClass}`}>{index + 1}</td>
                              
                              <td className="px-3 py-2 font-bold text-white uppercase tracking-wide">
                                <div className="flex items-center gap-2 min-w-max py-0.5">
                                  <div className="shrink-0"><ShieldDisplay shield={row.shield} size="small" /></div>
                                  <span className="leading-normal block text-xs sm:text-sm">{String(row.name)}</span>
                                </div>
                              </td>

                              <td className="px-3 py-2 text-center font-black text-green-400 text-base drop-shadow-md">{row.pts}</td>
                              <td className="px-3 py-2 text-center text-sky-200 font-medium">{row.p}</td>
                              <td className="px-3 py-2 text-center text-sky-200 font-medium">{row.w}</td>
                              <td className="px-3 py-2 text-center text-sky-200 font-medium">{row.d}</td>
                              <td className="px-3 py-2 text-center text-sky-200 font-medium">{row.l}</td>
                              <td className="px-3 py-2 text-center text-sky-200 font-medium">{row.gf}</td>
                              <td className="px-3 py-2 text-center text-sky-200 font-medium">{row.ga}</td>
                              <td className="px-3 py-2 text-center text-sky-200 font-bold">{row.gd > 0 ? `+${row.gd}` : row.gd}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* Container com rolagem limitada a ~10 times para Liga Normal */
          <div className="max-h-[480px] overflow-y-auto overflow-x-auto scrollbar-kame relative">
            <table className="w-full min-w-[600px] text-left text-xs sm:text-sm whitespace-nowrap">
              {/* Cabeçalho Fixo (Sticky) */}
              <thead className="text-sky-300 font-bold sticky top-0 z-20">
                <tr>
                  <th className="bg-blue-950 px-3 py-2 w-10 text-center shadow-md">#</th>
                  <th className="bg-blue-950 px-3 py-2 shadow-md">Time</th>
                  <th className="bg-blue-950 px-3 py-2 text-center shadow-md">PTS</th>
                  <th className="bg-blue-950 px-3 py-2 text-center shadow-md">J</th>
                  <th className="bg-blue-950 px-3 py-2 text-center shadow-md">V</th>
                  <th className="bg-blue-950 px-3 py-2 text-center shadow-md">E</th>
                  <th className="bg-blue-950 px-3 py-2 text-center shadow-md">D</th>
                  <th className="bg-blue-950 px-3 py-2 text-center shadow-md">GP</th>
                  <th className="bg-blue-950 px-3 py-2 text-center shadow-md">GC</th>
                  <th className="bg-blue-950 px-3 py-2 text-center shadow-md">SG</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-sky-800/30">
                {(() => {
                  const table = calculateStandings(matches, teams, comp?.id);
                  const displayTable = table.filter(t => t.p > 0 || table.length > 0);
                  const totalTeams = displayTable.length;

                  return displayTable.map((row, index) => {
                    // 3. Lógica dinâmica para Pontos Corridos
                    const isTop = promotionsCount > 0 && index < promotionsCount; 
                    const isBottom = relegationsCount > 0 && index >= totalTeams - relegationsCount;
                    
                    const borderClass = isTop ? 'border-l-4 border-green-500' : (isBottom ? 'border-l-4 border-red-500' : 'border-l-4 border-transparent');
                    const bgClass = isTop ? 'bg-green-500/20' : (isBottom ? 'bg-red-500/20' : 'bg-blue-900/40');
                    const textNumberClass = isTop ? 'text-green-400 font-black' : (isBottom ? 'text-red-400 font-black' : 'text-sky-200 font-bold');

                    return (
                      <tr key={row.id} className={`hover:bg-sky-800/60 transition-colors ${borderClass} ${bgClass}`}>
                        <td className={`px-3 py-2 text-center text-base ${textNumberClass}`}>{index + 1}</td>
                        
                        <td className="px-3 py-2 font-bold text-white uppercase tracking-wide">
                          <div className="flex items-center gap-2 min-w-max py-0.5">
                            <div className="shrink-0"><ShieldDisplay shield={row.shield} size="small" /></div>
                            <span className="leading-normal block text-xs sm:text-sm">{String(row.name)}</span>
                          </div>
                        </td>

                        <td className="px-3 py-2 text-center font-black text-green-400 text-base drop-shadow-md">{row.pts}</td>
                        <td className="px-3 py-2 text-center text-sky-200 font-medium">{row.p}</td>
                        <td className="px-3 py-2 text-center text-sky-200 font-medium">{row.w}</td>
                        <td className="px-3 py-2 text-center text-sky-200 font-medium">{row.d}</td>
                        <td className="px-3 py-2 text-center text-sky-200 font-medium">{row.l}</td>
                        <td className="px-3 py-2 text-center text-sky-200 font-medium">{row.gf}</td>
                        <td className="px-3 py-2 text-center text-sky-200 font-medium">{row.ga}</td>
                        <td className="px-3 py-2 text-center text-sky-200 font-bold">{row.gd > 0 ? `+${row.gd}` : row.gd}</td>
                      </tr>
                    );
                  });
                })()}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default Standings;

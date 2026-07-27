import React from 'react';
import { Trophy, Medal, Swords, Target } from 'lucide-react';
// Se você for usar os escudos, pode importar o ShieldDisplay aqui
// import ShieldDisplay from './ShieldDisplay';

const XClanRanking = ({ rankedTeams = [] }) => {
  // Define o número de vagas para a Seleção do Clã
  const CALL_UP_LIMIT = 5;

  return (
    <div className="space-y-6 animate-in fade-in pb-10">
      
      {/* 🏆 Cabeçalho da Tela */}
      <div className="bg-blue-900 p-5 md:p-6 rounded-3xl border border-blue-800 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-white flex items-center gap-3 uppercase tracking-wider">
            <Swords className="text-amber-400" size={28} /> Ranking Xclã
          </h2>
          <p className="text-xs md:text-sm text-blue-300 mt-1.5 max-w-xl leading-relaxed">
            A meritocracia entra em campo. Os técnicos no topo desta tabela garantem convocação direta para representar a bandeira do nosso clã nos desafios externos.
          </p>
        </div>
        <div className="bg-blue-950 px-4 py-2 rounded-xl border border-blue-800 text-center shrink-0 w-full md:w-auto">
          <p className="text-[10px] text-emerald-400 font-bold uppercase tracking-widest mb-0.5">Vagas na Seleção</p>
          <p className="text-2xl font-black text-white">Top {CALL_UP_LIMIT}</p>
        </div>
      </div>

      {/* 📊 Tabela Geral */}
      <div className="bg-blue-950 p-4 sm:p-6 rounded-3xl border border-blue-800 shadow-2xl">
        <div className="flex justify-between items-end mb-4 border-b border-blue-800/50 pb-3">
          <h3 className="text-sm font-bold text-emerald-400 uppercase tracking-widest pl-2">Classificação Global</h3>
        </div>

        <div className="space-y-3">
          {rankedTeams.length === 0 ? (
            <p className="text-center text-blue-500 py-10 text-sm font-medium border border-dashed border-blue-800 rounded-xl">
              O ranking ainda está vazio. Jogue competições para pontuar!
            </p>
          ) : (
            rankedTeams.map((team, index) => {
              const isCalledUp = index < CALL_UP_LIMIT;
              const position = index + 1;

              return (
                <div
                  key={team.id}
                  className={`relative overflow-hidden p-4 rounded-2xl border flex items-center justify-between transition-all duration-300 hover:scale-[1.01] ${
                    isCalledUp
                      ? 'bg-gradient-to-r from-emerald-900/30 to-blue-950 border-emerald-500/40 shadow-[0_0_20px_rgba(16,185,129,0.08)]'
                      : 'bg-blue-900/30 border-blue-800/50 hover:border-blue-700'
                  }`}
                >
                  {/* Linha brilhante para os convocados */}
                  {isCalledUp && (
                    <div className="absolute top-0 left-0 w-1.5 h-full bg-emerald-500 shadow-[0_0_12px_#10b981]"></div>
                  )}

                  <div className="flex items-center gap-4 z-10 pl-2">
                    {/* Ícone de Posição */}
                    <div className="flex flex-col items-center justify-center w-8 shrink-0">
                      {position === 1 ? <Trophy size={26} className="text-amber-400 drop-shadow-md" /> :
                       position === 2 ? <Medal size={24} className="text-slate-300" /> :
                       position === 3 ? <Medal size={24} className="text-amber-700" /> :
                       <span className={`font-black text-xl ${isCalledUp ? 'text-emerald-400' : 'text-blue-600'}`}>{position}º</span>}
                    </div>

                    {/* Dados do Time */}
                    <div className="flex flex-col min-w-0">
                      <span className="font-black text-white text-base sm:text-lg uppercase tracking-wide truncate">
                        {team.name}
                      </span>
                      <span className="text-[10px] sm:text-xs text-blue-400 font-bold truncate">Técnico: <span className="text-blue-200">{team.coach}</span></span>
                      
                      {isCalledUp && (
                        <span className="text-[9px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full uppercase font-black tracking-wider mt-1.5 inline-block w-max shadow-sm">
                          ✅ Zona de Convocação
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Pontuação de Ranking (PR) e Histórico */}
                  <div className="flex flex-col items-end z-10 shrink-0">
                    <div className="flex items-center gap-1.5">
                      <Target size={16} className="text-amber-400 animate-pulse" />
                      <span className="font-black text-2xl sm:text-3xl text-white drop-shadow-md">
                        {team.rankingPoints || 0} <span className="text-xs text-blue-400 font-bold">PR</span>
                      </span>
                    </div>
                    
                    <div className="flex gap-2.5 mt-1.5 text-[10px] text-blue-300 font-black uppercase tracking-wider bg-blue-950/50 px-2 py-1 rounded">
                      <span>{team.matchesPlayed || 0} J</span>
                      <span className="text-emerald-400/80">{team.wins || 0} V</span>
                      {team.titles > 0 && (
                        <span className="text-amber-400 flex items-center gap-0.5">
                          <Trophy size={10}/> {team.titles}
                        </span>
                      )}
                    </div>
                  </div>
                  
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

export default XClanRanking;

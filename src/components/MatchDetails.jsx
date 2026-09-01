import React from 'react';
import { ArrowLeft } from 'lucide-react';
import ShieldDisplay from './ShieldDisplay';

const MatchDetails = ({ match, teams, competitions, onBack }) => {
  if (!match) return null; 
  const getTeam = (id) => (teams || []).find(t => t && t.id === id);
  const tA = getTeam(match.teamA); 
  const tB = getTeam(match.teamB);

  // 🔄 SEPARAÇÃO AUTOMÁTICA: Filtra os gols e assistências correspondentes a cada ID de equipe
  const goalsTeamA = (match.goals || []).filter(g => g.teamId === match.teamA);
  const goalsTeamB = (match.goals || []).filter(g => g.teamId === match.teamB);

  return (
    <div className="max-w-2xl mx-auto bg-blue-900 border border-blue-800 p-5 md:p-6 rounded-3xl shadow-2xl animate-in fade-in space-y-6">
      
      {/* Botão Voltar */}
      <button onClick={onBack} className="text-xs text-blue-400 hover:text-white flex items-center gap-1.5 transition-colors outline-none">
        <ArrowLeft size={14}/> Voltar para o Painel
      </button>

      {/* 🛡️ PLACAR IMERSIVO: Escudos e nomes alinhados horizontalmente */}
      <div className="bg-blue-950 p-4 rounded-2xl border border-blue-800 flex items-center justify-between gap-4">
        {/* Bloco Esquerda (Time A) */}
        <div className="flex-1 flex flex-col items-center text-center min-w-0">
          <ShieldDisplay shield={tA?.shield} size="normal" />
          <span className="font-bold text-white text-xs md:text-sm mt-2 truncate w-full px-1 uppercase tracking-wide">{tA?.name || 'Time A'}</span>
          <p className="text-[10px] text-blue-400 mt-0.5 truncate w-full font-medium">Téc: {tA?.coach || 'Técnico'}</p>
        </div>

        {/* Centralizador do Placar */}
        <div className="flex flex-col items-center justify-center shrink-0">
          <span className="text-[9px] uppercase tracking-widest font-black text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full mb-2 border border-emerald-500/20">
            {match.status === 'approved' ? 'Oficializado' : 'Validando'}
          </span>
          <div className="flex items-center justify-center gap-1 md:gap-3">
            {match.penaltiesA !== null && match.penaltiesA !== undefined && (
              <span className="text-xs text-amber-400 font-bold mb-4 mr-0.5">({match.penaltiesA})</span>
            )}
            <span className="text-3xl md:text-4xl font-black text-white tracking-tight">{match.scoreA}</span>
            <span className="text-blue-700 font-black text-2xl mx-1 mb-1">:</span>
            <span className="text-3xl md:text-4xl font-black text-white tracking-tight">{match.scoreB}</span>
            {match.penaltiesB !== null && match.penaltiesB !== undefined && (
              <span className="text-xs text-amber-400 font-bold mb-4 ml-0.5">({match.penaltiesB})</span>
            )}
          </div>
        </div>

        {/* Bloco Direita (Time B) */}
        <div className="flex-1 flex flex-col items-center text-center min-w-0">
          <ShieldDisplay shield={tB?.shield} size="normal" />
          <span className="font-bold text-white text-xs md:text-sm mt-2 truncate w-full px-1 uppercase tracking-wide">{tB?.name || 'Time B'}</span>
          <p className="text-[10px] text-blue-400 mt-0.5 truncate w-full font-medium">Téc: {tB?.coach || 'Técnico'}</p>
        </div>
      </div>

      {/* ⚽ DETALHAMENTO DE EVENTOS: Colunas separadas por lado do campo */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Painel de Eventos do Time Esquerdo */}
        <div className="bg-blue-950/40 p-4 rounded-xl border border-blue-800 space-y-3 shadow-inner">
          <div className="text-[10px] font-black text-blue-400 uppercase tracking-wider border-b border-blue-800/60 pb-2 flex items-center gap-2">
            <span>⚽</span> Acontecimentos de {tA?.name || 'Time A'}
          </div>
          <div className="space-y-2">
            {goalsTeamA.length === 0 ? (
              <p className="text-xs text-blue-600 italic p-2">Nenhum lance registrado.</p>
            ) : (
              goalsTeamA.map((g, i) => (
                <div key={i} className="bg-blue-950/80 p-2.5 rounded-lg border border-blue-900 text-xs flex flex-col gap-1 transition-all hover:border-blue-700">
                  <div className="flex justify-between items-center">
                    <span className="text-white font-bold">⚽ {g.player}</span>
                    <span className="text-emerald-400 font-black font-mono bg-blue-900 px-1.5 py-0.5 rounded border border-blue-800">{g.minute}'</span>
                  </div>
                  {g.assist && (
                    <span className="text-[10px] text-blue-400 font-medium pl-4 flex items-center gap-1">
                      <span>👟</span> Assistência de: <b className="text-blue-200">{g.assist}</b>
                    </span>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Painel de Eventos do Time Direito (Espelhado) */}
        <div className="bg-blue-950/40 p-4 rounded-xl border border-blue-800 space-y-3 shadow-inner">
          <div className="text-[10px] font-black text-blue-400 uppercase tracking-wider border-b border-blue-800/60 pb-2 flex items-center gap-2 justify-end">
            Acontecimentos de {tB?.name || 'Time B'} <span>⚽</span>
          </div>
          <div className="space-y-2">
            {goalsTeamB.length === 0 ? (
              <p className="text-xs text-blue-600 italic p-2 text-right">Nenhum lance registrado.</p>
            ) : (
              goalsTeamB.map((g, i) => (
                <div key={i} className="bg-blue-950/80 p-2.5 rounded-lg border border-blue-900 text-xs flex flex-col gap-1 text-right transition-all hover:border-blue-700">
                  <div className="flex justify-between items-center flex-row-reverse">
                    <span className="text-white font-bold">{g.player} ⚽</span>
                    <span className="text-emerald-400 font-black font-mono bg-blue-900 px-1.5 py-0.5 rounded border border-blue-800">{g.minute}'</span>
                  </div>
                  {g.assist && (
                    <span className="text-[10px] text-blue-400 font-medium pr-4 flex items-center gap-1 justify-end flex-row-reverse">
                      <span>👟</span> Assistência de: <b className="text-blue-200">{g.assist}</b>
                    </span>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Exibição da Imagem Original da Partida */}
      {match.imageUrl && (
        <div className="pt-2 border-t border-blue-800/50">
          <span className="text-xs font-black text-blue-400 uppercase tracking-wider block mb-3 pl-1">📸 Print Estatístico Oficial</span>
          <div className="rounded-xl overflow-hidden border border-blue-800 bg-black/60 p-1 shadow-2xl flex justify-center">
            <img src={match.imageUrl} className="w-full max-h-[350px] object-contain rounded-lg" alt="Estatísticas Finais DLS" />
          </div>
        </div>
      )}

      {/* Relatório de envio de dados */}
      <div className="text-center text-[9px] text-blue-600 uppercase font-black tracking-widest pt-2 border-t border-blue-800/30">
        Relatório enviado por: {match.submittedBy || 'Técnico de Campo'}
      </div>
    </div>
  );
};

export default MatchDetails;

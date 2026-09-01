import React from 'react';
import { BookOpen } from 'lucide-react';

const RulesPage = () => {
  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in pb-12">
      <div className="bg-gradient-to-r from-blue-900 to-blue-950 p-6 rounded-3xl border border-blue-800 shadow-xl flex items-center gap-4">
        <div className="bg-blue-950 p-3 rounded-full border border-sky-500/50 shadow-inner">
          <BookOpen size={32} className="text-sky-400" />
        </div>
        <div>
          <h2 className="text-2xl font-black text-white uppercase tracking-wider">Regras Oficiais do Clã Kame</h2>
          <p className="text-sm text-blue-400 mt-1">O desconhecimento das regras não isenta de punições. Jogue limpo!</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-blue-900 p-5 rounded-2xl border border-blue-800 shadow-md">
          <h3 className="font-bold text-emerald-400 mb-3 flex items-center gap-2">🤝 1. Fair Play e Respeito</h3>
          <ul className="text-sm text-blue-200 space-y-2 list-disc pl-4">
            <li>É terminantemente proibido ofender, xingar ou desrespeitar qualquer membro do clã.</li>
            <li>Mantenha a resenha saudável. Foco na diversão e competição limpa.</li>
          </ul>
        </div>

        <div className="bg-blue-900 p-5 rounded-2xl border border-blue-800 shadow-md">
          <h3 className="font-bold text-amber-400 mb-3 flex items-center gap-2">⏰ 2. Prazos e W.O.</h3>
          <ul className="text-sm text-blue-200 space-y-2 list-disc pl-4">
            <li>Os líderes definirão prazos para as rodadas. Jogos não realizados no prazo darão W.O. duplo, a menos que um dos técnicos prove que procurou o adversário.</li>
          </ul>
        </div>

        <div className="bg-blue-900 p-5 rounded-2xl border border-blue-800 shadow-md">
          <h3 className="font-bold text-sky-400 mb-3 flex items-center gap-2">📸 3. Envio de Resultados</h3>
          <ul className="text-sm text-blue-200 space-y-2 list-disc pl-4">
            <li>Sempre tire o PRINT DA TELA FINAL DE ESTATÍSTICAS do jogo (aquela que mostra gols, chutes, posse).</li>
            <li>Nos envie o print no grupo do Whatsapp</li>
            <li>Resultados forjados ou prints editados resultarão em banimento imediato.</li>
          </ul>
        </div>

        <div className="bg-blue-900 p-5 rounded-2xl border border-blue-800 shadow-md">
          <h3 className="font-bold text-purple-400 mb-3 flex items-center gap-2">🏆 4. Participação</h3>
          <ul className="text-sm text-blue-200 space-y-2 list-disc pl-4">
            <li>Inatividade por mais de 2 temporadas sem justificativa prévia aos líderes resultará em desligamento do Clã.</li>
            <li>Torneios Premiados exigem o anexo do comprovante PIX no momento da inscrição.</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default RulesPage;

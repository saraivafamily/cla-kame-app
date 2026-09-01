import React, { useState, useEffect } from 'react';
import { ArrowLeft, Trophy, Activity, CheckCircle, XCircle, UploadCloud, Star, Lock } from 'lucide-react';
import { updateDoc } from 'firebase/firestore';
import { getPublicDocPath } from '../utils/firebase';
import ShieldDisplay from './ShieldDisplay';
import Button from './Button';
import CountdownTimer from './CountdownTimer';
import { processImage } from '../utils/helpers';

const JoinCompetition = ({ compId, competitions, teams, currentUser, onJoin, onBack, showToast, onEditComp }) => {
  const [receipt, setReceipt] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [now, setNow] = useState(Date.now());
  
  const comp = competitions.find(c => c && c.id === compId);
  const userTeamIds = (teams || []).filter(t => t && t.ownerId === currentUser?.id).map(t => t.id);
  const userTeam = teams.find(t => t && t.ownerId === currentUser?.id);

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  if (competitions.length === 0) return <div className="p-12 text-center text-emerald-400 font-bold animate-pulse text-sm">🛡️ Carregando detalhes...</div>;
  if (!comp) return <div className="p-8 text-center text-slate-400">Torneio não encontrado ou encerrado.</div>;
  if (!userTeam) return <div className="p-8 text-center text-amber-400 font-bold bg-amber-500/10 rounded-2xl border border-amber-500/30 m-4">Você precisa ter um time cadastrado para participar. Peça a um líder para criar seu clube primeiro.</div>;

  const isFlashSolo = comp.category === 'copa_flash';
  const isFlashDupla = comp.category === 'copa_flash_dupla';
  
  const compTeams = Array.isArray(comp.teams) ? comp.teams : [];
  const compPending = Array.isArray(comp.pendingTeams) ? comp.pendingTeams : [];
  
  // 🌟 VERIFICAÇÃO DE PUNIÇÃO DE DESISTÊNCIA
  const compSuspended = Array.isArray(comp.suspendedTeams) ? comp.suspendedTeams : [];
  const isSuspended = compSuspended.some(tId => userTeamIds.includes(tId));
  
  const teamCount = parseInt(comp.teamCount) || 0;

  const isFull = isFlashSolo ? false : compTeams.length >= teamCount;
  const alreadyJoined = compTeams.some(tId => userTeamIds.includes(tId));
  const isPending = compPending.some(p => p && userTeamIds.includes(p.teamId));

  const isBlockedByOtherComp = Array.isArray(comp.excludedCompIds) && comp.excludedCompIds.some(exCompId => {
    const exComp = (competitions || []).find(c => c.id === exCompId);
    if (!exComp) return false;
    const inConfirmed = Array.isArray(exComp.teams) && exComp.teams.some(tId => userTeamIds.includes(tId));
    const inPendingEx = Array.isArray(exComp.pendingTeams) && exComp.pendingTeams.some(p => p && userTeamIds.includes(p.teamId)); 
    return inConfirmed || inPendingEx;
  });

  const hasAnyPrize = comp.prizes && (comp.prizes.first || comp.prizes.second || comp.prizes.third || comp.prizes.extra);

  const openTimeStr = comp.registrationStartTime ? `${comp.registrationStartTime}:00-03:00` : null;
  const deadlineTimeStr = comp.deadline && comp.startTime ? `${comp.deadline}T${comp.startTime}:00-03:00` : null;
  
  const openTime = openTimeStr ? new Date(openTimeStr).getTime() : 0;
  const isRegistrationOpen = !comp.registrationStartTime || now >= openTime;

  const getLocalTimeMsg = (dateStr) => {
    if (!dateStr) return '';
    try {
        const d = new Date(dateStr);
        const time = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        return `Horário local no seu celular: ${time}`;
    } catch (e) { return ''; }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isRegistrationOpen) { showToast("A bilheteria ainda não abriu!", "warning"); return; }
    if (isSuspended) { showToast("Você está suspenso deste torneio por abandono anterior!", "error"); return; }
    if (isBlockedByOtherComp) { showToast("Acesso Negado: Seu time já disputa um torneio bloqueado para esta competição.", "error"); return; }
    if (comp.isPaid && !receipt) { showToast("Anexe o comprovante de pagamento!", "error"); return; }
    
    setIsSubmitting(true);
    try { await onJoin(comp.id, userTeam.id, receipt); } 
    catch (error) { console.error(error); } 
    finally { setIsSubmitting(false); }
  };

  return (
    <div className="max-w-md mx-auto animate-in fade-in pb-12 mt-8">
      <button onClick={onBack} className="text-xs text-blue-400 hover:text-white flex items-center gap-1 mb-6"><ArrowLeft size={14}/> Voltar ao Início</button>
      
      <div className={`bg-blue-900 border rounded-3xl overflow-hidden shadow-2xl ${isFlashSolo || isFlashDupla ? 'border-amber-500/50' : 'border-blue-800'}`}>
        <div className="bg-blue-950/80 p-8 text-center border-b border-blue-800 relative overflow-hidden">
          <Trophy className={`${isFlashSolo || isFlashDupla ? 'text-amber-500 drop-shadow-[0_0_15px_rgba(245,158,11,0.5)]' : 'text-amber-400'} mx-auto mb-4`} size={48} />
          <h2 className="text-2xl font-black text-white uppercase tracking-wider">{comp.name}</h2>
          <p className="text-emerald-400 font-bold mt-2 text-sm uppercase tracking-widest">{comp.format === 'league' ? 'Liga' : 'Copa / Grupos'}</p>
        </div>

        <div className="p-6 space-y-6">
          
          {isRegistrationOpen && isFlashSolo && deadlineTimeStr && (
            <div className="bg-amber-900/40 p-5 rounded-2xl border border-amber-500/50 text-center shadow-inner animate-in zoom-in-95">
              <p className="text-[10px] text-amber-400 font-bold uppercase tracking-widest mb-1.5 flex justify-center items-center gap-1.5">
                <Activity size={14}/> Inscrições Encerram Em:
              </p>
              <p className="text-4xl text-amber-400 drop-shadow-md">
                <CountdownTimer targetDateStr={deadlineTimeStr} />
              </p>
              <p className="text-[10px] text-amber-300 font-bold mt-3 bg-amber-950/50 py-1.5 rounded-lg border border-amber-500/30">
                {getLocalTimeMsg(deadlineTimeStr)}
              </p>
              <p className="text-[9px] text-amber-400/60 mt-2">A tabela será gerada automaticamente.</p>
            </div>
          )}

          <div className="flex justify-between items-center bg-blue-950 p-4 rounded-xl border border-blue-800">
            <div>
              <p className="text-[10px] text-blue-400 uppercase font-bold">Vagas Preenchidas</p>
              <p className="text-xl font-black text-white">
                {(compTeams.length || 0)} 
                {isFlashSolo ? <span className="text-amber-500 text-sm ml-1">/ Ilimitado</span> : <span className="text-blue-500"> / {teamCount}</span>}
              </p>
            </div>
            <div className="text-right">
              <p className="text-[10px] text-blue-400 uppercase font-bold">Data do Jogo</p>
              <p className="text-sm font-bold text-white">{new Date(comp.deadline + 'T12:00:00').toLocaleDateString('pt-BR')}</p>
            </div>
          </div>

          {hasAnyPrize && (
            <div className="bg-gradient-to-b from-amber-500/5 to-blue-950/50 border border-amber-500/20 p-4 rounded-xl space-y-3">
              <div className="flex items-center gap-2 border-b border-blue-800 pb-2">
                <Star className="text-amber-400" size={16} />
                <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">Premiação</span>
              </div>
              <div className="space-y-2 text-xs">
                {comp.prizes?.first && (<div className="flex justify-between bg-blue-950/60 p-2 rounded border border-blue-900"><span className="text-blue-300">🥇 1º Lugar:</span><span className="font-bold text-white">{comp.prizes.first}</span></div>)}
                {comp.prizes?.second && (<div className="flex justify-between bg-blue-950/60 p-2 rounded border border-blue-900"><span className="text-blue-400">🥈 2º Lugar:</span><span className="font-bold text-slate-300">{comp.prizes.second}</span></div>)}
              </div>
            </div>
          )}

          {!isRegistrationOpen ? (
            <div className="text-center p-6 bg-blue-950/80 border border-blue-800 rounded-xl shadow-inner animate-in zoom-in-95">
               <Lock className="text-blue-500 mx-auto mb-3" size={36}/>
               <h3 className="text-xl font-black text-white uppercase tracking-wider mb-2">Inscrições Fechadas</h3>
               <p className="text-blue-300 text-sm mb-4">A bilheteria deste torneio ainda não abriu.</p>
               
               <div className="bg-blue-900 p-3 rounded-lg border border-blue-700 inline-block w-full">
                 <p className="text-[10px] text-emerald-400 uppercase font-bold tracking-widest mb-1">Abre em</p>
                 <p className="text-2xl font-black text-emerald-500 drop-shadow-md">
                   <CountdownTimer targetDateStr={openTimeStr} />
                 </p>
                 <p className="text-[10px] text-emerald-300 font-bold mt-2 pt-2 border-t border-emerald-500/20">
                    {getLocalTimeMsg(openTimeStr)}
                 </p>
               </div>
            </div>
          ) : isSuspended ? (
             // 🌟 A MURALHA DA PUNIÇÃO
             <div className="text-center p-6 bg-red-950/80 border border-red-500/50 rounded-xl shadow-[0_0_20px_rgba(239,68,68,0.2)] animate-in zoom-in-95">
               <Lock className="text-red-500 mx-auto mb-3" size={42}/>
               <h3 className="text-xl font-black text-red-400 uppercase tracking-wider mb-2">Conta Suspensa</h3>
               <p className="text-red-200 text-sm font-medium">Seu time abandonou ou causou W.O. em rodadas anteriores deste torneio.</p>
               <p className="text-[10px] text-red-400 mt-4 uppercase font-bold tracking-widest bg-red-500/10 py-1.5 rounded border border-red-500/20">Inscrição Bloqueada pela Diretoria</p>
             </div>
          ) : alreadyJoined ? (
             <div className="text-center p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl"><CheckCircle className="text-emerald-500 mx-auto mb-2" size={32}/><p className="font-bold text-emerald-400">Você já está confirmado neste torneio!</p></div>
          ) : isPending ? (
             <div className="text-center p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl"><Activity className="text-amber-500 mx-auto mb-2" size={32}/><p className="font-bold text-amber-400">Inscrição em Análise!</p></div>
          ) : isBlockedByOtherComp ? (
             <div className="text-center p-4 bg-red-500/10 border border-red-500/30 rounded-xl"><XCircle className="text-red-500 mx-auto mb-2" size={32}/><p className="font-bold text-red-400">Inscrição Bloqueada</p><p className="text-xs text-red-200 mt-1">Você está disputando um torneio que foi restrito para esta competição.</p></div>
          ) : isFull ? (
             <div className="text-center p-4 bg-red-500/10 border border-red-500/30 rounded-xl"><XCircle className="text-red-500 mx-auto mb-2" size={32}/><p className="font-bold text-red-400">Inscrições Esgotadas</p></div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4 pt-4 border-t border-blue-800">
              <div className="flex items-center gap-3 bg-blue-950 p-3 rounded-xl border border-blue-800">
                <ShieldDisplay shield={userTeam.shield} size="normal" />
                <div><p className="text-[10px] text-blue-400 uppercase font-bold">Entrar com o time:</p><p className="font-bold text-white">{userTeam.name}</p></div>
              </div>
              
              {comp.isPaid && (
                <div>
                  <label className="text-xs font-bold text-blue-400 uppercase block mb-2">Anexar Comprovante PIX</label>
                  <label className={`block border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-colors ${receipt ? 'border-emerald-500 bg-emerald-500/10' : 'border-blue-700 hover:border-blue-500 bg-blue-950'}`}>
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => processImage(e.target.files[0], setReceipt)} />
                    {receipt ? <span className="text-emerald-400 font-bold flex items-center justify-center gap-2"><CheckCircle size={16}/> Comprovante Anexado</span> : <span className="text-blue-300 font-bold flex items-center justify-center gap-2"><UploadCloud size={16}/> Escolher Imagem</span>}
                  </label>
                </div>
              )}

              <Button type="submit" disabled={isSubmitting} className={`w-full py-4 text-lg font-black ${isFlashSolo || isFlashDupla ? 'bg-amber-600 hover:bg-amber-500 text-blue-950 shadow-[0_0_15px_rgba(245,158,11,0.3)]' : 'bg-emerald-600 hover:bg-emerald-500 text-white'}`}>
                {isSubmitting ? 'Enviando...' : (isFlashSolo ? '⚡ Inscrição Imediata' : 'Solicitar Inscrição')}
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
export default JoinCompetition;

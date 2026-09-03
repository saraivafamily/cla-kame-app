import React, { useState, useMemo, useEffect } from 'react';
import { PlusCircle, Trophy, Activity, AlertCircle, XCircle, BookOpen } from 'lucide-react';
import ShieldDisplay from './ShieldDisplay';
import Button from './Button';
import { calculateStandings, generateCupBracket, generateRoundRobin, generateGroupsAndKnockout, generateDuplasCupBracket } from '../utils/torneios';

const CreateCompetition = ({ teams, competitions, matches, currentUser, onCreate, showToast }) => {
  const [name, setName] = useState('');
  const [format, setFormat] = useState('league');
  const [category, setCategory] = useState('liga_a');
  
  const [playStyle, setPlayStyle] = useState('Livre');
  const [rules, setRules] = useState('');

  const [teamCount, setTeamCount] = useState('');
  const [numGroups, setNumGroups] = useState('1');
  const [qualifiers, setQualifiers] = useState('2');
  const [isDoubleRound, setIsDoubleRound] = useState(false);
  const [isFinalDouble, setIsFinalDouble] = useState(false);
  
  const [registrationStartTime, setRegistrationStartTime] = useState('');
  const [registrationStartDate, setRegistrationStartDate] = useState('');
  const [startDate, setStartDate] = useState('');
  const [deadline, setDeadline] = useState(''); 
  const [startTime, setStartTime] = useState('');
  
  const [flashDuration, setFlashDuration] = useState('60');
  const [isAutoJoin, setIsAutoJoin] = useState(true);

  const [isPaid, setIsPaid] = useState(false);
  const [entryFee, setEntryFee] = useState('');
  const [pixKey, setPixKey] = useState('');
  const [prize1st, setPrize1st] = useState('');
  const [prize2nd, setPrize2nd] = useState('');
  const [prize3rd, setPrize3rd] = useState('');
  const [passesToRaffle, setPassesToRaffle] = useState('');

  const [selectedTeams, setSelectedTeams] = useState([]);
  const [error, setError] = useState('');
  
  const [excludedCompIds, setExcludedCompIds] = useState([]);

  const CAT_NAMES = {
    liga_a: 'Liga Kame A', liga_b: 'Liga Kame B', liga_c: 'Liga Kame C', liga_d: 'Liga Kame D',
    liga_acesso: 'Liga de Acesso', copa_main: 'Copa Oficial',copa_estrela: 'Copa das estrelas', copa_estrelas: 'Copa das Estrelas', copa_do_rei: 'Copa do Rei',
    copa_amazonia: 'Copa da Amazônia', copa_flash: 'Copa Flash', copa_flash_dupla: 'Copa Flash em Duplas'
  };

  useEffect(() => {
    if (category === 'copa_flash' || category === 'copa_flash_dupla') { setFormat('cup'); }
    const compsOfCategory = (competitions || []).filter(c => c.category === category);
    const nextEditionNumber = compsOfCategory.length + 1;
    setName(`${CAT_NAMES[category] || 'Competição'} - Edição ${nextEditionNumber}`);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category, competitions]);

  const toggleTeam = (teamId) => {
    if (selectedTeams.includes(teamId)) setSelectedTeams(selectedTeams.filter(id => id !== teamId));
    else setSelectedTeams([...selectedTeams, teamId]);
  };

  const activeComps = useMemo(() => {
    return (competitions || []).filter(c => c.status === 'active');
  }, [competitions]);

  const busyTeamIds = useMemo(() => {
    const ids = new Set();
    (competitions || []).forEach(c => {
      if (excludedCompIds.includes(c.id) && c.teams) {
        c.teams.forEach(tId => ids.add(tId));
      }
    });
    return ids;
  }, [competitions, excludedCompIds]);

  const handleToggleExcludeComp = (compId) => {
    let newExcluded;
    if (excludedCompIds.includes(compId)) {
      newExcluded = excludedCompIds.filter(id => id !== compId);
    } else {
      newExcluded = [...excludedCompIds, compId];
    }
    setExcludedCompIds(newExcluded);
    
    const newBusyIds = new Set();
    (competitions || []).forEach(c => {
      if (newExcluded.includes(c.id) && c.teams) {
        c.teams.forEach(tId => newBusyIds.add(tId));
      }
    });
    setSelectedTeams(prev => prev.filter(id => !newBusyIds.has(id)));
  };

  const displayTeams = teams.filter(t => !busyTeamIds.has(t.id));

  const handleSmartImport = () => {
    // [Lógica Mantida Integralmente...]
    const HIERARCHY = ['liga_a', 'liga_b', 'liga_c', 'liga_d', 'liga_acesso'];
    const myIdx = HIERARCHY.indexOf(category);
    if (myIdx === -1) { if (showToast) showToast("A importação inteligente só funciona para Ligas oficiais.", "error"); return; }
    const targetSize = parseInt(teamCount, 10);
    if (!targetSize || targetSize <= 0) { if (showToast) showToast("Preencha a 'Qtd. Total de Vagas' antes de puxar os times!", "error"); return; }
    
    let importedTeams = new Set(); let logMsg = [];
    if (myIdx > 0) {
      const upperCat = HIERARCHY[myIdx - 1];
      const lastUpperLeague = (competitions || []).filter(c => c.category === upperCat).sort((a,b) => b.id.localeCompare(a.id))[0];
      if (lastUpperLeague && lastUpperLeague.relegations > 0) {
        const table = calculateStandings(matches, teams.filter(t => lastUpperLeague.teams?.includes(t.id)), lastUpperLeague.id);
        const relegated = table.slice(-lastUpperLeague.relegations);
        relegated.forEach(t => importedTeams.add(t.id));
        if (relegated.length > 0) logMsg.push(`${relegated.length} rebaixados da ${CAT_NAMES[upperCat]}`);
      }
    }
    const lastSameLeague = (competitions || []).filter(c => c.category === category).sort((a,b) => b.id.localeCompare(a.id))[0];
    if (lastSameLeague) {
      const table = calculateStandings(matches, teams.filter(t => lastSameLeague.teams?.includes(t.id)), lastSameLeague.id);
      const promo = lastSameLeague.promotions || 0; const rele = lastSameLeague.relegations || 0;
      const retained = table.slice(promo, table.length - rele);
      retained.forEach(t => importedTeams.add(t.id));
      if (retained.length > 0) logMsg.push(`${retained.length} mantidos`);
    }
    let missingSlots = targetSize - importedTeams.size;
    if (missingSlots > 0 && myIdx < HIERARCHY.length - 1) {
      const lowerCat = HIERARCHY[myIdx + 1];
      const lastLowerLeague = (competitions || []).filter(c => c.category === lowerCat).sort((a,b) => b.id.localeCompare(a.id))[0];
      if (lastLowerLeague) {
        const table = calculateStandings(matches, teams.filter(t => lastLowerLeague.teams?.includes(t.id)), lastLowerLeague.id);
        const promoted = table.slice(0, missingSlots); 
        promoted.forEach(t => importedTeams.add(t.id));
        if (promoted.length > 0) logMsg.push(`${promoted.length} promovidos da ${CAT_NAMES[lowerCat]}`);
      }
    }
    const finalTeamsList = Array.from(importedTeams);
    if (finalTeamsList.length === 0) { if (showToast) showToast("Não encontramos histórico anterior para preencher as vagas.", "info"); return; }
    setSelectedTeams(finalTeamsList); setIsAutoJoin(false);
    if (finalTeamsList.length < targetSize) { if (showToast) showToast(`Times Puxados: ${logMsg.join(', ')}. Faltaram ${targetSize - finalTeamsList.length} vagas!`, "warning"); } 
    else { if (showToast) showToast(`Tabela Completa! ${logMsg.join(' + ')}.`, "success"); }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // 🌟 CORREÇÃO VITAL: Auto Start (Ilimitado) AGORA É SÓ PARA A COPA FLASH SOLO
    const isFlashSolo = category === 'copa_flash';
    const parsedTeamCount = isFlashSolo ? 999 : parseInt(teamCount, 10);

    if (!name || !format || (!isFlashSolo && !teamCount) || !registrationStartDate || !startDate || !deadline || !startTime) { 
      setError('Preencha os dados básicos do torneio (incluindo todas as datas e horários).'); 
      return; 
    }
    
    if (!isFlashSolo) {
        if (!isAutoJoin && selectedTeams.length !== parsedTeamCount) { setError(`Atenção: Você selecionou ${selectedTeams.length} times, mas o limite é ${parsedTeamCount}.`); return; }
        if (isAutoJoin && selectedTeams.length > parsedTeamCount) { setError(`Atenção: Você pré-confirmou mais times (${selectedTeams.length}) que o limite.`); return; }
    }
    
    if (isPaid && (!entryFee || !pixKey || !prize1st || !prize2nd)) { setError('Em torneios pagos, preencha a taxa, a chave PIX e os prêmios.'); return; }

    setError(''); const compId = `c${Date.now()}`; let finalRounds = []; let groupsData = null;

    if (!isAutoJoin) {
      try {
        if (category === 'copa_flash_dupla') {
           const res = generateDuplasCupBracket(selectedTeams, compId, teams, matches, competitions);
           finalRounds = res.rounds;
           groupsData = res.duplas; 
        } else if (format === 'groups') {
          const res = generateGroupsAndKnockout(selectedTeams, compId, parseInt(numGroups), parseInt(qualifiers), isDoubleRound, isFinalDouble);
          finalRounds = res.rounds; groupsData = res.groups;
        } else if (format === 'cup') {
          finalRounds = generateCupBracket(selectedTeams, compId, isFinalDouble);
        } else {
          finalRounds = generateRoundRobin(selectedTeams, compId, isDoubleRound);
        }
      } catch (err) { setError(err.message || 'Erro ao gerar o chaveamento. Verifique a quantidade de times.'); return; }
    }

    const newComp = { 
      id: compId, name, format, deadline, startTime, category, playStyle, rules,
      registrationStartTime,
      registrationStartDate, startDate,
      teamCount: parsedTeamCount, 
      status: isAutoJoin ? 'registration' : 'active', 
      teams: selectedTeams, pendingTeams: [], 
      suspendedTeams: [], // 👈 NOVO CAMPO: Lista negra de desistentes do torneio começa vazia
      rounds: finalRounds,
      createdBy: currentUser?.name || 'Desconhecido', creatorId: currentUser?.id, admins: [currentUser?.id],  
      isDoubleRound, isFinalDouble, numGroups: parseInt(numGroups || '0', 10), qualifiersPerGroup: parseInt(qualifiers || '0', 10),
      flashDuration: isFlashSolo ? parseInt(flashDuration, 10) : null,
      excludedCompIds: excludedCompIds,
      ...(groupsData && { groups: groupsData }),
      isPaid: isPaid,
      ...(isPaid && {
        entryFee: parseFloat(entryFee), pixKey: pixKey,
        prizes: { first: parseFloat(prize1st), second: parseFloat(prize2nd), third: prize3rd ? parseFloat(prize3rd) : 0, passesCount: passesToRaffle ? parseInt(passesToRaffle, 10) : 0 }
      })
    };
    onCreate(newComp);
  };

  return (
    <div className="max-w-3xl mx-auto animate-in fade-in pb-12">
      <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2"><PlusCircle className="text-emerald-500"/> Nova Competição</h2>
      <form onSubmit={handleSubmit} className="space-y-6">
        {error && <div className="bg-amber-500/10 border border-amber-500/50 text-amber-400 p-4 rounded-xl flex items-center gap-3"><AlertCircle size={20} className="shrink-0" /><p className="text-sm font-medium">{error}</p></div>}
        <div className="bg-blue-900 pt-6 md:pt-8 rounded-3xl border border-blue-800 shadow-xl overflow-hidden">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 px-6 md:px-8">
            <h3 className="text-lg font-bold text-emerald-400 flex items-center gap-2"><Trophy size={18}/> Estrutura do Torneio</h3>
            <label className="flex items-center gap-2 cursor-pointer bg-blue-950 p-2 rounded-xl border border-blue-800"><input type="checkbox" checked={isAutoJoin} onChange={e=>setIsAutoJoin(e.target.checked)} className="w-5 h-5 accent-emerald-500 cursor-pointer" /><span className="text-sm font-bold text-white">Criar com Link de Inscrição</span></label>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 px-6 md:px-8">
            <div className="space-y-2"><label className="text-sm font-bold text-blue-300">Nome do Campeonato</label><input type="text" value={name} readOnly className="w-full bg-blue-950/50 border border-blue-800 rounded-xl p-3 text-blue-400 font-bold outline-none cursor-not-allowed" /></div>
            <div className="space-y-2"><label className="text-sm font-bold text-blue-300">Categoria (Divisão)</label>
              <select value={category} onChange={e=>setCategory(e.target.value)} className="w-full bg-blue-950 border border-amber-500/50 rounded-xl p-3 text-amber-400 font-bold focus:ring-2 focus:ring-emerald-500 outline-none shadow-inner">
                <option value="liga_a">🥇 Liga Kame A (Série A)</option>
                <option value="liga_b">🥈 Liga Kame B (Série B)</option>
                <option value="liga_c">🥉 Liga Kame C (Série C)</option>
                <option value="liga_d">🎖️ Liga Kame D (Série D)</option>
                <option value="liga_acesso">⬆️ Liga de Acesso</option>
                <option value="copa_main">🏆 Copas Oficiais</option>
                <option value="copa_estrelas">⭐ Copa das Estrelas</option>
                <option value="copa_do_rei">👑 Copa do Rei</option>
                <option value="copa_amazonia">🌳 Copa da Amazônia</option>
                <option value="copa_flash">⚡ Copa Flash Solo (Com Auto-Start)</option>
                <option value="copa_flash_dupla">👥 Copa Flash em Duplas (Manual)</option>             
              </select>
            </div>
            
            <div className="space-y-2">
                <label className="text-sm font-bold text-blue-300">Qtd. Total de Vagas (Times)</label>
                {category === 'copa_flash' ? (
                   <div className="w-full bg-amber-900/20 border border-amber-500/50 rounded-xl p-3 text-amber-400 font-black text-base text-center shadow-inner cursor-not-allowed">
                       ⚡ Ilimitado (Auto-Start)
                   </div>
                ) : (
                   <input type="number" min="2" placeholder={category === 'copa_flash_dupla' ? "Ex: 16 (precisa ser número par)" : "Ex: 8"} value={teamCount} onChange={e=>setTeamCount(e.target.value)} className="w-full bg-blue-950 border border-blue-700 rounded-xl p-3 text-emerald-400 font-black text-lg focus:ring-2 focus:ring-emerald-500 outline-none" required />
                )}
            </div>

            <div className="space-y-2"><label className="text-sm font-bold text-blue-300">Formato</label>
              <select value={format} onChange={e=>setFormat(e.target.value)} disabled={category === 'copa_flash' || category === 'copa_flash_dupla'} className="w-full bg-blue-950 border border-blue-700 rounded-xl p-3 text-white focus:ring-2 focus:ring-emerald-500 outline-none disabled:opacity-50 disabled:cursor-not-allowed"><option value="league">Pontos Corridos (Liga)</option><option value="cup">Mata-Mata (Copa)</option><option value="groups">Fase de Grupos + Mata-Mata</option></select>
            </div>
            <div className="space-y-2"><label className="text-sm font-bold text-blue-300">Estilo de Jogo</label>
              <select value={playStyle} onChange={e=>setPlayStyle(e.target.value)} className="w-full bg-blue-950 border border-purple-500/50 rounded-xl p-3 text-purple-300 font-bold focus:ring-2 focus:ring-emerald-500 outline-none"><option value="Livre">Livre (Qualquer Estilo)</option><option value="Full Razz">Full Razz (Sem Balão)</option><option value="Personalizado">Regras Especiais</option></select>
            </div>
            
            {category === 'copa_flash' && (
               <div className="space-y-2 animate-in slide-in-from-top-2 col-span-1 md:col-span-2 bg-amber-900/30 border border-amber-500/40 p-4 rounded-xl">
                 <label className="text-sm font-black text-amber-400 flex items-center gap-1.5"><Activity size={16}/> Tempo por Fase (Minutos)</label>
                 <p className="text-[10px] text-amber-200/70 mb-2">Quantos minutos cada rodada ficará aberta na Copa Flash Solo antes de rodar automático?</p>
                 <input type="number" min="5" value={flashDuration} onChange={e=>setFlashDuration(e.target.value)} className="w-full bg-blue-950 border border-amber-500/50 rounded-xl p-3 text-amber-400 font-bold focus:ring-2 focus:ring-amber-500 outline-none" required />
               </div>
            )}
            
            <div className="col-span-1 md:col-span-2 space-y-2 bg-emerald-900/20 border border-emerald-500/30 p-4 rounded-xl mb-2 mt-4">
              <label className="text-sm font-bold text-emerald-400">⏰ Abertura das Inscrições (Opcional)</label>
              <p className="text-[10px] text-emerald-200/70 mb-2">Se definir uma data e hora, os jogadores só poderão se inscrever quando o relógio zerar.</p>
              <input type="datetime-local" value={registrationStartTime} onChange={e => setRegistrationStartTime(e.target.value)} className="w-full bg-blue-950 border border-emerald-500/50 rounded-xl p-3 text-white text-sm outline-none focus:border-emerald-500" />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 col-span-1 md:col-span-2">
              <div className="space-y-2"><label className="text-sm font-bold text-blue-300">Início das Inscrições</label><input type="date" value={registrationStartDate} onChange={e=>setRegistrationStartDate(e.target.value)} className="w-full bg-blue-950 border border-blue-700 rounded-xl p-3 text-blue-100 focus:ring-2 focus:ring-emerald-500 outline-none" required /></div>
              <div className="space-y-2"><label className="text-sm font-bold text-blue-300">Início da Competição</label><input type="date" value={startDate} onChange={e=>setStartDate(e.target.value)} className="w-full bg-blue-950 border border-blue-700 rounded-xl p-3 text-blue-100 focus:ring-2 focus:ring-emerald-500 outline-none" required /></div>
              <div className="space-y-2"><label className="text-sm font-bold text-blue-300">Data Final / Prazo</label><input type="date" value={deadline} onChange={e=>setDeadline(e.target.value)} className="w-full bg-blue-950 border border-blue-700 rounded-xl p-3 text-blue-100 focus:ring-2 focus:ring-emerald-500 outline-none" required /></div>
              <div className="space-y-2"><label className="text-sm font-bold text-blue-300">Horário do Gatilho</label><input type="time" value={startTime} onChange={e=>setStartTime(e.target.value)} className="w-full bg-blue-950 border border-blue-700 rounded-xl p-3 text-amber-400 font-bold focus:ring-2 focus:ring-emerald-500 outline-none" required /></div>
            </div>
            
            <div className="flex flex-col md:flex-row gap-4 mt-2 col-span-1 md:col-span-2">
              {format !== 'cup' && (<label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={isDoubleRound} onChange={e=>setIsDoubleRound(e.target.checked)} className="w-5 h-5 accent-emerald-500 cursor-pointer" /><span className="text-sm font-bold text-blue-300">Fases de Grupo em Ida e Volta</span></label>)}
              {format !== 'league' && (<label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={isFinalDouble} onChange={e=>setIsFinalDouble(e.target.checked)} className="w-5 h-5 accent-amber-500 cursor-pointer" /><span className="text-sm font-bold text-amber-400">Final em Ida e Volta (2 Jogos)</span></label>)}
            </div>
            {format === 'groups' && (<><div className="space-y-2"><label className="text-sm font-bold text-blue-300">Quantidade de Grupos</label><input type="number" min="1" placeholder="Ex: 1, 2, 3, 4..." value={numGroups} onChange={e=>setNumGroups(e.target.value)} className="w-full bg-blue-950 border border-blue-700 rounded-xl p-3 text-white outline-none" required /></div><div className="space-y-2"><label className="text-sm font-bold text-blue-300">Classificados por Grupo</label><input type="number" min="1" placeholder="Ex: 2" value={qualifiers} onChange={e=>setQualifiers(e.target.value)} className="w-full bg-blue-950 border border-blue-700 rounded-xl p-3 text-white outline-none" required /></div></>)}
          </div>
          <div className="bg-blue-950/50 mt-6 p-6 md:p-8 border-t border-blue-800"><label className="text-sm font-bold text-sky-400 flex items-center gap-2 mb-2"><BookOpen size={16}/> Regras do Campeonato (Opcional)</label><textarea placeholder="Descreva aqui limites de overral de jogadores, times permitidos, ou regras de conduta específicas para este torneio..." value={rules} onChange={e=>setRules(e.target.value)} className="w-full bg-blue-900 border border-blue-700 focus:border-emerald-500 rounded-xl p-3 text-blue-200 text-sm min-h-[100px] outline-none resize-y" /></div>
        </div>
        <div className={`p-6 md:p-8 rounded-3xl border shadow-xl transition-colors ${isPaid ? 'bg-amber-500/10 border-amber-500/40' : 'bg-blue-900 border-blue-800'}`}>
          <div className="flex items-center justify-between mb-6"><h3 className={`text-lg font-bold flex items-center gap-2 ${isPaid ? 'text-amber-400' : 'text-blue-300'}`}>🤑 Torneio Premium (Pago)</h3><label className="relative inline-flex items-center cursor-pointer"><input type="checkbox" checked={isPaid} onChange={e=>setIsPaid(e.target.checked)} className="sr-only peer" /><div className="w-11 h-6 bg-blue-950 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-blue-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500 border border-blue-700"></div></label></div>
          {isPaid && (
            <div className="space-y-6 animate-in slide-in-from-top-2">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4"><div className="space-y-2"><label className="text-sm font-bold text-amber-400">Valor da Inscrição (R$)</label><input type="number" placeholder="Ex: 10.00" value={entryFee} onChange={e=>setEntryFee(e.target.value)} className="w-full bg-blue-950 border border-amber-500/30 rounded-xl p-3 text-white outline-none" required={isPaid} /></div><div className="space-y-2"><label className="text-sm font-bold text-amber-400">Sua Chave PIX</label><input type="text" placeholder="Celular, CPF ou E-mail" value={pixKey} onChange={e=>setPixKey(e.target.value)} className="w-full bg-blue-950 border border-amber-500/30 rounded-xl p-3 text-white outline-none" required={isPaid} /></div></div>
              <div className="pt-4 border-t border-amber-500/20"><h4 className="text-sm font-bold text-amber-200 mb-4">🏆 Distribuição dos Prêmios (Valores Fixos)</h4><div className="grid grid-cols-1 md:grid-cols-3 gap-4"><div className="space-y-2"><label className="text-xs font-bold text-amber-400">🥇 1º Lugar (R$)</label><input type="number" placeholder="Ex: 150.00" value={prize1st} onChange={e=>setPrize1st(e.target.value)} className="w-full bg-blue-950 border border-amber-500/30 rounded-xl p-2 text-white outline-none" required={isPaid} /></div><div className="space-y-2"><label className="text-xs font-bold text-amber-400">🥈 2º Lugar (R$)</label><input type="number" placeholder="Ex: 50.00" value={prize2nd} onChange={e=>setPrize2nd(e.target.value)} className="w-full bg-blue-950 border border-amber-500/30 rounded-xl p-2 text-white outline-none" required={isPaid} /></div><div className="space-y-2"><label className="text-xs font-bold text-amber-400">🥉 3º Lugar (Opcional)</label><input type="number" placeholder="Ex: 20.00" value={prize3rd} onChange={e=>setPrize3rd(e.target.value)} className="w-full bg-blue-950 border border-amber-500/30 rounded-xl p-2 text-white outline-none" /></div></div></div>
            </div>
          )}
        </div>
        
        <div className="bg-blue-900 p-6 md:p-8 rounded-3xl border border-blue-800 shadow-xl animate-in fade-in">
          
          <div className="flex flex-col gap-4 mb-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <label className="text-sm font-bold text-blue-300">
                {isAutoJoin 
                  ? `Equipes Pré-Confirmadas (Opcional: ${selectedTeams.length}${category === 'copa_flash' ? '' : `/${teamCount || '0'}`})` 
                  : `Marcar as Equipes Manualmente (Atualmente: ${selectedTeams.length} times selecionados)`}
              </label>
              
              {['liga_a', 'liga_b', 'liga_c', 'liga_d', 'liga_acesso'].includes(category) && (
                <button type="button" onClick={handleSmartImport} className="text-xs bg-amber-600 hover:bg-amber-500 text-blue-950 font-black px-4 py-2 rounded-xl shadow-lg border border-amber-400 transition-colors flex items-center gap-2">
                  🔄 Puxar Times Automático
                </button>
              )}
            </div>

            {activeComps.length > 0 && (
              <div className="bg-blue-950/50 p-3 md:p-4 rounded-xl border border-blue-800">
                <p className="text-[10px] text-red-400 font-bold uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                  <XCircle size={14}/> Ocultar times que já estão disputando:
                </p>
                <div className="flex flex-wrap gap-2">
                  {activeComps.map(c => (
                    <label key={c.id} className={`flex items-center gap-1.5 text-[10px] md:text-xs uppercase font-bold px-3 py-2 rounded-lg cursor-pointer border transition-colors ${excludedCompIds.includes(c.id) ? 'bg-red-500/20 border-red-500/50 text-red-300' : 'bg-blue-900 border-blue-700 text-blue-400 hover:border-blue-500'}`}>
                      <input 
                        type="checkbox" 
                        checked={excludedCompIds.includes(c.id)} 
                        onChange={() => handleToggleExcludeComp(c.id)} 
                        className="hidden" 
                      />
                      {excludedCompIds.includes(c.id) ? '🚫' : ''} {c.name}
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>
          
          {displayTeams.length === 0 ? <p className="text-blue-500 text-sm p-4 bg-blue-950 rounded border border-blue-800 border-dashed text-center">Nenhum time disponível para seleção com os filtros atuais.</p> : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {displayTeams.map(team => { 
                const isSelected = selectedTeams.includes(team.id); 
                return ( 
                  <div key={team.id} onClick={() => toggleTeam(team.id)} className={`cursor-pointer flex items-center gap-3 p-3 rounded-xl border transition-all ${isSelected ? 'bg-emerald-500/10 border-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.1)]' : 'bg-blue-950 border-blue-800 hover:border-blue-600'}`}>
                    <ShieldDisplay shield={team.shield} size="small" />
                    <span className={`font-medium text-sm truncate ${isSelected ? 'text-emerald-400' : 'text-blue-300'}`}>{team.name}</span>
                  </div> 
                ); 
              })}
            </div>
          )}
        </div>
        <Button type="submit" className={`w-full py-5 text-xl font-black mt-4 rounded-2xl ${isPaid ? 'bg-amber-500 hover:bg-amber-400 text-blue-950' : 'bg-emerald-500 hover:bg-emerald-400 text-blue-950'}`}>
          {isAutoJoin ? '🔗 Gerar Link de Inscrição' : '🏆 Criar e Gerar Tabela'}
        </Button>
      </form>
    </div>
  );
};

export default CreateCompetition;

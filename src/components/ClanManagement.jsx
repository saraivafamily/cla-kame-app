import React, { useState } from 'react';
import { Award, CheckCircle, Edit, XCircle, Users, UserPlus, UploadCloud } from 'lucide-react';
import ShieldDisplay from './ShieldDisplay';
import Button from './Button';
import { processImage } from '../utils/helpers';
import CreateCompetition from './CreateCompetition';

const inputClass = "w-full bg-blue-950 border border-blue-700 focus:border-emerald-500 rounded-lg p-3 text-white outline-none transition-colors text-sm";

const CreateTeamManual = ({ onCreate, showToast }) => {
  const [name, setName] = useState(''); const [coach, setCoach] = useState(''); const [shield, setShield] = useState(null);
  return (
    <form onSubmit={async (e)=>{e.preventDefault(); if(!name)return; await onCreate({id:`t${Date.now()}`,name,coach:coach||'Técnico',whatsapp:'',ownerId:'manual',shield:shield||'🛡️'}); showToast("Time salvo!"); setName(''); setCoach(''); setShield(null); }} className="max-w-xl mx-auto bg-blue-900 border border-blue-800 p-6 rounded-2xl space-y-4 animate-in fade-in">
      <h2 className="text-lg font-bold text-white flex items-center gap-2"><UserPlus size={18}/> Novo Time Simples</h2>
      <div><label className="text-xs text-blue-400 block mb-1">Nome do Clube</label><input required value={name} onChange={e=>setName(e.target.value)} className={inputClass}/></div>
      <div><label className="text-xs text-blue-400 block mb-1">Nome do Técnico</label><input value={coach} onChange={e=>setCoach(e.target.value)} className={inputClass}/></div>
      <div className="bg-blue-950 p-3 rounded-xl flex items-center justify-between"><span className="text-xs text-blue-400">Escudo do Time:</span><label className="cursor-pointer bg-blue-800 px-3 py-1.5 rounded text-xs text-white hover:bg-emerald-600"><UploadCloud size={14} className="inline mr-1"/> Enviar Imagem<input type="file" accept="image/*" className="hidden" onChange={e=>processImage(e.target.files[0],setShield)}/></label></div>
      {shield && <div className="text-center p-2"><ShieldDisplay shield={shield} size="large" /></div>}
      <Button type="submit" className="w-full py-3">Salvar Time</Button>
    </form>
  );
};

const CreateTeamFull = ({ onCreate, showToast }) => {
  const [fn, setFn] = useState(''); const [ln, setFnL] = useState(''); const [tn, setTn] = useState(''); const [wa, setWa] = useState(''); const [em, setEm] = useState(''); const [role, setRole] = useState('member');
  return (
    <form onSubmit={async (e)=>{e.preventDefault(); const cl=wa.replace(/\D/g,''); const name=`${fn} ${ln}`; await onCreate({user:{id:`pending_${cl}`,name,email:em.trim().toLowerCase(),role,whatsapp:cl},team:{id:`t${Date.now()}`,name:tn,coach:name,whatsapp:cl,ownerId:`pending_${cl}`,shield:'🛡️'}}); window.open(`https://wa.me/${cl}?text=${encodeURIComponent(`Fala ${fn}! Acesso liberado no Clã Kame DLS:\nLink: ${window.location.origin}\nAtive sua conta em "Primeiro Acesso" com seu E-mail: ${em}`)}`,'_blank'); setFn(''); setFnL(''); setTn(''); setWa(''); setEm(''); }} className="max-w-xl mx-auto bg-blue-900 border border-blue-800 p-6 rounded-2xl space-y-4 animate-in fade-in">
      <h2 className="text-lg font-bold text-white flex items-center gap-2"><Users size={18}/> Convidar Técnico Oficial</h2>
      <div className="grid grid-cols-2 gap-4"><div><input required placeholder="Nome" value={fn} onChange={e=>setFn(e.target.value)} className={inputClass}/></div><div><input required placeholder="Sobrenome" value={ln} onChange={e=>setFnL(e.target.value)} className={inputClass}/></div></div>
      <div><input required placeholder="Nome do Clube" value={tn} onChange={e=>setTn(e.target.value)} className={inputClass}/></div>
      <div className="grid grid-cols-2 gap-4"><div><input required placeholder="WhatsApp com DDD" value={wa} onChange={e=>setWa(e.target.value)} className={inputClass}/></div><div><input required placeholder="E-mail" type="email" value={em} onChange={e=>setEm(e.target.value)} className={inputClass}/></div></div>
      <div><select value={role} onChange={e=>setRole(e.target.value)} className={inputClass}><option value="member">Membro Oficial</option><option value="kaioh">Senhor Kaioh</option></select></div>
      <Button type="submit" className="w-full py-3">Gerar Convite & Chamar no Zap</Button>
    </form>
  );
};

const MembersList = ({ users = [], teams = [], currentUser, onUpdateUserRole, onExpelUser, onApproveUser, onEditUser, showToast }) => {
  const pendingUsers = users.filter(u => u.status === 'pending');
  const activeUsers = users.filter(u => u.status !== 'pending');
  
  // Verificação de segurança com acesso irrestrito para o e-mail Master
  const isSuperAdmin = currentUser?.email === 'saviosaraiva777@gmail.com';
  const isLeader = isSuperAdmin || currentUser?.role === 'leader' || currentUser?.role === 'kaioh';
  const isSupremeLeader = isSuperAdmin || currentUser?.role === 'leader'; 
  
  const [editingId, setEditingId] = useState(null);
  const [editData, setEditData] = useState({ name: '', whatsapp: '' });
  const [searchTerm, setSearchTerm] = useState('');

  const startEdit = (u) => {
    setEditingId(u.id);
    setEditData({ name: u.name, whatsapp: u.whatsapp });
  };

  const saveEdit = (u) => {
    if (!editData.name || !editData.whatsapp) {
      showToast("Preencha o nome e WhatsApp", "error");
      return;
    }
    onEditUser(u.id, editData);
    setEditingId(null);
  };

  // 🌟 CÓDIGO BLINDADO: A lógica de pesos foi movida para DENTRO do sort 
  // para não sofrer problemas de "initialization" (Tela Preta) no Vercel.
  const processedUsers = activeUsers
    .filter(u => (u.name || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
                 (teams.find(t => t.ownerId === u.id)?.name || '').toLowerCase().includes(searchTerm.toLowerCase()))
    .sort((a, b) => {
      // O peso fica embutido aqui dentro, impossível dar erro de escopo!
      const getPrio = (r) => {
        if (r === 'leader') return 1;
        if (r === 'kaioh') return 2;
        if (r === 'organizer') return 3;
        if (r === 'member') return 4;
        return 5;
      };
      
      const priorityA = getPrio(a.role);
      const priorityB = getPrio(b.role);
      
      if (priorityA !== priorityB) {
        return priorityA - priorityB; // Menor número sobe
      }
      return (a.name || '').localeCompare(b.name || ''); // Desempata no nome
    });

  return (
    <div className="space-y-6 animate-in fade-in">
      {isLeader && pendingUsers.length > 0 && (
        <div className="bg-blue-900 border border-amber-500/50 rounded-2xl overflow-hidden shadow-xl">
          <div className="p-4 bg-amber-500/10 border-b border-amber-500/20 flex items-center gap-2"><CheckCircle className="text-amber-500"/><h2 className="font-bold text-amber-500 text-base">Aguardando Aprovação ({pendingUsers.length})</h2></div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs whitespace-nowrap"><thead className="text-blue-400 font-bold border-b border-blue-800"><tr><th className="p-3">Técnico</th><th className="p-3">Clube</th><th className="p-3">WhatsApp</th><th className="p-3 text-center">Ação</th></tr></thead>
            <tbody className="divide-y divide-blue-800/40">
              {pendingUsers.map(u => {
                const t = teams.find(x => x.ownerId === u.id);
                return (
                  <tr key={u.id} className="hover:bg-blue-950/40">
                    <td className="p-3 font-bold text-blue-200">{u.name}</td><td className="p-3 text-amber-400 font-medium">{t?.name || 'S/ Clube'}</td><td className="p-3 font-mono text-blue-400">{u.whatsapp}</td>
                    <td className="p-3 flex justify-center gap-2">
                      <button onClick={()=>{if(window.confirm('Rejeitar cadastro?')) onExpelUser(u.id)}} className="bg-red-500/10 text-red-400 px-3 py-1.5 rounded hover:bg-red-500/20 transition-colors">Rejeitar</button>
                      <button onClick={()=>onApproveUser(u.id)} className="bg-emerald-500/10 text-emerald-400 px-3 py-1.5 rounded hover:bg-emerald-500/20 transition-colors">Aprovar</button>
                    </td>
                  </tr>
                )
              })}
            </tbody></table>
          </div>
        </div>
      )}

      <div className="bg-blue-900 border border-blue-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="p-4 border-b border-blue-800 flex flex-col sm:flex-row justify-between sm:items-center gap-3">
          <div className="flex items-center gap-2">
            <Award className="text-emerald-500"/>
            <h2 className="font-bold text-white text-base">Gestão de Elenco / Técnicos</h2>
          </div>
          {/* Barra de pesquisa inteligente */}
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Pesquisar técnico ou clube..."
            className="bg-blue-950 border border-blue-700 rounded-lg p-2 text-white text-xs outline-none focus:border-emerald-500 w-full sm:w-64"
          />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs whitespace-nowrap"><thead className="bg-blue-950/60 text-blue-400 font-bold border-b border-blue-800"><tr><th className="p-3">Técnico</th><th className="p-3">Clube</th><th className="p-3">WhatsApp</th><th className="p-3">Cargo</th><th className="p-3 text-center">Ação</th></tr></thead>
          <tbody className="divide-y divide-blue-800/40">
            {processedUsers.length === 0 ? (
              <tr><td colSpan="5" className="p-6 text-center text-blue-500 text-sm">Nenhum membro encontrado com essa busca.</td></tr>
            ) : (
              processedUsers.map(u => { 
                const t = teams.find(x => x.ownerId === u.id); 
                
                // Modo de Edição
                if (editingId === u.id) {
                  return (
                    <tr key={u.id} className="bg-blue-950/80">
                      <td className="p-3"><input type="text" value={editData.name} onChange={e=>setEditData({...editData, name: e.target.value})} className="bg-blue-900 border border-blue-700 rounded p-1 text-white w-full outline-none focus:border-emerald-500" /></td>
                      <td className="p-3 text-emerald-400 font-medium">{t?.name || 'S/ Clube'}</td>
                      <td className="p-3"><input type="text" value={editData.whatsapp} onChange={e=>setEditData({...editData, whatsapp: e.target.value})} className="bg-blue-900 border border-blue-700 rounded p-1 text-white w-full outline-none focus:border-emerald-500" /></td>
                      <td className="p-3"><span className="text-blue-500 italic">Editando...</span></td>
                      <td className="p-3 flex justify-center gap-2">
                        <button onClick={()=>setEditingId(null)} className="bg-blue-800 text-blue-400 px-3 py-1.5 rounded hover:bg-blue-700 transition-colors">Cancelar</button>
                        <button onClick={()=>saveEdit(u)} className="bg-emerald-600 text-white px-3 py-1.5 rounded hover:bg-emerald-500 shadow-lg transition-colors">Salvar</button>
                      </td>
                    </tr>
                  );
                }

                // Visualização Normal (Ordenada por Hierarquia!)
                return(
                  <tr key={u.id} className="hover:bg-blue-950/40">
                    <td className="p-3 font-bold text-blue-200">{u.name}</td><td className="p-3 text-emerald-400 font-medium">{t?.name || 'S/ Clube'}</td><td className="p-3 font-mono text-blue-400">{u.whatsapp}</td>
                    <td className="p-3">
                      <select disabled={!isSupremeLeader && currentUser?.id !== u.id} value={u.role || 'member'} onChange={e=>onUpdateUserRole(u.id, e.target.value)} className="bg-blue-900 text-blue-300 border border-blue-700 rounded p-1 outline-none disabled:opacity-50">
                        <option value="member">Membro</option>
                        <option value="organizer">Organizador</option>
                        <option value="kaioh">Kaioh</option>
                        <option value="leader">Líder</option>
                      </select>
                    </td>
                    <td className="p-3 flex justify-center gap-3 items-center">
                      {isSupremeLeader && <button onClick={()=>startEdit(u)} className="text-blue-500 hover:text-emerald-400 transition-colors p-1" title="Editar Técnico"><Edit size={16}/></button>}
                      {isLeader && <button onClick={()=>{if(window.confirm('Expulsar membro?')) onExpelUser(u.id)}} className="text-blue-500 hover:text-red-400 transition-colors p-1" title="Expulsar"><XCircle size={16}/></button>}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody></table>
        </div>
      </div>
    </div>
  );
};

const ClanManagement = ({
  currentUser, users, teams, matches, competitions,
  onExpelUser, onApproveUser, onEditUser, onUpdateUserRole,
  onCreateTeamAndUser, onCreateTeamManual, onCreateComp,
  showToast
}) => {
  const isLeaderOrKaioh = currentUser?.role === 'leader' || currentUser?.role === 'kaioh';
  const isOrganizer = currentUser?.role === 'organizer';
  const hasEventAccess = isLeaderOrKaioh || isOrganizer;

  // Se for organizador, cai direto na aba de Competições. Se for líder, cai nos Técnicos.
  const [activeTab, setActiveTab] = useState(isLeaderOrKaioh ? 'members' : 'comp');

  const pendingCount = users.filter(u => u.status === 'pending').length;

  return (
    <div className="space-y-6 animate-in fade-in pb-12 max-w-5xl mx-auto">
      <div className="bg-gradient-to-r from-blue-900 to-blue-950 p-6 rounded-3xl border border-blue-800 shadow-xl flex items-center gap-4">
        <div className="bg-blue-950 p-3 rounded-full border border-emerald-500/50 shadow-inner">
          <Award size={32} className="text-emerald-400" />
        </div>
        <div>
          <h2 className="text-2xl font-black text-white uppercase tracking-wider">Gestão Clã</h2>
          <p className="text-sm text-blue-400 mt-1">Painel administrativo para Líderes e Organizadores.</p>
        </div>
      </div>

      <div className="flex gap-2 p-1 bg-blue-950 rounded-xl border border-blue-800 overflow-x-auto custom-scrollbar">
        {isLeaderOrKaioh && (
          <>
            <button onClick={() => setActiveTab('members')} className={`shrink-0 flex-1 py-2 px-3 text-xs md:text-sm rounded-lg font-bold transition-all ${activeTab === 'members' ? 'bg-emerald-600 text-white shadow-md' : 'text-blue-500 hover:text-white'}`}>
              👥 Elenco
              {pendingCount > 0 && <span className="bg-amber-500 text-blue-950 px-1.5 py-0.5 rounded-full text-[10px] ml-1 shadow-sm">{pendingCount}</span>}
            </button>
            <button onClick={() => setActiveTab('invite')} className={`shrink-0 flex-1 py-2 px-3 text-xs md:text-sm rounded-lg font-bold transition-all ${activeTab === 'invite' ? 'bg-emerald-600 text-white shadow-md' : 'text-blue-500 hover:text-white'}`}>
              📩 Convidar
            </button>
            <button onClick={() => setActiveTab('manual')} className={`shrink-0 flex-1 py-2 px-3 text-xs md:text-sm rounded-lg font-bold transition-all ${activeTab === 'manual' ? 'bg-emerald-600 text-white shadow-md' : 'text-blue-500 hover:text-white'}`}>
              🤖 Time Simples
            </button>
          </>
        )}
        {hasEventAccess && (
           <button onClick={() => setActiveTab('comp')} className={`shrink-0 flex-1 py-2 px-3 text-xs md:text-sm rounded-lg font-bold transition-all ${activeTab === 'comp' ? 'bg-emerald-600 text-white shadow-md' : 'text-blue-500 hover:text-white'}`}>
             🏆 Nova Competição
           </button>
        )}
      </div>

      <div className="mt-4">
        {activeTab === 'members' && isLeaderOrKaioh && (
          <MembersList users={users} teams={teams} currentUser={currentUser} onExpelUser={onExpelUser} onApproveUser={onApproveUser} onEditUser={onEditUser} onUpdateUserRole={onUpdateUserRole} showToast={showToast} />
        )}
        {activeTab === 'invite' && isLeaderOrKaioh && (
          <CreateTeamFull onCreate={onCreateTeamAndUser} showToast={showToast} />
        )}
        {activeTab === 'manual' && isLeaderOrKaioh && (
          <CreateTeamManual onCreate={onCreateTeamManual} showToast={showToast} />
        )}
        {activeTab === 'comp' && hasEventAccess && (
          <CreateCompetition matches={matches} teams={teams} competitions={competitions} currentUser={currentUser} onCreate={onCreateComp} showToast={showToast} />
        )}
      </div>
    </div>
  );
};

export default ClanManagement;

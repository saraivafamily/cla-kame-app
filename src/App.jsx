import React, { useState, useEffect, useMemo, useRef } from 'react';
import { initializeApp } from 'firebase/app';
import Dashboard from './components/Dashboard';
import { auth, db, getPublicPath, getPublicDocPath } from './utils/firebase';
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged, sendPasswordResetEmail, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { getFirestore, doc, setDoc, updateDoc, onSnapshot, collection, deleteDoc, query, orderBy, limit, where, initializeFirestore, getDocs } from 'firebase/firestore';
import { PONTOS } from './utils/pontuacoes';
import { 
  calculateStandings, 
  getChampionIds, 
  generateCupBracket, 
  generateRoundRobin, 
  generateGroupsAndKnockout, 
  generateDuplasCupBracket 
} from './utils/torneios';
import ShieldDisplay from './components/ShieldDisplay';
import RulesPage from './components/RulesPage';
import TrainingCenter from './components/TrainingCenter';
import { Home, Trophy, Medal, Camera, CheckSquare, Users, LogOut, UploadCloud, CheckCircle, XCircle, AlertCircle, Activity, PlusCircle, ArrowLeft, PlayCircle, Lock, Shield, BookOpen, Trash2, Edit, Save, X, MessageCircle, Send, Crown, User, UserPlus, Award, Star, Key, Heart, MoreHorizontal, Target, Dices, Landmark, Wallet, ShoppingCart, Zap, Brain, Eye, Flame, Calendar, Globe } from 'lucide-react';
import { processImage, processScreenshot, ROLE_NAMES } from './utils/helpers';
import KameBank from './components/KameBank';
import KameStore from './components/KameStore';
import GlobalRanking from './components/GlobalRanking';
import SocialFeed from './components/SocialFeed';
import Profile from './components/Profile';
import PredictionsPanel from './components/PredictionsPanel';
import LoginScreen from './components/LoginScreen';
import Standings from './components/Standings';
import MatchDetails from './components/MatchDetails';
import TeamsList from './components/TeamsList';
import Button from './components/Button';
import CompetitionDetails from './components/CompetitionDetails';
import CreateCompetition from './components/CreateCompetition';
import JoinCompetition from './components/JoinCompetition';
import ClanManagement from './components/ClanManagement';
import CompetitionsList from './components/CompetitionsList';
import ValidationPanel from './components/ValidationPanel';
import SubmitMatch from './components/SubmitMatch';
import { DrawPanel, LiveDrawPanel } from './components/DrawPanels';
import TrophyRoom from './components/TrophyRoom';
import RecordsWall from './components/RecordsWall';


const LOGO_URL = "https://i.imgur.com/dhXA0ni.png"; 

const inputClass = "w-full bg-blue-950 border border-blue-700 focus:border-emerald-500 rounded-lg p-3 text-white outline-none transition-colors text-sm";

export default function App() {
  // 🛡️ BLINDAGEM TOTAL: Se a aba for anônima, o localStorage não derruba o React
  const [currentUser, setCurrentUser] = useState(() => { 
    try { 
      const saved = localStorage.getItem('claKame_user'); 
      return saved ? JSON.parse(saved) : null; 
    } catch (e) { return null; } 
  });

  const [feedPosts, setFeedPosts] = useState([]);
  const [lastSeenFeed, setLastSeenFeed] = useState(() => {
    try { return parseInt(localStorage.getItem('kame_last_seen_feed') || '0'); }
    catch (e) { return 0; }
  });

  const [storeProducts, setStoreProducts] = useState([]);
  const [predictions, setPredictions] = useState([]);
  
  const urlParams = new URLSearchParams(window.location.search);
  const joinIdFromUrl = urlParams.get('join');

  const [currentTab, setCurrentTab] = useState(joinIdFromUrl ? 'join_comp' : 'dashboard');
  const [selectedCompId, setSelectedCompId] = useState(joinIdFromUrl);
  
  const [selectedMatch, setSelectedMatch] = useState(null); 
  const [prevTab, setPrevTab] = useState('dashboard');
  const [users, setUsers] = useState([]); 
  const [matches, setMatches] = useState([]); 
  const [teams, setTeams] = useState([]); 
  const [competitions, setCompetitions] = useState([]);
  const [toastMessage, setToastMessage] = useState(null); 
  const [isFirebaseLoading, setIsFirebaseLoading] = useState(true);

  const handleTaskcompleted = async (taskName, reward) => {
    const today = new Date().toLocaleDateString('pt-BR');
    const taskKey = taskName === 'post' ? 'lastPostDate' : 'lastLikeDate';
    
    if (currentUser[taskKey] !== today) {
       const newCoins = (currentUser.kameCoins || 0) + reward;
       const updates = { kameCoins: newCoins, [taskKey]: today };
       await setDoc(getPublicDocPath('users', currentUser.id), updates, { merge: true });
       setCurrentUser(prev => ({...prev, ...updates}));
       showToast(`🎯 Missão Concluída! +${reward} kc`, "success");
    }
  };

  useEffect(() => {
    if (currentUser && currentUser.id) {
       const today = new Date().toLocaleDateString('pt-BR');
       let updates = {};
       let hasChanges = false;
       let msg = "";

       if (currentUser.kameCoins === undefined) {
          updates.kameCoins = 100;
          updates.receivedProfileBonus = !!currentUser.photoURL;
          if (currentUser.photoURL) updates.kameCoins += 50;
          hasChanges = true;
          msg = "🎁 Bônus de veterano: Conta atualizada! ";
       }

       const currentCoins = updates.kameCoins !== undefined ? updates.kameCoins : currentUser.kameCoins;

       if (currentUser.lastCheckInDate !== today) {
          updates.kameCoins = currentCoins + 1;
          updates.lastCheckInDate = today;
          hasChanges = true;
          msg += "📅 +1 bk de Check-in Diário!";
       }

       if (hasChanges) {
              setDoc(getPublicDocPath('users', currentUser.id), updates, { merge: true });
              setCurrentUser(prev => ({...prev, ...updates}));
              if (msg) setTimeout(() => showToast(msg.trim(), "success"), 2000);
           }
    }
  }, [currentUser?.id, currentUser?.lastCheckInDate, currentUser?.kameCoins]);

  useEffect(() => {
    if (joinIdFromUrl && currentUser) {
       window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [currentUser, joinIdFromUrl]);

  // 🚀 GATILHO AUTOMÁTICO DE ENCERRAMENTO DA COPA FLASH
  useEffect(() => {
    // O gatilho só roda no celular de um Líder/Kaioh para não duplicar o comando de criação
    if (!currentUser || (currentUser.role !== 'leader' && currentUser.role !== 'kaioh')) return;
    if (competitions.length === 0) return;

    const checkAutoStart = async () => {
       const now = Date.now();
       
       for (const comp of competitions) {
          const isFlash = comp.category === 'copa_flash';
          
          // Só atua se for Flash, se as inscrições estiverem abertas e tiver um horário definido
          if (isFlash && comp.status === 'registration' && comp.deadline && comp.startTime) {
             
             // Converte o "Dia e Hora" agendados em um Timestamp numérico real
             const targetTime = new Date(`${comp.deadline}T${comp.startTime}:00`).getTime();
             
             // Se o relógio bateu ou passou do horário programado:
             if (now >= targetTime) {
                showToast(`⏳ O tempo esgotou! Gerando tabela automática da ${comp.name}...`, "info");
                
                let finalRounds = []; 
                let groupsData = null;
                let finalTeams = [...(comp.teams || [])];

                // Regra de Segurança: Precisa de pelo menos 2 times para existir um torneio
                if (finalTeams.length < 2) {
                   showToast(`A ${comp.name} foi cancelada por falta de times.`, "error");
                   await updateDoc(getPublicDocPath('competitions', comp.id), { status: 'finished' });
                   continue;
                }

                  try {
                    // Como a Flash Dupla não roda mais automático, geramos apenas a tabela da Flash Solo
                    finalRounds = generateCupBracket(finalTeams, comp.id, comp.isFinalDouble);

                    // Grava o torneio como 'Ativo' e salva a tabela
                    await updateDoc(getPublicDocPath('competitions', comp.id), { 
                       status: 'active', 
                       teams: finalTeams, 
                       rounds: finalRounds, 
                       ...(groupsData && { groups: groupsData })
                    });
                    
                    showToast(`✅ ${comp.name} iniciada e chaves criadas!`, "success");

                } catch (err) {
                    console.error("Erro no Auto-Start:", err);
                    showToast("Erro ao gerar tabela automática.", "error");
                }
             }
          }
       }
    };

    // Checa o relógio a cada 10 segundos silenciosamente no fundo do app
    const interval = setInterval(checkAutoStart, 10000); 
    return () => clearInterval(interval);
  }, [competitions, currentUser, teams, matches]);

  const handleJoinComp = async (compId, teamId, receiptBase64) => {
    const comp = competitions.find(c => c.id === compId);
    if (!comp) { showToast("Erro: Campeonato não localizado no sistema.", "error"); return; }
    
    try {
      const isFlash = comp.category === 'copa_flash' || comp.category === 'copa_flash_dupla';
      
      if (isFlash) {
        // ⚡ INSCRIÇÃO IMEDIATA (COPA FLASH)
        const newTeams = [...(comp.teams || []), teamId];
        await updateDoc(getPublicDocPath('competitions', compId), { teams: newTeams });
        showToast("Você foi inscrito imediatamente na Copa Flash!", "success");
        setCurrentTab('dashboard');
      } else {
        // ⏳ INSCRIÇÃO TRADICIONAL (Vai para Análise dos Líderes)
        const newPending = [...(comp.pendingTeams || []), { teamId, receipt: receiptBase64, timestamp: Date.now() }];
        await updateDoc(getPublicDocPath('competitions', compId), { pendingTeams: newPending });
        showToast("Inscrição enviada com sucesso para os líderes!", "success");
        setCurrentTab('dashboard');
      }
    } catch (error) {
      showToast(`Falha no Servidor Cloud: ${error.message}`, "error"); throw error;
    }
  };
  
  const showToast = (text, type = 'success') => { let msg = text; if (typeof text === 'object') { msg = text.message ? text.message : JSON.stringify(text); } setToastMessage({ text: String(msg), type }); setTimeout(() => setToastMessage(null), 4000); };

  useEffect(() => {
    const unsubU = onSnapshot(getPublicPath('users'), snap => setUsers(snap.docs.map(d=>d.data())));
    const unsubT = onSnapshot(getPublicPath('teams'), snap => setTeams(snap.docs.map(d=>d.data())));
    const unsubC = onSnapshot(getPublicPath('competitions'), snap => setCompetitions(snap.docs.map(d=>d.data())));
    const unsubM = onSnapshot(getPublicPath('matches'), snap => setMatches(snap.docs.map(d=>d.data())));
    const unsubStore = onSnapshot(getPublicPath('store'), snap => setStoreProducts(snap.docs.map(d=>d.data())));
    
    const feedQuery = query(getPublicPath('feed'), orderBy('timestamp', 'desc'), limit(10));
    const unsubF = onSnapshot(feedQuery, snap => {
      const fetched = snap.docs.map(d => d.data());
      setFeedPosts(fetched);
    });

    const unsubP = onSnapshot(getPublicPath('predictions'), snap => {
      setPredictions(snap.docs.map(d => d.data()));
    });

    setIsFirebaseLoading(false); 
    return () => { unsubU(); unsubT(); unsubC(); unsubM(); unsubF(); unsubP(); unsubStore(); };
  }, []);

  // 🛡️ BLINDADO: Monitoramento de Login à prova de aba anônima
  useEffect(() => {
    try {
      if (currentUser) {
        localStorage.setItem('claKame_user', JSON.stringify(currentUser)); 
        const stillExists = users.find(u => u && u.id === currentUser.id);
        if (users.length > 0 && !stillExists) { 
           setCurrentUser(null); 
           localStorage.removeItem('claKame_user'); 
        } 
        else if (stillExists && (stillExists.role !== currentUser.role || stillExists.status !== currentUser.status || stillExists.kameCoins !== currentUser.kameCoins)) { 
          setCurrentUser(stillExists); 
        }
      } else { 
        localStorage.removeItem('claKame_user'); 
      }
    } catch (error) {
      console.warn("Aba anônima: localStorage ignorado.");
    }
  }, [users, currentUser]);
  
  const handleReleaseRound = async (compId, roundId) => { 
    const comp = competitions.find(c => c && c.id === compId); 
    if (!comp) return; 
    const rounds = comp.rounds.map(r => r.id === roundId ? { ...r, status: 'released', releasedAt: Date.now() } : r); 
    await updateDoc(getPublicDocPath('competitions', compId), { rounds }); 
    showToast("Rodada liberada! O tempo da Copa Flash começou a contar.", "success"); 
  };
  const handleLockRound = async (compId, roundId) => { const comp = competitions.find(c => c && c.id === compId); if (!comp) return; const rounds = comp.rounds.map(r => r.id === roundId ? { ...r, status: 'locked' } : r); await updateDoc(getPublicDocPath('competitions', compId), { rounds }); showToast("Rodada travada!", "success"); };
  const handleSelectComp = (id) => { setSelectedCompId(id); setCurrentTab('comp_details'); };
  const handleSelectMatch = (match) => { setSelectedMatch(match); setPrevTab(currentTab); setCurrentTab('match_details'); };
  const handleDeleteMatch = async (matchId) => { await deleteDoc(getPublicDocPath('matches', matchId)); showToast("Placar excluído!", "success"); };
  
  const handleEditTeam = async (updatedTeam) => { 
    const oldTeam = teams.find(t => t.id === updatedTeam.id);
    if (oldTeam && oldTeam.ownerId === 'manual' && updatedTeam.ownerId !== 'manual') {
      const userId = updatedTeam.ownerId;
      const linkedUser = users.find(u => u.id === userId);
      if (linkedUser) { updatedTeam.coach = linkedUser.name; updatedTeam.whatsapp = linkedUser.whatsapp; }
      try { await deleteDoc(getPublicDocPath('teams', `t_${userId}`)); } catch(e) {}
      showToast("Técnico vinculado e histórico migrado!", "success");
    } else {
      showToast("Time atualizado!", "success");
    }
    await updateDoc(getPublicDocPath('teams', updatedTeam.id), updatedTeam); 
  };

  const handleCreateTeamAndUser = async ({ user, team }) => { await setDoc(getPublicDocPath('users', user.id), user); await setDoc(getPublicDocPath('teams', team.id), team); setCurrentTab('teams_list'); showToast("Treinador registrado!"); return true; };
  
  const handleExpelUser = async (userId) => {
    await deleteDoc(getPublicDocPath('users', userId));
    const userTeam = teams.find(t => t.ownerId === userId);
    if (userTeam) {
      await updateDoc(getPublicDocPath('teams', userTeam.id), { ownerId: 'manual', whatsapp: '' });
      showToast("Técnico expulso. O time dele agora é manual (sem dono).", "success");
    } else {
      showToast("Técnico expulso com sucesso.", "success");
    }
  };

  const formatarParaEmail = (texto) => { const textoLimpo = String(texto).trim().toLowerCase(); if (textoLimpo.includes('@')) return textoLimpo; return textoLimpo.replace(/[-\s().]/g, '') + '@clakame.com'; };
  
  const handleRegister = async (data) => {
    const email = data.email.trim().toLowerCase();
    const cleanPhone = data.whatsapp.replace(/\D/g, '');
    const fullName = `${data.firstName} ${data.lastName}`.trim();
    
    const userCredential = await createUserWithEmailAndPassword(auth, email, data.password);
    const uid = userCredential.user.uid;
    
    const newUser = { id: uid, name: fullName, email: email, whatsapp: cleanPhone, role: 'member', status: 'pending', kameCoins: 100, receivedProfileBonus: false };
    const newTeam = { id: `t_${uid}`, name: data.teamName, coach: fullName, whatsapp: cleanPhone, ownerId: uid, shield: '🛡️' };
    
    await setDoc(getPublicDocPath('users', uid), newUser);
    await setDoc(getPublicDocPath('teams', newTeam.id), newTeam);
    
    await signOut(auth);
    showToast("Cadastro realizado! Aguarde a aprovação.", "success");
  };

  const handleLogin = async (identifier, password) => {
    const cleanPhone = String(identifier).replace(/\D/g, '');
    if (users.length === 0 && (String(identifier).toLowerCase().includes('savio') || cleanPhone === '91998270658')) { const masterUser = { id: 'u_master', name: 'Sávio Saraiva', role: 'leader', whatsapp: '91998270658', email: 'saviosaraiva777@gmail.com', password: password, status: 'active', kameCoins: 9999 }; await setDoc(getPublicDocPath('users', 'u_master'), masterUser); setCurrentUser(masterUser); setCurrentTab('dashboard'); return; }
    
    let emFake = formatarParaEmail(identifier); 
    let foundUser = null;
    if (users.length > 0) { 
      foundUser = users.find(u => u && ((u.email && u.email.toLowerCase() === identifier.trim().toLowerCase()) || (cleanPhone.length >= 8 && String(u.whatsapp) === cleanPhone))); 
      if (foundUser?.email) emFake = foundUser.email; 
    }
    
    if (foundUser && foundUser.status === 'pending') { throw new Error("Aguardando aprovação dos líderes."); }
    try { await signInWithEmailAndPassword(auth, emFake, password); } 
    catch (e) { throw new Error("Acesso negado. Verifique os dados."); }
  };

  const handleGoogleLogin = async (googleUser) => {
    const email = googleUser.email.toLowerCase();
    const existingUser = users.find(u => u.email && u.email.toLowerCase() === email);
    
    if (existingUser) {
      if (existingUser.status === 'pending') throw new Error("Sua conta ainda está aguardando aprovação dos líderes.");
      setCurrentUser(existingUser);
      setCurrentTab('dashboard');
    } else {
      const uid = googleUser.uid;
      const newUser = { 
        id: uid, 
        name: googleUser.displayName || 'Jogador Convidado', 
        email: email, 
        whatsapp: '00000000000', 
        role: 'member', 
        status: 'pending', 
        kameCoins: 100, 
        receivedProfileBonus: true,
        photoURL: googleUser.photoURL || null
      };
      const newTeam = { id: `t_${uid}`, name: 'Time Google', coach: googleUser.displayName || 'Jogador', whatsapp: '', ownerId: uid, shield: '🛡️' };
      
      await setDoc(getPublicDocPath('users', uid), newUser);
      await setDoc(getPublicDocPath('teams', newTeam.id), newTeam);
      
      await signOut(auth); 
      throw new Error("Cadastro via Google realizado! Aguarde a aprovação dos líderes.");
    }
  };

  const handleApproveUser = async (userId) => {
    await updateDoc(getPublicDocPath('users', userId), { status: 'active' });
    showToast("Técnico aprovado com sucesso!", "success");
  };

  useEffect(() => { const unsub = onAuthStateChanged(auth, (fbUser) => { if (fbUser && users.length > 0) { const found = users.find(u => u && (u.email?.toLowerCase() === fbUser.email?.toLowerCase())); if (found) setCurrentUser(found); } }); return () => unsub(); }, [users]);

  if (isFirebaseLoading) return (<div className="min-h-screen bg-blue-950 text-amber-400 flex items-center justify-center font-sans font-bold text-sm shadow-xl animate-pulse">🛡️ Carregando Arena Kame...</div>);
  if (!currentUser) return <LoginScreen onLogin={handleLogin} onRegister={handleRegister} onGoogleLogin={handleGoogleLogin} />;

  if (currentUser.status === 'pending') {
    return (
      <div className="min-h-screen bg-blue-950 flex flex-col items-center justify-center p-4">
        <div className="bg-blue-900 p-8 rounded-2xl border border-amber-500/30 text-center max-w-sm shadow-xl">
          <div className="text-amber-500 mb-4 flex justify-center"><AlertCircle size={48}/></div>
          <h2 className="text-xl font-bold text-white mb-2">Conta em Análise</h2>
          <p className="text-blue-400 text-sm mb-6">Aguardando aprovação dos líderes do clã. Você será avisado quando for liberado!</p>
          <Button onClick={() => {setCurrentUser(null); signOut(auth);}} className="w-full">Sair</Button>
        </div>
      </div>
    );
  }

  const isLeaderOrKaioh = currentUser.role === 'leader' || currentUser.role === 'kaioh';
  const isOrganizer = currentUser.role === 'organizer';
  const hasEventAccess = isLeaderOrKaioh || isOrganizer;
  
  const TABS = [
    { id: 'dashboard', label: 'Início', icon: Home }, 
    { id: 'profile', label: 'Meu Perfil', icon: User },
    { id: 'bank', label: 'Kame Bank', icon: Landmark },
    { id: 'predictions', label: 'Kame Bet', icon: Target },
    { id: 'competitions', label: 'Competições', icon: Medal },
    { id: 'teams_list', label: 'Times', icon: Shield }, 
    { id: 'ranking', label: 'Ranking Xclã', icon: Crown },
    { id: 'feed', label: 'Feed da Resenha', icon: MessageCircle },
    { id: 'trophies', label: 'Sala de Troféus', icon: Star },
    { id: 'records', label: 'Mural de Recordes', icon: Trophy },
    { id: 'rules', label: 'Regras do Clã', icon: BookOpen },
    
    // Apenas quem é da diretoria vê este botão
    ...(hasEventAccess ? [
      { id: 'training', label: 'CT Kame', icon: Brain },
      { id: 'store', label: 'Kame Store', icon: ShoppingCart },
      { id: 'gestao_cla', label: 'Gestão Clã', icon: Award }
    ] : []),
    ];

  const handleUpdateMatchStatus = async (id, st, updatedData = null) => {
    const updatePayload = { status: st };
    if (updatedData) {
      if (updatedData.scoreA !== undefined) updatePayload.scoreA = parseInt(updatedData.scoreA); 
      if (updatedData.scoreB !== undefined) updatePayload.scoreB = parseInt(updatedData.scoreB);
      if (updatedData.penaltiesA !== undefined) updatePayload.penaltiesA = parseInt(updatedData.penaltiesA); 
      if (updatedData.penaltiesB !== undefined) updatePayload.penaltiesB = parseInt(updatedData.penaltiesB);
    }
    await updateDoc(getPublicDocPath('matches', id), updatePayload);
    
    if (st === 'approved') {
      const match = matches.find(m => m && m.id === id); if (!match) return; 
      const comp = competitions.find(c => c && c.id === match.compId);

      // 🛡️ CORREÇÃO 1: Conversão estrita para números
      const finalScoreA = parseInt(updatedData && updatedData.scoreA !== undefined ? updatedData.scoreA : match.scoreA) || 0; 
      const finalScoreB = parseInt(updatedData && updatedData.scoreB !== undefined ? updatedData.scoreB : match.scoreB) || 0; 
      const finalPenaltiesA = updatedData && updatedData.penaltiesA !== undefined ? parseInt(updatedData.penaltiesA) : (match.penaltiesA !== null && match.penaltiesA !== undefined ? parseInt(match.penaltiesA) : null); 
      const finalPenaltiesB = updatedData && updatedData.penaltiesB !== undefined ? parseInt(updatedData.penaltiesB) : (match.penaltiesB !== null && match.penaltiesB !== undefined ? parseInt(match.penaltiesB) : null);
      
      const matchPreds = predictions.filter(p => p.matchId === match.matchId && (!p.status || p.status === 'pending')); 
      if (matchPreds.length > 0) {
         let realOutcome = 'D'; 
         if (finalScoreA > finalScoreB) realOutcome = 'A';
         else if (finalScoreB > finalScoreA) realOutcome = 'B';
         else if (finalPenaltiesA !== null && finalPenaltiesB !== null) {
            if (finalPenaltiesA > finalPenaltiesB) realOutcome = 'A';
            else if (finalPenaltiesB > finalPenaltiesA) realOutcome = 'B';
         }

         const userPayouts = {};

         for (const pred of matchPreds) {
            const isWin = pred.option === realOutcome;
            const betAmount = Number(pred.amount);
            const oddToUse = pred.lockedOdd || 1.1; 
            const payout = isWin ? Math.floor(betAmount * oddToUse) : 0;
            const profit = isWin ? (payout - betAmount) : -betAmount;

            if (payout > 0) {
               if (!userPayouts[pred.userId]) userPayouts[pred.userId] = 0;
               userPayouts[pred.userId] += payout;
            }
            
            await updateDoc(getPublicDocPath('predictions', pred.id), { status: isWin ? 'won' : 'lost', payout, profit });
         }

         // 🛡️ CORREÇÃO 2: Busca o saldo atualizado direto do banco para evitar sobreposição (Race Condition) na validação rápida
         for (const userId of Object.keys(userPayouts)) {
            const uQuery = query(getPublicPath('users'), where('id', '==', userId));
            const uSnap = await getDocs(uQuery);
            if (!uSnap.empty) {
               const uData = uSnap.docs[0].data();
               await updateDoc(getPublicDocPath('users', userId), { 
                 kameCoins: Number(uData.kameCoins || 0) + userPayouts[userId] 
               });
            }
         }
      }

      const tA = teams.find(t => t.id === match.teamA);
      const tB = teams.find(t => t.id === match.teamB);

      if (tA && tB) {
        const isFlash = comp?.category === 'copa_flash';
        const ptsPlay = isFlash ? PONTOS.FLASH.PLAY : PONTOS.NORMAL.PLAY;
        const ptsWin = isFlash ? PONTOS.FLASH.WIN : PONTOS.NORMAL.WIN;
        const ptsDraw = isFlash ? PONTOS.FLASH.DRAW : PONTOS.NORMAL.DRAW;
        const ptsPunicaoWo = isFlash ? PONTOS.FLASH.PUNICAO_WO : PONTOS.NORMAL.PUNICAO_WO;

        let winner = null;
        if (finalScoreA > finalScoreB) winner = 'A';
        else if (finalScoreB > finalScoreA) winner = 'B';
        else if (finalPenaltiesA !== null && finalPenaltiesB !== null) {
          if (finalPenaltiesA > finalPenaltiesB) winner = 'A';
          else if (finalPenaltiesB > finalPenaltiesA) winner = 'B';
        }

        let addPtsA = 0; let addPtsB = 0;
        let winsA = 0; let winsB = 0;
        let drawsA = 0; let drawsB = 0;

        let isWoMe = false; let isWoOpp = false;
        const obs = (match.observacoes || '').toLowerCase();
        if (obs.includes('w.o') || obs.includes('wo')) {
           if (obs.includes('duplo')) { isWoMe = true; isWoOpp = true; }
           else if (finalScoreA === 0 && finalScoreB === 3) isWoMe = true;
           else if (finalScoreB === 0 && finalScoreA === 3) isWoOpp = true;
        }

        // 🛡️ NOVA REGRA: Punição (-10), zera pontos e SUSPENDE o infrator do torneio!
        if (isWoMe || isWoOpp) {
           const suspendedTeams = comp.suspendedTeams || [];
           let newSuspended = [...suspendedTeams];
           
           if (isWoMe && !newSuspended.includes(tA.id)) newSuspended.push(tA.id);
           if (isWoOpp && !newSuspended.includes(tB.id)) newSuspended.push(tB.id);

           // Remove o time da lista de confirmados para limpar a chave futura se houver repescagem
           const newTeams = (comp.teams || []).filter(tId => !newSuspended.includes(tId));
           
           await updateDoc(getPublicDocPath('competitions', comp.id), { 
              suspendedTeams: newSuspended,
              teams: newTeams
           });
        }

        if (isWoMe) addPtsA = ptsPunicaoWo;
        else addPtsA = ptsPlay;
        
        if (isWoOpp) addPtsB = ptsPunicaoWo;
        else addPtsB = ptsPlay;

        if (winner === 'A') { 
            if (!isWoMe) addPtsA += ptsWin; 
            winsA = 1; 
        }
        else if (winner === 'B') { 
            if (!isWoOpp) addPtsB += ptsWin; 
            winsB = 1; 
        }
        else { 
            if (!isWoMe) addPtsA += ptsDraw; 
            if (!isWoOpp) addPtsB += ptsDraw; 
            drawsA = 1; drawsB = 1; 
        }

        const isKnockoutMatch = match.matchId.includes('_ko_') || comp?.format === 'cup';
        const roundDetails = comp?.rounds?.find(r => r.id === match.roundId);
        
        if (isKnockoutMatch && roundDetails) {
          const rName = roundDetails.number;
          if (rName === 'Oitavas') { addPtsA += (isFlash ? 0 : 5); addPtsB += (isFlash ? 0 : 5); }
          if (rName === 'Quartas') { addPtsA += (isFlash ? 2 : 10); addPtsB += (isFlash ? 2 : 10); }
          if (rName === 'Semifinal') { addPtsA += (isFlash ? 5 : 15); addPtsB += (isFlash ? 5 : 15); }
          if (rName === 'Final' && match.matchId.includes('_3rd')) {
            if (winner === 'A') addPtsA += (isFlash ? 5 : 15);
            else if (winner === 'B') addPtsB += (isFlash ? 5 : 15);
          }
        }

        // 🛡️ CORREÇÃO 3: Atualizando os times pegando os dados mais recentes também
        const tAQuery = query(getPublicPath('teams'), where('id', '==', tA.id));
        const tBQuery = query(getPublicPath('teams'), where('id', '==', tB.id));
        const [tASnap, tBSnap] = await Promise.all([getDocs(tAQuery), getDocs(tBQuery)]);

        if (!tASnap.empty) {
           const tAData = tASnap.docs[0].data();
           await updateDoc(getPublicDocPath('teams', tA.id), {
             globalPoints: (tAData.globalPoints || 0) + addPtsA,
             playedMatches: (tAData.playedMatches || 0) + 1,
             totalWins: (tAData.totalWins || 0) + winsA,
             totalDraws: (tAData.totalDraws || 0) + drawsA,
             goalsFor: (tAData.goalsFor || 0) + finalScoreA,
             goalsAgainst: (tAData.goalsAgainst || 0) + finalScoreB
           });
        }
        
        if (!tBSnap.empty) {
           const tBData = tBSnap.docs[0].data();
           await updateDoc(getPublicDocPath('teams', tB.id), {
             globalPoints: (tBData.globalPoints || 0) + addPtsB,
             playedMatches: (tBData.playedMatches || 0) + 1,
             totalWins: (tBData.totalWins || 0) + winsB,
             totalDraws: (tBData.totalDraws || 0) + drawsB,
             goalsFor: (tBData.goalsFor || 0) + finalScoreB,
             goalsAgainst: (tBData.goalsAgainst || 0) + finalScoreA
           });
        }
      }

      if (comp && (comp.format === 'cup' || comp.format === 'groups' || comp.category === 'copa_flash_dupla')) {
        let winnerId = null; 
        
        if (comp.category === 'copa_flash_dupla') {
           const isIda = match.matchId.includes('_ida');
           const partnerMatchId = match.matchId.replace(isIda ? '_ida' : '_volta', isIda ? '_volta' : '_ida');
           
           const qPartner = query(getPublicPath('matches'), where('matchId', '==', partnerMatchId), where('compId', '==', comp.id), where('status', '==', 'approved'));
           const snapPartner = await getDocs(qPartner);
           
           if (!snapPartner.empty) {
               const partnerMatch = snapPartner.docs[0].data();
               
               const currentRoundUI = comp.rounds.find(r => r.id === match.roundId);
               const idaMatchId = isIda ? match.matchId : partnerMatchId;
               const idaMatchUI = currentRoundUI.matches.find(x => x.id === idaMatchId);
               
               const duplaA = idaMatchUI.duplaA; 
               const duplaB = idaMatchUI.duplaB;

               let aggScoreA = 0; let aggScoreB = 0; let aggPenA = 0; let aggPenB = 0;
               
               if (isIda) {
                 aggScoreA = finalScoreA + Number(partnerMatch.scoreB||0); 
                 aggScoreB = finalScoreB + Number(partnerMatch.scoreA||0);
                 aggPenA = (finalPenaltiesA||0) + Number(partnerMatch.penaltiesB||0);
                 aggPenB = (finalPenaltiesB||0) + Number(partnerMatch.penaltiesA||0);
               } else {
                 aggScoreA = Number(partnerMatch.scoreA||0) + finalScoreB;
                 aggScoreB = Number(partnerMatch.scoreB||0) + finalScoreA;
                 aggPenA = Number(partnerMatch.penaltiesA||0) + (finalPenaltiesB||0);
                 aggPenB = Number(partnerMatch.penaltiesB||0) + (finalPenaltiesA||0);
               }

               if (aggScoreA > aggScoreB) winnerId = duplaA; 
               else if (aggScoreB > aggScoreA) winnerId = duplaB;
               else if (aggPenA > aggPenB) winnerId = duplaA;
               else if (aggPenB > aggPenA) winnerId = duplaB;
               else {
                   winnerId = Math.random() < 0.5 ? duplaA : duplaB;
               }
           }
        } else {
           if (finalScoreA > finalScoreB) winnerId = match.teamA; 
           else if (finalScoreB > finalScoreA) winnerId = match.teamB; 
           else if (finalPenaltiesA !== null && finalPenaltiesA !== undefined) { 
             if (finalPenaltiesA > finalPenaltiesB) winnerId = match.teamA; 
             else if (finalPenaltiesB > finalPenaltiesA) winnerId = match.teamB; 
           }
        }
        
        if (winnerId) {
          const rIndex = comp.rounds.findIndex(r => r && r.id === match.roundId); 
          const isKnockoutMatch = match.matchId.includes('_ko_') || comp.format === 'cup' || comp.category === 'copa_flash_dupla';
          
          const divisorIndex = comp.category === 'copa_flash_dupla' ? 4 : 2;

          if (rIndex >= 0 && rIndex < comp.rounds.length - 1 && isKnockoutMatch) {
            const mIndex = comp.rounds[rIndex].matches.findIndex(m => m && m.id === match.matchId);
            if (mIndex >= 0) {
               const nextRIndex = rIndex + 1; 
               const nextMIndex = Math.floor(mIndex / divisorIndex) * (comp.category === 'copa_flash_dupla' ? 2 : 1); 
               const isTeamA = (Math.floor(mIndex / (comp.category === 'copa_flash_dupla' ? 2 : 1)) % 2) === 0; 
               const newRounds = JSON.parse(JSON.stringify(comp.rounds)); 

               if (comp.category === 'copa_flash_dupla') {
                   if (isTeamA) {
                       newRounds[nextRIndex].matches[nextMIndex].duplaA = winnerId;
                       newRounds[nextRIndex].matches[nextMIndex].teamA = winnerId.p1;
                       newRounds[nextRIndex].matches[nextMIndex].placeholderA = `${winnerId.name} (Téc 1)`;
                       
                       newRounds[nextRIndex].matches[nextMIndex + 1].duplaB = winnerId;
                       newRounds[nextRIndex].matches[nextMIndex + 1].teamB = winnerId.p2;
                       newRounds[nextRIndex].matches[nextMIndex + 1].placeholderB = `${winnerId.name} (Téc 2)`;
                   } else {
                       newRounds[nextRIndex].matches[nextMIndex].duplaB = winnerId;
                       newRounds[nextRIndex].matches[nextMIndex].teamB = winnerId.p1;
                       newRounds[nextRIndex].matches[nextMIndex].placeholderA = `${winnerId.name} (Téc 1)`;

                       newRounds[nextRIndex].matches[nextMIndex + 1].duplaA = winnerId;
                       newRounds[nextRIndex].matches[nextMIndex + 1].teamA = winnerId.p2;
                       newRounds[nextRIndex].matches[nextMIndex + 1].placeholderA = `${winnerId.name} (Téc 2)`;
                   }
               } else {
                   const loserId = winnerId === match.teamA ? match.teamB : match.teamA;
                   const isNextRoundFinal = newRounds[nextRIndex].matches.some(x => x.id.includes('_f1') || x.id.includes('_3rd'));

                   if (isNextRoundFinal) {
                      newRounds[nextRIndex].matches.forEach(nextMatch => {
                         if (nextMatch.id.includes('_3rd')) {
                            if (isTeamA) nextMatch.teamA = loserId; else nextMatch.teamB = loserId;
                         } else {
                            if (nextMatch.id.includes('_f2')) {
                               if (isTeamA) nextMatch.teamB = winnerId; else nextMatch.teamA = winnerId;
                            } else {
                               if (isTeamA) nextMatch.teamA = winnerId; else nextMatch.teamB = winnerId;
                            }
                         }
                      });
                   } else {
                      if (isTeamA) newRounds[nextRIndex].matches[nextMIndex].teamA = winnerId; 
                      else newRounds[nextRIndex].matches[nextMIndex].teamB = winnerId;
                   }
               }
               await updateDoc(getPublicDocPath('competitions', comp.id), { rounds: newRounds });
            }
          }
        }
      }
    }
  };
  
  const handleEditUser = async (userId, updatedData) => {
    await updateDoc(getPublicDocPath('users', userId), { name: updatedData.name, whatsapp: updatedData.whatsapp });
    const userTeam = teams.find(t => t.ownerId === userId);
    if (userTeam) { await updateDoc(getPublicDocPath('teams', userTeam.id), { coach: updatedData.name, whatsapp: updatedData.whatsapp }); }
    showToast("Dados do técnico atualizados com sucesso!", "success");
  };
  
  const renderContent = () => {
    switch (currentTab) {
      case 'dashboard': return <Dashboard matches={matches} teams={teams} competitions={competitions} currentUser={currentUser} onSelectMatch={handleSelectMatch} onDeleteMatch={handleDeleteMatch} onChangeTab={setCurrentTab} onJoinOpenComp={(id) => { setSelectedCompId(id); setCurrentTab('join_comp'); }} />;
      case 'profile': return <Profile currentUser={currentUser} teams={teams} matches={matches} competitions={competitions} onEditTeam={handleEditTeam} onUpdateUserPhoto={async (url) => { 
          const updates = { photoURL: url }; let rewardMsg = "";
          if (!currentUser.receivedProfileBonus) {
            updates.kameCoins = (currentUser.kameCoins || 0) + 50;
            updates.receivedProfileBonus = true;
            rewardMsg = " 🎁 +50 bc de Bônus ganho!";
          }
          await updateDoc(getPublicDocPath('users', currentUser.id), updates); 
          setCurrentUser(prev => ({...prev, ...updates})); 
          showToast("Foto atualizada!" + rewardMsg, "success"); 
        }} />;

      case 'bank': return <KameBank currentUser={currentUser} users={users} predictions={predictions} matches={matches} teams={teams} showToast={showToast} />;
      case 'teams_list': return <TeamsList teams={teams} users={users} currentUser={currentUser} matches={matches} competitions={competitions} onEditTeam={handleEditTeam} onDeleteTeam={async (id) => { await deleteDoc(getPublicDocPath('teams', id)); showToast("Time excluído com sucesso!", "success"); }} />;
      case 'competitions': return <CompetitionsList competitions={competitions} teams={teams} currentUser={currentUser} onSelectComp={handleSelectComp} onDeleteComp={id => deleteDoc(getPublicDocPath('competitions', id))} />;
      case 'ranking': return <GlobalRanking teams={teams} matches={matches} competitions={competitions} currentUser={currentUser} showToast={showToast} />;
      case 'predictions': return <PredictionsPanel competitions={competitions} matches={matches} teams={teams} users={users} currentUser={currentUser} predictions={predictions} showToast={showToast} onSavePrediction={async (p, oldAmount) => { 
          const currentCoins = Number(currentUser.kameCoins) || 0;
          const betCost = Number(p.amount) - Number(oldAmount);
          const newBalance = Math.max(0, currentCoins - betCost); 
          
          await updateDoc(getPublicDocPath('users', currentUser.id), { kameCoins: newBalance });
          setCurrentUser(prev => ({...prev, kameCoins: newBalance}));
          await setDoc(getPublicDocPath('predictions', p.id), p); 
      }} />;
        
     case 'comp_details': return <CompetitionDetails users={users} comp={competitions.find(c=>c.id===selectedCompId)} teams={teams} matches={matches} competitions={competitions} currentUser={currentUser} onBack={()=>setCurrentTab('competitions')} onReleaseRound={handleReleaseRound} onLockRound={handleLockRound} onEditComp={async (c) => { await updateDoc(getPublicDocPath('competitions', c.id), c); showToast("Atualizado!", "success"); }} onUpdatePlayedMatch={async (m) => { await updateDoc(getPublicDocPath('matches', m.id), m); }} onDeleteMatch={handleDeleteMatch} showToast={showToast} onSubmitMatch={async (m) => { try { await setDoc(getPublicDocPath('matches', m.id), m); showToast("Resultado enviado!"); } catch(e) { showToast("Erro ao salvar no banco: " + e.message, "error"); } }} onUpdateMatchStatus={(id,st, updatedData=null)=>handleUpdateMatchStatus(id,st,updatedData)} onBatchUpdateComp={async (updatedComp, newMatchesArray) => { await updateDoc(getPublicDocPath('competitions', updatedComp.id), updatedComp); const promises = newMatchesArray.map(m => setDoc(getPublicDocPath('matches', m.id), m)); await Promise.all(promises); showToast("Fase encerrada e chaves atualizadas!", "success"); }} />;
      case 'match_details': return <MatchDetails match={selectedMatch} teams={teams} competitions={competitions} onBack={() => setCurrentTab(prevTab)} />;
      case 'training': return <TrainingCenter currentUser={currentUser} showToast={showToast} />;
      case 'store': return <KameStore currentUser={currentUser} storeProducts={storeProducts} showToast={showToast} />;
      
      // 🌟 NOVA ROTA UNIFICADA DA GESTÃO CLÃ
      case 'gestao_cla': 
        return <ClanManagement 
          currentUser={currentUser} users={users} teams={teams} matches={matches} competitions={competitions} 
          onExpelUser={handleExpelUser} onApproveUser={handleApproveUser} onEditUser={handleEditUser} 
          onUpdateUserRole={(id,role)=>updateDoc(getPublicDocPath('users',id),{role})} 
          onCreateTeamAndUser={handleCreateTeamAndUser} 
          onCreateTeamManual={t => setDoc(getPublicDocPath('teams', t.id), t).then(()=>setCurrentTab('teams_list'))} 
          onCreateComp={c => setDoc(getPublicDocPath('competitions', c.id), c).then(()=>setCurrentTab('competitions'))} 
          showToast={showToast} 
        />;

      case 'feed': return <SocialFeed currentUser={currentUser} teams={teams} showToast={showToast} posts={feedPosts} onTaskcompleted={handleTaskcompleted} />;
      case 'join_comp': return <JoinCompetition compId={selectedCompId} competitions={competitions} teams={teams} currentUser={currentUser} onJoin={handleJoinComp} onBack={()=>setCurrentTab('dashboard')} showToast={showToast} onEditComp={async (c) => { await updateDoc(getPublicDocPath('competitions', c.id), c); setCurrentTab('competitions'); }} />;

      case 'records': return <RecordsWall showToast={showToast} currentUser={currentUser} />;
      case 'trophies': return <TrophyRoom competitions={competitions} matches={matches} teams={teams} />;
      case 'rules': return <RulesPage />;
      case 'validation': return <ValidationPanel matches={matches} teams={teams} competitions={competitions} onUpdateStatus={(id,st, updatedData=null)=>handleUpdateMatchStatus(id,st,updatedData)} showToast={showToast} currentUser={currentUser} />;
        
      default: return <Dashboard matches={matches} teams={teams} competitions={competitions} currentUser={currentUser} onSelectMatch={handleSelectMatch} onDeleteMatch={handleDeleteMatch} onChangeTab={setCurrentTab} onJoinOpenComp={(id) => { setSelectedCompId(id); setCurrentTab('join_comp'); }} />;
    }
  };

  return (
    <div className="min-h-screen bg-blue-950 text-blue-200 font-sans flex flex-col md:flex-row relative">
      {toastMessage && (
        <div className={`fixed top-4 right-4 z-50 px-6 py-3 rounded-xl shadow-2xl flex items-center gap-3 animate-in slide-in-from-top-4 ${toastMessage.type === 'error' ? 'bg-red-950 border border-red-500 text-red-100' : 'bg-blue-800 border border-emerald-500 text-white'}`}>
          {toastMessage.type === 'error' ? <AlertCircle className="text-red-500" size={20} /> : <CheckCircle className="text-emerald-500" size={20} />}
          <span className="font-medium text-sm">{String(toastMessage.text)}</span>
        </div>
      )}

      <aside className="w-full md:w-64 bg-blue-900 border-b md:border-b-0 md:border-r border-blue-800 flex flex-col shrink-0 z-10 shadow-2xl">
        <div className="p-6 flex items-center gap-3"><img src={LOGO_URL} alt="Clã Kame" className="w-24 h-24" /><div><h1 className="font-bold text-white text-lg">Clã Kame</h1><p className="text-[10px] text-emerald-400 font-bold uppercase">Arena DLS</p></div></div>
        
        <nav className="flex-1 px-4 pb-4 overflow-y-auto flex md:flex-col gap-2 overflow-x-auto custom-scrollbar">
          {TABS.map(tab => {
            const isActive = currentTab === tab.id || (tab.id === 'competitions' && currentTab === 'comp_details'); 
            const Icon = tab.icon;
            
            const hasNewFeed = tab.id === 'feed' && feedPosts.length > 0 && feedPosts[0].timestamp > lastSeenFeed;

            return ( 
              <button 
                key={tab.id} 
                onClick={() => {
                  if (tab.id === 'feed') {
                    const now = Date.now();
                    setLastSeenFeed(now);
                    // 🛡️ BLINDADO
                    try { localStorage.setItem('kame_last_seen_feed', now.toString()); } catch(e){}
                  }
                  setCurrentTab(tab.id);
                }} 
                className={`relative flex items-center gap-3 px-4 py-3 rounded-xl whitespace-nowrap outline-none border ${isActive ? 'bg-emerald-500/10 text-emerald-400 font-bold border-emerald-500/20' : 'text-blue-400 hover:bg-blue-800 hover:text-blue-200 border-transparent'}`}
              >
                <Icon size={18} /> 
                <span className="text-sm">{tab.label}</span>
                
                {hasNewFeed && (
                  <span className="absolute top-3 right-3 w-2.5 h-2.5 bg-red-500 rounded-full shadow-[0_0_8px_rgba(239,68,68,0.8)] animate-pulse"></span>
                )}

                {(tab.id === 'competitions' && hasEventAccess && matches.filter(m=>m?.status==='pending').length > 0) && <span className="ml-auto bg-amber-500 text-blue-950 text-xs font-bold px-2 py-0.5 rounded-full shadow-md">{matches.filter(m=>m?.status==='pending').length}</span>}
              </button> 
            );
          })}
        </nav>
        
        <div className="p-4 border-t border-blue-800 hidden md:block">
          <div className="bg-blue-950 rounded-xl p-4 border border-blue-800/50 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500"></div>
            <p className="font-bold text-white text-sm truncate">{String(currentUser?.name)}</p>
            <p className="text-[10px] text-emerald-400 uppercase font-bold mb-3">{ROLE_NAMES[currentUser?.role]}</p>
            
            <div className="bg-blue-900/50 border border-amber-500/30 rounded-lg p-2.5 mb-3 flex items-center justify-between shadow-inner">
               <span className="text-[10px] text-amber-400 font-bold uppercase tracking-wider flex items-center gap-1.5"><Star size={12}/> Saldo</span>
               <span className="text-sm font-black text-white">{currentUser?.kameCoins || 0} <span className="text-amber-500 text-xs">bk</span></span>
            </div>

            <button onClick={() => { setCurrentUser(null); signOut(auth); }} className="w-full text-xs text-blue-400 hover:text-white py-1.5 rounded bg-blue-900 border border-blue-700/60 transition-colors hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/30">
              <LogOut size={12} className="inline mr-1"/> Sair
            </button>
          </div>
        </div>
      </aside>
      <main className="flex-1 p-4 md:p-8 overflow-y-auto bg-blue-950"><div className="max-w-5xl mx-auto pb-20 md:pb-0">{renderContent()}</div></main>
    </div>
  );
}

import React, { useState } from 'react';
import { sendPasswordResetEmail, GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';
import { getDocs, query, where, setDoc } from 'firebase/firestore';
import { auth, getPublicPath, getPublicDocPath } from '../utils/firebase';
import Button from './Button';

const LOGO_URL = "https://i.imgur.com/dhXA0ni.png";
const inputClass = "w-full bg-blue-950 border border-blue-700 focus:border-emerald-500 rounded-lg p-3 text-white outline-none transition-colors text-sm";

const LoginScreen = ({ onLogin, onRegister, onGoogleLogin }) => {
  const [view, setView] = useState('login'); // 'login', 'register', 'reset', 'google_step2'
  const [loginData, setLoginData] = useState({ identifier: '', password: '' });
  const [regData, setRegData] = useState({ firstName: '', lastName: '', teamNameRaw: '', email: '', whatsapp: '', password: '' });
  const [resetEmail, setResetEmail] = useState('');
  const [googleUser, setGoogleUser] = useState(null);
  
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  // --------------------------------------------------------
  // LOGIN TRADICIONAL
  // --------------------------------------------------------
  const handleLoginSubmit = async (e) => {
    e.preventDefault(); setError(''); setMsg(''); setIsProcessing(true);
    try { await onLogin(loginData.identifier, loginData.password); } 
    catch (err) { setError("E-mail ou senha incorretos."); }
    setIsProcessing(false);
  };

  // --------------------------------------------------------
  // CADASTRO TRADICIONAL
  // --------------------------------------------------------
  const handleRegisterSubmit = async (e) => {
    e.preventDefault(); setError(''); setMsg(''); setIsProcessing(true);
    try { 
      const cleanTeamName = regData.teamNameRaw.trim().toUpperCase();
      const finalTeamName = `${cleanTeamName} KAM`;

      // Verifica duplicidade no banco
      try {
         const teamsRef = getPublicPath('teams');
         const querySnapshot = await getDocs(teamsRef);
         let isDuplicate = false;
         querySnapshot.forEach((doc) => {
             if (doc.data().name && doc.data().name.toUpperCase() === finalTeamName) isDuplicate = true;
         });
         if (isDuplicate) {
             setError("Já existe um time com esse nome no clã. Use outro!");
             setIsProcessing(false);
             return; 
         }
      } catch (err) { console.error("Erro ao checar nome:", err); }

      const finalRegData = {
         firstName: regData.firstName, lastName: regData.lastName,
         teamName: finalTeamName, email: regData.email,
         whatsapp: regData.whatsapp, password: regData.password
      };

      await onRegister(finalRegData); 
      setView('login');
      setRegData({ firstName: '', lastName: '', teamNameRaw: '', email: '', whatsapp: '', password: '' });
      setMsg("Cadastro enviado! Aguarde a diretoria aprovar.");
    } 
    catch (err) { setError("Erro ao cadastrar. O e-mail pode já estar em uso."); }
    setIsProcessing(false);
  };

  const handlePasswordReset = async (e) => {
    e.preventDefault(); setError(''); setMsg(''); setIsProcessing(true);
    try {
      await sendPasswordResetEmail(auth, resetEmail);
      setMsg("E-mail de recuperação enviado! Verifique sua caixa de entrada e o spam.");
      setTimeout(() => setView('login'), 3000);
    } catch (err) {
      setError("Erro ao enviar e-mail. Verifique se digitou corretamente.");
    }
    setIsProcessing(false);
  };

  // --------------------------------------------------------
  // 🌟 NOVO: LOGIN INTELIGENTE COM GOOGLE
  // --------------------------------------------------------
  const handleGoogleLoginClick = async () => {
    setError(''); setMsg(''); setIsProcessing(true);
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      
      // Procura pelo e-mail nas duas coleções (users ou pendingTeams, etc.)
      const q = query(getPublicPath('users'), where("email", "==", result.user.email));
      const snap = await getDocs(q);
      
      if (!snap.empty) {
          // E-mail JÁ CADASTRADO! Apenas prossegue com o login sem alterar absolutamente nada no perfil.
          await onGoogleLogin(result.user);
      } else {
          // E-mail NÃO EXISTE no banco. Desloga imediatamente e avisa o usuário.
          await signOut(auth);
          setError("E-mail não cadastrado no Clã. Clique em 'Primeiro Acesso' se deseja criar uma conta.");
      }
    } catch (err) {
      console.error(err);
      setError("O login com o Google foi cancelado ou falhou.");
    }
    setIsProcessing(false);
  };

  // --------------------------------------------------------
  // 🌟 NOVO: CRIAR CONTA COM GOOGLE (FASE 1)
  // --------------------------------------------------------
  const handleGoogleRegisterClick = async () => {
    setError(''); setMsg(''); setIsProcessing(true);
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      const q = query(getPublicPath('users'), where("email", "==", result.user.email));
      const snap = await getDocs(q);
      
      if (!snap.empty) {
          setMsg("Você já possui uma conta! Entrando no sistema...");
          await onGoogleLogin(result.user);
      } else {
          // Usuário Novo! Prepara a Fase 2
          setGoogleUser(result.user);
          setView('google_step2');
      }
    } catch (err) {
      setError("Falha ao vincular com o Google.");
    }
    setIsProcessing(false);
  };

  // --------------------------------------------------------
  // 🌟 NOVO: FINALIZAR CONTA GOOGLE (FASE 2)
  // --------------------------------------------------------
  const handleGoogleStep2Submit = async (e) => {
    e.preventDefault(); setError(''); setMsg(''); setIsProcessing(true);
    try {
       const cleanTeamName = regData.teamNameRaw.trim().toUpperCase();
       const finalTeamName = `${cleanTeamName} KAM`;

       // Trava de nome duplicado
       const teamsRef = getPublicPath('teams');
       const snapTeams = await getDocs(teamsRef);
       let isDuplicate = false;
       snapTeams.forEach((doc) => {
           if (doc.data().name?.toUpperCase() === finalTeamName) isDuplicate = true;
       });
       
       if (isDuplicate) {
           setError("Já existe um time com esse nome no clã. Use outro!");
           setIsProcessing(false);
           return;
       }

       // Cria o usuário e o time manualmente direto no banco usando a UID do Google
       const newUser = {
           id: googleUser.uid,
           name: googleUser.displayName || 'Técnico',
           email: googleUser.email,
           whatsapp: regData.whatsapp,
           role: 'user',
           status: 'pending', // Deixa em pending para a diretoria aprovar
           createdAt: Date.now()
       };

       const newTeam = {
           id: `t_${Date.now()}_${googleUser.uid.substring(0,5)}`,
           name: finalTeamName,
           ownerId: googleUser.uid,
           coach: googleUser.displayName || 'Técnico',
           shield: '1',
           whatsapp: regData.whatsapp,
           createdAt: Date.now()
       };

       await setDoc(getPublicDocPath('users', newUser.id), newUser);
       await setDoc(getPublicDocPath('teams', newTeam.id), newTeam);

       await signOut(auth); // Desloga para ele aguardar aprovação igual no fluxo normal
       setGoogleUser(null);
       setView('login');
       setRegData({ firstName: '', lastName: '', teamNameRaw: '', email: '', whatsapp: '', password: '' });
       setMsg("Cadastro via Google enviado! Aguarde a diretoria aprovar.");

    } catch (err) {
       console.error(err);
       setError("Erro ao finalizar cadastro com Google.");
    }
    setIsProcessing(false);
  };

  return (
    <div className="min-h-screen bg-blue-950 flex items-center justify-center p-4">
      <div className="bg-blue-900 p-6 md:p-8 rounded-2xl border border-blue-800 max-w-md w-full shadow-2xl">
        <div className="text-center mb-6">
          <div className="flex justify-center mb-4"><img src={LOGO_URL} alt="Clã Kame" className="max-w-[100px]" /></div>
          <h1 className="text-xl font-bold text-white">Clã Kame DLS</h1>
        </div>
        
        {error && <div className="text-red-400 text-xs bg-red-500/10 p-3 rounded-lg border border-red-500/20 mb-4 text-center font-bold">{error}</div>}
        {msg && <div className="text-emerald-400 text-xs bg-emerald-500/10 p-3 rounded-lg border border-emerald-500/20 mb-4 text-center font-bold">{msg}</div>}

        {/* -------------------------------------------
            TELA DE LOGIN
        ------------------------------------------- */}
        {view === 'login' && (
          <div className="animate-in fade-in duration-300">
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div><label className="text-xs text-blue-400 block mb-1">E-mail</label><input required type="email" value={loginData.identifier} onChange={e=>setLoginData({...loginData, identifier: e.target.value})} className={inputClass} placeholder="Digite seu e-mail..." /></div>
              <div>
                <div className="flex justify-between items-center mb-1">
                   <label className="text-xs text-blue-400 block">Senha</label>
                   <button type="button" onClick={() => {setView('reset'); setError(''); setMsg('');}} className="text-[10px] text-blue-300 hover:text-emerald-400 underline">Esqueci a senha</button>
                </div>
                <input required type="password" value={loginData.password} onChange={e=>setLoginData({...loginData, password: e.target.value})} className={inputClass} placeholder="••••••••" />
              </div>
              <Button type="submit" disabled={isProcessing} className="w-full py-3">{isProcessing ? 'Entrando...' : 'Entrar na Arena'}</Button>
            </form>

            <div className="relative flex items-center py-5">
               <div className="flex-grow border-t border-blue-800"></div>
               <span className="shrink-0 px-3 text-[10px] uppercase font-black tracking-widest text-blue-500">OU</span>
               <div className="flex-grow border-t border-blue-800"></div>
            </div>

            <button type="button" onClick={handleGoogleLoginClick} disabled={isProcessing} className="w-full bg-white hover:bg-gray-100 text-blue-950 font-bold py-2.5 px-4 rounded-lg flex items-center justify-center gap-3 transition-colors shadow-md disabled:opacity-50">
               <svg viewBox="0 0 24 24" width="20" height="20" xmlns="http://www.w3.org/2000/svg"><g transform="matrix(1, 0, 0, 1, 27.009001, -39.238998)"><path fill="#4285F4" d="M -3.264 51.509 C -3.264 50.719 -3.334 49.969 -3.454 49.239 L -14.754 49.239 L -14.754 53.749 L -8.284 53.749 C -8.574 55.229 -9.424 56.479 -10.684 57.329 L -10.684 60.329 L -6.824 60.329 C -4.564 58.239 -3.264 55.159 -3.264 51.509 Z"/><path fill="#34A853" d="M -14.754 63.239 C -11.514 63.239 -8.804 62.159 -6.824 60.329 L -10.684 57.329 C -11.764 58.049 -13.134 58.489 -14.754 58.489 C -17.884 58.489 -20.534 56.379 -21.484 53.529 L -25.464 53.529 L -25.464 56.619 C -23.494 60.539 -19.444 63.239 -14.754 63.239 Z"/><path fill="#FBBC05" d="M -21.484 53.529 C -21.734 52.809 -21.864 52.039 -21.864 51.239 C -21.864 50.439 -21.724 49.669 -21.484 48.949 L -21.484 45.859 L -25.464 45.859 C -26.284 47.479 -26.754 49.299 -26.754 51.239 C -26.754 53.179 -26.284 54.999 -25.464 56.619 L -21.484 53.529 Z"/><path fill="#EA4335" d="M -14.754 43.989 C -12.984 43.989 -11.404 44.599 -10.154 45.789 L -6.734 41.939 C -8.804 40.009 -11.514 38.989 -14.754 38.989 C -19.444 38.989 -23.494 41.689 -25.464 45.859 L -21.484 48.949 C -20.534 46.099 -17.884 43.989 -14.754 43.989 Z"/></g></svg>
               Entrar com o Google
            </button>

            <div className="text-center mt-5">
              <p className="text-xs text-blue-500 mb-2">Ainda não faz parte do clã?</p>
              <button type="button" onClick={() => {setView('register'); setError(''); setMsg('');}} className="text-sm font-bold text-emerald-400 hover:text-emerald-300 underline">Primeiro Acesso (Cadastrar)</button>
            </div>
          </div>
        )}

        {/* -------------------------------------------
            RECUPERAÇÃO DE SENHA
        ------------------------------------------- */}
        {view === 'reset' && (
          <form onSubmit={handlePasswordReset} className="space-y-4 animate-in fade-in duration-300">
            <h2 className="text-lg font-bold text-white text-center mb-1">Recuperar Senha</h2>
            <p className="text-xs text-blue-400 text-center mb-4 leading-relaxed">Digite o e-mail da sua conta. Nós enviaremos um link seguro para você redefinir sua senha.</p>
            <div><input required type="email" value={resetEmail} onChange={e=>setResetEmail(e.target.value)} className={inputClass} placeholder="Seu e-mail cadastrado..." /></div>
            <Button type="submit" disabled={isProcessing} className="w-full py-3 bg-amber-600 hover:bg-amber-500 shadow-amber-900/50">{isProcessing ? 'Enviando...' : 'Enviar Link de Recuperação'}</Button>
            <button type="button" onClick={() => {setView('login'); setError(''); setMsg('');}} className="w-full text-xs text-blue-500 hover:text-white pt-2 pb-2 mt-2">Voltar para o Login</button>
          </form>
        )}

        {/* -------------------------------------------
            TELA DE CADASTRO (PRIMEIRO ACESSO)
        ------------------------------------------- */}
        {view === 'register' && (
          <div className="animate-in slide-in-from-right-4 duration-300">
            <h2 className="text-lg font-bold text-white text-center mb-1">Cadastro de Técnico</h2>
            <p className="text-[10px] text-blue-400 text-center mb-4">Escolha como deseja solicitar o acesso ao Clã.</p>

            <button type="button" onClick={handleGoogleRegisterClick} disabled={isProcessing} className="w-full bg-white hover:bg-gray-100 text-blue-950 font-bold py-3 px-4 rounded-lg flex items-center justify-center gap-3 transition-colors shadow-md disabled:opacity-50 mb-5">
               <svg viewBox="0 0 24 24" width="20" height="20" xmlns="http://www.w3.org/2000/svg"><g transform="matrix(1, 0, 0, 1, 27.009001, -39.238998)"><path fill="#4285F4" d="M -3.264 51.509 C -3.264 50.719 -3.334 49.969 -3.454 49.239 L -14.754 49.239 L -14.754 53.749 L -8.284 53.749 C -8.574 55.229 -9.424 56.479 -10.684 57.329 L -10.684 60.329 L -6.824 60.329 C -4.564 58.239 -3.264 55.159 -3.264 51.509 Z"/><path fill="#34A853" d="M -14.754 63.239 C -11.514 63.239 -8.804 62.159 -6.824 60.329 L -10.684 57.329 C -11.764 58.049 -13.134 58.489 -14.754 58.489 C -17.884 58.489 -20.534 56.379 -21.484 53.529 L -25.464 53.529 L -25.464 56.619 C -23.494 60.539 -19.444 63.239 -14.754 63.239 Z"/><path fill="#FBBC05" d="M -21.484 53.529 C -21.734 52.809 -21.864 52.039 -21.864 51.239 C -21.864 50.439 -21.724 49.669 -21.484 48.949 L -21.484 45.859 L -25.464 45.859 C -26.284 47.479 -26.754 49.299 -26.754 51.239 C -26.754 53.179 -26.284 54.999 -25.464 56.619 L -21.484 53.529 Z"/><path fill="#EA4335" d="M -14.754 43.989 C -12.984 43.989 -11.404 44.599 -10.154 45.789 L -6.734 41.939 C -8.804 40.009 -11.514 38.989 -14.754 38.989 C -19.444 38.989 -23.494 41.689 -25.464 45.859 L -21.484 48.949 C -20.534 46.099 -17.884 43.989 -14.754 43.989 Z"/></g></svg>
               Criar acesso com o Google
            </button>

            <div className="relative flex items-center py-2 mb-4">
               <div className="flex-grow border-t border-blue-800"></div>
               <span className="shrink-0 px-3 text-[10px] text-blue-500 font-bold uppercase tracking-widest">Ou use E-mail e Senha</span>
               <div className="flex-grow border-t border-blue-800"></div>
            </div>

            <form onSubmit={handleRegisterSubmit} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div><input required placeholder="Nome" value={regData.firstName} onChange={e=>setRegData({...regData, firstName: e.target.value})} className={inputClass} /></div>
                <div><input required placeholder="Sobrenome" value={regData.lastName} onChange={e=>setRegData({...regData, lastName: e.target.value})} className={inputClass} /></div>
              </div>
              
              <div className="relative">
                 <input required placeholder="Nome do Clube (Sem KAM)" value={regData.teamNameRaw} onChange={e=>setRegData({...regData, teamNameRaw: e.target.value})} className={`${inputClass} pr-16 uppercase`} />
                 <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-black text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">KAM</span>
              </div>
              {regData.teamNameRaw && (<p className="text-[10px] text-emerald-400 text-right mt-1 px-1">Seu time será: <b>{regData.teamNameRaw.trim().toUpperCase()} KAM</b></p>)}

              <div><input required type="email" placeholder="E-mail" value={regData.email} onChange={e=>setRegData({...regData, email: e.target.value})} className={inputClass} /></div>
              <div><input required type="tel" placeholder="WhatsApp (com DDD)" value={regData.whatsapp} onChange={e=>setRegData({...regData, whatsapp: e.target.value})} className={inputClass} /></div>
              <div><input required type="password" placeholder="Crie uma Senha (mín 6 dígitos)" value={regData.password} onChange={e=>setRegData({...regData, password: e.target.value})} className={inputClass} minLength={6} /></div>
              
              <Button type="submit" disabled={isProcessing} className="w-full py-3 mt-2">{isProcessing ? 'Enviando...' : 'Solicitar Entrada'}</Button>
            </form>
            
            <button type="button" onClick={() => {setView('login'); setError(''); setMsg('');}} className="w-full text-xs text-blue-500 hover:text-white mt-4 pb-2 border-t border-blue-800 pt-4">Voltar para o Login</button>
          </div>
        )}

        {/* -------------------------------------------
            TELA DE FINALIZAÇÃO GOOGLE (PASSO 2)
        ------------------------------------------- */}
        {view === 'google_step2' && (
          <form onSubmit={handleGoogleStep2Submit} className="space-y-4 animate-in slide-in-from-right-4 duration-300">
            <h2 className="text-lg font-bold text-white text-center mb-1">Finalizar Conta Google</h2>
            <p className="text-[10px] text-emerald-400 text-center mb-4 leading-relaxed bg-emerald-500/10 p-2 rounded border border-emerald-500/20">
               Olá, <b>{googleUser?.displayName}</b>!<br/>Faltam poucos detalhes para o seu perfil.
            </p>
            
            <div className="relative">
               <input required placeholder="Nome do Clube (Sem KAM)" value={regData.teamNameRaw} onChange={e=>setRegData({...regData, teamNameRaw: e.target.value})} className={`${inputClass} pr-16 uppercase font-bold text-amber-400`} />
               <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-black text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">KAM</span>
            </div>
            {regData.teamNameRaw && (<p className="text-[10px] text-emerald-400 text-right mt-1 px-1 mb-2">Seu time será: <b>{regData.teamNameRaw.trim().toUpperCase()} KAM</b></p>)}

            <div><input required type="tel" placeholder="WhatsApp (com DDD)" value={regData.whatsapp} onChange={e=>setRegData({...regData, whatsapp: e.target.value})} className={inputClass} /></div>
            
            <Button type="submit" disabled={isProcessing} className="w-full py-3 mt-4">{isProcessing ? 'Finalizando...' : 'Concluir Cadastro'}</Button>
            <button type="button" onClick={async () => { await signOut(auth); setGoogleUser(null); setView('register'); setError(''); setMsg('');}} className="w-full text-xs text-red-400 hover:text-red-300 mt-2 pb-2">Cancelar Operação</button>
          </form>
        )}

      </div>
    </div>
  );
};

export default LoginScreen;
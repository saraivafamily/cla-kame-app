import React, { useState } from 'react';
import { sendPasswordResetEmail, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { getDocs, query, where, setDoc } from 'firebase/firestore';
import { auth, getPublicPath, getPublicDocPath } from '../utils/firebase';
import Button from './Button';

const LOGO_URL = "https://i.imgur.com/dhXA0ni.png";
const inputClass = "w-full bg-blue-950 border border-blue-700 focus:border-emerald-500 rounded-lg p-3 text-white outline-none transition-colors text-sm";

const LoginScreen = ({ onLogin, onRegister }) => {
  const [view, setView] = useState('login'); 
  const [loginData, setLoginData] = useState({ identifier: '', password: '' });
  const [regData, setRegData] = useState({ firstName: '', lastName: '', teamNameRaw: '', email: '', whatsapp: '', password: '' });
  const [resetEmail, setResetEmail] = useState('');
  
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const handleLoginSubmit = async (e) => {
    e.preventDefault(); setError(''); setMsg(''); setIsProcessing(true);
    try {
      const cleanEmail = loginData.identifier.trim();
      await signInWithEmailAndPassword(auth, cleanEmail, loginData.password);

      const q = query(getPublicPath('users'), where("email", "==", cleanEmail));
      const snap = await getDocs(q);

      if (!snap.empty) {
         const userData = snap.docs[0].data();
         if (userData.status === 'pending') {
             await signOut(auth); 
             setError("Sua conta ainda está em análise pela diretoria. Aguarde a liberação!");
             setIsProcessing(false);
             return; 
         }
      }

      await onLogin(cleanEmail, loginData.password);

    } catch (err) {
      console.error("Motivo da falha:", err.code);
      if (err.code === 'auth/invalid-credential' || err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {
          setError("❌ E-mail ou senha incorretos.");
      } else if (err.code === 'auth/invalid-email') {
          setError("❌ O formato do e-mail é inválido.");
      } else if (err.code === 'auth/too-many-requests') {
          setError("❌ Muitas tentativas incorretas. Tente novamente mais tarde.");
      } else {
          setError("❌ Erro ao entrar. Verifique os dados e tente novamente.");
      }
      await signOut(auth); 
    }
    setIsProcessing(false);
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault(); setError(''); setMsg(''); setIsProcessing(true);
    try { 
      const cleanTeamName = regData.teamNameRaw.trim().toUpperCase();
      const finalTeamName = `${cleanTeamName} KAM`;

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
    catch (err) { 
      console.error("Erro real do Firebase:", err);
      // 🌟 AGORA O APLICATIVO FALA A VERDADE
      if (err.code === 'auth/email-already-in-use') {
          setError("❌ Este e-mail realmente já existe no Firebase.");
      } else if (err.code === 'auth/weak-password') {
          setError("❌ A senha é muito fraca. Digite uma senha mais forte.");
      } else if (err.code === 'auth/network-request-failed') {
          setError("❌ Erro de conexão com a internet.");
      } else {
          setError(`❌ Erro bloqueando o cadastro: ${err.message}`);
      }
    }
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

  return (
    <div className="min-h-screen bg-blue-950 flex items-center justify-center p-4">
      <div className="bg-blue-900 p-6 md:p-8 rounded-2xl border border-blue-800 max-w-md w-full shadow-2xl">
        <div className="text-center mb-6">
          <div className="flex justify-center mb-4"><img src={LOGO_URL} alt="Clã Kame" className="max-w-[100px]" /></div>
          <h1 className="text-xl font-bold text-white">Clã Kame DLS</h1>
        </div>
        
        {error && <div className="text-red-400 text-xs bg-red-500/10 p-3 rounded-lg border border-red-500/20 mb-4 text-center font-bold">{error}</div>}
        {msg && <div className="text-emerald-400 text-xs bg-emerald-500/10 p-3 rounded-lg border border-emerald-500/20 mb-4 text-center font-bold">{msg}</div>}

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

            <div className="text-center mt-5 border-t border-blue-800 pt-4">
              <p className="text-xs text-blue-500 mb-2">Ainda não faz parte do clã?</p>
              <button type="button" onClick={() => {setView('register'); setError(''); setMsg('');}} className="text-sm font-bold text-emerald-400 hover:text-emerald-300 underline">Primeiro Acesso (Cadastrar)</button>
            </div>
          </div>
        )}

        {view === 'reset' && (
          <form onSubmit={handlePasswordReset} className="space-y-4 animate-in fade-in duration-300">
            <h2 className="text-lg font-bold text-white text-center mb-1">Recuperar Senha</h2>
            <p className="text-xs text-blue-400 text-center mb-4 leading-relaxed">Digite o e-mail da sua conta. Nós enviaremos um link seguro para você redefinir sua senha.</p>
            <div><input required type="email" value={resetEmail} onChange={e=>setResetEmail(e.target.value)} className={inputClass} placeholder="Seu e-mail cadastrado..." /></div>
            <Button type="submit" disabled={isProcessing} className="w-full py-3 bg-amber-600 hover:bg-amber-500 shadow-amber-900/50">{isProcessing ? 'Enviando...' : 'Enviar Link de Recuperação'}</Button>
            <button type="button" onClick={() => {setView('login'); setError(''); setMsg('');}} className="w-full text-xs text-blue-500 hover:text-white pt-2 pb-2 mt-2">Voltar para o Login</button>
          </form>
        )}

        {view === 'register' && (
          <div className="animate-in slide-in-from-right-4 duration-300">
            <h2 className="text-lg font-bold text-white text-center mb-1">Cadastro de Técnico</h2>
            <p className="text-[10px] text-blue-400 text-center mb-4">Preencha os dados abaixo para solicitar o acesso ao Clã.</p>

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

      </div>
    </div>
  );
};

export default LoginScreen;
import React, { useState } from 'react';
import { sendPasswordResetEmail, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { auth } from '../utils/firebase';
import Button from './Button';

const LOGO_URL = "https://i.imgur.com/dhXA0ni.png";
const inputClass = "w-full bg-blue-950 border border-blue-700 focus:border-emerald-500 rounded-lg p-3 text-white outline-none transition-colors text-sm";

const LoginScreen = ({ onLogin, onRegister, onGoogleLogin }) => {
  const [view, setView] = useState('login'); // 'login', 'register', 'reset'
  const [loginData, setLoginData] = useState({ identifier: '', password: '' });
  const [regData, setRegData] = useState({ firstName: '', lastName: '', teamName: '', email: '', whatsapp: '', password: '' });
  const [resetEmail, setResetEmail] = useState('');
  
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const handleLoginSubmit = async (e) => {
    e.preventDefault(); setError(''); setMsg(''); setIsProcessing(true);
    try { await onLogin(loginData.identifier, loginData.password); } 
    catch (err) { setError("E-mail ou senha incorretos."); }
    setIsProcessing(false);
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault(); setError(''); setMsg(''); setIsProcessing(true);
    try { 
      await onRegister(regData); 
      setView('login');
      setRegData({ firstName: '', lastName: '', teamName: '', email: '', whatsapp: '', password: '' });
      setMsg("Cadastro enviado! Aguarde aprovação.");
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

  const handleGoogleSignIn = async () => {
    setError(''); setIsProcessing(true);
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      await onGoogleLogin(result.user);
    } catch (err) {
      setError("O login com o Google foi cancelado ou falhou.");
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
        
        {error && <div className="text-red-400 text-xs bg-red-500/10 p-3 rounded-lg border border-red-500/20 mb-4 text-center">{error}</div>}
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

            <div className="relative flex items-center py-5">
               <div className="flex-grow border-t border-blue-800"></div>
               <span className="shrink-0 px-3 text-xs text-blue-500 font-medium">OU</span>
               <div className="flex-grow border-t border-blue-800"></div>
            </div>

            <button type="button" onClick={handleGoogleSignIn} disabled={isProcessing} className="w-full bg-white hover:bg-gray-100 text-blue-950 font-bold py-3 px-4 rounded-lg flex items-center justify-center gap-3 transition-colors shadow-md disabled:opacity-50">
               <svg viewBox="0 0 24 24" width="20" height="20" xmlns="http://www.w3.org/2000/svg"><g transform="matrix(1, 0, 0, 1, 27.009001, -39.238998)"><path fill="#4285F4" d="M -3.264 51.509 C -3.264 50.719 -3.334 49.969 -3.454 49.239 L -14.754 49.239 L -14.754 53.749 L -8.284 53.749 C -8.574 55.229 -9.424 56.479 -10.684 57.329 L -10.684 60.329 L -6.824 60.329 C -4.564 58.239 -3.264 55.159 -3.264 51.509 Z"/><path fill="#34A853" d="M -14.754 63.239 C -11.514 63.239 -8.804 62.159 -6.824 60.329 L -10.684 57.329 C -11.764 58.049 -13.134 58.489 -14.754 58.489 C -17.884 58.489 -20.534 56.379 -21.484 53.529 L -25.464 53.529 L -25.464 56.619 C -23.494 60.539 -19.444 63.239 -14.754 63.239 Z"/><path fill="#FBBC05" d="M -21.484 53.529 C -21.734 52.809 -21.864 52.039 -21.864 51.239 C -21.864 50.439 -21.724 49.669 -21.484 48.949 L -21.484 45.859 L -25.464 45.859 C -26.284 47.479 -26.754 49.299 -26.754 51.239 C -26.754 53.179 -26.284 54.999 -25.464 56.619 L -21.484 53.529 Z"/><path fill="#EA4335" d="M -14.754 43.989 C -12.984 43.989 -11.404 44.599 -10.154 45.789 L -6.734 41.939 C -8.804 40.009 -11.514 38.989 -14.754 38.989 C -19.444 38.989 -23.494 41.689 -25.464 45.859 L -21.484 48.949 C -20.534 46.099 -17.884 43.989 -14.754 43.989 Z"/></g></svg>
               Continuar com o Google
            </button>

            <div className="text-center mt-5">
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
          <form onSubmit={handleRegisterSubmit} className="space-y-3 animate-in slide-in-from-right-4 duration-300">
            <h2 className="text-lg font-bold text-white text-center mb-1">Cadastro de Técnico</h2>
            <p className="text-[10px] text-blue-400 text-center mb-4">Preencha seus dados para solicitar acesso.</p>
            
            <div className="grid grid-cols-2 gap-3">
              <div><input required placeholder="Nome" value={regData.firstName} onChange={e=>setRegData({...regData, firstName: e.target.value})} className={inputClass} /></div>
              <div><input required placeholder="Sobrenome" value={regData.lastName} onChange={e=>setRegData({...regData, lastName: e.target.value})} className={inputClass} /></div>
            </div>
            <div><input required placeholder="Nome do Clube" value={regData.teamName} onChange={e=>setRegData({...regData, teamName: e.target.value})} className={inputClass} /></div>
            <div><input required type="email" placeholder="E-mail" value={regData.email} onChange={e=>setRegData({...regData, email: e.target.value})} className={inputClass} /></div>
            <div><input required type="tel" placeholder="WhatsApp (com DDD)" value={regData.whatsapp} onChange={e=>setRegData({...regData, whatsapp: e.target.value})} className={inputClass} /></div>
            <div><input required type="password" placeholder="Crie uma Senha (mín 6 dígitos)" value={regData.password} onChange={e=>setRegData({...regData, password: e.target.value})} className={inputClass} minLength={6} /></div>
            
            <Button type="submit" disabled={isProcessing} className="w-full py-3 mt-2">{isProcessing ? 'Enviando...' : 'Solicitar Entrada no Clã'}</Button>
            <button type="button" onClick={() => {setView('login'); setError(''); setMsg('');}} className="w-full text-xs text-blue-500 hover:text-white mt-2 pb-2">Voltar para o Login</button>
          </form>
        )}
      </div>
    </div>
  );
};

export default LoginScreen;

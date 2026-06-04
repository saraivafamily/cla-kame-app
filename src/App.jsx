import React, { useState } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut } from 'firebase/auth';

// Configuração do Firebase
const firebaseConfig = {
  apiKey: "AIzaSyCoZ255eUBfUsIYArCMtHf1T0y_6U5fTsA",
  authDomain: "cla-kame.firebaseapp.com",
  databaseURL: "https://cla-kame-default-rtdb.firebaseio.com",
  projectId: "cla-kame",
  storageBucket: "cla-kame.appspot.com",
  messagingSenderId: "253792062726",
  appId: "1:253792062726:web:1ee567bbbd175c31ce2287"
};

// Inicializa o Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

export default function App() {
  const [identificacao, setIdentificacao] = useState('');
  const [palavraPasse, setPalavraPasse] = useState('');
  const [manterConectado, setManterConectado] = useState(false);
  const [mensagemErro, setMensagemErro] = useState('');
  
  // Estado para saber se o usuário está logado com sucesso
  const [usuarioLogado, setUsuarioLogado] = useState(null);

  // Truque para transformar Nome/WhatsApp em E-mail para o Firebase
  const formatarParaEmail = (texto) => {
    return texto.trim().replace(/\s+/g, '').toLowerCase() + '@clakame.com';
  };

  // Função para Entrar
  const tentarLogin = async () => {
    setMensagemErro('');
    if (!identificacao || !palavraPasse) {
      setMensagemErro('Preencha os dados da batalha!');
      return;
    }

    try {
      const emailFake = formatarParaEmail(identificacao);
      const userCredential = await signInWithEmailAndPassword(auth, emailFake, palavraPasse);
      setUsuarioLogado(userCredential.user);
    } catch (error) {
      setMensagemErro('Senha incorreta ou Técnico não encontrado!');
    }
  };

  // Função para Criar Conta
  const criarConta = async () => {
    setMensagemErro('');
    if (!identificacao || palavraPasse.length < 6) {
      setMensagemErro('Preencha a identificação e use uma senha de pelo menos 6 letras/números!');
      return;
    }

    try {
      const emailFake = formatarParaEmail(identificacao);
      const userCredential = await createUserWithEmailAndPassword(auth, emailFake, palavraPasse);
      setUsuarioLogado(userCredential.user);
      alert('Conta criada com sucesso no Clã Kame!');
    } catch (error) {
      if (error.code === 'auth/email-already-in-use') {
        setMensagemErro('Esse Técnico/WhatsApp já está registrado!');
      } else {
        setMensagemErro('Erro ao criar conta. Tente novamente.');
      }
    }
  };

  // Função para Sair
  const fazerLogout = async () => {
    await signOut(auth);
    setUsuarioLogado(null);
    setIdentificacao('');
    setPalavraPasse('');
  };

  // SE O USUÁRIO ESTIVER LOGADO, MOSTRA O PAINEL DE CONTROLE
  if (usuarioLogado) {
    return (
      <div className="login-container" style={{ textAlign: 'center', padding: '40px' }}>
        <img src="https://imagizer.imageshack.com/img923/6982/W040Zp.png" alt="Logo Clã Kame" className="kame-shield-logo" />
        <h1 style={{ marginTop: '20px' }}>PAINEL DLS</h1>
        <p style={{ color: '#b0b3b8', marginBottom: '30px' }}>Bem-vindo de volta, guerreiro!</p>
        
        <div style={{ backgroundColor: '#3a3b3c', padding: '20px', borderRadius: '12px', marginBottom: '30px' }}>
          <p style={{ color: '#ffde59', fontWeight: 'bold' }}>Status: CONECTADO</p>
          <p style={{ fontSize: '14px' }}>Seu ID de batalha: {usuarioLogado.email.split('@')[0]}</p>
        </div>

        <button className="btn-degrade" onClick={fazerLogout}>
          Desconectar e Sair
        </button>
      </div>
    );
  }

  // SE NÃO ESTIVER LOGADO, MOSTRA A TELA DE LOGIN NORMAL
  return (
    <div className="login-container">
      <div className="login-header">
        <img 
          src="https://imagizer.imageshack.com/img923/6982/W040Zp.png" 
          alt="Logo Clã Kame" 
          className="kame-shield-logo"
        />
        <h1>Clã Kame</h1>
        <p className="login-subtitle" style={{ marginBottom: '20px' }}>Sistema de Gestão DLS na Nuvem</p>
      </div>

      <div className="login-form-area">
        {mensagemErro && (
          <div style={{ color: '#ff914d', fontWeight: 'bold', marginBottom: '15px', padding: '10px', backgroundColor: 'rgba(255, 145, 77, 0.1)', borderRadius: '8px' }}>
            {mensagemErro}
          </div>
        )}

        <div className="input-group">
          <label>WhatsApp ou Nome do Técnico</label>
          <input 
            type="text" 
            placeholder="Ex: Vitor ou 5511999999999" 
            value={identificacao}
            onChange={(evento) => setIdentificacao(evento.target.value)}
          />
        </div>

        <div className="input-group">
          <label>Senha</label>
          <input 
            type="password" 
            placeholder="••••••••" 
            value={palavraPasse}
            onChange={(evento) => setPalavraPasse(evento.target.value)}
          />
        </div>

        <div className="login-opcoes">
          <label className="checkbox-label">
            <input 
              type="checkbox" 
              checked={manterConectado} 
              onChange={(evento) => setManterConectado(evento.target.checked)} 
            /> 
            Manter conectado
          </label>
          <button className="link-esqueci" onClick={() => alert('Função Esqueci a Senha em construção')}>
            Esqueci a senha
          </button>
        </div>

        <button className="btn-degrade" onClick={tentarLogin}>
          Entrar
        </button>
        
        <button 
          className="btn-degrade" 
          style={{ marginTop: '15px' }} 
          onClick={criarConta}
        >
          Criar Conta
        </button>
      </div>
    </div>
  );
}

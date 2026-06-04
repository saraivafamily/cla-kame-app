import React, { useState } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { Shield } from 'lucide-react'; // Ícone de escudo temporário

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
  
  // Estado para saber se o utilizador está logado com sucesso
  const [usuarioLogado, setUsuarioLogado] = useState(null);

  // Truque para transformar Nome/WhatsApp em E-mail para o Firebase
  const formatarParaEmail = (texto) => {
    return texto.trim().replace(/\s+/g, '').toLowerCase() + '@clakame.com';
  };

  // Função EXCLUSIVA para Entrar (Login)
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

  // Função para Sair
  const fazerLogout = async () => {
    await signOut(auth);
    setUsuarioLogado(null);
    setIdentificacao('');
    setPalavraPasse('');
  };

  // SE O UTILIZADOR ESTIVER LOGADO, MOSTRA O PAINEL DE CONTROLE
  if (usuarioLogado) {
    return (
      <div className="login-container" style={{ textAlign: 'center', padding: '40px' }}>
        <Shield size={64} color="#ffde59" style={{ margin: '0 auto' }} />
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

  // SE NÃO ESTIVER LOGADO, MOSTRA A TELA DE LOGIN (SEM BOTÃO DE CRIAR CONTA)
  return (
    <div className="login-container">
      <div className="login-header">
        <Shield size={64} color="#ffde59" style={{ margin: '0 auto -10px auto', display: 'block' }} />
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

        {/* APENAS O BOTÃO DE ENTRAR */}
        <button className="btn-degrade" onClick={tentarLogin}>
          Entrar
        </button>
      </div>
    </div>
  );
}

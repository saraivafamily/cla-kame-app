import React, { useState } from 'react';
import { initializeApp } from 'firebase/app';

// Configuração do Firebase (As suas chaves reais)
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

export default function App() {
  // 1. MEMÓRIAS DA APLICAÇÃO (Guardam o que o utilizador escreve)
  const [identificacao, setIdentificacao] = useState('');
  const [palavraPasse, setPalavraPasse] = useState('');
  const [manterConectado, setManterConectado] = useState(false);
  
  // Memória para mostrar mensagens de erro no ecrã
  const [mensagemErro, setMensagemErro] = useState('');

  // 2. FUNÇÃO QUE É ATIVADA AO CLICAR EM "ENTRAR"
  const tentarLogin = () => {
    // Limpa erros antigos
    setMensagemErro('');

    // Verifica se os campos estão vazios
    if (identificacao === '' || palavraPasse === '') {
      setMensagemErro('Por favor, preencha o seu Nome/WhatsApp e a Senha!');
      return; // Pára a função aqui se faltarem dados
    }

    // Se estiver tudo preenchido, mostra o que guardou (Teste do Passo 1)
    alert(`Sucesso a capturar dados!\nTentando entrar como: ${identificacao}\nSenha digitada: ${palavraPasse}`);
  };

  return (
    <div className="login-container">
      {/* Topo da Tela: Logo e Títulos */}
      <div className="login-header">
        <img 
          src="https://imagizer.imageshack.com/img923/6982/W040Zp.png" 
          alt="Logo Clã Kame" 
          className="kame-shield-logo"
        />
        <h1>Clã Kame</h1>
        <p className="login-subtitle" style={{ marginBottom: '20px' }}>Sistema de Gestão DLS na Nuvem</p>
      </div>

      {/* Formulário de Login */}
      <div className="login-form-area">
        
        {/* Mostra aviso vermelho se houver erro */}
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

        {/* Opções (Manter Conectado e Esqueci a senha) */}
        <div className="login-opcoes">
          <label className="checkbox-label">
            <input 
              type="checkbox" 
              checked={manterConectado} 
              onChange={(evento) => setManterConectado(evento.target.checked)} 
            /> 
            Manter conectado
          </label>
          <button className="link-esqueci" onClick={() => alert('Função Esqueci a Senha ainda não ligada.')}>
            Esqueci a senha
          </button>
        </div>

        {/* Botões Principais */}
        <button className="btn-degrade" onClick={tentarLogin}>
          Entrar
        </button>
        
        <button 
          className="btn-degrade" 
          style={{ marginTop: '15px' }} 
          onClick={() => alert('Vamos criar o Passo 2: O Registo de utilizadores!')}
        >
          Criar Conta
        </button>
      </div>
    </div>
  );
}

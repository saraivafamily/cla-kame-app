import React, { useState, useEffect } from 'react';
import { Trophy, Users, Calendar, Award, CheckCircle2, AlertCircle, Upload, MessageSquare } from 'lucide-react';

// --- CONFIGURAÇÕES DO CAMPEONATO (Simulação de Banco de Dados) ---
const CAMPEONATOS_MOCK = [
  { id: 'liga-kame-d', nome: 'Liga Kame D - Oficial' },
  { id: 'teste', nome: 'Campeonato de Teste' }
];

const PARTIDAS_MOCK = [
  { id: 'p1', rodada: 'Rodada 2', casa: 'REIGA FC KAM', fora: 'CORINTHIANS KAM' },
  { id: 'p2', rodada: 'Rodada 2', casa: 'ORIGINAL GANGSTERS KAM', fora: 'CONFIANÇA KAM' },
  { id: 'p3', rodada: 'Rodada 2', casa: 'BRK FC KAM', fora: 'BRASA KAM' },
  { id: 'p4', rodada: 'Rodada 2', casa: 'SÃO SILVESTRE KAM', fora: 'BAHGUALES FC' },
  { id: 'p5', rodada: 'Rodada 2', casa: 'REAL MADRID KAM', fora: 'REAL LIBERDAD KAM' },
  { id: 'p6', rodada: 'Rodada 2', casa: 'MILANO FC KAM', fora: 'TAQUARI FC KAM' },
  { id: 'p7', rodada: 'Rodada 2', casa: 'KINGS FC KAM', fora: 'IMPÉRIO SUBURBANO KAM' },
  { id: 'p8', rodada: 'Rodada 2', casa: 'DECORETTI FC KAM', fora: 'ARACATI FC KAM' },
  { id: 'p9', rodada: 'Rodada 2', casa: 'UNIÃO MOSQUITEIRO KAM', fora: 'SANTOS FC KAM' },
];

export default function App() {
  // --- ESTADOS DO FORMULÁRIO ---
  const [campeonato, setCampeonato] = useState('');
  const [partida, setPartida] = useState('');
  const [print, setPrint] = useState(null);
  const [golsCasa, setGolsCasa] = useState('0');
  const [golsFora, setGolsFora] = useState('0');
  const [listaGolsCasa, setListaGolsCasa] = useState([]);
  const [listaGolsFora, setListaGolsFora] = useState([]);
  const [observacoes, setObservacoes] = useState('');
  
  // --- ESTADOS DE STATUS ---
  const [loadingIA, setLoadingIA] = useState(false);
  const [printAnexado, setPrintAnexado] = useState(false);
  const [erroGoogle, setErroGoogle] = useState(null);
  const [sucesso, setSucesso] = useState(false);

  // --- ESTADOS DA TABELA E MATA-MATA (Visualização) ---
  const [abaAtiva, setAbaAtiva] = useState('enviar'); // 'enviar' | 'classificacao' | 'matamata'

  // Simulação de leitura de IA ao anexar imagem
  const handlePrintUpload = (e) => {
    if (e.target.files && e.target.files[0]) {
      setLoadingIA(true);
      setErroGoogle(null);
      
      // Simula uma resposta da API do Google Cloud Vision / IA do Clã Kame
      setTimeout(() => {
        setPrintAnexado(true);
        setLoadingIA(false);
        // Valores simulados que a IA "leu" do print
        setGolsCasa('2');
        setGolsFora('1');
      }, 1500);
    }
  };

  const adicionarGol = (time) => {
    const novoGol = { jogador: '', assistencia: '' };
    if (time === 'casa') {
      setListaGolsCasa([...listaGolsCasa, novoGol]);
    } else {
      setListaGolsFora([...listaGolsFora, novoGol]);
    }
  };

  const atualizarGol = (time, index, campo, valor) => {
    if (time === 'casa') {
      const novaLista = [...listaGolsCasa];
      novaLista[index][campo] = valor;
      setListaGolsCasa(novaLista);
    } else {
      const novaLista = [...listaGolsFora];
      novaLista[index][campo] = valor;
      setListaGolsFora(novaLista);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!campeonato || !partida) {
      setErroGoogle('Erro Google: Request had invalid authentication credentials. Expected OAuth 2 access token.');
      return;
    }
    
    setSucesso(true);
    setTimeout(() => setSucesso(false), 4000);
  };

  return (
    <div className="min-h-screen bg-[#0b0e14] text-slate-100 font-sans antialiased">
      {/* HEADER PRINCIPAL */}
      <header className="border-b border-slate-800 bg-[#0f131a] sticky top-0 z-50 px-4 py-4 shadow-lg">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="bg-amber-500 text-slate-950 p-2 rounded-xl font-black text-xl tracking-wider shadow-md shadow-amber-500/20">
              KAME
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight">Clã Kame App</h1>
              <p className="text-xs text-slate-400">Painel de Controle e Resultados de Torneios</p>
            </div>
          </div>

          {/* NAVEGAÇÃO ENTRE ABAS */}
          <nav className="flex bg-[#161b26] p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => setAbaAtiva('enviar')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                abaAtiva === 'enviar' ? 'bg-amber-500 text-slate-950 shadow-md' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Upload size={16} /> Enviar Resultado
            </button>
            <button
              onClick={() => setAbaAtiva('classificacao')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                abaAtiva === 'classificacao' ? 'bg-amber-500 text-slate-950 shadow-md' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Users size={16} /> Grupos
            </button>
            <button
              onClick={() => setAbaAtiva('matamata')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                abaAtiva === 'matamata' ? 'bg-amber-500 text-slate-950 shadow-md' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Trophy size={16} /> Mata-Mata
            </button>
          </nav>
        </div>
      </header>

      {/* CONTEÚDO PRINCIPAL */}
      <main className="max-w-6xl mx-auto px-4 py-8">
        
        {/* ABA 1: ENVIAR RESULTADO */}
        {abaAtiva === 'enviar' && (
          <div className="max-w-2xl mx-auto bg-[#0f131a] rounded-2xl border border-slate-800 p-6 shadow-xl">
            <h2 className="text-lg font-bold mb-6 flex items-center gap-2 text-amber-400">
              <Calendar size={20} /> Relatar Placar de Partida
            </h2>

            {/* Banner de Erro de Credenciais Simulado (baseado nos prints do usuário) */}
            {erroGoogle && (
              <div className="mb-6 p-4 bg-red-950/40 border border-red-800 text-red-200 rounded-xl flex items-start gap-3 text-sm animate-fadeIn">
                <AlertCircle className="text-red-500 shrink-0 mt-0.5" size={18} />
                <div>
                  <span className="font-bold">Erro Google:</span> Request had invalid authentication credentials. Expected OAuth 2 access token, login cookie or other valid authentication credential.
                </div>
              </div>
            )}

            {sucesso && (
              <div className="mb-6 p-4 bg-emerald-950/40 border border-emerald-800 text-emerald-200 rounded-xl flex items-center gap-3 text-sm">
                <CheckCircle2 className="text-emerald-500" size={18} />
                <div>Resultado enviado com sucesso e computado no banco de dados!</div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* 1. Selecionar Campeonato */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                  1. Selecione o Campeonato
                </label>
                <select
                  value={campeonato}
                  onChange={(e) => setCampeonato(e.target.value)}
                  className="w-full bg-[#161b26] border border-slate-800 rounded-xl px-4 py-3 text-slate-200 focus:outline-none focus:border-amber-500 transition"
                >
                  <option value="">-- Escolha o campeonato --</option>
                  {CAMPEONATOS_MOCK.map((c) => (
                    <option key={c.id} value={c.id}>{c.nome}</option>
                  ))}
                </select>
              </div>

              {/* 2. Selecionar Partida */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                  2. Selecione a Partida
                </label>
                <select
                  value={partida}
                  onChange={(e) => setPartida(e.target.value)}
                  className="w-full bg-[#161b26] border border-slate-800 rounded-xl px-4 py-3 text-slate-200 focus:outline-none focus:border-amber-500 transition"
                >
                  <option value="">-- Escolha o confronto oficial --</option>
                  {PARTIDAS_MOCK.map((p) => (
                    <option key={p.id} value={p.id}>{p.rodada} - {p.casa} x {p.fora}</option>
                  ))}
                </select>
              </div>

              {/* 3. Upload de Print com leitura de IA */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                  Anexar Print (Opcional)
                </label>
                <div className="relative border-2 border-dashed border-slate-800 hover:border-slate-700 bg-[#161b26] rounded-xl p-6 transition text-center cursor-pointer">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handlePrintUpload}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  {loadingIA ? (
                    <div className="space-y-2 py-2">
                      <div className="animate-spin rounded-full h-6 w-6 border-2 border-amber-500 border-t-transparent mx-auto"></div>
                      <p className="text-sm text-slate-400">Nossa IA está fazendo a leitura automática do print...</p>
                    </div>
                  ) : printAnexado ? (
                    <div className="text-emerald-400 font-medium flex flex-col items-center gap-1 py-2">
                      <CheckCircle2 size={24} />
                      <span>Print Anexado e Lido com Sucesso!</span>
                    </div>
                  ) : (
                    <div className="text-slate-400 space-y-1">
                      <p className="text-sm font-semibold text-slate-300">Clique para fazer upload ou arraste o print aqui</p>
                      <p className="text-xs">A nossa IA preencherá automaticamente os gols detectados.</p>
                    </div>
                  )}
                </div>
              </div>

              {/* 4. Preenchimento de Resultados */}
              <div className="border border-slate-800 bg-[#121721] rounded-xl p-5 space-y-6">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 border-b border-slate-800 pb-2">
                  Preencha o Resultado:
                </h3>
                
                <div className="grid grid-cols-7 items-center gap-4 text-center">
                  <div className="col-span-3 text-right font-bold text-sm truncate text-slate-200">
                    {partida ? PARTIDAS_MOCK.find(p => p.id === partida)?.casa : 'TIME DA CASA'}
                  </div>
                  <div className="col-span-1">
                    <input
                      type="number"
                      value={golsCasa}
                      onChange={(e) => setGolsCasa(e.target.value)}
                      className="w-full text-center bg-[#161b26] border border-slate-700 rounded-lg py-2 font-black text-xl text-amber-400 focus:outline-none focus:border-amber-500"
                    />
                  </div>
                  <div className="col-span-3 text-left font-bold text-sm truncate text-slate-200">
                    {partida ? PARTIDAS_MOCK.find(p => p.id === partida)?.fora : 'TIME FORA'}
                  </div>
                </div>

                {/* Sub-gols e Assistências (Opcional) */}
                <div className="grid grid-cols-2 gap-4 pt-2 border-t border-slate-800/60 text-xs">
                  <div>
                    <span className="text-slate-400 font-medium block mb-2">Gols e Assistências (Casa)</span>
                    {listaGolsCasa.map((gol, idx) => (
                      <div key={idx} className="flex gap-2 mb-2">
                        <input
                          placeholder="Autor do gol"
                          value={gol.jogador}
                          onChange={(e) => atualizarGol('casa', idx, 'jogador', e.target.value)}
                          className="bg-[#161b26] border border-slate-800 rounded px-2 py-1 w-full text-slate-300"
                        />
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() => adicionarGol('casa')}
                      className="text-amber-500 font-semibold hover:underline"
                    >
                      + Adicionar Gol
                    </button>
                  </div>
                  <div>
                    <span className="text-slate-400 font-medium block mb-2">Gols e Assistências (Fora)</span>
                    {listaGolsFora.map((gol, idx) => (
                      <div key={idx} className="flex gap-2 mb-2">
                        <input
                          placeholder="Autor do gol"
                          value={gol.jogador}
                          onChange={(e) => atualizarGol('fora', idx, 'jogador', e.target.value)}
                          className="bg-[#161b26] border border-slate-800 rounded px-2 py-1 w-full text-slate-300"
                        />
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() => adicionarGol('fora')}
                      className="text-amber-500 font-semibold hover:underline"
                    >
                      + Adicionar Gol
                    </button>
                  </div>
                </div>
              </div>

              {/* Observações adicionais */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                  Observações (Opcional)
                </label>
                <textarea
                  placeholder="Ocorreu alguma queda de conexão? Relate aqui..."
                  rows={3}
                  value={observacoes}
                  onChange={(e) => setObservacoes(e.target.value)}
                  className="w-full bg-[#161b26] border border-slate-800 rounded-xl px-4 py-3 text-slate-200 text-sm focus:outline-none focus:border-amber-500 resize-none transition"
                />
              </div>

              <button
                type="submit"
                className="w-full bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold py-3.5 px-6 rounded-xl shadow-lg shadow-amber-500/10 transition flex items-center justify-center gap-2"
              >
                Salvar e Atualizar Tabelas
              </button>
            </form>
          </div>
        )}

        {/* ABA 2: CLASSIFICAÇÃO / GRUPOS */}
        {abaAtiva === 'classificacao' && (
          <div className="space-y-8 animate-fadeIn">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <h2 className="text-xl font-black text-slate-100 tracking-tight">Fase de Grupos</h2>
                <p className="text-sm text-slate-400">Classificação em tempo real da Liga Kame D</p>
              </div>
              <span className="bg-amber-500/10 text-amber-400 border border-amber-500/20 px-3 py-1 rounded-full text-xs font-bold uppercase">
                4 Classificados por Grupo
              </span>
            </div>

            {/* Grid dos Grupos */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* GRUPO A */}
              <div className="bg-[#0f131a] border border-slate-800 rounded-2xl p-5 shadow-md">
                <h3 className="text-md font-bold text-amber-400 mb-4 flex items-center gap-2">
                  <Award size={18} /> GRUPO A
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left text-slate-300">
                    <thead>
                      <tr className="border-b border-slate-800 text-slate-400 text-xs uppercase font-bold">
                        <th className="py-2.5">Pos</th>
                        <th className="py-2.5">Clube</th>
                        <th className="py-2.5 text-center">P</th>
                        <th className="py-2.5 text-center">J</th>
                        <th className="py-2.5 text-center">V</th>
                        <th className="py-2.5 text-center">SG</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/50">
                      <tr className="bg-emerald-500/5 font-medium text-slate-100">
                        <td className="py-3 text-emerald-400 font-bold">1º</td>
                        <td className="py-3 truncate max-w-[180px]">REIGA FC KAM</td>
                        <td className="py-3 text-center font-bold text-amber-400">3</td>
                        <td className="py-3 text-center">1</td>
                        <td className="py-3 text-center">1</td>
                        <td className="py-3 text-center text-emerald-400">+2</td>
                      </tr>
                      <tr className="bg-emerald-500/5 font-medium text-slate-100">
                        <td className="py-3 text-emerald-400 font-bold">2º</td>
                        <td className="py-3 truncate max-w-[180px]">BRK FC KAM</td>
                        <td className="py-3 text-center font-bold text-amber-400">3</td>
                        <td className="py-3 text-center">1</td>
                        <td className="py-3 text-center">1</td>
                        <td className="py-3 text-center text-emerald-400">+1</td>
                      </tr>
                      <tr className="bg-[#121620]/40">
                        <td className="py-3 text-slate-400 font-bold">3º</td>
                        <td className="py-3 truncate max-w-[180px]">ORIGINAL GANGSTERS</td>
                        <td className="py-3 text-center font-bold text-slate-200">1</td>
                        <td className="py-3 text-center">1</td>
                        <td className="py-3 text-center">0</td>
                        <td className="py-3 text-center">0</td>
                      </tr>
                      <tr className="bg-[#121620]/40">
                        <td className="py-3 text-slate-400 font-bold">4º</td>
                        <td className="py-3 truncate max-w-[180px]">SÃO SILVESTRE KAM</td>
                        <td className="py-3 text-center font-bold text-slate-200">1</td>
                        <td className="py-3 text-center">1</td>
                        <td className="py-3 text-center">0</td>
                        <td className="py-3 text-center">0</td>
                      </tr>
                      <tr className="text-slate-500">
                        <td className="py-3 font-bold">5º</td>
                        <td className="py-3 truncate max-w-[180px]">CORINTHIANS KAM</td>
                        <td className="py-3 text-center font-bold">0</td>
                        <td className="py-3 text-center">1</td>
                        <td className="py-3 text-center">0</td>
                        <td className="py-3 text-center text-red-400">-1</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* GRUPO B */}
              <div className="bg-[#0f131a] border border-slate-800 rounded-2xl p-5 shadow-md">
                <h3 className="text-md font-bold text-amber-400 mb-4 flex items-center gap-2">
                  <Award size={18} /> GRUPO B
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left text-slate-300">
                    <thead>
                      <tr className="border-b border-slate-800 text-slate-400 text-xs uppercase font-bold">
                        <th className="py-2.5">Pos</th>
                        <th className="py-2.5">Clube</th>
                        <th className="py-2.5 text-center">P</th>
                        <th className="py-2.5 text-center">J</th>
                        <th className="py-2.5 text-center">V</th>
                        <th className="py-2.5 text-center">SG</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/50">
                      <tr className="bg-emerald-500/5 font-medium text-slate-100">
                        <td className="py-3 text-emerald-400 font-bold">1º</td>
                        <td className="py-3 truncate max-w-[180px]">REAL MADRID KAM</td>
                        <td className="py-3 text-center font-bold text-amber-400">3</td>
                        <td className="py-3 text-center">1</td>
                        <td className="py-3 text-center">1</td>
                        <td className="py-3 text-center text-emerald-400">+3</td>
                      </tr>
                      <tr className="bg-emerald-500/5 font-medium text-slate-100">
                        <td className="py-3 text-emerald-400 font-bold">2º</td>
                        <td className="py-3 truncate max-w-[180px]">MILANO FC KAM</td>
                        <td className="py-3 text-center font-bold text-amber-400">3</td>
                        <td className="py-3 text-center">1</td>
                        <td className="py-3 text-center">1</td>
                        <td className="py-3 text-center text-emerald-400">+1</td>
                      </tr>
                      <tr className="bg-[#121620]/40">
                        <td className="py-3 text-slate-400 font-bold">3º</td>
                        <td className="py-3 truncate max-w-[180px]">KINGS FC KAM</td>
                        <td className="py-3 text-center font-bold text-slate-200">0</td>
                        <td className="py-3 text-center">0</td>
                        <td className="py-3 text-center">0</td>
                        <td className="py-3 text-center">0</td>
                      </tr>
                      <tr className="bg-[#121620]/40">
                        <td className="py-3 text-slate-400 font-bold">4º</td>
                        <td className="py-3 truncate max-w-[180px]">DECORETTI FC KAM</td>
                        <td className="py-3 text-center font-bold text-slate-200">0</td>
                        <td className="py-3 text-center">0</td>
                        <td className="py-3 text-center">0</td>
                        <td className="py-3 text-center">0</td>
                      </tr>
                      <tr className="text-slate-500">
                        <td className="py-3 font-bold">5º</td>
                        <td className="py-3 truncate max-w-[180px]">TAQUARI FC KAM</td>
                        <td className="py-3 text-center font-bold">0</td>
                        <td className="py-3 text-center">1</td>
                        <td className="py-3 text-center">0</td>
                        <td className="py-3 text-center text-red-400">-3</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ABA 3: MATA-MATA (ÁRVORE DINÂMICA) */}
        {abaAtiva === 'matamata' && (
          <div className="space-y-8 animate-fadeIn">
            <div className="border-b border-slate-800 pb-4">
              <h2 className="text-xl font-black text-slate-100 tracking-tight">Fase Final (Mata-Mata)</h2>
              <p className="text-sm text-slate-400">Chaveamento eliminatório rumo ao grande título</p>
            </div>

            {/* Fluxo Visual do Chaveamento */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-center bg-[#0f131a] border border-slate-800 rounded-2xl p-6 overflow-x-auto min-w-[600px]">
              
              {/* COLUNA 1: SEMIFINAIS */}
              <div className="space-y-12">
                <h4 className="text-center text-xs font-bold tracking-widest text-slate-500 uppercase">Semifinais</h4>
                
                {/* Jogo 1 */}
                <div className="bg-[#161b26] border border-slate-800 rounded-xl overflow-hidden shadow-md">
                  <div className="p-3 border-b border-slate-800 flex justify-between items-center bg-[#1b2230] text-xs font-bold text-slate-400">
                    <span>MATA-MATA #1</span>
                    <span className="text-amber-400">ENCERRADO</span>
                  </div>
                  <div className="p-3 space-y-2 text-sm">
                    <div className="flex justify-between items-center text-slate-200 font-semibold">
                      <span>1ºA - REIGA FC KAM</span>
                      <span className="bg-slate-800 px-2 py-0.5 rounded text-amber-400 font-black">3</span>
                    </div>
                    <div className="flex justify-between items-center text-slate-400">
                      <span>2ºB - MILANO FC KAM</span>
                      <span className="bg-slate-800 px-2 py-0.5 rounded font-bold">1</span>
                    </div>
                  </div>
                </div>

                {/* Jogo 2 */}
                <div className="bg-[#161b26] border border-slate-800 rounded-xl overflow-hidden shadow-md">
                  <div className="p-3 border-b border-slate-800 flex justify-between items-center bg-[#1b2230] text-xs font-bold text-slate-400">
                    <span>MATA-MATA #2</span>
                    <span className="text-blue-400">AGUARDANDO</span>
                  </div>
                  <div className="p-3 space-y-2 text-sm">
                    <div className="flex justify-between items-center text-slate-300">
                      <span>1ºB - REAL MADRID KAM</span>
                      <span className="bg-slate-800 px-2 py-0.5 rounded text-slate-500 font-bold">-</span>
                    </div>
                    <div className="flex justify-between items-center text-slate-300">
                      <span>2ºA - BRK FC KAM</span>
                      <span className="bg-slate-800 px-2 py-0.5 rounded text-slate-500 font-bold">-</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* COLUNA 2: GRANDE FINAL */}
              <div className="space-y-4 flex flex-col items-center justify-center border-l border-r border-slate-800/50 py-6 px-4">
                <Trophy size={40} className="text-amber-500 animate-pulse mb-2" />
                <h4 className="text-xs font-bold tracking-widest text-slate-500 uppercase mb-4">Grande Final</h4>
                
                <div className="w-full bg-[#1c2230] border-2 border-amber-500/30 rounded-xl overflow-hidden shadow-lg shadow-amber-500/5">
                  <div className="p-3 bg-amber-500 text-slate-950 text-center text-xs font-black tracking-wider">
                    DISPUTA DO TÍTULO
                  </div>
                  <div className="p-4 space-y-3 text-sm">
                    <div className="flex justify-between items-center font-bold text-slate-100">
                      <span>REIGA FC KAM</span>
                      <span className="text-xs text-slate-400 bg-slate-800 px-2 py-0.5 rounded">Venc. SF1</span>
                    </div>
                    <div className="text-center text-xs font-black text-slate-500 my-1">VS</div>
                    <div className="flex justify-between items-center font-bold text-slate-400">
                      <span>A definir</span>
                      <span className="text-xs text-slate-500 bg-slate-800 px-2 py-0.5 rounded">Venc. SF2</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* COLUNA 3: CAMPEÃO */}
              <div className="text-center p-6 space-y-3">
                <div className="inline-flex p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl text-amber-400 mb-2">
                  <Award size={36} />
                </div>
                <h4 className="text-xs font-bold tracking-widest text-slate-500 uppercase">Campeão da Liga</h4>
                <p className="text-sm font-semibold text-slate-400 italic">Aguardando definição da Grande Final...</p>
              </div>

            </div>
          </div>
        )}

      </main>
    </div>
  );
}

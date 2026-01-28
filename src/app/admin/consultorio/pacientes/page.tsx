'use client';

import { useState, useEffect, useCallback } from 'react';
import { 
  Search, Plus, MoreHorizontal, Phone, User, Loader2, Trash2, 
  FileText, Calendar as CalendarIcon, Filter, Cake, X, List, Edit, ChevronRight 
} from 'lucide-react';
import { useRouter } from 'next/navigation'; // Adicionado
import { supabase } from '@/lib/supabase';
import NovoPacienteModal from '@/components/NovoPacienteModal';
import EditarPacienteModal from '@/components/EditarPacienteModal';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer 
} from 'recharts';
import { format, getMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Paciente {
  id: string;
  created_at: string;
  nome: string;
  telefone: string | null;
  email: string | null;
  cpf: string | null;
  data_nascimento: string | null;
  ativo: boolean;
}

interface DadosGrafico {
  nome: string;
  consultas: number;
}

export default function PaginaPacientes() {
  const router = useRouter(); // Hook para navegação
  const [pacientes, setPacientes] = useState<Paciente[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isListaCompletaOpen, setIsListaCompletaOpen] = useState(false);
  const [pacienteEditando, setPacienteEditando] = useState<Paciente | null>(null);
  const [menuAbertoId, setMenuAbertoId] = useState<string | null>(null);

  const [termoBusca, setTermoBusca] = useState('');
  const [filtroAtivo, setFiltroAtivo] = useState<'todos' | 'aniversariantes'>('todos');

  const [dadosGrafico, setDadosGrafico] = useState<DadosGrafico[]>([]);
  const [anoSelecionado, setAnoSelecionado] = useState(new Date().getFullYear());

  const fetchPacientes = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('pacientes')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      if (data) setPacientes(data as Paciente[]);
    } catch (error) {
      console.error('Erro ao buscar:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchDadosGrafico = useCallback(async () => {
    try {
      const start = `${anoSelecionado}-01-01T00:00:00`;
      const end = `${anoSelecionado}-12-31T23:59:59`;

      const { data, error } = await supabase
        .from('agendamentos')
        .select('data_consulta')
        .gte('data_consulta', start)
        .lte('data_consulta', end);

      if (error) throw error;

      const meses = Array(12).fill(0);
      data?.forEach((agendamento) => {
        const dataObj = new Date(agendamento.data_consulta);
        meses[getMonth(dataObj)]++;
      });

      const dadosFormatados = meses.map((qtd, index) => ({
        nome: format(new Date(anoSelecionado, index, 1), 'MMM', { locale: ptBR }),
        consultas: qtd
      }));

      setDadosGrafico(dadosFormatados);
    } catch (error) {
      console.error('Erro gráfico:', error);
    }
  }, [anoSelecionado]);

  useEffect(() => { 
    fetchPacientes(); 
    fetchDadosGrafico();
  }, [fetchPacientes, fetchDadosGrafico]);

  const handleExcluir = async (id: string) => {
    if (!confirm('⚠️ Tem certeza? Isso apagará o paciente e todo o histórico.')) return;
    try {
      const { error } = await supabase.from('pacientes').delete().eq('id', id);
      if (error) throw error;
      alert('Paciente removido!');
      fetchPacientes();
    } catch (error) {
      alert('Erro ao excluir.');
    }
  };

  const handleAbrirPerfil = (id: string) => {
    router.push(`/admin/consultorio/pacientes/${id}`);
  };

  const pacientesFiltrados = pacientes.filter((p) => {
    const termo = termoBusca.toLowerCase();
    const matchTexto = p.nome.toLowerCase().includes(termo) || p.cpf?.includes(termo);

    let matchFiltro = true;
    if (filtroAtivo === 'aniversariantes') {
      if (!p.data_nascimento) return false; 
      const mesNascimento = parseInt(p.data_nascimento.split('-')[1]) - 1;
      const mesAtual = new Date().getMonth();
      matchFiltro = mesNascimento === mesAtual;
    }

    return matchTexto && matchFiltro;
  });

  const pacientesRecentes = pacientes.slice(0, 5);

  return (
    <div className="space-y-8">
      
      {/* BLOCO 1: RESUMO RECENTE */}
      <div className="bg-white rounded-xl shadow-sm border border-nutri-100 overflow-hidden">
        <div className="p-6 border-b border-nutri-50 flex flex-col sm:flex-row justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-nutri-dark flex items-center gap-2">
              <User className="w-5 h-5 text-nutri-primary" /> Pacientes Recentes
            </h2>
            <p className="text-sm text-gray-500 mt-1">Exibindo os 5 últimos cadastrados.</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setIsListaCompletaOpen(true)} className="flex items-center gap-2 bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 px-4 py-2.5 rounded-lg font-medium shadow-sm transition-colors">
              <List className="w-4 h-4" /> Ver Todos
            </button>
            <button onClick={() => setIsModalOpen(true)} className="flex items-center gap-2 bg-nutri-primary hover:bg-green-600 text-white px-4 py-2.5 rounded-lg font-medium shadow-sm transition-colors">
              <Plus className="w-4 h-4" /> Novo
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-100">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Paciente</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Contato</th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Ações</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-50">
              {loading ? (
                 <tr><td colSpan={3} className="p-10 text-center text-gray-500"><Loader2 className="animate-spin inline mr-2"/> Carregando...</td></tr>
              ) : pacientesRecentes.length === 0 ? (
                 <tr><td colSpan={3} className="p-10 text-center text-gray-500">Nenhum paciente cadastrado ainda.</td></tr>
              ) : (
                pacientesRecentes.map((paciente) => (
                  <tr 
                    key={paciente.id} 
                    onClick={() => handleAbrirPerfil(paciente.id)}
                    className="hover:bg-nutri-50/30 transition-colors cursor-pointer group"
                  >
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900 group-hover:text-nutri-primary transition-colors">{paciente.nome}</div>
                      <div className="text-xs text-gray-400">Cadastrado em {format(new Date(paciente.created_at), 'dd/MM/yyyy')}</div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      <div className="flex items-center gap-1"><Phone className="w-3 h-3" /> {paciente.telefone || '-'}</div>
                    </td>
                    <td className="px-6 py-4 text-right relative">
                        <button 
                          onClick={(e) => { e.stopPropagation(); setMenuAbertoId(menuAbertoId === paciente.id ? null : paciente.id); }} 
                          className="text-gray-400 hover:text-nutri-primary p-1 rounded-full hover:bg-nutri-100 transition-colors"
                        >
                          <MoreHorizontal className="w-5 h-5" />
                        </button>
                        {menuAbertoId === paciente.id && (
                          <div className="absolute right-8 top-8 w-36 bg-white shadow-lg rounded-md border border-gray-100 z-10 overflow-hidden animate-in fade-in zoom-in duration-150 text-left">
                            <button 
                              onClick={(e) => { e.stopPropagation(); setPacienteEditando(paciente); setMenuAbertoId(null); }}
                              className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2 border-b border-gray-50"
                            >
                              <Edit className="w-3 h-3 text-blue-500" /> Editar
                            </button>
                            <button 
                              onClick={(e) => { e.stopPropagation(); handleExcluir(paciente.id); }} 
                              className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                            >
                              <Trash2 className="w-3 h-3" /> Excluir
                            </button>
                          </div>
                        )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* BLOCO 2: GRÁFICO */}
      <div className="bg-white rounded-xl shadow-sm border border-nutri-100 p-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h3 className="text-lg font-bold text-nutri-dark flex items-center gap-2">
                <CalendarIcon className="w-5 h-5 text-nutri-primary" /> Volume de Consultas
              </h3>
              <button 
                className="text-[10px] bg-nutri-100 text-nutri-dark px-2 py-1 rounded hover:bg-nutri-200 transition-colors font-bold flex items-center gap-1 uppercase tracking-wider"
              >
                Abrir estatísticas <ChevronRight className="w-3 h-3" />
              </button>
            </div>
            <p className="text-sm text-gray-500 mt-1">Total de agendamentos realizados por mês.</p>
          </div>
          <div className="flex items-center gap-2 bg-nutri-50 p-1 rounded-lg border border-nutri-100">
            <Filter className="w-4 h-4 text-nutri-primary ml-2" />
            <select value={anoSelecionado} onChange={(e) => setAnoSelecionado(Number(e.target.value))} className="bg-transparent text-sm font-medium text-nutri-dark py-1 pr-2 outline-none cursor-pointer">
              <option value={2025}>2025</option>
              <option value={2026}>2026</option>
              <option value={2027}>2027</option>
            </select>
          </div>
        </div>

        <div className="h-64 w-full">
          {dadosGrafico.every(d => d.consultas === 0) ? (
            <div className="h-full flex flex-col items-center justify-center text-gray-400 border-2 border-dashed border-gray-100 rounded-lg">
              <CalendarIcon className="w-8 h-8 mb-2 opacity-50" />
              <p className="text-sm">Nenhuma consulta em {anoSelecionado}</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dadosGrafico}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                <XAxis dataKey="nome" axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 12 }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 12 }} allowDecimals={false} />
                <Tooltip cursor={{ fill: '#f2fcf5' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                <Bar dataKey="consultas" fill="#22c55e" radius={[4, 4, 0, 0]} barSize={40} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <NovoPacienteModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSuccess={fetchPacientes} />
      
      <EditarPacienteModal 
        isOpen={!!pacienteEditando}
        paciente={pacienteEditando}
        onClose={() => setPacienteEditando(null)}
        onSuccess={fetchPacientes}
      />

      {/* MODAL LISTA COMPLETA */}
      {isListaCompletaOpen && (
        <div className="fixed inset-0 z-[60] bg-gray-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl h-[90vh] flex flex-col animate-in fade-in zoom-in duration-200">
            
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50 rounded-t-xl">
              <div>
                <h2 className="text-xl font-bold text-gray-800">Gerenciar Pacientes</h2>
                <p className="text-sm text-gray-500">Lista completa e busca avançada.</p>
              </div>
              <button onClick={() => setIsListaCompletaOpen(false)} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
                <X className="w-6 h-6 text-gray-500" />
              </button>
            </div>

            <div className="p-4 bg-white border-b border-gray-100 flex flex-col sm:flex-row gap-4 justify-between items-center">
              <div className="flex bg-gray-100 rounded-lg p-1 w-full sm:w-auto">
                <button 
                  onClick={() => setFiltroAtivo('todos')}
                  className={`flex-1 sm:flex-none px-4 py-1.5 text-sm font-medium rounded-md transition-all ${filtroAtivo === 'todos' ? 'bg-white text-nutri-dark shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                >
                  Ver Todos
                </button>
                <button 
                  onClick={() => setFiltroAtivo('aniversariantes')}
                  className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-1.5 text-sm font-medium rounded-md transition-all ${filtroAtivo === 'aniversariantes' ? 'bg-white text-nutri-dark shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                >
                  <Cake className="w-3.5 h-3.5 text-pink-500" /> Aniversariantes
                </button>
              </div>

              <div className="relative w-full sm:w-72">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                <input 
                  type="text" placeholder="Buscar por nome ou CPF..." 
                  value={termoBusca} onChange={(e) => setTermoBusca(e.target.value)} 
                  className="block w-full pl-10 pr-3 py-2 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-nutri-primary" 
                />
              </div>
            </div>

            <div className="flex-1 overflow-auto">
              <table className="min-w-full divide-y divide-gray-100">
                <thead className="bg-gray-50 sticky top-0 z-10 shadow-sm">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Paciente</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Contato</th>
                    <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Ações</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-50">
                  {pacientesFiltrados.map((paciente) => (
                    <tr 
                      key={paciente.id} 
                      onClick={() => handleAbrirPerfil(paciente.id)}
                      className="hover:bg-nutri-50/30 cursor-pointer"
                    >
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">{paciente.nome}</td>
                      <td className="px-6 py-4 text-sm text-gray-500">{paciente.telefone || '-'}</td>
                      <td className="px-6 py-4 text-right relative">
                        <button 
                          onClick={(e) => { e.stopPropagation(); setMenuAbertoId(menuAbertoId === paciente.id ? null : paciente.id); }} 
                          className="text-gray-400 hover:text-nutri-primary p-1"
                        >
                          <MoreHorizontal className="w-5 h-5" />
                        </button>
                        {menuAbertoId === paciente.id && (
                          <div className="absolute right-12 top-2 w-36 bg-white shadow-xl rounded-md border border-gray-100 z-50 text-left">
                            <button onClick={(e) => { e.stopPropagation(); setPacienteEditando(paciente); setMenuAbertoId(null); }} className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 flex items-center gap-2 border-b border-gray-50"><Edit className="w-3 h-3" /> Editar</button>
                            <button onClick={(e) => { e.stopPropagation(); handleExcluir(paciente.id); }} className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"><Trash2 className="w-3 h-3" /> Excluir</button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="p-4 border-t bg-gray-50 flex justify-end">
               <button onClick={() => setIsListaCompletaOpen(false)} className="px-4 py-2 bg-white border rounded-lg text-sm font-medium">Fechar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
'use client';

import { useState, useEffect, useCallback } from 'react';
import { 
  ArrowLeft, Calendar, Filter, Search, User, Users, 
  ChevronDown, ChevronUp, Loader2, TrendingUp, 
  Activity, FileText, Pill, Smartphone, Clock,
  CalendarCheck, CalendarClock, CalendarX, CheckCircle2, Plus 
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer 
} from 'recharts';
import { format, getMonth, subDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// --- INTERFACES ---
interface Paciente {
  id: string;
  nome: string;
  genero: string | null;
  usa_app: boolean | null;
  created_at: string;
}

interface DadoGrafico {
  mes: string;
  quantidade: number;
}

interface AgendamentoCompleto {
  data_consulta: string;
  paciente_id: string;
  status: string;
  tipo_agendamento: string;
}

interface KpiConsultorio {
  pacientes: number;
  antro: number;
  presc: number;
  manip: number;
}

interface KpiAgendamentos {
  total: number;
  confirmados: number;
  encaixes: number;
  desmarcados: number;
}

export default function PaginaEstatisticas() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [anoSelecionado, setAnoSelecionado] = useState(new Date().getFullYear());
  
  // Filtros
  const [blocoFiltroAberto, setBlocoFiltroAberto] = useState(false);
  const [modoFiltro, setModoFiltro] = useState<'todos' | 'paciente'>('todos');
  const [pacienteSelecionado, setPacienteSelecionado] = useState<Paciente | null>(null);
  const [buscaPaciente, setBuscaPaciente] = useState('');
  const [listaPacientes, setListaPacientes] = useState<Paciente[]>([]);

  // Dados dos Gráficos e KPIs
  const [dadosConsultas, setDadosConsultas] = useState<DadoGrafico[]>([]);
  const [dadosPacientesNovos, setDadosPacientesNovos] = useState<DadoGrafico[]>([]);
  const [dadosAgendamentosPeriodo, setDadosAgendamentosPeriodo] = useState<DadoGrafico[]>([]);
  
  const [kpisConsultorio, setKpisConsultorio] = useState<KpiConsultorio>({ pacientes: 0, antro: 0, presc: 0, manip: 0 });
  const [kpisAgendamentos, setKpisAgendamentos] = useState<KpiAgendamentos>({ total: 0, confirmados: 0, encaixes: 0, desmarcados: 0 });
  const [stats, setStats] = useState({ masc: 0, fem: 0, app: 0, inativos: 0 });

  // 1. Carregar lista de pacientes para o filtro
  useEffect(() => {
    const fetchPacientes = async () => {
      const { data } = await supabase.from('pacientes').select('id, nome, genero, usa_app, created_at').order('nome');
      if (data) setListaPacientes(data as Paciente[]);
    };
    fetchPacientes();
  }, []);

  // 2. Buscar e Processar Dados
  const fetchData = useCallback(async () => {
    setLoading(true);
    const inicioAno = `${anoSelecionado}-01-01T00:00:00`;
    const fimAno = `${anoSelecionado}-12-31T23:59:59`;

    try {
      // --- CONSULTAS E AGENDAMENTOS ---
      let qAgendamentos = supabase.from('agendamentos').select('*').gte('data_consulta', inicioAno).lte('data_consulta', fimAno);
      if (modoFiltro === 'paciente' && pacienteSelecionado) qAgendamentos = qAgendamentos.eq('paciente_id', pacienteSelecionado.id);
      
      const { data: resAgRaw } = await qAgendamentos;
      const resAg = (resAgRaw as AgendamentoCompleto[]) || [];

      // --- PACIENTES ---
      const { data: resPacientesRaw } = await supabase.from('pacientes').select('*').gte('created_at', inicioAno).lte('created_at', fimAno);
      const resPacientes = (resPacientesRaw as Paciente[]) || [];

      // --- PROCESSAMENTO GRÁFICOS ---
      const contagemConsultasValidas = Array(12).fill(0);
      const contagemAgendamentosGeral = Array(12).fill(0);
      const contagemNovosPacientes = Array(12).fill(0);

      resAg.forEach(ag => {
        const mes = getMonth(new Date(ag.data_consulta));
        contagemAgendamentosGeral[mes]++;
        if (ag.status !== 'desmarcado') contagemConsultasValidas[mes]++;
      });

      resPacientes.forEach(p => contagemNovosPacientes[getMonth(new Date(p.created_at))]++);

      const formatarMeses = (arr: number[]) => arr.map((qtd, i) => ({ 
        mes: format(new Date(anoSelecionado, i, 1), 'MMM', { locale: ptBR }), 
        quantidade: qtd 
      }));

      setDadosConsultas(formatarMeses(contagemConsultasValidas));
      setDadosAgendamentosPeriodo(formatarMeses(contagemAgendamentosGeral));
      setDadosPacientesNovos(formatarMeses(contagemNovosPacientes));

      // --- KPIs AGENDAMENTOS ---
      setKpisAgendamentos({
        total: resAg.length,
        confirmados: resAg.filter(a => a.status === 'confirmado').length,
        encaixes: resAg.filter(a => a.tipo_agendamento === 'encaixe').length,
        desmarcados: resAg.filter(a => a.status === 'desmarcado').length,
      });

      // --- KPIs CONSULTÓRIO ---
      setKpisConsultorio({
        pacientes: resPacientes.length,
        antro: 0, presc: 0, manip: 0
      });

      // --- ESTATÍSTICAS LATERAIS ---
      const masc = resPacientes.filter(p => p.genero === 'Masculino').length;
      const app = resPacientes.filter(p => p.usa_app).length;
      const inativos = resPacientes.filter(p => new Date(p.created_at) < subDays(new Date(), 60)).length;
      setStats({ masc, fem: resPacientes.length - masc, app, inativos });

    } catch (e) { 
      console.error(e); 
    } finally { 
      setLoading(false); 
    }
  }, [anoSelecionado, modoFiltro, pacienteSelecionado]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const progress = (val: number) => (val / (kpisConsultorio.pacientes || 1)) * 100;

  return (
    <div className="space-y-8 pb-12 animate-in fade-in duration-500">
      
      {/* HEADER PRINCIPAL */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-2xl border border-nutri-100 shadow-sm sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="p-2 hover:bg-nutri-100 rounded-lg text-nutri-dark transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-xl font-black text-nutri-dark uppercase tracking-tight">Estatísticas do Sistema</h1>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative">
            <button 
              onClick={() => setBlocoFiltroAberto(!blocoFiltroAberto)}
              className="flex items-center gap-2 bg-nutri-50 border border-nutri-100 px-4 py-2 rounded-xl text-sm font-bold text-nutri-dark hover:bg-nutri-100 transition-all shadow-sm"
            >
              <Filter className="w-4 h-4" /> Selecionar Filtro
            </button>
            
            {blocoFiltroAberto && (
              <div className="absolute right-0 mt-2 w-72 bg-white rounded-2xl shadow-2xl border border-gray-100 z-50 p-4">
                <div className="flex gap-2 mb-4">
                  <button onClick={() => {setModoFiltro('todos'); setPacienteSelecionado(null);}} className={`flex-1 py-2 text-[10px] font-bold rounded-lg border ${modoFiltro === 'todos' ? 'bg-nutri-dark text-white' : 'bg-gray-50'}`}>TODOS</button>
                  <button onClick={() => setModoFiltro('paciente')} className={`flex-1 py-2 text-[10px] font-bold rounded-lg border ${modoFiltro === 'paciente' ? 'bg-nutri-dark text-white' : 'bg-gray-50'}`}>ESCOLHER</button>
                </div>
                {modoFiltro === 'paciente' && (
                  <div className="space-y-2">
                    <div className="relative">
                      <Search className="absolute left-2 top-2.5 w-3 h-3 text-gray-400" />
                      <input type="text" placeholder="Buscar..." value={buscaPaciente} onChange={e => setBuscaPaciente(e.target.value)} className="w-full pl-7 pr-3 py-2 text-xs border rounded-md outline-none focus:ring-1 focus:ring-nutri-primary" />
                    </div>
                    <div className="max-h-40 overflow-auto border rounded-md">
                      {listaPacientes.filter(p => p.nome.toLowerCase().includes(buscaPaciente.toLowerCase())).map(p => (
                        <button key={p.id} onClick={() => {setPacienteSelecionado(p); setBlocoFiltroAberto(false);}} className="w-full text-left px-3 py-2 text-[11px] hover:bg-nutri-50 border-b last:border-0">{p.nome}</button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <select 
            value={anoSelecionado} 
            onChange={e => setAnoSelecionado(Number(e.target.value))}
            className="bg-nutri-dark text-white px-4 py-2 rounded-xl text-sm font-bold outline-none cursor-pointer"
          >
            {[2024, 2025, 2026].map(a => <option key={a} value={a}>{a}</option>)}
          </select>
        </div>
      </div>

      {/* 1. SEÇÃO: CONSULTAS REGISTRADAS */}
      <div className="bg-white p-6 rounded-2xl border border-nutri-100 shadow-sm">
        <div className="flex justify-between items-center mb-6">
          <h3 className="font-bold text-gray-800 flex items-center gap-2"><TrendingUp className="w-4 h-4 text-nutri-primary"/> Consultas registradas</h3>
          <span className="text-2xl font-black text-nutri-dark">{kpisAgendamentos.total - kpisAgendamentos.desmarcados}</span>
        </div>
        <div className="h-48 w-full">
          <ResponsiveContainer>
            <LineChart data={dadosConsultas}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0"/>
              <XAxis dataKey="mes" axisLine={false} tickLine={false} tick={{fontSize: 10}}/>
              <YAxis hide/>
              <Tooltip />
              <Line type="monotone" dataKey="quantidade" stroke="#22c55e" strokeWidth={3} dot={{r:4, fill: '#22c55e', strokeWidth: 2, stroke: '#fff'}}/>
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 2. DASHBOARD: CONSULTÓRIO */}
      <section className="space-y-6">
        <h2 className="text-2xl font-black text-nutri-dark flex items-center gap-3">
          <Users className="w-6 h-6 text-blue-500" /> Consultório
        </h2>
        
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KPICard title="Pacientes" value={kpisConsultorio.pacientes} icon={<Users className="w-4 h-4"/>} color="bg-blue-500" />
          <KPICard title="Antropometrias" value={kpisConsultorio.antro} icon={<Activity className="w-4 h-4"/>} color="bg-orange-500" />
          <KPICard title="Prescrições" value={kpisConsultorio.presc} icon={<FileText className="w-4 h-4"/>} color="bg-green-500" />
          <KPICard title="Manipulados" value={kpisConsultorio.manip} icon={<Pill className="w-4 h-4"/>} color="bg-purple-500" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-nutri-100 shadow-sm">
            <h3 className="font-bold text-gray-800 mb-6">Pacientes cadastrados</h3>
            <div className="h-64 w-full">
              <ResponsiveContainer>
                <LineChart data={dadosPacientesNovos}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f9f9f9"/>
                  <XAxis dataKey="mes" axisLine={false} tickLine={false} tick={{fontSize: 12}} dy={10}/>
                  <YAxis axisLine={false} tickLine={false} tick={{fontSize: 12}} allowDecimals={false}/>
                  <Tooltip />
                  <Line type="stepAfter" dataKey="quantidade" stroke="#3b82f6" strokeWidth={3} dot={{fill:'#3b82f6', r:4}} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-nutri-100 shadow-sm space-y-6">
            <h3 className="font-bold text-gray-800 border-b pb-4">Dados dos pacientes</h3>
            <StatRow label="Gênero masculino" value={stats.masc} perc={progress(stats.masc)} color="bg-blue-500" />
            <StatRow label="Gênero feminino" value={stats.fem} perc={progress(stats.fem)} color="bg-pink-500" />
            <StatRow label="Utilizam o aplicativo" icon={<Smartphone className="w-3 h-3"/>} value={stats.app} perc={progress(stats.app)} color="bg-nutri-primary" />
            <StatRow label="Consultas há +60 dias" icon={<Clock className="w-3 h-3"/>} value={stats.inativos} perc={progress(stats.inativos)} color="bg-red-500" />
          </div>
        </div>
      </section>

      {/* 3. DASHBOARD: AGENDAMENTOS */}
      <section className="space-y-6 pt-6 border-t border-nutri-100">
        <h2 className="text-2xl font-black text-nutri-dark flex items-center gap-3">
          <CalendarCheck className="w-6 h-6 text-purple-600" /> Agendamentos
        </h2>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KPICard title="Agendados" value={kpisAgendamentos.total} icon={<CalendarClock className="w-4 h-4"/>} color="bg-gray-400" />
          <KPICard title="Confirmados" value={kpisAgendamentos.confirmados} icon={<CheckCircle2 className="w-4 h-4"/>} color="bg-blue-600" />
          <KPICard title="Encaixe" value={kpisAgendamentos.encaixes} icon={<Plus className="w-4 h-4"/>} color="bg-purple-600" />
          <KPICard title="Desmarcados" value={kpisAgendamentos.desmarcados} icon={<CalendarX className="w-4 h-4"/>} color="bg-red-500" />
        </div>

        <div className="bg-white p-8 rounded-2xl border border-nutri-100 shadow-sm">
          <h3 className="font-bold text-gray-800 mb-8">Agendamentos por período</h3>
          
          {loading ? (
            <div className="h-64 flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-nutri-primary"/></div>
          ) : kpisAgendamentos.total === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center text-center">
              <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                <CalendarX className="w-10 h-10 text-gray-300" />
              </div>
              <h4 className="text-lg font-bold text-gray-700">Sem agendamentos</h4>
              <p className="text-sm text-gray-400 max-w-xs">Você não possui agendamentos para o período selecionado</p>
            </div>
          ) : (
            <div className="h-64 w-full">
              <ResponsiveContainer>
                <LineChart data={dadosAgendamentosPeriodo}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f5f5f5" />
                  <XAxis dataKey="mes" axisLine={false} tickLine={false} tick={{fill:'#9ca3af', fontSize:12}} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{fill:'#9ca3af', fontSize:12}} allowDecimals={false} />
                  <Tooltip />
                  <Line 
                    type="monotone" 
                    dataKey="quantidade" 
                    stroke="#8b5cf6" 
                    strokeWidth={4} 
                    dot={{r:5, fill:'#8b5cf6', strokeWidth:2, stroke:'#fff'}}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </section>

    </div>
  );
}

// --- SUBCOMPONENTES ---

function KPICard({ title, value, icon, color }: { title: string; value: number; icon: React.ReactNode; color: string }) {
  return (
    <div className="bg-white p-5 rounded-2xl border border-nutri-100 shadow-sm flex flex-col items-center justify-center text-center transition-all hover:shadow-md">
      <div className={`w-8 h-8 ${color} text-white rounded-lg flex items-center justify-center mb-3 shadow-lg shadow-current/20`}>{icon}</div>
      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">{title}</p>
      <span className="text-3xl font-black text-nutri-dark">{value}</span>
    </div>
  );
}

function StatRow({ label, value, perc, color, icon }: { label: string; value: number; perc: number; color: string; icon?: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center text-xs">
        <span className="text-gray-500 font-medium flex items-center gap-1">{icon} {label}</span>
        <span className="font-bold text-gray-800">{value} ({perc.toFixed(0)}%)</span>
      </div>
      <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
        <div className={`h-full ${color} transition-all duration-1000`} style={{ width: `${perc}%` }} />
      </div>
    </div>
  );
}
'use client';

import { useState, useEffect, useCallback } from 'react';
import { 
  format, startOfMonth, endOfMonth, eachDayOfInterval, 
  isSameMonth, isSameDay, addMonths, subMonths, getDay, parseISO 
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Plus, Loader2, Check, X } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import NovoAgendamentoModal from '@/components/NovoAgendamentoModal';
import EditarAgendamentoModal from '@/components/EditarAgendamentoModal';

// --- CONFIGURAÇÃO VISUAL ---
const TIPOS_AGENDAMENTO: Record<string, { label: string; color: string; text: string }> = {
  presencial: { label: 'Presencial', color: 'bg-pink-500', text: 'text-white' },
  online: { label: 'Online', color: 'bg-blue-300', text: 'text-blue-900' },
  primeira_vez: { label: 'Primeira Vez', color: 'bg-green-300', text: 'text-green-900' },
  retorno: { label: 'Retorno', color: 'bg-orange-600', text: 'text-white' },
  em_grupo: { label: 'Em Grupo', color: 'bg-orange-300', text: 'text-orange-900' },
  pacote: { label: 'Pacote', color: 'bg-gray-500', text: 'text-white' },
  pessoal: { label: 'Pessoal', color: 'bg-purple-500', text: 'text-white' },
  antropometria: { label: 'Antropometria', color: 'bg-green-700', text: 'text-white' },
  amigo: { label: 'Amigo', color: 'bg-red-500', text: 'text-white' },
  encaixe: { label: 'Encaixe', color: 'bg-blue-800', text: 'text-white' },
  gratuito: { label: 'Gratuito', color: 'bg-yellow-800', text: 'text-white' },
};

const STATUS_BORDAS: Record<string, string> = {
  a_confirmar: 'border-l-4 border-gray-400',
  confirmado: 'border-l-4 border-lime-500',
  desmarcado: 'border-l-4 border-red-500 opacity-60',
  Realizada: 'border-l-4 border-green-600', // Novo Status
  Faltou: 'border-l-4 border-red-600',      // Novo Status
};

interface Agendamento {
  id: string;
  data_consulta: string;
  tipo_agendamento: string;
  status: string;
  status_financeiro: string;
  pacientes: {
    nome: string;
  } | null;
}

export default function PaginaAgendamentos() {
  const [dataAtual, setDataAtual] = useState(new Date());
  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  
  // Modais
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [agendamentoSelecionado, setAgendamentoSelecionado] = useState<Agendamento | null>(null);

  const proximoMes = () => setDataAtual(addMonths(dataAtual, 1));
  const mesAnterior = () => setDataAtual(subMonths(dataAtual, 1));

  const fetchAgendamentos = useCallback(async () => {
    setLoading(true);
    const start = startOfMonth(dataAtual).toISOString();
    const end = endOfMonth(dataAtual).toISOString();

    try {
      const { data, error } = await supabase
        .from('agendamentos')
        .select(`
          id,
          data_consulta,
          tipo_agendamento,
          status,
          status_financeiro,
          pacientes ( nome )
        `)
        .gte('data_consulta', start)
        .lte('data_consulta', end);

      if (error) throw error;
      if (data) setAgendamentos(data as unknown as Agendamento[]);
    } catch (error) {
      console.error('Erro ao buscar agenda:', error);
    } finally {
      setLoading(false);
    }
  }, [dataAtual]);

  useEffect(() => { fetchAgendamentos(); }, [fetchAgendamentos]);

  // FUNÇÃO PARA ATUALIZAR STATUS RÁPIDO
  const handleUpdateStatus = async (e: React.MouseEvent, id: string, novoStatus: string) => {
    e.stopPropagation(); // Evita abrir o modal de edição
    setUpdatingId(id);
    try {
      const { error } = await supabase
        .from('agendamentos')
        .update({ status: novoStatus })
        .eq('id', id);

      if (error) throw error;
      
      // Atualiza o estado local para refletir a mudança visual imediata
      setAgendamentos(prev => prev.map(ag => ag.id === id ? { ...ag, status: novoStatus } : ag));
    } catch (error) {
      console.error('Erro ao atualizar status:', error);
    } finally {
      setUpdatingId(null);
    }
  };

  const diasDoMes = eachDayOfInterval({ start: startOfMonth(dataAtual), end: endOfMonth(dataAtual) });
  const diaDaSemanaInicio = getDay(startOfMonth(dataAtual));
  const diasVaziosInicio = Array(diaDaSemanaInicio).fill(null);

  return (
    <div className="space-y-6">
      
      {/* CABEÇALHO */}
      <div className="flex flex-col sm:flex-row justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-nutri-100">
        <div className="flex items-center gap-4">
          <h2 className="text-xl font-bold text-nutri-dark flex items-center gap-2">
            <span className="capitalize">{format(dataAtual, 'MMMM yyyy', { locale: ptBR })}</span>
            {loading && <Loader2 className="w-4 h-4 animate-spin text-nutri-primary" />}
          </h2>
          <div className="flex items-center bg-gray-100 rounded-lg p-1">
            <button onClick={mesAnterior} className="p-1 hover:bg-white rounded-md transition-all shadow-sm"><ChevronLeft className="w-5 h-5 text-gray-600" /></button>
            <button onClick={proximoMes} className="p-1 hover:bg-white rounded-md transition-all shadow-sm"><ChevronRight className="w-5 h-5 text-gray-600" /></button>
          </div>
        </div>
        <button onClick={() => setIsNewModalOpen(true)} className="mt-4 sm:mt-0 bg-nutri-primary hover:bg-green-600 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors shadow-sm">
          <Plus className="w-4 h-4" /> Novo Agendamento
        </button>
      </div>

      {/* GRADE */}
      <div className="bg-white rounded-xl shadow-sm border border-nutri-100 overflow-hidden">
        <div className="grid grid-cols-7 border-b border-gray-200 bg-gray-50">
          {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((dia) => (
            <div key={dia} className="py-2 text-center text-xs font-semibold text-gray-500 uppercase">{dia}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 auto-rows-fr bg-gray-200 gap-px min-h-[500px]">
          {diasVaziosInicio.map((_, i) => <div key={`empty-${i}`} className="bg-white" />)}
          
          {diasDoMes.map((dia) => {
            const agendamentosDoDia = agendamentos.filter(ag => isSameDay(parseISO(ag.data_consulta), dia));
            agendamentosDoDia.sort((a, b) => new Date(a.data_consulta).getTime() - new Date(b.data_consulta).getTime());
            const ehHoje = isSameDay(dia, new Date());

            return (
              <div key={dia.toString()} className={`bg-white min-h-[120px] p-1.5 hover:bg-gray-50 transition-colors ${!isSameMonth(dia, dataAtual) ? 'bg-gray-50 text-gray-400' : ''}`}>
                <span className={`text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full mb-1 ${ehHoje ? 'bg-nutri-primary text-white' : 'text-gray-500'}`}>
                  {format(dia, 'd')}
                </span>
                <div className="space-y-1">
                  {agendamentosDoDia.map((agendamento) => {
                    const estilo = TIPOS_AGENDAMENTO[agendamento.tipo_agendamento] || TIPOS_AGENDAMENTO['presencial'];
                    const borda = STATUS_BORDAS[agendamento.status] || STATUS_BORDAS['a_confirmar'];
                    const hora = format(parseISO(agendamento.data_consulta), 'HH:mm');

                    return (
                      <div 
                        key={agendamento.id}
                        onClick={() => setAgendamentoSelecionado(agendamento)}
                        className={`text-[10px] p-1.5 rounded shadow-sm cursor-pointer hover:scale-[1.02] transition-all relative group ${estilo.color} ${estilo.text} ${borda}`}
                      >
                        <div className="font-bold truncate">{hora} - {agendamento.pacientes?.nome}</div>
                        
                        {/* AÇÕES RÁPIDAS (Aparecem no Hover) */}
                        <div className="absolute top-0 right-0 h-full hidden group-hover:flex items-center gap-1 bg-inherit px-1 rounded-r">
                           {updatingId === agendamento.id ? (
                             <Loader2 className="w-3 h-3 animate-spin" />
                           ) : (
                             <>
                               <button 
                                 onClick={(e) => handleUpdateStatus(e, agendamento.id, 'Realizada')}
                                 className="bg-green-600 text-white p-0.5 rounded hover:bg-green-700 transition-colors"
                                 title="Compareceu"
                               >
                                 <Check size={10} />
                               </button>
                               <button 
                                 onClick={(e) => handleUpdateStatus(e, agendamento.id, 'Faltou')}
                                 className="bg-red-600 text-white p-0.5 rounded hover:bg-red-700 transition-colors"
                                 title="Faltou"
                               >
                                 <X size={10} />
                               </button>
                             </>
                           )}
                        </div>
                        
                        <div className="opacity-80 truncate">{estilo.label}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* LEGENDA ATUALIZADA */}
      <div className="bg-white p-4 rounded-xl border border-nutri-100 flex flex-col sm:flex-row gap-6">
        <div>
          <h3 className="text-xs font-bold text-gray-400 uppercase mb-3 tracking-wider">Tipos</h3>
          <div className="flex flex-wrap gap-3">
            {Object.entries(TIPOS_AGENDAMENTO).slice(0, 6).map(([key, value]) => (
              <div key={key} className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${value.color}`}></div>
                <span className="text-[10px] text-gray-600 font-medium">{value.label}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="border-l border-gray-100 pl-6">
          <h3 className="text-xs font-bold text-gray-400 uppercase mb-3 tracking-wider">Status de Presença</h3>
          <div className="flex gap-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-green-600 rounded-sm"></div>
              <span className="text-[10px] text-gray-600 font-bold uppercase">Realizada</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-red-600 rounded-sm"></div>
              <span className="text-[10px] text-gray-600 font-bold uppercase">Faltou</span>
            </div>
          </div>
        </div>
      </div>

      <NovoAgendamentoModal 
        isOpen={isNewModalOpen} 
        onClose={() => setIsNewModalOpen(false)} 
        onSuccess={fetchAgendamentos} 
      />
      
      {agendamentoSelecionado && (
        <EditarAgendamentoModal 
          key={agendamentoSelecionado.id}
          isOpen={!!agendamentoSelecionado}
          agendamento={agendamentoSelecionado}
          onClose={() => setAgendamentoSelecionado(null)}
          onSuccess={fetchAgendamentos}
        />
      )}
    </div>
  );
}
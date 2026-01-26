'use client';

import { useState, useEffect } from 'react';
import { X, Save, Loader2, Clock, Calendar } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { format } from 'date-fns';

interface PacienteOption {
  id: string;
  nome: string;
}

// Horários fixos para a grade
const HORARIOS_PADRAO = [
  '08:00', '09:00', '10:00', '11:00', '12:00', 
  '13:00', '14:00', '15:00', '16:00', '17:00', '18:00'
];

const TIPOS = [
  { value: 'presencial', label: 'Presencial' },
  { value: 'online', label: 'Online' },
  { value: 'primeira_vez', label: 'Primeira Vez' },
  { value: 'retorno', label: 'Retorno' },
  { value: 'em_grupo', label: 'Em Grupo' },
  { value: 'pacote', label: 'Pacote' },
  { value: 'pessoal', label: 'Pessoal' },
  { value: 'antropometria', label: 'Antropometria' },
  { value: 'amigo', label: 'Amigo' },
  { value: 'encaixe', label: 'Encaixe' },
  { value: 'gratuito', label: 'Gratuito' },
];

interface NovoAgendamentoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function NovoAgendamentoModal({ isOpen, onClose, onSuccess }: NovoAgendamentoModalProps) {
  const [loading, setLoading] = useState(false);
  const [pacientes, setPacientes] = useState<PacienteOption[]>([]);
  
  // Estados do Formulário
  const [pacienteId, setPacienteId] = useState('');
  const [data, setData] = useState('');
  const [hora, setHora] = useState('');
  const [tipo, setTipo] = useState('presencial');
  const [status, setStatus] = useState('a_confirmar');
  const [statusFinanceiro, setStatusFinanceiro] = useState('nao_pago');

  // Controle da Grade
  const [horariosOcupados, setHorariosOcupados] = useState<string[]>([]);
  const [buscandoHorarios, setBuscandoHorarios] = useState(false);
  const [modoManual, setModoManual] = useState(false);

  // Carregar Pacientes
  useEffect(() => {
    if (isOpen) {
      const hoje = new Date().toISOString().split('T')[0];
      setData(hoje);
      setModoManual(false);
      setHora('');

      const fetchPacientes = async () => {
        const { data } = await supabase.from('pacientes').select('id, nome').order('nome');
        if (data) setPacientes(data as PacienteOption[]);
      };
      fetchPacientes();
    }
  }, [isOpen]);

  // Buscar horários ocupados
  useEffect(() => {
    const fetchHorariosDoDia = async () => {
      if (!data) return;
      setBuscandoHorarios(true);
      
      const start = `${data}T00:00:00`;
      const end = `${data}T23:59:59`;

      const { data: agendamentos } = await supabase
        .from('agendamentos')
        .select('data_consulta')
        .gte('data_consulta', start)
        .lte('data_consulta', end)
        .neq('status', 'desmarcado');

      if (agendamentos) {
        const ocupados = agendamentos.map(ag => {
          const dateObj = new Date(ag.data_consulta);
          return format(dateObj, 'HH:mm');
        });
        setHorariosOcupados(ocupados);
      }
      setBuscandoHorarios(false);
    };

    fetchHorariosDoDia();
  }, [data]);

  const handleSalvar = async () => {
    if (!pacienteId || !data || !hora) {
      alert('Preencha paciente, data e hora!');
      return;
    }

    setLoading(true);

    try {
      const dataCompleta = new Date(`${data}T${hora}:00`).toISOString();

      // Verificação de Conflito
      const { data: conflito } = await supabase
        .from('agendamentos')
        .select('id')
        .eq('data_consulta', dataCompleta)
        .neq('status', 'desmarcado')
        .maybeSingle();

      if (conflito) {
        if (!confirm('⚠️ Atenção: Já existe um agendamento EXATAMENTE neste horário. Deseja agendar mesmo assim (Encaixe)?')) {
          setLoading(false);
          return;
        }
      }

      const { error } = await supabase.from('agendamentos').insert({
        paciente_id: pacienteId,
        data_consulta: dataCompleta,
        tipo_agendamento: tipo,
        status: status,
        status_financeiro: statusFinanceiro
      });

      if (error) throw error;

      alert('Agendamento criado com sucesso!');
      onSuccess();
      onClose();
      
      setPacienteId('');
      setTipo('presencial');
      setStatus('a_confirmar');
      
    } catch (error) {
      console.error('Erro ao salvar:', error);
      alert('Erro ao criar agendamento.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 overflow-hidden animate-in fade-in zoom-in duration-200 flex flex-col max-h-[90vh]">
        
        {/* Cabeçalho */}
        <div className="bg-nutri-primary px-6 py-4 flex justify-between items-center shrink-0">
          <h3 className="text-white font-bold text-lg flex items-center gap-2">
            <Calendar className="w-5 h-5"/> Novo Agendamento
          </h3>
          <button onClick={onClose} className="text-white/80 hover:text-white transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Corpo com Scroll */}
        <div className="p-6 space-y-5 overflow-y-auto">
          
          {/* Paciente */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Paciente</label>
            <select 
              value={pacienteId} onChange={(e) => setPacienteId(e.target.value)}
              className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-nutri-primary outline-none bg-white"
            >
              <option value="">Selecione...</option>
              {pacientes.map(p => (<option key={p.id} value={p.id}>{p.nome}</option>))}
            </select>
          </div>

          {/* Data */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Data da Consulta</label>
            <input 
              type="date" 
              value={data} onChange={(e) => setData(e.target.value)} 
              className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-nutri-primary outline-none" 
            />
          </div>

          {/* GRADE VISUAL */}
          <div>
            <div className="flex justify-between items-end mb-2">
              <label className="block text-sm font-medium text-gray-700">Horário</label>
              <button onClick={() => { setModoManual(!modoManual); setHora(''); }} className="text-xs text-nutri-primary hover:underline font-medium">
                {modoManual ? 'Voltar para sugestões' : 'Horário manual (Encaixe)'}
              </button>
            </div>

            {modoManual ? (
              <div className="animate-in fade-in slide-in-from-top-2">
                 <input type="time" value={hora} onChange={(e) => setHora(e.target.value)} className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-nutri-primary outline-none" />
              </div>
            ) : (
              <div className="grid grid-cols-4 gap-2 animate-in fade-in slide-in-from-top-2">
                {buscandoHorarios ? (
                   <div className="col-span-4 text-center py-4 text-gray-400 text-sm flex items-center justify-center gap-2">
                     <Loader2 className="w-4 h-4 animate-spin"/> Verificando agenda...
                   </div>
                ) : (
                  HORARIOS_PADRAO.map((h) => {
                    const isOcupado = horariosOcupados.includes(h);
                    const isSelecionado = hora === h;

                    return (
                      <button
                        key={h}
                        onClick={() => !isOcupado && setHora(h)}
                        disabled={isOcupado}
                        className={`
                          relative py-3 px-2 rounded-xl border transition-all flex flex-col items-center justify-center gap-1
                          ${isOcupado 
                            ? 'bg-gray-100 border-gray-200 opacity-50 cursor-not-allowed' // ESTILO OPACO/BLOQUEADO
                            : isSelecionado
                              ? 'bg-nutri-primary text-white border-nutri-primary shadow-md scale-105 z-10'
                              : 'bg-white border-gray-200 text-gray-600 hover:border-nutri-primary hover:text-nutri-primary hover:shadow-sm'
                          }
                        `}
                      >
                        <span className={`text-sm font-bold ${isOcupado ? 'line-through decoration-gray-400' : ''}`}>{h}</span>
                        
                        {/* ETIQUETA DE OCUPADO BEM VISÍVEL */}
                        {isOcupado && (
                          <span className="text-[10px] font-black text-red-500 uppercase tracking-wider bg-red-100 px-1.5 rounded-sm">
                            Ocupado
                          </span>
                        )}
                      </button>
                    );
                  })
                )}
              </div>
            )}
            
            {!modoManual && hora && (
              <p className="text-sm text-nutri-dark mt-2 font-medium flex items-center gap-1">
                <Clock className="w-4 h-4"/> Horário escolhido: {hora}
              </p>
            )}
          </div>

          {/* Tipo, Status e Financeiro */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
            <select value={tipo} onChange={(e) => setTipo(e.target.value)} className="w-full border border-gray-300 rounded-lg p-2.5 bg-white outline-none">
              {TIPOS.map(t => (<option key={t.value} value={t.value}>{t.label}</option>))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select value={status} onChange={(e) => setStatus(e.target.value)} className="w-full border border-gray-300 rounded-lg p-2.5 bg-white outline-none">
                <option value="a_confirmar">A Confirmar</option>
                <option value="confirmado">Confirmado</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Financeiro</label>
              <select value={statusFinanceiro} onChange={(e) => setStatusFinanceiro(e.target.value)} className="w-full border border-gray-300 rounded-lg p-2.5 bg-white outline-none">
                <option value="nao_pago">Não Pago</option>
                <option value="pago">Pago Integral</option>
                <option value="sinal">Sinal Pago</option>
                <option value="gratuito">Gratuito</option>
              </select>
            </div>
          </div>

        </div>

        {/* Rodapé */}
        <div className="bg-gray-50 px-6 py-4 flex justify-end gap-3 border-t border-gray-100 shrink-0">
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg">Cancelar</button>
          <button onClick={handleSalvar} disabled={loading} className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-nutri-primary hover:bg-green-600 rounded-lg shadow-sm disabled:opacity-50">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Salvar
          </button>
        </div>
      </div>
    </div>
  );
}
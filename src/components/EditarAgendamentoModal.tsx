'use client';

import { useState, useEffect } from 'react';
import { X, Trash2, Save, Loader2, User, Calendar } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { format } from 'date-fns';

// 1. Tipagem correta para evitar o erro de 'any'
interface AgendamentoData {
  id: string;
  data_consulta: string;
  status: string;
  status_financeiro: string;
  pacientes: { nome: string } | null;
}

interface EditarModalProps {
  agendamento: AgendamentoData | null; // Pode ser nulo se nada estiver selecionado
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function EditarAgendamentoModal({ agendamento, isOpen, onClose, onSuccess }: EditarModalProps) {
  // 2. HOOKS PRIMEIRO (Sempre no topo, sem condições)
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('a_confirmar');
  const [financeiro, setFinanceiro] = useState('nao_pago');

  // 3. Atualiza os estados locais quando o agendamento muda (sincronização)
  useEffect(() => {
    if (agendamento) {
      setStatus(agendamento.status);
      setFinanceiro(agendamento.status_financeiro);
    }
  }, [agendamento]);

  // 4. Funções de Manipulação
  const handleExcluir = async () => {
    if (!agendamento) return;
    if (!confirm('🗑️ Tem certeza que deseja excluir este agendamento?')) return;
    
    setLoading(true);
    try {
      const { error } = await supabase.from('agendamentos').delete().eq('id', agendamento.id);
      if (error) throw error;
      
      onSuccess();
      onClose();
    } catch (e) {
      console.error(e);
      alert('Erro ao excluir agendamento.');
    } finally {
      setLoading(false);
    }
  };

  const handleAtualizar = async () => {
    if (!agendamento) return;
    setLoading(true);
    try {
      const { error } = await supabase.from('agendamentos').update({
        status: status,
        status_financeiro: financeiro
      }).eq('id', agendamento.id);

      if (error) throw error;
      
      alert('✅ Agendamento atualizado!');
      onSuccess();
      onClose();
    } catch (e) {
      console.error(e);
      alert('Erro ao atualizar agendamento.');
    } finally {
      setLoading(false);
    }
  };

  // 5. Agora sim, verificamos se deve renderizar (depois dos Hooks)
  if (!isOpen || !agendamento) return null;

  const horaFormatada = format(new Date(agendamento.data_consulta), 'dd/MM/yyyy - HH:mm');

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden animate-in fade-in zoom-in duration-200">
        
        {/* Header */}
        <div className="bg-gray-800 px-6 py-4 flex justify-between items-center text-white">
          <h3 className="font-bold text-lg">Gerenciar Agendamento</h3>
          <button onClick={onClose} className="hover:text-gray-300 transition-colors"><X className="w-5 h-5"/></button>
        </div>

        <div className="p-6 space-y-5">
          
          {/* Resumo */}
          <div className="bg-nutri-50 p-4 rounded-xl border border-nutri-100">
            <div className="flex items-center gap-2 text-nutri-dark font-medium mb-1">
              <User className="w-4 h-4" />
              <span className="text-sm">Paciente</span>
            </div>
            <p className="font-bold text-gray-800 text-xl">{agendamento.pacientes?.nome || 'Paciente Desconhecido'}</p>
            
            <div className="flex items-center gap-2 text-nutri-primary mt-2">
              <Calendar className="w-4 h-4" />
              <p className="font-semibold">{horaFormatada}</p>
            </div>
          </div>

          {/* Status Consulta */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status da Consulta</label>
            <select 
              value={status} onChange={(e) => setStatus(e.target.value)} 
              className="w-full border border-gray-300 p-2.5 rounded-lg focus:ring-2 focus:ring-nutri-primary outline-none bg-white"
            >
              <option value="a_confirmar">🕒 A Confirmar</option>
              <option value="confirmado">✅ Confirmado</option>
              <option value="desmarcado">❌ Desmarcado / Cancelado</option>
            </select>
          </div>

          {/* Status Financeiro */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status Financeiro</label>
            <select 
              value={financeiro} onChange={(e) => setFinanceiro(e.target.value)} 
              className="w-full border border-gray-300 p-2.5 rounded-lg focus:ring-2 focus:ring-nutri-primary outline-none bg-white"
            >
              <option value="nao_pago">🔴 Não Pago</option>
              <option value="pago">🟢 Pago Integral</option>
              <option value="sinal">🟠 Sinal Pago</option>
              <option value="gratuito">🟤 Gratuito</option>
            </select>
          </div>
        </div>

        {/* Rodapé */}
        <div className="bg-gray-50 px-6 py-4 flex justify-between border-t border-gray-100">
          <button 
            onClick={handleExcluir} 
            className="text-red-500 hover:bg-red-50 px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors"
          >
             <Trash2 className="w-4 h-4" /> Excluir
          </button>
          
          <button 
            onClick={handleAtualizar} 
            disabled={loading} 
            className="bg-gray-800 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-gray-700 flex items-center gap-2 shadow-sm transition-colors"
          >
            {loading ? <Loader2 className="animate-spin w-4 h-4"/> : <Save className="w-4 h-4"/>} Salvar Alterações
          </button>
        </div>
      </div>
    </div>
  );
}
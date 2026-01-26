'use client';

import { useState, useEffect } from 'react';
import { X, Save, Loader2, User, Phone, Mail, FileText, Calendar } from 'lucide-react';
import { supabase } from '@/lib/supabase';

// 1. Definindo o tipo correto (Adeus, any!)
interface PacienteData {
  id: string;
  nome: string;
  telefone: string | null;
  email: string | null;
  cpf: string | null;
  data_nascimento: string | null;
}

interface EditarPacienteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  paciente: PacienteData | null; // Agora ele sabe exatamente o que esperar
}

export default function EditarPacienteModal({ isOpen, onClose, onSuccess, paciente }: EditarPacienteModalProps) {
  const [loading, setLoading] = useState(false);
  
  // Estados do Formulário
  const [nome, setNome] = useState('');
  const [telefone, setTelefone] = useState('');
  const [email, setEmail] = useState('');
  const [cpf, setCpf] = useState('');
  const [nascimento, setNascimento] = useState('');

  // Preenche os campos quando o modal abre
  useEffect(() => {
    if (paciente) {
      setNome(paciente.nome || '');
      setTelefone(paciente.telefone || '');
      setEmail(paciente.email || '');
      setCpf(paciente.cpf || '');
      setNascimento(paciente.data_nascimento || '');
    }
  }, [paciente, isOpen]);

  const handleSalvar = async () => {
    if (!nome) {
      alert('O nome é obrigatório!');
      return;
    }
    
    // Proteção extra: se não tiver paciente carregado, não faz nada
    if (!paciente) return;

    setLoading(true);

    try {
      // ATUALIZAÇÃO (Update)
      const { error } = await supabase.from('pacientes').update({
        nome,
        telefone,
        email,
        cpf,
        data_nascimento: nascimento || null
      }).eq('id', paciente.id);

      if (error) throw error;

      alert('Dados atualizados com sucesso!');
      onSuccess(); // Atualiza a lista na tela de fundo
      onClose();   // Fecha o modal
      
    } catch (error) {
      console.error('Erro ao atualizar:', error);
      alert('Erro ao atualizar paciente.');
    } finally {
      setLoading(false);
    }
  };

  // Se não estiver aberto ou não tiver dados de paciente, não mostra nada
  if (!isOpen || !paciente) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden animate-in fade-in zoom-in duration-200">
        
        {/* Cabeçalho */}
        <div className="bg-blue-600 px-6 py-4 flex justify-between items-center">
          <h3 className="text-white font-bold text-lg flex items-center gap-2">
            <User className="w-5 h-5" />
            Editar Paciente
          </h3>
          <button onClick={onClose} className="text-white/80 hover:text-white transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Formulário */}
        <div className="p-6 space-y-4">
          
          {/* Nome */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nome Completo *</label>
            <div className="relative">
              <User className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
              <input 
                type="text" 
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Telefone */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Telefone / WhatsApp</label>
              <div className="relative">
                <Phone className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                <input 
                  type="text" 
                  value={telefone}
                  onChange={(e) => setTelefone(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
            </div>

            {/* Data de Nascimento */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Data de Nascimento</label>
              <div className="relative">
                <Calendar className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                <input 
                  type="date" 
                  value={nascimento}
                  onChange={(e) => setNascimento(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* CPF */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">CPF</label>
              <div className="relative">
                <FileText className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                <input 
                  type="text" 
                  value={cpf}
                  onChange={(e) => setCpf(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">E-mail</label>
              <div className="relative">
                <Mail className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                <input 
                  type="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
            </div>
          </div>

        </div>

        {/* Rodapé */}
        <div className="bg-gray-50 px-6 py-4 flex justify-end gap-3 border-t border-gray-100">
          <button 
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            Cancelar
          </button>
          <button 
            onClick={handleSalvar}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors shadow-sm disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Salvar Alterações
          </button>
        </div>

      </div>
    </div>
  );
}
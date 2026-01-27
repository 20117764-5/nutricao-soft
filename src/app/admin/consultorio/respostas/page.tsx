'use client';

import { useState, useEffect, useCallback } from 'react';
import { Search, Filter, Trash2, Eye, FileText, Calendar, User, X, Printer } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { STANDARD_FORMS } from '@/data/standardForms';

// --- INTERFACES ---
interface PatientData {
  nome: string;
  cpf: string;
  telefone: string;
  nascimento: string;
}

// Tipo estrito para os valores das respostas
type ResponseValue = string | string[] | number | boolean;

interface ResponseFromDB {
  id: string;
  form_id: string;
  form_title: string;
  form_type: 'custom' | 'standard';
  patient_name: string;
  patient_data: PatientData;
  responses: Record<string, ResponseValue>; // Tipagem corrigida aqui
  created_at: string;
}

export default function RespostasPage() {
  const [respostas, setRespostas] = useState<ResponseFromDB[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filtros
  const [filtroNome, setFiltroNome] = useState('');
  const [filtroTipo, setFiltroTipo] = useState('todos');

  // Modal
  const [selectedResponse, setSelectedResponse] = useState<ResponseFromDB | null>(null);

  // Buscar Respostas
  const fetchRespostas = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('form_responses')
        .select('*')
        .order('created_at', { ascending: false });

      if (filtroNome) {
        query = query.ilike('patient_name', `%${filtroNome}%`);
      }

      if (filtroTipo !== 'todos') {
        if (filtroTipo === 'custom') {
          query = query.eq('form_type', 'custom');
        } else {
          query = query.eq('form_id', filtroTipo);
        }
      }

      const { data, error } = await query;
      if (error) throw error;
      
      // O Supabase retorna JSON, então forçamos a tipagem aqui
      setRespostas(data as unknown as ResponseFromDB[]);

    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, [filtroNome, filtroTipo]);

  useEffect(() => {
    fetchRespostas();
  }, [fetchRespostas]);

  // Ações
  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta resposta?')) return;
    const { error } = await supabase.from('form_responses').delete().eq('id', id);
    if (!error) fetchRespostas();
  };

  const handlePrint = () => {
    window.print();
  };

  const getQuestionText = (resp: ResponseFromDB, questionId: string) => {
    if (resp.form_type === 'standard') {
      const formDef = STANDARD_FORMS[resp.form_id];
      if (!formDef) return questionId;
      
      for (const section of formDef.sections) {
        const found = section.items.find(i => i.id === questionId);
        if (found) return found.text;
      }
    }
    return "Pergunta / Item " + questionId;
  };

  return (
    <div className="space-y-6 pb-20 animate-in fade-in">
      
      {/* HEADER E FILTROS */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-5 rounded-2xl border border-nutri-100 shadow-sm">
        <div>
          <h1 className="text-2xl font-extrabold text-nutri-dark">Respostas</h1>
          <p className="text-sm text-gray-500">Gerencie os envios dos pacientes.</p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
            <input 
              type="text" 
              placeholder="Buscar paciente..." 
              value={filtroNome}
              onChange={e => setFiltroNome(e.target.value)}
              className="pl-9 pr-4 py-2 border rounded-xl text-sm outline-none focus:ring-2 focus:ring-nutri-primary w-full sm:w-64"
            />
          </div>

          <div className="relative">
            <Filter className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
            <select 
              value={filtroTipo}
              onChange={e => setFiltroTipo(e.target.value)}
              className="pl-9 pr-8 py-2 border rounded-xl text-sm outline-none focus:ring-2 focus:ring-nutri-primary appearance-none bg-white w-full sm:w-48 cursor-pointer"
            >
              <option value="todos">Todos os Tipos</option>
              <option value="custom">Personalizados</option>
              <optgroup label="Padrões">
                <option value="qrm">Rastreamento Metabólico</option>
                <option value="disbiose">Risco de Disbiose</option>
                <option value="frequencia_alimentar">Frequência Alimentar</option>
                <option value="cafeina">Cafeína</option>
                <option value="cronotipo">Cronotipo</option>
                <option value="fenotipo">Fenótipo Alimentar</option>
              </optgroup>
            </select>
          </div>
          
          <button onClick={() => fetchRespostas()} className="bg-nutri-dark text-white px-4 py-2 rounded-xl font-bold text-sm hover:bg-black transition-colors">
            Buscar
          </button>
        </div>
      </div>

      {/* LISTA DE RESPOSTAS */}
      {loading ? (
        <div className="flex justify-center p-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-nutri-primary"></div></div>
      ) : respostas.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-gray-200">
          <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-gray-600">Nenhuma resposta encontrada</h3>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {respostas.map((resp) => (
            <div key={resp.id} className="bg-white p-5 rounded-2xl border border-nutri-100 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-start mb-3">
                  <span className={`text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wide ${resp.form_type === 'standard' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                    {resp.form_type === 'standard' ? 'Padrão' : 'Personalizado'}
                  </span>
                  <span className="text-xs text-gray-400 flex items-center gap-1">
                    <Calendar className="w-3 h-3" /> {format(new Date(resp.created_at), "dd/MM/yyyy", { locale: ptBR })}
                  </span>
                </div>
                
                <h3 className="font-bold text-gray-800 text-lg mb-1 truncate">{resp.patient_name}</h3>
                <p className="text-sm text-nutri-primary font-medium mb-4 flex items-center gap-1">
                  <FileText className="w-3 h-3" /> {resp.form_title}
                </p>

                <div className="space-y-1 mb-4">
                  <p className="text-xs text-gray-500 flex items-center gap-2"><User className="w-3 h-3" /> CPF: {resp.patient_data?.cpf || '-'}</p>
                  <p className="text-xs text-gray-500 flex items-center gap-2"><span className="w-3 h-3 text-center font-bold">P</span> {resp.patient_data?.telefone || '-'}</p>
                </div>
              </div>

              <div className="flex gap-2 pt-4 border-t border-gray-50">
                <button onClick={() => setSelectedResponse(resp)} className="flex-1 flex items-center justify-center gap-2 bg-nutri-50 text-nutri-dark py-2 rounded-lg text-sm font-bold hover:bg-nutri-100 transition-colors">
                  <Eye className="w-4 h-4" /> Visualizar
                </button>
                <button onClick={() => handleDelete(resp.id)} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors" title="Excluir">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* MODAL DE VISUALIZAÇÃO */}
      {selectedResponse && (
        <div className="fixed inset-0 z-50 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center p-4 print:p-0 print:bg-white">
          <div className="bg-white rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl print:shadow-none print:w-full print:max-w-none print:max-h-none print:rounded-none">
            
            <div className="p-6 border-b border-gray-100 flex justify-between items-center print:hidden">
              <h2 className="text-xl font-bold text-gray-800">Detalhes</h2>
              <div className="flex gap-2">
                <button onClick={handlePrint} className="flex items-center gap-2 px-4 py-2 bg-nutri-primary text-white rounded-lg text-sm font-bold hover:bg-green-600"><Printer className="w-4 h-4" /> Imprimir</button>
                <button onClick={() => setSelectedResponse(null)} className="p-2 hover:bg-gray-100 rounded-full"><X className="w-5 h-5 text-gray-500" /></button>
              </div>
            </div>

            <div className="flex-1 overflow-auto p-8 print:overflow-visible">
              <div className="mb-8 border-b pb-6">
                <h1 className="text-2xl font-black text-nutri-dark mb-1">{selectedResponse.form_title}</h1>
                <p className="text-sm text-gray-500 mb-4">Relatório de Respostas</p>
                
                <div className="grid grid-cols-2 gap-4 bg-gray-50 p-4 rounded-xl print:border print:bg-white">
                  <div><p className="text-xs text-gray-400 uppercase font-bold">Paciente</p><p className="font-bold text-gray-800">{selectedResponse.patient_name}</p></div>
                  <div><p className="text-xs text-gray-400 uppercase font-bold">Data</p><p className="font-bold text-gray-800">{format(new Date(selectedResponse.created_at), "dd/MM/yyyy", { locale: ptBR })}</p></div>
                  <div><p className="text-xs text-gray-400 uppercase font-bold">CPF</p><p className="text-gray-800">{selectedResponse.patient_data.cpf}</p></div>
                  <div><p className="text-xs text-gray-400 uppercase font-bold">Telefone</p><p className="text-gray-800">{selectedResponse.patient_data.telefone}</p></div>
                </div>
              </div>

              <div className="space-y-6">
                <h3 className="font-bold text-gray-800 text-lg border-b pb-2 mb-4">Questionário</h3>
                
                {Object.entries(selectedResponse.responses).map(([key, value], idx) => {
                  const questionText = getQuestionText(selectedResponse, key);
                  
                  // Tratamento seguro do valor para exibição
                  let displayValue: string;
                  if (Array.isArray(value)) {
                    displayValue = value.join(', ');
                  } else if (typeof value === 'boolean') {
                    displayValue = value ? 'Sim' : 'Não';
                  } else {
                    displayValue = String(value);
                  }
                  
                  if (selectedResponse.form_id === 'qrm' && typeof value === 'number') {
                    displayValue = `${value} (Pontos)`;
                  }

                  return (
                    <div key={key} className="break-inside-avoid">
                      <p className="text-sm font-bold text-gray-500 mb-1">{idx + 1}. {questionText}</p>
                      <div className="bg-gray-50 p-3 rounded-lg text-gray-800 font-medium print:bg-white print:border print:p-2">{displayValue}</div>
                    </div>
                  );
                })}
              </div>

              {selectedResponse.form_id === 'qrm' && (
                <div className="mt-8 p-6 bg-blue-50 rounded-xl border border-blue-100 print:bg-white print:border-2">
                  <h4 className="font-bold text-blue-800 mb-2">Resultado Total (Rastreamento Metabólico)</h4>
                  <p className="text-3xl font-black text-blue-600">
                    {/* Convertendo para Number explicitamente no reduce */}
                    {Object.values(selectedResponse.responses).reduce((a: number, b) => a + Number(b), 0)} <span className="text-sm font-medium text-blue-400">pontos</span>
                  </p>
                </div>
              )}
            </div>
            
            <div className="p-4 border-t border-gray-100 bg-gray-50 rounded-b-xl flex justify-end print:hidden">
               <button onClick={() => setSelectedResponse(null)} className="px-6 py-2 bg-white border border-gray-300 rounded-lg text-sm font-bold text-gray-700 hover:bg-gray-100">Fechar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
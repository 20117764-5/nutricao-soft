'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Loader2, CheckCircle2, AlertCircle, User, Calendar, Phone } from 'lucide-react';
import { useParams } from 'next/navigation';
import { STANDARD_FORMS } from '@/data/standardForms';

// --- TIPOS ESTRITOS ---
type RespostaValor = string | string[] | number;

interface PacienteData {
  nome: string;
  cpf: string;
  telefone: string;
  nascimento: string;
}

// Interfaces para Formulário Personalizado (Vindo do Banco)
interface OpcaoRespostaCustom {
  id: string;
  texto: string;
}

interface PerguntaCustom {
  id: string;
  texto: string;
  tipo: 'texto' | 'multipla' | 'unica';
  opcoes?: OpcaoRespostaCustom[];
}

interface FormularioCustomData { 
  user_id: string; 
  title: string; 
  description: string; 
  questions: PerguntaCustom[]; 
}

export default function PaginaPublicaFormulario() {
  const params = useParams();
  const id = params.id as string;
  const standardForm = STANDARD_FORMS[id];

  const [loading, setLoading] = useState(true);
  const [enviado, setEnviado] = useState(false);
  const [erro, setErro] = useState(false);

  // Dados
  const [pacienteData, setPacienteData] = useState<PacienteData | null>(null);
  const [tempPaciente, setTempPaciente] = useState<PacienteData>({ nome: '', cpf: '', telefone: '', nascimento: '' });
  
  const [customForm, setCustomForm] = useState<FormularioCustomData | null>(null);
  const [ownerId, setOwnerId] = useState<string | null>(null);
  
  // Estado de Respostas Tipado
  const [respostas, setRespostas] = useState<Record<string, RespostaValor>>({});

  useEffect(() => {
    const carregarDados = async () => {
      if (standardForm) {
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('custom_forms')
        .select('user_id, title, description, questions')
        .eq('id', id)
        .single();
      
      if (error || !data) {
        setErro(true);
      } else {
        // Casting explícito para garantir que o JSON do banco bata com a interface
        const questionsTyped = data.questions as unknown as PerguntaCustom[];
        
        setCustomForm({
          user_id: data.user_id,
          title: data.title,
          description: data.description,
          questions: questionsTyped
        });
        setOwnerId(data.user_id);
      }
      setLoading(false);
    };
    if (id) carregarDados();
  }, [id, standardForm]);

  const handleSalvarPaciente = (e: React.FormEvent) => {
    e.preventDefault();
    if (tempPaciente.nome && tempPaciente.cpf) {
      setPacienteData(tempPaciente);
      window.scrollTo(0, 0);
    } else {
      alert('Preencha pelo menos Nome e CPF.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      let finalUserId = ownerId;

      if (!finalUserId) {
         const { data } = await supabase.auth.getUser();
         finalUserId = data.user?.id || null;
      }

      if (!finalUserId) {
        // Fallback: Tenta salvar mesmo sem ID se a política do banco permitir (public insert)
        // Mas idealmente alertamos
        console.warn('Salvando sem ID de profissional vinculado');
      }

      const { error } = await supabase.from('form_responses').insert({
        user_id: finalUserId, 
        form_id: id,
        form_title: standardForm ? standardForm.title : customForm?.title || 'Formulário',
        form_type: standardForm ? 'standard' : 'custom',
        patient_name: pacienteData?.nome,
        patient_data: pacienteData,
        responses: respostas
      });

      if (error) throw error;
      setEnviado(true);

    } catch (error) {
      console.error(error);
      alert('Erro ao enviar respostas. Tente novamente.');
    }
  };

  if (loading) return <div className="h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-green-600"/></div>;
  if (erro && !standardForm) return <div className="h-screen flex flex-col items-center justify-center text-gray-500"><AlertCircle className="w-10 h-10 mb-2"/>Formulário não encontrado.</div>;
  if (enviado) return <div className="h-screen flex flex-col items-center justify-center text-green-600 bg-green-50 animate-in fade-in"><CheckCircle2 className="w-16 h-16 mb-4"/> <h1 className="text-2xl font-bold">Recebido!</h1><p>Suas respostas foram enviadas com sucesso.</p></div>;

  // --- TELA 1: IDENTIFICAÇÃO ---
  if (!pacienteData) {
    return (
      <div className="min-h-screen bg-gray-50 py-10 px-4 flex items-center justify-center">
        <div className="bg-white p-8 rounded-xl shadow-lg max-w-md w-full">
          <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2"><User className="w-5 h-5 text-green-600"/> Identificação</h2>
          <form onSubmit={handleSalvarPaciente} className="space-y-4">
            <div><label className="block text-sm font-medium text-gray-700">Nome Completo</label><input type="text" required value={tempPaciente.nome} onChange={e => setTempPaciente({...tempPaciente, nome: e.target.value})} className="w-full border rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-green-500" /></div>
            <div><label className="block text-sm font-medium text-gray-700">CPF</label><input type="text" required placeholder="000.000.000-00" value={tempPaciente.cpf} onChange={e => setTempPaciente({...tempPaciente, cpf: e.target.value})} className="w-full border rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-green-500" /></div>
            <div className="grid grid-cols-2 gap-4">
               <div><label className="block text-sm font-medium text-gray-700">Telefone</label><div className="relative"><Phone className="w-4 h-4 absolute left-3 top-3 text-gray-400"/><input type="text" value={tempPaciente.telefone} onChange={e => setTempPaciente({...tempPaciente, telefone: e.target.value})} className="w-full border rounded-lg p-2.5 pl-9 outline-none focus:ring-2 focus:ring-green-500" /></div></div>
               <div><label className="block text-sm font-medium text-gray-700">Nascimento</label><div className="relative"><Calendar className="w-4 h-4 absolute left-3 top-3 text-gray-400"/><input type="date" value={tempPaciente.nascimento} onChange={e => setTempPaciente({...tempPaciente, nascimento: e.target.value})} className="w-full border rounded-lg p-2.5 pl-9 outline-none focus:ring-2 focus:ring-green-500" /></div></div>
            </div>
            <button type="submit" className="w-full bg-green-600 text-white font-bold py-3 rounded-lg hover:bg-green-700 transition-all mt-4">Continuar para o Formulário</button>
          </form>
        </div>
      </div>
    );
  }

  // --- TELA 2: FORMULÁRIOS PADRÃO ---
  if (standardForm) {
    return (
      <div className="min-h-screen bg-gray-50 py-10 px-4">
        <div className="max-w-4xl mx-auto bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="bg-nutri-dark p-8 text-white text-center">
            <h1 className="text-3xl font-bold">{standardForm.title}</h1>
            <p className="opacity-80 mt-2 text-sm max-w-lg mx-auto">{standardForm.description}</p>
          </div>
          <form onSubmit={handleSubmit} className="p-6 md:p-10 space-y-10">
            {standardForm.sections.map((secao, idx) => {
              // Definindo explicitamente o tipo do array para evitar 'any'
              const scaleOptions = secao.scale || standardForm.scaleLabels?.map(s => s.value) || [];

              return (
                <div key={idx} className="space-y-4">
                  <h3 className="text-xl font-bold text-nutri-dark border-b pb-2">{secao.title}</h3>
                  
                  {standardForm.type === 'standard_list' && (
                     <div className="space-y-6">
                       {secao.items.map(item => (
                         <div key={item.id} className="bg-gray-50 p-4 rounded-lg">
                           <p className="font-bold text-gray-800 mb-3">{item.text}</p>
                           <div className="flex flex-wrap gap-2">
                             {/* Tipando 'opt' como string explicitamente */}
                             {item.options?.map((opt: string) => (
                               <label key={opt} className="flex items-center gap-2 cursor-pointer bg-white border px-3 py-2 rounded hover:border-green-500">
                                 <input type="radio" name={item.id} value={opt} onChange={() => setRespostas({...respostas, [item.id]: opt})} className="text-green-600 focus:ring-green-500"/>
                                 <span className="text-sm text-gray-700">{opt}</span>
                               </label>
                             ))}
                           </div>
                         </div>
                       ))}
                     </div>
                  )}

                  {(standardForm.type === 'standard_scale' || standardForm.type === 'standard_grid') && (
                    <div className="space-y-2">
                      {scaleOptions.length > 0 && (
                         <div className="hidden md:flex justify-end gap-1 mb-2 px-2">
                           {scaleOptions.map((sc: string | number) => (
                             <div key={sc} className="w-10 text-center text-xs font-bold text-gray-500">{sc}</div>
                           ))}
                         </div>
                      )}
                      {secao.items.map((item) => {
                        const valorAtual = respostas[item.id];
                        return (
                          <div key={item.id} className="flex flex-col md:flex-row md:items-center justify-between py-3 px-2 hover:bg-gray-50 rounded-lg border-b border-gray-100 last:border-0">
                            <span className="text-gray-700 font-medium mb-2 md:mb-0 md:w-1/2">{item.text}</span>
                            <div className="flex gap-1 overflow-x-auto">
                              {/* Tipando 'val' explicitamente */}
                              {scaleOptions.map((val: string | number) => (
                                <button key={val} type="button" onClick={() => setRespostas({ ...respostas, [item.id]: val })} className={`w-10 h-10 shrink-0 rounded-lg font-bold border transition-all flex items-center justify-center text-sm ${valorAtual === val ? 'bg-green-600 text-white border-green-600 shadow-md' : 'bg-white text-gray-400 border-gray-200 hover:bg-gray-100'}`}>{val}</button>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
            <div className="pt-6 border-t"><button type="submit" className="w-full bg-nutri-dark text-white font-bold py-4 rounded-xl hover:bg-black shadow-lg">Enviar Respostas</button></div>
          </form>
        </div>
      </div>
    );
  }

  // --- TELA 3: FORMULÁRIO PERSONALIZADO ---
  if (customForm) {
    return (
      <div className="min-h-screen bg-gray-50 py-10 px-4">
        <div className="max-w-2xl mx-auto bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="bg-green-600 p-6 text-white"><h1 className="text-2xl font-bold">{customForm.title}</h1><p className="opacity-90 mt-1">{customForm.description}</p></div>
          <form onSubmit={handleSubmit} className="p-8 space-y-8">
            {customForm.questions.map((p, idx) => (
              <div key={p.id} className="space-y-3">
                <label className="block font-bold text-gray-800 text-lg"><span className="text-green-600 mr-2">{idx + 1}.</span>{p.texto}</label>
                
                {p.tipo === 'texto' && <textarea className="w-full border rounded-lg p-3 outline-none focus:ring-2 focus:ring-green-500 min-h-[100px]" placeholder="Sua resposta..." onChange={(e) => setRespostas({...respostas, [p.id]: e.target.value})} required />}
                
                {p.tipo === 'unica' && <div className="space-y-2">{p.opcoes?.map((opt) => <label key={opt.id} className="flex items-center gap-3 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer"><input type="radio" name={p.id} value={opt.texto} onChange={(e) => setRespostas({...respostas, [p.id]: e.target.value})} className="w-4 h-4 text-green-600" required /><span className="text-gray-700">{opt.texto}</span></label>)}</div>}
                
                {p.tipo === 'multipla' && <div className="space-y-2">{p.opcoes?.map((opt) => <label key={opt.id} className="flex items-center gap-3 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer"><input type="checkbox" value={opt.texto} onChange={(e) => { const current = (respostas[p.id] as string[]) || []; if(e.target.checked) setRespostas({...respostas, [p.id]: [...current, opt.texto]}); else setRespostas({...respostas, [p.id]: current.filter((x: string) => x !== opt.texto)}); }} className="w-4 h-4 text-green-600 rounded" /><span className="text-gray-700">{opt.texto}</span></label>)}</div>}
              </div>
            ))}
            <div className="pt-6 border-t"><button type="submit" className="w-full bg-green-600 text-white font-bold py-3 rounded-xl hover:bg-green-700 shadow-lg">Enviar Respostas</button></div>
          </form>
        </div>
      </div>
    );
  }
  return null;
}
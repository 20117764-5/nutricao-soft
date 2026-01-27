'use client';

import { useState, useEffect, useCallback } from 'react';
import { 
  Plus, FileText, Activity, Trash2, Save, X, 
  Link as LinkIcon, Copy, Edit, Loader2 
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { STANDARD_FORMS } from '@/data/standardForms';

// --- INTERFACES ---
type TipoResposta = 'texto' | 'multipla' | 'unica';

interface OpcaoResposta {
  id: string;
  texto: string;
}

interface Pergunta {
  id: string;
  texto: string;
  tipo: TipoResposta;
  opcoes?: OpcaoResposta[];
}

interface FormularioPersonalizado {
  id: string;
  title: string;
  description: string;
  questions: Pergunta[];
  created_at: string;
}

export default function PreConsultasPage() {
  const [abaAtiva, setAbaAtiva] = useState<'anamnese' | 'saude'>('anamnese');
  
  // Estados de Dados
  const [formularios, setFormularios] = useState<FormularioPersonalizado[]>([]);
  const [loading, setLoading] = useState(true);

  // Estados de Interface
  const [criandoForm, setCriandoForm] = useState(false);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  
  // Estado do Formulário Personalizado
  const [novoTitulo, setNovoTitulo] = useState('');
  const [novaDescricao, setNovaDescricao] = useState('');
  const [perguntasTemp, setPerguntasTemp] = useState<Pergunta[]>([]);
  
  // Estado da Pergunta Atual
  const [perguntaTexto, setPerguntaTexto] = useState('');
  const [tipoResposta, setTipoResposta] = useState<TipoResposta>('texto');
  const [opcoesTemp, setOpcoesTemp] = useState<OpcaoResposta[]>([]);
  const [novaOpcaoTexto, setNovaOpcaoTexto] = useState('');

  // 1. Carregar formulários do banco
  const fetchFormularios = useCallback(async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('custom_forms')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (!error && data) {
        const formsTipados = data.map(f => ({
          ...f,
          questions: f.questions as unknown as Pergunta[]
        }));
        setFormularios(formsTipados);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchFormularios(); }, [fetchFormularios]);

  // --- LÓGICA DE PERGUNTAS ---
  const handleAddOpcao = () => {
    if (!novaOpcaoTexto.trim()) return;
    setOpcoesTemp([...opcoesTemp, { id: crypto.randomUUID(), texto: novaOpcaoTexto }]);
    setNovaOpcaoTexto('');
  };

  const handleAddPergunta = () => {
    if (!perguntaTexto.trim()) { alert('Digite a pergunta!'); return; }
    if ((tipoResposta === 'multipla' || tipoResposta === 'unica') && opcoesTemp.length === 0) {
      alert('Adicione opções.'); return;
    }

    const novaPergunta: Pergunta = {
      id: crypto.randomUUID(),
      texto: perguntaTexto,
      tipo: tipoResposta,
      opcoes: (tipoResposta !== 'texto') ? [...opcoesTemp] : undefined
    };

    setPerguntasTemp([...perguntasTemp, novaPergunta]);
    setPerguntaTexto('');
    setTipoResposta('texto');
    setOpcoesTemp([]);
  };

  const handleRemovePergunta = (id: string) => {
    setPerguntasTemp(perguntasTemp.filter(p => p.id !== id));
  };

  // --- LÓGICA DE SALVAR / EDITAR / EXCLUIR ---
  const handleIniciarEdicao = (form: FormularioPersonalizado) => {
    setNovoTitulo(form.title);
    setNovaDescricao(form.description || '');
    setPerguntasTemp(form.questions);
    setEditandoId(form.id);
    setCriandoForm(true);
  };

  const handleSalvarFormulario = async () => {
    if (!novoTitulo.trim() || perguntasTemp.length === 0) {
      alert('Preencha o título e adicione perguntas.');
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    try {
      if (editandoId) {
        const { error } = await supabase.from('custom_forms').update({ title: novoTitulo, description: novaDescricao, questions: perguntasTemp }).eq('id', editandoId);
        if (error) throw error;
        alert('Formulário atualizado!');
      } else {
        const { error } = await supabase.from('custom_forms').insert({ user_id: user.id, title: novoTitulo, description: novaDescricao, questions: perguntasTemp });
        if (error) throw error;
        alert('Formulário criado!');
      }
      setNovoTitulo(''); setNovaDescricao(''); setPerguntasTemp([]); setEditandoId(null);
      setCriandoForm(false);
      fetchFormularios();
    } catch (e) {
      console.error(e);
      alert('Erro ao salvar formulário.');
    }
  };

  const handleExcluirFormulario = async (id: string) => {
    if (!confirm('Tem certeza? O link deixará de funcionar.')) return;
    const { error } = await supabase.from('custom_forms').delete().eq('id', id);
    if (!error) fetchFormularios();
    else alert('Erro ao excluir.');
  };

  // LINKS
  const handleCopiarLink = (id: string) => {
    const link = `${window.location.origin}/f/${id}`;
    navigator.clipboard.writeText(link);
    alert('Link copiado: ' + link);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      <div className="flex flex-col gap-4">
        <h1 className="text-2xl font-extrabold text-nutri-dark">Formulários para pré-consulta</h1>
        <div className="flex bg-white p-1 rounded-xl shadow-sm border border-nutri-100 w-fit">
          <button onClick={() => setAbaAtiva('anamnese')} className={`px-6 py-2.5 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${abaAtiva === 'anamnese' ? 'bg-nutri-primary text-white shadow-md' : 'text-gray-500 hover:bg-gray-50'}`}><FileText className="w-4 h-4" /> Questionário de pré-anamnese</button>
          <button onClick={() => setAbaAtiva('saude')} className={`px-6 py-2.5 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${abaAtiva === 'saude' ? 'bg-nutri-primary text-white shadow-md' : 'text-gray-500 hover:bg-gray-50'}`}><Activity className="w-4 h-4" /> Questionários de saúde</button>
        </div>
      </div>

      {/* ABA 1: CUSTOMIZADOS */}
      {abaAtiva === 'anamnese' && (
        <div className="space-y-6">
          {!criandoForm ? (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                 <h2 className="text-lg font-bold text-gray-700">Formulários personalizados</h2>
                 <button onClick={() => { setEditandoId(null); setNovoTitulo(''); setNovaDescricao(''); setPerguntasTemp([]); setCriandoForm(true); }} className="bg-nutri-dark text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-black transition-colors"><Plus className="w-4 h-4" /> Novo formulário</button>
              </div>
              {loading ? <div className="flex justify-center p-10"><Loader2 className="animate-spin text-nutri-primary"/></div> : formularios.length === 0 ? (
                <div className="bg-white border-2 border-dashed border-gray-200 rounded-xl p-12 text-center"><FileText className="w-8 h-8 text-gray-300 mx-auto mb-4" /><h3 className="font-bold text-gray-600">Nenhum formulário</h3></div>
              ) : (
                <div className="grid gap-4">
                  {formularios.map(form => (
                    <div key={form.id} className="bg-white p-6 rounded-xl border border-nutri-100 shadow-sm flex justify-between items-center hover:shadow-md transition-all">
                      <div><h3 className="font-bold text-nutri-dark text-lg">{form.title}</h3><p className="text-sm text-gray-500">{form.description}</p><span className="text-xs text-nutri-primary font-medium mt-2 block">{form.questions.length} perguntas</span></div>
                      <div className="flex gap-2">
                        <button onClick={() => handleCopiarLink(form.id)} title="Copiar Link" className="p-2 hover:bg-green-50 rounded-full text-gray-400 hover:text-green-600"><LinkIcon className="w-5 h-5" /></button>
                        <button onClick={() => handleIniciarEdicao(form)} title="Editar" className="p-2 hover:bg-blue-50 rounded-full text-gray-400 hover:text-blue-600"><Edit className="w-5 h-5" /></button>
                        <button onClick={() => handleExcluirFormulario(form.id)} title="Excluir" className="p-2 hover:bg-red-50 rounded-full text-gray-400 hover:text-red-600"><Trash2 className="w-5 h-5" /></button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow-sm border border-nutri-100 overflow-hidden animate-in slide-in-from-right-4 duration-300">
              <div className="bg-nutri-dark p-6 flex justify-between items-center text-white"><h3 className="font-bold text-lg">{editandoId ? 'Editar' : 'Novo'} Formulário</h3><button onClick={() => setCriandoForm(false)}><X className="w-6 h-6"/></button></div>
              <div className="p-8 space-y-8">
                <div className="grid gap-4">
                  <div><label className="block text-sm font-bold text-gray-700 mb-1">Nome</label><input type="text" value={novoTitulo} onChange={e => setNovoTitulo(e.target.value)} className="w-full border rounded-lg p-3 outline-none focus:ring-2 focus:ring-nutri-primary" placeholder="Título"/></div>
                  <div><label className="block text-sm font-bold text-gray-700 mb-1">Descrição</label><input type="text" value={novaDescricao} onChange={e => setNovaDescricao(e.target.value)} className="w-full border rounded-lg p-3 outline-none focus:ring-2 focus:ring-nutri-primary" placeholder="Descrição"/></div>
                </div>
                <hr className="border-gray-100" />
                <div className="bg-gray-50 p-6 rounded-xl border border-gray-200 space-y-4">
                  <h4 className="font-bold text-gray-800 flex items-center gap-2"><Plus className="w-4 h-4 text-nutri-primary" /> Adicionar Pergunta</h4>
                  <input type="text" value={perguntaTexto} onChange={e => setPerguntaTexto(e.target.value)} className="w-full border rounded-lg p-3 outline-none bg-white" placeholder="Pergunta..."/>
                  <select value={tipoResposta} onChange={(e) => setTipoResposta(e.target.value as TipoResposta)} className="w-full border rounded-lg p-3 outline-none bg-white"><option value="texto">Texto livre</option><option value="multipla">Múltipla escolha</option><option value="unica">Escolha única</option></select>
                  {(tipoResposta !== 'texto') && (
                    <div className="pl-4 border-l-2 border-nutri-200 space-y-3">
                      <p className="text-sm text-nutri-primary font-medium">Opções:</p>
                      {opcoesTemp.map((opt, idx) => <div key={opt.id} className="flex items-center gap-2 text-sm text-gray-700"><span className="w-5 h-5 bg-gray-200 rounded-full flex items-center justify-center text-[10px] font-bold">{idx + 1}</span> {opt.texto}</div>)}
                      <div className="flex gap-2"><input type="text" value={novaOpcaoTexto} onChange={e => setNovaOpcaoTexto(e.target.value)} className="flex-1 border rounded-lg p-2 text-sm outline-none" placeholder="Nova opção"/><button onClick={handleAddOpcao} className="bg-white border px-3 py-2 rounded-lg text-sm font-bold">+ Add</button></div>
                    </div>
                  )}
                  <button onClick={handleAddPergunta} className="w-full py-3 bg-nutri-primary text-white font-bold rounded-lg hover:bg-green-600 transition-colors mt-2">Adicionar Pergunta</button>
                </div>
                {perguntasTemp.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="font-bold text-gray-700">Perguntas ({perguntasTemp.length})</h4>
                    {perguntasTemp.map((p, idx) => (
                      <div key={p.id} className="bg-white p-4 rounded-lg border border-gray-100 shadow-sm flex justify-between group">
                        <div><p className="font-bold text-gray-800">{idx + 1}. {p.texto} <span className="text-xs font-normal text-gray-400">({p.tipo})</span></p></div>
                        <button onClick={() => handleRemovePergunta(p.id)} className="text-gray-300 hover:text-red-500"><Trash2 className="w-4 h-4"/></button>
                      </div>
                    ))}
                  </div>
                )}
                <div className="flex justify-end gap-4 pt-4 border-t border-gray-100"><button onClick={() => setCriandoForm(false)} className="px-6 py-3 font-bold text-gray-500">Cancelar</button><button onClick={handleSalvarFormulario} className="px-6 py-3 bg-nutri-dark text-white font-bold rounded-lg hover:bg-black shadow-lg flex items-center gap-2"><Save className="w-4 h-4"/> Salvar</button></div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ABA 2: PADRÃO (LISTAGEM DINÂMICA) */}
      {abaAtiva === 'saude' && (
        <div className="space-y-6">
          <h2 className="text-lg font-bold text-gray-700">Modelos prontos de saúde</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Object.values(STANDARD_FORMS).map((form) => (
              <div key={form.id} className="bg-white p-6 rounded-xl border border-nutri-100 shadow-sm hover:shadow-md transition-all group">
                <div className="flex justify-between items-start mb-4">
                  <div className="bg-purple-100 p-3 rounded-lg text-purple-600"><Activity className="w-6 h-6" /></div>
                  <span className="bg-green-100 text-green-700 text-xs font-bold px-2 py-1 rounded-full">Padrão</span>
                </div>
                <h3 className="text-xl font-bold text-nutri-dark mb-2">{form.title}</h3>
                <p className="text-sm text-gray-500 mb-6 line-clamp-2">{form.description}</p>
                <div className="flex gap-2">
                  <a href={`/f/${form.id}`} target="_blank" className="flex-1 bg-nutri-dark text-white py-2 rounded-lg text-sm font-bold hover:bg-black transition-colors text-center">Visualizar</a>
                  <button onClick={() => { const link = `${window.location.origin}/f/${form.id}`; navigator.clipboard.writeText(link); alert('Link copiado: ' + link); }} className="px-3 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors" title="Copiar Link"><LinkIcon className="w-5 h-5" /></button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
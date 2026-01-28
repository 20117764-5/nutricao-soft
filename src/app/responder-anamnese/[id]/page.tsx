'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Loader2, Send, CheckCircle2, AlertCircle, ClipboardList } from 'lucide-react';

interface TemplateAnamnese {
  id: string;
  titulo: string;
  perguntas: string[];
  paciente_id: string;
}

export default function ResponderAnamnesePage() {
  const params = useParams();
  const id = params?.id as string;

  const [template, setTemplate] = useState<TemplateAnamnese | null>(null);
  const [respostas, setRespostas] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [concluido, setConcluido] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    async function carregarFormulario() {
      if (!id) return;
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('anamneses_templates')
          .select('id, titulo, perguntas, paciente_id')
          .eq('id', id)
          .single();

        if (error) throw error;
        if (data) {
          const t = data as TemplateAnamnese;
          setTemplate(t);
          const inicial: Record<string, string> = {};
          t.perguntas.forEach((p) => { inicial[p] = ''; });
          setRespostas(inicial);
        }
      } catch (err) {
        setErro("Formulário não encontrado ou link expirado.");
      } finally {
        setLoading(false);
      }
    }
    carregarFormulario();
  }, [id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!template) return;
    setEnviando(true);
    setErro(null);

    try {
      // O insert precisa ser um ARRAY de objetos []
      const { error } = await supabase
        .from('anamneses_respostas')
        .insert([{
          template_id: template.id,
          paciente_id: template.paciente_id,
          titulo: template.titulo,
          respostas: respostas,
          respondido_em: new Date().toISOString()
        }]);

      if (error) throw error;
      setConcluido(true);
    } catch (err: unknown) {
      console.error(err);
      const msg = err instanceof Error ? err.message : "Erro ao enviar. Verifique sua conexão.";
      setErro(msg);
    } finally {
      setEnviando(false);
    }
  };

  if (loading) return (
    <div className="h-screen flex flex-col items-center justify-center bg-gray-50">
      <Loader2 className="animate-spin text-emerald-600 w-10 h-10" />
      <p className="mt-4 text-gray-500 font-medium">Carregando...</p>
    </div>
  );

  if (concluido) return (
    <div className="h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="bg-white p-10 rounded-[2.5rem] shadow-xl max-w-md w-full text-center animate-in zoom-in">
        <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-6" />
        <h1 className="text-2xl font-bold text-gray-800">Sucesso!</h1>
        <p className="text-gray-500 mt-2">Suas respostas foram enviadas.</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-2xl mx-auto bg-white rounded-[2.5rem] shadow-xl overflow-hidden border border-gray-100">
        <div className="bg-slate-900 p-10 text-white relative">
          <ClipboardList className="absolute right-4 bottom-4 w-24 h-24 opacity-10" />
          <h1 className="text-3xl font-bold">{template?.titulo}</h1>
          <p className="text-emerald-400 mt-2 font-medium">Responda as perguntas abaixo</p>
        </div>
        
        <form onSubmit={handleSubmit} className="p-8 sm:p-12 space-y-8">
          {template?.perguntas.map((p, i) => (
            <div key={i} className="space-y-3">
              <label className="block text-sm font-bold text-gray-700">{i + 1}. {p}</label>
              <textarea 
                required 
                className="w-full border-2 border-gray-100 rounded-2xl p-4 focus:border-emerald-500 outline-none transition-all h-32 bg-gray-50 text-gray-700" 
                value={respostas[p]} 
                onChange={(e) => setRespostas({...respostas, [p]: e.target.value})} 
              />
            </div>
          ))}

          {erro && (
            <div className="text-red-600 bg-red-50 p-4 rounded-xl flex items-center gap-3 font-medium border border-red-100">
              <AlertCircle size={20}/> {erro}
            </div>
          )}

          <button 
            type="submit" 
            disabled={enviando} 
            className="w-full bg-slate-900 text-white py-5 rounded-2xl font-bold text-lg hover:bg-black transition-all flex items-center justify-center gap-3 shadow-lg"
          >
            {enviando ? <Loader2 className="animate-spin" /> : <><Send size={20} /> Enviar agora</>}
          </button>
        </form>
      </div>
    </div>
  );
}
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { FileText, Calendar, Loader2, ArrowLeft, Heart } from 'lucide-react';
import Link from 'next/link';

export default function LoginPaciente() {
  const [cpf, setCpf] = useState('');
  const [nascimento, setNascimento] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // Busca o paciente que bate com o CPF e Nascimento ao mesmo tempo
    const { data, error } = await supabase
      .from('pacientes')
      .select('id, nome')
      .eq('cpf', cpf)
      .eq('data_nascimento', nascimento)
      .single();

    if (error || !data) {
      alert('Dados não encontrados. Verifique seu CPF e Data de Nascimento ou entre em contato com sua nutricionista.');
      setLoading(false);
    } else {
      // Em um app real, aqui salvaríamos a sessão do paciente.
      // Por enquanto, redirecionamos para o dashboard dele.
      router.push(`/paciente/dashboard?id=${data.id}`);
    }
  };

  return (
    <div className="min-h-screen bg-nutri-50 flex flex-col justify-center py-12 px-6">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <Link href="/" className="inline-flex items-center text-sm text-gray-500 hover:text-nutri-primary mb-8 transition-colors">
          <ArrowLeft className="w-4 h-4 mr-2" /> Voltar
        </Link>
        <div className="text-center mb-6">
           <Heart className="w-12 h-12 text-pink-500 mx-auto mb-2" />
           <h2 className="text-3xl font-extrabold text-gray-900">Olá, Paciente!</h2>
           <p className="text-gray-500 mt-2">Identifique-se para acessar seu plano.</p>
        </div>
      </div>

      <div className="mt-4 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-10 shadow-xl rounded-2xl border border-nutri-100">
          <form className="space-y-6" onSubmit={handleLogin}>
            <div>
              <label className="block text-sm font-medium text-gray-700">Seu CPF</label>
              <div className="mt-1 relative">
                <FileText className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                <input
                  type="text" required placeholder="000.000.000-00"
                  value={cpf} onChange={(e) => setCpf(e.target.value)}
                  className="appearance-none block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-xl focus:ring-nutri-primary focus:border-nutri-primary"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Data de Nascimento</label>
              <div className="mt-1 relative">
                <Calendar className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                <input
                  type="date" required
                  value={nascimento} onChange={(e) => setNascimento(e.target.value)}
                  className="appearance-none block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-xl focus:ring-nutri-primary focus:border-nutri-primary"
                />
              </div>
            </div>

            <button
              type="submit" disabled={loading}
              className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-sm text-sm font-bold text-white bg-nutri-primary hover:bg-green-600 transition-all disabled:opacity-50"
            >
              {loading ? <Loader2 className="animate-spin w-5 h-5" /> : 'Acessar meu Perfil'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
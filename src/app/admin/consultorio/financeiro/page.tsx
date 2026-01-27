'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  Plus, Calendar, Filter, TrendingUp, TrendingDown, 
  DollarSign, PieChart, X, Save, ArrowUpCircle, ArrowDownCircle 
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { format, subDays, isWithinInterval, startOfDay, endOfDay, parseISO } from 'date-fns';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

// --- 1. DEFINIÇÃO DE TIPOS ---

type TransactionType = 'income' | 'expense';

interface Transaction {
  id: string;
  type: TransactionType;
  amount: number;
  category: string;
  description: string;
  date: string;
  payment_method?: string;
}

interface FinancialSummary {
  income: number;
  expense: number;
  balance: number;
}

type PeriodOption = '7' | '15' | '30' | 'custom';

// --- 2. CATEGORIAS PADRÃO ---
const CATEGORIES = [
  'Consulta', 'Plano Alimentar', 'Retorno', 'Mentoria', // Entradas
  'Aluguel', 'Software', 'Marketing', 'Impostos', 'Materiais', 'Outros' // Saídas
];

export default function FinanceiroPage() {
  // --- ESTADOS ---
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false); 
  
  // Filtros
  const [periodo, setPeriodo] = useState<PeriodOption>('30');
  const [categoriaFiltro, setCategoriaFiltro] = useState<string>('todas');
  
  // Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Estado do Formulário
  const [newType, setNewType] = useState<TransactionType>('income');
  const [newAmount, setNewAmount] = useState('');
  const [newCategory, setNewCategory] = useState(CATEGORIES[0]);
  const [newDescription, setNewDescription] = useState('');
  const [newDate, setNewDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [newPaymentMethod, setNewPaymentMethod] = useState('');

  // --- 3. BUSCAR DADOS ---
  
  const fetchTransactions = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', user.id)
      .order('date', { ascending: false });

    if (!error && data) {
      setTransactions(data as Transaction[]);
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    
    const initData = async () => {
      setLoading(true);
      await fetchTransactions();
      if (mounted) setLoading(false);
    };

    initData();

    return () => { mounted = false; };
  }, [fetchTransactions]);

  // --- 4. LÓGICA DE FILTRAGEM E CÁLCULOS ---
  
  const filteredData = useMemo(() => {
    const hoje = new Date();
    let dataInicio = subDays(hoje, 30);

    if (periodo === '7') dataInicio = subDays(hoje, 7);
    if (periodo === '15') dataInicio = subDays(hoje, 15);

    return transactions.filter(t => {
      const tDate = parseISO(t.date);
      const isInDate = isWithinInterval(tDate, { start: startOfDay(dataInicio), end: endOfDay(hoje) });
      const isCat = categoriaFiltro === 'todas' || t.category === categoriaFiltro;

      return isInDate && isCat;
    });
  }, [transactions, periodo, categoriaFiltro]);

  const summary: FinancialSummary = useMemo(() => {
    return filteredData.reduce((acc, curr) => {
      const val = Number(curr.amount);
      if (curr.type === 'income') {
        acc.income += val;
        acc.balance += val;
      } else {
        acc.expense += val;
        acc.balance -= val;
      }
      return acc;
    }, { income: 0, expense: 0, balance: 0 });
  }, [filteredData]);

  // Dados para o Gráfico
  const chartData = useMemo(() => {
    const map = new Map<string, { date: string, saldo: number, entrada: number, saida: number }>();
    const sortedForChart = [...filteredData].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    sortedForChart.forEach(t => {
      const dateStr = format(parseISO(t.date), 'dd/MM');
      const current = map.get(dateStr) || { date: dateStr, saldo: 0, entrada: 0, saida: 0 };
      
      if (t.type === 'income') current.entrada += Number(t.amount);
      else current.saida += Number(t.amount);
      
      current.saldo = current.entrada - current.saida;
      map.set(dateStr, current);
    });

    return Array.from(map.values());
  }, [filteredData]);

  // --- 5. AÇÕES ---

  const handleSaveTransaction = async () => {
    if (!newAmount || !newDescription) {
      alert('Preencha valor e descrição.');
      return;
    }

    setLoading(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase.from('transactions').insert({
      user_id: user.id,
      type: newType,
      amount: parseFloat(newAmount),
      category: newCategory,
      description: newDescription,
      date: newDate,
      payment_method: newPaymentMethod
    });

    if (error) {
      alert('Erro ao salvar.');
    } else {
      await fetchTransactions();
      setIsModalOpen(false);
      setNewAmount(''); setNewDescription('');
    }
    setLoading(false);
  };

  const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-nutri-dark flex items-center gap-2">
            Financeiro <span className="text-gray-400 font-medium text-lg">| Últimos {periodo} dias</span>
          </h1>
          <p className="text-sm text-gray-500">Acompanhe o fluxo de caixa do seu consultório.</p>
        </div>

        <div className="flex gap-2 w-full md:w-auto">
          <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Calendar className="h-4 w-4 text-gray-400" />
            </div>
            <select 
              value={periodo} 
              onChange={(e) => setPeriodo(e.target.value as PeriodOption)}
              className="pl-10 pr-8 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-nutri-primary outline-none appearance-none cursor-pointer w-full md:w-auto"
            >
              <option value="7">Últimos 7 dias</option>
              <option value="15">Últimos 15 dias</option>
              <option value="30">Últimos 30 dias</option>
            </select>
          </div>

          <button 
            onClick={() => setIsModalOpen(true)}
            className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-nutri-dark text-white px-4 py-2.5 rounded-xl font-bold hover:bg-black transition-all shadow-lg shadow-gray-200"
          >
            <Plus className="w-4 h-4" /> Nova Movimentação
          </button>
        </div>
      </div>

      {/* FILTROS */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        <span className="text-xs font-bold text-gray-400 uppercase mr-2 flex items-center gap-1"><Filter className="w-3 h-3"/> Filtros:</span>
        <button onClick={() => setCategoriaFiltro('todas')} className={`px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all ${categoriaFiltro === 'todas' ? 'bg-nutri-primary text-white shadow-md' : 'bg-white border border-gray-200 text-gray-500 hover:bg-gray-50'}`}>Todas as categorias</button>
        {CATEGORIES.map(cat => (
          <button key={cat} onClick={() => setCategoriaFiltro(cat)} className={`px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all ${categoriaFiltro === cat ? 'bg-nutri-primary text-white shadow-md' : 'bg-white border border-gray-200 text-gray-500 hover:bg-gray-50'}`}>{cat}</button>
        ))}
      </div>

      {/* CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-6 rounded-2xl border border-green-100 shadow-sm relative overflow-hidden group">
          <div className="absolute right-0 top-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity"><ArrowUpCircle className="w-16 h-16 text-green-500" /></div>
          <p className="text-sm text-gray-500 font-medium mb-1 flex items-center gap-1"><TrendingUp className="w-4 h-4 text-green-500"/> Entrada total</p>
          <h3 className="text-3xl font-black text-green-600">{formatCurrency(summary.income)}</h3>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-red-100 shadow-sm relative overflow-hidden group">
          <div className="absolute right-0 top-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity"><ArrowDownCircle className="w-16 h-16 text-red-500" /></div>
          <p className="text-sm text-gray-500 font-medium mb-1 flex items-center gap-1"><TrendingDown className="w-4 h-4 text-red-500"/> Saída total</p>
          <h3 className="text-3xl font-black text-red-600">{formatCurrency(summary.expense)}</h3>
        </div>

        <div className={`bg-white p-6 rounded-2xl border shadow-sm relative overflow-hidden group ${summary.balance >= 0 ? 'border-blue-100' : 'border-red-100'}`}>
          <div className={`absolute right-0 top-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity`}><DollarSign className={`w-16 h-16 ${summary.balance >= 0 ? 'text-blue-500' : 'text-red-500'}`} /></div>
          <p className="text-sm text-gray-500 font-medium mb-1">Balanço do período</p>
          <h3 className={`text-3xl font-black ${summary.balance >= 0 ? 'text-blue-600' : 'text-red-600'}`}>{formatCurrency(summary.balance)}</h3>
        </div>
      </div>

      {/* GRÁFICO */}
      {filteredData.length > 0 && (
        <div className="bg-white p-6 rounded-2xl border border-nutri-100 shadow-sm h-80">
          <h4 className="font-bold text-gray-700 mb-4 flex items-center gap-2"><PieChart className="w-4 h-4"/> Evolução Financeira</h4>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="colorEntrada" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#16a34a" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#16a34a" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorSaida" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#dc2626" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#dc2626" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
              <XAxis dataKey="date" tick={{fontSize: 12}} axisLine={false} tickLine={false} />
              <YAxis tick={{fontSize: 12}} axisLine={false} tickLine={false} tickFormatter={(val) => `R$${val}`}/>
              <Tooltip 
                formatter={(value: number | string | (number | string)[] | undefined) => [
                    formatCurrency(Number(value || 0)), 
                    ''
                ]}
                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
              />
              <Area type="monotone" dataKey="entrada" stroke="#16a34a" fillOpacity={1} fill="url(#colorEntrada)" name="Entradas" />
              <Area type="monotone" dataKey="saida" stroke="#dc2626" fillOpacity={1} fill="url(#colorSaida)" name="Saídas" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* LISTAGEM */}
      <div className="bg-white rounded-2xl border border-nutri-100 shadow-sm overflow-hidden">
        {filteredData.length === 0 ? (
          <div className="p-12 text-center flex flex-col items-center justify-center">
            <div className="w-24 h-24 bg-gray-50 rounded-full flex items-center justify-center mb-6 animate-pulse"><DollarSign className="w-10 h-10 text-gray-300" /></div>
            <h3 className="text-xl font-bold text-gray-800 mb-2">Nenhum registro financeiro</h3>
            <p className="text-gray-500 max-w-md mx-auto mb-6">Nenhuma movimentação encontrada para o período selecionado.</p>
            <button onClick={() => setIsModalOpen(true)} className="text-nutri-primary font-bold hover:underline">Adicionar nova movimentação agora</button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">Data</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">Descrição</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">Categoria</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase text-right">Valor</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredData.map((t) => (
                  <tr key={t.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4 text-sm text-gray-500">{format(parseISO(t.date), 'dd/MM/yyyy')}</td>
                    <td className="px-6 py-4 text-sm font-medium text-gray-800">{t.description}</td>
                    <td className="px-6 py-4 text-sm"><span className="px-2 py-1 rounded-md bg-gray-100 text-gray-600 text-xs font-bold">{t.category}</span></td>
                    <td className={`px-6 py-4 text-sm font-bold text-right ${t.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>{t.type === 'income' ? '+' : '-'} {formatCurrency(t.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl animate-in zoom-in duration-200">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center"><h2 className="text-xl font-bold text-gray-800">Nova Movimentação</h2><button onClick={() => setIsModalOpen(false)}><X className="w-6 h-6 text-gray-400 hover:text-red-500 transition-colors"/></button></div>
            <div className="p-8 space-y-6">
              <div className="flex bg-gray-100 p-1 rounded-xl">
                <button onClick={() => setNewType('income')} className={`flex-1 py-2 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-all ${newType === 'income' ? 'bg-white text-green-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}><ArrowUpCircle className="w-4 h-4"/> Entrada</button>
                <button onClick={() => setNewType('expense')} className={`flex-1 py-2 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-all ${newType === 'expense' ? 'bg-white text-red-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}><ArrowDownCircle className="w-4 h-4"/> Saída</button>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-xs font-bold text-gray-500 uppercase mb-1">Valor (R$)</label><input type="number" step="0.01" value={newAmount} onChange={e => setNewAmount(e.target.value)} placeholder="0,00" className="w-full border border-gray-300 rounded-lg p-3 outline-none focus:ring-2 focus:ring-nutri-primary" /></div>
                <div><label className="block text-xs font-bold text-gray-500 uppercase mb-1">Data</label><input type="date" value={newDate} onChange={e => setNewDate(e.target.value)} className="w-full border border-gray-300 rounded-lg p-3 outline-none focus:ring-2 focus:ring-nutri-primary" /></div>
              </div>
              <div><label className="block text-xs font-bold text-gray-500 uppercase mb-1">Descrição</label><input type="text" value={newDescription} onChange={e => setNewDescription(e.target.value)} placeholder="Ex: Pagamento Consulta" className="w-full border border-gray-300 rounded-lg p-3 outline-none focus:ring-2 focus:ring-nutri-primary" /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-xs font-bold text-gray-500 uppercase mb-1">Categoria</label><select value={newCategory} onChange={e => setNewCategory(e.target.value)} className="w-full border border-gray-300 rounded-lg p-3 outline-none focus:ring-2 focus:ring-nutri-primary bg-white">{CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}</select></div>
                <div><label className="block text-xs font-bold text-gray-500 uppercase mb-1">Pagamento (Opcional)</label><select value={newPaymentMethod} onChange={e => setNewPaymentMethod(e.target.value)} className="w-full border border-gray-300 rounded-lg p-3 outline-none focus:ring-2 focus:ring-nutri-primary bg-white"><option value="">Selecione...</option><option value="pix">PIX</option><option value="cartao_credito">Cartão de Crédito</option><option value="dinheiro">Dinheiro</option><option value="boleto">Boleto</option></select></div>
              </div>
              <div className="pt-4 flex justify-end gap-3"><button onClick={() => setIsModalOpen(false)} className="px-6 py-3 font-bold text-gray-500 hover:bg-gray-50 rounded-lg transition-colors">Cancelar</button><button onClick={handleSaveTransaction} className="px-8 py-3 bg-nutri-dark text-white font-bold rounded-lg hover:bg-black shadow-lg flex items-center gap-2"><Save className="w-4 h-4"/> Salvar</button></div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
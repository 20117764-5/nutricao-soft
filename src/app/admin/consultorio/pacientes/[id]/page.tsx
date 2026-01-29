'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { 
  User, Activity, FileText, FlaskConical, Ruler, Baby, Zap, Utensils, 
  X, Copy, Edit, CalendarPlus, ClipboardList, Phone, Link as LinkIcon, 
  CheckCircle2, AlertCircle, Loader2, ChevronRight, Save, Clock, 
  Calendar as CalendarIcon, Plus, Trash2, Send, FileDown, ChevronDown, ChevronUp, Upload, File, Info, Eye
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { differenceInYears, parseISO, format } from 'date-fns';
import jsPDF from 'jspdf';

// --- INTERFACES ---
interface Paciente { id: string; nome: string; email: string | null; telefone: string | null; data_nascimento: string | null; cpf: string | null; created_at: string; ativo: boolean; }
interface Consulta { id: string; data_consulta: string; horario: string; status: string; servico: string; observacoes?: string; }
interface AnamneseTemplate { id: string; titulo: string; perguntas: string[]; created_at: string; }
interface RespostaUnificada { id: string; titulo: string; data: string; tipo: 'anamnese' | 'pre_consulta'; conteudo: Record<string, string>; }
interface DbAnamneseRes { id: string; titulo: string | null; respondido_em: string; respostas: Record<string, string>; }
interface DbFormResponse { id: string; form_title: string; created_at: string; responses: Record<string, string>; }
interface ExameAnexado { id: string; nome_exame: string; arquivo_url: string; created_at: string; }

// Interface para Antropometria
interface AntropometriaData {
  id?: string;
  paciente_id?: string;
  created_at?: string;
  tipo_avaliacao: 'adulto' | 'crianca';
  // Dados Básicos
  peso: number;
  altura: number;
  altura_sentado: number;
  altura_joelho: number;
  // Dobras
  formula_dobras: string;
  tricipital: number; bicipital: number; abdominal: number; subescapular: number;
  axilar_media: number; coxa: number; toracica: number; suprailiaca: number;
  panturrilha_dobra: number; supraespinhal: number;
  // Circunferências
  pescoco: number; torax: number; ombro: number; cintura: number; abdomen_circ: number;
  braco_relax: number; braco_contr: number; antebraco: number; 
  coxa_prox: number; coxa_med: number; coxa_dist: number; 
  panturrilha_circ: number; quadril: number; // Adicionado Quadril para RCQ
  // Diâmetros
  umero: number; punho: number; femur: number;
  // Bioimpedância
  perc_gordura_bio: number; massa_gorda_bio: number;
  perc_musculo_bio: number; massa_musculo_bio: number;
  massa_livre_gordura_bio: number; peso_osseo_bio: number;
  gordura_visceral: number; agua_corporal: number; idade_metabolica: number;
}

type TabOption = 'perfil' | 'historico' | 'anamnese' | 'exames' | 'antropometria' | 'gestacional' | 'calculo' | 'planejamento';

export default function PerfilPacientePage() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;

  // --- ESTADOS GERAIS ---
  const [paciente, setPaciente] = useState<Paciente | null>(null);
  const [consultas, setConsultas] = useState<Consulta[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabOption>('perfil');

  // --- ESTADOS ANAMNESE ---
  const [templatesAtivos, setTemplatesAtivos] = useState<AnamneseTemplate[]>([]);
  const [historicoAnamneses, setHistoricoAnamneses] = useState<RespostaUnificada[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [isAnamneseModalOpen, setIsAnamneseModalOpen] = useState(false);
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);
  const [anamneseTitulo, setAnamneseTitulo] = useState('');
  const [anamnesePerguntas, setAnamnesePerguntas] = useState<string[]>(['']);
  const [savingAnamnese, setSavingAnamnese] = useState(false);

  // --- ESTADOS EXAMES ---
  const [examesAnexados, setExamesAnexados] = useState<ExameAnexado[]>([]);
  const [isSolicitarModalOpen, setIsSolicitarModalOpen] = useState(false);
  const [isRegistrarModalOpen, setIsRegistrarModalOpen] = useState(false);
  const [examesSelecionados, setExamesSelecionados] = useState<string[]>([]);
  const [outrosExames, setOutrosExames] = useState('');
  const [uploading, setUploading] = useState(false);
  const [nomeNovoExame, setNomeNovoExame] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const listaExamesSugeridos = [
    "Hemograma Completo", "Glicemia de Jejum", "HBA1C", "Insulina",
    "Perfil Lipídico", "Ureia e Creatinina", "TGO e TGP", "GGT",
    "Vitamina D (25-OH)", "Vitamina B12", "Ferritina", "TSH e T4 Livre"
  ];

  // --- ESTADOS ANTROPOMETRIA ---
  const [avaliacoesAntro, setAvaliacoesAntro] = useState<AntropometriaData[]>([]);
  const [showAntroForm, setShowAntroForm] = useState(false);
  const [isAntroChoiceOpen, setIsAntroChoiceOpen] = useState(false);
  const [antroType, setAntroType] = useState<'adulto' | 'crianca'>('adulto');
  const [savingAntro, setSavingAntro] = useState(false);
  
  // Estado Inicial do Formulário de Antropometria
  const [antroForm, setAntroForm] = useState<AntropometriaData>({
    tipo_avaliacao: 'adulto', peso: 0, altura: 0, altura_sentado: 0, altura_joelho: 0,
    formula_dobras: 'Pollock 3',
    tricipital: 0, bicipital: 0, abdominal: 0, subescapular: 0, axilar_media: 0, coxa: 0, toracica: 0, suprailiaca: 0, panturrilha_dobra: 0, supraespinhal: 0,
    pescoco: 0, torax: 0, ombro: 0, cintura: 0, abdomen_circ: 0, braco_relax: 0, braco_contr: 0, antebraco: 0, coxa_prox: 0, coxa_med: 0, coxa_dist: 0, panturrilha_circ: 0, quadril: 0,
    umero: 0, punho: 0, femur: 0,
    perc_gordura_bio: 0, massa_gorda_bio: 0, perc_musculo_bio: 0, massa_musculo_bio: 0, massa_livre_gordura_bio: 0, peso_osseo_bio: 0, gordura_visceral: 0, agua_corporal: 0, idade_metabolica: 0
  });

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editFormData, setEditFormData] = useState<Partial<Paciente>>({});
  const [saving, setSaving] = useState(false);

  // --- BUSCA DE DADOS ---
  const fetchPaciente = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.from('pacientes').select('*').eq('id', id).single();
      if (error) throw error;
      setPaciente(data as Paciente);
      setEditFormData(data);
    } catch (error) { router.push('/admin/consultorio/pacientes'); } finally { setLoading(false); }
  }, [id, router]);

  const fetchDataAbas = useCallback(async () => {
    if (!id || !paciente) return;
    
    if (activeTab === 'historico') {
      const { data } = await supabase.from('agendamentos').select('*').eq('paciente_id', id).order('data_consulta', { ascending: false });
      setConsultas(data as Consulta[] || []);
    }

    if (activeTab === 'anamnese') {
      try {
        const qT = supabase.from('anamneses_templates').select('*').eq('paciente_id', id).order('created_at', { ascending: false });
        const qR = supabase.from('anamneses_respostas').select('*').eq('paciente_id', id);
        const qF = paciente.cpf ? supabase.from('form_responses').select('id, form_title, created_at, responses').contains('patient_data', { cpf: paciente.cpf }) : null;
        
        const [resT, resR, resF] = await Promise.all([qT, qR, qF || Promise.resolve({ data: [] })]);
        
        setTemplatesAtivos(resT.data as AnamneseTemplate[] || []);
        const aM = (resR.data as DbAnamneseRes[] || []).map(r => ({ id: r.id, titulo: r.titulo || 'Anamnese Respondida', data: r.respondido_em, tipo: 'anamnese' as const, conteudo: r.respostas }));
        const pM = (resF.data as DbFormResponse[] || []).map(p => ({ id: p.id, titulo: p.form_title || 'Formulário Externo', data: p.created_at, tipo: 'pre_consulta' as const, conteudo: p.responses }));
        setHistoricoAnamneses([...aM, ...pM].sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime()));
      } catch (err) { console.error(err); }
    }

    if (activeTab === 'exames') {
      const { data } = await supabase.from('pacientes_exames').select('*').eq('paciente_id', id).order('created_at', { ascending: false });
      setExamesAnexados(data as ExameAnexado[] || []);
    }

    // Carregar avaliações antropométricas salvas
    if (activeTab === 'antropometria') {
      const { data } = await supabase.from('antropometria').select('*').eq('paciente_id', id).order('created_at', { ascending: false });
      setAvaliacoesAntro(data as AntropometriaData[] || []);
    }

  }, [activeTab, id, paciente]);

  useEffect(() => { fetchPaciente(); }, [fetchPaciente]);
  useEffect(() => { fetchDataAbas(); }, [fetchDataAbas]);

  // --- CÁLCULOS ANALÍTICOS (USEMEMO) ---
  const analise = useMemo(() => {
    // Extrair valores para facilitar
    const { peso, altura, cintura, quadril, tricipital, abdominal, coxa, braco_relax, punho, femur } = antroForm;
    const hM = altura / 100;
    const idade = paciente?.data_nascimento ? differenceInYears(new Date(), parseISO(paciente.data_nascimento)) : 30; // Idade padrão se n tiver data

    // 1. Pesos e Medidas
    const imc = (peso > 0 && hM > 0) ? peso / (hM * hM) : 0;
    const rcq = (cintura > 0 && quadril > 0) ? cintura / quadril : 0;
    const cmb = (braco_relax > 0 && tricipital > 0) ? braco_relax - (Math.PI * (tricipital / 10)) : 0;
    
    // 2. Composição Corporal (Pollock 3 Dobras - Simplificado para exemplo, ideal adicionar sexo do paciente)
    // Densidade Corporal (Exemplo Homens Pollock 3)
    const somaDobras = tricipital + abdominal + coxa;
    const densidade = somaDobras > 0 ? 1.10938 - (0.0008267 * somaDobras) + (0.0000016 * Math.pow(somaDobras, 2)) - (0.0002574 * idade) : 0;
    
    // Percentual Gordura (Siri ou Brozek) - Usando Brozek (1963)
    const percGordura = densidade > 0 ? ((4.57 / densidade) - 4.142) * 100 : 0;

    // Massas
    const pesoGordura = (peso * percGordura) / 100;
    // Estimativa Peso Ósseo (Von Dobeln modificado) - Simplificado
    const pesoOsseo = (hM > 0 && punho > 0 && femur > 0) ? Math.pow(hM, 2) * (punho/100) * (femur/100) * 400 * 0.06 : 0;
    const pesoResidual = peso * 0.24; // Estimativa padrão
    const massaMuscular = peso - (pesoGordura + pesoOsseo + pesoResidual);
    const massaLivre = peso - pesoGordura;

    return {
      imc: imc.toFixed(2),
      imcClasse: imc < 18.5 ? 'Abaixo' : imc < 25 ? 'Eutrofia' : imc < 30 ? 'Sobrepeso' : 'Obesidade',
      pesoIdeal: hM > 0 ? `${(18.5 * hM**2).toFixed(1)} - ${(24.9 * hM**2).toFixed(1)} kg` : '0',
      rcq: rcq.toFixed(2),
      riscoRcq: rcq > 0.90 ? 'Alto Risco' : 'Baixo Risco',
      cmb: cmb.toFixed(2),
      percGordura: percGordura.toFixed(1),
      pesoGordura: pesoGordura.toFixed(2),
      pesoOsseo: pesoOsseo.toFixed(2),
      massaMuscular: massaMuscular.toFixed(2),
      massaLivre: massaLivre.toFixed(2),
      densidade: densidade.toFixed(4),
      pesoResidual: pesoResidual.toFixed(2),
      soma: somaDobras.toFixed(1)
    };

  }, [antroForm, paciente]);

  // --- HANDLERS ---
  const handleUpdate = async () => {
    setSaving(true);
    try {
      const { error } = await supabase.from('pacientes').update({
        nome: editFormData.nome, telefone: editFormData.telefone, cpf: editFormData.cpf, data_nascimento: editFormData.data_nascimento
      }).eq('id', id);
      if (error) throw error;
      setIsEditModalOpen(false);
      fetchPaciente();
    } finally { setSaving(false); }
  };

  const handleOpenNewAnamnese = () => { setEditingTemplateId(null); setAnamneseTitulo(''); setAnamnesePerguntas(['']); setIsAnamneseModalOpen(true); };
  
  const handleEditTemplate = (template: AnamneseTemplate) => {
    setEditingTemplateId(template.id);
    setAnamneseTitulo(template.titulo);
    setAnamnesePerguntas(template.perguntas);
    setIsAnamneseModalOpen(true);
  };

  const handleDeleteTemplate = async (templateId: string) => {
    if (!confirm('Excluir este link?')) return;
    await supabase.from('anamneses_templates').delete().eq('id', templateId);
    fetchDataAbas();
  };

  const handleGerarAnamnese = async () => {
    if (!anamneseTitulo) return alert('Dê um título.');
    setSavingAnamnese(true);
    try {
      const payload = { paciente_id: id, titulo: anamneseTitulo, perguntas: anamnesePerguntas };
      if (editingTemplateId) await supabase.from('anamneses_templates').update(payload).eq('id', editingTemplateId);
      else await supabase.from('anamneses_templates').insert(payload);
      setIsAnamneseModalOpen(false);
      fetchDataAbas();
    } finally { setSavingAnamnese(false); }
  };

  const handleDeleteResposta = async (item: RespostaUnificada) => {
    if (!confirm(`Excluir ${item.titulo}?`)) return;
    const tabela = item.tipo === 'anamnese' ? 'anamneses_respostas' : 'form_responses';
    await supabase.from(tabela).delete().eq('id', item.id);
    fetchDataAbas();
  };

  const handleSolicitarPDF = () => {
    if (!paciente) return;
    const doc = new jsPDF();
    const primaryColor = [34, 197, 94];
    doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.rect(0, 0, 210, 40, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22).setFont('helvetica', 'bold').text('SOLICITAÇÃO DE EXAMES', 20, 28);
    doc.setTextColor(60, 60, 60).setFontSize(10).setFont('helvetica', 'normal').text(`PACIENTE: ${paciente.nome.toUpperCase()}`, 20, 55);
    doc.text(`DATA: ${format(new Date(), 'dd/MM/yyyy')}`, 20, 62);
    doc.setDrawColor(230).line(20, 68, 190, 68);
    const exames = [...examesSelecionados];
    if (outrosExames) exames.push(outrosExames);
    exames.forEach((ex, i) => {
      const y = 85 + (i * 9);
      doc.setDrawColor(primaryColor[0], primaryColor[1], primaryColor[2]).rect(20, y - 3.5, 4, 4);
      doc.text(ex, 28, y);
    });
    doc.setDrawColor(primaryColor[0], primaryColor[1], primaryColor[2]).line(60, 250, 150, 250);
    doc.text('Assinatura e CRN', 105, 256, { align: 'center' });
    doc.save(`Exames_${paciente.nome}.pdf`);
    setIsSolicitarModalOpen(false);
  };

  const handleUploadExame = async () => {
    const file = fileInputRef.current?.files?.[0];
    if (!file || !nomeNovoExame) return alert('Selecione arquivo e nome.');
    setUploading(true);
    try {
      const fileName = `${id}/${Date.now()}_${file.name}`;
      await supabase.storage.from('exames').upload(fileName, file);
      const { data: { publicUrl } } = supabase.storage.from('exames').getPublicUrl(fileName);
      await supabase.from('pacientes_exames').insert({ paciente_id: id, nome_exame: nomeNovoExame, arquivo_url: publicUrl });
      setIsRegistrarModalOpen(false);
      setNomeNovoExame('');
      fetchDataAbas();
    } finally { setUploading(false); }
  };

  const handleDeleteExame = async (exameId: string) => {
    if (!confirm('Excluir este exame?')) return;
    await supabase.from('pacientes_exames').delete().eq('id', exameId);
    fetchDataAbas();
  };

  const exportarRespostaParaPDF = (item: RespostaUnificada) => {
    if (!paciente) return;
    const doc = new jsPDF();
    let y = 20;
    doc.setFontSize(16).setTextColor(34, 197, 94).text(item.titulo, 20, y);
    y += 15;
    Object.entries(item.conteudo).forEach(([p, r]) => {
      if (y > 270) { doc.addPage(); y = 20; }
      doc.setFont('helvetica', 'bold').text(doc.splitTextToSize(p.toUpperCase(), 170), 20, y);
      y += 7;
      doc.setFont('helvetica', 'normal').text(doc.splitTextToSize(r || '—', 170), 20, y);
      y += 12;
    });
    doc.save(`${item.titulo}_${paciente.nome}.pdf`);
  };

  // Handler para Salvar Antropometria
  const handleSaveAntro = async () => {
    setSavingAntro(true);
    try {
      const payload = {
        ...antroForm,
        paciente_id: id,
        tipo_avaliacao: antroType
      };
      
      // Se tiver ID, atualiza, senão cria
      if (antroForm.id) {
        await supabase.from('antropometria').update(payload).eq('id', antroForm.id);
      } else {
        await supabase.from('antropometria').insert(payload);
      }
      
      setShowAntroForm(false);
      fetchDataAbas(); // Recarregar lista
    } catch (error) {
      console.error(error);
      alert('Erro ao salvar avaliação.');
    } finally {
      setSavingAntro(false);
    }
  };

  if (loading) return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin text-nutri-primary" /></div>;
  if (!paciente) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-gray-50 flex overflow-hidden animate-in fade-in duration-300">
      
      {/* SIDEBAR - 8 ITENS */}
      <aside className="w-64 bg-white border-r border-gray-200 flex flex-col shrink-0 overflow-y-auto">
        <div className="p-6 border-b border-gray-100 text-center">
          <div className="w-14 h-14 bg-nutri-primary/10 rounded-full flex items-center justify-center text-nutri-primary font-bold text-xl mx-auto mb-3 uppercase">{paciente.nome.charAt(0)}</div>
          <h2 className="font-bold text-gray-800 truncate">{paciente.nome}</h2>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          <SidebarItem active={activeTab === 'perfil'} onClick={() => setActiveTab('perfil')} icon={<User size={18} />} label="Perfil do Paciente" />
          <SidebarItem active={activeTab === 'historico'} onClick={() => setActiveTab('historico')} icon={<ClipboardList size={18} />} label="Histórico de Consultas" />
          <SidebarItem active={activeTab === 'anamnese'} onClick={() => setActiveTab('anamnese')} icon={<FileText size={18} />} label="Anamnese Geral" />
          <SidebarItem active={activeTab === 'exames'} onClick={() => setActiveTab('exames')} icon={<FlaskConical size={18} />} label="Exames" />
          <SidebarItem active={activeTab === 'antropometria'} onClick={() => setActiveTab('antropometria')} icon={<Ruler size={18} />} label="Antropometria" />
          <SidebarItem active={activeTab === 'gestacional'} onClick={() => setActiveTab('gestacional')} icon={<Baby size={18} />} label="Gestacional" />
          <SidebarItem active={activeTab === 'calculo'} onClick={() => setActiveTab('calculo')} icon={<Zap size={18} />} label="Cálculo Energético" />
          <SidebarItem active={activeTab === 'planejamento'} onClick={() => setActiveTab('planejamento')} icon={<Utensils size={18} />} label="Planejamento" />
        </nav>
      </aside>

      <main className="flex-1 flex flex-col h-full overflow-hidden">
        <header className="bg-white border-b border-gray-200 px-8 py-5 flex justify-between items-center shadow-sm">
          <h1 className="text-xl font-bold text-gray-800">{paciente.nome}</h1>
          <button onClick={() => router.push('/admin/consultorio/pacientes')} className="p-2 text-gray-400 hover:bg-red-50 hover:text-red-500 rounded-full transition-all"><X size={24} /></button>
        </header>

        <div className="flex-1 overflow-y-auto p-8 bg-gray-50/30">
          <div className="max-w-7xl mx-auto">
            
            {/* CONTEÚDO PERFIL */}
            {activeTab === 'perfil' && (
              <div className="space-y-8 animate-in slide-in-from-bottom-2 duration-300">
                <section className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm">
                  <div className="flex justify-between items-start mb-6">
                    <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2"><User className="text-nutri-primary" /> Dados Pessoais</h3>
                    <button onClick={() => setIsEditModalOpen(true)} className="text-sm font-bold text-nutri-primary flex items-center gap-1 hover:bg-nutri-50 px-3 py-1.5 rounded-lg"><Edit size={16}/> Editar</button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <InfoField label="Nome Completo" value={paciente.nome} />
                    <InfoField label="Nascimento" value={paciente.data_nascimento ? format(parseISO(paciente.data_nascimento), 'dd/MM/yyyy') : '-'} />
                    <InfoField label="Telefone" value={paciente.telefone || '-'} icon={<Phone size={12} className="mr-1"/>}/>
                    <InfoField label="CPF" value={paciente.cpf || '-'} />
                  </div>
                </section>
                <section>
                  <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2"><Activity className="text-nutri-primary" /> Fluxo de Consulta</h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                    <ActionCard icon={<CalendarPlus size={24}/>} label="Agendar" color="bg-blue-500" onClick={() => {}} />
                    <ActionCard icon={<FileText size={24}/>} label="Anamnese" color="bg-emerald-500" onClick={() => setActiveTab('anamnese')} />
                    <ActionCard icon={<FlaskConical size={24}/>} label="Exames" color="bg-amber-500" onClick={() => setActiveTab('exames')} />
                    <ActionCard icon={<Ruler size={24}/>} label="Antropometria" color="bg-teal-500" onClick={() => setActiveTab('antropometria')} />
                    <ActionCard icon={<Utensils size={24}/>} label="Plano" color="bg-orange-500" onClick={() => setActiveTab('planejamento')} />
                    <ActionCard icon={<Zap size={24}/>} label="Orientação" color="bg-purple-500" onClick={() => {}} />
                  </div>
                </section>
              </div>
            )}

            {/* CONTEÚDO ANTROPOMETRIA */}
            {activeTab === 'antropometria' && (
              <div className="space-y-6 animate-in slide-in-from-bottom-2 duration-300">
                {!showAntroForm ? (
                  <>
                    <div className="flex justify-between items-center bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
                      <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2"><Ruler className="text-nutri-primary" /> Avaliações Antropométricas</h3>
                      <button onClick={() => setIsAntroChoiceOpen(true)} className="bg-nutri-dark text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 shadow-lg hover:bg-black transition-all"><Plus size={18} /> Nova Avaliação</button>
                    </div>
                    {/* Lista de Avaliações Salvas */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {avaliacoesAntro.map(av => (
                        <div key={av.id} className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm hover:border-nutri-primary cursor-pointer transition-all" onClick={() => { setAntroForm(av); setShowAntroForm(true); }}>
                           <p className="font-bold text-gray-800 mb-1">{av.created_at ? format(parseISO(av.created_at), 'dd/MM/yyyy') : 'Sem data'}</p>
                           <span className="text-xs uppercase font-bold text-gray-400 bg-gray-100 px-2 py-1 rounded">{av.tipo_avaliacao}</span>
                           <div className="mt-3 text-sm text-gray-600">
                              <p>Peso: {av.peso}kg</p>
                              <p>IMC: {(av.peso / (av.altura/100)**2).toFixed(2)}</p>
                           </div>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  // FORMULÁRIO DE ANTROPOMETRIA
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pb-20">
                    <div className="lg:col-span-8 space-y-6">
                       
                       <div className="flex justify-between items-center">
                          <h3 className="font-bold text-gray-700 text-lg">Nova Avaliação ({antroType})</h3>
                          <button onClick={() => setShowAntroForm(false)} className="text-red-500 text-sm font-bold">Cancelar</button>
                       </div>

                       {/* Bloco 1: Dados Básicos */}
                       <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
                          <h4 className="font-bold text-gray-800 mb-4 border-b pb-2">Dados Básicos</h4>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                             <AntroInput label="Peso (kg)" value={antroForm.peso} onChange={v => setAntroForm({...antroForm, peso: v})} />
                             <AntroInput label="Altura (cm)" value={antroForm.altura} onChange={v => setAntroForm({...antroForm, altura: v})} />
                             <AntroInput label="Alt. Sentado" value={antroForm.altura_sentado} onChange={v => setAntroForm({...antroForm, altura_sentado: v})} />
                             <AntroInput label="Alt. Joelho" value={antroForm.altura_joelho} onChange={v => setAntroForm({...antroForm, altura_joelho: v})} />
                          </div>
                       </div>
                       

                       {/* Bloco 2: Dobras Cutâneas */}
                       <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
                          <div className="flex justify-between mb-4 border-b pb-2">
                            <h4 className="font-bold text-gray-800">Dobras Cutâneas (mm)</h4>
                            <select 
                              className="bg-gray-50 border rounded-lg text-xs p-1"
                              value={antroForm.formula_dobras}
                              onChange={e => setAntroForm({...antroForm, formula_dobras: e.target.value})}
                            >
                              <option>Pollock 3</option>
                              <option>Pollock 7</option>
                              <option>Petroski</option>
                              <option>Guedes</option>
                              <option>Durnin</option>
                              <option>Faulkner</option>
                              <option>Nenhuma</option>
                            </select>
                          </div>
                          <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
                             <AntroInput label="Tricipital" value={antroForm.tricipital} onChange={v => setAntroForm({...antroForm, tricipital: v})} img="tricipital.jpg" />
                             <AntroInput label="Bicipital" value={antroForm.bicipital} onChange={v => setAntroForm({...antroForm, bicipital: v})} img="bicipital.jpg" />
                             <AntroInput label="Abdominal" value={antroForm.abdominal} onChange={v => setAntroForm({...antroForm, abdominal: v})} img="abdominal.jpg" />
                             <AntroInput label="Subescapular" value={antroForm.subescapular} onChange={v => setAntroForm({...antroForm, subescapular: v})} img="subescapular.jpg" />
                             <AntroInput label="Axilar Média" value={antroForm.axilar_media} onChange={v => setAntroForm({...antroForm, axilar_media: v})} img="axilar.jpg" />
                             <AntroInput label="Coxa" value={antroForm.coxa} onChange={v => setAntroForm({...antroForm, coxa: v})} img="coxa.jpg" />
                             <AntroInput label="Torácica" value={antroForm.toracica} onChange={v => setAntroForm({...antroForm, toracica: v})} img="toracica.jpg" />
                             <AntroInput label="Supra-ilíaca" value={antroForm.suprailiaca} onChange={v => setAntroForm({...antroForm, suprailiaca: v})} img="suprailiaca.jpg" />
                             <AntroInput label="Panturrilha" value={antroForm.panturrilha_dobra} onChange={v => setAntroForm({...antroForm, panturrilha_dobra: v})} img="panturrilha_dobra.jpg" />
                             <AntroInput label="Supraespinhal" value={antroForm.supraespinhal} onChange={v => setAntroForm({...antroForm, supraespinhal: v})} img="supraespinhal.jpg" />
                          </div>
                       </div>
                       
                       {/* Bloco 3: Circunferências */}
                       <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
                          <h4 className="font-bold text-gray-800 mb-4 border-b pb-2">Circunferências (cm)</h4>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                             <AntroInput label="Pescoço" value={antroForm.pescoco} onChange={v => setAntroForm({...antroForm, pescoco: v})} img="pescoco.jpg" />
                             <AntroInput label="Tórax" value={antroForm.torax} onChange={v => setAntroForm({...antroForm, torax: v})} img="torax.jpg" />
                             <AntroInput label="Ombro" value={antroForm.ombro} onChange={v => setAntroForm({...antroForm, ombro: v})} img="ombro.jpg" />
                             <AntroInput label="Cintura" value={antroForm.cintura} onChange={v => setAntroForm({...antroForm, cintura: v})} img="cintura.jpg" />
                             <AntroInput label="Abdomen" value={antroForm.abdomen_circ} onChange={v => setAntroForm({...antroForm, abdomen_circ: v})} img="abdomen.jpg" />
                             <AntroInput label="Quadril" value={antroForm.quadril} onChange={v => setAntroForm({...antroForm, quadril: v})} img="quadril.jpg" />
                             <AntroInput label="Braço Relax." value={antroForm.braco_relax} onChange={v => setAntroForm({...antroForm, braco_relax: v})} img="braco_relaxado.jpg" />
                             <AntroInput label="Braço Contr." value={antroForm.braco_contr} onChange={v => setAntroForm({...antroForm, braco_contr: v})} img="braco_contraido.jpg" />
                             <AntroInput label="Antebraço" value={antroForm.antebraco} onChange={v => setAntroForm({...antroForm, antebraco: v})} img="antebraco.jpg" />
                             <AntroInput label="Coxa Prox." value={antroForm.coxa_prox} onChange={v => setAntroForm({...antroForm, coxa_prox: v})} img="coxa_proximal.jpg" />
                             <AntroInput label="Coxa Med." value={antroForm.coxa_med} onChange={v => setAntroForm({...antroForm, coxa_med: v})} img="coxa_media.jpg" />
                             <AntroInput label="Coxa Dist." value={antroForm.coxa_dist} onChange={v => setAntroForm({...antroForm, coxa_dist: v})} img="coxa_distal.jpg" />
                             <AntroInput label="Panturrilha" value={antroForm.panturrilha_circ} onChange={v => setAntroForm({...antroForm, panturrilha_circ: v})} img="panturrilha.jpg" />
                          </div>
                       </div>

                       {/* Bloco 4: Diâmetro Ósseo */}
                       <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
                          <h4 className="font-bold text-gray-800 mb-4 border-b pb-2">Diâmetro Ósseo (cm)</h4>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                             <AntroInput label="Úmero" value={antroForm.umero} onChange={v => setAntroForm({...antroForm, umero: v})} />
                             <AntroInput label="Punho" value={antroForm.punho} onChange={v => setAntroForm({...antroForm, punho: v})} />
                             <AntroInput label="Fêmur" value={antroForm.femur} onChange={v => setAntroForm({...antroForm, femur: v})} />
                          </div>
                       </div>

                       {/* Bloco 5: Bioimpedância */}
                       <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
                          <h4 className="font-bold text-gray-800 mb-4 border-b pb-2">Balança de Bioimpedância</h4>
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                             <AntroInput label="% Gordura" value={antroForm.perc_gordura_bio} onChange={v => setAntroForm({...antroForm, perc_gordura_bio: v})} />
                             <AntroInput label="Massa Gorda" value={antroForm.massa_gorda_bio} onChange={v => setAntroForm({...antroForm, massa_gorda_bio: v})} />
                             <AntroInput label="% Músculo" value={antroForm.perc_musculo_bio} onChange={v => setAntroForm({...antroForm, perc_musculo_bio: v})} />
                             <AntroInput label="Massa Musc." value={antroForm.massa_musculo_bio} onChange={v => setAntroForm({...antroForm, massa_musculo_bio: v})} />
                             <AntroInput label="Massa Livre" value={antroForm.massa_livre_gordura_bio} onChange={v => setAntroForm({...antroForm, massa_livre_gordura_bio: v})} />
                             <AntroInput label="Peso Ósseo" value={antroForm.peso_osseo_bio} onChange={v => setAntroForm({...antroForm, peso_osseo_bio: v})} />
                             <AntroInput label="Gord. Visceral" value={antroForm.gordura_visceral} onChange={v => setAntroForm({...antroForm, gordura_visceral: v})} />
                             <AntroInput label="Água Corp." value={antroForm.agua_corporal} onChange={v => setAntroForm({...antroForm, agua_corporal: v})} />
                             <AntroInput label="Idade Metab." value={antroForm.idade_metabolica} onChange={v => setAntroForm({...antroForm, idade_metabolica: v})} />
                          </div>
                       </div>
                    </div>

                    {/* SIDEBAR ANALÍTICA (STICKY) */}
                    <div className="lg:col-span-4 space-y-6">
                      <div className="bg-nutri-dark text-white p-6 rounded-3xl shadow-xl sticky top-6">
                        <h4 className="font-bold text-lg mb-6 flex items-center gap-2 border-b border-white/10 pb-4"><Zap className="text-nutri-primary" /> Resultados Analíticos</h4>
                        <div className="space-y-6 overflow-y-auto max-h-[70vh] pr-2 custom-scrollbar text-sm">
                          
                          {/* Análise de Pesos e Medidas */}
                          <div>
                            <p className="text-[10px] font-black uppercase text-nutri-primary mb-3">Pesos e Medidas</p>
                            <ResultRow label="Peso Atual" value={`${antroForm.peso}kg`} />
                            <ResultRow label="Altura Atual" value={`${antroForm.altura}cm`} />
                            <ResultRow label="IMC" value={analise.imc} sub={analise.imcClasse} />
                            <ResultRow label="Faixa Peso Ideal" value={analise.pesoIdeal} />
                            <ResultRow label="RCQ" value={analise.rcq} sub={analise.riscoRcq} />
                            <ResultRow label="CMB (cm)" value={analise.cmb} />
                          </div>

                          {/* Análise por Dobras */}
                          <div className="pt-4 border-t border-white/10">
                             <p className="text-[10px] font-black uppercase text-nutri-primary mb-3">Análises por Dobras</p>
                             <ResultRow label="% Gordura (Brozek)" value={`${analise.percGordura}%`} />
                             <ResultRow label="Peso de Gordura" value={`${analise.pesoGordura} kg`} />
                             <ResultRow label="Peso Ósseo (Est.)" value={`${analise.pesoOsseo} kg`} />
                             <ResultRow label="Massa Muscular" value={`${analise.massaMuscular} kg`} />
                             <ResultRow label="Peso Residual" value={`${analise.pesoResidual} kg`} />
                             <ResultRow label="Massa Livre Gord." value={`${analise.massaLivre} kg`} />
                             <ResultRow label="Somatório Dobras" value={`${analise.soma} mm`} />
                             <ResultRow label="Densidade Corp." value={analise.densidade} />
                             <p className="text-[10px] text-gray-400 mt-2 text-right italic">Ref: {antroForm.formula_dobras}</p>
                          </div>

                          {/* Análise por Bioimpedância */}
                          <div className="pt-4 border-t border-white/10">
                             <p className="text-[10px] font-black uppercase text-nutri-primary mb-3">Bioimpedância</p>
                             <ResultRow label="% Gordura" value={`${antroForm.perc_gordura_bio}%`} />
                             <ResultRow label="Massa Muscular" value={`${antroForm.massa_musculo_bio} kg`} />
                             <ResultRow label="Água Corporal" value={`${antroForm.agua_corporal}%`} />
                             <ResultRow label="Idade Metab." value={antroForm.idade_metabolica} />
                          </div>
                        </div>

                        <button 
                          onClick={handleSaveAntro} 
                          disabled={savingAntro}
                          className="w-full mt-8 bg-nutri-primary text-white py-4 rounded-2xl font-bold hover:bg-white hover:text-nutri-primary transition-all shadow-lg flex justify-center items-center gap-2"
                        >
                          {savingAntro ? <Loader2 className="animate-spin" /> : <><Save size={20}/> Salvar Avaliação</>}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* CONTEÚDO HISTÓRICO COM CORES */}
            {activeTab === 'historico' && (
              <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm animate-in slide-in-from-bottom-2">
                <h3 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2"><ClipboardList className="text-nutri-primary" /> Histórico de Consultas</h3>
                <div className="relative border-l-2 border-gray-100 ml-4 space-y-8 pb-4">
                  {consultas.map((c) => (
                    <div key={c.id} className="relative pl-8">
                      <div className={`absolute left-[-9px] top-0 w-4 h-4 rounded-full border-2 border-white ${c.status === 'Realizada' ? 'bg-green-500' : c.status === 'Faltou' ? 'bg-red-500' : 'bg-blue-500'}`}></div>
                      <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 flex justify-between items-center">
                        <div>
                          <span className="text-sm font-bold text-gray-700">{format(parseISO(c.data_consulta), "dd/MM/yyyy")}</span>
                          <p className="text-xs text-gray-500">{c.horario} - {c.servico}</p>
                        </div>
                        <span className={`text-[10px] font-black px-3 py-1 rounded-full uppercase ${c.status === 'Realizada' ? 'bg-green-100 text-green-700' : c.status === 'Faltou' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>
                          {c.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* CONTEÚDO ANAMNESE (RESTAURADO) */}
            {activeTab === 'anamnese' && (
              <div className="space-y-8 animate-in slide-in-from-bottom-2">
                <div className="flex justify-between items-center bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
                  <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2"><FileText className="text-nutri-primary" /> Anamnese Geral</h3>
                  <button onClick={handleOpenNewAnamnese} className="bg-nutri-dark text-white px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 shadow-lg"><Plus size={18} /> Nova Anamnese</button>
                </div>

                {/* LINKS ATIVOS (A SEÇÃO QUE VOLTOU) */}
                <div className="space-y-4">
                  <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2 px-2"><LinkIcon size={14}/> Links Ativos</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {templatesAtivos.map(t => (
                      <div key={t.id} className="bg-white p-5 rounded-2xl border border-dashed border-gray-300 flex justify-between items-center group">
                        <p className="font-bold text-gray-700 text-sm truncate">{t.titulo}</p>
                        <div className="flex gap-1">
                          <button onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/responder-anamnese/${t.id}`); alert('Link copiado!'); }} className="p-2 text-gray-400 hover:text-nutri-primary" title="Copiar Link"><Copy size={16}/></button>
                          <button onClick={() => handleEditTemplate(t)} className="p-2 text-gray-400 hover:text-blue-500" title="Editar"><Edit size={16}/></button>
                          <button onClick={() => handleDeleteTemplate(t.id)} className="p-2 text-gray-400 hover:text-red-500" title="Excluir"><Trash2 size={16}/></button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* HISTÓRICO DE RESPOSTAS */}
                <div className="space-y-4">
                  <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest px-2">Histórico de Respostas</h4>
                  {historicoAnamneses.map((item) => (
                    <div key={item.id} className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden group hover:border-nutri-primary transition-all">
                      <div className="p-6 flex justify-between items-center cursor-pointer bg-white" onClick={() => setExpandedId(expandedId === item.id ? null : item.id)}>
                        <div className="flex items-center gap-4">
                          <div className={`p-2 rounded-lg ${item.tipo === 'anamnese' ? 'bg-purple-50 text-purple-600' : 'bg-blue-50 text-blue-600'}`}><FileText size={20}/></div>
                          <div><h4 className="font-bold text-gray-800">{item.titulo}</h4><p className="text-[10px] uppercase font-black text-gray-300">{format(parseISO(item.data), 'dd/MM/yyyy')}</p></div>
                        </div>
                        <div className="flex items-center gap-3" onClick={e => e.stopPropagation()}>
                          <button onClick={() => exportarRespostaParaPDF(item)} className="text-gray-300 hover:text-nutri-primary"><FileDown size={20}/></button>
                          <button onClick={() => handleDeleteResposta(item)} className="text-gray-300 hover:text-red-500"><Trash2 size={20}/></button>
                          {expandedId === item.id ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                        </div>
                      </div>
                      {expandedId === item.id && (
                        <div className="px-6 pb-6 pt-2 bg-gray-50/50 border-t border-gray-100 grid grid-cols-1 md:grid-cols-2 gap-4">
                          {Object.entries(item.conteudo).map(([p, r]) => (
                            <div key={p} className="bg-white p-3 rounded-lg border border-gray-200"><p className="text-[10px] font-black text-gray-400 uppercase mb-1">{p}</p><p className="text-sm text-gray-700 font-medium">{r || '—'}</p></div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* CONTEÚDO EXAMES */}
            {activeTab === 'exames' && (
              <div className="space-y-8 animate-in slide-in-from-bottom-2 duration-300">
                <div className="flex gap-4">
                  <button onClick={() => setIsSolicitarModalOpen(true)} className="flex-1 bg-white p-6 rounded-2xl border-2 border-dashed border-gray-200 hover:border-nutri-primary transition-all group flex flex-col items-center gap-2 shadow-sm">
                    <div className="bg-nutri-primary/10 p-3 rounded-full text-nutri-primary group-hover:bg-nutri-primary group-hover:text-white transition-all"><FileText size={24}/></div>
                    <span className="font-bold text-gray-700">Solicitar Exames</span>
                  </button>
                  <button onClick={() => setIsRegistrarModalOpen(true)} className="flex-1 bg-white p-6 rounded-2xl border-2 border-dashed border-gray-200 hover:border-nutri-primary transition-all group flex flex-col items-center gap-2 shadow-sm">
                    <div className="bg-emerald-500/10 p-3 rounded-full text-emerald-500 group-hover:bg-emerald-500 group-hover:text-white transition-all"><Upload size={24}/></div>
                    <span className="font-bold text-gray-700">Anexar Resultado</span>
                  </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {examesAnexados.map(ex => (
                    <div key={ex.id} className="bg-white p-4 rounded-xl border border-gray-200 flex justify-between items-center group">
                      <div className="flex items-center gap-3"><File className="text-gray-300"/><p className="font-bold text-sm text-gray-700">{ex.nome_exame}</p></div>
                      <div className="flex gap-2">
                        <a href={ex.arquivo_url} target="_blank" rel="noreferrer" className="text-gray-400 hover:text-nutri-primary"><FileDown size={18}/></a>
                        <button onClick={() => handleDeleteExame(ex.id)} className="text-gray-400 hover:text-red-500"><Trash2 size={18}/></button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* MODAL ESCOLHA DE ANTROPOMETRIA */}
      {isAntroChoiceOpen && (
        <div className="fixed inset-0 z-[300] bg-gray-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl p-8 animate-in zoom-in duration-200">
             <h2 className="text-xl font-bold mb-6 text-gray-800">Nova Avaliação</h2>
             <div className="space-y-4">
                <button 
                  onClick={() => { setAntroType('adulto'); setIsAntroChoiceOpen(false); setShowAntroForm(true); }}
                  className="w-full p-4 border-2 border-gray-100 rounded-2xl hover:border-nutri-primary hover:bg-nutri-primary/5 transition-all text-left group"
                >
                   <p className="font-bold text-gray-800 group-hover:text-nutri-primary">Adultos e Idosos</p>
                   <p className="text-xs text-gray-400">Protocolos Pollock, Petroski e Bioimpedância</p>
                </button>
                <button 
                  onClick={() => { setAntroType('crianca'); setIsAntroChoiceOpen(false); setShowAntroForm(true); }}
                  className="w-full p-4 border-2 border-gray-100 rounded-2xl hover:border-nutri-primary hover:bg-nutri-primary/5 transition-all text-left group"
                >
                   <p className="font-bold text-gray-800 group-hover:text-nutri-primary">Crianças e Adolescentes</p>
                   <p className="text-xs text-gray-400">Curvas de crescimento e desenvolvimento</p>
                </button>
             </div>
             <button onClick={() => setIsAntroChoiceOpen(false)} className="w-full mt-6 py-3 text-gray-400 font-bold hover:text-red-500 transition-colors">Cancelar</button>
          </div>
        </div>
      )}

      {/* MODAL ANAMNESE */}
      {isAnamneseModalOpen && (
        <div className="fixed inset-0 z-[200] bg-gray-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl flex flex-col max-h-[90vh]">
            <div className="p-6 border-b flex justify-between items-center bg-gray-50 rounded-t-2xl"><h2 className="text-xl font-bold">{editingTemplateId ? 'Editar' : 'Nova'} Anamnese</h2><button onClick={() => setIsAnamneseModalOpen(false)}><X size={24}/></button></div>
            <div className="p-8 overflow-y-auto space-y-6">
              <input type="text" placeholder="Título" className="w-full border p-3 rounded-xl outline-none font-bold" value={anamneseTitulo} onChange={e => setAnamneseTitulo(e.target.value)} />
              {anamnesePerguntas.map((p, i) => (
                <div key={i} className="flex gap-2">
                  <input type="text" className="flex-1 border p-3 rounded-xl bg-gray-50 outline-none" value={p} onChange={(e) => { const n = [...anamnesePerguntas]; n[i] = e.target.value; setAnamnesePerguntas(n); }} />
                  <button onClick={() => setAnamnesePerguntas(anamnesePerguntas.filter((_, idx) => idx !== i))} className="text-red-400"><Trash2 size={20} /></button>
                </div>
              ))}
              <button onClick={() => setAnamnesePerguntas([...anamnesePerguntas, ''])} className="w-full py-4 border-2 border-dashed rounded-xl text-gray-400 font-bold hover:text-nutri-primary transition-all flex items-center justify-center gap-2"><Plus size={18} /> Pergunta</button>
            </div>
            <div className="p-6 border-t bg-gray-50 rounded-b-2xl flex justify-end gap-3"><button onClick={handleGerarAnamnese} disabled={savingAnamnese} className="bg-nutri-dark text-white px-8 py-3 rounded-xl font-bold">{savingAnamnese ? <Loader2 className="animate-spin" /> : 'Salvar'}</button></div>
          </div>
        </div>
      )}

      {/* MODAL EDITAR PERFIL */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-[200] bg-gray-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl p-8 animate-in zoom-in duration-200">
            <div className="flex justify-between items-center mb-6"><h2 className="text-xl font-bold">Editar Dados</h2><button onClick={() => setIsEditModalOpen(false)}><X size={24}/></button></div>
            <div className="space-y-4">
              <input className="w-full border p-3 rounded-xl outline-none" placeholder="Nome" value={editFormData.nome || ''} onChange={e => setEditFormData({...editFormData, nome: e.target.value})} />
              <div className="grid grid-cols-2 gap-4">
                <input className="w-full border p-3 rounded-xl outline-none" placeholder="Telefone" value={editFormData.telefone || ''} onChange={e => setEditFormData({...editFormData, telefone: e.target.value})} />
                <input className="w-full border p-3 rounded-xl outline-none" placeholder="CPF" value={editFormData.cpf || ''} onChange={e => setEditFormData({...editFormData, cpf: e.target.value})} />
              </div>
              <input type="date" className="w-full border p-3 rounded-xl outline-none" value={editFormData.data_nascimento || ''} onChange={e => setEditFormData({...editFormData, data_nascimento: e.target.value})} />
              <button onClick={handleUpdate} disabled={saving} className="w-full bg-nutri-dark text-white py-4 rounded-xl font-bold transition-all shadow-lg">{saving ? <Loader2 className="animate-spin" /> : 'Salvar Alterações'}</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL SOLICITAR EXAME */}
      {isSolicitarModalOpen && (
        <div className="fixed inset-0 z-[200] bg-gray-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl flex flex-col max-h-[90vh]">
            <div className="p-6 border-b flex justify-between items-center bg-gray-50 rounded-t-2xl"><h2 className="text-xl font-bold">Solicitar Exames</h2><button onClick={() => setIsSolicitarModalOpen(false)}><X size={24}/></button></div>
            <div className="p-8 overflow-y-auto grid grid-cols-1 md:grid-cols-2 gap-3">
              {listaExamesSugeridos.map(ex => (
                <label key={ex} className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 cursor-pointer hover:bg-gray-50 transition-all">
                  <input type="checkbox" checked={examesSelecionados.includes(ex)} onChange={() => { setExamesSelecionados(prev => prev.includes(ex) ? prev.filter(i => i !== ex) : [...prev, ex]); }} />
                  <span className="text-sm text-gray-700">{ex}</span>
                </label>
              ))}
              <div className="md:col-span-2 mt-4"><label className="text-xs font-bold text-gray-400 uppercase block mb-2">Acrescentar Observações:</label><textarea className="w-full border p-3 rounded-xl outline-none focus:border-nutri-primary min-h-[80px]" value={outrosExames} onChange={e => setOutrosExames(e.target.value)} /></div>
            </div>
            <div className="p-6 border-t bg-gray-50 rounded-b-2xl flex justify-end"><button onClick={handleSolicitarPDF} className="bg-nutri-dark text-white px-8 py-3 rounded-xl font-bold flex items-center gap-2 shadow-lg transition-all hover:bg-black"><FileDown size={18}/> Gerar PDF Assinável</button></div>
          </div>
        </div>
      )}

      {/* MODAL REGISTRAR EXAME */}
      {isRegistrarModalOpen && (
        <div className="fixed inset-0 z-[200] bg-gray-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl p-8">
            <div className="flex justify-between items-center mb-6"><h2 className="text-xl font-bold">Anexar Exame</h2><button onClick={() => setIsRegistrarModalOpen(false)}><X size={24}/></button></div>
            <div className="space-y-4">
              <input className="w-full border p-3 rounded-xl outline-none focus:border-nutri-primary" placeholder="Nome do Exame" value={nomeNovoExame} onChange={e => setNomeNovoExame(e.target.value)} />
              <div className="border-2 border-dashed border-gray-100 rounded-xl p-8 flex flex-col items-center gap-3 bg-gray-50 group hover:border-nutri-primary transition-all">
                <input type="file" ref={fileInputRef} className="hidden" accept=".pdf,image/*" /><Upload className="text-gray-300 group-hover:text-nutri-primary transition-all" size={48}/><button onClick={() => fileInputRef.current?.click()} className="text-nutri-primary font-bold">Selecionar Arquivo</button>
              </div>
              <button onClick={handleUploadExame} disabled={uploading} className="w-full bg-nutri-dark text-white py-4 rounded-xl font-bold flex justify-center items-center gap-2 shadow-lg transition-all">
                {uploading ? <Loader2 className="animate-spin"/> : <><Save size={18}/> Salvar Exame</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// --- SUBCOMPONENTES ---
function SidebarItem({ active, icon, label, onClick }: { active: boolean; icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-sm font-medium ${active ? 'bg-nutri-primary text-white shadow-md' : 'text-gray-500 hover:bg-gray-50 hover:text-nutri-dark'}`}>
      {icon} <span className="flex-1 text-left">{label}</span> {active && <ChevronRight size={14} />}
    </button>
  );
}

function InfoField({ label, value, icon }: { label: string; value: string; icon?: React.ReactNode }) {
  return (
    <div className="space-y-1"><label className="block text-[10px] font-black text-gray-400 uppercase mb-1 tracking-widest">{label}</label><div className="flex items-center font-bold text-gray-800 text-sm border-b border-gray-100 pb-1">{icon}{value}</div></div>
  );
}

function ActionCard({ icon, label, color, onClick }: { icon: React.ReactNode; label: string; color: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className={`flex flex-col items-center justify-center p-4 rounded-2xl shadow-sm hover:scale-105 transition-all h-32 w-full group ${color}`}><div className="bg-white/20 p-3 rounded-full mb-3 group-hover:bg-white/30 transition-all text-white/80">{icon}</div><span className="text-white font-bold text-sm text-center leading-tight">{label}</span></button>
  );
}

// Componente Especial para Input com Tooltip de Imagem
function AntroInput({ label, value, onChange, img }: { label: string; value: number; onChange: (v: number) => void; img?: string }) {
  return (
    <div className="space-y-1 relative group">
       <label className="block text-[10px] font-black text-gray-400 uppercase mb-1 tracking-widest flex items-center gap-1">
         {label}
         {img && <Info size={10} className="text-nutri-primary cursor-help" />}
       </label>
       <input 
         type="number" 
         className="w-full border-b border-gray-200 focus:border-nutri-primary outline-none py-1 font-bold text-gray-700 transition-all bg-transparent" 
         value={value || ''} 
         onChange={e => onChange(Number(e.target.value))} 
       />
       
       {/* Tooltip com Imagem */}
       {img && (
         <div className="absolute hidden group-hover:block bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 pointer-events-none animate-in fade-in zoom-in duration-200">
            <div className="bg-white p-2 rounded-xl shadow-2xl border border-gray-100 w-48">
               <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden mb-1">
                 {/* Substitua o src abaixo pelo caminho real das suas imagens */}
                 <img src={`/assets/antropometria/${img}`} alt={label} className="w-full h-full object-cover" />
               </div>
               <p className="text-[10px] text-center text-gray-500 font-bold">Local de Medição</p>
            </div>
            {/* Seta do tooltip */}
            <div className="w-3 h-3 bg-white border-r border-b border-gray-100 transform rotate-45 absolute -bottom-1.5 left-1/2 -translate-x-1/2 shadow-sm"></div>
         </div>
       )}
    </div>
  );
}

function ResultRow({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="flex justify-between items-center mb-3 group hover:bg-white/5 p-1 rounded transition-colors">
      <div>
        <p className="text-xs text-white/60 group-hover:text-white transition-colors">{label}</p>
        {sub && <p className="text-[10px] text-nutri-primary font-bold uppercase">{sub}</p>}
      </div>
      <p className="font-bold text-white text-right">{value}</p>
    </div>
  );
}
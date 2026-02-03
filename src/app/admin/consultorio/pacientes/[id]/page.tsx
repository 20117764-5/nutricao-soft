'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { 
  User, Activity, FileText, FlaskConical, Ruler, Baby, Zap, Utensils, 
  X, Copy, Edit, CalendarPlus, ClipboardList, Phone, Link as LinkIcon, 
  Loader2, ChevronRight, Save, Plus, Trash2, FileDown, ChevronDown, ChevronUp, Upload, File, Info,
  HeartPulse, Calculator, Dumbbell, Pencil, Search, PieChart as PieChartIcon, ArrowLeftRight, Printer
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { differenceInYears, parseISO, format, differenceInWeeks } from 'date-fns';
import jsPDF from 'jspdf';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip } from 'recharts';

// --- INTERFACES GERAIS ---
interface Paciente { id: string; nome: string; email: string | null; telefone: string | null; data_nascimento: string | null; cpf: string | null; created_at: string; ativo: boolean; }
interface Consulta { id: string; data_consulta: string; horario: string; status: string; servico: string; observacoes?: string; }
interface AnamneseTemplate { id: string; titulo: string; perguntas: string[]; created_at: string; }
interface RespostaUnificada { id: string; titulo: string; data: string; tipo: 'anamnese' | 'pre_consulta'; conteudo: Record<string, string>; }
interface DbAnamneseRes { id: string; titulo: string | null; respondido_em: string; respostas: Record<string, string>; }
interface DbFormResponse { id: string; form_title: string; created_at: string; responses: Record<string, string>; }
interface ExameAnexado { id: string; nome_exame: string; arquivo_url: string; created_at: string; }

// --- INTERFACES ANTROPOMETRIA ---
interface AntropometriaData {
  id?: string; paciente_id?: string; created_at?: string; tipo_avaliacao: 'adulto' | 'crianca';
  peso: number; altura: number; altura_sentado: number; altura_joelho: number;
  formula_dobras: string;
  tricipital: number; bicipital: number; abdominal: number; subescapular: number; axilar_media: number; coxa: number; toracica: number; suprailiaca: number; panturrilha_dobra: number; supraespinhal: number;
  pescoco: number; torax: number; ombro: number; cintura: number; abdomen_circ: number; braco_relax: number; braco_contr: number; antebraco: number; coxa_prox: number; coxa_med: number; coxa_dist: number; panturrilha_circ: number; quadril: number;
  umero: number; punho: number; femur: number;
  perc_gordura_bio: number; massa_gorda_bio: number; perc_musculo_bio: number; massa_musculo_bio: number; massa_livre_gordura_bio: number; peso_osseo_bio: number; gordura_visceral: number; agua_corporal: number; idade_metabolica: number;
}

// --- INTERFACES GESTACIONAL ---
interface RegistroGestacional { semana: number; peso_atual: number; dobra_tricipital: number; circ_braquial: number; data_registro: string; }
interface GestacionalData { id?: string; paciente_id?: string; peso_pre_gestacional: number; altura: number; dum: string; tipo_gestacao: 'unica' | 'gemelar'; created_at?: string; registros?: RegistroGestacional[]; }

// --- INTERFACES CÁLCULO ENERGÉTICO ---
interface CalculoData {
  id: string; paciente_id: string; data_calculo: string; metodo_tmb: string; peso_utilizado: number; altura_utilizada: number; fator_atividade: number; ajuste_met: number; ajuste_venta: number; adicional_gestante: boolean; resultado_tmb: number; resultado_get: number;
  detalhes: { mlg?: number } | null;
}

// --- INTERFACES PLANEJAMENTO ALIMENTAR ---
interface AlimentoTaco {
  id: number;
  nome: string;
  energia_kcal: number;
  proteina_g: number;
  carboidrato_g: number;
  lipideos_g: number;
  fibra_g: number;
  base_gramas: number;
}

interface ItemDieta {
  id: string;
  alimento: AlimentoTaco;
  nome_personalizado: string;
  quantidade_unid: number; 
  quantidade_g: number;    
  medida_caseira?: string;
  substitutos?: ItemDieta[];
}

interface RefeicaoPlanejada {
  id: string;
  nome: string;
  horario: string;
  tipo: 'refeicao' | 'habito';
  itens: ItemDieta[];
  observacoes?: string;
  expandido: boolean;
}

interface PlanejamentoSalvo {
  id: string;
  paciente_id: string;
  titulo: string;
  refeicoes: RefeicaoPlanejada[];
  created_at: string;
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
  const listaExamesSugeridos = [ "Hemograma Completo", "Glicemia de Jejum", "HBA1C", "Insulina", "Perfil Lipídico", "Ureia e Creatinina", "TGO e TGP", "GGT", "Vitamina D (25-OH)", "Vitamina B12", "Ferritina", "TSH e T4 Livre" ];

  // --- ESTADOS ANTROPOMETRIA ---
  const [avaliacoesAntro, setAvaliacoesAntro] = useState<AntropometriaData[]>([]);
  const [showAntroForm, setShowAntroForm] = useState(false);
  const [isAntroChoiceOpen, setIsAntroChoiceOpen] = useState(false);
  const [antroType, setAntroType] = useState<'adulto' | 'crianca'>('adulto');
  const [savingAntro, setSavingAntro] = useState(false);
  const [antroForm, setAntroForm] = useState<AntropometriaData>({
    tipo_avaliacao: 'adulto', peso: 0, altura: 0, altura_sentado: 0, altura_joelho: 0, formula_dobras: 'Pollock 3', tricipital: 0, bicipital: 0, abdominal: 0, subescapular: 0, axilar_media: 0, coxa: 0, toracica: 0, suprailiaca: 0, panturrilha_dobra: 0, supraespinhal: 0, pescoco: 0, torax: 0, ombro: 0, cintura: 0, abdomen_circ: 0, braco_relax: 0, braco_contr: 0, antebraco: 0, coxa_prox: 0, coxa_med: 0, coxa_dist: 0, panturrilha_circ: 0, quadril: 0, umero: 0, punho: 0, femur: 0, perc_gordura_bio: 0, massa_gorda_bio: 0, perc_musculo_bio: 0, massa_musculo_bio: 0, massa_livre_gordura_bio: 0, peso_osseo_bio: 0, gordura_visceral: 0, agua_corporal: 0, idade_metabolica: 0
  });

  // --- ESTADOS GESTACIONAL ---
  const [gestacionalData, setGestacionalData] = useState<GestacionalData | null>(null);
  const [registrosGestacional, setRegistrosGestacional] = useState<RegistroGestacional[]>([]);
  const [isGestacionalSetupOpen, setIsGestacionalSetupOpen] = useState(false);
  const [semanaSelecionada, setSemanaSelecionada] = useState<number>(1);
  const [formGestacional, setFormGestacional] = useState({ peso: 0, tricipital: 0, braquial: 0 });
  const [savingGestacional, setSavingGestacional] = useState(false);
  const [setupGesta, setSetupGesta] = useState({ peso_pre: 0, altura: 0, dum: '', tipo: 'unica' as 'unica' | 'gemelar' });

  // --- ESTADOS CÁLCULO ENERGÉTICO ---
  const [listaCalculos, setListaCalculos] = useState<CalculoData[]>([]);
  const [isCalculoModalOpen, setIsCalculoModalOpen] = useState(false);
  const [savingCalculo, setSavingCalculo] = useState(false);
  const [editingCalculoId, setEditingCalculoId] = useState<string | null>(null);
  const [calcForm, setCalcForm] = useState({ peso: 0, altura: 0, idade: 30, sexo: 'masculino' as 'masculino' | 'feminino', mlg: 0, formula: 'Harris-Benedict (1984)', fator_atividade: 1.200, ajuste_met: 0, ajuste_venta: 0, adicional_gestante: false });

  // --- ESTADOS PLANEJAMENTO ALIMENTAR ---
  const [listaPlanejamentos, setListaPlanejamentos] = useState<PlanejamentoSalvo[]>([]);
  const [modoPlanejamento, setModoPlanejamento] = useState(false);
  const [planejamentoAtualId, setPlanejamentoAtualId] = useState<string | null>(null);
  const [tituloPlanejamento, setTituloPlanejamento] = useState('Dieta Personalizada');
  const [refeicoes, setRefeicoes] = useState<RefeicaoPlanejada[]>([]);
  const [modalAlimentosOpen, setModalAlimentosOpen] = useState(false);
  const [refeicaoAlvoId, setRefeicaoAlvoId] = useState<string | null>(null);
  const [itemAlvoId, setItemAlvoId] = useState<string | null>(null);
  const [termoBusca, setTermoBusca] = useState('');
  const [resultadosBusca, setResultadosBusca] = useState<AlimentoTaco[]>([]);
  const [buscando, setBuscando] = useState(false);
  const [savingPlanejamento, setSavingPlanejamento] = useState(false);

  // --- ESTADOS AUXILIARES ---
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editFormData, setEditFormData] = useState<Partial<Paciente>>({});
  const [saving, setSaving] = useState(false);

  // --- DATA FETCHING ---
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
    if (activeTab === 'antropometria') {
      const { data } = await supabase.from('antropometria').select('*').eq('paciente_id', id).order('created_at', { ascending: false });
      setAvaliacoesAntro(data as AntropometriaData[] || []);
    }
    if (activeTab === 'gestacional') {
      const { data } = await supabase.from('pacientes_gestacional').select('*').eq('paciente_id', id).single();
      if (data) {
         setGestacionalData(data as GestacionalData);
         if (data.registros) {
            setRegistrosGestacional(data.registros as RegistroGestacional[]);
            const semanas = differenceInWeeks(new Date(), parseISO(data.dum));
            const semanaAtual = semanas > 0 ? semanas : 1;
            setSemanaSelecionada(semanaAtual);
            const regSemana = (data.registros as RegistroGestacional[]).find(r => r.semana === semanaAtual);
            if (regSemana) {
              setFormGestacional({
                peso: regSemana.peso_atual,
                tricipital: regSemana.dobra_tricipital,
                braquial: regSemana.circ_braquial
              });
            }
         }
      } else {
        setGestacionalData(null);
      }
    }
    if (activeTab === 'calculo') {
      const { data } = await supabase.from('pacientes_calculo').select('*').eq('paciente_id', id).order('data_calculo', { ascending: false });
      setListaCalculos(data as CalculoData[] || []);
    }
    if (activeTab === 'planejamento') {
      // Busca dados da tabela pacientes_planejamento
      const { data, error } = await supabase.from('pacientes_planejamento').select('*').eq('paciente_id', id).order('created_at', { ascending: false });
      if (error) console.error("Erro ao buscar planejamentos:", error);
      setListaPlanejamentos(data as PlanejamentoSalvo[] || []);
    }

  }, [activeTab, id, paciente]);

  useEffect(() => { fetchPaciente(); }, [fetchPaciente]);
  useEffect(() => { fetchDataAbas(); }, [fetchDataAbas]);

  // --- LÓGICA DE CÁLCULO (ENGINE) ---
  const resultadosCalculo = useMemo(() => {
    let tmb = 0;
    const { peso, altura, idade, sexo, formula, mlg } = calcForm;
    switch (formula) {
      case 'Harris-Benedict (1984)': if (sexo === 'masculino') tmb = 88.36 + (13.4 * peso) + (4.8 * altura) - (5.7 * idade); else tmb = 447.6 + (9.2 * peso) + (3.1 * altura) - (4.3 * idade); break;
      case 'Mifflin – Obesidade (1990)': case 'Mifflin – Sobrepeso (1990)': if (sexo === 'masculino') tmb = (10 * peso) + (6.25 * altura) - (5 * idade) + 5; else tmb = (10 * peso) + (6.25 * altura) - (5 * idade) - 161; break;
      case 'Cunningham (1980)': if (mlg > 0) tmb = 500 + (22 * mlg); else tmb = 500 + (22 * (peso * 0.8)); break;
      case 'Katch-McArdle (1996)': if (mlg > 0) tmb = 370 + (21.6 * mlg); else tmb = 370 + (21.6 * (peso * 0.8)); break;
      case 'FAO/WHO (2004)': if (sexo === 'masculino') { if (idade >= 18 && idade < 30) tmb = (15.057 * peso) + 679; else if (idade >= 30 && idade < 60) tmb = (11.6 * peso) + 879; else tmb = (13.5 * peso) + 487; } else { if (idade >= 18 && idade < 30) tmb = (14.7 * peso) + 496; else if (idade >= 30 && idade < 60) tmb = (8.7 * peso) + 829; else tmb = (10.5 * peso) + 596; } break;
      default: if (sexo === 'masculino') tmb = 88.36 + (13.4 * peso) + (4.8 * altura) - (5.7 * idade); else tmb = 447.6 + (9.2 * peso) + (3.1 * altura) - (4.3 * idade);
    }
    let get = tmb * calcForm.fator_atividade;
    get += calcForm.ajuste_met; get += calcForm.ajuste_venta;
    if (calcForm.adicional_gestante) get += 300;
    return { tmb: Math.round(tmb), tmb_kg: peso > 0 ? (tmb / peso).toFixed(1) : '0.0', get: Math.round(get), get_kg: peso > 0 ? (get / peso).toFixed(1) : '0.0' };
  }, [calcForm]);

  // --- CÁLCULOS ANALÍTICOS ANTRO (USEMEMO) ---
  const analise = useMemo(() => {
    const { peso, altura, cintura, quadril, tricipital, abdominal, coxa, braco_relax, punho, femur } = antroForm;
    const hM = altura / 100;
    const idade = paciente?.data_nascimento ? differenceInYears(new Date(), parseISO(paciente.data_nascimento)) : 30;
    const imc = (peso > 0 && hM > 0) ? peso / (hM * hM) : 0;
    const rcq = (cintura > 0 && quadril > 0) ? cintura / quadril : 0;
    const cmb = (braco_relax > 0 && tricipital > 0) ? braco_relax - (Math.PI * (tricipital / 10)) : 0;
    const somaDobras = tricipital + abdominal + coxa;
    const densidade = somaDobras > 0 ? 1.10938 - (0.0008267 * somaDobras) + (0.0000016 * Math.pow(somaDobras, 2)) - (0.0002574 * idade) : 0;
    const percGordura = densidade > 0 ? ((4.57 / densidade) - 4.142) * 100 : 0;
    const pesoGordura = (peso * percGordura) / 100;
    const pesoOsseo = (hM > 0 && punho > 0 && femur > 0) ? Math.pow(hM, 2) * (punho/100) * (femur/100) * 400 * 0.06 : 0;
    const pesoResidual = peso * 0.24;
    const massaMuscular = peso - (pesoGordura + pesoOsseo + pesoResidual);
    const massaLivre = peso - pesoGordura;
    return { imc: imc.toFixed(2), imcClasse: imc < 18.5 ? 'Abaixo' : imc < 25 ? 'Eutrofia' : imc < 30 ? 'Sobrepeso' : 'Obesidade', pesoIdeal: hM > 0 ? `${(18.5 * hM**2).toFixed(1)} - ${(24.9 * hM**2).toFixed(1)} kg` : '0', rcq: rcq.toFixed(2), riscoRcq: rcq > 0.90 ? 'Alto Risco' : 'Baixo Risco', cmb: cmb.toFixed(2), percGordura: percGordura.toFixed(1), pesoGordura: pesoGordura.toFixed(2), pesoOsseo: pesoOsseo.toFixed(2), massaMuscular: massaMuscular.toFixed(2), massaLivre: massaLivre.toFixed(2), densidade: densidade.toFixed(4), pesoResidual: pesoResidual.toFixed(2), soma: somaDobras.toFixed(1) };
  }, [antroForm, paciente]);

  const analiseGestacional = useMemo(() => {
    if (!gestacionalData) return null;
    const hM = gestacionalData.altura / 100;
    const imcPG = gestacionalData.peso_pre_gestacional / (hM * hM);
    let classImcPg = 'Eutrofia';
    if (imcPG < 18.5) classImcPg = 'Baixo Peso'; else if (imcPG >= 25 && imcPG < 30) classImcPg = 'Sobrepeso'; else if (imcPG >= 30) classImcPg = 'Obesidade';
    const pesoAtual = formGestacional.peso;
    const imcAtual = (pesoAtual > 0) ? pesoAtual / (hM * hM) : 0;
    const ganhoPeso = (pesoAtual > 0) ? pesoAtual - gestacionalData.peso_pre_gestacional : 0;
    const cmb = (formGestacional.braquial > 0 && formGestacional.tricipital > 0) ? formGestacional.braquial - (0.314 * formGestacional.tricipital) : 0;
    return { imcPG: imcPG.toFixed(1), classImcPg, ganhoPeso: ganhoPeso > 0 ? `+${ganhoPeso.toFixed(1)} kg` : '—', imcAtual: imcAtual > 0 ? imcAtual.toFixed(1) : '—', cmb: cmb > 0 ? cmb.toFixed(1) : '—', estadoNutricional: imcAtual > 0 ? (imcAtual > 30 ? 'Obesidade' : imcAtual > 25 ? 'Sobrepeso' : 'Adequado') : '—', estadoProteico: cmb > 23 ? 'Adequado' : 'Depleção', estadoLipidico: formGestacional.tricipital > 10 ? 'Adequado' : 'Baixo' };
  }, [gestacionalData, formGestacional]);


  // --- LÓGICA DO PLANEJAMENTO ALIMENTAR ---
  
  // 1. Adicionar Refeição
  const handleAddRefeicao = () => {
    const nova: RefeicaoPlanejada = {
      id: Math.random().toString(36).substr(2, 9),
      nome: 'Nova Refeição',
      horario: '08:00',
      tipo: 'refeicao',
      itens: [],
      expandido: true
    };
    setRefeicoes([...refeicoes, nova]);
  };

  // 2. Busca Inteligente (Debounce)
  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      if (termoBusca.length < 3) { setResultadosBusca([]); return; }
      setBuscando(true);
      try {
        const { data } = await supabase.from('alimentos_taco').select('*').ilike('nome', `%${termoBusca}%`).limit(20);
        setResultadosBusca(data as AlimentoTaco[] || []);
      } catch (err) { console.error(err); } 
      finally { setBuscando(false); }
    }, 500);
    return () => clearTimeout(delayDebounceFn);
  }, [termoBusca]);

  // 3. Selecionar Alimento
  const handleSelectAlimento = (alimento: AlimentoTaco) => {
    if (!refeicaoAlvoId) return;

    setRefeicoes(prev => prev.map(ref => {
      if (ref.id === refeicaoAlvoId) {
        
        // CASO 1: ADICIONAR SUBSTITUTO
        if (itemAlvoId) {
            return {
                ...ref,
                itens: ref.itens.map(item => {
                    if (item.id === itemAlvoId) {
                        return {
                            ...item,
                            substitutos: [...(item.substitutos || []), { 
                                id: Math.random().toString(36).substr(2, 9), 
                                alimento, 
                                nome_personalizado: alimento.nome, 
                                quantidade_g: 100, 
                                quantidade_unid: 1 
                            }]
                        }
                    }
                    return item;
                })
            }
        }

        // CASO 2: ADICIONAR ITEM PRINCIPAL
        return {
          ...ref,
          itens: [...ref.itens, { 
              id: Math.random().toString(36).substr(2, 9), 
              alimento, 
              nome_personalizado: alimento.nome, 
              quantidade_g: 100, 
              quantidade_unid: 1,
              substitutos: []
            }]
        };
      }
      return ref;
    }));
    
    setModalAlimentosOpen(false);
    setTermoBusca('');
    setItemAlvoId(null);
  };

  // 4. Atualizar Item
  const handleUpdateItem = (refeicaoId: string, itemId: string, field: 'quantidade_g' | 'quantidade_unid' | 'nome_personalizado', value: number | string) => {
    setRefeicoes(prev => prev.map(ref => {
      if (ref.id === refeicaoId) {
        return {
          ...ref,
          itens: ref.itens.map(item => item.id === itemId ? { ...item, [field]: value } : item)
        };
      }
      return ref;
    }));
  };
  
  // 4.1 Atualizar Substituto
  const handleUpdateSubstituto = (refeicaoId: string, itemId: string, subId: string, field: 'quantidade_g' | 'quantidade_unid' | 'nome_personalizado', value: number | string) => {
     setRefeicoes(prev => prev.map(ref => {
         if(ref.id !== refeicaoId) return ref;
         return {
             ...ref,
             itens: ref.itens.map(item => {
                 if(item.id !== itemId) return item;
                 return {
                     ...item,
                     substitutos: item.substitutos?.map(sub => sub.id === subId ? {...sub, [field]: value} : sub)
                 }
             })
         }
     }));
  };

  // 5. Remover Item
  const handleRemoveItem = (refeicaoId: string, itemId: string) => {
    setRefeicoes(prev => prev.map(ref => ref.id === refeicaoId ? { ...ref, itens: ref.itens.filter(i => i.id !== itemId) } : ref));
  };

  // 5.1 Remover Substituto
  const handleRemoveSubstituto = (refeicaoId: string, itemId: string, subId: string) => {
     setRefeicoes(prev => prev.map(ref => {
         if(ref.id !== refeicaoId) return ref;
         return {
             ...ref,
             itens: ref.itens.map(item => {
                 if(item.id !== itemId) return item;
                 return {
                     ...item,
                     substitutos: item.substitutos?.filter(sub => sub.id !== subId)
                 }
             })
         }
     }));
  }

 // 6. Calculadora de Totais (CORRIGIDA)
 const calculateTotals = (itens: ItemDieta[]) => {
  return itens.reduce((acc, item) => {
    // Se a quantidade for 0 ou vazia, consideramos 1 para não zerar o cálculo
    const multiplicador = item.quantidade_unid > 0 ? item.quantidade_unid : 1;
    
    // Multiplica o peso unitário pela quantidade de unidades
    // Ex: 2 unidades de 100g = fator 2.0 (200g totais)
    const fator = (item.quantidade_g * multiplicador) / 100;

    return {
      kcal: acc.kcal + (item.alimento.energia_kcal || 0) * fator,
      proteina: acc.proteina + (item.alimento.proteina_g || 0) * fator,
      carboidrato: acc.carboidrato + (item.alimento.carboidrato_g || 0) * fator,
      lipideos: acc.lipideos + (item.alimento.lipideos_g || 0) * fator,
      fibras: acc.fibras + (item.alimento.fibra_g || 0) * fator
    };
  }, { kcal: 0, proteina: 0, carboidrato: 0, lipideos: 0, fibras: 0 });
};

  // 7. Totalizador do Dia
  const totaisDiarios = useMemo(() => {
    const total = { kcal: 0, proteina: 0, carboidrato: 0, lipideos: 0, fibras: 0 };
    refeicoes.forEach(ref => {
      const tRef = calculateTotals(ref.itens);
      total.kcal += tRef.kcal;
      total.proteina += tRef.proteina;
      total.carboidrato += tRef.carboidrato;
      total.lipideos += tRef.lipideos;
      total.fibras += tRef.fibras;
    });
    return total;
  }, [refeicoes]);

  const COLORS = { protein: '#EF4444', carb: '#3B82F6', fat: '#EAB308' };

  // 8. SALVAR PLANEJAMENTO
  const handleSavePlanejamento = async () => {
     setSavingPlanejamento(true);
     try {
        const payload = {
            paciente_id: id,
            titulo: tituloPlanejamento,
            refeicoes: refeicoes
        };

        let resultError = null;

        if (planejamentoAtualId) {
            // Atualizar existente
            const { error } = await supabase.from('pacientes_planejamento').update(payload).eq('id', planejamentoAtualId);
            resultError = error;
        } else {
            // Criar novo
            const { error } = await supabase.from('pacientes_planejamento').insert(payload);
            resultError = error;
        }

        if(resultError) throw resultError;
        
        alert('Planejamento salvo com sucesso!');
        setModoPlanejamento(false);
        fetchDataAbas(); // Recarrega a lista
     } catch (err) {
        console.error("Erro completo ao salvar planejamento:", err);
        alert('Erro ao salvar planejamento. Verifique o console para detalhes ou se a tabela existe.');
     } finally {
        setSavingPlanejamento(false);
     }
  };

  // 9. CARREGAR PLANEJAMENTO PARA EDIÇÃO
  const handleEditPlanejamento = (plan: PlanejamentoSalvo) => {
      setRefeicoes(plan.refeicoes);
      setTituloPlanejamento(plan.titulo || 'Dieta Personalizada');
      setPlanejamentoAtualId(plan.id);
      setModoPlanejamento(true);
  };
  
  const handleDeletePlanejamento = async (idPlan: string) => {
     if(!confirm("Excluir este planejamento?")) return;
     try {
         await supabase.from('pacientes_planejamento').delete().eq('id', idPlan);
         fetchDataAbas();
     } catch(err) { console.error(err); }
  };

  // 10. Exportar para PDF
  const handleExportarPlanejamentoPDF = () => {
    if (!paciente) return;
    const doc = new jsPDF();
    const primaryColor = [34, 197, 94];

    doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.rect(0, 0, 210, 30, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(18).setFont('helvetica', 'bold').text('PLANEJAMENTO ALIMENTAR', 20, 20);
    
    doc.setTextColor(60, 60, 60);
    doc.setFontSize(10).setFont('helvetica', 'normal');
    doc.text(`PACIENTE: ${paciente.nome.toUpperCase()}`, 20, 40);
    doc.text(`DATA: ${format(new Date(), 'dd/MM/yyyy')}`, 150, 40);

    let y = 55;
    const refeicoesOrdenadas = [...refeicoes].sort((a,b) => a.horario.localeCompare(b.horario));
    
    refeicoesOrdenadas.forEach((ref) => {
      if (y > 250) { doc.addPage(); y = 20; }

      doc.setFillColor(240, 240, 240);
      doc.rect(15, y - 6, 180, 10, 'F');
      doc.setFontSize(12).setFont('helvetica', 'bold').setTextColor(34, 197, 94);
      doc.text(`${ref.horario} - ${ref.nome.toUpperCase()}`, 20, y);
      y += 10;

      doc.setFontSize(10).setFont('helvetica', 'normal').setTextColor(60, 60, 60);
      if (ref.itens.length === 0) {
        doc.text("— NENHUM ALIMENTO REGISTRADO —", 25, y);
        y += 8;
      } else {
        ref.itens.forEach(item => {
           const nomeExibicao = item.nome_personalizado || item.alimento.nome;
           const texto = `•  ${item.quantidade_unid > 0 ? item.quantidade_unid + 'x ' : ''}${nomeExibicao} (${item.quantidade_g}g)`;
           doc.setFont('helvetica', 'normal');
           doc.text(texto, 20, y);
           y += 5;

           if (item.substitutos && item.substitutos.length > 0) {
              item.substitutos.forEach(sub => {
                  const nomeSub = sub.nome_personalizado || sub.alimento.nome;
                  const textoSub = `    ou: ${sub.quantidade_unid > 0 ? sub.quantidade_unid + 'x ' : ''}${nomeSub} (${sub.quantidade_g}g)`;
                  doc.setFont('helvetica', 'italic').setTextColor(100, 100, 100);
                  doc.text(textoSub, 20, y);
                  y += 5;
              });
              y += 2;
              doc.setTextColor(60, 60, 60);
           } else {
              y += 2;
           }
        });
      }

      if (ref.observacoes) {
         y += 2;
         doc.setFontSize(9).setFont('helvetica', 'italic').setTextColor(100, 100, 100);
         const splitObs = doc.splitTextToSize(`Obs: ${ref.observacoes}`, 170);
         doc.text(splitObs, 20, y);
         y += (splitObs.length * 5) + 4;
      } else {
         y += 4;
      }
      y += 4;
    });

    if (y > 230) { doc.addPage(); y = 30; }
    y += 10;
    doc.setDrawColor(200, 200, 200).line(20, y, 190, y);
    y += 10;
    doc.setFontSize(12).setFont('helvetica', 'bold').setTextColor(0, 0, 0);
    doc.text(`TOTAL DIÁRIO: ${totaisDiarios.kcal.toFixed(0)} Kcal`, 20, y);
    doc.setFontSize(10).setFont('helvetica', 'normal');
    y += 6;
    doc.text(`Carb: ${totaisDiarios.carboidrato.toFixed(0)}g  |  Prot: ${totaisDiarios.proteina.toFixed(0)}g  |  Gord: ${totaisDiarios.lipideos.toFixed(0)}g`, 20, y);

    doc.save(`Dieta_${paciente.nome}.pdf`);
  };

  // --- HANDLERS DIVERSOS ---
  const handleUpdate = async () => { setSaving(true); try { const { error } = await supabase.from('pacientes').update({ nome: editFormData.nome, telefone: editFormData.telefone, cpf: editFormData.cpf, data_nascimento: editFormData.data_nascimento }).eq('id', id); if (error) throw error; setIsEditModalOpen(false); fetchPaciente(); } finally { setSaving(false); } };
  const handleOpenNewAnamnese = () => { setEditingTemplateId(null); setAnamneseTitulo(''); setAnamnesePerguntas(['']); setIsAnamneseModalOpen(true); };
  const handleEditTemplate = (template: AnamneseTemplate) => { setEditingTemplateId(template.id); setAnamneseTitulo(template.titulo); setAnamnesePerguntas(template.perguntas); setIsAnamneseModalOpen(true); };
  const handleDeleteTemplate = async (templateId: string) => { if (!confirm('Excluir este link?')) return; await supabase.from('anamneses_templates').delete().eq('id', templateId); fetchDataAbas(); };
  const handleGerarAnamnese = async () => { if (!anamneseTitulo) return alert('Dê um título.'); setSavingAnamnese(true); try { const payload = { paciente_id: id, titulo: anamneseTitulo, perguntas: anamnesePerguntas }; if (editingTemplateId) await supabase.from('anamneses_templates').update(payload).eq('id', editingTemplateId); else await supabase.from('anamneses_templates').insert(payload); setIsAnamneseModalOpen(false); fetchDataAbas(); } finally { setSavingAnamnese(false); } };
  const handleDeleteResposta = async (item: RespostaUnificada) => { if (!confirm(`Excluir ${item.titulo}?`)) return; const tabela = item.tipo === 'anamnese' ? 'anamneses_respostas' : 'form_responses'; await supabase.from(tabela).delete().eq('id', item.id); fetchDataAbas(); };
  const handleSolicitarPDF = () => { if (!paciente) return; const doc = new jsPDF(); const primaryColor = [34, 197, 94]; doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]); doc.rect(0, 0, 210, 40, 'F'); doc.setTextColor(255, 255, 255); doc.setFontSize(22).setFont('helvetica', 'bold').text('SOLICITAÇÃO DE EXAMES', 20, 28); doc.setTextColor(60, 60, 60).setFontSize(10).setFont('helvetica', 'normal').text(`PACIENTE: ${paciente.nome.toUpperCase()}`, 20, 55); doc.text(`DATA: ${format(new Date(), 'dd/MM/yyyy')}`, 20, 62); doc.setDrawColor(230).line(20, 68, 190, 68); const exames = [...examesSelecionados]; if (outrosExames) exames.push(outrosExames); exames.forEach((ex, i) => { const y = 85 + (i * 9); doc.setDrawColor(primaryColor[0], primaryColor[1], primaryColor[2]).rect(20, y - 3.5, 4, 4); doc.text(ex, 28, y); }); doc.setDrawColor(primaryColor[0], primaryColor[1], primaryColor[2]).line(60, 250, 150, 250); doc.text('Assinatura e CRN', 105, 256, { align: 'center' }); doc.save(`Exames_${paciente.nome}.pdf`); setIsSolicitarModalOpen(false); };
  const handleUploadExame = async () => { const file = fileInputRef.current?.files?.[0]; if (!file || !nomeNovoExame) return alert('Selecione arquivo e nome.'); setUploading(true); try { const fileName = `${id}/${Date.now()}_${file.name}`; await supabase.storage.from('exames').upload(fileName, file); const { data: { publicUrl } } = supabase.storage.from('exames').getPublicUrl(fileName); await supabase.from('pacientes_exames').insert({ paciente_id: id, nome_exame: nomeNovoExame, arquivo_url: publicUrl }); setIsRegistrarModalOpen(false); setNomeNovoExame(''); fetchDataAbas(); } finally { setUploading(false); } };
  const handleDeleteExame = async (exameId: string) => { if (!confirm('Excluir este exame?')) return; await supabase.from('pacientes_exames').delete().eq('id', exameId); fetchDataAbas(); };
  const exportarRespostaParaPDF = (item: RespostaUnificada) => { if (!paciente) return; const doc = new jsPDF(); let y = 20; doc.setFontSize(16).setTextColor(34, 197, 94).text(item.titulo, 20, y); y += 15; Object.entries(item.conteudo).forEach(([p, r]) => { if (y > 270) { doc.addPage(); y = 20; } doc.setFont('helvetica', 'bold').text(doc.splitTextToSize(p.toUpperCase(), 170), 20, y); y += 7; doc.setFont('helvetica', 'normal').text(doc.splitTextToSize(r || '—', 170), 20, y); y += 12; }); doc.save(`${item.titulo}_${paciente.nome}.pdf`); };
  
  // FIX: SALVAR E ATUALIZAR LISTA DE ANTRO MANUALMENTE
  const handleSaveAntro = async () => { 
    setSavingAntro(true); 
    try { 
      const payload = { ...antroForm, paciente_id: id, tipo_avaliacao: antroType }; 
      let resultError = null;
      if (antroForm.id) { 
        const { error } = await supabase.from('antropometria').update(payload).eq('id', antroForm.id); 
        resultError = error;
      } else { 
        const { error } = await supabase.from('antropometria').insert(payload); 
        resultError = error;
      } 
      
      if(resultError) throw resultError;

      // Força recarregamento manual
      const { data } = await supabase.from('antropometria').select('*').eq('paciente_id', id).order('created_at', { ascending: false });
      setAvaliacoesAntro(data as AntropometriaData[] || []);
      
      setShowAntroForm(false); 
      // fetchDataAbas(); // Removido para evitar race condition, o código acima já atualiza
    } catch (error) { 
      console.error("Erro antro:", error); 
      alert('Erro ao salvar avaliação. Verifique o console.'); 
    } finally { 
      setSavingAntro(false); 
    } 
  };

  // --- NOVA FUNÇÃO DE EXCLUIR ANTROPOMETRIA ---
  const handleDeleteAntro = async (idAntro: string) => {
    if (!confirm("Tem certeza que deseja excluir esta avaliação? Esta ação não pode ser desfeita.")) return;
    try {
      const { error } = await supabase.from('antropometria').delete().eq('id', idAntro);
      if (error) throw error;
      // Atualiza estado local removendo o item excluído
      setAvaliacoesAntro(prev => prev.filter(a => a.id !== idAntro));
    } catch (err) {
      console.error(err);
      alert('Erro ao excluir avaliação.');
    }
  };
  
  const handleStartGestacional = () => { setIsGestacionalSetupOpen(true); };
  const handleSaveSetupGestacional = async () => { if (!setupGesta.dum || setupGesta.peso_pre <= 0) return alert('Preencha os dados.'); const semanas = differenceInWeeks(new Date(), parseISO(setupGesta.dum)); const semanaInicial = semanas > 0 ? semanas : 1; try { const payload = { paciente_id: id, peso_pre_gestacional: setupGesta.peso_pre, altura: setupGesta.altura, dum: setupGesta.dum, tipo_gestacao: setupGesta.tipo, registros: [] }; const { error } = await supabase.from('pacientes_gestacional').insert(payload); if (error) throw error; setSemanaSelecionada(semanaInicial); setIsGestacionalSetupOpen(false); fetchDataAbas(); } catch (err) { console.error(err); alert('Erro ao iniciar acompanhamento.'); } };
  const handleSaveRegistroGestacional = async () => { if (!gestacionalData?.id) return; setSavingGestacional(true); const novoRegistro: RegistroGestacional = { semana: semanaSelecionada, peso_atual: formGestacional.peso, dobra_tricipital: formGestacional.tricipital, circ_braquial: formGestacional.braquial, data_registro: new Date().toISOString() }; const registrosAntigos = registrosGestacional.filter(r => r.semana !== semanaSelecionada); const novosRegistros = [...registrosAntigos, novoRegistro]; try { const { error } = await supabase .from('pacientes_gestacional') .update({ registros: novosRegistros }) .eq('id', gestacionalData.id); if (error) throw error; setRegistrosGestacional(novosRegistros); alert('Dados da semana salvos com sucesso!'); } catch (err) { console.error(err); alert('Erro ao salvar dados.'); } finally { setSavingGestacional(false); } };
  const handleOpenNewCalculo = () => { const idadeCalc = paciente?.data_nascimento ? differenceInYears(new Date(), parseISO(paciente.data_nascimento)) : 30; const lastAntro = avaliacoesAntro.length > 0 ? avaliacoesAntro[0] : null; setCalcForm({ peso: lastAntro ? lastAntro.peso : 0, altura: lastAntro ? lastAntro.altura : 0, idade: idadeCalc, sexo: 'masculino', mlg: 0, formula: 'Harris-Benedict (1984)', fator_atividade: 1.200, ajuste_met: 0, ajuste_venta: 0, adicional_gestante: false }); setEditingCalculoId(null); setIsCalculoModalOpen(true); };
  const handleEditCalculo = (calculo: CalculoData) => { const idadeCalc = paciente?.data_nascimento ? differenceInYears(new Date(), parseISO(paciente.data_nascimento)) : 30; setCalcForm({ peso: calculo.peso_utilizado, altura: calculo.altura_utilizada, idade: idadeCalc, sexo: 'masculino', mlg: calculo.detalhes?.mlg || 0, formula: calculo.metodo_tmb, fator_atividade: calculo.fator_atividade, ajuste_met: calculo.ajuste_met, ajuste_venta: calculo.ajuste_venta, adicional_gestante: calculo.adicional_gestante }); setEditingCalculoId(calculo.id); setIsCalculoModalOpen(true); };
  const handleDeleteCalculo = async (calculoId: string) => { if (!confirm('Tem certeza que deseja excluir este cálculo?')) return; try { const { error } = await supabase.from('pacientes_calculo').delete().eq('id', calculoId); if (error) throw error; fetchDataAbas(); } catch (err) { console.error(err); alert('Erro ao excluir.'); } };
  const handleSaveCalculo = async () => { setSavingCalculo(true); try { const payload = { paciente_id: id, metodo_tmb: calcForm.formula, peso_utilizado: calcForm.peso, altura_utilizada: calcForm.altura, fator_atividade: calcForm.fator_atividade, ajuste_met: calcForm.ajuste_met, ajuste_venta: calcForm.ajuste_venta, adicional_gestante: calcForm.adicional_gestante, resultado_tmb: resultadosCalculo.tmb, resultado_get: resultadosCalculo.get, detalhes: { mlg: calcForm.mlg } }; if (editingCalculoId) { const { error } = await supabase.from('pacientes_calculo').update(payload).eq('id', editingCalculoId); if (error) throw error; } else { const { error } = await supabase.from('pacientes_calculo').insert(payload); if (error) throw error; } setIsCalculoModalOpen(false); fetchDataAbas(); alert(editingCalculoId ? 'Cálculo atualizado!' : 'Cálculo salvo!'); } catch (err) { console.error(err); alert('Erro ao salvar cálculo.'); } finally { setSavingCalculo(false); } };

  // Atualiza inputs gestacional ao mudar semana
  useEffect(() => { if (registrosGestacional.length > 0) { const salvo = registrosGestacional.find(r => r.semana === semanaSelecionada); if (salvo) { setFormGestacional({ peso: salvo.peso_atual, tricipital: salvo.dobra_tricipital, braquial: salvo.circ_braquial }); } else { setFormGestacional({ peso: 0, tricipital: 0, braquial: 0 }); } } }, [semanaSelecionada, registrosGestacional]);


  if (loading) return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin text-nutri-primary" /></div>;
  if (!paciente) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-gray-50 flex overflow-hidden animate-in fade-in duration-300">
      
      {/* SIDEBAR */}
      <aside className="w-64 bg-white border-r border-gray-200 flex flex-col shrink-0 overflow-y-auto">
        <div className="p-6 border-b border-gray-100 text-center">
          
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
          <SidebarItem active={activeTab === 'planejamento'} onClick={() => setActiveTab('planejamento')} icon={<Utensils size={18} />} label="Planejamento Alimentar" />
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
                    <ActionCard icon={<CalendarPlus size={24}/>} label="Agendar" color="bg-blue-500" onClick={() => router.push('/admin/consultorio/agendamentos')} />
                    <ActionCard icon={<FileText size={24}/>} label="Anamnese" color="bg-emerald-500" onClick={() => setActiveTab('anamnese')} />
                    <ActionCard icon={<FlaskConical size={24}/>} label="Exames" color="bg-amber-500" onClick={() => setActiveTab('exames')} />
                    <ActionCard icon={<Ruler size={24}/>} label="Antropometria" color="bg-teal-500" onClick={() => setActiveTab('antropometria')} />
                    <ActionCard icon={<Baby size={24}/>} label="Gestacional" color="bg-pink-500" onClick={() => setActiveTab('gestacional')} />
                    <ActionCard icon={<Calculator size={24}/>} label="Cálculo" color="bg-indigo-500" onClick={() => setActiveTab('calculo')} />
                  </div>
                </section>
              </div>
            )}

            {/* CONTEÚDO HISTÓRICO */}
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

            {/* CONTEÚDO ANAMNESE */}
            {activeTab === 'anamnese' && (
              <div className="space-y-8 animate-in slide-in-from-bottom-2">
                <div className="flex justify-between items-center bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
                  <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2"><FileText className="text-nutri-primary" /> Anamnese Geral</h3>
                  <button onClick={handleOpenNewAnamnese} className="bg-nutri-dark text-white px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 shadow-lg"><Plus size={18} /> Nova Anamnese</button>
                </div>

                {/* LINKS ATIVOS */}
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
                      {avaliacoesAntro.length === 0 ? (
                        <div className="col-span-full py-12 text-center text-gray-400">
                           <Ruler size={48} className="mx-auto mb-3 opacity-20"/>
                           <p>Nenhuma avaliação registrada.</p>
                        </div>
                      ) : (
                        avaliacoesAntro.map(av => (
                          <div key={av.id} className="relative group bg-white p-5 rounded-2xl border border-gray-200 shadow-sm hover:border-nutri-primary cursor-pointer transition-all">
                             {/* Área clicável para editar */}
                             <div onClick={() => { setAntroForm(av); setShowAntroForm(true); }}>
                                <div className="flex justify-between items-start mb-2">
                                   <p className="font-bold text-gray-800 text-lg">{av.created_at ? format(parseISO(av.created_at), 'dd/MM/yyyy') : 'Sem data'}</p>
                                   <span className="text-[10px] uppercase font-bold text-gray-500 bg-gray-100 px-2 py-1 rounded tracking-wider">{av.tipo_avaliacao}</span>
                                </div>
                                <div className="space-y-1 text-sm text-gray-600">
                                   <div className="flex justify-between"><span>Peso:</span> <span className="font-bold">{av.peso} kg</span></div>
                                   <div className="flex justify-between"><span>Altura:</span> <span className="font-bold">{av.altura} cm</span></div>
                                   <div className="flex justify-between"><span>IMC:</span> <span className="font-bold text-nutri-primary">{(av.peso / (av.altura/100)**2).toFixed(1)}</span></div>
                                </div>
                             </div>

                             {/* Botão de Excluir */}
                             <button 
                                onClick={(e) => { e.stopPropagation(); if(av.id) handleDeleteAntro(av.id); }}
                                className="absolute top-4 right-4 p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                                title="Excluir Avaliação"
                             >
                                <Trash2 size={16} />
                             </button>
                          </div>
                        ))
                      )}
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
                            <select className="bg-gray-50 border rounded-lg text-xs p-1" value={antroForm.formula_dobras} onChange={e => setAntroForm({...antroForm, formula_dobras: e.target.value})}>
                              <option>Pollock 3</option><option>Pollock 7</option><option>Petroski</option><option>Guedes</option><option>Durnin</option><option>Faulkner</option><option>Nenhuma</option>
                            </select>
                          </div>
                          <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
                             <AntroInput label="Tricipital" value={antroForm.tricipital} onChange={v => setAntroForm({...antroForm, tricipital: v})} img="/assets/antropometria/dobras/tricipital.jpg" />
                             <AntroInput label="Bicipital" value={antroForm.bicipital} onChange={v => setAntroForm({...antroForm, bicipital: v})} img="/assets/antropometria/dobras/bicipital.jpg" />
                             <AntroInput label="Abdominal" value={antroForm.abdominal} onChange={v => setAntroForm({...antroForm, abdominal: v})} img="/assets/antropometria/dobras/abdominal.jpg" />
                             <AntroInput label="Subescapular" value={antroForm.subescapular} onChange={v => setAntroForm({...antroForm, subescapular: v})} img="/assets/antropometria/dobras/subescapular.jpg" />
                             <AntroInput label="Axilar Média" value={antroForm.axilar_media} onChange={v => setAntroForm({...antroForm, axilar_media: v})} img="/assets/antropometria/dobras/axilar.jpg" />
                             <AntroInput label="Coxa" value={antroForm.coxa} onChange={v => setAntroForm({...antroForm, coxa: v})} img="/assets/antropometria/dobras/coxa.webp" />
                             <AntroInput label="Torácica" value={antroForm.toracica} onChange={v => setAntroForm({...antroForm, toracica: v})} img="/assets/antropometria/dobras/toracica.webp" />
                             <AntroInput label="Supra-ilíaca" value={antroForm.suprailiaca} onChange={v => setAntroForm({...antroForm, suprailiaca: v})} img="/assets/antropometria/dobras/suprailiaca.webp" />
                             <AntroInput label="Panturrilha" value={antroForm.panturrilha_dobra} onChange={v => setAntroForm({...antroForm, panturrilha_dobra: v})} img="/assets/antropometria/dobras/panturrilha.webp" />
                             <AntroInput label="Supraespinhal" value={antroForm.supraespinhal} onChange={v => setAntroForm({...antroForm, supraespinhal: v})} img="/assets/antropometria/dobras/supraespinhal.webp" />
                          </div>
                       </div>
                       
                       {/* Bloco 3: Circunferências */}
                       <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
                          <h4 className="font-bold text-gray-800 mb-4 border-b pb-2">Circunferências (cm)</h4>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                             <AntroInput label="Pescoço" value={antroForm.pescoco} onChange={v => setAntroForm({...antroForm, pescoco: v})} img="/assets/antropometria/pescoco.webp" />
                             <AntroInput label="Tórax" value={antroForm.torax} onChange={v => setAntroForm({...antroForm, torax: v})} img="/assets/antropometria/torax.webp" />
                             <AntroInput label="Ombro" value={antroForm.ombro} onChange={v => setAntroForm({...antroForm, ombro: v})} img="/assets/antropometria/ombro.webp" />
                             <AntroInput label="Cintura" value={antroForm.cintura} onChange={v => setAntroForm({...antroForm, cintura: v})} img="/assets/antropometria/cintura.webp" />
                             <AntroInput label="Abdomen" value={antroForm.abdomen_circ} onChange={v => setAntroForm({...antroForm, abdomen_circ: v})} img="/assets/antropometria/abdomen.webp" />
                             <AntroInput label="Quadril" value={antroForm.quadril} onChange={v => setAntroForm({...antroForm, quadril: v})} img="/assets/antropometria/quadril.webp" />
                             <AntroInput label="Braço Relax." value={antroForm.braco_relax} onChange={v => setAntroForm({...antroForm, braco_relax: v})} img="/assets/antropometria/braco_relaxado.webp" />
                             <AntroInput label="Braço Contr." value={antroForm.braco_contr} onChange={v => setAntroForm({...antroForm, braco_contr: v})} img="/assets/antropometria/braco_contraido.webp" />
                             <AntroInput label="Antebraço" value={antroForm.antebraco} onChange={v => setAntroForm({...antroForm, antebraco: v})} img= "/assets/antropometria/antebraco.webp" />
                             <AntroInput label="Coxa Prox." value={antroForm.coxa_prox} onChange={v => setAntroForm({...antroForm, coxa_prox: v})} img="/assets/antropometria/coxa_proximal.webp" />
                             <AntroInput label="Coxa Med." value={antroForm.coxa_med} onChange={v => setAntroForm({...antroForm, coxa_med: v})} img="/assets/antropometria/coxa_media.webp" />
                             <AntroInput label="Coxa Dist." value={antroForm.coxa_dist} onChange={v => setAntroForm({...antroForm, coxa_dist: v})} img="/assets/antropometria/coxa_distal.webp" />
                             <AntroInput label="Panturrilha" value={antroForm.panturrilha_circ} onChange={v => setAntroForm({...antroForm, panturrilha_circ: v})} img="/assets/antropometria/panturrilha.webp" />
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

            {/* --- MÓDULO GESTACIONAL --- */}
            {activeTab === 'gestacional' && (
              <div className="space-y-6 animate-in slide-in-from-bottom-2">
                {!gestacionalData ? (
                  <div className="flex flex-col items-center justify-center h-[50vh] bg-white rounded-3xl border border-gray-200 shadow-sm p-8 text-center">
                    <div className="bg-pink-50 p-6 rounded-full mb-6 animate-bounce"><Baby size={48} className="text-pink-500"/></div>
                    <h2 className="text-2xl font-bold text-gray-800 mb-2">Acompanhamento Gestacional</h2>
                    <p className="text-gray-500 mb-8 max-w-md">Inicie o acompanhamento completo da gestação, com curvas de peso, IMC gestacional e monitoramento nutricional.</p>
                    <button onClick={handleStartGestacional} className="bg-pink-500 hover:bg-pink-600 text-white px-8 py-4 rounded-xl font-bold text-lg shadow-xl transition-all flex items-center gap-2">
                      <HeartPulse size={24}/> Começar acompanhamento
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pb-20">
                    <div className="lg:col-span-7 space-y-6">
                      <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
                          <h3 className="font-bold text-gray-800 text-lg mb-6 border-b pb-4 flex items-center gap-2"><Ruler className="text-pink-500"/> Dados Antropométricos</h3>
                          <div className="space-y-6">
                             <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Semana Gestacional</label>
                                <select value={semanaSelecionada} onChange={(e) => setSemanaSelecionada(Number(e.target.value))} className="w-full p-3 border border-gray-200 rounded-xl outline-none focus:border-pink-500 font-bold text-gray-700">
                                   {Array.from({length: 42}, (_, i) => i + 1).map(sem => (
                                     <option key={sem} value={sem}>{sem}ª Semana</option>
                                   ))}
                                </select>
                             </div>
                             <div className="grid grid-cols-2 gap-4">
                                <AntroInput label="Peso na Semana (kg)" value={formGestacional.peso} onChange={(v) => setFormGestacional({...formGestacional, peso: v})} />
                                <AntroInput label="Dobra Tricipital (mm)" value={formGestacional.tricipital} onChange={(v) => setFormGestacional({...formGestacional, tricipital: v})} />
                             </div>
                             <div><AntroInput label="Circunferência Braquial (cm)" value={formGestacional.braquial} onChange={(v) => setFormGestacional({...formGestacional, braquial: v})} /></div>
                             <button onClick={handleSaveRegistroGestacional} className="w-full bg-green-500 hover:bg-green-600 text-white py-4 rounded-xl font-bold shadow-lg transition-all flex justify-center items-center gap-2 mt-4">
                                {savingGestacional ? <Loader2 className="animate-spin" /> : <><Save size={20}/> Salvar Alterações</>}
                             </button>
                          </div>
                      </div>
                    </div>
                    <div className="lg:col-span-5 space-y-6">
                       <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
                          <h3 className="font-bold text-gray-800 text-lg mb-6 border-b pb-4 flex items-center gap-2"><Activity className="text-pink-500"/> Análise Gestacional</h3>
                          <div className="bg-pink-50 rounded-xl p-4 mb-6">
                             <div className="grid grid-cols-2 gap-y-3 text-sm">
                                <InfoRow label="Semana" value={`${semanaSelecionada}`} />
                                <InfoRow label="Tipo" value={gestacionalData.tipo_gestacao} />
                                <InfoRow label="Peso Pré" value={`${gestacionalData.peso_pre_gestacional} kg`} />
                                <InfoRow label="IMC Pré" value={analiseGestacional?.imcPG || '-'} highlight />
                                <div className="col-span-2 mt-2 pt-2 border-t border-pink-200 flex justify-between items-center"><span className="text-xs font-bold text-gray-500 uppercase">Classificação IMC PG</span><span className="font-bold text-pink-600 bg-white px-3 py-1 rounded-full shadow-sm">{analiseGestacional?.classImcPg}</span></div>
                             </div>
                          </div>
                          <div className="space-y-4">
                             <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Indicadores Nutricionais</h4>
                             <ResultBox label="IMC Atual" value={analiseGestacional?.imcAtual} icon={<Info size={14}/>} />
                             <ResultBox label="Ganho de Peso" value={analiseGestacional?.ganhoPeso} />
                             <ResultBox label="CMB" value={`${analiseGestacional?.cmb} cm`} />
                             <div className="grid grid-cols-1 gap-2 mt-4">
                                <StatusBadge label="Estado Nutricional" value={analiseGestacional?.estadoNutricional} />
                                <StatusBadge label="Estado Proteico" value={analiseGestacional?.estadoProteico} />
                                <StatusBadge label="Estado Lipídico" value={analiseGestacional?.estadoLipidico} />
                             </div>
                          </div>
                       </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* --- MÓDULO CÁLCULO ENERGÉTICO --- */}
            {activeTab === 'calculo' && (
              <div className="space-y-6 animate-in slide-in-from-bottom-2">
                 <div className="flex justify-between items-center bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
                   <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2"><Zap className="text-nutri-primary" /> Cálculo Energético</h3>
                   <button onClick={handleOpenNewCalculo} className="bg-nutri-dark text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 shadow-lg hover:bg-black transition-all"><Plus size={18} /> Novo Planejamento</button>
                 </div>

                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {listaCalculos.length === 0 ? (
                       <div className="col-span-full py-12 flex flex-col items-center justify-center text-center text-gray-400">
                          <Calculator size={48} className="mb-4 text-gray-300"/>
                          <p>Nenhum cálculo realizado.</p>
                       </div>
                    ) : (
                       listaCalculos.map(calc => (
                          <div key={calc.id} className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm hover:border-nutri-primary transition-all group">
                             <div className="flex justify-between items-start mb-4">
                                <div>
                                   <p className="font-bold text-gray-800">{format(parseISO(calc.data_calculo), 'dd/MM/yyyy')}</p>
                                   <p className="text-xs text-gray-500 truncate w-40">{calc.metodo_tmb}</p>
                                </div>
                                <div className="flex flex-col items-end gap-2">
                                   <div className="bg-nutri-primary/10 text-nutri-primary font-bold px-3 py-1 rounded-lg text-xs">GET: {calc.resultado_get} kcal</div>
                                   <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                      <button onClick={() => handleEditCalculo(calc)} className="p-1.5 bg-blue-50 text-blue-500 rounded-lg hover:bg-blue-100" title="Editar"><Pencil size={14}/></button>
                                      <button onClick={() => handleDeleteCalculo(calc.id)} className="p-1.5 bg-red-50 text-red-500 rounded-lg hover:bg-red-100" title="Excluir"><Trash2 size={14}/></button>
                                   </div>
                                </div>
                             </div>
                             <div className="space-y-2 text-sm text-gray-600">
                                <div className="flex justify-between"><span>TMB:</span> <span className="font-bold">{calc.resultado_tmb} kcal</span></div>
                                <div className="flex justify-between"><span>Peso:</span> <span>{calc.peso_utilizado} kg</span></div>
                                <div className="flex justify-between"><span>Atividade:</span> <span>x{calc.fator_atividade}</span></div>
                             </div>
                          </div>
                       ))
                    )}
                 </div>
              </div>
            )}

            {/* === ABA PLANEJAMENTO ALIMENTAR === */}
            {activeTab === 'planejamento' && (
              <div className="space-y-6 animate-in slide-in-from-bottom-2">
                
                {/* Tela Inicial (Lista de Planejamentos) */}
                {!modoPlanejamento && (
                   <div className="space-y-6">
                      <div className="flex justify-between items-center bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
                          <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2"><Utensils className="text-nutri-primary" /> Histórico de Dietas</h3>
                          <button onClick={() => { setModoPlanejamento(true); setPlanejamentoAtualId(null); setTituloPlanejamento('Nova Dieta'); handleAddRefeicao(); }} className="bg-nutri-dark text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 shadow-lg hover:bg-black transition-all">
                             <Plus size={18} /> Nova Prescrição
                          </button>
                      </div>

                      {listaPlanejamentos.length === 0 ? (
                         <div className="flex flex-col items-center justify-center py-20 bg-white rounded-3xl border border-gray-200 border-dashed text-center">
                            <div className="bg-gray-50 p-6 rounded-full mb-4"><Utensils size={32} className="text-gray-300"/></div>
                            <p className="text-gray-400 font-bold">Nenhuma dieta criada para este paciente.</p>
                         </div>
                      ) : (
                         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {listaPlanejamentos.map(plan => (
                               <div key={plan.id} className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm hover:border-nutri-primary transition-all group cursor-pointer" onClick={() => handleEditPlanejamento(plan)}>
                                   <div className="flex justify-between items-start mb-4">
                                      <div>
                                         <p className="font-bold text-gray-800 text-lg truncate w-40">{plan.titulo}</p>
                                         <p className="text-xs text-gray-500 font-bold">{format(parseISO(plan.created_at), 'dd/MM/yyyy')}</p>
                                      </div>
                                      <div className="bg-green-50 text-green-600 p-2 rounded-lg"><FileText size={20}/></div>
                                   </div>
                                   <div className="flex gap-2 justify-end opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
                                      <button onClick={(e) => { e.stopPropagation(); handleDeletePlanejamento(plan.id); }} className="text-xs text-red-500 font-bold hover:underline flex items-center gap-1"><Trash2 size={12}/> Excluir</button>
                                   </div>
                               </div>
                            ))}
                         </div>
                      )}
                   </div>
                )}

                {/* Tela de Edição */}
                {modoPlanejamento && (
                  <>
                    <div className="flex items-center gap-4 mb-2">
                        <button onClick={() => { setModoPlanejamento(false); fetchDataAbas(); }} className="text-gray-400 hover:text-gray-600 font-bold text-sm flex items-center gap-1"><ChevronRight className="rotate-180" size={16}/> Voltar</button>
                        <div className="h-6 w-[1px] bg-gray-300"></div>
                        <span className="text-gray-400 font-bold text-sm">Editor de Dieta</span>
                    </div>

                    {/* TELA 1: ROTINA DO PACIENTE */}
                    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                      <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                        <div className="flex items-center gap-4 flex-1">
                           <div className="bg-nutri-primary/10 p-2 rounded-lg text-nutri-primary"><ClipboardList size={20}/></div>
                           <input 
                              className="font-bold text-xl text-gray-800 bg-transparent outline-none placeholder-gray-400 w-full"
                              value={tituloPlanejamento}
                              onChange={e => setTituloPlanejamento(e.target.value)}
                              placeholder="Título da Dieta (ex: Hipertrofia)"
                           />
                        </div>
                        <div className="flex gap-2">
                           <button onClick={handleSavePlanejamento} disabled={savingPlanejamento} className="bg-nutri-dark text-white px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 hover:bg-black transition-colors mr-2">
                              {savingPlanejamento ? <Loader2 className="animate-spin" size={16}/> : <><Save size={16}/> Salvar Dieta</>}
                           </button>
                           <button onClick={handleExportarPlanejamentoPDF} className="bg-nutri-primary text-white px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 hover:bg-green-600 transition-colors mr-4"><Printer size={16}/> PDF</button>
                           <button onClick={() => setRefeicoes(prev => prev.map(r => ({...r, expandido: true})))} className="text-xs font-bold text-gray-500 hover:text-nutri-primary">Expandir</button>
                           <button onClick={() => setRefeicoes(prev => prev.map(r => ({...r, expandido: false})))} className="text-xs font-bold text-gray-500 hover:text-nutri-primary">Recolher</button>
                        </div>
                      </div>
                      
                      <div className="p-6 space-y-6">
                         {/* Lista de Refeições */}
                         {refeicoes.sort((a,b) => a.horario.localeCompare(b.horario)).map((ref) => {
                            const totaisRef = calculateTotals(ref.itens);
                            return (
                              <div key={ref.id} className="border border-gray-200 rounded-xl overflow-hidden transition-all hover:border-nutri-primary/50">
                                 {/* Header da Refeição */}
                                 <div className="bg-gray-50 p-4 flex items-center justify-between cursor-pointer" onClick={() => setRefeicoes(refeicoes.map(r => r.id === ref.id ? {...r, expandido: !r.expandido} : r))}>
                                    <div className="flex items-center gap-4">
                                       <div className="bg-white border border-gray-200 rounded-lg px-3 py-1 text-sm font-bold text-gray-700 flex items-center gap-2">
                                          <input type="time" className="bg-transparent outline-none cursor-pointer" value={ref.horario} onClick={(e) => e.stopPropagation()} onChange={(e) => setRefeicoes(refeicoes.map(r => r.id === ref.id ? {...r, horario: e.target.value} : r))} />
                                       </div>
                                       <input className="font-bold text-gray-800 bg-transparent outline-none placeholder-gray-400 text-lg" value={ref.nome} onClick={(e) => e.stopPropagation()} onChange={(e) => setRefeicoes(refeicoes.map(r => r.id === ref.id ? {...r, nome: e.target.value} : r))} placeholder="Nome da Refeição" />
                                    </div>
                                    <div className="hidden md:flex gap-4 text-xs font-bold text-gray-500 uppercase">
                                       <span className="text-blue-500">PTN: {totaisRef.proteina.toFixed(1)}g</span>
                                       <span className="text-red-500">CHO: {totaisRef.carboidrato.toFixed(1)}g</span>
                                       <span className="text-yellow-600">LIP: {totaisRef.lipideos.toFixed(1)}g</span>
                                       <span className="text-gray-800">Kcal: {totaisRef.kcal.toFixed(0)}</span>
                                    </div>
                                    <div className="flex gap-2">
                                       <button className="p-2 text-gray-400 hover:text-red-500" onClick={(e) => { e.stopPropagation(); setRefeicoes(refeicoes.filter(r => r.id !== ref.id)); }}><Trash2 size={16}/></button>
                                       {ref.expandido ? <ChevronUp size={20} className="text-gray-400"/> : <ChevronDown size={20} className="text-gray-400"/>}
                                    </div>
                                 </div>

                                 {/* Conteúdo Expandido */}
                                 {ref.expandido && (
                                    <div className="p-4 bg-white animate-in slide-in-from-top-1">
                                       <div className="space-y-4">
                                          {ref.itens.length === 0 ? (
                                             <p className="text-center text-sm text-gray-400 italic py-4">Nenhum alimento adicionado.</p>
                                          ) : (
                                             ref.itens.map(item => (
                                                <div key={item.id} className="relative group/item">
                                                    {/* LINHA DO ALIMENTO PRINCIPAL */}
                                                    <div className="grid grid-cols-12 gap-4 items-center p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors border border-gray-100">
                                                        <div className="col-span-5">
                                                            {/* NOME EDITÁVEL */}
                                                            <input 
                                                                className="font-bold text-gray-700 text-sm bg-transparent outline-none w-full placeholder-gray-400 focus:text-nutri-primary" 
                                                                value={item.nome_personalizado || item.alimento.nome}
                                                                onChange={(e) => handleUpdateItem(ref.id, item.id, 'nome_personalizado', e.target.value)}
                                                                placeholder="Nome do alimento"
                                                            />
                                                            <div className="flex gap-2 text-[10px] text-gray-400 font-bold uppercase mt-1"><span>{item.alimento.energia_kcal.toFixed(0)} kcal (100g)</span></div>
                                                        </div>
                                                        
                                                        <div className="col-span-2 flex items-center">
                                                            <span className="mr-1 text-[10px] text-gray-400 font-bold uppercase">QTD</span>
                                                            <input type="number" className="w-full text-center bg-white border border-gray-200 rounded py-1 text-sm font-bold outline-none focus:border-nutri-primary" value={item.quantidade_unid || ''} placeholder="0" onChange={(e) => handleUpdateItem(ref.id, item.id, 'quantidade_unid', Number(e.target.value))} />
                                                        </div>

                                                        <div className="col-span-2 flex items-center">
                                                            <input type="number" className="w-full text-center bg-white border border-gray-200 rounded py-1 text-sm font-bold outline-none focus:border-nutri-primary" value={item.quantidade_g} onChange={(e) => handleUpdateItem(ref.id, item.id, 'quantidade_g', Number(e.target.value))} />
                                                            <span className="ml-1 text-xs text-gray-500 font-bold">g</span>
                                                        </div>
                                                        
                                                        <div className="col-span-3 flex justify-end gap-2">
                                                            <button onClick={() => { setRefeicaoAlvoId(ref.id); setItemAlvoId(item.id); setModalAlimentosOpen(true); }} className="text-blue-300 hover:text-blue-500 p-1" title="Adicionar Substituto"><ArrowLeftRight size={16}/></button>
                                                            <button onClick={() => handleRemoveItem(ref.id, item.id)} className="text-gray-300 hover:text-red-500 p-1"><Trash2 size={16}/></button>
                                                        </div>
                                                    </div>

                                                    {/* LINHAS DOS SUBSTITUTOS */}
                                                    {item.substitutos && item.substitutos.length > 0 && (
                                                        <div className="ml-8 mt-2 space-y-2 border-l-2 border-dashed border-gray-200 pl-4">
                                                            {item.substitutos.map(sub => (
                                                                <div key={sub.id} className="grid grid-cols-12 gap-4 items-center p-2 bg-blue-50/50 rounded-lg border border-blue-50">
                                                                    <div className="col-span-5 flex items-center gap-2">
                                                                        <span className="text-xs font-bold text-blue-400 italic">Ou:</span>
                                                                        <input 
                                                                            className="font-medium text-gray-600 text-xs bg-transparent outline-none w-full"
                                                                            value={sub.nome_personalizado || sub.alimento.nome}
                                                                            onChange={(e) => handleUpdateSubstituto(ref.id, item.id, sub.id, 'nome_personalizado', e.target.value)}
                                                                        />
                                                                    </div>
                                                                    <div className="col-span-2 flex items-center">
                                                                        <input type="number" className="w-full text-center bg-white/50 border border-gray-200 rounded py-0.5 text-xs font-bold outline-none focus:border-blue-400" value={sub.quantidade_unid || ''} placeholder="0" onChange={(e) => handleUpdateSubstituto(ref.id, item.id, sub.id, 'quantidade_unid', Number(e.target.value))} />
                                                                    </div>
                                                                    <div className="col-span-2 flex items-center">
                                                                        <input type="number" className="w-full text-center bg-white/50 border border-gray-200 rounded py-0.5 text-xs font-bold outline-none focus:border-blue-400" value={sub.quantidade_g} onChange={(e) => handleUpdateSubstituto(ref.id, item.id, sub.id, 'quantidade_g', Number(e.target.value))} />
                                                                        <span className="ml-1 text-[10px] text-gray-400 font-bold">g</span>
                                                                    </div>
                                                                    <div className="col-span-3 flex justify-end">
                                                                        <button onClick={() => handleRemoveSubstituto(ref.id, item.id, sub.id)} className="text-gray-300 hover:text-red-400"><X size={14}/></button>
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                             ))
                                          )}
                                       </div>
                                       <div className="mt-4 flex gap-3 border-t border-gray-100 pt-4">
                                          <button onClick={() => { setRefeicaoAlvoId(ref.id); setItemAlvoId(null); setModalAlimentosOpen(true); }} className="flex items-center gap-2 text-sm font-bold text-nutri-primary hover:bg-nutri-primary/10 px-4 py-2 rounded-lg transition-colors"><Plus size={16}/> Ver Alimentos / Adicionar</button>
                                       </div>
                                       <textarea 
                                          className="w-full mt-3 bg-yellow-50 border border-yellow-100 rounded-lg p-3 text-sm text-gray-600 placeholder-gray-400 outline-none focus:border-yellow-300"
                                          placeholder="Observações para o paciente (ex: mastigar bem, evitar líquidos junto...)"
                                          rows={2}
                                          value={ref.observacoes || ''}
                                          onChange={(e) => setRefeicoes(refeicoes.map(r => r.id === ref.id ? {...r, observacoes: e.target.value} : r))}
                                       />
                                    </div>
                                 )}
                              </div>
                            );
                         })}
                         <button onClick={handleAddRefeicao} className="w-full py-4 border-2 border-dashed border-gray-300 rounded-xl text-gray-400 font-bold flex items-center justify-center gap-2 hover:border-nutri-primary hover:text-nutri-primary hover:bg-nutri-primary/5 transition-all"><Plus size={20}/> Nova refeição ou hábito</button>
                      </div>
                    </div>

                    {/* TELA 2: ANÁLISE DE NUTRIENTES */}
                    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden animate-in slide-in-from-bottom-4">
                       <div className="p-6 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
                          <h3 className="font-bold text-xl text-gray-800 flex items-center gap-2"><PieChartIcon className="text-nutri-primary"/> Análise de nutrientes</h3>
                       </div>
                       <div className="p-8 grid grid-cols-1 lg:grid-cols-2 gap-10">
                          {/* Tabela */}
                          <div>
                             <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4">Comparativo Teórico x Prescrito</h4>
                             <div className="border border-gray-200 rounded-xl overflow-hidden">
                                <table className="w-full text-sm">
                                   <thead className="bg-gray-50 text-gray-500 font-bold uppercase text-xs"><tr><th className="p-3 text-left">Parâmetro</th><th className="p-3 text-right">Prescrito</th><th className="p-3 text-right">Teórico (GET)</th><th className="p-3 text-right">Diferença</th></tr></thead>
                                   <tbody className="divide-y divide-gray-100">
                                      <AnalysisRow label="Calorias (Kcal)" prescrito={totaisDiarios.kcal} teorico={listaCalculos[0]?.resultado_get || 0} unit="" />
                                      <AnalysisRow label="Proteínas (g)" prescrito={totaisDiarios.proteina} teorico={0} unit="g" />
                                      <AnalysisRow label="Carboidratos (g)" prescrito={totaisDiarios.carboidrato} teorico={0} unit="g" />
                                      <AnalysisRow label="Lipídios (g)" prescrito={totaisDiarios.lipideos} teorico={0} unit="g" />
                                   </tbody>
                                </table>
                             </div>
                          </div>
                          {/* Gráfico */}
                          <div className="flex flex-col md:flex-row items-center gap-8">
                             <div className="w-48 h-48 relative">
                                <ResponsiveContainer width="100%" height="100%">
                                   <PieChart>
                                      <Pie data={[{ name: 'Carb', value: totaisDiarios.carboidrato * 4 }, { name: 'Ptn', value: totaisDiarios.proteina * 4 }, { name: 'Lip', value: totaisDiarios.lipideos * 9 }]} innerRadius={40} outerRadius={80} paddingAngle={5} dataKey="value">
                                         <Cell fill={COLORS.carb} /><Cell fill={COLORS.protein} /><Cell fill={COLORS.fat} />
                                      </Pie>
                                      <RechartsTooltip />
                                   </PieChart>
                                </ResponsiveContainer>
                                <div className="absolute inset-0 flex items-center justify-center flex-col pointer-events-none"><span className="font-black text-gray-800 text-lg">{totaisDiarios.kcal.toFixed(0)}</span><span className="text-[10px] text-gray-400 font-bold uppercase">Kcal</span></div>
                             </div>
                             <div className="flex-1 space-y-3 w-full">
                                <MacroCard label="Carboidratos" color="bg-blue-500" value={totaisDiarios.carboidrato} kcal={totaisDiarios.carboidrato * 4} totalKcal={totaisDiarios.kcal} />
                                <MacroCard label="Proteínas" color="bg-red-500" value={totaisDiarios.proteina} kcal={totaisDiarios.proteina * 4} totalKcal={totaisDiarios.kcal} />
                                <MacroCard label="Lipídios" color="bg-yellow-500" value={totaisDiarios.lipideos} kcal={totaisDiarios.lipideos * 9} totalKcal={totaisDiarios.kcal} />
                             </div>
                          </div>
                       </div>
                    </div>
                  </>
                )}

                {/* MODAL DE BUSCA ALIMENTOS (TACO) */}
                {modalAlimentosOpen && (
                  <div className="fixed inset-0 z-[200] bg-gray-900/60 backdrop-blur-sm flex items-center justify-center p-4">
                     <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl flex flex-col max-h-[85vh] animate-in zoom-in duration-200">
                        <div className="p-6 border-b flex justify-between items-center bg-gray-50 rounded-t-2xl">
                           <h2 className="text-xl font-bold flex items-center gap-2"><Search className="text-nutri-primary"/> {itemAlvoId ? 'Buscar Substituto' : 'Buscar Alimento'}</h2>
                           <button onClick={() => setModalAlimentosOpen(false)}><X size={24}/></button>
                        </div>
                        <div className="p-6 border-b border-gray-100">
                           <div className="relative">
                              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20}/>
                              <input autoFocus className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-nutri-primary focus:ring-4 focus:ring-nutri-primary/10 transition-all font-bold text-gray-700" placeholder="Digite o nome do alimento..." value={termoBusca} onChange={e => setTermoBusca(e.target.value)} />
                           </div>
                        </div>
                        <div className="flex-1 overflow-y-auto p-4 space-y-2">
                           {buscando && <div className="text-center py-10 text-gray-400"><Loader2 className="animate-spin mx-auto mb-2"/> Buscando na tabela TACO...</div>}
                           {!buscando && resultadosBusca.length === 0 && termoBusca.length > 2 && <div className="text-center py-10 text-gray-400">Nenhum alimento encontrado.</div>}
                           {resultadosBusca.map(alimento => (
                              <button key={alimento.id} onClick={() => handleSelectAlimento(alimento)} className="w-full text-left p-4 rounded-xl border border-gray-100 hover:border-nutri-primary hover:bg-nutri-primary/5 transition-all group flex justify-between items-center">
                                 <div>
                                    <p className="font-bold text-gray-700 group-hover:text-nutri-primary">{alimento.nome}</p>
                                    <div className="flex gap-3 text-xs text-gray-400 font-bold uppercase mt-1"><span>{alimento.energia_kcal.toFixed(0)} kcal</span><span className="text-red-400">P: {alimento.proteina_g}g</span><span className="text-blue-400">C: {alimento.carboidrato_g}g</span></div>
                                 </div>
                                 <div className="bg-gray-100 p-2 rounded-lg text-gray-400 group-hover:bg-nutri-primary group-hover:text-white transition-colors"><Plus size={20}/></div>
                              </button>
                           ))}
                        </div>
                     </div>
                  </div>
                )}
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

      {/* OUTROS MODAIS (GESTACIONAL, CÁLCULO, ANAMNESE, EXAMES...) SÃO IDÊNTICOS, MANTIDOS DO CÓDIGO ORIGINAL */}
      {/* ... (mantive a lógica igual, apenas garantindo que o fechamento da tag </div> esteja correto) ... */}
      
      {/* MODAL SETUP GESTACIONAL */}
      {isGestacionalSetupOpen && (
        <div className="fixed inset-0 z-[200] bg-pink-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl p-8 animate-in zoom-in">
             <div className="text-center mb-6">
                <div className="bg-pink-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"><Baby size={32} className="text-pink-500"/></div>
                <h2 className="text-xl font-bold text-gray-800">Oba! Um bebê está chegando!</h2>
                <p className="text-sm text-gray-500 mt-2">Para iniciar o acompanhamento nutricional para gestantes, é necessário preencher os campos abaixo:</p>
             </div>
             <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                   <div className="space-y-1"><label className="text-xs font-bold text-gray-400">Peso Pré-Gest. (kg)</label><input type="number" className="w-full border p-3 rounded-xl outline-none focus:border-pink-500" value={setupGesta.peso_pre} onChange={e => setSetupGesta({...setupGesta, peso_pre: Number(e.target.value)})}/></div>
                   <div className="space-y-1"><label className="text-xs font-bold text-gray-400">Altura (cm)</label><input type="number" className="w-full border p-3 rounded-xl outline-none focus:border-pink-500" value={setupGesta.altura} onChange={e => setSetupGesta({...setupGesta, altura: Number(e.target.value)})}/></div>
                </div>
                <div className="space-y-1"><label className="text-xs font-bold text-gray-400">DUM (Última Menstruação)</label><input type="date" className="w-full border p-3 rounded-xl outline-none focus:border-pink-500" value={setupGesta.dum} onChange={e => setSetupGesta({...setupGesta, dum: e.target.value})}/></div>
                <div className="space-y-1">
                   <label className="text-xs font-bold text-gray-400">Tipo de Gestação</label>
                   <div className="flex gap-4">
                      <button onClick={() => setSetupGesta({...setupGesta, tipo: 'unica'})} className={`flex-1 p-3 rounded-xl border-2 font-bold transition-all ${setupGesta.tipo === 'unica' ? 'border-pink-500 text-pink-500 bg-pink-50' : 'border-gray-100 text-gray-400'}`}>Única</button>
                      <button onClick={() => setSetupGesta({...setupGesta, tipo: 'gemelar'})} className={`flex-1 p-3 rounded-xl border-2 font-bold transition-all ${setupGesta.tipo === 'gemelar' ? 'border-pink-500 text-pink-500 bg-pink-50' : 'border-gray-100 text-gray-400'}`}>Gemelar</button>
                   </div>
                </div>
                <button onClick={handleSaveSetupGestacional} className="w-full bg-pink-500 text-white py-4 rounded-xl font-bold mt-4 shadow-lg hover:bg-pink-600 transition-all">Salvar e Iniciar</button>
             </div>
          </div>
        </div>
      )}

      {/* MODAL CÁLCULO ENERGÉTICO */}
      {isCalculoModalOpen && (
        <div className="fixed inset-0 z-[200] bg-gray-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl flex flex-col max-h-[95vh] overflow-hidden animate-in zoom-in duration-200">
             <div className="p-6 border-b flex justify-between items-center bg-gray-50 rounded-t-2xl">
               <h2 className="text-xl font-bold flex items-center gap-2"><Dumbbell className="text-nutri-primary"/> {editingCalculoId ? 'Editar Planejamento' : 'Novo Planejamento'}</h2>
               <button onClick={() => setIsCalculoModalOpen(false)}><X size={24}/></button>
             </div>

             <div className="flex-1 overflow-y-auto p-8 space-y-8">
               <section>
                 <h3 className="font-bold text-gray-800 text-lg mb-4 flex items-center gap-2"><span className="bg-nutri-primary text-white w-6 h-6 rounded-full flex items-center justify-center text-xs">1</span> Dados antropométricos</h3>
                 <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-gray-50 p-6 rounded-2xl border border-gray-100">
                   <div className="space-y-1"><label className="text-xs font-bold text-gray-400 uppercase">Altura (cm)</label><input type="number" className="w-full border p-3 rounded-xl outline-none focus:border-nutri-primary font-bold text-gray-700" value={calcForm.altura} onChange={e => setCalcForm({...calcForm, altura: Number(e.target.value)})}/></div>
                   <div className="space-y-1"><label className="text-xs font-bold text-gray-400 uppercase">Peso (kg)</label><input type="number" className="w-full border p-3 rounded-xl outline-none focus:border-nutri-primary font-bold text-gray-700" value={calcForm.peso} onChange={e => setCalcForm({...calcForm, peso: Number(e.target.value)})}/></div>
                   <div className="space-y-1"><label className="text-xs font-bold text-gray-400 uppercase">Idade</label><input type="number" className="w-full border p-3 rounded-xl outline-none focus:border-nutri-primary font-bold text-gray-700" value={calcForm.idade} onChange={e => setCalcForm({...calcForm, idade: Number(e.target.value)})}/></div>
                   <div className="space-y-1">
                     <label className="text-xs font-bold text-gray-400 uppercase">Sexo</label>
                     <select className="w-full border p-3 rounded-xl outline-none focus:border-nutri-primary bg-white" value={calcForm.sexo} onChange={e => setCalcForm({...calcForm, sexo: e.target.value as 'masculino' | 'feminino'})}>
                       <option value="masculino">Masculino</option>
                       <option value="feminino">Feminino</option>
                     </select>
                   </div>
                   <div className="space-y-1 col-span-2"><label className="text-xs font-bold text-gray-400 uppercase">Massa Livre Gordura (kg) - Opcional</label><input type="number" className="w-full border p-3 rounded-xl outline-none focus:border-nutri-primary" value={calcForm.mlg} onChange={e => setCalcForm({...calcForm, mlg: Number(e.target.value)})}/></div>
                 </div>
               </section>
               <section>
                 <h3 className="font-bold text-gray-800 text-lg mb-4 flex items-center gap-2"><span className="bg-nutri-primary text-white w-6 h-6 rounded-full flex items-center justify-center text-xs">2</span> Fórmulas padronizadas</h3>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-gray-50 p-6 rounded-2xl border border-gray-100">
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-gray-600">Fórmula para cálculo teórico</label>
                      <select className="w-full border p-3 rounded-xl outline-none focus:border-nutri-primary bg-white" value={calcForm.formula} onChange={e => setCalcForm({...calcForm, formula: e.target.value})}>
                        <optgroup label="Adultos e Idosos">
                          <option>Harris-Benedict (1984)</option>
                          <option>FAO/WHO (2004)</option>
                          <option>Mifflin – Obesidade (1990)</option>
                          <option>Mifflin – Sobrepeso (1990)</option>
                          <option>Cunningham (1980)</option>
                          <option>Katch-McArdle (1996)</option>
                        </optgroup>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-gray-600">Fator de atividade física</label>
                      <select className="w-full border p-3 rounded-xl outline-none focus:border-nutri-primary bg-white" value={calcForm.fator_atividade} onChange={e => setCalcForm({...calcForm, fator_atividade: Number(e.target.value)})}>
                        <option value={1.000}>1.000 – Não utilizar</option>
                        <option value={1.200}>1.200 – Sedentário</option>
                        <option value={1.375}>1.375 – Leve</option>
                        <option value={1.550}>1.550 – Moderada</option>
                        <option value={1.725}>1.725 – Intensa</option>
                        <option value={1.900}>1.900 – Muito intensa</option>
                      </select>
                    </div>
                 </div>
               </section>
               <section>
                 <h3 className="font-bold text-gray-800 text-lg mb-4 flex items-center gap-2"><span className="bg-nutri-primary text-white w-6 h-6 rounded-full flex items-center justify-center text-xs">3</span> Ajustes refinados</h3>
                 <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-gray-50 p-6 rounded-2xl border border-gray-100">
                    <div className="space-y-1"><label className="text-xs font-bold text-gray-400 uppercase">Adic. Calórico (MET)</label><input type="number" className="w-full border p-3 rounded-xl outline-none focus:border-nutri-primary" value={calcForm.ajuste_met} onChange={e => setCalcForm({...calcForm, ajuste_met: Number(e.target.value)})}/></div>
                    <div className="space-y-1"><label className="text-xs font-bold text-gray-400 uppercase">Peso p/ VENTA</label><input type="number" className="w-full border p-3 rounded-xl outline-none focus:border-nutri-primary" value={calcForm.ajuste_venta} onChange={e => setCalcForm({...calcForm, ajuste_venta: Number(e.target.value)})}/></div>
                    <div className="flex items-center pt-6">
                       <label className="flex items-center gap-2 cursor-pointer">
                         <input type="checkbox" className="w-5 h-5 accent-nutri-primary" checked={calcForm.adicional_gestante} onChange={e => setCalcForm({...calcForm, adicional_gestante: e.target.checked})}/>
                         <span className="font-bold text-gray-700">Incluir adicional gestante</span>
                       </label>
                    </div>
                 </div>
               </section>
               <section>
                 <h3 className="font-bold text-gray-800 text-lg mb-4 flex items-center gap-2"><span className="bg-nutri-primary text-white w-6 h-6 rounded-full flex items-center justify-center text-xs">4</span> Resultados</h3>
                 <div className="bg-gray-100 p-8 rounded-3xl border border-gray-200">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                       <div className="text-center md:text-left border-r border-gray-300 pr-8">
                          <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">Taxa Metabólica Basal (TMB)</p>
                          <div className="text-4xl font-black text-gray-800">{resultadosCalculo.tmb} <span className="text-lg font-medium text-gray-500">Kcal/dia</span></div>
                          <p className="text-sm font-bold text-nutri-primary mt-1">{resultadosCalculo.tmb_kg} Kcal/kg</p>
                       </div>
                       <div className="text-center md:text-left pl-4">
                          <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">Gasto Energético Total (GET)</p>
                          <div className="text-4xl font-black text-nutri-primary">{resultadosCalculo.get} <span className="text-lg font-medium text-gray-500">Kcal/dia</span></div>
                          <p className="text-sm font-bold text-gray-400 mt-1">{resultadosCalculo.get_kg} Kcal/kg</p>
                       </div>
                    </div>
                 </div>
               </section>
             </div>
             <div className="p-6 border-t bg-gray-50 rounded-b-2xl flex justify-end">
                <button onClick={handleSaveCalculo} className="bg-nutri-dark text-white px-10 py-4 rounded-xl font-bold text-lg shadow-xl hover:bg-black transition-all flex items-center gap-2">
                   {savingCalculo ? <Loader2 className="animate-spin"/> : <><Save size={20}/> {editingCalculoId ? 'Atualizar cálculos' : 'Salvar cálculos'}</>}
                </button>
             </div>
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
function SidebarItem({ active, icon, label, onClick }: { active: boolean; icon: React.ReactNode; label: string; onClick: () => void }) { return (<button onClick={onClick} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-sm font-medium ${active ? 'bg-nutri-primary text-white shadow-md' : 'text-gray-500 hover:bg-gray-50 hover:text-nutri-dark'}`}>{icon} <span className="flex-1 text-left">{label}</span> {active && <ChevronRight size={14} />}</button>); }
function InfoField({ label, value, icon }: { label: string; value: string; icon?: React.ReactNode }) { return (<div className="space-y-1"><label className="block text-[10px] font-black text-gray-400 uppercase mb-1 tracking-widest">{label}</label><div className="flex items-center font-bold text-gray-800 text-sm border-b border-gray-100 pb-1">{icon}{value}</div></div>); }
function ActionCard({ icon, label, color, onClick }: { icon: React.ReactNode; label: string; color: string; onClick: () => void }) { return (<button onClick={onClick} className={`flex flex-col items-center justify-center p-4 rounded-2xl shadow-sm hover:scale-105 transition-all h-32 w-full group ${color}`}><div className="bg-white/20 p-3 rounded-full mb-3 group-hover:bg-white/30 transition-all text-white/80">{icon}</div><span className="text-white font-bold text-sm text-center leading-tight">{label}</span></button>); }
function AntroInput({ label, value, onChange, img }: { label: string; value: number; onChange: (v: number) => void; img?: string }) { return (<div className="space-y-1 relative group"><label className="block text-[10px] font-black text-gray-400 uppercase mb-1 tracking-widest flex items-center gap-1">{label}{img && <Info size={10} className="text-nutri-primary cursor-help" />}</label><input type="number" className="w-full border-b border-gray-200 focus:border-nutri-primary outline-none py-1 font-bold text-gray-700 transition-all bg-transparent" value={value || ''} onChange={e => onChange(Number(e.target.value))} />{img && (<div className="absolute hidden group-hover:block bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 pointer-events-none animate-in fade-in zoom-in duration-200"><div className="bg-white p-2 rounded-xl shadow-2xl border border-gray-100 w-48"><div className="aspect-square bg-gray-100 rounded-lg overflow-hidden mb-1"><img src={img} alt={label} className="w-full h-full object-cover" /></div><p className="text-[10px] text-center text-gray-500 font-bold">Local de Medição</p></div><div className="w-3 h-3 bg-white border-r border-b border-gray-100 transform rotate-45 absolute -bottom-1.5 left-1/2 -translate-x-1/2 shadow-sm"></div></div>)}</div>); }
function ResultRow({ label, value, sub }: { label: string; value: string | number; sub?: string }) { return (<div className="flex justify-between items-center mb-3 group hover:bg-white/5 p-1 rounded transition-colors"><div><p className="text-xs text-white/60 group-hover:text-white transition-colors">{label}</p>{sub && <p className="text-[10px] text-nutri-primary font-bold uppercase">{sub}</p>}</div><p className="font-bold text-white text-right">{value}</p></div>); }
function InfoRow({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) { return (<div className="flex justify-between items-center"><span className="text-gray-500">{label}:</span><span className={`font-bold ${highlight ? 'text-pink-600' : 'text-gray-800'}`}>{value}</span></div>); }
function ResultBox({ label, value, icon }: { label: string; value: string | number | undefined | null; icon?: React.ReactNode }) { return (<div className="bg-gray-50 p-4 rounded-xl border border-gray-100"><div className="flex justify-between items-center mb-1"><span className="text-xs font-bold text-gray-400 uppercase flex items-center gap-1">{label} {icon}</span></div><p className="text-xl font-bold text-gray-800">{value || '—'}</p></div>); }
function StatusBadge({ label, value }: { label: string; value: string | undefined | null }) { return (<div className="flex justify-between items-center bg-white p-3 rounded-lg border border-gray-100"><span className="text-xs font-bold text-gray-500">{label}</span><span className={`text-xs font-bold px-2 py-1 rounded ${value === 'Adequado' ? 'bg-green-100 text-green-700' : value === '—' ? 'bg-gray-100 text-gray-400' : 'bg-orange-100 text-orange-700'}`}>{value}</span></div>); }
function AnalysisRow({ label, prescrito, teorico, unit }: { label: string; prescrito: number; teorico: number; unit: string }) { const diff = prescrito - teorico; return (<tr className="group hover:bg-gray-50/50"><td className="p-3 font-bold text-gray-700 border-b border-gray-50">{label}</td><td className="p-3 text-right text-gray-600 border-b border-gray-50">{prescrito.toFixed(1)}{unit}</td><td className="p-3 text-right text-gray-400 border-b border-gray-50">{teorico > 0 ? `${teorico.toFixed(1)}${unit}` : '—'}</td><td className={`p-3 text-right font-bold border-b border-gray-50 ${diff > 0 ? 'text-green-500' : 'text-red-500'}`}>{teorico > 0 ? `${diff > 0 ? '+' : ''}${diff.toFixed(1)}${unit}` : '—'}</td></tr>); }
function MacroCard({ label, color, value, kcal, totalKcal }: { label: string; color: string; value: number; kcal: number; totalKcal: number }) { const percent = totalKcal > 0 ? (kcal / totalKcal) * 100 : 0; return (<div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-100"><div className="flex items-center gap-3"><div className={`w-3 h-3 rounded-full ${color}`}></div><div><p className="text-xs font-bold text-gray-500 uppercase">{label}</p><p className="font-bold text-gray-800">{value.toFixed(1)}g</p></div></div><div className="text-right"><p className="text-xs font-bold text-gray-400">{kcal.toFixed(0)} kcal</p><p className="font-black text-gray-800">{percent.toFixed(0)}%</p></div></div>); }
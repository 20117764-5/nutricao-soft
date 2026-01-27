'use client';

import { useState, useEffect, useCallback } from 'react';
import { 
  FileText, Upload, Trash2, Download, Search, 
  FolderOpen, X, Loader2, Save // Adicionado o Save aqui
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

// --- TIPOS ---
interface Documento {
  id: string;
  title: string;
  description: string;
  category: string;
  file_path: string;
  file_url: string;
  created_at: string;
}

const CATEGORIES = ['Lâminas', 'E-books', 'Dietas Padrão', 'Orientações', 'Outros'];

export default function ImpressosPage() {
  const [docs, setDocs] = useState<Documento[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Filtros
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('Todos');

  // Form de Upload
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState(CATEGORIES[0]);

  // --- 1. BUSCAR DOCUMENTOS ---
  const fetchDocuments = useCallback(async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from('documents')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setDocs(data as Documento[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  // --- 2. UPLOAD DE ARQUIVO ---
  const handleUpload = async () => {
    if (!file || !title) {
      alert('Selecione um arquivo e dê um título.');
      return;
    }

    setUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não logado');

      // 1. Upload para o Storage
      const fileName = `${Date.now()}_${file.name.replace(/\s/g, '_')}`;
      const filePath = `${user.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('consultorio')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // 2. Pegar URL Pública
      const { data: { publicUrl } } = supabase.storage
        .from('consultorio')
        .getPublicUrl(filePath);

      // 3. Salvar no Banco
      const { error: dbError } = await supabase.from('documents').insert({
        user_id: user.id,
        title,
        description,
        category,
        file_path: filePath,
        file_url: publicUrl
      });

      if (dbError) throw dbError;

      // Sucesso
      alert('Arquivo enviado com sucesso!');
      setIsModalOpen(false);
      setFile(null); setTitle(''); setDescription('');
      fetchDocuments();

    } catch (error) {
      console.error(error);
      alert('Erro ao fazer upload. Verifique se o Bucket "consultorio" foi criado e é público.');
    } finally {
      setUploading(false);
    }
  };

  // --- 3. EXCLUIR ARQUIVO ---
  const handleDelete = async (id: string, path: string) => {
    if (!confirm('Tem certeza que deseja excluir este arquivo?')) return;

    try {
      const { error: storageError } = await supabase.storage
        .from('consultorio')
        .remove([path]);
      
      if (storageError) console.error('Erro ao apagar do storage:', storageError);

      const { error: dbError } = await supabase.from('documents').delete().eq('id', id);
      if (dbError) throw dbError;

      fetchDocuments();
    } catch (error) {
      console.error(error);
      alert('Erro ao excluir documento.');
    }
  };

  // --- FILTRAGEM ---
  const filteredDocs = docs.filter(doc => {
    const matchesSearch = doc.title.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = categoryFilter === 'Todos' || doc.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="space-y-6 animate-in fade-in pb-20">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-5 rounded-2xl border border-nutri-100 shadow-sm">
        <div>
          <h1 className="text-2xl font-extrabold text-nutri-dark flex items-center gap-2">
            Biblioteca de Impressos
          </h1>
          <p className="text-sm text-gray-500">Materiais de apoio e lâminas para seus pacientes.</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-nutri-dark text-white px-5 py-2.5 rounded-xl font-bold hover:bg-black transition-all shadow-lg flex items-center gap-2"
        >
          <Upload className="w-4 h-4" /> Enviar Arquivo
        </button>
      </div>

      {/* FILTROS */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
          <input 
            type="text" 
            placeholder="Buscar por título..." 
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border rounded-xl outline-none focus:ring-2 focus:ring-nutri-primary"
          />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-2 md:pb-0">
          <button 
            onClick={() => setCategoryFilter('Todos')}
            className={`px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition-all ${categoryFilter === 'Todos' ? 'bg-nutri-primary text-white shadow' : 'bg-white border text-gray-500 hover:bg-gray-50'}`}
          >
            Todos
          </button>
          {CATEGORIES.map(cat => (
            <button 
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className={`px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition-all ${categoryFilter === cat ? 'bg-nutri-primary text-white shadow' : 'bg-white border text-gray-500 hover:bg-gray-50'}`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* GRID DE DOCUMENTOS */}
      {loading ? (
        <div className="flex justify-center p-12"><Loader2 className="animate-spin text-nutri-primary w-8 h-8"/></div>
      ) : filteredDocs.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-gray-200">
          <FolderOpen className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-gray-600">Nenhum documento encontrado</h3>
          <p className="text-gray-400 text-sm">Faça o upload do seu primeiro arquivo.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredDocs.map((doc) => (
            <div key={doc.id} className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all group flex flex-col justify-between h-full">
              
              <div className="flex items-start justify-between mb-4">
                <div className="bg-red-50 p-3 rounded-xl">
                  <FileText className="w-6 h-6 text-red-500" />
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button 
                    onClick={() => handleDelete(doc.id, doc.file_path)}
                    className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                    title="Excluir"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="mb-4">
                <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider mb-1 block">{doc.category}</span>
                <h3 className="font-bold text-gray-800 text-lg leading-tight mb-2 line-clamp-2">{doc.title}</h3>
                <p className="text-xs text-gray-500 line-clamp-2">{doc.description || 'Sem descrição.'}</p>
              </div>

              <a 
                href={doc.file_url} 
                target="_blank" 
                rel="noopener noreferrer" 
                download
                className="w-full flex items-center justify-center gap-2 bg-gray-50 text-gray-700 py-2.5 rounded-xl font-bold text-sm hover:bg-nutri-dark hover:text-white transition-all group-hover:shadow-md"
              >
                <Download className="w-4 h-4" /> Baixar PDF
              </a>
            </div>
          ))}
        </div>
      )}

      {/* MODAL DE UPLOAD */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl animate-in zoom-in duration-200">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center">
              <h2 className="text-xl font-bold text-gray-800">Enviar Documento</h2>
              <button onClick={() => setIsModalOpen(false)}><X className="w-6 h-6 text-gray-400 hover:text-red-500 transition-colors"/></button>
            </div>
            
            <div className="p-6 space-y-4">
              
              {/* Input File Customizado */}
              <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center hover:border-nutri-primary hover:bg-green-50/30 transition-all cursor-pointer relative">
                <input 
                  type="file" 
                  accept=".pdf,.doc,.docx"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <div className="flex flex-col items-center pointer-events-none">
                  <div className="bg-nutri-50 p-3 rounded-full mb-3">
                    <Upload className="w-6 h-6 text-nutri-primary" />
                  </div>
                  {file ? (
                    <p className="text-sm font-bold text-nutri-dark truncate max-w-[200px]">{file.name}</p>
                  ) : (
                    <>
                      <p className="text-sm font-bold text-gray-600">Clique para selecionar</p>
                      <p className="text-xs text-gray-400">PDF, DOC ou DOCX (Max 5MB)</p>
                    </>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Título</label>
                <input type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder="Ex: Dieta Low Carb" className="w-full border border-gray-300 rounded-lg p-3 outline-none focus:ring-2 focus:ring-nutri-primary" />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Categoria</label>
                <select value={category} onChange={e => setCategory(e.target.value)} className="w-full border border-gray-300 rounded-lg p-3 outline-none focus:ring-2 focus:ring-nutri-primary bg-white">
                  {CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Descrição (Opcional)</label>
                <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Breve descrição do conteúdo..." className="w-full border border-gray-300 rounded-lg p-3 outline-none focus:ring-2 focus:ring-nutri-primary h-20 resize-none" />
              </div>

              <button 
                onClick={handleUpload} 
                disabled={uploading}
                className="w-full py-3 bg-nutri-dark text-white font-bold rounded-xl hover:bg-black shadow-lg flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {uploading ? <Loader2 className="w-5 h-5 animate-spin"/> : <><Save className="w-4 h-4"/> Salvar Arquivo</>}
              </button>

            </div>
          </div>
        </div>
      )}
    </div>
  );
}
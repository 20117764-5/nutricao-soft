'use client';

import Link from 'next/link';
import { User, Briefcase, ChevronRight } from 'lucide-react';

export default function HomePage() {
  return (
    // Mantemos bg-white como base de segurança
    <div className="min-h-screen bg-white relative flex flex-col items-center justify-center p-6 overflow-hidden selection:bg-nutri-primary selection:text-white perspective-1000">
      
      {/* --- NOVO: IMAGEM DE FUNDO TELA INTEIRA (REFLEXO/TEXTURA) --- */}
      <div className="fixed inset-0 z-0 pointer-events-none select-none overflow-hidden">
         {/* IMPORTANTE: Salve sua imagem de reflexo na pasta /public com o nome 'background-ref.jpg'.
            Se for PNG, mude a extensão abaixo.
         */}
         <img
           src="/background-ref.png"
           alt=""
           // --- AJUSTE AQUI A INTENSIDADE DO REFLEXO ---
           // opacity-15: Altere este valor (ex: opacity-10, opacity-25) para mais ou menos intensidade.
           // mix-blend-overlay: Ajuda a "fundir" a imagem com o branco de forma elegante.
           // filter saturate-0: Deixa a imagem em preto e branco para não brigar com as cores do site (remova se quiser cor).
           className="w-full h-full object-cover opacity-85 mix-blend-overlay filter saturate-0 scale-105"
         />
         {/* Camada de "verniz" branco por cima para garantir que o fundo permaneça claro e sofisticado */}
         <div className="absolute inset-0 bg-white/90 mix-blend-lighten"></div>
      </div>

      {/* --- EFEITOS DE LUZ COLORIDA (Mantidos, mas mais suaves para complementar a imagem) --- */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-1">
        {/* Luz superior esquerda (Verde suave) */}
        <div className="absolute top-[-10%] left-[-10%] w-[600px] h-[600px] bg-nutri-primary/5 rounded-full blur-[120px] opacity-50 animate-pulse-slow" />
        {/* Luz inferior direita (Azul suave) */}
        <div className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] bg-blue-100/30 rounded-full blur-[120px] opacity-50" />
      </div>

      {/* --- CONTEÚDO PRINCIPAL (z-10 garante que fique na frente do fundo) --- */}
      <div className="relative z-10 w-full max-w-5xl flex flex-col items-center">
        
        {/* --- CABEÇALHO --- */}
        <div className="text-center mb-16 flex flex-col items-center animate-in fade-in slide-in-from-top-8 duration-1000">
          
           {/* LOGO GRANDE */}
          <div className="relative -mb-6 transform hover:scale-105 transition-transform duration-500 z-20">
             <img 
               src="/logo-grande2.png" 
               alt="Logo NutriSoft" 
               className="w-auto h-60 object-contain drop-shadow-2xl mx-auto"
               onError={(e) => {
                 e.currentTarget.style.display = 'none';
                 e.currentTarget.parentElement!.innerHTML = '<div class="w-64 h-24 bg-gray-100 rounded-xl flex items-center justify-center text-gray-400 font-bold border border-dashed border-gray-300">Sua Logo Aqui</div>';
               }}
             />
          </div>

          {/* SLOGAN METÁLICO */}
          <h1 className="relative z-30 text-4xl md:text-6xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-gray-600 via-gray-900 to-gray-600 drop-shadow-sm max-w-3xl leading-tight pb-2">
            Seu porto seguro <br className="hidden md:block"/> na nutrição
          </h1>
        </div>

        {/* --- GRID DE ACESSO --- */}
        <div className="relative w-full max-w-4xl group/grid">
          
          {/* CARDS */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative z-10 animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-200">
            
            {/* CARD PACIENTE */}
            <Link href="/paciente/login" className="group w-full">
              {/* Adicionei backdrop-blur-sm para o card desfocar levemente a imagem de fundo atrás dele */}
              <div className="bg-white/80 backdrop-blur-md p-8 rounded-3xl shadow-[0_20px_40px_-12px_rgba(0,0,0,0.1)] border border-white/50 hover:border-nutri-primary/30 hover:-translate-y-2 transition-all duration-500 h-full flex flex-col items-center text-center relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-nutri-primary to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                
                <div className="w-20 h-20 bg-nutri-50 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 group-hover:rotate-3 transition-all duration-500">
                  <User className="w-10 h-10 text-nutri-primary" />
                </div>
                
                <h2 className="text-2xl font-bold text-gray-800 mb-2 group-hover:text-nutri-primary transition-colors">Área do Paciente</h2>
                <p className="text-gray-500 mb-8 text-sm leading-relaxed">
                  Acesse seus planos, acompanhe sua evolução e fique conectado com seu nutricionista.
                </p>
                
                <div className="mt-auto inline-flex items-center gap-2 text-nutri-dark font-bold bg-gray-50 px-6 py-3 rounded-xl group-hover:bg-nutri-primary group-hover:text-white transition-all duration-300">
                  Acessar meu perfil <ChevronRight className="w-4 h-4" />
                </div>
              </div>
            </Link>

            {/* CARD NUTRICIONISTA */}
            <Link href="/login" className="group w-full">
              <div className="bg-nutri-dark p-8 rounded-3xl shadow-[0_20px_40px_-12px_rgba(0,0,0,0.3)] border border-transparent hover:shadow-[0_25px_50px_-12px_rgba(0,0,0,0.4)] hover:-translate-y-2 transition-all duration-500 h-full flex flex-col items-center text-center relative overflow-hidden">
                <div className="absolute -top-24 -right-24 w-48 h-48 bg-white/5 rounded-full blur-3xl pointer-events-none" />
                
                <div className="w-20 h-20 bg-white/10 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 group-hover:-rotate-3 transition-all duration-500 backdrop-blur-sm">
                  <Briefcase className="w-10 h-10 text-nutri-primary" />
                </div>
                
                <h2 className="text-2xl font-bold text-white mb-2">Sou Nutricionista</h2>
                <p className="text-white/60 mb-8 text-sm leading-relaxed">
                  Plataforma completa para gestão de consultório, cálculos e anamneses.
                </p>
                
                <div className="mt-auto inline-flex items-center gap-2 text-white font-bold bg-white/10 px-6 py-3 rounded-xl border border-white/5 group-hover:bg-white group-hover:text-nutri-dark transition-all duration-300">
                  Acessar sistema <ChevronRight className="w-4 h-4" />
                </div>
              </div>
            </Link>

          </div>
          
          {/* Sombra de chão para os cards flutuarem */}
          <div className="absolute -bottom-12 left-10 right-10 h-12 bg-black/20 blur-3xl rounded-[100%] z-0 pointer-events-none"></div>

        </div>

        <footer className="mt-24 text-gray-400 text-[10px] font-bold tracking-[0.2em] uppercase opacity-50 mix-blend-multiply">
          &copy; 2026 NutriDock System
        </footer>

      </div>
    </div>
  );
}
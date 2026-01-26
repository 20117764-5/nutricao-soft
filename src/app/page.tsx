'use client';

import Link from 'next/link';
import { User, Briefcase, ChevronRight, Leaf } from 'lucide-react';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-nutri-50 flex flex-col items-center justify-center p-6">
      
      {/* Logo e Boas-vindas */}
      <div className="text-center mb-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
        <div className="inline-flex items-center justify-center w-20 h-20 bg-nutri-primary rounded-3xl shadow-lg mb-6 text-white">
          <Leaf className="w-10 h-10" />
        </div>
        <h1 className="text-4xl font-extrabold text-nutri-dark tracking-tight">NutriSoft</h1>
        <p className="text-gray-600 mt-2 font-medium">Sua saúde guiada por tecnologia.</p>
      </div>

      {/* Grid de Acesso */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-4xl">
        
        {/* CARD PACIENTE */}
        <Link href="/paciente/login" className="group">
          <div className="bg-white p-8 rounded-2xl shadow-sm border-2 border-transparent hover:border-nutri-primary hover:shadow-xl transition-all duration-300 h-full flex flex-col items-center text-center">
            <div className="w-16 h-16 bg-nutri-100 rounded-full flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              <User className="w-8 h-8 text-nutri-primary" />
            </div>
            <h2 className="text-2xl font-bold text-gray-800 mb-3">Área do Paciente</h2>
            <p className="text-gray-500 mb-8 flex-grow">Acesse seu plano alimentar, histórico de consultas e evolução.</p>
            <div className="flex items-center gap-2 text-nutri-primary font-bold">
              Acessar meu perfil <ChevronRight className="w-5 h-5" />
            </div>
          </div>
        </Link>

        {/* CARD NUTRICIONISTA */}
        <Link href="/login" className="group">
          <div className="bg-nutri-dark p-8 rounded-2xl shadow-sm border-2 border-transparent hover:border-nutri-primary hover:shadow-xl transition-all duration-300 h-full flex flex-col items-center text-center text-white">
            <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              <Briefcase className="w-8 h-8 text-nutri-primary" />
            </div>
            <h2 className="text-2xl font-bold mb-3">Sou Nutricionista</h2>
            <p className="text-white/60 mb-8 flex-grow">Gestão de pacientes, agenda inteligente e controle financeiro.</p>
            <div className="flex items-center gap-2 text-nutri-primary font-bold">
              Entrar no sistema <ChevronRight className="w-5 h-5" />
            </div>
          </div>
        </Link>

      </div>

      <footer className="mt-16 text-gray-400 text-sm">
        &copy; 2026 DigitalRise Solutions. Todos os direitos reservados.
      </footer>
    </div>
  );
}
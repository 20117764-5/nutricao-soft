'use client';

import Link from 'next/link';
import { useState } from 'react';
import { 
  ChevronDown, 
  User, 
  Calendar, 
  FileText, 
  Printer, 
  DollarSign, 
  ClipboardList 
} from 'lucide-react';

export default function AdminHeader() {
  const [isConsultorioOpen, setIsConsultorioOpen] = useState(false);

  return (
    <header className="bg-white border-b border-nutri-100 shadow-sm sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          
          {/* Logo */}
          <div className="flex-shrink-0 flex items-center gap-2">
            <div className="w-8 h-8 bg-nutri-primary rounded-lg flex items-center justify-center text-white font-bold shadow-sm">
              N
            </div>
            <span className="text-xl font-bold text-nutri-dark tracking-tight">NutriSoft</span>
          </div>

          {/* Navegação */}
          <nav className="hidden md:flex space-x-8 items-center">
            
            {/* Dropdown Consultório */}
            <div className="relative group">
              <button 
                onClick={() => setIsConsultorioOpen(!isConsultorioOpen)}
                onBlur={() => setTimeout(() => setIsConsultorioOpen(false), 200)} // Fecha ao clicar fora
                className="flex items-center gap-1 text-gray-600 hover:text-nutri-primary font-medium px-3 py-2 rounded-md transition-colors outline-none"
              >
                Consultório
                <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isConsultorioOpen ? 'rotate-180' : ''}`} />
              </button>

              {/* Menu Flutuante */}
              <div 
                className={`absolute left-0 mt-2 w-56 rounded-xl shadow-lg bg-white ring-1 ring-black ring-opacity-5 transition-all duration-200 ease-in-out transform origin-top-left ${
                  isConsultorioOpen ? 'opacity-100 scale-100 visible' : 'opacity-0 scale-95 invisible'
                }`}
              >
                <div className="py-2">
                  <Link href="/admin/consultorio/pacientes" className="flex items-center px-4 py-2.5 text-sm text-gray-700 hover:bg-nutri-50 hover:text-nutri-primary transition-colors">
                    <User className="mr-3 h-4 w-4 text-nutri-primary" />
                    Pacientes
                  </Link>
                  <Link href="/admin/consultorio/agendamentos" className="flex items-center px-4 py-2.5 text-sm text-gray-700 hover:bg-nutri-50 hover:text-nutri-primary transition-colors">
                    <Calendar className="mr-3 h-4 w-4 text-nutri-primary" />
                    Agendamentos
                  </Link>
                  <Link href="/admin/consultorio/pre-consulta" className="flex items-center px-4 py-2.5 text-sm text-gray-700 hover:bg-nutri-50 hover:text-nutri-primary transition-colors">
                    <ClipboardList className="mr-3 h-4 w-4 text-nutri-primary" />
                    Pré-consulta
                  </Link>
                  <Link href="/admin/consultorio/respostas" className="flex items-center px-4 py-2.5 text-sm text-gray-700 hover:bg-nutri-50 hover:text-nutri-primary transition-colors">
                    <FileText className="mr-3 h-4 w-4 text-nutri-primary" />
                    Respostas
                  </Link>
                  <Link href="/admin/consultorio/financeiro" className="flex items-center px-4 py-2.5 text-sm text-gray-700 hover:bg-nutri-50 hover:text-nutri-primary transition-colors">
                    <DollarSign className="mr-3 h-4 w-4 text-nutri-primary" />
                    Financeiro
                  </Link>
                  <Link href="/admin/consultorio/impressos" className="flex items-center px-4 py-2.5 text-sm text-gray-700 hover:bg-nutri-50 hover:text-nutri-primary transition-colors">
                    <Printer className="mr-3 h-4 w-4 text-nutri-primary" />
                    Impressos
                  </Link>
                </div>
              </div>
            </div>

            <Link href="/admin/configuracoes" className="text-gray-600 hover:text-nutri-primary font-medium transition-colors">
              Configurações
            </Link>
          </nav>

          {/* Perfil */}
          <div className="flex items-center gap-3 pl-4 border-l border-gray-200">
             <div className="text-right hidden sm:block">
                <p className="text-sm font-semibold text-gray-900">Dr. Thiago</p>
                <p className="text-xs text-nutri-primary font-medium">Nutricionista</p>
             </div>
             <div className="h-9 w-9 rounded-full bg-nutri-100 flex items-center justify-center text-nutri-dark font-bold border-2 border-white shadow-sm cursor-pointer hover:bg-nutri-200 transition-colors">
               TV
             </div>
          </div>
        </div>
      </div>
    </header>
  );
}
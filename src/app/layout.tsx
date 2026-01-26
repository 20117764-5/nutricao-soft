import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css"; // Importa o CSS que está na mesma pasta

// Configura a fonte Inter do Google Fonts
const inter = Inter({ subsets: ["latin"] });

// Metadados da aplicação (Título e Descrição para o navegador/Google)
export const metadata: Metadata = {
  title: "NutriSoft - Gestão para Nutricionistas",
  description: "Software de gestão para nutricionistas desenvolvido pela DigitalRise.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      {/* Aplica a classe da fonte (inter.className) 
        e o fundo padrão (bg-nutri-50) em todo o site 
      */}
      <body className={`${inter.className} bg-nutri-50 text-gray-800 antialiased`}>
        {children}
      </body>
    </html>
  );
}
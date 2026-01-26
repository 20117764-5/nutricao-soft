import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        nutri: {
          50: '#f2fcf5',   // Fundo geral suave
          100: '#e1f8e8',  // Detalhes claros
          200: '#c6f6d5',
          300: '#9ae6b4',
          primary: '#22c55e', // Verde Principal (Botões)
          dark: '#14532d',    // Verde Escuro (Texto forte)
          accent: '#f97316',  // Laranja (Avisos/Ações secundárias)
        },
        // Cores semânticas para o sistema de agendamento
        status: {
          confirmado: '#84cc16', // Lime-500
          agendado: '#9ca3af',   // Gray-400
          desmarcado: '#ef4444', // Red-500
        }
      },
    },
  },
  plugins: [],
};
export default config;
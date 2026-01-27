// src/data/standardForms.ts

export type FormType = 'standard_list' | 'standard_grid' | 'standard_scale';

export interface StandardQuestion {
  id: string;
  text: string;
  options?: string[]; // Para múltipla escolha
}

export interface StandardSection {
  title: string;
  description?: string;
  maxScore?: number; // Para QRM
  items: StandardQuestion[];
  scale?: string[]; // Para Grid ou Escala (ex: 0, 1-3, 4-6...)
}

export interface StandardFormConfig {
  id: string;
  title: string;
  description: string;
  type: FormType;
  sections: StandardSection[];
  scaleLabels?: { value: number; label: string }[]; // Para escalas numéricas (Likert)
}

export const STANDARD_FORMS: Record<string, StandardFormConfig> = {
  'disbiose': {
    id: 'disbiose',
    title: 'Risco de Disbiose',
    description: 'Avaliação de hábitos e sintomas relacionados à saúde intestinal.',
    type: 'standard_list',
    sections: [
      {
        title: 'Questionário',
        items: [
          { id: 'd1', text: 'Você tem mais de 60 anos?', options: ['Sim', 'Não'] },
          { id: 'd2', text: 'De qual tipo de parto você nasceu?', options: ['Cesárea', 'Parto normal', 'Não sei informar'] },
          { id: 'd3', text: 'Você foi amamentado?', options: ['Não', 'Sim, por menos de 6 meses', 'Sim, por 6 meses ou mais', 'Não sei informar'] },
          { id: 'd4', text: 'Quantas vezes você consome frutas, verduras, legumes e/ou cereais integrais ao dia? (Não considerar geleias e frutas em calda)', options: ['Menos de 1x ao dia', '1 a 2x ao dia', '3 a 4x ao dia', '5x ao dia ou mais'] },
          { id: 'd5', text: 'Quantas vezes por semana você consome preparações caseiras com adição de açúcar refinado ou adoçantes artificiais?', options: ['Mais de 5x por semana', '4 a 5x por semana', '2 a 3x por semana', 'Menos de 1x por semana'] },
          { id: 'd6', text: 'Quantas vezes por semana você consome alimentos industrializados?', options: ['Mais de 5x por semana', '4 a 5x por semana', '2 a 3x por semana', 'Menos de 1x por semana'] },
          { id: 'd7', text: 'Consome bebida alcoólica? Em caso positivo, quantas doses por semana?', options: ['Sim, acima de 4 doses', 'Sim, 3 a 4 doses', 'Sim, 1 a 2 doses', 'Não consumo'] },
          { id: 'd8', text: 'Com qual frequência você pratica exercícios físicos atualmente? (Mínimo 30 min/dia)', options: ['Não pratico', '1x por semana', '2x por semana', '3x por semana ou mais'] },
          { id: 'd9', text: 'Como você avalia seu nível de estresse físico ou mental atual?', options: ['Muito alto', 'Alto', 'Moderado', 'Baixo'] },
          { id: 'd10', text: 'Você é fumante?', options: ['Sim', 'Não'] },
          { id: 'd11', text: 'Você utilizou antibióticos nos últimos 3 meses?', options: ['Sim', 'Não'] },
          { id: 'd12', text: 'Você utilizou protetores gástricos, laxantes, anti-inflamatórios, corticoides e/ou metformina nos últimos 60 dias?', options: ['Sim', 'Não'] },
          { id: 'd13', text: 'Você está utilizando suplementação de prebióticos, probióticos e/ou simbióticos atualmente?', options: ['Sim', 'Não'] },
          { id: 'd14', text: 'Você tem alguma das seguintes enfermidades? (Diabetes, Obesidade, Gastrite, etc.)', options: ['Sim, 3 ou mais itens', 'Sim, 2 itens', 'Sim, 1 item', 'Não'] },
          { id: 'd15', text: 'Você apresenta quadro de diarreia ou constipação atualmente?', options: ['Sim', 'Não'] },
          { id: 'd16', text: 'Você passou por cirurgia nos últimos 60 dias ou já fez cirurgia bariátrica?', options: ['Sim', 'Não'] },
          { id: 'd17', text: 'Você está fazendo quimioterapia ou radioterapia?', options: ['Sim', 'Não'] },
        ]
      }
    ]
  },
  'frequencia_alimentar': {
    id: 'frequencia_alimentar',
    title: 'Frequência Alimentar',
    description: 'Marque a quantidade de porções que você consome semanalmente.',
    type: 'standard_grid',
    sections: [
      {
        title: 'Leites e Derivados',
        scale: ['0', '1-3', '4-6', '7-9', '10+'],
        items: [
            { id: 'fa1', text: 'Leite (copo de requeijão)' },
            { id: 'fa2', text: 'Iogurte natural (copo de requeijão)' },
            { id: 'fa3', text: 'Queijos (1/2 fatia)' },
            { id: 'fa4', text: 'Requeijão / Crême de ricota etc (1,5 colher de sopa)' },
        ]
      },
      {
        title: 'Carnes e Ovos',
        scale: ['0', '1-3', '4-6', '7-9', '10+'],
        items: [
            { id: 'fa5', text: 'Ovo cozido / mexido (2 unidades)' },
            { id: 'fa6', text: 'Carnes vermelhas (1 unidade)' },
            { id: 'fa7', text: 'Carnes de Porco (1 fatia)' },
            { id: 'fa8', text: 'Frango - filé, sobrecoxa, peito (1 unidade)' },
            { id: 'fa9', text: 'Peixe fresco / Frutos do Mar (1 unidade)' },
        ]
      },
      {
        title: 'Óleos',
        scale: ['0', '1-3', '4-6', '7-9', '10+'],
        items: [
            { id: 'fa10', text: 'Azeite (1 colher de sopa)' },
            { id: 'fa11', text: 'Bacon e toucinho / banha (1/2 fatia)' },
            { id: 'fa12', text: 'Frituras' },
            { id: 'fa13', text: 'Manteiga / Margarina (1/2 colher de sopa)' },
            { id: 'fa14', text: 'Maionese (1/2 colher de sopa)' },
            { id: 'fa15', text: 'Óleos vegetais (1 colher de sopa)' },
        ]
      },
      {
        title: 'Cereais e Leguminosas',
        scale: ['0', '1-3', '4-6', '7-9', '10+'],
        items: [
            { id: 'fa16', text: 'Arroz Branco / Integral (4 colheres de sopa)' },
            { id: 'fa17', text: 'Aveia (4 colheres de sopa)' },
            { id: 'fa18', text: 'Pão francês / Integral / Forma (1 unidade)' },
            { id: 'fa19', text: 'Macarrão (3 colheres e 1/2 de sopa)' },
            { id: 'fa20', text: 'Bolos caseiros (1 fatia pequena)' },
            { id: 'fa21', text: 'Leguminosas (1 concha)' },
            { id: 'fa22', text: 'Soja (1 colher de servir)' },
            { id: 'fa23', text: 'Oleaginosas (castanha/nozes/amendoim) (1 colher de sopa)' },
        ]
      },
      {
        title: 'Frutas/Verduras/Legumes',
        scale: ['0', '1-3', '4-6', '7-9', '10+'],
        items: [
            { id: 'fa24', text: 'Fruta in natura (1 unidade/fatia)' },
            { id: 'fa25', text: 'Folhosos (10 folhas)' },
            { id: 'fa26', text: 'Tubérculos (batatas/cenoura/beterraba) (2 colheres de sopa)' },
            { id: 'fa27', text: 'Legumes (abobora/chuchu/tomate/pepino) (2 colheres de sopa)' },
        ]
      },
      {
        title: 'Petiscos embutidos Enlatados',
        scale: ['0', '1-3', '4-6', '7-9', '10+'],
        items: [
            { id: 'fa28', text: 'Snacks - salgadinhos, bolachas, pizza, amendoim (1 pacote)' },
            { id: 'fa29', text: 'Macarrão instantâneo / lazanha / Nuggets (1 pacote)' },
            { id: 'fa30', text: 'Embutidos em geral (presunto, mortadela etc) (2 fatias)' },
            { id: 'fa31', text: 'Enlatados (milho, ervilha, palmito, azeitona) (2 colheres de sopa)' },
        ]
      },
      {
        title: 'Sobremesas e Doces',
        scale: ['0', '1-3', '4-6', '7-9', '10+'],
        items: [
            { id: 'fa32', text: 'Sorvete (1 unidade ou 2 bolas)' },
            { id: 'fa33', text: 'Tortas e Doces Elaborados (1 fatia)' },
            { id: 'fa34', text: 'Chocolates (1 unidade)' },
            { id: 'fa35', text: 'Balas (1 unidade)' },
        ]
      },
      {
        title: 'Bebidas',
        scale: ['0', '1-3', '4-6', '7-9', '10+'],
        items: [
            { id: 'fa36', text: 'Água (1 garrafa 510 ml)' },
            { id: 'fa37', text: 'Café sem açúcar (1 xícara café)' },
            { id: 'fa38', text: 'Suco Natural / Chás sem açúcar (copo de requeijão)' },
            { id: 'fa39', text: 'Refrigerante normal (copo de requeijao)' },
            { id: 'fa40', text: 'Café / Chá com açúcar (1 xícara café)' },
            { id: 'fa41', text: 'Suco Natural Adoçado (copo de requeijao)' },
            { id: 'fa42', text: 'Sucos de Caixinha (copo de requeijao)' },
        ]
      }
    ]
  },
  'cafeina': {
    id: 'cafeina',
    title: 'Questionário Cafeína',
    description: 'Avalie a probabilidade dos efeitos da cafeína em você (1 = Muito improvável, 6 = Muito provável).',
    type: 'standard_scale',
    scaleLabels: [
      { value: 1, label: 'Muito improvável' },
      { value: 2, label: 'Improvável' },
      { value: 3, label: 'Um pouco improvável' },
      { value: 4, label: 'Um pouco provável' },
      { value: 5, label: 'Provável' },
      { value: 6, label: 'Muito provável' },
    ],
    sections: [
      {
        title: 'Efeitos da Cafeína',
        items: [
          { id: 'c1', text: 'Cafeína/café me dá ânimo quando estou cansado(a).' },
          { id: 'c2', text: 'Cafeína/café melhora meu desempenho físico.' },
          { id: 'c3', text: 'A cafeína/café tira minha fome.' },
          { id: 'c4', text: 'Cafeína/café melhora meu humor.' },
          { id: 'c5', text: 'Eu fico ansioso(a) quando não tomo cafeína/café.' },
          { id: 'c6', text: 'Eu me exercito melhor depois de tomar cafeína/café.' },
          { id: 'c7', text: 'Eu sinto muita falta de cafeína/café quando não tomo.' },
          { id: 'c8', text: 'Eu não gosto do jeito que me sinto após tomar cafeína/café.' },
          { id: 'c9', text: 'Tomar cafeína/café a qualquer hora do dia atrapalha o meu sono.' },
          { id: 'c10', text: 'Quando tomo cafeína/café fico nervoso(a).' },
          { id: 'c11', text: 'Cafeína/café melhora minha concentração.' },
          { id: 'c12', text: 'Cafeína/café me faz pular refeições.' },
          { id: 'c13', text: 'Tomar cafeína/café na hora de dormir atrapalha meu sono.' },
          { id: 'c14', text: 'Cafeína/café me faz sentir irritado(a).' },
          { id: 'c15', text: 'Cafeína/café me faz sentir feliz.' },
          { id: 'c16', text: 'Eu não funciono sem tomar cafeína/café.' },
          { id: 'c17', text: 'Tomar cafeína/café no final da tarde atrapalha o meu sono.' },
          { id: 'c18', text: 'Eu fico mais extrovertido(a) quando tomo cafeína/café.' },
          { id: 'c19', text: 'Cafeína/café me ajuda a me exercitar por mais tempo.' },
          { id: 'c20', text: 'Cafeína/café me faz sentir com mais energia.' },
          { id: 'c21', text: 'Cafeína/café diminui o meu apetite.' },
        ]
      }
    ]
  },
  'cronotipo': {
    id: 'cronotipo',
    title: 'Questionário Cronotipo',
    description: 'Descubra seu perfil de sono e atividade.',
    type: 'standard_list',
    sections: [
      {
        title: 'Avaliação de Cronotipo',
        items: [
          { id: 'cr1', text: 'Em qual horário você acordaria se tivesse total liberdade para planejar o seu dia?', options: ['05h às 06h29', '06h30 às 07h44', '07h45 às 09h44', '09h45 às 10h59', '11h às 11h59', '12h às 05h'] },
          { id: 'cr2', text: 'Em qual horário você iria dormir se tivesse total liberdade para planejar a sua noite?', options: ['20h às 20h59', '21h às 22h14', '22h15 às 00h29', '00h30 às 01h44', '01:45h às 02h59', '03h às 20h'] },
          { id: 'cr3', text: 'Até que ponto você depende do despertador para acordar de manhã?', options: ['Não dependo', 'Não dependo muito', 'Dependo razoavelmente', 'Dependo extremamente'] },
          { id: 'cr4', text: 'Você acha fácil acordar pela manhã?', options: ['Nada fácil', 'Nada muito fácil', 'Razoavelmente fácil', 'Extremamente fácil'] },
          { id: 'cr5', text: 'Você se sente alerta na primeira meia hora depois de acordar?', options: ['Nada alerta', 'Levemente alerta', 'Razoavelmente alerta', 'Extremamente alerta'] },
          { id: 'cr6', text: 'Como é o seu apetite durante a primeira meia hora depois de acordar?', options: ['Nem um pouco com fome', 'Levemente faminto', 'Razoavelmente faminto', 'Extremamente faminto'] },
          { id: 'cr7', text: 'Como você se sente na primeira meia hora depois de acordar?', options: ['Muito cansado', 'Razoavelmente cansado', 'Razoavelmente revigorado', 'Extremamente revigorado'] },
          { id: 'cr8', text: 'Considerando que você não tenha nenhum compromisso no dia seguinte, a que horas você iria dormir comparado com o seu horário habitual?', options: ['Nunca mais tarde do habitual', 'Menos que uma hora mais tarde do habitual', 'De 1h a 2h mais tarde do habitual', 'Mais que 2h mais tarde do habitual'] },
          { id: 'cr9', text: 'Você decidiu começar a fazer exercícios. Um amigo sugeriu o horário das 07h às 08h da manhã, duas vezes por semana. Considerando seu bem-estar, o que você acha de fazer exercícios nesse horário?', options: ['Estaria em boa forma', 'Estaria razoavelmente em forma', 'Acharia difícil', 'Acharia muito díficil'] },
          { id: 'cr10', text: 'Em qual horário você se sente cansado e com vontade de dormir?', options: ['20h às 20h59', '21h às 22h14', '22h15 às 00h44', '00h45 às 01h59', '02h às 03h'] },
          { id: 'cr11', text: 'Você deseja estar em seu melhor desempenho para realizar um teste que terá duração de duas horas e será mentalmente cansativo. Considerando seu bem-estar, em qual desses horários você realizaria o teste?', options: ['08h às 10h', '11h às 13h', '15h às 17h', '19h às 21h'] },
          { id: 'cr12', text: 'Se você fosse se deitar às 23h, em que nível de cansaço você estaria?', options: ['Nem um pouco cansado', 'Um pouco cansado', 'Razoavelmente cansado', 'Extremamente cansado'] },
          { id: 'cr13', text: 'Por algum motivo, você foi dormir algumas horas depois do habitual. Se no dia seguinte você não tiver nenhum compromisso, qual das alternativas você estaria mais propenso a seguir?', options: ['Acordaria no horário habitual, e não voltaria a dormir', 'Acordaria no horário habitual, mas iria tirar um cochilo depois de acordar', 'Acordaria no horário habitual, mas dormiria novamente', 'Acordaria mais tarde do que o habitual'] },
          { id: 'cr14', text: 'Se você precisar ficar acordado das 04h às 06h da manhã para realizar uma tarefa e não tiver compromisso no dia seguinte, qual das alternativas você estaria mais propenso a seguir?', options: ['Não iria para cama até que a tarefa fosse finalizada', 'Iria tirar um cochilo antes da tarefa e dormiria depois', 'Dormiria bastante antes da tarefa e tiraria um cochilo depois', 'Só dormiria antes de realizar a tarefa'] },
          { id: 'cr15', text: 'Considerando o seu bem-estar, se você tiver que fazer duas horas de exercício físico pesado, em qual desses horários escolheria para realizar?', options: ['08h às 10h', '11h às 13h', '15h às 17h', '19h às 21h'] },
          { id: 'cr16', text: 'Você decidiu começar a fazer exercícios. Um amigo sugeriu o horário das 22h às 23h da noite, duas vezes por semana. Considerando seu bem-estar, o que você acha de fazer exercícios nesse horário?', options: ['Estaria em boa forma', 'Estaria razoavelmente em forma', 'Acharia difícil', 'Acharia muito díficil'] },
          { id: 'cr17', text: 'Suponha que você possa escolher seu próprio horário de trabalho e que você deva trabalhar cinco horas consecutivas por dia, qual das alternativas você estaria mais propenso a seguir?', options: ['Começando entre: 04h às 07h59', 'Começando entre: 08h às 08h59', 'Começando entre: 09h às 13h59', 'Começando entre: 14h às 16h59', 'Começando entre: 17h às 03h59'] },
          { id: 'cr18', text: 'Em qual horário do dia você acredita que atinge o seu auge de bem-estar?', options: ['5h às 07h59', '08h às 09h59', '10h às 16h59', '17h às 21h59', '22h às 04h59'] },
          { id: 'cr19', text: 'Ouve-se falar de pessoas matutinas e vespertinas. Como qual desses tipos você mais se identifica?', options: ['Definitivamente matutino', 'Mais matutino que vespertino', 'Mais vespertino que matutino', 'Definitivamente vespertino'] },
        ]
      }
    ]
  },
  'fenotipo': {
    id: 'fenotipo',
    title: 'Fenótipo Alimentar (EFCA)',
    description: 'Entenda seu comportamento alimentar (1 = Nunca, 5 = Sempre).',
    type: 'standard_scale',
    scaleLabels: [
      { value: 1, label: 'Nunca' },
      { value: 2, label: 'Raramente' },
      { value: 3, label: 'Às vezes' },
      { value: 4, label: 'Quase sempre' },
      { value: 5, label: 'Sempre' },
    ],
    sections: [
      {
        title: 'Escala de Fenótipos',
        items: [
          { id: 'f1', text: 'Como até me sentir muito cheio.' },
          { id: 'f2', text: 'Acalmo as minhas emoções com comida.' },
          { id: 'f3', text: 'Peço mais comida quando termino meu prato.' },
          { id: 'f4', text: 'Tenho o hábito de beliscar (pequenas ingestões sem medir quantidade).' },
          { id: 'f5', text: 'Quando começo a comer algo que gosto muito, tenho dificuldade em parar.' },
          { id: 'f6', text: 'Eu costumo comer mais de um prato nas refeições principais.' },
          { id: 'f7', text: 'Belisco entre as refeições por ansiedade, tédio, solidão, medo, raiva, tristeza e/ou cansaço.' },
          { id: 'f8', text: 'Sinto-me tentado a comer quando vejo/cheiro comida que gosto e/ou quando passo em frente a um quiosque/padaria.' },
          { id: 'f9', text: 'Não tomo a refeição do café da manhã todos os dias.' },
          { id: 'f10', text: 'Como, nos momentos em que estou: aborrecido, ansioso, nervoso, triste, cansado e/ou sozinho.' },
          { id: 'f11', text: 'Pulo algumas ou pelo menos uma das refeições principais.' },
          { id: 'f12', text: 'Quando estou diante de algo que gosto muito, mesmo que não tenha fome, acabo por comê-la.' },
          { id: 'f13', text: 'Como muita comida em pouco tempo.' },
          { id: 'f14', text: 'Quando como algo que gosto, finalizo toda a porção.' },
          { id: 'f15', text: 'Quando como algo que gosto muito, como muito rápido.' },
          { id: 'f16', text: 'Passo mais de 5h no dia sem comer.' },
        ]
      }
    ]
  },
   'qrm': {
    id: 'qrm',
    title: 'Rastreamento Metabólico',
    description: 'Avalie a frequência e severidade de sintomas (0 a 4).',
    type: 'standard_scale',
    scaleLabels: [
      { value: 0, label: 'Nunca' },
      { value: 1, label: 'Ocasionalmente leve' },
      { value: 2, label: 'Ocasionalmente severo' },
      { value: 3, label: 'Frequentemente leve' },
      { value: 4, label: 'Frequentemente severo' },
    ],
    sections: [
        {
            title: 'Cabeça',
            maxScore: 16,
            items: [{ id: 'q1', text: 'Dor de cabeça' }, { id: 'q2', text: 'Sensação de desmaio' }, { id: 'q3', text: 'Tonturas' }, { id: 'q4', text: 'Insônia' }]
        },
        {
            title: 'Olhos',
            maxScore: 16,
            items: [{ id: 'q5', text: 'Olhos lacrimejantes ou coçando' }, { id: 'q6', text: 'Olhos inchados' }, { id: 'q7', text: 'Bolsas ou olheiras' }, { id: 'q8', text: 'Visão borrada' }]
        },
        {
            title: 'Ouvidos',
            maxScore: 16,
            items: [{ id: 'q9', text: 'Coceira nos ouvidos' }, { id: 'q10', text: 'Dores de ouvido' }, { id: 'q11', text: 'Retirada de fluido' }, { id: 'q12', text: 'Zunido' }]
        },
        {
            title: 'Nariz',
            maxScore: 20,
            items: [{ id: 'q13', text: 'Nariz entupido' }, { id: 'q14', text: 'Sinusite' }, { id: 'q15', text: 'Corrimento nasal' }, { id: 'q16', text: 'Espirros' }, { id: 'q17', text: 'Muco excessivo' }]
        },
        {
            title: 'Boca e Garganta',
            maxScore: 20,
            items: [{ id: 'q18', text: 'Tosse crônica' }, { id: 'q19', text: 'Limpar a garganta' }, { id: 'q20', text: 'Dor de garganta' }, { id: 'q21', text: 'Gengivas inchadas' }, { id: 'q22', text: 'Aftas' }]
        },
        {
            title: 'Pele',
            maxScore: 20,
            items: [{ id: 'q23', text: 'Acne' }, { id: 'q24', text: 'Erupções/Pele seca' }, { id: 'q25', text: 'Perda de cabelo' }, { id: 'q26', text: 'Vermelhidão/Calorões' }, { id: 'q27', text: 'Suor excessivo' }]
        },
        {
            title: 'Coração',
            maxScore: 12,
            items: [{ id: 'q28', text: 'Batimentos irregulares' }, { id: 'q29', text: 'Batimentos rápidos' }, { id: 'q30', text: 'Dor no peito' }]
        },
        {
            title: 'Pulmões',
            maxScore: 16,
            items: [{ id: 'q31', text: 'Congestão no peito' }, { id: 'q32', text: 'Asma/Bronquite' }, { id: 'q33', text: 'Pouco fôlego' }, { id: 'q34', text: 'Dificuldade resp.' }]
        },
        {
            title: 'Trato digestivo',
            maxScore: 28,
            items: [{ id: 'q35', text: 'Náuseas/Vômito' }, { id: 'q36', text: 'Diarreia' }, { id: 'q37', text: 'Constipação' }, { id: 'q38', text: 'Inchaço abdominal' }, { id: 'q39', text: 'Gases/Arrotos' }, { id: 'q40', text: 'Azia' }, { id: 'q41', text: 'Dor estomacal' }]
        },
        {
            title: 'Articulações / Músculos',
            maxScore: 20,
            items: [{ id: 'q42', text: 'Dores articulares' }, { id: 'q43', text: 'Artrite / artrose' }, { id: 'q44', text: 'Rigidez' }, { id: 'q45', text: 'Dores musculares' }, { id: 'q46', text: 'Fraqueza' }]
        },
        {
            title: 'Energia / Atividade',
            maxScore: 16,
            items: [{ id: 'q47', text: 'Fadiga' }, { id: 'q48', text: 'Apatia' }, { id: 'q49', text: 'Hiperatividade' }, { id: 'q50', text: 'Dificuldade descanso' }]
        },
        {
            title: 'Mente',
            maxScore: 32,
            items: [{ id: 'q51', text: 'Memória ruim' }, { id: 'q52', text: 'Confusão mental' }, { id: 'q53', text: 'Concentração ruim' }, { id: 'q54', text: 'Coordenação fraca' }, { id: 'q55', text: 'Dif. decisões' }, { id: 'q56', text: 'Gagueira' }, { id: 'q57', text: 'Fala confusa' }, { id: 'q58', text: 'Problemas aprendizagem' }]
        },
        {
            title: 'Emoções',
            maxScore: 16,
            items: [{ id: 'q59', text: 'Mudanças humor' }, { id: 'q60', text: 'Ansiedade' }, { id: 'q61', text: 'Raiva' }, { id: 'q62', text: 'Depressão' }]
        },
        {
            title: 'Outros',
            maxScore: 16,
            items: [{ id: 'q63', text: 'Freq. doente' }, { id: 'q64', text: 'Vontade urinar urgente' }, { id: 'q65', text: 'Coceira genital' }, { id: 'q66', text: 'Edema / Inchaço' }]
        },
    ]
  },
};
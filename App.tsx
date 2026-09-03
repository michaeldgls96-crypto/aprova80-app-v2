import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import {
  Flame, CheckCircle, Zap, ShieldCheck, Home, 
  AlertTriangle, ChevronRight, ChevronLeft, FileText, BookOpen, 
  X, Download, PieChart, Layers, Filter, Printer, 
  Smartphone, Mail, KeyRound, LogOut, Lock, PenLine, MessageCircle, Send, Eye, EyeOff
} from 'lucide-react';

// INTERFACES
interface Option {
  letter: string;
  text: string;
}

interface Question {
  id: string;
  discipline: string;
  topic: string;
  statement: string;
  options: Option[];
  correctAnswer: string;
  explanation?: string;
}

interface QuestionComment {
  id: string;
  question_id: string;
  user_email: string;
  comment_text: string;
  created_at: string;
}

interface Material {
  id: string;
  title: string;
  discipline: string;
  type: string; // 'resumo' | 'mapa_mental'
  topic: string;
  content: string;
  url: string;
}

// ESTRUTURA DE MATÉRIAS E SEUS TÓPICOS
const ESTRUTURA_MATERIAS: Record<string, string[]> = {
  'Todas': ['Todos'],
  'Língua Portuguesa': ['Todos', 'Compreensão e Interpretação de Textos', 'Acentuação Gráfica', 'Ortografia Oficial', 'Crase', 'Crase e Regência', 'Concordância Verbal', 'Concordância Nominal', 'Regência Verbal e Nominal', 'Colocação Pronominal', 'Pontuação', 'Sintaxe do Período', 'Classes de Palavras'],
  'Raciocínio Lógico': ['Todos', 'Lógica de Proposições', 'Equivalências Lógicas', 'Estruturas Lógicas e Diagramas', 'Análise Combinatória', 'Probabilidade', 'Sequências e Padrões Numéricos'],
  'Informática': ['Todos', 'Segurança da Informação', 'Malwares', 'Backup', 'Hardware - Armazenamento', 'Correio Eletrônico', 'Criptografia', 'Sistemas Operacionais', 'Redes de Computadores e Internet', 'Pacote Office', 'Computação em Nuvem'],
  'Direito Penal': ['Todos', 'Excludentes de Ilicitude', 'Crimes Contra a Pessoa', 'Crimes Contra o Patrimônio', 'Crimes Contra a Administração Pública', 'Teoria do Crime', 'Concurso de Pessoas', 'Aplicação da Pena', 'Crimes Contra a Dignidade Sexual', 'Crimes Contra a Fé Pública', 'Extinção da Punibilidade', 'Crimes Contra a Incolumidade Pública', 'Feminicídio (Lei 14.994/2024)'],
  'Processo Penal': ['Todos', 'Inquérito Policial', 'Prisão e Liberdade', 'Ação Penal', 'Sistema de Provas', 'Nulidades Processuais', 'Recursos'],
  'Direito Constitucional': ['Todos', 'Remédios Constitucionais', 'Direitos e Garantias Fundamentais', 'Princípios Fundamentais', 'Organização do Estado', 'Poderes Executivo, Legislativo e Judiciário', 'Controle de Constitucionalidade'],
  'Direito Administrativo': ['Todos', 'Atos Administrativos', 'Organização Administrativa', 'Princípios da Administração Pública', 'Poderes Administrativos', 'Licitações e Contratos', 'Responsabilidade Civil do Estado', 'Agentes Públicos'],
  'Legislação Extravagante': ['Todos', 'Lei de Abuso de Autoridade', 'Lei de Drogas', 'Lei Maria da Penha', 'ECA', 'Estatuto do Idoso', 'Estatuto do Desarmamento', 'Lei de Tortura', 'Crimes Hediondos', 'Racismo', 'LEP', 'CTB', 'Deficientes', 'Lei 9099'],
  'Direitos Humanos': ['Todos', 'Declaração Universal dos Direitos Humanos', 'Convenção Americana de Direitos Humanos (Pacto de São José)', 'Convenção de Belém do Pará', 'Sistema Interamericano de Proteção']
};

const LISTA_DISCIPLINAS = Object.keys(ESTRUTURA_MATERIAS).filter(m => m !== 'Todas');

const shuffleArray = <T,>(array: T[]): T[] => {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

// RENDERIZADOR SIMPLES DE TEXTO FORMATADO (SEM DEPENDÊNCIA EXTERNA)
// Suporta: # ## ### para títulos, - ou * para listas, **texto** para negrito
// VALIDAÇÃO E FORMATAÇÃO DE CPF
function validarCPF(cpfInput: string): boolean {
  const cpf = cpfInput.replace(/\D/g, '');
  if (cpf.length !== 11) return false;
  // Rejeita sequências de dígitos repetidos (111.111.111-11, 000.000.000-00, etc.)
  if (/^(\d)\1{10}$/.test(cpf)) return false;

  let soma = 0;
  for (let i = 0; i < 9; i++) soma += parseInt(cpf[i]) * (10 - i);
  let resto = (soma * 10) % 11;
  if (resto === 10 || resto === 11) resto = 0;
  if (resto !== parseInt(cpf[9])) return false;

  soma = 0;
  for (let i = 0; i < 10; i++) soma += parseInt(cpf[i]) * (11 - i);
  resto = (soma * 10) % 11;
  if (resto === 10 || resto === 11) resto = 0;
  if (resto !== parseInt(cpf[10])) return false;

  return true;
}

function formatarCPF(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  return digits
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
}

function renderInline(text: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i} className="text-slate-100 font-bold">{part.slice(2, -2)}</strong>;
    }
    return <React.Fragment key={i}>{part}</React.Fragment>;
  });
}

function renderContent(content: string): React.ReactNode {
  if (!content) return null;
  const lines = content.split('\n');
  const elements: React.ReactNode[] = [];
  let listItems: string[] = [];
  let key = 0;

  const flushList = () => {
    if (listItems.length > 0) {
      elements.push(
        <ul key={`ul-${key++}`} className="list-disc list-inside space-y-1 my-2 marker:text-amber-500">
          {listItems.map((item, i) => (
            <li key={i} className="text-sm text-slate-300 leading-relaxed">{renderInline(item)}</li>
          ))}
        </ul>
      );
      listItems = [];
    }
  };

  lines.forEach((rawLine) => {
    const trimmed = rawLine.trim();
    if (trimmed.startsWith('### ')) {
      flushList();
      elements.push(<h4 key={key++} className="text-sm font-bold text-amber-400 mt-4 mb-1">{renderInline(trimmed.slice(4))}</h4>);
    } else if (trimmed.startsWith('## ')) {
      flushList();
      elements.push(<h3 key={key++} className="text-base font-bold text-amber-500 mt-4 mb-2">{renderInline(trimmed.slice(3))}</h3>);
    } else if (trimmed.startsWith('# ')) {
      flushList();
      elements.push(<h2 key={key++} className="text-lg font-black text-amber-500 mt-4 mb-2">{renderInline(trimmed.slice(2))}</h2>);
    } else if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      listItems.push(trimmed.slice(2));
    } else if (trimmed === '') {
      flushList();
    } else {
      flushList();
      elements.push(<p key={key++} className="text-sm text-slate-300 leading-relaxed my-2">{renderInline(trimmed)}</p>);
    }
  });
  flushList();
  return elements;
}

// ITENS DE NAVEGAÇÃO (usados tanto na barra inferior mobile quanto no menu lateral desktop)
const NAV_ITEMS: { id: 'home' | 'simulado' | 'caderno' | 'materiais' | 'anotacoes' | 'stats'; label: string; icon: any }[] = [
  { id: 'home', label: 'Início', icon: Home },
  { id: 'simulado', label: 'Treinar', icon: Zap },
  { id: 'materiais', label: 'Materiais', icon: BookOpen },
  { id: 'anotacoes', label: 'Anotações', icon: PenLine },
  { id: 'caderno', label: 'Erros', icon: AlertTriangle },
  { id: 'stats', label: 'Desempenho', icon: PieChart },
];

export default function App() {
  // ESTADOS DE LOGIN / AUTENTICAÇÃO
  const [session, setSession] = useState<any>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState('');

  // ESTADOS DE CADASTRO — TESTE GRÁTIS (7 DIAS)
  const [showSignup, setShowSignup] = useState(false);
  const [signupName, setSignupName] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupCpf, setSignupCpf] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [showSignupPassword, setShowSignupPassword] = useState(false);
  const [signupLoading, setSignupLoading] = useState(false);
  const [signupError, setSignupError] = useState('');
  const [signupSuccess, setSignupSuccess] = useState(false);

  // ESTADOS DE "ESQUECI MINHA SENHA"
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotError, setForgotError] = useState('');
  const [forgotSent, setForgotSent] = useState(false);

  // ESTADOS DE REDEFINIR SENHA (APÓS CLICAR NO LINK DO E-MAIL)
  const [passwordRecoveryMode, setPasswordRecoveryMode] = useState(false);
  const [recoveryNovaSenha, setRecoveryNovaSenha] = useState('');
  const [recoveryConfirmaSenha, setRecoveryConfirmaSenha] = useState('');
  const [showRecoveryNovaSenha, setShowRecoveryNovaSenha] = useState(false);
  const [showRecoveryConfirmaSenha, setShowRecoveryConfirmaSenha] = useState(false);
  const [recoverySubmitting, setRecoverySubmitting] = useState(false);
  const [recoveryError, setRecoveryError] = useState('');
  const [recoverySuccess, setRecoverySuccess] = useState(false);

  // ESTADOS DE TROCA DE SENHA OBRIGATÓRIA (PRIMEIRO ACESSO)
  const [novaSenha, setNovaSenha] = useState('');
  const [confirmaSenha, setConfirmaSenha] = useState('');
  const [showNovaSenha, setShowNovaSenha] = useState(false);
  const [showConfirmaSenha, setShowConfirmaSenha] = useState(false);
  const [trocandoSenha, setTrocandoSenha] = useState(false);
  const [erroSenha, setErroSenha] = useState('');

  // ESTADOS NAVEGAÇÃO
  const [activeTab, setActiveTab] = useState<'home' | 'simulado' | 'caderno' | 'materiais' | 'anotacoes' | 'stats'>('home');
  const [selectedDiscipline, setSelectedDiscipline] = useState<string>(LISTA_DISCIPLINAS[0] || 'Língua Portuguesa');
  const [materialTab, setMaterialTab] = useState<'resumo' | 'mapa_mental'>('resumo');
  const [materialTopic, setMaterialTopic] = useState<string>('Todos');

  // ESTADOS DE FILTRO
  const [filterDiscipline, setFilterDiscipline] = useState<string>('Todas');
  const [filterTopic, setFilterTopic] = useState<string>('Todos');

  // PWA (INSTALAÇÃO)
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstallable, setIsInstallable] = useState(false);

  // QUESTÕES
  const [allQuestions, setAllQuestions] = useState<Question[]>([]);
  const [filteredQuestions, setFilteredQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);

  // REPORTAR ERRO EM QUESTÃO
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [reportText, setReportText] = useState('');
  const [reportSubmitting, setReportSubmitting] = useState(false);
  const [reportSuccess, setReportSuccess] = useState(false);

  // COMENTÁRIOS DOS ALUNOS
  const [commentsPanelOpen, setCommentsPanelOpen] = useState(false);
  const [comments, setComments] = useState<QuestionComment[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [commentSubmitting, setCommentSubmitting] = useState(false);
  const [isAnswered, setIsAnswered] = useState(false);
  const [streak, setStreak] = useState(0);
  const [loadingQuestions, setLoadingQuestions] = useState(true);

  // MATERIAIS (RESUMOS E MAPAS MENTAIS)
  const [allMaterials, setAllMaterials] = useState<Material[]>([]);
  const [loadingMaterials, setLoadingMaterials] = useState(true);

  // ANOTAÇÕES PESSOAIS
  const [notesDiscipline, setNotesDiscipline] = useState<string>(LISTA_DISCIPLINAS[0] || 'Língua Portuguesa');
  const [notes, setNotes] = useState<Record<string, string>>({});

  const [stats, setStats] = useState({ totalRespondidas: 0, totalAcertos: 0 });

  const [cadernoErros, setCadernoErros] = useState<Question[]>([]);

  // Controla se os dados locais (stats, erros, anotações) já foram carregados
  // para o usuário atual — evita sobrescrever o localStorage com valores vazios
  // antes do carregamento terminar, e evita misturar dados entre contas diferentes
  // no mesmo navegador.
  const [dadosLocaisCarregados, setDadosLocaisCarregados] = useState(false);

  // MONITORAR SESSÃO DO SUPABASE
  useEffect(() => {
    // Detecta direto pela URL se este acesso veio de um link de redefinição
    // de senha — mais confiável do que depender só do evento do Supabase,
    // que às vezes chega depois da primeira renderização da tela.
    const urlTemRecovery =
      window.location.hash.includes('type=recovery') ||
      window.location.search.includes('type=recovery');
    if (urlTemRecovery) {
      setPasswordRecoveryMode(true);
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      // Quando a pessoa clica no link de "esqueci minha senha" do e-mail,
      // o Supabase dispara esse evento específico — usamos isso pra mostrar
      // a tela de redefinir senha, em vez do app normal.
      if (event === 'PASSWORD_RECOVERY') {
        setPasswordRecoveryMode(true);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);
    setAuthError('');

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setAuthError('E-mail ou senha incorretos.');
    }
    setAuthLoading(false);
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotLoading(true);
    setForgotError('');

    const { error } = await supabase.auth.resetPasswordForEmail(forgotEmail, {
      redirectTo: window.location.origin,
    });

    if (error) {
      setForgotError('Não foi possível enviar o e-mail. Confira o endereço digitado.');
    } else {
      setForgotSent(true);
    }
    setForgotLoading(false);
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setRecoveryError('');

    if (recoveryNovaSenha.length < 8) {
      setRecoveryError('A senha precisa ter pelo menos 8 caracteres.');
      return;
    }
    if (recoveryNovaSenha !== recoveryConfirmaSenha) {
      setRecoveryError('As senhas não coincidem.');
      return;
    }

    setRecoverySubmitting(true);

    const { error } = await supabase.auth.updateUser({ password: recoveryNovaSenha });

    if (error) {
      setRecoveryError('Não foi possível redefinir sua senha. Tente novamente.');
      setRecoverySubmitting(false);
      return;
    }

    setRecoverySuccess(true);
    setRecoverySubmitting(false);
    setTimeout(() => {
      setPasswordRecoveryMode(false);
      setRecoverySuccess(false);
      setRecoveryNovaSenha('');
      setRecoveryConfirmaSenha('');
    }, 1800);
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setSignupLoading(true);
    setSignupError('');

    if (signupPassword.length < 8) {
      setSignupError('A senha precisa ter pelo menos 8 caracteres.');
      setSignupLoading(false);
      return;
    }

    const cpfLimpo = signupCpf.replace(/\D/g, '');
    if (!validarCPF(cpfLimpo)) {
      setSignupError('CPF inválido. Confira os números digitados.');
      setSignupLoading(false);
      return;
    }

    // Reserva o CPF antes de criar a conta — se já foi usado, bloqueia aqui,
    // sem chegar a criar um novo usuário. Não usamos .select() de propósito:
    // a tabela não tem permissão de leitura pública, só de escrita.
    const { error: cpfError } = await supabase
      .from('trial_cpfs')
      .insert({ cpf: cpfLimpo, email: signupEmail });

    if (cpfError) {
      if (cpfError.code === '23505') {
        setSignupError('Esse CPF já utilizou o teste grátis anteriormente. Assine um plano para continuar.');
      } else {
        setSignupError('Não foi possível validar seu CPF. Tente novamente.');
      }
      setSignupLoading(false);
      return;
    }

    const expiraEm = new Date();
    expiraEm.setDate(expiraEm.getDate() + 7);

    const { data, error } = await supabase.auth.signUp({
      email: signupEmail,
      password: signupPassword,
      options: {
        data: {
          name: signupName,
          role: 'student',
          plan: 'trial',
          expires_at: expiraEm.toISOString(),
          must_change_password: false,
          cpf: cpfLimpo,
        },
      },
    });

    if (error) {
      // Libera o CPF reservado, já que a conta não foi criada de fato
      // (busca pelo próprio CPF, já que não temos o id retornado)
      await supabase.from('trial_cpfs').delete().eq('cpf', cpfLimpo);

      if (error.message.toLowerCase().includes('already registered') || error.message.toLowerCase().includes('already exists')) {
        setSignupError('Esse e-mail já tem uma conta. Faça login normalmente.');
      } else {
        setSignupError('Não foi possível criar sua conta. Tente novamente.');
      }
      setSignupLoading(false);
      return;
    }

    // Se a confirmação de e-mail estiver desativada no Supabase, já vem sessão pronta
    if (data.session) {
      setSession(data.session);
    } else {
      setSignupSuccess(true);
    }

    setSignupLoading(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  // TROCA DE SENHA OBRIGATÓRIA NO PRIMEIRO ACESSO
  const handleTrocarSenha = async (e: React.FormEvent) => {
    e.preventDefault();
    setErroSenha('');

    if (novaSenha.length < 8) {
      setErroSenha('A senha precisa ter pelo menos 8 caracteres.');
      return;
    }
    if (novaSenha !== confirmaSenha) {
      setErroSenha('As senhas não coincidem.');
      return;
    }

    setTrocandoSenha(true);

    const { data, error } = await supabase.auth.updateUser({
      password: novaSenha,
      data: { must_change_password: false }
    });

    if (error) {
      setErroSenha('Não foi possível trocar a senha. Tente novamente.');
    } else if (data?.user) {
      // Atualiza a sessão local imediatamente para liberar o acesso sem precisar recarregar
      setSession((prev: any) => prev ? { ...prev, user: data.user } : prev);
      setNovaSenha('');
      setConfirmaSenha('');
    }

    setTrocandoSenha(false);
  };

  // FUNÇÃO DE IMPRESSÃO / SALVAR EM PDF
  const handlePrintPDF = () => {
    window.print();
  };

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, []);

  const handleInstallPWA = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setIsInstallable(false);
    }
    setDeferredPrompt(null);
  };

  // Carrega os dados locais (estatísticas, caderno de erros, anotações)
  // específicos do usuário logado, assim que a sessão é conhecida.
  // Isso evita que uma conta veja os dados salvos de outra conta usada
  // anteriormente no mesmo navegador.
  useEffect(() => {
    const uid = session?.user?.id;
    if (!uid) {
      setDadosLocaisCarregados(false);
      return;
    }

    const statsSalvos = localStorage.getItem(`aprova80_stats_${uid}`);
    setStats(statsSalvos ? JSON.parse(statsSalvos) : { totalRespondidas: 0, totalAcertos: 0 });

    const errosSalvos = localStorage.getItem(`aprova80_erros_${uid}`);
    setCadernoErros(errosSalvos ? JSON.parse(errosSalvos) : []);

    const notesSalvas = localStorage.getItem(`aprova80_anotacoes_${uid}`);
    setNotes(notesSalvas ? JSON.parse(notesSalvas) : {});

    setDadosLocaisCarregados(true);
  }, [session?.user?.id]);

  useEffect(() => {
    if (!dadosLocaisCarregados || !session?.user?.id) return;
    localStorage.setItem(`aprova80_erros_${session.user.id}`, JSON.stringify(cadernoErros));
  }, [cadernoErros, dadosLocaisCarregados, session?.user?.id]);

  useEffect(() => {
    if (!dadosLocaisCarregados || !session?.user?.id) return;
    localStorage.setItem(`aprova80_stats_${session.user.id}`, JSON.stringify(stats));
  }, [stats, dadosLocaisCarregados, session?.user?.id]);

  useEffect(() => {
    if (!dadosLocaisCarregados || !session?.user?.id) return;
    localStorage.setItem(`aprova80_anotacoes_${session.user.id}`, JSON.stringify(notes));
  }, [notes, dadosLocaisCarregados, session?.user?.id]);

  // BUSCA DE QUESTÕES NO SUPABASE
  useEffect(() => {
    async function fetchData() {
      try {
        setLoadingQuestions(true);

        // Busca em páginas de 1000 em 1000, pois o Supabase limita cada
        // consulta a 1000 linhas por padrão — sem isso, questões além
        // das primeiras 1000 cadastradas nunca apareceriam no app.
        let qData: any[] = [];
        let from = 0;
        const pageSize = 1000;
        while (true) {
          const { data: pageData, error } = await supabase
            .from('questions')
            .select('*')
            .range(from, from + pageSize - 1);

          if (error) {
            console.error('Erro na requisição ao Supabase:', error);
            break;
          }
          if (!pageData || pageData.length === 0) break;

          qData = qData.concat(pageData);
          if (pageData.length < pageSize) break;
          from += pageSize;
        }

        if (qData && qData.length > 0) {
          const formattedQuestions: Question[] = qData.map((q: any) => {
            let optionsList: Option[] = [];
            
            if (Array.isArray(q.options) && q.options.length > 0) {
              optionsList = q.options;
            } else if (typeof q.options === 'string') {
              try {
                optionsList = JSON.parse(q.options);
              } catch (e) {
                optionsList = [];
              }
            } else {
              const optA = q.option_a || q.a;
              const optB = q.option_b || q.b;
              const optC = q.option_c || q.c;
              const optD = q.option_d || q.d;

              if (optA) optionsList.push({ letter: 'A', text: optA });
              if (optB) optionsList.push({ letter: 'B', text: optB });
              if (optC) optionsList.push({ letter: 'C', text: optC });
              if (optD) optionsList.push({ letter: 'D', text: optD });
            }

            return {
              id: String(q.id),
              discipline: q.discipline || q.materia || q.disciplina || 'Geral',
              topic: q.topic || q.assunto || q.topico || 'Geral',
              statement: q.statement || q.pergunta || q.enunciado || '',
              options: optionsList,
              correctAnswer: String(q.correct_answer || q.correctAnswer || q.gabarito || 'A').trim().toUpperCase(),
              explanation: q.explanation || q.explicacao || q.comentario || ''
            };
          });

          setAllQuestions(shuffleArray(formattedQuestions));
        }
      } catch (err) {
        console.error('Erro ao processar questões do Supabase:', err);
      } finally {
        setLoadingQuestions(false);
      }
    }
    fetchData();
  }, []);

  // BUSCA DE MATERIAIS (RESUMOS E MAPAS MENTAIS) NO SUPABASE
  useEffect(() => {
    async function fetchMaterials() {
      try {
        setLoadingMaterials(true);
        const { data, error } = await supabase.from('materials').select('*');

        if (error) {
          console.error('Erro ao buscar materiais:', error);
          return;
        }

        if (data) {
          const formatted: Material[] = data.map((m: any) => ({
            id: String(m.id),
            title: m.title || '',
            discipline: m.discipline || '',
            type: m.type || 'resumo',
            topic: m.topic || '',
            content: m.content || '',
            url: m.url || ''
          }));
          setAllMaterials(formatted);
        }
      } catch (err) {
        console.error('Erro ao processar materiais:', err);
      } finally {
        setLoadingMaterials(false);
      }
    }
    fetchMaterials();
  }, []);

  // FILTRAGEM
  useEffect(() => {
    let result = allQuestions;

    if (filterDiscipline !== 'Todas') {
      result = result.filter(q => q.discipline === filterDiscipline);
    }

    if (filterTopic !== 'Todos') {
      result = result.filter(q => q.topic === filterTopic);
    }

    setFilteredQuestions(result);
    setCurrentIndex(0);
    setSelectedOption(null);
    setIsAnswered(false);
  }, [filterDiscipline, filterTopic, allQuestions]);

  const currentQuestion = filteredQuestions[currentIndex];

  const materiaisFiltrados = allMaterials.filter(
    (m) =>
      m.discipline === selectedDiscipline &&
      m.type === materialTab &&
      (materialTopic === 'Todos' || m.topic === materialTopic)
  );

  const handleConfirmAnswer = () => {
    if (!selectedOption || !currentQuestion) return;

    setIsAnswered(true);
    const acertou = selectedOption === currentQuestion.correctAnswer;

    setStats((prev: any) => ({
      totalRespondidas: prev.totalRespondidas + 1,
      totalAcertos: acertou ? prev.totalAcertos + 1 : prev.totalAcertos
    }));

    if (acertou) {
      setStreak((prev) => prev + 1);
    } else {
      setStreak(0);
      setCadernoErros((errosAtuais) => {
        const jaExiste = errosAtuais.some((q) => q.id === currentQuestion.id);
        if (jaExiste) return errosAtuais;
        return [...errosAtuais, currentQuestion];
      });
    }
  };

  const handleSubmitReport = async () => {
    if (!currentQuestion || !reportText.trim()) return;

    setReportSubmitting(true);
    try {
      const { error } = await supabase.from('question_reports').insert({
        question_id: currentQuestion.id,
        question_statement: currentQuestion.statement,
        user_email: session?.user?.email || null,
        description: reportText.trim(),
      });

      if (error) {
        console.error('Erro ao enviar report:', error);
      } else {
        setReportSuccess(true);
        setReportText('');
        setTimeout(() => {
          setReportModalOpen(false);
          setReportSuccess(false);
        }, 1800);
      }
    } catch (err) {
      console.error('Erro ao enviar report:', err);
    } finally {
      setReportSubmitting(false);
    }
  };

  const handleResetStats = () => {
    const confirmar = window.confirm(
      'Tem certeza que deseja zerar suas estatísticas de desempenho? Essa ação não pode ser desfeita.'
    );
    if (confirmar) {
      setStats({ totalRespondidas: 0, totalAcertos: 0 });
    }
  };

  const handleOpenComments = async () => {
    if (!currentQuestion) return;
    setCommentsPanelOpen(true);
    setCommentsLoading(true);
    try {
      const { data, error } = await supabase
        .from('question_comments')
        .select('*')
        .eq('question_id', currentQuestion.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Erro ao buscar comentários:', error);
      } else if (data) {
        setComments(data as QuestionComment[]);
      }
    } catch (err) {
      console.error('Erro ao buscar comentários:', err);
    } finally {
      setCommentsLoading(false);
    }
  };

  const handleSubmitComment = async () => {
    if (!currentQuestion || !newComment.trim()) return;

    setCommentSubmitting(true);
    try {
      const { data, error } = await supabase
        .from('question_comments')
        .insert({
          question_id: currentQuestion.id,
          user_email: session?.user?.email || 'Anônimo',
          comment_text: newComment.trim(),
        })
        .select()
        .single();

      if (error) {
        console.error('Erro ao enviar comentário:', error);
      } else if (data) {
        setComments((prev) => [data as QuestionComment, ...prev]);
        setNewComment('');
      }
    } catch (err) {
      console.error('Erro ao enviar comentário:', err);
    } finally {
      setCommentSubmitting(false);
    }
  };

  const handlePreviousQuestion = () => {
    if (currentIndex === 0) return;
    setSelectedOption(null);
    setIsAnswered(false);
    setCommentsPanelOpen(false);
    setComments([]);
    setNewComment('');
    setCurrentIndex((prev) => prev - 1);
  };

  const handleNextQuestion = () => {
    setSelectedOption(null);
    setIsAnswered(false);
    setCommentsPanelOpen(false);
    setComments([]);
    setNewComment('');
    if (currentIndex < filteredQuestions.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      setFilteredQuestions(shuffleArray(filteredQuestions));
      setCurrentIndex(0);
    }
  };

  const handleRemoverDoCaderno = (id: string) => {
    setCadernoErros((prev) => prev.filter((q) => q.id !== id));
  };

  const taxaAcerto = stats.totalRespondidas > 0 
    ? Math.round((stats.totalAcertos / stats.totalRespondidas) * 100) 
    : 0;

  const totalErros = stats.totalRespondidas - stats.totalAcertos;
  const taxaErro = stats.totalRespondidas > 0 
    ? Math.round((totalErros / stats.totalRespondidas) * 100) 
    : 0;

  // LÓGICA DE PORCENTAGEM DE ERROS POR DISCIPLINA/ASSUNTO
  const errosPorAssunto = React.useMemo(() => {
    if (cadernoErros.length === 0) return {};
    const contagem: Record<string, number> = {};
    cadernoErros.forEach(q => {
      const chave = `${q.discipline} — ${q.topic}`;
      contagem[chave] = (contagem[chave] || 0) + 1;
    });
    return contagem;
  }, [cadernoErros]);

  // TELA DE LOGIN / CADASTRO (TESTE GRÁTIS)
  // TELA DE REDEFINIR SENHA (APÓS CLICAR NO LINK DE "ESQUECI MINHA SENHA")
  if (passwordRecoveryMode) {
    return (
      <div className="min-h-screen bg-slate-900 text-slate-100 flex items-center justify-center p-4">
        <div className="bg-slate-800 border border-slate-700/60 p-6 rounded-2xl w-full max-w-sm space-y-6 shadow-2xl">
          <div className="text-center space-y-1">
            <div className="w-12 h-12 bg-amber-500/10 border border-amber-500/20 rounded-full flex items-center justify-center mx-auto mb-2">
              <Lock className="w-5 h-5 text-amber-500" />
            </div>
            <h1 className="text-xl font-black text-amber-500">Criar nova senha</h1>
            <p className="text-xs text-slate-400">Defina a nova senha da sua conta.</p>
          </div>

          {recoverySuccess ? (
            <div className="text-center py-4 space-y-2">
              <CheckCircle className="w-10 h-10 text-emerald-400 mx-auto" />
              <p className="text-sm font-bold text-slate-200">Senha redefinida!</p>
              <p className="text-xs text-slate-400">Você já pode continuar usando o app normalmente.</p>
            </div>
          ) : (
            <form onSubmit={handleResetPassword} className="space-y-4">
              {recoveryError && (
                <div className="p-3 bg-red-500/10 border border-red-500/30 text-red-400 text-xs rounded-xl text-center font-medium">
                  {recoveryError}
                </div>
              )}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-300">Nova Senha</label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                  <input
                    type={showRecoveryNovaSenha ? 'text' : 'password'}
                    required
                    value={recoveryNovaSenha}
                    onChange={(e) => setRecoveryNovaSenha(e.target.value)}
                    placeholder="Mínimo 8 caracteres"
                    className="w-full pl-9 pr-10 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-slate-200 outline-none focus:border-amber-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowRecoveryNovaSenha((prev) => !prev)}
                    className="absolute right-3 top-2.5 text-slate-500 hover:text-slate-300 transition cursor-pointer"
                  >
                    {showRecoveryNovaSenha ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-300">Confirmar Nova Senha</label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                  <input
                    type={showRecoveryConfirmaSenha ? 'text' : 'password'}
                    required
                    value={recoveryConfirmaSenha}
                    onChange={(e) => setRecoveryConfirmaSenha(e.target.value)}
                    placeholder="Repita a nova senha"
                    className="w-full pl-9 pr-10 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-slate-200 outline-none focus:border-amber-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowRecoveryConfirmaSenha((prev) => !prev)}
                    className="absolute right-3 top-2.5 text-slate-500 hover:text-slate-300 transition cursor-pointer"
                  >
                    {showRecoveryConfirmaSenha ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <button
                type="submit"
                disabled={recoverySubmitting}
                className="w-full py-3 bg-amber-500 text-slate-950 font-bold text-sm rounded-xl hover:bg-amber-400 transition disabled:opacity-50"
              >
                {recoverySubmitting ? 'Salvando...' : 'Salvar Nova Senha'}
              </button>
            </form>
          )}
        </div>
      </div>
    );
  }


  if (!session) {
    // ---- TELA DE "ESQUECI MINHA SENHA" ----
    if (showForgotPassword) {
      return (
        <div className="min-h-screen bg-slate-900 text-slate-100 flex items-center justify-center p-4">
          <div className="bg-slate-800 border border-slate-700/60 p-6 rounded-2xl w-full max-w-sm space-y-6 shadow-2xl">
            <div className="text-center space-y-1">
              <div className="w-12 h-12 bg-amber-500/10 border border-amber-500/20 rounded-full flex items-center justify-center mx-auto mb-2">
                <KeyRound className="w-5 h-5 text-amber-500" />
              </div>
              <h1 className="text-xl font-black text-amber-500">Esqueceu sua senha?</h1>
              <p className="text-xs text-slate-400">Informe seu e-mail e mandamos um link para redefinir.</p>
            </div>

            {forgotSent ? (
              <div className="text-center py-4 space-y-3">
                <CheckCircle className="w-10 h-10 text-emerald-400 mx-auto" />
                <p className="text-sm font-bold text-slate-200">E-mail enviado!</p>
                <p className="text-xs text-slate-400">
                  Confira sua caixa de entrada (e o spam) e clique no link para criar uma nova senha.
                </p>
                <button
                  onClick={() => { setShowForgotPassword(false); setForgotSent(false); }}
                  className="w-full py-2.5 bg-amber-500 text-slate-950 font-bold text-xs rounded-xl hover:bg-amber-400 transition cursor-pointer"
                >
                  Voltar para o login
                </button>
              </div>
            ) : (
              <form onSubmit={handleForgotPassword} className="space-y-4">
                {forgotError && (
                  <div className="p-3 bg-red-500/10 border border-red-500/30 text-red-400 text-xs rounded-xl text-center font-medium">
                    {forgotError}
                  </div>
                )}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-300">E-mail</label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                    <input
                      type="email"
                      required
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      placeholder="seu@email.com"
                      className="w-full pl-9 pr-3 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-slate-200 outline-none focus:border-amber-500"
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={forgotLoading}
                  className="w-full py-3 bg-amber-500 text-slate-950 font-bold text-sm rounded-xl hover:bg-amber-400 transition disabled:opacity-50"
                >
                  {forgotLoading ? 'Enviando...' : 'Enviar link de redefinição'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowForgotPassword(false)}
                  className="w-full text-center text-[11px] text-slate-500 hover:text-slate-300 transition cursor-pointer"
                >
                  Voltar para o login
                </button>
              </form>
            )}
          </div>
        </div>
      );
    }

    // ---- TELA DE CADASTRO (TESTE GRÁTIS 7 DIAS) ----
    if (showSignup) {
      return (
        <div className="min-h-screen bg-slate-900 text-slate-100 flex items-center justify-center p-4">
          <div className="bg-slate-800 border border-slate-700/60 p-6 rounded-2xl w-full max-w-sm space-y-6 shadow-2xl">
            <div className="text-center space-y-1">
              <h1 className="text-2xl font-black text-amber-500">APROVA 80</h1>
              <p className="text-xs text-slate-400">Teste grátis por 7 dias</p>
            </div>

            {signupSuccess ? (
              <div className="text-center py-4 space-y-3">
                <CheckCircle className="w-10 h-10 text-emerald-400 mx-auto" />
                <p className="text-sm font-bold text-slate-200">Conta criada!</p>
                <p className="text-xs text-slate-400">
                  Confira seu e-mail para confirmar o cadastro (se necessário) e depois faça login normalmente.
                </p>
                <button
                  onClick={() => { setShowSignup(false); setSignupSuccess(false); }}
                  className="w-full py-2.5 bg-amber-500 text-slate-950 font-bold text-xs rounded-xl hover:bg-amber-400 transition cursor-pointer"
                >
                  Ir para o login
                </button>
              </div>
            ) : (
              <form onSubmit={handleSignup} className="space-y-4">
                {signupError && (
                  <div className="p-3 bg-red-500/10 border border-red-500/30 text-red-400 text-xs rounded-xl text-center font-medium">
                    {signupError}
                  </div>
                )}

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-300">Nome</label>
                  <input
                    type="text"
                    required
                    value={signupName}
                    onChange={(e) => setSignupName(e.target.value)}
                    placeholder="Seu nome"
                    className="w-full px-3 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-slate-200 outline-none focus:border-amber-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-300">E-mail</label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                    <input
                      type="email"
                      required
                      value={signupEmail}
                      onChange={(e) => setSignupEmail(e.target.value)}
                      placeholder="seu@email.com"
                      className="w-full pl-9 pr-3 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-slate-200 outline-none focus:border-amber-500"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-300">CPF</label>
                  <input
                    type="text"
                    required
                    inputMode="numeric"
                    value={signupCpf}
                    onChange={(e) => setSignupCpf(formatarCPF(e.target.value))}
                    placeholder="000.000.000-00"
                    maxLength={14}
                    className="w-full px-3 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-slate-200 outline-none focus:border-amber-500"
                  />
                  <p className="text-[10px] text-slate-500">Usado só para liberar 1 teste grátis por pessoa.</p>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-300">Crie uma senha</label>
                  <div className="relative">
                    <KeyRound className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                    <input
                      type={showSignupPassword ? 'text' : 'password'}
                      required
                      value={signupPassword}
                      onChange={(e) => setSignupPassword(e.target.value)}
                      placeholder="Mínimo 8 caracteres"
                      className="w-full pl-9 pr-10 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-slate-200 outline-none focus:border-amber-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowSignupPassword((prev) => !prev)}
                      className="absolute right-3 top-2.5 text-slate-500 hover:text-slate-300 transition cursor-pointer"
                    >
                      {showSignupPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={signupLoading}
                  className="w-full py-3 bg-amber-500 text-slate-950 font-bold text-sm rounded-xl hover:bg-amber-400 transition disabled:opacity-50"
                >
                  {signupLoading ? 'Criando conta...' : 'Começar teste grátis de 7 dias'}
                </button>
              </form>
            )}

            {!signupSuccess && (
              <p className="text-[11px] text-center text-slate-500">
                Já tem conta?{' '}
                <button
                  onClick={() => setShowSignup(false)}
                  className="text-amber-500 font-bold cursor-pointer hover:underline"
                >
                  Fazer login
                </button>
              </p>
            )}
          </div>
        </div>
      );
    }

    // ---- TELA DE LOGIN ----
    return (
      <div className="min-h-screen bg-slate-900 text-slate-100 flex items-center justify-center p-4">
        <div className="bg-slate-800 border border-slate-700/60 p-6 rounded-2xl w-full max-w-sm space-y-6 shadow-2xl">
          <div className="text-center space-y-1">
            <h1 className="text-2xl font-black text-amber-500">APROVA 80</h1>
            <p className="text-xs text-slate-400">Área Exclusiva de Alunos</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            {authError && (
              <div className="p-3 bg-red-500/10 border border-red-500/30 text-red-400 text-xs rounded-xl text-center font-medium">
                {authError}
              </div>
            )}

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-300">E-mail de Acesso</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu@email.com"
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-slate-200 outline-none focus:border-amber-500"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-300">Senha</label>
              <div className="relative">
                <KeyRound className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-9 pr-10 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-slate-200 outline-none focus:border-amber-500"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-3 top-2.5 text-slate-500 hover:text-slate-300 transition cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={authLoading}
              className="w-full py-3 bg-amber-500 text-slate-950 font-bold text-sm rounded-xl hover:bg-amber-400 transition disabled:opacity-50"
            >
              {authLoading ? 'Entrando...' : 'Acessar Plataforma'}
            </button>

            <button
              type="button"
              onClick={() => { setShowForgotPassword(true); setForgotEmail(email); }}
              className="w-full text-center text-[11px] text-slate-400 hover:text-amber-500 transition cursor-pointer"
            >
              Esqueci minha senha
            </button>
          </form>

          <button
            onClick={() => setShowSignup(true)}
            className="w-full py-2.5 border border-amber-500/30 text-amber-500 font-bold text-xs rounded-xl hover:bg-amber-500/10 transition cursor-pointer"
          >
            Testar grátis por 7 dias
          </button>

          <p className="text-[11px] text-center text-slate-500">
            Ainda não tem acesso? Adquira seu plano em nossa página oficial.
          </p>
        </div>
      </div>
    );
  }

  // TELA DE TROCA DE SENHA OBRIGATÓRIA (PRIMEIRO ACESSO)
  const precisaTrocarSenha = session?.user?.user_metadata?.must_change_password === true;

  if (precisaTrocarSenha) {
    return (
      <div className="min-h-screen bg-slate-900 text-slate-100 flex items-center justify-center p-4">
        <div className="bg-slate-800 border border-slate-700/60 p-6 rounded-2xl w-full max-w-sm space-y-6 shadow-2xl">
          <div className="text-center space-y-1">
            <div className="w-12 h-12 bg-amber-500/10 border border-amber-500/20 rounded-full flex items-center justify-center mx-auto mb-2">
              <Lock className="w-5 h-5 text-amber-500" />
            </div>
            <h1 className="text-xl font-black text-amber-500">Crie sua senha definitiva</h1>
            <p className="text-xs text-slate-400">Por segurança, defina uma nova senha para continuar.</p>
          </div>

          <form onSubmit={handleTrocarSenha} className="space-y-4">
            {erroSenha && (
              <div className="p-3 bg-red-500/10 border border-red-500/30 text-red-400 text-xs rounded-xl text-center font-medium">
                {erroSenha}
              </div>
            )}

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-300">Nova Senha</label>
              <div className="relative">
                <KeyRound className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                <input
                  type={showNovaSenha ? 'text' : 'password'}
                  required
                  value={novaSenha}
                  onChange={(e) => setNovaSenha(e.target.value)}
                  placeholder="Mínimo 8 caracteres"
                  className="w-full pl-9 pr-10 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-slate-200 outline-none focus:border-amber-500"
                />
                <button
                  type="button"
                  onClick={() => setShowNovaSenha((prev) => !prev)}
                  className="absolute right-3 top-2.5 text-slate-500 hover:text-slate-300 transition cursor-pointer"
                >
                  {showNovaSenha ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-300">Confirmar Nova Senha</label>
              <div className="relative">
                <KeyRound className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                <input
                  type={showConfirmaSenha ? 'text' : 'password'}
                  required
                  value={confirmaSenha}
                  onChange={(e) => setConfirmaSenha(e.target.value)}
                  placeholder="Repita a nova senha"
                  className="w-full pl-9 pr-10 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-slate-200 outline-none focus:border-amber-500"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmaSenha((prev) => !prev)}
                  className="absolute right-3 top-2.5 text-slate-500 hover:text-slate-300 transition cursor-pointer"
                >
                  {showConfirmaSenha ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={trocandoSenha}
              className="w-full py-3 bg-amber-500 text-slate-950 font-bold text-sm rounded-xl hover:bg-amber-400 transition disabled:opacity-50"
            >
              {trocandoSenha ? 'Salvando...' : 'Definir Senha e Continuar'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // TELA DE ACESSO EXPIRADO (TESTE GRÁTIS OU ASSINATURA VENCIDA)
  const expiresAtStr = session?.user?.user_metadata?.expires_at;
  const planoAtual = session?.user?.user_metadata?.plan;
  const acessoExpirado = expiresAtStr ? new Date(expiresAtStr) < new Date() : false;

  if (acessoExpirado) {
    const ehTeste = planoAtual === 'trial';
    return (
      <div className="min-h-screen bg-slate-900 text-slate-100 flex items-center justify-center p-4">
        <div className="bg-slate-800 border border-slate-700/60 p-6 rounded-2xl w-full max-w-sm space-y-5 shadow-2xl text-center">
          <div className="w-14 h-14 bg-amber-500/10 border border-amber-500/20 rounded-full flex items-center justify-center mx-auto">
            <Lock className="w-6 h-6 text-amber-500" />
          </div>
          <div>
            <h1 className="text-xl font-black text-amber-500">
              {ehTeste ? 'Seu teste grátis acabou' : 'Sua assinatura venceu'}
            </h1>
            <p className="text-xs text-slate-400 mt-2">
              {ehTeste
                ? 'Os 7 dias de teste grátis chegaram ao fim. Assine um plano para continuar estudando com o APROVA 80.'
                : 'Não identificamos uma renovação do seu plano. Assine novamente para continuar tendo acesso.'}
            </p>
          </div>
          <a
            href="https://aprova80.netlify.app/#planos"
            className="block w-full py-3 bg-amber-500 text-slate-950 font-bold text-sm rounded-xl hover:bg-amber-400 transition"
          >
            Ver planos e assinar
          </a>
          <button
            onClick={handleLogout}
            className="w-full py-2.5 text-slate-400 text-xs font-bold hover:text-red-400 transition cursor-pointer"
          >
            Sair da conta
          </button>
        </div>
      </div>
    );
  }

  // APLICATIVO PRINCIPAL
  // Mobile (< md): layout de cartão único, centralizado, com header fixo em cima e navegação fixa embaixo (como antes).
  // Desktop (>= md): layout ocupando a tela inteira, com menu lateral fixo à esquerda substituindo header + navegação inferior.
  const diasRestantesTeste = planoAtual === 'trial' && expiresAtStr
    ? Math.max(0, Math.ceil((new Date(expiresAtStr).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : null;
  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col md:flex-row print:bg-white print:text-black">

      {/* MENU LATERAL — SOMENTE DESKTOP */}
      <aside className="hidden md:flex md:flex-col md:w-64 md:shrink-0 md:h-screen md:sticky md:top-0 bg-slate-900 border-r border-slate-800 p-5 print:hidden">
        <div className="mb-8">
          <h1 className="text-xl font-bold tracking-wider text-amber-500">APROVA 80</h1>
          <p className="text-xs text-slate-400">Preparatório de Elite</p>
        </div>

        <div className="flex items-center gap-2 mb-6">
          <div className="flex items-center gap-1 bg-amber-500/10 text-amber-500 px-3 py-1.5 rounded-full border border-amber-500/20 text-sm font-bold">
            <Flame className="w-4 h-4 fill-amber-500" />
            <span>{streak} dias</span>
          </div>
        </div>

        {diasRestantesTeste !== null && (
          <div className="mb-6 p-3 bg-sky-500/10 border border-sky-500/20 rounded-xl">
            <p className="text-[11px] font-bold text-sky-400">
              {diasRestantesTeste} {diasRestantesTeste === 1 ? 'dia restante' : 'dias restantes'} de teste grátis
            </p>
          </div>
        )}

        <nav className="flex-1 flex flex-col gap-1">
          {NAV_ITEMS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold transition cursor-pointer text-left ${
                activeTab === id
                  ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800 border border-transparent'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{label}</span>
            </button>
          ))}
        </nav>

        <div className="pt-4 border-t border-slate-800 flex flex-col gap-2">
          {isInstallable && (
            <button 
              onClick={handleInstallPWA}
              className="flex items-center gap-2 bg-emerald-500/20 text-emerald-400 px-3 py-2 rounded-xl border border-emerald-500/30 text-xs font-bold hover:bg-emerald-500/30 transition cursor-pointer"
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>Instalar no dispositivo</span>
            </button>
          )}
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-red-400 hover:bg-slate-800 transition cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sair da Conta</span>
          </button>
        </div>
      </aside>

      {/* COLUNA PRINCIPAL */}
      <div className="flex-1 w-full flex justify-center md:justify-start">
        <div className="w-full max-w-xl md:max-w-none min-h-screen bg-slate-900 flex flex-col justify-between relative shadow-2xl border-x border-slate-800 md:border-none print:max-w-none print:border-none">

          {/* CABEÇALHO — SOMENTE MOBILE */}
          <header className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-900/90 backdrop-blur sticky top-0 z-20 print:hidden md:hidden">
            <div>
              <h1 className="text-xl font-bold tracking-wider text-amber-500">APROVA 80</h1>
              <p className="text-xs text-slate-400">Preparatório de Elite</p>
            </div>
            <div className="flex items-center gap-2">
              {isInstallable && (
                <button 
                  onClick={handleInstallPWA}
                  className="flex items-center gap-1 bg-emerald-500/20 text-emerald-400 px-2.5 py-1 rounded-full border border-emerald-500/30 text-xs font-bold hover:bg-emerald-500/30 transition"
                  title="Instalar no Celular"
                >
                  <Smartphone className="w-3.5 h-3.5" />
                  <span>Instalar</span>
                </button>
              )}
              <div className="flex items-center gap-1 bg-amber-500/10 text-amber-500 px-3 py-1 rounded-full border border-amber-500/20 text-sm font-bold">
                <Flame className="w-4 h-4 fill-amber-500" />
                <span>{streak}</span>
              </div>
              <button
                onClick={handleLogout}
                className="p-1.5 text-slate-400 hover:text-red-400 transition"
                title="Sair da Conta"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </header>

          {/* CABEÇALHO DE CONTEXTO — SOMENTE DESKTOP (mostra em qual aba você está) */}
          <div className="hidden md:flex items-center justify-between px-8 py-5 border-b border-slate-800 print:hidden">
            <h2 className="text-lg font-bold text-slate-200">
              {NAV_ITEMS.find(n => n.id === activeTab)?.label}
            </h2>
            <div className="flex items-center gap-1 bg-amber-500/10 text-amber-500 px-3 py-1 rounded-full border border-amber-500/20 text-sm font-bold">
              <Flame className="w-4 h-4 fill-amber-500" />
              <span>{streak} de sequência</span>
            </div>
          </div>

          {/* CONTEÚDO PRINCIPAL */}
          <main className="p-4 md:p-8 flex-1 pb-28 md:pb-8 print:p-0 print:pb-0">
            <div className="md:max-w-4xl md:mx-auto">

            {/* HOME */}
            {activeTab === 'home' && (
              <div className="space-y-6">
                {diasRestantesTeste !== null && (
                  <div className="p-3 bg-sky-500/10 border border-sky-500/20 rounded-xl md:hidden">
                    <p className="text-xs font-bold text-sky-400 text-center">
                      {diasRestantesTeste} {diasRestantesTeste === 1 ? 'dia restante' : 'dias restantes'} de teste grátis
                    </p>
                  </div>
                )}
                <div className="p-6 md:p-8 bg-gradient-to-br from-amber-500 to-amber-600 rounded-2xl text-slate-950 font-bold space-y-2 shadow-lg">
                  <span className="text-xs uppercase tracking-wider bg-slate-950/20 px-2 py-0.5 rounded text-slate-950">
                    Meta Diária
                  </span>
                  <h2 className="text-2xl md:text-3xl font-black">Foco na Aprovação!</h2>
                  <p className="text-sm opacity-90 font-medium">
                    {loadingQuestions ? 'Carregando questões do banco...' : `Você tem ${allQuestions.length} questões prontas para treino.`}
                  </p>
                  <button 
                    onClick={() => setActiveTab('simulado')}
                    className="mt-4 w-full md:w-auto md:px-8 py-3 bg-slate-950 text-amber-500 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-slate-900 transition cursor-pointer"
                  >
                    <Zap className="w-5 h-5 fill-amber-500" />
                    Começar Simulado
                  </button>
                </div>

                <div className="p-4 bg-slate-800 border border-slate-700/50 rounded-xl flex items-center justify-between">
                  <div>
                    <p className="text-xs text-slate-400 font-medium">Taxa de Acertos</p>
                    <p className="text-2xl font-black text-emerald-400">{taxaAcerto}%</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-slate-400 font-medium">Respondidas</p>
                    <p className="text-lg font-bold text-slate-200">{stats.totalRespondidas} qst</p>
                  </div>
                </div>

                {/* ATALHOS DA HOME */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div 
                    onClick={() => setActiveTab('materiais')}
                    className="p-4 bg-slate-800 border border-slate-700/50 rounded-xl cursor-pointer hover:border-amber-500/50 transition"
                  >
                    <BookOpen className="w-6 h-6 text-amber-400 mb-2" />
                    <h3 className="font-bold text-sm">Materiais</h3>
                    <p className="text-xs text-slate-400">{LISTA_DISCIPLINAS.length} Matérias</p>
                  </div>

                  <div 
                    onClick={() => setActiveTab('caderno')}
                    className="p-4 bg-slate-800 border border-slate-700/50 rounded-xl cursor-pointer hover:border-amber-500/50 transition"
                  >
                    <AlertTriangle className="w-6 h-6 text-red-400 mb-2" />
                    <h3 className="font-bold text-sm">Caderno de Erros</h3>
                    <p className="text-xs text-slate-400">{cadernoErros.length} salvas</p>
                  </div>

                  <div 
                    onClick={() => setActiveTab('anotacoes')}
                    className="p-4 bg-slate-800 border border-slate-700/50 rounded-xl cursor-pointer hover:border-amber-500/50 transition"
                  >
                    <PenLine className="w-6 h-6 text-sky-400 mb-2" />
                    <h3 className="font-bold text-sm">Anotações</h3>
                    <p className="text-xs text-slate-400">Suas notas pessoais</p>
                  </div>

                  <div 
                    onClick={() => setActiveTab('stats')}
                    className="hidden md:block p-4 bg-slate-800 border border-slate-700/50 rounded-xl cursor-pointer hover:border-amber-500/50 transition"
                  >
                    <PieChart className="w-6 h-6 text-emerald-400 mb-2" />
                    <h3 className="font-bold text-sm">Desempenho</h3>
                    <p className="text-xs text-slate-400">Ver estatísticas</p>
                  </div>
                </div>
              </div>
            )}

            {/* SIMULADO */}
            {activeTab === 'simulado' && (
              <div className="space-y-4">
                
                {/* PAINEL DE FILTROS */}
                <div className="p-3 bg-slate-800/80 border border-slate-700/60 rounded-xl space-y-2">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-amber-500">
                    <Filter className="w-3.5 h-3.5" />
                    <span>Filtrar Treino:</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <select
                      value={filterDiscipline}
                      onChange={(e) => {
                        setFilterDiscipline(e.target.value);
                        setFilterTopic('Todos');
                      }}
                      className="bg-slate-900 border border-slate-700 text-slate-200 text-xs rounded-lg p-2 focus:border-amber-500 outline-none"
                    >
                      <option value="Todas">Toda Disciplina</option>
                      {LISTA_DISCIPLINAS.map(d => (
                        <option key={d} value={d}>{d}</option>
                      ))}
                    </select>

                    <select
                      value={filterTopic}
                      onChange={(e) => setFilterTopic(e.target.value)}
                      className="bg-slate-900 border border-slate-700 text-slate-200 text-xs rounded-lg p-2 focus:border-amber-500 outline-none"
                    >
                      {(ESTRUTURA_MATERIAS[filterDiscipline] || ['Todos']).map(t => (
                        <option key={t} value={t}>{t === 'Todos' ? 'Todo Assunto' : t}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {loadingQuestions ? (
                  <div className="text-center py-12 text-slate-400 text-sm">
                    Carregando questões do Supabase...
                  </div>
                ) : filteredQuestions.length === 0 ? (
                  <div className="text-center py-12 space-y-2 bg-slate-800/30 rounded-2xl border border-slate-800 p-6">
                    <p className="text-sm font-semibold text-slate-300">Nenhuma questão encontrada!</p>
                    <p className="text-xs text-slate-500">
                      {allQuestions.length === 0 
                        ? "Verifique se você salvou a política (RLS) no Supabase."
                        : "Tente alterar os filtros de disciplina ou assunto acima."}
                    </p>
                  </div>
                ) : currentQuestion && (
                  <>
                    <div className="flex justify-between items-center text-xs text-slate-400">
                      <div className="flex gap-1.5 items-center">
                        <span className="bg-slate-800 px-2 py-1 rounded border border-slate-700 text-amber-500 font-semibold">
                          {currentQuestion.discipline}
                        </span>
                        <span className="bg-slate-800 px-2 py-1 rounded border border-slate-700 text-slate-400">
                          {currentQuestion.topic}
                        </span>
                      </div>
                      <span>Questão {currentIndex + 1} de {filteredQuestions.length}</span>
                    </div>

                    <p className="text-sm md:text-base font-medium leading-relaxed text-slate-200 bg-slate-800/50 p-4 md:p-6 rounded-xl border border-slate-800">
                      {currentQuestion.statement}
                    </p>

                    <div className="space-y-2">
                      {currentQuestion.options.map((option) => {
                        const isSelected = selectedOption === option.letter;
                        const isCorrect = option.letter === currentQuestion.correctAnswer;
                        
                        let btnStyle = "bg-slate-800 border-slate-700 hover:border-slate-600";
                        
                        if (isAnswered) {
                          if (isCorrect) btnStyle = "bg-emerald-500/20 border-emerald-500 text-emerald-300";
                          else if (isSelected) btnStyle = "bg-red-500/20 border-red-500 text-red-300";
                        } else if (isSelected) {
                          btnStyle = "bg-amber-500/20 border-amber-500 text-amber-300";
                        }

                        return (
                          <button
                            key={option.letter}
                            disabled={isAnswered}
                            onClick={() => setSelectedOption(option.letter)}
                            className={`w-full p-3 rounded-xl border text-left text-sm flex items-start gap-3 transition ${btnStyle}`}
                          >
                            <span className="font-bold text-xs bg-slate-700/50 px-2 py-1 rounded">
                              {option.letter}
                            </span>
                            <span className="flex-1">{option.text}</span>
                          </button>
                        );
                      })}
                    </div>

                    {!isAnswered ? (
                      <div className="flex flex-col sm:flex-row gap-2">
                        <button
                          onClick={handlePreviousQuestion}
                          disabled={currentIndex === 0}
                          className="sm:flex-none px-4 py-3 border border-slate-700 text-slate-400 font-bold rounded-xl hover:bg-slate-800 hover:text-slate-200 transition cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
                        >
                          <ChevronLeft className="w-4 h-4" />
                          <span className="sm:hidden">Voltar</span>
                        </button>
                        <button
                          disabled={!selectedOption}
                          onClick={handleConfirmAnswer}
                          className="flex-1 md:flex-none md:px-10 py-3 bg-amber-500 text-slate-950 font-bold rounded-xl disabled:opacity-50 transition cursor-pointer"
                        >
                          Responder
                        </button>
                        <button
                          onClick={handleNextQuestion}
                          className="flex-1 md:flex-none md:px-6 py-3 border border-slate-700 text-slate-400 font-bold rounded-xl hover:bg-slate-800 hover:text-slate-200 transition cursor-pointer flex items-center justify-center gap-1.5"
                        >
                          Pular questão
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {currentQuestion.explanation && (
                          <div className="p-3 bg-slate-800/80 rounded-xl border border-slate-700 text-xs text-slate-300 space-y-1">
                            <span className="font-bold text-amber-500 flex items-center gap-1">
                              <FileText className="w-3.5 h-3.5" /> Comentário:
                            </span>
                            <p>{currentQuestion.explanation}</p>
                          </div>
                        )}
                        <div className="flex items-center justify-between gap-2">
                          <button
                            onClick={handleOpenComments}
                            className="flex items-center gap-1.5 text-[11px] text-slate-400 hover:text-amber-500 transition cursor-pointer"
                          >
                            <MessageCircle className="w-3.5 h-3.5" />
                            Comentários dos alunos
                          </button>
                          <button
                            onClick={() => setReportModalOpen(true)}
                            className="text-[11px] text-slate-500 hover:text-red-400 transition cursor-pointer underline underline-offset-2"
                          >
                            Reportar erro
                          </button>
                        </div>
                        <button
                          onClick={handleNextQuestion}
                          className="w-full md:w-auto md:px-10 py-3 bg-slate-800 border border-slate-700 text-amber-500 font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-slate-700 transition cursor-pointer"
                        >
                          Próxima Questão
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {/* PAINEL DE COMENTÁRIOS DOS ALUNOS */}
            {commentsPanelOpen && (
              <div
                className="fixed inset-0 bg-black/70 z-50 flex items-end md:items-center justify-center md:p-4"
                onClick={() => setCommentsPanelOpen(false)}
              >
                <div
                  className="bg-slate-800 border border-slate-700 rounded-t-2xl md:rounded-2xl w-full md:max-w-lg h-[85vh] md:h-[600px] flex flex-col"
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* Cabeçalho do painel */}
                  <div className="flex items-center justify-between p-4 border-b border-slate-700 shrink-0">
                    <h3 className="font-bold text-sm text-amber-500 flex items-center gap-2">
                      <MessageCircle className="w-4 h-4" />
                      Comentários dos alunos
                    </h3>
                    <button
                      onClick={() => setCommentsPanelOpen(false)}
                      className="text-slate-400 hover:text-slate-200 transition cursor-pointer"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  {/* Lista de comentários */}
                  <div className="flex-1 overflow-y-auto p-4 space-y-3">
                    {commentsLoading ? (
                      <p className="text-xs text-slate-500 text-center py-8">Carregando comentários...</p>
                    ) : comments.length === 0 ? (
                      <p className="text-xs text-slate-500 text-center py-8">
                        Nenhum comentário ainda. Seja o primeiro a comentar essa questão!
                      </p>
                    ) : (
                      comments.map((c) => (
                        <div key={c.id} className="bg-slate-900/60 border border-slate-700/60 rounded-xl p-3">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-[11px] font-bold text-amber-500">
                              {c.user_email?.split('@')[0] || 'Anônimo'}
                            </span>
                            <span className="text-[10px] text-slate-500">
                              {new Date(c.created_at).toLocaleDateString('pt-BR')}
                            </span>
                          </div>
                          <p className="text-xs text-slate-300 leading-relaxed">{c.comment_text}</p>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Campo de novo comentário */}
                  <div className="p-4 border-t border-slate-700 shrink-0 flex items-end gap-2">
                    <textarea
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      placeholder="Escreva um comentário sobre essa questão..."
                      rows={2}
                      className="flex-1 bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-xs text-slate-200 outline-none focus:border-amber-500 resize-none"
                    />
                    <button
                      onClick={handleSubmitComment}
                      disabled={commentSubmitting || !newComment.trim()}
                      className="bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-slate-950 p-2.5 rounded-xl transition cursor-pointer shrink-0"
                    >
                      <Send className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* MODAL DE REPORTAR ERRO */}
            {reportModalOpen && (
              <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={() => !reportSubmitting && setReportModalOpen(false)}>
                <div
                  className="bg-slate-800 border border-slate-700 rounded-2xl p-6 w-full max-w-sm space-y-4"
                  onClick={(e) => e.stopPropagation()}
                >
                  {reportSuccess ? (
                    <div className="text-center py-4 space-y-2">
                      <CheckCircle className="w-10 h-10 text-emerald-400 mx-auto" />
                      <p className="text-sm font-bold text-slate-200">Report enviado!</p>
                      <p className="text-xs text-slate-400">Obrigado por ajudar a melhorar o conteúdo.</p>
                    </div>
                  ) : (
                    <>
                      <div>
                        <h3 className="font-bold text-sm text-amber-500">Reportar erro na questão</h3>
                        <p className="text-xs text-slate-400 mt-1">Descreva o que está errado (gabarito incorreto, enunciado confuso, etc.)</p>
                      </div>
                      <textarea
                        value={reportText}
                        onChange={(e) => setReportText(e.target.value)}
                        placeholder="Ex: O gabarito está marcado como C, mas a resposta correta é B..."
                        rows={4}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-xs text-slate-200 outline-none focus:border-amber-500 resize-none"
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => setReportModalOpen(false)}
                          disabled={reportSubmitting}
                          className="flex-1 py-2.5 border border-slate-700 text-slate-400 rounded-xl text-xs font-bold hover:bg-slate-700 transition cursor-pointer disabled:opacity-50"
                        >
                          Cancelar
                        </button>
                        <button
                          onClick={handleSubmitReport}
                          disabled={reportSubmitting || !reportText.trim()}
                          className="flex-1 py-2.5 bg-amber-500 text-slate-950 rounded-xl text-xs font-bold hover:bg-amber-400 transition cursor-pointer disabled:opacity-50"
                        >
                          {reportSubmitting ? 'Enviando...' : 'Enviar Report'}
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* MATERIAIS */}
            {activeTab === 'materiais' && (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h2 className="text-lg font-bold flex items-center gap-2 text-amber-500 md:hidden">
                    <BookOpen className="w-5 h-5" /> Materiais de Estudo
                  </h2>
                  <div className="hidden md:block" />
                  <button
                    onClick={handlePrintPDF}
                    className="flex items-center gap-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 px-3 py-1.5 rounded-lg text-xs font-bold transition shadow cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Baixar PDF</span>
                  </button>
                </div>

                <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none md:flex-wrap">
                  {LISTA_DISCIPLINAS.map((disc) => (
                    <button
                      key={disc}
                      onClick={() => {
                        setSelectedDiscipline(disc);
                        setMaterialTopic('Todos');
                      }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition cursor-pointer ${
                        selectedDiscipline === disc
                          ? 'bg-amber-500 text-slate-950'
                          : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {disc}
                    </button>
                  ))}
                </div>

                <div className="grid grid-cols-2 bg-slate-800 p-1 rounded-xl gap-1 md:max-w-sm">
                  <button
                    onClick={() => setMaterialTab('resumo')}
                    className={`py-2 text-xs font-bold rounded-lg transition cursor-pointer ${
                      materialTab === 'resumo' ? 'bg-slate-700 text-amber-500' : 'text-slate-400'
                    }`}
                  >
                    📄 Resumo
                  </button>
                  <button
                    onClick={() => setMaterialTab('mapa_mental')}
                    className={`py-2 text-xs font-bold rounded-lg transition cursor-pointer ${
                      materialTab === 'mapa_mental' ? 'bg-slate-700 text-amber-500' : 'text-slate-400'
                    }`}
                  >
                    🧠 Mapa Mental
                  </button>
                </div>

                <div className="flex items-center gap-1.5 text-xs font-bold text-amber-500">
                  <Filter className="w-3.5 h-3.5" />
                  <span>Filtrar por Assunto:</span>
                </div>
                <select
                  value={materialTopic}
                  onChange={(e) => setMaterialTopic(e.target.value)}
                  className="w-full md:max-w-sm bg-slate-900 border border-slate-700 text-slate-200 text-xs rounded-lg p-2.5 focus:border-amber-500 outline-none"
                >
                  {(ESTRUTURA_MATERIAS[selectedDiscipline] || ['Todos']).map((t) => (
                    <option key={t} value={t}>{t === 'Todos' ? 'Todos os Assuntos' : t}</option>
                  ))}
                </select>

                {loadingMaterials ? (
                  <div className="text-center py-12 text-slate-400 text-sm">
                    Carregando materiais...
                  </div>
                ) : materiaisFiltrados.length === 0 ? (
                  <div className="text-center py-12 space-y-2 bg-slate-800/30 rounded-2xl border border-slate-800 p-6">
                    <p className="text-sm font-semibold text-slate-300">Nenhum material disponível ainda</p>
                    <p className="text-xs text-slate-500">
                      {materialTab === 'resumo' ? 'Resumo' : 'Mapa mental'} de {selectedDiscipline} em breve.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {materiaisFiltrados.map((m) => (
                      <div key={m.id} className="p-4 md:p-6 bg-slate-800 border border-slate-700/60 rounded-xl">
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                          <h3 className="font-bold text-sm text-amber-500">{m.title}</h3>
                          {m.topic && (
                            <span className="text-[10px] bg-slate-900 border border-slate-700 text-slate-400 px-2 py-0.5 rounded-full">
                              {m.topic}
                            </span>
                          )}
                        </div>
                        {m.type === 'mapa_mental' && m.url ? (
                          <img
                            src={m.url}
                            alt={m.title}
                            className="w-full h-auto rounded-lg border border-slate-700"
                            loading="lazy"
                          />
                        ) : (
                          <div>{renderContent(m.content)}</div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ANOTAÇÕES PESSOAIS */}
            {activeTab === 'anotacoes' && (
              <div className="space-y-4">
                <h2 className="text-lg font-bold flex items-center gap-2 text-sky-400 md:hidden">
                  <PenLine className="w-5 h-5" /> Minhas Anotações
                </h2>

                <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none md:flex-wrap">
                  {LISTA_DISCIPLINAS.map((disc) => (
                    <button
                      key={disc}
                      onClick={() => setNotesDiscipline(disc)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition cursor-pointer ${
                        notesDiscipline === disc
                          ? 'bg-sky-500 text-slate-950'
                          : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {disc}
                    </button>
                  ))}
                </div>

                <div className="bg-slate-800 border border-slate-700/60 rounded-xl p-4 md:p-6 space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-sm text-sky-400">{notesDiscipline}</h3>
                    <span className="text-[10px] text-slate-500">Salvo automaticamente neste dispositivo</span>
                  </div>
                  <textarea
                    value={notes[notesDiscipline] || ''}
                    onChange={(e) => setNotes((prev) => ({ ...prev, [notesDiscipline]: e.target.value }))}
                    placeholder={`Escreva aqui suas anotações sobre ${notesDiscipline}...`}
                    rows={14}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-sm text-slate-200 outline-none focus:border-sky-500 resize-y leading-relaxed"
                  />
                </div>
              </div>
            )}

            {/* CADERNO DE ERROS (SEPARADO POR ASSUNTOS E PORCENTAGEM) */}
            {activeTab === 'caderno' && (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <h2 className="text-lg font-bold flex items-center gap-2 text-red-400 md:hidden">
                    <AlertTriangle className="w-5 h-5" /> Caderno de Erros
                  </h2>
                  <div className="hidden md:block" />
                  {cadernoErros.length > 0 && (
                    <button
                      onClick={handlePrintPDF}
                      className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-amber-500 border border-amber-500/30 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      <span>Imprimir / PDF</span>
                    </button>
                  )}
                </div>

                {/* PAINEL DE ESTATÍSTICA DE ERROS POR ASSUNTO */}
                {cadernoErros.length > 0 && (
                  <div className="p-4 bg-slate-800/90 border border-slate-700 rounded-xl space-y-3">
                    <h3 className="text-xs font-bold text-amber-500 uppercase tracking-wide flex items-center gap-1.5">
                      <PieChart className="w-4 h-4" /> Distribuição de Dificuldade por Assunto
                    </h3>
                    <div className="space-y-2 md:grid md:grid-cols-2 md:gap-x-6 md:space-y-0">
                      {Object.entries(errosPorAssunto).map(([assunto, qtd]) => {
                        const porcentagem = ((qtd / cadernoErros.length) * 100).toFixed(1);
                        return (
                          <div key={assunto} className="space-y-1 py-1">
                            <div className="flex justify-between text-xs">
                              <span className="text-slate-300 font-medium truncate max-w-[70%]">{assunto}</span>
                              <span className="text-red-400 font-bold">{qtd} erro(s) ({porcentagem}%)</span>
                            </div>
                            <div className="w-full bg-slate-900 h-2 rounded-full overflow-hidden border border-slate-700">
                              <div 
                                className="bg-red-500 h-full transition-all duration-500" 
                                style={{ width: `${porcentagem}%` }} 
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {cadernoErros.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-8">
                    Nenhum erro registrado ainda! Continue treinando.
                  </p>
                ) : (
                  <div className="md:grid md:grid-cols-2 md:gap-4 md:space-y-0 space-y-4">
                  {cadernoErros.map((q) => (
                    <div key={q.id} className="p-4 bg-slate-800 border border-slate-700/60 rounded-xl space-y-3">
                      
                      {/* Cabeçalho da Questão no Caderno */}
                      <div className="flex justify-between items-center text-xs">
                        <div className="flex items-center gap-2">
                          <span className="text-amber-500 font-semibold">{q.discipline}</span>
                          <span className="text-slate-500">•</span>
                          <span className="text-slate-400 text-[11px]">{q.topic}</span>
                        </div>
                        <button 
                          onClick={() => handleRemoverDoCaderno(q.id)}
                          className="text-slate-500 hover:text-red-400 transition print:hidden cursor-pointer"
                          title="Remover do Caderno"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Enunciado */}
                      <p className="text-xs font-medium text-slate-200 leading-relaxed bg-slate-900/50 p-3 rounded-lg border border-slate-800">
                        {q.statement}
                      </p>

                      {/* Gabarito Correto */}
                      <div className="flex items-center justify-between text-xs pt-1">
                        <span className="text-emerald-400 font-bold bg-emerald-500/10 px-2.5 py-1 rounded border border-emerald-500/20">
                          Gabarito Correto: Alternativa {q.correctAnswer}
                        </span>
                      </div>

                      {/* Comentário / Explicação */}
                      {q.explanation ? (
                        <div className="p-3 bg-slate-900/80 rounded-lg border border-slate-700/60 text-xs text-slate-300 space-y-1">
                          <span className="font-bold text-amber-500 flex items-center gap-1.5">
                            <FileText className="w-3.5 h-3.5" /> Comentário do Gabarito:
                          </span>
                          <p className="leading-relaxed text-slate-300">{q.explanation}</p>
                        </div>
                      ) : (
                        <p className="text-[11px] italic text-slate-500">
                          Esta questão não possui comentário cadastrado no banco.
                        </p>
                      )}

                    </div>
                  ))}
                  </div>
                )}
              </div>
            )}

            {/* DESEMPENHO E ESTATÍSTICAS */}
            {activeTab === 'stats' && (
              <div className="space-y-4">
                <h2 className="text-lg font-bold flex items-center gap-2 text-amber-500 md:hidden">
                  <PieChart className="w-5 h-5" /> Desempenho Geral
                </h2>

                <div className="grid grid-cols-2 gap-3 md:gap-4">
                  <div className="p-4 md:p-6 bg-slate-800 border border-emerald-500/30 rounded-xl">
                    <p className="text-xs text-slate-400 font-medium">Taxa de Acerto</p>
                    <p className="text-2xl md:text-3xl font-black text-emerald-400">{taxaAcerto}%</p>
                    <p className="text-[10px] text-slate-500 mt-1">{stats.totalAcertos} acertos</p>
                  </div>

                  <div className="p-4 md:p-6 bg-slate-800 border border-red-500/30 rounded-xl">
                    <p className="text-xs text-slate-400 font-medium">Taxa de Erro</p>
                    <p className="text-2xl md:text-3xl font-black text-red-400">{taxaErro}%</p>
                    <p className="text-[10px] text-slate-500 mt-1">{totalErros} erros</p>
                  </div>
                </div>

                <div className="p-4 md:p-6 bg-slate-800 border border-slate-700/60 rounded-xl space-y-3">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-400 font-medium">Total de Questões Respondidas</span>
                    <span className="font-bold text-slate-200">{stats.totalRespondidas}</span>
                  </div>
                  
                  <div className="w-full bg-slate-900 h-3 rounded-full overflow-hidden flex border border-slate-700">
                    <div 
                      className="bg-emerald-500 h-full transition-all duration-500" 
                      style={{ width: `${taxaAcerto}%` }} 
                    />
                    <div 
                      className="bg-red-500 h-full transition-all duration-500" 
                      style={{ width: `${taxaErro}%` }} 
                    />
                  </div>

                  <div className="flex justify-between text-[11px] pt-1">
                    <span className="text-emerald-400 font-semibold">● Acertos: {stats.totalAcertos}</span>
                    <span className="text-red-400 font-semibold">● Erros: {totalErros}</span>
                  </div>
                </div>

                <button
                  onClick={handleResetStats}
                  className="w-full py-2.5 text-xs font-bold text-slate-500 hover:text-red-400 border border-slate-800 hover:border-red-500/30 rounded-xl transition cursor-pointer"
                >
                  Zerar estatísticas
                </button>
              </div>
            )}
            </div>
          </main>

          {/* BARRA DE NAVEGAÇÃO INFERIOR — SOMENTE MOBILE */}
          <nav className="md:hidden absolute bottom-0 left-0 right-0 max-w-xl mx-auto bg-slate-900/95 border-t border-slate-800 backdrop-blur p-2 flex justify-around items-center z-10 print:hidden overflow-x-auto">
            {NAV_ITEMS.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={`flex flex-col items-center gap-1 text-[10px] font-bold transition cursor-pointer shrink-0 px-1 ${
                  activeTab === id ? 'text-amber-500' : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{label}</span>
              </button>
            ))}
          </nav>

        </div>
      </div>
    </div>
  );
}
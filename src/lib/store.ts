import { create } from 'zustand';

export interface Project {
  title: string;
  description: string;
  links: string[];
  highlights: string[];
}

export interface Contact {
  email: string;
  phone: string;
  linkedin: string;
}

export interface Message {
  role: "user" | "assistant";
  content: string;
  projects?: Project[];
  contact?: Contact;
  showAction?: boolean;
}

interface HireSenseState {
  // File & Analysis State
  file: File | null;
  portfolioUrl: string;
  resumeText: string | null;
  isAnalyzing: boolean;
  analysisStatus: string;
  
  // Chat State
  messages: Message[];
  input: string;
  isSending: boolean;
  
  // Settings & Actions
  isVoiceEnabled: boolean;
  quickMessage: string;
  candidateEmail: string | null;
  sentMessages: string[];
  
  // Actions
  setFile: (file: File | null) => void;
  setPortfolioUrl: (url: string) => void;
  setResumeText: (text: string | null) => void;
  setIsAnalyzing: (isAnalyzing: boolean) => void;
  setAnalysisStatus: (status: string) => void;
  setMessages: (messages: Message[] | ((prev: Message[]) => Message[])) => void;
  setInput: (input: string) => void;
  setIsSending: (isSending: boolean) => void;
  setIsVoiceEnabled: (enabled: boolean) => void;
  setQuickMessage: (message: string) => void;
  setCandidateEmail: (email: string | null) => void;
  addSentMessage: (message: string) => void;
  reset: () => void;
}

export const useHireSenseStore = create<HireSenseState>((set) => ({
  file: null,
  portfolioUrl: "",
  resumeText: null,
  isAnalyzing: false,
  analysisStatus: "Analyzing...",
  messages: [],
  input: "",
  isSending: false,
  isVoiceEnabled: false,
  quickMessage: "",
  candidateEmail: null,
  sentMessages: [],

  setFile: (file) => set({ file }),
  setPortfolioUrl: (portfolioUrl) => set({ portfolioUrl }),
  setResumeText: (resumeText) => set({ resumeText }),
  setIsAnalyzing: (isAnalyzing) => set({ isAnalyzing }),
  setAnalysisStatus: (analysisStatus) => set({ analysisStatus }),
  setMessages: (update) => set((state) => ({ 
    messages: typeof update === 'function' ? update(state.messages) : update 
  })),
  setInput: (input) => set({ input }),
  setIsSending: (isSending) => set({ isSending }),
  setIsVoiceEnabled: (isVoiceEnabled) => set({ isVoiceEnabled }),
  setQuickMessage: (quickMessage) => set({ quickMessage }),
  setCandidateEmail: (candidateEmail) => set({ candidateEmail }),
  addSentMessage: (message) => set((state) => ({ 
    sentMessages: [...state.sentMessages, message] 
  })),
  reset: () => set({
    file: null,
    portfolioUrl: "",
    resumeText: null,
    isAnalyzing: false,
    analysisStatus: "Analyzing...",
    messages: [],
    input: "",
    isSending: false,
    quickMessage: "",
    candidateEmail: null,
    sentMessages: []
  }),
}));

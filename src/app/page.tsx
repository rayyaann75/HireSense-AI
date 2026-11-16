"use client";

import { useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { 
  Upload, 
  Send, 
  Bot, 
  User, 
  Mail, 
  ArrowRight, 
  FileText,
  Volume2,
  VolumeX,
  ExternalLink
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import axios from "axios";
import { useHireSenseStore, Message, Project, Contact } from "@/lib/store";
import { cn } from "@/lib/utils";

// Animation Variants
const blurFade = {
  initial: { opacity: 0, filter: "blur(12px)", y: 30 },
  animate: { opacity: 1, filter: "blur(0px)", y: 0 },
  exit: { opacity: 0, filter: "blur(12px)", y: -30 },
  transition: { duration: 1.2, ease: [0.22, 1, 0.36, 1] }
};

const blurFadeInRight = {
  initial: { opacity: 0, filter: "blur(12px)", x: 30 },
  animate: { opacity: 1, filter: "blur(0px)", x: 0 },
  transition: { duration: 1.2, ease: [0.22, 1, 0.36, 1] }
};

const containerVariants = {
  animate: {
    transition: {
      staggerChildren: 0.25
    }
  }
};

// Normalizes an unknown thrown value (axios error, Error, etc.) into a readable string.
const extractErrorMessage = (error: unknown): string => {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as { details?: string; error?: string } | undefined;
    return data?.details || data?.error || error.message;
  }
  return error instanceof Error ? error.message : String(error);
};

// Loading skeleton for chat messages (kept at module scope so its state is not
// recreated on every render).
const MessageSkeleton = () => (
  <div className="flex gap-4 mb-8">
    <Skeleton className="h-10 w-10 rounded-full flex-shrink-0" />
    <div className="space-y-2 flex-1">
      <Skeleton className="h-4 w-[200px]" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-[80%]" />
    </div>
  </div>
);

export default function Home() {
  const {
    portfolioUrl,
    resumeText,
    isAnalyzing,
    analysisStatus,
    messages,
    input,
    isSending,
    isVoiceEnabled,
    quickMessage,
    candidateEmail,
    setFile,
    setPortfolioUrl,
    setResumeText,
    setIsAnalyzing,
    setAnalysisStatus,
    setMessages,
    setInput,
    setIsSending,
    setIsVoiceEnabled,
    setQuickMessage,
    setCandidateEmail,
    addSentMessage,
    reset
  } = useHireSenseStore();

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const speak = async (text: string) => {
    if (!isVoiceEnabled) return;
    
    // Clean text for speech
    const cleanText = text
      .replace(/[#*`_~]/g, '')
      .replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1')
      .trim();

    try {
      const response = await axios.post("/api/tts", { text: cleanText }, { responseType: 'blob' });
      
      // If it's a direct audio stream
      if (response.headers['content-type'] === 'audio/mpeg') {
        const url = URL.createObjectURL(response.data);
        if (audioRef.current) {
          audioRef.current.src = url;
          audioRef.current.play();
        } else {
          const audio = new Audio(url);
          audioRef.current = audio;
          audio.play();
        }
      } else {
        // Fallback to client-side TTS if server-side is not available
        fallbackSpeak(cleanText);
      }
    } catch (error) {
      console.error("Server-side TTS failed, falling back to client-side:", error);
      fallbackSpeak(cleanText);
    }
  };

  const fallbackSpeak = (text: string) => {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    const voices = window.speechSynthesis.getVoices();
    const preferredVoice = voices.find(v => 
      v.lang.startsWith('en') && (v.name.includes('Google') || v.name.includes('Aria') || v.name.includes('Natural'))
    ) || voices.find(v => v.lang.startsWith('en')) || voices[0];
    
    if (preferredVoice) utterance.voice = preferredVoice;
    utterance.rate = 1.45;
    utterance.pitch = 1.08;
    window.speechSynthesis.speak(utterance);
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFile = e.target.files?.[0];
    if (!uploadedFile) return;

    setFile(uploadedFile);
    setIsAnalyzing(true);
    setAnalysisStatus("Starting Analysis...");

    const formData = new FormData();
    formData.append("file", uploadedFile);

    if (uploadedFile.type.startsWith('image/')) {
      setAnalysisStatus("AI is 'seeing' your image...");
    } else {
      setAnalysisStatus("AI is analyzing your document...");
    }

    try {
      const res = await axios.post("/api/analyze", formData, {
        timeout: 30000, // 30s timeout for analysis
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total) {
            const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            setAnalysisStatus(`Uploading... ${percentCompleted}%`);
          }
        }
      });
      setResumeText(res.data.text);
      setMessages([
        {
          role: "assistant",
          content: "Hello! I've analyzed the document. I'm ready to answer any questions you have about the candidate's experience, skills, or projects. What would you like to know first?",
        },
      ]);
    } catch (error: unknown) {
      console.error("Upload failed detailed error:", error);
      const errorMsg = extractErrorMessage(error);
      alert(`Upload failed: ${errorMsg}. This might be due to a network connection issue or file size.`);
    } finally {
      setIsAnalyzing(false);
      // Reset input value so same file can be selected again
      if (e.target) e.target.value = "";
    }
  };

  const handleUrlSubmit = async () => {
    if (!portfolioUrl.trim() || isAnalyzing) return;

    setIsAnalyzing(true);
    setAnalysisStatus("Scraping portfolio content...");
    try {
      const res = await axios.post("/api/analyze-url", { url: portfolioUrl });
      setResumeText(res.data.text);
      setMessages([
        {
          role: "assistant",
          content: `Hello! I've analyzed the portfolio at ${portfolioUrl}. I'm ready to answer any questions you have about the candidate's experience, skills, or projects. What would you like to know first?`,
        },
      ]);
    } catch (error: unknown) {
      const errorMsg = extractErrorMessage(error);
      alert(`URL Analysis failed: ${errorMsg}.`);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const parseResponse = (content: string): Message => {
    let text = content;
    let projects: Project[] | undefined;
    let contact: Contact | undefined;
    let showAction = false;

    // Helper to strip markdown code block markers from JSON
    const stripJsonMarkdown = (str: string) => str.replace(/```[a-z]*\n?|```/g, '').trim();

    const projectsMatch = text.match(/<projects>([\s\S]*?)<\/projects>/);
    if (projectsMatch) {
      try {
        const jsonContent = stripJsonMarkdown(projectsMatch[1]);
        projects = JSON.parse(jsonContent);
        text = text.replace(projectsMatch[0], "").trim();
      } catch (e) { console.error("Projects parse failed", e); }
    }

    const contactMatch = text.match(/<contact>([\s\S]*?)<\/contact>/);
    if (contactMatch) {
      try {
        const jsonContent = stripJsonMarkdown(contactMatch[1]);
        contact = JSON.parse(jsonContent);
        if (contact?.email) setCandidateEmail(contact.email);
        text = text.replace(contactMatch[0], "").trim();
      } catch (e) { console.error("Contact parse failed", e); }
    }

    if (text.includes("<message_action />")) {
      showAction = true;
      text = text.replace("<message_action />", "").trim();
    }

    return { role: "assistant", content: text, projects, contact, showAction };
  };

  const handleSend = async () => {
    if (!input.trim() || !resumeText || isSending) return;

    const userMessage: Message = { role: "user", content: input };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsSending(true);

    try {
      const res = await axios.post("/api/chat", {
        messages: [...messages, userMessage].map(m => ({ role: m.role, content: m.content })),
        resumeText,
      });

      const parsedMessage = parseResponse(res.data.content);
      setMessages((prev) => [...prev, parsedMessage]);
      if (isVoiceEnabled) speak(parsedMessage.content);
    } catch (error: unknown) {
      const errorMsg = extractErrorMessage(error);
      alert(`Chat failed: ${errorMsg}`);
    } finally {
      setIsSending(false);
    }
  };

  const handleQuickSend = () => {
    if (!quickMessage.trim() || !candidateEmail) return;
    const subject = "Exciting Opportunity - HireSense AI";
    const body = encodeURIComponent(quickMessage);
    window.location.href = `mailto:${candidateEmail}?subject=${encodeURIComponent(subject)}&body=${body}`;
    addSentMessage(quickMessage);
    setQuickMessage("");
    alert(`Draft created for: ${candidateEmail}`);
  };

  // Keep the conversation pinned to the bottom as messages arrive and while
  // the assistant is generating a response (like ChatGPT).
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, isSending]);

  if (!resumeText) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 relative overflow-hidden bg-[#020203]">
        {/* Animated Background */}
        <div className="absolute inset-0 -z-10 overflow-hidden">
          <motion.div animate={{ x: [0, 80, -80, 0], y: [0, 50, -50, 0], opacity: [0.15, 0.3, 0.15] }} transition={{ duration: 20, repeat: Infinity }} className="absolute -top-[10%] -left-[10%] w-[70%] h-[70%] bg-blue-900/30 blur-[140px] rounded-full" />
          <motion.div animate={{ x: [0, -60, 60, 0], y: [0, -40, 40, 0], opacity: [0.1, 0.25, 0.1] }} transition={{ duration: 25, repeat: Infinity }} className="absolute -bottom-[10%] -right-[10%] w-[65%] h-[65%] bg-slate-800/30 blur-[140px] rounded-full" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,rgba(0,0,0,0.4)_100%)]" />
        </div>

        <motion.div 
          variants={containerVariants}
          initial="initial"
          animate="animate"
          className="max-w-2xl w-full text-center space-y-12 z-10"
        >
          <div className="space-y-6">
            <motion.h1 
              variants={blurFade}
              className="text-6xl font-black tracking-tighter text-white sm:text-7xl bg-clip-text text-transparent bg-gradient-to-b from-white to-white/40 leading-none"
            >
              HireSense AI
            </motion.h1>
            <motion.p 
              variants={blurFade}
              className="text-xl text-zinc-400 font-medium tracking-tight"
            >
              Transform any resume or complex portfolio into an interactive AI-powered experience.
            </motion.p>
          </div>

          <motion.div variants={blurFade}>
            <Card className="glass shadow-2xl border-white/5 relative group overflow-hidden">
              <CardContent className="pt-16 pb-16 flex flex-col items-center gap-8">
                <motion.div 
                  whileHover={{ scale: 1.05, rotate: 5 }} 
                  whileTap={{ scale: 0.95 }} 
                  className="p-6 bg-blue-600 rounded-[2rem] text-white shadow-2xl shadow-blue-600/30 cursor-pointer" 
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="h-12 w-12" />
                </motion.div>
                <div className="space-y-2 text-center">
                  <p className="text-3xl font-bold text-white tracking-tight">{isAnalyzing ? analysisStatus : "Upload candidate's resume or portfolio"}</p>
                  <p className="text-zinc-500 font-semibold tracking-wide uppercase text-xs">Supports PDF, DOCX, Images, and Text portfolios</p>
                </div>
                <input 
                  type="file" 
                  ref={fileInputRef}
                  className="hidden" 
                  accept=".pdf,.docx,.txt,.png,.jpg,.jpeg" 
                  onChange={handleUpload} 
                  disabled={isAnalyzing} 
                />
                <Button 
                  size="lg" 
                  className="h-16 px-10 text-xl bg-white text-black hover:bg-zinc-200 shadow-2xl rounded-2xl font-black" 
                  disabled={isAnalyzing} 
                  onClick={() => fileInputRef.current?.click()}
                >
                  {isAnalyzing ? <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }}><ArrowRight className="h-7 w-7" /></motion.div> : <><FileText className="h-7 w-7 mr-3" />Choose File</>}
                </Button>

                <div className="w-full px-12 pt-8 flex flex-col gap-6">
                  <div className="flex items-center gap-6">
                    <div className="h-[1px] flex-1 bg-white/5" />
                    <span className="text-xs uppercase tracking-[0.4em] text-zinc-600 font-black">OR</span>
                    <div className="h-[1px] flex-1 bg-white/5" />
                  </div>
                  <div className="flex gap-2 p-2 glass-dark rounded-2xl border border-white/5">
                    <Input placeholder="Enter portfolio URL..." value={portfolioUrl} onChange={(e) => setPortfolioUrl(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleUrlSubmit()} className="flex-1 bg-transparent border-none focus-visible:ring-0 text-white font-bold" disabled={isAnalyzing} />
                    <Button variant="ghost" onClick={handleUrlSubmit} className="rounded-xl text-blue-400 font-black" disabled={isAnalyzing || !portfolioUrl.trim()}>Analyze Link</Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-[#020203] text-white relative overflow-hidden">
      <header className="h-20 glass border-b border-white/5 flex items-center justify-between px-10 sticky top-0 z-50 backdrop-blur-3xl shadow-2xl">
        <div className="flex items-center gap-5">
          <motion.div whileHover={{ scale: 1.05 }} className="h-12 w-12 bg-white rounded-2xl flex items-center justify-center text-black shadow-2xl">
            <Bot className="h-7 w-7" />
          </motion.div>
          <div>
            <h2 className="font-black text-xl text-white tracking-tighter">HireSense AI</h2>
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_10px_#10b981]" />
              <span className="text-[10px] uppercase tracking-[0.2em] font-black text-emerald-500/80">Active Analysis</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => setIsVoiceEnabled(!isVoiceEnabled)} className={cn("rounded-xl transition-all", isVoiceEnabled ? "bg-blue-600/20 text-blue-400" : "text-zinc-500")}>
            {isVoiceEnabled ? <Volume2 className="h-5 w-5" /> : <VolumeX className="h-5 w-5" />}
          </Button>
          <Button variant="ghost" onClick={reset} className="text-zinc-500 hover:text-white font-bold text-xs uppercase tracking-widest">New Session</Button>
        </div>
      </header>

      <main className="flex-1 flex min-h-0 overflow-hidden max-w-[1600px] mx-auto w-full">
        <ScrollArea className="flex-1 px-10 py-10">
          <div className="max-w-4xl mx-auto space-y-12">
            <AnimatePresence mode="popLayout">
              {messages.map((m, idx) => (
                <motion.div 
                  key={idx} 
                  variants={blurFade}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  className={cn("flex gap-6", m.role === "user" ? "flex-row-reverse" : "flex-row")}
                >
                  <Avatar className={cn("h-12 w-12 border-2", m.role === "user" ? "border-blue-600/50 shadow-blue-600/20 shadow-xl" : "border-white/10 shadow-black/50 shadow-xl")}>
                    <AvatarFallback className={m.role === "user" ? "bg-blue-600" : "bg-zinc-800"}>
                      {m.role === "user" ? <User className="h-6 w-6" /> : <Bot className="h-6 w-6" />}
                    </AvatarFallback>
                  </Avatar>
                  <div className={cn("flex flex-col gap-4 max-w-[80%]", m.role === "user" ? "items-end" : "items-start")}>
                    <motion.div 
                      layout
                      className={cn("p-6 rounded-3xl shadow-2xl", m.role === "user" ? "bg-blue-600 text-white rounded-tr-none" : "glass text-zinc-100 rounded-tl-none border-white/5")}
                    >
                      <div className="prose prose-invert max-w-none text-lg font-medium tracking-tight prose-headings:text-white prose-strong:text-white prose-a:text-blue-400 prose-ul:my-2 prose-li:my-1">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                          {m.content}
                        </ReactMarkdown>
                      </div>
                    </motion.div>

                    {m.projects && (
                      <motion.div 
                        variants={containerVariants}
                        initial="initial"
                        animate="animate"
                        className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full"
                      >
                        {m.projects.map((p, pIdx) => (
                          <motion.div key={pIdx} variants={blurFadeInRight}>
                            <Card className="glass-dark border-white/5 hover:border-blue-500/30 transition-all duration-300 group h-full">
                              <CardContent className="p-6 space-y-4">
                                <h4 className="text-xl font-black text-white group-hover:text-blue-400 transition-colors">{p.title}</h4>
                                <p className="text-sm text-zinc-400 font-medium leading-relaxed">{p.description}</p>
                                <div className="flex flex-wrap gap-2">
                                  {p.highlights.map((h, hIdx) => (
                                    <Badge key={hIdx} variant="secondary" className="bg-white/5 text-[10px] uppercase font-black tracking-widest text-zinc-400 border-none px-2 py-0.5">{h}</Badge>
                                  ))}
                                </div>
                                <div className="flex gap-4 pt-2">
                                  {p.links.map((link, lIdx) => (
                                    <a key={lIdx} href={link} target="_blank" rel="noopener noreferrer" className="text-xs font-black text-blue-400 hover:text-blue-300 flex items-center gap-1">
                                      <ExternalLink className="h-3 w-3" /> View Source
                                    </a>
                                  ))}
                                </div>
                              </CardContent>
                            </Card>
                          </motion.div>
                        ))}
                      </motion.div>
                    )}

                    {m.showAction && candidateEmail && (
                      <motion.div 
                        variants={blurFade}
                        className="w-full"
                      >
                        <Card className="w-full glass border-blue-500/20 shadow-2xl shadow-blue-500/5">
                          <CardContent className="p-8 space-y-6">
                            <div className="flex items-center gap-4">
                              <div className="p-3 bg-blue-600 rounded-2xl shadow-lg"><Mail className="h-6 w-6 text-white" /></div>
                              <div>
                                <h4 className="font-black text-white text-lg">Send Message to Candidate</h4>
                                <p className="text-xs text-zinc-500 font-bold uppercase tracking-widest">Contacting: {candidateEmail}</p>
                              </div>
                            </div>
                            <div className="space-y-4">
                              <Input placeholder="Type your message here..." value={quickMessage} onChange={(e) => setQuickMessage(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleQuickSend()} className="h-14 bg-white/5 border-white/10 rounded-2xl focus:border-blue-500/50 transition-all font-bold" />
                              <Button onClick={handleQuickSend} disabled={!quickMessage.trim()} className="w-full h-14 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-black text-lg shadow-xl shadow-blue-600/20">Send Quick Message</Button>
                            </div>
                          </CardContent>
                        </Card>
                      </motion.div>
                    )}
                  </div>
                </motion.div>
              ))}
              {isSending && (
                <motion.div 
                  variants={blurFade}
                  initial="initial"
                  animate="animate"
                >
                  <MessageSkeleton />
                </motion.div>
              )}
            </AnimatePresence>
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>
      </main>

      <footer className="p-8 glass-dark border-t border-white/5 sticky bottom-0 z-50">
        <motion.div 
          variants={blurFade}
          initial="initial"
          animate="animate"
          className="max-w-4xl mx-auto"
        >
          <div className="relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-[2rem] blur opacity-20 group-hover:opacity-40 transition duration-1000 group-focus-within:opacity-60" />
            <div className="relative flex gap-4 p-3 bg-[#0a0a0b] rounded-[1.8rem] border border-white/10 shadow-2xl shadow-black">
              <Input placeholder="Ask me about the candidate's skills, experience, or projects..." value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleSend()} disabled={isSending} className="flex-1 bg-transparent border-none focus-visible:ring-0 text-white text-lg font-medium placeholder:text-zinc-600 px-6 h-14" />
              <Button size="icon" onClick={handleSend} disabled={isSending || !input.trim()} className="h-14 w-14 rounded-2xl bg-white text-black hover:bg-zinc-200 transition-all shadow-2xl">
                <Send className="h-6 w-6" />
              </Button>
            </div>
          </div>
          <p className="text-center mt-4 text-[10px] text-zinc-600 font-black uppercase tracking-[0.3em]">HireSense AI • Powered by Advanced LLMs</p>
        </motion.div>
      </footer>
    </div>
  );
}

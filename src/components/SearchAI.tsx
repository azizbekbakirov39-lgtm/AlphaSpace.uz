import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence, useDragControls } from 'motion/react';
import { Send, Camera, Image as ImageIcon, Sparkles, User, Bot, Loader2, X, ChevronRight, ShoppingBag, ArrowLeft, Trash2, Mic, Zap, Tag, Download, Share2, Plus, Pencil, Settings } from 'lucide-react';
import { GoogleGenAI, Type } from "@google/genai";
import Markdown from 'react-markdown';
import { toast } from 'sonner';
import { useKeyboard } from '../hooks/useKeyboard';
import { MOCK_POSTS, MOCK_SELLERS } from '../constants';
import { PostData, AIMessage, Obraz } from '../types';

import { Language, translations } from '../translations';

interface SearchAIProps {
  language: Language;
  pendingTryOn?: any;
  onClearPendingTryOn?: () => void;
  messages: AIMessage[];
  setMessages: React.Dispatch<React.SetStateAction<AIMessage[]>>;
  foundPosts: PostData[];
  setFoundPosts: React.Dispatch<React.SetStateAction<PostData[]>>;
  foundObrazlar: Obraz[];
  setFoundObrazlar: React.Dispatch<React.SetStateAction<Obraz[]>>;
  onOpenPostDetails: (post: PostData) => void;
  globalMuted: boolean;
  setGlobalMuted: (muted: boolean) => void;
  allPosts: PostData[];
  allSellers: Seller[];
}

const QUICK_PROMPTS = [
  { id: 'wedding', icon: '💍', text: { uz: "To'y uchun obraz yig'ib ber", 'uz-cyrl': "Тўй учун образ йиғиб бер", ru: "Собери образ для свадьбы", en: "Pick a wedding outfit" } },
  { id: 'daily', icon: '👕', text: { uz: "Bugun nima kiyishni maslahat berasan?", 'uz-cyrl': "Бугун нима кийишни маслаҳат берасан?", ru: "Что посоветуешь надеть сегодня?", en: "What do you suggest wearing today?" } },
  { id: 'budget', icon: '💰', text: { uz: "Menga 1 mln so'm atrofida kiyim top", 'uz-cyrl': "Менга 1 млн сўм атрофида кийим топ", ru: "Найди одежду около 1 млн сум", en: "Find clothes around 1M sum" } },
  { id: 'office', icon: '💼', text: { uz: "Ofis uchun zamonaviy kiyimlar", 'uz-cyrl': "Офис учун замонавий кийимлар", ru: "Стильная одежда для офиса", en: "Stylish office wear" } },
];

const SearchAI: React.FC<SearchAIProps> = ({ 
  language, 
  pendingTryOn, 
  onClearPendingTryOn,
  messages,
  setMessages,
  foundPosts,
  setFoundPosts,
  foundObrazlar,
  setFoundObrazlar,
  onOpenPostDetails,
  globalMuted,
  setGlobalMuted,
  allPosts,
  allSellers
}) => {
  const t = translations[language];
  const { isKeyboardOpen, keyboardHeight } = useKeyboard();

  useEffect(() => {
    if (messages.length === 0) {
      setMessages([
        {
          id: '1',
          role: 'assistant',
          content: language === 'uz' ? "Salom! Men **SmartSeller** — sizning shaxsiy AlphaSpace stilistingizman. Menga o'zingiz qidirayotgan kiyim haqida yozing yoki rasmingizni yuboring. Men sizga eng mos kiyimlarni tanlab beraman! ✨" :
                   language === 'uz-cyrl' ? "Салом! Мен **SmartSeller** — сизнинг шахсий AlphaSpace стилистингизман. Менга ўзингиз қидираётган кийим ҳақида ёзинг ёки расмингизни юборинг. Мен сизга энг мос кийимларни танлаб бераман! ✨" :
                   language === 'ru' ? "Привет! Я **SmartSeller** — ваш личный стилист AlphaSpace. Напишите мне о одежде, которую вы ищете, или пришлите фото. Я подберу для вас наиболее подходящую одежду! ✨" :
                   "Hello! I am **SmartSeller** — your personal AlphaSpace stylist. Write to me about the clothes you are looking for or send a photo. I will choose the most suitable clothes for you! ✨"
        }
      ]);
    }
  }, [language, messages.length, setMessages]);

  useEffect(() => {
    if (pendingTryOn) {
      const tryOnMessage = language === 'uz' ? `Men ushbu **${pendingTryOn.outfitName}** kiyimini kiyib ko'rmoqchiman. Iltimos, mening rasmimni yuborganimdan so'ng uni menga kiydirib bering! ✨` :
                           language === 'ru' ? `Я хочу примерить эту одежду **${pendingTryOn.outfitName}**. Пожалуйста, оденьте её на меня после того, как я пришлю свое фото! ✨` :
                           `I want to try on this **${pendingTryOn.outfitName}**. Please put it on me after I send my photo! ✨`;
      
      setInput(tryOnMessage);
    }
  }, [pendingTryOn, language]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [view, setView] = useState<'chat' | 'results'>('chat');
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const [isTtsLoading, setIsTtsLoading] = useState<string | null>(null);

  // Memory State
  const [memories, setMemories] = useState<{ id: string, key: string, value: string }[]>(() => {
    const saved = localStorage.getItem('smartseller_memories');
    return saved ? JSON.parse(saved) : [];
  });
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    localStorage.setItem('smartseller_memories', JSON.stringify(memories));
  }, [memories]);

  const handleListen = async (messageId: string, text: string) => {
    if (isTtsLoading) return;
    setIsTtsLoading(messageId);
    
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });
      
      // Sanitize text for TTS: remove markdown and emojis
      const sanitizedText = text
        .replace(/[*_#`~]/g, '') // Remove markdown symbols
        .replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '') // Remove emojis
        .slice(0, 500); // Limit length to avoid model errors

      if (sanitizedText.trim().length > 0) {
        const ttsResponse = await ai.models.generateContent({
          model: "gemini-2.5-flash-preview-tts",
          contents: [{ parts: [{ text: sanitizedText }] }],
          config: {
            responseModalities: ["AUDIO"],
            speechConfig: {
              voiceConfig: {
                prebuiltVoiceConfig: { voiceName: 'Kore' },
              },
            },
          },
        });
        
        const audioData = ttsResponse.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
        if (audioData) {
          const audioUrl = `data:audio/mp3;base64,${audioData}`;
          setMessages(prev => prev.map(m => 
            m.id === messageId ? { ...m, audio: audioUrl } : m
          ));
          
          // Auto-play the audio
          const audio = new Audio(audioUrl);
          audio.play().catch(e => console.error("Audio playback failed:", e));
        }
      }
    } catch (err: any) {
      console.error("TTS Error:", err);
      if (err.message?.includes('429') || err.message?.includes('RESOURCE_EXHAUSTED')) {
        toast.error(language === 'uz' ? "Ovozli xabar limiti tugadi. Iltimos, birozdan so'ng urinib ko'ring." : "Лимит голосовых сообщений исчерпан. Пожалуйста, попробуйте позже.");
      } else {
        toast.error(language === 'uz' ? "Ovozli xabar yaratishda xatolik yuz berdi." : "Ошибка при создании голосового сообщения.");
      }
    } finally {
      setIsTtsLoading(null);
    }
  };

  const compressImage = (base64: string): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d')!;
        
        // Max dimension 1024px
        let width = img.width;
        let height = img.height;
        const maxDim = 1024;
        
        if (width > height && width > maxDim) {
          height = (height * maxDim) / width;
          width = maxDim;
        } else if (height > maxDim) {
          width = (width * maxDim) / height;
          height = maxDim;
        }
        
        canvas.width = width;
        canvas.height = height;
        ctx.drawImage(img, 0, 0, width, height);
        // Increased quality from 0.6 to 0.85 for better facial details
        resolve(canvas.toDataURL('image/jpeg', 0.85));
      };
      img.src = base64;
    });
  };

  // Typewriter effect state
  const [displayedContent, setDisplayedContent] = useState<Record<string, string>>({});

  useEffect(() => {
    const lastMessage = messages[messages.length - 1];
    if (lastMessage && lastMessage.role === 'assistant' && lastMessage.content) {
      const id = lastMessage.id;
      const targetContent = lastMessage.content;
      const currentDisplayed = displayedContent[id] || '';

      if (currentDisplayed.length < targetContent.length) {
        const timer = setTimeout(() => {
          // Add next character or word
          // For "ChatGPT" feel, we can add a few characters at a time if it's lagging behind
          const diff = targetContent.length - currentDisplayed.length;
          const increment = diff > 20 ? 5 : 1;
          setDisplayedContent(prev => ({
            ...prev,
            [id]: targetContent.slice(0, currentDisplayed.length + increment)
          }));
        }, 10);
        return () => clearTimeout(timer);
      }
    }
  }, [messages, displayedContent]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const newImages: string[] = [];
      const filesArray = Array.from(files);
      
      // Limit to 4 images total
      const remainingSlots = 4 - selectedImages.length;
      const filesToProcess = filesArray.slice(0, remainingSlots);

      let processedCount = 0;
      filesToProcess.forEach(file => {
        const reader = new FileReader();
        reader.onloadend = () => {
          newImages.push(reader.result as string);
          processedCount++;
          if (processedCount === filesToProcess.length) {
            setSelectedImages(prev => [...prev, ...newImages]);
          }
        };
        reader.readAsDataURL(file);
      });
    }
    // Reset input value to allow selecting the same file again
    e.target.value = '';
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const startVoiceInput = async () => {
    if (isRecording) {
      stopRecording();
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64 = reader.result as string;
          sendMessage(undefined, base64);
        };
        reader.readAsDataURL(audioBlob);
        
        stream.getTracks().forEach(track => track.stop());
        setRecordingDuration(0);
      };

      mediaRecorder.start();
      setIsRecording(true);
      setIsListening(true);
      
      // Start timer
      setRecordingDuration(0);
      recordingTimerRef.current = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);
    } catch (err) {
      console.error("Recording error:", err);
      // alert replaced with a more subtle UI feedback or console log
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setIsListening(false);
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
      }
    }
  };

  const handleQuickPrompt = (promptText: string) => {
    setInput(promptText);
    // Auto-send after a short delay to feel natural
    setTimeout(() => {
      const sendBtn = document.getElementById('ai-send-button');
      if (sendBtn) sendBtn.click();
    }, 100);
  };

  const sendMessage = async (overrideInput?: string, overrideAudio?: string) => {
    const currentInput = overrideInput !== undefined ? overrideInput : input;
    const currentAudio = overrideAudio || null;

    if (!currentInput.trim() && selectedImages.length === 0 && !currentAudio) return;

    const userMessage: AIMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: currentInput,
      images: selectedImages.length > 0 ? [...selectedImages] : undefined,
      audio: currentAudio || undefined
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setSelectedImages([]);

    setIsLoading(true);
    
    // Create a placeholder for the AI response
    const aiMessageId = (Date.now() + 1).toString();
    const aiPlaceholder: AIMessage = {
      id: aiMessageId,
      role: 'assistant',
      content: ''
    };
    setMessages(prev => [...prev, aiPlaceholder]);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });
      
      // Compress new images for the current request
      const compressedNewImages = userMessage.images 
        ? await Promise.all(userMessage.images.map(img => compressImage(img)))
        : [];

      const model = "gemini-3-flash-preview";
      
      const systemInstruction = `
        Sizning ismingiz "SmartSeller". Siz AlphaSpace platformasining aqlli stilistisiz.
        
        Sizning xotirangizda quyidagi ma'lumotlar bor (agar bo'lsa):
        ${memories.map(m => `- ${m.key}: ${m.value}`).join('\n')}
        
        Sizning muloqot uslubingiz:
        1. Insondek samimiy va erkin suhbat qiling.
        2. Foydalanuvchi bilan do'stdek javob bering. O'zingizni "SmartSeller" deb tanishtiring.
        3. Emojilardan keng foydalaning.
        4. MUHIM: Kamalak emojisi (🌈) va LGBT belgilaridan foydalanmang.
        5. MUHIM: Foydalanuvchi qaysi tilda murojaat qilsa, aynan shu tilda javob bering (O'zbek lotin, O'zbek kirill, Rus tili yoki Ingliz tili).
        6. MUHIM: FAQAT foydalanuvchi "topib ber", "qidir", "ko'rsat" kabi so'zlar bilan aniq so'ragandagina mahsulot taklif qiling. O'z-o'zidan mahsulot taklif qilmang.
        7. MUHIM: Agar foydalanuvchi so'ragan narsa bizning bazamizda (MOCK_POSTS) bo'lmasa, boshqa narsalarni taklif qilmang. Shunchaki topilmadi deb ayting.
        8. XOTIRA: Agar foydalanuvchi biror ma'lumotni eslab qolishni so'rasa (masalan: "Ismim Azizbek, eslab qol"), javobingizda JSON formatida "saveToMemory" maydonini qo'shing.
        9. LOGO/RASM: Agar foydalanuvchi logo yaratishni yoki biror rasm chizishni so'rasa, javobingizda JSON formatida "generateImagePrompt" maydonini qo'shing. Bu maydonda rasm uchun ingliz tilida batafsil tavsif (prompt) bo'lishi kerak.
        
        Mavjud to'plamlar (Haqiqiy ma'lumotlar bazasi):
        ${allPosts.map(p => `ID: ${p.id}, Nomi: ${p.outfitName}, Brend: ${p.seller.name}, Xudud: ${p.seller.region}, Narxi: ${p.price}`).join('\n')}
        
        Sotuvchilar:
        ${allSellers.map(s => `ID: ${s.id}, Nomi: ${s.name}, Region: ${s.region}`).join('\n')}
        
        Javobingizni JSON formatida bering:
        {
          "text": "Foydalanuvchiga stilist yoki do'st sifatida javobingiz (Foydalanuvchi tilida)",
          "imageDescriptions": ["Agar foydalanuvchi rasm yuborgan bo'lsa, har bir rasmning qisqacha tavsifi"],
          "recommendedPostIds": ["post IDlari ro'yxati (faqat so'ralganda va topilganda)"],
          "recommendedObrazlar": [
            {
              "type": "Obraz turi",
              "totalPrice": "Obrazning umumiy narxi",
              "postIds": ["Obrazga kiruvchi post IDlari ro'yxati"]
            }
          ],
          "saveToMemory": { "key": "Ma'lumot turi (masalan: Ism)", "value": "Ma'lumot qiymati" }
        }
      `;

      // Construct OPTIMIZED history for Gemini
      // We only send text context for history to save tokens and avoid re-uploading heavy images
      // Limit history to last 6 messages to save tokens and avoid quota issues
      const history = messages.slice(-6).map(msg => ({
        role: msg.role === 'user' ? 'user' : 'model',
        parts: [
          { 
            text: msg.content + 
                  ((msg.images && msg.images.length > 0) ? ` [Foydalanuvchi rasm yuborgan edi: ${msg.imageDescriptions?.join(', ') || 'Rasm tavsifi yo\'q'}]` : "") +
                  (msg.audio ? " [Foydalanuvchi ovozli xabar yuborgan edi]" : "")
          }
        ]
      }));

      const currentParts: any[] = [];
      if (currentInput) currentParts.push({ text: currentInput });
      
      // Only send images for the CURRENT request
      for (const img of compressedNewImages) {
        currentParts.push({
          inlineData: {
            mimeType: "image/jpeg",
            data: img.split(',')[1]
          }
        });
      }

      if (currentAudio) {
        currentParts.push({
          inlineData: {
            mimeType: "audio/webm",
            data: currentAudio.split(',')[1]
          }
        });
      }

      const responseStream = await ai.models.generateContentStream({
        model,
        contents: [
          ...history,
          { role: 'user', parts: currentParts }
        ],
        config: {
          systemInstruction,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              text: { type: Type.STRING },
              imageDescriptions: {
                type: Type.ARRAY,
                items: { type: Type.STRING }
              },
              recommendedPostIds: { 
                type: Type.ARRAY, 
                items: { type: Type.STRING } 
              },
              recommendedObrazlar: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    type: { type: Type.STRING },
                    totalPrice: { type: Type.STRING },
                    postIds: {
                      type: Type.ARRAY,
                      items: { type: Type.STRING }
                    }
                  },
                  required: ["type", "totalPrice", "postIds"]
                }
              },
              saveToMemory: {
                type: Type.OBJECT,
                properties: {
                  key: { type: Type.STRING },
                  value: { type: Type.STRING }
                }
              },
              generateImagePrompt: { type: Type.STRING }
            },
            required: ["text", "recommendedPostIds", "recommendedObrazlar"]
          }
        }
      });

      let fullResponseString = "";
      let lastExtractedText = "";

      for await (const chunk of responseStream) {
        fullResponseString += chunk.text;
        
        // Try to extract the "text" field from the partial JSON
        // We look for the content of the "text" key
        const textMatch = fullResponseString.match(/"text":\s*"((?:[^"\\]|\\.)*)/);
        if (textMatch && textMatch[1]) {
          let currentText = textMatch[1];
          // Basic unescaping for common characters during streaming
          currentText = currentText.replace(/\\n/g, '\n').replace(/\\"/g, '"');
          
          if (currentText !== lastExtractedText) {
            lastExtractedText = currentText;
            setMessages(prev => prev.map(m => 
              m.id === aiMessageId ? { ...m, content: currentText } : m
            ));
          }
        }
      }

      const data = JSON.parse(fullResponseString || "{}");
      
      if (data.generateImagePrompt) {
        setIsGeneratingImage(true);
        try {
          const imageResponse = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image',
            contents: [{ parts: [{ text: data.generateImagePrompt }] }],
            config: {
              imageConfig: {
                aspectRatio: "1:1"
              }
            }
          });
          
          let generatedImageUrl = "";
          for (const part of imageResponse.candidates?.[0]?.content?.parts || []) {
            if (part.inlineData) {
              generatedImageUrl = `data:image/png;base64,${part.inlineData.data}`;
              break;
            }
          }
          
          if (generatedImageUrl) {
            setMessages(prev => prev.map(m => 
              m.id === aiMessageId ? { ...m, generatedImage: generatedImageUrl } : m
            ));
          }
        } catch (err) {
          console.error("Image generation error:", err);
        } finally {
          setIsGeneratingImage(false);
        }
      }
      
      if (data.saveToMemory) {
        setMemories(prev => {
          const newMemories = [...prev.filter(m => m.key !== data.saveToMemory.key), { id: Date.now().toString(), ...data.saveToMemory }];
          return newMemories;
        });
        toast.success(language === 'uz' ? "Xotiraga saqlandi! ✅" : language === 'uz-cyrl' ? "Хотирага сақланди! ✅" : language === 'ru' ? "Сохранено в память! ✅" : "Saved to memory! ✅");
      }
      
      // Update the user message with image descriptions if provided by AI
      if (data.imageDescriptions && data.imageDescriptions.length > 0) {
        setMessages(prev => prev.map(m => 
          m.id === userMessage.id ? { ...m, imageDescriptions: data.imageDescriptions } : m
        ));
      }

      // Final update with full content
      setMessages(prev => prev.map(m => 
        m.id === aiMessageId 
          ? { ...m, content: data.text || (language === 'uz' ? "Kechirasiz, hozirda javob bera olmayman." : language === 'uz-cyrl' ? "Кечирасиз, ҳозирда жавоб бера олмайман." : language === 'ru' ? "Извините, сейчас я не могу ответить." : "Sorry, I can't answer right now.") } 
          : m
      ));

      if (data.recommendedPostIds && data.recommendedPostIds.length > 0) {
        const posts = allPosts.filter(p => data.recommendedPostIds.includes(p.id));
        if (posts.length > 0) {
          setFoundPosts(posts);
          setFoundObrazlar([]); // Clear obrazlar if single posts are found
        } else {
          setFoundPosts([]);
          setFoundObrazlar([]);
        }
      } else if (!data.recommendedObrazlar || data.recommendedObrazlar.length === 0) {
        setFoundPosts([]);
        setFoundObrazlar([]);
      }

    } catch (error) {
      console.error("AI Error:", error);
      const errorMessage = language === 'uz' ? "Xatolik yuz berdi. Iltimos, qaytadan urinib ko'ring." :
                           language === 'uz-cyrl' ? "Хатолик юз берди. Илтимос, қайтадан уриниб кўринг." :
                           language === 'ru' ? "Произошла ошибка. Пожалуйста, попробуйте еще раз." :
                           "An error occurred. Please try again.";
      setMessages(prev => prev.map(m => 
        m.id === aiMessageId ? { ...m, content: errorMessage } : m
      ));
    } finally {
      setIsLoading(false);
    }
  };

  const handleDragEnd = (event: any, info: any) => {
    // Increased thresholds to prevent accidental swipes during clicks
    const swipeThreshold = 50;
    const velocityThreshold = 500;
    
    const hasResults = foundPosts.length > 0 || foundObrazlar.length > 0;
    
    if (view === 'chat' && hasResults) {
      if (info.offset.x < -swipeThreshold || info.velocity.x < -velocityThreshold) {
        setView('results');
      }
    } else if (view === 'results') {
      if (info.offset.x > swipeThreshold || info.velocity.x > velocityThreshold) {
        setView('chat');
      }
    }
  };

  return (
    <div className="relative h-full w-full bg-bg-primary overflow-hidden">
      {/* Global Background Effects */}
      <div className="absolute inset-0 z-0 opacity-60 dark:opacity-40 pointer-events-none overflow-hidden">
        <motion.div 
          animate={{ 
            x: [0, 150, -100, 0],
            y: [0, -100, 150, 0],
            scale: [1, 1.4, 0.8, 1],
            rotate: [0, 180, 360]
          }}
          transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
          className="absolute top-[-10%] left-[-10%] w-[100%] h-[100%] rounded-full bg-accent-blue/40 blur-[80px]" 
        />
        <motion.div 
          animate={{ 
            x: [0, -150, 100, 0],
            y: [0, 150, -100, 0],
            scale: [1.4, 0.7, 1.2, 1.4],
            rotate: [360, 180, 0]
          }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          className="absolute bottom-[-10%] right-[-10%] w-[100%] h-[100%] rounded-full bg-accent-light/40 blur-[80px]" 
        />
      </div>

      <motion.div
        className="flex h-full w-[200%] relative z-10"
        animate={{ x: view === 'chat' ? '0%' : '-50%' }}
        transition={{ 
          type: 'spring',
          stiffness: 400,
          damping: 40,
          mass: 0.8
        }}
        drag={(foundPosts.length > 0 || foundObrazlar.length > 0) ? "x" : false}
        dragConstraints={{ left: -window.innerWidth, right: 0 }}
        dragElastic={0.05}
        dragMomentum={false}
        dragDirectionLock
        onDragEnd={handleDragEnd}
      >
        {/* Image Preview Modal */}
        <AnimatePresence>
          {previewImage && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-xl flex flex-col items-center justify-center p-4"
            >
              <motion.button
                initial={{ y: -20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                onClick={() => setPreviewImage(null)}
                className="absolute top-6 right-6 w-12 h-12 bg-white/10 rounded-full flex items-center justify-center text-white backdrop-blur-md border border-white/20 active:scale-90 transition-transform"
              >
                <X size={24} />
              </motion.button>

              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="relative max-w-full max-h-[70vh] rounded-3xl overflow-hidden shadow-[0_0_50px_rgba(255,255,255,0.1)] border border-white/10"
              >
                <img src={previewImage} alt="Full preview" className="w-full h-full object-contain" />
              </motion.div>

              <motion.div 
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                className="flex gap-4 mt-8"
              >
                <button 
                  onClick={() => {
                    const link = document.createElement('a');
                    link.href = previewImage;
                    link.download = `AlphaSpace_AI_${Date.now()}.png`;
                    link.click();
                    toast.success(language === 'uz' ? "Rasm saqlandi!" : "Изображение сохранено!");
                  }}
                  className="flex items-center gap-2 px-6 py-3 bg-white text-black rounded-2xl font-bold active:scale-95 transition-transform"
                >
                  <Download size={20} />
                  {language === 'uz' ? "Saqlash" : "Сохранить"}
                </button>
                <button 
                  onClick={async () => {
                    try {
                      const response = await fetch(previewImage);
                      const blob = await response.blob();
                      const file = new File([blob], 'AlphaSpace_AI.png', { type: 'image/png' });
                      if (navigator.share) {
                        await navigator.share({
                          files: [file],
                          title: 'AlphaSpace AI Fashion',
                          text: 'Mening yangi obrazim! ✨'
                        });
                      } else {
                        toast.error("Sharing not supported");
                      }
                    } catch (err) {
                      toast.error("Error sharing image");
                    }
                  }}
                  className="flex items-center gap-2 px-6 py-3 bg-white/10 text-white border border-white/20 rounded-2xl font-bold backdrop-blur-md active:scale-95 transition-transform"
                >
                  <Share2 size={20} />
                  {language === 'uz' ? "Ulashish" : "Поделиться"}
                </button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Chat View */}
        <div className="flex flex-col h-full w-1/2 relative border-r border-border-primary overflow-hidden">
          {/* Settings Button */}
          <div className="absolute top-4 left-4 z-40">
            <button 
              onClick={() => setShowSettings(true)}
              className="w-10 h-10 bg-white/10 hover:bg-white/20 text-text-primary rounded-xl flex items-center justify-center backdrop-blur-md border border-border-primary transition-all active:scale-90 shadow-lg"
              title={language === 'uz' ? "Sozlamalar" : language === 'ru' ? "Настройки" : "Settings"}
            >
              <Settings size={18} />
            </button>
          </div>

          {/* Floating Clear Button (Pencil Icon) */}
          <div className="absolute top-4 right-4 z-40">
            <button 
              onClick={() => {
                setMessages([
                  {
                    id: '1',
                    role: 'assistant',
                    content: language === 'uz' ? "Salom! Men **SmartSeller** — sizning shaxsiy AlphaSpace stilistingizman. Menga o'zingiz qidirayotgan kiyim haqida yozing yoki rasmingizni yuboring. Men sizga eng mos kiyimlarni tanlab beraman! ✨" :
                             language === 'uz-cyrl' ? "Салом! Мен **SmartSeller** — сизнинг шахсий AlphaSpace стилистингизман. Менга ўзингиз қидираётган кийим ҳақида ёзинг ёки расмингизни юборинг. Мен сизга энг мос кийимларни танлаб бераман! ✨" :
                             language === 'ru' ? "Привет! Я **SmartSeller** — ваш личный стилист AlphaSpace. Напишите мне о одежде, которую вы ищете, или пришлите фото. Я подберу для вас наиболее подходящую одежду! ✨" :
                             "Hello! I am **SmartSeller** — your personal AlphaSpace stylist. Write to me about the clothes you are looking for or send a photo. I will choose the most suitable clothes for you! ✨"
                  }
                ]);
                setFoundPosts([]);
                setFoundObrazlar([]);
                onClearPendingTryOn?.();
              }}
              className="w-10 h-10 bg-accent-blue/10 hover:bg-accent-blue/20 text-accent-blue rounded-xl flex items-center justify-center backdrop-blur-md border border-accent-blue/20 transition-all active:scale-90 shadow-lg"
              title={language === 'uz' ? "Tozalash" : "Очистить"}
            >
              <Pencil size={18} />
            </button>
          </div>

          {/* Chat Messages */}
          <div 
            ref={scrollRef}
            className="flex-1 overflow-y-auto p-4 space-y-8 scrollbar-hide pb-48"
          >
            {messages.map((m, idx) => (
              <motion.div
                key={m.id}
                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ type: 'spring', damping: 20, stiffness: 100 }}
                className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`flex gap-4 max-w-[85%] ${m.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                  <div className={`w-10 h-10 rounded-2xl shrink-0 flex items-center justify-center shadow-lg transition-transform hover:scale-110 ${
                    m.role === 'user' 
                      ? 'bg-text-primary/5 border border-border-primary' 
                      : 'bg-gradient-to-br from-accent-blue to-accent-light text-white shadow-accent-blue/20 rotate-3'
                  }`}>
                    {m.role === 'user' ? <User size={20} className="text-text-primary/60" /> : <Sparkles size={20} className="text-white -rotate-3" />}
                  </div>
                  <div className="space-y-2">
                    <div className={`p-4 rounded-3xl text-sm leading-relaxed shadow-xl backdrop-blur-xl border ${
                      m.role === 'user' 
                        ? 'bg-gradient-to-br from-accent-blue to-accent-light text-white font-black rounded-tr-none border-accent-blue/20' 
                        : 'bg-white/70 dark:bg-white/5 text-text-primary/90 border-border-primary rounded-tl-none'
                    }`}>
                      {m.audio && (
                        <div className={`mb-4 p-3 rounded-2xl border ${m.role === 'user' ? 'bg-white/10 border-white/20' : 'bg-accent-blue/5 border-accent-blue/10'}`}>
                          <div className="flex items-center gap-3 mb-2">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${m.role === 'user' ? 'bg-white/20' : 'bg-accent-blue/20 text-accent-blue'}`}>
                              <Mic size={14} fill="currentColor" />
                            </div>
                            <div className="flex-1">
                              <p className={`text-[10px] font-black uppercase tracking-widest ${m.role === 'user' ? 'text-white/60' : 'text-accent-blue'}`}>
                                {m.role === 'user' ? "Sizning xabaringiz" : "AI Ovozli javobi"}
                              </p>
                            </div>
                            <div className="flex gap-1">
                              {[1, 2, 3].map(i => (
                                <motion.div
                                  key={i}
                                  animate={{ height: [4, 12, 4] }}
                                  transition={{ duration: 0.5, repeat: Infinity, delay: i * 0.1 }}
                                  className={`w-1 rounded-full ${m.role === 'user' ? 'bg-white/40' : 'bg-accent-blue/40'}`}
                                />
                              ))}
                            </div>
                          </div>
                          <audio 
                            src={m.audio} 
                            controls 
                            className={`w-full h-8 rounded-lg ${m.role === 'user' ? 'filter invert' : ''}`} 
                          />
                        </div>
                      )}
                      {(m.image || (m.images && m.images.length > 0)) && (
                        <div className="flex flex-wrap gap-2 mb-4">
                          {(m.images || (m.image ? [m.image] : [])).map((img, i) => (
                            <div key={i} className="relative group">
                              <img 
                                src={img} 
                                alt={`Upload ${i}`} 
                                onClick={() => setPreviewImage(img)}
                                className="w-full max-w-[200px] rounded-2xl border border-black/10 shadow-2xl transition-transform group-hover:scale-[1.02] cursor-zoom-in" 
                              />
                              {isLoading && m.role === 'user' && (
                                <div className="absolute inset-0 bg-accent-blue/20 rounded-2xl overflow-hidden backdrop-blur-[2px]">
                                  <motion.div 
                                    animate={{ top: ['0%', '100%', '0%'] }}
                                    transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                                    className="absolute left-0 right-0 h-1 bg-accent-blue shadow-[0_0_20px_rgba(29,78,216,1)] z-20"
                                  />
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                      <div className="markdown-body text-sm leading-relaxed max-w-none font-medium">
                        <Markdown>{m.role === 'assistant' ? (displayedContent[m.id] || m.content) : m.content}</Markdown>
                      </div>
                      {m.role === 'assistant' && !m.audio && (
                        <motion.button
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          onClick={() => handleListen(m.id, m.content)}
                          disabled={isTtsLoading === m.id}
                          className="mt-2 flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-accent-blue/60 hover:text-accent-blue transition-colors disabled:opacity-50"
                        >
                          {isTtsLoading === m.id ? (
                            <Loader2 size={12} className="animate-spin" />
                          ) : (
                            <Mic size={12} />
                          )}
                          {language === 'uz' ? "Eshiting" : "Слушать"}
                        </motion.button>
                      )}
                    </div>
                    <div className={`flex items-center gap-2 px-1 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <span className="text-[9px] text-text-secondary uppercase tracking-[0.2em] font-black opacity-50">
                        {m.role === 'user' ? 'Siz' : 'Alpha AI'} • {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
            
            {/* Quick Prompts - Redesigned to be smaller and right-aligned */}
            {messages.length <= 1 && !isLoading && (
              <div className="flex flex-col items-end gap-2 pt-4 pr-2">
                <p className="text-[9px] font-black uppercase tracking-[0.2em] text-accent-blue/60 mb-1">Takliflar</p>
                {QUICK_PROMPTS.map((prompt) => (
                  <motion.button
                    key={prompt.id}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    whileHover={{ scale: 1.05, x: -5 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handleQuickPrompt(prompt.text[language === 'uz' ? 'uz' : language === 'ru' ? 'ru' : 'en'])}
                    className="flex items-center gap-2 py-1.5 px-3 bg-transparent text-right transition-all group"
                  >
                    <span className="text-[11px] font-bold text-text-primary/70 uppercase tracking-tight group-hover:text-accent-blue transition-colors">
                      {prompt.text[language === 'uz' ? 'uz' : language === 'ru' ? 'ru' : 'en']}
                    </span>
                    <div className="w-6 h-6 rounded-lg bg-accent-blue/5 flex items-center justify-center text-sm group-hover:bg-accent-blue/10 transition-colors">
                      {prompt.icon}
                    </div>
                  </motion.button>
                ))}
              </div>
            )}

            {isLoading && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex justify-start"
              >
                {isGeneratingImage ? (
                  <div className="relative w-64 h-64 rounded-[2.5rem] overflow-hidden bg-black/10 dark:bg-white/5 border border-accent-blue/30 shadow-[0_0_50px_rgba(29,78,216,0.2)] backdrop-blur-2xl flex flex-col items-center justify-center gap-4">
                    {/* Rotating Blue Clouds Effect */}
                    <div className="absolute inset-0 overflow-hidden">
                      <motion.div 
                        animate={{ 
                          rotate: 360,
                          scale: [1, 1.4, 1],
                        }}
                        transition={{ duration: 2.5, repeat: Infinity, ease: "linear" }}
                        className="absolute -top-1/2 -left-1/2 w-[200%] h-[200%] opacity-50"
                      >
                        <div className="absolute top-1/4 left-1/4 w-1/2 h-1/2 bg-accent-blue rounded-full blur-[60px]" />
                        <div className="absolute bottom-1/4 right-1/4 w-1/2 h-1/2 bg-blue-600 rounded-full blur-[60px]" />
                      </motion.div>
                      <motion.div 
                        animate={{ 
                          rotate: -360,
                          scale: [1.4, 1, 1.4],
                        }}
                        transition={{ duration: 3.5, repeat: Infinity, ease: "linear" }}
                        className="absolute -top-1/2 -left-1/2 w-[200%] h-[200%] opacity-40"
                      >
                        <div className="absolute top-1/2 left-1/2 w-1/2 h-1/2 bg-blue-400 rounded-full blur-[100px]" />
                        <div className="absolute top-0 right-0 w-1/2 h-1/2 bg-blue-900 rounded-full blur-[100px]" />
                      </motion.div>
                      
                      {/* Extra "Cloud" for more density */}
                      <motion.div 
                        animate={{ 
                          x: [-50, 50, -50],
                          y: [-50, 50, -50],
                          rotate: 180
                        }}
                        transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
                        className="absolute top-1/4 right-1/4 w-1/2 h-1/2 bg-cyan-500/30 rounded-full blur-[80px]"
                      />
                      
                      {/* Scanning Light Effect */}
                      <motion.div 
                        animate={{ top: ['-100%', '100%'] }}
                        transition={{ duration: 2.5, repeat: Infinity, ease: "linear" }}
                        className="absolute left-0 right-0 h-[20%] bg-gradient-to-b from-transparent via-accent-blue/40 to-transparent z-20"
                      />
                    </div>
                    
                    <div className="relative z-10 flex flex-col items-center gap-4">
                      <div className="relative">
                        <motion.div 
                          animate={{ rotate: 360 }}
                          transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                          className="w-20 h-20 rounded-3xl bg-white/10 backdrop-blur-xl border border-white/20 flex items-center justify-center shadow-2xl"
                        >
                          <Sparkles size={40} className="text-white" />
                        </motion.div>
                        <motion.div 
                          animate={{ scale: [1, 1.5, 1], opacity: [0.5, 0.8, 0.5] }}
                          transition={{ duration: 2, repeat: Infinity }}
                          className="absolute inset-0 bg-accent-blue/30 rounded-3xl blur-xl -z-10"
                        />
                      </div>
                      <div className="text-center px-4">
                        <p className="text-[10px] font-black text-white uppercase tracking-[0.4em] mb-2 drop-shadow-lg">AlphaSpace AI</p>
                        <p className="text-sm font-black text-white drop-shadow-lg">
                          {language === 'uz' ? "Rasm tayyorlanmoqda..." : "Изображение готовится..."}
                        </p>
                        <p className="text-[9px] font-bold text-white/60 mt-1 uppercase tracking-widest">
                          {language === 'uz' ? "Iltimos, kuting" : "Пожалуйста, подождите"}
                        </p>
                      </div>
                    </div>
                    
                    {/* Progress Bar */}
                    <div className="absolute bottom-8 left-8 right-8 h-1.5 bg-white/10 rounded-full overflow-hidden backdrop-blur-md border border-white/5">
                      <motion.div 
                        animate={{ left: ['-100%', '100%'] }}
                        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                        className="absolute top-0 bottom-0 w-1/2 bg-gradient-to-r from-transparent via-accent-blue to-transparent"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col gap-4 items-start bg-white/70 dark:bg-white/5 backdrop-blur-2xl border border-border-primary p-6 rounded-[2.5rem] rounded-tl-none relative overflow-hidden shadow-2xl min-w-[200px]">
                    <div className="absolute inset-0 bg-gradient-to-r from-accent-blue/5 via-accent-light/5 to-accent-blue/5 animate-shimmer" />
                    
                    {/* Animated Particles/Dots */}
                    <div className="absolute top-0 left-0 w-full h-full pointer-events-none overflow-hidden">
                      {[...Array(3)].map((_, i) => (
                        <motion.div
                          key={i}
                          animate={{
                            y: [-20, 100],
                            opacity: [0, 1, 0],
                            x: [Math.random() * 200, Math.random() * 200]
                          }}
                          transition={{
                            duration: 2 + i,
                            repeat: Infinity,
                            ease: "linear",
                            delay: i * 0.5
                          }}
                          className="absolute w-1 h-1 bg-accent-blue/30 rounded-full blur-[1px]"
                        />
                      ))}
                    </div>

                    <div className="relative z-10 flex flex-col gap-4">
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          <div className="w-10 h-10 rounded-2xl bg-accent-blue/10 flex items-center justify-center">
                            <Bot size={20} className="text-accent-blue" />
                          </div>
                          <motion.div 
                            animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
                            transition={{ duration: 2, repeat: Infinity }}
                            className="absolute inset-0 bg-accent-blue/20 rounded-2xl blur-md -z-10"
                          />
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[10px] text-accent-blue font-black uppercase tracking-[0.2em]">AlphaSpace AI</span>
                          <span className="text-[9px] text-text-secondary font-bold uppercase tracking-widest">Tahlil qilinmoqda...</span>
                        </div>
                      </div>
                      
                      <div className="flex gap-1.5">
                        {[0, 1, 2].map((i) => (
                          <motion.div
                            key={i}
                            animate={{
                              scale: [1, 1.5, 1],
                              opacity: [0.3, 1, 0.3],
                              backgroundColor: ["#007AFF", "#5AC8FA", "#007AFF"]
                            }}
                            transition={{
                              duration: 1,
                              repeat: Infinity,
                              delay: i * 0.2
                            }}
                            className="w-2 h-2 rounded-full shadow-[0_0_8px_rgba(0,122,255,0.5)]"
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </motion.div>
            )}

            {/* Results Indicator */}
            {(foundPosts.length > 0 || foundObrazlar.length > 0) && !isLoading && (
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex justify-center pt-8"
              >
                <button 
                  onClick={() => setView('results')}
                  className="flex items-center gap-4 px-8 py-4 bg-gradient-to-r from-accent-blue to-accent-light text-white rounded-full shadow-2xl shadow-accent-blue/30 group active:scale-95 transition-all relative overflow-hidden"
                >
                  <motion.div 
                    animate={{ x: ['-100%', '200%'] }}
                    transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                    className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent skew-x-12"
                  />
                  <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform">
                    <Zap size={20} fill="currentColor" />
                  </div>
                  <div className="text-left relative z-10">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-80">Natijalar tayyor</p>
                    <p className="text-sm font-black tracking-tight">{foundObrazlar.length > 0 ? `${foundObrazlar.length} ta Obraz` : `${foundPosts.length} ta maxsulot`} topildi</p>
                  </div>
                  <ChevronRight size={20} className="ml-2 group-hover:translate-x-2 transition-transform relative z-10" />
                </button>
              </motion.div>
            )}
          </div>

          {/* Input Area - Positioned higher to clear bottom tabs */}
          <div 
            className="absolute bottom-0 left-0 w-full p-4 bg-gradient-to-t from-bg-primary via-bg-primary/95 to-transparent z-40"
            style={{ paddingBottom: isKeyboardOpen ? `${keyboardHeight + 16}px` : '6rem' }}
          >
            <div className="max-w-md mx-auto space-y-3">
              <AnimatePresence>
                {selectedImages.length > 0 && (
                  <div className="flex flex-wrap gap-3">
                    {selectedImages.map((img, idx) => (
                      <motion.div 
                        key={idx}
                        initial={{ opacity: 0, y: 20, scale: 0.9 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        className="relative inline-block"
                      >
                        <div className="w-20 h-20 rounded-[1.5rem] overflow-hidden border-2 border-accent-blue shadow-2xl relative">
                          <img src={img} alt={`Preview ${idx}`} className="w-full h-full object-cover" />
                          {isLoading && (
                            <motion.div 
                              animate={{ top: ['-100%', '100%'] }}
                              transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                              className="absolute left-0 right-0 h-1 bg-accent-blue/80 shadow-[0_0_10px_rgba(0,122,255,1)] z-10"
                            />
                          )}
                        </div>
                        <button 
                          onClick={() => setSelectedImages(prev => prev.filter((_, i) => i !== idx))}
                          className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center text-white shadow-xl border-2 border-bg-primary active:scale-90 transition-transform"
                        >
                          <X size={12} strokeWidth={3} />
                        </button>
                      </motion.div>
                    ))}
                  </div>
                )}
              </AnimatePresence>
              
              <div className="flex items-end gap-2 bg-white/90 dark:bg-white/10 backdrop-blur-3xl border border-border-primary rounded-[1.5rem] p-1.5 shadow-2xl hover:shadow-accent-blue/5 transition-shadow">
                <div className="flex items-center gap-1 mb-0.5">
                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="w-10 h-10 rounded-xl flex items-center justify-center bg-gradient-to-br from-accent-blue to-accent-light text-white shadow-lg shadow-accent-blue/20 transition-all active:scale-90"
                  >
                    <Plus size={20} strokeWidth={2.5} />
                  </button>
                  
                  <button 
                    onClick={startVoiceInput}
                    className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all active:scale-90 backdrop-blur-md border ${
                      isListening 
                        ? 'text-red-500 bg-red-500/10 border-red-500/20 animate-pulse' 
                        : 'text-text-primary/60 bg-white/5 border-white/10 hover:text-accent-blue hover:bg-accent-blue/5'
                    }`}
                  >
                    <Mic size={18} strokeWidth={1.5} />
                  </button>
                </div>
                
                <input 
                  type="file" 
                  accept="image/*" 
                  multiple
                  hidden 
                  ref={fileInputRef} 
                  onChange={handleImageSelect} 
                />
                
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      sendMessage();
                    }
                  }}
                  placeholder={isRecording 
                    ? (language === 'uz' ? `Ovoz yozilyapti... ${formatDuration(recordingDuration)}` : 
                       language === 'uz-cyrl' ? `Овоз ёзиляпти... ${formatDuration(recordingDuration)}` : 
                       language === 'ru' ? `Запись голоса... ${formatDuration(recordingDuration)}` : 
                       `Recording voice... ${formatDuration(recordingDuration)}`)
                    : (language === 'uz' ? "SmartSellerdan so'rang..." : 
                       language === 'uz-cyrl' ? "SmartSellerдан сўранг..." : 
                       language === 'ru' ? "Спросите SmartSeller..." : 
                       "Ask SmartSeller...")}
                  rows={1}
                  className={`flex-1 bg-transparent border-none outline-none text-sm text-text-primary py-2.5 px-2 placeholder:text-text-primary/30 font-normal resize-none max-h-32 overflow-y-auto scrollbar-hide ${isRecording ? 'animate-pulse text-red-500 font-bold' : ''}`}
                  style={{ height: 'auto' }}
                  onInput={(e) => {
                    const target = e.target as HTMLTextAreaElement;
                    target.style.height = 'auto';
                    target.style.height = `${target.scrollHeight}px`;
                  }}
                />

                <button 
                  id="ai-send-button"
                  onClick={() => sendMessage()}
                  disabled={isLoading || (!input.trim() && selectedImages.length === 0)}
                  className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all mb-0.5 shrink-0 ${
                    isLoading || (!input.trim() && selectedImages.length === 0) 
                      ? 'bg-text-primary/5 text-text-primary/20' 
                      : 'bg-gradient-to-br from-accent-blue to-accent-light text-white active:scale-90 shadow-lg shadow-accent-blue/20'
                  }`}
                >
                  <Send size={18} strokeWidth={2} className="mr-0.5" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Results View */}
        <div className="flex flex-col h-full w-1/2 bg-bg-primary relative overflow-hidden">
          {/* Results Header */}
          <div className="p-4 border-b border-border-primary flex items-center justify-between bg-bg-primary/40 backdrop-blur-2xl sticky top-0 z-30">
            <button 
              onClick={() => setView('chat')}
              className="flex items-center gap-3 text-text-primary/60 hover:text-accent-blue transition-all active:scale-90 group"
            >
              <div className="w-10 h-10 rounded-xl bg-text-primary/5 flex items-center justify-center group-hover:bg-accent-blue/10 transition-colors">
                <ArrowLeft size={20} strokeWidth={2} />
              </div>
              <span className="text-xs font-black uppercase tracking-widest">Chatga qaytish</span>
            </button>
            <div className="flex items-center gap-3">
              <div className="px-4 py-2 bg-accent-blue/10 rounded-2xl border border-accent-blue/20 shadow-lg shadow-accent-blue/5">
                <span className="text-[10px] font-black bg-gradient-to-br from-accent-blue to-accent-light bg-clip-text text-transparent uppercase tracking-[0.2em]">
                  {foundObrazlar.length > 0 ? `${foundObrazlar.length} ta Obraz` : `${foundPosts.length} ta maxsulot`}
                </span>
              </div>
            </div>
          </div>

          {/* Results Feed - Gallery Style */}
          <div className="flex-1 overflow-y-auto scrollbar-hide pb-24 relative">
            {/* Enhanced Dynamic Mesh Gradient for Results */}
            <div className="absolute inset-0 z-0 opacity-40 dark:opacity-30 pointer-events-none">
              <motion.div 
                animate={{ 
                  x: [0, -50, 50, 0],
                  y: [0, 100, -50, 0],
                  scale: [1, 1.3, 0.8, 1]
                }}
                transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
                className="absolute top-[20%] right-[-10%] w-[60%] h-[60%] rounded-full bg-accent-blue blur-[120px]" 
              />
              <motion.div 
                animate={{ 
                  x: [0, 50, -100, 0],
                  y: [0, -100, 50, 0],
                  scale: [1.2, 0.9, 1.1, 1.2]
                }}
                transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
                className="absolute bottom-[20%] left-[-10%] w-[60%] h-[60%] rounded-full bg-accent-light blur-[120px]" 
              />
            </div>

            {foundObrazlar.length > 0 ? (
              <div className="p-4 space-y-8 relative z-10">
                {foundObrazlar.map((obraz) => (
                  <motion.div
                    key={obraz.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white/40 dark:bg-white/5 rounded-[2.5rem] overflow-hidden border border-border-primary shadow-2xl backdrop-blur-xl"
                  >
                    {/* Obraz Header - Mood Board Style */}
                    <div className="p-6 pb-4">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-accent-blue/10 flex items-center justify-center text-accent-blue">
                            <Sparkles size={16} />
                          </div>
                          <span className="text-[10px] font-black bg-gradient-to-br from-accent-blue to-accent-light bg-clip-text text-transparent uppercase tracking-[0.2em]">{obraz.type} Obraz</span>
                        </div>
                        <div className="px-3 py-1 bg-accent-blue/10 rounded-full">
                          <p className="text-[10px] font-black text-accent-blue uppercase tracking-widest">{obraz.totalPrice}</p>
                        </div>
                      </div>
                      
                      <h3 className="text-2xl font-black text-text-primary tracking-tight mb-2 leading-tight">
                        {obraz.type === 'Wedding' ? "Elegant To'y Obrazi" : 
                         obraz.type === 'Office' ? "Professional Ofis Stili" : 
                         obraz.type === 'Casual' ? "Kundalik Qulaylik" : "AlphaSpace Tanlovi"}
                      </h3>
                      
                      <div className="p-4 bg-accent-blue/5 rounded-2xl border border-accent-blue/10 mb-6">
                        <p className="text-xs text-text-primary/70 leading-relaxed font-medium italic">
                          "Ushbu to'plam sizning so'rovingizga asosan, ranglar uyg'unligi va mavsumiy trendlarni hisobga olgan holda AlphaSpace AI tomonidan maxsus tayyorlandi."
                        </p>
                      </div>
                    </div>

                    {/* Obraz Items Grid - Mood Board Layout */}
                    <div className="px-6 pb-6">
                      <div className="grid grid-cols-6 grid-rows-2 gap-2 h-[350px]">
                        {obraz.posts.slice(0, 3).map((post, pIdx) => (
                          <motion.div 
                            key={post.id}
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: pIdx * 0.1 }}
                            onClick={(e) => {
                              e.stopPropagation();
                              onOpenPostDetails(post);
                            }}
                            className={`relative overflow-hidden rounded-[2rem] group cursor-pointer shadow-xl ${
                              pIdx === 0 ? 'col-span-3 row-span-2' : 
                              pIdx === 1 ? 'col-span-3 row-span-1' : 
                              'col-span-3 row-span-1'
                            }`}
                          >
                            {post.mediaType === 'video' ? (
                              <video
                                src={post.mediaUrls[0]}
                                autoPlay
                                loop
                                muted={globalMuted}
                                playsInline
                                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                              />
                            ) : (
                              <img
                                src={post.mediaUrls[0]}
                                alt={post.outfitName}
                                referrerPolicy="no-referrer"
                                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                              />
                            )}
                            
                            {/* Glass Overlay on Hover */}
                            <div className="absolute inset-0 bg-accent-blue/10 opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-[2px]" />
                            
                            {/* Floating Price Tag */}
                            <div className="absolute top-3 left-3 opacity-0 group-hover:opacity-100 transition-all translate-y-[-10px] group-hover:translate-y-0">
                              <span className="text-[8px] font-black text-white bg-black/60 backdrop-blur-md px-2 py-1 rounded-full border border-white/10">
                                {post.price}
                              </span>
                            </div>

                            <div className="absolute bottom-3 right-3 translate-y-4 group-hover:translate-y-0 transition-transform opacity-0 group-hover:opacity-100">
                              <div className="w-8 h-8 rounded-full bg-white text-accent-blue flex items-center justify-center shadow-lg">
                                <ShoppingBag size={14} />
                              </div>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    </div>

                    {/* Obraz Footer */}
                    <div className="p-6 bg-white/5 backdrop-blur-md border-t border-border-primary">
                      <button 
                        onClick={() => {
                          const query = `Ushbu ${obraz.type} obrazi haqida ko'proq ma'lumot bering. Nega aynan shu kiyimlarni tanladingiz?`;
                          setInput(query);
                          setView('chat');
                          setTimeout(() => {
                            const sendBtn = document.getElementById('ai-send-button');
                            if (sendBtn) sendBtn.click();
                          }, 100);
                        }}
                        className="w-full py-4 bg-gradient-to-r from-accent-blue to-accent-light text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-accent-blue/20 active:scale-[0.98] transition-all flex items-center justify-center gap-3 group"
                      >
                        <Zap size={18} className="group-hover:animate-bounce" />
                        {language === 'uz' ? "SmartSeller bilan muhokama qilish" : 
                         language === 'ru' ? "Обсудить с SmartSeller" : 
                         "Discuss with SmartSeller"}
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>
            ) : foundPosts.length > 0 ? (
              <div className="grid grid-cols-2 gap-0.5 relative z-10">
                {foundPosts.map((post) => (
                  <motion.div
                    key={post.id}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpenPostDetails(post);
                    }}
                    className="relative aspect-[3/4] bg-text-primary/5 overflow-hidden group cursor-pointer"
                  >
                    {post.mediaType === 'video' ? (
                      <video
                        src={post.mediaUrls[0]}
                        autoPlay
                        loop
                        muted={globalMuted}
                        playsInline
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <img
                        src={post.mediaUrls[0]}
                        alt={post.outfitName}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                      />
                    )}
                    <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity" />
                    
                    {/* Price Tag - Small and Blue at the bottom */}
                    <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/20 to-transparent flex flex-col gap-1 items-start">
                      {post.seller.region && (
                        <span className="text-[8px] font-bold text-white/60 bg-black/20 px-1.5 py-0.5 rounded backdrop-blur-sm uppercase tracking-tighter">
                          {post.seller.region}
                        </span>
                      )}
                      <span className="text-[10px] font-black bg-gradient-to-br from-accent-blue to-accent-light bg-clip-text text-transparent bg-white/90 px-2 py-0.5 rounded-md shadow-sm">
                        {post.price}
                      </span>
                    </div>
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full p-8 text-center relative z-10">
                <div className="w-20 h-20 rounded-full bg-accent-blue/5 flex items-center justify-center text-accent-blue/20 mb-6">
                  <ShoppingBag size={40} strokeWidth={1} />
                </div>
                <h3 className="text-lg font-black text-text-primary mb-2">Natijalar topilmadi</h3>
                <p className="text-xs text-text-secondary font-medium">
                  Kechirasiz, sizning so'rovingizga mos kiyimlar topilmadi. Boshqa uslub yoki kiyim haqida so'rab ko'ring!
                </p>
              </div>
            )}
          </div>
        </div>
      </motion.div>

      {/* Settings Modal */}
      <AnimatePresence mode="wait">
        {showSettings && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowSettings(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-bg-primary border border-border-primary w-full max-w-md rounded-[2.5rem] overflow-hidden shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6 border-b border-border-primary flex items-center justify-between bg-gradient-to-r from-accent-blue/5 to-transparent">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-accent-blue/10 flex items-center justify-center text-accent-blue">
                    <Settings size={20} />
                  </div>
                  <div>
                    <h3 className="text-lg font-black tracking-tight">SmartSeller Sozlamalari</h3>
                    <p className="text-[10px] text-text-secondary uppercase tracking-widest font-bold">AI Xotirasi va afzalliklar</p>
                  </div>
                </div>
                <button 
                  onClick={() => setShowSettings(false)}
                  className="w-10 h-10 rounded-full hover:bg-white/10 flex items-center justify-center transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="p-6 space-y-6 max-h-[60vh] overflow-y-auto scrollbar-hide">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-black uppercase tracking-widest text-text-secondary">Saqlangan ma'lumotlar</h4>
                    <span className="text-[10px] bg-accent-blue/10 text-accent-blue px-2 py-0.5 rounded-full font-bold">{memories.length} ta</span>
                  </div>

                  {memories.length === 0 ? (
                    <div className="p-8 text-center border-2 border-dashed border-border-primary rounded-3xl">
                      <p className="text-sm text-text-secondary italic">Hali hech narsa eslab qolinmagan. AI ga biror narsani eslab qolishni ayting! ✨</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {memories.map((memory) => (
                        <motion.div 
                          key={memory.id}
                          layout
                          className="p-4 bg-white/5 border border-border-primary rounded-2xl flex items-center justify-between group hover:border-accent-blue/30 transition-colors"
                        >
                          <div className="flex-1">
                            <p className="text-[10px] font-black uppercase tracking-widest text-accent-blue mb-1">{memory.key}</p>
                            <p className="text-sm font-medium">{memory.value}</p>
                          </div>
                          <button 
                            onClick={() => setMemories(prev => prev.filter(m => m.id !== memory.id))}
                            className="w-8 h-8 rounded-lg bg-red-500/10 text-red-500 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity active:scale-90"
                          >
                            <Trash2 size={14} />
                          </button>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="p-4 bg-accent-blue/5 rounded-3xl border border-accent-blue/10">
                  <div className="flex gap-3">
                    <Zap size={16} className="text-accent-blue shrink-0 mt-0.5" />
                    <p className="text-[11px] text-text-primary/70 leading-relaxed">
                      SmartSeller siz haqingizdagi ma'lumotlarni (ismingiz, uslubingiz, afzalliklaringiz) eslab qoladi va suhbat davomida ulardan foydalanadi.
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-6 bg-white/5 border-t border-border-primary">
                <button 
                  onClick={() => setShowSettings(false)}
                  className="w-full py-4 bg-gradient-to-r from-accent-blue to-accent-light text-white rounded-2xl font-black tracking-widest uppercase text-xs shadow-xl shadow-accent-blue/20 active:scale-[0.98] transition-all"
                >
                  Tayyor
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Found Products Indicator - Always visible when results exist */}
      <AnimatePresence>
        {(foundPosts.length > 0 || foundObrazlar.length > 0) && view === 'chat' && (
          <motion.button
            initial={{ x: 100, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 100, opacity: 0 }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => setView('results')}
            className="absolute right-4 top-[35%] -translate-y-1/2 w-14 h-14 rounded-full bg-gradient-to-br from-accent-blue to-accent-light text-white flex flex-col items-center justify-center z-[100] border-2 border-white/20 shadow-2xl"
          >
            <ShoppingBag size={20} strokeWidth={1.5} />
            <span className="text-[8px] font-black uppercase tracking-tighter mt-0.5">Topildi</span>
            <div className="absolute -right-1 top-1/2 -translate-y-1/2">
              <ChevronRight size={12} strokeWidth={1.5} className="animate-bounce-x" />
            </div>
          </motion.button>
        )}
      </AnimatePresence>

      <style>{`
        .markdown-body p { margin-bottom: 0.5rem; }
        .markdown-body p:last-child { margin-bottom: 0; }
        .markdown-body ul { list-style-type: disc; padding-left: 1.25rem; margin-bottom: 0.5rem; }
        .markdown-body li { margin-bottom: 0.25rem; }
        .markdown-body strong { 
          background: linear-gradient(to br, var(--color-accent-blue), var(--color-accent-light));
          -webkit-background-clip: text;
          background-clip: text;
          color: transparent;
          font-weight: 900; 
        }
        .markdown-body h1, .markdown-body h2, .markdown-body h3 { 
          color: var(--text-primary); 
          font-weight: 700; 
          margin-top: 1rem; 
          margin-bottom: 0.5rem; 
        }
        .markdown-body h1 { font-size: 1.25rem; }
        .markdown-body h2 { font-size: 1.125rem; }
        .markdown-body h3 { font-size: 1rem; }
        
        @keyframes bounce-x {
          0%, 100% { transform: translateX(0); }
          50% { transform: translateX(3px); }
        }
        .animate-bounce-x {
          animation: bounce-x 1s infinite;
        }
      `}</style>
    </div>
  );
};

export default SearchAI;

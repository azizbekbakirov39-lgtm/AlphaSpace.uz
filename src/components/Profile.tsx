import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import { 
  ChevronRight, 
  ChevronLeft,
  Globe, 
  Users, 
  MessageSquare, 
  Bookmark, 
  LogOut, 
  ArrowLeft,
  User as UserIcon,
  ShoppingBag,
  Send,
  Dna,
  Shirt,
  Camera,
  Ruler,
  Award,
  Star,
  LayoutGrid,
  Heart,
  Sparkles,
  Zap,
  ChevronRight as ChevronRightIcon,
  Mic,
  Square,
  Play,
  Pause,
  Trash2,
  X,
  Image as ImageIcon,
  Video,
  MapPin as MapPinIcon,
  Plus,
  Smile,
  Reply,
  MoreVertical,
  Camera as CameraIcon,
  RefreshCw,
  Trash,
  Info,
  Store,
  ShieldCheck
} from 'lucide-react';
import { Language, translations } from '../translations';
import { PostData, Seller, Obraz, User } from '../types';
import { MOCK_SELLERS } from '../constants';
import { signInWithGoogle, signInWithApple, signInWithEmail, signUpWithEmail } from '../firebase';

interface ProfileProps {
  language: Language;
  setLanguage: (lang: Language) => void;
  savedPosts: PostData[];
  subscribedSellers: Seller[];
  onToggleLike: (postId: string) => void;
  onToggleSave: (postId: string) => void;
  onOpenShop: () => void;
  onOpenShopProfile: (shopId: string) => void;
  onOpenPostDetails: (post: PostData) => void;
  onToggleSubscribe: (sellerId: string) => void;
  likedPosts: PostData[];
  recentlyViewedPosts: PostData[];
  hasShop: boolean;
  subView: SubView;
  setSubView: (view: SubView) => void;
  user: User | null;
  onLogin: () => void;
  onLogout: () => void;
  onBackToHome?: () => void;
  onOpenAdminDashboard?: () => void;
  initialChatSellerId?: string | null;
  initialChatProduct?: PostData | null;
  savedObrazlar?: Obraz[];
}

export type SubView = 'main' | 'language' | 'subscriptions' | 'chats' | 'saved' | 'style-dna' | 'closet' | 'try-ons' | 'fit-profile' | 'info' | 'comments' | 'liked-posts' | 'recently-viewed';

interface ChatMessage {
  id: string;
  text?: string;
  audio?: string;
  image?: string;
  video?: string;
  videoMessage?: string; // Square video message
  location?: { lat: number, lng: number };
  post?: PostData;
  isMe: boolean;
  time: string;
  reactions?: string[];
  replyTo?: string; // ID of the message being replied to
}

const Profile: React.FC<ProfileProps> = ({ 
  language, 
  setLanguage, 
  savedPosts, 
  subscribedSellers,
  onToggleLike,
  onToggleSave,
  onOpenShop,
  onOpenShopProfile,
  onOpenPostDetails,
  onToggleSubscribe,
  likedPosts,
  recentlyViewedPosts,
  hasShop,
  subView,
  setSubView,
  user,
  onLogin,
  onLogout,
  onBackToHome,
  onOpenAdminDashboard,
  initialChatSellerId,
  initialChatProduct,
  savedObrazlar = []
}) => {
  const [activeChatSeller, setActiveChatSeller] = useState<Seller | null>(null);
  const [activeProduct, setActiveProduct] = useState<PostData | null>(initialChatProduct || null);
  const [chatMessages, setChatMessages] = useState<{[key: string]: ChatMessage[]}>({});
  const [newMessage, setNewMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [replyingTo, setReplyingTo] = useState<ChatMessage | null>(null);
  const [selectedMessageId, setSelectedMessageId] = useState<string | null>(null);
  
  // Audio Playback State
  const [playingMessageId, setPlayingMessageId] = useState<string | null>(null);
  const [audioProgress, setAudioProgress] = useState<{[key: string]: number}>({});
  const audioRef = React.useRef<HTMLAudioElement | null>(null);

  const [showPinModal, setShowPinModal] = useState(false);
  const [pin, setPin] = useState('');
  const ADMIN_PIN = "123456"; // PIN-kod

  const handleAdminClick = () => {
    setShowPinModal(true);
  };

  const verifyPin = () => {
    if (pin === ADMIN_PIN) {
      setShowPinModal(false);
      setPin('');
      onOpenAdminDashboard?.();
    } else {
      toast.error("Noto'g'ri PIN-kod!");
      setPin('');
    }
  };

  const [infoData, setInfoData] = useState<{ title: string; description: string } | null>(null);
  const [activeClosetCategory, setActiveClosetCategory] = useState<'all' | 'clothing' | 'outfits' | 'other'>('all');

  const handleBack = () => {
    if (subView === 'info') {
      setSubView('main');
      return;
    }
    if (activeChatSeller) {
      setActiveChatSeller(null);
      window.history.back();
    } else if (subView !== 'main') {
      setSubView('main');
      window.history.back();
    } else if (onBackToHome) {
      onBackToHome();
    }
  };

  const openInfo = (title: string, description: string) => {
    setInfoData({ title, description });
    setSubView('info');
  };

  // Voice Recording State
  const [isRecording, setIsRecording] = useState(false);
  const [recordedAudio, setRecordedAudio] = useState<string | null>(null);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const timerRef = React.useRef<NodeJS.Timeout | null>(null);
  const [isVideoRecording, setIsVideoRecording] = useState(false);
  const [videoPreviewRef] = useState(() => React.createRef<HTMLVideoElement>());
  const [isHoldingRecord, setIsHoldingRecord] = useState(false);
  const [recordType, setRecordType] = useState<'voice' | 'video' | null>(null);
  const [cameraFacing, setCameraFacing] = useState<'user' | 'environment'>('user');
  const [isCancelAreaHovered, setIsCancelAreaHovered] = useState(false);
  const isCancelAreaHoveredRef = React.useRef(false);
  const [dragX, setDragX] = useState(0);
  const dragXRef = React.useRef(0);
  const dragStartRef = React.useRef<number | null>(null);
  const [stagedImage, setStagedImage] = useState<string | null>(null);
  const [stagedVideo, setStagedVideo] = useState<string | null>(null);
  const [stagedLocation, setStagedLocation] = useState<{lat: number, lng: number} | null>(null);
  const [showAttachmentMenu, setShowAttachmentMenu] = useState(false);
  const recordButtonRef = React.useRef<HTMLButtonElement>(null);
  const cancelAreaRef = React.useRef<HTMLDivElement>(null);

  const startRecording = async () => {
    try {
      if (window.navigator.vibrate) window.navigator.vibrate(50);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks: BlobPart[] = [];

      recorder.ondataavailable = (e) => chunks.push(e.data);
      recorder.onstop = async () => {
        if (!isCancelAreaHoveredRef.current && dragXRef.current > -100) {
          const blob = new Blob(chunks, { type: 'audio/webm' });
          const reader = new FileReader();
          reader.readAsDataURL(blob);
          reader.onloadend = () => {
            const base64Audio = reader.result as string;
            handleSendMessage(undefined, base64Audio);
          };
        }
        stream.getTracks().forEach(track => track.stop());
        setDragX(0);
        dragXRef.current = 0;
        setIsCancelAreaHovered(false);
        isCancelAreaHoveredRef.current = false;
      };

      recorder.start();
      setMediaRecorder(recorder);
      setIsRecording(true);
      setRecordingDuration(0);
      timerRef.current = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);
    } catch (err) {
      console.error("Microphone access denied:", err);
      alert("Mikrofonga ruxsat berilmadi.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorder && isRecording) {
      mediaRecorder.stop();
      setIsRecording(false);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  };

  const cancelRecordedAudio = () => {
    setRecordedAudio(null);
    setRecordingDuration(0);
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleFileUpload = (type: 'image' | 'video') => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = type === 'image' ? 'image/*' : 'video/*';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64 = reader.result as string;
          if (type === 'image') setStagedImage(base64);
          else setStagedVideo(base64);
        };
        reader.readAsDataURL(file);
      }
    };
    input.click();
  };

  const handleLocationShare = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((position) => {
        setStagedLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude
        });
      });
    }
  };

  const [videoStream, setVideoStream] = useState<MediaStream | null>(null);

  const startVideoMessage = async () => {
    try {
      if (window.navigator.vibrate) window.navigator.vibrate(50);
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: cameraFacing }, 
        audio: true 
      });
      setVideoStream(stream);
      setIsVideoRecording(true);
      if (videoPreviewRef.current) videoPreviewRef.current.srcObject = stream;

      const recorder = new MediaRecorder(stream);
      const chunks: BlobPart[] = [];
      recorder.ondataavailable = (e) => chunks.push(e.data);
      recorder.onstop = () => {
        if (!isCancelAreaHoveredRef.current && dragXRef.current > -100) {
          const blob = new Blob(chunks, { type: 'video/webm' });
          const reader = new FileReader();
          reader.onloadend = () => {
            handleSendMessage(undefined, undefined, undefined, undefined, reader.result as string);
          };
          reader.readAsDataURL(blob);
        }
        stream.getTracks().forEach(t => t.stop());
        setDragX(0);
        dragXRef.current = 0;
        setIsCancelAreaHovered(false);
        isCancelAreaHoveredRef.current = false;
      };
      recorder.start();
      setMediaRecorder(recorder);
      setRecordingDuration(0);
      timerRef.current = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);
    } catch (err) {
      console.error("Video access denied:", err);
    }
  };

  const stopVideoMessage = () => {
    if (mediaRecorder && isVideoRecording) {
      mediaRecorder.stop();
      setIsVideoRecording(false);
      setVideoStream(null);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  };

  const toggleCamera = async () => {
    const newFacing = cameraFacing === 'user' ? 'environment' : 'user';
    setCameraFacing(newFacing);
    if (isVideoRecording && videoStream) {
      videoStream.getTracks().forEach(t => t.stop());
      const newStream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: newFacing }, 
        audio: true 
      });
      setVideoStream(newStream);
      if (videoPreviewRef.current) videoPreviewRef.current.srcObject = newStream;
    }
  };

  // Handle initial chat seller
  React.useEffect(() => {
    if (initialChatSellerId && subView === 'chats') {
      const seller = subscribedSellers.find(s => s.id === initialChatSellerId) || 
                     MOCK_SELLERS.find(s => s.id === initialChatSellerId);
      if (seller) {
        setActiveChatSeller(seller);
        setActiveProduct(initialChatProduct || null);

        // If it's a shared post, send it as a message
        if (initialChatProduct && !sentPosts.has(`${seller.id}-${initialChatProduct.id}`)) {
          handleSendMessage(undefined, undefined, undefined, undefined, undefined, undefined, initialChatProduct, seller.id);
          setSentPosts(prev => new Set(prev).add(`${seller.id}-${initialChatProduct.id}`));
        }
      }
    } else if (!initialChatSellerId) {
      setActiveChatSeller(null);
      setActiveProduct(null);
    }
  }, [initialChatSellerId, subView, subscribedSellers, initialChatProduct]);

  const [showEmailLogin, setShowEmailLogin] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoadingAuth, setIsLoadingAuth] = useState(false);

  const t = translations[language];

  const languages: { code: Language; name: string }[] = [
    { code: 'uz', name: "O'zbek (Lotin)" },
    { code: 'uz-cyrl', name: "Ўзбек (Кирилл)" },
    { code: 'ru', name: "Русский" },
    { code: 'en', name: "English" },
  ];

  const [sentPosts, setSentPosts] = useState<Set<string>>(new Set());

  const handleSendMessage = (text?: string, audio?: string, image?: string, video?: string, videoMessage?: string, location?: {lat: number, lng: number}, post?: PostData, targetSellerId?: string) => {
    const messageText = text || newMessage;
    const audioData = audio || recordedAudio;
    const imageData = image || stagedImage;
    const videoData = video || stagedVideo;
    const locationData = location || stagedLocation;
    
    const sellerId = targetSellerId || activeChatSeller?.id;
    if (!sellerId) return;

    if (!messageText.trim() && !audioData && !imageData && !videoData && !videoMessage && !locationData && !post) return;

    const msg: ChatMessage = {
      id: Math.random().toString(36).substr(2, 9),
      text: (audioData || imageData || videoData || videoMessage || locationData || post) ? (text || undefined) : messageText,
      audio: audioData || undefined,
      image: imageData || undefined,
      video: videoData || undefined,
      videoMessage: videoMessage || undefined,
      location: locationData || undefined,
      post: post || undefined,
      isMe: true,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      replyTo: replyingTo?.id
    };

    setChatMessages(prev => ({
      ...prev,
      [sellerId]: [...(prev[sellerId] || []), msg]
    }));
    
    setNewMessage('');
    setRecordedAudio(null);
    setRecordingDuration(0);
    setReplyingTo(null);
    setStagedImage(null);
    setStagedVideo(null);
    setStagedLocation(null);

    // Typing simulation
    setTimeout(() => {
      setIsTyping(true);
      setTimeout(() => {
        setIsTyping(false);
      }, 3000);
    }, 1000);
  };

  const getLastMessagePreview = (sellerId: string) => {
    const messages = chatMessages[sellerId];
    if (!messages || messages.length === 0) return "Oxirgi xabar yo'q";
    const last = messages[messages.length - 1];
    
    if (last.text) return last.text;
    if (last.audio) return "🎤 Ovozli xabar";
    if (last.image) return "📷 Rasm";
    if (last.video || last.videoMessage) return "🎥 Video xabar";
    if (last.location) return "📍 Joylashuv";
    if (last.post) return "🛍 Mahsulot";
    return "Xabar";
  };

  const handleReaction = (messageId: string, emoji: string) => {
    if (!activeChatSeller) return;
    setChatMessages(prev => ({
      ...prev,
      [activeChatSeller.id]: prev[activeChatSeller.id].map(msg => 
        msg.id === messageId 
        ? { ...msg, reactions: [...(msg.reactions || []), emoji].slice(-3) } 
        : msg
      )
    }));
    setSelectedMessageId(null);
  };

  const handlePlayAudio = (messageId: string, audioData: string) => {
    if (playingMessageId === messageId) {
      audioRef.current?.pause();
      setPlayingMessageId(null);
      return;
    }

    if (audioRef.current) {
      audioRef.current.pause();
    }

    const audio = new Audio(audioData);
    audioRef.current = audio;
    setPlayingMessageId(messageId);

    audio.ontimeupdate = () => {
      const progress = (audio.currentTime / audio.duration) * 100;
      setAudioProgress(prev => ({ ...prev, [messageId]: progress }));
    };

    audio.onended = () => {
      setPlayingMessageId(null);
      setAudioProgress(prev => ({ ...prev, [messageId]: 0 }));
    };

    audio.play();
  };

  const handleDeleteMessage = (sellerId: string, messageId: string) => {
    setChatMessages(prev => ({
      ...prev,
      [sellerId]: prev[sellerId].filter(m => m.id !== messageId)
    }));
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error("Email va parolni kiriting");
      return;
    }
    
    setIsLoadingAuth(true);
    try {
      if (isSignUp) {
        await signUpWithEmail(email, password);
        toast.success("Muvaffaqiyatli ro'yxatdan o'tdingiz!");
      } else {
        await signInWithEmail(email, password);
        toast.success("Tizimga muvaffaqiyatli kirdingiz!");
      }
      // App.tsx handles the state update via onAuthStateChanged
    } catch (error: any) {
      toast.error(`Xatolik: ${error.message}`);
    } finally {
      setIsLoadingAuth(false);
    }
  };

  const handleAppleLogin = async () => {
    setIsLoadingAuth(true);
    try {
      await signInWithApple();
      toast.success("Apple orqali muvaffaqiyatli kirdingiz!");
    } catch (error: any) {
      toast.error(`Xatolik: ${error.message}`);
    } finally {
      setIsLoadingAuth(false);
    }
  };

  const handleGoogleLogin = async () => {
    setIsLoadingAuth(true);
    try {
      await signInWithGoogle();
      toast.success("Google orqali muvaffaqiyatli kirdingiz!");
    } catch (error: any) {
      toast.error(`Xatolik: ${error.message}`);
    } finally {
      setIsLoadingAuth(false);
    }
  };

  const renderMain = () => {
    if (!user) {
      if (showEmailLogin) {
        return (
          <div className="flex flex-col items-center justify-center h-[70vh] p-8 text-center">
            <button 
              onClick={() => setShowEmailLogin(false)}
              className="absolute top-6 left-6 w-10 h-10 bg-white/5 rounded-full flex items-center justify-center text-text-primary/60 hover:text-text-primary transition-colors"
            >
              <ArrowLeft size={20} />
            </button>
            <div className="w-20 h-20 bg-accent-blue/10 rounded-full flex items-center justify-center text-accent-blue mb-6">
              <UserIcon size={40} />
            </div>
            <h2 className="text-2xl font-black text-text-primary mb-2">
              {isSignUp ? "Ro'yxatdan o'tish" : "Tizimga kirish"}
            </h2>
            <p className="text-sm text-text-primary/60 mb-8">
              {isSignUp ? "Yangi akkaunt yarating" : "O'z akkauntingizga kiring"}
            </p>

            <form onSubmit={handleEmailAuth} className="w-full max-w-sm flex flex-col gap-4">
              <input 
                type="email" 
                placeholder="Email manzilingiz" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-sm text-text-primary focus:outline-none focus:border-accent-blue/50 transition-colors"
                required
              />
              <input 
                type="password" 
                placeholder="Parol" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-sm text-text-primary focus:outline-none focus:border-accent-blue/50 transition-colors"
                required
                minLength={6}
              />
              <motion.button
                whileTap={{ scale: 0.95 }}
                type="submit"
                disabled={isLoadingAuth}
                className="w-full py-4 bg-gradient-to-r from-accent-blue to-accent-light text-white rounded-2xl font-black uppercase tracking-widest text-sm shadow-xl shadow-accent-blue/20 flex items-center justify-center mt-2 disabled:opacity-50"
              >
                {isLoadingAuth ? "Kutilmoqda..." : (isSignUp ? "Ro'yxatdan o'tish" : "Kirish")}
              </motion.button>
            </form>

            <button 
              onClick={() => setIsSignUp(!isSignUp)}
              className="mt-6 text-sm text-text-primary/60 hover:text-accent-blue transition-colors"
            >
              {isSignUp ? "Akkauntingiz bormi? Kirish" : "Akkauntingiz yo'qmi? Ro'yxatdan o'tish"}
            </button>
          </div>
        );
      }

      return (
        <div className="flex flex-col items-center justify-center h-[70vh] p-8 text-center">
          <div className="w-24 h-24 bg-accent-blue/10 rounded-full flex items-center justify-center text-accent-blue mb-6">
            <UserIcon size={48} />
          </div>
          <h2 className="text-2xl font-black text-text-primary mb-2">Xush kelibsiz!</h2>
          <p className="text-sm text-text-primary/60 mb-8">
            Barcha imkoniyatlardan foydalanish uchun tizimga kiring.
          </p>
          
          <div className="w-full max-w-sm flex flex-col gap-4">
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={handleGoogleLogin}
              disabled={isLoadingAuth}
              className="w-full py-4 bg-white text-black rounded-2xl font-bold text-sm shadow-xl flex items-center justify-center gap-3 disabled:opacity-50"
            >
              <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-1 .67-2.28 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.66l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
              </svg>
              Google orqali kirish
            </motion.button>

            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={handleAppleLogin}
              disabled={isLoadingAuth}
              className="w-full py-4 bg-black text-white rounded-2xl font-bold text-sm shadow-xl border border-white/20 flex items-center justify-center gap-3 disabled:opacity-50"
            >
              <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
                <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.04 2.26-.79 3.59-.76 1.56.04 2.87.68 3.66 1.83-3.08 1.81-2.58 5.86.44 7.08-.7 1.73-1.52 3.28-2.77 4.02zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
              </svg>
              Apple orqali kirish
            </motion.button>

            <div className="flex items-center gap-4 my-2">
              <div className="h-px bg-white/10 flex-1"></div>
              <span className="text-xs text-text-primary/40 uppercase tracking-widest">Yoki</span>
              <div className="h-px bg-white/10 flex-1"></div>
            </div>

            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowEmailLogin(true)}
              disabled={isLoadingAuth}
              className="w-full py-4 bg-white/5 text-text-primary rounded-2xl font-bold text-sm border border-white/10 flex items-center justify-center gap-3 hover:bg-white/10 transition-colors disabled:opacity-50"
            >
              <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                <polyline points="22,6 12,13 2,6" />
              </svg>
              Email orqali kirish
            </motion.button>
          </div>
        </div>
      );
    }

    return (
      <div className="flex flex-col gap-6 p-4">
        {/* Glassmorphic Identity Card */}
        <motion.div 
          whileHover={{ y: -5 }}
          className="relative p-6 rounded-[2.5rem] overflow-hidden border border-white/20 shadow-2xl group"
        >
          {/* Background Effects */}
          <div className="absolute inset-0 bg-gradient-to-br from-accent-blue/40 via-accent-light/20 to-purple-500/30 backdrop-blur-3xl z-0" />
          <motion.div 
            animate={{ 
              scale: [1, 1.2, 1],
              rotate: [0, 90, 0],
            }}
            transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
            className="absolute -top-20 -right-20 w-64 h-64 bg-accent-blue/20 rounded-full blur-[80px] z-0" 
          />
          
          <div className="relative z-10 flex flex-col gap-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <div className="w-20 h-20 rounded-full bg-white/10 backdrop-blur-md border-2 border-white/40 p-1 shadow-inner">
                    <div className="w-full h-full rounded-full overflow-hidden bg-gradient-to-br from-accent-blue to-accent-light flex items-center justify-center text-white shadow-lg">
                      {user.photoURL ? (
                        <img src={user.photoURL} alt={user.displayName || ''} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      ) : (
                        <UserIcon size={40} />
                      )}
                    </div>
                  </div>
                  <div className="absolute -bottom-1 -right-1 w-7 h-7 bg-emerald-500 rounded-full border-4 border-bg-primary flex items-center justify-center text-white shadow-lg">
                    <Award size={14} />
                  </div>
                </div>
                <div>
                  <h2 className="text-2xl font-black text-white tracking-tight leading-none mb-1">{user.displayName || 'Foydalanuvchi'}</h2>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 bg-white/20 backdrop-blur-md rounded-full text-[10px] font-black text-white uppercase tracking-widest border border-white/20">
                      {user.role === 'seller' ? 'SOTUVCHI' : t.alpha_member}
                    </span>
                    <div className="flex items-center gap-1 text-amber-400">
                      <Star size={10} fill="currentColor" />
                      <span className="text-[10px] font-black">4.9</span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-black text-white/60 uppercase tracking-widest mb-1">{t.id_status}</p>
                <p className="text-xs font-black text-white bg-white/10 px-3 py-1 rounded-lg border border-white/20">{t.verified}</p>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-3 gap-2">
              <motion.div 
                whileTap={{ scale: 0.95 }}
                onClick={() => setSubView('subscriptions')}
                className="bg-white/10 backdrop-blur-md rounded-2xl p-3 border border-white/10 text-center cursor-pointer"
              >
                <p className="text-[10px] font-black text-white/60 uppercase tracking-tighter mb-1">{t.subscriptions}</p>
                <p className="text-sm font-black text-white">{subscribedSellers.length}</p>
              </motion.div>
              <motion.div 
                whileTap={{ scale: 0.95 }}
                onClick={() => setSubView('saved')}
                className="bg-white/10 backdrop-blur-md rounded-2xl p-3 border border-white/10 text-center cursor-pointer"
              >
                <p className="text-[10px] font-black text-white/60 uppercase tracking-tighter mb-1">{t.saved}</p>
                <p className="text-sm font-black text-white">{savedPosts.length + (savedObrazlar?.length || 0)}</p>
              </motion.div>
              <motion.div 
                whileTap={{ scale: 0.95 }}
                onClick={() => setSubView('chats')}
                className="bg-white/10 backdrop-blur-md rounded-2xl p-3 border border-white/10 text-center cursor-pointer"
              >
                <p className="text-[10px] font-black text-white/60 uppercase tracking-tighter mb-1">{t.chats}</p>
                <p className="text-sm font-black text-white">{Object.keys(chatMessages).length}</p>
              </motion.div>
            </div>
          </div>
        </motion.div>

      {/* New Interactive Sections */}
      <div className="grid grid-cols-2 gap-3">
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={() => setSubView('style-dna')}
          className="p-5 bg-gradient-to-br from-purple-500/10 to-accent-blue/10 border border-accent-blue/20 rounded-[2rem] text-left group"
        >
          <div className="w-10 h-10 bg-purple-500/20 rounded-xl flex items-center justify-center text-purple-500 mb-3 group-hover:scale-110 transition-transform">
            <Dna size={24} />
          </div>
          <h3 className="text-sm font-black text-text-primary uppercase tracking-tight">{t['style-dna']}</h3>
          <p className="text-[10px] text-text-primary/40 font-bold uppercase tracking-widest">{t.style_analysis}</p>
        </motion.button>

        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={() => setSubView('closet')}
          className="p-5 bg-gradient-to-br from-emerald-500/10 to-accent-blue/10 border border-accent-blue/20 rounded-[2rem] text-left group"
        >
          <div className="w-10 h-10 bg-emerald-500/20 rounded-xl flex items-center justify-center text-emerald-500 mb-3 group-hover:scale-110 transition-transform">
            <Bookmark size={24} />
          </div>
          <h3 className="text-sm font-black text-text-primary uppercase tracking-tight">{t.closet}</h3>
          <p className="text-[10px] text-text-primary/40 font-bold uppercase tracking-widest">{t.virtual_wardrobe}</p>
        </motion.button>

        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={() => setSubView('comments')}
          className="p-5 bg-gradient-to-br from-rose-500/10 to-accent-blue/10 border border-accent-blue/20 rounded-[2rem] text-left group"
        >
          <div className="w-10 h-10 bg-rose-500/20 rounded-xl flex items-center justify-center text-rose-500 mb-3 group-hover:scale-110 transition-transform">
            <MessageSquare size={24} />
          </div>
          <h3 className="text-sm font-black text-text-primary uppercase tracking-tight">{t.my_comments}</h3>
          <p className="text-[10px] text-text-primary/40 font-bold uppercase tracking-widest">{t.comments}</p>
        </motion.button>

        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={() => setSubView('liked-posts')}
          className="p-5 bg-gradient-to-br from-pink-500/10 to-accent-blue/10 border border-accent-blue/20 rounded-[2rem] text-left group"
        >
          <div className="w-10 h-10 bg-pink-500/20 rounded-xl flex items-center justify-center text-pink-500 mb-3 group-hover:scale-110 transition-transform">
            <Heart size={24} />
          </div>
          <h3 className="text-sm font-black text-text-primary uppercase tracking-tight">{t.liked_posts}</h3>
          <p className="text-[10px] text-text-primary/40 font-bold uppercase tracking-widest">100 {t.view_all}</p>
        </motion.button>

        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={() => setSubView('recently-viewed')}
          className="p-5 bg-gradient-to-br from-emerald-500/10 to-accent-blue/10 border border-accent-blue/20 rounded-[2rem] text-left group"
        >
          <div className="w-10 h-10 bg-emerald-500/20 rounded-xl flex items-center justify-center text-emerald-500 mb-3 group-hover:scale-110 transition-transform">
            <RefreshCw size={24} />
          </div>
          <h3 className="text-sm font-black text-text-primary uppercase tracking-tight">{t.recently_viewed}</h3>
          <p className="text-[10px] text-text-primary/40 font-bold uppercase tracking-widest">100 {t.view_all}</p>
        </motion.button>

        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={() => setSubView('language')}
          className="p-5 bg-gradient-to-br from-blue-500/10 to-accent-blue/10 border border-accent-blue/20 rounded-[2rem] text-left group"
        >
          <div className="w-10 h-10 bg-blue-500/20 rounded-xl flex items-center justify-center text-blue-500 mb-3 group-hover:scale-110 transition-transform">
            <Globe size={24} />
          </div>
          <h3 className="text-sm font-black text-text-primary uppercase tracking-tight">{t.language}</h3>
          <p className="text-[10px] text-text-primary/40 font-bold uppercase tracking-widest">
            {languages.find(l => l.code === language)?.name}
          </p>
        </motion.button>
      </div>

      {/* Admin Panel Button */}
      {(user.role === 'admin' && (user.adminAccessEnabled === true || user.email === "azizbekbakirov39@gmail.com")) && (
        <motion.button
          onClick={handleAdminClick}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="relative overflow-hidden group w-full py-5 bg-gradient-to-r from-yellow-500 to-amber-600 text-white rounded-2xl font-black uppercase tracking-[0.2em] text-sm shadow-xl shadow-yellow-500/30 mb-2"
        >
          <span className="relative z-10 flex items-center justify-center gap-3">
            <ShieldCheck size={20} />
            Admin Panel
          </span>
          <motion.div 
            animate={{ 
              x: ['-100%', '200%'],
            }}
            transition={{ 
              duration: 2, 
              repeat: Infinity, 
              ease: "linear" 
            }}
            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent skew-x-12"
          />
        </motion.button>
      )}

      {/* Admin PIN Modal */}
      <AnimatePresence>
        {showPinModal && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowPinModal(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-md"
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-xs bg-bg-primary rounded-[2.5rem] p-8 shadow-2xl border border-white/10 text-center"
            >
              <div className="w-16 h-16 bg-yellow-500/20 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <ShieldCheck size={32} className="text-yellow-500" />
              </div>
              <h2 className="text-xl font-black italic tracking-tighter uppercase mb-2">Admin Tasdig'i</h2>
              <p className="text-[10px] text-text-primary/40 font-bold uppercase tracking-widest mb-6">
                Davom etish uchun PIN-kodni kiriting
              </p>
              
              <input 
                type="password"
                maxLength={6}
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                placeholder="••••••"
                className="w-full bg-text-primary/5 border border-text-primary/10 rounded-2xl py-4 text-center text-2xl tracking-[0.5em] font-black outline-none focus:border-yellow-500/50 transition-all mb-6"
                autoFocus
              />

              <div className="grid grid-cols-2 gap-3">
                <button 
                  onClick={() => setShowPinModal(false)}
                  className="py-4 text-[10px] font-black uppercase tracking-widest text-text-primary/40 hover:text-text-primary transition-colors"
                >
                  Bekor qilish
                </button>
                <button 
                  onClick={verifyPin}
                  className="py-4 bg-yellow-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-yellow-500/20"
                >
                  Tasdiqlash
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Open Shop Button */}
      {!hasShop && (
        <motion.button
          onClick={onOpenShop}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="relative overflow-hidden group w-full py-5 bg-gradient-to-r from-accent-blue to-accent-light text-white rounded-2xl font-black uppercase tracking-[0.2em] text-sm shadow-xl shadow-accent-blue/30"
        >
          <span className="relative z-10 flex items-center justify-center gap-3">
            <ShoppingBag size={20} />
            Do'kon ochish
          </span>
          {/* Shimmer Effect */}
          <motion.div 
            animate={{ 
              x: ['-100%', '200%'],
            }}
            transition={{ 
              duration: 2, 
              repeat: Infinity, 
              ease: "linear" 
            }}
            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent skew-x-12"
          />
        </motion.button>
      )}

      {/* Menu Items removed as they are now integrated into other sections */}

      {/* Interests Section */}
      <div className="p-6 bg-text-primary/5 rounded-[2rem] border border-border-primary">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xs font-black text-text-primary/40 uppercase tracking-widest">{t.interests}</h3>
          <div className="flex items-center gap-1 text-[10px] font-black text-accent-blue uppercase tracking-widest">
            <Zap size={12} className="fill-current" />
            <span>Faollik</span>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          {[
            { icon: Sparkles, color: 'text-amber-500', bg: 'bg-amber-500/10', label: t.trendsetter, percent: 65 },
            { icon: Heart, color: 'text-rose-500', bg: 'bg-rose-500/10', label: t.lover, percent: 82 },
            { icon: Zap, color: 'text-accent-blue', bg: 'bg-accent-blue/10', label: t.fast, percent: 45 },
            { icon: LayoutGrid, color: 'text-purple-500', bg: 'bg-purple-500/10', label: t.collector, percent: 91 },
          ].sort((a, b) => b.percent - a.percent).map((interest, i) => (
            <div key={i} className="flex flex-col gap-2 p-3 bg-white/5 rounded-2xl border border-white/5">
              <div className="flex items-center justify-between">
                <div className={`w-8 h-8 rounded-lg ${interest.bg} flex items-center justify-center ${interest.color}`}>
                  <interest.icon size={18} />
                </div>
                <span className="text-[10px] font-black text-text-primary">{interest.percent}%</span>
              </div>
              <div className="space-y-1">
                <p className="text-[9px] font-black text-text-primary/60 uppercase tracking-tight truncate">{interest.label}</p>
                <div className="h-1 w-full bg-text-primary/10 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${interest.percent}%` }}
                    transition={{ duration: 1, delay: i * 0.1 }}
                    className={`h-full ${interest.color.replace('text-', 'bg-')}`}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <button 
        onClick={onLogout}
        className="flex items-center gap-3 p-4 text-red-500 font-bold mt-4 hover:bg-red-500/10 rounded-xl transition-colors w-full"
      >
        <LogOut size={20} strokeWidth={1.5} />
        <span>{t.logout}</span>
      </button>
    </div>
  );
};

  const renderLanguage = () => (
    <div className="flex flex-col gap-2 p-4">
      {languages.map((lang) => (
        <button
          key={lang.code}
          onClick={() => {
            setLanguage(lang.code);
            setSubView('main');
          }}
          className={`flex items-center justify-between p-4 rounded-xl border transition-all ${
            language === lang.code 
              ? 'bg-accent-blue/10 border-accent-blue/50 text-accent-blue' 
              : 'bg-text-primary/5 border-transparent text-text-primary/80 hover:bg-text-primary/10'
          }`}
        >
          <span className="font-medium">{lang.name}</span>
          {language === lang.code && <div className="w-2 h-2 rounded-full bg-gradient-to-br from-accent-blue to-accent-light shadow-[0_0_8px_rgba(0,85,255,0.5)]" />}
        </button>
      ))}
    </div>
  );

  const renderSubscriptions = () => (
    <div className="flex flex-col gap-3 p-4">
      {subscribedSellers.length > 0 ? (
        subscribedSellers.map((seller) => (
          <div key={seller.id} className="flex items-center justify-between p-4 bg-text-primary/5 rounded-xl border border-text-primary/10">
            <div className="flex items-center gap-3">
              <img src={seller.logo} alt={seller.name} className="w-10 h-10 rounded-full object-cover" referrerPolicy="no-referrer" />
              <div>
                <p className="font-bold text-sm">{seller.name}</p>
                <p className="text-[10px] text-text-primary/40 uppercase tracking-widest">{seller.followers.toLocaleString()} obunachi</p>
              </div>
            </div>
            <button 
              onClick={() => onToggleSubscribe(seller.id)}
              className="px-4 py-1.5 bg-gradient-to-r from-accent-blue/10 to-accent-light/10 text-accent-blue text-xs font-bold rounded-lg border border-accent-blue/20 active:scale-95 transition-transform"
            >
              Obunadasiz
            </button>
          </div>
        ))
      ) : (
        <div className="flex flex-col items-center justify-center py-20 text-text-primary/20">
          <Users size={48} strokeWidth={1} className="mb-4 opacity-20" />
          <p className="text-sm font-medium">{t.no_subscriptions}</p>
        </div>
      )}
    </div>
  );

  const renderChats = () => {
    if (activeChatSeller) {
      const messages = chatMessages[activeChatSeller.id] || [];
      const quickActions = [
        { id: 'price', label: "Narxi qancha?", text: "Assalomu alaykum! Ushbu mahsulotning narxi qancha?" },
        { id: 'delivery', label: "Dostavka bormi?", text: "Dostavka xizmati bormi va qancha vaqtda yetib keladi?" },
        { id: 'size', label: "Razmer bormi?", text: "Ushbu mahsulotning boshqa razmerlari bormi?" },
        { id: 'location', label: "Manzil?", text: "Do'koningiz manzilini tashlab bera olasizmi?" },
      ];

      return (
        <div className="flex flex-col h-full relative overflow-hidden">
          {/* Product Context Header */}
          {activeProduct && (
            <motion.div 
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="bg-white/80 dark:bg-neutral-900/80 backdrop-blur-xl border-b border-border-primary p-3 flex items-center gap-3 z-30"
            >
              <div className="w-12 h-12 rounded-xl overflow-hidden border border-border-primary shrink-0">
                <img 
                  src={activeProduct.mediaUrls[0]} 
                  alt={activeProduct.outfitName} 
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-xs font-black text-text-primary truncate">{activeProduct.outfitName}</h4>
                <p className="text-[10px] font-black text-accent-blue">{activeProduct.price}</p>
              </div>
              <button 
                onClick={() => setActiveProduct(null)}
                className="p-2 text-text-primary/40 hover:text-red-500 transition-colors"
              >
                <X size={16} />
              </button>
            </motion.div>
          )}

          {/* Chat Background with Product Image */}
          <div className="absolute inset-0 z-0">
            {activeProduct ? (
              <div className="relative w-full h-full">
                <img 
                  src={activeProduct.mediaUrls[0]} 
                  alt="" 
                  className="w-full h-full object-cover opacity-10 blur-2xl scale-110"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-bg-primary/40 backdrop-blur-[2px]" />
              </div>
            ) : (
              <div className="w-full h-full bg-[#E5DDD5] dark:bg-[#0B141A] opacity-20" />
            )}
          </div>

          {/* Typing Indicator */}
          <AnimatePresence>
            {isTyping && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="absolute top-16 left-4 z-40 flex items-center gap-2 bg-white/80 dark:bg-neutral-900/80 backdrop-blur-md px-3 py-1.5 rounded-full border border-border-primary shadow-sm"
              >
                <div className="flex gap-1">
                  {[0, 1, 2].map(i => (
                    <motion.div 
                      key={i}
                      animate={{ opacity: [0.3, 1, 0.3] }}
                      transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
                      className="w-1.5 h-1.5 rounded-full bg-accent-blue"
                    />
                  ))}
                </div>
                <span className="text-[10px] font-black text-text-primary/60 uppercase tracking-widest">Sotuvchi yozmoqda...</span>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="flex-1 overflow-y-auto p-4 pb-8 space-y-4 scrollbar-hide relative z-10 min-h-0">
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full text-text-primary/20">
                <MessageSquare size={48} className="mb-2 opacity-10" />
                <p className="text-xs font-medium">Suhbatni boshlang</p>
              </div>
            )}
            {messages.map((msg, i) => (
              <div key={msg.id} className={`flex ${msg.isMe ? 'justify-end' : 'justify-start'} group mb-1`}>
                <div 
                  onClick={() => setSelectedMessageId(selectedMessageId === msg.id ? null : msg.id)}
                  className={`relative max-w-[85%] px-4 py-2.5 rounded-2xl text-[14px] shadow-sm transition-all cursor-pointer active:scale-[0.98] ${
                  msg.isMe 
                  ? 'bg-gradient-to-br from-accent-blue to-accent-light text-white rounded-tr-[4px]' 
                  : 'bg-white text-[#1C1C1C] rounded-tl-[4px] border border-[#E5E5E5]'
                }`}>
                  {/* Reply Preview */}
                  {msg.replyTo && (
                    <div className="mb-2 p-2 bg-black/5 rounded-lg border-l-4 border-accent-blue text-[11px] opacity-70 truncate">
                      {messages.find(m => m.id === msg.replyTo)?.text || "Ovozli xabar"}
                    </div>
                  )}

                  {msg.image && (
                    <div className="mb-2 rounded-xl overflow-hidden border border-black/5">
                      <img src={msg.image} alt="" className="w-full max-h-60 object-cover" referrerPolicy="no-referrer" />
                    </div>
                  )}

                  {msg.video && (
                    <div className="mb-2 rounded-xl overflow-hidden border border-black/5 bg-black">
                      <video src={msg.video} controls className="w-full max-h-60" />
                    </div>
                  )}

                  {msg.videoMessage && (
                    <div className="mb-2 w-48 h-48 rounded-2xl overflow-hidden border-4 border-accent-blue/20 bg-black shadow-xl">
                      <video src={msg.videoMessage} autoPlay loop muted playsInline className="w-full h-full object-cover" />
                    </div>
                  )}

                  {msg.location && (
                    <div className="mb-2 w-48 h-32 rounded-xl overflow-hidden border border-black/5 bg-neutral-100 flex flex-col items-center justify-center gap-2">
                      <MapPinIcon size={24} className="text-red-500" />
                      <span className="text-[10px] font-bold uppercase tracking-widest text-text-primary/60">Joylashuv</span>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          window.open(`https://www.google.com/maps?q=${msg.location!.lat},${msg.location!.lng}`, '_blank');
                        }}
                        className="text-[10px] text-accent-blue font-bold underline"
                      >
                        Xaritada ko'rish
                      </button>
                    </div>
                  )}

                  {msg.post && (
                    <div className="mb-2 w-48 bg-white dark:bg-neutral-800 rounded-xl overflow-hidden border border-border-primary shadow-sm">
                      <img src={msg.post.mediaUrls[0]} alt="" className="w-full h-32 object-cover" referrerPolicy="no-referrer" />
                      <div className="p-2">
                        <p className="text-[10px] font-black truncate">{msg.post.outfitName}</p>
                        <p className="text-[10px] font-black text-accent-blue">{msg.post.price}</p>
                      </div>
                    </div>
                  )}

                  {msg.audio ? (
                    <div className="flex items-center gap-2 min-w-[200px] py-1">
                      <button 
                        onClick={() => handlePlayAudio(msg.id, msg.audio!)}
                        className={`w-11 h-11 rounded-full flex items-center justify-center transition-transform active:scale-90 ${msg.isMe ? 'bg-white text-accent-blue' : 'bg-accent-blue text-white'}`}
                      >
                        {playingMessageId === msg.id ? (
                          <Pause size={20} fill="currentColor" />
                        ) : (
                          <Play size={20} fill="currentColor" className="ml-1" />
                        )}
                      </button>
                      <div className="flex-1">
                        <div className="flex items-center gap-1 h-6 relative">
                          {[...Array(20)].map((_, j) => {
                            const barProgress = (j / 20) * 100;
                            const isPlayed = (audioProgress[msg.id] || 0) > barProgress;
                            return (
                              <div 
                                key={j} 
                                className={`w-[2px] rounded-full transition-colors duration-200 ${
                                  isPlayed 
                                  ? (msg.isMe ? 'bg-white' : 'bg-accent-blue') 
                                  : (msg.isMe ? 'bg-white/30' : 'bg-accent-blue/30')
                                }`}
                                style={{ height: `${20 + Math.random() * 80}%` }}
                              />
                            );
                          })}
                        </div>
                        <div className="flex items-center justify-between mt-1">
                          <p className={`text-[10px] font-medium ${msg.isMe ? 'text-white/80' : 'text-accent-blue'}`}>Ovozli xabar</p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <p className="leading-tight break-all pr-12 whitespace-pre-wrap">{msg.text}</p>
                  )}
                  
                  <div className="absolute bottom-1 right-2 flex items-center gap-1">
                    <p className={`text-[9px] ${msg.isMe ? 'text-white/70' : 'text-[#8E8E93]'}`}>{msg.time}</p>
                    {msg.isMe && (
                      <div className="text-white">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12"></polyline>
                        </svg>
                      </div>
                    )}
                  </div>

                  {/* Reactions */}
                  {msg.reactions && msg.reactions.length > 0 && (
                    <div className={`absolute -bottom-3 ${msg.isMe ? 'right-0' : 'left-0'} flex gap-0.5 bg-white dark:bg-neutral-800 rounded-full px-1.5 py-0.5 shadow-md border border-border-primary scale-75 origin-top`}>
                      {msg.reactions.map((r, idx) => <span key={idx}>{r}</span>)}
                    </div>
                  )}

                  {/* Message Actions Menu */}
                  <AnimatePresence>
                    {selectedMessageId === msg.id && (
                      <motion.div 
                        initial={{ opacity: 0, scale: 0.9, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 10 }}
                        className={`absolute z-50 ${i < 2 ? 'top-full mt-2' : 'bottom-full mb-2'} ${msg.isMe ? 'right-0' : 'left-0'} bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl border border-border-primary overflow-hidden min-w-[120px]`}
                      >
                        <div className="flex p-2 gap-2 border-b border-border-primary overflow-x-auto scrollbar-hide">
                          {['❤️', '👍', '🔥', '😂', '😮', '😢'].map(emoji => (
                            <button 
                              key={emoji} 
                              onClick={(e) => { e.stopPropagation(); handleReaction(msg.id, emoji); }}
                              className="text-lg hover:scale-125 transition-transform"
                            >
                              {emoji}
                            </button>
                          ))}
                        </div>
                        <button 
                          onClick={(e) => { e.stopPropagation(); setReplyingTo(msg); setSelectedMessageId(null); }}
                          className="w-full px-4 py-2.5 flex items-center gap-3 text-xs font-bold hover:bg-text-primary/5 text-text-primary"
                        >
                          <Reply size={16} className="text-accent-blue" /> Javob berish
                        </button>
                        <button 
                          onClick={(e) => { e.stopPropagation(); handleDeleteMessage(activeChatSeller.id, msg.id); }}
                          className="w-full px-4 py-2.5 flex items-center gap-3 text-xs font-bold hover:bg-red-500/5 text-red-500"
                        >
                          <Trash2 size={16} /> O'chirish
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            ))}
          </div>

          {/* Quick Actions */}
          {messages.length === 0 && (
            <div className="px-4 pb-2 flex gap-2 overflow-x-auto scrollbar-hide relative z-10">
              {quickActions.map((action) => (
                <button
                  key={action.id}
                  onClick={() => handleSendMessage(action.text)}
                  className="whitespace-nowrap px-4 py-2 bg-white/80 dark:bg-neutral-800/80 backdrop-blur-md border border-border-primary rounded-full text-[11px] font-bold text-text-primary hover:bg-accent-blue hover:text-white hover:border-accent-blue transition-all active:scale-95 shadow-sm"
                >
                  {action.label}
                </button>
              ))}
            </div>
          )}

          <div className="p-4 border-t border-border-primary bg-bg-primary relative z-20">
            {/* Staged Content Preview */}
            <AnimatePresence>
              {(stagedImage || stagedVideo || stagedLocation) && (
                <motion.div 
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="mb-2 bg-text-primary/5 rounded-xl p-2 flex items-center gap-3 border border-border-primary"
                >
                  <div className="w-12 h-12 rounded-lg overflow-hidden bg-black/10 flex items-center justify-center">
                    {stagedImage && <img src={stagedImage} className="w-full h-full object-cover" />}
                    {stagedVideo && <Video size={20} className="text-accent-blue" />}
                    {stagedLocation && <MapPinIcon size={20} className="text-accent-blue" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-black text-accent-blue uppercase tracking-widest">
                      {stagedImage ? "Rasm tayyor" : stagedVideo ? "Video tayyor" : "Joylashuv tayyor"}
                    </p>
                    <p className="text-xs text-text-primary/60 truncate">
                      {stagedImage ? "Yuborish uchun bosing" : stagedVideo ? "Yuborish uchun bosing" : `${stagedLocation?.lat.toFixed(4)}, ${stagedLocation?.lng.toFixed(4)}`}
                    </p>
                  </div>
                  <button 
                    onClick={() => { setStagedImage(null); setStagedVideo(null); setStagedLocation(null); }} 
                    className="p-1 text-text-primary/40 hover:text-red-500"
                  >
                    <X size={16} />
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Reply Preview in Input */}
            <AnimatePresence>
              {replyingTo && (
                <motion.div 
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="mb-2 bg-text-primary/5 rounded-xl p-2 flex items-center gap-3 border-l-4 border-accent-blue"
                >
                  <Reply size={16} className="text-accent-blue" />
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-black text-accent-blue uppercase tracking-widest">Javob qaytarish</p>
                    <p className="text-xs text-text-primary/60 truncate">{replyingTo.text || "Ovozli xabar"}</p>
                  </div>
                  <button onClick={() => setReplyingTo(null)} className="p-1 text-text-primary/40">
                    <X size={16} />
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Recording Overlay (Telegram Style) */}
            <AnimatePresence>
              {(isRecording || isVideoRecording) && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="absolute inset-0 bg-bg-primary z-50 flex items-center px-4 gap-3 rounded-2xl border border-border-primary shadow-lg"
                >
                  <div className="flex items-center gap-3 flex-1">
                    <motion.div 
                      animate={{ opacity: [1, 0.4, 1] }}
                      transition={{ duration: 1, repeat: Infinity }}
                      className={`w-2.5 h-2.5 rounded-full ${isRecording ? 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]' : 'bg-accent-blue shadow-[0_0_8px_rgba(0,122,255,0.5)]'}`}
                    />
                    <span className="text-sm font-mono font-bold text-text-primary tabular-nums">
                      {formatDuration(recordingDuration)}
                    </span>
                    
                    <div className="flex-1 flex justify-center overflow-hidden">
                      <motion.div 
                        animate={{ x: dragX }}
                        className="flex items-center gap-2 text-text-primary/40 whitespace-nowrap"
                      >
                        <ChevronLeft size={14} className="animate-pulse" />
                        <span className="text-[11px] font-bold uppercase tracking-widest">
                          {dragX < -100 ? "Qo'yib yuboring bekor qilish uchun" : "Bekor qilish uchun suring"}
                        </span>
                      </motion.div>
                    </div>
                  </div>

                  {isVideoRecording && (
                    <motion.div 
                      initial={{ scale: 0, opacity: 0, y: 20 }}
                      animate={{ scale: 1, opacity: 1, y: 0 }}
                      className="absolute bottom-20 left-1/2 -translate-x-1/2 aspect-square w-48 rounded-2xl overflow-hidden bg-black border-2 border-accent-blue shadow-2xl z-[60]"
                    >
                      <video ref={videoPreviewRef} autoPlay muted playsInline className="w-full h-full object-cover" />
                      <button 
                        onClick={(e) => { e.stopPropagation(); toggleCamera(); }}
                        className="absolute top-2 right-2 p-2 bg-black/40 backdrop-blur-md text-white rounded-full active:scale-90 transition-transform"
                      >
                        <RefreshCw size={14} />
                      </button>
                    </motion.div>
                  )}

                  <div className={`p-2 rounded-full transition-all duration-300 ${dragX < -100 ? 'bg-red-500 text-white scale-125 shadow-lg' : 'text-text-primary/20'}`}>
                    <Trash size={20} />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="flex items-center gap-1 bg-text-primary/5 rounded-2xl p-1.5 border border-border-primary relative min-h-[52px]">
              <div className="flex items-center">
                <button 
                  onClick={() => setShowAttachmentMenu(!showAttachmentMenu)}
                  className={`p-2 transition-all duration-300 rounded-full shadow-sm ${showAttachmentMenu ? 'rotate-45 bg-gradient-to-br from-accent-blue to-accent-light text-white' : 'bg-gradient-to-br from-accent-blue to-accent-light text-white hover:shadow-md active:scale-95'}`}
                >
                  <Plus size={20} />
                </button>
                
                <AnimatePresence>
                  {showAttachmentMenu && (
                    <motion.div 
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -10 }}
                      className="flex items-center gap-1 ml-1"
                    >
                      <button 
                        onClick={() => {
                          handleFileUpload('image');
                          setShowAttachmentMenu(false);
                        }}
                        className="p-2 bg-gradient-to-br from-accent-blue to-accent-light text-white rounded-full shadow-md active:scale-90 transition-all"
                      >
                        <ImageIcon size={18} />
                      </button>
                      <button 
                        onClick={() => {
                          handleLocationShare();
                          setShowAttachmentMenu(false);
                        }}
                        className="p-2 bg-gradient-to-br from-accent-blue to-accent-light text-white rounded-full shadow-md active:scale-90 transition-all"
                      >
                        <MapPinIcon size={18} />
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <textarea 
                value={newMessage}
                onChange={(e) => {
                  setNewMessage(e.target.value);
                  e.target.style.height = 'auto';
                  e.target.style.height = `${e.target.scrollHeight}px`;
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                    e.currentTarget.style.height = 'auto';
                  }
                }}
                placeholder="Xabar yozing..."
                rows={1}
                className="flex-1 bg-transparent border-none outline-none text-sm px-2 min-w-[100px] resize-none max-h-32 py-2 scrollbar-hide"
                disabled={isRecording || isVideoRecording}
              />
              
              <div className="flex items-center">
                {(!newMessage.trim() && !stagedImage && !stagedVideo && !stagedLocation) ? (
                  <div className="flex items-center relative">
                    {/* Cancel Target Indicator (Telegram Style) */}
                    {(isRecording || isVideoRecording) && (
                      <motion.div 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: -45 }}
                        exit={{ opacity: 0, y: 10 }}
                        className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 flex flex-col items-center gap-1"
                      >
                        <div className={`p-2.5 rounded-full border-2 border-dashed transition-all duration-300 ${isCancelAreaHovered ? 'bg-red-500 border-red-500 text-white scale-125 shadow-lg' : 'bg-white border-text-primary/20 text-text-primary/40'}`}>
                          <Trash size={16} />
                        </div>
                        <span className={`text-[9px] font-black uppercase whitespace-nowrap transition-colors ${isCancelAreaHovered ? 'text-red-500' : 'text-text-primary/40'}`}>
                          Bekor qilish
                        </span>
                      </motion.div>
                    )}
                      <button 
                        onPointerDown={(e) => {
                          e.currentTarget.setPointerCapture(e.pointerId);
                          setRecordType('video');
                          setDragX(0);
                          dragStartRef.current = e.clientX;
                          startVideoMessage();
                        }}
                        onPointerUp={(e) => {
                          e.currentTarget.releasePointerCapture(e.pointerId);
                          dragStartRef.current = null;
                          stopVideoMessage();
                        }}
                        onPointerMove={(e) => {
                          if (isVideoRecording && dragStartRef.current !== null) {
                            const diff = e.clientX - dragStartRef.current;
                            const newX = Math.min(0, diff);
                            setDragX(newX);
                            dragXRef.current = newX;
                            const isHovered = newX < -100;
                            setIsCancelAreaHovered(isHovered);
                            isCancelAreaHoveredRef.current = isHovered;
                          }
                        }}
                        className={`p-2 transition-all active:scale-125 relative touch-none rounded-full bg-gradient-to-br from-accent-blue to-accent-light text-white shadow-sm ${isVideoRecording ? 'scale-150 z-[60] shadow-xl' : 'hover:shadow-md'}`}
                      >
                        <Video size={20} />
                      </button>
                      <button 
                        onPointerDown={(e) => {
                          e.currentTarget.setPointerCapture(e.pointerId);
                          setRecordType('voice');
                          setDragX(0);
                          dragStartRef.current = e.clientX;
                          startRecording();
                        }}
                        onPointerUp={(e) => {
                          e.currentTarget.releasePointerCapture(e.pointerId);
                          dragStartRef.current = null;
                          stopRecording();
                        }}
                        onPointerMove={(e) => {
                          if (isRecording && dragStartRef.current !== null) {
                            const diff = e.clientX - dragStartRef.current;
                            const newX = Math.min(0, diff);
                            setDragX(newX);
                            dragXRef.current = newX;
                            const isHovered = newX < -100;
                            setIsCancelAreaHovered(isHovered);
                            isCancelAreaHoveredRef.current = isHovered;
                          }
                        }}
                        className={`p-2 transition-all active:scale-125 relative touch-none rounded-full bg-gradient-to-br from-accent-blue to-accent-light text-white shadow-sm ${isRecording ? 'scale-150 z-[60] shadow-xl' : 'hover:shadow-md'}`}
                      >
                        <Mic size={20} />
                      </button>
                  </div>
                ) : (
                  <button 
                    onClick={() => handleSendMessage()}
                    className="p-2.5 bg-accent-blue text-white rounded-xl shadow-lg active:scale-95 transition-all hover:bg-accent-blue/90"
                  >
                    <Send size={18} fill="currentColor" />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      );
    }

    const chatSellers = subscribedSellers.length > 0 ? subscribedSellers : MOCK_SELLERS.slice(0, 3);

    return (
      <div className="flex flex-col gap-1 p-2">
        {chatSellers.map((seller) => (
          <button
            key={seller.id}
            onClick={() => {
              setActiveChatSeller(seller);
              window.history.pushState({ 
                type: 'profileChat', 
                sellerId: seller.id,
                workspace: 'Marketplace',
                activeTab: 'Profile',
                profileSubView: 'chats'
              }, '');
            }}
            className="flex items-center gap-3 p-3 hover:bg-text-primary/5 rounded-xl transition-colors text-left"
          >
            <div className="relative">
              <img src={seller.logo} alt={seller.name} className="w-12 h-12 rounded-full object-cover" referrerPolicy="no-referrer" />
              <div className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-bg-primary rounded-full" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-0.5">
                <p className="font-bold text-sm truncate">{seller.name}</p>
                <p className="text-[10px] text-text-primary/40">
                  {chatMessages[seller.id]?.slice(-1)[0]?.time || '12:45'}
                </p>
              </div>
              <p className="text-xs text-text-primary/60 truncate">
                {getLastMessagePreview(seller.id)}
              </p>
            </div>
          </button>
        ))}
      </div>
    );
  };

  const renderSaved = () => (
    <div className="grid grid-cols-3 gap-1">
      {savedPosts.length > 0 ? (
        savedPosts.map((post) => (
          <div 
            key={post.id} 
            onClick={() => onOpenPostDetails(post)}
            className="aspect-square relative group overflow-hidden cursor-pointer"
          >
            <img 
              src={post.mediaUrls[0]} 
              alt={post.outfitName} 
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
              <div className="flex items-center gap-1 text-white text-[10px] font-bold">
                <Bookmark size={12} fill="white" />
              </div>
            </div>
          </div>
        ))
      ) : (
        <div className="col-span-3 flex flex-col items-center justify-center py-20 text-text-primary/20">
          <Bookmark size={48} className="mb-4 opacity-20" />
          <p className="text-sm font-medium">{t.no_saved}</p>
        </div>
      )}
    </div>
  );

  const renderStyleDNA = () => (
    <div className="p-6 space-y-8">
      {/* Style Profile Header */}
      <div className="text-center space-y-2">
        <div className="w-20 h-20 bg-gradient-to-br from-purple-500 to-accent-blue rounded-3xl mx-auto flex items-center justify-center text-white shadow-xl shadow-purple-500/20">
          <Dna size={40} />
        </div>
        <h2 className="text-xl font-black text-text-primary uppercase tracking-tight">Sizning Uslub DNKngiz</h2>
        <p className="text-xs text-text-primary/60 font-medium">AI tomonidan tahlil qilingan shaxsiy moda profilingiz</p>
      </div>

      <div className="grid grid-cols-1 gap-4">
        <div className="p-5 bg-text-primary/5 rounded-[2rem] border border-border-primary">
          <h3 className="text-[10px] font-black text-text-primary/40 uppercase tracking-widest mb-4">Uslub Yo'nalishlari</h3>
          <div className="space-y-4">
            {[
              { label: t.minimalism, value: 65, color: 'bg-accent-blue' },
              { label: t.streetwear, value: 25, color: 'bg-purple-500' },
              { label: t.classic, value: 10, color: 'bg-emerald-500' }
            ].map((style) => (
              <div key={style.label} className="space-y-1.5">
                <div className="flex justify-between text-[10px] font-black uppercase tracking-tight">
                  <span className="text-text-primary">{style.label}</span>
                  <span className="text-accent-blue">{style.value}%</span>
                </div>
                <div className="h-1.5 w-full bg-text-primary/10 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${style.value}%` }}
                    transition={{ duration: 1, delay: 0.2 }}
                    className={`h-full ${style.color}`}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="p-5 bg-text-primary/5 rounded-[2rem] border border-border-primary">
            <p className="text-[10px] font-black text-text-primary/40 uppercase tracking-widest mb-3">Ranglar Palitrasi</p>
            <div className="flex gap-2">
              <div className="w-6 h-6 rounded-full bg-black border border-white/10" />
              <div className="w-6 h-6 rounded-full bg-white border border-black/10" />
              <div className="w-6 h-6 rounded-full bg-slate-500" />
              <div className="w-6 h-6 rounded-full bg-neutral-300" />
            </div>
          </div>
          <div className="p-5 bg-text-primary/5 rounded-[2rem] border border-border-primary">
            <p className="text-[10px] font-black text-text-primary/40 uppercase tracking-widest mb-2">Vibe</p>
            <p className="text-xs font-black text-text-primary uppercase tracking-tight">Modern Tech</p>
            <p className="text-[9px] font-bold text-accent-blue uppercase mt-1">Urban Casual</p>
          </div>
        </div>

        <div className="p-5 bg-accent-blue/5 rounded-[2rem] border border-accent-blue/20">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 bg-accent-blue/20 rounded-xl flex items-center justify-center text-accent-blue">
              <Sparkles size={18} />
            </div>
            <h4 className="text-xs font-black text-text-primary uppercase tracking-tight">AI Tavsiyasi</h4>
          </div>
          <p className="text-[11px] text-text-primary/70 leading-relaxed font-medium">
            Sizning tanlovlaringizga ko'ra, sizga **monoxrom** ranglar va **minimalistik** bichimlar ko'proq mos keladi. Keyingi xaridingizda teksturali matolarga e'tibor bering.
          </p>
        </div>
      </div>
    </div>
  );

  const renderCloset = () => {
    const clothingCategories = ['Erkaklar kiyinishi', 'Ayollar kiyinishi', 'Kiyim'];
    
    const filteredPosts = savedPosts.filter(post => {
      const isClothing = post.seller.categories.some(cat => clothingCategories.includes(cat));
      if (activeClosetCategory === 'clothing') return isClothing;
      if (activeClosetCategory === 'other') return !isClothing;
      return true;
    });

    return (
      <div className="p-4 flex flex-col gap-4">
        {/* Category Tabs */}
        <div className="flex gap-2 p-1 bg-text-primary/5 rounded-2xl border border-border-primary overflow-x-auto scrollbar-hide">
          {[
            { id: 'all', label: language === 'uz' ? 'Hammasi' : 'Все' },
            { id: 'clothing', label: language === 'uz' ? 'Kiyimlar' : 'Одежда' },
            { id: 'outfits', label: language === 'uz' ? 'Obrazlar' : 'Образы' },
            { id: 'other', label: language === 'uz' ? 'Boshqalar' : 'Другие' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveClosetCategory(tab.id as any)}
              className={`flex-1 min-w-[80px] py-2 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${
                activeClosetCategory === tab.id 
                  ? 'bg-white dark:bg-neutral-800 text-accent-blue shadow-sm' 
                  : 'text-text-primary/40'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {activeClosetCategory === 'outfits' ? (
          <div className="grid grid-cols-2 gap-3">
            {savedObrazlar && savedObrazlar.length > 0 ? (
              savedObrazlar.map((obraz) => (
                <div key={obraz.id} className="bg-white dark:bg-neutral-800 rounded-2xl overflow-hidden border border-border-primary shadow-sm group">
                  <div className="aspect-[3/4] relative">
                    <img src={obraz.posts[0].mediaUrls[0]} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                    <div className="absolute bottom-3 left-3 right-3">
                      <p className="text-[10px] font-black text-white uppercase tracking-tight truncate">{obraz.title}</p>
                      <p className="text-[9px] font-bold text-white/70 uppercase tracking-widest">{obraz.totalPrice}</p>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="col-span-2 flex flex-col items-center justify-center py-20 text-text-primary/20">
                <Sparkles size={48} className="mb-4 opacity-20" />
                <p className="text-sm font-medium">{t.no_outfits}</p>
              </div>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-1">
            {filteredPosts.length > 0 ? (
              filteredPosts.map((post) => (
                <div 
                  key={post.id} 
                  onClick={() => onOpenPostDetails(post)}
                  className="aspect-square relative group overflow-hidden cursor-pointer rounded-xl"
                >
                  <img 
                    src={post.mediaUrls[0]} 
                    alt={post.outfitName} 
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Bookmark size={16} fill="white" className="text-white" />
                  </div>
                </div>
              ))
            ) : (
              <div className="col-span-3 flex flex-col items-center justify-center py-20 text-text-primary/20">
                <Bookmark size={48} className="mb-4 opacity-20" />
                <p className="text-sm font-medium">
                  {activeClosetCategory === 'clothing' 
                    ? (language === 'uz' ? "Kiyimlar topilmadi" : "Одежда не найдена")
                    : (language === 'uz' ? "Garderob bo'sh" : "Гардероб пуст")}
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  const renderComments = () => (
    <div className="p-4 space-y-4">
      {[
        { id: 1, shop: 'Terra Pro', text: 'Juda zo\'r kiyim ekan, sifati a\'lo!', date: '25 Mart, 2026', rating: 5 },
        { id: 2, shop: 'Selfie', text: 'Razmeri biroz kichikroq keldi, lekin rangi chiroyli.', date: '20 Mart, 2026', rating: 4 },
        { id: 3, shop: 'Vicco', text: 'Bolalar uchun juda qulay poyabzal.', date: '15 Mart, 2026', rating: 5 }
      ].slice(0, 100).map((comment) => (
        <div key={comment.id} className="p-4 bg-white dark:bg-neutral-800 rounded-2xl border border-border-primary shadow-sm space-y-3">
          <div className="flex justify-between items-start">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-accent-blue/10 rounded-lg flex items-center justify-center text-accent-blue">
                <Store size={16} />
              </div>
              <div>
                <h4 className="text-xs font-black text-text-primary uppercase tracking-tight">{comment.shop}</h4>
                <p className="text-[9px] text-text-primary/40 font-bold uppercase tracking-widest">{comment.date}</p>
              </div>
            </div>
            <div className="flex gap-0.5">
              {[...Array(5)].map((_, i) => (
                <Star 
                  key={i} 
                  size={10} 
                  className={i < comment.rating ? "text-yellow-500 fill-yellow-500" : "text-text-primary/10"} 
                />
              ))}
            </div>
          </div>
          <p className="text-[11px] text-text-primary/70 leading-relaxed font-medium">
            "{comment.text}"
          </p>
          <div className="flex gap-4 pt-2 border-t border-border-primary">
            <button className="text-[9px] font-black text-text-primary/40 uppercase tracking-widest hover:text-accent-blue transition-colors">Tahrirlash</button>
            <button className="text-[9px] font-black text-rose-500/60 uppercase tracking-widest hover:text-rose-500 transition-colors">O'chirish</button>
          </div>
        </div>
      ))}
      {/* Empty state if no comments */}
      {/* <div className="flex flex-col items-center justify-center py-20 text-text-primary/20">
        <MessageSquare size={48} className="mb-4 opacity-20" />
        <p className="text-sm font-medium">{t.no_comments}</p>
      </div> */}
    </div>
  );

  const renderLikedPosts = () => (
    <div className="p-4 grid grid-cols-2 gap-3">
      {likedPosts.slice(0, 100).map((post) => (
        <motion.div
          key={post.id}
          whileTap={{ scale: 0.98 }}
          onClick={() => onOpenPostDetails(post)}
          className="relative aspect-[3/4] rounded-3xl overflow-hidden border border-white/10 group bg-white/5 backdrop-blur-md"
        >
          <img 
            src={post.mediaUrls[0]} 
            alt={post.outfitName}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="absolute top-3 right-3 w-8 h-8 rounded-full bg-rose-500/80 backdrop-blur-md flex items-center justify-center text-white">
            <Heart size={16} className="fill-current" />
          </div>
          <div className="absolute bottom-3 left-3 right-3">
            <p className="text-[10px] font-black text-white uppercase tracking-tight truncate">{post.outfitName}</p>
          </div>
        </motion.div>
      ))}
      {likedPosts.length === 0 && (
        <div className="col-span-2 flex flex-col items-center justify-center py-20 text-text-primary/20">
          <Heart size={48} className="mb-4 opacity-20" />
          <p className="text-sm font-medium">Hali hech qanday post yoqtirilmagan</p>
        </div>
      )}
    </div>
  );

  const renderRecentlyViewed = () => (
    <div className="p-4 grid grid-cols-2 gap-3">
      {recentlyViewedPosts.slice(0, 100).map((post) => (
        <motion.div
          key={post.id}
          whileTap={{ scale: 0.98 }}
          onClick={() => onOpenPostDetails(post)}
          className="relative aspect-[3/4] rounded-3xl overflow-hidden border border-white/10 group bg-white/5 backdrop-blur-md"
        >
          <img 
            src={post.mediaUrls[0]} 
            alt={post.outfitName}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="absolute top-3 right-3 w-8 h-8 rounded-full bg-emerald-500/80 backdrop-blur-md flex items-center justify-center text-white">
            <RefreshCw size={16} />
          </div>
          <div className="absolute bottom-3 left-3 right-3">
            <p className="text-[10px] font-black text-white uppercase tracking-tight truncate">{post.outfitName}</p>
          </div>
        </motion.div>
      ))}
      {recentlyViewedPosts.length === 0 && (
        <div className="col-span-2 flex flex-col items-center justify-center py-20 text-text-primary/20">
          <RefreshCw size={48} className="mb-4 opacity-20" />
          <p className="text-sm font-medium">Hali hech qanday post ko'rilmagan</p>
        </div>
      )}
    </div>
  );

  const renderInfo = () => (
    <div className="p-6 flex flex-col items-center justify-center text-center py-20">
      <div className="w-20 h-20 bg-accent-blue/10 rounded-full flex items-center justify-center text-accent-blue mb-6">
        <Info size={40} />
      </div>
      <h2 className="text-2xl font-black text-text-primary mb-4 uppercase tracking-tight italic">{infoData?.title}</h2>
      <p className="text-sm text-text-primary/60 font-medium leading-relaxed max-w-xs">
        {infoData?.description}
      </p>
    </div>
  );

  return (
    <div className="h-full flex flex-col bg-bg-primary overflow-hidden">
      {/* Sub-view Header */}
      <div className="flex items-center gap-4 px-4 py-4 border-b border-border-primary bg-header-bg">
        {subView !== 'main' && (
          <button 
            onClick={handleBack}
            className="p-1 hover:bg-text-primary/10 rounded-full transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
        )}
        {subView === 'chats' && activeChatSeller ? (
          <div 
            className="flex items-center gap-3 flex-1 cursor-pointer active:opacity-70 transition-opacity"
            onClick={() => onOpenShopProfile(activeChatSeller.id)}
          >
            <div className="relative">
              <img 
                src={activeChatSeller.logo} 
                alt={activeChatSeller.name} 
                className="w-10 h-10 rounded-full object-cover border border-border-primary"
                referrerPolicy="no-referrer"
              />
              <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-header-bg rounded-full" />
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-sm font-black truncate leading-tight uppercase tracking-tighter italic">
                {activeChatSeller.name}
              </h1>
              <p className="text-[10px] font-black text-accent-blue uppercase tracking-widest">
                {isTyping ? "Yozmoqda..." : "Online"}
              </p>
            </div>
          </div>
        ) : (
          <h1 className="text-lg font-black italic tracking-tighter uppercase">
            {subView === 'main' ? t.profile : subView === 'info' ? infoData?.title : subView === 'comments' ? t.my_comments : subView === 'liked-posts' ? t.liked_posts : subView === 'recently-viewed' ? t.recently_viewed : t[subView as keyof typeof t] as string}
          </h1>
        )}
      </div>

      <div className={`flex-1 ${subView === 'chats' && activeChatSeller ? 'overflow-hidden' : 'overflow-y-auto'} scrollbar-hide pb-24`}>
        <AnimatePresence mode="wait">
          <motion.div
            key={subView}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
            className={subView === 'chats' && activeChatSeller ? 'h-full' : ''}
          >
            {subView === 'main' && renderMain()}
            {subView === 'language' && renderLanguage()}
            {subView === 'subscriptions' && renderSubscriptions()}
            {subView === 'chats' && renderChats()}
            {subView === 'saved' && renderSaved()}
            {subView === 'style-dna' && renderStyleDNA()}
            {subView === 'closet' && renderCloset()}
            {subView === 'comments' && renderComments()}
            {subView === 'liked-posts' && renderLikedPosts()}
            {subView === 'recently-viewed' && renderRecentlyViewed()}
            {subView === 'info' && renderInfo()}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};

interface MenuButtonProps {
  icon: any;
  label: string;
  value?: string;
  onClick: () => void;
}

const MenuButton: React.FC<MenuButtonProps> = ({ icon: Icon, label, value, onClick }) => (
  <button 
    onClick={onClick}
    className="flex items-center justify-between p-4 bg-text-primary/5 hover:bg-text-primary/10 rounded-xl border border-text-primary/10 transition-all active:scale-[0.98]"
  >
    <div className="flex items-center gap-3">
      <div className="p-2 bg-gradient-to-br from-accent-blue/10 to-accent-light/10 rounded-lg text-accent-blue border border-accent-blue/20">
        <Icon size={18} strokeWidth={1.5} />
      </div>
      <span className="font-bold text-sm">{label}</span>
    </div>
    <div className="flex items-center gap-2">
      {value && <span className="text-xs text-text-primary/40 font-medium">{value}</span>}
      <ChevronRight size={16} strokeWidth={1.5} className="text-text-primary/20" />
    </div>
  </button>
);

export default Profile;

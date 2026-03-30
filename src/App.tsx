import React, { useState } from 'react';
import Feed from './components/Feed';
import Brands from './components/Brands';
import SearchAI from './components/SearchAI';
import LiveMap from './components/LiveMap';
import BottomNav from './components/BottomNav';
import Profile, { SubView } from './components/Profile';
import AdminPanel from './components/AdminPanel';
import ShopWorkspace from './components/ShopWorkspace';
import ShopProfile from './components/ShopProfile';
import StoryViewer from './components/StoryViewer';
import ReelsViewer from './components/ReelsViewer';
import LiveStreamViewer from './components/LiveStreamViewer';
import CommentDrawer from './components/CommentDrawer';
import ProductDetails from './components/ProductDetails';
import SplashScreen from './components/SplashScreen';
import CreateShopModal from './components/CreateShopModal';
import ShopConstruction from './components/ShopConstruction';
import { motion, AnimatePresence } from 'motion/react';
import { Search, Sparkles, Store, ArrowLeftRight, Tag, Mail, X, Send } from 'lucide-react';
import { MOCK_POSTS, MOCK_STORIES, MOCK_SELLERS } from './constants';
import { Language, translations } from './translations';
import { Seller, Story, AIMessage, SellerCategory, PostData, User } from './types';
import { Toaster, toast } from 'sonner';
import { 
  auth, 
  onSnapshot, 
  doc, 
  db, 
  signInWithGoogle, 
  logout, 
  setDoc, 
  updateDoc, 
  getDoc, 
  deleteDoc, 
  collection, 
  query, 
  where, 
  orderBy, 
  limit, 
  storage, 
  ref, 
  uploadBytes, 
  getDownloadURL,
  handleFirestoreError,
  OperationType
} from './firebase';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [posts, setPosts] = useState(MOCK_POSTS);
  const [stories, setStories] = useState(MOCK_STORIES);
  const [sellers, setSellers] = useState(MOCK_SELLERS);
  const [obrazlar, setObrazlar] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('Home');
  const [isSearchActive, setIsSearchActive] = useState(false);
  const [language, setLanguage] = useState<Language>('uz');
  const [activeStoryIndex, setActiveStoryIndex] = useState<number | null>(null);
  const [activeStoryList, setActiveStoryList] = useState<any[]>([]);
  const [activeReelIndex, setActiveReelIndex] = useState<number | null>(null);
  const [activeReelList, setActiveReelList] = useState<any[]>([]);
  const [selectedShopId, setSelectedShopId] = useState<string | null>(null);
  const [activeLiveStream, setActiveLiveStream] = useState<Story | null>(null);
  const [initialChatSellerId, setInitialChatSellerId] = useState<string | null>(null);
  const [initialChatProduct, setInitialChatProduct] = useState<PostData | null>(null);
  const [sharingPost, setSharingPost] = useState<PostData | null>(null);
  const [unreadMessages, setUnreadMessages] = useState(5); // Changed from 3 to 5 to show it's "real"
  const [profileSubView, setProfileSubView] = useState<SubView>('main');
  const [selectedPostForDetails, setSelectedPostForDetails] = useState<any | null>(null);
  const [selectedPostForComments, setSelectedPostForComments] = useState<any | null>(null);
  const [aiMessages, setAiMessages] = useState<AIMessage[]>([]);
  const [aiFoundPosts, setAiFoundPosts] = useState<any[]>([]);
  const [aiFoundObrazlar, setAiFoundObrazlar] = useState<any[]>([]);
  const [showSplash, setShowSplash] = useState(true);
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [globalMuted, setGlobalMuted] = useState(false);
  const [userLikes, setUserLikes] = useState<Set<string>>(new Set());
  const [userSaves, setUserSaves] = useState<Set<string>>(new Set());
  const [userSubscriptions, setUserSubscriptions] = useState<Set<string>>(new Set());
  
  // Firestore Real-time Listeners
  React.useEffect(() => {
    const unsubSellers = onSnapshot(collection(db, 'shops'), (snapshot) => {
      const sellersData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Seller));
      if (sellersData.length > 0) setSellers(sellersData);
    }, (error) => handleFirestoreError(error, OperationType.GET, 'shops'));

    const unsubPosts = onSnapshot(collection(db, 'posts'), (snapshot) => {
      const postsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PostData));
      if (postsData.length > 0) setPosts(postsData);
    }, (error) => handleFirestoreError(error, OperationType.GET, 'posts'));

    const unsubStories = onSnapshot(collection(db, 'stories'), (snapshot) => {
      const storiesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Story));
      if (storiesData.length > 0) setStories(storiesData);
    }, (error) => handleFirestoreError(error, OperationType.GET, 'stories'));

    return () => {
      unsubSellers();
      unsubPosts();
      unsubStories();
    };
  }, []);

  // User-specific data listeners
  React.useEffect(() => {
    if (!user) {
      setUserLikes(new Set());
      setUserSaves(new Set());
      setUserSubscriptions(new Set());
      return;
    }

    const unsubLikes = onSnapshot(query(collection(db, 'likes'), where('uid', '==', user.uid)), (snapshot) => {
      setUserLikes(new Set(snapshot.docs.map(doc => doc.data().postId)));
    }, (error) => handleFirestoreError(error, OperationType.GET, 'likes'));

    const unsubSaves = onSnapshot(query(collection(db, 'saved_items'), where('uid', '==', user.uid)), (snapshot) => {
      setUserSaves(new Set(snapshot.docs.map(doc => doc.data().postId)));
    }, (error) => handleFirestoreError(error, OperationType.GET, 'saved_items'));

    // Subscriptions logic (if we had a collection for it)
    // For now, let's assume it's in a 'subscriptions' collection
    const unsubSubs = onSnapshot(query(collection(db, 'subscriptions'), where('uid', '==', user.uid)), (snapshot) => {
      setUserSubscriptions(new Set(snapshot.docs.map(doc => doc.data().sellerId)));
    }, (error) => handleFirestoreError(error, OperationType.GET, 'subscriptions'));

    // User's Shop Listener
    const unsubUserShop = onSnapshot(query(collection(db, 'shops'), where('ownerUid', '==', user.uid)), (snapshot) => {
      if (!snapshot.empty) {
        const shopData = { id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as Seller;
        setUserShop(shopData);
        setHasShop(true);
      } else {
        setUserShop(null);
        setHasShop(false);
      }
    }, (error) => handleFirestoreError(error, OperationType.GET, 'shops'));

    return () => {
      unsubLikes();
      unsubSaves();
      unsubSubs();
      unsubUserShop();
    };
  }, [user]);

  // Merge user-specific data into posts/stories
  const postsWithUserStatus = React.useMemo(() => {
    return posts.map(post => ({
      ...post,
      isLiked: userLikes.has(post.id),
      isSaved: userSaves.has(post.id),
      seller: {
        ...post.seller,
        isSubscribed: userSubscriptions.has(post.seller.id)
      }
    }));
  }, [posts, userLikes, userSaves, userSubscriptions]);

  const storiesWithUserStatus = React.useMemo(() => {
    return stories.map(story => ({
      ...story,
      isLiked: userLikes.has(story.id),
      seller: {
        ...story.seller,
        isSubscribed: userSubscriptions.has(story.seller.id)
      }
    }));
  }, [stories, userLikes, userSubscriptions]);

  const sellersWithUserStatus = React.useMemo(() => {
    return sellers.map(seller => ({
      ...seller,
      isSubscribed: userSubscriptions.has(seller.id)
    }));
  }, [sellers, userSubscriptions]);

  // Shop Creation State
  const [isCreatingShop, setIsCreatingShop] = useState(false);
  const [isConstructingShop, setIsConstructingShop] = useState(false);
  const [constructionProgress, setConstructionProgress] = useState(0);
  const [newShopData, setNewShopData] = useState<{name: string, logoFile: File | null, logoPreview: string | null, workingDays: string[], categories: SellerCategory[], location: { lat: number, lng: number }} | null>(null);

  // Firebase Auth Listener
  React.useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (firebaseUser) => {
      if (firebaseUser) {
        // Check if user exists in Firestore
        const userDoc = doc(db, 'users', firebaseUser.uid);
        // Using onSnapshot for real-time user data
        const unsubUser = onSnapshot(userDoc, (docSnap) => {
          if (docSnap.exists()) {
            setUser(docSnap.data() as User);
          } else {
            // Create new user profile if it doesn't exist
            const isAdminEmail = firebaseUser.email === "azizbekbakirov39@gmail.com" || firebaseUser.email === "azizbekbakirov990@gmail.com";
            const newUser: User = {
              uid: firebaseUser.uid,
              email: firebaseUser.email,
              displayName: firebaseUser.displayName,
              photoURL: firebaseUser.photoURL,
              role: isAdminEmail ? 'admin' : 'buyer',
              hasShop: false,
              adminAccessEnabled: isAdminEmail // Enable access for admin emails by default
            };
            setDoc(userDoc, newUser).catch(err => handleFirestoreError(err, OperationType.WRITE, `users/${firebaseUser.uid}`));
            setUser(newUser);
          }
          setLoading(false);
        }, (error) => handleFirestoreError(error, OperationType.GET, `users/${firebaseUser.uid}`));
        return () => unsubUser();
      } else {
        setUser(null);
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, []);

  // History tracking to prevent double pushes
  const isPoppingState = React.useRef(false);

  const handleSearchActive = (active: boolean) => {
    if (active) {
      setIsSearchActive(true);
      window.history.pushState({ 
        type: 'search', 
        workspace, 
        activeTab, 
        profileSubView 
      }, '');
    } else {
      if (window.history.state?.type === 'search') {
        window.history.back();
      } else {
        setIsSearchActive(false);
      }
    }
  };

  // Workspace State
  const [workspace, setWorkspace] = useState<'Marketplace' | 'Shop'>('Marketplace');
  const [hasShop, setHasShop] = useState(false);
  const [userShop, setUserShop] = useState<Seller | null>(null);

  // Shop Workspace Internal Navigation (Lifted for history management)
  const [shopWorkspaceTab, setShopWorkspaceTab] = useState('MyShop');
  const [shopWorkspaceChatId, setShopWorkspaceChatId] = useState<string | null>(null);

  const t = translations[language];

  const handleLogin = async () => {
    try {
      await signInWithGoogle();
    } catch (error) {
      console.error("Login failed", error);
    }
  };

  const handleWorkspaceChange = (newWorkspace: 'Marketplace' | 'Shop') => {
    if (newWorkspace === workspace) return;
    if (newWorkspace === 'Shop' && !user) {
      setActiveTab('Profile');
      return;
    }
    setWorkspace(newWorkspace);
    window.history.pushState({ 
      type: 'workspace', 
      workspace: newWorkspace,
      activeTab: newWorkspace === 'Marketplace' ? activeTab : 'MyShop',
      profileSubView: newWorkspace === 'Marketplace' ? profileSubView : 'main'
    }, '');
  };

  const handleOpenShop = () => {
    setIsCreatingShop(true);
    window.history.pushState({ 
      type: 'createShop', 
      workspace, 
      activeTab, 
      profileSubView 
    }, '');
  };

  const handleCreateShopSubmit = (name: string, logoFile: File | null, workingDays: string[], categories: SellerCategory[], location: { lat: number, lng: number }) => {
    // Create a preview for the construction screen
    let logoPreview = null;
    if (logoFile) {
      logoPreview = URL.createObjectURL(logoFile);
    }
    setNewShopData({ name, logoFile, logoPreview, workingDays, categories, location });
    setIsCreatingShop(false);
    // If we're in the createShop state, go back
    if (window.history.state?.type === 'createShop') {
      window.history.back();
    }
    setIsConstructingShop(true);
    setConstructionProgress(0);
  };

  // Construction Progress Effect
  React.useEffect(() => {
    if (isConstructingShop && newShopData && user) {
      const interval = setInterval(() => {
        setConstructionProgress(prev => {
          if (prev >= 100) {
            clearInterval(interval);
            
            const finishConstruction = async () => {
              try {
                let logoUrl = '';
                if (newShopData.logoFile) {
                  const storageRef = ref(storage, `shops/${user.uid}/logo_${Date.now()}`);
                  await uploadBytes(storageRef, newShopData.logoFile);
                  logoUrl = await getDownloadURL(storageRef);
                }

                const shopId = `shop_${user.uid}`;
                const newShop: Seller = {
                  id: shopId,
                  name: newShopData.name,
                  logo: logoUrl,
                  workingDays: newShopData.workingDays,
                  categories: newShopData.categories,
                  hasStory: false,
                  followers: 0,
                  description: 'Mening shaxsiy do\'konim tavsifi bu yerda bo\'ladi.',
                  location: newShopData.location,
                  ownerUid: user.uid
                };

                await setDoc(doc(db, 'shops', shopId), newShop);
                await updateDoc(doc(db, 'users', user.uid), { hasShop: true, shopId });
                
                setIsConstructingShop(false);
                setWorkspace('Shop');
              } catch (error) {
                handleFirestoreError(error, OperationType.WRITE, `shops/shop_${user.uid}`);
                toast.error("Do'kon yaratishda xatolik yuz berdi");
                setIsConstructingShop(false);
              }
            };

            finishConstruction();
            return 100;
          }
          return prev + (Math.random() * 5);
        });
      }, 150);
      return () => clearInterval(interval);
    }
  }, [isConstructingShop, newShopData, user]);

  const subscribedSellers = sellers.filter(s => s.isSubscribed);
  const savedPosts = posts.filter(p => p.isSaved);
  const savedObrazlar = obrazlar.filter(o => o.isSaved);
  const [recentlyViewedPosts, setRecentlyViewedPosts] = React.useState<PostData[]>([]);

  const filteredPosts = postsWithUserStatus.filter(post => 
    post.seller.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    post.outfitName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    post.items.some(item => item.name.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const toggleLike = React.useCallback(async (id: string) => {
    if (!user) {
      setActiveTab('Profile');
      return;
    }

    const isStory = id.startsWith('st');
    const collectionName = isStory ? 'stories' : 'posts';
    const docRef = doc(db, collectionName, id);

    // Optimistic UI update
    if (isStory) {
      setStories(prev => prev.map(s => s.id === id ? { ...s, isLiked: !s.isLiked, likes: s.isLiked ? s.likes - 1 : s.likes + 1 } : s));
    } else {
      setPosts(prev => prev.map(p => p.id === id ? { ...p, isLiked: !p.isLiked, likes: p.isLiked ? p.likes - 1 : p.likes + 1 } : p));
    }

    try {
      // In a real app, we'd have a 'likes' subcollection or a separate collection
      // For simplicity, we'll just update the count and a local 'isLiked' if we had a way to track it per user
      // But since we want "real", let's use a 'likes' collection
      const likeId = `${user.uid}_${id}`;
      const likeRef = doc(db, 'likes', likeId);
      const likeDoc = await getDoc(likeRef);

      if (likeDoc.exists()) {
        await deleteDoc(likeRef);
        const currentDoc = await getDoc(docRef);
        await updateDoc(docRef, { likes: Math.max(0, (currentDoc.data()?.likes || 0) - 1) });
      } else {
        await setDoc(likeRef, { uid: user.uid, postId: id, createdAt: new Date().toISOString() });
        const currentDoc = await getDoc(docRef);
        await updateDoc(docRef, { likes: (currentDoc.data()?.likes || 0) + 1 });
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `likes/${user.uid}_${id}`);
    }
  }, [user]);

  const toggleSave = React.useCallback(async (postId: string) => {
    if (!user) {
      setActiveTab('Profile');
      return;
    }

    const saveId = `${user.uid}_${postId}`;
    const saveRef = doc(db, 'saved_items', saveId);
    
    // Optimistic UI
    setPosts(prev => prev.map(p => p.id === postId ? { ...p, isSaved: !p.isSaved } : p));

    try {
      const saveDoc = await getDoc(saveRef);
      if (saveDoc.exists()) {
        await deleteDoc(saveRef);
      } else {
        await setDoc(saveRef, { uid: user.uid, postId, createdAt: new Date().toISOString() });
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `saved_items/${user.uid}_${postId}`);
    }
  }, [user]);

  const toggleSubscribe = React.useCallback(async (sellerId: string) => {
    if (!user) {
      setActiveTab('Profile');
      return;
    }

    const subId = `${user.uid}_${sellerId}`;
    const subRef = doc(db, 'subscriptions', subId);

    try {
      const subDoc = await getDoc(subRef);
      if (subDoc.exists()) {
        await deleteDoc(subRef);
      } else {
        await setDoc(subRef, { uid: user.uid, sellerId, createdAt: new Date().toISOString() });
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `subscriptions/${user.uid}_${sellerId}`);
    }
  }, [user]);

  const markStoryViewed = React.useCallback((storyId: string) => {
    setStories(prev => {
      const story = prev.find(s => s.id === storyId);
      if (story?.isViewed) return prev;
      return prev.map(s => 
        s.id === storyId ? { ...s, isViewed: true } : s
      );
    });
    // Sync with active story list if open
    setActiveStoryList(prev => prev.map(s =>
      s.id === storyId ? { ...s, isViewed: true } : s
    ));
  }, []);

  const openStories = React.useCallback((storiesList: any[], index: number) => {
    setActiveStoryList(storiesList);
    setActiveStoryIndex(index);
    if (workspace === 'Marketplace') {
      window.history.pushState({ 
        type: 'story', 
        list: storiesList, 
        index,
        workspace,
        activeTab,
        profileSubView
      }, '');
    }
  }, [workspace, activeTab, profileSubView]);

  const openReels = React.useCallback((reelsList: any[], index: number) => {
    setActiveReelList(reelsList);
    setActiveReelIndex(index);
    if (workspace === 'Marketplace') {
      window.history.pushState({ 
        type: 'reel', 
        list: reelsList, 
        index,
        workspace,
        activeTab,
        profileSubView
      }, '');
    }
  }, [workspace, activeTab, profileSubView]);

  const openShopProfile = React.useCallback((shopId: string) => {
    setSelectedShopId(shopId);
    if (workspace === 'Marketplace') {
      window.history.pushState({ 
        type: 'shop', 
        shopId,
        workspace,
        activeTab,
        profileSubView
      }, '');
    }
  }, [workspace, activeTab, profileSubView]);

  const openPostDetails = React.useCallback((post: any) => {
    setSelectedPostForDetails(post);
    setRecentlyViewedPosts(prev => {
      const filtered = prev.filter(p => p.id !== post.id);
      return [post, ...filtered].slice(0, 100);
    });
    if (workspace === 'Marketplace') {
      window.history.pushState({ 
        type: 'details', 
        post,
        workspace,
        activeTab,
        profileSubView,
        selectedShopId // Capture if we opened from a shop profile
      }, '');
    }
  }, [workspace, activeTab, profileSubView, selectedShopId]);

  const openPostComments = React.useCallback((post: any) => {
    setSelectedPostForComments(post);
    if (workspace === 'Marketplace') {
      window.history.pushState({ 
        type: 'comments', 
        post,
        workspace,
        activeTab,
        profileSubView,
        selectedShopId
      }, '');
    }
  }, [workspace, activeTab, profileSubView, selectedShopId]);

  const closeStories = React.useCallback(() => {
    setActiveStoryIndex(null);
    if (!isPoppingState.current && workspace === 'Marketplace') {
      window.history.back();
    }
  }, [workspace]);

  const closeReels = React.useCallback(() => {
    setActiveReelIndex(null);
    if (!isPoppingState.current && workspace === 'Marketplace') {
      window.history.back();
    }
  }, [workspace]);

  const closeShopProfile = React.useCallback(() => {
    setSelectedShopId(null);
    if (!isPoppingState.current && workspace === 'Marketplace') {
      window.history.back();
    }
  }, [workspace]);

  const handleOpenChat = React.useCallback((sellerId: string, product?: PostData) => {
    setInitialChatSellerId(sellerId);
    setInitialChatProduct(product || null);
    setProfileSubView('chats');
    setActiveTab('Profile');
    setSelectedShopId(null); // Close shop profile
    setSelectedPostForDetails(null); // Close product details
    if (workspace === 'Marketplace') {
      window.history.pushState({ 
        type: 'profileSubView', 
        subView: 'chats', 
        initialChatSellerId: sellerId, 
        initialChatProduct: product,
        workspace,
        activeTab: 'Profile'
      }, '');
    }
  }, [workspace]);

  const handleOpenLive = (story: Story) => {
    setActiveLiveStream(story);
    if (workspace === 'Marketplace') {
      window.history.pushState({ 
        type: 'live', 
        story,
        workspace,
        activeTab,
        profileSubView
      }, '');
    }
  };

  const closeLiveStream = React.useCallback(() => {
    setActiveLiveStream(null);
    if (!isPoppingState.current && workspace === 'Marketplace') {
      window.history.back();
    }
  }, [workspace]);

  const handleSharePost = (post: PostData) => {
    setSharingPost(post);
    if (workspace === 'Marketplace') {
      window.history.pushState({ 
        type: 'share', 
        post,
        workspace,
        activeTab,
        profileSubView
      }, '');
    }
  };

  const closeShare = React.useCallback(() => {
    setSharingPost(null);
    if (!isPoppingState.current && workspace === 'Marketplace') {
      window.history.back();
    }
  }, [workspace]);

  const handleConfirmShare = (sellerId: string) => {
    if (!sharingPost) return;
    handleOpenChat(sellerId, sharingPost);
    setSharingPost(null);
  };

  const closePostDetails = React.useCallback(() => {
    setSelectedPostForDetails(null);
    if (!isPoppingState.current && workspace === 'Marketplace') {
      window.history.back();
    }
  }, [workspace]);

  const closePostComments = React.useCallback(() => {
    setSelectedPostForComments(null);
    if (!isPoppingState.current && workspace === 'Marketplace') {
      window.history.back();
    }
  }, [workspace]);

  const handleProfileSubViewChange = React.useCallback((subView: SubView) => {
    setProfileSubView(subView);
    if (workspace === 'Marketplace' && subView !== 'main') {
      window.history.pushState({ 
        type: 'profileSubView', 
        subView,
        workspace,
        activeTab: 'Profile'
      }, '');
    }
  }, [workspace]);

  // handleTryOn removed to focus on chat and search accuracy
  
  // Handle Tab Change with History
  const handleTabChange = React.useCallback((tab: string) => {
    if (tab === activeTab) return;
    
    if (workspace === 'Marketplace') {
      window.history.pushState({ 
        type: 'tab', 
        tab,
        workspace,
        profileSubView: 'main'
      }, '');
    }
    
    // Reset profile subview when leaving profile tab
    if (activeTab === 'Profile' && tab !== 'Profile') {
      setProfileSubView('main');
    }
    
    setActiveTab(tab);
  }, [activeTab, workspace, profileSubView]);

  const handleRefresh = React.useCallback(() => {
    // Shuffle posts to simulate refresh
    setPosts(prev => [...prev].sort(() => Math.random() - 0.5));
    // Also shuffle stories
    setStories(prev => [...prev].sort(() => Math.random() - 0.5));
  }, []);

  const handleBrandsRefresh = React.useCallback(() => {
    // Sort sellers: subscribed first, then by followers count
    setSellers(prev => [...prev].sort((a, b) => {
      if (a.isSubscribed && !b.isSubscribed) return -1;
      if (!a.isSubscribed && b.isSubscribed) return 1;
      return b.followers - a.followers;
    }));
    // Also shuffle stories to match
    setStories(prev => [...prev].sort(() => Math.random() - 0.5));
  }, []);

  // Back Button Logic
  React.useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      isPoppingState.current = true;
      const state = event.state;

      // If no state and on Home tab of Marketplace, refresh
      if (!state && 
          workspace === 'Marketplace' &&
          activeTab === 'Home' && 
          activeStoryIndex === null && 
          activeReelIndex === null && 
          selectedPostForDetails === null && 
          selectedPostForComments === null && 
          selectedShopId === null) {
        handleRefresh();
        const feedElement = document.querySelector('.overflow-y-auto');
        if (feedElement) {
          feedElement.scrollTo({ top: 0, behavior: 'smooth' });
        }
        isPoppingState.current = false;
        return;
      }

      // Reset all viewers first
      setActiveStoryIndex(null);
      setActiveReelIndex(null);
      setSelectedPostForDetails(null);
      setSelectedPostForComments(null);
      setSelectedShopId(null);
      setProfileSubView('main');
      setIsCreatingShop(false);
      setIsSearchActive(false);
      setActiveLiveStream(null);
      setSharingPost(null);
      setInitialChatSellerId(null);
      setInitialChatProduct(null);

      if (state) {
        // Restore workspace if it changed
        if (state.workspace && state.workspace !== workspace) {
          setWorkspace(state.workspace);
        }

        // Restore Marketplace Tab/SubView if present
        if (state.activeTab) setActiveTab(state.activeTab);
        if (state.profileSubView) setProfileSubView(state.profileSubView);

        switch (state.type) {
          case 'workspace':
            // Already handled above
            break;
          case 'search':
            setIsSearchActive(true);
            break;
          case 'createShop':
            setIsCreatingShop(true);
            break;
          case 'story':
            setActiveStoryList(state.list);
            setActiveStoryIndex(state.index);
            break;
          case 'reel':
            setActiveReelList(state.list);
            setActiveReelIndex(state.index);
            break;
          case 'shop':
            setSelectedShopId(state.shopId);
            break;
          case 'details':
            setSelectedPostForDetails(state.post);
            if (state.selectedShopId) setSelectedShopId(state.selectedShopId);
            break;
          case 'comments':
            setSelectedPostForComments(state.post);
            if (state.selectedShopId) setSelectedShopId(state.selectedShopId);
            break;
          case 'live':
            setActiveLiveStream(state.story);
            break;
          case 'share':
            setSharingPost(state.post);
            break;
          case 'profileChat':
        setActiveTab('Profile');
        setProfileSubView('chats');
        setInitialChatSellerId(state.sellerId);
        setInitialChatProduct(state.product || null);
        break;
      case 'profileSubView':
            setActiveTab('Profile');
            setProfileSubView(state.subView);
            if (state.initialChatSellerId) {
              setInitialChatSellerId(state.initialChatSellerId);
              setInitialChatProduct(state.initialChatProduct || null);
            }
            break;
          case 'tab':
            setActiveTab(state.tab);
            break;
          case 'shopWorkspaceTab':
            setWorkspace('Shop');
            setShopWorkspaceTab(state.tab);
            break;
          case 'shopWorkspaceChat':
            setWorkspace('Shop');
            setShopWorkspaceTab('Messages');
            setShopWorkspaceChatId(state.chatId);
            break;
          default:
            // Default to Home if unknown
            if (state.workspace === 'Marketplace') setActiveTab('Home');
        }
      } else {
        // Initial state
        setWorkspace('Marketplace');
        setActiveTab('Home');
        setProfileSubView('main');
        setIsCreatingShop(false);
      }
      
      setTimeout(() => {
        isPoppingState.current = false;
      }, 100);
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [workspace, activeStoryIndex, activeReelIndex, selectedShopId, activeTab, profileSubView]);

  const selectedSeller = sellers.find(s => s.id === selectedShopId);
  const sellerPosts = posts.filter(p => p.seller.id === selectedShopId);

  return (
    <div className="h-[100lvh] w-full bg-bg-primary text-text-primary font-sans selection:bg-accent-blue/30 overflow-hidden">
      <Toaster position="top-center" richColors />
      {/* Modals and Overlays */}
      <CreateShopModal 
        isOpen={isCreatingShop} 
        language={language}
        onClose={() => {
          if (window.history.state?.type === 'createShop') {
            window.history.back();
          } else {
            setIsCreatingShop(false);
          }
        }} 
        onSubmit={handleCreateShopSubmit} 
      />

      <AnimatePresence>
        {isConstructingShop && newShopData && (
          <ShopConstruction 
            progress={constructionProgress} 
            shopName={newShopData.name} 
            shopLogo={newShopData.logoPreview} 
          />
        )}
      </AnimatePresence>

      {/* Share Overlay */}
      <AnimatePresence>
        {sharingPost && (
          <div className="fixed inset-0 z-[20000] flex items-end justify-center bg-black/60 backdrop-blur-sm p-4">
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              className="w-full max-w-md bg-bg-primary rounded-t-[2.5rem] overflow-hidden shadow-2xl border border-border-primary"
            >
              <div className="p-6 border-b border-border-primary flex items-center justify-between">
                <h3 className="text-lg font-black uppercase tracking-widest text-text-primary">Yuborish</h3>
                <button onClick={closeShare} className="p-2 hover:bg-text-primary/10 rounded-full">
                  <X size={24} />
                </button>
              </div>
              <div className="max-h-[60vh] overflow-y-auto p-4 space-y-2">
                <p className="px-2 text-[10px] font-black uppercase tracking-widest text-text-secondary mb-2">Chatlar</p>
                {MOCK_SELLERS.map(seller => (
                  <button
                    key={seller.id}
                    onClick={() => handleConfirmShare(seller.id)}
                    className="w-full p-3 flex items-center gap-4 hover:bg-text-primary/5 rounded-2xl transition-all active:scale-[0.98]"
                  >
                    <img src={seller.logo} className="w-12 h-12 rounded-full object-cover" referrerPolicy="no-referrer" />
                    <div className="flex-1 text-left">
                      <p className="font-black text-text-primary">{seller.name}</p>
                      <p className="text-xs text-text-secondary">Oxirgi xabar...</p>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-accent-blue/10 flex items-center justify-center text-accent-blue">
                      <Mail size={18} />
                    </div>
                  </button>
                ))}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showSplash ? (
          <SplashScreen key="splash" onComplete={() => setShowSplash(false)} />
        ) : (
          <motion.div 
            key="main-content"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="relative h-full w-full flex flex-col overflow-hidden"
          >
            {/* Workspace Switcher Button - Floating Badge */}
            {hasShop && (
              <motion.div
                initial={{ x: workspace === 'Marketplace' ? 100 : -100, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                className={`fixed top-[72px] z-[60] ${workspace === 'Marketplace' ? 'right-0' : 'left-0'}`}
              >
                <motion.button
                  onClick={() => handleWorkspaceChange(workspace === 'Marketplace' ? 'Shop' : 'Marketplace')}
                  animate={{ 
                    x: workspace === 'Marketplace' ? [0, -5, 0] : [0, 5, 0],
                  }}
                  transition={{ 
                    duration: 4, 
                    repeat: Infinity, 
                    ease: "easeInOut" 
                  }}
                  whileTap={{ scale: 0.95 }}
                  className={`flex items-center gap-2 py-2 px-4 bg-gradient-to-r from-accent-blue to-accent-light text-white shadow-lg shadow-accent-blue/40 border border-white/20 active:scale-95 transition-all ${
                    workspace === 'Marketplace' 
                      ? 'rounded-l-2xl border-r-0' 
                      : 'rounded-r-2xl border-l-0'
                  }`}
                >
                  <ArrowLeftRight size={16} className="text-white" />
                  <span className="text-[10px] font-black uppercase tracking-widest">Almashish</span>
                </motion.button>
              </motion.div>
            )}

            {/* Instagram Style Header */}
            <header className="flex items-center justify-between px-4 py-3 border-b border-border-primary bg-header-bg z-50">
              <div className="flex items-center justify-between w-full relative">
                {/* Left Side */}
                <div className="flex items-center gap-4">
                  <div className="bg-gradient-to-br from-accent-blue to-accent-light w-14 h-14 rounded-2xl flex flex-col items-center justify-center shadow-lg shadow-accent-blue/20 border border-white/10">
                    <Tag size={26} className="text-white mb-0.5" />
                    <h1 className="text-[10px] font-cursive font-bold italic text-white leading-none">
                      AlphaSpace
                    </h1>
                  </div>
                </div>

                {/* Middle Branding Text - Instagram Style */}
                <div className="absolute left-1/2 -translate-x-1/2 pointer-events-none">
                  <h1 className="text-4xl font-cursive font-bold italic bg-gradient-to-br from-accent-blue to-accent-light bg-clip-text text-transparent tracking-tight">
                    AlphaSpace
                  </h1>
                </div>

                {/* Right Side */}
                <div className="flex items-center gap-4">
                  {workspace === 'Marketplace' && (
                    <>
                      <button 
                        onClick={() => {
                          // Open messages with history
                          setActiveTab('Profile');
                          setProfileSubView('chats');
                          setUnreadMessages(0);
                          window.history.pushState({ 
                            type: 'profileSubView', 
                            subView: 'chats',
                            workspace,
                            activeTab: 'Profile'
                          }, '');
                        }}
                        className="relative flex flex-col items-center gap-0.5 p-1 hover:bg-accent-blue/5 rounded-xl transition-all active:scale-95"
                      >
                        <Mail size={24} strokeWidth={1.5} className="text-accent-blue" />
                        <span className="text-[8px] font-bold text-accent-blue uppercase tracking-widest">Xabarlar</span>
                        {unreadMessages > 0 && (
                          <motion.div 
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-red-500 text-white text-[10px] font-black rounded-full flex items-center justify-center border-2 border-header-bg shadow-lg"
                          >
                            {unreadMessages > 99 ? '99+' : unreadMessages}
                          </motion.div>
                        )}
                      </button>
                    </>
                  )}
                </div>
              </div>
            </header>

            {/* Main Content Container */}
            <main className="flex-1 overflow-hidden">
              <AnimatePresence mode="wait">
                {workspace === 'Shop' && userShop ? (
                  <motion.div
                    key="shop-workspace"
                    initial={{ opacity: 0, scale: 1.05 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="h-full"
                  >
                    <ShopWorkspace 
                      language={language} 
                      shopData={userShop} 
                      user={user}
                      onBackToMarketplace={() => handleWorkspaceChange('Marketplace')} 
                      onUpdateShop={(updatedShop) => {
                        setUserShop(updatedShop);
                        setSellers(prev => prev.map(s => s.id === updatedShop.id ? updatedShop : s));
                      }}
                      activeTab={shopWorkspaceTab}
                      setActiveTab={setShopWorkspaceTab}
                      activeChatId={shopWorkspaceChatId}
                      setActiveChatId={setShopWorkspaceChatId}
                    />
                  </motion.div>
                ) : activeTab === 'Home' ? (
                  <motion.div
                    key="feed"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    className="h-full"
                  >
                    <Feed 
                      posts={filteredPosts} 
                      stories={storiesWithUserStatus}
                      onToggleLike={toggleLike}
                      onToggleSave={toggleSave}
                      onToggleSubscribe={toggleSubscribe}
                      onMarkStoryViewed={markStoryViewed}
                      onOpenStories={openStories}
                      onOpenLive={handleOpenLive}
                      onOpenReels={openReels}
                      onOpenShopProfile={openShopProfile}
                      onOpenPostDetails={openPostDetails}
                      onOpenPostComments={openPostComments}
                      onSharePost={handleSharePost}
                      onRefresh={handleRefresh}
                      language={language}
                      searchQuery={searchQuery}
                      setSearchQuery={setSearchQuery}
                      onSearchActive={handleSearchActive}
                      isSearchActive={isSearchActive}
                      globalMuted={globalMuted}
                      setGlobalMuted={setGlobalMuted}
                    />
                  </motion.div>
                ) : activeTab === 'Brands' ? (
                  <motion.div
                    key="brands-tab"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 20 }}
                    className="h-full"
                  >
                    <Brands 
                      language={language} 
                      stories={storiesWithUserStatus} 
                      sellers={sellersWithUserStatus}
                      posts={postsWithUserStatus}
                      onToggleSubscribe={toggleSubscribe}
                      onMarkStoryViewed={markStoryViewed}
                      onOpenStories={openStories}
                      onOpenLive={handleOpenLive}
                      onOpenShopProfile={openShopProfile}
                      onRefresh={handleBrandsRefresh}
                      searchQuery={searchQuery}
                      setSearchQuery={setSearchQuery}
                      onSearchActive={handleSearchActive}
                      isSearchActive={isSearchActive}
                    />
                  </motion.div>
                ) : activeTab === 'Search' ? (
                  <motion.div
                    key="search-ai"
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.98 }}
                    className="h-full"
                  >
                    <SearchAI 
                      language={language} 
                      messages={aiMessages}
                      setMessages={setAiMessages}
                      foundPosts={aiFoundPosts}
                      setFoundPosts={setAiFoundPosts}
                      foundObrazlar={aiFoundObrazlar}
                      setFoundObrazlar={setAiFoundObrazlar}
                      onOpenPostDetails={openPostDetails}
                      globalMuted={globalMuted}
                      setGlobalMuted={setGlobalMuted}
                    />
                  </motion.div>
                ) : activeTab === 'Live' ? (
                  <motion.div
                    key="live-map"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 20 }}
                    className="h-full"
                  >
                    <LiveMap 
                      language={language} 
                      onOpenShopProfile={openShopProfile} 
                      onSearchActive={handleSearchActive}
                      isSearchActive={isSearchActive}
                    />
                  </motion.div>
                ) : activeTab === 'Profile' ? (
                  <motion.div
                    key="profile-tab"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="h-full"
                  >
                    <Profile 
                      language={language} 
                      setLanguage={setLanguage} 
                      savedPosts={postsWithUserStatus.filter(p => p.isSaved)}
                      subscribedSellers={sellersWithUserStatus.filter(s => s.isSubscribed)}
                      onToggleLike={toggleLike}
                      onToggleSave={toggleSave}
                      onOpenShop={handleOpenShop}
                      onOpenShopProfile={openShopProfile}
                      onOpenPostDetails={openPostDetails}
                      onToggleSubscribe={toggleSubscribe}
                      likedPosts={postsWithUserStatus.filter(p => p.isLiked)}
                      recentlyViewedPosts={recentlyViewedPosts}
                      hasShop={hasShop}
                      subView={profileSubView}
                      setSubView={setProfileSubView}
                      user={user}
                      onLogin={handleLogin}
                      onLogout={logout}
                      onOpenAdminDashboard={() => setShowAdminPanel(true)}
                      initialChatSellerId={initialChatSellerId}
                      initialChatProduct={initialChatProduct}
                      savedObrazlar={obrazlar}
                    />
                  </motion.div>
                ) : (
                  <motion.div
                    key="other"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="h-full flex items-center justify-center text-white/20 uppercase tracking-widest text-xs"
                  >
                    {t.soon}
                  </motion.div>
                )}
              </AnimatePresence>
            </main>

            {/* Bottom Navigation */}
            {workspace === 'Marketplace' && !isSearchActive && (
              <BottomNav activeTab={activeTab} setActiveTab={handleTabChange} language={language} />
            )}

            {/* Admin Panel */}
            <AnimatePresence>
              {showAdminPanel && user && (
                <AdminPanel 
                  isOpen={showAdminPanel} 
                  onClose={() => setShowAdminPanel(false)} 
                  currentUser={user}
                />
              )}
            </AnimatePresence>

            {/* Global Viewers */}
            <AnimatePresence>
              {activeLiveStream && (
                <LiveStreamViewer 
                  story={activeLiveStream} 
                  onClose={closeLiveStream}
                  onOpenShopProfile={(shopId) => {
                    closeLiveStream();
                    openShopProfile(shopId);
                  }}
                  onProductClick={(product) => {
                    closeLiveStream();
                    setSelectedPostForDetails(product);
                  }}
                />
              )}
            </AnimatePresence>

            <AnimatePresence>
              {activeStoryIndex !== null && (
                <StoryViewer
                  key="global-story-viewer"
                  stories={activeStoryList}
                  initialIndex={activeStoryIndex}
                  onClose={closeStories}
                  onMarkViewed={markStoryViewed}
                  onToggleLike={toggleLike}
                  onOpenShopProfile={openShopProfile}
                  onOpenChat={handleOpenChat}
                  language={language}
                />
              )}
            </AnimatePresence>

            <AnimatePresence>
              {activeReelIndex !== null && (
                <ReelsViewer
                  key="global-reels-viewer"
                  posts={activeReelList}
                  initialIndex={activeReelIndex}
                  onClose={closeReels}
                  onToggleLike={toggleLike}
                  onToggleSave={toggleSave}
                  onToggleSubscribe={toggleSubscribe}
                  onOpenShopProfile={openShopProfile}
                  onOpenChat={handleOpenChat}
                  onSharePost={handleSharePost}
                  language={language}
                  globalMuted={globalMuted}
                  setGlobalMuted={setGlobalMuted}
                />
              )}
            </AnimatePresence>

            <AnimatePresence>
              {selectedShopId && selectedSeller && (
                <ShopProfile
                  seller={selectedSeller}
                  posts={sellerPosts}
                  isOpen={!!selectedShopId}
                  onClose={closeShopProfile}
                  onToggleSubscribe={toggleSubscribe}
                  onOpenChat={handleOpenChat}
                  onOpenPostDetails={setSelectedPostForDetails}
                  language={language}
                />
              )}
            </AnimatePresence>

            {selectedPostForComments && (
              <CommentDrawer 
                isOpen={!!selectedPostForComments} 
                onClose={closePostComments} 
                postTitle={selectedPostForComments.seller.name}
              />
            )}

            <AnimatePresence>
              {selectedPostForDetails && (
                <ProductDetails 
                  post={selectedPostForDetails} 
                  onClose={closePostDetails} 
                  onOpenShopProfile={openShopProfile}
                  onMessage={handleOpenChat}
                  onSharePost={handleSharePost}
                  language={language}
                />
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Global Styles */}
      <style>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-spin-slow {
          animation: spin-slow 3s linear infinite;
        }
        body {
          font-family: 'Inter', sans-serif;
          background: var(--bg-primary);
          color: var(--text-primary);
          overflow: hidden;
          margin: 0;
        }
      `}</style>
    </div>
  );
}

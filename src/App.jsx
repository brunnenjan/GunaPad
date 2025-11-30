import React, { useState, useEffect, useRef } from 'react';
import { BookOpen, Sparkles, Volume2, RefreshCw, Users, Plus, Trash2, MapPin, Printer, Lock, Unlock, ShieldCheck, RotateCcw, Heart, Star, Zap, AlertCircle, Sun, CloudRain, Info, Feather, Brain, Lightbulb, Clock, X } from 'lucide-react';
import { logStoryToDB } from './logStoryToDB';

// --- CONFIGURATION ---
const apiKey = import.meta.env.VITE_GEMINI_API_KEY; // Google Gemini API Key from environment variables

// --- UTILS: SECURITY & SANITIZATION ---
const sanitizeInput = (input) => {
  if (typeof input !== 'string') return input;
  return input.replace(/[<>{}]/g, "").trim();
};

const formatNames = (names) => {
  const validNames = names.filter(n => n && n.trim().length > 0);
  if (validNames.length === 0) return "";
  if (validNames.length === 1) return validNames[0];
  if (validNames.length === 2) return `${validNames[0]} & ${validNames[1]}`;
  const last = validNames.pop();
  return `${validNames.join(', ')} & ${last}`;
};

// --- PROMPT HELPERS ---

const buildSystemPrompt = (childrenPayload, globalContext, storySettings, lang) => {
  // 1. Calculate Average Age for Tone
  const totalAge = childrenPayload.reduce((sum, child) => sum + (parseInt(child.age) || 5), 0);
  const avgAge = Math.round(totalAge / (childrenPayload.length || 1));

  // Define Word Count based on selection (Minutes -> Approx Words)
  let lengthInstruction = "approx. 600-750 words (Medium, ~5 min reading time)";
  if (storySettings.length === 'short') lengthInstruction = "approx. 350-450 words (Short, ~3 min reading time)";
  if (storySettings.length === 'long') lengthInstruction = "approx. 900-1100 words (Long, ~8 min reading time)";

  // Format Children Profiles
  const childrenDetails = childrenPayload.map((c, i) => `
    [CHILD INPUT: ${c.name} (${c.gender})]
    - Raw Inputs: "${c.description} ${c.preferences}"
  `).join('\n');

  return `
    ROLE: You are the AI heart of "GUNAPAD", generating therapeutic bedtime stories.
    TARGET AUDIENCE AGE: Average ${avgAge} years.
    OUTPUT LANGUAGE: STRICTLY ${lang === 'de' ? 'German' : lang === 'es' ? 'Spanish' : 'English'}.
    LENGTH: ${lengthInstruction}.

    === STEP 1: INPUT NORMALIZATION & BIAS REMOVAL (INTERNAL) ===
    Before writing, analyze the input for parental bias, toxicity, or negative labeling.
    1. NEUTRALIZE FAVORITISM/BLAME: 
       - If input implies "X is the smart one", treat it as "X has a specific perspective, just like Y".
       - If input implies "Y caused the trouble", reframe it as "A challenge arose that affected the group".
    2. TRANSLATE TO NEEDS: 
       - "Clingy" -> Needs connection. "Aggressive" -> Needs regulation/space. "Bossy" -> Needs autonomy.
    3. SYMMETRICAL CONFLICT: 
       - View the Daily Incident not as one child's fault, but as a "Force" (Weather, Knot, Fog) affecting everyone.
    4. FAIRNESS GUARANTEE: 
       - Assign rotating roles. No fixed "Hero" or "Problem Child". Everyone contributes.

    === STEP 2: STORY GENERATION ===
    
    [CONTEXT]:
    - Central Metaphor (The Problem): Derived from Daily Incident "${globalContext.dayIncident}".
      -> RULE: Transform this into a single, child-friendly metaphor (e.g. "Argument" -> "A knot that ties everyone together", "Chaos" -> "A loud wind"). NEVER mention the real event.
    - Pedagogical Goal: "${globalContext.storyGoal}" (e.g. finding calm, connection).
    - Setting: Starts in reality, transitions deeply into "${storySettings.world}".
    - Side Characters: "${storySettings.sidekicks}" (Must be active helpers/guides, not just decoration).
    - Plot Hook: "${storySettings.action}".

    [CHARACTERS]:
    ${childrenDetails}

    [STRICT NARRATIVE RULES]:
    1. TEAMWORK FOCUS: The problem is solved by the group combined. One child finds the clue, another has the courage, another the patience.
    2. SHOW DON'T TELL: Translate traits into behavior. Never label.
    3. METAPHORS ONLY: Conflicts are knots, swirls, waves, shadows. No realistic arguments.
    4. DEEP WORLD INTEGRATION: The environment and sidekicks actively help reflect the mood.
    5. SLEEPY ENDING: The story MUST end in a very calm, slow, cozy atmosphere to induce sleep.
    
    [PARENT NOTE RULES]:
    - Tone: Warm, non-judgmental, psychologically grounded (developmental perspective).
    - Content: Explain the metaphor used. Offer a simple co-regulation ritual. 
    - No blame, no "fix-it" attitude.

    [OUTPUT FORMAT]:
    JSON ONLY. No markdown.
    {
      "title": "String",
      "content": "String (Story text, \\n\\n for paragraphs)",
      "moral": "String",
      "parentNote": {
        "background": "String (Developmental context)",
        "impulse": "String (Concrete evening ritual)",
        "reflection": "String (Metaphor explanation)"
      }
    }
  `;
};

const buildImagePrompt = (childrenPayload, world, storyAction, mood) => {
  const childCount = childrenPayload.length;
  const visualDesc = childrenPayload.map(c => `young ${c.gender === 'm' ? 'boy' : c.gender === 'f' ? 'girl' : 'child'}`).join(', ');

  return `
    Style: Whimsical Soft Watercolor Cutout Style, Storybook Illustration. High quality, minimalist white background.
    Subject: ${childCount} children (${visualDesc}) together in ${world || "magical land"}.
    Action: ${storyAction}.
    Mood: ${mood}, Warm, Safe, Cozy.
    Negative: text, words, scary, dark, violence, ugly, deformed, extra limbs, photo-realistic, complex.
  `;
};

// --- DATA PRESETS ---
const RANDOM_DATA = {
  worlds: ["Im Land der fliegenden Inseln", "Stadt aus Süßigkeiten", "Unterwasser-Blubberblasen-Stadt", "Verzaubertes Baumhaus", "Mond-Bibliothek", "Geheimer Dinopark", "Wald der Glühwürmchen"],
  sidekicks: ["Ein schläfriger Bär", "Ein Roboter-Witzerzähler", "Eine weise Eule", "Ein freches Eichhörnchen", "Ein kleiner blauer Drache", "Eine Teekanne"],
  actions: ["Einen verlorenen Stern suchen", "Ein Regenbogen-Rad reparieren", "Ein Geheimnis flüstern", "Ein Wettrennen gegen den Wind", "Den Mond wecken"],
  details: ["Beobachtet gern", "Hat viel Energie", "Träumt viel", "Ist sehr vorsichtig", "Lacht laut", "Summt leise Melodien"],
  preferences: ["Mag Dinos", "Liebt Musik", "Sammelt Steine", "Klettert gerne", "Mag alles was rot ist"]
};

const getRandom = (arr) => arr[Math.floor(Math.random() * arr.length)];

// --- CONSTANTS ---
const DAY_MOODS = [
  { val: 'froehlich', label: 'Fröhlich / Leicht' },
  { val: 'muede', label: 'Müde / Erschöpft' },
  { val: 'aufgedreht', label: 'Aufgedreht / Wild' },
  { val: 'frustriert', label: 'Frustriert / Wütend' },
  { val: 'angespannt', label: 'Angespannt / Unsicher' },
  { val: 'durchwachsen', label: 'Durchwachsen' }
];

const STORY_GOALS = [
  { val: 'ruhe', label: 'Ruhe finden' },
  { val: 'verbindung', label: 'Verbindung stärken' },
  { val: 'mut', label: 'Mut stärken' },
  { val: 'streit', label: 'Streit beruhigen' },
  { val: 'selbstwert', label: 'Selbstwert stärken' },
  { val: 'leichtigkeit', label: 'Leicht & Lustig' }
];

const GENDER_OPTIONS = [
  { val: 'm', label: 'Junge' },
  { val: 'f', label: 'Mädchen' },
  { val: 'd', label: 'Neutral' }
];

const LENGTH_OPTIONS = [
  { val: 'short', label: 'Kurz (3 Min)', icon: Zap },
  { val: 'medium', label: 'Mittel (5 Min)', icon: BookOpen },
  { val: 'long', label: 'Lang (8 Min)', icon: Clock }
];

// --- TRANSLATIONS ---
const translations = {
  de: {
    title: "GUNAPAD",
    subtitle: "Geschichten, die verbinden.",
    startBtn: "Abenteuer starten",
    sectionChildren: "Die Hauptfiguren",
    addChild: "Kind hinzufügen",
    namePh: "Name",
    agePh: "Alter",
    
    // Parent Mode
    parentModeTitle: "Eltern-Cockpit",
    
    // Child Profile (Parent View)
    lblDesc: "Wesen & Eigenarten",
    phDesc: "z.B. stürmt los, beobachtet erst, sehr sensibel...",
    lblPref: "Vorlieben / Besonderes",
    phPref: "z.B. mag Tiere, Musik, ist mutig...",
    hintProfile: "Diese Infos werden in Verhalten übersetzt, aber nie wörtlich genannt.",

    // Global Parent Context
    sectionParentGlobal: "Der Tag & Das Ziel",
    lblDayMood: "Tagesstimmung",
    lblIncident: "Tagesvorfall (optional)",
    phIncident: "z.B. Streit beim Spielen, Überforderung, Chaos, Neid...",
    hintIncident: "Wird von der KI in eine kindgerechte Metapher verwandelt (keine direkte Erwähnung).",
    lblGoal: "Ziel der Geschichte",
    
    // Story Context
    sectionContext: "Story Setting",
    lblLength: "Lesezeit",
    lblWorld: "Die Welt",
    lblSidekicks: "Begleiter",
    lblAction: "Was passiert?",
    
    // Action
    generate: "Geschichte zaubern",
    generatingTxt: "Die Welt von GUNAPAD erwacht...",
    generatingImg: "Illustriere...",
    
    // Result
    parentNoteTitle: "Eltern-Impuls",
    readAloud: "Vorlesen",
    stopRead: "Stopp",
    print: "Drucken",
    reset: "Neue Geschichte",
    
    // Errors
    errValidation: "Bitte gib mindestens einen Namen ein und wähle einen Ort.",
    errMaxChildren: "Maximal 10 Kinder möglich.",
    errGen: "Verbindungsproblem. Bitte noch einmal versuchen.",
    autoSave: "Gespeichert"
  },
  en: {
    title: "GUNAPAD",
    subtitle: "Stories that connect.",
    startBtn: "Start Adventure",
    sectionChildren: "The Heroes",
    addChild: "Add Child",
    namePh: "Name",
    agePh: "Age",
    parentModeTitle: "Parent Cockpit",
    lblDesc: "Traits & Behavior",
    phDesc: "e.g. rushes in, observes...",
    lblPref: "Preferences",
    phPref: "e.g. loves animals...",
    hintProfile: "Translated into behavior, never listed literally.",
    sectionParentGlobal: "The Day & The Goal",
    lblDayMood: "Mood of the Day",
    lblIncident: "Daily Incident (optional)",
    phIncident: "e.g. Fight, overwhelm, chaos...",
    hintIncident: "Turned into a gentle metaphor.",
    lblGoal: "Story Goal",
    sectionContext: "Story Setting",
    lblLength: "Duration",
    lblWorld: "World",
    lblSidekicks: "Sidekicks",
    lblAction: "Action",
    generate: "Create Magic",
    parentNoteTitle: "Parent Insight",
    readAloud: "Read Aloud",
    stopRead: "Stop",
    print: "Print",
    reset: "New Story",
    errValidation: "Please enter a name and location.",
    errMaxChildren: "Max 10 children.",
    errGen: "Connection error.",
    autoSave: "Saved"
  },
  es: {
    title: "GUNAPAD",
    subtitle: "Historias que conectan.",
    startBtn: "Iniciar Aventura",
    sectionChildren: "Los Héroes",
    addChild: "Añadir Niño",
    namePh: "Nombre",
    agePh: "Edad",
    parentModeTitle: "Cabina de Padres",
    lblDesc: "Rasgos y Comportamiento",
    phDesc: "ej. impulsivo, observador...",
    lblPref: "Preferencias",
    phPref: "ej. ama animales...",
    hintProfile: "Traducido en comportamiento, nunca literal.",
    sectionParentGlobal: "El Día y El Objetivo",
    lblDayMood: "Estado de Ánimo",
    lblIncident: "Incidente (opcional)",
    phIncident: "ej. Pelea, caos...",
    hintIncident: "Convertido en metáfora.",
    lblGoal: "Objetivo",
    sectionContext: "Contexto",
    lblLength: "Duración",
    lblWorld: "Mundo",
    lblSidekicks: "Compañeros",
    lblAction: "Acción",
    generate: "Crear Magia",
    parentNoteTitle: "Para Padres",
    readAloud: "Leer",
    stopRead: "Parar",
    print: "Imprimir",
    reset: "Nueva Historia",
    errValidation: "Nombre y lugar requeridos.",
    errMaxChildren: "Máx 10 niños.",
    errGen: "Error de conexión.",
    autoSave: "Guardado"
  }
};

// --- UI COMPONENTS ---
const Button = ({ children, onClick, variant = 'primary', className = '', disabled = false, icon: Icon }) => {
  const baseStyle = "px-6 py-3.5 rounded-xl font-bold transition-all duration-200 transform hover:scale-[1.01] active:scale-95 flex items-center justify-center gap-2 shadow-sm touch-manipulation";
  const variants = {
    primary: "bg-slate-900 text-white hover:bg-slate-800 shadow-slate-200",
    secondary: "bg-white text-slate-800 border-2 border-slate-100 hover:bg-slate-50",
    ghost: "bg-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-100 shadow-none",
    goalSelected: "bg-indigo-600 text-white shadow-indigo-200 ring-2 ring-indigo-600",
    goalDefault: "bg-white text-indigo-900 border border-indigo-100 hover:border-indigo-300 hover:bg-indigo-50"
  };
  return (
    <button onClick={onClick} disabled={disabled} className={`${baseStyle} ${variants[variant]} ${className} ${disabled ? 'opacity-50 cursor-not-allowed transform-none' : ''} no-print`}>
      {Icon && <Icon size={18} />}
      {children}
    </button>
  );
};

const TextArea = ({ label, value, onChange, placeholder, onRandom, disabled = false, rows = 3, hint }) => (
  <div className="mb-4 w-full group">
    <div className="flex justify-between items-center mb-1.5">
       {label && <label className={`block text-xs font-bold uppercase tracking-wider ${disabled ? 'text-slate-300' : 'text-slate-500'}`}>{label}</label>}
       {onRandom && !disabled && (
         <button onClick={onRandom} className="text-[10px] bg-slate-100 hover:bg-slate-200 text-slate-600 px-2 py-1 rounded flex items-center gap-1 transition-colors font-bold uppercase tracking-wide" title="Zufall">
           <Sparkles size={10} />
         </button>
       )}
    </div>
    {hint && <p className="text-[11px] text-slate-400 mb-2 italic leading-tight">{hint}</p>}
    <textarea 
      disabled={disabled} 
      value={value} 
      onChange={(e) => onChange(e.target.value)} 
      placeholder={placeholder} 
      rows={rows} 
      className={`w-full px-4 py-3 rounded-xl border-2 outline-none transition-all text-sm font-medium resize-none leading-relaxed ${disabled ? 'bg-slate-50 border-slate-100 text-slate-300' : 'bg-white border-slate-100 focus:border-indigo-300 text-slate-700 placeholder-slate-300 shadow-sm'}`} 
    />
  </div>
);

// --- MAIN APP COMPONENT ---
export default function App() {
  const [step, setStep] = useState('intro');
  const [parentMode, setParentMode] = useState(false);
  const [isDev, setIsDev] = useState(false); 
  const [lang, setLang] = useState('de'); 
  const [isGenerating, setIsGenerating] = useState(false); 
  const [errorMsg, setErrorMsg] = useState(''); 
  const t = translations[lang]; 

  // --- STATE ---
  const [formData, setFormData] = useState({
    // Child Data
    children: [{ 
      id: 'init_1', name: '', age: '', gender: 'm', 
      description: '', preferences: '' // Simplified child profile
    }], 
    
    // Parent Cockpit (Global)
    dayMood: 'froehlich',
    dayIncident: '',
    storyGoal: 'ruhe',

    // Story Context
    world: '',
    sidekicks: '',
    storyAction: '',
    storyLength: 'medium'
  });

  const [story, setStory] = useState({ title: '', content: '', moral: '', parentNote: null });
  const [imageUrl, setImageUrl] = useState(null);
  const [audioUrl, setAudioUrl] = useState(null);
  const [loadingStatus, setLoadingStatus] = useState(''); 
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef(null);
  const saveTimeouts = useRef({}); 

  // --- LIFECYCLE ---
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('dev') === '1') setIsDev(true);
    
    // Load Children Data from LocalStorage (Mock API)
    // Note: In a real app we would load parent context too, but keeping simpler for this demo
  }, []);

  // --- ACTIONS ---
  const addChild = () => {
    if (formData.children.length < 10) {
      setFormData(prev => ({
        ...prev,
        children: [...prev.children, { 
          id: `child_${Date.now()}`, name: '', age: '', gender: 'm',
          description: '', preferences: ''
        }]
      }));
    } else {
        alert(t.errMaxChildren);
    }
  };

  const removeChild = (id) => {
    if (formData.children.length > 1) {
      setFormData(prev => ({ ...prev, children: prev.children.filter(c => c.id !== id) }));
    }
  };

  const updateChild = (id, field, value) => {
    setFormData(prev => ({
      ...prev,
      children: prev.children.map(c => c.id === id ? { ...c, [field]: value } : c)
    }));
  };

  const devAutoFill = () => {
    setFormData({
      children: formData.children.map(c => ({
         ...c,
         name: ["Lian", "Elli", "Tom", "Mia"][Math.floor(Math.random()*4)] + Math.floor(Math.random()*10),
         age: Math.floor(Math.random() * 6) + 3,
         description: getRandom(RANDOM_DATA.details),
         preferences: getRandom(RANDOM_DATA.preferences)
      })),
      dayMood: getRandom(DAY_MOODS).val,
      dayIncident: getRandom(RANDOM_DATA.actions), // Using actions as placeholder incidents
      storyGoal: getRandom(STORY_GOALS).val,
      world: getRandom(RANDOM_DATA.worlds),
      sidekicks: getRandom(RANDOM_DATA.sidekicks),
      storyAction: getRandom(RANDOM_DATA.actions),
      storyLength: 'medium'
    });
  };

  const generateStory = async () => {
    if (isGenerating) return; 
    setErrorMsg('');
    setAudioUrl(null);
    setIsPlaying(false);
    
    if (!formData.children.every(c => c.name.trim().length > 0) || !formData.world) {
       setErrorMsg(t.errValidation);
       return;
    }

    setIsGenerating(true);
    setStep('generating');
    setLoadingStatus('writing');

    try {
      // 1. Prepare Data
      const childrenPayload = formData.children.map(c => ({
         name: sanitizeInput(c.name),
         age: c.age, gender: c.gender,
         description: sanitizeInput(c.description),
         preferences: sanitizeInput(c.preferences)
      }));
      
      const globalContext = {
          dayMood: DAY_MOODS.find(m => m.val === formData.dayMood)?.label || 'Fröhlich',
          dayIncident: sanitizeInput(formData.dayIncident),
          storyGoal: STORY_GOALS.find(g => g.val === formData.storyGoal)?.label || 'Ruhe finden'
      };

      const storySettings = {
          world: sanitizeInput(formData.world),
          sidekicks: sanitizeInput(formData.sidekicks),
          action: sanitizeInput(formData.storyAction),
          length: formData.storyLength
      };
      
      // 2. Build Prompt
      const systemPrompt = buildSystemPrompt(childrenPayload, globalContext, storySettings, lang);

      // 3. API Call
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: systemPrompt }] }], generationConfig: { responseMimeType: "application/json" } })
      });

      if (!response.ok) throw new Error(`API Error: ${response.statusText}`);
      const data = await response.json();
      const storyData = JSON.parse(data.candidates[0].content.parts[0].text);
      setStory(storyData);

      // --- LOGGING ---
      logStoryToDB({
         rawInput: { ...formData, lang },
         storyJSON: storyData,
         engineVersion: "1.0"
      });
      // ---------------
      
      // 4. Image Gen
      setLoadingStatus('painting');
      const imagePrompt = buildImagePrompt(childrenPayload, formData.world, formData.storyAction, globalContext.dayMood);
      
      const imgResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/imagen-4.0-generate-001:predict?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ instances: [{ prompt: imagePrompt }], parameters: { sampleCount: 1 } })
      });

      if (imgResponse.ok) {
        const imgData = await imgResponse.json();
        if (imgData.predictions?.[0]) setImageUrl(`data:image/png;base64,${imgData.predictions[0].bytesBase64Encoded}`);
      }
      setStep('story');
    } catch (error) {
      console.error(error);
      setStep('form');
      setErrorMsg(t.errGen);
    } finally {
       setIsGenerating(false);
    }
  };

  const generateAudio = async () => {
    if (audioUrl && audioRef.current) {
      if (isPlaying) { audioRef.current.pause(); } else { audioRef.current.play(); }
      setIsPlaying(!isPlaying);
      return;
    }
    if (!story.content) return;
    setLoadingStatus('recording');
    try {
       const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-tts:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: `${story.title}. ${story.content}`.substring(0,2000) }] }], // Reduced limit to prevent TTS errors
          generationConfig: { responseModalities: ["AUDIO"], speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: "Puck" } } } }
        })
      });
      if(!response.ok) {
          const errorText = await response.text();
          console.error("TTS API Error:", response.status, errorText);
          throw new Error(`TTS API Error: ${response.status}`);
      }
      const data = await response.json();
      const audioBase64 = data.candidates[0].content.parts[0].inlineData.data;
      
      // Simple WAV Header generator
      const addHeader = (pcm, rate, ch) => {
         const b = new ArrayBuffer(44 + pcm.length);
         const v = new DataView(b);
         const w = (o, s) => { for(let i=0;i<s.length;i++) v.setUint8(o+i, s.charCodeAt(i)); };
         w(0,'RIFF'); v.setUint32(4, 36+pcm.length, true); w(8,'WAVE'); w(12,'fmt ');
         v.setUint32(16,16,true); v.setUint16(20,1,true); v.setUint16(22,ch,true);
         v.setUint32(24,rate,true); v.setUint32(28,rate*ch*2,true); v.setUint16(32,ch*2,true); v.setUint16(34,16,true); w(36,'data');
         v.setUint32(40,pcm.length,true); new Uint8Array(b, 44).set(pcm); return b;
      };

      const wav = addHeader(Uint8Array.from(atob(audioBase64), c => c.charCodeAt(0)), 24000, 1);
      const url = URL.createObjectURL(new Blob([wav], { type: 'audio/wav' }));
      setAudioUrl(url);
      const audio = new Audio(url);
      audioRef.current = audio;
      audio.play();
      setIsPlaying(true);
      audio.onended = () => setIsPlaying(false);
      setLoadingStatus('');
    } catch(e) { 
        console.error(e); 
        setLoadingStatus(''); 
        alert("Vorlesen fehlgeschlagen. Siehe Konsole für Details.");
    }
  };

  // --- VIEWS ---

  if (step === 'intro') {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 font-sans relative overflow-hidden">
        <div className="absolute top-6 left-6 z-20 flex gap-1">
           {[{ code: 'de', label: 'DE' }, { code: 'en', label: 'EN' }, { code: 'es', label: 'ES' }].map(l => (
             <button key={l.code} onClick={() => setLang(l.code)} className={`w-8 h-8 rounded-full text-xs font-bold transition-all ${lang === l.code ? 'bg-slate-800 text-white' : 'bg-white text-slate-400 hover:bg-slate-100'}`}>
               {l.label}
             </button>
           ))}
        </div>
        <div className="max-w-md w-full text-center space-y-8 z-10">
          <div className="space-y-2">
            <h1 className="text-5xl font-black text-slate-900 tracking-tight">{t.title}</h1>
            <div className="h-1 w-16 bg-indigo-500 mx-auto rounded-full"></div>
          </div>
          <p className="text-lg text-slate-600 font-medium leading-relaxed">{t.subtitle}</p>
          <div className="flex justify-center pt-4">
            <Button onClick={() => setStep('form')} icon={BookOpen} className="text-lg px-8 py-4 shadow-xl shadow-slate-200 hover:shadow-slate-300 transform hover:-translate-y-1">{t.startBtn}</Button>
          </div>
        </div>
      </div>
    );
  }

  if (step === 'form') {
    return (
      <div className="min-h-screen bg-slate-50 py-6 px-4 md:px-6 font-sans">
        {isDev && <div className="fixed bottom-4 left-4 z-50"><button onClick={devAutoFill} className="bg-red-500 text-white px-3 py-2 text-xs font-bold rounded shadow-lg hover:bg-red-600 flex items-center gap-2"><Zap size={14}/> FILL</button></div>}

        {/* Top Nav */}
        <div className="max-w-4xl mx-auto flex justify-between items-center mb-8 sticky top-0 bg-slate-50 z-30 py-2">
           <button onClick={() => setStep('intro')} className="text-slate-400 hover:text-slate-800 font-bold text-sm transition-colors">← Zurück</button>
           <button onClick={() => setParentMode(!parentMode)} className={`flex items-center gap-2 px-4 py-2 rounded-full transition-all border ${parentMode ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-200' : 'bg-white text-slate-500 border-slate-200'}`}>
               {parentMode ? <Unlock size={16}/> : <Lock size={16}/>}
               <span className="text-xs font-bold uppercase tracking-wide">{t.parentModeTitle}</span>
           </button>
        </div>

        <div className="max-w-4xl mx-auto space-y-10">
          
          {/* --- CHILDREN LIST (Simplified) --- */}
          <section>
            <div className="flex items-center justify-between mb-4">
               <h2 className="text-lg font-black text-slate-800 flex items-center gap-2"><Users size={18} className="text-slate-400"/> {t.sectionChildren}</h2>
               <div className="flex items-center gap-2">
                   <span className="text-xs text-slate-400 font-bold">{formData.children.length}/10</span>
                   <button onClick={addChild} className="text-xs font-bold bg-white border border-slate-200 text-slate-600 px-3 py-1.5 rounded-full hover:bg-slate-50 transition-colors flex items-center gap-1">
                     <Plus size={14}/> {t.addChild}
                   </button>
               </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {formData.children.map((child, index) => (
                <div key={child.id} className={`relative bg-white rounded-2xl p-5 shadow-sm border transition-all hover:shadow-md ${parentMode ? 'border-indigo-200 ring-2 ring-indigo-50 bg-indigo-50/10' : 'border-slate-100'}`}>
                  {formData.children.length > 1 && <button onClick={() => removeChild(child.id)} className="absolute top-3 right-3 text-slate-200 hover:text-red-400 transition-colors"><Trash2 size={16}/></button>}
                  
                  {/* Public Child Info (Always Visible) */}
                  <div className="flex items-start gap-4">
                     <div className={`w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold shadow-inner ${parentMode ? 'bg-indigo-100 text-indigo-400' : 'bg-slate-100 text-slate-400'}`}>{child.name ? child.name.charAt(0).toUpperCase() : `#${index+1}`}</div>
                     <div className="flex-1 space-y-3">
                        <input type="text" value={child.name} onChange={(e) => updateChild(child.id, 'name', e.target.value)} placeholder={t.namePh} className="w-full font-bold text-lg text-slate-800 placeholder-slate-300 outline-none bg-transparent" />
                        <div className="flex gap-2">
                           <input type="number" value={child.age} onChange={(e) => updateChild(child.id, 'age', e.target.value)} placeholder={t.agePh} className="w-16 bg-slate-50 rounded px-2 py-1 text-xs font-bold outline-none text-center text-slate-600" />
                           <div className="flex bg-slate-50 rounded p-0.5">
                              {GENDER_OPTIONS.map(g => (
                                <button key={g.val} onClick={() => updateChild(child.id, 'gender', g.val)} className={`px-2 py-1 rounded text-[10px] font-bold transition-all ${child.gender === g.val ? 'bg-white shadow-sm text-slate-800' : 'text-slate-400'}`}>{g.label}</button>
                              ))}
                           </div>
                        </div>
                     </div>
                  </div>

                  {/* PARENT MODE ONLY: Child Traits */}
                  {parentMode && (
                    <div className="mt-6 pt-6 border-t border-indigo-100/50 space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                      <div className="bg-indigo-50 p-2.5 rounded-lg flex items-start gap-2 mb-2">
                         <Info size={14} className="text-indigo-400 mt-0.5 shrink-0"/>
                         <p className="text-[10px] text-indigo-800 font-medium leading-tight">{t.hintProfile}</p>
                      </div>
                      <TextArea label={t.lblDesc} placeholder={t.phDesc} value={child.description} onChange={(v) => updateChild(child.id, 'description', v)} onRandom={() => updateChild(child.id, 'description', getRandom(RANDOM_DATA.details))} />
                      <TextArea label={t.lblPref} placeholder={t.phPref} value={child.preferences} onChange={(v) => updateChild(child.id, 'preferences', v)} onRandom={() => updateChild(child.id, 'preferences', getRandom(RANDOM_DATA.preferences))} />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>

          {/* --- PARENT COCKPIT (GLOBAL) --- */}
          {parentMode && (
             <section className="bg-indigo-50/50 rounded-3xl p-6 border border-indigo-100 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-100 rounded-full blur-3xl opacity-50 -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
                <div className="flex items-center gap-2 mb-6 relative z-10">
                  <div className="bg-white p-2 rounded-lg text-indigo-500 shadow-sm"><Lightbulb size={20}/></div>
                  <h2 className="text-lg font-black text-indigo-900">{t.sectionParentGlobal}</h2>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 relative z-10">
                   {/* Col 1: Mood & Incident */}
                   <div className="space-y-6">
                      <div>
                        <label className="block text-xs font-bold text-indigo-800 uppercase mb-2">{t.lblDayMood}</label>
                        <select value={formData.dayMood} onChange={(e) => setFormData({...formData, dayMood: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-indigo-200 bg-white text-sm font-bold text-indigo-900 outline-none focus:ring-2 focus:ring-indigo-200">
                           {DAY_MOODS.map(m => <option key={m.val} value={m.val}>{m.label}</option>)}
                        </select>
                      </div>
                      <div>
                        <TextArea label={t.lblIncident} hint={t.hintIncident} value={formData.dayIncident} onChange={(v) => setFormData({...formData, dayIncident: v})} placeholder={t.phIncident} rows={3} />
                      </div>
                   </div>
                   
                   {/* Col 2: Goal */}
                   <div>
                      <label className="block text-xs font-bold text-indigo-800 uppercase mb-2">{t.lblGoal}</label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                         {STORY_GOALS.map(g => (
                            <button key={g.val} onClick={() => setFormData({...formData, storyGoal: g.val})} className={`px-3 py-3 rounded-xl text-xs font-bold transition-all text-left flex items-center justify-between group ${formData.storyGoal === g.val ? 'bg-indigo-600 text-white shadow-md' : 'bg-white text-indigo-900 border border-indigo-100 hover:border-indigo-300'}`}>
                               {g.label}
                               {formData.storyGoal === g.val && <Heart size={14} className="fill-white"/>}
                            </button>
                         ))}
                      </div>
                   </div>
                </div>
             </section>
          )}

          {/* --- STORY SETTING --- */}
          <section className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-slate-100">
             <div className="flex items-center gap-2 mb-6">
               <div className="bg-slate-100 p-2 rounded-lg text-slate-600"><MapPin size={20}/></div>
               <h2 className="text-lg font-black text-slate-800">{t.sectionContext}</h2>
             </div>
             
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div>
                   <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">{t.lblLength}</label>
                   <div className="flex bg-slate-50 rounded-xl p-1 gap-1">
                      {LENGTH_OPTIONS.map(opt => (
                        <button key={opt.val} onClick={() => setFormData({...formData, storyLength: opt.val})} className={`flex-1 flex flex-col items-center justify-center py-2 rounded-lg text-xs font-bold transition-all ${formData.storyLength === opt.val ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400'}`}>
                           <opt.icon size={14} className="mb-1"/> {opt.label}
                        </button>
                      ))}
                   </div>
                </div>
                <TextArea label={t.lblWorld} value={formData.world} onChange={(v) => setFormData({...formData, world: v})} onRandom={() => setFormData({...formData, world: getRandom(RANDOM_DATA.worlds)})} placeholder="z.B. Zauberwald..." rows={2} />
             </div>
             <TextArea label={t.lblSidekicks} value={formData.sidekicks} onChange={(v) => setFormData({...formData, sidekicks: v})} onRandom={() => setFormData({...formData, sidekicks: getRandom(RANDOM_DATA.sidekicks)})} placeholder="z.B. Drache Pups..." rows={2} />
             <TextArea label={t.lblAction} value={formData.storyAction} onChange={(v) => setFormData({...formData, storyAction: v})} onRandom={() => setFormData({...formData, storyAction: getRandom(RANDOM_DATA.actions)})} placeholder="z.B. Stern suchen..." rows={2} />
          </section>

          {/* --- GENERATE --- */}
          <div className="pt-4 pb-20">
             {errorMsg && <div className="bg-red-50 text-red-500 px-4 py-3 rounded-xl mb-4 text-sm font-bold flex items-center gap-2"><AlertCircle size={16}/> {errorMsg}</div>}
             <Button onClick={generateStory} className="w-full py-5 text-lg shadow-xl shadow-slate-200" disabled={isGenerating} icon={isGenerating ? RefreshCw : Sparkles}>{isGenerating ? '...' : t.generate}</Button>
          </div>
        </div>
      </div>
    );
  }

  if (step === 'generating') {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 bg-white rounded-2xl shadow-lg flex items-center justify-center mb-6 animate-bounce"><Sparkles className="text-indigo-500" size={32}/></div>
        <h2 className="text-2xl font-black text-slate-800 mb-2">{loadingStatus === 'writing' ? t.generatingTxt : t.generatingImg}</h2>
        <div className="w-48 h-1.5 bg-slate-200 rounded-full overflow-hidden"><div className="h-full bg-indigo-500 animate-loading-bar"></div></div>
        <style>{`@keyframes loading-bar { 0% { width: 0% } 50% { width: 70% } 100% { width: 100% } } .animate-loading-bar { animation: loading-bar 2s infinite ease-in-out; }`}</style>
      </div>
    );
  }

  if (step === 'story') {
    return (
      <div className="min-h-screen bg-[#fdfbf7] font-serif text-slate-800 relative">
        <style>{`@import url('https://fonts.googleapis.com/css2?family=Lora:ital,wght@0,400;0,600;1,400&display=swap'); body { font-family: 'Lora', serif; } .drop-cap::first-letter { float: left; font-size: 3.5rem; line-height: 0.8; padding-right: 0.5rem; color: #1e293b; font-weight: 700; }`}</style>
        
        {/* Sticky Read Aloud Button - Top Right */}
        <div className="fixed top-4 right-4 z-50 no-print">
            <button onClick={generateAudio} className={`px-4 py-2 rounded-full font-bold flex items-center gap-2 shadow-lg transition-all ${isPlaying ? 'bg-red-50 text-red-500 border border-red-200' : 'bg-slate-900 text-white hover:scale-105'}`}>
                {isPlaying ? <RefreshCw size={16} className="animate-spin"/> : <Volume2 size={16}/>}
                <span className="text-sm">{isPlaying ? t.stopRead : t.readAloud}</span>
            </button>
        </div>

        <div className="max-w-3xl mx-auto min-h-screen bg-white shadow-xl overflow-hidden flex flex-col my-0 md:my-8 rounded-none md:rounded-2xl relative">
           
           {/* Image Top */}
           <div className="p-6 md:p-8 bg-slate-50 flex justify-center">
              <div className="bg-white p-2 md:p-3 rounded-xl shadow-lg transform rotate-1 max-w-sm w-full mx-auto">
                <div className="aspect-[4/3] bg-slate-100 rounded-lg overflow-hidden relative">
                    {imageUrl ? <img src={imageUrl} className="w-full h-full object-cover" alt="Cover" /> : <div className="w-full h-full flex items-center justify-center text-slate-300"><Sparkles/></div>}
                </div>
              </div>
           </div>

           {/* Content */}
           <div className="px-8 py-8 md:px-12 md:py-10">
              <h1 className="text-3xl md:text-4xl font-bold text-slate-900 mb-8 text-center leading-tight">{story.title}</h1>
              
              <div className="prose prose-slate prose-lg leading-relaxed mx-auto text-justify">
                 <p className="drop-cap whitespace-pre-wrap">{story.content}</p>
              </div>
              
              {/* Moral */}
              {story.moral && (
                <div className="mt-12 flex gap-4 items-center justify-center text-amber-900/60 font-medium italic">
                   <Star size={16} /> <span>{story.moral}</span> <Star size={16} />
                </div>
              )}

              {/* PARENT NOTE - Deep Pedagogical Insight */}
              {story.parentNote && (
                 <div className="mt-12 bg-indigo-50/80 rounded-2xl p-6 md:p-8 border border-indigo-100 no-print">
                    <div className="flex items-center gap-2 mb-6">
                       <div className="bg-white p-2 rounded-full text-indigo-500 shadow-sm"><Brain size={20}/></div>
                       <div>
                          <h3 className="text-lg font-bold text-indigo-900">{t.parentNoteTitle}</h3>
                          <p className="text-xs text-indigo-400 font-bold uppercase tracking-wider">Pädagogische Impulse</p>
                       </div>
                    </div>
                    
                    <div className="space-y-4 text-sm md:text-base text-indigo-900/80">
                       {/* Render structured parent note */}
                       {typeof story.parentNote === 'string' ? (
                           <p>{story.parentNote}</p>
                       ) : (
                           <>
                              <div className="bg-white/60 p-4 rounded-xl border border-indigo-50">
                                 <strong className="flex items-center gap-2 text-indigo-700 text-xs uppercase tracking-wider mb-2"><Feather size={12}/> Hintergrund</strong>
                                 <p className="leading-relaxed">{story.parentNote.background}</p>
                              </div>
                              <div className="bg-white/60 p-4 rounded-xl border border-indigo-50">
                                 <strong className="flex items-center gap-2 text-indigo-700 text-xs uppercase tracking-wider mb-2"><Zap size={12}/> Impuls für heute Abend</strong>
                                 <p className="leading-relaxed font-medium">{story.parentNote.impulse}</p>
                              </div>
                              <div className="px-2 pt-2">
                                 <p className="italic text-indigo-800/60 text-sm">Reflexion: {story.parentNote.reflection}</p>
                              </div>
                           </>
                       )}
                    </div>
                 </div>
              )}

              {/* Actions Footer */}
              <div className="mt-12 flex flex-col md:flex-row gap-4 no-print pb-8 border-t border-slate-100 pt-8">
                 <button onClick={() => window.print()} className="flex-1 py-4 border-2 border-slate-100 rounded-2xl font-bold text-slate-600 hover:bg-slate-50 flex items-center justify-center gap-2">
                   <Printer size={20}/> <span className="text-sm">{t.print}</span>
                 </button>
                 <button onClick={() => setStep('form')} className="flex-1 py-4 bg-slate-900 text-white rounded-2xl font-bold hover:bg-slate-800 flex items-center justify-center gap-2 shadow-lg shadow-slate-200">
                   <RotateCcw size={20}/> <span className="text-sm">{t.reset}</span>
                 </button>
              </div>
           </div>
        </div>
      </div>
    );
  }
  return null;
}
import { useState, useEffect, useRef, useCallback } from 'react';

interface UseSpeechRecognitionOptions {
  silentMode?: boolean;
  onSpeechComplete?: (finalTranscript: string) => void;
}

interface UseSpeechRecognitionReturn {
  isListening: boolean;
  transcript: string;
  isSupported: boolean;
  startListening: (playGreeting?: boolean) => void;
  stopListening: () => void;
  resetTranscript: () => void;
  speakGreeting: (onGreetingEnd?: () => void) => void;
  speakText: (textToSpeak: string, onEnd?: () => void) => void;
}

export function useSpeechRecognition(options?: UseSpeechRecognitionOptions): UseSpeechRecognitionReturn {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const recognitionRef = useRef<any>(null);
  const silenceTimerRef = useRef<any>(null);
  const latestTranscriptRef = useRef('');
  const shouldListenRef = useRef(false);

  // Keep options ref updated so callbacks never re-trigger SpeechRecognition creation
  const optionsRef = useRef(options);
  useEffect(() => {
    optionsRef.current = options;
  }, [options]);

  const getLangCode = () => {
    const lang = localStorage.getItem('paypilot_language') || 'en';
    if (lang === 'hi') return 'hi-IN';
    if (lang === 'mr') return 'mr-IN';
    return 'en-IN';
  };

  const getGreetingText = () => {
    const lang = localStorage.getItem('paypilot_language') || 'en';
    if (lang === 'hi') {
      return 'पेपायलट में आपका स्वागत है! आप कौन सा प्रोडक्ट ढूंढना चाहते हैं? बोलिए...';
    }
    if (lang === 'mr') {
      return 'पेपायलट मध्ये आपले स्वागत आहे! आपल्याला कोणता प्रॉडक्ट शोधायचा आहे? बोला...';
    }
    return 'Welcome to PayPilot! What product would you like to search today? Please speak...';
  };

  // Human-like Fast Natural Female Voice Synthesis Helper
  const speakText = useCallback((textToSpeak: string, onEnd?: () => void) => {
    if (!('speechSynthesis' in window)) {
      if (onEnd) onEnd();
      return;
    }

    try {
      window.speechSynthesis.cancel(); // cancel previous speech audio
    } catch {
      // silent
    }

    const utterance = new SpeechSynthesisUtterance(textToSpeak);
    utterance.lang = getLangCode();
    utterance.rate = 1.55; // Brisk, fast, energetic human conversational pace
    utterance.pitch = 1.05; // Warm, natural human female vocal pitch (not robotic synth)

    const findNaturalFemaleVoice = () => {
      const voices = window.speechSynthesis.getVoices();
      if (!voices || voices.length === 0) return null;

      // 1. Natural / Neural Indian Female Voice (e.g. Neerja Natural, Swara, Heera, Google en-IN)
      const naturalIndianFemale = voices.find(
        (v) =>
          (v.lang.includes('IN') || v.lang.includes('en-IN') || v.lang.includes('hi-IN')) &&
          (v.name.toLowerCase().includes('natural') ||
            v.name.toLowerCase().includes('neural') ||
            v.name.toLowerCase().includes('neerja') ||
            v.name.toLowerCase().includes('swara') ||
            v.name.toLowerCase().includes('heera') ||
            v.name.toLowerCase().includes('zira') ||
            v.name.toLowerCase().includes('female') ||
            v.name.toLowerCase().includes('google'))
      );
      if (naturalIndianFemale) return naturalIndianFemale;

      // 2. Any Natural / Neural Female Voice
      const anyNaturalFemale = voices.find(
        (v) =>
          (v.name.toLowerCase().includes('natural') || v.name.toLowerCase().includes('neural')) &&
          (v.name.toLowerCase().includes('female') || v.name.toLowerCase().includes('zira') || v.name.toLowerCase().includes('aria'))
      );
      if (anyNaturalFemale) return anyNaturalFemale;

      // 3. Indian Voice fallback
      const indianVoice = voices.find((v) => v.lang.includes('IN') || v.lang.includes('en-IN'));
      if (indianVoice) return indianVoice;

      // 4. Female Voice fallback
      return voices.find((v) => v.name.toLowerCase().includes('female') || v.name.toLowerCase().includes('zira'));
    };

    const bestVoice = findNaturalFemaleVoice();
    if (bestVoice) {
      utterance.voice = bestVoice;
    }

    let ended = false;
    const handleDone = () => {
      if (!ended) {
        ended = true;
        if (onEnd) onEnd();
      }
    };

    utterance.onend = handleDone;
    utterance.onerror = handleDone;

    window.speechSynthesis.speak(utterance);
  }, []);

  const speakGreeting = useCallback((onGreetingEnd?: () => void) => {
    speakText(getGreetingText(), onGreetingEnd);
  }, [speakText]);

  const finishSpeechAndSubmit = useCallback(() => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
    shouldListenRef.current = false;
    const textToSearch = latestTranscriptRef.current.trim();
    latestTranscriptRef.current = '';

    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // silent
      }
    }
    setIsListening(false);

    if (textToSearch && optionsRef.current?.onSpeechComplete) {
      optionsRef.current.onSpeechComplete(textToSearch);
    }
  }, []);

  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (SpeechRecognition) {
      try {
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = getLangCode();

        recognition.onstart = () => {
          setIsListening(true);
        };

        recognition.onresult = (event: any) => {
          let accumulated = '';
          for (let i = 0; i < event.results.length; i++) {
            accumulated += event.results[i][0].transcript + ' ';
          }

          const clean = accumulated.trim();
          if (clean) {
            setTranscript(clean);
            latestTranscriptRef.current = clean;

            // Reset 1.2-second silence timer on new spoken words (auto stops and submits when user stops talking)
            if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
            silenceTimerRef.current = setTimeout(() => {
              finishSpeechAndSubmit();
            }, 1200);
          }
        };

        recognition.onerror = (event: any) => {
          console.warn('Speech recognition notice:', event.error);
          if (event.error === 'no-speech' || event.error === 'network' || event.error === 'aborted') {
            if (!shouldListenRef.current) {
              setIsListening(false);
            }
          }
        };

        recognition.onend = () => {
          if (silenceTimerRef.current) {
            clearTimeout(silenceTimerRef.current);
            silenceTimerRef.current = null;
          }

          const pendingText = latestTranscriptRef.current.trim();
          if (pendingText) {
            // Speech was spoken and recognition ended -> submit immediately
            latestTranscriptRef.current = '';
            shouldListenRef.current = false;
            setIsListening(false);
            if (optionsRef.current?.onSpeechComplete) {
              optionsRef.current.onSpeechComplete(pendingText);
            }
          } else if (shouldListenRef.current) {
            // Auto restart recognition if user hasn't spoken yet and didn't explicitly stop mic
            try {
              recognition.start();
            } catch {
              setIsListening(false);
            }
          } else {
            setIsListening(false);
          }
        };

        recognitionRef.current = recognition;
      } catch (err) {
        console.warn('Failed to initialize speech recognition:', err);
      }
    }
  }, [finishSpeechAndSubmit]);

  const startListeningDirect = useCallback(() => {
    setTranscript('');
    latestTranscriptRef.current = '';
    shouldListenRef.current = true;

    if ('speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
      } catch {
        // silent
      }
    }

    if (recognitionRef.current) {
      try {
        recognitionRef.current.lang = getLangCode();
        recognitionRef.current.start();
        setIsListening(true);
      } catch (err) {
        console.warn('Speech recognition start notice:', err);
        setIsListening(true);
      }
    } else {
      setIsListening(true);
    }
  }, []);

  const startListening = useCallback((playGreeting = false) => {
    if (playGreeting && !optionsRef.current?.silentMode) {
      speakGreeting(() => {
        startListeningDirect();
      });
    } else {
      startListeningDirect();
    }
  }, [speakGreeting, startListeningDirect]);

  const stopListening = useCallback(() => {
    shouldListenRef.current = false;
    setIsListening(false);
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (err) {
        console.warn('Failed to stop speech recognition:', err);
      }
    }
    if ('speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
      } catch {
        // silent
      }
    }
  }, []);

  const resetTranscript = useCallback(() => {
    setTranscript('');
    latestTranscriptRef.current = '';
  }, []);

  return {
    isListening,
    transcript,
    isSupported: true,
    startListening,
    stopListening,
    resetTranscript,
    speakGreeting,
    speakText,
  };
}

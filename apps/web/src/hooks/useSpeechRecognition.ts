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

  // Indian Female Voice Synthesis Helper
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
    utterance.rate = 0.95; // calm and natural pace
    utterance.pitch = 1.15; // friendly female tone

    const voices = window.speechSynthesis.getVoices();
    const femaleIndianVoice = voices.find(
      (v) =>
        (v.lang.includes('IN') || v.lang.includes('en-IN') || v.lang.includes('hi-IN')) &&
        (v.name.toLowerCase().includes('female') || v.name.toLowerCase().includes('zira') || v.name.toLowerCase().includes('heera') || v.name.toLowerCase().includes('google'))
    ) || voices.find((v) => v.lang.includes('IN')) || voices.find((v) => v.name.toLowerCase().includes('female'));

    if (femaleIndianVoice) {
      utterance.voice = femaleIndianVoice;
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

  const handleSpeechSilenceDone = useCallback(() => {
    shouldListenRef.current = false;
    const textToSearch = latestTranscriptRef.current.trim();
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // silent
      }
    }
    setIsListening(false);
    if ('speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
      } catch {
        // silent
      }
    }
    if (textToSearch && options?.onSpeechComplete) {
      options.onSpeechComplete(textToSearch);
    }
  }, [options]);

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

            // Reset 3-second silence timer on new spoken words
            if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
            silenceTimerRef.current = setTimeout(() => {
              handleSpeechSilenceDone();
            }, 3000);
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
          if (shouldListenRef.current) {
            // Auto restart recognition if user hasn't explicitly stopped mic
            try {
              recognition.start();
            } catch {
              setIsListening(false);
            }
          } else {
            setIsListening(false);
            if (latestTranscriptRef.current.trim() && options?.onSpeechComplete) {
              const text = latestTranscriptRef.current.trim();
              latestTranscriptRef.current = '';
              options.onSpeechComplete(text);
            }
          }
        };

        recognitionRef.current = recognition;
      } catch (err) {
        console.warn('Failed to initialize speech recognition:', err);
      }
    }
  }, [handleSpeechSilenceDone, options]);

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
    if (playGreeting && !options?.silentMode) {
      speakGreeting(() => {
        startListeningDirect();
      });
    } else {
      startListeningDirect();
    }
  }, [options?.silentMode, speakGreeting, startListeningDirect]);

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

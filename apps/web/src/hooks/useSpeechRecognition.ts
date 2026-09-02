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
    if (!('speechSynthesis' in window) || options?.silentMode) {
      if (onEnd) onEnd();
      return;
    }
    
    try {
      window.speechSynthesis.cancel(); // cancel previous speech
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

    if (onEnd) {
      utterance.onend = () => onEnd();
      utterance.onerror = () => onEnd();
    }

    window.speechSynthesis.speak(utterance);
  }, [options?.silentMode]);

  const speakGreeting = useCallback((onGreetingEnd?: () => void) => {
    if (!options?.silentMode) {
      speakText(getGreetingText(), onGreetingEnd);
    } else if (onGreetingEnd) {
      onGreetingEnd();
    }
  }, [options?.silentMode, speakText]);

  const handleSpeechSilenceDone = useCallback(() => {
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
          let currentTranscript = '';
          for (let i = event.resultIndex; i < event.results.length; i++) {
            currentTranscript += event.results[i][0].transcript;
          }

          if (currentTranscript.trim()) {
            setTranscript(currentTranscript);
            latestTranscriptRef.current = currentTranscript;

            // Reset silence timer on every new speech token
            if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
            silenceTimerRef.current = setTimeout(() => {
              handleSpeechSilenceDone();
            }, 1500); // 1.5 seconds of silence auto-stops and triggers search!
          }
        };

        recognition.onerror = (event: any) => {
          console.warn('Speech recognition notice:', event.error);
          if (event.error === 'no-speech' || event.error === 'network') {
            setIsListening(false);
          }
        };

        recognition.onend = () => {
          setIsListening(false);
          if (latestTranscriptRef.current.trim() && options?.onSpeechComplete) {
            options.onSpeechComplete(latestTranscriptRef.current.trim());
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

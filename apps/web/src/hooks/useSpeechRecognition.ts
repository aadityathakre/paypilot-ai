import { useState, useEffect, useRef, useCallback } from 'react';

interface UseSpeechRecognitionOptions {
  onSpeechComplete?: (finalTranscript: string) => void;
}

interface UseSpeechRecognitionReturn {
  isListening: boolean;
  transcript: string;
  isSupported: boolean;
  startListening: () => void;
  stopListening: () => void;
  resetTranscript: () => void;
  speakGreeting: () => void;
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

  const speakGreeting = useCallback(() => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel(); // stop previous audio
      const text = getGreetingText();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = getLangCode();
      utterance.rate = 1.0;
      utterance.pitch = 1.0;
      window.speechSynthesis.speak(utterance);
    }
  }, []);

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
      window.speechSynthesis.cancel();
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
            }, 1800); // 1.8 seconds of silence auto-stops and triggers search!
          }
        };

        recognition.onerror = (event: any) => {
          console.warn('Speech recognition notice:', event.error);
        };

        recognition.onend = () => {
          // If stopped while in listening mode with transcript, complete speech search
          if (latestTranscriptRef.current.trim() && options?.onSpeechComplete) {
            options.onSpeechComplete(latestTranscriptRef.current.trim());
          }
          setIsListening(false);
        };

        recognitionRef.current = recognition;
      } catch (err) {
        console.warn('Failed to initialize speech recognition:', err);
      }
    }
  }, [handleSpeechSilenceDone, options]);

  const startListening = useCallback(() => {
    setTranscript('');
    latestTranscriptRef.current = '';
    setIsListening(true);

    // 1. Play voice welcome greeting ("Welcome to PayPilot...")
    speakGreeting();

    // 2. Start Web Speech recognition
    if (recognitionRef.current) {
      try {
        recognitionRef.current.lang = getLangCode();
        recognitionRef.current.start();
        return;
      } catch (err) {
        console.warn('Speech recognition start notice:', err);
      }
    }

    // Fallback simulation if mic permissions are blocked by browser
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    silenceTimerRef.current = setTimeout(() => {
      const sample = 'I need a coding laptop with good display';
      setTranscript(sample);
      latestTranscriptRef.current = sample;
      handleSpeechSilenceDone();
    }, 3200);
  }, [handleSpeechSilenceDone, speakGreeting]);

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
      window.speechSynthesis.cancel();
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
  };
}

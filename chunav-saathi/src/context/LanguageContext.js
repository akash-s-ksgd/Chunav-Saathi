"use client";

import { createContext, useContext, useState } from "react";

const translations = {
  en: {
    code: "en",
    label: "English",
    navTitle: "Chunav Saathi",
    tagline: "Your Trusted Election Companion",
    heroTitle: "Know Your Vote. Exercise Your Right.",
    heroSub:
      "India's comprehensive election education platform powered by AI — built on ECI guidelines.",
    timelineTitle: "Election Timeline",
    hubTitle: "ECI Action Hub",
    chatTitle: "Chunav Saathi AI",
    chatSubtitle: "Powered by Gemini · Election Expert",
    searchRoll: "Search Electoral Roll",
    searchRollDesc: "Find your name on the voter list",
    registerVote: "Register to Vote",
    registerVoteDesc: "New voter? Fill Form 6 online",
    knowCandidate: "Know Your Candidate",
    knowCandidateDesc: "View affidavit & criminal records",
    downloadApp: "Download Voter Helpline App",
    downloadAppDesc: "Official ECI mobile app (VHA)",
    placeholder: "Ask anything about voting...",
    send: "Send",
    karnatakaBanner: "We noticed you are in Karnataka. Would you like to switch to Kannada?",
    yes: "Yes, Switch",
    dismiss: "Dismiss",
    typing: "Chunav Saathi is typing",
    phase1: "Voter Registration",
    phase1desc: "Check & update your details on voters.eci.gov.in",
    phase2: "Pre-Election",
    phase2desc: "Model Code of Conduct enforced; campaign deadlines",
    phase3: "Polling Day",
    phase3desc: "Cast your vote with valid ID at your polling booth",
    phase4: "Counting & Results",
    phase4desc: "Votes counted; results declared by ECI",
  },
  hi: {
    code: "hi",
    label: "हिन्दी",
    navTitle: "चुनाव साथी",
    tagline: "आपका विश्वसनीय चुनाव साथी",
    heroTitle: "अपना वोट जानें। अपना अधिकार प्रयोग करें।",
    heroSub:
      "AI-संचालित भारत का व्यापक चुनाव शिक्षा प्लेटफ़ॉर्म — ECI दिशानिर्देशों पर आधारित।",
    timelineTitle: "चुनाव समयरेखा",
    hubTitle: "ECI एक्शन हब",
    chatTitle: "चुनाव साथी AI",
    chatSubtitle: "Gemini द्वारा संचालित · चुनाव विशेषज्ञ",
    searchRoll: "मतदाता सूची खोजें",
    searchRollDesc: "मतदाता सूची में अपना नाम खोजें",
    registerVote: "मतदाता पंजीकरण",
    registerVoteDesc: "नए मतदाता? फॉर्म 6 ऑनलाइन भरें",
    knowCandidate: "अपने उम्मीदवार को जानें",
    knowCandidateDesc: "हलफनामा और आपराधिक रिकॉर्ड देखें",
    downloadApp: "वोटर हेल्पलाइन ऐप डाउनलोड करें",
    downloadAppDesc: "आधिकारिक ECI मोबाइल ऐप (VHA)",
    placeholder: "मतदान के बारे में कुछ भी पूछें...",
    send: "भेजें",
    karnatakaBanner: "हमने देखा आप कर्नाटक में हैं। क्या आप कन्नड़ में स्विच करना चाहते हैं?",
    yes: "हाँ, बदलें",
    dismiss: "बंद करें",
    typing: "चुनाव साथी टाइप कर रहा है",
    phase1: "मतदाता पंजीकरण",
    phase1desc: "voters.eci.gov.in पर विवरण जाँचें और अपडेट करें",
    phase2: "पूर्व-चुनाव",
    phase2desc: "आचार संहिता लागू; प्रचार की समय-सीमा",
    phase3: "मतदान दिवस",
    phase3desc: "वैध आईडी के साथ अपने बूथ पर वोट डालें",
    phase4: "मतगणना और परिणाम",
    phase4desc: "मतगणना; ECI द्वारा परिणाम घोषित",
  },
  kn: {
    code: "kn",
    label: "ಕನ್ನಡ",
    navTitle: "ಚುನಾವ್ ಸಾಥಿ",
    tagline: "ನಿಮ್ಮ ವಿಶ್ವಾಸಾರ್ಹ ಚುನಾವಣಾ ಸಹಾಯಕ",
    heroTitle: "ನಿಮ್ಮ ಮತ ತಿಳಿಯಿರಿ. ನಿಮ್ಮ ಹಕ್ಕು ಚಲಾಯಿಸಿ.",
    heroSub: "AI-ಚಾಲಿತ ಭಾರತದ ಸಮಗ್ರ ಚುನಾವಣಾ ಶಿಕ್ಷಣ ವೇದಿಕೆ — ECI ಮಾರ್ಗಸೂಚಿ ಆಧಾರಿತ.",
    timelineTitle: "ಚುನಾವಣಾ ಸಮಯರೇಖೆ",
    hubTitle: "ECI ಆಕ್ಷನ್ ಹಬ್",
    chatTitle: "ಚುನಾವ್ ಸಾಥಿ AI",
    chatSubtitle: "Gemini ಚಾಲಿತ · ಚುನಾವಣಾ ತಜ್ಞ",
    searchRoll: "ಮತದಾರರ ಪಟ್ಟಿ ಹುಡುಕಿ",
    searchRollDesc: "ಮತದಾರರ ಪಟ್ಟಿಯಲ್ಲಿ ನಿಮ್ಮ ಹೆಸರು ಹುಡುಕಿ",
    registerVote: "ಮತದಾರ ನೋಂದಣಿ",
    registerVoteDesc: "ಹೊಸ ಮತದಾರ? ಫಾರ್ಮ್ 6 ಆನ್‌ಲೈನ್ ಭರ್ತಿ ಮಾಡಿ",
    knowCandidate: "ನಿಮ್ಮ ಅಭ್ಯರ್ಥಿಯನ್ನು ತಿಳಿಯಿರಿ",
    knowCandidateDesc: "ಅಫಿಡವಿಟ್ ಮತ್ತು ಕ್ರಿಮಿನಲ್ ದಾಖಲೆ ನೋಡಿ",
    downloadApp: "ಮತದಾರ ಸಹಾಯವಾಣಿ ಅಪ್ಲಿಕೇಶನ್ ಡೌನ್‌ಲೋಡ್ ಮಾಡಿ",
    downloadAppDesc: "ಅಧಿಕೃತ ECI ಮೊಬೈಲ್ ಅಪ್ಲಿಕೇಶನ್ (VHA)",
    placeholder: "ಮತದಾನದ ಬಗ್ಗೆ ಏನಾದರೂ ಕೇಳಿ...",
    send: "ಕಳುಹಿಸಿ",
    karnatakaBanner: "ನೀವು ಕರ್ನಾಟಕದಲ್ಲಿ ಇದ್ದೀರಿ ಎಂದು ತಿಳಿಯಿತು. ಕನ್ನಡಕ್ಕೆ ಬದಲಾಯಿಸಲು ಬಯಸುವಿರಾ?",
    yes: "ಹೌದು, ಬದಲಾಯಿಸಿ",
    dismiss: "ಮುಚ್ಚಿ",
    typing: "ಚುನಾವ್ ಸಾಥಿ ಟೈಪ್ ಮಾಡುತ್ತಿದ್ದಾರೆ",
    phase1: "ಮತದಾರ ನೋಂದಣಿ",
    phase1desc: "voters.eci.gov.in ನಲ್ಲಿ ವಿವರಗಳನ್ನು ಪರಿಶೀಲಿಸಿ ಮತ್ತು ನವೀಕರಿಸಿ",
    phase2: "ಚುನಾವಣಾ ಪೂರ್ವ",
    phase2desc: "ನಡವಳಿಕೆ ಸಂಹಿತೆ ಜಾರಿ; ಪ್ರಚಾರ ಗಡುವು",
    phase3: "ಮತದಾನ ದಿನ",
    phase3desc: "ಮಾನ್ಯ ಗುರುತಿನ ಚೀಟಿಯೊಂದಿಗೆ ನಿಮ್ಮ ಬೂತ್‌ನಲ್ಲಿ ಮತ ಹಾಕಿ",
    phase4: "ಎಣಿಕೆ ಮತ್ತು ಫಲಿತಾಂಶ",
    phase4desc: "ಮತ ಎಣಿಕೆ; ECI ಯಿಂದ ಫಲಿತಾಂಶ ಘೋಷಣೆ",
  },
};

const LanguageContext = createContext(null);

export function LanguageProvider({ children }) {
  const [lang, setLang] = useState("en");
  const t = translations[lang];

  return (
    <LanguageContext.Provider value={{ lang, setLang, t, translations }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage must be used inside LanguageProvider");
  return ctx;
}

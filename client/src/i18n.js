import i18n from "i18next";
import { initReactI18next } from "react-i18next";

const resources = {
  en: {
    translation: {
      bookingTitle: "Farmer Booking",
bookingSubtitle: "Book cold storage for your produce.",
farmerName: "Farmer Name",
phone: "Phone",
village: "Village",
crop: "Crop",
qtyKg: "Quantity (kg)",
expectedPrice: "Expected Price (₹/kg)",
hub: "Select Hub",
storageDays: "Storage Days (1-7)",
submit: "Create Booking",
success: "Booking created ✅",
failed: "Booking failed",
farmerDashTitle: "Farmer Dashboard",
farmerDashSubtitle: "Enter your phone number to see your lots, status, and payments.",
searchPhone: "Phone Number",
search: "Search",
noLots: "No lots found for this phone.",
lotId: "Lot ID",
qty: "Qty (kg)",
status: "Status",
hubName: "Hub",
created: "Created",
viewLedger: "View Ledger",
qrSlip: "QR Slip",
traceability: "Traceability",
farmerDashboardTitle: "Farmer Dashboard",
farmerDashboardSubtitle: "Track your lots, status, QR slip, traceability and ledger.",
searchTitle: "Find My Lots",
searchPlaceholder: "Search (lotId / crop / village)",
load: "Load",
clear: "Clear",
totalLots: "Total Lots",
totalQty: "Total Qty",
noLots: "No lots found. Enter your phone and press Load."

    }
  },

  ta: {
    translation: {
    bookingTitle: "விவசாயி பதிவு",
bookingSubtitle: "உங்கள் விளைப்பொருட்களுக்கு குளிர் சேமிப்பை பதிவு செய்யுங்கள்.",
farmerName: "விவசாயி பெயர்",
phone: "தொலைபேசி",
village: "கிராமம்",
crop: "பயிர்",
qtyKg: "அளவு (கிலோ)",
expectedPrice: "எதிர்பார்க்கும் விலை (₹/கிலோ)",
hub: "ஹப் தேர்வு செய்யுங்கள்",
storageDays: "சேமிப்பு நாட்கள் (1-7)",
submit: "பதிவு உருவாக்கு",
success: "பதிவு வெற்றிகரமாக உருவாக்கப்பட்டது ✅",
failed: "பதிவு தோல்வி",
farmerDashTitle: "விவசாயி டாஷ்போர்டு",
farmerDashSubtitle: "உங்கள் லாட்களை பார்க்க உங்கள் போன் நம்பரை உள்ளிடுங்கள்.",
searchPhone: "தொலைபேசி எண்",
search: "தேடு",
noLots: "இந்த எண்ணிற்கு லாட்கள் இல்லை.",
lotId: "லாட் ஐடி",
qty: "அளவு (கிலோ)",
status: "நிலை",
hubName: "ஹப்",
created: "உருவான தேதி",
viewLedger: "லெட்ஜர்",
qrSlip: "QR ஸ்லிப்",
traceability: "ட்ரேஸபிலிட்டி",
farmerDashboardTitle: "Farmer Dashboard",
farmerDashboardSubtitle: "Track your lots, status, QR slip, traceability and ledger.",
searchTitle: "Find My Lots",
searchPlaceholder: "Search (lotId / crop / village)",
load: "Load",
clear: "Clear",
totalLots: "Total Lots",
totalQty: "Total Qty",
noLots: "No lots found. Enter your phone and press Load."


    }
  },

  te: {
    translation: {
      bookingTitle: "రైతు బుకింగ్",
bookingSubtitle: "మీ పంటకు కోల్డ్ స్టోరేజ్ బుక్ చేయండి.",
farmerName: "రైతు పేరు",
phone: "ఫోన్",
village: "గ్రామం",
crop: "పంట",
qtyKg: "పరిమాణం (కిలో)",
expectedPrice: "అంచనా ధర (₹/కిలో)",
hub: "హబ్ ఎంచుకోండి",
storageDays: "స్టోరేజ్ రోజులు (1-7)",
submit: "బుకింగ్ సృష్టించు",
success: "బుకింగ్ విజయవంతం ✅",
failed: "బుకింగ్ విఫలం",
farmerDashTitle: "రైతు డాష్‌బోర్డ్",
farmerDashSubtitle: "మీ లాట్లు చూడడానికి ఫోన్ నంబర్ ఇవ్వండి.",
searchPhone: "ఫోన్ నంబర్",
search: "శోధించండి",
noLots: "ఈ నంబర్‌కు లాట్లు లేవు.",
lotId: "లాట్ ఐడి",
qty: "మొత్తం (కిలో)",
status: "స్థితి",
hubName: "హబ్",
created: "తేదీ",
viewLedger: "లెడ్జర్",
qrSlip: "QR స్లిప్",
traceability: "ట్రేసబిలిటీ",
farmerDashboardTitle: "Farmer Dashboard",
farmerDashboardSubtitle: "Track your lots, status, QR slip, traceability and ledger.",
searchTitle: "Find My Lots",
searchPlaceholder: "Search (lotId / crop / village)",
load: "Load",
clear: "Clear",
totalLots: "Total Lots",
totalQty: "Total Qty",
noLots: "No lots found. Enter your phone and press Load."

    }
  },

  hi: {
    translation: {
      bookingTitle: "किसान बुकिंग",
bookingSubtitle: "अपनी उपज के लिए कोल्ड स्टोरेज बुक करें।",
farmerName: "किसान का नाम",
phone: "फोन",
village: "गाँव",
crop: "फसल",
qtyKg: "मात्रा (किलो)",
expectedPrice: "अपेक्षित कीमत (₹/किलो)",
hub: "हब चुनें",
storageDays: "स्टोरेज दिन (1-7)",
submit: "बुकिंग बनाएँ",
success: "बुकिंग सफल ✅",
failed: "बुकिंग असफल",
farmerDashTitle: "किसान डैशबोर्ड",
farmerDashSubtitle: "अपने लॉट्स देखने के लिए फोन नंबर दर्ज करें।",
searchPhone: "फोन नंबर",
search: "खोजें",
noLots: "इस नंबर के लिए कोई लॉट नहीं मिला।",
lotId: "लॉट आईडी",
qty: "मात्रा (किलो)",
status: "स्थिति",
hubName: "हब",
created: "तारीख",
viewLedger: "लेजर",
qrSlip: "QR स्लिप",
traceability: "ट्रेसबिलिटी",
farmerDashboardTitle: "Farmer Dashboard",
farmerDashboardSubtitle: "Track your lots, status, QR slip, traceability and ledger.",
searchTitle: "Find My Lots",
searchPlaceholder: "Search (lotId / crop / village)",
load: "Load",
clear: "Clear",
totalLots: "Total Lots",
totalQty: "Total Qty",
noLots: "No lots found. Enter your phone and press Load."

    }
  },

  ml: {
    translation: {
      bookingTitle: "കർഷക ബുക്കിംഗ്",
bookingSubtitle: "നിങ്ങളുടെ വിളയ്ക്ക് കോൾഡ് സ്റ്റോറേജ് ബുക്ക് ചെയ്യുക.",
farmerName: "കർഷകന്റെ പേര്",
phone: "ഫോൺ",
village: "ഗ്രാമം",
crop: "വിള",
qtyKg: "അളവ് (കിലോ)",
expectedPrice: "പ്രതീക്ഷിച്ച വില (₹/കിലോ)",
hub: "ഹബ് തിരഞ്ഞെടുക്കുക",
storageDays: "സ്റ്റോറേജ് ദിവസം (1-7)",
submit: "ബുക്കിംഗ് സൃഷ്ടിക്കുക",
success: "ബുക്കിംഗ് വിജയിച്ചു ✅",
failed: "ബുക്കിംഗ് പരാജയം",
farmerDashTitle: "കർഷക ഡാഷ്ബോർഡ്",
farmerDashSubtitle: "ലോട്ടുകൾ കാണാൻ ഫോൺ നമ്പർ നൽകുക.",
searchPhone: "ഫോൺ നമ്പർ",
search: "തിരയുക",
noLots: "ഈ നമ്പറിന് ലോട്ടുകൾ ഇല്ല.",
lotId: "ലോട്ട് ഐഡി",
qty: "അളവ് (കിലോ)",
status: "സ്റ്റാറ്റസ്",
hubName: "ഹബ്",
created: "തീയതി",
viewLedger: "ലെഡ്ജർ",
qrSlip: "QR സ്ലിപ്പ്",
traceability: "ട്രേസബിലിറ്റി"

    }
  }
};

i18n.use(initReactI18next).init({
  resources,
  lng: localStorage.getItem("lang") || "en",
  fallbackLng: "en",
  interpolation: { escapeValue: false }
});

export default i18n;

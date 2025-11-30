# FarmerRequestsScreen Translation Guide

## ✅ Completed

1. **FarmerRequestsScreen.tsx** - Added `useTranslation` hook and replaced all hardcoded strings
2. **src/locales/en/translation.json** - Added complete `requests.farmer` section

---

## 📝 Manual Steps Required

### For Hindi (`src/locales/hi/translation.json`)

**Open the file and add this section inside the existing `"requests"` object (after the `"empty"` section):**

```json
      "farmer": {
        "title": "अनुरोध",
        "subtitle": "{{total}} में से {{filtered}} अनुरोध",
        "subtitleWithProduct": "{{productName}} के लिए {{filtered}} अनुरोध",
        "searchPlaceholder": "खरीदार, उत्पाद, स्थान खोजें...",
        "manage": "प्रबंधन",
        "done": "पूर्ण",
        "selected": "{{count}} चयनित",
        "bulkAccept": "स्वीकार करें",
        "bulkReject": "अस्वीकार करें",
        "accept": "स्वीकार करें",
        "reject": "अस्वीकार करें",
        "contact": "संपर्क करें",
        "clearFilter": "\"{{productName}}\" के लिए फ़िल्टर साफ़ करें",
        "showAllRequests": "सभी अनुरोध दिखाएं",
        "filterBadge": "{{productName}}",
        "requested": "अनुरोधित:",
        "yourPrice": "आपकी कीमत:",
        "buyerMessage": "संदेश :",
        "buyerMessageLabel": "खरीदार संदेश",
        "noMessageProvided": "कोई संदेश प्रदान नहीं किया गया",
        "loadingRequests": "अनुरोध लोड हो रहे हैं...",
        "requestAccepted": "अनुरोध स्वीकृत",
        "requestAcceptedMessage": "अनुरोध सफलतापूर्वक स्वीकार किया गया",
        "requestRejected": "अनुरोध अस्वीकृत",
        "requestRejectedMessage": "अनुरोध सफलतापूर्वक अस्वीकार किया गया",
        "requestsAccepted": "अनुरोध स्वीकृत",
        "requestsAcceptedMessage": "{{count}} अनुरोध सफलतापूर्वक स्वीकार किए गए",
        "requestsRejected": "अनुरोध अस्वीकृत",
        "requestsRejectedMessage": "{{count}} अनुरोध सफलतापूर्वक अस्वीकार किए गए",
        "errorTitle": "त्रुटि",
        "errorAccept": "अनुरोध स्वीकार करने में विफल",
        "errorReject": "अनुरोध अस्वीकार करने में विफल",
        "errorBulkAccept": "अनुरोध स्वीकार करने में विफल",
        "errorBulkReject": "अनुरोध अस्वीकार करने में विफल",
        "errorLoadingTitle": "अनुरोध लोड करने में त्रुटि",
        "errorLoadingMessage": "अनुरोध लोड करने में विफल। कृपया पुनः प्रयास करें।",
        "emptyNoProduct": "{{productName}} के लिए कोई अनुरोध नहीं",
        "emptyNoProductSubtext": "इस उत्पाद को अभी तक कोई अनुरोध प्राप्त नहीं हुआ है",
        "showAllButton": "सभी अनुरोध दिखाएं"
      }
```

---

### For Marathi (`src/locales/mr/translation.json`)

**Open the file and add this section inside the existing `"requests"` object (after the `"empty"` section):**

```json
      "farmer": {
        "title": "विनंत्या",
        "subtitle": "{{total}} पैकी {{filtered}} विनंत्या",
        "subtitleWithProduct": "{{productName}} साठी {{filtered}} विनंत्या",
        "searchPlaceholder": "खरेदीदार, उत्पादने, स्थान शोधा...",
        "manage": "व्यवस्थापन",
        "done": "पूर्ण",
        "selected": "{{count}} निवडले",
        "bulkAccept": "स्वीकारा",
        "bulkReject": "नाकारा",
        "accept": "स्वीकारा",
        "reject": "नाकारा",
        "contact": "संपर्क करा",
        "clearFilter": "\"{{productName}}\" साठी फिल्टर साफ करा",
        "showAllRequests": "सर्व विनंत्या दाखवा",
        "filterBadge": "{{productName}}",
        "requested": "विनंती केली:",
        "yourPrice": "तुमची किंमत:",
        "buyerMessage": "संदेश :",
        "buyerMessageLabel": "खरेदीदार संदेश",
        "noMessageProvided": "कोणताही संदेश दिला नाही",
        "loadingRequests": "विनंत्या लोड होत आहेत...",
        "requestAccepted": "विनंती स्वीकारली",
        "requestAcceptedMessage": "विनंती यशस्वीरित्या स्वीकारली",
        "requestRejected": "विनंती नाकारली",
        "requestRejectedMessage": "विनंती यशस्वीरित्या नाकारली",
        "requestsAccepted": "विनंत्या स्वीकारल्या",
        "requestsAcceptedMessage": "{{count}} विनंत्या यशस्वीरित्या स्वीकारल्या",
        "requestsRejected": "विनंत्या नाकारल्या",
        "requestsRejectedMessage": "{{count}} विनंत्या यशस्वीरित्या नाकारल्या",
        "errorTitle": "त्रुटी",
        "errorAccept": "विनंती स्वीकारण्यात अयशस्वी",
        "errorReject": "विनंती नाकारण्यात अयशस्वी",
        "errorBulkAccept": "विनंत्या स्वीकारण्यात अयशस्वी",
        "errorBulkReject": "विनंत्या नाकारण्यात अयशस्वी",
        "errorLoadingTitle": "विनंत्या लोड करताना त्रुटी",
        "errorLoadingMessage": "विनंत्या लोड करण्यात अयशस्वी. कृपया पुन्हा प्रयत्न करा.",
        "emptyNoProduct": "{{productName}} साठी कोणत्याही विनंत्या नाहीत",
        "emptyNoProductSubtext": "या उत्पादनासाठी अद्याप कोणत्याही विनंत्या आलेल्या नाहीत",
        "showAllButton": "सर्व विनंत्या दाखवा"
      }
```

---

## 📊 Summary of Changes

### Files Modified:
1. ✅ **FarmerRequestsScreen.tsx** - Added `useTranslation` hook and replaced ~50 hardcoded strings
2. ✅ **src/locales/en/translation.json** - Added complete `requests.farmer` section
3. ⏳ **src/locales/hi/translation.json** - Needs manual addition (Hindi translations provided above)
4. ⏳ **src/locales/mr/translation.json** - Needs manual addition (Marathi translations provided above)

### Translation Keys Added: 40+ keys for farmer-specific features:
- `requests.farmer.title` - Screen title
- `requests.farmer.subtitle` - Subtitle with counts
- `requests.farmer.searchPlaceholder` - Search input placeholder
- `requests.farmer.manage/done` - Manage mode toggle
- `requests.farmer.accept/reject` - Action buttons
- `requests.farmer.bulkAccept/bulkReject` - Bulk actions
- `requests.farmer.contact` - Contact button
- `requests.farmer.requested/yourPrice` - Item details
- `requests.farmer.buyerMessage` - Message labels
- `requests.farmer.loadingRequests` - Loading state
- `requests.farmer.requestAccepted/requestRejected` - Success toasts
- `requests.farmer.requestsAccepted/requestsRejected` - Bulk success toasts
- `requests.farmer.error*` - Error messages
- `requests.farmer.empty*` - Empty state messages
- `requests.farmer.clearFilter` - Filter management
- `requests.farmer.showAllRequests/showAllButton` - Navigation

---

## 🔍 Location in Translation Files

The new `farmer` section should be added **inside the existing `requests` object**, after the `empty` section and before the closing brace of `requests`.

The structure should look like this:

```json
{
  "requests": {
    "sendRequestTitle": "...",
    "toFarmer": "...",
    // ... other existing keys ...
    "empty": {
      "noMatching": "...",
      "noRequests": "...",
      // ... other empty keys ...
    },
    "farmer": {
      // ADD THE NEW FARMER SECTION HERE
    }
  }
}
```

---

## ✅ Testing Checklist

After adding the translations:

- [ ] English language displays correctly (already working)
- [ ] Hindi language displays correctly (after manual addition)
- [ ] Marathi language displays correctly (after manual addition)
- [ ] All buttons and labels are translated
- [ ] Toast messages appear in selected language
- [ ] Alert dialogs are translated
- [ ] Empty states show translated text
- [ ] Search placeholder is translated
- [ ] Filter chips show translated text
- [ ] Manage mode toggle works in all languages
- [ ] Bulk action buttons are translated
- [ ] Product filter badge is translated

---

**Status**: Component code complete, English translations added, Hindi & Marathi ready for manual addition  
**Date**: October 1, 2025  
**Project**: Krushimandi-app  
**Component**: FarmerRequestsScreen

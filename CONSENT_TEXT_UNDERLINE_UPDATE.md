# Consent Text Underline Implementation

## ✅ Changes Made

### Summary
Added underline styling to "Terms & Conditions and Privacy Policy" text in the OTP verification screen. The implementation is **language-agnostic** and works correctly regardless of where the underlined text appears in different languages.

---

## 📝 Implementation Details

### 1. **Translation Files Updated**

Split the consent text into three parts for flexible styling:

#### **English** (`src/locales/en/translation.json`)
```json
"consent": "By continuing, you agree to our ",
"consentLink": "Terms & Conditions and Privacy Policy",
"consentEnd": ".",
```

#### **Hindi** (`src/locales/hi/translation.json`)
```json
"consent": "आगे बढ़कर, आप हमारी ",
"consentLink": "शर्तों और गोपनीयता नीति",
"consentEnd": " से सहमत होते हैं।",
```

#### **Marathi** (`src/locales/mr/translation.json`)
```json
"consent": "पुढे जाताना, आपण आमच्या ",
"consentLink": "अटी व शर्ती आणि गोपनीयता धोरणास",
"consentEnd": " सहमती देता.",
```

---

### 2. **UI Component Updated** (`OTPVerificationScreen.jsx`)

**Before:**
```jsx
<Text style={styles.instructionText}>
  {t('auth.otp.consent')}
</Text>
```

**After:**
```jsx
<Text style={styles.instructionText}>
  {t('auth.otp.consent')}
  <Text style={styles.instructionTextUnderline}>
    {t('auth.otp.consentLink')}
  </Text>
  {t('auth.otp.consentEnd')}
</Text>
```

---

### 3. **New Style Added**

```jsx
instructionTextUnderline: {
  textDecorationLine: 'underline',
  color: '#007E2F',
  fontWeight: '500',
},
```

---

## 🎨 Visual Result

The text will now render as:

**English:**
> By continuing, you agree to our <u style="color:#007E2F">**Terms & Conditions and Privacy Policy**</u>.

**Hindi:**
> आगे बढ़कर, आप हमारी <u style="color:#007E2F">**शर्तों और गोपनीयता नीति**</u> से सहमत होते हैं।

**Marathi:**
> पुढे जाताना, आपण आमच्या <u style="color:#007E2F">**अटी व शर्ती आणि गोपनीयता धोरणास**</u> सहमती देता.

---

## ✨ Key Features

1. **Language-Agnostic**: Works correctly in all languages regardless of text order
2. **Styled Independently**: The underlined portion has distinct color (#007E2F - green) and bold weight
3. **Maintains Functionality**: Still tappable - opens PrivacyOnly screen when pressed
4. **Accessible**: Proper accessibility labels maintained

---

## 🔧 How It Works

The solution uses **nested Text components** in React Native:
- Parent `Text` component has the base style (`instructionText`)
- Child `Text` component adds additional styling (`instructionTextUnderline`)
- This allows the underline to appear only on the specific part of the text
- The translation keys are split into three parts: prefix + link + suffix
- Each language can have different word order while maintaining the same visual effect

---

## 📱 Testing

To verify the changes:
1. Run the app and navigate to OTP Verification screen
2. Check that "Terms & Conditions and Privacy Policy" is underlined and green
3. Test in all three languages (English, Hindi, Marathi)
4. Verify that tapping the text opens the Privacy Policy screen

---

## 🌍 Adding New Languages

When adding new languages in the future, use the same pattern:

```json
"consent": "[text before link] ",
"consentLink": "[the part to be underlined]",
"consentEnd": "[text after link]"
```

The UI will automatically apply the underline styling to the `consentLink` portion.

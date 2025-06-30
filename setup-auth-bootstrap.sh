#!/bin/bash

# Auth Bootstrap Setup Script
# Run this script to ensure all bootstrap components are properly integrated

echo "🚀 Setting up Auth Bootstrap System..."

# Check if all required files exist
echo "📋 Checking required files..."

required_files=(
  "src/utils/authBootstrap.ts"
  "src/components/common/AppBootstrapScreen.tsx" 
  "src/components/providers/AuthStateProvider.tsx"
  "src/hooks/useAuthBootstrap.ts"
  "AUTH_BOOTSTRAP_SYSTEM.md"
)

missing_files=()

for file in "${required_files[@]}"; do
  if [ ! -f "$file" ]; then
    missing_files+=("$file")
  else
    echo "  ✅ $file"
  fi
done

if [ ${#missing_files[@]} -gt 0 ]; then
  echo "❌ Missing files:"
  for file in "${missing_files[@]}"; do
    echo "  - $file"
  done
  echo "Please ensure all bootstrap files are created."
  exit 1
fi

echo "✅ All required files present"

# Check if App.tsx has been updated
echo "📋 Checking App.tsx integration..."
if grep -q "AppBootstrapScreen" App.tsx; then
  echo "  ✅ AppBootstrapScreen integrated in App.tsx"
else
  echo "  ❌ App.tsx not updated - please integrate AppBootstrapScreen"
  exit 1
fi

# Check if AppNavigator has been updated
echo "📋 Checking AppNavigator integration..."
if grep -q "AuthBootstrapState" src/navigation/AppNavigator.tsx; then
  echo "  ✅ AppNavigator uses bootstrap state"
else
  echo "  ❌ AppNavigator not updated - please integrate bootstrap state"
  exit 1
fi

# Test TypeScript compilation
echo "📋 Testing TypeScript compilation..."
if command -v npx &> /dev/null; then
  if npx tsc --noEmit --skipLibCheck; then
    echo "  ✅ TypeScript compilation successful"
  else
    echo "  ❌ TypeScript compilation failed - please fix errors"
    exit 1
  fi
else
  echo "  ⚠️ npx not found - skipping TypeScript check"
fi

echo ""
echo "🎉 Auth Bootstrap System setup complete!"
echo ""
echo "📖 Next steps:"
echo "  1. Run 'npm start' or 'yarn start' to test the app"
echo "  2. Check the console for bootstrap debug logs"
echo "  3. Verify auth state persists after app restart"
echo "  4. Test development build/install flow"
echo ""
echo "📚 Documentation: See AUTH_BOOTSTRAP_SYSTEM.md for detailed usage"
echo ""

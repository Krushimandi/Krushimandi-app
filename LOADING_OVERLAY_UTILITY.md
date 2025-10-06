# LoadingOverlay Utility

A reusable full-screen loading overlay component with transparent black background and a simple spinner.

## Location
`src/utils/LoadingOverlay.tsx`

## Features
✅ Full-screen transparent overlay
✅ Simple Activity Indicator (spinner)
✅ Optional loading message
✅ Customizable colors and opacity
✅ Prevents user interaction during loading
✅ Status bar integration
✅ Modal-based (renders on top of all content)
✅ TypeScript support

## Usage

### Basic Usage
```tsx
import LoadingOverlay from '../../utils/LoadingOverlay';

const MyComponent = () => {
  const [loading, setLoading] = useState(false);

  return (
    <View>
      {/* Your content */}
      
      <LoadingOverlay visible={loading} />
    </View>
  );
};
```

### With Custom Message
```tsx
<LoadingOverlay 
  visible={isLoading} 
  message="Switching role..." 
/>
```

### With Custom Colors
```tsx
<LoadingOverlay 
  visible={isLoading}
  message="Processing..."
  spinnerColor="#43B86C"
  backgroundColor="#000000"
  opacity={0.8}
/>
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `visible` | `boolean` | **Required** | Controls overlay visibility |
| `message` | `string` | `undefined` | Optional loading message below spinner |
| `spinnerColor` | `string` | `'#FFFFFF'` | Color of the spinner |
| `spinnerSize` | `'small' \| 'large'` | `'large'` | Size of the spinner |
| `backgroundColor` | `string` | `'#000000'` | Background color (without alpha) |
| `opacity` | `number` | `0.7` | Background opacity (0-1) |

## Examples

### Example 1: Role Switching (ProfileScreen)
```tsx
const [isRoleSwitching, setIsRoleSwitching] = useState(false);

const handleRoleSwitch = async () => {
  setIsRoleSwitching(true);
  try {
    await updateRole();
    // Success
  } catch (error) {
    // Error
  } finally {
    setIsRoleSwitching(false);
  }
};

return (
  <>
    <Button onPress={handleRoleSwitch} />
    
    <LoadingOverlay
      visible={isRoleSwitching}
      message={t('common.loading')}
      spinnerColor="#43B86C"
    />
  </>
);
```

### Example 2: Data Upload
```tsx
const [uploading, setUploading] = useState(false);

const uploadData = async () => {
  setUploading(true);
  try {
    await uploadToServer();
  } finally {
    setUploading(false);
  }
};

return (
  <LoadingOverlay 
    visible={uploading}
    message="Uploading data..."
    spinnerColor="#4F46E5"
  />
);
```

### Example 3: Silent Loading (No Message)
```tsx
<LoadingOverlay 
  visible={loading}
  spinnerColor="#FFFFFF"
  opacity={0.5}
/>
```

## Implementation Details

### Modal-Based
- Uses React Native's `Modal` component
- Renders on top of all other content
- Blocks user interaction when visible
- Prevents back button dismiss during loading

### Status Bar Integration
- Sets status bar to match overlay appearance
- Uses `statusBarTranslucent` for seamless look

### Opacity Calculation
- Converts `opacity` prop (0-1) to hex alpha channel
- Appends to `backgroundColor` for proper transparency

### Accessibility
- Prevents modal close during loading (empty `onRequestClose`)
- Ensures users don't accidentally dismiss critical operations

## Styling

The overlay uses centered flexbox layout:
```tsx
overlay: {
  flex: 1,
  justifyContent: 'center',
  alignItems: 'center',
}
```

Message text is styled for visibility:
```tsx
message: {
  fontSize: 16,
  fontWeight: '500',
  textAlign: 'center',
  paddingHorizontal: 32,
  marginTop: 8,
}
```

## Best Practices

### ✅ DO:
- Use for operations that take 1+ seconds
- Show descriptive messages for longer operations
- Always hide overlay in `finally` block
- Use for: API calls, file uploads, role changes, data processing

### ❌ DON'T:
- Use for instant operations (< 500ms)
- Show for every button press
- Forget to hide the overlay (causes UI freeze)
- Use for multiple simultaneous operations without state management

## Integration Points

### Current Integrations:
1. **ProfileScreen** - Role switching
   - Location: `src/components/ProfileScreen/ProfileScreen.tsx`
   - Usage: Switching between Farmer and Buyer roles
   - Message: Translated loading text

### Potential Integrations:
- [ ] Login/Authentication flow
- [ ] Image upload in EditProfile
- [ ] Fruit listing creation/update
- [ ] Chat message sending (for large media)
- [ ] Profile data sync
- [ ] Bulk operations

## Performance

- Lightweight: ~100 lines including types and styles
- No external dependencies beyond React Native core
- Minimal re-render impact (controlled by single `visible` prop)
- Modal optimization: Only renders when `visible={true}`

## Localization

Messages support i18next translations:
```tsx
<LoadingOverlay
  visible={loading}
  message={t('common.processing')}
/>
```

## Migration Guide

### Before (Inline Loading):
```tsx
{isLoading && (
  <View style={styles.loadingOverlay}>
    <ActivityIndicator size="large" color="#FFF" />
  </View>
)}
```

### After (Using LoadingOverlay):
```tsx
<LoadingOverlay visible={isLoading} />
```

**Benefits:**
- Consistent styling across app
- Less code duplication
- Centralized maintenance
- Better UX (status bar integration)

## Troubleshooting

### Overlay not showing:
- Check `visible` prop is `true`
- Ensure component is mounted
- Verify no z-index conflicts

### Spinner not visible:
- Check `spinnerColor` matches background
- Try increasing opacity
- Verify `spinnerSize` is appropriate

### Can't dismiss overlay:
- Ensure you set `visible={false}` after operation
- Check for errors in async operations
- Use `finally` block to guarantee hiding

## Future Enhancements

Possible additions:
- [ ] Progress bar option
- [ ] Custom spinner components
- [ ] Timeout auto-dismiss
- [ ] Queue multiple loading states
- [ ] Animation options (fade, scale)
- [ ] Haptic feedback on show/hide

## Related Files

- **Component:** `src/utils/LoadingOverlay.tsx`
- **Usage:** `src/components/ProfileScreen/ProfileScreen.tsx`
- **Documentation:** `LOADING_OVERLAY_UTILITY.md`

## Change Log

### v1.0.0 (Current)
- ✅ Initial implementation
- ✅ TypeScript support
- ✅ Customizable props
- ✅ Status bar integration
- ✅ Integrated in ProfileScreen for role switching

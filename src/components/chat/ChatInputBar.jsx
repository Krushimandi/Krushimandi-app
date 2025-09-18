import React, { useCallback, useEffect, useRef, useState, forwardRef, useImperativeHandle } from 'react';
import { View, TextInput, Text, TouchableOpacity, StyleSheet, Platform, Keyboard, Dimensions } from 'react-native';
import Feather from 'react-native-vector-icons/Feather';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const COLORS = {
    primary: '#10B981',
    text: '#111827',
    textSecondary: '#6B7280',
    border: '#E5E7EB',
    surface: '#FFFFFF',
    danger: '#EF4444',
};

export const ChatInputBar = forwardRef(({
    value,
    onChangeText,
    onSend,
    onHeightChange,
    maxLength = 1000,
    placeholder = 'Type your message...',
    onFocus,
}, ref) => {
    const insets = useSafeAreaInsets();
    const [inputHeight, setInputHeight] = useState(48);
    const textInputRef = useRef(null);

    useImperativeHandle(ref, () => ({
        focus: () => textInputRef.current?.focus(),
        blur: () => textInputRef.current?.blur(),
        clear: () => textInputRef.current?.clear(),
    }));

    const handleContentSizeChange = useCallback((e) => {
        const h = e.nativeEvent.contentSize.height;
        const next = Math.min(Math.max(h + 24, 48), 140); // allow a bit taller here
        setInputHeight(prev => (Math.abs(prev - next) > 1 ? next : prev));
    }, []);

    // Force blur if keyboard hides but RN still thinks the input is focused (Android back button case)
    useEffect(() => {
        const hideSubscription = Keyboard.addListener('keyboardDidHide', () => {
            if (textInputRef.current?.isFocused?.()) {
                const windowHeight = Dimensions.get("window").height;
                console.log("chat Keyboard hidden, window height:", windowHeight);

                textInputRef.current.blur();

            }
        });

        const showSubscription = Keyboard.addListener("keyboardDidShow", (e) => {
            const windowHeight = Dimensions.get("window").height;
            console.log("chat Keyboard visible, height:", e.endCoordinates.height, "window height:", windowHeight);
        });
        return () => {
            hideSubscription.remove();
            showSubscription.remove();
        };

    }, []);

    // Report total bar height upward (input + paddings + safe area + actions panel if open)
    useEffect(() => {
        const base = inputHeight + 32 + Math.max(insets.bottom, 12); // wrapper paddings
        onHeightChange && onHeightChange(base);
    }, [inputHeight, insets.bottom, onHeightChange]);

    const handleSend = useCallback(() => {
        if (!value.trim()) return;
        onSend && onSend(value.trim());
    }, [value, onSend]);

    return (
        <View style={styles.container}>
            <View style={[styles.inputWrapper, { paddingBottom: Math.max(insets.bottom * 0.65, 12) }]}>
                <View style={styles.row}>
                    <View style={[styles.textInputContainer, { minHeight: inputHeight }]}>
                        <TextInput
                            ref={textInputRef}
                            style={[styles.textInput, { minHeight: inputHeight }]}
                            value={value}
                            onChangeText={onChangeText}
                            placeholder={placeholder}
                            placeholderTextColor={COLORS.textSecondary}
                            multiline
                            maxLength={maxLength}
                            onContentSizeChange={handleContentSizeChange}
                            selectionColor={COLORS.primary}
                            blurOnSubmit={false}
                            onSubmitEditing={handleSend}
                            onFocus={onFocus}
                            accessibilityLabel="Message input field"
                            accessibilityHint="Double tap to start typing"
                        />
                        {value.length > maxLength - 200 && (
                            <View style={styles.counter}><Text style={styles.counterText}>{maxLength - value.length}</Text></View>
                        )}
                    </View>

                    <TouchableOpacity
                        onPress={handleSend}
                        disabled={!value.trim()}
                        style={[styles.sendBtn, value.trim() && styles.sendBtnActive]}
                        accessibilityLabel={value.trim() ? 'Send message' : 'Type a message to send'}
                        accessibilityRole="button"
                    >
                        <Feather name="send" size={20} color={value.trim() ? '#FFF' : COLORS.textSecondary} />
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    );
});

const styles = StyleSheet.create({
    container: {
        // Parent supplies positioning; keep full width
        width: '100%',
    },
    inputWrapper: {
        backgroundColor: COLORS.surface,
        borderTopWidth: 1,
        borderTopColor: COLORS.border,
        paddingTop: 12,
        paddingHorizontal: 12,
    },
    row: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        gap: 8,
    },
    textInputContainer: {
        flex: 1,
        borderWidth: 1.5,
        borderColor: 'rgba(229,231,235,0.6)',
        backgroundColor: 'rgba(249,250,251,0.9)',
        borderRadius: 24,
        paddingHorizontal: 16,
        maxHeight: 140,
        position: 'relative',
        justifyContent: 'center',
    },
    textInput: {
        fontSize: 16,
        color: COLORS.text,
        lineHeight: 22,
        fontWeight: '400',
        textAlignVertical: 'center',
        paddingVertical: Platform.OS === 'android' ? 8 : 0,
    },
    counter: {
        position: 'absolute',
        bottom: 4,
        right: 8,
        backgroundColor: 'rgba(107,114,128,0.15)',
        borderRadius: 8,
        paddingHorizontal: 6,
        paddingVertical: 2,
    },
    counterText: { fontSize: 10, color: COLORS.textSecondary, fontWeight: '500' },
    sendBtn: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: 'rgba(229,231,235,0.8)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    sendBtnActive: { backgroundColor: COLORS.primary },
    // attachment/actions styles removed
});

export default ChatInputBar;

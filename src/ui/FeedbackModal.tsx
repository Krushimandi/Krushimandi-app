import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
    View,
    Text,
    Modal,
    TouchableOpacity,
    TextInput,
    Animated,
    Dimensions,
    StyleSheet,
    KeyboardAvoidingView,
    Platform,
} from 'react-native';

const { width, height } = Dimensions.get('window');

// Type definitions
export interface FeedbackData {
    rating: 'good' | 'neutral' | 'bad';
    feedback: string;
}

interface Rating {
    id: 'good' | 'neutral' | 'bad';
    emoji: string;
    label: string;
}

interface FeedbackModalProps {
    isVisible: boolean;
    onClose: () => void;
    onSubmit: (data: FeedbackData) => void;
}

interface AppProps { }

// Custom Icon component for close button
const CloseIcon: React.FC = () => (
    <View style={styles.closeIcon}>
        <View style={styles.closeLine1} />
        <View style={styles.closeLine2} />
    </View>
);

// Feedback Modal Component
const FeedbackModal: React.FC<FeedbackModalProps> = ({ isVisible, onClose, onSubmit }) => {
    const { t } = useTranslation();
    const [selectedRating, setSelectedRating] = useState<'good' | 'neutral' | 'bad' | null>(null);
    const [feedback, setFeedback] = useState<string>('');
    const [slideAnim] = useState<Animated.Value>(new Animated.Value(height));
    const [fadeAnim] = useState<Animated.Value>(new Animated.Value(0));
    const [labelAnim] = useState<Animated.Value>(new Animated.Value(0));

    const ratings: Rating[] = [
        { id: 'good', emoji: '😊', label: 'Really Good' },
        { id: 'neutral', emoji: '😐', label: 'Okay' },
        { id: 'bad', emoji: '😞', label: 'Not Good' }
    ];

    useEffect(() => {
        if (isVisible) {

            // Animate modal in
            Animated.parallel([
                Animated.timing(slideAnim, {
                    toValue: 0,
                    duration: 300,
                    useNativeDriver: true,
                }),
                Animated.timing(fadeAnim, {
                    toValue: 1,
                    duration: 300,
                    useNativeDriver: true,
                }),
            ]).start();
        } else {
            // Reset animations when modal closes
            slideAnim.setValue(height);
            fadeAnim.setValue(0);
            labelAnim.setValue(0);
        }
    }, [isVisible, slideAnim, fadeAnim, labelAnim]);

    useEffect(() => {
        if (selectedRating) {
            // Animate label in
            Animated.timing(labelAnim, {
                toValue: 1,
                duration: 200,
                useNativeDriver: true,
            }).start();
        } else {
            labelAnim.setValue(0);
        }
    }, [selectedRating, labelAnim]);

    const handleClose = (): void => {
        Animated.parallel([
            Animated.timing(slideAnim, {
                toValue: height,
                duration: 250,
                useNativeDriver: true,
            }),
            Animated.timing(fadeAnim, {
                toValue: 0,
                duration: 250,
                useNativeDriver: true,
            }),
        ]).start(() => {
            onClose();
            setSelectedRating(null);
            setFeedback('');
        });
    };

    const handleSubmit = (): void => {
        if (selectedRating) {
            const feedbackData: FeedbackData = {
                rating: selectedRating,
                feedback: feedback.trim()
            };

            onSubmit(feedbackData);
            handleClose();
        }
    };

    const handleRatingPress = (ratingId: 'good' | 'neutral' | 'bad'): void => {
        setSelectedRating(ratingId);
    };

    const handleFeedbackChange = (text: string): void => {
        setFeedback(text);
    };

    const getRatingButtonStyle = (ratingId: 'good' | 'neutral' | 'bad') => {
        if (selectedRating === ratingId) {
            return ratingId === 'good' ? styles.selectedGood : styles.selectedNeutral;
        }
        return {};
    };

    return (
        <Modal
            visible={isVisible}
            transparent
            animationType="none"
            onRequestClose={handleClose}
        >
            <KeyboardAvoidingView
                style={styles.container}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            >
                <Animated.View style={[styles.backdrop, { opacity: fadeAnim }]}>
                    <TouchableOpacity
                        style={styles.backdropTouch}
                        activeOpacity={1}
                        onPress={handleClose}
                    />
                </Animated.View>

                <Animated.View
                    style={[
                        styles.modalContainer,
                        {
                            transform: [{ translateY: slideAnim }]
                        }
                    ]}
                >
                    {/* Header */}
                    <View style={styles.header}>
                        <HeaderTitle />
                        <TouchableOpacity
                            style={styles.closeButton}
                            onPress={handleClose}
                            activeOpacity={0.7}
                        >
                            <CloseIcon />
                        </TouchableOpacity>
                    </View>

                    {/* Content */}
                    <View style={styles.content}>
                        {/* Title and Description */}
                        <View style={styles.titleContainer}>
                            <TitleBlock />
                        </View>

                        {/* Rating Options */}
                        <View style={styles.ratingContainer}>
                            {ratings.map((rating) => (
                                <View key={rating.id} style={styles.ratingItem}>
                                    <TouchableOpacity
                                        style={[
                                            styles.emojiButton,
                                            getRatingButtonStyle(rating.id)
                                        ]}
                                        onPress={() => handleRatingPress(rating.id)}
                                        activeOpacity={0.8}
                                    >
                                        <Text style={styles.emoji}>{rating.emoji}</Text>
                                    </TouchableOpacity>

                                    {selectedRating === rating.id && (
                                        <Animated.View
                                            style={[
                                                styles.ratingLabel,
                                                {
                                                    opacity: labelAnim,
                                                    transform: [
                                                        {
                                                            translateY: labelAnim.interpolate({
                                                                inputRange: [0, 1],
                                                                outputRange: [10, 0],
                                                            }),
                                                        },
                                                    ],
                                                },
                                            ]}
                                        >
                                            <Text style={styles.ratingLabelText}>{rating.label}</Text>
                                        </Animated.View>
                                    )}
                                </View>
                            ))}
                        </View>

                        {/* Feedback Text Input */}
                        <View style={styles.feedbackContainer}>
                            <TextInput
                                style={styles.feedbackInput}
                                value={feedback}
                                onChangeText={handleFeedbackChange}
                                placeholder={t('feedback.placeholder', 'Share feedback...')}
                                placeholderTextColor="#9CA3AF"
                                multiline
                                maxLength={500}
                                textAlignVertical="top"
                            />
                            <Text style={styles.characterCount}>
                                {feedback.length}/500
                            </Text>
                        </View>

                        {/* Submit Button */}
                        <TouchableOpacity
                            style={[
                                styles.submitButton,
                                !selectedRating && styles.submitButtonDisabled
                            ]}
                            onPress={handleSubmit}
                            disabled={!selectedRating}
                            activeOpacity={0.8}
                        >
                            <Text style={[
                                styles.submitButtonText,
                                !selectedRating && styles.submitButtonTextDisabled
                            ]}>
                                {t('feedback.submit', 'Submit Review')}
                            </Text>
                        </TouchableOpacity>
                    </View>
                </Animated.View>
            </KeyboardAvoidingView>
        </Modal>
    );
};

const styles = StyleSheet.create({
    // Modal Styles
    container: {
        flex: 1,
    },
    backdrop: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.4)',
    },
    backdropTouch: {
        flex: 1,
    },
    modalContainer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: '#FFFFFF',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        maxHeight: height * 0.85,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 16,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 24,
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#374151',
    },
    closeButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#F9FAFB',
        justifyContent: 'center',
        alignItems: 'center',
    },
    closeIcon: {
        width: 16,
        height: 16,
        position: 'relative',
    },
    closeLine1: {
        position: 'absolute',
        width: 16,
        height: 2,
        backgroundColor: '#6B7280',
        top: 7,
        transform: [{ rotate: '45deg' }],
    },
    closeLine2: {
        position: 'absolute',
        width: 16,
        height: 2,
        backgroundColor: '#6B7280',
        top: 7,
        transform: [{ rotate: '-45deg' }],
    },
    content: {
        paddingHorizontal: 24,
        paddingVertical: 32,
    },
    titleContainer: {
        alignItems: 'center',
        marginBottom: 40,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#111827',
        textAlign: 'center',
        marginBottom: 16,
        lineHeight: 32,
    },
    description: {
        fontSize: 14,
        color: '#6B7280',
        textAlign: 'center',
        lineHeight: 20,
        maxWidth: 300,
    },
    ratingContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'flex-start',
        marginBottom: 40,
        paddingHorizontal: 20,
    },
    ratingItem: {
        alignItems: 'center',
        marginHorizontal: 12,
    },
    emojiButton: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: '#E5E7EB',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    selectedGood: {
        backgroundColor: '#FBBF24',
        shadowColor: '#FBBF24',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 8,
    },
    selectedNeutral: {
        backgroundColor: '#9CA3AF',
        shadowColor: '#9CA3AF',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 8,
    },
    emoji: {
        fontSize: 28,
    },
    ratingLabel: {
        marginTop: 12,
        backgroundColor: '#0D9488',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        shadowColor: '#0D9488',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 4,
    },
    ratingLabelText: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '500',
    },
    feedbackContainer: {
        marginBottom: 32,
    },
    feedbackInput: {
        height: 112,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        borderRadius: 16,
        padding: 16,
        fontSize: 14,
        color: '#374151',
        backgroundColor: '#FFFFFF',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
    },
    characterCount: {
        textAlign: 'right',
        fontSize: 12,
        color: '#9CA3AF',
        marginTop: 4,
    },
    submitButton: {
        backgroundColor: '#0D9488',
        paddingVertical: 16,
        borderRadius: 16,
        alignItems: 'center',
        shadowColor: '#0D9488',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 8,
    },
    submitButtonDisabled: {
        backgroundColor: '#D1D5DB',
        shadowColor: '#000',
        shadowOpacity: 0.1,
        elevation: 2,
    },
    submitButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '600',
    },
    submitButtonTextDisabled: {
        color: '#9CA3AF',
    },

    // Demo App Styles
    appContainer: {
        flex: 1,
        backgroundColor: '#F9FAFB',
    },
    demoScreen: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 24,
    },
    demoTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#111827',
        marginBottom: 24,
        textAlign: 'center',
    },
    demoDescription: {
        fontSize: 16,
        color: '#6B7280',
        textAlign: 'center',
        lineHeight: 24,
        marginBottom: 32,
        maxWidth: 300,
    },
    demoButton: {
        backgroundColor: '#0D9488',
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 8,
        shadowColor: '#0D9488',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 8,
    },
    demoButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '600',
    },
    instructionsContainer: {
        marginTop: 32,
        backgroundColor: '#FFFFFF',
        padding: 16,
        borderRadius: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 4,
        maxWidth: 320,
    },
    instructionsTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#111827',
        marginBottom: 8,
    },
    instructionText: {
        fontSize: 14,
        color: '#6B7280',
        lineHeight: 20,
        marginBottom: 4,
    },
});

export default FeedbackModal;

// Localized header and title components
const HeaderTitle: React.FC = () => {
    const { t } = useTranslation();
    return <Text style={styles.headerTitle}>{t('feedback.headerTitle')}</Text>;
};

const TitleBlock: React.FC = () => {
    const { t } = useTranslation();
    return (
        <>
            <Text style={styles.title}>{t('feedback.title')}</Text>
            <Text style={styles.description}>{t('feedback.description')}</Text>
        </>
    );
};
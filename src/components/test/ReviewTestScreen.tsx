/**
 * ReviewTestScreen - A utility screen for testing the review system
 * This can be used to populate sample data and test review functionality
 */

import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    TextInput,
    ScrollView,
    Alert,
    ActivityIndicator,
    StatusBar,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { Colors } from '../../constants';
import { testBuyerService } from '../../services/buyerService';
import { addSampleReviewsForBuyer, testReviewSystem } from '../../utils/addSampleReviews';

const ReviewTestScreen: React.FC = () => {
    const [buyerId, setBuyerId] = useState('Cz8w70tUPkORMnUcIE19xbyq5Du1'); // Default buyer ID from your screenshot
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<string>('');

    const handleAddSampleReviews = async () => {
        if (!buyerId.trim()) {
            Alert.alert('Error', 'Please enter a buyer ID');
            return;
        }

        try {
            setLoading(true);
            setResult('');
            
            await addSampleReviewsForBuyer(buyerId);
            
            setResult('✅ Sample reviews added successfully!');
            Alert.alert('Success', 'Sample reviews have been added to the database.');
            
        } catch (error) {
            console.error('Error adding sample reviews:', error);
            setResult(`❌ Error: ${error}`);
            Alert.alert('Error', 'Failed to add sample reviews. Check console for details.');
        } finally {
            setLoading(false);
        }
    };

    const handleTestReviewSystem = async () => {
        if (!buyerId.trim()) {
            Alert.alert('Error', 'Please enter a buyer ID');
            return;
        }

        try {
            setLoading(true);
            setResult('');
            
            await testReviewSystem(buyerId);
            
            setResult('✅ Review system test completed successfully!');
            Alert.alert('Success', 'Review system tested successfully. Check console for details.');
            
        } catch (error) {
            console.error('Error testing review system:', error);
            setResult(`❌ Error: ${error}`);
            Alert.alert('Error', 'Review system test failed. Check console for details.');
        } finally {
            setLoading(false);
        }
    };

    const handleGetReviews = async () => {
        if (!buyerId.trim()) {
            Alert.alert('Error', 'Please enter a buyer ID');
            return;
        }

        try {
            setLoading(true);
            setResult('');
            
            const reviews = await testBuyerService.getBuyerReviews(buyerId);
            
            if (reviews.length === 0) {
                setResult('📭 No reviews found for this buyer');
            } else {
                const reviewsText = reviews.map((review, index) => 
                    `${index + 1}. ${review.farmerName}: ${review.rating}⭐ - "${review.comment}"`
                ).join('\n');
                
                setResult(`📝 Found ${reviews.length} reviews:\n\n${reviewsText}`);
            }
            
        } catch (error) {
            console.error('Error getting reviews:', error);
            setResult(`❌ Error: ${error}`);
            Alert.alert('Error', 'Failed to get reviews. Check console for details.');
        } finally {
            setLoading(false);
        }
    };

    const handleGetBuyerStats = async () => {
        if (!buyerId.trim()) {
            Alert.alert('Error', 'Please enter a buyer ID');
            return;
        }

        try {
            setLoading(true);
            setResult('');
            
            const stats = await testBuyerService.getBuyerStats(buyerId);
            
            setResult(`📊 Buyer Stats:
• Rating: ${stats.rating}⭐ (${stats.totalRatings} reviews)
• Completed Orders: ${stats.completedOrders}
• Total Requests: ${stats.totalRequests}`);
            
        } catch (error) {
            console.error('Error getting buyer stats:', error);
            setResult(`❌ Error: ${error}`);
            Alert.alert('Error', 'Failed to get buyer stats. Check console for details.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor="#F8FAFC" />
            
            <View style={styles.header}>
                <Text style={styles.title}>Review System Test</Text>
                <Text style={styles.subtitle}>Test and populate review data</Text>
            </View>

            <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                {/* Buyer ID Input */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Buyer ID</Text>
                    <View style={styles.inputContainer}>
                        <Icon name="person-outline" size={20} color="#6B7280" style={styles.inputIcon} />
                        <TextInput
                            style={styles.input}
                            placeholder="Enter buyer ID (e.g., Cz8w70tUPkORMnUcIE19xbyq5Du1)"
                            value={buyerId}
                            onChangeText={setBuyerId}
                            autoCapitalize="none"
                            autoCorrect={false}
                        />
                    </View>
                </View>

                {/* Action Buttons */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Actions</Text>
                    
                    <TouchableOpacity
                        style={[styles.actionButton, styles.primaryButton]}
                        onPress={handleAddSampleReviews}
                        disabled={loading}
                    >
                        <Icon name="add-circle-outline" size={20} color="#FFFFFF" />
                        <Text style={styles.actionButtonText}>Add Sample Reviews</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.actionButton, styles.secondaryButton]}
                        onPress={handleGetReviews}
                        disabled={loading}
                    >
                        <Icon name="list-outline" size={20} color="#FFFFFF" />
                        <Text style={styles.actionButtonText}>Get Reviews</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.actionButton, styles.infoButton]}
                        onPress={handleGetBuyerStats}
                        disabled={loading}
                    >
                        <Icon name="stats-chart-outline" size={20} color="#FFFFFF" />
                        <Text style={styles.actionButtonText}>Get Buyer Stats</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.actionButton, styles.testButton]}
                        onPress={handleTestReviewSystem}
                        disabled={loading}
                    >
                        <Icon name="flask-outline" size={20} color="#FFFFFF" />
                        <Text style={styles.actionButtonText}>Full System Test</Text>
                    </TouchableOpacity>
                </View>

                {/* Loading Indicator */}
                {loading && (
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" color={Colors.light.primary} />
                        <Text style={styles.loadingText}>Processing...</Text>
                    </View>
                )}

                {/* Result Display */}
                {result && (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Result</Text>
                        <View style={styles.resultContainer}>
                            <Text style={styles.resultText}>{result}</Text>
                        </View>
                    </View>
                )}

                {/* Instructions */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Instructions</Text>
                    <View style={styles.instructionsContainer}>
                        <Text style={styles.instructionsText}>
                            1. Enter a buyer ID from your Firestore database{'\n'}
                            2. Use "Add Sample Reviews" to populate test data{'\n'}
                            3. Use "Get Reviews" to see existing reviews{'\n'}
                            4. Use "Get Buyer Stats" to see calculated statistics{'\n'}
                            5. Use "Full System Test" to test everything at once
                        </Text>
                    </View>
                </View>
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F8FAFC',
    },
    header: {
        backgroundColor: Colors.light.primary,
        paddingHorizontal: 20,
        paddingTop: 50,
        paddingBottom: 20,
    },
    title: {
        fontSize: 24,
        fontWeight: '700',
        color: '#FFFFFF',
        marginBottom: 4,
    },
    subtitle: {
        fontSize: 14,
        color: 'rgba(255, 255, 255, 0.8)',
        fontWeight: '500',
    },
    content: {
        flex: 1,
        paddingHorizontal: 20,
        paddingTop: 20,
    },
    section: {
        marginBottom: 24,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#111827',
        marginBottom: 12,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        paddingHorizontal: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    inputIcon: {
        marginRight: 12,
    },
    input: {
        flex: 1,
        fontSize: 15,
        color: '#111827',
        paddingVertical: 16,
    },
    actionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 16,
        paddingHorizontal: 20,
        borderRadius: 12,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    primaryButton: {
        backgroundColor: Colors.light.primary,
    },
    secondaryButton: {
        backgroundColor: '#3B82F6',
    },
    infoButton: {
        backgroundColor: '#8B5CF6',
    },
    testButton: {
        backgroundColor: '#F59E0B',
    },
    actionButtonText: {
        color: '#FFFFFF',
        fontSize: 15,
        fontWeight: '600',
        marginLeft: 8,
    },
    loadingContainer: {
        alignItems: 'center',
        paddingVertical: 20,
    },
    loadingText: {
        marginTop: 12,
        fontSize: 14,
        color: '#6B7280',
        fontWeight: '500',
    },
    resultContainer: {
        backgroundColor: '#FFFFFF',
        padding: 16,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    resultText: {
        fontSize: 13,
        color: '#374151',
        lineHeight: 20,
        fontFamily: 'monospace', // For better code/data display
    },
    instructionsContainer: {
        backgroundColor: '#EFF6FF',
        padding: 16,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#DBEAFE',
    },
    instructionsText: {
        fontSize: 14,
        color: '#1E40AF',
        lineHeight: 20,
    },
});

export default ReviewTestScreen;

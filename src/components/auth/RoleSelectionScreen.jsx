import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  SafeAreaView,
  ActivityIndicator,
  Animated,
  Image,
  ScrollView,
  Alert,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authFlowManager } from '../../services/authFlowManager';
import { saveUserRole } from '../../utils/userRoleStorage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import auth from '@react-native-firebase/auth';
import { useTranslation } from 'react-i18next';
import { syncUserProfile } from '../../services/firebaseService';
import { useAuthStore } from '../../store/authStore';
import { navigateToMain } from '../../utils/navigationUtils';

const RoleSelectionScreen = ({ navigation, route }) => {
  const [selectedRole, setSelectedRole] = useState(null);
  const { t } = useTranslation();
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState(''); // For user feedback
  const authStore = useAuthStore();
  
  // Extract Truecaller data from navigation params
  const { truecallerProfile, phoneNumber: truecallerPhone, fromTruecaller } = route?.params || {};
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    // Entrance animation
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 700,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, slideAnim, scaleAnim]);

  // Skip this screen for existing/returning users whose onboarding is complete
  useEffect(() => {
    let mounted = true;
    const checkSkipCondition = async () => {
      try {
        const route = await authFlowManager.resumeAuthFlow();
        if (mounted && route.screen !== 'RoleSelection') {
          if (route.screen === 'Main') {
            const { navigateToMain } = await import('../../utils/navigationUtils');
            navigateToMain();
          } else {
            if (route.params) {
              navigation.replace(route.screen, route.params);
            } else {
              navigation.replace(route.screen);
            }
          }
        }
      } catch (error) {
        console.error('❌ Error checking role selection skip condition:', error);
      }
    };
    
    checkSkipCondition();
    return () => { mounted = false; };
  }, [navigation]);

  const handleBackPress = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      navigation.navigate("MobileScreen");
    }
  };

  const handleRoleSelect = (role) => {
    setSelectedRole(role);
  };
  const handleGetStarted = async () => {
    if (selectedRole) {
      setIsLoading(true);
      try {
        // Save role to local storage
        await saveUserRole(selectedRole);

        // Persist role in userData for backward compatibility
        try {
          const existing = await AsyncStorage.getItem('userData');
          const user = auth().currentUser;
          const merged = existing 
            ? { ...JSON.parse(existing), userRole: selectedRole }
            : { 
                uid: user?.uid || '',
                userRole: selectedRole, 
                phoneNumber: user?.phoneNumber || truecallerPhone || '',
                createdAt: new Date().toISOString() 
              };
          await AsyncStorage.setItem('userData', JSON.stringify(merged));
        } catch (mergeErr) {
          console.warn('⚠️ Failed merging userData while saving role:', mergeErr);
        }

        // TRUECALLER QUICK FLOW: For farmers, auto-create profile and go to Home
        if (fromTruecaller && selectedRole === 'farmer' && truecallerProfile) {
          console.log('🚀 Truecaller Quick Login: Auto-creating farmer profile...');
          setLoadingMessage('Creating your profile...');
          
          const user = auth().currentUser;
          if (!user) {
            throw new Error('No authenticated user found');
          }

          const userData = {
            uid: user.uid,
            firstName: truecallerProfile.firstName?.trim() || '',
            lastName: truecallerProfile.lastName?.trim() || '',
            userRole: 'farmer',
            phoneNumber: user.phoneNumber || truecallerPhone,
            isProfileComplete: true,
            email: truecallerProfile.email || null,
          };

          console.log('📝 Creating farmer profile with Truecaller data:', userData);
          setLoadingMessage('Saving to cloud...');

          // Sync profile to Firestore
          await syncUserProfile(userData, (progress) => {
            if (progress.step === 'saving_firestore') {
              setLoadingMessage('Almost there...');
            } else if (progress.step === 'complete') {
              console.log('✅ Farmer profile created successfully');
              setLoadingMessage('Welcome!');
            }
          });

          // Update auth store
          authStore.updateUser({
            id: user.uid,
            firstName: userData.firstName,
            lastName: userData.lastName,
            phone: userData.phoneNumber,
            userType: 'farmer',
            status: 'active',
            isVerified: true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          });

          // Update auth flow state to complete
          await authFlowManager.updateFlowState('complete');

          console.log('✅ Truecaller Quick Login complete - navigating to Main');
          // Navigate immediately - no need to reset loading state
          navigateToMain();
          return;
        }

        // TRUECALLER FLOW: For buyers, pass pre-filled data to IntroduceYourself
        if (fromTruecaller && selectedRole === 'buyer' && truecallerProfile) {
          console.log('🛒 Truecaller Buyer: Passing pre-filled data to profile setup...');
          await authFlowManager.updateFlowState('profile_setup');
          navigation.navigate('IntroduceYourself', { 
            userRole: selectedRole,
            truecallerProfile: truecallerProfile,
            fromTruecaller: true,
          });
          setIsLoading(false);
          return;
        }

        // REGULAR OTP FLOW: Continue as normal
        await authFlowManager.updateFlowState('profile_setup');
        console.log('✅ Selected role saved:', selectedRole);
        navigation.navigate('IntroduceYourself', { userRole: selectedRole });
      } catch (err) {
        console.error('❌ Error saving role:', err);
        Alert.alert(
          t('alerts.errorTitle') || 'Error',
          err.message || 'Failed to save role. Please try again.',
          [{ text: t('common.ok') || 'OK' }]
        );
      } finally {
        setIsLoading(false);
      }
    }
  };

  // const showHelp = () => {
  //   // Could show help modal
  //   console.log('Help pressed');
  // };

  const insets = useSafeAreaInsets();

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar
        barStyle="dark-content"
        backgroundColor="#FFFFFF" />

      <View style={styles.innerContainer}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handleBackPress} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>

          {/* <TouchableOpacity onPress={showHelp} style={styles.helpButton}>
            <Ionicons name="help-circle-outline" size={24} color="#007E2F" />
          </TouchableOpacity> */}
        </View>

        {/* Main Content (scrollable) */}
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <Animated.View
            style={[
              styles.content,
              {
                opacity: fadeAnim,
                transform: [
                  { translateY: slideAnim },
                  { scale: scaleAnim }
                ]
              }
            ]}
          >
            {/* Illustration */}
            <View style={styles.illustrationContainer}>
              <View style={styles.illustrationBackground}>
                {/* Placeholder illustration - you can replace with actual image */}
                <Image
                  source={require('../../assets/images/illus.png')}
                  style={{ width: 280, height: 280 }}
                  resizeMode="center"
                />
              </View>
            </View>

            {/* Title and Description */}
            <View style={styles.textContainer}>
              <Text style={styles.heading}>{t('auth.role.title')}</Text>
              <Text style={styles.subtext}>
                {t('auth.role.selectLine1.prefix')} <Text style={styles.highlightText}>{t('roles.farmer')}</Text> {t('auth.role.selectLine1.suffix')}
              </Text>
              <Text style={styles.subtext}>
                {t('auth.role.selectLine2.prefix')} <Text style={styles.highlightText}>{t('roles.buyer')}</Text> {t('auth.role.selectLine2.suffix')}
              </Text>
            </View>

            {/* Role Selection Cards */}
            <View style={styles.roleContainer}>
              {/* Farmer Card */}
              <TouchableOpacity
                style={[
                  styles.roleCard,
                  styles.farmerCard,
                  selectedRole === 'farmer' && styles.roleCardSelected
                ]}
                onPress={() => handleRoleSelect('farmer')}
                activeOpacity={0.8}
              >
                <View style={[styles.roleIcon, styles.farmerIcon]}>
                  <Ionicons name="leaf" size={32} color="#007E2F" />
                </View>
                <Text style={[styles.roleText, selectedRole === 'farmer' && styles.roleTextSelected]}>
                  {t('roles.farmer')}
                </Text>
                {selectedRole === 'farmer' && (
                  <View style={styles.selectedIndicator}>
                    <Ionicons name="checkmark-circle" size={24} color="#007E2F" />
                  </View>
                )}
              </TouchableOpacity>

              {/* Buyer Card */}
              <TouchableOpacity
                style={[
                  styles.roleCard,
                  styles.buyerCard,
                  selectedRole === 'buyer' && styles.roleCardSelected
                ]}
                onPress={() => handleRoleSelect('buyer')}
                activeOpacity={0.8}
              >
                <View style={[styles.roleIcon, styles.buyerIcon]}>
                  <Ionicons name="storefront" size={32} color="#FF6B6B" />
                </View>
                <Text style={[styles.roleText, selectedRole === 'buyer' && styles.roleTextSelected]}>
                  {t('roles.buyer')}
                </Text>
                {selectedRole === 'buyer' && (
                  <View style={styles.selectedIndicator}>
                    <Ionicons name="checkmark-circle" size={24} color="#FF6B6B" />
                  </View>
                )}
              </TouchableOpacity>
            </View>

            {/* Security note
            <View style={styles.securityNote}>
              <Ionicons name="shield-checkmark" size={16} color="#007E2F" />
              <Text style={styles.securityText}>
                You can change your role later in settings if needed
              </Text>
            </View> */}
          </Animated.View>
        </ScrollView>

        {/* Get Started Button */}
        <View style={[styles.buttonContainer, { paddingBottom: insets.bottom + 20 }]}>
          <TouchableOpacity
            style={[
              styles.getStartedButton,
              !selectedRole && styles.getStartedButtonDisabled
            ]}
            onPress={handleGetStarted}
            disabled={!selectedRole || isLoading}
            activeOpacity={0.8}
          >
            {isLoading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" color="#FFFFFF" />
                {loadingMessage ? (
                  <Text style={styles.loadingText}>{loadingMessage}</Text>
                ) : null}
              </View>
            ) : (
              <>
                <Text style={styles.getStartedText}>{t('auth.role.getStarted')}</Text>
                <Ionicons name="arrow-forward" size={16} color="#FFFFFF" />
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    paddingTop: 28,
  },
  innerContainer: {
    flex: 1,
    paddingHorizontal: 24,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 16,
    paddingBottom: 20,
    minHeight: 60,
  },
  backButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#F8F9FA',
  },
  helpButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#E8F5E8',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    paddingTop: 20,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 120, // Prevent content from being hidden behind the bottom button
  },
  illustrationContainer: {
    marginBottom: 40,
  },
  illustrationBackground: {
    width: 280,
    height: 200,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  personLeft: {
    alignItems: 'center',
  },
  personRight: {
    alignItems: 'center',
  },
  personAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#E8F5E8',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  personAvatarFemale: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#FFE8E8',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  personLabel: {
    fontSize: 12,
    color: '#666666',
    fontWeight: '500',
  },
  textContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  heading: {
    fontSize: 28,
    fontWeight: '600',
    color: '#1A1A1A',
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 36,
  },
  subtext: {
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
    lineHeight: 22,
  },
  highlightText: {
    color: '#007E2F',
    fontWeight: '600',
  },
  roleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 20,
    gap: 16,
  },
  roleCard: {
    flex: 1,
    backgroundColor: '#FAFAFA',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#E8E8E8',
    position: 'relative',
    minHeight: 140,
    justifyContent: 'center',
  },
  farmerCard: {
    backgroundColor: '#F8FFF8',
  },
  buyerCard: {
    backgroundColor: '#FFF8F8',
  },
  roleCardSelected: {
    borderWidth: 3,
    shadowColor: '#007E2F',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  roleIcon: {
    width: 70,
    height: 70,
    borderRadius: 35,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  farmerIcon: {
    backgroundColor: '#E8F5E8',
  },
  buyerIcon: {
    backgroundColor: '#FFE8E8',
  },
  roleText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
    textAlign: 'center',
  },
  roleTextSelected: {
    color: '#007E2F',
  },
  selectedIndicator: {
    position: 'absolute',
    top: 10,
    right: 10,
  },
  securityNote: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E8',
    padding: 12,
    borderRadius: 12,
    marginTop: 20,
    marginBottom: 20,
    marginHorizontal: 20,
  },
  securityText: {
    fontSize: 14,
    color: '#007E2F',
    marginLeft: 8,
    flex: 1,
    fontWeight: '500',
    textAlign: 'center',
  },
  buttonContainer: {
    position: 'absolute',
    bottom: 0,
    left: 24,
    right: 24,
    paddingBottom: 34,
    backgroundColor: '#FFFFFF',
    paddingTop: 16,
  },
  getStartedButton: {
    backgroundColor: '#007E2F',
    paddingVertical: 16,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#007E2F',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  getStartedButtonDisabled: {
    backgroundColor: '#CCCCCC',
    shadowOpacity: 0,
    elevation: 0,
  },
  getStartedText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginRight: 8,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 10,
  },
});

export default RoleSelectionScreen;

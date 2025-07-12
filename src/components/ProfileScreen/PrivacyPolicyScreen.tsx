import React from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Ionicons from 'react-native-vector-icons/Ionicons';

const PrivacyPolicyScreen = () => {
  const navigation = useNavigation();

  return (
    <ScrollView style={styles.container}>
      
      {/* Back Button */}
      <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
        <Ionicons name="arrow-back" size={24} color="#000" />
      </TouchableOpacity>

      {/* Heading */}
      <Text style={styles.header}>Privacy Policy</Text>

      {/* White Content Card */}
      <View style={[styles.card, { marginHorizontal: -16 }]}>
        <Text style={styles.text}>
          At <Text style={styles.bold}>Krushimandi</Text>, we value your privacy and are dedicated to safeguarding your personal information. This Privacy Policy outlines how we collect, use, share, and protect the data you provide to us.
        </Text>

        <Text style={styles.text}>
          We may collect information such as your name, contact details, device information, and usage data to help enhance your experience and improve our services. This data allows us to personalize your interactions, improve features, send essential updates, and maintain security.
        </Text>

        <Text style={styles.text}>
          We want to assure you that we do not sell your data. Any information collected may be shared only with trusted third-party services, strictly for the purpose of ensuring the app's functionality.
        </Text>

        <Text style={styles.text}>
          To protect your data, we implement appropriate security measures to prevent unauthorized access or disclosure. Your information is handled with the utmost care.
        </Text>

        <Text style={styles.text}>
          Occasionally, we may update this Privacy Policy to reflect changes in our practices or for legal and regulatory reasons. Users will be notified of significant changes.
        </Text>

        <Text style={styles.text}>
          By using our services, you agree to the terms outlined in this Privacy Policy. If you have any questions or concerns, feel free to contact us at <Text style={styles.email}>support@krushimandi.in</Text>.
        </Text>
      </View>
    </ScrollView>
  );
};

export default PrivacyPolicyScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f7f3',
    padding: 16,
  },
  backButton: {
    marginTop: 20,
    marginBottom: 20,
    width: 32,
  },
  header: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 20,
  },
  card: {
  backgroundColor: '#fff',
  borderRadius: 40,
  padding: 20,
  marginTop: 10,
},
  text: {
    fontSize: 14,
    color: '#444',
    marginBottom: 12,
    lineHeight: 20,
  },
  bold: {
    fontWeight: '600',
    color: '#222',
  },
  email: {
    color: '#007AFF',
  },
});

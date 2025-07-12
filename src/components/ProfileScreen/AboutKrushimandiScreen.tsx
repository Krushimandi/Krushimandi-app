import React from 'react';
import { View, Text, StyleSheet, ScrollView, Image } from 'react-native';

const AboutKrushimandiScreen = () => {
  return (
    <ScrollView style={styles.container}>
      <Text style={styles.heading}> </Text>

      <Image
        source={require('../../../assets/krushimandi_logo.png')} 
        style={styles.logo}
        resizeMode="contain"
      />

      <Text style={styles.description}>
        Krushimandi is a leading agricultural platform built to connect farmers, traders,
        and agricultural experts all in one place. Our mission is to empower the farming
        community with transparent pricing, reliable market updates, and easy access
        to essential tools and services.
      </Text>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Our Vision</Text>
        <Text style={styles.cardText}>
          To create a digital ecosystem that transforms agriculture by promoting
          transparency, accessibility, and innovation.
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Key Features</Text>
        <Text style={styles.cardText}>• Real-time Mandi prices</Text>
        <Text style={styles.cardText}>• Weather forecasts</Text>
        <Text style={styles.cardText}>• Expert consultations</Text>
        <Text style={styles.cardText}>• Smart alerts and notifications</Text>
        <Text style={styles.cardText}>• Crop and soil advisory</Text>
      </View>

      <View style={styles.footer}>
        <Text style={styles.version}>App Version: 3.15.2</Text>
        <Text style={styles.footerText}>Made with ❤️ in India</Text>
      </View>
    </ScrollView>
  );
};

export default AboutKrushimandiScreen;


const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    padding: 16,
  },
  heading: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 16,
    marginTop: 20,
  },
  logo: {
    width: '100%',
    height: 120,
    marginBottom: 20,
  },
  description: {
    fontSize: 16,
    color: '#333',
    marginBottom: 20,
    lineHeight: 24,
  },
  card: {
    backgroundColor: '#E8F5E9',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    elevation: 1,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  cardText: {
    fontSize: 15,
    color: '#444',
    marginBottom: 4,
  },
  footer: {
    alignItems: 'center',
    marginTop: 30,
    marginBottom: 20,
  },
  version: {
    fontSize: 14,
    color: '#555',
    marginBottom: 6,
  },
  footerText: {
    fontSize: 14,
    color: '#777',
  },
});

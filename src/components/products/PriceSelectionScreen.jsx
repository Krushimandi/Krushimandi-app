import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Dimensions, ScrollView } from 'react-native';

const suggestedPrices = [35, 37.5, 40];
const mandiAverage = 30;
const mandiAverages = [35, 37.5, 40];
const suggestedRange = [28, 34];

export default function PriceSelectionScreen({ navigation }) {
  const [price, setPrice] = useState('42.50');

  // Gauge logic
  const priceNum = parseFloat(price);
  let gaugeText = 'Average';
  let gaugeColor = '#FFD600';
  let chanceText = 'Very low chance to sell';
  if (priceNum < 28) {
    gaugeText = 'Too Low';
    gaugeColor = '#FF5252';
    chanceText = 'Very low chance to sell';
  } else if (priceNum > 40) {
    gaugeText = 'Too High';
    gaugeColor = '#FF5252';
    chanceText = 'Very low chance to sell';
  } else if (priceNum >= 28 && priceNum <= 34) {
    gaugeText = 'Good Price';
    gaugeColor = '#43A047';
    chanceText = 'Good chance to sell';
  }

  // Gauge needle angle: -90deg (left) to +90deg (right)
  const min = 20, max = 50;
  const angle = ((priceNum - min) / (max - min)) * 180 - 90;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.priceText}>₹{price}</Text>
      <View style={styles.gaugeWrapper}>
        <View style={styles.gaugeArc}>
          <View style={[styles.gaugeSegment, { backgroundColor: '#FF5252', left: 0 }]} />
          <View style={[styles.gaugeSegment, { backgroundColor: '#FFD600', left: '33.33%' }]} />
          <View style={[styles.gaugeSegment, { backgroundColor: '#43A047', left: '66.66%' }]} />
        </View>
        <View style={[styles.needle, { transform: [{ rotate: `${angle}deg` }] }]} />
        <View style={styles.gaugeLabelsRow}>
          <Text style={styles.gaugeLabel}>Too High</Text>
          <Text style={styles.gaugeLabel}>Average</Text>
          <Text style={styles.gaugeLabel}>Good Price</Text>
        </View>
      </View>
      <Text style={styles.chanceText}>{chanceText}</Text>
      <View style={styles.divider} />
      <View style={styles.rowBetween}>
        <Text style={styles.label}>Current mandi average</Text>
        <Text style={styles.value}>₹{mandiAverage.toFixed(2)}</Text>
      </View>
      <View style={styles.suggestedRow}>
        {mandiAverages.map((p) => (
          <View key={p} style={styles.suggestedBtn}>
            <Text style={styles.suggestedText}>₹{p.toFixed(2)}</Text>
          </View>
        ))}
      </View>
      <View style={styles.rowBetween}>
        <Text style={styles.label}>KrushiMandi suggested price range</Text>
        <Text style={styles.value}>₹ {suggestedRange[0]} – {suggestedRange[1]}</Text>
      </View>
      <View style={styles.inputSection}>
        <Text style={styles.inputLabel}>Enter price per kg</Text>
        <View style={styles.inputContainer}>
          <Text style={styles.rupee}>₹</Text>
          <TextInput
            style={styles.input}
            keyboardType="numeric"
            value={price}
            onChangeText={setPrice}
          />
          <Text style={styles.kg}>1 kg</Text>
        </View>
        <View style={styles.suggestedRow}>
          {[28, 34, 40].map((p) => (
            <TouchableOpacity key={p} style={styles.suggestedBtn} onPress={() => setPrice(p.toString())}>
              <Text style={styles.suggestedText}>₹{p}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
      <TouchableOpacity style={styles.nextBtn} onPress={() => navigation.navigate('NextScreenName')}>
        <Text style={styles.nextBtnText}>Next</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const { width } = Dimensions.get('window');
const gaugeWidth = width * 0.7;
const gaugeHeight = gaugeWidth / 2;

const styles = StyleSheet.create({
  container: { flexGrow: 1, alignItems: 'center', backgroundColor: '#fff', padding: 20 },
  priceText: { fontSize: 36, fontWeight: 'bold', marginTop: 16 },
  gaugeWrapper: { alignItems: 'center', marginVertical: 16, width: gaugeWidth, height: gaugeHeight + 40 },
  gaugeArc: {
    width: gaugeWidth,
    height: gaugeHeight,
    borderTopLeftRadius: gaugeWidth / 2,
    borderTopRightRadius: gaugeWidth / 2,
    overflow: 'hidden',
    flexDirection: 'row',
    position: 'relative',
  },
  gaugeSegment: {
    position: 'absolute',
    width: '33.33%',
    height: '100%',
    top: 0,
    zIndex: 1,
  },
  needle: {
    position: 'absolute',
    bottom: 20,
    left: gaugeWidth / 2 - 4,
    width: 8,
    height: gaugeHeight - 10,
    backgroundColor: '#222',
    borderRadius: 4,
    zIndex: 2,
    transformOrigin: 'bottom center',
  },
  gaugeLabelsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: gaugeWidth,
    marginTop: 8,
  },
  gaugeLabel: { fontSize: 14, color: '#222', flex: 1, textAlign: 'center' },
  chanceText: { fontSize: 16, color: '#222', textAlign: 'center', marginVertical: 12 },
  divider: { height: 1, backgroundColor: '#eee', width: '100%', marginVertical: 12 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginVertical: 4 },
  label: { fontSize: 15, color: '#555' },
  value: { fontSize: 15, fontWeight: 'bold', color: '#222' },
  suggestedRow: { flexDirection: 'row', justifyContent: 'center', width: '100%', marginVertical: 8 },
  suggestedBtn: { backgroundColor: '#f1f1f1', borderRadius: 8, padding: 10, marginHorizontal: 6, minWidth: 70, alignItems: 'center' },
  suggestedText: { fontSize: 15, color: '#222' },
  inputSection: { width: '100%', marginTop: 24 },
  inputLabel: { fontSize: 16, color: '#222', marginBottom: 8 },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 12,
    padding: 12,
    backgroundColor: '#f9f9f9',
    marginBottom: 8,
  },
  rupee: { fontSize: 22, marginRight: 8 },
  input: { flex: 1, fontSize: 22, textAlign: 'center' },
  kg: { fontSize: 18, marginLeft: 8 },
  nextBtn: {
    backgroundColor: '#388e3c',
    borderRadius: 8,
    paddingVertical: 14,
    paddingHorizontal: 40,
    marginTop: 24,
    alignSelf: 'center',
  },
  nextBtnText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
});

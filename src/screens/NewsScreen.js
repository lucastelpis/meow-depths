/**
 * =============================================================================
 * NewsScreen.js — Dev News / Updates board
 * =============================================================================
 *
 * A simple blog-style feed where the developer can post game updates, patch
 * notes, and announcements. Entries live in the NEWS_POSTS array below — add a
 * new object to the top of the list to publish an update.
 */

import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import ItemSprite from '../components/ItemSprite';

// ─── News feed content ───────────────────────────────────────────────────────
// Newest first. Each post: { id, date, title, body }.
const NEWS_POSTS = [
  {
    id: 'welcome',
    date: 'Update 1',
    title: 'Welcome to Meow Expeditions!',
    body:
      "Hi, and thank you for playing!\n\n" +
      "This is the News board — the place where we'll share game updates, new " +
      "features, balance changes, and behind-the-scenes notes as Mochi's " +
      "adventure grows.\n\n" +
      "Recently added: the Camp Improvements system! Gather Wood, Cloth, and " +
      "Stone on expeditions to upgrade your Camp, Cooktop, Storage, and Shop.\n\n" +
      "More cozy regions to explore soon. Stay tuned, and happy crawling! 🐾",
  },
];

export default function NewsScreen({ navigation }) {
  return (
    <SafeAreaView style={styles.root}>
      {/* ── Header ────────────────────────────────────────────────────────── */}
      <View style={styles.header}>
        <View style={styles.headerBackButtonWrapper}>
          <View style={styles.headerBackButtonBevelShadow} />
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => navigation.goBack()}
            style={styles.headerBackButtonOuter}
          >
            <View style={styles.headerBackButtonInner}>
              <ItemSprite spritesheet="icons-map" frameIndex={43} displaySize={26} />
            </View>
          </TouchableOpacity>
        </View>

        <View style={styles.headerTitleOuterBorder}>
          <View style={styles.headerTitleInnerBorder}>
            <Text style={styles.headerTitleText}>News</Text>
          </View>
        </View>

        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {NEWS_POSTS.map((post) => (
          <View key={post.id} style={styles.postCard}>
            <View style={styles.postShadow} pointerEvents="none" />
            <View style={styles.postHeader}>
              <ItemSprite spritesheet="icons-map" frameIndex={101} displaySize={26} />
              <View style={styles.postHeaderText}>
                <Text style={styles.postTitle}>{post.title}</Text>
                <Text style={styles.postDate}>{post.date}</Text>
              </View>
            </View>
            <Text style={styles.postBody}>{post.body}</Text>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const GOLD = '#D4A754';
const PARCH = '#FFF3DA';

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#133131' },

  /* ── Header ──────────────────────────────────────────────── */
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderBottomWidth: 2,
    borderBottomColor: '#84735B',
    backgroundColor: 'rgba(0,0,0,0.15)',
  },
  headerBackButtonWrapper: { width: 44, height: 44, position: 'relative' },
  headerBackButtonBevelShadow: {
    position: 'absolute', left: 0, top: 3, width: 44, height: 44,
    borderRadius: 8, zIndex: 1, backgroundColor: '#4F3C1E',
  },
  headerBackButtonOuter: {
    width: 44, height: 44, borderRadius: 8, borderWidth: 2.5,
    borderColor: '#84735B', backgroundColor: '#4F3C1E', zIndex: 2,
  },
  headerBackButtonInner: {
    flex: 1, margin: 2, borderRadius: 5, borderWidth: 2.5,
    borderTopColor: '#D8483F', borderLeftColor: '#D8483F', borderRightColor: '#D8483F',
    borderBottomColor: '#590D0E', borderBottomWidth: 4,
    backgroundColor: '#A61C1C', justifyContent: 'center', alignItems: 'center',
  },
  headerTitleOuterBorder: {
    borderWidth: 2.5, borderColor: '#4A3917', borderRadius: 8, padding: 2,
  },
  headerTitleInnerBorder: {
    borderWidth: 2, borderColor: GOLD, borderRadius: 5,
    backgroundColor: '#1E1E20', paddingVertical: 6, paddingHorizontal: 20,
  },
  headerTitleText: {
    fontFamily: 'Jersey10-Regular', fontSize: 28, color: PARCH, textAlign: 'center',
    textShadowColor: '#000', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 1,
  },
  headerSpacer: { width: 44, height: 44 },

  /* ── Feed ────────────────────────────────────────────────── */
  scrollContent: { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 60 },
  postCard: {
    backgroundColor: '#3A2C14',
    borderWidth: 2.5,
    borderColor: '#84735B',
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    position: 'relative',
  },
  postShadow: {
    position: 'absolute', left: -1, right: -1, bottom: -5, height: 10,
    borderBottomLeftRadius: 12, borderBottomRightRadius: 12,
    backgroundColor: '#1E1408', zIndex: -1,
  },
  postHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderBottomWidth: 1.5,
    borderBottomColor: '#5A4A2E',
    paddingBottom: 8,
    marginBottom: 10,
  },
  postHeaderText: { flex: 1 },
  postTitle: {
    fontFamily: 'Jersey10-Regular', fontSize: 22, color: PARCH, letterSpacing: 0.5,
  },
  postDate: {
    fontFamily: 'Silkscreen-Regular', fontSize: 9, color: GOLD, marginTop: 2,
  },
  postBody: {
    fontFamily: 'Jersey10-Regular', fontSize: 17, lineHeight: 22, color: '#F0E0BC',
  },
});

/**
 * ElementSelectionScreen.js
 *
 * Shown ONCE on first app launch (when hero.element is null).
 * Player sets their name and chooses their element.
 * On confirm → dispatches SELECT_ELEMENT and the Camp screen takes over.
 *
 * Visual language matches the Camp hub: dark teal background, parchment
 * plaque banners, wood-textured input panels, and gold pixel-font tags.
 */

import React, { useState, useRef } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    ScrollView,
    StyleSheet,
    Dimensions,
    Modal,
    Pressable,
    Animated,
    StatusBar,
    Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, {
    Defs,
    LinearGradient,
    RadialGradient,
    Stop,
    Rect,
    Circle,
    Path,
    G,
} from 'react-native-svg';

import { useGame } from '../state/gameState';
import ItemSprite from '../components/ItemSprite';

const { width: W } = Dimensions.get('window');
// Deterministic plaque width so the title never depends on async font
// measurement (which can lock it too narrow on a remount, e.g. after a
// "Reset Save Data" → onboarding remount).
const PLAQUE_WIDTH = Math.min(W - 80, 320);

// ─── Element banner artwork (pre-rendered frames with element emblem) ────────
const BANNER_IMAGES = {
    fire: require('../../assets/sprites/banners/fire-banner.png'),
    water: require('../../assets/sprites/banners/water-banner.png'),
    earth: require('../../assets/sprites/banners/earth-banner.png'),
    wind: require('../../assets/sprites/banners/wind-banner.png'),
};
const BANNER_ASPECT_RATIO = 800 / 655;

// ─── Constants for snap carousel ─────────────────────────────────────────────
const SCREEN_PADDING = 20;
const CARD_WIDTH = W - SCREEN_PADDING * 2;
const CARD_GAP = 16;
const SNAP_INTERVAL = CARD_WIDTH + CARD_GAP;

// ─── SVG Rugged Border Background Component (matches CampScreen) ─────────────
function RuggedBorderBackground({ width, height }) {
    if (!width || !height) return null;

    const notch = 6; // corner notch size
    const shadowHeight = 5; // bottom shadow bevel height
    const strokePadding = 3; // padding to prevent stroke clipping

    // Coordinates for the notched rectangle shape (straight sides)
    const path = `M ${notch} 0
                L ${width - notch} 0
                L ${width - notch} ${notch}
                L ${width} ${notch}
                L ${width} ${height - notch}
                L ${width - notch} ${height - notch}
                L ${width - notch} ${height}
                L ${notch} ${height}
                L ${notch} ${height - notch}
                L 0 ${height - notch}
                L 0 ${notch}
                L ${notch} ${notch} Z`;

    // Inner line inset coordinates (shifted inwards by 3 pixels)
    const inset = 3;
    const innerPath = `M ${notch + inset} ${inset}
                     L ${width - notch - inset} ${inset}
                     L ${width - notch - inset} ${notch + inset}
                     L ${width - inset} ${notch + inset}
                     L ${width - inset} ${height - notch - inset}
                     L ${width - notch - inset} ${height - notch - inset}
                     L ${width - notch - inset} ${height - inset}
                     L ${notch + inset} ${height - inset}
                     L ${notch + inset} ${height - notch - inset}
                     L ${inset} ${height - notch - inset}
                     L ${inset} ${notch + inset}
                     L ${notch + inset} ${notch + inset} Z`;

    return (
        <View style={StyleSheet.absoluteFillObject}>
            <Svg
                width={width + strokePadding * 2}
                height={height + shadowHeight + strokePadding * 2}
                style={{
                    position: 'absolute',
                    top: -strokePadding,
                    left: -strokePadding,
                }}
            >
                <G transform={`translate(${strokePadding}, ${strokePadding})`}>
                    {/* 1. 3D Under-Shadow */}
                    <Path d={path} fill="#4E1D0C" transform={`translate(0, ${shadowHeight})`} />

                    {/* 2. Main Button Face with Dark Outline */}
                    <Path
                        d={path}
                        fill="#A84C27"
                        stroke="#4E1D0C"
                        strokeWidth={3}
                        strokeLinejoin="miter"
                    />
                    {/* 3. Inner line border highlight */}
                    <Path
                        d={innerPath}
                        fill="none"
                        stroke="#D67545"
                        strokeWidth={1.5}
                        opacity={0.75}
                    />
                </G>
            </Svg>
        </View>
    );
}

// ─── SVG Soft Icon Glow Background Component (matches CampScreen) ────────────
function IconGlowBackground({ size = 56 }) {
    const radius = size / 2;
    return (
        <View style={{ ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center' }}>
            <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
                <Defs>
                    <RadialGradient id={`startIconGlowGrad-${size}`} cx="50%" cy="50%" rx="50%" ry="50%">
                        <Stop offset="0%" stopColor="#FFF3DA" stopOpacity="0.65" />
                        <Stop offset="50%" stopColor="#E8A73A" stopOpacity="0.25" />
                        <Stop offset="100%" stopColor="#E8A73A" stopOpacity="0" />
                    </RadialGradient>
                </Defs>
                <Circle cx={radius} cy={radius} r={radius} fill={`url(#startIconGlowGrad-${size})`} />
            </Svg>
        </View>
    );
}

// ─── Element definitions ─────────────────────────────────────────────────────

const ELEMENTS = [
    {
        id: 'fire',
        name: 'Fire',
        icon: '🔥',
        tagline: 'Burn everything. Patient pressure, relentless damage.',
        color: '#FF6B35',
        borderColor: 'rgba(255, 107, 53, 0.6)',
        power: '+1% ATK / LV',
        spriteFrame: 33,
    },
    {
        id: 'water',
        name: 'Water',
        icon: '💧',
        tagline: 'Sustain and endure. Wear enemies down while staying alive.',
        color: '#3B9EFF',
        borderColor: 'rgba(59, 158, 255, 0.6)',
        power: '+1% HP / LV',
        spriteFrame: 35,
    },
    {
        id: 'earth',
        name: 'Earth',
        icon: '⛰️',
        tagline: 'Immovable. Absorb punishment, resist everything.',
        color: '#D4A754',
        borderColor: 'rgba(212, 167, 84, 0.6)',
        power: '+1 DEF / LV',
        spriteFrame: 36,
    },
    {
        id: 'wind',
        name: 'Wind',
        icon: '🌪️',
        tagline: 'Fast and precise. Evade attacks, strike with deadly accuracy.',
        color: '#5CC4B8',
        borderColor: 'rgba(92, 196, 184, 0.6)',
        power: '+1 AGI / LV',
        spriteFrame: 34,
    },
];

// ─── Component ───────────────────────────────────────────────────────────────

export default function ElementSelectionScreen({ route, navigation }) {
    const { dispatch } = useGame();

    const heroName = route?.params?.heroName || 'Mochi';
    const [selectedElement, setSelectedElement] = useState('fire'); // defaults to fire
    const [confirmModalVisible, setConfirmModalVisible] = useState(false);
    const [startBtnLayout, setStartBtnLayout] = useState({ width: 0, height: 0 });
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const scrollViewRef = useRef(null);

    React.useEffect(() => {
        Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
        }).start();
    }, []);

    const elementDef = ELEMENTS.find(e => e.id === selectedElement);

    const handleScroll = (event) => {
        const scrollOffset = event.nativeEvent.contentOffset.x;
        const index = Math.round(scrollOffset / SNAP_INTERVAL);
        if (index >= 0 && index < ELEMENTS.length) {
            setSelectedElement(ELEMENTS[index].id);
        }
    };

    const scrollToElement = (index) => {
        scrollViewRef.current?.scrollTo({
            x: index * SNAP_INTERVAL,
            animated: true,
        });
        setSelectedElement(ELEMENTS[index].id);
    };

    const handleConfirm = () => {
        if (!selectedElement) return;
        setConfirmModalVisible(true);
    };

    const handleFinalConfirm = () => {
        if (!selectedElement) return;
        dispatch({
            type: 'SELECT_ELEMENT',
            payload: {
                element: selectedElement,
                name: heroName.trim() || 'Mochi',
            },
        });
        setConfirmModalVisible(false);
    };

    return (
        <SafeAreaView style={styles.root}>
            <StatusBar barStyle="light-content" backgroundColor="#000" />

            <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
                <ScrollView
                    contentContainerStyle={styles.scroll}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                >
                    {/* Back button */}
                    <TouchableOpacity
                        style={styles.backBtn}
                        onPress={() => navigation.goBack()}
                        activeOpacity={0.7}
                    >
                        <Text style={styles.backBtnText}>← BACK</Text>
                    </TouchableOpacity>

                    {/* Title plaque with overlapping top tag */}
                    <View style={styles.titlePlaqueOuter}>
                        <View style={styles.titlePlaqueInner}>
                            <Text style={styles.titlePlaqueText}>
                                Choose your{'\n'}Fighting Style
                            </Text>
                        </View>
                        <View style={styles.topTagOverlay}>
                            <View style={styles.topTag}>
                                <Text style={styles.topTagText}>★ ONE LAST STEP ★</Text>
                            </View>
                        </View>
                    </View>

                    {/* Element Selection Carousel */}
                    <View style={styles.carouselSection}>
                        <Text style={styles.carouselSubtitle}>
                            New recruits must choose an elemental skill path to follow. Choose your path and start your journey. Each path has a different skill set.
                        </Text>

                        <ScrollView
                            ref={scrollViewRef}
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            onMomentumScrollEnd={handleScroll}
                            style={styles.carouselScrollView}
                            contentContainerStyle={styles.carouselContainer}
                            decelerationRate="fast"
                            snapToInterval={SNAP_INTERVAL}
                            snapToAlignment="start"
                            keyboardShouldPersistTaps="handled"
                        >
                            {ELEMENTS.map((el) => {
                                const isSelected = selectedElement === el.id;
                                return (
                                    <View key={el.id} style={styles.carouselSlide}>
                                        <TouchableOpacity
                                            style={styles.elementCard}
                                            onPress={() => setSelectedElement(el.id)}
                                            activeOpacity={0.9}
                                        >
                                            {/* Pre-rendered banner artwork with element emblem */}
                                            <Image
                                                source={BANNER_IMAGES[el.id]}
                                                style={styles.bannerImage}
                                                resizeMode="stretch"
                                            />

                                            <View style={styles.elementCardContent}>
                                                {/* Element Name */}
                                                <Text style={[styles.elementName, { color: isSelected ? el.color : '#FFF3DA' }]}>
                                                    {el.name}
                                                </Text>

                                                {/* Description / Tagline */}
                                                <Text style={styles.elementTagline}>{el.tagline}</Text>

                                                {/* Power tag — mirrors the Camp hub banner tag pills */}
                                                <View
                                                    style={[
                                                        styles.powerTag,
                                                        isSelected && { borderColor: el.color },
                                                    ]}
                                                >
                                                    <Text style={styles.powerTagText}>
                                                        {el.power.startsWith('+') ? `INNATE ABILITY: ${el.power}` : el.power}
                                                    </Text>
                                                </View>
                                            </View>
                                        </TouchableOpacity>
                                    </View>
                                );
                            })}
                        </ScrollView>

                        {/* Dot page indicators */}
                        <View style={styles.dotsRow}>
                            {ELEMENTS.map((el, index) => {
                                const isSelected = selectedElement === el.id;
                                return (
                                    <TouchableOpacity
                                        key={el.id}
                                        style={[
                                            styles.dot,
                                            isSelected
                                                ? { backgroundColor: el.color, width: 22 }
                                                : { backgroundColor: 'rgba(255,255,255,0.12)' },
                                        ]}
                                        onPress={() => scrollToElement(index)}
                                        activeOpacity={0.7}
                                    />
                                );
                            })}
                        </View>
                    </View>

                    <View style={{ height: 16 }} />
                </ScrollView>

                {/* Pinned Bottom Container for Start Button */}
                <View style={styles.bottomContainer}>
                    <TouchableOpacity
                        style={styles.startBtn}
                        onPress={handleConfirm}
                        onLayout={(e) => {
                            const { width, height } = e.nativeEvent.layout;
                            setStartBtnLayout({ width, height });
                        }}
                        activeOpacity={0.85}
                    >
                        <RuggedBorderBackground width={startBtnLayout.width} height={startBtnLayout.height} />
                        <View style={styles.startSpriteContainer}>
                            <IconGlowBackground size={56} />
                            <ItemSprite spritesheet="icons-1" frameIndex={elementDef ? elementDef.spriteFrame : 0} displaySize={48} />
                        </View>
                        <View style={styles.startTextContainer}>
                            <Text style={styles.startLabel}>START PLAYING</Text>
                            <Text style={styles.startSub}>BEGIN AS {elementDef ? elementDef.name.toUpperCase() : ''}</Text>
                        </View>
                    </TouchableOpacity>
                </View>
            </Animated.View>

            {/* Confirm Modal */}
            <Modal
                visible={confirmModalVisible}
                transparent
                animationType="fade"
                onRequestClose={() => setConfirmModalVisible(false)}
            >
                <Pressable style={styles.modalBackdrop} onPress={() => setConfirmModalVisible(false)}>
                    <Pressable style={styles.modalCard}>
                        <Svg style={StyleSheet.absoluteFill} width="100%" height="100%">
                            <Defs>
                                <RadialGradient id="modalGlow" cx="50%" cy="0%" rx="80%" ry="50%">
                                    <Stop offset="0%" stopColor={elementDef?.color || '#D4A754'} stopOpacity="0.1" />
                                    <Stop offset="100%" stopColor="#14161C" stopOpacity="0" />
                                </RadialGradient>
                            </Defs>
                            <Rect width="100%" height="100%" fill="#14161C" rx={20} />
                            <Rect width="100%" height="100%" fill="url(#modalGlow)" rx={20} />
                            <Rect x="1" y="1" width="98%" height="98%" rx={19} fill="none"
                                stroke={elementDef ? elementDef.borderColor : 'rgba(212,167,84,0.2)'}
                                strokeWidth={1}
                            />
                        </Svg>

                        <View style={styles.modalInner}>
                            <Text style={styles.modalIcon}>{elementDef?.icon}</Text>
                            <Text style={[styles.modalTitle, { color: elementDef?.color || '#D4A754' }]}>
                                Choose {elementDef?.name}?
                            </Text>
                            <Text style={styles.modalBody}>
                                "{heroName.trim() || 'Mochi'}" will embody the{' '}
                                <Text style={{ color: elementDef?.color, fontWeight: 'bold' }}>
                                    {elementDef?.name} element
                                </Text>{' '}
                                for this adventure. This defines your playstyle.
                            </Text>
                            <Text style={styles.modalWarning}>
                                This choice is permanent until you start a new game.
                            </Text>

                            <View style={styles.modalBtns}>
                                <TouchableOpacity
                                    style={styles.modalCancelBtn}
                                    onPress={() => setConfirmModalVisible(false)}
                                >
                                    <Text style={styles.modalCancelText}>Go Back</Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={[styles.modalConfirmBtn, { shadowColor: elementDef?.color }]}
                                    onPress={handleFinalConfirm}
                                    activeOpacity={0.85}
                                >
                                    <Svg style={StyleSheet.absoluteFill} width="100%" height="100%">
                                        <Defs>
                                            <LinearGradient id="confirmGrad" x1="0" y1="0" x2="1" y2="0">
                                                <Stop offset="0%" stopColor={elementDef?.color || '#D4A754'} />
                                                <Stop offset="100%" stopColor={elementDef?.borderColor || '#B5701A'} />
                                            </LinearGradient>
                                        </Defs>
                                        <Rect width="100%" height="100%" fill="url(#confirmGrad)" rx={10} />
                                    </Svg>
                                    <Text style={styles.modalConfirmText}>Confirm {elementDef?.name}</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </Pressable>
                </Pressable>
            </Modal>
        </SafeAreaView>
    );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
    root: {
        flex: 1,
        backgroundColor: '#133131',
    },
    content: {
        flex: 1,
    },
    scroll: {
        paddingTop: 16,
        paddingHorizontal: 20,
    },

    /* Back button */
    backBtn: {
        alignSelf: 'flex-start',
        marginBottom: 14,
    },
    backBtnText: {
        fontFamily: 'Silkscreen-Regular',
        fontSize: 12,
        letterSpacing: 1,
        color: 'rgba(255, 243, 218, 0.6)',
    },

    /* Top tag (overlaps the title plaque's top border) */
    topTagOverlay: {
        position: 'absolute',
        top: -12,
        left: 0,
        right: 0,
        alignItems: 'center',
    },
    topTag: {
        backgroundColor: '#F3E2BD',
        borderColor: '#4A3917',
        borderWidth: 2,
        borderRadius: 8,
        paddingVertical: 5,
        paddingHorizontal: 12,
    },
    topTagText: {
        fontFamily: 'Silkscreen-Regular',
        fontSize: 10,
        letterSpacing: 0,
        color: '#2A1A0C',
    },

    /* Title plaque */
    titlePlaqueOuter: {
        alignSelf: 'center',
        width: PLAQUE_WIDTH,
        borderWidth: 3,
        borderColor: '#4A3917',
        borderRadius: 8,
        backgroundColor: 'transparent',
        padding: 2,
        marginTop: 18,
        marginBottom: 16,
        position: 'relative',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.4,
        shadowRadius: 3,
        elevation: 4,
    },
    titlePlaqueInner: {
        borderWidth: 2,
        borderColor: '#D4A754',
        borderRadius: 5,
        backgroundColor: '#1E1E20',
        paddingVertical: 14,
        paddingHorizontal: 16,
    },
    titlePlaqueText: {
        fontFamily: 'PressStart2P-Regular',
        fontSize: 18,
        lineHeight: 28,
        color: '#FFF3DA',
        textAlign: 'center',
        textShadowColor: '#000',
        textShadowOffset: { width: 1, height: 1 },
        textShadowRadius: 1,
    },

    /* Sections */
    sectionLabel: {
        fontFamily: 'Silkscreen-Regular',
        fontSize: 12,
        letterSpacing: 2,
        color: '#FFF3DA',
        textAlign: 'center',
        marginBottom: 6,
    },
    carouselSubtitle: {
        fontFamily: 'PixelifySans-Regular',
        fontSize: 12,
        lineHeight: 18,
        color: 'rgba(255, 243, 218, 0.6)',
        textAlign: 'center',
        paddingHorizontal: 16,
        marginBottom: 16,
    },

    /* Carousel Section */
    carouselSection: {
        marginBottom: 10,
    },
    carouselScrollView: {
        flexGrow: 0,
    },
    carouselContainer: {
        paddingVertical: 4,
    },
    carouselSlide: {
        width: CARD_WIDTH,
        marginRight: CARD_GAP,
    },
    elementCard: {
        width: '100%',
        aspectRatio: BANNER_ASPECT_RATIO,
        borderRadius: 16,
        position: 'relative',
    },
    bannerImage: {
        width: '100%',
        height: '100%',
    },
    elementCardContent: {
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        top: '50%',
        alignItems: 'center',
        justifyContent: 'flex-start',
        paddingTop: 10,
        paddingHorizontal: 30,
    },
    elementName: {
        fontFamily: 'PressStart2P-Regular',
        fontSize: 20,
        fontWeight: 'normal',
        marginBottom: 4,
        letterSpacing: 1,
    },
    elementTagline: {
        fontFamily: 'PixelifySans-Regular',
        fontSize: 12,
        lineHeight: 16,
        color: 'rgba(255, 243, 218, 0.65)',
        textAlign: 'center',
        paddingHorizontal: 45,
        marginBottom: 5,
    },
    powerTag: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F3E2BD',
        borderColor: '#4A3917',
        borderWidth: 2,
        borderRadius: 8,
        paddingVertical: 3,
        paddingHorizontal: 8,
    },
    powerTagText: {
        fontFamily: 'Silkscreen-Regular',
        fontSize: 8,
        letterSpacing: 0,
        color: '#2A1A0C',
    },

    /* Carousel indicators */
    dotsRow: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 12,
        gap: 8,
    },
    dot: {
        height: 7,
        borderRadius: 4,
        width: 7,
    },

    /* Bottom Pinned Button container */
    bottomContainer: {
        paddingHorizontal: 20,
        paddingTop: 12,
        paddingBottom: 16,
    },

    /* Start button (mirrors CampScreen's "Start Adventure" card) */
    startBtn: {
        width: '100%',
        paddingVertical: 14,
        paddingHorizontal: 20,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'flex-start',
        gap: 16,
    },
    startSpriteContainer: {
        justifyContent: 'center',
        alignItems: 'center',
        width: 64,
        height: 64,
        position: 'relative',
    },
    startTextContainer: {
        justifyContent: 'center',
        alignItems: 'flex-start',
    },
    startLabel: {
        fontFamily: 'PixelifySans-Medium',
        fontWeight: 'normal',
        fontSize: 24,
        color: '#FFF3DA',
        textTransform: 'uppercase',
    },
    startSub: {
        fontFamily: 'Silkscreen-Regular',
        fontWeight: 'normal',
        fontSize: 10,
        color: '#FFEED0',
        marginTop: 2,
    },

    /* Modal */
    modalBackdrop: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.85)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
    },
    modalCard: {
        width: '100%',
        maxWidth: 340,
        borderRadius: 20,
        overflow: 'hidden',
    },
    modalInner: {
        padding: 24,
        alignItems: 'center',
    },
    modalIcon: {
        fontSize: 44,
        marginBottom: 10,
    },
    modalTitle: {
        fontFamily: 'PixelifySans-Medium',
        fontSize: 22,
        fontWeight: 'normal',
        marginBottom: 12,
        letterSpacing: 0.5,
    },
    modalBody: {
        fontFamily: 'PixelifySans-Regular',
        fontSize: 13,
        color: 'rgba(255,255,255,0.7)',
        textAlign: 'center',
        lineHeight: 19,
        marginBottom: 10,
    },
    modalWarning: {
        fontFamily: 'PixelifySans-Regular',
        fontSize: 11,
        color: 'rgba(255,255,255,0.3)',
        textAlign: 'center',
        marginBottom: 24,
        fontStyle: 'italic',
    },
    modalBtns: {
        flexDirection: 'row',
        gap: 12,
        width: '100%',
    },
    modalCancelBtn: {
        flex: 1,
        height: 46,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.08)',
        backgroundColor: 'rgba(255,255,255,0.03)',
    },
    modalCancelText: {
        fontFamily: 'PixelifySans-Medium',
        fontSize: 13,
        fontWeight: 'normal',
        color: 'rgba(255,255,255,0.5)',
    },
    modalConfirmBtn: {
        flex: 2,
        height: 46,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.4,
        shadowRadius: 10,
        elevation: 4,
    },
    modalConfirmText: {
        fontFamily: 'PixelifySans-Medium',
        fontSize: 13,
        fontWeight: 'normal',
        color: '#1A1200',
        zIndex: 2,
        letterSpacing: 0.3,
    },
});

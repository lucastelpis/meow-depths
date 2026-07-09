import { createAudioPlayer, setAudioModeAsync } from 'expo-audio';

const AUDIO_ASSETS = {
  hub: require('../../assets/sounds/hub&menus.mp3'),
  zone1: require('../../assets/sounds/soggy-ruins.mp3'),
  zone2: require('../../assets/sounds/forest.mp3'),
  zone3: require('../../assets/sounds/sunken-docks.mp3'),
  'hero-attack': require('../../assets/sounds/hero-attack.mp3'),
  'enemy-attack': require('../../assets/sounds/enemy-attack.mp3'),
};

class SoundManager {
  constructor() {
    this.musicPlayer = null;
    this.currentMusicKey = null;
    this.isMuted = false;
    this.isInitialized = false;
  }

  async init() {
    if (this.isInitialized) return;
    try {
      await setAudioModeAsync({
        playsInSilentMode: true,
        interruptionMode: 'mixWithOthers',
      });
      this.isInitialized = true;
    } catch (error) {
      console.warn('[SoundManager] Failed to set audio mode:', error);
    }
  }

  setMuted(muted) {
    this.isMuted = !!muted;
    if (this.musicPlayer) {
      try {
        this.musicPlayer.muted = this.isMuted;
      } catch (err) {
        console.warn('[SoundManager] Failed to set music mute status:', err);
      }
    }
  }

  async playMusic(trackKey) {
    await this.init();

    if (this.currentMusicKey === trackKey && this.musicPlayer) {
      // Already playing this track, make sure volume/mute is sync'd
      try {
        this.musicPlayer.muted = this.isMuted;
      } catch (err) {}
      return;
    }

    // Stop and release previous music
    if (this.musicPlayer) {
      try {
        this.musicPlayer.pause();
        this.musicPlayer.release();
      } catch (err) {
        console.warn('[SoundManager] Error releasing music:', err);
      }
      this.musicPlayer = null;
    }

    const source = AUDIO_ASSETS[trackKey];
    if (!source) {
      console.warn(`[SoundManager] Music track "${trackKey}" not found`);
      this.currentMusicKey = null;
      return;
    }

    this.currentMusicKey = trackKey;

    try {
      const player = createAudioPlayer(source, { keepAudioSessionActive: true });
      player.loop = true;
      player.volume = 0.5; // keep BGM slightly quieter than SFX
      player.muted = this.isMuted;
      
      player.play();
      this.musicPlayer = player;
    } catch (error) {
      console.warn(`[SoundManager] Failed to play music "${trackKey}":`, error);
    }
  }

  async stopMusic() {
    if (this.musicPlayer) {
      try {
        this.musicPlayer.pause();
        this.musicPlayer.release();
      } catch (err) {
        console.warn('[SoundManager] Error stopping music:', err);
      }
      this.musicPlayer = null;
    }
    this.currentMusicKey = null;
  }

  async playSfx(sfxKey) {
    if (this.isMuted) return;
    await this.init();

    const source = AUDIO_ASSETS[sfxKey];
    if (!source) {
      console.warn(`[SoundManager] SFX "${sfxKey}" not found`);
      return;
    }

    try {
      const player = createAudioPlayer(source, { keepAudioSessionActive: true });
      player.volume = 1.0;
      player.loop = false;
      
      const subscription = player.addListener('playbackStatusUpdate', (status) => {
        if (status.didJustFinish) {
          subscription.remove();
          player.release();
        }
      });

      player.play();
    } catch (error) {
      console.warn(`[SoundManager] Failed to play SFX "${sfxKey}":`, error);
    }
  }
}

export default new SoundManager();

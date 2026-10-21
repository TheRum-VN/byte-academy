export type AudioStatus = 'played' | 'muted' | 'unavailable' | 'blocked';
export interface VoiceLine {
  text: string;
  mp3?: string;
}
export const voiceLines: Record<string, VoiceLine> = {
  welcome: {
    text: 'Xin chào, nhà thám hiểm nhỏ! Hôm nay em muốn khám phá điều gì?',
  },
};

/** Register supplied MP3 URLs by voice ID. No requests are made for absent recordings. */
export class AudioManager {
  private audio?: HTMLAudioElement;
  private muted = true;
  private volume = 0.8;
  private revision = 0;
  constructor(private lines: Record<string, VoiceLine> = voiceLines) {}
  register(id: string, line: VoiceLine) {
    this.lines[id] = line;
  }
  configure(muted: boolean, volume: number) {
    this.muted = muted;
    this.volume = Math.max(0, Math.min(1, volume));
    if (this.audio) this.audio.volume = this.volume;
    if (muted || !this.volume) this.stop();
  }
  stop() {
    this.revision++;
    this.audio?.pause();
    this.audio = undefined;
    if (typeof window !== 'undefined' && 'speechSynthesis' in window)
      window.speechSynthesis.cancel();
  }
  async play(id: string, fallbackText?: string): Promise<AudioStatus> {
    this.stop();
    if (this.muted || !this.volume) return 'muted';
    const revision = this.revision;
    const line = this.lines[id];
    if (line?.mp3) {
      try {
        const audio = new Audio(line.mp3);
        this.audio = audio;
        audio.volume = this.volume;
        await audio.play();
        if (revision !== this.revision) {
          audio.pause();
          return 'muted';
        }
        return 'played';
      } catch (error) {
        if (revision !== this.revision) return 'muted';
        this.audio?.pause();
        this.audio = undefined;
        if (error instanceof Error && error.name === 'NotAllowedError')
          return 'blocked';
      }
    }
    if (revision !== this.revision || this.muted) return 'muted';
    if (typeof window === 'undefined' || !('speechSynthesis' in window))
      return 'unavailable';
    const voice = window.speechSynthesis
      .getVoices()
      .find((v) => /^vi[-_]VN$/i.test(v.lang));
    const text = line?.text ?? fallbackText;
    if (!voice || !text) return 'unavailable';
    try {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.voice = voice;
      utterance.lang = 'vi-VN';
      utterance.volume = this.volume;
      utterance.rate = 0.9;
      utterance.onerror = () => {
        /* Text instructions remain visible if the OS voice fails. */
      };
      window.speechSynthesis.speak(utterance);
      return 'played';
    } catch {
      return 'unavailable';
    }
  }
}
export const audioManager = new AudioManager();

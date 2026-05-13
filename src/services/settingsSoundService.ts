import { Audio, AVPlaybackStatus } from 'expo-av';

class SettingsSoundService {
  private sound: Audio.Sound | null = null;

  public async playBeep(): Promise<void> {
    await this.stop();

    const { sound } = await Audio.Sound.createAsync(
      require('../../assets/audio/settings-beep.wav'),
      { shouldPlay: true }
    );

    this.sound = sound;

    return new Promise((resolve) => {
      sound.setOnPlaybackStatusUpdate((status: AVPlaybackStatus) => {
        if (!status.isLoaded) return;

        if (status.didJustFinish) {
          void this.stop();
          resolve();
        }
      });
    });
  }

  public async stop(): Promise<void> {
    if (!this.sound) return;

    try {
      await this.sound.stopAsync();
    } catch {}

    try {
      await this.sound.unloadAsync();
    } catch {}

    this.sound = null;
  }
}

export default new SettingsSoundService();

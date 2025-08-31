declare module 'react-native-audio-recorder-player' {
  export default class AudioRecorderPlayer {
    startRecorder(uri?: string, audioSet?: any): Promise<string>;
    stopRecorder(): Promise<string>;
    startPlayer(path?: string): Promise<string>;
    stopPlayer(): Promise<string>;
    pausePlayer(): Promise<string>;
    resumePlayer(): Promise<string>;
    addRecordBackListener(callback: Function): void;
    removeRecordBackListener(): void;
    addPlayBackListener(callback: Function): void;
    removePlayBackListener(): void;
  }
}

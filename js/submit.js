/**
 * Flag submission and validation logic.
 */
import { StorageManager } from "./storage.js";

export class FlagValidator {
  static validate(inputFlag, currentLevelData, levels, currentIndex) {
    const expected = currentLevelData.flag.trim();
    if (inputFlag.trim() === expected) {
      const isLastLevel = currentIndex >= levels.length - 1;
      const nextIndex = currentIndex + 1;

      if (!isLastLevel) {
        StorageManager.setCurrentLevel(nextIndex + 1);
      } else {
        StorageManager.setCompleted(true);
      }

      return {
        accepted: true,
        isLastLevel,
        nextIndex
      };
    }

    return {
      accepted: false
    };
  }
}

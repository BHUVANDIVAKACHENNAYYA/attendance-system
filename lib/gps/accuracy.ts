/**
 * GPS Accuracy Verification
 * Handles device accuracy thresholding to prevent erroneous attendance records
 * caused by coarse triangulation or indoor multipath reflections.
 */

export interface AccuracyValidationResult {
  isValid: boolean;
  accuracy: number;
  maxAllowed: number;
  message?: string;
}

export function validateGpsAccuracy(
  accuracyMeters: number,
  maxAllowedAccuracyMeters: number = 100
): AccuracyValidationResult {
  if (typeof accuracyMeters !== 'number' || isNaN(accuracyMeters) || accuracyMeters < 0) {
    return {
      isValid: false,
      accuracy: accuracyMeters,
      maxAllowed: maxAllowedAccuracyMeters,
      message: 'Invalid GPS accuracy reading received from device.',
    };
  }

  if (accuracyMeters > maxAllowedAccuracyMeters) {
    return {
      isValid: false,
      accuracy: Math.round(accuracyMeters),
      maxAllowed: maxAllowedAccuracyMeters,
      message: `Your location accuracy is too low (${Math.round(accuracyMeters)}m). Allowed maximum is ${maxAllowedAccuracyMeters}m. Please ensure GPS/Location services are enabled in High Accuracy mode, move near a window/open area, and try again.`,
    };
  }

  return {
    isValid: true,
    accuracy: Math.round(accuracyMeters * 10) / 10,
    maxAllowed: maxAllowedAccuracyMeters,
  };
}

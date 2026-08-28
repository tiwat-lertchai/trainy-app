export type CapturedLocation = { latitude: number; longitude: number; accuracyMeters: number };

// The browser permission prompt only appears when this runs from a direct
// user action (a click), never on page load or a timer.
export function requestLocation(): Promise<CapturedLocation> {
	return new Promise((resolve, reject) => {
		if (!("geolocation" in navigator)) return reject(new Error("GEOLOCATION_UNSUPPORTED"));
		navigator.geolocation.getCurrentPosition(
			(position) => resolve({ latitude: position.coords.latitude, longitude: position.coords.longitude, accuracyMeters: Math.max(1, Math.round(position.coords.accuracy)) }),
			() => reject(new Error("GEOLOCATION_DENIED")),
			{ enableHighAccuracy: true, timeout: 10_000, maximumAge: 0 },
		);
	});
}

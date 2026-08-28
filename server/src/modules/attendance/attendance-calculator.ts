export function distanceMeters(
  from: { latitude: number; longitude: number },
  to: { latitude: number; longitude: number },
) {
  const radians = (degrees: number) => (degrees * Math.PI) / 180;
  const latitudeDelta = radians(to.latitude - from.latitude);
  const longitudeDelta = radians(to.longitude - from.longitude);
  const a =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(radians(from.latitude)) *
      Math.cos(radians(to.latitude)) *
      Math.sin(longitudeDelta / 2) ** 2;
  return 6_371_000 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function calculateAttendance(input: {
  checkedInAt: Date;
  checkedOutAt: Date;
  scheduledStart: Date;
  scheduledEnd: Date;
  breakMinutes: number;
  graceMinutes: number;
}) {
  const late =
    input.checkedInAt.getTime() > input.scheduledStart.getTime() + input.graceMinutes * 60_000;
  const leftEarly = input.checkedOutAt.getTime() < input.scheduledEnd.getTime();
  const elapsedMinutes = Math.max(
    0,
    Math.floor((input.checkedOutAt.getTime() - input.checkedInAt.getTime()) / 60_000),
  );
  return {
    netMinutes: Math.max(0, elapsedMinutes - input.breakMinutes),
    status:
      late && leftEarly
        ? ("late_and_left_early" as const)
        : late
          ? ("late" as const)
          : leftEarly
            ? ("left_early" as const)
            : ("complete" as const),
  };
}

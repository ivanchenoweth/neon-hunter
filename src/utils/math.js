export const lerp = (a, b, t) => a + (b - a) * t;

export const clamp = (val, min, max) => Math.max(min, Math.min(max, val));

export const getDistance = (x1, y1, x2, y2) => {
    const dx = x2 - x1;
    const dy = y2 - y1;
    return Math.sqrt(dx * dx + dy * dy);
};

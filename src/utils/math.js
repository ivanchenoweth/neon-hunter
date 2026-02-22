export const lerp = (a, b, t) => a + (b - a) * t;

export const clamp = (val, min, max) => Math.max(min, Math.min(max, val));

export const getDistance = (x1, y1, x2, y2) => {
    const dx = x2 - x1;
    const dy = y2 - y1;
    return Math.sqrt(dx * dx + dy * dy);
};

export const normalize = (x, y) => {
    const dist = Math.sqrt(x * x + y * y);
    if (dist === 0) return { x: 0, y: 0 };
    return { x: x / dist, y: y / dist };
};

export const randomRange = (min, max) => Math.random() * (max - min) + min;

export const randomRGB = () => {
    const r = Math.floor(Math.random() * 256);
    const g = Math.floor(Math.random() * 256);
    const b = Math.floor(Math.random() * 256);
    return `rgb(${r},${g},${b})`;
};

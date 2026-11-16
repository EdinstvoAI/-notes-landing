const cache = new Map();
let probe = null;
export function parseColor(color) {
    const known = cache.get(color);
    if (known) {
        cache.delete(color);
        cache.set(color, known);
        return known;
    }
    probe ??= document.createElement("canvas").getContext("2d", { willReadFrequently: true });
    if (!probe)
        return [1, 1, 1, 1];
    probe.clearRect(0, 0, 1, 1);
    probe.fillStyle = "#fff";
    probe.fillStyle = color;
    probe.fillRect(0, 0, 1, 1);
    const [r, g, b, a] = probe.getImageData(0, 0, 1, 1).data;
    const rgba = a ? [r / 255, g / 255, b / 255, a / 255] : [0, 0, 0, 0];
    cache.set(color, rgba);
    if (cache.size > 256)
        cache.delete(cache.keys().next().value);
    return rgba;
}
export function prefersDark() {
    const theme = document.documentElement.dataset.theme;
    if (theme)
        return theme === "dark";
    return matchMedia("(prefers-color-scheme: dark)").matches;
}
export function resolveTint(tint) {
    const [r, g, b] = parseColor(tint === "auto" ? (prefersDark() ? "#1c1c1e" : "#f9f9f9") : tint);
    return [r, g, b];
}
//# sourceMappingURL=color.js.map
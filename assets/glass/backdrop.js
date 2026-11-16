import { captured } from "./capture.js";
import { parseColor, prefersDark } from "./color.js";
import { fitBox } from "./geometry.js";
const viewport = () => ({ x: 0, y: 0, w: innerWidth, h: innerHeight });
const images = new Map();
const solids = new Map();
function naturalSize(image) {
    if (image instanceof HTMLImageElement)
        return image.complete ? [image.naturalWidth, image.naturalHeight] : [0, 0];
    if (image instanceof HTMLVideoElement)
        return image.readyState >= 2 ? [image.videoWidth, image.videoHeight] : [0, 0];
    return [image.width, image.height];
}
function whenReady(image, onReady) {
    if (image instanceof HTMLImageElement)
        image.addEventListener("load", onReady, { once: true });
    if (image instanceof HTMLVideoElement)
        image.addEventListener("loadeddata", onReady, { once: true });
}
function solid(color) {
    let canvas = solids.get(color);
    if (!canvas) {
        canvas = document.createElement("canvas");
        canvas.width = canvas.height = 1;
        const context = canvas.getContext("2d");
        context.fillStyle = color;
        context.fillRect(0, 0, 1, 1);
        solids.set(color, canvas);
    }
    return { image: canvas, width: 1, height: 1, map: viewport(), live: false };
}
function fromImage(image, onReady) {
    const [width, height] = naturalSize(image);
    if (!width || !height) {
        whenReady(image, onReady);
        return null;
    }
    let map = viewport();
    if (image instanceof Element && image.isConnected) {
        const rect = image.getBoundingClientRect();
        const fit = getComputedStyle(image).objectFit;
        if (rect.width && rect.height)
            map = fitBox({ x: rect.left, y: rect.top, w: rect.width, h: rect.height }, width, height, image instanceof HTMLCanvasElement && fit === "fill" ? "fill" : fit);
    }
    const live = image instanceof HTMLVideoElement ? !image.paused : image instanceof HTMLCanvasElement || image instanceof OffscreenCanvas;
    return { image, width, height, map, live };
}
function loadImage(url, onReady) {
    let image = images.get(url);
    if (!image) {
        image = new Image();
        image.crossOrigin = "anonymous";
        image.src = url;
        images.set(url, image);
    }
    if (!image.complete)
        image.addEventListener("load", onReady, { once: true });
    return image;
}
function fromCapture(element, content, onReady) {
    const canvas = captured(element, content, onReady);
    if (!canvas)
        return null;
    const rect = element.getBoundingClientRect();
    return { image: canvas, width: canvas.width, height: canvas.height, map: { x: rect.left, y: rect.top, w: rect.width, h: rect.height }, live: false };
}
function fromBackground(element, onReady) {
    const style = getComputedStyle(element);
    if (style.backgroundImage.includes("gradient("))
        return fromCapture(element, false, onReady);
    const url = /url\(["']?(.+?)["']?\)/.exec(style.backgroundImage)?.[1];
    if (url) {
        const image = loadImage(url, onReady);
        if (!image.complete || !image.naturalWidth)
            return null;
        const rect = element.getBoundingClientRect();
        const page = element === document.body || element === document.documentElement;
        const box = style.backgroundAttachment === "fixed" || page ? viewport() : { x: rect.left, y: rect.top, w: rect.width, h: rect.height };
        const fit = style.backgroundSize === "cover" ? "cover" : style.backgroundSize === "contain" ? "contain" : style.backgroundSize === "100% 100%" ? "fill" : "none";
        return { image, width: image.naturalWidth, height: image.naturalHeight, map: fitBox(box, image.naturalWidth, image.naturalHeight, fit), live: false };
    }
    if (parseColor(style.backgroundColor)[3] > 0.99)
        return solid(style.backgroundColor);
    return undefined;
}
function discover(host, rect, onReady) {
    const x = Math.max(0, Math.min(innerWidth - 1, rect.left + rect.width / 2));
    const y = Math.max(0, Math.min(innerHeight - 1, rect.top + rect.height / 2));
    let stack = document.elementsFromPoint(x, y);
    const hostIndex = stack.indexOf(host);
    if (hostIndex >= 0)
        stack = stack.slice(hostIndex + 1);
    for (const element of stack) {
        if (element === host || host.contains(element) || element.hasAttribute("data-engine"))
            continue;
        if (element instanceof HTMLImageElement || element instanceof HTMLCanvasElement || element instanceof HTMLVideoElement) {
            const found = fromImage(element, onReady);
            if (found)
                return found;
            continue;
        }
        const found = fromBackground(element, onReady);
        if (found !== undefined)
            return found;
    }
    return solid(prefersDark() ? "#000" : "#fff");
}
export function resolveBackdrop(host, rect, source, onReady) {
    if (source === "auto")
        return discover(host, rect, onReady);
    if (typeof source === "string") {
        const element = document.querySelector(source);
        if (element instanceof HTMLImageElement || element instanceof HTMLCanvasElement || element instanceof HTMLVideoElement)
            return fromImage(element, onReady);
        if (!element)
            return null;
        return /url\(/.test(getComputedStyle(element).backgroundImage) && !element.childElementCount ? (fromBackground(element, onReady) ?? null) : fromCapture(element, true, onReady);
    }
    return fromImage(source, onReady);
}
//# sourceMappingURL=backdrop.js.map
import { geometryDefaults } from "./geometry.js";
export const motionRanges = {
    follow: [0, 1],
    press: [0, 1],
    jelly: [0, 1],
    glow: [0, 1],
    morph: [0, 1],
    merge: [0, 64],
};
export const motionKeys = Object.keys(motionRanges);
export const motionDefaults = { follow: 0.5, press: 0.5, jelly: 0.6, glow: 0.5, morph: 0.6, merge: 0 };
export const still = { follow: 0, press: 0, jelly: 0, glow: 0, morph: 0, merge: 0 };
export function resolveMotion(...layers) {
    const result = { ...motionDefaults };
    for (const layer of layers) {
        for (const key of motionKeys) {
            const value = layer?.[key];
            if (typeof value === "number" && Number.isFinite(value))
                result[key] = Math.min(motionRanges[key][1], Math.max(motionRanges[key][0], value));
        }
    }
    return result;
}
export class Spring {
    stiffness;
    damping;
    value;
    target;
    velocity = 0;
    constructor(value = 0, stiffness = 260, damping = 20) {
        this.stiffness = stiffness;
        this.damping = damping;
        this.value = this.target = value;
    }
    step(dt) {
        this.velocity += ((this.target - this.value) * this.stiffness - this.velocity * this.damping) * dt;
        this.value += this.velocity * dt;
        if (this.settled)
            this.snap(this.target);
    }
    tune(stiffness) {
        this.stiffness = stiffness;
        this.damping = Math.sqrt(stiffness) * 1.1;
    }
    snap(value) {
        this.value = this.target = value;
        this.velocity = 0;
    }
    shift(delta) {
        this.value += delta;
        this.target += delta;
    }
    get settled() {
        return Math.abs(this.target - this.value) < 0.01 && Math.abs(this.velocity) < 0.05;
    }
}
const liquid = () => new Spring(0, 190, 15);
const clamp = (value, limit) => Math.max(-limit, Math.min(limit, value));
export class Shape {
    element;
    wake;
    x = liquid();
    y = liquid();
    w = liquid();
    h = liquid();
    pointerX = new Spring();
    pointerY = new Spring();
    held = new Spring(0, 320, 22);
    glow = new Spring(0, 60, 14);
    touchX = 0;
    touchY = 0;
    radius = 0;
    geometry = geometryDefaults;
    aspect = 1;
    placed = false;
    motion = motionDefaults;
    springs = [this.x, this.y, this.w, this.h, this.pointerX, this.pointerY, this.held, this.glow];
    cleanup = null;
    constructor(element, wake) {
        this.element = element;
        this.wake = wake;
    }
    get moving() {
        return this.springs.some((spring) => !spring.settled);
    }
    get pressed() {
        return this.held.target === 1;
    }
    attach() {
        const { element } = this;
        const aim = (event) => {
            const rect = element.getBoundingClientRect();
            this.pointerX.target = clamp(((event.clientX - rect.left) / rect.width) * 2 - 1, 1);
            this.pointerY.target = clamp(((event.clientY - rect.top) / rect.height) * 2 - 1, 1);
            this.touchX = event.clientX;
            this.touchY = event.clientY;
            this.wake();
        };
        const leave = () => {
            if (this.pressed)
                return;
            this.pointerX.target = this.pointerY.target = 0;
            this.wake();
        };
        const down = (event) => {
            aim(event);
            this.held.target = 1;
            this.glow.target = 1;
            this.wake();
            addEventListener("pointermove", aim);
        };
        const up = () => {
            if (!this.pressed)
                return;
            removeEventListener("pointermove", aim);
            this.held.target = this.glow.target = 0;
            this.pointerX.target = this.pointerY.target = 0;
            this.wake();
        };
        element.addEventListener("pointermove", aim);
        element.addEventListener("pointerleave", leave);
        element.addEventListener("pointerdown", down);
        addEventListener("pointerup", up);
        addEventListener("pointercancel", up);
        this.cleanup = () => {
            element.removeEventListener("pointermove", aim);
            element.removeEventListener("pointerleave", leave);
            element.removeEventListener("pointerdown", down);
            removeEventListener("pointerup", up);
            removeEventListener("pointercancel", up);
            removeEventListener("pointermove", aim);
        };
    }
    detach() {
        this.cleanup?.();
        this.cleanup = null;
        this.element.style.removeProperty("--glass-scale");
    }
    read(rect, scrolled, grow) {
        const animate = this.motion.morph > 0;
        const { x, y, w, h } = this;
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        if (!this.placed || !animate) {
            x.snap(cx);
            y.snap(cy);
            if (this.placed || !grow || !animate) {
                w.snap(rect.width);
                h.snap(rect.height);
            }
            else {
                w.target = rect.width;
                h.target = rect.height;
            }
            this.placed = true;
            return;
        }
        if (scrolled) {
            x.shift(cx - x.target);
            y.shift(cy - y.target);
        }
        x.target = cx;
        y.target = cy;
        w.target = rect.width;
        h.target = rect.height;
    }
    step(dt) {
        const stiffness = 420 - 300 * this.motion.morph;
        for (const spring of [this.x, this.y, this.w, this.h])
            spring.tune(stiffness);
        for (const spring of this.springs)
            spring.step(dt);
    }
    box(scale) {
        const { press, jelly, merge } = this.motion;
        const swell = 1 + this.held.value * press * 0.12;
        const pull = this.held.value * jelly * 0.1 * (Math.abs(this.pointerX.value) - Math.abs(this.pointerY.value));
        const speedX = clamp(this.x.velocity / 2400, 0.22) * jelly * 1.6;
        const speedY = clamp(this.y.velocity / 2400, 0.22) * jelly * 1.6;
        const squash = Math.abs(speedX) - Math.abs(speedY);
        const halfW = Math.max(this.w.value, 0) / 2 * swell * (1 + pull + squash) * scale;
        const halfH = Math.max(this.h.value, 0) / 2 * swell * (1 - pull - squash) * scale;
        this.element.style.setProperty("--glass-scale", swell.toFixed(4));
        return { x: this.x.value, y: this.y.value, halfW, halfH, radius: Math.min(this.radius, halfW, halfH), join: merge, geometry: this.geometry, aspect: this.aspect };
    }
}
//# sourceMappingURL=interaction.js.map
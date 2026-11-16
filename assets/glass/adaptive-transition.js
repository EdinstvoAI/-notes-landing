export class AdaptiveTransition {
    value;
    moving = false;
    constructor(value) {
        this.value = value;
    }
    step(target, seconds, duration) {
        const amount = duration <= 0 ? 1 : 1 - Math.exp(-Math.max(0, seconds) * 5000 / duration);
        const blend = (a, b) => a + (b - a) * amount;
        const rgb = (a, b) => [blend(a[0], b[0]), blend(a[1], b[1]), blend(a[2], b[2])];
        const previous = this.value;
        this.value = { tint: rgb(previous.tint, target.tint), foreground: rgb(previous.foreground, target.foreground), transparency: blend(previous.transparency, target.transparency), frost: blend(previous.frost, target.frost) };
        const delta = Math.max(...this.value.tint.map((c, i) => Math.abs(c - target.tint[i])), ...this.value.foreground.map((c, i) => Math.abs(c - target.foreground[i])), Math.abs(this.value.transparency - target.transparency), Math.abs(this.value.frost - target.frost));
        this.moving = delta > 0.0005;
        if (!this.moving)
            this.value = target;
        return this.value;
    }
}
//# sourceMappingURL=adaptive-transition.js.map
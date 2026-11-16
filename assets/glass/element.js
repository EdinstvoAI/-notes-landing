import { motionKeys } from "./interaction.js";
import { kebab, numericKeys, readValue, stackLayers } from "./material.js";
import { GlassSurface, placeCanvas, readMotion } from "./surface.js";
import { readGeometry, resolveGeometry } from "./geometry.js";
const Base = (globalThis.HTMLElement ?? class {
});
const css = `
:host {
  display: inline-block;
  position: relative;
  isolation: isolate;
  border-radius: var(--glass-radius, 24px);
}
.shade {
  position: absolute;
  inset: 0;
  z-index: -1;
  border-radius: inherit;
  box-shadow: var(--glass-shadow, 0 8px 32px rgb(0 0 0 / .1));
  pointer-events: none;
}
:host([data-grouped]) .shade,
:host([data-glass-group]) .shade {
  display: none;
}
:host(:not([data-engine="webgl"])) {
  background: var(--glass-fallback, rgb(255 255 255 / .22));
  -webkit-backdrop-filter: blur(16px) saturate(1.6);
  backdrop-filter: blur(16px) saturate(1.6);
}
:host([data-grouped]) {
  background: none;
  -webkit-backdrop-filter: none;
  backdrop-filter: none;
}
:host([data-grouped]) > canvas {
  display: none;
}
:host([data-glass-group]) {
  display: block;
  border-radius: 0;
  background: none;
  -webkit-backdrop-filter: none;
  backdrop-filter: none;
}
.content {
  display: block;
  position: relative;
  z-index: 1;
  border-radius: inherit;
  scale: var(--glass-scale, 1);
  opacity: var(--glass-appear, 1);
  color: var(--glass-foreground, inherit);
}
@media (forced-colors: active) {
  :host { background: Canvas; border: 1px solid CanvasText; }
  canvas, .shade { display: none; }
  .content { color: CanvasText; }
}
`;
const materialAttributes = new Map(numericKeys.map((key) => [kebab(key), key]));
export class EdinstvoGlass extends Base {
    static observedAttributes = ["source", "live", "tint", "light-color", "adaptation", "foreground", "dispersion-mode", "shape", "curvature", "path", "view-box", "fill-rule", "appear", "layer", ...motionKeys, ...materialAttributes.keys()];
    surface;
    group = null;
    parentGroup = null;
    standing = false;
    ready = false;
    sourceValue;
    materialValue;
    geometryValue;
    constructor() {
        super();
        const root = this.attachShadow({ mode: "open" });
        const style = document.createElement("style");
        style.textContent = css;
        const canvas = document.createElement("canvas");
        canvas.setAttribute("part", "glass");
        placeCanvas(canvas);
        const shade = document.createElement("i");
        shade.className = "shade";
        const content = document.createElement("span");
        content.className = "content";
        content.setAttribute("part", "content");
        content.append(document.createElement("slot"));
        root.append(style, shade, canvas, content);
        this.surface = new GlassSurface(this, canvas, {}, this.isGroup);
    }
    get isGroup() {
        return false;
    }
    connectedCallback() {
        this.parentGroup = this.parentElement?.closest("[data-glass-group]") ?? null;
        this.ready = true;
        this.place();
    }
    disconnectedCallback() {
        this.ready = false;
        if (this.group)
            this.leave();
        if (this.standing)
            this.surface.disconnect();
        this.standing = false;
    }
    leave() {
        this.group?.release(this);
        this.group = null;
        delete this.dataset.grouped;
    }
    place() {
        const parent = this.parentGroup;
        const reach = parent ? parseFloat(this.getAttribute("merge") ?? parent.getAttribute("merge") ?? "0") : 0;
        if (parent && reach > 0) {
            if (this.standing)
                this.surface.disconnect();
            this.standing = false;
            if (!this.group) {
                this.dataset.grouped = "";
                parent.adopt(this);
                this.group = parent;
            }
            parent.refresh();
            return;
        }
        if (this.group)
            this.leave();
        this.sync();
        if (!this.standing)
            this.surface.connect();
        this.standing = true;
    }
    show() {
        return this.surface.show();
    }
    hide() {
        return this.surface.hide();
    }
    attributeChangedCallback() {
        if (this.ready)
            this.place();
    }
    get source() {
        return this.sourceValue ?? this.getAttribute("source") ?? "auto";
    }
    set source(value) {
        this.sourceValue = value;
        this.sync();
    }
    get material() {
        return this.materialValue ?? {};
    }
    get geometry() { return this.geometryValue ?? {}; }
    set geometry(value) {
        resolveGeometry(value);
        this.geometryValue = { ...value, ...(value.viewBox ? { viewBox: [...value.viewBox] } : {}) };
        if (this.ready)
            this.place();
    }
    set material(value) {
        this.materialValue = value;
        this.sync();
    }
    invalidate() {
        this.surface.invalidate();
    }
    sync() {
        const live = this.getAttribute("live");
        const layer = this.getAttribute("layer");
        if (layer !== null)
            this.style.zIndex = layer;
        this.surface.set({
            material: this.composeMaterial(),
            geometry: readGeometry(this),
            motion: this.parentGroup ? readMotion(this.parentGroup) : undefined,
            source: this.source,
            live: live === null ? undefined : live !== "false",
            appear: this.hasAttribute("appear"),
        });
    }
    composeMaterial() {
        const overrides = {};
        for (const [attribute, key] of materialAttributes) {
            const value = this.getAttribute(attribute);
            if (value !== null)
                overrides[key] = readValue(key, value);
        }
        const tint = this.getAttribute("tint");
        if (tint)
            overrides.tint = tint;
        const color = this.getAttribute("light-color");
        if (color)
            overrides.lightColor = color;
        for (const key of ["adaptation", "foreground", "dispersionMode"]) {
            const value = this.getAttribute(kebab(key));
            if (value)
                overrides[key] = value;
        }
        return stackLayers(this.parentGroup?.composeMaterial(), this.material, overrides);
    }
}
export class EdinstvoGlassGroup extends EdinstvoGlass {
    get isGroup() {
        return true;
    }
    connectedCallback() {
        this.dataset.glassGroup = "";
        super.connectedCallback();
    }
    place() {
        super.place();
        for (const child of this.querySelectorAll("[data-engine]")) {
            if (child instanceof EdinstvoGlass)
                child.place();
        }
    }
    adopt(child) {
        this.surface.track(child);
    }
    release(child) {
        this.surface.untrack(child);
    }
    refresh() {
        this.surface.restyle();
    }
}
export function defineGlass(tag = "edinstvo-glass") {
    if (!customElements.get(`${tag}-group`))
        customElements.define(`${tag}-group`, class extends EdinstvoGlassGroup {
        });
    if (!customElements.get(tag))
        customElements.define(tag, class extends EdinstvoGlass {
        });
}
//# sourceMappingURL=element.js.map
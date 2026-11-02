export type Point = { x: number; y: number; z?: number };
export type Gesture = { point: Point | null; phase: 'move' | 'grab' | 'release' | 'lost'; pinching: boolean };

/** Time-based hysteresis: frame rate and camera distance must not change the gesture. */
export class PinchTracker {
  private pinching = false;
  private armed = false;
  private candidate = -1;
  private lastSeen = -1;
  private lastTime = 0;
  private position: Point | null = null;
  reset() {
    this.pinching = false; this.armed = false; this.candidate = -1;
    this.lastSeen = -1; this.position = null; this.lastTime = 0;
  }
  update(points: Point[] | undefined, now: number, aspect = 4 / 3, sensitivity = 0.3): Gesture {
    if (!points || points.length < 21 || points.some(p => !Number.isFinite(p.x) || !Number.isFinite(p.y))) {
      if (this.lastSeen >= 0 && now - this.lastSeen <= 450) {
        this.candidate = -1;
        return { point: this.position, phase: 'move', pinching: this.pinching };
      }
      this.reset();
      return { point: null, phase: 'lost', pinching: false };
    }
    const distance = (a: Point, b: Point) => Math.hypot((a.x - b.x) * aspect, a.y - b.y);
    const palm = Math.max(distance(points[0], points[9]), distance(points[5], points[17]), 0.025);
    const ratio = distance(points[4], points[8]) / palm;
    // Keep the index-tip anchor through acquisition to avoid a midpoint jump on pinch.
    const raw = { x: 1 - points[8].x, y: points[8].y };
    const dt = Math.min(100, Math.max(1, now - this.lastTime));
    const speed = this.position ? distance(raw, this.position) : 1;
    const alpha = 1 - Math.exp(-dt / (speed > 0.07 ? 24 : 55));
    this.position = this.position ? { x: this.position.x + (raw.x - this.position.x) * alpha, y: this.position.y + (raw.y - this.position.y) * alpha } : raw;
    this.lastSeen = now; this.lastTime = now;
    let phase: Gesture['phase'] = 'move';
    const open = ratio > sensitivity + 0.22;
    if (!this.armed && open) this.armed = true;
    const change = this.pinching ? open : this.armed && ratio < sensitivity;
    if (change) {
      if (this.candidate < 0) this.candidate = now;
      if (now - this.candidate >= (this.pinching ? 100 : 65)) {
        this.pinching = !this.pinching;
        phase = this.pinching ? 'grab' : 'release';
        this.candidate = -1;
      }
    } else this.candidate = -1;
    return { point: this.position, phase, pinching: this.pinching };
  }
}

export function toWorkspace(point: Point, rect: { left: number; top: number; width: number; height: number }) {
  const clamp = (n: number) => Math.max(0, Math.min(1, n));
  return { x: rect.left + clamp((point.x - 0.12) / 0.76) * rect.width, y: rect.top + clamp((point.y - 0.1) / 0.8) * rect.height };
}

export function inside(point: Point, rect: { left: number; right: number; top: number; bottom: number }, padding = 0) {
  return point.x >= rect.left - padding && point.x <= rect.right + padding && point.y >= rect.top - padding && point.y <= rect.bottom + padding;
}

/** Analytic critically damped response. Carries velocity across retargets;
 * unlike lerp, starting/reversing the wheel does not reset acceleration. */
export class DampedValue {
  velocity = 0;
  constructor(public value = 0) {}
  reset(value: number) {
    this.value = value;
    this.velocity = 0;
    return value;
  }
  step(target: number, delta: number, frequency = 10, maxSpeed = Infinity) {
    const dt = Math.max(0, Math.min(delta, 0.05));
    if (!dt) return this.value;
    const displacement = this.value - target;
    const j = this.velocity + frequency * displacement;
    const decay = Math.exp(-frequency * dt);
    let next = target + (displacement + j * dt) * decay;
    let velocity = (this.velocity - frequency * j * dt) * decay;
    const limit = maxSpeed * dt;
    if (Math.abs(next - this.value) > limit) {
      next = this.value + Math.sign(next - this.value) * limit;
      velocity = Math.sign(velocity) * maxSpeed;
    }
    this.value = next;
    this.velocity = velocity;
    if (Math.abs(next - target) < 1e-6 && Math.abs(velocity) < 1e-5)
      this.reset(target);
    return this.value;
  }
}

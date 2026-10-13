import { test } from "node:test";
import assert from "node:assert/strict";
import { DampedValue } from "../src/utils/motion";

test("Camera damping follows the same path at 30, 60 and 144 Hz", () => {
  const results = [30, 60, 144].map((fps) => {
    const motion = new DampedValue(-2);
    for (let i = 0; i < fps; i++) motion.step(4, 1 / fps, 9);
    return [motion.value, motion.velocity];
  });
  for (const result of results)
    for (let i = 0; i < 2; i++)
      assert.ok(Math.abs(result[i] - results[0][i]) < 1e-10);
});

test("Rapid forward/back scroll remains bounded and respects the cinematic speed limit", () => {
  for (const fps of [30, 60, 144]) {
    const motion = new DampedValue();
    for (const target of [1, 0, 0.83, 0.12, 1, 0]) {
      for (let i = 0; i < fps / 2; i++) {
        const previous = motion.value;
        motion.step(target, 1 / fps, 11, 0.28);
        assert.ok(motion.value >= 0 && motion.value <= 1);
        assert.ok(Math.abs(motion.value - previous) <= 0.28 / fps + 1e-12);
      }
    }
    for (let i = 0; i < fps * 8; i++) motion.step(0, 1 / fps, 11, 0.28);
    assert.equal(motion.value, 0);
    assert.equal(motion.velocity, 0);
  }
});

test("Retargeting reverses continuously instead of discarding camera momentum", () => {
  const motion = new DampedValue();
  for (let i = 0; i < 15; i++) motion.step(1, 1 / 60, 9);
  const before = motion.value;
  const velocity = motion.velocity;
  motion.step(0, 1e-6, 9);
  assert.ok(
    motion.value > before,
    "Existing forward velocity must not flip instantly",
  );
  assert.ok(Math.abs(motion.velocity - velocity) < 0.0002);
  for (let i = 0; i < 180; i++) motion.step(0, 1 / 60, 9);
  assert.equal(motion.value, 0);
});

test("Resuming a background tab cannot teleport the camera; reduced motion resets exactly", () => {
  const resumed = new DampedValue();
  const normal = new DampedValue();
  assert.equal(resumed.step(1, 60, 11, 0.28), normal.step(1, 0.05, 11, 0.28));
  assert.equal(resumed.reset(0.73), 0.73);
  assert.equal(resumed.velocity, 0);
});

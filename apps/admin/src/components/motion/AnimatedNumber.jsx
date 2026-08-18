'use client';
// Adapted from beui.dev/components/motion/number
// Source: https://beui.dev/r/animated-number.json
// Converted from TypeScript (.tsx) to JavaScript (.jsx)
// Tailwind className → inline tabular-nums style (project uses Vanilla CSS)

import { animate, useInView, useReducedMotion } from 'motion/react';
import { useEffect, useRef, useState } from 'react';
import { EASE_OUT } from '@/lib/ease';
import { cn } from '@/lib/utils';

/**
 * AnimatedNumber
 *
 * Spring-driven count-up animation triggered when the element enters the viewport.
 *
 * @param {object}   props
 * @param {number}   props.value          - Target number to animate to.
 * @param {number}   [props.duration]     - Animation duration in seconds (default: 1.2).
 * @param {Function} [props.format]       - Custom formatter: (n: number) => string.
 * @param {string}   [props.className]    - Extra class names to merge.
 * @param {boolean}  [props.startOnView]  - Start animation when in viewport (default: true).
 * @param {boolean}  [props.resetOnChange]- If true, animation always starts from 0 when value changes (default: false).
 */
export function AnimatedNumber({
  value,
  duration = 1.6,
  format = (n) => Math.round(n).toLocaleString(),
  className,
  startOnView = false,
  resetOnChange = true,
}) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: !resetOnChange, amount: 'some' });
  const reduce = useReducedMotion();
  const [display, setDisplay] = useState(0);
  const fromRef = useRef(0);

  useEffect(() => {
    if (startOnView && !inView) return;

    const target = Number(value || 0);

    if (reduce) {
      fromRef.current = target;
      setDisplay(target);
      return;
    }

    const from = resetOnChange ? 0 : fromRef.current;

    const controls = animate(from, target, {
      duration,
      ease: EASE_OUT,
      onUpdate: (v) => setDisplay(v),
    });

    fromRef.current = target;
    return () => controls.stop();
  }, [value, duration, inView, startOnView, reduce, resetOnChange]);

  return (
    <span
      ref={ref}
      className={cn(className)}
      style={{ fontVariantNumeric: 'tabular-nums' }}
    >
      {format(display)}
    </span>
  );
}



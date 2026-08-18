'use client';
// Adapted from beui.dev — components/motion/tooltip.tsx
// Converted from TypeScript (.tsx) to JavaScript (.jsx)
// Tailwind CSS classes → inline styles using project CSS variables

import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import {
  cloneElement,
  isValidElement,
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from 'react';
import { createPortal } from 'react-dom';
import { EASE_OUT } from '@/lib/ease';
import { useHoverCapable } from '@/lib/hooks/useHoverCapable';

/** Gap between trigger and tooltip, in px */
const GAP = 8;

const anchorTransform = {
  top: 'translate(-50%, -100%)',
  bottom: 'translate(-50%, 0)',
  left: 'translate(-100%, -50%)',
  right: 'translate(0, -50%)',
};

const transformOrigin = {
  top: 'center bottom',
  bottom: 'center top',
  left: 'right center',
  right: 'left center',
};

const offsetFrom = {
  top: { y: 8 },
  bottom: { y: -8 },
  left: { x: 8 },
  right: { x: -8 },
};

function buildVariants(side) {
  const o = offsetFrom[side];
  return {
    initial: {
      opacity: 0,
      scale: 0.9,
      filter: 'blur(4px)',
      x: o.x ?? 0,
      y: o.y ?? 0,
    },
    animate: {
      opacity: 1,
      scale: 1,
      filter: 'blur(0px)',
      x: 0,
      y: 0,
      transition: {
        type: 'spring',
        stiffness: 380,
        damping: 30,
        mass: 0.7,
        opacity: { duration: 0.14, ease: EASE_OUT },
        filter: { duration: 0.18, ease: EASE_OUT },
      },
    },
    exit: {
      opacity: 0,
      scale: 0.94,
      filter: 'blur(3px)',
      x: (o.x ?? 0) * 0.6,
      y: (o.y ?? 0) * 0.6,
      transition: { duration: 0.12, ease: EASE_OUT },
    },
  };
}

const REDUCED_VARIANTS = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { duration: 0.14, ease: EASE_OUT } },
  exit: { opacity: 0, transition: { duration: 0.1, ease: EASE_OUT } },
};

// Once any tooltip has closed, neighbouring tooltips open without initial delay.
const WARM_WINDOW_MS = 300;
let lastHiddenAt = 0;

/**
 * Tooltip
 *
 * Spring-animated floating tooltip using a portal so it escapes
 * all ancestor stacking contexts. Only shown on hover-capable devices.
 *
 * @param {object}    props
 * @param {ReactNode} props.content         - Tooltip content.
 * @param {ReactElement} props.children     - Trigger element.
 * @param {'top'|'right'|'bottom'|'left'} [props.side] - Placement side.
 * @param {number}    [props.delay]         - Show delay in ms (default 120).
 * @param {string}    [props.className]     - Extra class on tooltip bubble.
 * @param {string}    [props.wrapperClassName] - Extra class on anchor wrapper.
 */
export function Tooltip({
  content,
  children,
  side = 'top',
  delay = 120,
  className,
  wrapperClassName,
}) {
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState(null);
  const id = useId();
  const timer = useRef(null);
  const anchorRef = useRef(null);
  const reduce = useReducedMotion();
  const canHover = useHoverCapable();

  // Compute viewport-relative anchor point on the edge facing `side`
  const place = useCallback(() => {
    const el = anchorRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;
    const point = {
      top:    { top: r.top - GAP,    left: cx },
      bottom: { top: r.bottom + GAP, left: cx },
      left:   { top: cy,             left: r.left - GAP },
      right:  { top: cy,             left: r.right + GAP },
    };
    setCoords(point[side]);
  }, [side]);

  const show = useCallback(() => {
    if (!canHover) return;
    if (timer.current) clearTimeout(timer.current);
    const warm = Date.now() - lastHiddenAt < WARM_WINDOW_MS;
    timer.current = setTimeout(() => { place(); setOpen(true); }, warm ? 0 : delay);
  }, [canHover, delay, place]);

  const hide = useCallback(() => {
    if (timer.current) { clearTimeout(timer.current); timer.current = null; }
    if (open) lastHiddenAt = Date.now();
    setOpen(false);
  }, [open]);

  // Keep tooltip pinned while the page scrolls or resizes
  useEffect(() => {
    if (!open) return;
    const onMove = () => place();
    window.addEventListener('scroll', onMove, true);
    window.addEventListener('resize', onMove);
    return () => {
      window.removeEventListener('scroll', onMove, true);
      window.removeEventListener('resize', onMove);
    };
  }, [open, place]);

  const variants = useMemo(
    () => (reduce ? REDUCED_VARIANTS : buildVariants(side)),
    [reduce, side],
  );

  if (!isValidElement(children)) return children;

  const trigger = cloneElement(children, {
    onMouseEnter: show,
    onMouseLeave: hide,
    onFocus: show,
    onBlur: hide,
    'aria-describedby': id,
  });

  return (
    <>
      <span
        ref={anchorRef}
        style={{ position: 'relative', display: 'inline-flex', verticalAlign: 'middle' }}
        className={wrapperClassName}
      >
        {trigger}
      </span>

      {typeof document !== 'undefined'
        ? createPortal(
            <AnimatePresence>
              {open && coords ? (
                <span
                  aria-hidden
                  style={{
                    pointerEvents: 'none',
                    position: 'fixed',
                    zIndex: 9999,
                    top: coords.top,
                    left: coords.left,
                    transform: anchorTransform[side],
                  }}
                >
                  <motion.span
                    id={id}
                    role="tooltip"
                    variants={variants}
                    initial="initial"
                    animate="animate"
                    exit="exit"
                    style={{ transformOrigin: transformOrigin[side] }}
                    className={`au-tooltip${className ? ' ' + className : ''}`}
                  >
                    {content}
                  </motion.span>
                </span>
              ) : null}
            </AnimatePresence>,
            document.body,
          )
        : null}
    </>
  );
}

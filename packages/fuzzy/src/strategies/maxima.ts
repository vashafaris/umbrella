import { eqDelta } from "@thi.ng/math/eqdelta";
import type { DefuzzStrategy, DefuzzStrategyOpts } from "../api";
import { defaultOpts } from "./opts";

/**
 * Higher-order function. Returns Mean-of-Maxima defuzzification strategy,
 * yielding the approx. mean of the maximum region of a given fuzzy set.
 *
 * @remarks
 * Use `samples` option to adjust precision.
 *
 * @see {@Link DefuzzStrategyOpts}
 *
 * @example
 * ```ts
 * meanOfMaximaStrategy()(trapezoid(0,1,5,6), [0,6])
 * // 3
 *
 * // ......▁█████████████|█████████████▁.....
 * // ......██████████████|██████████████.....
 * // .....███████████████|███████████████....
 * // ....▇███████████████|███████████████▇...
 * // ...▅████████████████|████████████████▅..
 * // ..▃█████████████████|█████████████████▃.
 * // .▁██████████████████|██████████████████▁
 * // .███████████████████|███████████████████
 * //                     ^ 3.00
 * ```
 *
 * @param opts
 */
export const meanOfMaximaStrategy = (
    opts?: Partial<DefuzzStrategyOpts>
): DefuzzStrategy => {
    const { samples, eps } = defaultOpts(opts);
    return (fn, [min, max]) => {
        const delta = (max - min) / samples;
        let peak = -Infinity;
        let peakPos = min;
        let n = 1;
        for (let i = 0; i <= samples; i++) {
            const t = min + i * delta;
            const x = fn(t);
            if (eqDelta(x, peak, eps)) {
                peakPos += t;
                n++;
            } else if (x > peak) {
                peak = x;
                peakPos = t;
                n = 1;
            }
        }
        return peakPos / n;
    };
};

/**
 * Higher-order function. Returns First-of-Maxima defuzzification strategy,
 * yielding the approx. start position of the maximum region of a given fuzzy
 * set.
 *
 * @remarks
 * Use `samples` option to adjust precision.
 *
 * @see {@Link DefuzzStrategyOpts}
 *
 * @example
 * ```ts
 * firstOfMaximaStrategy()(trapezoid(0,1,5,6), [0,6])
 * // 1.02
 *
 * // ......▁|██████████████████████████▁.....
 * // ......█|███████████████████████████.....
 * // .....██|████████████████████████████....
 * // ....▇██|████████████████████████████▇...
 * // ...▅███|█████████████████████████████▅..
 * // ..▃████|██████████████████████████████▃.
 * // .▁█████|███████████████████████████████▁
 * // .██████|████████████████████████████████
 * //        ^ 1.02
 * ```
 *
 * @param opts
 */
export const firstOfMaximaStrategy = (
    opts?: Partial<DefuzzStrategyOpts>
): DefuzzStrategy => {
    const { samples } = defaultOpts(opts);
    return (fn, [min, max]) => {
        const delta = (max - min) / samples;
        let peak = -Infinity;
        let peakPos = min;
        for (let i = 0; i <= samples; i++) {
            const t = min + i * delta;
            const x = fn(t);
            if (x > peak) {
                peak = x;
                peakPos = t;
            }
        }
        return peakPos;
    };
};

/**
 * Higher-order function. Returns Last-of-Maxima defuzzification strategy,
 * yielding the approx. final position of the maximum region of a given fuzzy
 * set.
 *
 * @remarks
 * Use `samples` option to adjust precision.
 *
 * @see {@Link DefuzzStrategyOpts}
 *
 * @example
 * ```ts
 * lastOfMaximaStrategy()(trapezoid(0,1,5,6), [0,6])
 * // 4.98
 *
 * // ......▁██████████████████████████|▁.....
 * // ......███████████████████████████|█.....
 * // .....████████████████████████████|██....
 * // ....▇████████████████████████████|██▇...
 * // ...▅█████████████████████████████|███▅..
 * // ..▃██████████████████████████████|████▃.
 * // .▁███████████████████████████████|█████▁
 * // .████████████████████████████████|██████
 * //                                  ^ 4.98
 * ```
 *
 * @param opts
 */
export const lastOfMaximaStrategy = (
    opts?: Partial<DefuzzStrategyOpts>
): DefuzzStrategy => {
    const impl = firstOfMaximaStrategy(opts);
    return (fn, [min, max]) => impl(fn, [max, min]);
};

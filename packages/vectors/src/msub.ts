import type { MultiVecOpVVV, VecOpVVV } from "./api";
import { defOp } from "./compile/emit";
import { ARGS_VVV, MATH2 } from "./compile/templates";

/**
 * Returns `out = a * b + c`.
 *
 * - {@link addm}
 * - {@link maddN}
 *
 * @param out -
 * @param a -
 * @param b -
 * @param c -
 */
export const [msub, msub2, msub3, msub4] = defOp<MultiVecOpVVV, VecOpVVV>(
    MATH2("*", "-"),
    ARGS_VVV
);

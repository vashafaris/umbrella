import type { ReadonlyVec } from "@thi.ng/vectors";
import { cross3 } from "@thi.ng/vectors/cross";
import { dot3 } from "@thi.ng/vectors/dot";
import { mag } from "@thi.ng/vectors/mag";
import { normalize as _normalize } from "@thi.ng/vectors/normalize";
import { quatFromAxisAngle } from "./quat-axis-angle";

/**
 * Returns quaternion describing the rotation from direction vector
 * `from` -> `to`. If `normalize` is true (default), first normalizes
 * the vectors (not modifying original).
 *
 * @param from -
 * @param to -
 * @param normalize -
 */
export const alignmentQuat = (
    from: ReadonlyVec,
    to: ReadonlyVec,
    normalize = true
) => {
    if (normalize) {
        from = _normalize([], from);
        to = _normalize([], to);
    }
    const axis = cross3([], from, to);
    return quatFromAxisAngle(axis, Math.atan2(mag(axis), dot3(from, to)));
};

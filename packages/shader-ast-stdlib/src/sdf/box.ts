import type { Vec2Sym, Vec3Sym } from "@thi.ng/shader-ast";
import { defn, ret } from "@thi.ng/shader-ast/ast/function";
import { FLOAT0, VEC2_0, VEC3_0 } from "@thi.ng/shader-ast/ast/lit";
import { add, sub } from "@thi.ng/shader-ast/ast/ops";
import { sym } from "@thi.ng/shader-ast/ast/sym";
import { abs, length, max, min } from "@thi.ng/shader-ast/builtin/math";
import { maxComp2, maxComp3 } from "../math/maxcomp";

/**
 * Returns signed distance from `p` to centered AABB of `size`.
 *
 * @param p - vec2
 * @param size - vec2
 */
export const sdfBox2 = defn("float", "sdfBox2", ["vec2", "vec2"], (p, size) => {
    let d: Vec2Sym;
    return [
        (d = sym(sub(abs(p), size))),
        ret(add(min(maxComp2(d), FLOAT0), length(max(d, VEC2_0)))),
    ];
});

/**
 * Returns signed distance from `p` to centered AABB of `size`.
 *
 * @param p - vec3
 * @param size - vec3
 */
export const sdfBox3 = defn("float", "sdfBox3", ["vec3", "vec3"], (p, size) => {
    let d: Vec3Sym;
    return [
        (d = sym(sub(abs(p), size))),
        ret(add(min(maxComp3(d), FLOAT0), length(max(d, VEC3_0)))),
    ];
});

import { mixBilinear as _mix } from "@thi.ng/math/mix";
import type { MultiVecOpVVVVNN, VecOpVVVVNN } from "./api";
import { defHofOp } from "./compile/emit";

export const [mixBilinear, mixBilinear2, mixBilinear3, mixBilinear4] = defHofOp<
    MultiVecOpVVVVNN,
    VecOpVVVVNN
>(
    _mix,
    ([o, a, b, c, d]) => `${o}=op(${a},${b},${c},${d},u,v);`,
    "o,a,b,c,d,u,v"
);

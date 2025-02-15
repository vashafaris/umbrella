import type { StringFormat } from "./api";

/**
 * Convenience {@link StringFormat} which ignores any formatting and results in
 * plain text.
 */
export const FMT_NONE: StringFormat = {
    prefix: "",
    suffix: "\n",
    start: () => "",
    end: "",
};

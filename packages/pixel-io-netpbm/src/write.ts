import type { PackedBuffer } from "@thi.ng/pixel";
import { GRAY16 } from "@thi.ng/pixel/format/gray16";
import { luminanceABGR } from "@thi.ng/pixel/utils";

const formatComments = (
    comments: string[] = ["generated by @thi.ng/pixel-io-netpbm"]
) => comments.map((x) => `# ${x}`).join("\n");

/**
 * Initializes byte array & PBM header for given {@link PackedBuffer} and format
 * details.
 *
 * @param magic
 * @param limits
 * @param size
 * @param buf
 *
 * @internal
 */
const initHeader = (
    magic: string,
    limits: number,
    size: number,
    buf: PackedBuffer,
    comments?: string[]
) => {
    const { width, height } = buf;
    let header = magic + "\n";
    const comm = formatComments(comments);
    if (comm.length) header += comm + "\n";
    header += `${width} ${height}\n`;
    if (limits > 0) header += limits + "\n";
    const dest = new Uint8Array(size + header.length);
    dest.set([...header].map((x) => x.charCodeAt(0)));
    return { dest, start: header.length, abgr: buf.format.toABGR };
};

/**
 * Converts a {@link PackedBuffer} into a 1bit PBM byte array (binary format).
 *
 * @remarks
 * Reference: http://netpbm.sourceforge.net/doc/pbm.html
 *
 * @param buf
 * @param comments
 */
export const asPBM = (buf: PackedBuffer, comments?: string[]) => {
    const { pixels, width, height } = buf;
    const { dest, start, abgr } = initHeader(
        "P4",
        0,
        Math.ceil(width / 8) * height,
        buf,
        comments
    );
    const w1 = width - 1;
    for (let y = 0, i = start, j = 0; y < height; y++) {
        for (let x = 0, b = 0; x <= w1; x++, j++) {
            const xx = ~x & 7;
            if (luminanceABGR(abgr(pixels[j])) < 128) {
                b |= 1 << xx;
            }
            if (xx === 0 || x === w1) {
                dest[i++] = b;
                b = 0;
            }
        }
    }
    return dest;
};

/**
 * Converts a {@link PackedBuffer} into a 8bit grayscale PGM byte array (binary
 * format).
 *
 * @remarks
 * Reference: http://netpbm.sourceforge.net/doc/pgm.html
 *
 * @param buf
 * @param comments
 */
export const asPGM = (buf: PackedBuffer, comments?: string[]) => {
    const { pixels, width, height } = buf;
    const { dest, start, abgr } = initHeader(
        "P5",
        0xff,
        width * height,
        buf,
        comments
    );
    for (let i = start, j = 0; j < pixels.length; i++, j++) {
        dest[i] = luminanceABGR(abgr(pixels[j]));
    }
    return dest;
};

/**
 * Converts a {@link PackedBuffer} into a 16bit grayscale PGM byte array (binary
 * format).
 *
 * @remarks
 * Reference: http://netpbm.sourceforge.net/doc/pgm.html
 *
 * @param buf
 * @param comments
 */
export const asPGM16 = (buf: PackedBuffer, comments?: string[]) => {
    if (buf.format !== GRAY16) buf = buf.as(GRAY16);
    const { pixels, width, height } = buf;
    const { dest, start } = initHeader(
        "P5",
        0xffff,
        width * height * 2,
        buf,
        comments
    );
    for (let i = start, j = 0; j < pixels.length; i += 2, j++) {
        dest[i] = pixels[j] >> 8;
        dest[i + 1] = pixels[j] & 0xff;
    }
    return dest;
};

/**
 * Converts a {@link PackedBuffer} into a 24bit PPM byte array (binary format).
 *
 * @remarks
 * Reference: http://netpbm.sourceforge.net/doc/ppm.html
 *
 * @param buf
 * @param comments
 */
export const asPPM = (buf: PackedBuffer, comments?: string[]) => {
    const { pixels, width, height } = buf;
    const { dest, start, abgr } = initHeader(
        "P6",
        255,
        width * 3 * height,
        buf,
        comments
    );
    for (let i = start, j = 0; j < pixels.length; i += 3, j++) {
        const col = abgr(pixels[j]);
        dest[i] = col & 0xff;
        dest[i + 1] = (col >> 8) & 0xff;
        dest[i + 2] = (col >> 16) & 0xff;
    }
    return dest;
};

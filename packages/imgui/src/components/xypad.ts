import { Fn } from "@thi.ng/api";
import { line, pointInside, rect } from "@thi.ng/geom";
import { fit2, Vec } from "@thi.ng/vectors";
import { IGridLayout, LayoutBox, MouseButton } from "../api";
import { handleSlider2Keys, slider2Val } from "../behaviors/slider";
import { IMGUI } from "../gui";
import { textLabelRaw } from "./textlabel";
import { tooltipRaw } from "./tooltip";

/**
 *
 * `mode` interpretation:
 *
 * - -2 = square
 * - -1 = proportional height (snapped to rows)
 * - >0 = fixed row height
 *
 * @param gui
 * @param layout
 * @param id
 * @param min
 * @param max
 * @param prec
 * @param val
 * @param mode
 * @param yUp
 * @param label
 * @param fmt
 * @param info
 */
export const xyPad = (
    gui: IMGUI,
    layout: IGridLayout,
    id: string,
    min: Vec,
    max: Vec,
    prec: number,
    val: Vec,
    mode: number,
    yUp: boolean,
    label?: string,
    fmt?: Fn<Vec, string>,
    info?: string
) => {
    let box: LayoutBox;
    const ch = layout.cellH;
    const gap = layout.gap;
    if (mode == -2) {
        box = layout.nextSquare();
    } else {
        let rows = (mode > 0 ? mode : layout.cellW / (ch + gap)) | 0;
        box = layout.next([1, rows + 1]);
        box.h -= ch + gap;
    }
    return xyPadRaw(
        gui,
        id,
        box.x,
        box.y,
        box.w,
        box.h,
        min,
        max,
        prec,
        val,
        yUp,
        0,
        box.h + gap + ch / 2 + gui.theme.baseLine,
        label,
        fmt,
        info
    );
};

export const xyPadRaw = (
    gui: IMGUI,
    id: string,
    x: number,
    y: number,
    w: number,
    h: number,
    min: Vec,
    max: Vec,
    prec: number,
    val: Vec,
    yUp = false,
    lx: number,
    ly: number,
    label?: string,
    fmt?: Fn<Vec, string>,
    info?: string
) => {
    const maxX = x + w - 1;
    const maxY = y + h - 1;
    const pos = yUp ? [x, maxY] : [x, y];
    const maxPos = yUp ? [maxX, y] : [maxX, y + h - 1];
    const box = rect([x, y], [w, h]);
    const col = gui.textColor(false);
    const hover = pointInside(box, gui.mouse);
    let active = false;
    if (hover) {
        gui.hotID = id;
        const aid = gui.activeID;
        if ((aid === "" || aid === id) && gui.buttons == MouseButton.LEFT) {
            gui.activeID = id;
            active = true;
            slider2Val(
                fit2(val, gui.mouse, pos, maxPos, min, max),
                min,
                max,
                prec
            );
        }
        info && tooltipRaw(gui, info);
    }
    const focused = gui.requestFocus(id);
    box.attribs = {
        fill: gui.bgColor(hover || focused),
        stroke: gui.focusColor(id)
    };
    const { 0: cx, 1: cy } = fit2([], val, min, max, pos, maxPos);
    gui.add(
        box,
        line([x, cy], [maxX, cy], {
            stroke: col
        }),
        line([cx, y], [cx, maxY], {
            stroke: col
        }),
        textLabelRaw(
            [x + lx, y + ly],
            col,
            (label ? label + " " : "") +
                (fmt ? fmt(val) : `${val[0] | 0}, ${val[1] | 0}`)
        )
    );
    if (focused && handleSlider2Keys(gui, min, max, prec, val, yUp)) {
        return true;
    }
    gui.lastID = id;
    return active;
};

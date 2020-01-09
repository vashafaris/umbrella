import { IID, IObjectOf } from "@thi.ng/api";
import { clamp } from "@thi.ng/math";
import { fromDOMEvent, merge, Stream } from "@thi.ng/rstream";
import { map } from "@thi.ng/transducers";

export const enum GestureType {
    START,
    MOVE,
    DRAG,
    END,
    ZOOM
}

export interface GestureInfo {
    /**
     * Touch/cursor ID. For mouse cursors this always is zero.
     */
    id: number;
    /**
     * Current cursor position (as per {@link GestureStreamOpts.local} &
     * {@link GestureStreamOpts.scale})
     */
    pos: number[];
    /**
     * Optional current force/pressure details. Only available for touch
     * gestures.
     */
    force?: number;
    /**
     * Initial start position of this cursor.
     */
    start?: number[];
    /**
     * Difference vector between from `start` to `pos`. Only available
     * during dragging.
     */
    delta?: number[];
}

export interface GestureEvent {
    /**
     * Current translated/abstracted event type.
     */
    type: GestureType;
    /**
     * Original DOM event.
     */
    event: UIEvent;
    /**
     * Event position (as per {@link GestureStreamOpts.local} &
     * {@link GestureStreamOpts.scale})
     */
    pos: number[];
    /**
     * Active cursors (i.e. ongoing drag / touch gestures)
     */
    active: GestureInfo[];
    /**
     * Mouse button bitmask (same as in standard `MouseEvent`), or, if
     * `isTouch` is true, number of `active` touches.
     */
    buttons: number;
    /**
     * Current zoom factor (as per {@link GestureStreamOpts} config)
     */
    zoom: number;
    /**
     * Last `WheelEvent`'s transformed `deltaY`, `wheelDeltaY`
     */
    zoomDelta: number;
    /**
     * True, if original event was a `TouchEvent`.
     */
    isTouch: boolean;
}

export interface GestureStreamOpts extends IID<string> {
    /**
     * Event listener options (see standard `addEventListener`).
     * Default: false
     */
    eventOpts: boolean | AddEventListenerOptions;
    /**
     * If `true`, calls `preventDefault()` for each event.
     * Default: true
     */
    preventDefault: boolean;
    /**
     * If true (default), wheel events on the element will prevent the
     * document from scrolling. If false, the wheel event will use the
     * eventOpts.passive argument (default: true) which should be true
     * in most cases for performance reasons:
     * https://www.chromestatus.com/feature/5745543795965952
     */
    preventScrollOnZoom: boolean;
    /**
     * If true (default), attaches dummy event handler disabling context
     * menu for the target element and thus allow using right mouse
     * button to be used normally.
     */
    preventContextMenu: boolean;
    /**
     * Initial zoom value. Default: 1
     */
    zoom: number;
    /**
     * If true, the produced `zoom` values are considered absolute and
     * will be constrained to the `minZoom .. maxZoom` interval. If
     * `false`, the zoom values are relative and simply the result of
     * `event.deltaY * smooth`.
     *
     * Default: true
     */
    absZoom: boolean;
    /**
     * Min zoom value. Default: 0.25
     */
    minZoom: number;
    /**
     * Max zoom value. Default: 4
     */
    maxZoom: number;
    /**
     * Scaling factor for zoom changes. Default: 1
     */
    smooth: number;
    /**
     * Local coordinate flag. If true (default), the elements position
     * offset is subtracted.
     */
    local: boolean;
    /**
     * If true, all positions and delta values are scaled by
     * `window.devicePixelRatio`. Note: Only enable if `local` is true.
     *
     * @defaultValue false
     */
    scale: boolean;
}

type UIEvent = MouseEvent | TouchEvent | WheelEvent;

type UIEventID =
    | "mousedown"
    | "mousemove"
    | "mouseup"
    | "touchstart"
    | "touchmove"
    | "touchend"
    | "touchcancel"
    | "wheel";

const startEvents = new Set([
    "mousedown",
    "touchmove",
    "touchstart",
    "mousemove"
]);

const endEvents = new Set(["mouseup", "touchend", "touchcancel"]);

const baseEvents = <const>["mousemove", "mousedown", "touchstart", "wheel"];

const tempEvents = <const>[
    "touchend",
    "touchcancel",
    "touchmove",
    "mouseup",
    "mousemove"
];

const eventGestureTypeMap: IObjectOf<GestureType> = {
    touchstart: GestureType.START,
    touchmove: GestureType.DRAG,
    touchend: GestureType.END,
    touchcancel: GestureType.END,
    mousedown: GestureType.START,
    mouseup: GestureType.END,
    wheel: GestureType.ZOOM
};

/**
 * Attaches mouse & touch event listeners to given DOM element and
 * returns a stream of custom "gesture" events in the form of tuples:
 *
 * ```
 * [type, {pos, click?, delta?, zoom, zoomDelta?, buttons}]
 * ```
 *
 * The `click` and `delta` values are only present if `type ==
 * GestureType.DRAG`. Both (and `pos` too) are 2-element arrays of
 * `[x,y]` coordinates.
 *
 * The `zoom` value is always present, but is only updated with wheel
 * events. The value will be constrained to `minZoom` ... `maxZoom`
 * interval (provided via options object).
 *
 * Note: If using `preventDefault` and attaching the event stream to
 * `document.body`, the following event listener options SHOULD be used:
 *
 * @example
 * ```ts
 * eventOpts: { passive: false }
 * ```
 *
 * {@link https://www.chromestatus.com/features/5093566007214080 }
 *
 * @param el -
 * @param opts -
 */
export const gestureStream = (
    el: HTMLElement,
    _opts?: Partial<GestureStreamOpts>
) => {
    const opts = <GestureStreamOpts>{
        id: "gestures",
        zoom: 1,
        absZoom: true,
        minZoom: 0.25,
        maxZoom: 4,
        smooth: 1,
        eventOpts: { capture: true },
        preventDefault: true,
        preventScrollOnZoom: true,
        preventContextMenu: true,
        local: true,
        scale: false,
        ..._opts
    };
    const dpr = window.devicePixelRatio || 1;
    const active: GestureInfo[] = [];
    let zoom = clamp(opts.zoom, opts.minZoom, opts.maxZoom);
    let zoomDelta = 0;
    let numTouches = 0;
    let tempStreams: Stream<UIEvent>[] | undefined;

    opts.preventContextMenu &&
        el.addEventListener("contextmenu", (e) => e.preventDefault());

    const stream = merge<UIEvent, GestureEvent>({
        src: baseEvents.map((id) => eventSource(el, id, opts)),
        xform: map((e) => {
            opts.preventDefault && e.preventDefault();
            const etype = e.type;
            const type =
                etype === "mousemove"
                    ? tempStreams
                        ? GestureType.DRAG
                        : GestureType.MOVE
                    : eventGestureTypeMap[etype];
            let isTouch = !!(<TouchEvent>event).touches;
            let events: Array<Touch | MouseEvent | WheelEvent> = isTouch
                ? Array.from((<TouchEvent>event).changedTouches)
                : [<MouseEvent | WheelEvent>event];
            const b = el.getBoundingClientRect();

            const getPos = (e: Touch | MouseEvent | WheelEvent) => {
                const pos = [e.clientX, e.clientY];
                if (opts.local) {
                    pos[0] -= b.left;
                    pos[1] -= b.top;
                }
                if (opts.scale) {
                    pos[0] *= dpr;
                    pos[1] *= dpr;
                }
                return pos;
            };

            if (startEvents.has(etype)) {
                const isStart = etype === "mousedown" || etype === "touchstart";
                for (let t of events) {
                    const id = (<Touch>t).identifier || 0;
                    const pos = getPos(t);
                    let touch = active.find((t) => t.id === id);
                    if (!touch && isStart) {
                        touch = <GestureInfo>{ id, start: pos };
                        active.push(touch);
                        numTouches++;
                    }
                    if (touch) {
                        touch.pos = pos;
                        if (isTouch) {
                            touch.force = (<Touch>t).force;
                        }
                        if (!isStart && tempStreams) {
                            touch.delta = [
                                pos[0] - touch.start![0],
                                pos[1] - touch.start![1]
                            ];
                        }
                    }
                }
                if (isStart && !tempStreams) {
                    tempStreams = tempEvents.map((id) =>
                        eventSource(document.body, id, opts, "-temp")
                    );
                    stream.addAll(tempStreams);
                    stream.removeID("mousemove");
                    // console.log("add temp", [
                    //     ...map((s) => s.id, stream.sources.keys())
                    // ]);
                }
            } else if (endEvents.has(etype)) {
                for (let t of events) {
                    const id = (<Touch>t).identifier || 0;
                    const idx = active.findIndex((t) => t.id === id);
                    if (idx !== -1) {
                        active.splice(idx, 1);
                        numTouches--;
                    }
                }
                if (numTouches === 0) {
                    stream.removeAll(tempStreams!);
                    stream.add(eventSource(el, "mousemove", opts));
                    tempStreams = undefined;
                    // console.log("remove temp", [
                    //     ...map((s) => s.id, stream.sources.keys())
                    // ]);
                }
            } else if (type === GestureType.ZOOM) {
                const zdelta =
                    opts.smooth *
                    ("wheelDeltaY" in (e as any)
                        ? -(e as any).wheelDeltaY / 120
                        : (<WheelEvent>e).deltaY / 40);
                zoom = opts.absZoom
                    ? clamp(zoom + zdelta, opts.minZoom, opts.maxZoom)
                    : zdelta;
                zoomDelta = zdelta;
            }
            const buttons = isTouch
                ? active.length
                : (<MouseEvent>event).buttons;
            return {
                type,
                event: e,
                pos: getPos(events[0]),
                active,
                buttons,
                zoom,
                zoomDelta,
                isTouch
            };
        })
    });

    return stream;
};

const eventSource = (
    el: HTMLElement,
    id: UIEventID,
    opts: GestureStreamOpts,
    suffix = ""
) => {
    let eventOpts = opts.eventOpts;
    if (id === "wheel" && opts.preventScrollOnZoom) {
        eventOpts =
            typeof eventOpts === "boolean"
                ? { capture: eventOpts, passive: false }
                : { ...eventOpts, passive: false };
    }
    return fromDOMEvent(el, id, eventOpts, { id: id + suffix });
};

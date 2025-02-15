import type { WithErrorHandlerOpts } from "./api";
import { defWorker } from "./defworker";
import { __optsWithID } from "./idgen";
import { LOGGER } from "./logger";
import { stream } from "./stream";

export interface FromWorkerOpts extends WithErrorHandlerOpts {
    /**
     * If true, the worker will be terminated when the stream
     * is being closed.
     *
     * @defaultValue true
     */
    terminate: boolean;
}

/**
 * Returns a {@link Stream} which adds `message` and `error` event
 * listeners to given `worker` and then emits received values.
 *
 * @remarks
 * If `terminate` is true (default), the worker will be terminated when
 * the stream is being closed (either directly or indirectly, i.e. if
 * the user called {@link ISubscriber.done} on the stream or the last
 * child subscription has unsubscribed, depending on
 * {@link CommonOpts | config options}).
 *
 * As with {@link postWorker}, the `worker` can be an existing `Worker`
 * instance, a JS source code `Blob` or an URL string. In the latter two
 * cases, a worker is created automatically.
 *
 * @example
 * ```ts
 *
 * ```
 *
 * @param worker -
 * @param opts -
 */
export const fromWorker = <T>(
    worker: Worker | Blob | string,
    opts?: Partial<FromWorkerOpts>
) => {
    const _worker = defWorker(worker);
    opts = __optsWithID("worker", opts);
    return stream<T>((stream) => {
        const msgListener = (e: MessageEvent) => {
            stream.next(e.data);
        };
        const errListener = (e: MessageEvent) => {
            stream.error(e.data);
        };
        _worker.addEventListener("message", msgListener);
        _worker.addEventListener("error", <EventListener>errListener);
        return () => {
            _worker.removeEventListener("message", msgListener);
            _worker.removeEventListener("error", <EventListener>errListener);
            if (opts!.terminate !== false) {
                LOGGER.info("terminating worker", _worker);
                _worker.terminate();
            }
        };
    }, opts);
};

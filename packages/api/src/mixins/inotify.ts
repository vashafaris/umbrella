import { EVENT_ALL } from "../api";
import type { Event, INotify, Listener } from "../event";
import { mixin } from "../mixin";
import type { IObjectOf } from "../object";

interface _INotify extends INotify {
    _listeners: IObjectOf<[Listener, any][]>;
    __listener(listeners: any[][], f: Listener, scope: any): number;
}

export const inotify_dispatch = (listeners: any[][], e: Event) => {
    if (!listeners) return;
    for (let i = 0, n = listeners.length, l; i < n; i++) {
        l = listeners[i];
        l[0].call(l[1], e);
        if (e.canceled) {
            return;
        }
    }
};

/**
 * Mixin class decorator, injects INotify default implementation, incl.
 * a lazily instantiated `_listeners` property object, storing
 * registered listeners.
 */
export const INotifyMixin = mixin(<INotify>{
    addListener(this: _INotify, id: string, fn: Listener, scope?: any) {
        let l = (this._listeners = this._listeners || {})[id];
        !l && (l = this._listeners[id] = []);
        if (this.__listener(l, fn, scope) === -1) {
            l.push([fn, scope]);
            return true;
        }
        return false;
    },

    removeListener(this: _INotify, id: string, fn: Listener, scope?: any) {
        let listeners: IObjectOf<[Listener, any][]>;
        if (!(listeners = this._listeners)) return false;
        const l = listeners[id];
        if (l) {
            const idx = this.__listener(l, fn, scope);
            if (idx !== -1) {
                l.splice(idx, 1);
                !l.length && delete listeners[id];
                return true;
            }
        }
        return false;
    },

    notify(this: _INotify, e: Event) {
        let listeners: IObjectOf<[Listener, any][]>;
        if (!(listeners = this._listeners)) return false;
        e.target === undefined && (e.target = this);
        inotify_dispatch(listeners[<string>e.id], e);
        inotify_dispatch(listeners[EVENT_ALL], e);
    },

    __listener(listeners: [Listener, any][], f: Listener, scope: any) {
        let i = listeners.length;
        while (--i >= 0) {
            const l = listeners[i];
            if (l[0] === f && l[1] === scope) {
                break;
            }
        }
        return i;
    },
});

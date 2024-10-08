import { EventBus } from "wx-lib-state";
import ActionQueue from "./ActionQueue";
import type { DataProviderConfig, SkipProviderEvent } from "./types";

export default class DataProvider<T> extends EventBus<T, keyof T> {
	private _queue: ActionQueue;

	constructor(handlers: DataProviderConfig) {
		super();

		this._queue = new ActionQueue();
		for (const x in handlers) {
			this.on(x as keyof T, (ev: T[keyof T]) => {
				const handler = handlers[x];
				const pack = typeof handler === "function" ? { handler } : handler;
				if (!(ev as SkipProviderEvent).skipProvider)
					return this._queue.add(x, ev, pack);
			});
		}
	}

	getQueue(): ActionQueue {
		return this._queue;
	}
}

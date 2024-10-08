import { EventBus } from "wx-lib-state";
import ActionQueue from "./ActionQueue";
import type { ActionMap, SkipProviderEvent } from "./types";

export default class Rest<T> extends EventBus<T, keyof T> {
	private _queue: ActionQueue;
	private _customHeaders: Record<string, string> = {};
	protected _url: string;

	constructor(url?: string) {
		super();
		this._url = url as string;

		this._queue = new ActionQueue();
		const handlers = this.getHandlers();

		for (const x in handlers) {
			this.on(x as keyof T, (ev: T[keyof T]) => {
				if (!(ev as SkipProviderEvent).skipProvider)
					return this._queue.add(x, ev, handlers[x]);
			});
		}
	}

	getHandlers(): ActionMap<T> {
		return {};
	}
	setHeaders(headers: Record<string, string>): void {
		this._customHeaders = headers;
	}
	getQueue(): ActionQueue {
		return this._queue;
	}
	send<T>(
		url: string,
		method: string,
		data?: string | object,
		customHeaders: Record<string, string> = {}
	): Promise<T> {
		const headers = {
			"Content-Type": "application/json",
			...customHeaders,
			...this._customHeaders,
		};
		const req: RequestInit = {
			method,
			headers,
		};

		if (data) {
			req.body = typeof data === "object" ? JSON.stringify(data) : data;
		}

		return fetch(`${this._url}${url || ""}`, req).then(res => res.json());
	}
}

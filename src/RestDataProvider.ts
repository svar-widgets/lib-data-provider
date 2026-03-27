import { EventBus } from "@svar-ui/lib-state";
import ActionQueue from "./ActionQueue";
import type {
	ActionMap,
	RestDataProviderConfig,
	SkipProviderEvent,
} from "./types";

export default class Rest<T> extends EventBus<T, keyof T> {
	private _queue: ActionQueue;
	private _customHeaders: Record<string, string> = {};
	protected _url: string;
	protected _batchUrl?: string;
	private _batchQueue: Array<{
		url: string;
		method: string;
		data: object;
		resolve: (value: T) => void;
	}> = [];
	private _batchTimeout: number | null = null;

	constructor(url?: string, config?: Partial<RestDataProviderConfig>) {
		super();
		this._url = url as string;
		this._batchUrl = config?.batchURL;

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
	async send(
		url: string,
		method: string,
		data?: object,
		customHeaders: Record<string, string> = {}
	): Promise<T> {
		if (this._batchUrl && method !== "GET") {
			return this.sendBatchRequest(url, method, data, customHeaders);
		} else {
			return this.sendRequest(url, method, data, customHeaders);
		}
	}

	private async sendBatchRequest(
		url: string,
		method: string,
		data?: object,
		customHeaders?: Record<string, string>
	): Promise<T> {
		return new Promise<T>(resolve => {
			this._batchQueue.push({
				url,
				method,
				data,
				resolve,
			});

			if (this._batchTimeout) {
				clearTimeout(this._batchTimeout);
			}

			this._batchTimeout = setTimeout(async () => {
				const currentQueue = [...this._batchQueue];
				this._batchQueue = [];

				if (currentQueue.length > 1) {
					const batchData = currentQueue.map(req => ({
						url: req.url,
						method: req.method,
						data: {
							...req.data,
						},
					}));

					const results = await this.sendRequest<T[]>(
						this._batchUrl!,
						"POST",
						batchData
					);

					currentQueue.forEach((q, i) => q.resolve(results[i]));
				} else {
					const result = await this.sendRequest<T>(
						url,
						method,
						data,
						customHeaders
					);
					resolve(result);
				}
			}, 10);
		});
	}

	protected toPayload(obj: object): string {
		return JSON.stringify(obj);
	}

	protected async sendRequest<T>(
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
			req.body = typeof data === "object" ? this.toPayload(data) : data;
		}

		const slash = !url || this._url.endsWith("/") || url[0] === "/" ? "" : "/";

		return fetch(`${this._url}${slash}${url || ""}`, req).then(res =>
			res.json()
		);
	}
}

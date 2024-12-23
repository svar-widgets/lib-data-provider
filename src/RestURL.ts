import type { TID } from "wx-lib-state";
import { isTempID } from "wx-lib-state";

function _addToUrl(url: string, ...parts: TID[]) {
	parts.forEach(part => {
		if (part) url += (url.endsWith("/") ? "" : "/") + encodeURIComponent(part);
	});

	return url;
}

type RestURLConfig = {
	headers?: Record<string, string>;
};

export class RestURL<T, R> {
	private _url: string;
	private _config: RestURLConfig;

	constructor(url: string, config: RestURLConfig) {
		this._url = url;
		this._config = { headers: {}, ...(config || {}) };
	}

	protected async fetch<X>(
		url: string,
		method: string,
		headers: Record<string, string>,
		data: T
	): Promise<X> {
		const response = await fetch(
			url,
			method === "GET"
				? { headers }
				: {
						method,
						headers,
						body: data ? JSON.stringify(data) : "",
					}
		);
		const result = await response.json();
		return result;
	}

	async get(id: TID): Promise<T> {
		return this.fetch<T>(
			_addToUrl(this._url, id),
			"GET",
			this._config.headers,
			null
		);
	}

	async getAll(): Promise<T[]> {
		return this.fetch<T[]>(this._url, "GET", this._config.headers, null);
	}

	async add(data: T): Promise<R> {
		return this.fetch<R>(
			this._url,
			"POST",
			{
				"Content-Type": "application/json",
				...this._config.headers,
			},
			data
		);
	}

	async update(id: TID, data: T): Promise<R> {
		if (isTempID(id)) return;

		return this.fetch<R>(
			_addToUrl(this._url, id),
			"PUT",
			{
				"Content-Type": "application/json",
				...this._config.headers,
			},
			data
		);
	}

	async delete(id: TID): Promise<R> {
		if (isTempID(id)) return;

		return this.fetch<R>(
			_addToUrl(this._url, id),
			"DELETE",
			this._config.headers,
			null
		);
	}

	async save(action: string, id: TID, data: T): Promise<R> {
		switch (action) {
			case "add": {
				return this.add(data);
			}
			case "update": {
				return this.update(id, data);
			}
			case "delete": {
				return this.delete(id);
			}
		}
	}
}

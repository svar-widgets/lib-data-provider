import type { TID } from "wx-lib-state";
import { isTempID } from "wx-lib-state";

function _addToUrl(url: string, ...parts: TID[]) {
	if (!parts.length) return url;

	parts.forEach(part => {
		if (typeof part === "undefined" || part === null || part === "") return;
		const pstr = part.toString();
		url +=
			(url.endsWith("/") ? "" : "/") +
			(pstr.startsWith("/") ? pstr.slice(1) : encodeURIComponent(pstr));
	});

	return url;
}

export class RestURL<T, R> {
	private _url: string;
	private _headers: Record<string, string>;

	constructor(url: string, headers?: Record<string, string>) {
		this._url = url;
		this._headers = headers || {};
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

	path(...parts: TID[]): RestURL<T, R> {
		return new RestURL(_addToUrl(this._url, ...parts), this._headers);
	}

	headers(headers: Record<string, string>): RestURL<T, R> {
		return new RestURL(this._url, { ...this._headers, ...headers });
	}

	async get(url?: TID): Promise<T> {
		return this.fetch<T>(_addToUrl(this._url, url), "GET", this._headers, null);
	}

	async add(data: T): Promise<R> {
		return this.fetch<R>(
			this._url,
			"POST",
			{
				"Content-Type": "application/json",
				...this._headers,
			},
			data
		);
	}

	async update(data: T, url?: TID): Promise<R> {
		if (url && isTempID(url)) return;

		return this.fetch<R>(
			_addToUrl(this._url, url),
			"PUT",
			{
				"Content-Type": "application/json",
				...this._headers,
			},
			data
		);
	}

	async delete(url?: TID): Promise<R> {
		if (url && isTempID(url)) return;

		return this.fetch<R>(
			_addToUrl(this._url, url),
			"DELETE",
			this._headers,
			null
		);
	}

	async save(action: string, data: T, url?: TID): Promise<R> {
		switch (action) {
			case "add": {
				return this.add(data);
			}
			case "update": {
				return this.update(data, url);
			}
			case "delete": {
				return this.delete(url);
			}
		}
	}
}

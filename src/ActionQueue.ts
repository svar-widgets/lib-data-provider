import { DataObj, TID, HandlerConfig, ServerResponse } from "./types";
import { isTempID } from "wx-lib-state";

const cantSendYet = Symbol();

export const SYNC = 0;
export const NOTSENT = 1;
export const SENDING = 2;

type TQueueItem = {
	action: string;
	data: DataObj;
	proc: HandlerConfig;
	sent?: boolean;
};

export default class ActionQueue {
	private _awaitAddingQueue: TQueueItem[];
	private _queue: Record<string, HandlerConfig>;
	private _idPool: Record<TID, TID>;
	private _backId: Record<TID, TID>[];
	private _status: (() => void)[];
	private _waitPull: Record<TID, ((v: TID) => void)[]>;

	constructor() {
		this.reset(true);
	}

	public reset(ids: boolean = false): void {
		this._awaitAddingQueue = [];
		this._queue = {};
		this._waitPull = {};
		this._status = [];
		if (ids) {
			this._idPool = {};
			this._backId = [];
		}
	}

	public resolve(id: TID, type: number): TID {
		const col = this._backId[type];
		if (typeof col === "undefined") return id;
		const tID = col[id];
		return typeof tID === "undefined" ? id : tID;
	}

	public getSync(): number {
		const t = this._awaitAddingQueue;
		if (!t.length) return SYNC;
		for (let i = 0; i < t.length; i++) {
			if (!t[i].sent) return NOTSENT;
		}
		return SENDING;
	}

	public waitSync(): Promise<void> {
		return new Promise(resolve => {
			if (this.getSync() === SYNC) resolve();
			else this._status.push(resolve);
		});
	}

	public getId(id: TID): TID | null {
		return this._idPool[id] || (isTempID(id) ? null : id);
	}

	public waitId(id: TID): Promise<TID> {
		return new Promise(resolve => {
			const sid = this.getId(id);
			if (sid !== null) resolve(sid);

			const warr = this._waitPull[id] || [];
			warr.push(resolve);
			this._waitPull[id] = warr;
		});
	}

	public add(
		action: string,
		data: DataObj,
		proc: HandlerConfig
	): Promise<boolean> {
		return new Promise((resolve, reject) => {
			proc = { ...proc, resolve, reject };

			if (proc.debounce) {
				const qid = `${action}"/"${data.id}`;
				const item = this._queue[qid];

				if (item) {
					proc.resolve = (v: boolean) => {
						item.resolve(v);
						resolve(v);
					};
					proc.reject = e => {
						item.reject(e);
						reject();
					};
					clearTimeout(item.timer);
				}

				this._queue[qid] = proc;
				proc.timer = setTimeout(() => {
					this.tryExec(action, data, proc);
				}, proc.debounce);

				return;
			}

			this.tryExec(action, data, proc);
		});
	}

	public tryExec(
		action: string,
		data: DataObj,
		proc: HandlerConfig,
		finish?: () => void
	): boolean {
		const ready = this.exec(action, data, proc, finish);
		if (ready === null) {
			if (!finish) this._awaitAddingQueue.push({ action, data, proc });
			return false;
		}

		ready.then(
			(res: ServerResponse) => {
				// response contains new ID
				const check = res && res.id && res.id != data.id && isTempID(data.id);
				if (check) {
					// store id mapping for future use
					this._idPool[data.id] = res.id;

					// resolve all new ID waiting promises
					if (this._waitPull[data.id]) {
						this._waitPull[data.id].forEach(v => v(res.id));
						delete this._waitPull[data.id];
					}

					// store backward reference
					// unline direct one, we can't use a single object
					// because while temp ID is unique, real IDs can have the same value fo different types of objects
					if (proc.kind) {
						let t = this._backId[proc.kind];
						if (!t) t = this._backId[proc.kind] = {};
						t[res.id] = data.id;
					}
				}

				// set response data on event object
				data.response = res;
				// resolve the master promise
				proc.resolve(true);

				// check is queue finalized
				if (finish) finish();

				// check, maybe we can run some other queries
				if (check) this.execQueue();
			},
			e => {
				// FIXME - remove from queue
				if (finish) finish();
				proc.reject(e);
			}
		);

		return true;
	}
	public exec(
		action: string,
		data: DataObj,
		proc: HandlerConfig,
		finish?: () => void
	): Promise<ServerResponse> | null {
		const correctData = this.correctID(data, proc.ignoreID ? data.id : null);
		if (correctData === cantSendYet) {
			return null;
		}

		let res;
		try {
			res = proc.handler(correctData as DataObj, action, data);
		} catch (e) {
			// FIXME - remove from queue
			finish();
			proc.reject(e);
		}

		return res;
	}

	public correctID(obj: DataObj, ignore: TID): DataObj | symbol {
		let copy: DataObj = null;
		for (const key in obj) {
			const test = obj[key];
			if (typeof test === "object") {
				const after = this.correctID(test, ignore);
				if (after !== test) {
					if (after === cantSendYet) {
						return cantSendYet;
					}
					if (copy === null) {
						copy = { ...obj };
					}
					copy[key] = after;
				}
			} else if (test !== ignore && isTempID(test)) {
				const hasRealID = this._idPool[test];
				if (!hasRealID) {
					return cantSendYet;
				}

				if (copy === null) {
					copy = { ...obj };
				}
				copy[key] = hasRealID;
			}
		}

		return copy || obj;
	}

	public execQueue(): void {
		// try to execute all queries from the queue
		this._awaitAddingQueue.forEach(a => {
			if (!a.sent) {
				const finish = () => this._finishQueue(a);
				if (this.tryExec(a.action, a.data, a.proc, finish)) a.sent = true;
			}
		});
	}

	private _finishQueue(a: TQueueItem): void {
		this._awaitAddingQueue = this._awaitAddingQueue.filter(v => v !== a);

		// if queue is empty, resolve all sync waiting promises
		if (!this._awaitAddingQueue.length && this._status.length) {
			const temp = [...this._status];
			this._status = [];
			temp.forEach(resolve => resolve());
		}
	}
}

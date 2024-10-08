export type Action = {
	ignoreID?: boolean;
	debounce?: number;
	handler: Handler;
};

export type ActionMap<T> = {
	[P in keyof T]?: Action;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type DataObj = { [key: string]: any };

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Handler = (data: DataObj, action: string, ev: any) => Promise<any>;

export type HandlerConfig = {
	resolve?: (v: boolean) => void;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	reject?: (e: any) => void;
	timer?: number;
	kind?: number;
	debounce?: number;
	ignoreID?: boolean;
	handler: Handler;
};

export type DataProviderConfig = { [key: string]: HandlerConfig | Handler };

export type TID = string | number;
export interface AddResponse {
	id: TID;
}

export interface SkipProviderEvent {
	skipProvider: boolean;
}

export type ServerResponse = {
	id?: TID;
};

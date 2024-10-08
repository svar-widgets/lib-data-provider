import { expect, test } from "vitest";
import { DataProvider } from "../src/index";

function sleep(ms) {
	return new Promise(resolve => setTimeout(resolve, ms));
}

function getProvider() {
	return new DataProvider({
		add: {
			handler: async () => {
				await sleep(1);
				return Promise.resolve({ server: true });
			},
		},
	});
}

test("constructor", () => {
	const q = new DataProvider({});
	expect(q).is.not.undefined;
});

test("async events", async () => {
	const q = getProvider();
	const ev = await q.exec("add", { id: 1 });
	expect(ev.response.server).to.eq(true);
});

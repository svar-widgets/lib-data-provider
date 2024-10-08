import { expect, test } from "vitest";
import { ActionQueue, SYNC, NOTSENT } from "../src/index";
import { tempID } from "wx-lib-state";

let sum;
const handler = ev => {
	sum += ev.id;
	return Promise.resolve();
};

const broken = () => {
	throw "1";
};

const rejected = () => {
	return Promise.reject();
};

test("constructor", () => {
	const q = new ActionQueue();
	expect(q).is.not.undefined;
});

test("add", async () => {
	const q = new ActionQueue();
	sum = 0;
	const p1 = q.add("one", { id: 1 }, { handler });
	const p2 = q.add("two", { id: 2 }, { handler });
	const p3 = q.add("one", { id: 3 }, { handler });

	const [r1, r2, r3] = await Promise.all([p1, p2, p3]);
	expect(r1).to.eq(true);
	expect(r2).to.eq(true);
	expect(r3).to.eq(true);
	expect(sum).to.eq(6);
});

test("add debounce", async () => {
	const q = new ActionQueue();
	sum = 0;
	const p1 = q.add("one", { id: 1 }, { handler, debounce: 100 });
	const p2 = q.add("two", { id: 2 }, { handler, debounce: 100 });
	const p3 = q.add("one", { id: 3 }, { handler, debounce: 100 });

	const [r1, r2, r3] = await Promise.all([p1, p2, p3]);
	expect(r1).to.eq(true);
	expect(r2).to.eq(true);
	expect(r3).to.eq(true);
	expect(sum).to.eq(6);
});

test("add debounce, uniuque IDs", async () => {
	const q = new ActionQueue();
	sum = 0;
	const p1 = q.add("one", { id: 1 }, { handler, debounce: 100 });
	const p2 = q.add("two", { id: 1 }, { handler, debounce: 100 });
	const p3 = q.add("one", { id: 1 }, { handler, debounce: 100 });

	const [r1, r2, r3] = await Promise.all([p1, p2, p3]);
	expect(r1).to.eq(true);
	expect(r2).to.eq(true);
	expect(r3).to.eq(true);
	expect(sum).to.eq(2);
});

test("broken handler", async () => {
	const q = new ActionQueue();
	let x = 0;
	await q.add("one", { id: 1 }, { handler: broken }).then(
		() => (x = 1),
		() => (x = 2)
	);
	expect(x).to.eq(2);
});

test("rejected handler", async () => {
	const q = new ActionQueue();
	let x = 0;
	await q.add("one", { id: 1 }, { handler: rejected }).then(
		() => (x = 1),
		() => (x = 2)
	);
	expect(x).to.eq(2);
});

test("add with temp ids", async () => {
	const q = new ActionQueue();
	let order = [];

	let temp = tempID();
	const pID = q.waitId(temp);

	const p1 = q
		.add("one", { id: 1, data: { id: temp } }, { handler })
		.then(() => order.push(1));
	const p2 = q
		.add("one", { id: 1, data: { id: 123 } }, { handler })
		.then(() => order.push(2));

	await p2;
	expect(q.getSync()).to.eq(NOTSENT);
	const pStatus = q.waitSync().then(() => order.push(0));

	const p3 = q
		.add(
			"one",
			{ id: temp },
			{
				ignoreID: true,
				kind: "row",
				handler: () => Promise.resolve({ id: 456 }),
			}
		)
		.then(() => order.push(3));
	const p4 = q.add("one", { id: 1 }, { handler }).then(() => order.push(4));

	const ps = await Promise.all([p1, p3, p4, pID, pStatus]);
	expect(ps).to.deep.eq([4, 2, 3, 456, 5]);
	expect(q.getSync()).to.eq(SYNC);

	expect(order).to.deep.eq([2, 3, 4, 1, 0]);
	expect(q.getId(temp)).to.eq(456);
	expect(q.resolve(456, "row")).to.eq(temp);

	q.reset();
	expect(q.getId(temp)).to.eq(456);
	expect(q.resolve(456, "row")).to.eq(temp);
	q.reset(true);
	expect(q.getId(temp)).to.eq(null);
	expect(q.resolve(456, "row")).to.eq(456);
});

import { constVoid } from "./function.utils";


export interface Mutex {
	lock: () => void;
	unlock: () => void;
	current: Promise<void>;
	locked: boolean;
	calculateSafe: <T>(fn: () => T) => Promise<T>;
}

export const createMutex = (): Mutex => {
	const mutex: Mutex = {
		locked: false,
		unlock: constVoid,
		current: Promise.resolve(),
		lock: () => {
			if (mutex.locked) {
				return;
			}
			mutex.current = new Promise<void>(resolve => {
				mutex.unlock = () => {
					mutex.locked = false;
					resolve();
				};
			});
			mutex.locked = true;
		},
		calculateSafe: async fn => {
			while (mutex.locked) {
				await mutex.current;
			}
			mutex.lock();
			const result = await fn();
			mutex.unlock();
			return result;
		}
	};
	return mutex;
};
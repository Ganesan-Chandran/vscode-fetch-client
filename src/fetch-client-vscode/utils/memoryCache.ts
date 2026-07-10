export class MemoryCache<T> {
	private readonly cache = new Map<string, T>();

	get(key: string): T | undefined {
		return this.cache.get(key);
	}

	set(key: string, value: T): void {
		this.cache.set(key, value);
	}

	delete(key: string): void {
		this.cache.delete(key);
	}

	clear(): void {
		this.cache.clear();
	}
}

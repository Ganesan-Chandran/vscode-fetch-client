export interface IPubSubMessage {
		messageType: string;
		message?: any;
}

export interface Subscription {
		unsubscribe(): void;
}

export type Consumer<T> = (value: T) => any;

export interface Publisher<T> {
		subscribe(consumer: Consumer<T>): Subscription;
}

const EMPTY_SUBSCRIPTION: Subscription = {
		unsubscribe: () => undefined,
};

export class PubSub<T> implements Publisher<T> {
		private consumers: Map<object, Consumer<T>>;

		constructor() {
				this.consumers = new Map<object, Consumer<T>>();
		}

		/** A number of subscribed consumers. */
		get size(): number {
				return this.consumers.size;
		}

		/** Subscribes a consumer of values. */
		subscribe(consumer: Consumer<T>): Subscription {
				if (!consumer) {
						return EMPTY_SUBSCRIPTION;
				}
				const consumerKey = Object.create(null);
				this.consumers.set(consumerKey, consumer);
				return new EmitterSubscription(this.consumers, consumerKey);
		}

		/** Publish a value to subscribed consumers. */
		publish(value: T) {
				if (this.consumers.size === 0) {
						return;
				}
				this.consumers.forEach((consumer) => {
						consumer(value);
				});
		}

		/** Removes all subscribed consumers. */
		clear() {
				this.consumers.clear();
				this.consumers = new Map<object, Consumer<T>>();
		}
}

class EmitterSubscription<T> implements Subscription {
		private consumers: Map<object, Consumer<T>> | undefined;
		private consumerKey: object | undefined;

		constructor(consumers: Map<object, Consumer<T>>, consumerKey: object) {
				this.consumers = consumers;
				this.consumerKey = consumerKey;
		}

		unsubscribe(): void {
				if (this.consumers && this.consumerKey) {
						this.consumers.delete(this.consumerKey);
				}

				this.consumers = undefined;
				this.consumerKey = undefined;
		}
}

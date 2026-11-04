/**
 * Type guard that determines whether a value is a real (finite, non-NaN) number.
 *
 * This function narrows the type of the provided value to `number` when it returns `true`.
 *
 * @param value - The value to check.
 * @returns `true` if `value` is of type `number`, is not `NaN`, and is finite; otherwise `false`.
 *
 * @example
 * // Narrows `unknown` to `number`
 * const value: unknown = 3.14;
 * if (isRealNumber(value)) {
 *   // value is typed as number here
 *   const doubled = value * 2;
 * }
 *
 * @remarks
 * Uses `Number.isNaN` to avoid coercion behavior of the global `isNaN`, and `Number.isFinite`
 * to exclude `Infinity` and `-Infinity`.
 */
export function isRealNumber(value: unknown): value is number {
	return (
		typeof value === 'number' && !Number.isNaN(value) && Number.isFinite(value)
	);
}

/**
 * Asserts that a condition is true, narrowing its type for subsequent code.
 *
 * Throws an `Error` with the provided message when `condition` is exactly `false`.
 * Other falsy values such as `undefined` or `0` are not treated as failures.
 *
 * @param condition - The condition to assert.
 * @param message - The error message used if the condition is `false`.
 * @throws {Error} If `condition` is `false`.
 *
 * @example
 * const value: string | undefined = getValue();
 * assert(value !== undefined, 'A value is required');
 * // `value` is narrowed to `string` here.
 */
export function assert(condition: unknown, message = ''): asserts condition {
	if (condition === false) {
		throw Error(message);
	}
}

/* https://www.totaltypescript.com/concepts/the-prettify-helper */
export type Prettify<T> = {
	[K in keyof T]: T[K];
} & {};

/**
 * Formats a numeric price as a EUR currency string.
 *
 * @param priceInCents - The price value to format.
 * @returns The price formatted using the locale's EUR currency conventions.
 * @throws {Error} If `priceInCents` is not an integer.
 */
export function getFormattedPrice(priceInCents: number) {
	if (!Number.isInteger(priceInCents)) {
		throw Error(`Price is not in cents (integer) : ${priceInCents}`);
	}

	return new Intl.NumberFormat(undefined, {
		style: 'currency',
		currency: 'EUR',
	}).format(priceInCents / 100);
}

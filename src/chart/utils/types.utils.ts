export type Mutable<T> = { -readonly [P in keyof T]: T[P] };

export type PartialExcept<T, K extends keyof T> = Partial<Omit<T, K>> & Pick<T, K>;

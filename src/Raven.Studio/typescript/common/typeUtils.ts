﻿
export function isBoolean(value: any): value is boolean {
    return value === !!value;
}

export function range(start: number, end?: number, increment?: number): number[] {
    // if the end is not defined...
    const isEndDef = typeof end !== 'undefined';
    // ...the first argument should be the end of the range...
    end = isEndDef ? end : start;
    // ...and 0 should be the start
    start = isEndDef ? start : 0;

    // if the increment is not defined, we could need a +1 or -1
    // depending on whether we are going up or down
    if (increment == null) {
        increment = Math.sign(end - start);
    }

    // calculating the length of the array, which has always to be positive
    const length = Math.max(Math.ceil((end - start) / increment), 0);

    // In order to return the right result, we need to create a new array
    // with the calculated length and fill it with the items starting from
    // the start value + the value of increment.
    const { result } = Array.from<{ current: number, result: number[] }>({ length }).reduce(
        ({ result, current }) => ({
            // append the current value to the result array
            result: [...result, current],
            // adding the increment to the current item
            // to be used in the next iteration
            current: current + increment,
        }),
        { current: start, result: [] }
    )

    return result;
}

export function sumBy<T>(array: T[], valuesAccessor: (value: T) => number): number {
    return array.reduce((p, c) => p + valuesAccessor(c), 0);
}

export function sortBy<T>(array: T[], valueAccessor: (value: T) => any): T[] {
    return _.sortBy(array, valueAccessor);
}


export function compareSets<T extends string | number>(set1: T[], set2: T[]): boolean {
    if (Array.isArray(set1) === false || Array.isArray(set2) === false) {
        return false;
    }

    if (set1.length !== set2.length) {
        return false;
    }

    const sortedSet1 = sortBy(set1, x => x);
    const sortedSet2 = sortBy(set2, x => x);

    for (let i = 0; i < sortedSet1.length; i++) {
        if (sortedSet1[i] !== sortedSet2[i]) {
            return false;
        }
    }
    return true;
}

export const isEmpty = <T>(value: T | undefined): value is undefined => {
    if (value === undefined || value === null) {
        return true;
    }
    
    if (typeof value === 'string' && value.trim() === '') {
        return true;
    }
    
    if (Array.isArray(value)) {
        return value.length === 0;
    }
    
    if (value instanceof Object) {
        return Object.keys(value).length === 0;
    }
    
    return false;
};

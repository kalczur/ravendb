import { RangeTuple } from "fuse.js";
import React from "react";

interface StudioSearchFuzzyHighlightedTextProps {
    text: string;
    indices: readonly RangeTuple[];
}

export default function StudioSearchFuzzyHighlightedText({ text, indices }: StudioSearchFuzzyHighlightedTextProps) {
    const flatMatchedIndices = getFlatFlatMatchedIndexes(indices);
    const characters = text.split("");

    return (
        <span className="m-0">
            {characters.map((char, index) => (
                <Char key={index} char={char} index={index} flatMatchedIndices={flatMatchedIndices} />
            ))}
        </span>
    );
}

interface CharProps {
    char: string;
    index: number;
    flatMatchedIndices: number[];
}

function Char({ char, index, flatMatchedIndices }: CharProps) {
    const isHighlighted = flatMatchedIndices.includes(index);

    if (isHighlighted) {
        return (
            <mark key={index} className="bg-faded-warning p-0">
                {char}
            </mark>
        );
    }

    return char;
}

function getFlatFlatMatchedIndexes(indices: readonly RangeTuple[]) {
    if (!indices) {
        return [];
    }

    const flatMatchedIndices: number[] = [];

    indices.forEach((range) => {
        for (let i = range[0]; i <= range[1]; i++) {
            flatMatchedIndices.push(i);
        }
    });

    return flatMatchedIndices;
}
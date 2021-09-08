import { bisect } from './bisect';

export class LineMap {
    public entries: readonly Entry[];

    public constructor(content: string) {
        const regex = /(?:\r\n|\r|\n)/g;
        const entries = [];

        let line = 0;
        let offset = 0;

        let match: RegExpMatchArray | null = null;

        while ((match = regex.exec(content)) !== null) {
            entries.push({
                start: offset,
                endContent: regex.lastIndex - match[0].length,
                endNewLine: regex.lastIndex,
                line: line++,
                newline: match[0],
            });
            offset = regex.lastIndex;
        }

        entries.push({
            start: offset,
            endNewLine: content.length,
            endContent: content.length,
            line: line,
            newline: '',
        });

        this.lines = line;
        this.entries = entries;
    }

    public lineToEntry(line: number) {
        return this.entries[line];
    }

    public offsetToEntry(offset: number) {
        const line = bisect(this.entries, (entry) => offset < entry.endNewLine);
        return this.entries[line];
    }

    public queryToEntry(query: Query) {
        if (isOffset(query))     { return this.offsetToEntry(query.offset); }
        if (isLineColumn(query)) { return this.lineToEntry(query.line); }
        if (isLine(query))       { return this.lineToEntry(query.line); }
        throw new Error("Invalid query");
    }

    public queryToOffset(query: Query, anchor: LineAnchor = LineAnchor.Start) {
        if (isOffset(query))     { return query.offset; }
        if (isLineColumn(query)) { return this.lineToEntry(query.line).start + query.column; }
        if (isLine(query))       { return getAnchorOffset(this.lineToEntry(query.line), anchor); }
        throw new Error("Invalid query");
    }

    public queryToLineColumn(query: Query, anchor: LineAnchor = LineAnchor.Start): LineColumn {
        if (isOffset(query)) {
            const entry = this.offsetToEntry(query.offset);

            return {
                line: entry.line,
                column: query.offset - entry.start,
            };
        }
        if (isLineColumn(query)) {
            return query;
        }
        if (isLine(query)) {
            const entry = this.lineToEntry(query.line);
            const offset = getAnchorOffset(entry, anchor);

            return {
                line: query.line,
                column: offset - entry.start,
            };
        }
        throw new Error("Invalid query");
    }

    public readonly lines: number;
}

export interface Entry {
    start: number
    endNewLine: number
    endContent: number

    line: number

    newline: string
}

export interface Offset {
    offset: number;
}

export interface LineColumn {
    line: number;
    column: number;
}

export interface Line {
    line: number;
}

export type Query = Offset | Line | LineColumn;

export enum LineAnchor {
    Start,
    EndContent,
    EndNewLine,
}

export function isOffset(query: Query): query is Offset {
    return typeof((query as any).offset) === 'number';
}

export function isLine(query: Query): query is Line {
    return typeof((query as any).line) === 'number' && typeof((query as any).column) !== 'number';
}

export function isLineColumn(query: Query): query is LineColumn {
    return typeof((query as any).line) === 'number' && typeof((query as any).column) === 'number';
}

export function getAnchorOffset(entry: Entry, anchor: LineAnchor) {
    switch (anchor) {
        case LineAnchor.Start: return entry.start;
        case LineAnchor.EndContent: return entry.endContent;
        case LineAnchor.EndNewLine: return entry.endNewLine;
    }
}
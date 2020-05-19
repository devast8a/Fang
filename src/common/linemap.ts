import { bisect } from './bisect';

export class LineMap {
    private map: Entry[];

    public constructor(content: string){
        const regex = /(?:\r\n|\r|\n)/g;
        this.map = [];

        let line = 0;
        let offset = 0;

        let match: RegExpMatchArray | null = null;

        while((match = regex.exec(content)) != null){
            this.map.push({
                start: offset,
                endContent: regex.lastIndex - match[0].length,
                endNewLine: regex.lastIndex,
                line: line++,
                newline: match[0],
            });
            offset = regex.lastIndex;
        }

        this.map.push({
            start: offset,
            endNewLine: content.length + 1,
            endContent: content.length + 1,
            line: line,
            newline: '',
        });

        this.lines = line;
    }

    private getAnchorOffset(entry: Entry, anchor: LineAnchor){
        switch(anchor){
            case LineAnchor.Start: return entry.start;
            case LineAnchor.EndContent: return entry.endContent;
            case LineAnchor.EndNewLine: return entry.endNewLine;
        }
    }

    public lineToEntry(line: number) {
        return this.map[line];
    }

    public offsetToEntry(offset: number){
        const line = bisect(this.map, (entry) => offset < entry.endNewLine);
        return this.map[line];
    }

    public queryToEntry(query: Query){
        if(isOffset(query))     { return this.offsetToEntry(query.offset); }
        if(isLineColumn(query)) { return this.map[query.line]; }
        if(isLine(query))       { return this.map[query.line]; }
        throw new Error("Unreachable - Invalid query");
    }

    public queryToOffset(query: Query, anchor: LineAnchor = LineAnchor.Start){
        if(isOffset(query))     { return query.offset; }
        if(isLineColumn(query)) { return this.lineToEntry(query.line).start + query.column; }
        if(isLine(query))       { return this.getAnchorOffset(this.lineToEntry(query.line), anchor); }
        throw new Error("Unreachable - Invalid query");
    }

    public queryToLineColumn(query: Query, anchor: LineAnchor = LineAnchor.Start): LineColumn {
        if(isOffset(query)){
            const entry = this.offsetToEntry(query.offset);

            return {
                line: entry.line,
                column: query.offset - entry.start,
            };
        }
        if(isLineColumn(query)){
            return query;
        }
        if(isLine(query)){
            return {
                line: query.line,
                column: this.getAnchorOffset(this.lineToEntry(query.line), anchor),
            };
        }
        throw new Error("Unreachable - Invalid query");
    }

    public readonly lines: number;
}

export module LineMap {
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
}

export type Entry           = LineMap.Entry;
export const isLine         = LineMap.isLine;
export const isLineColumn   = LineMap.isLineColumn;
export const isOffset       = LineMap.isOffset;
export type Line            = LineMap.Line;
export const LineAnchor     = LineMap.LineAnchor;
export type LineAnchor      = LineMap.LineAnchor;
export type LineColumn      = LineMap.LineColumn;
export type Offset          = LineMap.Offset;
export type Query           = LineMap.Query;

export default LineMap;
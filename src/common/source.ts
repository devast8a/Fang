import LineMap from './linemap';
import * as fs from 'fs';

export class Source {
    private _map: SourceLineMap | undefined;

    public path: string;
    public content: string;

    public constructor(path: string, content: string){
        this.path = path;
        this.content = content;
    }
    
    public get map(){
        if(this._map === undefined){this._map = new SourceLineMap(this.content);}
        return this._map;
    }

    public static async fromFile(path: string){
        const content = await fs.promises.readFile(path, "utf8");
        return new Source(path, content);
    }
}

export class SourceLineMap extends LineMap {
    public content: string;

    constructor(content: string){
        super(content);
        this.content = content;
    }

    public slice(start: LineMap.Query, end: LineMap.Query){
        return this.content.slice(
            this.queryToOffset(start),
            this.queryToOffset(end)
        );
    }

    public lineToContent(line: number) {
        const entry = this.lineToEntry(line);
        return this.content.slice(entry.start, entry.endContent);
    }
}
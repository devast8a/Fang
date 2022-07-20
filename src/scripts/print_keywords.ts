import { Constant, Matcher } from '../grammar/generator';
import { FangGrammar } from '../grammar/grammar';

const matchers = Matcher.collect(FangGrammar);

const keywords = new Set();
for (const matcher of matchers) {
    if (matcher instanceof Constant && /^\w+$/.test(matcher.value)) {
        keywords.add(matcher.value);
    }
}
const sorted = Array.from(keywords).sort();

console.log(sorted.join("\n"));
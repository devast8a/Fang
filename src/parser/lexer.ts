import * as moo from 'moo';

const lexer = moo.compile({
  comment:          /#[ #][ -~]*/,
  newline:          {match: '\n', lineBreaks: true},
  ws:               /[ \t]+/,

  infix:            /infix[~!@#$%^&*+=|?/:.\-\\<>]+/,
  postfix:          /postfix[~!@#$%^&*+=|?/:.\-\\<>]+/,
  prefix:           /prefix[~!@#$%^&*+=|?/:.\-\\<>]+/,

  identifier:       {
    match: /[a-zA-Z_][a-zA-Z0-9_]*/,
    type: moo.keywords({
      kw_enum: "enum",
      kw_fn: "fn",
      kw_impl: "impl",
      kw_mut: "mut",
      kw_own: "own",
      kw_struct: "struct",
      kw_trait: "trait",
      kw_val: "val",
    })
  },
  lifetime:         /%[a-zA-Z_][a-zA-Z0-9_]*/,
  attribute_begin:  '#[',

  left_curly:       '{',
  left_round:       '(',
  left_square:      '[',
  right_curly:      '}',
  right_round:      ')',
  right_square:     ']',
  left_angle:       '<',
  right_angle:      '>',

  comma:            /\s*,\s*/,
  semicolon:        ';',

  operator:         /[~!@#$%^&*+=|?/:.\-\\][~!@#$%^&*+=|?/:.\-\\<>]*/,

  string_double_quote: {match: /"(?:[^"]|\\.)*"/, lineBreaks: true},
  integer_bin: /0b[01][01_]*/,
  integer_dec: /[0-9][0-9_]*/,
  integer_hex: /0x[0-9a-fA-F][0-9a-fA-F_]*/,
  integer_oct: /0o[0-7][0-7_]*/,
});

export default lexer;
## Documentation ###################################################################################
    # Whitespace does not include comments OR newlines
    #   _  = optional whitespace
    #   __ = required whitespace
    #
    # Decl/* - Syntax for declaring functions/variables/etc...
    # Expr/* - Syntax for expressions
    # Stmt/* - Syntax for statement

## Abbreviations ###################################################################################
    ## Dc - DeclClass
    ## Df - DeclFunction
    ## Dg - DeclGeneric
    ## Dp - DeclParameter
    ## Dt - DeclTrait
    ## Dv - DeclVariable
    ## Eb - ExprIndexBracket
    ## Ec - ExprCall
    ## En - ExprConstruct       (En - Expression New)
    ## Ed - ExprIndexDot
    ## Ei - ExprIf
    ## Em - ExprMacro
    ## Ld - ExprDictionary      (Ld - Literal Dictionary)
    ## Sa - StmtAssign
    ## Sf - StmtForEach
    ## Si - StmtIf
    ## Sr - StmtReturn
    ## Sw - StmtWhile

## Prelude #########################################################################################
    @{%
    import lex from '../lexer';
    import * as p from '../post_processor';

    const lexer = lex as any;       // Subvert type system
    %}
    @preprocessor typescript
    @lexer lexer

    STAR[BEGIN, WS, ELEMENT, SEPARATOR, END] -> $BEGIN $WS ($ELEMENT ($SEPARATOR $ELEMENT):* $WS):? $END {%p.ListProcessor%}
    PLUS[BEGIN, WS, ELEMENT, SEPARATOR, END] -> $BEGIN $WS ($ELEMENT ($SEPARATOR $ELEMENT):* $WS) $END   {%p.ListProcessor%}

    BODY[ELEMENT] -> STAR["{", N_, $ELEMENT, StmtSep, "}"]

## Main ############################################################################################
    main -> NL:? (Stmt (StmtSep Stmt):* NL:?):? {%p.MainProcessor%}

## Decl/Class ######################################################################################
    DeclClass    -> DcKeyword DcName DcImplement:* DcGeneric:? DcAttribute:* DcBody:? {%p.DeclClass%}

    # Examples:
    #   class Foo impl ClassName #attribute {}

    # Supports:
    #   Attributes

    # Required
    DcKeyword       -> "class" __
    DcName          -> Identifier

    # Optional After
    DcImplement     -> N__ "impl" __ Type
    DcGeneric       -> N__ DeclGeneric
    DcAttribute     -> N__ Attribute
    DcBody          -> N_ BODY[Stmt]

    # Contexts
    Stmt            -> DeclClass

## Decl/Function ###################################################################################
    DeclFunction     -> DfKeyword DfName:? CompileTime:? DfParameters DfReturnType:? DfGeneric:? DfAttribute:* DfBody:? {%p.DeclFunction%}

    # Examples:
    #   fn name(){ ... }
    #   fn name(parameter: Type #parameterAttribute ...): ReturnType #functionAttribute { ... }

    # Supports:
    #   Attributes
    #   Compile Time Operator

    # Required
    DfKeyword       -> "fn"
    DfKeyword       -> "op"
    DfName          -> __ Identifier
    DfParameters    -> STAR["(", NL:?, DeclParameter, COMMA, ")"]

    # Optional After
    DfReturnType    -> _ "->" _ Type
    DfGeneric       -> N__ DeclGeneric
    DfAttribute     -> N__ Attribute
    DfBody          -> N_ BODY[Stmt]
    DfBody          -> __ "=>" _ Expr

    # Contexts
    Stmt            -> DeclFunction
    Expr            -> DeclFunction

## Decl/Generics ###################################################################################
    DeclGeneric  -> DgKeyword DgParameters DgWhere:*

    # Examples:
    #   generic<A> where A impl B

    DgKeyword       -> "generic"
    DgParameters    -> PLUS["<", _, DgParameter, COMMA, ">"]
    DgParameter     -> Identifier
    DgWhere         -> __ "where" __ Identifier __ "impl" __ Type

    # Contexts
    # After the class name but before the body in DeclClass
    # After the function name but before the body in DeclFunction

## Decl/Parameter ##################################################################################
    DeclParameter    -> DpKeyword:? DpName CompileTime:? DpType:? DpAttribute:* DpValue:? {%p.DeclParameter%}

    # Examples:
    #   name
    #   name: Type
    #   mut name
    #   own name: Type

    # Supports:
    #   Attributes
    #   Compile Time Operator
        
    # Optional Before
    DpKeyword       -> "own" __
    DpKeyword       -> "mut" __

    # Required
    DpName          -> Identifier
    
    # Optional After
    DpType          -> _ ":" _ Type
    DpAttribute     -> __ Attribute
    DpValue         -> _ "=" _ Expr

    # Context
    # Function declaration parameter's list (DeclFunction)

## Decl/Trait ######################################################################################
    DeclTrait    -> DtKeyword DtName DtImplement:* DtGeneric:? DtAttribute:* DtBody:? {%p.DeclTrait%}

    # Examples:
    #   trait Foo impl ClassName #attribute {}

    # Supports:
    #   Attributes

    # Required
    DtKeyword       -> "trait" __
    DtName          -> Identifier

    # Optional After
    DtImplement     -> N__ "impl" __ Type
    DtGeneric       -> N__ DeclGeneric
    DtAttribute     -> N__ Attribute
    DtBody          -> N_ BODY[Stmt]

    # Contexts
    Stmt            -> DeclTrait

## Decl/Variable ###################################################################################
    DeclVariable     -> DvKeyword DvName CompileTime:? DvType:? DvAttribute:* DvValue:? {%p.DeclVariable%}

    # Exmaples:
    #   val name
    #   mut name: Type
    #   val name!: Type = value #attribute

    # Supports:
    #   Attributes
    #   Compile Time Operator

    # Required
    DvKeyword       -> "val" __
    DvKeyword       -> "mut" __
    DvName          -> Identifier

    # Optional After
    DvType          -> _ ":" _ Type
    DvAttribute     -> __ Attribute
    DvValue         -> _ "=" _ Expr

    # Contexts
    Stmt            -> DeclVariable

## Expr ############################################################################################
    # Expr describes expressions that may be comprised of binary and unary operations
    # Atom describes what binary and unary operators may be performed on
    Expr            -> ExprBinary

    # To avoid potential ambiguity between generics and less than or greater than operators we do
    # not consider "<" and ">" to be legal operators. However, we still want to use these symbols
    # as operators (for less than and greater than operators for example). We special case their
    # usage in operators, but if there is no space after an expression the operator can not start
    # with a less than or greater than symbol.
    OperatorSpaced  -> "<" %operator:?
    OperatorSpaced  -> ">" %operator:?
    OperatorSpaced  -> %operator {% p.RejectOperators %}
    Operator        -> %operator {% p.RejectOperators %}

    # Binary Expressions
    # x + y or x+y
    ExprBinary      -> ExprUnary __ OperatorSpaced __ ExprBinary    {%p.ExprBinary%}
    ExprBinary      -> ExprUnary NL OperatorSpaced __ ExprBinary    {%p.ExprBinary%}
    ExprBinary      -> ExprUnary __ OperatorSpaced NL ExprBinary    {%p.ExprBinary%}
    ExprBinary      -> Atom Operator Atom                           {%p.ExprBinary%}
    ExprBinary      -> ExprUnary

    # Unary Expressions
    # ++x or x++
    ExprUnary       -> Operator Atom                                {%p.ExprUnaryPrefix%}
    ExprUnary       -> Atom Operator                                {%p.ExprUnaryPostfix%}
    ExprUnary       -> Atom

    # Atoms
    Atom            -> "(" _ Expr _ ")"
    Atom            -> ExprIdentifier

    ExprIdentifier  -> Identifier {%p.ExprIdentifier%}

    # Literals
    Atom            -> %string_double_quote   {%p.LiteralString%}       # "foo"
    Atom            -> %integer_bin           {%p.LiteralIntegerBin%}   # 0b1010101101 0b1011_1011
    Atom            -> %integer_dec           {%p.LiteralIntegerDec%}   # 208124 012985  1_000_000
    Atom            -> %integer_hex           {%p.LiteralIntegerHex%}   # 0x01234567890ABCDEF 0xFF_FF
    Atom            -> %integer_oct           {%p.LiteralIntegerOct%}   # 0o01234567 0o123_123_123

## Expr/Literals/List ##############################################################################
    ExprList        -> STAR["[", _, Expr, COMMA, "]"]
    # This quote is a workaround to fix a highlighting bug in vscode "

    # Example:
    #   [1, 2, 3, 4, 5, 6, 7]

    # Context
    Atom            -> ExprList

## Expr/Literals/Dictionary ########################################################################
    ExprDictionary  -> STAR["{", _, LdEntry, COMMA, "}"]

    # Example:
    #   {foo: 1 + 2, bar: 3}

    # Required
    LdEntry         -> Identifier _ ":" _ Expr

    # Context
    Atom            -> ExprDictionary

## Expr/Call #######################################################################################
    ExprCall        -> EcTarget CompileTime:? EcArguments {%p.ExprCall%}

    # Examples:
    #   foo(bar, baz)

    # Supports:
    #   Compile Time Operator

    # Required
    EcTarget        -> Atom
    EcArguments     -> STAR["(", _, EcArgument, COMMA, ")"]
    EcArgument      -> Expr
    EcArgument      -> Identifier _ ":" _ Expr

    # Contexts
    Stmt            -> ExprCall
    Atom            -> ExprCall

## Expr/Construct ##################################################################################
    ExprConstruct   -> EnTarget CompileTime:? EnArguments

    # En - n for "new"

    # Examples:
    #   foo{bar, baz
    #   foo{bar: 100, baz: 20}

    # Supports:
    #   Compile Time Operator

    # Required
    EnTarget        -> Atom
    EnArguments     -> STAR["{", _, EcArgument, COMMA, "}"]
    EnArgument      -> Expr
    EnArgument      -> Identifier _ ":" _ Expr

    # Contexts
    Atom            -> ExprConstruct

## Expr/If #########################################################################################
    ExprIf          -> EiKeyword EiCondition "?" EiTrue ":" EiFalse

    # Disabled for now... we need to see what effect this has on code gen first

    # Examples:
    #   if x ? y : z
    #   if (x == y) ? (y + z) : (z + 10)
    #   if! (x == y) ? 10 : 20

    # Supports:
    #   Compile Time Operator

    # Required
    EiKeyword       -> "if" CompileTime:? __
    EiCondition     -> Atom N__
    EiTrue          -> __ Atom N__
    EiFalse         -> __ Atom

    # Context
    # Expr            -> ExprIf

## Expr/IndexBracket ###############################################################################
    ExprIndexBracket -> EbTarget EbIndex

    # Examples:
    #   foo[bar, baz]
    #   (foo + bar)[baz]

    # Required
    EbTarget        -> Atom
    EbIndex         -> PLUS["[", _, Expr, COMMA, "]"]
    # This quote is a workaround to fix a highlighting bug in vscode "

    # Contexts
    Atom            -> ExprIndexBracket

## Expr/IndexDot ###################################################################################
    ExprIndexDot    -> EdTarget EdOperator EdName

    # Examples:
    #   foo.bar.baz
    #   foo.bar.baz

    # Required
    EdTarget        -> Atom
    EdOperator      -> "."
    EdOperator      -> "." NL
    EdOperator      -> NL "."
    EdName          -> Identifier

    # Contexts
    Atom            -> ExprIndexDot

## Expr/MacroCall###################################################################################
    ExprMacroCall   -> EmTarget CompileTime EmArgument:? {%p.ExprMacroCall%}

    # Examples:
    #   foo! x + y
    #   bar!

    # Required
    EmTarget        -> Identifier

    # Optional After
    EmArgument      -> __ Expr

    # Contexts
    Stmt            -> ExprMacroCall
    ExprBinary      -> ExprMacroCall

## Stmt/Assign #####################################################################################
    StmtAssign      -> SaTarget SaOperator SaValue {%p.StmtAssign%}

    # Required
    SaTarget        -> ExprIdentifier
    SaTarget        -> ExprIndexDot
    SaTarget        -> ExprIndexBracket
    SaOperator      -> __ OperatorSpaced __
    SaValue         -> Expr

    # Contexts
    Stmt            -> StmtAssign

## Stmt/ForEach ####################################################################################
    StmtForEach     -> SfKeyword CompileTime:? SfCondition SfBody {%p.StmtForEach%}

    # Required
    SfKeyword       -> "for"
    SfCondition     -> _ "(" _ Identifier __ "in" __ Expr _ ")" N_
    SfBody          -> BODY[Stmt]

    # Contexts
    Stmt            -> StmtForEach

## Stmt/If #########################################################################################
    StmtIf          -> SiKeyword SiCondition SiBody SiElif:* SiElse:? {%p.StmtIf%}

    # Examples:
    #   if(x == false){ ... }
    #   if!(Foo()){ ... }
    #   if!(x == y){ ... } else { ... }
    #   if!(x == 0)!{ ... } else if(x == 1) { ... } else { ... }

    # Supports:
    # TODO: Support compile time operator

    # Required
    SiKeyword       -> "if" N_
    SiElifKeyword   -> N_ "else" __ "if" N_
    SiElseKeyword   -> N_ "else" N_
    SiCondition     -> "(" _ Expr _ ")" N_
    SiBody          -> BODY[Stmt]

    # Optional After
    SiElif          -> SiElifKeyword SiCondition SiBody
    SiElse          -> SiElseKeyword SiBody

    # Context
    Stmt            -> StmtIf

## Stmt/Match ######################################################################################
    StmtMatch       -> SmKeyword SmValue SmCases {%p.StmtMatch%}

    SmKeyword       -> "match" CompileTime:? N_
    SmValue         -> "(" _ Expr _ ")" N_
    SmCases         -> BODY[SmCase]

    SmCase          -> "case" __ Pattern _ ":" N_ SmBody
    SmBody          -> BODY[Stmt]

    Stmt            -> StmtMatch

## Stmt/Return #####################################################################################
    StmtReturn      -> SrKeyword SrValue:? {%p.StmtReturn%}

    # Examples
    #   return
    #   return 10 + 20

    # Required
    SrKeyword       -> "return"
    
    # Optional After
    SrValue         -> __ Expr

    # Context
    Stmt            -> StmtReturn

## Stmt/While ######################################################################################
    StmtWhile     -> SwKeyword CompileTime:? SwCondition SwBody {%p.StmtWhile%}

    # Examples:
    #   while(x == false){ ... }
    #   while!(Foo()){ ... }

    # Supports:
    #   Compile Time Operator

    # Required
    SwKeyword       -> "while"
    SwCondition     -> _ "(" _ Expr _ ")" N_
    SwBody          -> BODY[Stmt]

    # Context
    Stmt            -> StmtWhile

## Types ###########################################################################################
    Type -> Expr

    Atom -> Identifier GenericArguments
    GenericArguments    -> PLUS["<", _, GenericArgument, COMMA, ">"]
    GenericArgument     -> Type
    GenericArgument     -> Identifier _ ":" _ Type

## Patterns ########################################################################################
    # -- Context: Used in pattern matching and to destructure assignments and arguments
    Pattern -> PdCrlMembers
    Pattern -> Identifier PdCrlMembers
    Pattern -> PdSqrMembers
    Pattern -> PdKeyword:? Identifier

    PdCrlMembers -> PLUS["{", _, PdMember, COMMA, "}"]
    PdSqrMembers -> PLUS["[", _, PdMember, COMMA, "]"]
    # This quote is a workaround to fix a highlighting bug in vscode "

    PdMember     -> Pattern
    PdMember     -> Identifier PdRebind Pattern
        PdKeyword    -> "own" __
        PdKeyword    -> "mut" __
        PdKeyword    -> "val" __
        PdRebind     -> _ "=" ">" _

## Attribute #######################################################################################
    Attribute -> "#" Identifier

## Compile Time Operator ###########################################################################
    CompileTime -> "!"

## Identifier ######################################################################################
    Identifier -> %identifier

## Whitespace ######################################################################################
    # Single underscore is optional whitespace, double is required whitespace
    # If it begins with a N then newlines and 
    __    -> %ws
    _     -> %ws:?
    N__   -> (%ws | %comment | %newline):+
    N_    -> N__:?

    NL              -> (%ws:? %comment:? %newline):+ %ws:?

## Helpers #########################################################################################
    COMMA           -> _ %comma _
    COMMA           -> NL

    StmtSep         -> NL
    StmtSep         -> _ ";" _
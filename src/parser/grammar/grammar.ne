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
    ## Dv - DeclVariable
    ## Eb - ExprIndexBracket
    ## Ec - ExprCall
    ## En - ExprConstruct
    ## Ed - ExprIndexDot
    ## Ei - ExprIf
    ## Em - ExprMacro
    ## Ld - ExprDictionary     (Literal Dictionary)
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

    BODY[ELEMENT] -> STAR["{", NL, $ELEMENT, StmtSep, "}"]

## Main ############################################################################################
    main -> NL:? (Stmt (StmtSep Stmt):* NL:?)        {% function(data){ return [].concat(...data[0]); } %}

## Decl/Variable ###################################################################################
    DeclVariable     -> DvKeyword DvName DvType:? DvAttribute:* DvValue:? {%p.DeclVariable%}

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
    DvName          -> Identifier CompileTime:?

    # Optional After
    DvType          -> _ ":" _ Type
    DvAttribute     -> __ Attribute
    DvValue         -> _ "=" _ Expr

    # Contexts
    Stmt            -> DeclVariable

## Decl/Function ###################################################################################
    DeclFunction     -> DfKeyword DfName DfParameters DfReturnType:? DfGeneric:? DfAttribute:* DfBody:? {%p.DeclFunction%}

    # Examples:
    #   fn name(){ ... }
    #   fn name(parameter: Type #parameterAttribute ...): ReturnType #functionAttribute { ... }

    # Supports:
    #   Attributes
    #   Compile Time Operator

    # Required
    DfKeyword       -> "fn" __
    DfKeyword       -> "op" __
    DfName          -> Identifier CompileTime:?
    DfParameters    -> STAR["(", NL:?, DeclParameter, COMMA, ")"]

    # Optional After
    DfReturnType    -> _ ":" _ Type
    DfGeneric       -> NL DeclGeneric
    DfAttribute     -> NL Attribute
    DfBody          -> NL:? BODY[Stmt]

    # Contexts
    Stmt            -> DeclFunction

## Decl/Parameter ##################################################################################
    DeclParameter    -> DpKeyword:? DpName DpType:? DpAttribute:* DpValue:?

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
    DpName          -> Identifier CompileTime:?
    
    # Optional After
    DpType          -> _ ":" _ Type
    DpAttribute     -> __ Attribute
    DpValue         -> _ "=" _ Expr

    # Context
    # Function declaration parameter's list (DeclFunction)

## Decl/Class ######################################################################################
    DeclClass    -> DcKeyword DcName DcImplement:* DcGeneric:? DcAttribute:* DcBody:? {%p.DeclClass%}

    # Examples:
    #   TODO: Fill out some examples

    # Supports:
    #   Attributes

    # Required
    DcKeyword       -> "class" __
    DcName          -> Identifier

    # Optional After
    DcImplement     -> __ "impl" __ Type
    DcGeneric       -> __ DeclGeneric
    DcAttribute     -> __ Attribute
    DcBody          -> _ BODY[Stmt]

    # Contexts
    Stmt            -> DeclClass

## Decl/Generics ###################################################################################
    DeclGeneric  -> DgKeyword DgParameters DgWhere:*

    # Examples:
    #   TODO: Fill out some examples

    DgKeyword       -> "generic"
    DgParameters    -> PLUS["<", _, DgParameter, COMMA, ">"]
    DgParameter     -> Identifier
    DgWhere         -> __ "where" __ Identifier __ "impl" __ Type

    # Contexts
    # After the class name but before the body in DeclClass
    # After the function name but before the body in DeclFunction

## Expr ############################################################################################
    # Expr describes expressions that may be comprised of binary and unary operations
    # Atom describes what binary and unary operators may be performed on
    Expr            -> BinaryExpr

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
    BinaryExpr      -> UnaryExpr __ OperatorSpaced __ BinaryExpr
    BinaryExpr      -> Atom Operator Atom
    BinaryExpr      -> UnaryExpr

    # Unary Expressions
    # ++x or x++
    UnaryExpr       -> Operator Atom
    UnaryExpr       -> Atom Operator
    UnaryExpr       -> Atom

    # Atoms
    Atom            -> "(" Expr ")"
    Atom            -> Identifier

    # Literals
    Atom            -> %string_double_quote    # "foo"
    Atom            -> %integer_bin            # 0b1010101101 0b1011_1011
    Atom            -> %integer_dec            # 208124 012985  1_000_000
    Atom            -> %integer_hex            # 0x01234567890ABCDEF 0xFF_FF
    Atom            -> %integer_oct            # 0o01234567 0o123_123_123

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

## Expr/Construct ##################################################################################
    ExprConstruct   -> EnTarget EnArguments

    # En - n for "new"

    # Examples:
    #   foo{bar, baz
    #   foo{bar: 100, baz: 20}

    # Supports:
    #   Compile Time Operator

    # Required
    EnTarget        -> Atom CompileTime:?
    EnArguments     -> STAR["{", _, EcArgument, COMMA, "}"]
    EnArgument      -> Expr
    EnArgument      -> Identifier _ ":" _ Expr

    # Contexts
    Atom            -> ExprConstruct

## Expr/Call #######################################################################################
    ExprCall        -> EcTarget EcArguments

    # Examples:
    #   foo(bar, baz)

    # Supports:
    #   Compile Time Operator

    # Required
    EcTarget        -> Atom CompileTime:?
    EcArguments     -> STAR["(", _, EcArgument, COMMA, ")"]
    EcArgument      -> Expr
    EcArgument      -> Identifier _ ":" _ Expr

    # Contexts
    Stmt            -> ExprCall
    Atom            -> ExprCall

## Expr/MacroCall###################################################################################
    ExprMacroCall   -> EmTarget EmArgument:?

    # Examples:
    #   foo! x + y
    #   bar!

    # Required
    EmTarget        -> Atom CompileTime

    # Optional After
    EmArgument      -> __ Expr

    # Contexts
    Stmt            -> ExprMacroCall
    BinaryExpr      -> ExprMacroCall

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
    EdOperator      -> _ "." _
    EdName          -> Identifier

    # Contexts
    Atom            -> ExprIndexDot

## Stmt/ForEach ####################################################################################
    StmtForEach     -> SfKeyword SfCondition SfBody

    # Required
    SfKeyword       -> "for" CompileTime:? _
    SfCondition     -> "(" _ Identifier __ "in" __ Expr _ ")" _
    SfBody          -> BODY[Stmt]

    # Contexts
    Stmt            -> StmtForEach

## Stmt/While ######################################################################################
    StmtWhile     -> SwKeyword SwCondition SwBody

    # Examples:
    #   while(x == false){ ... }
    #   while!(Foo()){ ... }

    # Supports:
    #   Compile Time Operator

    # Required
    SwKeyword       -> "while" CompileTime:? _
    SwCondition     -> "(" _ Expr _ ")" _
    SwBody          -> BODY[Stmt]

    # Context
    Stmt            -> StmtWhile

## Stmt/If #########################################################################################
    StmtIf          -> SiKeyword SiCondition SiBody SiElif:* SiElse:?

    # Examples:
    #   if(x == false){ ... }
    #   if!(Foo()){ ... }
    #   if!(x == y){ ... } else { ... }
    #   if!(x == 0)!{ ... } else if(x == 1) { ... } else { ... }

    # Supports:
    #   Compile Time Operator

    # Required
    SiKeyword       -> "if" CompileTime:? _
    SiElifKeyword   -> _ "else" __ "if" _
    SiElseKeyword   -> _ "else" _
    SiCondition     -> "(" _ Expr _ ")" _
    SiBody          -> BODY[Stmt]

    # Optional After
    SiElif          -> SiElifKeyword SiCondition SiBody
    SiElse          -> SiElseKeyword SiCondition SiBody

    # Context
    Stmt            -> StmtIf

## Stmt/Match ######################################################################################
    StmtMatch       -> SmKeyword SmValue SmCases

    SmKeyword       -> "match" CompileTime:? _
    SmValue         -> "(" _ Expr _ ")" _
    SmCases         -> BODY[SmCase]

    SmCase          -> "case" __ Pattern _ ":" _ SmBody
    SmBody          -> BODY[Stmt]

    Stmt            -> StmtMatch

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
    EiCondition     -> Atom __
    EiTrue          -> __ Atom __
    EiFalse         -> __ Atom

    # Context
    # Expr            -> ExprIf

## Stmt/Return #####################################################################################
    StmtReturn      -> SrKeyword SrValue:?

    # Examples
    #   return
    #   return 10 + 20

    # Required
    SrKeyword       -> "return"
    
    # Optional After
    SrValue         -> __ Expr

    # Context
    Stmt            -> StmtReturn

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
    __              -> %ws
    _               -> %ws:?

    NL              -> (%ws:? %comment:? %newline):+ %ws:?

## Helpers #########################################################################################
    COMMA           -> %comma
    COMMA           -> NL

    StmtSep         -> NL
    StmtSep         -> _ ";" _
const PREC = {
  binop: 1,
  call: 1,
  tied_call: 2,
  unop: 3,
  fun: 4,
}

module.exports = grammar({
  name: 'moonscript',

  externals: $ => [
    $._indent,
    $._dedent,
    $._soft_dedent,
    $._newline,
    $._unary_minus,
    $._unary_iter,
    $.error,
  ],

  word: $ => $.identifier,

  extras: $ => [
    $.comment,
    /[ \t]/,
  ],

  precedences: $ => [
    [
      "binop",
      "call",
      "fun",
    ],
    [
      "or",
      "and",
      "cmp",
      "concat",
      "add",
      "mul",
      "not",
      "pow",
    ]
  ],

  rules: {
    program: $ => repeat(choice(
      $._statement,
    )),
    comment: $ => seq("--", /[^-].*\r?\n/),
    identifier: $ => /@?[a-z_]+/,

    _literal: $ => choice(
      $.digit_literal,
      $.string_literal,
    ),

    digit_literal: $ => /[\d]+(\.[\d]+)?/,
    string_literal: $ => /"[^"]*"/,
    _immediate_string_literal: $ => alias(token.immediate(seq('"', /[^"]*"/)), $.string_literal),

    _statement: $ => prec.right(-1, seq(
      choice(
        $.assignment,
        $._expr,
        $.return_statement,
      ),
      optional($._newline),
    )),

    list_expr: $ => (
      seq(
        "{",
        sep($._expr, ","),
        "}"
      )
    ),

    assignment: $ => {
      const table = [
        "=",
        "+=",
        "-=",
        "/=",
        "*=",
        "%=",
        "..=",
        "or=",
        "and=",
      ];

      return choice(...table.map((op) => prec.left(-1, seq(
        optional("export"),
        field("variable", sep1($.identifier, ",")),
        field("assignment", op),
        field("value", sep1($._expr, ",")),
      ))));
    },

    _expr: $ => choice(
      $._callable_expr,
      $._literal,
      $.conditional_expr,
    ),

    _callable_expr: $ => choice(
      $.call_expr,
      $.binary_expr,
      $.unary_expr,
      $.identifier,
      $.function_expr,
      $.parenthesized_expr,
    ),

    function_expr: $ => prec(PREC.fun, seq(
      field("parameters", optional($.parameter_list)),
      choice(
        "->",
        "=>"
      ),
      field("body", choice(
        $.block,
        prec.right($._expr),
      ))
    )),

    parenthesized_expr: $ => seq(
      "(",
      optional(choice($._indent, $._newline)),
      $._expr,
      optional(choice($._dedent, $._newline)),
      ")",
    ),

    block: $ => seq(
      choice($._indent, $._soft_dedent),
      sep1($._statement, $._newline),
      $._dedent,
    ),

    call_expr: $ => prec.right(PREC.call, seq(
      field("function", $._callable_expr),
      choice(
        field("arguments", $._immediate_string_literal),
        prec.right("!"),
        field("arguments", $.argument_list),
      )
    )),

    parameter_list: $ => prec(PREC.fun, seq(
      "(",
      sep($.parameter, ","),
      ")"
    )),

    parameter: $ => prec(PREC.fun, seq(
      field("name", $.identifier),
      optional(seq(
        "=",
        field("default", $._expr)
      ))
    )),

    argument_list: $ => prec.right(
      choice(
        seq(token.immediate("("), sep($._expr, ","), ")"),
        seq(
          sep1($._expr, ","),
          optional(seq(
            ",",
            $._indent,
            sep1($._expr, seq(",", optional($._newline))),
            $._dedent,
          ))
        )
      )
    ),

    conditional_expr: $ => seq(
      $._condition,
      choice(
        seq("then", field("consequence", $._statement)),
        seq(optional("then"), field("consequence", $.block)),
      )
    ),

    _condition: $ => seq(
      choice("if", "unless"),
      field("condition", $._expr),
    ),

    binary_expr: $ => {
      const table = [
        [prec.left, "or", "or"],
        [prec.left, "and", "and"],
        [prec.left, "==", "cmp"],
        [prec.left, "!=", "cmp"],
        [prec.left, "~=", "cmp"],
        [prec.left, "<=", "cmp"],
        [prec.left, ">=", "cmp"],
        [prec.left, "<", "cmp"],
        [prec.left, ">", "cmp"],
        [prec.right, "..", "concat"],
        [prec.left, "+", "add"],
        [prec.left, "-", "add"],
        [prec.left, "*", "mul"],
        [prec.left, "/", "mul"],
        [prec.right, "^", "pow"],
      ];

      return choice(...table.map(([fn, op, precedence]) => prec(PREC.binop, fn(precedence, seq(
        field("lhs", $._expr),
        field("operator", op),
        field("rhs", $._expr),
      )))));
    },

    unary_expr: $ => {
      const table = [
        alias($._unary_minus, "-"),
        alias($._unary_iter, "*"),
        "not",
      ];

      return choice(...table.map((op) => prec(PREC.unop, seq(
        field("operator", op),
        field("operand", $._expr),
      ))));
    },

    return_statement: $ => seq(
      "return",
      $.argument_list
    )
  }
});

module.exports.PREC = PREC;

function sep1(rule, seperator) {
  return seq(rule, repeat(seq(seperator, rule)));
}

function sep(rule, seperator) {
  return optional(seq(rule, repeat(seq(seperator, rule))));
}

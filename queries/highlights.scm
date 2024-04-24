[
  "+"
  "=="
  "="
] @operator

[
  "and="
  "or="
  "and"
  "or"
] @keyword.operator

[
  "if"
  "then"
] @keyword

[
  ","
] @punctuation.delimiter

[
  "("
  ")"
] @punctuation.bracket


(identifier) @variable
((identifier) @variable.member (#lua-match? @variable.member "@.+"))

(call_expr
  function: (identifier) @function)

(assignment
  variable: (identifier) @variable)

(comment) @comment

(digit_literal) @number

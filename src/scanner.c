#include "tree_sitter/parser.h"
#include "tree_sitter/alloc.h"
#include "tree_sitter/array.h"

enum TokenType {
    INDENT,
    DEDENT,
    SOFT_DEDENT,
    NEWLINE,
    UNARY_MINUS,
    UNARY_ITER,
    ERROR,
};

typedef struct {
    Array(uint16_t) indents;
} Scanner;

static inline void advance(TSLexer *lexer) { lexer->advance(lexer, false); }

static inline void skip(TSLexer *lexer) { lexer->advance(lexer, true); }

unsigned tree_sitter_moonscript_external_scanner_serialize(
    void *payload,
    char *buffer
) {
    Scanner *scanner = (Scanner *)payload;
    uint32_t size = 0;

    size_t indent_count = scanner->indents.size;

    if (indent_count > 0) {
        for (uint32_t i = 1; i < indent_count; ++i) {
            buffer[size++] = (char)*array_get(&scanner->indents, i);
        }
    }

    return size;;
}

void tree_sitter_moonscript_external_scanner_deserialize(
    void *payload,
    const char *buffer,
    unsigned length
) {
    Scanner *scanner = (Scanner *)payload;

    array_delete(&scanner->indents);
    array_push(&scanner->indents, 0);

    if (length > 0) {
        size_t size = 0;

        for (; size < length; size++) {
            array_push(&scanner->indents, buffer[size]);
        }
    }
}

void *tree_sitter_moonscript_external_scanner_create() {
    Scanner *scanner = ts_calloc(1, sizeof(Scanner));

    array_init(&scanner->indents);
    tree_sitter_moonscript_external_scanner_deserialize(scanner, NULL, 0);

    return scanner;
}

void tree_sitter_moonscript_external_scanner_destroy(void *payload) {
    Scanner *scanner = (Scanner *)payload;

    array_delete(&scanner->indents);
    ts_free(scanner);
}

bool tree_sitter_moonscript_external_scanner_scan(
    void *payload,
    TSLexer *lexer,
    const bool *valid_symbols
) {
    Scanner *scanner = (Scanner *)payload;

    if (valid_symbols[ERROR]) {
        return false;
    }

    if (valid_symbols[INDENT] || valid_symbols[DEDENT] || valid_symbols[SOFT_DEDENT] || valid_symbols[NEWLINE] || valid_symbols[UNARY_MINUS] || valid_symbols[UNARY_ITER]) {
        uint16_t indent = 0;

        bool found_end_of_line = false;

        for (;;) {
            if (lexer->lookahead == ' ') {
                indent++;
                skip(lexer);
            } else if (lexer->lookahead == '\t') {
                indent += 4;
                skip(lexer);
            } else if (lexer->lookahead == '\r') {
                indent = 0;
                skip(lexer);
            } else if (lexer->lookahead == '\n') {
                found_end_of_line = true;
                indent = 0;
                skip(lexer);
            } else if (lexer->eof(lexer)) {
                found_end_of_line = true;
                indent = 0;
                break;
            } else if (!found_end_of_line && indent > 0) {
                if (valid_symbols[UNARY_MINUS] && lexer->lookahead == '-') {
                    lexer->mark_end(lexer);
                    advance(lexer);
                    if (lexer->lookahead != '-' && lexer->lookahead != ' ' && lexer->lookahead != '\n') {
                        lexer->mark_end(lexer);
                        lexer->result_symbol = UNARY_MINUS;
                        return true;
                    }
                } else if (valid_symbols[UNARY_ITER] && lexer->lookahead == '*') {
                    lexer->mark_end(lexer);
                    advance(lexer);
                    if (lexer->lookahead != ' ') {
                        lexer->mark_end(lexer);
                        lexer->result_symbol = UNARY_ITER;
                        return true;
                    }
                }
                break;
            } else {
                break;
            }
        }

        if (found_end_of_line) {
            if (scanner->indents.size > 0) {
                uint16_t last_indent = *array_back(&scanner->indents);

                if (valid_symbols[INDENT] && indent > last_indent) {
                    array_push(&scanner->indents, indent);
                    lexer->result_symbol = INDENT;

                    return true;
                } else if ((valid_symbols[DEDENT] || valid_symbols[SOFT_DEDENT]) && indent < last_indent) {
                    array_pop(&scanner->indents);

                    if (valid_symbols[SOFT_DEDENT] && scanner->indents.size > 0) {
                        uint16_t snd_last_indent = *array_back(&scanner->indents);

                        if (indent > snd_last_indent) {
                            array_push(&scanner->indents, indent);
                            lexer->result_symbol = SOFT_DEDENT;
                            return true;
                        }

                    }
                    if (valid_symbols[DEDENT]) {
                        lexer->result_symbol = DEDENT;
                        return true;
                    }
                } else if (valid_symbols[NEWLINE]) {
                    lexer->result_symbol = NEWLINE;

                    return true;
                }
            }
        }
    }

    return false;
}

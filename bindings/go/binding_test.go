package tree_sitter_moonscript_test

import (
	"testing"

	tree_sitter "github.com/smacker/go-tree-sitter"
	"github.com/tree-sitter/tree-sitter-moonscript"
)

func TestCanLoadGrammar(t *testing.T) {
	language := tree_sitter.NewLanguage(tree_sitter_moonscript.Language())
	if language == nil {
		t.Errorf("Error loading Moonscript grammar")
	}
}

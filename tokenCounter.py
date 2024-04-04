import sys
from tiktoken import Tokenizer

tokenizer = Tokenizer()

def countTokens(text):
    return len(list(tokenizer.tokenize(text)))

print(countTokens(sys.argv[1]))
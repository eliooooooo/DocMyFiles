import sys

# METHOD 1
# from tiktoken import Tokenizer
# tokenizer = Tokenizer()

# def countTokens(text):
#     return len(list(tokenizer.tokenize(text)))

# print(countTokens(sys.argv[1]))


# METHOD 2
# from openai_function_tokens import estimate_tokens
# estimate_tokens(sys.argv[1], functions=None, function_call=None)

# METHOD 3
import tiktoken
encoding = tiktoken.encoding_for_model("GPT-3.5-turbo")

encoding.encode("Hello, world!")

def num_token_from_string(string: str, encoding_name: str) -> int:
    """Return the number of tokens in a string."""
    encoding = tiktoken.encoding_for_model(encoding_name)
    return len(encoding.encode(string))

print(num_token_from_string(sys.argv[1], "GPT-3.5-turbo"))
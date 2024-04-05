import sys
import tiktoken

print(sys.argv[1])

def num_token_from_string(string: str, encoding_name: str) -> int:
    """
    Return the number of tokens in a string.
    
    Args:
        string: The string to count tokens in.
        encoding_name: The name of the encoding to use.

    Returns:
        The number of tokens in the string.
    """
    encoding = tiktoken.get_encoding(encoding_name)
    return len(encoding.encode(string))

print(num_token_from_string(sys.argv[1], "cl100k_base"))

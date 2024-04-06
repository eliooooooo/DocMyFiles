import sys
import json
import tiktoken

# Open and read the tmp file
filename = sys.argv[1]
with open(filename, 'r') as f:
    data = f.read()
    f.close()

# Parse the data as JSON
data = json.loads(data)

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

def count_tokens(data):
    """
    Count the number of tokens in the content of each item in the data.

    Args:
        data: The data to count tokens in.

    Returns:
        The number of tokens in the data.
    """
    numTokens = 0
    for item in data:
        content = item['content']
        numTokens += num_token_from_string(content, "cl100k_base")
    return numTokens

print(count_tokens(data))
# print(num_token_from_string(data, "cl100k_base"))

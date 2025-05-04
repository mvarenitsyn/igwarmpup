#!/bin/bash

# This is an example shell script showing how to use the Instagram Story Like API

# Start the server (in a separate terminal)
# cd ../
# npm start

# 1. Simple root endpoint test
echo "Testing API root endpoint..."
curl http://localhost:3002

# 2. Example of how to like a story (replace with real cookie.json)
echo -e "\n\n1. Example of how to like a story (not actually executing):"
echo "curl -X POST http://localhost:3002/api/instagram/like-story \\"
echo "  -F \"username=target_username\" \\"
echo "  -F \"cookie=@/path/to/igcookie.json\" \\"
echo "  -F \"browserless=false\" \\"
echo "  -F \"headless=true\" \\"
echo "  -F \"emojis=[\\\"🔥\\\",\\\"👏\\\",\\\"👍\\\",\\\"❤️\\\"]\" "

echo -e "\n\n2. Example of how to fetch the newest post (not actually executing):"
echo "curl -X POST http://localhost:3002/api/instagram/newest-post \\"
echo "  -F \"username=target_username\" \\"
echo "  -F \"cookie=@/path/to/igcookie.json\" \\"
echo "  -F \"browserless=false\" \\"
echo "  -F \"headless=true\" "

# 3. Instructions for using Node.js example
echo -e "\n\nTo run the Node.js example scripts:"
echo "node ./test-like-story.js"
echo "node ./test-newest-post.js"

echo -e "\n\nNote: Make sure the server is running on port 3002 before testing!"

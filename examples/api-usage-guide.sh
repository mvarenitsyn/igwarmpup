curl -X POST \
  -F "username=iflowbot" \
  -F "cookie=@igcookie.json" \
  -F "browserless=true" \
  -F "browserlessToken=S8yf0Lo56GNr1m2a9c480cc39f66c2f90362fe9d01" \
  -F "emojis=[\"🔥\",\"👍\",\"❤️\"]" \
  http://localhost:3002/api/instagram/like-story
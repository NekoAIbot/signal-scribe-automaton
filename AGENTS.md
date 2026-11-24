# Project architecture rules

- Store the initiating OAuth app origin with the server-side single-use state, validate it against this app's explicit origin allowlist, and use it only for the callback handoff so preview returns cannot become open redirects.
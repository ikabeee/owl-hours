# Features: the app's domain, one module per business flow

Each folder is a module with a small interface (its screen entry) and the
implementation behind it. `app/` holds thin route adapters only: a route
imports its feature's screen and renders it, nothing else.

```
features/
  requests/   offer detail + request list (demo path)
  chats/      customer conversations + polish
  jobs/       quote, trip, completion
  content/    post drafts + review
  business/   profile, prices, Test Zukki
```

## Dependency rule

`app/` → `features/` → `shared/`. A feature never imports another feature
(the owner accepts one request and chats in one place at a time; shared state
arrives via props from the route, per the DOM serializable-props rule).
Anything two features need lives in `shared/` and earns its place with two
real callers — one caller means a hypothetical seam, so keep it inside the
feature until the second arrives.

# Project Guidelines

## Test First

- Write or update tests **before** implementing source code.
- Every `src/X.ts` must have a matching `test/X.test.ts`. Never add a source module without its test file.
- Use Jest with ts-jest preset and jsdom environment.
- Structure tests with nested `describe()` blocks grouped by feature. Use `afterEach()` for cleanup.
- Use `jest.fn()` for all spies and mocks — no manual stubs.
- Cover both happy paths and edge cases: invalid inputs, empty values, duplicate calls, cleanup/unsubscribe.
- Run `npx jest --coverage` to verify before committing.

## Error Handling

- Wrap **all** async operations and external calls in try-catch. Never let exceptions propagate unhandled.
- Catch blocks must handle the error explicitly — log, return a fallback, or re-throw with context. Empty catch blocks are forbidden.
- Prefer returning `null` or a typed error result over throwing, matching the existing codebase pattern.
- In event/callback systems, catch errors from every subscriber callback individually so one failure does not break others.
- Tests must verify error paths: assert that invalid inputs, network failures, and edge cases are handled gracefully without throwing to the caller.

## Code Style

- Strict TypeScript — all `strict` flags enabled, no `any` unless unavoidable.
- Use the **factory/closure pattern** (`useX()`, `createX()`) for stateful modules. Do not use classes.
- Named exports only. Re-export new modules from `index.ts` via `export * from './src/moduleName'`.
- Keep functions small and composable. Prefer higher-order functions over inheritance or mixins.

## Module Reference

| Module | Entry Point | Purpose |
|--------|-------------|---------|
| `event` | `useEvent()` | Event bus with namespace support, priority ordering, and deduplication |
| `reactive` | `createSignal()`, `createEffect()` | Minimal reactive signals with dependency tracking |
| `curry` | `curry(fn)`, `curryN(n, fn)` | Currying with placeholder `_` for partial application |
| `controlledPromise` | `controlledPromise()` | Promise with external abort via AbortController; returns `[promise, abort]` |
| `domEvent` | `supportDomEvent(dom)` | Bridges DOM element listeners into the `useEvent()` system |
| `store` | `create()`, `config(key, value)` | localStorage/sessionStorage wrapper with group (`:`) and path (`.`) selectors |
| `stateFetch` | `stateFetch(parallel?)` | State-managed fetch with queue, deduplication, caching, and abort |
| `stateQueue` | `stateQueue(parallel?)` | Priority async task queue with AbortController and event hooks |
| `log` | `createPrinter(name?, css?)` | Structured logging with filtering, badges, and CSS styling |
| `reversedArray` | `new ReversedArray(arr?)` | Array wrapper where index 0 is the most recent element |
| `BitCount` | `new BitCount(n, parent?, opts?)` | Linked-list multi-digit counter in arbitrary radix with carry propagation |
| `tinify` | `tinify(input, options?)` | Image compression with format detection, binary search quality, and PSNR |
| `tools/fetch.axios` | `get(url)`, `post(url)` | Axios client integrated with `stateFetch` for deduplication and queuing |

## Conventions

- Target ESNext for both compilation and module system.
- Comments and test descriptions may be in Chinese or English.
- Author headers (`@Author`, `@Date`, `@Description`) are optional but welcome.

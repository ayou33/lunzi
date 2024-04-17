/**
 * File: reactive.ts of LunZi
 * Author: 阿佑[ayooooo@petalmail.com]
 * Date: 2024/4/16 17:11
 * code from https://dev.to/ryansolid/building-a-reactive-library-from-scratch-1i0p
 */
type EffectContext = {
  effect: () => void;
  dependencies: Set<Set<EffectContext>>;
}

const context: EffectContext[] = []

function subscribe (effectCtx: EffectContext, subscriptions: Set<EffectContext>) {
  subscriptions.add(effectCtx)
  effectCtx.dependencies.add(subscriptions)
}

export function createSignal<T> (value: T) {
  const subscriptions = new Set<EffectContext>()
  
  const read = () => {
    const effectCtx = context[context.length - 1]
    if (effectCtx) subscribe(effectCtx, subscriptions)
    return value
  }
  
  const write = (nextValue: T) => {
    value = nextValue
    
    for (const sub of [...subscriptions]) {
      sub.effect()
    }
  }
  return [read, write] as const
}

function cleanup (effectCtx: EffectContext) {
  // 从所有依赖的signal订阅列表中删除当前effect订阅
  for (const dep of effectCtx.dependencies) {
    dep.delete(effectCtx)
  }
  effectCtx.dependencies.clear()
}

export function createEffect (fn: () => void) {
  /**
   *  执行用户的effect函数前，重置effectCtx
   *  由于effect函数的动态依赖, effect可能会被无依赖的signal触发执行，所以每次调用前都要重置
   *
   *  考虑以下场景
   *  const [a] = createSignal(1)
   *  const [b] = createSignal(2)
   *
   *  createEffect(() => {
   *    if (condition) {
   *      console.log(a())
   *    } else {
   *      console.log(b())
   *    }
   *  })
   */
  const effect = () => {
    cleanup(effectCtx)
    context.push(effectCtx)
    try {
      fn()
    } finally {
      context.pop()
    }
  }
  
  const effectCtx: EffectContext = {
    effect,
    dependencies: new Set(),
  }
  
  effect()
  
  return () => cleanup(effectCtx)
}

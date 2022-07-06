export function parseEventName (name: string) {
  return name.trim().split(/^|\s+/).map(n => {
    const names = n.split('.')
    const name = names[0].trim()
    const types = names.slice(1)

    return types.length === 0 ? [{
      name,
      type: '',
    }] : types.map(type => ({
      name,
      type: type.trim(),
    }))
  }).reduce((a, b) => a.concat(b), [])
}

export function useEventNames (event: string, use: (name: string, type: string) => void) {
  parseEventName(event).map(event => {
    if (event.name) use(event.name, event.type)
  })
}

export type EventHandler = (e: Event, ...dataSet: any[]) => void

export type EventOptions = AddEventListenerOptions | boolean

export function contextListener (listner: (e: Event, ...dataSet: any[]) => void) {
  return (e: Event, ...dataSet: any[]) => {
    listner(e, ...dataSet)
  }
}

export type EventRecord = {
  name: string;
  type: string;
  listener: EventHandler;
  handler: EventHandler;
  options?: EventOptions;
}

function useEvent (
  onSub?: (event: string, handler: EventHandler, options?: EventOptions) => void,
  onRemove?: (event: string, handler: EventHandler, options?: EventOptions) => void,
  onPub?: (event: string, ...dataSet: any[]) => void,
) {
  const events: EventRecord[] = []

  function on (event: string, handler: EventHandler, options?: EventOptions) {
    const listener = contextListener(handler)

    useEventNames(event, (name, type) => {
      for (let j = 0, el = events.length; j < el; j++) {
        const record = events[j]

        if (record.name === name && record.type === type && record.handler === handler) {
          onRemove?.(record.name, record.listener, record.options)
          record.listener = listener
          record.options = options
          onSub?.(record.name, record.listener, record.options)
          return
        }
      }

      events.push({
        name,
        type,
        listener,
        handler,
        options,
      })
      onSub?.(name, listener, options)
    })
  }

  function once (event: string, handler: EventHandler, options?: EventOptions) {
    on(event, (e: Event, ...dataSet: any[]) => {
      handler(e, ...dataSet)
      off(event, handler)
    }, options)
  }

  function off (event: string, handler?: EventHandler) {
    useEventNames(event, (name, type) => {
      for (var i = 0, j = -1, el = events.length; i < el; i++) {
        const record = events[i]
        if (record.name === name && record.type === type && (record.handler === handler || !handler)) {
          onRemove?.(record.name, record.listener, record.options)
        } else {
          events[++j] = record
        }
      }

      events.length = ++j
    })
  }

  function emit (event: string) {
    onPub?.(event)
  }

  function countEvents () {
    return events.length
  }

  return { on, once, off, emit, countEvents }
}

export default useEvent

import supoprtDomEvent from "../src/domEvent"

const dom = document.createElement('div')

const { on, off } =  supoprtDomEvent(dom)

describe('dom节点事件支持', () => {
  test('dom 事件绑定', () => {
    const handler = jest.fn()
    const event = 'click'
    on(event, handler)
    dom.click()
    expect(handler).toHaveBeenCalledTimes(1)
    off(event, handler)
  })

  test('dom事件解绑', () => {
    const event = 'click'
    const handler = jest.fn()
    on(event, handler)
    dom.click()
    expect(handler).toHaveBeenCalledTimes(1)

    off(event, handler)
    dom.click()
    expect(handler).toHaveBeenCalledTimes(1)
  })
})